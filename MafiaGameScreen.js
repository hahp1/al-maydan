import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, Animated, Alert, ActivityIndicator,
  ScrollView, TextInput, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { db, auth } from './firebaseConfig';
import {
  doc, setDoc, onSnapshot, updateDoc,
  collection, serverTimestamp, arrayUnion, getDoc, addDoc, query, orderBy,
} from 'firebase/firestore';

// ══════════════════════════════════════
// ثوابت
// ══════════════════════════════════════
const MIN_PLAYERS  = 4;
const MAX_PLAYERS  = 12;
const COST         = 10;
const DAY_SECONDS  = 90;
const NIGHT_SECS   = 45;

function assignRoles(n) {
  let mafia;
  if (n <= 5) mafia = 1; else if (n <= 8) mafia = 2; else mafia = 3;
  const roles = [];
  for (let i = 0; i < mafia; i++) roles.push('mafia');
  roles.push('detective'); roles.push('doctor');
  while (roles.length < n) roles.push('civilian');
  for (let i = roles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [roles[i], roles[j]] = [roles[j], roles[i]];
  }
  return roles;
}

const ROLE_INFO = {
  mafia:     { label: 'مافيا',  emoji: '🔪', color: '#ef4444', desc: 'اقتل مواطناً كل ليلة بالاتفاق مع المافيا الآخرين' },
  detective: { label: 'محقق',  emoji: '🔍', color: '#3b82f6', desc: 'كل ليلة اختر لاعباً لتعرف إذا كان مافيا أم لا' },
  doctor:    { label: 'طبيب',  emoji: '💊', color: '#22c55e', desc: 'كل ليلة احمِ لاعباً من القتل (يمكنك حماية نفسك)' },
  civilian:  { label: 'مواطن', emoji: '👤', color: '#a0a0c0', desc: 'صوّت نهاراً لطرد المشتبه به' },
};

function genCode() { return Math.random().toString(36).slice(2, 8).toUpperCase(); }
function getUid() {
  const u = auth.currentUser?.uid;
  if (u) return u;
  if (!global._gUid) global._gUid = 'guest_' + Math.random().toString(36).slice(2, 10);
  return global._gUid;
}
function getRolesPreview(n) {
  if (!n) return '';
  let mafia;
  if (n <= 5) mafia = 1; else if (n <= 8) mafia = 2; else mafia = 3;
  const civ = Math.max(0, n - mafia - 2);
  return `🔪×${mafia}  🔍×1  💊×1  👤×${civ}`;
}

