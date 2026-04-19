import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, StatusBar, ScrollView, TextInput,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';

// ── ثوابت ────────────────────────────────────────────────────
const TURNS_PER_PLAYER = 3;   // كل لاعب يستلم الدور كضحية 3 مرات
const TRUTH_PTS  = 7;
const DARE_PTS   = 10;
const FAIL_PTS   = 0;

// ── مساعدات ──────────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** يبني قائمة أدوار: كل لاعب يظهر TURNS_PER_PLAYER مرات، مرتبة عشوائياً */
function buildTurnQueue(players) {
  let queue = [];
  players.forEach(p => {
    for (let i = 0; i < TURNS_PER_PLAYER; i++) queue.push(p.id);
  });
  return shuffle(queue);
}

// ── مكوّن العجلة ─────────────────────────────────────────────
function SpinWheel({ names, onDone, excludeId, label }) {
  const [current, setCurrent] = useState(null);
  const [spinning, setSpinning] = useState(false);
  const [done, setDone] = useState(false);
  const intervalRef = useRef(null);

  const eligible = names.filter(n => n.id !== excludeId);

  function spin() {
    if (spinning || done) return;
    setSpinning(true);
    let count = 0;
    const total = 20 + Math.floor(Math.random() * 15);
    intervalRef.current = setInterval(() => {
      setCurrent(eligible[Math.floor(Math.random() * eligible.length)]);
      count++;
      if (count >= total) {
        clearInterval(intervalRef.current);
        const winner = eligible[Math.floor(Math.random() * eligible.length)];
        setCurrent(winner);
        setSpinning(false);
        setDone(true);
        setTimeout(() => onDone(winner), 600);
      }
    }, 80);
  }

  useEffect(() => () => clearInterval(intervalRef.current), []);

  return (
    <View style={wh.wrap}>
      <Text style={wh.label}>{label}</Text>
      <View style={wh.wheel}>
        <Text style={wh.emoji}>🎡</Text>
        <Text style={wh.name}>
          {current ? current.name : '؟'}
        </Text>
      </View>
      {!done && (
        <TouchableOpacity style={wh.btn} onPress={spin} disabled={spinning}>
          <Text style={wh.btnTxt}>{spinning ? 'جاري...' : 'أدّر العجلة'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const wh = StyleSheet.create({
  wrap:  { alignItems: 'center', gap: 16, paddingVertical: 24 },
  label: { color: '#a78bfa', fontSize: 15, fontWeight: '700' },
  wheel: {
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: '#1e1b4b',
    borderWidth: 3, borderColor: '#a78bfa50',
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  emoji: { fontSize: 40 },
  name:  { color: '#fff', fontSize: 22, fontWeight: '900', textAlign: 'center' },
  btn:   {
    backgroundColor: '#a855f7', borderRadius: 16,
    paddingHorizontal: 32, paddingVertical: 14,
  },
  btnTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },
});

// ── الشاشة الرئيسية ──────────────────────────────────────────
export default function TruthDareScreen({ onBack, tokens = 0, onSpendTokens, onOpenTokenModal }) {

  // مراحل: setup | spin_asker | spin_target | choose | confirm | results
  const [phase, setPhase]         = useState('setup');
  const [players, setPlayers]     = useState([]);
  const [nameInput, setNameInput] = useState('');
  const [scores, setScores]       = useState({});
  const [turnQueue, setTurnQueue] = useState([]);
  const [turnIndex, setTurnIndex] = useState(0);
  const [asker, setAsker]         = useState(null);
  const [target, setTarget]       = useState(null);
  const [choice, setChoice]       = useState(null); // 'truth' | 'dare'
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [phase]);

  function fadeIn() {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }

  // ── إضافة لاعب ────────────────────────────────────────────
  function addPlayer() {
    const name = nameInput.trim();
    if (!name) return;
    if (players.find(p => p.name === name)) {
      Alert.alert('', 'هذا الاسم موجود بالفعل');
      return;
    }
    const id = Date.now().toString();
    setPlayers(prev => [...prev, { id, name }]);
    setScores(prev => ({ ...prev, [id]: 0 }));
    setNameInput('');
  }

  function removePlayer(id) {
    setPlayers(prev => prev.filter(p => p.id !== id));
    setScores(prev => { const s = { ...prev }; delete s[id]; return s; });
  }

  function startGame() {
    if (players.length < 2) {
      Alert.alert('', 'أضف لاعبَين على الأقل');
      return;
    }
    if (tokens < 10) {
      Alert.alert('رصيد غير كافٍ 🪙', 'تحتاج 10 توكنز لبدء اللعبة', [
        { text: 'اذهب إلى السوق', onPress: () => onOpenTokenModal && onOpenTokenModal() },
        { text: 'إلغاء', style: 'cancel' },
      ]);
      return;
    }
    onSpendTokens && onSpendTokens(10);
    const queue = buildTurnQueue(players);
    setTurnQueue(queue);
    setTurnIndex(0);
    fadeIn();
    setPhase('spin_asker');
  }

  // ── دور جديد ─────────────────────────────────────────────
  function nextTurn() {
    const nextIdx = turnIndex + 1;
    if (nextIdx >= turnQueue.length) {
      setPhase('results');
      return;
    }
    setTurnIndex(nextIdx);
    setAsker(null);
    setTarget(null);
    setChoice(null);
    fadeIn();
    setPhase('spin_asker');
  }

  // اللاعب الضحية في هذا الدور
  const currentTargetId = turnQueue[turnIndex];
  const currentTarget   = players.find(p => p.id === currentTargetId);

  // ── تسجيل النتيجة ────────────────────────────────────────
  function recordResult(success) {
    const pts = success ? (choice === 'dare' ? DARE_PTS : TRUTH_PTS) : FAIL_PTS;
    setScores(prev => ({ ...prev, [currentTargetId]: (prev[currentTargetId] || 0) + pts }));
    nextTurn();
  }

  // ── ترتيب النتائج ────────────────────────────────────────
  const sortedPlayers = [...players].sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0));

  // ── الـ progress ─────────────────────────────────────────
  const totalTurns    = players.length * TURNS_PER_PLAYER;
  const progress      = Math.min(turnIndex / totalTurns, 1);

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────

  // ── شاشة الإعداد ─────────────────────────────────────────
  if (phase === 'setup') return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor="#06061a" />

      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Text style={s.backTxt}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>😈 صراحة أو تحدي</Text>
        <View style={s.tokenBadge}>
          <Text style={s.tokenText}>🪙 {tokens}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.setupScroll} keyboardShouldPersistTaps="handled">
        <Text style={s.sectionTitle}>أضف اللاعبين</Text>

        <View style={s.inputRow}>
          <TextInput
            style={s.input}
            placeholder="اسم اللاعب..."
            placeholderTextColor="#3a3a60"
            value={nameInput}
            onChangeText={setNameInput}
            onSubmitEditing={addPlayer}
            returnKeyType="done"
          />
          <TouchableOpacity style={s.addBtn} onPress={addPlayer}>
            <Text style={s.addBtnTxt}>+</Text>
          </TouchableOpacity>
        </View>

        {players.map(p => (
          <View key={p.id} style={s.playerRow}>
            <Text style={s.playerName}>👤 {p.name}</Text>
            <TouchableOpacity onPress={() => removePlayer(p.id)}>
              <Text style={s.removeBtn}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}

        {players.length >= 2 && (
          <TouchableOpacity style={s.startBtn} onPress={startGame}>
            <Text style={s.startBtnTxt}>ابدأ اللعبة 🎲  🪙 10</Text>
          </TouchableOpacity>
        )}

        <View style={s.rulesBox}>
          <Text style={s.rulesTitle}>القواعد</Text>
          <Text style={s.rulesLine}>🎡 عجلة أولى: من يسأل</Text>
          <Text style={s.rulesLine}>🎡 عجلة ثانية: من يُسأل</Text>
          <Text style={s.rulesLine}>✅ نجح التحدي = +{DARE_PTS} نقاط</Text>
          <Text style={s.rulesLine}>✅ أجاب بصراحة = +{TRUTH_PTS} نقاط</Text>
          <Text style={s.rulesLine}>❌ فشل = +{FAIL_PTS} نقاط</Text>
          <Text style={s.rulesLine}>🔄 كل لاعب يُسأل {TURNS_PER_PLAYER} مرات</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  // ── عجلة من يسأل ──────────────────────────────────────────
  if (phase === 'spin_asker') return (
    <Animated.View style={[s.container, { opacity: fadeAnim }]}>
      <StatusBar barStyle="light-content" backgroundColor="#06061a" />
      <View style={s.header}>
        <View style={{ width: 40 }} />
        <Text style={s.headerTitle}>😈 صراحة أو تحدي</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={s.progressWrap}>
        <View style={s.progressBg}>
          <Animated.View style={[s.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={s.progressTxt}>{turnIndex + 1} / {totalTurns}</Text>
      </View>

      <View style={s.turnInfo}>
        <Text style={s.turnLabel}>الضحية في هذا الدور</Text>
        <Text style={s.turnTarget}>🎯 {currentTarget?.name}</Text>
      </View>

      <SpinWheel
        names={players}
        excludeId={currentTargetId}
        label="أدِّر العجلة لاختيار من يسأل"
        onDone={(winner) => {
          setAsker(winner);
          fadeIn();
          setPhase('spin_target');
        }}
      />
    </Animated.View>
  );

  // ── عجلة الضحية (التأكيد) ──────────────────────────────────
  if (phase === 'spin_target') return (
    <Animated.View style={[s.container, { opacity: fadeAnim }]}>
      <StatusBar barStyle="light-content" backgroundColor="#06061a" />
      <View style={s.header}>
        <View style={{ width: 40 }} />
        <Text style={s.headerTitle}>😈 صراحة أو تحدي</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={s.askerCard}>
        <Text style={s.askerLabel}>من يسأل</Text>
        <Text style={s.askerName}>🗣 {asker?.name}</Text>
      </View>

      {/* العجلة الثانية تدور وتستقر على الضحية المحددة مسبقاً */}
      <SpinWheelFixed
        names={players}
        targetId={currentTargetId}
        label="أدِّر العجلة لاختيار من يُسأل"
        onDone={(winner) => {
          setTarget(winner);
          setChoice('truth'); // default
          fadeIn();
          setPhase('choose');
        }}
      />
    </Animated.View>
  );

  // ── اختيار صراحة أو تحدي ──────────────────────────────────
  if (phase === 'choose') return (
    <Animated.View style={[s.container, { opacity: fadeAnim }]}>
      <StatusBar barStyle="light-content" backgroundColor="#06061a" />
      <View style={s.header}>
        <View style={{ width: 40 }} />
        <Text style={s.headerTitle}>😈 صراحة أو تحدي</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={s.matchupCard}>
        <View style={s.matchupPlayer}>
          <Text style={s.matchupRole}>يسأل</Text>
          <Text style={s.matchupName}>🗣 {asker?.name}</Text>
        </View>
        <Text style={s.matchupVs}>←</Text>
        <View style={s.matchupPlayer}>
          <Text style={s.matchupRole}>يُسأل</Text>
          <Text style={s.matchupName}>🎯 {target?.name}</Text>
        </View>
      </View>

      <Text style={s.chooseLabel}>اختر النوع</Text>

      <View style={s.choiceRow}>
        <TouchableOpacity
          style={[s.choiceBtn, choice === 'truth' && s.choiceBtnActive, { borderColor: '#3b82f6' }]}
          onPress={() => setChoice('truth')}
        >
          <Text style={s.choiceEmoji}>🤍</Text>
          <Text style={[s.choiceTxt, { color: choice === 'truth' ? '#3b82f6' : '#5a5a80' }]}>صراحة</Text>
          <Text style={s.choicePts}>+{TRUTH_PTS} نقاط</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.choiceBtn, choice === 'dare' && s.choiceBtnActive, { borderColor: '#ef4444' }]}
          onPress={() => setChoice('dare')}
        >
          <Text style={s.choiceEmoji}>🔥</Text>
          <Text style={[s.choiceTxt, { color: choice === 'dare' ? '#ef4444' : '#5a5a80' }]}>تحدي</Text>
          <Text style={s.choicePts}>+{DARE_PTS} نقاط</Text>
        </TouchableOpacity>
      </View>

      <Text style={s.chooseHint}>
        {asker?.name} يوجّه {choice === 'truth' ? 'سؤالاً' : 'تحدياً'} إلى {target?.name}
      </Text>

      <TouchableOpacity
        style={s.confirmBtn}
        onPress={() => { fadeIn(); setPhase('confirm'); }}
      >
        <Text style={s.confirmBtnTxt}>جاهز ✓</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  // ── تأكيد النتيجة ─────────────────────────────────────────
  if (phase === 'confirm') return (
    <Animated.View style={[s.container, s.confirmCenter, { opacity: fadeAnim }]}>
      <StatusBar barStyle="light-content" backgroundColor="#06061a" />

      {choice === 'dare' ? (
        <>
          <Text style={s.bigEmoji}>🔥</Text>
          <Text style={s.confirmQ}>هل نجح <Text style={s.highlight}>{target?.name}</Text> بالتحدي؟</Text>
        </>
      ) : (
        <>
          <Text style={s.bigEmoji}>🤍</Text>
          <Text style={s.confirmQ}>هل أجاب <Text style={s.highlight}>{target?.name}</Text> بصراحة؟</Text>
        </>
      )}

      {/* زر التبديل */}
      <TouchableOpacity
        style={s.switchBtn}
        onPress={() => {
          setChoice(c => c === 'truth' ? 'dare' : 'truth');
        }}
      >
        <Text style={s.switchTxt}>
          تبديل إلى {choice === 'truth' ? '🔥 تحدي' : '🤍 صراحة'}
        </Text>
      </TouchableOpacity>

      <View style={s.resultRow}>
        <TouchableOpacity style={[s.resultBtn, { backgroundColor: '#22c55e22', borderColor: '#22c55e' }]}
          onPress={() => recordResult(true)}>
          <Text style={s.resultEmoji}>✅</Text>
          <Text style={[s.resultTxt, { color: '#22c55e' }]}>نجح!</Text>
          <Text style={s.resultPts}>+{choice === 'dare' ? DARE_PTS : TRUTH_PTS}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[s.resultBtn, { backgroundColor: '#ef444422', borderColor: '#ef4444' }]}
          onPress={() => recordResult(false)}>
          <Text style={s.resultEmoji}>❌</Text>
          <Text style={[s.resultTxt, { color: '#ef4444' }]}>فشل</Text>
          <Text style={s.resultPts}>+{FAIL_PTS}</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  // ── النتائج النهائية ──────────────────────────────────────
  if (phase === 'results') return (
    <Animated.View style={[s.container, { opacity: fadeAnim }]}>
      <StatusBar barStyle="light-content" backgroundColor="#06061a" />
      <View style={s.header}>
        <View style={{ width: 40 }} />
        <Text style={s.headerTitle}>🏆 النتائج</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.resultsScroll}>
        {sortedPlayers.map((p, i) => (
          <View key={p.id} style={[s.resultCard, i === 0 && s.resultCard1]}>
            <Text style={s.rankEmoji}>
              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
            </Text>
            <Text style={s.resultPlayerName}>{p.name}</Text>
            <Text style={[s.resultScore, i === 0 && { color: '#fbbf24' }]}>
              {scores[p.id] || 0}
            </Text>
          </View>
        ))}

        <TouchableOpacity style={s.startBtn} onPress={() => {
          setScores(Object.fromEntries(players.map(p => [p.id, 0])));
          const queue = buildTurnQueue(players);
          setTurnQueue(queue);
          setTurnIndex(0);
          setAsker(null); setTarget(null); setChoice(null);
          fadeIn();
          setPhase('spin_asker');
        }}>
          <Text style={s.startBtnTxt}>لعبة جديدة 🔄</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.backFullBtn} onPress={onBack}>
          <Text style={s.backFullTxt}>الخروج</Text>
        </TouchableOpacity>
      </ScrollView>
    </Animated.View>
  );

  return null;
}

// ── عجلة ثانية: تدور وتستقر على الضحية المحددة ──────────────
function SpinWheelFixed({ names, targetId, label, onDone }) {
  const [current, setCurrent] = useState(null);
  const [spinning, setSpinning] = useState(false);
  const [done, setDone] = useState(false);
  const intervalRef = useRef(null);
  const target = names.find(n => n.id === targetId);

  function spin() {
    if (spinning || done) return;
    setSpinning(true);
    let count = 0;
    const total = 20 + Math.floor(Math.random() * 15);
    intervalRef.current = setInterval(() => {
      setCurrent(names[Math.floor(Math.random() * names.length)]);
      count++;
      if (count >= total) {
        clearInterval(intervalRef.current);
        setCurrent(target);
        setSpinning(false);
        setDone(true);
        setTimeout(() => onDone(target), 600);
      }
    }, 80);
  }

  useEffect(() => () => clearInterval(intervalRef.current), []);

  return (
    <View style={wh.wrap}>
      <Text style={wh.label}>{label}</Text>
      <View style={wh.wheel}>
        <Text style={wh.emoji}>🎡</Text>
        <Text style={wh.name}>{current ? current.name : '؟'}</Text>
      </View>
      {!done && (
        <TouchableOpacity style={wh.btn} onPress={spin} disabled={spinning}>
          <Text style={wh.btnTxt}>{spinning ? 'جاري...' : 'أدّر العجلة'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── الستايلات ────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#06061a', paddingTop: 56 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 16,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#0f0f2e', borderWidth: 1, borderColor: '#a78bfa30',
    alignItems: 'center', justifyContent: 'center',
  },
  backTxt:    { color: '#a78bfa', fontSize: 20, fontWeight: '700' },
  headerTitle:{ color: '#a78bfa', fontSize: 18, fontWeight: '900' },
  tokenBadge: {
    backgroundColor: '#f59e0b22', borderWidth: 1,
    borderColor: '#f59e0b50', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  tokenText: { color: '#f59e0b', fontSize: 13, fontWeight: '700' },

  // progress
  progressWrap: { paddingHorizontal: 20, gap: 4, marginBottom: 8 },
  progressBg: {
    height: 6, backgroundColor: '#1e1b4b', borderRadius: 3, overflow: 'hidden',
  },
  progressFill: { height: 6, backgroundColor: '#a855f7', borderRadius: 3 },
  progressTxt:  { color: '#3a3a60', fontSize: 11, textAlign: 'center' },

  // turn info
  turnInfo: { alignItems: 'center', marginBottom: 8 },
  turnLabel:  { color: '#5a5a80', fontSize: 13 },
  turnTarget: { color: '#ef4444', fontSize: 22, fontWeight: '900', marginTop: 4 },

  // asker card
  askerCard: {
    marginHorizontal: 20, backgroundColor: '#1e1b4b',
    borderRadius: 16, padding: 14, alignItems: 'center',
    borderWidth: 1, borderColor: '#a78bfa30', marginBottom: 8,
  },
  askerLabel: { color: '#5a5a80', fontSize: 12 },
  askerName:  { color: '#a78bfa', fontSize: 20, fontWeight: '800', marginTop: 4 },

  // setup
  setupScroll: { paddingHorizontal: 20, paddingBottom: 40, gap: 12 },
  sectionTitle: { color: '#a78bfa', fontSize: 18, fontWeight: '900', textAlign: 'center' },
  inputRow: { flexDirection: 'row', gap: 10 },
  input: {
    flex: 1, backgroundColor: '#0f0f2e', borderRadius: 14,
    borderWidth: 1.5, borderColor: '#a78bfa30',
    color: '#fff', fontSize: 15, paddingHorizontal: 16, paddingVertical: 12,
    textAlign: 'right',
  },
  addBtn: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: '#a855f7', alignItems: 'center', justifyContent: 'center',
  },
  addBtnTxt: { color: '#fff', fontSize: 28, fontWeight: '700', lineHeight: 32 },
  playerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#0f0f2e', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#a78bfa20',
  },
  playerName: { color: '#fff', fontSize: 15 },
  removeBtn:  { color: '#ef4444', fontSize: 18, fontWeight: '700', padding: 4 },
  startBtn: {
    backgroundColor: '#a855f7', borderRadius: 18,
    paddingVertical: 16, alignItems: 'center', marginTop: 8,
  },
  startBtnTxt: { color: '#fff', fontSize: 18, fontWeight: '900' },
  rulesBox: {
    backgroundColor: '#0f0f2e', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#a78bfa20', gap: 6, marginTop: 4,
  },
  rulesTitle: { color: '#a78bfa', fontSize: 14, fontWeight: '800', marginBottom: 4 },
  rulesLine:  { color: '#5a5a80', fontSize: 13 },

  // matchup
  matchupCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    marginHorizontal: 20, backgroundColor: '#0f0f2e',
    borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#a78bfa30',
    marginBottom: 20,
  },
  matchupPlayer: { alignItems: 'center', gap: 4 },
  matchupRole:   { color: '#5a5a80', fontSize: 12 },
  matchupName:   { color: '#fff', fontSize: 16, fontWeight: '800' },
  matchupVs:     { color: '#a78bfa', fontSize: 22, fontWeight: '900' },

  // choose
  chooseLabel: { color: '#a78bfa', fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 16 },
  choiceRow:   { flexDirection: 'row', gap: 16, paddingHorizontal: 20, marginBottom: 20 },
  choiceBtn: {
    flex: 1, backgroundColor: '#0f0f2e', borderRadius: 18,
    borderWidth: 2, padding: 20, alignItems: 'center', gap: 6,
  },
  choiceBtnActive: { backgroundColor: '#1e1b4b' },
  choiceEmoji: { fontSize: 32 },
  choiceTxt:   { fontSize: 18, fontWeight: '900' },
  choicePts:   { color: '#5a5a80', fontSize: 12 },
  chooseHint:  { color: '#3a3a60', fontSize: 13, textAlign: 'center', marginBottom: 24, paddingHorizontal: 20 },
  confirmBtn: {
    marginHorizontal: 20, backgroundColor: '#a855f7', borderRadius: 18,
    paddingVertical: 16, alignItems: 'center',
  },
  confirmBtnTxt: { color: '#fff', fontSize: 18, fontWeight: '900' },

  // confirm phase
  confirmCenter: { justifyContent: 'center', alignItems: 'center', gap: 20 },
  bigEmoji:   { fontSize: 72 },
  confirmQ:   { color: '#fff', fontSize: 20, fontWeight: '700', textAlign: 'center', paddingHorizontal: 30 },
  highlight:  { color: '#fbbf24', fontWeight: '900' },
  switchBtn: {
    backgroundColor: '#1e1b4b', borderRadius: 14, borderWidth: 1, borderColor: '#a78bfa40',
    paddingHorizontal: 20, paddingVertical: 10,
  },
  switchTxt: { color: '#a78bfa', fontSize: 14, fontWeight: '700' },
  resultRow: { flexDirection: 'row', gap: 16, paddingHorizontal: 20, marginTop: 8 },
  resultBtn: {
    flex: 1, borderRadius: 18, borderWidth: 2,
    paddingVertical: 20, alignItems: 'center', gap: 4,
  },
  resultEmoji: { fontSize: 32 },
  resultTxt:   { fontSize: 18, fontWeight: '900' },
  resultPts:   { color: '#5a5a80', fontSize: 13 },

  // results
  resultsScroll: { paddingHorizontal: 20, paddingBottom: 40, gap: 10 },
  resultCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#0f0f2e', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#a78bfa20',
  },
  resultCard1: { borderColor: '#fbbf2440', backgroundColor: '#1e1b0a' },
  rankEmoji:   { fontSize: 24, width: 32 },
  resultPlayerName: { flex: 1, color: '#fff', fontSize: 16, fontWeight: '700' },
  resultScore: { color: '#a78bfa', fontSize: 22, fontWeight: '900' },
  backFullBtn: {
    backgroundColor: '#1e1b4b', borderRadius: 18, paddingVertical: 14, alignItems: 'center',
  },
  backFullTxt: { color: '#5a5a80', fontSize: 16, fontWeight: '700' },
});
