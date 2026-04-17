import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, StatusBar, ScrollView, TextInput,
  Alert, KeyboardAvoidingView, Platform,
} from 'react-native';

// ── أسئلة اللعبة ─────────────────────────────────────────────
const QUESTIONS = [
  { id: 1, text: 'من الأكثر ضحكاً في المجموعة؟', emoji: '😂' },
  { id: 2, text: 'من سينام أول شخص في الجلسة؟', emoji: '😴' },
  { id: 3, text: 'من الأكثر خجلاً؟', emoji: '😳' },
  { id: 4, text: 'من سيتزوج أول شخص؟', emoji: '💍' },
  { id: 5, text: 'من الأكثر كذباً؟', emoji: '🤥' },
  { id: 6, text: 'من الأكثر تأخراً على المواعيد؟', emoji: '⏰' },
  { id: 7, text: 'من الأشجع في المجموعة؟', emoji: '🦁' },
  { id: 8, text: 'من الأكثر بخلاً؟', emoji: '💰' },
  { id: 9, text: 'من يغيّر رأيه أكثر؟', emoji: '🔄' },
  { id: 10, text: 'من الأكثر فضولاً في حياة الناس؟', emoji: '🕵️' },
  { id: 11, text: 'من سيكون مشهوراً يوماً ما؟', emoji: '⭐' },
  { id: 12, text: 'من أكثر شخص تثق فيه؟', emoji: '🤝' },
  { id: 13, text: 'من سيتأخر كثيراً في الزواج؟', emoji: '🙈' },
  { id: 14, text: 'من الأكثر مجنوناً في المجموعة؟', emoji: '🤪' },
  { id: 15, text: 'من الأكثر هدوءاً بالمظهر لكن فوضى من الداخل؟', emoji: '🌪️' },
  { id: 16, text: 'من الأكثر كرماً؟', emoji: '🎁' },
  { id: 17, text: 'من سيصبح أغنى شخص في المجموعة؟', emoji: '💎' },
  { id: 18, text: 'من الأكثر حساسية؟', emoji: '🥺' },
  { id: 19, text: 'من الأكثر تنظيماً في حياته؟', emoji: '📋' },
  { id: 20, text: 'من يأكل أكثر من الجميع؟', emoji: '🍔' },
  { id: 21, text: 'من الشخص الذي يعرف أسرار الجميع؟', emoji: '🤫' },
  { id: 22, text: 'من الأكثر تعلقاً بهاتفه؟', emoji: '📱' },
  { id: 23, text: 'من الأكثر شجاعة في قول رأيه؟', emoji: '🗣️' },
  { id: 24, text: 'من الأكثر مغامرة؟', emoji: '🏔️' },
  { id: 25, text: 'من سيكون أفضل أب أو أم؟', emoji: '👨‍👩‍👧' },
  { id: 26, text: 'من الأكثر تشاؤماً؟', emoji: '😒' },
  { id: 27, text: 'من الأكثر تفاؤلاً؟', emoji: '🌟' },
  { id: 28, text: 'من الأكثر إصراراً على رأيه حتى لو كان غلط؟', emoji: '😤' },
  { id: 29, text: 'من الشخص الذي تتصل به وقت الأزمات؟', emoji: '📞' },
  { id: 30, text: 'من الأكثر ذكاءً في المجموعة؟', emoji: '🧠' },
];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── مكوّن الترتيب بالسحب ─────────────────────────────────────
function RankList({ players, ranked, onRank }) {
  return (
    <View style={rl.wrap}>
      {players.map((p, idx) => {
        const rank = ranked.indexOf(p.id) + 1;
        return (
          <TouchableOpacity
            key={p.id}
            style={[rl.item, rank > 0 && rl.itemRanked]}
            onPress={() => onRank(p.id)}
            activeOpacity={0.8}
          >
            <View style={[rl.badge, rank > 0 ? rl.badgeActive : rl.badgeEmpty]}>
              <Text style={rl.badgeText}>{rank > 0 ? rank : '؟'}</Text>
            </View>
            <Text style={[rl.name, rank > 0 && rl.nameRanked]}>{p.name}</Text>
            {rank > 0 && <Text style={rl.check}>✓</Text>}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const rl = StyleSheet.create({
  wrap: { gap: 10 },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#0f0f2e', borderRadius: 14,
    borderWidth: 1.5, borderColor: '#ffffff15',
    padding: 14,
  },
  itemRanked: { borderColor: '#f59e0b50', backgroundColor: '#f59e0b08' },
  badge: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeEmpty: { backgroundColor: '#1e1b4b', borderWidth: 1, borderColor: '#ffffff20' },
  badgeActive: { backgroundColor: '#f59e0b' },
  badgeText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  name: { flex: 1, color: '#8080aa', fontSize: 15, fontWeight: '600' },
  nameRanked: { color: '#fff' },
  check: { color: '#f59e0b', fontSize: 18, fontWeight: '900' },
});

// ── المكوّن الرئيسي ──────────────────────────────────────────
export default function RankFriendsScreen({ onBack }) {
  const [phase, setPhase] = useState('setup'); // setup | play | reveal | end
  const [playerName, setPlayerName] = useState('');
  const [players, setPlayers] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [qIndex, setQIndex] = useState(0);
  const [currentRank, setCurrentRank] = useState([]); // [id, id, ...] by rank
  const [allAnswers, setAllAnswers] = useState([]); // {question, ranked:[names]}
  const [showReveal, setShowReveal] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 7, useNativeDriver: true }),
    ]).start();
  }, [phase, qIndex]);

  function resetAnims() {
    fadeAnim.setValue(0);
    scaleAnim.setValue(0.9);
  }

  function addPlayer() {
    const name = playerName.trim();
    if (!name) return;
    if (players.length >= 10) return Alert.alert('', 'الحد الأقصى 10 لاعبين');
    if (players.find(p => p.name === name)) return Alert.alert('', 'هذا الاسم موجود مسبقاً');
    setPlayers(prev => [...prev, { id: Date.now().toString(), name }]);
    setPlayerName('');
  }

  function removePlayer(id) {
    setPlayers(prev => prev.filter(p => p.id !== id));
  }

  function startGame() {
    if (players.length < 3) return Alert.alert('', 'أضف 3 لاعبين على الأقل');
    const qs = shuffle(QUESTIONS).slice(0, Math.min(15, QUESTIONS.length));
    setQuestions(qs);
    setQIndex(0);
    setAllAnswers([]);
    setCurrentRank([]);
    resetAnims();
    setPhase('play');
  }

  function handleRankTap(playerId) {
    setCurrentRank(prev => {
      if (prev.includes(playerId)) {
        // إزالة وإعادة ترقيم
        return prev.filter(id => id !== playerId);
      } else {
        return [...prev, playerId];
      }
    });
  }

  function confirmRank() {
    if (currentRank.length < players.length) {
      return Alert.alert('', 'رتّب جميع اللاعبين أولاً — اضغط على كل اسم بالترتيب');
    }
    const rankedNames = currentRank.map(id => players.find(p => p.id === id)?.name);
    const newAnswer = { question: questions[qIndex], ranked: rankedNames };
    const updatedAnswers = [...allAnswers, newAnswer];
    setAllAnswers(updatedAnswers);

    if (qIndex + 1 >= questions.length) {
      resetAnims();
      setPhase('reveal');
      setShowReveal(false);
    } else {
      setCurrentRank([]);
      resetAnims();
      setQIndex(prev => prev + 1);
    }
  }

  // ── شاشة الإعداد ─────────────────────────────────────────
  if (phase === 'setup') return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#06061a" />

        <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Text style={styles.backText}>→</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerEmoji}>🏆</Text>
            <Text style={styles.headerTitle}>رتّب أصدقاءك</Text>
          </View>
          <View style={{ width: 40 }} />
        </Animated.View>

        <ScrollView contentContainerStyle={styles.setupContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.setupDesc}>
            أسئلة تكشف من هو من في مجموعتك 😄{'\n'}كل شخص يرتّب الجميع بسرية ثم تُكشف النتائج!
          </Text>

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

          <Text style={styles.playerCount}>
            {players.length} / 10 لاعبين
          </Text>

          {players.length >= 3 && (
            <TouchableOpacity style={styles.startBtn} onPress={startGame}>
              <Text style={styles.startBtnText}>🏆 ابدأ اللعبة</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );

  // ── شاشة اللعب ────────────────────────────────────────────
  if (phase === 'play') {
    const q = questions[qIndex];
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#06061a" />

        <View style={styles.header}>
          <TouchableOpacity onPress={() => {
            Alert.alert('خروج', 'هل تريد الخروج من اللعبة؟', [
              { text: 'لا' },
              { text: 'نعم', onPress: () => setPhase('setup') },
            ]);
          }} style={styles.backBtn}>
            <Text style={styles.backText}>→</Text>
          </TouchableOpacity>
          <View style={styles.progressWrap}>
            <Text style={styles.progressText}>سؤال {qIndex + 1} / {questions.length}</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${((qIndex + 1) / questions.length) * 100}%` }]} />
            </View>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.playContent}>
          <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
            <View style={styles.questionCard}>
              <Text style={styles.qEmoji}>{q.emoji}</Text>
              <Text style={styles.qText}>{q.text}</Text>
              <Text style={styles.qHint}>اضغط على الأسماء بالترتيب (الأول = المرتبة 1)</Text>
            </View>
          </Animated.View>

          <RankList
            players={players}
            ranked={currentRank}
            onRank={handleRankTap}
          />

          <View style={styles.rankPreview}>
            {currentRank.length > 0 && currentRank.map((id, idx) => {
              const p = players.find(pl => pl.id === id);
              return (
                <View key={id} style={styles.rankPreviewItem}>
                  <Text style={styles.rankPreviewNum}>{idx + 1}</Text>
                  <Text style={styles.rankPreviewName}>{p?.name}</Text>
                </View>
              );
            })}
          </View>

          {currentRank.length === players.length && (
            <TouchableOpacity style={styles.confirmBtn} onPress={confirmRank}>
              <Text style={styles.confirmBtnText}>
                {qIndex + 1 < questions.length ? 'السؤال التالي ←' : 'عرض النتائج 🏆'}
              </Text>
            </TouchableOpacity>
          )}

          {currentRank.length > 0 && currentRank.length < players.length && (
            <TouchableOpacity style={styles.resetRankBtn} onPress={() => setCurrentRank([])}>
              <Text style={styles.resetRankBtnText}>↺ إعادة الترتيب</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    );
  }

  // ── شاشة الكشف ───────────────────────────────────────────
  if (phase === 'reveal') {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#06061a" />

        <View style={styles.header}>
          <TouchableOpacity onPress={() => setPhase('setup')} style={styles.backBtn}>
            <Text style={styles.backText}>→</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerEmoji}>🎉</Text>
            <Text style={styles.headerTitle}>النتائج</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.revealContent}>
          <Text style={styles.revealTitle}>إليكم ما قاله الجميع... 👀</Text>

          {allAnswers.map((ans, i) => (
            <View key={i} style={styles.revealCard}>
              <Text style={styles.revealQEmoji}>{ans.question.emoji}</Text>
              <Text style={styles.revealQText}>{ans.question.text}</Text>
              <View style={styles.revealRanks}>
                {ans.ranked.map((name, rank) => (
                  <View key={rank} style={styles.revealRankRow}>
                    <Text style={[styles.revealRankNum,
                      rank === 0 && styles.rank1,
                      rank === 1 && styles.rank2,
                      rank === 2 && styles.rank3,
                    ]}>
                      {rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : `${rank + 1}.`}
                    </Text>
                    <Text style={[styles.revealName,
                      rank === 0 && styles.rank1Name,
                    ]}>{name}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}

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

// ── ستايلات ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: '#06061a', paddingTop: 56 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20, marginBottom: 16,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#0f0f2e',
    borderWidth: 1, borderColor: '#f59e0b30',
    alignItems: 'center', justifyContent: 'center',
  },
  backText: { color: '#f59e0b', fontSize: 20, fontWeight: '700' },
  headerCenter: { alignItems: 'center', gap: 2 },
  headerEmoji: { fontSize: 24 },
  headerTitle: { color: '#f59e0b', fontSize: 18, fontWeight: '900' },

  // إعداد
  setupContent: { paddingHorizontal: 20, paddingBottom: 60, gap: 16 },
  setupDesc: {
    color: '#8080aa', fontSize: 14, textAlign: 'center',
    lineHeight: 22, backgroundColor: '#0f0f2e',
    padding: 16, borderRadius: 14,
    borderWidth: 1, borderColor: '#f59e0b20',
  },
  inputRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  input: {
    flex: 1, backgroundColor: '#0f0f2e',
    borderWidth: 1.5, borderColor: '#f59e0b30',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    color: '#fff', fontSize: 15,
  },
  addBtn: {
    backgroundColor: '#f59e0b', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  addBtnText: { color: '#000', fontWeight: '900', fontSize: 14 },
  playersList: { gap: 8 },
  playerChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0f0f2e', borderRadius: 12,
    borderWidth: 1, borderColor: '#f59e0b30',
    padding: 12, gap: 10,
  },
  chipNum: {
    width: 26, height: 26, borderRadius: 8,
    backgroundColor: '#f59e0b',
    textAlign: 'center', lineHeight: 26,
    color: '#000', fontWeight: '900', fontSize: 13,
  },
  chipName: { flex: 1, color: '#fff', fontSize: 15, fontWeight: '600' },
  chipRemove: {
    width: 26, height: 26, borderRadius: 8,
    backgroundColor: '#ef444420',
    alignItems: 'center', justifyContent: 'center',
  },
  chipRemoveText: { color: '#ef4444', fontWeight: '700', fontSize: 12 },
  playerCount: { color: '#3a3a60', textAlign: 'center', fontSize: 13 },
  startBtn: {
    backgroundColor: '#f59e0b', borderRadius: 16,
    padding: 16, alignItems: 'center', marginTop: 8,
  },
  startBtnText: { color: '#000', fontWeight: '900', fontSize: 16 },
  outlineBtn: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: '#f59e0b50' },
  outlineBtnText: { color: '#f59e0b', fontWeight: '900', fontSize: 16 },

  // لعب
  playContent: { paddingHorizontal: 20, paddingBottom: 60, gap: 16 },
  progressWrap: { flex: 1, paddingHorizontal: 12, gap: 4 },
  progressText: { color: '#f59e0b', fontSize: 12, textAlign: 'center', fontWeight: '700' },
  progressBar: { height: 6, backgroundColor: '#0f0f2e', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#f59e0b', borderRadius: 3 },

  questionCard: {
    backgroundColor: '#0f0f2e', borderRadius: 20,
    borderWidth: 1.5, borderColor: '#f59e0b40',
    padding: 24, alignItems: 'center', gap: 10,
  },
  qEmoji: { fontSize: 44 },
  qText: { color: '#fff', fontSize: 18, fontWeight: '800', textAlign: 'center', lineHeight: 28 },
  qHint: { color: '#3a3a60', fontSize: 12, textAlign: 'center' },

  rankPreview: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    justifyContent: 'center',
  },
  rankPreviewItem: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#f59e0b15', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: '#f59e0b40',
  },
  rankPreviewNum: { color: '#f59e0b', fontWeight: '900', fontSize: 13 },
  rankPreviewName: { color: '#fff', fontSize: 13, fontWeight: '600' },

  confirmBtn: {
    backgroundColor: '#f59e0b', borderRadius: 16,
    padding: 16, alignItems: 'center',
  },
  confirmBtnText: { color: '#000', fontWeight: '900', fontSize: 16 },
  resetRankBtn: {
    borderWidth: 1, borderColor: '#ffffff20', borderRadius: 12,
    padding: 12, alignItems: 'center',
  },
  resetRankBtnText: { color: '#5a5a80', fontSize: 14, fontWeight: '600' },

  // كشف
  revealContent: { paddingHorizontal: 20, paddingBottom: 60, gap: 14 },
  revealTitle: { color: '#f59e0b', fontSize: 18, fontWeight: '900', textAlign: 'center', marginBottom: 4 },
  revealCard: {
    backgroundColor: '#0f0f2e', borderRadius: 18,
    borderWidth: 1.5, borderColor: '#f59e0b30',
    padding: 16, gap: 10,
  },
  revealQEmoji: { fontSize: 28, textAlign: 'center' },
  revealQText: { color: '#fff', fontSize: 15, fontWeight: '700', textAlign: 'center' },
  revealRanks: { gap: 8, marginTop: 4 },
  revealRankRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#ffffff08', borderRadius: 10, padding: 10,
  },
  revealRankNum: { fontSize: 20, width: 32, textAlign: 'center', color: '#5a5a80', fontWeight: '700' },
  rank1: { color: '#ffd700' },
  rank2: { color: '#c0c0c0' },
  rank3: { color: '#cd7f32' },
  revealName: { color: '#aaaacc', fontSize: 15, fontWeight: '600' },
  rank1Name: { color: '#ffd700', fontWeight: '900' },
});
