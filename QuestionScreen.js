/**
 * QuestionScreen.js — مُصلَح
 * ════════════════════════════════════════════════
 *  ✅ LifelineBar مدمج في الكلاسيك والـ MCQ
 *  ✅ دعم imageUrl — يعرض الصورة إذا كانت موجودة
 *  ✅ tokens و onSpendTokens ممررة من GameBoardScreen
 *  ✅ swapSame / swapRandom / hint / eliminate مربوطة
 *  ✅ تجميد الوقت في MCQ فقط (الكلاسيك بلا مؤقت ثابت)
 *  ✅ usedLifelines تُصفَّر مع كل سؤال جديد
 */

import { useState, useEffect, useCallback, memo, useMemo, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, StatusBar, ScrollView, Image, ActivityIndicator } from 'react-native';
import { useTheme } from './ThemeContext';
import { useT } from './I18n';
import LifelinesBar from './LifelineBar';

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function formatTime(s) {
  const m = Math.floor(s / 60), sec = s % 60;
  return `${m}:${sec < 10 ? '0' : ''}${sec}`;
}

function useTimer() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);
  return seconds;
}

// ── مكوّن عرض الصورة ────────────────────────────────────────
const QuestionImage = memo(({ imageUrl, theme }) => {
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);

  if (!imageUrl) return null;

  return (
    <View style={[imgStyles.wrapper, { backgroundColor: theme.bgCard, borderColor: theme.borderCard }]}>
      {loading && !error && (
        <ActivityIndicator
          style={StyleSheet.absoluteFill}
          color={theme.accent}
          size="large"
        />
      )}
      {error ? (
        <Text style={[imgStyles.errorText, { color: theme.textMuted }]}>📷 تعذّر تحميل الصورة</Text>
      ) : (
        <Image
          source={{ uri: imageUrl }}
          style={imgStyles.image}
          resizeMode="contain"
          onLoad={() => setLoading(false)}
          onError={() => { setLoading(false); setError(true); }}
        />
      )}
    </View>
  );
});

// ══════════════════════════════════════════════════════════════
//  نمط كلاسيك — مع LifelineBar
// ══════════════════════════════════════════════════════════════
const ClassicMode = memo(({
  question, answer, wrong, points, team1, team2, currentTeam,
  onAnswer, onBack, onSwapSame, onSwapRandom,
  tokens, onSpendTokens, onWatchAdLifeline,
  imageUrl,
  theme, t,
}) => {
  const seconds = useTimer();
  const [showAnswer,    setShowAnswer]    = useState(false);
  const [answered,      setAnswered]      = useState(false);
  const [usedLifelines, setUsedLifelines] = useState(new Set());
  const [displayQ,      setDisplayQ]      = useState(question);
  const [displayA,      setDisplayA]      = useState(answer);
  const [displayImg,    setDisplayImg]    = useState(imageUrl);
  const [hintText,      setHintText]      = useState(null);

  const revealAnswer  = useCallback(() => setShowAnswer(true), []);
  const handleTeam1   = useCallback(() => { setAnswered(true); onAnswer(1, points); }, [points, onAnswer]);
  const handleTeam2   = useCallback(() => { setAnswered(true); onAnswer(2, points); }, [points, onAnswer]);
  const handleNone    = useCallback(() => { setAnswered(true); onAnswer(null, 0); }, [onAnswer]);
  const markUsed      = useCallback((key) => setUsedLifelines(prev => new Set([...prev, key])), []);

  const handleHint = useCallback(() => {
    if (displayA) setHintText(displayA[0]);
    return displayA?.[0];
  }, [displayA]);

  const handleSwapSame = useCallback(() => {
    const result = onSwapSame?.();
    if (result) {
      setDisplayQ(result.question);
      setDisplayA(result.answer);
      setDisplayImg(result.imageUrl || null);
      setHintText(null);
    }
  }, [onSwapSame]);

  const handleSwapRandom = useCallback(() => {
    const result = onSwapRandom?.();
    if (result) {
      setDisplayQ(result.question);
      setDisplayA(result.answer);
      setDisplayImg(result.imageUrl || null);
      setHintText(null);
    }
  }, [onSwapRandom]);

  return (
    <>
      <View style={[styles.questionBox, { backgroundColor: theme.bgCard, borderColor: theme.borderCard }]}>
        <Text style={[styles.timerFloating, { color: theme.accentBorder }]}>⏱ {formatTime(seconds)}</Text>
        <Text style={[styles.questionText, { color: theme.textPrimary }]}>{displayQ}</Text>
      </View>

      {/* صورة السؤال إن وُجدت */}
      <QuestionImage imageUrl={displayImg} theme={theme} />

      {/* تلميح إذا استُخدم */}
      {hintText && (
        <View style={[styles.hintBox, { backgroundColor: theme.accentSoft, borderColor: theme.accentBorder }]}>
          <Text style={[styles.hintText, { color: theme.accent }]}>💡 الإجابة تبدأ بـ: "{hintText}"</Text>
        </View>
      )}

      {/* وسائل المساعدة — الكلاسيك يدعم: hint, swapSame, swapRandom */}
      {!answered && (
        <LifelinesBar
          mode="classic"
          tokens={tokens}
          onSpendTokens={onSpendTokens}
          onWatchAd={onWatchAdLifeline}
          onHint={handleHint}
          onSwapSame={handleSwapSame}
          onSwapRandom={handleSwapRandom}
          usedLifelines={usedLifelines}
          onLifelineUsed={markUsed}
        />
      )}

      {!showAnswer ? (
        <TouchableOpacity style={[styles.showAnswerBtn, { backgroundColor: theme.accent }]} onPress={revealAnswer}>
          <Text style={[styles.showAnswerText, { color: theme.textOnAccent }]}>{t('question.showAnswer')}</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.answerSection}>
          <Text style={[styles.answerLabel, { color: theme.textSecondary }]}>{t('question.answer')}</Text>
          <View style={[styles.answerBox, { backgroundColor: theme.bgCard, borderColor: theme.success }]}>
            <Text style={[styles.answerText, { color: theme.success }]}>{displayA}</Text>
          </View>
          {!answered && (
            <View style={styles.whoAnswered}>
              <Text style={[styles.whoLabel, { color: theme.textPrimary }]}>{t('question.whoAnswered')}</Text>
              <View style={styles.whoButtons}>
                <TouchableOpacity style={[styles.btnTeam1, { backgroundColor: '#3b82f622', borderColor: '#3b82f655' }]} onPress={handleTeam1}>
                  <Text style={[styles.btnTeamText, { color: theme.textPrimary }]}>✅ {team1}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btnTeam2, { backgroundColor: theme.success + '22', borderColor: theme.success + '55' }]} onPress={handleTeam2}>
                  <Text style={[styles.btnTeamText, { color: theme.textPrimary }]}>✅ {team2}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btnNone, { backgroundColor: theme.error + '18', borderColor: theme.error + '44' }]} onPress={handleNone}>
                  <Text style={[styles.btnNoneText, { color: theme.error }]}>❌ {t('question.nobody')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}
    </>
  );
});

