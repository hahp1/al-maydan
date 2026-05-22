/**
 * OnlineGameScreen.js — شاشة الأونلاين الكاملة
 * ════════════════════════════════════════════════════════════
 *
 *  هيكل اللعبة:
 *  ─────────────
 *  • 15 جولة × 5 مستويات × 3 جولات/مستوى
 *  • نقاط: مستوى1=100، 2=200، 3=300، 4=400، 5=500
 *  • Player1 يولّد الـ rounds[] عند إنشاء الغرفة
 *    (3 فئات عشوائية + سؤال محدد لكل فئة لكل جولة)
 *  • كل لاعب يلعب بشكل مستقل (async)
 *  • وقت اختيار الفئة: 15 ثانية (عشوائي تلقائياً)
 *  • وقت الإجابة: 25 ثانية
 *  • كل لاعب يرى نقاطه فقط أثناء اللعب
 *  • عند انتهاء أحدهم → ينتظر الآخر → نتيجة مشتركة
 *
 *  Firebase structure (rooms/{roomId}):
 *  ─────────────────────────────────────
 *  {
 *    status: 'waiting' | 'ready' | 'playing' | 'p1done' | 'p2done' | 'finished',
 *    player1: { uid, name, score, done, currentRound },
 *    player2: { uid, name, score, done, currentRound },
 *    rounds: [
 *      {
 *        roundIndex: 0,
 *        level: 1,
 *        categories: [
 *          { id, name, emoji, questionIndex },  // questionIndex = index في questions[]
 *          { id, name, emoji, questionIndex },
 *          { id, name, emoji, questionIndex },
 *        ]
 *      }, ...
 *    ]
 *  }
 *
 *  ✅ LifelineBar مدمج (eliminate, swapSame, swapRandom, freeze)
 *  ✅ الوقت يتوقف فقط عند مشاهدة إعلان بدل التوكنز
 *  ✅ Bot بعد 60 ثانية إذا لم يأتِ لاعب ثانٍ
 */

import { useState, useEffect, useRef, useCallback, memo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, Animated, Alert, ScrollView, ActivityIndicator,
  BackHandler } from 'react-native';
import { db, fetchQuestionsForCategories } from './firebaseConfig';
import {
  doc, setDoc, updateDoc, onSnapshot,
  getDoc, serverTimestamp,
} from 'firebase/firestore';
import { useTheme } from './ThemeContext';
import ExitButton from './ExitButton';
import LeaveModal from './LeaveModal';
import { useT } from './I18n';
import LifelinesBar from './LifelineBar';
import { WebScreenButton } from './WebRoomService';
import { playSound } from './SoundService';

// ══════════════════════════════════════════════
//  إعدادات اللعبة
// ══════════════════════════════════════════════
const ROUNDS_TOTAL     = 15;
const ROUNDS_PER_LEVEL = 3;
const LEVELS           = [1, 2, 3, 4, 5];
const LEVEL_POINTS     = { 1: 100, 2: 200, 3: 300, 4: 400, 5: 500 };
const PICK_SECONDS     = 15;   // وقت اختيار الفئة
const ANSWER_SECONDS   = 25;   // وقت الإجابة
const BOT_WAIT_MS      = 60000;
const ARABIC_LETTERS   = ['أ', 'ب', 'ج', 'د'];

const levelColors      = { 1: '#1a3a6e', 2: '#1a5a3a', 3: '#5a5a00', 4: '#7a3a00', 5: '#7a1a1a' };
const levelColorsLight = { 1: '#2a5aaa', 2: '#2a8a5a', 3: '#8a8a00', 4: '#aa5a00', 5: '#aa2a2a' };

// ── مساعدات ──
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getRoundLevel(roundIndex) {
  return LEVELS[Math.floor(roundIndex / ROUNDS_PER_LEVEL)];
}

// ── يولّد الـ rounds الـ15 كاملة ──
function generateRounds(allCategories) {
  const rounds = [];
  for (let i = 0; i < ROUNDS_TOTAL; i++) {
    const level = getRoundLevel(i);
    // اختر 3 فئات عشوائية
    const pool = allCategories.filter(c => (c.questions || []).some(q => q.level === level));
    const picked = shuffle(pool).slice(0, 3);

    const cats = picked.map(cat => {
      const qs = (cat.questions || []).filter(q => q.level === level);
      const q  = qs[Math.floor(Math.random() * qs.length)];
      return {
        id:            cat.id,
        name:          cat.name,
        emoji:         cat.emoji,
        question:      q?.question ?? q?.text ?? '',
        correct:       q?.correct  ?? q?.answer ?? '',
        wrong:         q?.wrong    ?? [],
      };
    });

    rounds.push({ roundIndex: i, level, categories: cats });
  }
  return rounds;
}

function timerColor(ratio) {
  if (ratio > 0.5) return '#4aff4a';
  if (ratio > 0.25) return '#ffaa00';
  return '#ff4444';
}

