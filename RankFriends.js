import { useState, useRef, useEffect, useCallback, memo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, StatusBar, ScrollView, TextInput,
  Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useTheme } from './ThemeContext';
import ExitButton from './ExitButton';
import { useT, useRTLStyles, useLanguage } from './I18n';
import { RankFriendsEngraving } from './GameEngraving';
import { WebScreenButton, GameInfoButton } from './WebRoomService';
import { ThemedButton, ThemedCard, ThemedPill, ThemedRow } from './ThemedComponents';

// ─── أسئلة جاهزة (50 سؤال — يُختار 10 عشوائياً كل جولة) ──────────
const PRESET_QUESTIONS = [
  { id: 1,  text: 'من الأكثر ضحكاً في المجموعة؟',                      emoji: '😂' },
  { id: 2,  text: 'من سينام أول شخص في الجلسة؟',                       emoji: '😴' },
  { id: 3,  text: 'من الأكثر خجلاً؟',                                  emoji: '😳' },
  { id: 4,  text: 'من سيتزوج أول شخص؟',                                emoji: '💍' },
  { id: 5,  text: 'من الأكثر كذباً؟',                                  emoji: '🤥' },
  { id: 6,  text: 'من الأكثر تأخراً على المواعيد؟',                     emoji: '⏰' },
  { id: 7,  text: 'من الأشجع في المجموعة؟',                            emoji: '🦁' },
  { id: 8,  text: 'من الأكثر بخلاً؟',                                  emoji: '💰' },
  { id: 9,  text: 'من يغيّر رأيه أكثر؟',                              emoji: '🔄' },
  { id: 10, text: 'من الأكثر فضولاً في حياة الناس؟',                   emoji: '🕵️' },
  { id: 11, text: 'من سيكون مشهوراً يوماً ما؟',                        emoji: '⭐' },
  { id: 12, text: 'من أكثر شخص تثق فيه؟',                             emoji: '🤝' },
  { id: 13, text: 'من سيتأخر كثيراً في الزواج؟',                       emoji: '🙈' },
  { id: 14, text: 'من الأكثر مجنوناً في المجموعة؟',                    emoji: '🤪' },
  { id: 15, text: 'من الأكثر هدوءاً بالمظهر لكن فوضى من الداخل؟',     emoji: '🌪️' },
  { id: 16, text: 'من الأكثر كرماً؟',                                  emoji: '🎁' },
  { id: 17, text: 'من سيصبح أغنى شخص في المجموعة؟',                   emoji: '💎' },
  { id: 18, text: 'من الأكثر حساسية؟',                                 emoji: '🥺' },
  { id: 19, text: 'من الأكثر تنظيماً في حياته؟',                       emoji: '📋' },
  { id: 20, text: 'من يأكل أكثر من الجميع؟',                           emoji: '🍔' },
  { id: 21, text: 'من الشخص الذي يعرف أسرار الجميع؟',                  emoji: '🤫' },
  { id: 22, text: 'من الأكثر تعلقاً بهاتفه؟',                          emoji: '📱' },
  { id: 23, text: 'من الأكثر شجاعة في قول رأيه؟',                     emoji: '🗣️' },
  { id: 24, text: 'من الأكثر مغامرة؟',                                 emoji: '🏔️' },
  { id: 25, text: 'من سيكون أفضل أب أو أم؟',                          emoji: '👨‍👩‍👧' },
  { id: 26, text: 'من الأكثر تشاؤماً؟',                                emoji: '😒' },
  { id: 27, text: 'من الأكثر تفاؤلاً؟',                                emoji: '🌟' },
  { id: 28, text: 'من الأكثر إصراراً على رأيه حتى لو كان غلط؟',       emoji: '😤' },
  { id: 29, text: 'من الشخص الذي تتصل به وقت الأزمات؟',               emoji: '📞' },
  { id: 30, text: 'من الأكثر ذكاءً في المجموعة؟',                      emoji: '🧠' },
  { id: 31, text: 'من الأكثر نوماً في المجموعة؟',                      emoji: '🛌' },
  { id: 32, text: 'من الأكثر إنفاقاً على نفسه؟',                      emoji: '🛍️' },
  { id: 33, text: 'من الذي يتعلق بأصدقائه أكثر؟',                     emoji: '🫂' },
  { id: 34, text: 'من الأكثر قدرة على الإقناع؟',                      emoji: '🎤' },
  { id: 35, text: 'من الأسرع في الغضب؟',                              emoji: '😡' },
  { id: 36, text: 'من الأسرع في النسيان والسماح؟',                     emoji: '🕊️' },
  { id: 37, text: 'من الشخص الذي يحسدك عليه الجميع؟',                 emoji: '👑' },
  { id: 38, text: 'من الذي يستطيع البقاء بدون هاتف أطول وقت؟',        emoji: '🚫📱' },
  { id: 39, text: 'من الأكثر انتقاداً للآخرين؟',                      emoji: '🔍' },
  { id: 40, text: 'من الأصعب في إرضائه؟',                             emoji: '😑' },
  { id: 41, text: 'من الأكثر رياضةً في المجموعة؟',                    emoji: '🏋️' },
  { id: 42, text: 'من الذي يضحك على نكتته قبل أن يقولها؟',            emoji: '🤭' },
  { id: 43, text: 'من الأكثر دراماتيكية في تصرفاته؟',                 emoji: '🎭' },
  { id: 44, text: 'من الذي ينصح الجميع لكنه لا يطبّق على نفسه؟',      emoji: '🧐' },
  { id: 45, text: 'من الأكثر خوفاً من المستقبل؟',                     emoji: '😰' },
  { id: 46, text: 'من الأكثر استمتاعاً بالحياة؟',                     emoji: '🎉' },
  { id: 47, text: 'من الأقرب إلى قلبك في هذه المجموعة؟',              emoji: '❤️' },
  { id: 48, text: 'من الشخص الذي لو غاب ستفتقده المجموعة كثيراً؟',    emoji: '🥲' },
  { id: 49, text: 'من الذي يسهر أطول وقت ممكن؟',                      emoji: '🌙' },
  { id: 50, text: 'من الأكثر تعقيداً كشخصية؟',                        emoji: '🌀' },
];
const PRESET_QUESTIONS_EN = [
  { id: 1,  text: "Who laughs the loudest in the group?",                       emoji: '😂' },
  { id: 2,  text: "Who will fall asleep first tonight?",                        emoji: '😴' },
  { id: 3,  text: "Who is the shyest person here?",                             emoji: '😳' },
  { id: 4,  text: "Who will get married first?",                                emoji: '💍' },
  { id: 5,  text: "Who is the biggest liar?",                                   emoji: '🤥' },
  { id: 6,  text: "Who is always running late?",                                emoji: '⏰' },
  { id: 7,  text: "Who is the bravest in the group?",                           emoji: '🦁' },
  { id: 8,  text: "Who is the tightest with money?",                            emoji: '💰' },
  { id: 9,  text: "Who changes their mind the most?",                           emoji: '🔄' },
  { id: 10, text: "Who is most nosy about other people's lives?",               emoji: '👀' },
  { id: 11, text: "Who is most likely to become famous one day?",               emoji: '🌟' },
  { id: 12, text: "Who do you trust the most?",                                 emoji: '🤝' },
  { id: 13, text: "Who will be the last to get married?",                       emoji: '💒' },
  { id: 14, text: "Who is the wildest in the group?",                           emoji: '🤪' },
  { id: 15, text: "Who looks calm but is a total mess inside?",                 emoji: '😌' },
  { id: 16, text: "Who is the most generous?",                                  emoji: '🎁' },
  { id: 17, text: "Who will be the richest in the group?",                      emoji: '💸' },
  { id: 18, text: "Who is the most sensitive?",                                 emoji: '🥺' },
  { id: 19, text: "Who has the most organized life?",                           emoji: '📋' },
  { id: 20, text: "Who eats the most out of everyone?",                         emoji: '🍕' },
  { id: 21, text: "Who knows everyone's secrets?",                              emoji: '🤫' },
  { id: 22, text: "Who is most addicted to their phone?",                       emoji: '📱' },
  { id: 23, text: "Who is most fearless about speaking their mind?",            emoji: '🎤' },
  { id: 24, text: "Who is the biggest risk-taker?",                             emoji: '🎲' },
  { id: 25, text: "Who will be the best parent?",                               emoji: '👨‍👩‍👧' },
  { id: 26, text: "Who is the most pessimistic?",                               emoji: '😔' },
  { id: 27, text: "Who is the most optimistic?",                                emoji: '🌈' },
  { id: 28, text: "Who stubbornly sticks to their opinion even when wrong?",    emoji: '🤦' },
  { id: 29, text: "Who do you call first in a crisis?",                         emoji: '🆘' },
  { id: 30, text: "Who is the smartest in the group?",                          emoji: '🧠' },
  { id: 31, text: "Who sleeps the most?",                                       emoji: '💤' },
  { id: 32, text: "Who spends the most money on themselves?",                   emoji: '🛍️' },
  { id: 33, text: "Who gets most attached to their friends?",                   emoji: '🫂' },
  { id: 34, text: "Who is the most convincing?",                                emoji: '💬' },
  { id: 35, text: "Who loses their temper the fastest?",                        emoji: '😤' },
  { id: 36, text: "Who forgives and forgets the quickest?",                     emoji: '🕊️' },
  { id: 37, text: "Who does everyone secretly envy?",                           emoji: '😏' },
  { id: 38, text: "Who could go the longest without their phone?",              emoji: '📵' },
  { id: 39, text: "Who is the most judgmental?",                                emoji: '🧐' },
  { id: 40, text: "Who is the hardest to please?",                              emoji: '😒' },
  { id: 41, text: "Who is most into fitness and working out?",                  emoji: '💪' },
  { id: 42, text: "Who laughs at their own jokes before finishing them?",       emoji: '🤣' },
  { id: 43, text: "Who is the most dramatic?",                                  emoji: '🎭' },
  { id: 44, text: "Who gives everyone advice but never follows it themselves?", emoji: '🙄' },
  { id: 45, text: "Who worries about the future the most?",                     emoji: '😰' },
  { id: 46, text: "Who enjoys life the most?",                                  emoji: '🥳' },
  { id: 47, text: "Who is closest to your heart in this group?",               emoji: '❤️' },
  { id: 48, text: "Who would the group miss the most if they were gone?",       emoji: '🥹' },
  { id: 49, text: "Who stays up the latest?",                                   emoji: '🦉' },
  { id: 50, text: "Who is the most complex personality in the group?",          emoji: '🌀' },
];


