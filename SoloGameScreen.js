/**
 * SoloGameScreen.js — محدّث
 * ════════════════════════════════════════════════
 *  ✅ LifelineBar مدمج في شاشة السؤال
 *  ✅ tokens prop مضافة
 *  ✅ onSpendTokens يخصم من tokens
 *  ✅ eliminate / swapSame / swapRandom / freeze مربوطة
 *  ✅ usedLifelines تُصفَّر مع كل سؤال جديد
 *  ✅ باقي المنطق محفوظ كما هو
 */

import { useState, useEffect, useRef, useCallback, memo, useMemo } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  StatusBar, Animated, Alert, ScrollView, ActivityIndicator,
  BackHandler } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from './ThemeContext';
import ExitButton from './ExitButton';
import LeaveModal from './LeaveModal';
import { useT, useLanguage } from './I18n';
import LifelinesBar from './LifelineBar';
import { WebScreenButton, GameInfoButton } from './WebRoomService';
import { playSound } from './SoundService';
import { fetchQuestionsForCategories } from './firebaseConfig';
import CachedCategoryImage from './CachedCategoryImage';
import { ThemedButton, ThemedCard, ThemedPill, ThemedModal, ThemedRow } from './ThemedComponents';

const HIGHSCORE_KEY    = 'almaydan_highscore';
const TIMER_SECONDS    = 15;
const ROUNDS_PER_LEVEL = 3;
const LEVELS           = [1, 2, 3, 4, 5];
const LEVEL_POINTS     = { 1: 100, 2: 200, 3: 300, 4: 400, 5: 500 };
const ARABIC_LETTERS   = ['أ', 'ب', 'ج', 'د'];

const levelColors      = { 1: '#1a3a6e', 2: '#1a5a3a', 3: '#5a5a00', 4: '#7a3a00', 5: '#7a1a1a' };
const levelColorsLight = { 1: '#2a5aaa', 2: '#2a8a5a', 3: '#8a8a00', 4: '#aa5a00', 5: '#aa2a2a' };

