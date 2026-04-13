import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput,
  FlatList, KeyboardAvoidingView, Platform, Animated,
  ActivityIndicator, StatusBar
} from 'react-native';
import { db } from './firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import {
  searchUsers, sendFriendRequest,
  listenIncomingRequests, acceptFriendRequest, declineFriendRequest,
  listenConversations, listenMessages, sendMessage, createGroup
} from './friendService';

// ── الصفحات الداخلية ──
const TABS = { CHATS: 'chats', FRIENDS: 'friends', REQUESTS: 'requests' };

export default function FriendsScreen({ user, setScreen }) {
  const [tab, setTab] = useState(TABS.CHATS);
  const [conversations, setConversations] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [openConv, setOpenConv] = useState(null); // محادثة مفتوحة
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
    if (!user?.uid) return;

    const unsubConv = listenConversations(user.uid, setConversations);
    const unsubReq = listenIncomingRequests(user.uid, setIncomingRequests);
    return () => { unsubConv(); unsubReq(); };
  }, [user?.uid]);

  // ── إذا فُتحت محادثة ──
  if (openConv) return (
    <ChatScreen
      conv={openConv}
      user={user}
      onBack={() => setOpenConv(null)}
      setScreen={setScreen}
    />
  );

  if (showCreateGroup) return (
    <CreateGroupScreen
      user={user}
      conversations={conversations.filter(c => c.type === 'dm')}
      onBack={() => setShowCreateGroup(false)}
      onCreated={(convId) => { setShowCreateGroup(false); }}
    />
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#06061a" />

      {/* هيدر */}
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <TouchableOpacity onPress={() => setScreen('home')} style={styles.backBtn}>
          <Text style={styles.backText}>→</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>👥 الأصدقاء</Text>
        <TouchableOpacity onPress={() => setShowCreateGroup(true)} style={styles.addGroupBtn}>
          <Text style={styles.addGroupText}>＋ مجموعة</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* تابز */}
      <Animated.View style={[styles.tabs, { opacity: fadeAnim }]}>
        {[
          { key: TABS.CHATS, label: '💬 المحادثات' },
          { key: TABS.FRIENDS, label: '🔍 إضافة' },
          { key: TABS.REQUESTS, label: `🔔 الطلبات${incomingRequests.length > 0 ? ` (${incomingRequests.length})` : ''}` },
        ].map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tabBtn, tab === t.key && styles.tabBtnActive]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </Animated.View>

      {/* المحتوى */}
      <Animated.View style={[{ flex: 1, width: '100%' }, { opacity: fadeAnim }]}>
        {tab === TABS.CHATS && (
          <ChatsList
            conversations={conversations}
            user={user}
            onOpen={setOpenConv}
          />
        )}
        {tab === TABS.FRIENDS && (
          <AddFriendTab user={user} />
        )}
        {tab === TABS.REQUESTS && (
          <RequestsTab
            requests={incomingRequests}
            currentUser={user}
          />
        )}
      </Animated.View>
    </View>
  );
}

// ══════════════════════════════
// قائمة المحادثات
// ══════════════════════════════
function ChatsList({ conversations, user, onOpen }) {
  if (conversations.length === 0) return (
    <View style={styles.emptyWrap}>
      <Text style={styles.emptyEmoji}>💬</Text>
      <Text style={styles.emptyText}>لا توجد محادثات بعد</Text>
      <Text style={styles.emptyHint}>أضف أصدقاء من تبويب "إضافة"</Text>
    </View>
  );

  return (
    <FlatList
      data={conversations}
      keyExtractor={i => i.id}
      contentContainerStyle={{ padding: 16, gap: 10 }}
      renderItem={({ item }) => (
        <TouchableOpacity style={styles.convCard} onPress={() => onOpen(item)} activeOpacity={0.8}>
          <View style={[styles.convAvatar, { backgroundColor: item.type === 'group' ? '#7c3aed22' : '#f5c51822' }]}>
            <Text style={styles.convAvatarEmoji}>{item.type === 'group' ? '👥' : '👤'}</Text>
          </View>
          <View style={styles.convInfo}>
            <Text style={styles.convName}>
              {item.type === 'group' ? item.name : getOtherName(item, user?.uid)}
            </Text>
            <Text style={styles.convLastMsg} numberOfLines={1}>
              {item.lastMessage || 'ابدأ المحادثة...'}
            </Text>
          </View>
          {item.type === 'group' && (
            <View style={styles.groupBadge}>
              <Text style={styles.groupBadgeText}>{item.members?.length} 👤</Text>
            </View>
          )}
        </TouchableOpacity>
      )}
    />
  );
}