// ══════════════════════════════════════
// عداد الوقت
// ══════════════════════════════════════
function CountdownBar({ startedAt, totalSeconds, onEnd }) {
  const [remaining, setRemaining] = useState(totalSeconds);
  const anim = useRef(new Animated.Value(1)).current;
  const endCalledRef = useRef(false);

  useEffect(() => {
    if (!startedAt) return;
    endCalledRef.current = false;
    const elapsed = Math.floor((Date.now() - startedAt) / 1000);
    const left = Math.max(0, totalSeconds - elapsed);
    setRemaining(left);
    anim.setValue(left / totalSeconds);
    Animated.timing(anim, { toValue: 0, duration: left * 1000, useNativeDriver: false }).start();
    const iv = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) {
          clearInterval(iv);
          if (!endCalledRef.current) { endCalledRef.current = true; onEnd?.(); }
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [startedAt]);

  const barColor = remaining > totalSeconds * 0.5 ? '#22c55e'
    : remaining > totalSeconds * 0.25 ? '#f59e0b' : '#ef4444';

  return (
    <View style={cb.wrap}>
      <View style={cb.track}>
        <Animated.View style={[cb.fill, {
          width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
          backgroundColor: barColor,
        }]} />
      </View>
      <Text style={[cb.num, { color: barColor }]}>{remaining}s</Text>
    </View>
  );
}
const cb = StyleSheet.create({
  wrap:  { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 6 },
  track: { flex: 1, height: 6, backgroundColor: '#1a1a3e', borderRadius: 3, overflow: 'hidden' },
  fill:  { height: '100%', borderRadius: 3 },
  num:   { fontSize: 14, fontWeight: '900', minWidth: 32, textAlign: 'right' },
});

// ══════════════════════════════════════
// شرح اللعبة
// ══════════════════════════════════════
function HowToPlayModal({ visible, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={ht.overlay}>
        <View style={ht.box}>
          <Text style={ht.title}>🎭 كيف تلعب المافيا؟</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={ht.section}>👥 عدد اللاعبين: 4–12 • كل لاعب يدفع {COST} 🪙</Text>
            <Text style={ht.section}>🌙 الليل ({NIGHT_SECS}s)</Text>
            <Text style={ht.body}>كل دور يتصرف سراً:{'\n'}🔪 المافيا تتفق على قتل مواطن{'\n'}💊 الطبيب يحمي لاعباً{'\n'}🔍 المحقق يتحقق من هوية لاعب</Text>
            <Text style={ht.section}>☀️ النهار ({DAY_SECONDS}s)</Text>
            <Text style={ht.body}>يُعلن من مات ليلاً. الجميع يتناقش عبر الچات ويصوّت لطرد المشتبه به. يمكن تغيير الاختيار حتى انتهاء الوقت.</Text>
            <Text style={ht.section}>🏆 شروط الفوز</Text>
            <Text style={ht.body}>🔪 المافيا: عددها = عدد المواطنين أو أكثر{'\n'}🏙️ المدينة: كل المافيا تُطرد</Text>
            <Text style={ht.section}>الأدوار</Text>
            {Object.entries(ROLE_INFO).map(([k, r]) => (
              <Text key={k} style={[ht.role, { color: r.color }]}>
                {r.emoji} {r.label}: <Text style={ht.roleDesc}>{r.desc}</Text>
              </Text>
            ))}
          </ScrollView>
          <TouchableOpacity style={ht.btn} onPress={onClose}>
            <Text style={ht.btnText}>فهمت! 👍</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
const ht = StyleSheet.create({
  overlay:  { flex: 1, backgroundColor: '#00000099', justifyContent: 'center', alignItems: 'center' },
  box:      { backgroundColor: '#0f0f2e', borderRadius: 20, padding: 24, width: '88%', maxHeight: '82%', borderWidth: 1, borderColor: '#ffffff15' },
  title:    { color: '#a855f7', fontSize: 18, fontWeight: '900', textAlign: 'center', marginBottom: 16 },
  section:  { color: '#a855f7', fontSize: 14, fontWeight: '800', marginTop: 12, marginBottom: 4, textAlign: 'right' },
  body:     { color: '#9090b0', fontSize: 13, lineHeight: 22, textAlign: 'right' },
  role:     { fontSize: 13, fontWeight: '700', marginVertical: 3, textAlign: 'right' },
  roleDesc: { color: '#7070a0', fontWeight: '400' },
  btn:      { backgroundColor: '#a855f7', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 18 },
  btnText:  { color: '#fff', fontSize: 16, fontWeight: '900' },
});

// ══════════════════════════════════════
// چات اللعبة
// ══════════════════════════════════════
function GameChat({ roomId, myUid, myName, disabled }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const scrollRef = useRef(null);
  const unsubRef  = useRef(null);

  useEffect(() => {
    if (!roomId) return;
    const q = query(collection(db, 'mafia_rooms', roomId, 'messages'), orderBy('createdAt', 'asc'));
    unsubRef.current = onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    });
    return () => unsubRef.current?.();
  }, [roomId]);

  async function sendMessage() {
    const msg = text.trim();
    if (!msg || disabled) return;
    setText('');
    await addDoc(collection(db, 'mafia_rooms', roomId, 'messages'), {
      uid: myUid, name: myName, text: msg, createdAt: serverTimestamp(),
    });
  }

  return (
    <View style={ch.wrap}>
      <ScrollView ref={scrollRef} style={ch.msgs} contentContainerStyle={{ paddingVertical: 8 }} showsVerticalScrollIndicator={false}>
        {messages.map(m => (
          <View key={m.id} style={[ch.bubble, m.uid === myUid && ch.bubbleMe]}>
            {m.uid !== myUid && <Text style={ch.sender}>{m.name}</Text>}
            <Text style={[ch.msgTxt, m.uid === myUid && ch.msgTxtMe]}>{m.text}</Text>
          </View>
        ))}
        {messages.length === 0 && <Text style={ch.empty}>💬 ابدأ النقاش...</Text>}
      </ScrollView>
      <View style={ch.row}>
        <TextInput
          style={[ch.input, disabled && ch.inputOff]}
          placeholder={disabled ? '🔒 الچات متاح نهاراً فقط' : 'اكتب رسالة...'}
          placeholderTextColor="#3a3a60"
          value={text}
          onChangeText={setText}
          onSubmitEditing={sendMessage}
          editable={!disabled}
          returnKeyType="send"
          textAlign="right"
          maxLength={120}
        />
        <TouchableOpacity
          style={[ch.sendBtn, (!text.trim() || disabled) && ch.sendOff]}
          onPress={sendMessage}
          disabled={!text.trim() || disabled}
        >
          <Text style={ch.sendIco}>↑</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
const ch = StyleSheet.create({
  wrap:     { flex: 1, borderTopWidth: 1, borderTopColor: '#ffffff08' },
  msgs:     { flex: 1, paddingHorizontal: 12 },
  bubble:   { backgroundColor: '#0f0f2e', borderRadius: 12, padding: 10, marginVertical: 3, maxWidth: '80%', alignSelf: 'flex-start', borderWidth: 1, borderColor: '#ffffff08' },
  bubbleMe: { backgroundColor: '#1a0a2e', alignSelf: 'flex-end', borderColor: '#a855f720' },
  sender:   { color: '#a855f7', fontSize: 11, fontWeight: '700', marginBottom: 3 },
  msgTxt:   { color: '#c0c0e0', fontSize: 14, lineHeight: 20 },
  msgTxtMe: { color: '#e0e0ff' },
  empty:    { color: '#3a3a60', textAlign: 'center', marginTop: 20, fontSize: 13 },
  row:      { flexDirection: 'row', gap: 8, padding: 10, paddingBottom: 14 },
  input:    { flex: 1, backgroundColor: '#0f0f2e', borderRadius: 12, borderWidth: 1, borderColor: '#ffffff15', color: '#e0e0ff', paddingHorizontal: 14, paddingVertical: 10, fontSize: 14 },
  inputOff: { opacity: 0.4 },
  sendBtn:  { width: 42, height: 42, borderRadius: 12, backgroundColor: '#a855f7', alignItems: 'center', justifyContent: 'center' },
  sendOff:  { backgroundColor: '#2a2a45' },
  sendIco:  { color: '#fff', fontSize: 18, fontWeight: '900' },
});

// ══════════════════════════════════════
// المكوّن الرئيسي
// ══════════════════════════════════════
export default function MafiaGameScreen({ onBack, currentUser, tokens, onSpendTokens }) {
  const [phase,        setPhase]        = useState('menu');
  const [roomId,       setRoomId]       = useState(null);
  const [roomData,     setRoomData]     = useState(null);
  const [myUid,        setMyUid]        = useState(null);
  const [myName,       setMyName]       = useState('');
  const [loading,      setLoading]      = useState(false);
  const [codeInput,    setCodeInput]    = useState('');
  const [showHow,      setShowHow]      = useState(false);
  const [myRole,       setMyRole]       = useState(null);
  const [roleRevealed, setRoleRevealed] = useState(false);
  const [myVote,       setMyVote]       = useState(null);
  const [myNightAct,   setMyNightAct]   = useState(null);
  const [nightResult,  setNightResult]  = useState(null);
  const [desiredCount, setDesiredCount] = useState(6);
  const [activeTab,    setActiveTab]    = useState('action');
  const unsubRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const uid = getUid();
    setMyUid(uid);
    setMyName(currentUser?.name || auth.currentUser?.displayName || 'لاعب');
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    return () => { if (unsubRef.current) unsubRef.current(); };
  }, []);

  function subscribeRoom(id) {
    if (unsubRef.current) unsubRef.current();
    unsubRef.current = onSnapshot(doc(db, 'mafia_rooms', id), snap => {
      if (!snap.exists()) { doReset(); return; }
      const data = snap.data();
      setRoomData(data);
      if (data.phase === 'lobby') {
        setPhase('lobby');
      } else if (data.phase === 'role_reveal') {
        const me = data.players.find(p => p.uid === getUid());
        if (me) { setMyRole(me.role); setRoleRevealed(false); }
        setPhase('role');
      } else if (data.phase === 'night') {
        setMyNightAct(null); setNightResult(null); setActiveTab('action');
        setPhase('game');
      } else if (data.phase === 'day') {
        setActiveTab('chat');
        setPhase('game');
      } else if (data.phase === 'ended') {
        setPhase('ended');
      }
    });
  }

  function doReset() {
    setPhase('menu'); setRoomId(null); setRoomData(null);
    setMyRole(null); setMyVote(null); setMyNightAct(null); setNightResult(null);
  }

  // ── إنشاء غرفة ──
  async function createRoom() {
    if (tokens < COST) { Alert.alert('رصيد غير كافٍ', `تحتاج ${COST} رصيد`); return; }
    setLoading(true);
    try {
      const uid = getUid();
      const code = genCode();
      await setDoc(doc(db, 'mafia_rooms', code), {
        code, phase: 'lobby',
        maxPlayers: desiredCount, minPlayers: MIN_PLAYERS,
        createdAt: serverTimestamp(), hostUid: uid,
        players: [{ uid, name: myName, isHost: true, isAlive: true, role: null }],
        round: 0, nightActions: {}, votes: {},
        killedLastNight: null, ejectedToday: null, ejectedRole: null,
        winTeam: null, dayStartedAt: null, nightStartedAt: null,
      });
      onSpendTokens(COST);
      setRoomId(code);
      subscribeRoom(code);
    } catch (e) { Alert.alert('خطأ', e.message); }
    setLoading(false);
  }

  // ── انضمام بكود ──
  async function joinRoom() {
    const code = codeInput.trim().toUpperCase();
    if (!code) return;
    if (tokens < COST) { Alert.alert('رصيد غير كافٍ', `تحتاج ${COST} رصيد`); return; }
    setLoading(true);
    try {
      const uid = getUid();
      const roomRef = doc(db, 'mafia_rooms', code);
      const snap = await getDoc(roomRef);
      if (!snap.exists()) { Alert.alert('الغرفة غير موجودة'); setLoading(false); return; }
      const data = snap.data();
      if (data.phase !== 'lobby') { Alert.alert('اللعبة بدأت'); setLoading(false); return; }
      if (data.players.length >= data.maxPlayers) { Alert.alert('الغرفة ممتلئة'); setLoading(false); return; }
      if (!data.players.some(p => p.uid === uid)) {
        await updateDoc(roomRef, {
          players: arrayUnion({ uid, name: myName, isHost: false, isAlive: true, role: null }),
        });
      }
      onSpendTokens(COST);
      setRoomId(code);
      subscribeRoom(code);
    } catch (e) { Alert.alert('خطأ', e.message); }
    setLoading(false);
  }

  // ── بدء اللعبة (هوست) ──
  async function startGame() {
    if (!roomData || roomData.players.length < MIN_PLAYERS) {
      Alert.alert(`تحتاج ${MIN_PLAYERS} لاعبين على الأقل`); return;
    }
    const roles = assignRoles(roomData.players.length);
    const updatedPlayers = roomData.players.map((p, i) => ({ ...p, role: roles[i] }));
    await updateDoc(doc(db, 'mafia_rooms', roomId), {
      phase: 'role_reveal', players: updatedPlayers, round: 1,
    });
  }

  // ── تأكيد الدور ──
  async function confirmRole() {
    setRoleRevealed(true);
    if (roomData?.hostUid === myUid) {
      setTimeout(async () => {
        await updateDoc(doc(db, 'mafia_rooms', roomId), {
          phase: 'night', nightActions: {}, nightStartedAt: Date.now(),
        });
      }, 3000);
    }
  }

  // ── إجراء ليلي ──
  async function submitNightAction(targetUid) {
    setMyNightAct(targetUid);
    await updateDoc(doc(db, 'mafia_rooms', roomId), { [`nightActions.${myUid}`]: targetUid });
    if (myRole === 'detective') {
      const target = roomData.players.find(p => p.uid === targetUid);
      if (target) setNightResult(target.role === 'mafia' ? '🔪 هذا مافيا!' : '✅ هذا بريء');
    }
    // الهوست يتحقق إذا اكتملت الأفعال
    if (roomData?.hostUid === myUid) {
      const snap = await getDoc(doc(db, 'mafia_rooms', roomId));
      const data = snap.data();
      const actions = { ...data.nightActions, [myUid]: targetUid };
      const alive = data.players.filter(p => p.isAlive);
      const mafiaP = alive.filter(p => p.role === 'mafia');
      const docP   = alive.find(p => p.role === 'doctor');
      const detP   = alive.find(p => p.role === 'detective');
      const allDone = mafiaP.every(p => actions[p.uid])
        && (!docP || actions[docP.uid])
        && (!detP || actions[detP.uid]);
      if (allDone) await resolveNight(data, actions);
    }
  }

  async function resolveNight(data, actions) {
    const alive = data.players.filter(p => p.isAlive);
    const mafia = alive.filter(p => p.role === 'mafia');
    const docP  = alive.find(p => p.role === 'doctor');
    const targets = mafia.map(p => actions[p.uid]).filter(Boolean);
    const killTarget = targets.sort((a, b) =>
      targets.filter(v => v === b).length - targets.filter(v => v === a).length
    )[0];
    const saveTarget    = docP ? actions[docP.uid] : null;
    const killed        = (killTarget && killTarget !== saveTarget) ? killTarget : null;
    let updPlayers      = data.players.map(p => p.uid === killed ? { ...p, isAlive: false } : p);
    const newAlive      = updPlayers.filter(p => p.isAlive);
    const mafiaAlive    = newAlive.filter(p => p.role === 'mafia').length;
    const civAlive      = newAlive.filter(p => p.role !== 'mafia').length;
    const winTeam       = mafiaAlive === 0 ? 'city' : mafiaAlive >= civAlive ? 'mafia' : null;
    const killedName    = killed ? data.players.find(p => p.uid === killed)?.name : null;
    await updateDoc(doc(db, 'mafia_rooms', roomId), {
      phase: winTeam ? 'ended' : 'day',
      players: updPlayers, nightActions: {}, votes: {},
      killedLastNight: killedName || null,
      winTeam: winTeam || null,
      dayStartedAt: winTeam ? null : Date.now(),
    });
  }

  // ── تصويت نهاري (قابل للتغيير) ──
  async function submitVote(targetUid) {
    setMyVote(targetUid);
    await updateDoc(doc(db, 'mafia_rooms', roomId), { [`votes.${myUid}`]: targetUid });
  }

  // ── إنهاء النهار (انتهى الوقت / الهوست) ──
  async function endDay() {
    const snap = await getDoc(doc(db, 'mafia_rooms', roomId));
    const data = snap.data();
    if (data.phase !== 'day') return;
    const tally = {};
    Object.values(data.votes || {}).forEach(uid => { tally[uid] = (tally[uid] || 0) + 1; });
    const ejectedUid    = Object.entries(tally).sort((a, b) => b[1] - a[1])[0]?.[0];
    const ejectedPlayer = data.players.find(p => p.uid === ejectedUid);
    let updPlayers      = data.players.map(p => p.uid === ejectedUid ? { ...p, isAlive: false } : p);
    const newAlive      = updPlayers.filter(p => p.isAlive);
    const mafiaAlive    = newAlive.filter(p => p.role === 'mafia').length;
    const civAlive      = newAlive.filter(p => p.role !== 'mafia').length;
    const winTeam       = mafiaAlive === 0 ? 'city' : mafiaAlive >= civAlive ? 'mafia' : null;
    await updateDoc(doc(db, 'mafia_rooms', roomId), {
      phase: winTeam ? 'ended' : 'night',
      players: updPlayers, nightActions: {}, votes: {},
      ejectedToday: ejectedPlayer?.name || null,
      ejectedRole:  ejectedPlayer?.role  || null,
      round: data.round + 1, winTeam: winTeam || null,
      nightStartedAt: winTeam ? null : Date.now(),
      dayStartedAt: null,
    });
  }

  function alivePlayers(excludeSelf = false) {
    if (!roomData) return [];
    return roomData.players.filter(p => p.isAlive && (!excludeSelf || p.uid !== myUid));
  }

  const isHost = roomData?.hostUid === myUid;

  // ════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════

  // ── القائمة ──
  if (phase === 'menu') return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#06061a" />
      <HowToPlayModal visible={showHow} onClose={() => setShowHow(false)} />
      <Animated.View style={[s.header, { opacity: fadeAnim }]}>
        <TouchableOpacity onPress={onBack} style={s.iconBtn}>
          <Text style={s.iconBtnTxt}>→</Text>
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={{ fontSize: 28 }}>🎭</Text>
          <Text style={s.headerTitle}>المافيا</Text>
          <Text style={s.headerSub}>{MIN_PLAYERS}–{MAX_PLAYERS} لاعبين  •  {COST} 🪙 للاعب</Text>
        </View>
        <TouchableOpacity onPress={() => setShowHow(true)} style={s.iconBtn}>
          <Text style={{ fontSize: 18 }}>ℹ️</Text>
        </TouchableOpacity>
      </Animated.View>

      <Animated.View style={[s.menuBody, { opacity: fadeAnim }]}>
        <View style={s.card}>
          <Text style={s.cardLbl}>عدد اللاعبين المطلوب</Text>
          <View style={s.countRow}>
            <TouchableOpacity style={s.countBtn} onPress={() => setDesiredCount(c => Math.max(MIN_PLAYERS, c - 1))}>
              <Text style={s.countBtnTxt}>−</Text>
            </TouchableOpacity>
            <Text style={s.countNum}>{desiredCount}</Text>
            <TouchableOpacity style={s.countBtn} onPress={() => setDesiredCount(c => Math.min(MAX_PLAYERS, c + 1))}>
              <Text style={s.countBtnTxt}>+</Text>
            </TouchableOpacity>
          </View>
          <Text style={s.rolesPreview}>{getRolesPreview(desiredCount)}</Text>
        </View>

        <TouchableOpacity style={s.primaryBtn} onPress={createRoom} disabled={loading} activeOpacity={0.85}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnTxt}>🎲 أنشئ غرفة  •  {COST} 🪙</Text>}
        </TouchableOpacity>

        <View style={s.joinRow}>
          <TextInput
            style={s.codeInput}
            placeholder="كود الغرفة"
            placeholderTextColor="#3a3a60"
            value={codeInput}
            onChangeText={t => setCodeInput(t.toUpperCase())}
            autoCapitalize="characters"
            maxLength={6}
            textAlign="center"
          />
          <TouchableOpacity style={s.joinBtn} onPress={joinRoom} disabled={loading} activeOpacity={0.85}>
            <Text style={s.joinBtnTxt}>انضم  •  {COST} 🪙</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );

  // ── لوبي ──
  if (phase === 'lobby') return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#06061a" />
      <View style={s.header}>
        <TouchableOpacity onPress={() => { if (unsubRef.current) unsubRef.current(); doReset(); }} style={s.iconBtn}>
          <Text style={s.iconBtnTxt}>→</Text>
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={{ fontSize: 22 }}>🎭</Text>
          <Text style={s.headerTitle}>انتظار اللاعبين</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <View style={s.codeBox}>
        <Text style={s.codeLbl}>كود الغرفة</Text>
        <Text style={s.codeBig}>{roomId}</Text>
        <Text style={s.codeHint}>📲 شارك الكود مع أصدقائك</Text>
      </View>
      <Text style={s.rolesHint}>{getRolesPreview(roomData?.maxPlayers || desiredCount)}  عند {roomData?.maxPlayers} لاعبين</Text>

      <ScrollView style={{ flex: 1, paddingHorizontal: 20 }}>
        {roomData?.players.map(p => (
          <View key={p.uid} style={s.playerRow}>
            <Text style={s.playerName}>{p.name} {p.isHost ? '👑' : ''}</Text>
            <Text style={s.playerStatus}>✅</Text>
          </View>
        ))}
      </ScrollView>

      <View style={s.lobbyFooter}>
        <Text style={s.lobbyCnt}>{roomData?.players.length || 0} / {roomData?.maxPlayers || desiredCount} لاعبين</Text>
        {isHost ? (
          <TouchableOpacity
            style={[s.primaryBtn, (roomData?.players.length || 0) < MIN_PLAYERS && s.primaryBtnOff]}
            onPress={startGame} activeOpacity={0.85}
          >
            <Text style={s.primaryBtnTxt}>ابدأ اللعبة 🎭</Text>
          </TouchableOpacity>
        ) : (
          <Text style={s.waitTxt}>في انتظار المضيف...</Text>
        )}
      </View>
    </View>
  );

  // ── كشف الدور ──
  if (phase === 'role') {
    const r = ROLE_INFO[myRole] || ROLE_INFO.civilian;
    return (
      <View style={s.container}>
        <StatusBar barStyle="light-content" backgroundColor="#06061a" />
        <View style={s.roleWrap}>
          {!roleRevealed ? (
            <>
              <Text style={s.roleRevTitle}>دورك السري 🤫</Text>
              <Text style={s.roleRevHint}>اضغط للكشف — لا تريه لأحد!</Text>
              <TouchableOpacity style={s.primaryBtn} onPress={() => setRoleRevealed(true)}>
                <Text style={s.primaryBtnTxt}>اكشف دوري 👁️</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={{ fontSize: 80 }}>{r.emoji}</Text>
              <Text style={[s.roleBigLbl, { color: r.color }]}>{r.label}</Text>
              <Text style={s.roleDescTxt}>{r.desc}</Text>
              {myRole === 'mafia' && roomData && (
                <View style={s.mafiaBox}>
                  <Text style={s.mafiaBoxTitle}>🔪 فريق المافيا</Text>
                  {roomData.players.filter(p => p.role === 'mafia').map(p => (
                    <Text key={p.uid} style={s.mafiaBoxMbr}>
                      {p.uid === myUid ? `${p.name} (أنت)` : p.name}
                    </Text>
                  ))}
                </View>
              )}
              <TouchableOpacity style={s.primaryBtn} onPress={confirmRole}>
                <Text style={s.primaryBtnTxt}>فهمت ✅</Text>
              </TouchableOpacity>
              <Text style={s.waitSmall}>
                {isHost ? 'سيبدأ الليل تلقائياً...' : 'في انتظار المضيف...'}
              </Text>
            </>
          )}
        </View>
      </View>
    );
  }

  // ── اللعبة ──
  if (phase === 'game' && roomData) {
    const isNight  = roomData.phase === 'night';
    const isDay    = roomData.phase === 'day';
    const myPlayer = roomData.players.find(p => p.uid === myUid);
    const amAlive  = myPlayer?.isAlive;
    const r        = ROLE_INFO[myRole] || ROLE_INFO.civilian;

    return (
      <KeyboardAvoidingView
        style={s.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <StatusBar barStyle="light-content" backgroundColor="#06061a" />

        {/* هيدر اللعبة */}
        <View style={s.gameHeader}>
          <View style={[s.phaseBadge, { backgroundColor: isNight ? '#080820' : '#100a00' }]}>
            <Text style={s.phaseText}>{isNight ? '🌙 ليل' : '☀️ نهار'} — جولة {roomData.round}</Text>
          </View>
          <View style={[s.roleBadge, { borderColor: r.color + '50' }]}>
            <Text style={[s.roleBadgeTxt, { color: r.color }]}>{r.emoji} {r.label}</Text>
          </View>
        </View>

        {/* عداد */}
        {isDay && (
          <CountdownBar
            startedAt={roomData.dayStartedAt}
            totalSeconds={DAY_SECONDS}
            onEnd={() => { if (isHost) endDay(); }}
          />
        )}
        {isNight && (
          <CountdownBar
            startedAt={roomData.nightStartedAt}
            totalSeconds={NIGHT_SECS}
            onEnd={async () => {
              if (!isHost) return;
              const sn = await getDoc(doc(db, 'mafia_rooms', roomId));
              await resolveNight(sn.data(), sn.data().nightActions || {});
            }}
          />
        )}

        {/* حدث */}
        {isDay && (
          <View style={s.eventBox}>
            {roomData.killedLastNight
              ? <Text style={s.eventTxt}>🔪 قُتل ليلاً: <Text style={{ color: '#ef4444', fontWeight: '900' }}>{roomData.killedLastNight}</Text></Text>
              : <Text style={s.eventTxt}>🛡️ لم يُقتل أحد الليلة!</Text>
            }
          </View>
        )}
        {isNight && roomData.ejectedToday && (
          <View style={s.eventBox}>
            <Text style={s.eventTxt}>
              🗳️ طُرد: <Text style={{ color: '#f59e0b', fontWeight: '900' }}>{roomData.ejectedToday}</Text>
              {roomData.ejectedRole ? ` (${ROLE_INFO[roomData.ejectedRole]?.label})` : ''}
            </Text>
          </View>
        )}
        {!amAlive && (
          <View style={s.deadBanner}>
            <Text style={s.deadTxt}>💀 أنت خارج اللعبة — متابع فقط</Text>
          </View>
        )}

        {/* تابز */}
        <View style={s.tabs}>
          {[
            { key: 'action', label: isNight ? '🌙 إجراء' : '🗳️ تصويت' },
            { key: 'chat',   label: `💬 نقاش${isNight ? ' 🔒' : ''}` },
            { key: 'players',label: '👥 لاعبون' },
          ].map(t => (
            <TouchableOpacity
              key={t.key}
              style={[s.tab, activeTab === t.key && s.tabActive]}
              onPress={() => setActiveTab(t.key)}
            >
              <Text style={[s.tabTxt, activeTab === t.key && s.tabTxtActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* محتوى */}
        {activeTab === 'action' && (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
            {isNight && amAlive && (
              <>
                {myRole === 'mafia' && (
                  <View style={s.actionBox}>
                    <Text style={s.actionTitle}>🔪 اختر من تقتل الليلة</Text>
                    {alivePlayers(true).filter(p => p.role !== 'mafia').map(p => (
                      <TouchableOpacity
                        key={p.uid}
                        style={[s.targetBtn, myNightAct === p.uid && s.targetSel]}
                        onPress={() => submitNightAction(p.uid)}
                      >
                        <Text style={s.targetName}>{p.name}</Text>
                        {myNightAct === p.uid && <Text>🎯</Text>}
                      </TouchableOpacity>
                    ))}
                    {myNightAct && <Text style={s.doneTxt}>صوّتك سُجِّل ✅</Text>}
                  </View>
                )}
                {myRole === 'doctor' && (
                  <View style={s.actionBox}>
                    <Text style={s.actionTitle}>💊 اختر من تحمي الليلة</Text>
                    {alivePlayers().map(p => (
                      <TouchableOpacity
                        key={p.uid}
                        style={[s.targetBtn, myNightAct === p.uid && s.targetSel]}
                        onPress={() => !myNightAct && submitNightAction(p.uid)}
                      >
                        <Text style={s.targetName}>{p.name}{p.uid === myUid ? ' (أنت)' : ''}</Text>
                        {myNightAct === p.uid && <Text>🛡️</Text>}
                      </TouchableOpacity>
                    ))}
                    {myNightAct && <Text style={s.doneTxt}>اخترت ✅</Text>}
                  </View>
                )}
                {myRole === 'detective' && (
                  <View style={s.actionBox}>
                    <Text style={s.actionTitle}>🔍 اختر من تحقق منه</Text>
                    {alivePlayers(true).map(p => (
                      <TouchableOpacity
                        key={p.uid}
                        style={[s.targetBtn, myNightAct === p.uid && s.targetSel]}
                        onPress={() => !myNightAct && submitNightAction(p.uid)}
                        disabled={!!myNightAct}
                      >
                        <Text style={s.targetName}>{p.name}</Text>
                        {myNightAct === p.uid && <Text>🔍</Text>}
                      </TouchableOpacity>
                    ))}
                    {nightResult && (
                      <View style={s.detectBox}>
                        <Text style={s.detectTxt}>{nightResult}</Text>
                      </View>
                    )}
                  </View>
                )}
                {myRole === 'civilian' && (
                  <View style={s.sleepBox}>
                    <Text style={{ fontSize: 50 }}>😴</Text>
                    <Text style={s.sleepTxt}>أنت مواطن — انتظر الصباح</Text>
                  </View>
                )}
              </>
            )}
            {isNight && !amAlive && (
              <View style={s.sleepBox}>
                <Text style={{ fontSize: 50 }}>👁️</Text>
                <Text style={s.sleepTxt}>أنت تراقب فقط</Text>
              </View>
            )}
            {isDay && amAlive && (
              <View style={s.actionBox}>
                <Text style={s.actionTitle}>🗳️ صوّت لطرد المشتبه به</Text>
                <Text style={s.actionSub}>يمكنك تغيير اختيارك حتى انتهاء الوقت</Text>
                {alivePlayers(true).map(p => (
                  <TouchableOpacity
                    key={p.uid}
                    style={[s.targetBtn, myVote === p.uid && s.targetSel]}
                    onPress={() => submitVote(p.uid)}
                  >
                    <Text style={s.targetName}>{p.name}</Text>
                    {myVote === p.uid && <Text style={s.myVoteTag}>صوتك ✓</Text>}
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {isDay && !amAlive && (
              <View style={s.sleepBox}>
                <Text style={{ fontSize: 50 }}>👁️</Text>
                <Text style={s.sleepTxt}>أنت تراقب التصويت</Text>
              </View>
            )}
            {isHost && (
              <TouchableOpacity style={s.hostBtn} onPress={isNight
                ? async () => { const sn = await getDoc(doc(db,'mafia_rooms',roomId)); await resolveNight(sn.data(), sn.data().nightActions||{}); }
                : endDay
              }>
                <Text style={s.hostBtnTxt}>⏭️ {isNight ? 'إنهاء الليل' : 'إنهاء التصويت'} (مضيف)</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        )}

        {activeTab === 'chat' && (
          <GameChat roomId={roomId} myUid={myUid} myName={myName} disabled={isNight} />
        )}

        {activeTab === 'players' && (
          <ScrollView style={{ flex: 1, paddingHorizontal: 16, paddingTop: 8 }}>
            {roomData.players.map(p => {
              const pr   = ROLE_INFO[p.role] || ROLE_INFO.civilian;
              const isMe = p.uid === myUid;
              return (
                <View key={p.uid} style={[s.playerRow, !p.isAlive && { opacity: 0.35 }]}>
                  <Text style={[s.playerName, !p.isAlive && { color: '#444' }]}>
                    {p.name}{isMe ? ' (أنت)' : ''}
                  </Text>
                  <Text style={s.playerStatus}>
                    {!p.isAlive ? `💀 ${pr.label}` : isMe ? `${pr.emoji} ${pr.label}` : '✅'}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    );
  }

  // ── نهاية اللعبة ──
  if (phase === 'ended' && roomData) {
    const win    = roomData.winTeam;
    const myTeam = myRole === 'mafia' ? 'mafia' : 'city';
    const iWon   = myTeam === win;
    return (
      <View style={s.container}>
        <StatusBar barStyle="light-content" backgroundColor="#06061a" />
        <ScrollView contentContainerStyle={s.endWrap}>
          <Text style={{ fontSize: 80 }}>{win === 'mafia' ? '🔪' : '🏙️'}</Text>
          <Text style={s.endTitle}>{win === 'mafia' ? 'المافيا تنتصر!' : 'المدينة تنتصر!'}</Text>
          <Text style={[s.endYou, { color: iWon ? '#22c55e' : '#ef4444' }]}>
            {iWon ? '🏆 أنت من الفريق الفائز!' : '😔 خسرت هذه الجولة'}
          </Text>
          <Text style={s.endRolesTitle}>الأدوار الحقيقية</Text>
          {roomData.players.map(p => {
            const pr = ROLE_INFO[p.role] || ROLE_INFO.civilian;
            return (
              <View key={p.uid} style={s.endRow}>
                <Text style={[s.endRole, { color: pr.color }]}>{pr.emoji} {pr.label}</Text>
                <Text style={s.endName}>{p.name}{p.uid === myUid ? ' (أنت)' : ''}</Text>
              </View>
            );
          })}
          <TouchableOpacity
            style={[s.primaryBtn, { marginTop: 24, width: '100%' }]}
            onPress={() => { if (unsubRef.current) unsubRef.current(); doReset(); }}
            activeOpacity={0.85}
          >
            <Text style={s.primaryBtnTxt}>🏠 العودة للقائمة</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <ActivityIndicator color="#a855f7" size="large" style={{ marginTop: 120 }} />
    </View>
  );
}

// ══════════════════════════════════════
// الستايلات
// ══════════════════════════════════════
const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#06061a' },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12 },
  headerCenter:   { alignItems: 'center', gap: 2 },
  headerTitle:    { color: '#a855f7', fontSize: 17, fontWeight: '900' },
  headerSub:      { color: '#5050a0', fontSize: 12 },
  iconBtn:        { width: 40, height: 40, borderRadius: 12, backgroundColor: '#0f0f2e', borderWidth: 1, borderColor: '#a855f730', alignItems: 'center', justifyContent: 'center' },
  iconBtnTxt:     { color: '#a855f7', fontSize: 18, fontWeight: '700' },
  menuBody:       { flex: 1, paddingHorizontal: 20, paddingTop: 10, gap: 14 },
  card:           { backgroundColor: '#0f0f2e', borderRadius: 18, borderWidth: 1, borderColor: '#ffffff10', padding: 18, alignItems: 'center', gap: 10 },
  cardLbl:        { color: '#a0a0c0', fontSize: 14, fontWeight: '700' },
  countRow:       { flexDirection: 'row', alignItems: 'center', gap: 20 },
  countBtn:       { width: 44, height: 44, borderRadius: 12, backgroundColor: '#1a1a3e', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#a855f740' },
  countBtnTxt:    { color: '#a855f7', fontSize: 24, fontWeight: '900' },
  countNum:       { color: '#fff', fontSize: 38, fontWeight: '900', minWidth: 52, textAlign: 'center' },
  rolesPreview:   { color: '#5050a0', fontSize: 12 },
  primaryBtn:     { backgroundColor: '#a855f7', borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  primaryBtnOff:  { backgroundColor: '#2a2a45' },
  primaryBtnTxt:  { color: '#fff', fontSize: 17, fontWeight: '900' },
  joinRow:        { flexDirection: 'row', gap: 10 },
  codeInput:      { flex: 1, backgroundColor: '#0f0f2e', borderRadius: 14, borderWidth: 1, borderColor: '#ffffff15', color: '#e0e0ff', fontSize: 18, fontWeight: '800', paddingVertical: 14, letterSpacing: 4, textAlign: 'center' },
  joinBtn:        { backgroundColor: '#1a1a3e', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 14, borderWidth: 1, borderColor: '#a855f740', justifyContent: 'center' },
  joinBtnTxt:     { color: '#a855f7', fontSize: 13, fontWeight: '800' },
  codeBox:        { backgroundColor: '#0f0f2e', margin: 20, borderRadius: 18, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#a855f720' },
  codeLbl:        { color: '#7070a0', fontSize: 13, marginBottom: 4 },
  codeBig:        { color: '#a855f7', fontSize: 44, fontWeight: '900', letterSpacing: 6 },
  codeHint:       { color: '#505070', fontSize: 12, marginTop: 4 },
  rolesHint:      { color: '#5050a0', fontSize: 12, textAlign: 'center', marginBottom: 8 },
  playerRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#ffffff08' },
  playerName:     { color: '#e0e0ff', fontSize: 15, fontWeight: '700' },
  playerStatus:   { color: '#6060a0', fontSize: 13 },
  lobbyFooter:    { padding: 20, gap: 10 },
  lobbyCnt:       { color: '#7070a0', fontSize: 13, textAlign: 'center' },
  waitTxt:        { color: '#5050a0', fontSize: 13, textAlign: 'center' },
  roleWrap:       { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30, gap: 16 },
  roleRevTitle:   { color: '#a855f7', fontSize: 24, fontWeight: '900' },
  roleRevHint:    { color: '#6060a0', fontSize: 14, textAlign: 'center' },
  roleBigLbl:     { fontSize: 34, fontWeight: '900' },
  roleDescTxt:    { color: '#8080a0', fontSize: 14, textAlign: 'center', lineHeight: 22 },
  mafiaBox:       { backgroundColor: '#1a0a0a', borderRadius: 14, padding: 14, width: '100%', borderWidth: 1, borderColor: '#ef444430', alignItems: 'center', gap: 4 },
  mafiaBoxTitle:  { color: '#ef4444', fontSize: 14, fontWeight: '800' },
  mafiaBoxMbr:    { color: '#ffaaaa', fontSize: 14 },
  waitSmall:      { color: '#404060', fontSize: 12, textAlign: 'center' },
  gameHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 50, paddingBottom: 4 },
  phaseBadge:     { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#ffffff10' },
  phaseText:      { color: '#e0e0ff', fontSize: 13, fontWeight: '800' },
  roleBadge:      { borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6 },
  roleBadgeTxt:   { fontSize: 12, fontWeight: '800' },
  eventBox:       { marginHorizontal: 16, marginVertical: 4, backgroundColor: '#0f0f2e', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#ffffff10' },
  eventTxt:       { color: '#e0e0ff', fontSize: 14, textAlign: 'center', fontWeight: '700' },
  deadBanner:     { marginHorizontal: 16, marginVertical: 4, backgroundColor: '#1a0a0a', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#ef444430' },
  deadTxt:        { color: '#ef4444', fontSize: 13, textAlign: 'center' },
  tabs:           { flexDirection: 'row', marginHorizontal: 16, marginTop: 6, borderRadius: 12, backgroundColor: '#0f0f2e', padding: 4, gap: 2 },
  tab:            { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  tabActive:      { backgroundColor: '#a855f715', borderWidth: 1, borderColor: '#a855f740' },
  tabTxt:         { color: '#5050a0', fontSize: 11, fontWeight: '700' },
  tabTxtActive:   { color: '#a855f7' },
  actionBox:      { backgroundColor: '#0f0f2e', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#ffffff10', gap: 10 },
  actionTitle:    { color: '#a855f7', fontSize: 15, fontWeight: '800', textAlign: 'center' },
  actionSub:      { color: '#5050a0', fontSize: 12, textAlign: 'center', marginTop: -4 },
  targetBtn:      { backgroundColor: '#1a1a3e', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#ffffff10' },
  targetSel:      { borderColor: '#a855f7', backgroundColor: '#1a0a2e' },
  targetName:     { color: '#e0e0ff', fontSize: 15, fontWeight: '700' },
  myVoteTag:      { color: '#a855f7', fontSize: 12, fontWeight: '800' },
  doneTxt:        { color: '#22c55e', fontSize: 13, textAlign: 'center', fontWeight: '700' },
  detectBox:      { backgroundColor: '#0a0a2e', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#3b82f640' },
  detectTxt:      { color: '#93c5fd', fontSize: 15, fontWeight: '800', textAlign: 'center' },
  sleepBox:       { alignItems: 'center', paddingVertical: 30, gap: 12 },
  sleepTxt:       { color: '#5050a0', fontSize: 14 },
  hostBtn:        { marginTop: 14, backgroundColor: '#1a1a3e', borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#a855f730' },
  hostBtnTxt:     { color: '#a855f7', fontSize: 13, fontWeight: '700' },
  endWrap:        { alignItems: 'center', paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40, gap: 10 },
  endTitle:       { color: '#a855f7', fontSize: 28, fontWeight: '900' },
  endYou:         { fontSize: 17, fontWeight: '800' },
  endRolesTitle:  { color: '#7070a0', fontSize: 14, fontWeight: '700', marginTop: 14, marginBottom: 4 },
  endRow:         { flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#ffffff08' },
  endName:        { color: '#e0e0ff', fontSize: 14 },
  endRole:        { fontSize: 13, fontWeight: '700' },
});