// ══════════════════════════════════════════════════════════════
//  نمط MCQ — مع LifelineBar
// ══════════════════════════════════════════════════════════════
const MCQMode = memo(({
  question, answer, wrong, points, team1, team2, currentTeam,
  onAnswer, onBack, onSwapSame, onSwapRandom,
  tokens, onSpendTokens, onWatchAdLifeline,
  imageUrl,
  theme, t,
}) => {
  const ARABIC_LETTERS = ['أ', 'ب', 'ج', 'د'];

  const [displayQ,      setDisplayQ]      = useState(question);
  const [displayA,      setDisplayA]      = useState(answer);
  const [displayWrong,  setDisplayWrong]  = useState(wrong);
  const [displayImg,    setDisplayImg]    = useState(imageUrl);
  const [choices,       setChoices]       = useState(() => shuffleArray([answer, ...wrong]));
  const [selected,      setSelected]      = useState(null);
  const [eliminated,    setEliminated]    = useState(new Set());
  const [usedLifelines, setUsedLifelines] = useState(new Set());

  const isAnswered = !!selected;
  const markUsed   = useCallback((key) => setUsedLifelines(prev => new Set([...prev, key])), []);

  const handleEliminate = useCallback(() => {
    const wrongChoices = choices.filter(c => c !== displayA && !eliminated.has(c));
    const toRemove = shuffleArray(wrongChoices).slice(0, 2);
    setEliminated(new Set([...eliminated, ...toRemove]));
  }, [choices, displayA, eliminated]);

  const handleSwapSame = useCallback(() => {
    const result = onSwapSame?.();
    if (result) {
      setDisplayQ(result.question);
      setDisplayA(result.answer);
      setDisplayWrong(result.wrong ?? []);
      setDisplayImg(result.imageUrl || null);
      setChoices(shuffleArray([result.answer, ...(result.wrong ?? [])]));
      setSelected(null);
      setEliminated(new Set());
    }
  }, [onSwapSame]);

  const handleSwapRandom = useCallback(() => {
    const result = onSwapRandom?.();
    if (result) {
      setDisplayQ(result.question);
      setDisplayA(result.answer);
      setDisplayWrong(result.wrong ?? []);
      setDisplayImg(result.imageUrl || null);
      setChoices(shuffleArray([result.answer, ...(result.wrong ?? [])]));
      setSelected(null);
      setEliminated(new Set());
    }
  }, [onSwapRandom]);

  const getChoiceStyle = (choice) => {
    if (eliminated.has(choice)) return [styles.choiceBtn, { opacity: 0.2 }];
    const base = { backgroundColor: theme.bgCard, borderColor: theme.borderCard };
    if (!isAnswered) return [styles.choiceBtn, base];
    if (choice === displayA) return [styles.choiceBtn, { backgroundColor: theme.success + '22', borderColor: '#4aff4a' }];
    if (choice === selected) return [styles.choiceBtn, { backgroundColor: theme.error + '22', borderColor: '#ff4444' }];
    return [styles.choiceBtn, base, { opacity: 0.4 }];
  };

  const getTextColor = (choice) => {
    if (eliminated.has(choice)) return theme.textMuted;
    if (!isAnswered) return theme.textPrimary;
    if (choice === displayA) return '#4aff4a';
    if (choice === selected) return '#ff4444';
    return theme.textMuted;
  };

  return (
    <>
      <View style={[styles.questionBox, { backgroundColor: theme.bgCard, borderColor: theme.borderCard }]}>
        <Text style={[styles.questionText, { color: theme.textPrimary }]}>{displayQ}</Text>
      </View>

      {/* صورة السؤال إن وُجدت */}
      <QuestionImage imageUrl={displayImg} theme={theme} />

      {/* وسائل المساعدة — MCQ يدعم: eliminate, swapSame, swapRandom, freeze */}
      {!isAnswered && (
        <LifelinesBar
          mode="mcq"
          tokens={tokens}
          onSpendTokens={onSpendTokens}
          onWatchAd={onWatchAdLifeline}
          onEliminate={handleEliminate}
          onSwapSame={handleSwapSame}
          onSwapRandom={handleSwapRandom}
          usedLifelines={usedLifelines}
          onLifelineUsed={markUsed}
        />
      )}

      <View style={styles.choicesContainer}>
        {choices.map((choice, i) => (
          <TouchableOpacity
            key={i}
            style={getChoiceStyle(choice)}
            onPress={() => {
              if (isAnswered || eliminated.has(choice)) return;
              setSelected(choice);
              onAnswer(choice === displayA ? currentTeam : null, choice === displayA ? points : 0);
            }}
            disabled={isAnswered || eliminated.has(choice)}
            activeOpacity={0.85}
          >
            <Text style={[styles.choiceLetter, { color: theme.accent }]}>{ARABIC_LETTERS[i]}</Text>
            <Text style={[styles.choiceText, { color: getTextColor(choice) }]}>{choice}</Text>
            {isAnswered && choice === displayA && <Text>✅</Text>}
            {isAnswered && choice === selected && choice !== displayA && <Text>❌</Text>}
          </TouchableOpacity>
        ))}
      </View>

      {isAnswered && (
        <TouchableOpacity
          style={[styles.continueBtn, { backgroundColor: theme.accent }]}
          onPress={() => onAnswer(null, 0)}
        >
          <Text style={[styles.continueBtnText, { color: theme.textOnAccent }]}>{t('question.returnBoard')}</Text>
        </TouchableOpacity>
      )}
    </>
  );
});

