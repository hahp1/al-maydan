import { useState, useRef, useEffect, useCallback, memo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Easing, StatusBar, ScrollView, TextInput,
  KeyboardAvoidingView, Platform, Dimensions,
} from 'react-native';
import Svg, { Path, Circle, Line, Text as SvgText, G } from 'react-native-svg';
import { useTheme } from './ThemeContext';
import ExitButton from './ExitButton';
import { useT, useRTLStyles, useLanguage } from './I18n';
import { TruthDareEngraving } from './GameEngraving';
import { WebScreenButton, GameInfoButton } from './WebRoomService';

// ── ثوابت ───────────────────────────────────────────────────────────
const TURNS_PER_PLAYER = 3;          // كل لاعب يُسأل/يُتحدى 3 مرات
const TRUTH_PTS = 10;
const DARE_PTS  = 10;
const { width: SW } = Dimensions.get('window');
const WHEEL_SIZE = Math.min(SW * 0.78, 300);
const WHEEL_R    = WHEEL_SIZE / 2;

// ── ألوان العجلة (تتناوب) ───────────────────────────────────────────
const SLICE_COLORS_DARK  = ['#7c3aed','#db2777','#0891b2','#d97706','#059669','#dc2626','#2563eb','#7c3aed'];
const SLICE_COLORS_LIGHT = ['#8b5cf6','#ec4899','#0ea5e9','#f59e0b','#10b981','#ef4444','#3b82f6','#a855f7'];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// بناء queue: كل لاعب يظهر TURNS_PER_PLAYER مرات → يُعشوشل
function buildVictimQueue(players) {
  let q = [];
  players.forEach(p => { for (let i = 0; i < TURNS_PER_PLAYER; i++) q.push(p.id); });
  return shuffle(q);
}

