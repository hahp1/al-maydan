import { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  StatusBar, Animated, Alert, ActivityIndicator, Image,
} from 'react-native';
import { db, auth } from './firebaseConfig';
import {
  collection, doc, setDoc, getDoc, getDocs,
  onSnapshot, updateDoc, query, where,
  serverTimestamp, deleteDoc,
} from 'firebase/firestore';

// ── ثوابت ──
const TOTAL_ROUNDS = 15;
const PICK_SECONDS = 10;
const ANSWER_SECONDS = 15;

const LEVEL_POINTS = { 1: 100, 2: 200, 3: 300, 4: 400, 5: 500 };

function getRoundLevel(round) {
  if (round <= 3) return 1;
  if (round <= 6) return 2;
  if (round <= 9) return 3;
  if (round <= 12) return 4;
  return 5;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// فلتر الأسئلة — نصوص وصور فقط
function filterQuestions(questions, level) {
  return questions.filter(q =>
    q.level === level &&
    !q.videoUrl &&
    !q.audioUrl
  );
}

function pickThreeCategories(categories) {
  const valid = categories.filter(c => (c.questions || []).length > 0);
  return shuffle(valid).slice(0, 3);
}

function pickQuestion(category, level) {
  const pool = filterQuestions(category.questions || [], level);
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ══════════════════════════════════════════
export default function OnlineGameScreen({ onBack, categories = [], currentUser }) {
  const [phase, setPhase] = useState('searching'); // searching|waiting|picking|question|roundResult|finished
  const [roomId, setRoomId] = useState(null);
  const [roomData, setRoomData] = useState(null);
  const [isPlayer1, setIsPlayer1] = useState(false);
  const [myChoices, setMyChoices] = useState([]);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [shuffledChoices, setShuffledChoices] = useState([]);
  const [timeLeft, setTimeLeft] = useState(PICK_SECONDS);
  const timerRef = useRef(null);
  const timerAnim = useRef(new Animated.Value(1)).current;
  const unsubRef = useRef(null);
  const myUid = auth.currentUser?.uid;

  // ── البحث عن غرفة أو إنشاء واحدة ──
  useEffect(() => {
    findOrCreateRoom();
    return () => {
      clearInterval(timerRef.current);
      if (unsubRef.current) unsubRef.current();
    };
  }, []);

  const findOrCreateRoom = async () => {
    try {
      // ابحث عن غرفة تنتظر
      const q = query(
        collection(db, 'rooms'),
        where('status', '==', 'waiting'),
        where('player2.uid', '==', null)
      );
      const snap = await getDocs(q);

      if (!snap.empty) {
        // انضم لغرفة موجودة
        const roomDoc = snap.docs[0];
        const rId = roomDoc.id;
        await updateDoc(doc(db, 'rooms', rId), {
          'player2.uid': myUid,
          'player2.name': currentUser?.name || 'لاعب',
          'player2.score': 0,
          'player2.answer': null,
          'player2.answeredAt': null,
          status: 'picking',
        });
        setRoomId(rId);
        setIsPlayer1(false);
        listenToRoom(rId);
      } else {
        // أنشئ غرفة جديدة
        const rId = `room_${Date.now()}_${myUid?.slice(0, 6)}`;
        await setDoc(doc(db, 'rooms', rId), {
          status: 'waiting',
          player1: { uid: myUid, name: currentUser?.name || 'لاعب', score: 0, answer: null, answeredAt: null },
          player2: { uid: null, name: null, score: 0, answer: null, answeredAt: null },
          currentRound: 1,
          threeCategories: [],
          currentQuestion: null,
          pickStartTime: null,
          questionStartTime: null,
          winner: null,
          createdAt: serverTimestamp(),
        });
        setRoomId(rId);
        setIsPlayer1(true);
        setPhase('waiting');
        listenToRoom(rId);
      }
    } catch (e) {
      Alert.alert('خطأ', e.message);
    }
  };

  // ── الاستماع للغرفة ──
  const listenToRoom = (rId) => {
    const unsub = onSnapshot(doc(db, 'rooms', rId), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      setRoomData(data);
      handleRoomUpdate(data, rId);
    });
    unsubRef.current = unsub;
  };

  const handleRoomUpdate = (data, rId) => {
    const amP1 = data.player1?.uid === myUid;

    if (data.status === 'waiting') {
      setPhase('waiting');
      return;
    }

    if (data.status === 'picking') {
      clearInterval(timerRef.current);
      const three = data.threeCategories || [];

      // لو الفئات فارغة وأنا المفروض أختار — أنشئها
      if (three.length === 0) {
        const isMyTurn = data.currentRound % 2 === 1 ? amP1 : !amP1;
        if (isMyTurn) {
          const picked = pickThreeCategories(categories);
          updateDoc(doc(db, 'rooms', rId), {
            threeCategories: picked.map(c => ({ id: c.id, name: c.name, emoji: c.emoji })),
            pickStartTime: Date.now(),
          });
        }
        return;
      }

      setMyChoices(three);
      setPhase('picking');
      startTimer(PICK_SECONDS, () => handleAutoPickCategory(data, rId, three));
      return;
    }

    if (data.status === 'question') {
      clearInterval(timerRef.current);
      const q = data.currentQuestion;
      if (!q) return;
      const choices = shuffle([q.correct, ...(q.wrong || [])]);
      setShuffledChoices(choices);
      setSelectedAnswer(null);
      setPhase('question');
      startTimer(ANSWER_SECONDS, () => handleTimeOut(data, rId));
      return;
    }

    if (data.status === 'roundResult') {
      clearInterval(timerRef.current);
      setPhase('roundResult');
      // بعد 3 ثواني انتقل للجولة التالية
      setTimeout(() => {
        if (amP1) advanceRound(data, rId);
      }, 3000);
      return;
    }

    if (data.status === 'finished') {
      clearInterval(timerRef.current);
      setPhase('finished');
      return;
    }
  };

  // ── عداد الوقت ──
  const startTimer = (seconds, onEnd) => {
    clearInterval(timerRef.current);
    setTimeLeft(seconds);
    timerAnim.setValue(1);
    Animated.timing(timerAnim, {
      toValue: 0,
      duration: seconds * 1000,
      useNativeDriver: false,
    }).start();

    let t = seconds;
    timerRef.current = setInterval(() => {
      t -= 1;
      setTimeLeft(t);
      if (t <= 0) {
        clearInterval(timerRef.current);
        onEnd();
      }
    }, 1000);
  };

  // ── اختيار الفئة ──
  const handlePickCategory = async (cat) => {
    if (!roomId || !roomData) return;
    clearInterval(timerRef.current);
    const level = getRoundLevel(roomData.currentRound);
    const fullCat = categories.find(c => c.id === cat.id);
    const q = fullCat ? pickQuestion(fullCat, level) : null;

    if (!q) {
      Alert.alert('تنبيه', 'لا توجد أسئلة مناسبة في هذه الفئة!');
      return;
    }

    await updateDoc(doc(db, 'rooms', roomId), {
      status: 'question',
      currentQuestion: {
        id: q.id || `q_${Date.now()}`,
        question: q.question || q.text,
        correct: q.correct || q.answer,
        wrong: q.wrong || [],
        imageUrl: q.imageUrl || null,
      },
      'player1.answer': null,
      'player1.answeredAt': null,
      'player2.answer': null,
      'player2.answeredAt': null,
      questionStartTime: Date.now(),
    });
  };

  // ── اختيار تلقائي لو انتهى وقت الاختيار ──
  const handleAutoPickCategory = async (data, rId, three) => {
    const isMyTurn = data.currentRound % 2 === 1 ? data.player1?.uid === myUid : data.player2?.uid === myUid;
    if (!isMyTurn) return;
    const randomCat = three[Math.floor(Math.random() * three.length)];
    await handlePickCategory(randomCat);
  };

  // ── الإجابة ──
  const handleAnswer = async (choice) => {
    if (selectedAnswer || !roomId || !roomData) return;
    clearInterval(timerRef.current);
    setSelectedAnswer(choice);

    const field = isPlayer1 ? 'player1' : 'player2';
    await updateDoc(doc(db, 'rooms', roomId), {
      [`${field}.answer`]: choice,
      [`${field}.answeredAt`]: Date.now(),
    });

    // تحقق لو كلا اللاعبين أجابا
    checkBothAnswered(roomData, choice);
  };

  // ── انتهى الوقت بدون إجابة ──
  const handleTimeOut = async (data, rId) => {
    const field = isPlayer1 ? 'player1' : 'player2';
    const myAnswer = isPlayer1 ? data.player1?.answer : data.player2?.answer;
    if (!myAnswer) {
      await updateDoc(doc(db, 'rooms', rId), {
        [`${field}.answer`]: '__timeout__',
        [`${field}.answeredAt`]: Date.now(),
      });
    }
  };

  // ── تحقق لو كلا اللاعبين أجابا ──
  const checkBothAnswered = async (data, myChoice) => {
    const p1Answer = isPlayer1 ? myChoice : data.player1?.answer;
    const p2Answer = isPlayer1 ? data.player2?.answer : myChoice;

    if (p1Answer && p2Answer) {
      await showRoundResult(data);
    }
  };

  // ── إظهار نتيجة الجولة وتحديث النقاط ──
  const showRoundResult = async (data) => {
    if (!roomId) return;
    const q = data.currentQuestion;
    const level = getRoundLevel(data.currentRound);
    const pts = LEVEL_POINTS[level];

    let p1Score = data.player1?.score || 0;
    let p2Score = data.player2?.score || 0;

    if (data.player1?.answer === q?.correct) p1Score += pts;
    if (data.player2?.answer === q?.correct) p2Score += pts;

    await updateDoc(doc(db, 'rooms', roomId), {
      status: 'roundResult',
      'player1.score': p1Score,
      'player2.score': p2Score,
    });
  };

  // ── الانتقال للجولة التالية (player1 فقط يقود) ──
  const advanceRound = async (data, rId) => {
    const nextRound = (data.currentRound || 1) + 1;

    if (nextRound > TOTAL_ROUNDS) {
      // تحديد الفائز
      const p1 = data.player1?.score || 0;
      const p2 = data.player2?.score || 0;
      let winner = 'draw';
      if (p1 > p2) winner = data.player1?.name;
      else if (p2 > p1) winner = data.player2?.name;

      await updateDoc(doc(db, 'rooms', rId), {
        status: 'finished',
        winner,
      });
      return;
    }

    await updateDoc(doc(db, 'rooms', rId), {
      status: 'picking',
      currentRound: nextRound,
      threeCategories: [],
      currentQuestion: null,
      'player1.answer': null,
      'player1.answeredAt': null,
      'player2.answer': null,
      'player2.answeredAt': null,
    });
  };

  const handleLeave = () => {
    Alert.alert('🚪 مغادرة', 'هل تريد مغادرة اللعبة؟ سيفوز خصمك!', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'مغادرة', style: 'destructive',
        onPress: async () => {
          if (roomId) await deleteDoc(doc(db, 'rooms', roomId));
          onBack();
        }
      }
    ]);
  };

  const myScore = roomData ? (isPlayer1 ? roomData.player1?.score : roomData.player2?.score) : 0;
  const opponentName = roomData ? (isPlayer1 ? roomData.player2?.name : roomData.player1?.name) : '...';
  const currentRound = roomData?.currentRound || 1;
  const level = getRoundLevel(currentRound);
  const pts = LEVEL_POINTS[level];
  const isMyTurn = roomData ? (currentRound % 2 === 1 ? isPlayer1 : !isPlayer1) : false;
  const myName = currentUser?.name || 'أنت';

  const timerColor = timerAnim.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: ['#ff4444', '#ffaa00', '#4aff4a'],
  });

  // ══ شاشة البحث ══
  if (phase === 'searching' || phase === 'waiting') {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0d0d2b" />
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backText}>← رجوع</Text>
        </TouchableOpacity>
        <View style={styles.searchBox}>
          <Text style={styles.searchEmoji}>🌐</Text>
          <Text style={styles.searchTitle}>
            {phase === 'searching' ? 'جاري البحث عن خصم...' : 'في انتظار خصم...'}
          </Text>
          <ActivityIndicator color="#f5c518" size="large" style={{ marginTop: 20 }} />
          <Text style={styles.searchSub}>سيبدأ اللعب تلقائياً عند إيجاد خصم</Text>
        </View>
      </View>
    );
  }

  // ══ شاشة اختيار الفئة ══
  if (phase === 'picking') {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0d0d2b" />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={handleLeave}>
            <Text style={styles.backText}>← خروج</Text>
          </TouchableOpacity>
          <View style={styles.myScoreChip}>
            <Text style={styles.myScoreText}>نقاطك: {myScore}</Text>
          </View>
          <View style={styles.roundChip}>
            <Text style={styles.roundText}>جولة {currentRound}/{TOTAL_ROUNDS}</Text>
          </View>
        </View>

        {/* Level Badge */}
        <View style={[styles.levelBadge, { backgroundColor: getLevelColor(level) }]}>
          <Text style={styles.levelBadgeText}>المستوى {level} — {pts} نقطة</Text>
        </View>

        {/* Timer */}
        <View style={styles.timerContainer}>
          <Animated.View style={[styles.timerBar, {
            width: timerAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
            backgroundColor: timerColor,
          }]} />
          <Text style={styles.timerText}>{timeLeft}s</Text>
        </View>

        {/* Categories */}
        {isMyTurn ? (
          <>
            <Text style={styles.pickTitle}>اختر فئة السؤال القادم</Text>
            <View style={styles.catsContainer}>
              {myChoices.map((cat, i) => (
                <TouchableOpacity
                  key={cat.id + i}
                  style={styles.catCard}
                  onPress={() => handlePickCategory(cat)}
                >
                  <Text style={styles.catEmoji}>{cat.emoji}</Text>
                  <Text style={styles.catName}>{cat.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : (
          <>
            <View style={styles.waitingBox}>
              <Text style={styles.waitingText}>
                ⏳ في انتظار {isMyTurn ? myName : opponentName} لاختيار فئة
              </Text>
            </View>
            <View style={styles.catsContainer}>
              {myChoices.map((cat, i) => (
                <View key={cat.id + i} style={[styles.catCard, styles.catCardDim]}>
                  <Text style={styles.catEmoji}>{cat.emoji}</Text>
                  <Text style={styles.catName}>{cat.name}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </View>
    );
  }

  // ══ شاشة السؤال ══
  if (phase === 'question') {
    const q = roomData?.currentQuestion;
    if (!q) return null;
    const isAnswered = !!selectedAnswer;

    const getChoiceStyle = (choice) => {
      if (!isAnswered) return styles.choiceBtn;
      if (choice === q.correct) return [styles.choiceBtn, styles.choiceCorrect];
      if (choice === selectedAnswer) return [styles.choiceBtn, styles.choiceWrong];
      return [styles.choiceBtn, styles.choiceDim];
    };

    const getChoiceTextStyle = (choice) => {
      if (!isAnswered) return styles.choiceText;
      if (choice === q.correct) return [styles.choiceText, { color: '#4aff4a' }];
      if (choice === selectedAnswer) return [styles.choiceText, { color: '#ff6666' }];
      return [styles.choiceText, { color: '#555' }];
    };

    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0d0d2b" />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={handleLeave}>
            <Text style={styles.backText}>← خروج</Text>
          </TouchableOpacity>
          <View style={styles.myScoreChip}>
            <Text style={styles.myScoreText}>نقاطك: {myScore}</Text>
          </View>
          <View style={styles.roundChip}>
            <Text style={styles.roundText}>جولة {currentRound}/{TOTAL_ROUNDS}</Text>
          </View>
        </View>

        {/* Level Badge */}
        <View style={[styles.levelBadge, { backgroundColor: getLevelColor(level) }]}>
          <Text style={styles.levelBadgeText}>{pts} نقطة</Text>
        </View>

        {/* Timer */}
        <View style={styles.timerContainer}>
          <Animated.View style={[styles.timerBar, {
            width: timerAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
            backgroundColor: timerColor,
          }]} />
          <Text style={styles.timerText}>{timeLeft}s</Text>
        </View>

        {/* Question */}
        <View style={styles.questionBox}>
          {q.imageUrl && (
            <Image source={{ uri: q.imageUrl }} style={styles.questionImage} resizeMode="contain" />
          )}
          <Text style={styles.questionText}>{q.question}</Text>
        </View>

        {/* Choices */}
        <View style={styles.choicesContainer}>
          {shuffledChoices.map((choice, i) => (
            <TouchableOpacity
              key={i}
              style={getChoiceStyle(choice)}
              onPress={() => handleAnswer(choice)}
              disabled={isAnswered}
            >
              <Text style={styles.choiceLetter}>{['أ', 'ب', 'ج', 'د'][i]}</Text>
              <Text style={getChoiceTextStyle(choice)}>{choice}</Text>
              {isAnswered && choice === q.correct && <Text>✅</Text>}
              {isAnswered && choice === selectedAnswer && choice !== q.correct && <Text>❌</Text>}
            </TouchableOpacity>
          ))}
        </View>

        {isAnswered && (
          <View style={styles.waitingAnswerBox}>
            <Text style={styles.waitingAnswerText}>⏳ في انتظار إجابة الخصم...</Text>
          </View>
        )}
      </View>
    );
  }

  // ══ شاشة نتيجة الجولة ══
  if (phase === 'roundResult') {
    const q = roomData?.currentQuestion;
    const myAnswer = isPlayer1 ? roomData?.player1?.answer : roomData?.player2?.answer;
    const isCorrect = myAnswer === q?.correct;

    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0d0d2b" />
        <View style={styles.resultBox}>
          <Text style={styles.resultEmoji}>{isCorrect ? '🎉' : '💔'}</Text>
          <Text style={[styles.resultText, isCorrect ? styles.resultCorrect : styles.resultWrong]}>
            {isCorrect ? 'إجابة صحيحة!' : 'إجابة خاطئة!'}
          </Text>
          <View style={styles.correctAnswerBox}>
            <Text style={styles.correctAnswerLabel}>الإجابة الصحيحة:</Text>
            <Text style={styles.correctAnswerText}>{q?.correct}</Text>
          </View>
          <Text style={styles.myScoreText}>نقاطك: {myScore}</Text>
          <Text style={styles.nextRoundText}>الجولة التالية...</Text>
        </View>
      </View>
    );
  }

  // ══ شاشة النهاية ══
  if (phase === 'finished') {
    const myFinalScore = isPlayer1 ? roomData?.player1?.score : roomData?.player2?.score;
    const opponentScore = isPlayer1 ? roomData?.player2?.score : roomData?.player1?.score;
    const winner = roomData?.winner;
    const iWon = winner === myName;
    const isDraw = winner === 'draw';

    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0d0d2b" />
        <Text style={styles.finishEmoji}>{isDraw ? '🤝' : iWon ? '🏆' : '😔'}</Text>
        <Text style={styles.finishTitle}>
          {isDraw ? 'تعادل!' : iWon ? 'فزت!' : 'خسرت!'}
        </Text>

        <View style={styles.scoresBox}>
          <View style={styles.scoreCard}>
            <Text style={styles.scoreCardName}>أنت</Text>
            <Text style={styles.scoreCardNum}>{myFinalScore}</Text>
            <Text style={styles.scoreCardLabel}>نقطة</Text>
          </View>
          <Text style={styles.vsText}>VS</Text>
          <View style={styles.scoreCard}>
            <Text style={styles.scoreCardName}>{opponentName}</Text>
            <Text style={styles.scoreCardNum}>{opponentScore}</Text>
            <Text style={styles.scoreCardLabel}>نقطة</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.playAgainBtn} onPress={() => {
          if (unsubRef.current) unsubRef.current();
          findOrCreateRoom();
          setPhase('searching');
        }}>
          <Text style={styles.playAgainText}>🔄 لعبة جديدة</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.homeBtn} onPress={onBack}>
          <Text style={styles.homeBtnText}>🏠 الرئيسية</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return null;
}

function getLevelColor(level) {
  const colors = { 1: '#1a3a6e', 2: '#1a5a3a', 3: '#5a5a00', 4: '#7a3a00', 5: '#7a1a1a' };
  return colors[level] || '#1a1a3e';
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#0d0d2b',
    paddingTop: 50, paddingHorizontal: 20, gap: 14,
  },
  backBtn: { padding: 8 },
  backText: { color: '#f5c518', fontSize: 16, fontWeight: '700' },

  // البحث
  searchBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  searchEmoji: { fontSize: 80 },
  searchTitle: { color: '#f5c518', fontSize: 22, fontWeight: '900', textAlign: 'center' },
  searchSub: { color: '#a09060', fontSize: 14, textAlign: 'center' },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  myScoreChip: {
    backgroundColor: '#1a1a3e', paddingHorizontal: 14,
    paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: '#f5c51855',
  },
  myScoreText: { color: '#f5c518', fontSize: 14, fontWeight: '700' },
  roundChip: {
    backgroundColor: '#1a1a3e', paddingHorizontal: 12,
    paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: '#2a2a55',
  },
  roundText: { color: '#a09060', fontSize: 13, fontWeight: '700' },

  // Level
  levelBadge: {
    paddingVertical: 8, paddingHorizontal: 16,
    borderRadius: 12, alignSelf: 'center',
  },
  levelBadgeText: { color: '#fff', fontSize: 14, fontWeight: '800' },

  // Timer
  timerContainer: {
    height: 28, backgroundColor: '#1a1a3e',
    borderRadius: 14, overflow: 'hidden', justifyContent: 'center',
  },
  timerBar: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 14 },
  timerText: { color: '#fff', fontSize: 13, fontWeight: '900', textAlign: 'center', zIndex: 1 },

  // Picking
  pickTitle: { color: '#fff', fontSize: 18, fontWeight: '800', textAlign: 'center' },
  waitingBox: {
    backgroundColor: '#1a1a3e', borderRadius: 14,
    padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: '#f5c51833',
  },
  waitingText: { color: '#f5c518', fontSize: 15, fontWeight: '700', textAlign: 'center' },
  catsContainer: { flex: 1, flexDirection: 'row', gap: 12, alignItems: 'stretch' },
  catCard: {
    flex: 1, backgroundColor: '#1a1a3e', borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    gap: 10, borderWidth: 1.5, borderColor: '#2a2a55', padding: 12,
  },
  catCardDim: { opacity: 0.5 },
  catEmoji: { fontSize: 36 },
  catName: { color: '#fff', fontSize: 13, fontWeight: '700', textAlign: 'center' },

  // Question
  questionBox: {
    backgroundColor: '#1a1a3e', borderRadius: 20,
    padding: 20, alignItems: 'center',
    borderWidth: 1.5, borderColor: '#2a2a55', gap: 12,
    minHeight: 120,
  },
  questionImage: { width: '100%', height: 150, borderRadius: 12 },
  questionText: { color: '#fff', fontSize: 20, fontWeight: '700', textAlign: 'center', lineHeight: 30 },
  choicesContainer: { gap: 10 },
  choiceBtn: {
    backgroundColor: '#1a1a3e', borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 16,
    borderWidth: 1.5, borderColor: '#2a2a55',
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  choiceCorrect: { backgroundColor: '#1a3a1a', borderColor: '#4aff4a' },
  choiceWrong: { backgroundColor: '#3a1a1a', borderColor: '#ff4444' },
  choiceDim: { opacity: 0.4 },
  choiceLetter: { color: '#f5c518', fontSize: 16, fontWeight: '900', width: 24, textAlign: 'center' },
  choiceText: { color: '#fff', fontSize: 15, fontWeight: '600', flex: 1, textAlign: 'right' },
  waitingAnswerBox: {
    backgroundColor: '#1a1a3e', borderRadius: 12,
    padding: 12, alignItems: 'center',
  },
  waitingAnswerText: { color: '#a09060', fontSize: 14 },

  // Round Result
  resultBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  resultEmoji: { fontSize: 60 },
  resultText: { fontSize: 28, fontWeight: '900' },
  resultCorrect: { color: '#4aff4a' },
  resultWrong: { color: '#ff6666' },
  correctAnswerBox: {
    backgroundColor: '#1a3a1a', borderRadius: 14,
    padding: 16, alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: '#2a5a2a', width: '100%',
  },
  correctAnswerLabel: { color: '#a09060', fontSize: 13 },
  correctAnswerText: { color: '#4aff4a', fontSize: 20, fontWeight: '800', textAlign: 'center' },
  nextRoundText: { color: '#555577', fontSize: 13 },

  // Finished
  finishEmoji: { fontSize: 80, textAlign: 'center', marginTop: 20 },
  finishTitle: { color: '#f5c518', fontSize: 36, fontWeight: '900', textAlign: 'center' },
  scoresBox: { flexDirection: 'row', alignItems: 'center', gap: 16, width: '100%' },
  scoreCard: {
    flex: 1, backgroundColor: '#1a1a3e', borderRadius: 16,
    padding: 20, alignItems: 'center', gap: 4,
    borderWidth: 1.5, borderColor: '#2a2a55',
  },
  scoreCardName: { color: '#a09060', fontSize: 14, fontWeight: '700' },
  scoreCardNum: { color: '#f5c518', fontSize: 36, fontWeight: '900' },
  scoreCardLabel: { color: '#555577', fontSize: 12 },
  vsText: { color: '#555577', fontSize: 18, fontWeight: '900' },
  playAgainBtn: {
    backgroundColor: '#f5c518', paddingVertical: 16,
    borderRadius: 16, alignItems: 'center', width: '100%',
  },
  playAgainText: { color: '#0d0d2b', fontSize: 18, fontWeight: '800' },
  homeBtn: {
    backgroundColor: '#1a1a3e', paddingVertical: 14,
    borderRadius: 16, alignItems: 'center', width: '100%',
    borderWidth: 1, borderColor: '#f5c51833',
  },
  homeBtnText: { color: '#f5c518', fontSize: 16, fontWeight: '700' },
});