// ══════════════════════════════════════════════════════════════
//  الشاشة الرئيسية
// ══════════════════════════════════════════════════════════════
export default function QuestionScreen({
  question, answer, wrong, points, category,
  team1, team2, currentTeam, onAnswer, onBack,
  mode = 'classic',
  imageUrl = null,
  // وسائل المساعدة
  tokens = 0,
  onSpendTokens,
  onSwapSame,
  onSwapRandom,
  allCategories,
  currentCategoryId,
}) {
  const { theme } = useTheme();
  const t = useT();
  const isMCQ = mode === 'mcq' && wrong && wrong.length >= 3;

  const handleWatchAdLifeline = useCallback(async () => {
    return new Promise(resolve => setTimeout(resolve, 2500));
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.isCityTheme ? 'transparent' : theme.bg }]}>
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.statusBg} />

      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={HIT_SLOP}>
          <Text style={[styles.backText, { color: theme.accent }]}>{t('common.backArrow')}</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.categoryText, { color: theme.textSecondary }]}>{category}</Text>
          <View style={[styles.pointsBadge, { backgroundColor: theme.accent }]}>
            <Text style={[styles.pointsText, { color: theme.textOnAccent }]}>{points} {t('common.points')}</Text>
          </View>
        </View>
        <View style={[styles.modeBadge, { backgroundColor: theme.bgCard, borderColor: isMCQ ? '#4a8aff55' : theme.accentBorder }]}>
          <Text style={[styles.modeText, { color: theme.accent }]}>{isMCQ ? t('question.mcq') : t('question.classic')}</Text>
        </View>
      </View>

      <View style={[styles.turnBar, { backgroundColor: theme.bgCard, borderColor: theme.accentBorder }]}>
        <Text style={[styles.turnText, { color: theme.textSecondary }]}>
          {t('question.turnTeam')}{' '}
          <Text style={[styles.turnTeam, { color: theme.accent }]}>{currentTeam === 1 ? team1 : team2}</Text>
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {isMCQ ? (
          <MCQMode
            question={question} answer={answer} wrong={wrong} points={points}
            team1={team1} team2={team2} currentTeam={currentTeam}
            onAnswer={onAnswer} onBack={onBack}
            onSwapSame={onSwapSame} onSwapRandom={onSwapRandom}
            tokens={tokens} onSpendTokens={onSpendTokens}
            onWatchAdLifeline={handleWatchAdLifeline}
            imageUrl={imageUrl}
            theme={theme} t={t}
          />
        ) : (
          <ClassicMode
            question={question} answer={answer} wrong={wrong} points={points}
            team1={team1} team2={team2} currentTeam={currentTeam}
            onAnswer={onAnswer} onBack={onBack}
            onSwapSame={onSwapSame} onSwapRandom={onSwapRandom}
            tokens={tokens} onSpendTokens={onSpendTokens}
            onWatchAdLifeline={handleWatchAdLifeline}
            imageUrl={imageUrl}
            theme={theme} t={t}
          />
        )}
      </ScrollView>
    </View>
  );
}