// ══════════════════════════════════════════════
//  TimerBar
// ══════════════════════════════════════════════
const TimerBar = memo(({ scaleAnim, timeLeft, total, theme }) => {
  const ratio = timeLeft / total;
  const color = timerColor(ratio);
  return (
    <View style={[styles.timerContainer, { backgroundColor: theme.bgCard }]}>
      <View style={StyleSheet.absoluteFill}>
        <Animated.View style={[
          styles.timerBarFill,
          { backgroundColor: color, transform: [{ scaleX: scaleAnim }] },
        ]} />
      </View>
      <Text style={styles.timerText}>{timeLeft}s</Text>
    </View>
  );
});

// ══════════════════════════════════════════════
//  CategoryCard
// ══════════════════════════════════════════════
const CategoryCard = memo(({ cat, onPress, levelColor, disabled, timeLeft, theme }) => (
  <TouchableOpacity
    style={[
      styles.catCard,
      { backgroundColor: theme.bgCard, borderColor: theme.borderCard },
      disabled && { opacity: 0.45 },
    ]}
    onPress={() => !disabled && onPress(cat)}
    activeOpacity={0.8}
    disabled={disabled}
  >
    <Text style={styles.catEmoji}>{cat.emoji}</Text>
    <Text style={[styles.catName, { color: theme.textPrimary }]} numberOfLines={2}>
      {cat.name}
    </Text>
  </TouchableOpacity>
));

