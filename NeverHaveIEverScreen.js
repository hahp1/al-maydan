import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, StatusBar, ScrollView, TextInput,
  Alert, KeyboardAvoidingView, Platform,
} from 'react-native';

// ── بنك الجمل ────────────────────────────────────────────────
const STATEMENTS = [
  // عامة / مضحكة
  { id: 1, text: 'أنا لم أنم في درس أو اجتماع', emoji: '😴', level: 'عامة' },
  { id: 2, text: 'أنا لم أتأخر على موعد مهم', emoji: '⏰', level: 'عامة' },
  { id: 3, text: 'أنا لم أكذب على والديّ', emoji: '🤥', level: 'عامة' },
  { id: 4, text: 'أنا لم أبكِ بسبب فيلم', emoji: '😭', level: 'عامة' },
  { id: 5, text: 'أنا لم أنسَ يوم ميلاد شخص مهم', emoji: '🎂', level: 'عامة' },
  { id: 6, text: 'أنا لم أتظاهر بالمرض لأتغيب', emoji: '🤒', level: 'عامة' },
  { id: 7, text: 'أنا لم أحذف رسالة بعد ما أرسلتها', emoji: '📱', level: 'عامة' },
  { id: 8, text: 'أنا لم أفشل في طبخة وأدّعيتها زينة', emoji: '🍳', level: 'عامة' },
  { id: 9, text: 'أنا لم أضحك في وقت غير مناسب', emoji: '😂', level: 'عامة' },
  { id: 10, text: 'أنا لم أبعث رسالة للشخص الغلط', emoji: '💬', level: 'عامة' },
  { id: 11, text: 'أنا لم أتجاهل مكالمة وعندي الجهاز بيدي', emoji: '📵', level: 'عامة' },
  { id: 12, text: 'أنا لم أسرق أكل أحد من الثلاجة', emoji: '🧊', level: 'عامة' },
  { id: 13, text: 'أنا لم أكسر شيئاً في بيت أحد وما قلت', emoji: '💔', level: 'عامة' },
  { id: 14, text: 'أنا لم أغيّر رأيي لأن الجميع يختلف معي', emoji: '🔄', level: 'عامة' },
  { id: 15, text: 'أنا لم أقرأ محادثة شخص بدون إذنه', emoji: '🕵️', level: 'عامة' },
  // مغامرات
  { id: 16, text: 'أنا لم أسافر وحدي', emoji: '✈️', level: 'مغامرة' },
  { id: 17, text: 'أنا لم أنم خارج البيت في العراء', emoji: '⛺', level: 'مغامرة' },
  { id: 18, text: 'أنا لم أجرب رياضة خطرة', emoji: '🪂', level: 'مغامرة' },
  { id: 19, text: 'أنا لم أركب سيارة بسرعة زيادة', emoji: '🚗', level: 'مغامرة' },
  { id: 20, text: 'أنا لم أحضر حفلة لم أُدعَ إليها', emoji: '🎉', level: 'مغامرة' },
  // اجتماعية
  { id: 21, text: 'أنا لم أتجادل مع شخص غريب على الإنترنت', emoji: '💻', level: 'اجتماعية' },
  { id: 22, text: 'أنا لم أفقد صديقاً بسبب خلاف غبي', emoji: '🤝', level: 'اجتماعية' },
  { id: 23, text: 'أنا لم أتقاطع مع أحد بسبب رأي سياسي', emoji: '🗳️', level: 'اجتماعية' },
  { id: 24, text: 'أنا لم أنشر سر أحد', emoji: '🤫', level: 'اجتماعية' },
  { id: 25, text: 'أنا لم أتظاهر أنني سعيد وأنا حزين', emoji: '🎭', level: 'اجتماعية' },
  // مالية
  { id: 26, text: 'أنا لم أشترِ شيئاً غالياً وندمت', emoji: '💸', level: 'مالية' },
  { id: 27, text: 'أنا لم أستدن ولم أرجع الدين بوقته', emoji: '💰', level: 'مالية' },
  { id: 28, text: 'أنا لم أشترِ شيئاً لأني شفته عند أحد', emoji: '🛍️', level: 'مالية' },
  // خفيفة حب وعلاقات
  { id: 29, text: 'أنا لم أقل لأحد "أحبك" أول مرة بالكتابة', emoji: '💌', level: 'علاقات' },
  { id: 30, text: 'أنا لم أتظاهر بأنني لا أعرف شخصاً', emoji: '👀', level: 'علاقات' },
  { id: 31, text: 'أنا لم أبعث رسالة ثم أتمنى لو ما بعثتها', emoji: '😬', level: 'علاقات' },
  { id: 32, text: 'أنا لم أحكم على أحد من أول نظرة وكنت غلط', emoji: '🧐', level: 'علاقات' },
  // طعام ونوم
  { id: 33, text: 'أنا لم آكل أكل سقط على الأرض', emoji: '🍕', level: 'طعام' },
  { id: 34, text: 'أنا لم أنم أكثر من 12 ساعة يوماً', emoji: '🛌', level: 'طعام' },
  { id: 35, text: 'أنا لم أشرب ماء قبل النوم وأنا عارف راح أندم', emoji: '🚰', level: 'طعام' },
];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── مكوّن بطاقة اللاعب ───────────────────────────────────────
function PlayerScore({ player }) {
  return (
    <View style={ps.card}>
      <Text style={ps.name}>{player.name}</Text>
      <View style={ps.fingers}>
        {[...Array(5)].map((_, i) => (
          <Text key={i} style={[ps.finger, i < player.fingers && ps.fingerDown]}>
            {i < player.fingers ? '✊' : '☝️'}
          </Text>
        ))}
      </View>
      <Text style={ps.count}>{player.fingers}/5</Text>
    </View>
  );
}