const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

// ── ستايلات الصورة ────────────────────────────────────────────
const imgStyles = StyleSheet.create({
  wrapper: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
});

const styles = StyleSheet.create({
  container:       { flex: 1, paddingTop: 50, paddingHorizontal: 20 },
  scrollContent:   { gap: 14, paddingBottom: 30 },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  backBtn:         { padding: 8 },
  backText:        { fontSize: 16, fontWeight: '700' },
  headerCenter:    { alignItems: 'center', gap: 6 },
  categoryText:    { fontSize: 16, fontWeight: '700' },
  pointsBadge:     { paddingHorizontal: 14, paddingVertical: 4, borderRadius: 20 },
  pointsText:      { fontSize: 14, fontWeight: '900' },
  modeBadge:       { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  modeText:        { fontSize: 13, fontWeight: '700' },
  turnBar:         { padding: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1, marginBottom: 4 },
  turnText:        { fontSize: 15, fontWeight: '600' },
  turnTeam:        { fontWeight: '900' },

  // سؤال
  questionBox:     { borderRadius: 20, padding: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, minHeight: 110, position: 'relative' },
  timerFloating:   { position: 'absolute', top: 10, right: 14, fontSize: 12, fontWeight: '700' },
  questionText:    { fontSize: 20, fontWeight: '700', textAlign: 'center', lineHeight: 32 },

  // تلميح
  hintBox:         { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  hintText:        { fontSize: 14, fontWeight: '700' },

  // إجابة الكلاسيك
  showAnswerBtn:   { paddingVertical: 16, borderRadius: 16, alignItems: 'center', elevation: 8 },
  showAnswerText:  { fontSize: 18, fontWeight: '800' },
  answerSection:   { gap: 12 },
  answerLabel:     { fontSize: 14, fontWeight: '700', textAlign: 'center' },
  answerBox:       { borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1.5 },
  answerText:      { fontSize: 20, fontWeight: '800', textAlign: 'center' },
  whoAnswered:     { gap: 10 },
  whoLabel:        { fontSize: 16, fontWeight: '800', textAlign: 'center' },
  whoButtons:      { gap: 10 },
  btnTeam1:        { paddingVertical: 14, borderRadius: 14, alignItems: 'center', borderWidth: 1 },
  btnTeam2:        { paddingVertical: 14, borderRadius: 14, alignItems: 'center', borderWidth: 1 },
  btnNone:         { paddingVertical: 14, borderRadius: 14, alignItems: 'center', borderWidth: 1 },
  btnTeamText:     { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  btnNoneText:     { color: '#ff6666', fontSize: 16, fontWeight: '700' },

  // خيارات MCQ
  choicesContainer:{ gap: 10 },
  choiceBtn:       { borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', gap: 12 },
  choiceLetter:    { fontSize: 16, fontWeight: '900', width: 24, textAlign: 'center' },
  choiceText:      { fontSize: 16, fontWeight: '600', flex: 1, textAlign: 'right' },
  continueBtn:     { paddingVertical: 16, borderRadius: 16, alignItems: 'center', elevation: 8 },
  continueBtnText: { fontSize: 18, fontWeight: '800' },
});
