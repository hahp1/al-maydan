import { useState, useEffect, useRef, useCallback, memo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput,
  FlatList, KeyboardAvoidingView, Platform, Animated,
  ActivityIndicator, StatusBar,
} from 'react-native';
import { db } from './firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import {
  searchUsers, sendFriendRequest,
  listenIncomingRequests, acceptFriendRequest, declineFriendRequest,
  listenConversations, listenMessages, sendMessage, createGroup,
} from './friendService';
import { useTheme } from './ThemeContext';
import { useT, useRTLStyles } from './I18n';
import { ThemedButton, ThemedCard, ThemedPill, ThemedModal, ThemedRow } from './ThemedComponents';

const TABS = { CHATS: 'chats', FRIENDS: 'friends', REQUESTS: 'requests' };

// ── بطاقة المحادثة ──
const ConvCard = memo(({ item, onOpen, theme }) => (
  <ThemedCard onPress={() => onOpen(item)} style={styles.convCard}>
    <View style={[styles.convAvatar, { backgroundColor: item.type === 'group' ? theme.purpleSoft : theme.accentSoft }]}>
      <Text style={styles.convAvatarEmoji}>{item.type === 'group' ? '👥' : '👤'}</Text>
    </View>
    <View style={styles.convInfo}>
      <Text style={[styles.convName, { color: theme.textPrimary }]}>
        {item.type === 'group' ? item.name : 'صديق'}
      </Text>
      <Text style={[styles.convLastMsg, { color: theme.textMuted }]} numberOfLines={1}>
        {item.lastMessage || 'ابدأ المحادثة...'}
      </Text>
    </View>
    {item.type === 'group' && (
      <View style={[styles.groupBadge, { backgroundColor: theme.purpleSoft }]}>
        <Text style={[styles.groupBadgeText, { color: theme.purple }]}>{item.members?.length} 👤</Text>
      </View>
    )}
  </ThemedCard>
));

const EmptyView = memo(({ emoji, text, hint, theme }) => (
  <View style={styles.emptyWrap}>
    <Text style={styles.emptyEmoji}>{emoji}</Text>
    <Text style={[styles.emptyText, { color: theme?.textSecondary }]}>{text}</Text>
    {hint ? <Text style={[styles.emptyHint, { color: theme?.textMuted }]}>{hint}</Text> : null}
  </View>
));

// ══ قائمة المحادثات ══
const ChatsList = memo(({ conversations, user, onOpen, theme, t }) => {
  const keyExtractor = useCallback(i => i.id, []);
  const renderItem   = useCallback(({ item }) => (
    <ConvCard item={item} myUid={user?.uid} onOpen={onOpen} theme={theme} />
  ), [user?.uid, onOpen, theme]);

  if (conversations.length === 0) {
    return <EmptyView emoji="💬" text="لا توجد محادثات بعد" hint='أضف أصدقاء من تبويب "إضافة"' theme={theme} />;
  }
  return (
    <FlatList
      data={conversations}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      contentContainerStyle={styles.listPad}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      showsVerticalScrollIndicator={false}
      removeClippedSubviews
    />
  );
});