function getOtherName(conv, myUid) {
  // الاسم يُجلب من الـ state عند الفتح، هنا نعرض placeholder
  return 'صديق';
}

// ══════════════════════════════
// إضافة صديق
// ══════════════════════════════
function AddFriendTab({ user }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState([]);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    const res = await searchUsers(query.trim(), user?.uid);
    setResults(res);
    setLoading(false);
  };

  const handleSend = async (toUid) => {
    const r = await sendFriendRequest(user?.uid, toUid);
    if (!r?.error) setSentTo(prev => [...prev, toUid]);
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      {/* حقل البحث */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="ابحث بالاسم أو الـ username..."
          placeholderTextColor="#3a3a60"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
          {loading ? <ActivityIndicator color="#06061a" size="small" /> : <Text style={styles.searchBtnText}>🔍</Text>}
        </TouchableOpacity>
      </View>

      {/* النتائج */}
      {results.length === 0 && !loading && query.length > 0 && (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyEmoji}>🔍</Text>
          <Text style={styles.emptyText}>لا نتائج</Text>
        </View>
      )}
      <FlatList
        data={results}
        keyExtractor={i => i.uid}
        contentContainerStyle={{ gap: 10, marginTop: 12 }}
        renderItem={({ item }) => (
          <View style={styles.userCard}>
            <View style={styles.userAvatar}>
              <Text style={styles.userAvatarText}>{item.name?.[0] || '؟'}</Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{item.name}</Text>
              <Text style={styles.userUsername}>@{item.username}</Text>
            </View>
            {sentTo.includes(item.uid) ? (
              <View style={styles.sentBadge}>
                <Text style={styles.sentText}>✓ أُرسل</Text>
              </View>
            ) : (
              <TouchableOpacity style={styles.addBtn} onPress={() => handleSend(item.uid)}>
                <Text style={styles.addBtnText}>＋ إضافة</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />
    </View>
  );
}

// ══════════════════════════════
// طلبات الصداقة الواردة
// ══════════════════════════════
function RequestsTab({ requests, currentUser }) {
  const [names, setNames] = useState({});

  useEffect(() => {
    requests.forEach(async (req) => {
      if (!names[req.from]) {
        const snap = await getDoc(doc(db, 'users', req.from));
        if (snap.exists()) setNames(p => ({ ...p, [req.from]: snap.data().name }));
      }
    });
  }, [requests]);

  if (requests.length === 0) return (
    <View style={styles.emptyWrap}>
      <Text style={styles.emptyEmoji}>🔔</Text>
      <Text style={styles.emptyText}>لا توجد طلبات</Text>
    </View>
  );

  return (
    <FlatList
      data={requests}
      keyExtractor={i => i.id}
      contentContainerStyle={{ padding: 16, gap: 10 }}
      renderItem={({ item }) => (
        <View style={styles.requestCard}>
          <View style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>{names[item.from]?.[0] || '؟'}</Text>
          </View>
          <Text style={styles.requestName}>{names[item.from] || '...'}</Text>
          <View style={styles.requestBtns}>
            <TouchableOpacity
              style={styles.acceptBtn}
              onPress={() => acceptFriendRequest(item.id, item.from, currentUser?.uid)}
            >
              <Text style={styles.acceptText}>✓</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.declineBtn}
              onPress={() => declineFriendRequest(item.id)}
            >
              <Text style={styles.declineText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    />
  );
}

// ══════════════════════════════
// شاشة المحادثة
// ══════════════════════════════
function ChatScreen({ conv, user, onBack, setScreen }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [convName, setConvName] = useState(conv.name || '');
  const flatRef = useRef(null);

  useEffect(() => {
    // جلب اسم المحادثة إذا DM
    if (conv.type === 'dm') {
      const otherUid = conv.members?.find(m => m !== user?.uid);
      if (otherUid) {
        getDoc(doc(db, 'users', otherUid)).then(s => {
          if (s.exists()) setConvName(s.data().name);
        });
      }
    }
    const unsub = listenMessages(conv.id, setMessages);
    return () => unsub();
  }, [conv.id]);

  const handleSend = async () => {
    if (!text.trim()) return;
    const t = text.trim();
    setText('');
    await sendMessage(conv.id, user?.uid, user?.name || 'لاعب', t);
  };

  return (
    <KeyboardAvoidingView
      style={styles.chatContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <StatusBar barStyle="light-content" backgroundColor="#06061a" />

      {/* هيدر */}
      <View style={styles.chatHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>→</Text>
        </TouchableOpacity>
        <View style={styles.chatHeaderCenter}>
          <Text style={styles.chatHeaderEmoji}>{conv.type === 'group' ? '👥' : '👤'}</Text>
          <Text style={styles.chatHeaderName} numberOfLines={1}>{convName}</Text>
        </View>
        {/* زر إنشاء لعبة */}
        <TouchableOpacity
          style={styles.startGameBtn}
          onPress={() => setScreen('games')}
        >
          <Text style={styles.startGameText}>🎮 لعبة</Text>
        </TouchableOpacity>
      </View>

      {/* الرسائل */}
      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={i => i.id}
        contentContainerStyle={styles.msgList}
        onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => {
          const isMe = item.uid === user?.uid;
          return (
            <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
              {!isMe && <Text style={styles.msgSender}>{item.name}</Text>}
              <View style={[styles.msgBubble, isMe ? styles.msgBubbleMe : styles.msgBubbleThem]}>
                <Text style={[styles.msgText, isMe && styles.msgTextMe]}>{item.text}</Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyEmoji}>👋</Text>
            <Text style={styles.emptyText}>قل مرحباً!</Text>
          </View>
        }
      />

      {/* إدخال الرسالة */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.msgInput}
          placeholder="اكتب رسالة..."
          placeholderTextColor="#3a3a60"
          value={text}
          onChangeText={setText}
          onSubmitEditing={handleSend}
          returnKeyType="send"
          multiline
        />
        <TouchableOpacity
          style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!text.trim()}
        >
          <Text style={styles.sendBtnText}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ══════════════════════════════
// إنشاء مجموعة
// ══════════════════════════════
function CreateGroupScreen({ user, conversations, onBack, onCreated }) {
  const [groupName, setGroupName] = useState('');
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [friendNames, setFriendNames] = useState({});

  // جلب أسماء الأصدقاء من المحادثات الفردية
  useEffect(() => {
    conversations.forEach(async (conv) => {
      const otherUid = conv.members?.find(m => m !== user?.uid);
      if (otherUid && !friendNames[otherUid]) {
        const snap = await getDoc(doc(db, 'users', otherUid));
        if (snap.exists()) {
          setFriendNames(p => ({ ...p, [otherUid]: snap.data().name }));
        }
      }
    });
  }, [conversations]);

  const toggle = (uid) => {
    setSelected(prev =>
      prev.includes(uid) ? prev.filter(u => u !== uid) : [...prev, uid]
    );
  };

  const handleCreate = async () => {
    if (!groupName.trim() || selected.length === 0) return;
    setLoading(true);
    const id = await createGroup(user?.uid, groupName.trim(), selected);
    setLoading(false);
    onCreated(id);
  };

  const friends = conversations
    .map(c => ({ uid: c.members?.find(m => m !== user?.uid), convId: c.id }))
    .filter(f => f.uid);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#06061a" />
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>→</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>➕ مجموعة جديدة</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={{ flex: 1, padding: 16, gap: 16 }}>
        {/* اسم المجموعة */}
        <TextInput
          style={styles.groupNameInput}
          placeholder="اسم المجموعة..."
          placeholderTextColor="#3a3a60"
          value={groupName}
          onChangeText={setGroupName}
        />

        <Text style={styles.selectLabel}>اختر الأصدقاء:</Text>

        {friends.length === 0 && (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyEmoji}>👤</Text>
            <Text style={styles.emptyText}>لا يوجد أصدقاء بعد</Text>
          </View>
        )}

        <FlatList
          data={friends}
          keyExtractor={i => i.uid}
          contentContainerStyle={{ gap: 10 }}
          renderItem={({ item }) => {
            const isSelected = selected.includes(item.uid);
            return (
              <TouchableOpacity
                style={[styles.friendSelectCard, isSelected && styles.friendSelectCardActive]}
                onPress={() => toggle(item.uid)}
              >
                <View style={styles.userAvatar}>
                  <Text style={styles.userAvatarText}>{friendNames[item.uid]?.[0] || '؟'}</Text>
                </View>
                <Text style={[styles.userName, isSelected && { color: '#f5c518' }]}>
                  {friendNames[item.uid] || '...'}
                </Text>
                {isSelected && <Text style={styles.checkMark}>✓</Text>}
              </TouchableOpacity>
            );
          }}
        />
      </View>

      <TouchableOpacity
        style={[styles.createBtn, (!groupName.trim() || selected.length === 0) && styles.btnDisabled]}
        onPress={handleCreate}
        disabled={!groupName.trim() || selected.length === 0 || loading}
      >
        {loading
          ? <ActivityIndicator color="#06061a" />
          : <Text style={styles.createBtnText}>إنشاء المجموعة ({selected.length} أصدقاء)</Text>
        }
      </TouchableOpacity>
    </View>
  );
}

// ══════════════════════════════
// ستايل
// ══════════════════════════════
const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#06061a',
    paddingTop: 56,
  },
  chatContainer: {
    flex: 1, backgroundColor: '#06061a',
    paddingTop: 56,
  },

  // هيدر
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16, marginBottom: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#0f0f2e', borderWidth: 1,
    borderColor: '#f5c51830', alignItems: 'center', justifyContent: 'center',
  },
  backText: { color: '#f5c518', fontSize: 20, fontWeight: '700' },
  headerTitle: { color: '#f5c518', fontSize: 18, fontWeight: '900' },
  addGroupBtn: {
    backgroundColor: '#7c3aed22', borderWidth: 1,
    borderColor: '#7c3aed50', paddingHorizontal: 12,
    paddingVertical: 7, borderRadius: 12,
  },
  addGroupText: { color: '#a78bfa', fontSize: 13, fontWeight: '700' },

  // تابز
  tabs: {
    flexDirection: 'row', paddingHorizontal: 16,
    gap: 8, marginBottom: 4,
  },
  tabBtn: {
    flex: 1, paddingVertical: 9, borderRadius: 12,
    backgroundColor: '#0f0f2e', borderWidth: 1,
    borderColor: '#ffffff10', alignItems: 'center',
  },
  tabBtnActive: { backgroundColor: '#f5c51815', borderColor: '#f5c51840' },
  tabText: { color: '#3a3a60', fontSize: 12, fontWeight: '600' },
  tabTextActive: { color: '#f5c518', fontSize: 12, fontWeight: '800' },

  // المحادثات
  convCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0f0f2e', borderRadius: 16,
    borderWidth: 1, borderColor: '#ffffff10', padding: 14, gap: 12,
  },
  convAvatar: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  convAvatarEmoji: { fontSize: 22 },
  convInfo: { flex: 1 },
  convName: { color: '#e0e0ff', fontSize: 15, fontWeight: '700' },
  convLastMsg: { color: '#3a3a60', fontSize: 12, marginTop: 3 },
  groupBadge: {
    backgroundColor: '#7c3aed22', paddingHorizontal: 8,
    paddingVertical: 4, borderRadius: 8,
  },
  groupBadgeText: { color: '#a78bfa', fontSize: 11 },

  // إضافة صديق
  searchRow: { flexDirection: 'row', gap: 10 },
  searchInput: {
    flex: 1, backgroundColor: '#0f0f2e',
    borderRadius: 14, borderWidth: 1,
    borderColor: '#ffffff15', color: '#e0e0ff',
    paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 14, textAlign: 'right',
  },
  searchBtn: {
    backgroundColor: '#f5c518', width: 48,
    borderRadius: 14, alignItems: 'center', justifyContent: 'center',
  },
  searchBtnText: { fontSize: 18 },
  userCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0f0f2e', borderRadius: 14,
    borderWidth: 1, borderColor: '#ffffff10',
    padding: 12, gap: 12,
  },
  userAvatar: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#f5c51822', alignItems: 'center', justifyContent: 'center',
  },
  userAvatarText: { color: '#f5c518', fontSize: 18, fontWeight: '700' },
  userInfo: { flex: 1 },
  userName: { color: '#e0e0ff', fontSize: 14, fontWeight: '700' },
  userUsername: { color: '#3a3a60', fontSize: 12, marginTop: 2 },
  addBtn: {
    backgroundColor: '#f5c51822', borderWidth: 1,
    borderColor: '#f5c51850', paddingHorizontal: 12,
    paddingVertical: 7, borderRadius: 10,
  },
  addBtnText: { color: '#f5c518', fontSize: 13, fontWeight: '700' },
  sentBadge: {
    backgroundColor: '#10b98122', paddingHorizontal: 12,
    paddingVertical: 7, borderRadius: 10,
  },
  sentText: { color: '#34d399', fontSize: 13, fontWeight: '700' },

  // الطلبات
  requestCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0f0f2e', borderRadius: 14,
    borderWidth: 1, borderColor: '#ffffff10',
    padding: 12, gap: 12,
  },
  requestName: { color: '#e0e0ff', fontSize: 14, fontWeight: '700', flex: 1 },
  requestBtns: { flexDirection: 'row', gap: 8 },
  acceptBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: '#10b98122', borderWidth: 1,
    borderColor: '#10b98150', alignItems: 'center', justifyContent: 'center',
  },
  acceptText: { color: '#34d399', fontSize: 18, fontWeight: '700' },
  declineBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: '#ef444422', borderWidth: 1,
    borderColor: '#ef444450', alignItems: 'center', justifyContent: 'center',
  },
  declineText: { color: '#f87171', fontSize: 18, fontWeight: '700' },

  // المحادثة
  chatHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16, marginBottom: 8,
  },
  chatHeaderCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 8 },
  chatHeaderEmoji: { fontSize: 20 },
  chatHeaderName: { color: '#f5c518', fontSize: 16, fontWeight: '800', flex: 1 },
  startGameBtn: {
    backgroundColor: '#7c3aed22', borderWidth: 1,
    borderColor: '#7c3aed50', paddingHorizontal: 12,
    paddingVertical: 7, borderRadius: 12,
  },
  startGameText: { color: '#a78bfa', fontSize: 13, fontWeight: '700' },
  msgList: { padding: 16, gap: 8, flexGrow: 1 },
  msgRow: { alignItems: 'flex-start' },
  msgRowMe: { alignItems: 'flex-end' },
  msgSender: { color: '#3a3a60', fontSize: 11, marginBottom: 3, marginRight: 8 },
  msgBubble: {
    maxWidth: '78%', borderRadius: 16,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  msgBubbleThem: { backgroundColor: '#0f0f2e', borderWidth: 1, borderColor: '#ffffff10', borderBottomLeftRadius: 4 },
  msgBubbleMe: { backgroundColor: '#f5c518', borderBottomRightRadius: 4 },
  msgText: { color: '#e0e0ff', fontSize: 15, lineHeight: 22 },
  msgTextMe: { color: '#06061a', fontWeight: '600' },
  inputRow: {
    flexDirection: 'row', padding: 12,
    paddingBottom: 20, gap: 10,
    borderTopWidth: 1, borderTopColor: '#ffffff08',
    backgroundColor: '#06061a',
  },
  msgInput: {
    flex: 1, backgroundColor: '#0f0f2e',
    borderRadius: 16, borderWidth: 1,
    borderColor: '#ffffff15', color: '#e0e0ff',
    paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 15, textAlign: 'right', maxHeight: 100,
  },
  sendBtn: {
    width: 46, height: 46, borderRadius: 14,
    backgroundColor: '#f5c518', alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#f5c51840' },
  sendBtnText: { color: '#06061a', fontSize: 22, fontWeight: '900' },

  // إنشاء مجموعة
  groupNameInput: {
    backgroundColor: '#0f0f2e', borderRadius: 14,
    borderWidth: 1, borderColor: '#ffffff15',
    color: '#e0e0ff', paddingHorizontal: 16,
    paddingVertical: 14, fontSize: 15, textAlign: 'right',
  },
  selectLabel: { color: '#5a5a80', fontSize: 14, fontWeight: '600' },
  friendSelectCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0f0f2e', borderRadius: 14,
    borderWidth: 1, borderColor: '#ffffff10',
    padding: 12, gap: 12,
  },
  friendSelectCardActive: { borderColor: '#f5c51840', backgroundColor: '#f5c51808' },
  checkMark: { color: '#f5c518', fontSize: 18, fontWeight: '700' },
  createBtn: {
    backgroundColor: '#f5c518', margin: 16,
    borderRadius: 16, paddingVertical: 16,
    alignItems: 'center',
  },
  createBtnText: { color: '#06061a', fontSize: 16, fontWeight: '800' },
  btnDisabled: { opacity: 0.4 },

  // فارغ
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingTop: 60 },
  emptyEmoji: { fontSize: 40 },
  emptyText: { color: '#3a3a60', fontSize: 16, fontWeight: '600' },
  emptyHint: { color: '#2a2a50', fontSize: 13 },
});