function timerColor(ratio) {
  if (ratio > 0.5) return '#4aff4a';
  if (ratio > 0.25) return '#ffaa00';
  return '#ff4444';
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickThreeCategories(allCategories, level) {
  const normal  = allCategories.filter(c => !c.isSpecial);
  const special = allCategories.filter(c => c.isSpecial);
  const picked  = shuffle(normal).slice(0, 3);
  if (special.length > 0 && Math.random() < 0.3) {
    const sp = special[Math.floor(Math.random() * special.length)];
    picked[Math.floor(Math.random() * 3)] = sp;
  }
  return picked.slice(0, 3);
}

function pickQuestion(category, level) {
  const qs = (category.questions || []).filter(q => q.level === level);
  if (qs.length === 0) return null;
  return qs[Math.floor(Math.random() * qs.length)];
}

const CategoryCard = memo(({ cat, currentLevel, onPress, theme, t }) => {
  const qCount = useMemo(() =>
    (cat.questions || []).filter(q => q.level === currentLevel).length,
  [cat.questions, currentLevel]);

  return (
    <ThemedCard
      onPress={() => qCount > 0 && onPress(cat)}
      style={[styles.catCard, qCount === 0 && { opacity: 0.4 }]}
    >
      {cat.isSpecial && (
        <View style={[styles.specialBadge, { backgroundColor: theme.accent }]}>
          <Text style={styles.specialBadgeText}>⭐ {t('solo.special')}</Text>
        </View>
      )}
      <CachedCategoryImage imageUrl={cat.imageUrl} emoji={cat.emoji} size={52} />
      <Text style={[styles.catName, { color: theme.textPrimary }]}>{cat.name}</Text>
      <Text style={[styles.catCount, { color: theme.textMuted }]}>{qCount} {t('solo.questions')}</Text>
    </ThemedCard>
  );
});

const TimerBar = memo(({ scaleAnim, timeLeft, theme }) => {
  const ratio = timeLeft / TIMER_SECONDS;
  const color = timerColor(ratio);
  return (
    <View style={[styles.timerContainer, { backgroundColor: theme.bgCard }]}>
      <View style={StyleSheet.absoluteFill}>
        <Animated.View style={[styles.timerBarFill, { backgroundColor: color, transform: [{ scaleX: scaleAnim }] }]} />
      </View>
      <Text style={styles.timerText}>{timeLeft}s</Text>
    </View>
  );
});

export default function SoloGameScreen({
  categories = [],
  onBack,
  playerName = 'لاعب',
  onHighScoreUpdate,
  isTournament = false,
  currentUser,
  tokens = 0,
  setTokens,
  onTournamentScore,   // callback لتسجيل السكور في البطولة
  onGameEnd,           // callback لـ XP (won: boolean)
  onAdWatched,         // ← جديد: callback لـ XP عند مشاهدة إعلان
}) {
  const [leaveVisible, setLeaveVisible] = useState(false);
  const { theme, isDark, themeId } = useTheme();
  const { lang } = useLanguage();
  const t = useT();

  const [phase,             setPhase]             = useState('picking');
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const [roundInLevel,      setRoundInLevel]      = useState(0);
  const [totalRound,        setTotalRound]        = useState(1);
  const [score,             setScore]             = useState(0);
  const [highScore,         setHighScore]         = useState(0);
  const [correctCount,      setCorrectCount]      = useState(0);
  const [threeCategories,   setThreeCategories]   = useState([]);
  const [selectedCategory,  setSelectedCategory]  = useState(null);
  const [currentQuestion,   setCurrentQuestion]   = useState(null);
  const [choices,           setChoices]           = useState([]);
  const [selectedChoice,    setSelectedChoice]    = useState(null);
  const [timeLeft,          setTimeLeft]          = useState(TIMER_SECONDS);
  const [eliminated,        setEliminated]        = useState(new Set());
  const [usedLifelines,     setUsedLifelines]     = useState(new Set());
  const [frozen,            setFrozen]            = useState(false);
  const [loadingPick,       setLoadingPick]       = useState(false);

  const timerRef  = useRef(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const currentLevel = LEVELS[currentLevelIndex];
  const points       = LEVEL_POINTS[currentLevel];
  const totalRounds  = LEVELS.length * ROUNDS_PER_LEVEL;
  const progressPct  = ((totalRound - 1) / totalRounds) * 100;
  const levelColor   = theme.isLight ? levelColorsLight[currentLevel] : levelColors[currentLevel];

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setLeaveVisible(true);
      return true;
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(HIGHSCORE_KEY).then(val => { if (val) setHighScore(parseInt(val)); });
  }, []);

  // استدعي startPicking فقط عندما تكون categories محمّلة
  const didInitRef = useRef(false);
  useEffect(() => {
    if (categories.length > 0 && !didInitRef.current) {
      didInitRef.current = true;
      startPicking();
    }
  }, [categories.length]);

  // صوت countdown — خارج setState لتجنب side effects داخل updater
  useEffect(() => {
    if (timeLeft > 0 && timeLeft <= 5) playSound('countdown');
  }, [timeLeft]);

  const startPicking = useCallback(async (levelIndex = currentLevelIndex) => {
    if (categories.length === 0) return; // الفئات لم تُحمَّل بعد
    setLoadingPick(true);
    setSelectedCategory(null);
    setPhase('picking');
    const picked = pickThreeCategories(categories, LEVELS[levelIndex]);
    try {
      const qMap     = await fetchQuestionsForCategories(picked.map(c => c.id));
      const enriched = picked.map(c => ({ ...c, questions: qMap[c.id] ?? [] }));
      setThreeCategories(enriched);
    } catch {
      setThreeCategories(picked);
    } finally {
      setLoadingPick(false);
    }
  }, [currentLevelIndex, categories]);

  const handlePickCategory = useCallback((cat) => {
    const q = pickQuestion(cat, LEVELS[currentLevelIndex]);
    if (!q) { Alert.alert('', t('board.noCatsQ')); return; }
    setSelectedCategory(cat);
    setCurrentQuestion(q);
    setChoices(shuffle([q.correct, ...q.wrong]));
    setSelectedChoice(null);
    setEliminated(new Set());
    // وسائل المساعدة لا تتجدد بين الأسئلة — فقط عند لعبة جديدة
    setFrozen(false);
    setTimeLeft(TIMER_SECONDS);
    setPhase('question');
    startTimer();
  }, [currentLevelIndex, t]);

  const startTimer = useCallback(() => {
    clearInterval(timerRef.current);
    scaleAnim.setValue(1);
    Animated.timing(scaleAnim, { toValue: 0, duration: TIMER_SECONDS * 1000, useNativeDriver: true }).start();
    timerRef.current = setInterval(() => {
      setTimeLeft(tl => {
        if (tl <= 1) { clearInterval(timerRef.current); handleTimeOut(); return 0; }
        return tl - 1;
      });
    }, 1000);
  }, []);

  const stopTimer  = useCallback(() => { clearInterval(timerRef.current); scaleAnim.stopAnimation(); }, []);
  const resumeTimer = useCallback(() => startTimer(), [startTimer]);

  const handleTimeOut = useCallback(() => {
    setSelectedChoice('__timeout__');
    setPhase('result');
  }, []);

  const handleAnswer = useCallback((choice) => {
    if (selectedChoice) return;
    clearInterval(timerRef.current);
    scaleAnim.stopAnimation();
    setSelectedChoice(choice);
    setPhase('result');
    const isCorrect = choice === currentQuestion?.correct;
    if (isCorrect) {
      setScore(prev => prev + points);
      setCorrectCount(prev => prev + 1);
      playSound('correct');
    } else {
      playSound('wrong');
    }
  }, [selectedChoice, currentQuestion, points]);

  const handleFinish = useCallback(() => {
    setPhase('finished');
    setScore(prev => {
      const finalScore = prev;
      const won = finalScore > 0;
      if (finalScore > highScore) {
        setHighScore(finalScore);
        AsyncStorage.setItem(HIGHSCORE_KEY, String(finalScore));
        if (onHighScoreUpdate) onHighScoreUpdate(finalScore);
      }
      if (isTournament && finalScore > 0 && onTournamentScore) {
        onTournamentScore(finalScore);
      }
      if (won) playSound('reward_tokens');
      if (onGameEnd) onGameEnd(won);
      return finalScore;
    });
  }, [highScore, onHighScoreUpdate, isTournament, onTournamentScore, onGameEnd]);

  const handleNext = useCallback(() => {
    const newRoundInLevel = roundInLevel + 1;
    const newTotalRound   = totalRound + 1;
    let newLevelIndex = currentLevelIndex;
    if (newRoundInLevel >= ROUNDS_PER_LEVEL) {
      newLevelIndex = currentLevelIndex + 1;
      if (newLevelIndex >= LEVELS.length) {
        handleFinish();
        return;
      }
      setCurrentLevelIndex(newLevelIndex);
      setRoundInLevel(0);
    } else {
      setRoundInLevel(newRoundInLevel);
    }
    setTotalRound(newTotalRound);
    setSelectedCategory(null);
    setPhase('picking');
    startPicking(newLevelIndex);
  }, [roundInLevel, totalRound, currentLevelIndex, startPicking, handleFinish]);

  const handlePlayAgain = useCallback(() => {
    setScore(0); setCorrectCount(0); setCurrentLevelIndex(0);
    setRoundInLevel(0); setTotalRound(1);
    setUsedLifelines(new Set());
    startPicking(0);
  }, [startPicking]);

  // ── وسائل المساعدة ──
  const handleSpendTokens = useCallback((cost) => {
    if (tokens < cost) return false;
    setTokens?.(prev => prev - cost);
    return true;
  }, [tokens, setTokens]);

  const markUsed = useCallback((key) => setUsedLifelines(prev => new Set([...prev, key])), []);

  const handleEliminate = useCallback(() => {
    const wrongChoices = choices.filter(c => c !== currentQuestion?.correct && !eliminated.has(c));
    const toRemove = shuffle(wrongChoices).slice(0, 2);
    setEliminated(new Set([...eliminated, ...toRemove]));
  }, [choices, currentQuestion, eliminated]);

  const handleSwapSame = useCallback(() => {
    if (!selectedCategory || !currentQuestion) return;
    const pool = (selectedCategory.questions || []).filter(q =>
      q.level === currentLevel && q !== currentQuestion
    );
    if (pool.length === 0) return;
    const newQ = pool[Math.floor(Math.random() * pool.length)];
    setCurrentQuestion(newQ);
    setChoices(shuffle([newQ.correct, ...newQ.wrong]));
    setSelectedChoice(null);
    setEliminated(new Set());
    clearInterval(timerRef.current);
    startTimer();
  }, [selectedCategory, currentQuestion, currentLevel, startTimer]);

  const handleSwapRandom = useCallback(() => {
    // نستخدم threeCategories لأنها الفئات الـ3 المجلوبة مع أسئلتها
    const allQs = threeCategories.flatMap(cat =>
      (cat.questions || []).filter(q => q.level === currentLevel)
        .map(q => ({ ...q, _cat: cat }))
    );
    if (allQs.length === 0) return;
    const newQ = allQs[Math.floor(Math.random() * allQs.length)];
    setCurrentQuestion(newQ);
    setSelectedCategory(newQ._cat);
    setChoices(shuffle([newQ.correct, ...newQ.wrong]));
    setSelectedChoice(null);
    setEliminated(new Set());
    clearInterval(timerRef.current);
    startTimer();
  }, [threeCategories, currentLevel, startTimer]);

  // تمديد الوقت: يضيف ثواني للمؤقت الحالي بدل التجميد
  const handleExtend = useCallback((extraSeconds) => {
    setTimeLeft(prev => {
      const newTime = prev + extraSeconds;
      // إعادة تشغيل المؤقت بالوقت الجديد
      clearInterval(timerRef.current);
      scaleAnim.stopAnimation();
      // animate للنسبة الجديدة
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: newTime * 1000,
        useNativeDriver: true,
      }).start();
      timerRef.current = setInterval(() => {
        setTimeLeft(tl => {
          if (tl <= 1) { clearInterval(timerRef.current); handleTimeOut(); return 0; }
          return tl - 1;
        });
      }, 1000);
      return newTime;
    });
  }, [handleTimeOut]);

  const handleWatchAdLifeline = useCallback(async () => {
    stopTimer();
    return new Promise(resolve => setTimeout(() => {
      if (onAdWatched) onAdWatched();
      resolve();
      resumeTimer();
    }, 2500));
  }, [stopTimer, resumeTimer, onAdWatched]);

  // ══ شاشة انتهت اللعبة ══
  if (phase === 'finished') {
    const isNewRecord = score >= highScore;
    return (
      <View style={[styles.container, { backgroundColor: 'transparent' }]}>
        <StatusBar barStyle={theme.statusBar} backgroundColor={theme.statusBg} />
        <Text style={styles.finishTrophy}>{isNewRecord ? '🏆' : '🎮'}</Text>
        <Text style={[styles.finishTitle, { color: theme.accent }]}>
          {isNewRecord ? t('solo.newRecord') : t('solo.gameOver')}
        </Text>
        <View style={[styles.finishScoreBox, { backgroundColor: theme.bgCard, borderColor: theme.accentBorder }]}>
          <Text style={[styles.finishScoreNum, { color: theme.accent }]}>{score}</Text>
          <Text style={[styles.finishScoreLabel, { color: theme.textSecondary }]}>{t('common.points')}</Text>
        </View>
        <View style={styles.finishStats}>
          {[
            { num: correctCount,               label: t('solo.rightAnswers') },
            { num: totalRounds - correctCount, label: t('solo.wrongAnswers') },
            { num: highScore,                  label: t('solo.bestScore')    },
          ].map((s, i) => (
            <View key={i} style={[styles.finishStat, { backgroundColor: theme.bgCard, borderColor: theme.borderCard }]}>
              <Text style={[styles.finishStatNum, { color: theme.accent }]}>{s.num}</Text>
              <Text style={[styles.finishStatLabel, { color: theme.textSecondary }]}>{s.label}</Text>
            </View>
          ))}
        </View>
        <ThemedButton onPress={handlePlayAgain} label={t('common.playAgain')} variant='primary' size='large' style={styles.playAgainBtn} />
        <ThemedButton onPress={onBack} label={t('common.backArrow')} variant='ghost' size='medium' style={styles.backBtn} />
      </View>
    );
  }

  // ══ شاشة اختيار الفئة ══
  if (phase === 'picking') {
    return (
      <View style={[styles.container, { backgroundColor: 'transparent' }]}>
        <StatusBar barStyle={theme.statusBar} backgroundColor={theme.statusBg} />
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <ThemedButton onPress={onBack} label={t('common.backArrow')} variant='ghost' size='small' style={styles.headerBack} />
            <GameInfoButton gameType="solo" lang={lang} />
            <WebScreenButton
              playerUid={currentUser?.uid || 'solo_p0'}
              playerName={currentUser?.name || ''}
              gameType="solo"
              getPublicData={() => ({ score })}
              themeName={themeId || 'dark'}
            />
          </View>
          <View style={[styles.scoreChip, { backgroundColor: theme.bgCard, borderColor: theme.accentBorder }]}>
            <Text style={[styles.scoreChipText, { color: theme.accent }]}>🎯 {score}</Text>
          </View>
          <View style={[styles.scoreChip, { backgroundColor: theme.bgCard, borderColor: theme.accentBorder }]}>
            <Text style={[styles.scoreChipText, { color: theme.accent }]}>🪙 {tokens}</Text>
          </View>
        </View>
        <View style={styles.progressRow}>
          <Text style={[styles.progressLabel, { color: theme.textSecondary }]}>
            {t('solo.roundOf', { c: totalRound, t: totalRounds })}
          </Text>
          <View style={[styles.progressBar, { backgroundColor: theme.bgCard }]}>
            <View style={[styles.progressFill, { width: `${progressPct}%`, backgroundColor: levelColor }]} />
          </View>
        </View>
        <View style={[styles.levelBadge, { backgroundColor: levelColor }]}>
          <Text style={styles.levelBadgeText}>{t('solo.level', { l: currentLevel, p: points })}</Text>
        </View>
        <View style={styles.roundDots}>
          {[0, 1, 2].map(i => (
            <View key={i} style={[
              styles.dot, { backgroundColor: theme.bgCard },
              i < roundInLevel && { backgroundColor: theme.success },
              i === roundInLevel && { backgroundColor: theme.accent, transform: [{ scale: 1.3 }] },
            ]} />
          ))}
        </View>
        <Text style={[styles.pickTitle, { color: theme.textPrimary }]}>{t('solo.pickTitle')}</Text>
        <View style={styles.catsContainer}>
          {loadingPick
            ? <ActivityIndicator size="large" color={theme.accent} style={{ marginTop: 40 }} />
            : threeCategories.map((cat, i) => (
                <CategoryCard key={cat.id + i} cat={cat} currentLevel={currentLevel} onPress={handlePickCategory} theme={theme} t={t} />
              ))
          }
        </View>
      </View>
    );
  }

  // ══ شاشة السؤال ══
  const isAnswered    = !!selectedChoice;
  const isTimeout     = selectedChoice === '__timeout__';

  const getChoiceStyle = (choice) => {
    if (eliminated.has(choice)) return [styles.choiceBtn, { opacity: 0.2 }];
    const base = { backgroundColor: theme.bgCard, borderColor: theme.borderCard };
    if (!isAnswered) return [styles.choiceBtn, base];
    if (choice === currentQuestion.correct) return [styles.choiceBtn, { backgroundColor: theme.success + '22', borderColor: '#4aff4a' }];
    if (choice === selectedChoice)          return [styles.choiceBtn, { backgroundColor: theme.error + '22', borderColor: '#ff4444' }];
    return [styles.choiceBtn, base, { opacity: 0.4 }];
  };

  const getChoiceTextColor = (choice) => {
    if (eliminated.has(choice)) return theme.textMuted;
    if (!isAnswered) return theme.textPrimary;
    if (choice === currentQuestion.correct) return theme.success;
    if (choice === selectedChoice) return theme.error;
    return theme.textMuted;
  };

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.statusBg} />
      <View style={styles.header}>
        <View style={[styles.catChip, { backgroundColor: levelColor }]}>
          <Text style={styles.catChipEmoji}>{selectedCategory?.emoji}</Text>
          <Text style={styles.catChipText}>{selectedCategory?.name}</Text>
        </View>
        <View style={[styles.scoreChip, { backgroundColor: theme.bgCard, borderColor: theme.accentBorder }]}>
          <Text style={[styles.scoreChipText, { color: theme.accent }]}>🪙 {tokens}</Text>
        </View>
      </View>

      {!frozen && <TimerBar scaleAnim={scaleAnim} timeLeft={timeLeft} theme={theme} />}
      {frozen && (
        <View style={[styles.frozenBar, { backgroundColor: '#3b82f633', borderColor: '#3b82f660' }]}>
          <Text style={[styles.frozenText, { color: '#3b82f6' }]}>⏸ الوقت مجمّد</Text>
        </View>
      )}

      <View style={[styles.pointsBadge, { backgroundColor: levelColor }]}>
        <Text style={styles.pointsBadgeText}>{points} {t('common.points')}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 20 }}>
        <View style={[styles.questionBox, { backgroundColor: theme.bgCard, borderColor: theme.borderCard }]}>
          <Text style={[styles.questionText, { color: theme.textPrimary }]}>
            {currentQuestion?.question ?? currentQuestion?.text}
          </Text>
        </View>

        {/* ── وسائل المساعدة — Solo يدعم: eliminate, swapSame, swapRandom, extend ── */}
        {!isAnswered && (
          <LifelinesBar
            mode="solo"
            tokens={tokens}
            onSpendTokens={handleSpendTokens}
            onWatchAd={handleWatchAdLifeline}
            onEliminate={handleEliminate}
            onSwapSame={handleSwapSame}
            onSwapRandom={handleSwapRandom}
            onTimerPause={stopTimer}
            onTimerResume={resumeTimer}
            onTimerExtend={handleExtend}
            usedLifelines={usedLifelines}
            onLifelineUsed={markUsed}
          />
        )}

        <View style={styles.choicesContainer}>
          {choices.map((choice, i) => (
            <ThemedCard
              key={i}
              onPress={() => handleAnswer(choice)}
              disabled={isAnswered || eliminated.has(choice)}
              style={getChoiceStyle(choice)}
            >
              <Text style={[styles.choiceLetter, { color: theme.accent }]}>{ARABIC_LETTERS[i]}</Text>
              <Text style={[styles.choiceText, { color: getChoiceTextColor(choice) }]}>{choice}</Text>
              {isAnswered && choice === currentQuestion.correct && <Text>✅</Text>}
              {isAnswered && choice === selectedChoice && choice !== currentQuestion.correct && <Text>❌</Text>}
            </ThemedCard>
          ))}
        </View>

        {isTimeout && (
          <View style={[styles.timeoutBox, { backgroundColor: theme.error + '22', borderColor: '#ff444455' }]}>
            <Text style={[styles.timeoutText, { color: theme.error }]}>{t('solo.timeout')}</Text>
            <Text style={[styles.timeoutAnswer, { color: theme.textPrimary }]}>
              {t('solo.answer')} {currentQuestion?.correct}
            </Text>
          </View>
        )}

        {isAnswered && (
          <ThemedButton
            onPress={handleNext}
            label={totalRound >= totalRounds ? t('solo.finish') : t('solo.next')}
            variant='primary' size='large'
            style={styles.nextBtn}
          />
        )}
      </ScrollView>
      <LeaveModal
        visible={leaveVisible}
        onCancel={() => setLeaveVisible(false)}
        onConfirm={() => { setLeaveVisible(false); onBack(); }}
      />
    </View>
  );
}