// ══ إضافة صديق ══
function AddFriendTab({ user, theme, t, rs }) {
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sentTo,  setSentTo]  = useState([]);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    const res = await searchUsers(query.trim(), user?.uid);
    setResults(res);
    setLoading(false);
  }, [query, user?.uid]);

  const handleSend = useCallback(async (toUid) => {
    const r = await sendFriendRequest(user?.uid, toUid);
    if (!r?.error) setSentTo(prev => [...prev, toUid]);
  }, [user?.uid]);

  const keyExtractor = useCallback(i => i.uid, []);
  const renderItem   = useCallback(({ item }) => (
    <View style={[styles.userCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
      <View style={[styles.userAvatar, { backgroundColor: theme.accentSoft }]}>
        <Text style={[styles.userAvatarText, { color: theme.accent }]}>{item.name?.[0] || '؟'}</Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={[styles.userName, { color: theme.textPrimary }]}>{item.name}</Text>
        <Text style={[styles.userUsername, { color: theme.textMuted }]}>@{item.username}</Text>
      </View>
      {sentTo.includes(item.uid) ? (
        <View style={[styles.sentBadge, { backgroundColor: '#10b98122' }]}>
          <Text style={[styles.sentText, { color: theme.success }]}>✓ أُرسل</Text>
        </View>
      ) : (
        <ThemedButton onPress={() => handleSend(item.uid)} label='＋ إضافة' variant='secondary' size='small' style={styles.addBtn} />
      )}
    </View>
  ), [sentTo, handleSend, theme]);

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <View style={styles.searchRow}>
        <TextInput
          style={[styles.searchInput, { backgroundColor: theme.bgCard, borderColor: theme.border, color: theme.textPrimary }, rs.textInput]}
          placeholder="ابحث بالاسم أو الـ username..."
          placeholderTextColor={theme.textMuted}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <ThemedButton
          onPress={handleSearch}
          label={loading ? '...' : '🔍'}
          variant="primary" size="small" fullWidth={false}
          disabled={loading}
        />
      </View>
      {results.length === 0 && !loading && query.length > 0 && (
        <EmptyView emoji="🔍" text="لا نتائج" theme={theme} />
      )}
      <FlatList
        data={results}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={{ gap: 10, marginTop: 12 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
}

// ══ طلبات الصداقة ══
function RequestsTab({ requests, currentUser, theme }) {
  const [names, setNames] = useState({});

  useEffect(() => {
    const missing = requests.filter(r => !names[r.from]);
    if (missing.length === 0) return;
    missing.forEach(async (req) => {
      const snap = await getDoc(doc(db, 'users', req.from));
      if (snap.exists()) setNames(p => ({ ...p, [req.from]: snap.data().name }));
    });
  }, [requests]);

  const handleAccept  = useCallback((id, from) => acceptFriendRequest(id, from, currentUser?.uid), [currentUser?.uid]);
  const handleDecline = useCallback((id) => declineFriendRequest(id), []);
  const keyExtractor  = useCallback(i => i.id, []);
  const renderItem    = useCallback(({ item }) => (
    <View style={[styles.requestCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
      <View style={[styles.userAvatar, { backgroundColor: theme.accentSoft }]}>
        <Text style={[styles.userAvatarText, { color: theme.accent }]}>{names[item.from]?.[0] || '؟'}</Text>
      </View>
      <Text style={[styles.requestName, { color: theme.textPrimary }]}>{names[item.from] || '...'}</Text>
      <View style={styles.requestBtns}>
        <ThemedButton onPress={() => handleAccept(item.id, item.from)} label='✓' variant='success' size='small' style={styles.acceptBtn} />
        <ThemedButton onPress={() => handleDecline(item.id)} label='✕' variant='danger' size='small' style={styles.declineBtn} />
      </View>
    </View>
  ), [names, handleAccept, handleDecline, theme]);

  if (requests.length === 0) return <EmptyView emoji="🔔" text="لا توجد طلبات" theme={theme} />;
  return (
    <FlatList
      data={requests}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      contentContainerStyle={styles.listPad}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      showsVerticalScrollIndicator={false}
    />
  );
}

// ══ شاشة المحادثة ══
const MsgBubble = memo(({ item, myUid, theme }) => {
  const isMe = item.uid === myUid;
  return (
    <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
      {!isMe && <Text style={[styles.msgSender, { color: theme.textMuted }]}>{item.name}</Text>}
      <View style={[
        styles.msgBubble,
        isMe
          ? { backgroundColor: theme.accent, borderBottomRightRadius: 4 }
          : { backgroundColor: theme.bgCard, borderColor: theme.border, borderWidth: 1, borderBottomLeftRadius: 4 },
      ]}>
        <Text style={[styles.msgText, { color: isMe ? theme.textOnAccent : theme.textPrimary }]}>
          {item.text}
        </Text>
      </View>
    </View>
  );
});

function ChatScreen({ conv, user, onBack, setScreen, t, rs }) {
  const { theme } = useTheme();
  const [messages, setMessages] = useState([]);
  const [text,     setText]     = useState('');
  const [convName, setConvName] = useState(conv.name || '');
  const flatRef = useRef(null);

  useEffect(() => {
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

  const handleSend = useCallback(async () => {
    if (!text.trim()) return;
    const msg = text.trim();
    setText('');
    await sendMessage(conv.id, user?.uid, user?.name || 'لاعب', msg);
  }, [text, conv.id, user]);

  const goGames      = useCallback(() => setScreen('games'), [setScreen]);
  const keyExtractor = useCallback(i => i.id, []);
  const renderItem   = useCallback(({ item }) => (
    <MsgBubble item={item} myUid={user?.uid} theme={theme} />
  ), [user?.uid, theme]);
  const scrollToEnd  = useCallback(() => {
    flatRef.current?.scrollToEnd({ animated: true });
  }, []);

  return (
    <KeyboardAvoidingView
      style={[styles.chatContainer, { backgroundColor: 'transparent' }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.statusBg} />
      <View style={[styles.chatHeader, { borderBottomColor: theme.divider }]}>
        <ThemedButton onPress={onBack} label={t('common.backArrow')} variant='ghost' size='small' style={styles.backBtn} />
        <View style={styles.chatHeaderCenter}>
          <Text style={styles.chatHeaderEmoji}>{conv.type === 'group' ? '👥' : '👤'}</Text>
          <Text style={[styles.chatHeaderName, { color: theme.accent }]} numberOfLines={1}>{convName}</Text>
        </View>
        <ThemedButton onPress={goGames} label='🎮 لعبة' variant='secondary' size='small' style={styles.startGameBtn} />
      </View>

      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.msgList}
        onContentSizeChange={scrollToEnd}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        initialNumToRender={20}
        ListEmptyComponent={<EmptyView emoji="👋" text="قل مرحباً!" theme={theme} />}
      />

      <View style={[styles.inputRow, { backgroundColor: 'transparent', borderTopColor: theme.divider }]}>
        <TextInput
          style={[styles.msgInput, { backgroundColor: theme.bgCard, borderColor: theme.border, color: theme.textPrimary }, rs.textInput]}
          placeholder="اكتب رسالة..."
          placeholderTextColor={theme.textMuted}
          value={text}
          onChangeText={setText}
          onSubmitEditing={handleSend}
          returnKeyType="send"
          multiline
        />
        <ThemedButton onPress={handleSend} disabled={!text.trim()} label='↑' variant='primary' size='small' style={styles.sendBtn} />
      </View>
    </KeyboardAvoidingView>
  );
}

// ══ إنشاء مجموعة ══
function CreateGroupScreen({ user, conversations, onBack, onCreated, theme, t, rs }) {
  const [groupName,   setGroupName]   = useState('');
  const [selected,    setSelected]    = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [friendNames, setFriendNames] = useState({});

  useEffect(() => {
    conversations.forEach(async (conv) => {
      const otherUid = conv.members?.find(m => m !== user?.uid);
      if (otherUid && !friendNames[otherUid]) {
        const snap = await getDoc(doc(db, 'users', otherUid));
        if (snap.exists()) setFriendNames(p => ({ ...p, [otherUid]: snap.data().name }));
      }
    });
  }, [conversations]);

  const toggle = useCallback((uid) => {
    setSelected(prev => prev.includes(uid) ? prev.filter(u => u !== uid) : [...prev, uid]);
  }, []);

  const handleCreate = useCallback(async () => {
    if (!groupName.trim() || selected.length === 0) return;
    setLoading(true);
    const id = await createGroup(user?.uid, groupName.trim(), selected);
    setLoading(false);
    onCreated(id);
  }, [groupName, selected, user?.uid, onCreated]);

  const friends      = conversations
    .map(c => ({ uid: c.members?.find(m => m !== user?.uid), convId: c.id }))
    .filter(f => f.uid);
  const keyExtractor = useCallback(i => i.uid, []);
  const renderItem   = useCallback(({ item }) => {
    const isSelected = selected.includes(item.uid);
    return (
      <ThemedCard
        onPress={() => toggle(item.uid)}
        style={styles.friendSelectCard}
        variant={isSelected ? 'accent' : 'default'}
      >
        <View style={[styles.userAvatar, { backgroundColor: theme.accentSoft }]}>
          <Text style={[styles.userAvatarText, { color: theme.accent }]}>{friendNames[item.uid]?.[0] || '؟'}</Text>
        </View>
        <Text style={[styles.userName, { color: isSelected ? theme.accent : theme.textPrimary }]}>
          {friendNames[item.uid] || '...'}
        </Text>
        {isSelected && <Text style={[styles.checkMark, { color: theme.accent }]}>✓</Text>}
      </ThemedCard>
    );
  }, [selected, friendNames, toggle, theme]);

  const canCreate = groupName.trim() && selected.length > 0;

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      <View style={styles.header}>
        <ThemedButton onPress={onBack} label={t('common.backArrow')} variant='ghost' size='small' style={styles.backBtn} />
        <Text style={[styles.headerTitle, { color: theme.accent }]}>➕ مجموعة جديدة</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={{ paddingHorizontal: 16, gap: 12 }}>
        <TextInput
          style={[styles.groupNameInput, { backgroundColor: theme.bgCard, borderColor: theme.border, color: theme.textPrimary }, rs.textInput]}
          placeholder="اسم المجموعة..."
          placeholderTextColor={theme.textMuted}
          value={groupName}
          onChangeText={setGroupName}
        />
        <Text style={[styles.selectLabel, { color: theme.textSecondary }]}>اختر الأصدقاء:</Text>
        {friends.length === 0 && <EmptyView emoji="👤" text="لا يوجد أصدقاء بعد" theme={theme} />}
      </View>

      <FlatList
        data={friends}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        showsVerticalScrollIndicator={false}
      />

      <ThemedButton
        onPress={handleCreate}
        disabled={!canCreate || loading}
        label={loading ? '...' : `إنشاء المجموعة (${selected.length} أصدقاء)`}
        variant={canCreate ? 'primary' : 'secondary'}
        size='large'
        style={styles.createBtn}
      />
    </View>
  );
}

// ══ الشاشة الرئيسية ══
// ✅ يقبل initialTab لتحديد التاب الابتدائي من HomeScreen
export default function FriendsScreen({ user, setScreen, initialTab = TABS.CHATS }) {
  const { theme } = useTheme();
  const t  = useT();
  const rs = useRTLStyles();

  // ✅ التعديل الوحيد: القيمة الابتدائية تأتي من initialTab بدل TABS.CHATS الثابتة
  const [tab,              setTab]              = useState(initialTab);
  const [conversations,    setConversations]    = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [openConv,         setOpenConv]         = useState(null);
  const [showCreateGroup,  setShowCreateGroup]  = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
    if (!user?.uid) return;
    const unsubConv = listenConversations(user.uid, setConversations);
    const unsubReq  = listenIncomingRequests(user.uid, setIncomingRequests);
    return () => { unsubConv(); unsubReq(); };
  }, [user?.uid]);

  const goHome          = useCallback(() => setScreen('home'), [setScreen]);
  const openGroup       = useCallback(() => setShowCreateGroup(true), []);
  const closeGroup      = useCallback(() => setShowCreateGroup(false), []);
  const handleGroupDone = useCallback(() => setShowCreateGroup(false), []);
  const closeConv       = useCallback(() => setOpenConv(null), []);

  const TABS_LIST = [
    { key: TABS.CHATS,    label: '💬 المحادثات' },
    { key: TABS.FRIENDS,  label: '🔍 إضافة' },
    { key: TABS.REQUESTS, label: `🔔 الطلبات${incomingRequests.length > 0 ? ` (${incomingRequests.length})` : ''}` },
  ];

  if (openConv) return (
    <ChatScreen conv={openConv} user={user} onBack={closeConv} setScreen={setScreen} t={t} rs={rs} />
  );

  if (showCreateGroup) return (
    <CreateGroupScreen
      user={user}
      conversations={conversations.filter(c => c.type === 'dm')}
      onBack={closeGroup}
      onCreated={handleGroupDone}
      theme={theme}
      t={t}
      rs={rs}
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.statusBg} />

      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <ThemedButton onPress={goHome} label={t('common.backArrow')} variant='ghost' size='small' style={styles.backBtn} />
        <Text style={[styles.headerTitle, { color: theme.accent }]}>👥 الأصدقاء</Text>
        <ThemedButton onPress={openGroup} label='＋ مجموعة' variant='secondary' size='small' style={styles.addGroupBtn} />
      </Animated.View>

      <Animated.View style={[styles.tabs, { opacity: fadeAnim }]}>
        {TABS_LIST.map(tb => (
          <ThemedCard
            key={tb.key}
            onPress={() => setTab(tb.key)}
            style={styles.tabBtn}
            variant={tab === tb.key ? 'accent' : 'default'}
          >
            <Text style={[
              styles.tabText,
              { color: tab === tb.key ? theme.accent : theme.textMuted },
              tab === tb.key && { fontWeight: '800' },
            ]}>
              {tb.label}
            </Text>
          </ThemedCard>
        ))}
      </Animated.View>

      <Animated.View style={[{ flex: 1, width: '100%' }, { opacity: fadeAnim }]}>
        {tab === TABS.CHATS    && <ChatsList conversations={conversations} user={user} onOpen={setOpenConv} theme={theme} t={t} />}
        {tab === TABS.FRIENDS  && <AddFriendTab user={user} theme={theme} t={t} rs={rs} />}
        {tab === TABS.REQUESTS && <RequestsTab requests={incomingRequests} currentUser={user} theme={theme} />}
      </Animated.View>
    </View>
  );
}

const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

const styles = StyleSheet.create({
  container:         { flex: 1, paddingTop: 56 },
  chatContainer:     { flex: 1, paddingTop: 56 },
  header:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 12 },
  backBtn:           { width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  backText:          { fontSize: 20, fontWeight: '700' },
  headerTitle:       { fontSize: 18, fontWeight: '900' },
  addGroupBtn:       { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12 },
  addGroupText:      { fontSize: 13, fontWeight: '700' },
  tabs:              { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 4 },
  tabBtn:            { flex: 1, paddingVertical: 9, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  tabText:           { fontSize: 12, fontWeight: '600' },
  listPad:           { padding: 16 },
  convCard:          { flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1, padding: 14, gap: 12 },
  convAvatar:        { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  convAvatarEmoji:   { fontSize: 22 },
  convInfo:          { flex: 1 },
  convName:          { fontSize: 15, fontWeight: '700' },
  convLastMsg:       { fontSize: 12, marginTop: 3 },
  groupBadge:        { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  groupBadgeText:    { fontSize: 11 },
  searchRow:         { flexDirection: 'row', gap: 10 },
  searchInput:       { flex: 1, borderRadius: 14, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14 },
  searchBtn:         { width: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  searchBtnText:     { fontSize: 18 },
  userCard:          { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, padding: 12, gap: 12 },
  userAvatar:        { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  userAvatarText:    { fontSize: 18, fontWeight: '700' },
  userInfo:          { flex: 1 },
  userName:          { fontSize: 14, fontWeight: '700' },
  userUsername:      { fontSize: 12, marginTop: 2 },
  addBtn:            { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  addBtnText:        { fontSize: 13, fontWeight: '700' },
  sentBadge:         { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  sentText:          { fontSize: 13, fontWeight: '700' },
  requestCard:       { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, padding: 12, gap: 12 },
  requestName:       { fontSize: 14, fontWeight: '700', flex: 1 },
  requestBtns:       { flexDirection: 'row', gap: 8 },
  acceptBtn:         { width: 38, height: 38, borderRadius: 10, backgroundColor: '#10b98122', borderWidth: 1, borderColor: '#10b98150', alignItems: 'center', justifyContent: 'center' },
  acceptText:        { fontSize: 18, fontWeight: '700' },
  declineBtn:        { width: 38, height: 38, borderRadius: 10, backgroundColor: '#ef444422', borderWidth: 1, borderColor: '#ef444450', alignItems: 'center', justifyContent: 'center' },
  declineText:       { fontSize: 18, fontWeight: '700' },
  chatHeader:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 8, paddingBottom: 12, borderBottomWidth: 1 },
  chatHeaderCenter:  { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 8 },
  chatHeaderEmoji:   { fontSize: 20 },
  chatHeaderName:    { fontSize: 16, fontWeight: '800', flex: 1 },
  startGameBtn:      { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12 },
  startGameText:     { fontSize: 13, fontWeight: '700' },
  msgList:           { padding: 16, gap: 8, flexGrow: 1 },
  msgRow:            { alignItems: 'flex-start' },
  msgRowMe:          { alignItems: 'flex-end' },
  msgSender:         { fontSize: 11, marginBottom: 3, marginRight: 8 },
  msgBubble:         { maxWidth: '78%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  msgText:           { fontSize: 15, lineHeight: 22 },
  inputRow:          { flexDirection: 'row', padding: 12, paddingBottom: 20, gap: 10, borderTopWidth: 1 },
  msgInput:          { flex: 1, borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, maxHeight: 100 },
  sendBtn:           { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  sendBtnText:       { fontSize: 22, fontWeight: '900' },
  groupNameInput:    { borderRadius: 14, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15 },
  selectLabel:       { fontSize: 14, fontWeight: '600' },
  friendSelectCard:  { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, padding: 12, gap: 12 },
  checkMark:         { fontSize: 18, fontWeight: '700' },
  createBtn:         { margin: 16, borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  createBtnText:     { fontSize: 16, fontWeight: '800' },
  btnDisabled:       { opacity: 0.4 },
  emptyWrap:         { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingTop: 60 },
  emptyEmoji:        { fontSize: 40 },
  emptyText:         { fontSize: 16, fontWeight: '600' },
  emptyHint:         { fontSize: 13 },
});