const ps = StyleSheet.create({
  card: {
    backgroundColor: '#0f0f2e', borderRadius: 14,
    borderWidth: 1.5, borderColor: '#ffffff15',
    padding: 12, alignItems: 'center', gap: 6, flex: 1,
  },
  name: { color: '#fff', fontWeight: '700', fontSize: 13, textAlign: 'center' },
  fingers: { flexDirection: 'row', gap: 2 },
  finger: { fontSize: 16 },
  fingerDown: { opacity: 0.3 },
  count: { color: '#5a5a80', fontSize: 11 },
});

// ── المكوّن الرئيسي ──────────────────────────────────────────
export default function NeverHaveIEverScreen({ onBack, tokens = 0, onSpendTokens, onOpenTokenModal }) {
  const [phase, setPhase] = useState('setup');
  const [playerName, setPlayerName] = useState('');
  const [players, setPlayers] = useState([]);
  const [statements, setStatements] = useState([]);
  const [sIndex, setSIndex] = useState(0);
  const [eliminated, setEliminated] = useState([]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const cardFlip = useRef(new Animated.Value(0)).current;

  function animateIn() {
    fadeAnim.setValue(0);
    scaleAnim.setValue(0.85);
    cardFlip.setValue(0);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 7, useNativeDriver: true }),
    ]).start();
  }

  useEffect(() => { animateIn(); }, [phase, sIndex]);

  function addPlayer() {
    const name = playerName.trim();
    if (!name) return;
    if (players.length >= 8) return Alert.alert('', 'الحد الأقصى 8 لاعبين');
    if (players.find(p => p.name === name)) return Alert.alert('', 'الاسم موجود');
    setPlayers(prev => [...prev, { id: Date.now().toString(), name, fingers: 0 }]);
    setPlayerName('');
  }

  function removePlayer(id) {
    setPlayers(prev => prev.filter(p => p.id !== id));
  }

  function startGame() {
    if (players.length < 2) return Alert.alert('', 'أضف لاعبين على الأقل');
    if (tokens < 10) {
      Alert.alert('رصيد غير كافٍ 🪙', 'تحتاج 10 توكنز لبدء اللعبة', [
        { text: 'اذهب إلى السوق', onPress: () => onOpenTokenModal && onOpenTokenModal() },
        { text: 'إلغاء', style: 'cancel' },
      ]);
      return;
    }
    onSpendTokens && onSpendTokens(10);
    const stmts = shuffle(STATEMENTS).slice(0, 20);
    setStatements(stmts);
    setSIndex(0);
    setEliminated([]);
    setPlayers(prev => prev.map(p => ({ ...p, fingers: 0 })));
    setPhase('play');
  }

  function handleDid(playerId) {
    // اللاعب فعل الشيء → يخسر إصبعاً
    const updated = players.map(p =>
      p.id === playerId ? { ...p, fingers: Math.min(5, p.fingers + 1) } : p
    );
    setPlayers(updated);

    const newElim = updated.filter(p => p.fingers >= 5).map(p => p.id);
    const activePlayers = updated.filter(p => p.fingers < 5);

    if (activePlayers.length <= 1) {
      setPhase('end');
      return;
    }
    setEliminated(newElim);
  }

  function nextStatement() {
    if (sIndex + 1 >= statements.length) {
      setPhase('end');
    } else {
      setSIndex(prev => prev + 1);
    }
  }

  const activePlayers = players.filter(p => p.fingers < 5);
  const winner = activePlayers.length === 1 ? activePlayers[0] : null;

  // ── إعداد ──────────────────────────────────────────────
  if (phase === 'setup') return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#06061a" />

        <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerEmoji}>☝️</Text>
            <Text style={styles.headerTitle}>أنا لم أفعل</Text>
          </View>
          <View style={styles.tokenBadge}>
            <Text style={styles.tokenText}>🪙 {tokens}</Text>
          </View>
        </Animated.View>

        <ScrollView contentContainerStyle={styles.setupContent} keyboardShouldPersistTaps="handled">
          <View style={styles.rulesCard}>
            <Text style={styles.rulesTitle}>📖 كيف تلعب؟</Text>
            <Text style={styles.rulesText}>
              كل شخص يبدأ بـ 5 أصابع مرفوعة.{'\n'}
              إذا فعلت الشيء المذكور → تخفض إصبعاً.{'\n'}
              من يخسر كل أصابعه الـ 5 يخرج من اللعبة!
            </Text>
          </View>

          <View style={styles.inputRow}>
            <TouchableOpacity style={styles.addBtn} onPress={addPlayer}>
              <Text style={styles.addBtnText}>+ إضافة</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              placeholder="اسم اللاعب..."
              placeholderTextColor="#3a3a60"
              value={playerName}
              onChangeText={setPlayerName}
              onSubmitEditing={addPlayer}
              textAlign="right"
            />
          </View>

          {players.length > 0 && (
            <View style={styles.playersList}>
              {players.map((p, i) => (
                <View key={p.id} style={styles.playerChip}>
                  <TouchableOpacity onPress={() => removePlayer(p.id)} style={styles.chipRemove}>
                    <Text style={styles.chipRemoveText}>✕</Text>
                  </TouchableOpacity>
                  <Text style={styles.chipName}>{p.name}</Text>
                  <Text style={styles.chipNum}>{i + 1}</Text>
                </View>
              ))}
            </View>
          )}

          {players.length >= 2 && (
            <TouchableOpacity style={styles.startBtn} onPress={startGame}>
              <Text style={styles.startBtnText}>☝️ ابدأ اللعبة  🪙 10</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );

  // ── لعب ────────────────────────────────────────────────
  if (phase === 'play') {
    const stmt = statements[sIndex];
    const active = players.filter(p => p.fingers < 5);

    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#06061a" />

        <View style={styles.header}>
          <TouchableOpacity onPress={() => Alert.alert('خروج', 'تريد الخروج؟', [
            { text: 'لا' }, { text: 'نعم', onPress: () => setPhase('setup') }
          ])} style={styles.backBtn}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <View style={styles.progressWrap}>
            <Text style={styles.progressText}>{sIndex + 1} / {statements.length}</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${((sIndex + 1) / statements.length) * 100}%` }]} />
            </View>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.playContent}>
          {/* البطاقة */}
          <Animated.View style={[styles.stmtCard, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
            <Text style={styles.stmtEmoji}>{stmt.emoji}</Text>
            <Text style={styles.stmtLevel}>{stmt.level}</Text>
            <Text style={styles.stmtText}>{stmt.text}</Text>
          </Animated.View>

          {/* اللاعبون النشطون */}
          <Text style={styles.sectionLabel}>من فعل هذا؟ اضغط اسمه ⬇️</Text>
          <View style={styles.activeGrid}>
            {active.map(p => (
              <TouchableOpacity
                key={p.id}
                style={styles.activeCard}
                onPress={() => handleDid(p.id)}
                activeOpacity={0.8}
              >
                <Text style={styles.activeFingers}>
                  {'☝️'.repeat(5 - p.fingers)}{'✊'.repeat(p.fingers)}
                </Text>
                <Text style={styles.activeName}>{p.name}</Text>
                <Text style={styles.activeHint}>فعلت!</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* اللاعبون المحذوفون */}
          {eliminated.length > 0 && (
            <View style={styles.eliminatedRow}>
              {players.filter(p => p.fingers >= 5).map(p => (
                <View key={p.id} style={styles.eliminatedChip}>
                  <Text style={styles.eliminatedName}>💀 {p.name}</Text>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity style={styles.nextBtn} onPress={nextStatement}>
            <Text style={styles.nextBtnText}>
              {sIndex + 1 < statements.length ? 'التالي ←' : 'النهاية 🏆'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ── النهاية ─────────────────────────────────────────────
  if (phase === 'end') {
    const sorted = [...players].sort((a, b) => a.fingers - b.fingers);
    const champ = sorted[0];

    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#06061a" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setPhase('setup')} style={styles.backBtn}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerEmoji}>🏆</Text>
            <Text style={styles.headerTitle}>النتيجة</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.endContent}>
          <View style={styles.winnerCard}>
            <Text style={styles.winnerEmoji}>🏆</Text>
            <Text style={styles.winnerLabel}>الأنقى!</Text>
            <Text style={styles.winnerName}>{champ.name}</Text>
            <Text style={styles.winnerSub}>خسر {champ.fingers} أصابع فقط</Text>
          </View>

          <View style={styles.rankingList}>
            {sorted.map((p, i) => (
              <View key={p.id} style={[styles.rankRow, p.fingers >= 5 && styles.rankRowElim]}>
                <Text style={styles.rankPos}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                </Text>
                <Text style={styles.rankName}>{p.name}</Text>
                <Text style={styles.rankFingers}>
                  {'☝️'.repeat(Math.max(0, 5 - p.fingers))}{'✊'.repeat(Math.min(5, p.fingers))}
                </Text>
                <Text style={styles.rankCount}>{p.fingers}/5</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.startBtn} onPress={startGame}>
            <Text style={styles.startBtnText}>🔄 جولة جديدة</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.startBtn, styles.outlineBtn]} onPress={() => setPhase('setup')}>
            <Text style={styles.outlineBtnText}>🏠 الرئيسية</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#06061a', paddingTop: 56 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20, marginBottom: 16,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#0f0f2e',
    borderWidth: 1, borderColor: '#10b98130',
    alignItems: 'center', justifyContent: 'center',
  },
  backText: { color: '#10b981', fontSize: 20, fontWeight: '700' },
  headerCenter: { alignItems: 'center', gap: 2 },
  headerEmoji: { fontSize: 24 },
  headerTitle: { color: '#10b981', fontSize: 18, fontWeight: '900' },
  tokenBadge: {
    backgroundColor: '#f59e0b22', borderWidth: 1,
    borderColor: '#f59e0b50', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  tokenText: { color: '#f59e0b', fontSize: 13, fontWeight: '700' },

  setupContent: { paddingHorizontal: 20, paddingBottom: 60, gap: 14 },
  rulesCard: {
    backgroundColor: '#0f0f2e', borderRadius: 16,
    borderWidth: 1.5, borderColor: '#10b98130',
    padding: 16, gap: 8,
  },
  rulesTitle: { color: '#10b981', fontWeight: '800', fontSize: 15, textAlign: 'center' },
  rulesText: { color: '#8080aa', fontSize: 13, lineHeight: 22, textAlign: 'center' },
  inputRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  input: {
    flex: 1, backgroundColor: '#0f0f2e',
    borderWidth: 1.5, borderColor: '#10b98130',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    color: '#fff', fontSize: 15,
  },
  addBtn: { backgroundColor: '#10b981', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  addBtnText: { color: '#000', fontWeight: '900', fontSize: 14 },
  playersList: { gap: 8 },
  playerChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0f0f2e', borderRadius: 12,
    borderWidth: 1, borderColor: '#10b98130',
    padding: 12, gap: 10,
  },
  chipNum: {
    width: 26, height: 26, borderRadius: 8, backgroundColor: '#10b981',
    textAlign: 'center', lineHeight: 26, color: '#000', fontWeight: '900', fontSize: 13,
  },
  chipName: { flex: 1, color: '#fff', fontSize: 15, fontWeight: '600' },
  chipRemove: {
    width: 26, height: 26, borderRadius: 8, backgroundColor: '#ef444420',
    alignItems: 'center', justifyContent: 'center',
  },
  chipRemoveText: { color: '#ef4444', fontWeight: '700', fontSize: 12 },
  startBtn: {
    backgroundColor: '#10b981', borderRadius: 16,
    padding: 16, alignItems: 'center', marginTop: 8,
  },
  startBtnText: { color: '#000', fontWeight: '900', fontSize: 16 },
  outlineBtn: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: '#10b98150' },
  outlineBtnText: { color: '#10b981', fontWeight: '900', fontSize: 16 },

  // لعب
  playContent: { paddingHorizontal: 20, paddingBottom: 60, gap: 16 },
  progressWrap: { flex: 1, paddingHorizontal: 12, gap: 4 },
  progressText: { color: '#10b981', fontSize: 12, textAlign: 'center', fontWeight: '700' },
  progressBar: { height: 6, backgroundColor: '#0f0f2e', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#10b981', borderRadius: 3 },

  stmtCard: {
    backgroundColor: '#0f0f2e', borderRadius: 22,
    borderWidth: 1.5, borderColor: '#10b98140',
    padding: 28, alignItems: 'center', gap: 10,
  },
  stmtEmoji: { fontSize: 52 },
  stmtLevel: {
    color: '#10b981', fontSize: 11, fontWeight: '700',
    backgroundColor: '#10b98120', paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 20,
  },
  stmtText: { color: '#fff', fontSize: 20, fontWeight: '800', textAlign: 'center', lineHeight: 30 },

  sectionLabel: { color: '#5a5a80', fontSize: 13, textAlign: 'center' },
  activeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  activeCard: {
    flex: 1, minWidth: '44%',
    backgroundColor: '#0f0f2e', borderRadius: 14,
    borderWidth: 1.5, borderColor: '#10b98130',
    padding: 14, alignItems: 'center', gap: 6,
  },
  activeFingers: { fontSize: 18, letterSpacing: 2 },
  activeName: { color: '#fff', fontWeight: '700', fontSize: 14 },
  activeHint: { color: '#10b981', fontSize: 11, fontWeight: '600' },

  eliminatedRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  eliminatedChip: {
    backgroundColor: '#ef444415', borderRadius: 10,
    borderWidth: 1, borderColor: '#ef444430',
    paddingHorizontal: 12, paddingVertical: 6,
  },
  eliminatedName: { color: '#ef4444', fontSize: 13, fontWeight: '600' },
  nextBtn: {
    backgroundColor: '#10b981', borderRadius: 16,
    padding: 16, alignItems: 'center',
  },
  nextBtnText: { color: '#000', fontWeight: '900', fontSize: 16 },

  // نهاية
  endContent: { paddingHorizontal: 20, paddingBottom: 60, gap: 14 },
  winnerCard: {
    backgroundColor: '#0f0f2e', borderRadius: 22,
    borderWidth: 2, borderColor: '#ffd70060',
    padding: 28, alignItems: 'center', gap: 8,
  },
  winnerEmoji: { fontSize: 60 },
  winnerLabel: { color: '#ffd700', fontSize: 14, fontWeight: '700' },
  winnerName: { color: '#fff', fontSize: 26, fontWeight: '900' },
  winnerSub: { color: '#5a5a80', fontSize: 13 },
  rankingList: { gap: 10 },
  rankRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#0f0f2e', borderRadius: 12,
    borderWidth: 1, borderColor: '#ffffff15',
    padding: 12,
  },
  rankRowElim: { opacity: 0.5 },
  rankPos: { fontSize: 20, width: 32 },
  rankName: { flex: 1, color: '#fff', fontSize: 15, fontWeight: '700' },
  rankFingers: { fontSize: 14, letterSpacing: 2 },
  rankCount: { color: '#5a5a80', fontSize: 12, width: 28, textAlign: 'right' },
});