const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

const styles = StyleSheet.create({
  container:         { flex: 1, paddingTop: 50, paddingHorizontal: 20, gap: 12 },
  header:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerBack:        { padding: 4 },
  backText:          { fontSize: 16, fontWeight: '700' },
  scoreChip:         { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  scoreChipText:     { fontSize: 15, fontWeight: '700' },
  highScoreChip:     { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  highScoreChipText: { fontSize: 14, fontWeight: '700' },
  progressRow:       { gap: 6 },
  progressLabel:     { fontSize: 12, textAlign: 'right' },
  progressBar:       { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill:      { height: '100%', borderRadius: 3 },
  levelBadge:        { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 12, alignSelf: 'center' },
  levelBadgeText:    { color: '#fff', fontSize: 14, fontWeight: '800' },
  roundDots:         { flexDirection: 'row', justifyContent: 'center', gap: 10 },
  dot:               { width: 10, height: 10, borderRadius: 5 },
  pickTitle:         { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  catsContainer:     { flex: 1, flexDirection: 'row', gap: 12, alignItems: 'stretch' },
  catCard:           { flex: 1, borderRadius: 20, alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1.5, padding: 12, position: 'relative' },
  specialBadge:      { position: 'absolute', top: 8, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  specialBadgeText:  { fontSize: 10, fontWeight: '800', color: '#000' },
  catEmoji:          { fontSize: 40 },
  catName:           { fontSize: 14, fontWeight: '700', textAlign: 'center' },
  catCount:          { fontSize: 11 },
  timerContainer:    { height: 28, borderRadius: 14, overflow: 'hidden', justifyContent: 'center' },
  timerBarFill:      { position: 'absolute', left: 0, top: 0, bottom: 0, width: '100%', borderRadius: 14 },
  timerText:         { color: '#fff', fontSize: 13, fontWeight: '900', textAlign: 'center', zIndex: 1 },
  frozenBar:         { height: 28, borderRadius: 14, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  frozenText:        { fontSize: 13, fontWeight: '800' },
  pointsBadge:       { paddingVertical: 6, paddingHorizontal: 16, borderRadius: 12, alignSelf: 'center' },
  pointsBadgeText:   { color: '#fff', fontSize: 13, fontWeight: '800' },
  questionBox:       { borderRadius: 20, padding: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, minHeight: 110 },
  questionText:      { fontSize: 20, fontWeight: '700', textAlign: 'center', lineHeight: 32 },
  choicesContainer:  { gap: 10 },
  choiceBtn:         { borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', gap: 12 },
  choiceLetter:      { fontSize: 16, fontWeight: '900', width: 24, textAlign: 'center' },
  choiceText:        { fontSize: 15, fontWeight: '600', flex: 1, textAlign: 'right' },
  timeoutBox:        { borderRadius: 14, padding: 14, alignItems: 'center', gap: 6, borderWidth: 1 },
  timeoutText:       { fontSize: 16, fontWeight: '800' },
  timeoutAnswer:     { fontSize: 14, fontWeight: '600' },
  nextBtn:           { paddingVertical: 16, borderRadius: 16, alignItems: 'center', elevation: 8 },
  nextBtnText:       { fontSize: 18, fontWeight: '800' },
  catChip:           { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  catChipEmoji:      { fontSize: 16 },
  catChipText:       { color: '#fff', fontSize: 13, fontWeight: '700' },
  finishTrophy:      { fontSize: 80, textAlign: 'center', marginTop: 20 },
  finishTitle:       { fontSize: 32, fontWeight: '900', textAlign: 'center' },
  finishScoreBox:    { alignItems: 'center', borderRadius: 20, padding: 24, borderWidth: 1.5 },
  finishScoreNum:    { fontSize: 56, fontWeight: '900' },
  finishScoreLabel:  { fontSize: 16 },
  finishStats:       { flexDirection: 'row', gap: 12 },
  finishStat:        { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center', gap: 4, borderWidth: 1 },
  finishStatNum:     { fontSize: 24, fontWeight: '900' },
  finishStatLabel:   { fontSize: 11, textAlign: 'center' },
  playAgainBtn:      { paddingVertical: 16, borderRadius: 16, alignItems: 'center', elevation: 8 },
  playAgainText:     { fontSize: 18, fontWeight: '800' },
  backBtn:           { paddingVertical: 14, borderRadius: 16, alignItems: 'center', borderWidth: 1 },
});