// ─────────────────────────────────────────────────────────────────────
// SpinWheel — عجلة دائرية حقيقية بـ SVG + Animated
// ─────────────────────────────────────────────────────────────────────
const SpinWheel = memo(({ players, excludeId, onDone, label, theme }) => {
  const COLORS = theme.isLight ? SLICE_COLORS_LIGHT : SLICE_COLORS_DARK;

  const eligible  = players.filter(p => p.id !== excludeId);
  const names     = eligible;
  const count     = names.length;

  const rotAnim   = useRef(new Animated.Value(0)).current;
  const totalRot  = useRef(0);
  const [spinning, setSpinning] = useState(false);
  const [winner,   setWinner]   = useState(null);

  // حساب شرائح SVG
  const sliceAngle = 360 / count;

  function polarToXY(angle, r) {
    const rad = ((angle - 90) * Math.PI) / 180;
    return { x: WHEEL_R + r * Math.cos(rad), y: WHEEL_R + r * Math.sin(rad) };
  }

  function buildSlicePath(index) {
    const start = index * sliceAngle;
    const end   = start + sliceAngle;
    const p1    = polarToXY(start, WHEEL_R - 2);
    const p2    = polarToXY(end,   WHEEL_R - 2);
    const large = sliceAngle > 180 ? 1 : 0;
    return `M ${WHEEL_R} ${WHEEL_R} L ${p1.x} ${p1.y} A ${WHEEL_R - 2} ${WHEEL_R - 2} 0 ${large} 1 ${p2.x} ${p2.y} Z`;
  }

  // زاوية مركز كل شريحة لوضع النص
  function sliceMidAngle(index) {
    return index * sliceAngle + sliceAngle / 2;
  }

  const spin = useCallback(() => {
    if (spinning || winner) return;
    setSpinning(true);

    // اختر الفائز عشوائياً
    const winnerIdx = Math.floor(Math.random() * count);
    const winnerPlayer = names[winnerIdx];

    // الزاوية المطلوبة لإيقاف الفائز تحت المؤشر (المؤشر في الأعلى = 270°)
    // كل شريحة عرضها sliceAngle، مركز شريحة الفائز = winnerIdx * sliceAngle + sliceAngle/2
    // نريد هذا المركز أن يصبح في موضع المؤشر (الأعلى) بعد دوران عكسي
    // الدوران يكون في اتجاه عقارب الساعة → نحسب الكمية
    const targetSliceCenter = winnerIdx * sliceAngle + sliceAngle / 2;
    // المؤشر عند الأعلى → موضعه الفعلي بعد تحويل = 0° (top)
    // لإيقاف الشريحة عند الأعلى: totalRotation mod 360 = 360 - targetSliceCenter
    const stopAngle = 360 - targetSliceCenter;
    const currentMod = totalRot.current % 360;
    let delta = stopAngle - currentMod;
    if (delta < 0) delta += 360;
    // أضف 5-8 لفات كاملة
    const fullSpins = (5 + Math.floor(Math.random() * 3)) * 360;
    const targetTotal = totalRot.current + fullSpins + delta;

    totalRot.current = targetTotal;

    Animated.timing(rotAnim, {
      toValue: targetTotal,
      duration: 4000 + Math.random() * 1000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setSpinning(false);
      setWinner(winnerPlayer);
      setTimeout(() => onDone(winnerPlayer), 700);
    });
  }, [spinning, winner, count, names, rotAnim, onDone]);

  const rotate = rotAnim.interpolate({
    inputRange:  [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.wheelSection}>
      <Text style={[styles.wheelLabel, { color: theme.textSecondary }]}>{label}</Text>

      {/* حاوية العجلة + المؤشر */}
      <View style={[styles.wheelContainer, { width: WHEEL_SIZE + 24, height: WHEEL_SIZE + 40 }]}>

        {/* مؤشر ▼ في الأعلى */}
        <View style={[styles.pointer, { borderBottomColor: theme.accent }]} />

        {/* العجلة الدوارة */}
        <Animated.View style={[styles.wheelSvgWrap, { transform: [{ rotate }], width: WHEEL_SIZE, height: WHEEL_SIZE, borderRadius: WHEEL_R }]}>
          <Svg width={WHEEL_SIZE} height={WHEEL_SIZE}>
            {/* خلفية دائرية */}
            <Circle cx={WHEEL_R} cy={WHEEL_R} r={WHEEL_R - 2} fill={theme.bgCard} />

            {/* الشرائح */}
            {names.map((player, i) => {
              const color     = COLORS[i % COLORS.length];
              const midAngle  = sliceMidAngle(i);
              const labelR    = WHEEL_R * 0.62;
              const labelPos  = polarToXY(midAngle, labelR);
              const shortName = player.name.length > 7 ? player.name.slice(0, 6) + '…' : player.name;
              return (
                <G key={player.id}>
                  <Path d={buildSlicePath(i)} fill={color} stroke={theme.bg} strokeWidth={1.5} />
                  <SvgText
                    x={labelPos.x}
                    y={labelPos.y}
                    fill="#ffffff"
                    fontSize={count > 6 ? 10 : count > 4 ? 12 : 14}
                    fontWeight="bold"
                    textAnchor="middle"
                    alignmentBaseline="middle"
                    rotation={midAngle - 90}
                    origin={`${labelPos.x}, ${labelPos.y}`}
                  >
                    {shortName}
                  </SvgText>
                </G>
              );
            })}

            {/* دائرة مركزية */}
            <Circle cx={WHEEL_R} cy={WHEEL_R} r={WHEEL_R * 0.18} fill={theme.bg} stroke={theme.accent} strokeWidth={2} />
          </Svg>
        </Animated.View>

        {/* حلقة خارجية */}
        <View style={[styles.wheelRing, { width: WHEEL_SIZE + 8, height: WHEEL_SIZE + 8, borderRadius: (WHEEL_SIZE + 8) / 2, borderColor: theme.accentBorder }]} />
      </View>

      {/* زر الدوران */}
      {!winner && (
        <TouchableOpacity
          style={[styles.spinBtn, { backgroundColor: spinning ? theme.bgCard : theme.accent, borderColor: theme.accentBorder }]}
          onPress={spin}
          disabled={spinning}
          activeOpacity={0.85}
        >
          <Text style={[styles.spinBtnText, { color: spinning ? theme.textMuted : theme.textOnAccent }]}>
            {spinning ? '⏳ جاري الدوران...' : '🎰 دوّر العجلة'}
          </Text>
        </TouchableOpacity>
      )}

      {/* اسم الفائز */}
      {winner && (
        <View style={[styles.winnerBadge, { backgroundColor: theme.bgCard, borderColor: theme.accent }]}>
          <Text style={[styles.winnerBadgeText, { color: theme.accent }]}>🎯 {winner.name}</Text>
        </View>
      )}
    </View>
  );
});

// ─────────────────────────────────────────────────────────────────────
// SetupScreen
// ─────────────────────────────────────────────────────────────────────
function SetupScreen({ onStart, onBack, theme, t, rs, isGlobal = false }) {
  const [names, setNames] = useState(['', '']);

  const updateName   = useCallback((i, val) => setNames(prev => { const n = [...prev]; n[i] = val; return n; }), []);
  const addPlayer    = useCallback(() => { if (names.length < 10) setNames(prev => [...prev, '']); }, [names.length]);
  const removePlayer = useCallback((i) => { setNames(prev => prev.filter((_, idx) => idx !== i)); }, []);

  const handleStart = useCallback(() => {
    const valid = names.map(n => n.trim()).filter(Boolean);
    if (valid.length < 2) return;
    onStart(valid.map((name, i) => ({ id: i + 1, name })));
  }, [names, onStart]);

  const canStart = names.filter(n => n.trim()).length >= 2;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.isCityTheme ? 'transparent' : theme.bg }]}>
        <TouchableOpacity onPress={onBack} style={[styles.backBtn, { backgroundColor: theme.bgCard, borderColor: theme.accentBorder }]} hitSlop={HIT_SLOP}>
          <Text style={[styles.backBtnText, { color: theme.accent }]}>→</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.accent }]}>😈 صراحة أو تحدي</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.setupContent, { backgroundColor: theme.isCityTheme ? 'transparent' : theme.bg }]} keyboardShouldPersistTaps="handled">
        <StatusBar barStyle={theme.statusBar} backgroundColor={theme.statusBg} />

        <Text style={[styles.setupSubtitle, { color: theme.textMuted }]}>أدخل أسماء اللاعبين (2-10)</Text>

        {names.map((name, i) => (
          <View key={i} style={styles.nameRow}>
            <View style={[styles.playerNumBadge, { backgroundColor: theme.accent + '22' }]}>
              <Text style={[styles.playerNumText, { color: theme.accent }]}>{i + 1}</Text>
            </View>
            <TextInput
              style={[styles.input, { backgroundColor: theme.bgCard, borderColor: theme.border, color: theme.textPrimary }, rs.textInput]}
              placeholder={`اللاعب ${i + 1}`}
              placeholderTextColor={theme.textMuted}
              value={name}
              onChangeText={v => updateName(i, v)}
              returnKeyType="next"
            />
            {names.length > 2 && (
              <TouchableOpacity style={[styles.removeBtn, { backgroundColor: theme.error + '18', borderColor: theme.error + '30' }]} onPress={() => removePlayer(i)} hitSlop={HIT_SLOP}>
                <Text style={styles.removeBtnText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}

        {names.length < 10 && (
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: theme.bgCard, borderColor: theme.accentBorder }]} onPress={addPlayer} activeOpacity={0.8}>
            <Text style={[styles.addBtnText, { color: theme.accent }]}>＋ أضف لاعباً</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.startBtn, { backgroundColor: canStart ? theme.accent : theme.bgCard, borderColor: theme.border, borderWidth: canStart ? 0 : 1 }]}
          onPress={handleStart}
          disabled={!canStart}
          activeOpacity={0.85}
        >
          <Text style={[styles.startBtnText, { color: canStart ? theme.textOnAccent : theme.textMuted }]}>
            {isGlobal ? 'Start →' : 'ابدأ اللعبة ←'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─────────────────────────────────────────────────────────────────────
// GameScreen
// ─────────────────────────────────────────────────────────────────────
function GameScreen({ players, onBack, theme, t, rs, isGlobal = false }) {
  const { lang } = useLanguage();
  // كل دورة في queue = id لاعب سيُسأل/يُتحدى
  const victimQueue = useRef(buildVictimQueue(players)).current;
  const totalTurns  = victimQueue.length;  // players.length * TURNS_PER_PLAYER

  const [turnIdx,  setTurnIdx]  = useState(0);
  const [phase,    setPhase]    = useState('spin_victim'); // spin_victim | spin_asker | choose | action | final
  const [victim,   setVictim]   = useState(null);
  const [asker,    setAsker]    = useState(null);
  const [choice,   setChoice]   = useState(null);         // 'truth' | 'dare'
  const [scores,   setScores]   = useState(() => Object.fromEntries(players.map(p => [p.id, 0])));

  // الجولات (round): كل جولة = players.length دورة
  const turnsPerRound = players.length;
  const totalRounds   = TURNS_PER_PLAYER;
  const currentRound  = Math.min(Math.floor(turnIdx / turnsPerRound) + 1, totalRounds);
  const progress      = turnIdx / totalTurns;

  // الضحية الحالية حسب الـ queue
  const currentVictimId = victimQueue[turnIdx];
  const currentVictimPlayer = players.find(p => p.id === currentVictimId);

  // السائل: أي لاعب آخر عشوائي بالكامل (لا تتبع أي قيد)
  function pickRandomAsker(excludeId) {
    const eligible = players.filter(p => p.id !== excludeId);
    return eligible[Math.floor(Math.random() * eligible.length)];
  }

  // ── handlers ──
  const handleVictimDone = useCallback((p) => {
    setVictim(p);
    // السائل يُختار تلقائياً عشوائياً بدون عجلة ثانية؟
    // ← حسب المواصفات: عجلة ثانية تستثني الضحية
    setPhase('spin_asker');
  }, []);

  const handleAskerDone = useCallback((p) => {
    setAsker(p);
    setPhase('choose');
  }, []);

  const chooseOption = useCallback((opt) => {
    setChoice(opt);
    setPhase('action');
  }, []);

  const markDone = useCallback((success) => {
    if (success && victim) {
      const pts = choice === 'truth' ? TRUTH_PTS : DARE_PTS;
      setScores(prev => ({ ...prev, [victim.id]: (prev[victim.id] || 0) + pts }));
    }
    const nextIdx = turnIdx + 1;
    if (nextIdx >= totalTurns) {
      setPhase('final');
      return;
    }
    setTurnIdx(nextIdx);
    setPhase('spin_victim');
    setVictim(null);
    setAsker(null);
    setChoice(null);
  }, [victim, choice, turnIdx, totalTurns]);

  // ── phase: نتائج نهائية ──
  if (phase === 'final') {
    const sorted = [...players].sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0));
    return (
      <View style={[styles.finalContainer, { backgroundColor: theme.isCityTheme ? 'transparent' : theme.bg }]}>
        <StatusBar barStyle={theme.statusBar} backgroundColor={theme.statusBg} />
        <Text style={[styles.finalEmoji]}>🏆</Text>
        <Text style={[styles.finalTitle, { color: theme.accent }]}>النتائج النهائية</Text>
        <ScrollView style={{ width: '100%' }} contentContainerStyle={{ gap: 10, paddingBottom: 20 }}>
          {sorted.map((p, i) => (
            <View key={p.id} style={[styles.scoreRow, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
              <Text style={styles.scoreRankEmoji}>{i === 0 ? '👑' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}</Text>
              <Text style={[styles.scoreRowName, { color: theme.textPrimary }]}>{p.name}</Text>
              <Text style={[styles.scoreRowPts, { color: theme.accent }]}>{scores[p.id] || 0} نقطة</Text>
            </View>
          ))}
        </ScrollView>
        <TouchableOpacity style={[styles.startBtn, { backgroundColor: theme.accent }]} onPress={onBack} activeOpacity={0.85}>
          <Text style={[styles.startBtnText, { color: theme.textOnAccent }]}>العودة ←</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.gameRoot, { backgroundColor: theme.isCityTheme ? 'transparent' : theme.bg }]}>
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.statusBg} />

      {/* ── Header: زر خروج + جولة + شريط تقدم ── */}
      <View style={[styles.gameHeader, { backgroundColor: theme.isCityTheme ? 'transparent' : theme.bg }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <ExitButton onPress={onBack} />
          <GameInfoButton gameType="truth_dare" lang={lang} />
          <WebScreenButton
            playerUid="td_p0"
            playerName=""
            gameType="truth_dare"
            getPublicData={() => ({ currentRound, totalRounds })}
            themeName={themeId || 'dark'}
          />
        </View>
        <View style={styles.roundInfo}>
          <Text style={[styles.roundText, { color: theme.textSecondary }]}>
            جولة {currentRound} / {totalRounds}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* شريط التقدم */}
      <View style={[styles.progressBar, { backgroundColor: theme.bgCard }]}>
        <View style={[styles.progressFill, { backgroundColor: theme.accent, width: `${progress * 100}%` }]} />
      </View>

      {/* ── المحتوى حسب الـ phase ── */}
      <ScrollView contentContainerStyle={styles.gameContent} showsVerticalScrollIndicator={false}>

        {/* عجلة الضحية */}
        {phase === 'spin_victim' && (
          <SpinWheel
            players={players}
            onDone={handleVictimDone}
            label={isGlobal ? 'Who is the victim this round?' : 'من هي الضحية هذه الدورة؟'}
            theme={theme}
          />
        )}

        {/* عجلة المحقق (تستثني الضحية) */}
        {phase === 'spin_asker' && victim && (
          <SpinWheel
            players={players}
            excludeId={victim.id}
            onDone={handleAskerDone}
            label={`من هو المحقق مع ${victim.name}؟`}
            theme={theme}
          />
        )}

        {/* اختيار صراحة أو تحدي */}
        {phase === 'choose' && victim && asker && (
          <View style={styles.chooseSection}>
            <Text style={[styles.chooseMeta, { color: theme.textMuted }]}>
              🔍 المحقق: {asker.name}  •  🎯 الضحية: {victim.name}
            </Text>
            <Text style={[styles.chooseTitle, { color: theme.textPrimary }]}>
              {victim.name}، اختر:
            </Text>
            <TouchableOpacity
              style={[styles.chooseCard, { backgroundColor: theme.purple + '22', borderColor: theme.purple }]}
              onPress={() => chooseOption('truth')}
              activeOpacity={0.85}
            >
              <Text style={styles.chooseCardEmoji}>🗣</Text>
              <Text style={styles.chooseCardLabel}>صراحة</Text>
              <Text style={[styles.chooseCardPts, { color: '#93c5fd' }]}>{isGlobal ? `+${TRUTH_PTS} pts if answered` : `+${TRUTH_PTS} نقطة إذا أجبت`}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.chooseCard, { backgroundColor: theme.error + '22', borderColor: theme.error }]}
              onPress={() => chooseOption('dare')}
              activeOpacity={0.85}
            >
              <Text style={styles.chooseCardEmoji}>😈</Text>
              <Text style={styles.chooseCardLabel}>تحدي</Text>
              <Text style={[styles.chooseCardPts, { color: '#fca5a5' }]}>{isGlobal ? `+${DARE_PTS} pts if completed` : `+${DARE_PTS} نقطة إذا نفّذت`}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* مرحلة الفعل (صراحة أو تحدي) */}
        {phase === 'action' && victim && asker && (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%' }}>
            <View style={styles.actionSection}>
              {/* بطاقة المحقق والضحية */}
              <View style={[styles.actionCard, { backgroundColor: theme.bgCard, borderColor: choice === 'truth' ? '#3b82f6' : '#ef4444' }]}>
                <Text style={[styles.actionLabel, { color: theme.textMuted }]}>
                  {choice === 'truth' ? (isGlobal ? '🗣 Truth — questioner asks the victim' : '🗣 صراحة — المحقق يسأل الضحية') : (isGlobal ? '😈 Dare — questioner challenges the victim' : '😈 تحدي — المحقق يتحدى الضحية')}
                </Text>
                <View style={styles.actionPlayers}>
                  <View style={[styles.playerPill, { backgroundColor: choice === 'truth' ? theme.purple + '33' : theme.error + '33' }]}>
                    <Text style={styles.playerPillText}>{asker.name}</Text>
                  </View>
                  <Text style={[styles.actionArrow, { color: theme.textMuted }]}>
                    {choice === 'truth' ? (isGlobal ? '⟶ asks' : '⟶ يسأل') : (isGlobal ? '⟶ dares' : '⟶ يتحدى')}
                  </Text>
                  <View style={[styles.playerPill, { backgroundColor: theme.bgCard, borderWidth: 1, borderColor: theme.accent }]}>
                    <Text style={[styles.playerPillText, { color: theme.accent }]}>{victim.name}</Text>
                  </View>
                </View>
              </View>

              {/* زرا النتيجة */}
              <View style={styles.resultBtns}>
                <TouchableOpacity
                  style={[styles.resultBtn, { backgroundColor: theme.success + '22', borderColor: theme.success }]}
                  onPress={() => markDone(true)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.resultBtnText}>
                    {choice === 'truth' ? (isGlobal ? '✅  Answered Honestly' : '✅  أجاب صادقاً') : (isGlobal ? '✅  Completed the Dare' : '✅  نفّذ التحدي')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.resultBtn, { backgroundColor: theme.error + '22', borderColor: theme.error }]}
                  onPress={() => markDone(false)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.resultBtnText}>
                    {choice === 'truth' ? (isGlobal ? '❌  Refused to Answer' : '❌  رفض الإجابة') : (isGlobal ? '❌  Skipped the Dare' : '❌  لم يكمل التحدي')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        )}

        {/* نقاط اللاعبين */}
        <View style={[styles.scoreboard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
          <Text style={[styles.scoreboardTitle, { color: theme.textMuted }]}>النقاط</Text>
          <View style={styles.scoreboardGrid}>
            {players.map(p => (
              <View key={p.id} style={[styles.scoreChip, { borderColor: p.id === currentVictimId ? theme.accent : theme.border }]}>
                <Text style={[styles.scoreChipName, { color: p.id === currentVictimId ? theme.accent : theme.textSecondary }]} numberOfLines={1}>
                  {p.name}
                </Text>
                <Text style={[styles.scoreChipPts, { color: theme.accent }]}>{scores[p.id] || 0}</Text>
              </View>
            ))}
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Root
// ─────────────────────────────────────────────────────────────────────
export default function TruthDareScreen({ onBack, experience }) {
  const { theme, themeId } = useTheme();
  const t  = useT();
  const rs = useRTLStyles();
  const { lang } = useLanguage();
  const isGlobal = experience === 'global';
  const [players, setPlayers] = useState(null);

  const handleStart = useCallback((p) => setPlayers(p), []);
  const handleBack  = useCallback(() => {
    if (players) setPlayers(null);
    else onBack();
  }, [players, onBack]);

  return (
    <View style={[styles.root, { backgroundColor: theme.isCityTheme ? 'transparent' : theme.bg }]}>
      <TruthDareEngraving theme={theme} />
      {!players
        ? <SetupScreen onStart={handleStart} onBack={handleBack} theme={theme} t={t} rs={rs} isGlobal={isGlobal} />
        : <GameScreen   players={players}    onBack={handleBack} theme={theme} t={t} rs={rs} isGlobal={isGlobal} />
      }
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────
const HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

const styles = StyleSheet.create({
  root: { flex: 1 },

  // ── Setup ──
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 56 : 44, paddingBottom: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  backBtnText:   { fontSize: 18, fontWeight: '700' },
  headerTitle:   { fontSize: 18, fontWeight: '900', textAlign: 'center' },
  setupContent:  { flexGrow: 1, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32, gap: 12, alignItems: 'center' },
  setupSubtitle: { fontSize: 13, textAlign: 'center', marginBottom: 4 },
  nameRow:       { flexDirection: 'row', gap: 8, width: '100%', alignItems: 'center' },
  playerNumBadge:{ width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  playerNumText: { fontSize: 13, fontWeight: '800' },
  input:         { flex: 1, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15 },
  removeBtn:     { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  removeBtnText: { color: '#ef4444', fontSize: 15, fontWeight: '700' },
  addBtn:        { borderRadius: 14, paddingVertical: 11, paddingHorizontal: 24, borderWidth: 1.5, width: '100%', alignItems: 'center' },
  addBtnText:    { fontSize: 14, fontWeight: '700' },
  startBtn:      { paddingVertical: 16, borderRadius: 16, alignItems: 'center', width: '100%', marginTop: 8, elevation: 6 },
  startBtnText:  { fontSize: 17, fontWeight: '800' },

  // ── Game header ──
  gameRoot:   { flex: 1 },
  gameHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 52 : 40, paddingBottom: 8,
  },
  exitBtn:      { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  exitBtnText:  { fontSize: 16, fontWeight: '700' },
  roundInfo:    { alignItems: 'center' },
  roundText:    { fontSize: 15, fontWeight: '700' },
  progressBar:  { height: 5, marginHorizontal: 16, borderRadius: 4, overflow: 'hidden', marginBottom: 4 },
  progressFill: { height: '100%', borderRadius: 4 },

  gameContent: {
    flexGrow: 1, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24,
    alignItems: 'center', gap: 20,
  },

  // ── Wheel ──
  wheelSection:   { alignItems: 'center', gap: 14, width: '100%' },
  wheelLabel:     { fontSize: 15, textAlign: 'center', fontWeight: '600' },
  wheelContainer: { alignItems: 'center', justifyContent: 'center', position: 'relative' },
  pointer: {
    position: 'absolute', top: 0, zIndex: 10,
    width: 0, height: 0,
    borderLeftWidth: 12, borderRightWidth: 12, borderBottomWidth: 22,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    marginTop: -4,
  },
  wheelSvgWrap: { overflow: 'hidden', elevation: 8, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 12 },
  wheelRing: {
    position: 'absolute', borderWidth: 3,
    top: 16, left: 8,
  },
  spinBtn: {
    paddingVertical: 15, paddingHorizontal: 40, borderRadius: 18,
    elevation: 6, borderWidth: 1.5,
  },
  spinBtnText:   { fontSize: 16, fontWeight: '800' },
  winnerBadge:   { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 16, borderWidth: 2 },
  winnerBadgeText: { fontSize: 18, fontWeight: '900' },

  // ── Choose ──
  chooseSection: { width: '100%', gap: 14, alignItems: 'center' },
  chooseMeta:    { fontSize: 13, textAlign: 'center' },
  chooseTitle:   { fontSize: 22, fontWeight: '900', textAlign: 'center' },
  chooseCard: {
    width: '100%', paddingVertical: 22, borderRadius: 20, alignItems: 'center',
    gap: 6, borderWidth: 1.5, elevation: 4,
  },
  chooseCardEmoji: { fontSize: 36 },
  chooseCardLabel: { color: '#ffffff', fontSize: 24, fontWeight: '900' },
  chooseCardPts:   { fontSize: 12, fontWeight: '600' },

  // ── Action ──
  actionSection: { width: '100%', gap: 16, alignItems: 'center' },
  actionCard: {
    width: '100%', borderRadius: 20, padding: 20, gap: 12,
    borderWidth: 2, alignItems: 'center',
  },
  actionLabel:   { fontSize: 14, fontWeight: '700' },
  actionPlayers: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'center' },
  playerPill:    { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  playerPillText: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
  actionArrow:   { fontSize: 13, fontWeight: '600' },
  resultBtns:    { flexDirection: 'column', gap: 10, width: '100%' },
  resultBtn: {
    paddingVertical: 16, borderRadius: 16, alignItems: 'center',
    borderWidth: 1.5, elevation: 3,
  },
  resultBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '800' },

  // ── Scoreboard ──
  scoreboard: {
    width: '100%', borderRadius: 16, padding: 14, borderWidth: 1, gap: 10,
  },
  scoreboardTitle: { fontSize: 12, textAlign: 'center', fontWeight: '600', letterSpacing: 0.5 },
  scoreboardGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  scoreChip: {
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6,
    alignItems: 'center', borderWidth: 1.5, minWidth: 70,
  },
  scoreChipName: { fontSize: 11, maxWidth: 80 },
  scoreChipPts:  { fontSize: 15, fontWeight: '900' },

  // ── Final ──
  finalContainer: {
    flex: 1, padding: 24, paddingTop: Platform.OS === 'ios' ? 60 : 48,
    alignItems: 'center', gap: 16,
  },
  finalEmoji:  { fontSize: 64 },
  finalTitle:  { fontSize: 26, fontWeight: '900', textAlign: 'center', marginBottom: 4 },
  scoreRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 14, padding: 14, borderWidth: 1,
  },
  scoreRankEmoji: { fontSize: 22, width: 30, textAlign: 'center' },
  scoreRowName:   { flex: 1, fontSize: 15, fontWeight: '700' },
  scoreRowPts:    { fontSize: 16, fontWeight: '900' },
});