// ══════════════════════════════════════════════
//  الشاشة الرئيسية
// ══════════════════════════════════════════════
export default function OnlineGameScreen({
  categories = [],
  onBack,
  currentUser,
  tokens = 0,
  setTokens,
  onTournamentScore,   // callback لتسجيل السكور في البطولة
  onGameEnd,           // callback لـ XP (won: boolean)
  onAdWatched,         // ← جديد: callback لـ XP عند مشاهدة إعلان
}) {
  const [leaveVisible, setLeaveVisible] = useState(false);
  const { theme, isDark, themeId } = useTheme();
  const t = useT();

  const myUid  = currentUser?.uid  || `guest_${Math.random().toString(36).slice(2, 10)}`;
  const myName = currentUser?.name || 'لاعب';

  // ── حالة الغرفة ──
  const [phase,       setPhase]       = useState('connecting'); // connecting|lobby|picking|question|waiting|finished
  const [roomId,      setRoomId]      = useState(null);
  const [isPlayer1,   setIsPlayer1]   = useState(false);
  const [roomData,    setRoomData]    = useState(null);
  const [opponentName,setOpponentName]= useState(null);
  const [error,       setError]       = useState(null);

  // ── حالة اللعب ──
  const [rounds,         setRounds]         = useState([]);
  const [currentRound,   setCurrentRound]   = useState(0);
  const [myScore,        setMyScore]        = useState(0);
  const [selectedCat,    setSelectedCat]    = useState(null);
  const [choices,        setChoices]        = useState([]);
  const [selectedChoice, setSelectedChoice] = useState(null);
  const [eliminated,     setEliminated]     = useState(new Set());
  const [usedLifelines,  setUsedLifelines]  = useState(new Set());
  const [frozen,         setFrozen]         = useState(false);

  // ── المؤقتات ──
  const [pickTimeLeft,   setPickTimeLeft]   = useState(PICK_SECONDS);
  const [answerTimeLeft, setAnswerTimeLeft] = useState(ANSWER_SECONDS);

  const pickTimerRef    = useRef(null);
  const answerTimerRef  = useRef(null);
  const pickScaleAnim   = useRef(new Animated.Value(1)).current;
  const answerScaleAnim = useRef(new Animated.Value(1)).current;
  const unsubRef        = useRef(null);
  const botTimeoutRef   = useRef(null);
  const roomIdRef       = useRef(null);

  // ── جولة الأونلاين الحالية ──
  const currentRoundData = rounds[currentRound] ?? null;
  const currentLevel     = currentRoundData ? getRoundLevel(currentRound) : 1;
  const currentPoints    = LEVEL_POINTS[currentLevel];
  const levelColor       = theme.isLight ? levelColorsLight[currentLevel] : levelColors[currentLevel];

  // ══════════════════════════════════════════════
  //  الاتصال بـ Firebase
  // ══════════════════════════════════════════════
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setLeaveVisible(true);
      return true;
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    findOrJoinRoom();
    return () => {
      unsubRef.current?.();
      clearTimeout(botTimeoutRef.current);
      clearInterval(pickTimerRef.current);
      clearInterval(answerTimerRef.current);
    };
  }, []);

  // صوت countdown خارج setState
  useEffect(() => {
    if (answerTimeLeft > 0 && answerTimeLeft <= 5) playSound('countdown');
  }, [answerTimeLeft]);

  const findOrJoinRoom = async () => {
    try {
      setPhase('connecting');

      // ابحث عن غرفة waiting
      const { getDocs, collection, query, where, limit } = await import('firebase/firestore');
      const q = query(
        collection(db, 'trivia_rooms'),
        where('status', '==', 'waiting'),
        limit(1)
      );
      const snap = await getDocs(q);

      if (!snap.empty) {
        // انضم كـ Player2
        const roomDoc = snap.docs[0];
        const rId     = roomDoc.id;
        const data    = roomDoc.data();

        await updateDoc(doc(db, 'trivia_rooms', rId), {
          'player2.uid':  myUid,
          'player2.name': myName,
          status:         'ready',
        });

        setRoomId(rId);
        roomIdRef.current = rId;
        setIsPlayer1(false);
        setOpponentName(data.player1?.name ?? 'خصم');
        setRounds(data.rounds ?? []);
        listenToRoom(rId);
        setPhase('lobby');

      } else {
        // أنشئ غرفة جديدة كـ Player1
        const rId = `trivia_${Date.now()}_${myUid.slice(0, 6)}`;

        // جلب أسئلة الفئات أولاً ثم توليد الجولات
        const qMap      = await fetchQuestionsForCategories(categories.map(c => c.id));
        const enriched  = categories.map(c => ({ ...c, questions: qMap[c.id] ?? [] }));
        const genRounds = generateRounds(enriched);

        const roomObj = {
          status:  'waiting',
          createdAt: Date.now(),
          player1: { uid: myUid, name: myName, score: 0, done: false, currentRound: 0 },
          player2: { uid: null,  name: null,   score: 0, done: false, currentRound: 0 },
          rounds:  genRounds,
        };

        await setDoc(doc(db, 'trivia_rooms', rId), roomObj);

        setRoomId(rId);
        roomIdRef.current = rId;
        setIsPlayer1(true);
        setRounds(genRounds);
        listenToRoom(rId);
        setPhase('lobby');

        // Bot بعد 60 ثانية
        botTimeoutRef.current = setTimeout(() => addBot(rId), BOT_WAIT_MS);
      }
    } catch (e) {
      console.error('findOrJoinRoom:', e);
      setError('تعذّر الاتصال بالخادم');
    }
  };

  const addBot = async (rId) => {
    try {
      const snap = await getDoc(doc(db, 'trivia_rooms', rId));
      if (snap.exists() && snap.data().status === 'waiting') {
        await updateDoc(doc(db, 'trivia_rooms', rId), {
          'player2.uid':  'bot',
          'player2.name': '🤖 Bot',
          status:         'ready',
        });
      }
    } catch (e) { console.error('addBot:', e); }
  };

  const listenToRoom = (rId) => {
    unsubRef.current = onSnapshot(doc(db, 'trivia_rooms', rId), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      setRoomData(data);

      // Player1 ← يعرف اسم Player2 عند انضمامه
      if (data.player2?.uid && data.player2.uid !== 'bot') {
        setOpponentName(data.player2.name ?? 'خصم');
        clearTimeout(botTimeoutRef.current);
      } else if (data.player2?.uid === 'bot') {
        setOpponentName('🤖 Bot');
      }

      // بدء اللعب عند ready
      if (data.status === 'ready' && phase !== 'picking' && phase !== 'question') {
        setPhase('picking');
        startPickTimer();
      }

      // كلاهما انتهى → شاشة النتيجة
      if (data.status === 'finished') {
        clearTimers();
        setPhase('finished');
        // تسجيل السكور في البطولة إذا كانت لعبة مصنّفة
        if (onTournamentScore && myScore > 0) {
          onTournamentScore(myScore);
        }
        // تسجيل XP
        const p1 = data.player1 ?? {};
        const p2 = data.player2 ?? {};
        const myD  = isPlayer1 ? p1 : p2;
        const oppD = isPlayer1 ? p2 : p1;
        const iWon = (myD.score ?? myScore) > (oppD.score ?? 0);
        if (onGameEnd) onGameEnd(iWon);
      }

      // الطرف الآخر انتهى أولاً
      const myKey  = isPlayer1 ? 'player1' : 'player2';
      const oppKey = isPlayer1 ? 'player2' : 'player1';
      if (data[oppKey]?.done && !data[myKey]?.done) {
        // لا نفعل شيئاً — اللاعب يكمل جولاته
      }
    });
  };

  // ══════════════════════════════════════════════
  //  المؤقتات
  // ══════════════════════════════════════════════
  const clearTimers = useCallback(() => {
    clearInterval(pickTimerRef.current);
    clearInterval(answerTimerRef.current);
    pickScaleAnim.stopAnimation();
    answerScaleAnim.stopAnimation();
  }, []);

  const startPickTimer = useCallback(() => {
    clearTimers();
    setPickTimeLeft(PICK_SECONDS);
    pickScaleAnim.setValue(1);
    Animated.timing(pickScaleAnim, {
      toValue: 0, duration: PICK_SECONDS * 1000, useNativeDriver: true,
    }).start();
    pickTimerRef.current = setInterval(() => {
      setPickTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(pickTimerRef.current);
          handleAutoPickCategory();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [currentRound, rounds]);

  const startAnswerTimer = useCallback(() => {
    clearInterval(answerTimerRef.current);
    setAnswerTimeLeft(ANSWER_SECONDS);
    answerScaleAnim.setValue(1);
    Animated.timing(answerScaleAnim, {
      toValue: 0, duration: ANSWER_SECONDS * 1000, useNativeDriver: true,
    }).start();
    answerTimerRef.current = setInterval(() => {
      setAnswerTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(answerTimerRef.current);
          handleTimeOut();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const stopAnswerTimer  = useCallback(() => {
    clearInterval(answerTimerRef.current);
    answerScaleAnim.stopAnimation();
  }, []);

  const resumeAnswerTimer = useCallback(() => startAnswerTimer(), [startAnswerTimer]);

  // ══════════════════════════════════════════════
  //  منطق اللعب
  // ══════════════════════════════════════════════
  const handleAutoPickCategory = useCallback(() => {
    const round = rounds[currentRound];
    if (!round) return;
    const cat = round.categories[Math.floor(Math.random() * round.categories.length)];
    handlePickCategory(cat, true);
  }, [currentRound, rounds]);

  const handlePickCategory = useCallback((cat, isAuto = false) => {
    clearInterval(pickTimerRef.current);
    pickScaleAnim.stopAnimation();
    setSelectedCat(cat);
    setChoices(shuffle([cat.correct, ...cat.wrong]));
    setSelectedChoice(null);
    setEliminated(new Set());
    setUsedLifelines(new Set());
    setFrozen(false);
    setPhase('question');
    startAnswerTimer();
  }, [startAnswerTimer]);

  const handleAnswer = useCallback((choice) => {
    if (selectedChoice) return;
    stopAnswerTimer();
    setSelectedChoice(choice);
    const isCorrect = choice === selectedCat?.correct;
    if (isCorrect) {
      setMyScore(prev => prev + currentPoints);
      playSound('correct');
    } else {
      playSound('wrong');
    }
  }, [selectedChoice, selectedCat, currentPoints, stopAnswerTimer]);

  const handleTimeOut = useCallback(() => {
    if (selectedChoice) return;
    setSelectedChoice('__timeout__');
  }, [selectedChoice]);

  const handleNext = useCallback(async () => {
    const nextRound = currentRound + 1;

    if (nextRound >= ROUNDS_TOTAL) {
      // اللاعب انتهى
      const myKey = isPlayer1 ? 'player1' : 'player2';
      try {
        await updateDoc(doc(db, 'trivia_rooms', roomIdRef.current), {
          [`${myKey}.done`]:         true,
          [`${myKey}.score`]:        myScore + (selectedChoice === selectedCat?.correct ? currentPoints : 0),
          [`${myKey}.currentRound`]: nextRound,
        });

        // تحقق لو الطرف الآخر انتهى
        const snap = await getDoc(doc(db, 'trivia_rooms', roomIdRef.current));
        if (snap.exists()) {
          const d      = snap.data();
          const oppKey = isPlayer1 ? 'player2' : 'player1';
          if (d[oppKey]?.done) {
            await updateDoc(doc(db, 'trivia_rooms', roomIdRef.current), { status: 'finished' });
          }
        }
      } catch (e) { console.error('handleNext done:', e); }

      setPhase('waiting');
    } else {
      setCurrentRound(nextRound);
      setSelectedCat(null);
      setSelectedChoice(null);
      setEliminated(new Set());
      setUsedLifelines(new Set());
      setPhase('picking');
      startPickTimer();

      // حدّث Firebase بالجولة الحالية
      const myKey = isPlayer1 ? 'player1' : 'player2';
      try {
        await updateDoc(doc(db, 'trivia_rooms', roomIdRef.current), {
          [`${myKey}.currentRound`]: nextRound,
          [`${myKey}.score`]:        myScore,
        });
      } catch (e) { console.error('handleNext update:', e); }
    }
  }, [currentRound, myScore, isPlayer1, selectedChoice, selectedCat, currentPoints, startPickTimer]);

  // ══════════════════════════════════════════════
  //  وسائل المساعدة
  // ══════════════════════════════════════════════
  const handleSpendTokens = useCallback((cost) => {
    if (tokens < cost) return false;
    setTokens?.(prev => prev - cost);
    return true;
  }, [tokens, setTokens]);

  const markUsed = useCallback((key) => {
    setUsedLifelines(prev => new Set([...prev, key]));
  }, []);

  const handleEliminate = useCallback(() => {
    const wrongChoices = choices.filter(c => c !== selectedCat?.correct && !eliminated.has(c));
    const toRemove = shuffle(wrongChoices).slice(0, 2);
    setEliminated(new Set([...eliminated, ...toRemove]));
  }, [choices, selectedCat, eliminated]);

  const handleSwapSame = useCallback(() => {
    if (!currentRoundData || !selectedCat) return;
    const sameCat = currentRoundData.categories.find(c => c.id === selectedCat.id);
    if (!sameCat) return;
    // في الأونلاين السؤال محدد مسبقاً — نُبلّغ فقط
    Alert.alert('', 'لا يمكن التبديل — السؤال محدد مسبقاً للجولة');
  }, [currentRoundData, selectedCat]);

  const handleSwapRandom = useCallback(() => {
    if (!currentRoundData) return;
    const otherCats = currentRoundData.categories.filter(c => c.id !== selectedCat?.id);
    if (otherCats.length === 0) return;
    const newCat = otherCats[Math.floor(Math.random() * otherCats.length)];
    setSelectedCat(newCat);
    setChoices(shuffle([newCat.correct, ...newCat.wrong]));
    setSelectedChoice(null);
    setEliminated(new Set());
    // وسائل المساعدة لا تتجدد بين الأسئلة — فقط لكل لعبة كاملة
    stopAnswerTimer();
    startAnswerTimer();
  }, [currentRoundData, selectedCat, stopAnswerTimer, startAnswerTimer]);

  // تمديد الوقت: يضيف ثواني للمؤقت بدل التجميد
  const handleExtend = useCallback((extraSeconds) => {
    clearInterval(answerTimerRef.current);
    answerScaleAnim.stopAnimation();
    setAnswerTimeLeft(prev => {
      const newTime = prev + extraSeconds;
      Animated.timing(answerScaleAnim, {
        toValue: 0, duration: newTime * 1000, useNativeDriver: true,
      }).start();
      answerTimerRef.current = setInterval(() => {
        setAnswerTimeLeft(tl => {
          if (tl <= 1) { clearInterval(answerTimerRef.current); return 0; }
          return tl - 1;
        });
      }, 1000);
      return newTime;
    });
  }, []);

  // مشاهدة إعلان = توقف الوقت مؤقتاً
  const handleWatchAdLifeline = useCallback(async () => {
    stopAnswerTimer();
    return new Promise(resolve => setTimeout(() => {
      if (onAdWatched) onAdWatched();
      resolve();
      resumeAnswerTimer();
    }, 2500));
  }, [stopAnswerTimer, resumeAnswerTimer, onAdWatched]);

  // ══════════════════════════════════════════════
  //  الـ UI
  // ══════════════════════════════════════════════

  // ── شاشة الاتصال ──
  if (phase === 'connecting' || phase === 'lobby') {
    const isWaiting = !opponentName;
    return (
      <View style={[styles.container, { backgroundColor: theme.isCityTheme ? 'transparent' : theme.bg }]}>
        <StatusBar barStyle={theme.statusBar} backgroundColor={theme.statusBg} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={onBack}>
            <ExitButton onPress={onBack} />
          </TouchableOpacity>
          <WebScreenButton
            playerUid={myUid}
            playerName={myName}
            gameType="online_trivia"
            gameRoomId={roomId || ''}
            getPublicData={() => ({ phase, round: currentRound })}
            themeName={themeId || 'dark'}
          />
        </View>

        <View style={styles.lobbyCenter}>
          <Text style={styles.lobbyEmoji}>🌐</Text>
          <Text style={[styles.lobbyTitle, { color: theme.accent }]}>
            {phase === 'connecting' ? 'جاري الاتصال...' : isWaiting ? 'بانتظار خصم...' : 'جاهز!'}
          </Text>

          {phase === 'lobby' && (
            <>
              <View style={[styles.playerRow, { backgroundColor: theme.bgCard, borderColor: theme.accentBorder }]}>
                <Text style={styles.playerEmoji}>👤</Text>
                <Text style={[styles.playerName, { color: theme.accent }]}>{myName}</Text>
                <View style={[styles.readyDot, { backgroundColor: theme.success }]} />
              </View>

              <Text style={[styles.vsText, { color: theme.textMuted }]}>VS</Text>

              <View style={[styles.playerRow, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                {isWaiting ? (
                  <>
                    <ActivityIndicator size="small" color={theme.textMuted} />
                    <Text style={[styles.playerName, { color: theme.textMuted }]}>ينتظر خصم...</Text>
                    <Text style={[styles.botNote, { color: theme.textMuted }]}>بوت بعد 60 ثانية</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.playerEmoji}>👤</Text>
                    <Text style={[styles.playerName, { color: theme.purple }]}>{opponentName}</Text>
                    <View style={[styles.readyDot, { backgroundColor: theme.success }]} />
                  </>
                )}
              </View>
            </>
          )}

          {phase === 'connecting' && <ActivityIndicator size="large" color={theme.accent} style={{ marginTop: 20 }} />}
          {error && <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>}
        </View>
      </View>
    );
  }

  // ── انتهى اللاعب، ينتظر الخصم ──
  if (phase === 'waiting') {
    const oppData = roomData?.[isPlayer1 ? 'player2' : 'player1'];
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: theme.isCityTheme ? 'transparent' : theme.bg }]}>
        <StatusBar barStyle={theme.statusBar} backgroundColor={theme.statusBg} />
        <Text style={styles.waitEmoji}>⏳</Text>
        <Text style={[styles.waitTitle, { color: theme.accent }]}>أنهيت اللعبة!</Text>
        <Text style={[styles.waitScore, { color: theme.accent }]}>نقاطك: {myScore}</Text>
        <Text style={[styles.waitSub, { color: theme.textMuted }]}>
          {oppData?.name ?? 'الخصم'} ما زال يلعب...
        </Text>
        <View style={[styles.waitProgress, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
          <Text style={[styles.waitProgressText, { color: theme.textMuted }]}>
            جولة {oppData?.currentRound ?? 0} / {ROUNDS_TOTAL}
          </Text>
          <View style={[styles.waitProgressBar, { backgroundColor: theme.bgInput }]}>
            <View style={[
              styles.waitProgressFill,
              {
                backgroundColor: theme.purple,
                width: `${((oppData?.currentRound ?? 0) / ROUNDS_TOTAL) * 100}%`,
              },
            ]} />
          </View>
        </View>
        <ActivityIndicator size="large" color={theme.accent} style={{ marginTop: 24 }} />
      </View>
    );
  }

  // ── شاشة النتيجة ──
  if (phase === 'finished') {
    const p1Data = roomData?.player1 ?? {};
    const p2Data = roomData?.player2 ?? {};
    const myData  = isPlayer1 ? p1Data : p2Data;
    const oppData = isPlayer1 ? p2Data : p1Data;
    const iWon    = (myData.score ?? myScore) > (oppData.score ?? 0);
    const isDraw  = (myData.score ?? myScore) === (oppData.score ?? 0);

    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: theme.isCityTheme ? 'transparent' : theme.bg }]}>
        <StatusBar barStyle={theme.statusBar} backgroundColor={theme.statusBg} />
        <Text style={styles.resultEmoji}>{isDraw ? '🤝' : iWon ? '🏆' : '😔'}</Text>
        <Text style={[styles.resultTitle, { color: isDraw ? theme.accent : iWon ? '#f59e0b' : theme.textMuted }]}>
          {isDraw ? 'تعادل!' : iWon ? 'فزت!' : 'خسرت!'}
        </Text>

        <View style={[styles.scoresRow, { gap: 16 }]}>
          {/* أنا */}
          <View style={[styles.scoreCard, {
            backgroundColor: theme.bgCard,
            borderColor: iWon ? '#f59e0b' : theme.accentBorder,
            borderWidth: iWon ? 2 : 1,
          }]}>
            <Text style={styles.scoreCardEmoji}>👤</Text>
            <Text style={[styles.scoreCardName, { color: theme.accent }]} numberOfLines={1}>{myName}</Text>
            <Text style={[styles.scoreCardScore, { color: theme.accent }]}>{myData.score ?? myScore}</Text>
            <Text style={[styles.scoreCardLabel, { color: theme.textMuted }]}>نقطة</Text>
          </View>

          <Text style={[styles.vsResult, { color: theme.textMuted }]}>VS</Text>

          {/* الخصم */}
          <View style={[styles.scoreCard, {
            backgroundColor: theme.bgCard,
            borderColor: !iWon && !isDraw ? '#f59e0b' : theme.border,
            borderWidth: !iWon && !isDraw ? 2 : 1,
          }]}>
            <Text style={styles.scoreCardEmoji}>👤</Text>
            <Text style={[styles.scoreCardName, { color: theme.purple }]} numberOfLines={1}>{oppData.name ?? 'الخصم'}</Text>
            <Text style={[styles.scoreCardScore, { color: theme.purple }]}>{oppData.score ?? 0}</Text>
            <Text style={[styles.scoreCardLabel, { color: theme.textMuted }]}>نقطة</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.doneBtn, { backgroundColor: theme.accent }]}
          onPress={onBack}
          activeOpacity={0.85}
        >
          <Text style={[styles.doneBtnText, { color: theme.textOnAccent }]}>العودة للرئيسية</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── شاشة اختيار الفئة ──
  if (phase === 'picking') {
    const round = rounds[currentRound];
    return (
      <View style={[styles.container, { backgroundColor: theme.isCityTheme ? 'transparent' : theme.bg }]}>
        <StatusBar barStyle={theme.statusBar} backgroundColor={theme.statusBg} />

        {/* هيدر */}
        <View style={styles.gameHeader}>
          <View style={[styles.scorePill, { backgroundColor: theme.bgCard, borderColor: theme.accentBorder }]}>
            <Text style={[styles.scorePillText, { color: theme.accent }]}>🎯 {myScore}</Text>
          </View>
          <View style={[styles.levelBadge, { backgroundColor: levelColor }]}>
            <Text style={styles.levelBadgeText}>مستوى {currentLevel} · {currentPoints}ن</Text>
          </View>
          <View style={[styles.roundPill, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
            <Text style={[styles.roundPillText, { color: theme.textMuted }]}>{currentRound + 1}/{ROUNDS_TOTAL}</Text>
          </View>
        </View>

        {/* مؤقت الاختيار */}
        <TimerBar scaleAnim={pickScaleAnim} timeLeft={pickTimeLeft} total={PICK_SECONDS} theme={theme} />

        <Text style={[styles.pickTitle, { color: theme.textPrimary }]}>اختر فئة</Text>

        <View style={styles.catsRow}>
          {(round?.categories ?? []).map((cat, i) => (
            <CategoryCard
              key={cat.id + i}
              cat={cat}
              onPress={handlePickCategory}
              levelColor={levelColor}
              disabled={false}
              theme={theme}
            />
          ))}
        </View>

        {/* بار التقدم */}
        <View style={[styles.progressBar, { backgroundColor: theme.bgCard }]}>
          <View style={[styles.progressFill, {
            backgroundColor: levelColor,
            width: `${((currentRound) / ROUNDS_TOTAL) * 100}%`,
          }]} />
        </View>
      </View>
    );
  }

  // ── شاشة السؤال ──
  const isAnswered = !!selectedChoice;
  const isTimeout  = selectedChoice === '__timeout__';

  const getChoiceStyle = (choice) => {
    if (eliminated.has(choice)) return [styles.choiceBtn, { opacity: 0.2 }];
    const base = { backgroundColor: theme.bgCard, borderColor: theme.borderCard };
    if (!isAnswered) return [styles.choiceBtn, base];
    if (choice === selectedCat?.correct) return [styles.choiceBtn, { backgroundColor: theme.success + '22', borderColor: '#4aff4a' }];
    if (choice === selectedChoice)       return [styles.choiceBtn, { backgroundColor: theme.error + '22', borderColor: '#ff4444' }];
    return [styles.choiceBtn, base, { opacity: 0.4 }];
  };

  const getTextColor = (choice) => {
    if (eliminated.has(choice)) return theme.textMuted;
    if (!isAnswered) return theme.textPrimary;
    if (choice === selectedCat?.correct) return '#4aff4a';
    if (choice === selectedChoice) return '#ff4444';
    return theme.textMuted;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.isCityTheme ? 'transparent' : theme.bg }]}>
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.statusBg} />

      {/* هيدر */}
      <View style={styles.gameHeader}>
        <View style={[styles.catChip, { backgroundColor: levelColor }]}>
          <Text style={styles.catChipEmoji}>{selectedCat?.emoji}</Text>
          <Text style={styles.catChipText} numberOfLines={1}>{selectedCat?.name}</Text>
        </View>
        <View style={[styles.scorePill, { backgroundColor: theme.bgCard, borderColor: theme.accentBorder }]}>
          <Text style={[styles.scorePillText, { color: theme.accent }]}>🎯 {myScore}</Text>
        </View>
        <View style={[styles.scorePill, { backgroundColor: theme.bgCard, borderColor: theme.accentBorder }]}>
          <Text style={[styles.scorePillText, { color: theme.accent }]}>🪙 {tokens}</Text>
        </View>
        <WebScreenButton
          playerUid={myUid}
          playerName={myName}
          gameType="online_trivia"
          gameRoomId={roomId || ''}
          getPublicData={() => ({ round: currentRound, myScore })}
          themeName={themeId || 'dark'}
        />
      </View>

      {/* مؤقت الإجابة */}
      {!frozen ? (
        <TimerBar scaleAnim={answerScaleAnim} timeLeft={answerTimeLeft} total={ANSWER_SECONDS} theme={theme} />
      ) : (
        <View style={[styles.frozenBar, { backgroundColor: '#3b82f633', borderColor: '#3b82f660' }]}>
          <Text style={[styles.frozenText, { color: '#3b82f6' }]}>⏸ الوقت مجمّد</Text>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 24 }}>

        {/* نقاط الجولة */}
        <View style={[styles.levelBadge, { backgroundColor: levelColor, alignSelf: 'center' }]}>
          <Text style={styles.levelBadgeText}>{currentPoints} نقطة</Text>
        </View>

        {/* السؤال */}
        <View style={[styles.questionBox, { backgroundColor: theme.bgCard, borderColor: theme.borderCard }]}>
          <Text style={[styles.questionText, { color: theme.textPrimary }]}>
            {selectedCat?.question}
          </Text>
        </View>

        {/* وسائل المساعدة */}
        {!isAnswered && (
          <LifelinesBar
            mode="online"
            tokens={tokens}
            onSpendTokens={handleSpendTokens}
            onWatchAd={handleWatchAdLifeline}
            onEliminate={handleEliminate}
            onSwapRandom={handleSwapRandom}
            onSwapSame={handleSwapSame}
            onTimerPause={stopAnswerTimer}
            onTimerResume={resumeAnswerTimer}
            onTimerExtend={handleExtend}
            usedLifelines={usedLifelines}
            onLifelineUsed={markUsed}
          />
        )}

        {/* الخيارات */}
        <View style={styles.choicesContainer}>
          {choices.map((choice, i) => (
            <TouchableOpacity
              key={i}
              style={getChoiceStyle(choice)}
              onPress={() => handleAnswer(choice)}
              disabled={isAnswered || eliminated.has(choice)}
              activeOpacity={0.85}
            >
              <Text style={[styles.choiceLetter, { color: theme.accent }]}>{ARABIC_LETTERS[i]}</Text>
              <Text style={[styles.choiceText, { color: getTextColor(choice) }]}>{choice}</Text>
              {isAnswered && choice === selectedCat?.correct && <Text>✅</Text>}
              {isAnswered && choice === selectedChoice && choice !== selectedCat?.correct && <Text>❌</Text>}
            </TouchableOpacity>
          ))}
        </View>

        {/* timeout */}
        {isTimeout && (
          <View style={[styles.timeoutBox, { backgroundColor: theme.error + '22', borderColor: '#ff444455' }]}>
            <Text style={[styles.timeoutText, { color: theme.error }]}>⏰ انتهى الوقت!</Text>
            <Text style={[styles.timeoutAnswer, { color: theme.textPrimary }]}>
              الإجابة: {selectedCat?.correct}
            </Text>
          </View>
        )}

        {/* زر التالي */}
        {isAnswered && (
          <TouchableOpacity
            style={[styles.nextBtn, { backgroundColor: theme.accent }]}
            onPress={handleNext}
            activeOpacity={0.85}
          >
            <Text style={[styles.nextBtnText, { color: theme.textOnAccent }]}>
              {currentRound + 1 >= ROUNDS_TOTAL ? 'إنهاء اللعبة' : 'الجولة التالية ←'}
            </Text>
          </TouchableOpacity>
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
  container:         { flex: 1, paddingTop: 50, paddingHorizontal: 20 },
  centerContent:     { justifyContent: 'center', alignItems: 'center', gap: 16 },
  backBtn:           { alignSelf: 'flex-start', width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  backText:          { fontSize: 20, fontWeight: '700' },

  // Lobby
  lobbyCenter:       { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  lobbyEmoji:        { fontSize: 64 },
  lobbyTitle:        { fontSize: 22, fontWeight: '900', textAlign: 'center' },
  playerRow:         { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 16, borderWidth: 1, width: '100%' },
  playerEmoji:       { fontSize: 22 },
  playerName:        { flex: 1, fontSize: 16, fontWeight: '700' },
  readyDot:          { width: 10, height: 10, borderRadius: 5 },
  botNote:           { fontSize: 11 },
  vsText:            { fontSize: 18, fontWeight: '900' },
  errorText:         { fontSize: 14, textAlign: 'center', marginTop: 12 },

  // Waiting
  waitEmoji:         { fontSize: 64 },
  waitTitle:         { fontSize: 24, fontWeight: '900' },
  waitScore:         { fontSize: 32, fontWeight: '900' },
  waitSub:           { fontSize: 14, textAlign: 'center' },
  waitProgress:      { width: '100%', borderRadius: 14, borderWidth: 1, padding: 14, gap: 8 },
  waitProgressText:  { fontSize: 13, fontWeight: '700', textAlign: 'center' },
  waitProgressBar:   { height: 8, borderRadius: 4, overflow: 'hidden' },
  waitProgressFill:  { height: '100%', borderRadius: 4 },

  // Result
  resultEmoji:       { fontSize: 80 },
  resultTitle:       { fontSize: 32, fontWeight: '900' },
  scoresRow:         { flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'center' },
  scoreCard:         { flex: 1, borderRadius: 20, padding: 20, alignItems: 'center', gap: 6 },
  scoreCardEmoji:    { fontSize: 28 },
  scoreCardName:     { fontSize: 14, fontWeight: '700', textAlign: 'center' },
  scoreCardScore:    { fontSize: 36, fontWeight: '900' },
  scoreCardLabel:    { fontSize: 12 },
  vsResult:          { fontSize: 18, fontWeight: '900', paddingHorizontal: 8 },
  doneBtn:           { paddingVertical: 16, paddingHorizontal: 40, borderRadius: 16, marginTop: 8 },
  doneBtnText:       { fontSize: 16, fontWeight: '800' },

  // Game Header
  gameHeader:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 8 },
  scorePill:         { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  scorePillText:     { fontSize: 13, fontWeight: '700' },
  levelBadge:        { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12 },
  levelBadgeText:    { color: '#fff', fontSize: 12, fontWeight: '800' },
  roundPill:         { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  roundPillText:     { fontSize: 12, fontWeight: '700' },

  // Timer
  timerContainer:    { height: 28, borderRadius: 14, overflow: 'hidden', justifyContent: 'center', marginBottom: 8 },
  timerBarFill:      { position: 'absolute', left: 0, top: 0, bottom: 0, width: '100%', borderRadius: 14 },
  timerText:         { color: '#fff', fontSize: 13, fontWeight: '900', textAlign: 'center', zIndex: 1 },
  frozenBar:         { height: 28, borderRadius: 14, borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  frozenText:        { fontSize: 13, fontWeight: '800' },

  // Picking
  pickTitle:         { fontSize: 18, fontWeight: '800', textAlign: 'center', marginVertical: 8 },
  catsRow:           { flexDirection: 'row', gap: 12, flex: 1 },
  catCard:           { flex: 1, borderRadius: 20, alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1.5, padding: 12 },
  catEmoji:          { fontSize: 36 },
  catName:           { fontSize: 13, fontWeight: '700', textAlign: 'center' },
  progressBar:       { height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 8 },
  progressFill:      { height: '100%', borderRadius: 3 },

  // Question
  catChip:           { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, maxWidth: '50%' },
  catChipEmoji:      { fontSize: 14 },
  catChipText:       { color: '#fff', fontSize: 12, fontWeight: '700' },
  questionBox:       { borderRadius: 20, padding: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, minHeight: 110 },
  questionText:      { fontSize: 19, fontWeight: '700', textAlign: 'center', lineHeight: 30 },
  choicesContainer:  { gap: 10 },
  choiceBtn:         { borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', gap: 12 },
  choiceLetter:      { fontSize: 16, fontWeight: '900', width: 24, textAlign: 'center' },
  choiceText:        { fontSize: 15, fontWeight: '600', flex: 1, textAlign: 'right' },
  timeoutBox:        { borderRadius: 14, padding: 14, alignItems: 'center', gap: 6, borderWidth: 1 },
  timeoutText:       { fontSize: 16, fontWeight: '800' },
  timeoutAnswer:     { fontSize: 14, fontWeight: '600' },
  nextBtn:           { paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  nextBtnText:       { fontSize: 17, fontWeight: '800' },
});
 
