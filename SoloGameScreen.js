import { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  StatusBar, Animated, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HIGHSCORE_KEY = 'almaydan_highscore';
const TIMER_SECONDS = 15;
const ROUNDS_PER_LEVEL = 3;
const LEVELS = [1, 2, 3, 4, 5];
const LEVEL_POINTS = { 1: 100, 2: 200, 3: 300, 4: 400, 5: 500 };

// يخلط المصفوفة عشوائياً
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// يختار 3 فئات عشوائية (أحياناً واحدة منها خاصة)
function pickThreeCategories(allCategories, currentLevel) {
  const normal = allCategories.filter(c => !c.isSpecial);
  const special = allCategories.filter(c => c.isSpecial);

  const shuffledNormal = shuffle(normal);
  const picked = shuffledNormal.slice(0, 3);

  // 30% احتمال تظهر فئة خاصة
  if (special.length > 0 && Math.random() < 0.3) {
    const specialCat = special[Math.floor(Math.random() * special.length)];
    picked[Math.floor(Math.random() * 3)] = specialCat;
  }

  return picked.slice(0, 3);
}

// يختار سؤال من الفئة حسب المستوى
function pickQuestion(category, level) {
  const questions = (category.questions || []).filter(q => q.level === level);
  if (questions.length === 0) return null;
  return questions[Math.floor(Math.random() * questions.length)];
}

export default function SoloGameScreen({ categories = [], onBack, playerName = 'لاعب', onHighScoreUpdate }) {
  // ── المراحل: 'picking' | 'question' | 'result' | 'finished'
  const [phase, setPhase] = useState('picking');

  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const [roundInLevel, setRoundInLevel] = useState(0); // 0,1,2
  const [totalRound, setTotalRound] = useState(1); // 1..15

  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);

  const [threeCategories, setThreeCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [choices, setChoices] = useState([]);
  const [selectedChoice, setSelectedChoice] = useState(null);

  // Timer
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const timerRef = useRef(null);
  const timerAnim = useRef(new Animated.Value(1)).current;

  const currentLevel = LEVELS[currentLevelIndex];
  const points = LEVEL_POINTS[currentLevel];
  const totalRounds = LEVELS.length * ROUNDS_PER_LEVEL; // 15

  // ── تحميل الرقم القياسي
  useEffect(() => {
    AsyncStorage.getItem(HIGHSCORE_KEY).then(val => {
      if (val) setHighScore(parseInt(val));
    });
    startPicking();
  }, []);

  // ── بداية مرحلة الاختيار
  const startPicking = () => {
    const level = LEVELS[currentLevelIndex];
    const three = pickThreeCategories(categories, level);
    setThreeCategories(three);
    setSelectedCategory(null);
    setPhase('picking');
  };

  // ── اللاعب اختار فئة
  const handlePickCategory = (cat) => {
    const level = LEVELS[currentLevelIndex];
    const q = pickQuestion(cat, level);
    if (!q) {
      Alert.alert('تنبيه', 'لا توجد أسئلة في هذه الفئة لهذا المستوى!');
      return;
    }
    const shuffled = shuffle([q.correct, ...q.wrong]);
    setSelectedCategory(cat);
    setCurrentQuestion(q);
    setChoices(shuffled);
    setSelectedChoice(null);
    setTimeLeft(TIMER_SECONDS);
    setPhase('question');
    startTimer();
  };

  // ── عداد الوقت
  const startTimer = () => {
    clearInterval(timerRef.current);
    timerAnim.setValue(1);
    Animated.timing(timerAnim, {
      toValue: 0,
      duration: TIMER_SECONDS * 1000,
      useNativeDriver: false,
    }).start();

    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          handleTimeOut();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  const stopTimer = () => {
    clearInterval(timerRef.current);
    timerAnim.stopAnimation();
  };

  // ── انتهى الوقت بدون إجابة
  const handleTimeOut = () => {
    setSelectedChoice('__timeout__');
    setPhase('result');
    setTimeout(() => goNextRound(false), 2000);
  };

  // ── اللاعب اختار جواب
  const handleAnswer = (choice) => {
    if (selectedChoice) return;
    stopTimer();
    setSelectedChoice(choice);
    setPhase('result');

    const isCorrect = choice === currentQuestion.correct;
    if (isCorrect) {
      setScore(s => s + points);
      setCorrectCount(c => c + 1);
    }
    setTimeout(() => goNextRound(isCorrect), 1800);
  };

  // ── الانتقال للجولة التالية
  const goNextRound = (wasCorrect) => {
    const nextRoundInLevel = roundInLevel + 1;
    const nextTotalRound = totalRound + 1;

    if (nextTotalRound > totalRounds) {
      finishGame();
      return;
    }

    setTotalRound(nextTotalRound);

    if (nextRoundInLevel >= ROUNDS_PER_LEVEL) {
      // انتقل للمستوى التالي
      const nextLevelIndex = currentLevelIndex + 1;
      setCurrentLevelIndex(nextLevelIndex);
      setRoundInLevel(0);
    } else {
      setRoundInLevel(nextRoundInLevel);
    }

    setPhase('picking');
  };

  // ── انتهت اللعبة
  const finishGame = async () => {
    setPhase('finished');
    if (score > highScore) {
      setHighScore(score);
      await AsyncStorage.setItem(HIGHSCORE_KEY, String(score));
      if (onHighScoreUpdate) onHighScoreUpdate(score);
    }
  };

  // ── ألوان المستويات
  const levelColors = {
    1: '#1a3a6e',
    2: '#1a5a3a',
    3: '#5a5a00',
    4: '#7a3a00',
    5: '#7a1a1a',
  };

  const levelColor = levelColors[currentLevel];

  // ── شريط التقدم
  const progressPercent = ((totalRound - 1) / totalRounds) * 100;

  // ══════════════════════════════════════════
  // ── شاشة انتهت اللعبة
  // ══════════════════════════════════════════
  if (phase === 'finished') {
    const isNewRecord = score >= highScore;
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0d0d2b" />
        <Text style={styles.finishTrophy}>{isNewRecord ? '🏆' : '🎮'}</Text>
        <Text style={styles.finishTitle}>
          {isNewRecord ? 'رقم قياسي جديد!' : 'انتهت اللعبة'}
        </Text>
        <View style={styles.finishScoreBox}>
          <Text style={styles.finishScoreNum}>{score}</Text>
          <Text style={styles.finishScoreLabel}>نقطة</Text>
        </View>
        <View style={styles.finishStats}>
          <View style={styles.finishStat}>
            <Text style={styles.finishStatNum}>{correctCount}</Text>
            <Text style={styles.finishStatLabel}>إجابة صحيحة</Text>
          </View>
          <View style={styles.finishStat}>
            <Text style={styles.finishStatNum}>{totalRounds - correctCount}</Text>
            <Text style={styles.finishStatLabel}>إجابة خاطئة</Text>
          </View>
          <View style={styles.finishStat}>
            <Text style={styles.finishStatNum}>{highScore}</Text>
            <Text style={styles.finishStatLabel}>🏆 أعلى رقم</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.playAgainBtn} onPress={() => {
          setScore(0);
          setCorrectCount(0);
          setCurrentLevelIndex(0);
          setRoundInLevel(0);
          setTotalRound(1);
          startPicking();
        }}>
          <Text style={styles.playAgainText}>🔄 العب مجدداً</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backText}>← رجوع</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ══════════════════════════════════════════
  // ── شاشة اختيار الفئة
  // ══════════════════════════════════════════
  if (phase === 'picking') {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0d0d2b" />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.headerBack}>
            <Text style={styles.backText}>← رجوع</Text>
          </TouchableOpacity>
          <View style={styles.scoreChip}>
            <Text style={styles.scoreChipText}>🪙 {score}</Text>
          </View>
          <View style={styles.highScoreChip}>
            <Text style={styles.highScoreChipText}>🏆 {highScore}</Text>
          </View>
        </View>

        {/* Progress */}
        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>جولة {totalRound} / {totalRounds}</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progressPercent}%`, backgroundColor: levelColor }]} />
          </View>
        </View>

        {/* Level Badge */}
        <View style={[styles.levelBadge, { backgroundColor: levelColor }]}>
          <Text style={styles.levelBadgeText}>المستوى {currentLevel} — {points} نقطة</Text>
        </View>

        {/* Round dots */}
        <View style={styles.roundDots}>
          {[0, 1, 2].map(i => (
            <View key={i} style={[styles.dot, i < roundInLevel && styles.dotDone, i === roundInLevel && styles.dotActive]} />
          ))}
        </View>

        <Text style={styles.pickTitle}>اختر فئتك للسؤال القادم</Text>

        {/* Three Categories */}
        <View style={styles.catsContainer}>
          {threeCategories.map((cat, i) => (
            <TouchableOpacity
              key={cat.id + i}
              style={[styles.catCard, cat.isSpecial && styles.catCardSpecial]}
              onPress={() => handlePickCategory(cat)}
            >
              {cat.isSpecial && (
                <View style={styles.specialBadge}>
                  <Text style={styles.specialBadgeText}>⭐ خاصة</Text>
                </View>
              )}
              <Text style={styles.catEmoji}>{cat.emoji}</Text>
              <Text style={styles.catName}>{cat.name}</Text>
              <Text style={styles.catCount}>{(cat.questions || []).filter(q => q.level === currentLevel).length} سؤال</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  // ══════════════════════════════════════════
  // ── شاشة السؤال
  // ══════════════════════════════════════════
  const isAnswered = !!selectedChoice;

  const getChoiceStyle = (choice) => {
    if (!isAnswered) return styles.choiceBtn;
    if (choice === currentQuestion.correct) return [styles.choiceBtn, styles.choiceCorrect];
    if (choice === selectedChoice) return [styles.choiceBtn, styles.choiceWrong];
    return [styles.choiceBtn, styles.choiceDim];
  };

  const getChoiceTextStyle = (choice) => {
    if (!isAnswered) return styles.choiceText;
    if (choice === currentQuestion.correct) return [styles.choiceText, { color: '#4aff4a' }];
    if (choice === selectedChoice) return [styles.choiceText, { color: '#ff6666' }];
    return [styles.choiceText, { color: '#666' }];
  };

  const timerColor = timerAnim.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: ['#ff4444', '#ffaa00', '#4aff4a'],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0d0d2b" />

      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.catChip, { backgroundColor: levelColor }]}>
          <Text style={styles.catChipEmoji}>{selectedCategory?.emoji}</Text>
          <Text style={styles.catChipText}>{selectedCategory?.name}</Text>
        </View>
        <View style={styles.scoreChip}>
          <Text style={styles.scoreChipText}>🪙 {score}</Text>
        </View>
      </View>

      {/* Timer Bar */}
      <View style={styles.timerContainer}>
        <Animated.View style={[styles.timerBar, {
          width: timerAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
          backgroundColor: timerColor,
        }]} />
        <Text style={styles.timerText}>{timeLeft}s</Text>
      </View>

      {/* Points Badge */}
      <View style={[styles.pointsBadge, { backgroundColor: levelColor }]}>
        <Text style={styles.pointsBadgeText}>{points} نقطة</Text>
      </View>

      {/* Question */}
      <View style={styles.questionBox}>
        <Text style={styles.questionText}>{currentQuestion?.question ?? currentQuestion?.text}</Text>
      </View>

      {/* Choices */}
      <View style={styles.choicesContainer}>
        {choices.map((choice, i) => (
          <TouchableOpacity
            key={i}
            style={getChoiceStyle(choice)}
            onPress={() => handleAnswer(choice)}
            disabled={isAnswered}
          >
            <Text style={styles.choiceLetter}>{['أ', 'ب', 'ج', 'د'][i]}</Text>
            <Text style={getChoiceTextStyle(choice)}>{choice}</Text>
            {isAnswered && choice === currentQuestion.correct && <Text>✅</Text>}
            {isAnswered && choice === selectedChoice && choice !== currentQuestion.correct && <Text>❌</Text>}
          </TouchableOpacity>
        ))}
      </View>

      {/* Timeout message */}
      {selectedChoice === '__timeout__' && (
        <View style={styles.timeoutBox}>
          <Text style={styles.timeoutText}>⏰ انتهى الوقت!</Text>
          <Text style={styles.timeoutAnswer}>الإجابة: {currentQuestion?.correct}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d2b',
    paddingTop: 50,
    paddingHorizontal: 20,
    gap: 14,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerBack: { padding: 4 },
  backText: { color: '#f5c518', fontSize: 16, fontWeight: '700' },
  scoreChip: {
    backgroundColor: '#1a1a3e',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f5c51855',
  },
  scoreChipText: { color: '#f5c518', fontSize: 15, fontWeight: '700' },
  highScoreChip: {
    backgroundColor: '#1a1a3e',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f5c51833',
  },
  highScoreChipText: { color: '#a09060', fontSize: 14, fontWeight: '700' },

  // Progress
  progressRow: { gap: 6 },
  progressLabel: { color: '#a09060', fontSize: 12, textAlign: 'right' },
  progressBar: {
    height: 6,
    backgroundColor: '#1a1a3e',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3 },

  // Level Badge
  levelBadge: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignSelf: 'center',
  },
  levelBadgeText: { color: '#fff', fontSize: 14, fontWeight: '800' },

  // Round Dots
  roundDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2a2a55',
  },
  dotDone: { backgroundColor: '#4aff4a' },
  dotActive: { backgroundColor: '#f5c518', transform: [{ scale: 1.3 }] },

  // Pick Category
  pickTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  catsContainer: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'stretch',
  },
  catCard: {
    flex: 1,
    backgroundColor: '#1a1a3e',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: '#2a2a55',
    padding: 12,
    position: 'relative',
  },
  catCardSpecial: {
    borderColor: '#f5c518',
    backgroundColor: '#1a1a2e',
  },
  specialBadge: {
    position: 'absolute',
    top: 8,
    backgroundColor: '#f5c518',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  specialBadgeText: { color: '#0d0d2b', fontSize: 10, fontWeight: '800' },
  catEmoji: { fontSize: 40 },
  catName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  catCount: { color: '#a09060', fontSize: 11 },

  // Timer
  timerContainer: {
    height: 28,
    backgroundColor: '#1a1a3e',
    borderRadius: 14,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  timerBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 14,
  },
  timerText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
    zIndex: 1,
  },

  // Points Badge
  pointsBadge: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignSelf: 'center',
  },
  pointsBadgeText: { color: '#fff', fontSize: 13, fontWeight: '800' },

  // Question
  questionBox: {
    backgroundColor: '#1a1a3e',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#2a2a55',
    minHeight: 120,
  },
  questionText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 32,
  },

  // Choices
  choicesContainer: { gap: 10 },
  choiceBtn: {
    backgroundColor: '#1a1a3e',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: '#2a2a55',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  choiceCorrect: { backgroundColor: '#1a3a1a', borderColor: '#4aff4a' },
  choiceWrong: { backgroundColor: '#3a1a1a', borderColor: '#ff4444' },
  choiceDim: { opacity: 0.4 },
  choiceLetter: {
    color: '#f5c518',
    fontSize: 16,
    fontWeight: '900',
    width: 24,
    textAlign: 'center',
  },
  choiceText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },

  // Timeout
  timeoutBox: {
    backgroundColor: '#3a1a1a',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#ff444455',
  },
  timeoutText: { color: '#ff6666', fontSize: 16, fontWeight: '800' },
  timeoutAnswer: { color: '#ffffff', fontSize: 14, fontWeight: '600' },

  // Finished
  finishTrophy: { fontSize: 80, textAlign: 'center', marginTop: 20 },
  finishTitle: {
    color: '#f5c518',
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
  },
  finishScoreBox: {
    alignItems: 'center',
    backgroundColor: '#1a1a3e',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1.5,
    borderColor: '#f5c51855',
  },
  finishScoreNum: { color: '#f5c518', fontSize: 56, fontWeight: '900' },
  finishScoreLabel: { color: '#a09060', fontSize: 16 },
  finishStats: {
    flexDirection: 'row',
    gap: 12,
  },
  finishStat: {
    flex: 1,
    backgroundColor: '#1a1a3e',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#2a2a55',
  },
  finishStatNum: { color: '#f5c518', fontSize: 24, fontWeight: '900' },
  finishStatLabel: { color: '#a09060', fontSize: 11, textAlign: 'center' },
  playAgainBtn: {
    backgroundColor: '#f5c518',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 8,
  },
  playAgainText: { color: '#0d0d2b', fontSize: 18, fontWeight: '800' },
  backBtn: {
    backgroundColor: '#1a1a3e',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f5c51833',
  },

  // Cat chip (during question)
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  catChipEmoji: { fontSize: 16 },
  catChipText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