// ─── عدد اللاعبين المصنّفين لكل سؤال حسب إجمالي عدد اللاعبين ────
function getRanksNeeded(playerCount) {
  if (playerCount <= 2) return 2;       // 2 → يرتّبون الاثنين
  if (playerCount <= 5) return 2;       // 3-5 → لاعبان لكل سؤال
  if (playerCount <= 7) return 3;       // 6-7 → 3 لاعبين
  if (playerCount <= 9) return 4;       // 8-9 → 4 لاعبين
  return 5;                             // 10+ → 5 لاعبين
}

// ─── نقاط ديناميكية حسب المركز وعدد اللاعبين ────────────────────
function getPointsTable(playerCount) {
  if (playerCount === 2) return [10, 5];
  if (playerCount === 3) return [10, 7, 4];
  if (playerCount === 4) return [10, 8, 5, 2];
  if (playerCount === 5) return [10, 8, 6, 4, 2];
  if (playerCount === 6) return [10, 9, 7, 5, 3, 1];
  if (playerCount === 7) return [10, 9, 7, 6, 4, 2, 1];
  if (playerCount === 8) return [10, 9, 8, 7, 5, 3, 2, 1];
  if (playerCount === 9) return [10, 9, 8, 7, 6, 4, 3, 2, 1];
  if (playerCount === 10) return [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
  // 11+: أول 10 بالتدريج، الباقون صفر
  return Array.from({ length: playerCount }, (_, i) => Math.max(0, 10 - i));
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── مؤشر دور اللاعب الحالي (يتناوب بين اللاعبين) ────────────────
// كل سؤال دور لاعب مختلف
function getVoterIndex(qIndex, playerCount) {
  return qIndex % playerCount;
}

const HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

// ─── RankItem ─────────────────────────────────────────────────────
const RankItem = memo(({ player, rank, onPress, theme, ranksNeeded }) => {
  const isSelected = rank > 0;
  return (
    <TouchableOpacity
      style={[
        styles.rankItem,
        { backgroundColor: theme.bgCard, borderColor: theme.border },
        isSelected && { borderColor: '#f59e0b80', backgroundColor: '#f59e0b10' },
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[
        styles.rankBadge,
        isSelected ? styles.rankBadgeActive : { backgroundColor: theme.bgElevated, borderWidth: 1, borderColor: theme.border },
      ]}>
        <Text style={[styles.rankBadgeText, !isSelected && { color: theme.textMuted }]}>
          {isSelected ? rank : '؟'}
        </Text>
      </View>
      <Text style={[styles.rankName, { color: isSelected ? theme.textPrimary : theme.textMuted }]}>
        {player.name}
      </Text>
      {isSelected && (
        <View style={styles.rankMedalWrap}>
          <Text style={styles.rankMedal}>
            {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
});

// ─── شريط نقاط اللاعبين ──────────────────────────────────────────
const ScoreBar = memo(({ players, scores, theme }) => {
  const sorted = [...players].sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0));
  const maxScore = Math.max(...players.map(p => scores[p.id] || 0), 1);
  return (
    <View style={[styles.scoreBar, { backgroundColor: theme.bgCard, borderColor: '#f59e0b20' }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scoreBarInner}>
        {sorted.map((p, i) => (
          <View key={p.id} style={styles.scorePlayerCol}>
            <Text style={[styles.scorePlayerPts, { color: '#f59e0b' }]}>{scores[p.id] || 0}</Text>
            <View style={[styles.scoreBarOuter, { backgroundColor: theme.bgElevated }]}>
              <View style={[styles.scoreBarFill, {
                height: `${Math.max(10, ((scores[p.id] || 0) / maxScore) * 100)}%`,
                backgroundColor: i === 0 ? '#f59e0b' : i === 1 ? '#a0a0c0' : '#6b7280',
              }]} />
            </View>
            <Text style={[styles.scorePlayerName, { color: theme.textSecondary }]} numberOfLines={1}>{p.name}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
});

// ─── بطاقة الكشف النهائي ─────────────────────────────────────────
const RevealCard = memo(({ ans, theme }) => (
  <View style={[styles.revealCard, { backgroundColor: theme.bgCard, borderColor: '#f59e0b30' }]}>
    <Text style={styles.revealQEmoji}>{ans.question.emoji}</Text>
    <Text style={[styles.revealQText, { color: theme.textPrimary }]}>{ans.question.text}</Text>
    <Text style={[styles.revealVoter, { color: theme.textMuted }]}>صوّت: {ans.voter}</Text>
    <View style={styles.revealRanks}>
      {ans.ranked.map((name, rank) => (
        <View key={rank} style={[styles.revealRankRow, { backgroundColor: theme.bgElevated }]}>
          <Text style={[styles.revealRankNum, rank === 0 && styles.rank1, rank === 1 && styles.rank2, rank === 2 && styles.rank3]}>
            {rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : `${rank + 1}.`}
          </Text>
          <Text style={[styles.revealName, { color: theme.textSecondary }, rank === 0 && styles.rank1Name]}>{name}</Text>
        </View>
      ))}
    </View>
  </View>
));

// ════════════════════════════════════════════════════════════════
export default function RankFriendsScreen({ onBack, experience }) {
  const { theme, themeId } = useTheme();
  const { lang } = useLanguage();
  const isGlobal = experience === 'global';
  const t  = useT();
  const rs = useRTLStyles();

  // ─── setup state ──────────────────────────────────────────────
  const [mode,        setMode]        = useState(null);        // null | 'preset' | 'custom'
  const [playerName,  setPlayerName]  = useState('');
  const [players,     setPlayers]     = useState([]);
  const [customQText, setCustomQText] = useState('');
  const [customQEmoji,setCustomQEmoji]= useState('🎯');
  const [customQList, setCustomQList] = useState([]);

  // ─── play state ───────────────────────────────────────────────
  const [phase,       setPhase]       = useState('mode');      // mode | setup | play | reveal
  const [questions,   setQuestions]   = useState([]);
  const [qIndex,      setQIndex]      = useState(0);
  const [currentRank, setCurrentRank] = useState([]);          // array of player ids in order
  const [allAnswers,  setAllAnswers]  = useState([]);
  const [scores,      setScores]      = useState({});          // { playerId: points }

  const fadeAnim  = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    fadeAnim.setValue(0); scaleAnim.setValue(0.93);
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 7,   useNativeDriver: true }),
    ]).start();
  }, [phase, qIndex]);

  // ─── helpers ──────────────────────────────────────────────────
  const addPlayer = useCallback(() => {
    const name = playerName.trim();
    if (!name) return;
    if (players.length >= 15) return Alert.alert('', 'الحد الأقصى 15 لاعباً');
    if (players.find(p => p.name === name)) return Alert.alert('', 'هذا الاسم موجود مسبقاً');
    setPlayers(prev => [...prev, { id: Date.now().toString(), name }]);
    setPlayerName('');
  }, [playerName, players]);

  const removePlayer = useCallback((id) => setPlayers(prev => prev.filter(p => p.id !== id)), []);

  const addCustomQuestion = useCallback(() => {
    const text = customQText.trim();
    if (!text) return;
    if (customQList.length >= 10) return Alert.alert('', 'الحد الأقصى 10 أسئلة مخصصة');
    setCustomQList(prev => [...prev, { id: Date.now().toString(), text, emoji: customQEmoji }]);
    setCustomQText('');
  }, [customQText, customQEmoji, customQList]);

  const removeCustomQ = useCallback((id) => setCustomQList(prev => prev.filter(q => q.id !== id)), []);

  const startGame = useCallback(() => {
    if (players.length < 2) return Alert.alert('', 'أضف لاعبَين على الأقل');
    let qs;
    if (mode === 'preset') {
      qs = shuffle(PRESET_QUESTIONS).slice(0, 10);
    } else {
      if (customQList.length < 5)  return Alert.alert('', 'أضف 5 أسئلة على الأقل للبدء');
      qs = shuffle(customQList).slice(0, 10);
    }
    const initScores = {};
    players.forEach(p => { initScores[p.id] = 0; });
    setScores(initScores);
    setQuestions(qs);
    setQIndex(0);
    setAllAnswers([]);
    setCurrentRank([]);
    setPhase('play');
  }, [players, mode, customQList]);

  // ─── tap على اسم لاعب في مرحلة اللعب ─────────────────────────
  const handleRankTap = useCallback((id) => {
    setCurrentRank(prev => {
      if (prev.includes(id)) {
        // إلغاء التحديد → إزالته وإعادة ترتيب من بعده
        return prev.filter(x => x !== id);
      } else {
        return [...prev, id];
      }
    });
  }, []);

  // ─── تأكيد الترتيب ────────────────────────────────────────────
  const confirmRank = useCallback(() => {
    const ranksNeeded = getRanksNeeded(players.length);
    if (currentRank.length < ranksNeeded) return;

    const pointsTable = getPointsTable(players.length);
    const voterIdx    = getVoterIndex(qIndex, players.length);
    const voter       = players[voterIdx]?.name ?? '';

    // تحديث النقاط — فقط اللاعبون المرتَّبون في هذا السؤال يحصلون نقاطاً
    setScores(prev => {
      const next = { ...prev };
      currentRank.forEach((pid, i) => {
        next[pid] = (next[pid] || 0) + (pointsTable[i] || 0);
      });
      return next;
    });

    const rankedNames = currentRank.map(id => players.find(p => p.id === id)?.name ?? '');
    const newAnswer   = { question: questions[qIndex], ranked: rankedNames, voter };

    if (qIndex + 1 >= questions.length) {
      setAllAnswers(prev => [...prev, newAnswer]);
      setPhase('reveal');
    } else {
      setAllAnswers(prev => [...prev, newAnswer]);
      setCurrentRank([]);
      setQIndex(prev => prev + 1);
    }
  }, [currentRank, players, questions, qIndex]);

  const goMode  = useCallback(() => { setPhase('mode'); setMode(null); }, []);
  const goSetup = useCallback(() => setPhase('setup'), []);

  const handleExitPlay = useCallback(() => {
    Alert.alert('', 'هل تريد الخروج من اللعبة؟', [
      { text: 'لا' },
      { text: 'نعم', onPress: goMode },
    ]);
  }, [goMode]);

  // ════════════════════════════════════════════════════════════════
  // PHASE: اختيار الوضع
  // ════════════════════════════════════════════════════════════════
  if (phase === 'mode') {
    return (
      <View style={[styles.container, { backgroundColor: theme.isCityTheme ? 'transparent' : theme.bg }]}>
        <RankFriendsEngraving theme={theme} />
        <StatusBar barStyle={theme.statusBar} backgroundColor={theme.statusBg} />

        {/* زر رجوع صغير */}
        <View style={styles.exitBtnRow}>
          <TouchableOpacity onPress={onBack} style={[styles.exitBtn, { backgroundColor: theme.bgCard, borderColor: '#f59e0b30' }]} hitSlop={HIT_SLOP}>
            <Text style={[styles.exitBtnText, { color: '#f59e0b' }]}>→</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.modeCenterWrap}>
          <Text style={styles.modeEmoji}>🏆</Text>
          <Text style={[styles.modeTitle, { color: '#f59e0b' }]}>رتّب أصدقاءك</Text>
          <Text style={[styles.modeSubtitle, { color: theme.textMuted }]}>من الأكثر ضحكاً؟ من سيتأخر في الزواج؟</Text>

          <View style={styles.modeCardsRow}>
            {/* وضع جاهز */}
            <TouchableOpacity
              style={[styles.modeCard, { backgroundColor: '#f59e0b18', borderColor: '#f59e0b60' }]}
              onPress={() => { setMode('preset'); setPhase('setup'); }}
              activeOpacity={0.8}
            >
              <Text style={styles.modeCardEmoji}>⚡</Text>
              <Text style={[styles.modeCardTitle, { color: '#f59e0b' }]}>جاهز</Text>
              <Text style={[styles.modeCardDesc, { color: theme.textMuted }]}>أسئلة جاهزة{'\n'}ابدأ فوراً</Text>
            </TouchableOpacity>

            {/* وضع مخصص */}
            <TouchableOpacity
              style={[styles.modeCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}
              onPress={() => { setMode('custom'); setPhase('setup'); }}
              activeOpacity={0.8}
            >
              <Text style={styles.modeCardEmoji}>✏️</Text>
              <Text style={[styles.modeCardTitle, { color: theme.textPrimary }]}>مخصص</Text>
              <Text style={[styles.modeCardDesc, { color: theme.textMuted }]}>أضف أسئلتك{'\n'}الخاصة</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // PHASE: إعداد اللعبة
  // ════════════════════════════════════════════════════════════════
  if (phase === 'setup') {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={[styles.container, { backgroundColor: theme.isCityTheme ? 'transparent' : theme.bg }]}>
          <RankFriendsEngraving theme={theme} />
          <StatusBar barStyle={theme.statusBar} backgroundColor={theme.statusBg} />

          <View style={styles.header}>
            <TouchableOpacity onPress={goMode} style={[styles.backBtn, { backgroundColor: theme.bgCard, borderColor: '#f59e0b30' }]} hitSlop={HIT_SLOP}>
              <Text style={[styles.backText, { color: '#f59e0b' }]}>{t('common.backArrow')}</Text>
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerEmoji}>{mode === 'preset' ? '⚡' : '✏️'}</Text>
              <Text style={[styles.headerTitle, { color: '#f59e0b' }]}>{mode === 'preset' ? 'وضع جاهز' : 'وضع مخصص'}</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView contentContainerStyle={styles.setupContent} keyboardShouldPersistTaps="handled">

            {/* إضافة لاعبين */}
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>👥 اللاعبون ({players.length})</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, { backgroundColor: theme.bgCard, borderColor: '#f59e0b30', color: theme.textPrimary }, rs.textInput]}
                placeholder="اسم اللاعب..."
                placeholderTextColor={theme.textMuted}
                value={playerName}
                onChangeText={setPlayerName}
                onSubmitEditing={addPlayer}
                returnKeyType="done"
              />
              <TouchableOpacity style={[styles.addBtn, { backgroundColor: '#f59e0b' }]} onPress={addPlayer} activeOpacity={0.85}>
                <Text style={styles.addBtnText}>＋</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.playersList}>
              {players.map((p, i) => (
                <View key={p.id} style={[styles.playerChip, { backgroundColor: theme.bgCard, borderColor: '#f59e0b20' }]}>
                  <Text style={styles.chipNum}>{i + 1}</Text>
                  <Text style={[styles.chipName, { color: theme.textPrimary }]}>{p.name}</Text>
                  <TouchableOpacity style={styles.chipRemove} onPress={() => removePlayer(p.id)} hitSlop={HIT_SLOP}>
                    <Text style={styles.chipRemoveText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* إضافة أسئلة مخصصة فقط في وضع custom */}
            {mode === 'custom' && (
              <>
                <Text style={[styles.sectionLabel, { color: theme.textSecondary, marginTop: 8 }]}>❓ أسئلتك ({customQList.length} / 10 — لازم 5 على الأقل)</Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.bgCard, borderColor: '#f59e0b30', color: theme.textPrimary, flex: 1 }, rs.textInput]}
                    placeholder="من الأكثر...؟"
                    placeholderTextColor={theme.textMuted}
                    value={customQText}
                    onChangeText={setCustomQText}
                    onSubmitEditing={addCustomQuestion}
                    returnKeyType="done"
                  />
                  <TouchableOpacity style={[styles.addBtn, { backgroundColor: '#f59e0b' }]} onPress={addCustomQuestion} activeOpacity={0.85}>
                    <Text style={styles.addBtnText}>＋</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.playersList}>
                  {customQList.map((q, i) => (
                    <View key={q.id} style={[styles.playerChip, { backgroundColor: theme.bgCard, borderColor: '#f59e0b20' }]}>
                      <Text style={styles.chipNum}>{q.emoji}</Text>
                      <Text style={[styles.chipName, { color: theme.textPrimary }]} numberOfLines={1}>{q.text}</Text>
                      <TouchableOpacity style={styles.chipRemove} onPress={() => removeCustomQ(q.id)} hitSlop={HIT_SLOP}>
                        <Text style={styles.chipRemoveText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </>
            )}

            {players.length >= 2 && (mode === 'preset' || customQList.length >= 5) && (
              <TouchableOpacity style={[styles.startBtn, { backgroundColor: '#f59e0b' }]} onPress={startGame} activeOpacity={0.85}>
                <Text style={styles.startBtnText}>🏆 ابدأ اللعبة</Text>
              </TouchableOpacity>
            )}

          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // PHASE: اللعب
  // ════════════════════════════════════════════════════════════════
  if (phase === 'play') {
    const q           = questions[qIndex];
    const ranksNeeded = getRanksNeeded(players.length);
    const voterIdx    = getVoterIndex(qIndex, players.length);
    const voter       = players[voterIdx];
    const canConfirm  = currentRank.length >= ranksNeeded;

    // اللاعبون القابلون للتحديد (باستثناء المُصوِّت إذا لاعبَين فقط)
    // في حال لاعبَين: المُصوِّت يرتب الآخر فقط → يُظهر الاثنين لكن المُصوِّت لا يختار نفسه
    const selectablePlayers = players.length === 2
      ? players.filter(p => p.id !== voter?.id)
      : players;

    // في حالة لاعبَين فقط: ranksNeeded = 2 لكن selectablePlayers = 1
    // لذا نعيد الحساب
    const effectiveRanksNeeded = players.length === 2 ? 1 : ranksNeeded;
    const canConfirmEffective  = currentRank.length >= effectiveRanksNeeded;

    return (
      <View style={[styles.container, { backgroundColor: theme.isCityTheme ? 'transparent' : theme.bg }]}>
        <RankFriendsEngraving theme={theme} />
        <StatusBar barStyle={theme.statusBar} backgroundColor={theme.statusBg} />

        {/* زر خروج + زر شاشة كبيرة */}
        <View style={styles.exitBtnRow}>
          <TouchableOpacity onPress={handleExitPlay} style={[styles.exitBtn, { backgroundColor: theme.bgCard, borderColor: '#f59e0b30' }]} hitSlop={HIT_SLOP}>
            <Text style={[styles.exitBtnText, { color: '#f59e0b' }]}>→</Text>
          </TouchableOpacity>
          <GameInfoButton gameType="rank_friends" lang={lang} />
          <WebScreenButton
            playerUid="rf_p0"
            playerName=""
            gameType="rank_friends"
            getPublicData={() => ({ qIndex, players })}
            themeName={themeId || 'dark'}
          />
        </View>

        {/* شريط تقدم */}
        <View style={styles.progressWrap}>
          <Text style={[styles.progressText, { color: theme.textMuted }]}>سؤال {qIndex + 1} / {questions.length}</Text>
          <View style={[styles.progressBar, { backgroundColor: theme.bgCard }]}>
            <View style={[styles.progressFill, { width: `${((qIndex + 1) / questions.length) * 100}%` }]} />
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.playContent}>

          {/* شريط النقاط */}
          <ScoreBar players={players} scores={scores} theme={theme} />

          {/* بطاقة السؤال */}
          <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
            <View style={[styles.questionCard, { backgroundColor: theme.bgCard, borderColor: '#f59e0b40' }]}>
              <Text style={styles.qEmoji}>{q.emoji}</Text>
              <Text style={[styles.qText, { color: theme.textPrimary }]}>{q.text}</Text>
            </View>
          </Animated.View>

          {/* دور اللاعب */}
          <View style={[styles.voterBadge, { backgroundColor: '#f59e0b18', borderColor: '#f59e0b50' }]}>
            <Text style={[styles.voterLabel, { color: theme.textMuted }]}>دور التصويت</Text>
            <Text style={[styles.voterName, { color: '#f59e0b' }]}>👤 {voter?.name}</Text>
            <Text style={[styles.voterHint, { color: theme.textMuted }]}>
              رتّب {effectiveRanksNeeded === 1 ? 'الأول فقط' : `أفضل ${effectiveRanksNeeded}`} — اضغط بالترتيب
            </Text>
          </View>

          {/* قائمة اللاعبين */}
          <View style={styles.rankList}>
            {selectablePlayers.map(p => (
              <RankItem
                key={p.id}
                player={p}
                rank={currentRank.indexOf(p.id) + 1}
                onPress={() => handleRankTap(p.id)}
                theme={theme}
                ranksNeeded={effectiveRanksNeeded}
              />
            ))}
          </View>

          {/* معاينة الترتيب الحالي */}
          {currentRank.length > 0 && (
            <View style={styles.rankPreview}>
              {currentRank.map((id, idx) => {
                const p = players.find(pl => pl.id === id);
                return (
                  <View key={id} style={[styles.rankPreviewItem, { backgroundColor: '#f59e0b15', borderColor: '#f59e0b40' }]}>
                    <Text style={[styles.rankPreviewNum, { color: '#f59e0b' }]}>{idx + 1}</Text>
                    <Text style={[styles.rankPreviewName, { color: theme.textPrimary }]}>{p?.name}</Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* زر التثبيت */}
          {canConfirmEffective && (
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: '#f59e0b' }]}
              onPress={confirmRank}
              activeOpacity={0.85}
            >
              <Text style={styles.confirmBtnText}>
                {qIndex + 1 < questions.length ? '✅ ثبّت الترتيب' : '🏆 عرض النتائج'}
              </Text>
            </TouchableOpacity>
          )}

          {/* زر إعادة الترتيب */}
          {currentRank.length > 0 && !canConfirmEffective && (
            <TouchableOpacity
              style={[styles.resetRankBtn, { borderColor: theme.border }]}
              onPress={() => setCurrentRank([])}
              activeOpacity={0.8}
            >
              <Text style={[styles.resetRankBtnText, { color: theme.textMuted }]}>↺ إعادة التحديد</Text>
            </TouchableOpacity>
          )}

        </ScrollView>
      </View>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // PHASE: النتائج
  // ════════════════════════════════════════════════════════════════
  if (phase === 'reveal') {
    const sortedPlayers = [...players].sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0));
    const pointsTable   = getPointsTable(players.length);

    return (
      <View style={[styles.container, { backgroundColor: theme.isCityTheme ? 'transparent' : theme.bg }]}>
        <StatusBar barStyle={theme.statusBar} backgroundColor={theme.statusBg} />
        <View style={styles.header}>
          <TouchableOpacity onPress={goMode} style={[styles.backBtn, { backgroundColor: theme.bgCard, borderColor: '#f59e0b30' }]} hitSlop={HIT_SLOP}>
            <Text style={[styles.backText, { color: '#f59e0b' }]}>{t('common.backArrow')}</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerEmoji}>🎉</Text>
            <Text style={[styles.headerTitle, { color: '#f59e0b' }]}>النتائج النهائية</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.revealContent}>

          {/* ترتيب اللاعبين */}
          <View style={[styles.podiumWrap, { backgroundColor: theme.bgCard, borderColor: '#f59e0b30' }]}>
            {sortedPlayers.map((p, i) => (
              <View key={p.id} style={[styles.podiumRow, { borderBottomColor: theme.border }]}>
                <Text style={styles.podiumMedal}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                </Text>
                <Text style={[styles.podiumName, { color: i === 0 ? '#f59e0b' : theme.textPrimary }]}>{p.name}</Text>
                <Text style={[styles.podiumPts, { color: '#f59e0b' }]}>{scores[p.id] || 0} نقطة</Text>
              </View>
            ))}
          </View>

          {/* تفاصيل كل سؤال */}
          <Text style={[styles.revealTitle, { color: '#f59e0b' }]}>إليكم ما قاله الجميع... 👀</Text>
          {allAnswers.map((ans, i) => (
            <RevealCard key={i} ans={ans} theme={theme} />
          ))}

          <TouchableOpacity style={[styles.startBtn, { backgroundColor: '#f59e0b' }]} onPress={startGame} activeOpacity={0.85}>
            <Text style={styles.startBtnText}>🔄 جولة جديدة</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.outlineBtn, { borderColor: '#f59e0b50' }]} onPress={goMode} activeOpacity={0.85}>
            <Text style={[styles.outlineBtnText, { color: '#f59e0b' }]}>🏠 الرئيسية</Text>
          </TouchableOpacity>

        </ScrollView>
      </View>
    );
  }

  return null;
}

// ════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container:       { flex: 1, paddingTop: 56 },

  // exit btn (top-left small)
  exitBtn:         { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  exitBtnRow:      { position: 'absolute', top: 56, right: 20, zIndex: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  exitBtnText:     { fontSize: 18, fontWeight: '700' },

  // header
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 16 },
  backBtn:         { width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  backText:        { fontSize: 20, fontWeight: '700' },
  headerCenter:    { alignItems: 'center', gap: 2 },
  headerEmoji:     { fontSize: 22 },
  headerTitle:     { fontSize: 17, fontWeight: '900' },

  // progress
  progressWrap:    { paddingHorizontal: 20, marginTop: 8, marginBottom: 4, gap: 4 },
  progressText:    { fontSize: 12, textAlign: 'center', fontWeight: '700' },
  progressBar:     { height: 5, borderRadius: 3, overflow: 'hidden' },
  progressFill:    { height: '100%', backgroundColor: '#f59e0b', borderRadius: 3 },

  // mode screen
  modeCenterWrap:  { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, gap: 12 },
  modeEmoji:       { fontSize: 52 },
  modeTitle:       { fontSize: 26, fontWeight: '900' },
  modeSubtitle:    { fontSize: 14, textAlign: 'center', marginBottom: 8 },
  modeCardsRow:    { flexDirection: 'row', gap: 14, width: '100%' },
  modeCard:        { flex: 1, borderWidth: 2, borderRadius: 20, padding: 20, alignItems: 'center', gap: 8 },
  modeCardEmoji:   { fontSize: 32 },
  modeCardTitle:   { fontSize: 16, fontWeight: '900' },
  modeCardDesc:    { fontSize: 12, textAlign: 'center', lineHeight: 18 },

  // setup
  setupContent:    { paddingHorizontal: 20, paddingBottom: 60, gap: 10 },
  sectionLabel:    { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  inputRow:        { flexDirection: 'row', gap: 10, alignItems: 'center' },
  input:           { flex: 1, borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  addBtn:          { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  addBtnText:      { color: '#000', fontWeight: '900', fontSize: 14 },
  playersList:     { gap: 7 },
  playerChip:      { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, padding: 10, gap: 10 },
  chipNum:         { width: 28, height: 28, borderRadius: 8, backgroundColor: '#f59e0b', textAlign: 'center', lineHeight: 28, color: '#000', fontWeight: '900', fontSize: 13 },
  chipName:        { flex: 1, fontSize: 14, fontWeight: '600' },
  chipRemove:      { width: 26, height: 26, borderRadius: 8, backgroundColor: '#ef444420', alignItems: 'center', justifyContent: 'center' },
  chipRemoveText:  { color: '#ef4444', fontWeight: '700', fontSize: 12 },
  startBtn:        { borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 8 },
  startBtnText:    { color: '#000', fontWeight: '900', fontSize: 16 },
  outlineBtn:      { borderWidth: 1.5, borderRadius: 16, padding: 16, alignItems: 'center' },
  outlineBtnText:  { fontWeight: '900', fontSize: 16 },

  // score bar
  scoreBar:        { borderRadius: 14, borderWidth: 1, padding: 10, marginBottom: 4 },
  scoreBarInner:   { flexDirection: 'row', gap: 10, alignItems: 'flex-end', minHeight: 64 },
  scorePlayerCol:  { alignItems: 'center', width: 48, gap: 2 },
  scorePlayerPts:  { fontSize: 12, fontWeight: '900' },
  scoreBarOuter:   { width: 24, height: 40, borderRadius: 6, overflow: 'hidden', justifyContent: 'flex-end' },
  scoreBarFill:    { width: '100%', borderRadius: 6 },
  scorePlayerName: { fontSize: 9, fontWeight: '600', textAlign: 'center' },

  // play
  playContent:     { paddingHorizontal: 16, paddingBottom: 60, gap: 12 },
  questionCard:    { borderRadius: 20, borderWidth: 1.5, padding: 22, alignItems: 'center', gap: 8 },
  qEmoji:          { fontSize: 44 },
  qText:           { fontSize: 18, fontWeight: '800', textAlign: 'center', lineHeight: 28 },

  voterBadge:      { borderRadius: 14, borderWidth: 1.5, padding: 14, alignItems: 'center', gap: 4 },
  voterLabel:      { fontSize: 11, fontWeight: '600' },
  voterName:       { fontSize: 18, fontWeight: '900' },
  voterHint:       { fontSize: 11, textAlign: 'center' },

  rankList:        { gap: 8 },
  rankItem:        { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1.5, padding: 13 },
  rankBadge:       { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rankBadgeActive: { backgroundColor: '#f59e0b' },
  rankBadgeText:   { color: '#fff', fontWeight: '900', fontSize: 15 },
  rankName:        { flex: 1, fontSize: 15, fontWeight: '600' },
  rankMedalWrap:   {},
  rankMedal:       { fontSize: 18 },

  rankPreview:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  rankPreviewItem: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1 },
  rankPreviewNum:  { fontWeight: '900', fontSize: 13 },
  rankPreviewName: { fontSize: 13, fontWeight: '600' },

  confirmBtn:      { borderRadius: 16, padding: 16, alignItems: 'center' },
  confirmBtnText:  { color: '#000', fontWeight: '900', fontSize: 16 },
  resetRankBtn:    { borderWidth: 1, borderRadius: 12, padding: 12, alignItems: 'center' },
  resetRankBtnText:{ fontSize: 14, fontWeight: '600' },

  // reveal
  revealContent:   { paddingHorizontal: 20, paddingBottom: 60, gap: 14 },
  revealTitle:     { fontSize: 17, fontWeight: '900', textAlign: 'center', marginBottom: 4 },
  podiumWrap:      { borderRadius: 18, borderWidth: 1.5, padding: 14, gap: 0 },
  podiumRow:       { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 0.5 },
  podiumMedal:     { fontSize: 22, width: 36, textAlign: 'center' },
  podiumName:      { flex: 1, fontSize: 15, fontWeight: '700' },
  podiumPts:       { fontSize: 14, fontWeight: '900' },

  revealCard:      { borderRadius: 18, borderWidth: 1.5, padding: 16, gap: 8 },
  revealQEmoji:    { fontSize: 26, textAlign: 'center' },
  revealQText:     { fontSize: 14, fontWeight: '700', textAlign: 'center' },
  revealVoter:     { fontSize: 11, textAlign: 'center', marginTop: -4 },
  revealRanks:     { gap: 6, marginTop: 2 },
  revealRankRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 10, padding: 9 },
  revealRankNum:   { fontSize: 18, width: 30, textAlign: 'center', fontWeight: '700' },
  rank1:           { color: '#ffd700' },
  rank2:           { color: '#c0c0c0' },
  rank3:           { color: '#cd7f32' },
  revealName:      { fontSize: 14, fontWeight: '600' },
  rank1Name:       { color: '#ffd700', fontWeight: '900' },
});
 
