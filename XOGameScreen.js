import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, Animated, Alert, ActivityIndicator,
  Modal, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { db, auth } from './firebaseConfig';
import {
  doc, setDoc, getDocs, onSnapshot,
  updateDoc, query, where, deleteDoc,
  collection, serverTimestamp,
} from 'firebase/firestore';

// ══════════════════════════════════════════
// ثوابت
// ══════════════════════════════════════════
const TOTAL_ROUNDS = 7;

const WINNING_LINES = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6],
];

function checkWinner(board) {
  for (const [a,b,c] of WINNING_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c])
      return { winner: board[a], line: [a,b,c] };
  }
  if (board.every(Boolean)) return { winner: 'draw', line: [] };
  return null;
}

function emptyBoard() { return Array(9).fill(null); }

function getOrCreateUid() {
  const fromAuth = auth.currentUser?.uid;
  if (fromAuth) return fromAuth;
  if (!global._guestUid)
    global._guestUid = 'guest_' + Math.random().toString(36).slice(2,10) + '_' + Date.now();
  return global._guestUid;
}

// ══════════════════════════════════════════
// شاشة الاختيار (محلي / أونلاين)
// ══════════════════════════════════════════
function ModeSelect({ onLocal, onOnline, onBack }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#06061a" />

      {/* هيدر */}
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>→</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerEmoji}>✕○</Text>
          <Text style={styles.headerTitle}>إكس أو</Text>
        </View>
        <View style={{ width: 40 }} />
      </Animated.View>

      {/* شرح اللعبة */}
      <Animated.View style={[styles.infoBox, { opacity: fadeAnim }]}>
        <Text style={styles.infoTitle}>📖 كيفية اللعب</Text>
        <Text style={styles.infoText}>
          {'• 7 جولات — من يفوز بأكثر يفوز\n• كل جولة على شبكة 3×3\n• أكمل صفاً أو عموداً أو قطراً\n• من يبدأ الجولة يلعب X، الثاني O\n• يتناوبان على البداية كل جولة'}
        </Text>
        <View style={styles.infoMeta}>
          <Text style={styles.infoMetaText}>👤 2 لاعبين</Text>
          <Text style={styles.infoMetaText}>🪙 5 رصيد</Text>
          <Text style={styles.infoMetaText}>🔄 7 جولات</Text>
        </View>
      </Animated.View>

      {/* أزرار الوضع */}
      <Animated.View style={[styles.modeButtons, { opacity: fadeAnim }]}>
        <TouchableOpacity style={styles.modeBtn} onPress={onLocal} activeOpacity={0.85}>
          <Text style={styles.modeBtnEmoji}>📱</Text>
          <Text style={styles.modeBtnTitle}>محلي</Text>
          <Text style={styles.modeBtnDesc}>نفس الجهاز — تناوبا على اللمس</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.modeBtn, styles.modeBtnOnline]} onPress={onOnline} activeOpacity={0.85}>
          <Text style={styles.modeBtnEmoji}>🌐</Text>
          <Text style={[styles.modeBtnTitle, { color: '#34d399' }]}>أونلاين</Text>
          <Text style={styles.modeBtnDesc}>عشوائي أو صديق</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ══════════════════════════════════════════
// إعداد اللعبة المحلية
// ══════════════════════════════════════════
function LocalSetup({ onStart, onBack }) {
  const [name1, setName1] = useState('');
  const [name2, setName2] = useState('');
  const [xPlayer, setXPlayer] = useState(null); // 1 أو 2

  const canStart = name1.trim() && name2.trim() && xPlayer;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor="#06061a" />

      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>→</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerEmoji}>✕○</Text>
          <Text style={styles.headerTitle}>إعداد اللعبة</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.setupBody}>
        {/* الأسماء */}
        <Text style={styles.setupLabel}>اسم اللاعب الأول</Text>
        <TextInput
          style={styles.setupInput}
          placeholder="أدخل الاسم..."
          placeholderTextColor="#3a3a60"
          value={name1}
          onChangeText={setName1}
          textAlign="right"
          maxLength={12}
        />

        <Text style={styles.setupLabel}>اسم اللاعب الثاني</Text>
        <TextInput
          style={styles.setupInput}
          placeholder="أدخل الاسم..."
          placeholderTextColor="#3a3a60"
          value={name2}
          onChangeText={setName2}
          textAlign="right"
          maxLength={12}
        />

        {/* اختيار X */}
        <Text style={[styles.setupLabel, { marginTop: 20 }]}>من يلعب X ؟</Text>
        <View style={styles.xChoiceRow}>
          <TouchableOpacity
            style={[styles.xChoiceBtn, xPlayer === 1 && styles.xChoiceBtnActive]}
            onPress={() => setXPlayer(1)}
          >
            <Text style={styles.xChoiceMark}>✕</Text>
            <Text style={styles.xChoiceName}>{name1.trim() || 'اللاعب الأول'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.xChoiceBtn, xPlayer === 2 && styles.xChoiceBtnActive]}
            onPress={() => setXPlayer(2)}
          >
            <Text style={styles.xChoiceMark}>✕</Text>
            <Text style={styles.xChoiceName}>{name2.trim() || 'اللاعب الثاني'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.startBtn, !canStart && styles.startBtnDisabled]}
          onPress={() => canStart && onStart({ name1: name1.trim(), name2: name2.trim(), xPlayer })}
          activeOpacity={0.85}
        >
          <Text style={styles.startBtnText}>ابدأ اللعبة 🎮</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ══════════════════════════════════════════
// شاشة اللعبة المحلية
// ══════════════════════════════════════════
function LocalGame({ name1, name2, xPlayer, onBack }) {
  // xPlayer=1 يعني اللاعب1 هو X في الجولة التي يبدأها
  // كل جولة: من يبدأ = X، الثاني = O
  // الجولات الفردية يبدأ من اختار X، الزوجية يبدأ الآخر

  const [round, setRound] = useState(1);
  const [board, setBoard] = useState(emptyBoard());
  const [scores, setScores] = useState([0, 0]); // [لاعب1، لاعب2]
  const [roundResults, setRoundResults] = useState([]); // سجل النتائج
  const [showResult, setShowResult] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [gameOver, setGameOver] = useState(false);
  const [winLine, setWinLine] = useState([]);

  // من يبدأ هذه الجولة؟
  // جولة 1,3,5,7 → xPlayer يبدأ (أي هو X)
  // جولة 2,4,6   → الآخر يبدأ
  const starterThisRound = round % 2 === 1 ? xPlayer : (xPlayer === 1 ? 2 : 1);
  // اللاعب الحالي في الجولة (من يتحرك الآن)
  const [currentMover, setCurrentMover] = useState(starterThisRound);

  // عند بداية جولة جديدة نعيد currentMover
  useEffect(() => {
    const starter = round % 2 === 1 ? xPlayer : (xPlayer === 1 ? 2 : 1);
    setCurrentMover(starter);
    setBoard(emptyBoard());
    setWinLine([]);
  }, [round]);

  // من يبدأ الجولة الحالية = X
  const getSymbol = (mover) => {
    const starter = round % 2 === 1 ? xPlayer : (xPlayer === 1 ? 2 : 1);
    return mover === starter ? 'X' : 'O';
  };

  const handleCell = (i) => {
    if (board[i] || showResult) return;
    const symbol = getSymbol(currentMover);
    const newBoard = [...board];
    newBoard[i] = symbol;
    setBoard(newBoard);

    const result = checkWinner(newBoard);
    if (result) {
      if (result.winner !== 'draw') setWinLine(result.line);
      setTimeout(() => finishRound(result, newBoard), 500);
    } else {
      setCurrentMover(currentMover === 1 ? 2 : 1);
    }
  };

  const finishRound = (result, finalBoard) => {
    let roundWinner = null;
    if (result.winner === 'X') {
      const starter = round % 2 === 1 ? xPlayer : (xPlayer === 1 ? 2 : 1);
      roundWinner = starter;
    } else if (result.winner === 'O') {
      const starter = round % 2 === 1 ? xPlayer : (xPlayer === 1 ? 2 : 1);
      roundWinner = starter === 1 ? 2 : 1;
    }

    const newScores = [...scores];
    if (roundWinner) newScores[roundWinner - 1] += 1;

    setScores(newScores);
    setRoundResults(prev => [...prev, { round, winner: roundWinner }]);
    setLastResult({ winner: roundWinner, symbol: result.winner });
    setShowResult(true);

    if (round === TOTAL_ROUNDS) {
      setTimeout(() => { setShowResult(false); setGameOver(true); }, 1800);
    } else {
      setTimeout(() => { setShowResult(false); setRound(r => r + 1); }, 1800);
    }
  };

  const currentName = currentMover === 1 ? name1 : name2;
  const currentSymbol = getSymbol(currentMover);

  if (gameOver) {
    const winner = scores[0] > scores[1] ? name1 : scores[1] > scores[0] ? name2 : null;
    return <GameOverScreen
      name1={name1} name2={name2}
      score1={scores[0]} score2={scores[1]}
      winner={winner}
      roundResults={roundResults}
      onRematch={() => {
        setRound(1); setScores([0,0]); setRoundResults([]);
        setShowResult(false); setGameOver(false); setBoard(emptyBoard()); setWinLine([]);
      }}
      onBack={onBack}
    />;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#06061a" />

      {/* هيدر */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => Alert.alert('مغادرة', 'تريد الخروج؟', [
          { text: 'إلغاء', style: 'cancel' },
          { text: 'خروج', style: 'destructive', onPress: onBack },
        ])} style={styles.backBtn}>
          <Text style={styles.backText}>→</Text>
        </TouchableOpacity>
        <Text style={styles.roundLabel}>الجولة {round} / {TOTAL_ROUNDS}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* النقاط */}
      <View style={styles.scoreboard}>
        <View style={[styles.scoreCard, scores[0] > scores[1] && styles.scoreCardLeading]}>
          <Text style={styles.scoreName}>{name1}</Text>
          <Text style={styles.scoreNum}>{scores[0]}</Text>
        </View>
        <Text style={styles.scoreVs}>VS</Text>
        <View style={[styles.scoreCard, scores[1] > scores[0] && styles.scoreCardLeading]}>
          <Text style={styles.scoreName}>{name2}</Text>
          <Text style={styles.scoreNum}>{scores[1]}</Text>
        </View>
      </View>

      {/* مؤشر الدور */}
      <View style={styles.turnIndicator}>
        <Text style={styles.turnText}>
          {showResult
            ? (lastResult?.winner
                ? `🏆 فاز ${lastResult.winner === 1 ? name1 : name2}!`
                : '🤝 تعادل!')
            : `دور ${currentName} (${currentSymbol})`}
        </Text>
      </View>

      {/* الشبكة */}
      <BoardGrid board={board} onPress={handleCell} disabled={showResult} winLine={winLine} />

      {/* جولات صغيرة */}
      <View style={styles.roundDots}>
        {Array(TOTAL_ROUNDS).fill(0).map((_, i) => {
          const res = roundResults[i];
          return (
            <View key={i} style={[styles.roundDot,
              res?.winner === 1 ? styles.roundDotP1 :
              res?.winner === 2 ? styles.roundDotP2 :
              res?.winner === null ? styles.roundDotDraw :
              i === round - 1 ? styles.roundDotCurrent : {}
            ]}>
              <Text style={styles.roundDotText}>{i + 1}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ══════════════════════════════════════════
// شاشة الأونلاين
// ══════════════════════════════════════════
function OnlineXO({ onBack, currentUser }) {
  const [phase, setPhase] = useState('searching'); // searching | playing | finished
  const [roomId, setRoomId] = useState(null);
  const [roomData, setRoomData] = useState(null);
  const [isPlayer1, setIsPlayer1] = useState(false);
  const unsubRef = useRef(null);

  const myUid = getOrCreateUid();
  const myName = currentUser?.name || 'لاعب';

  useEffect(() => {
    findOrCreateRoom();
    return () => {
      if (unsubRef.current) unsubRef.current();
    };
  }, []);

  const findOrCreateRoom = async () => {
    try {
      const q = query(
        collection(db, 'xo_rooms'),
        where('status', '==', 'waiting'),
        where('player2.uid', '==', null)
      );
      const snap = await getDocs(q);

      if (!snap.empty) {
        const roomDoc = snap.docs[0];
        const rId = roomDoc.id;
        await updateDoc(doc(db, 'xo_rooms', rId), {
          'player2.uid': myUid,
          'player2.name': myName,
          status: 'playing',
        });
        setRoomId(rId);
        setIsPlayer1(false);
        listenRoom(rId);
      } else {
        const rId = `xo_${Date.now()}_${myUid.slice(0,8)}`;
        await setDoc(doc(db, 'xo_rooms', rId), {
          status: 'waiting',
          player1: { uid: myUid, name: myName, score: 0 },
          player2: { uid: null, name: null, score: 0 },
          round: 1,
          board: emptyBoard(),
          currentTurn: 1, // 1 أو 2
          roundStarter: 1,
          winner: null,
          createdAt: serverTimestamp(),
        });
        setRoomId(rId);
        setIsPlayer1(true);
        setPhase('waiting');
        listenRoom(rId);
      }
    } catch (e) {
      Alert.alert('خطأ', e.message);
    }
  };

  const listenRoom = (rId) => {
    const unsub = onSnapshot(doc(db, 'xo_rooms', rId), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      setRoomData(data);
      if (data.status === 'playing') setPhase('playing');
      if (data.status === 'finished') setPhase('finished');
    });
    unsubRef.current = unsub;
  };

  const handleCell = async (i) => {
    if (!roomData || !roomId) return;
    const myNum = isPlayer1 ? 1 : 2;
    if (roomData.currentTurn !== myNum) return;
    if (roomData.board[i]) return;

    // رمزي: من يبدأ الجولة = X
    const symbol = roomData.currentTurn === roomData.roundStarter ? 'X' : 'O';
    const newBoard = [...roomData.board];
    newBoard[i] = symbol;

    const result = checkWinner(newBoard);
    const nextTurn = roomData.currentTurn === 1 ? 2 : 1;

    if (result) {
      let roundWinner = null;
      if (result.winner === 'X') roundWinner = roomData.roundStarter;
      else if (result.winner === 'O') roundWinner = roomData.roundStarter === 1 ? 2 : 1;

      const p1Score = roomData.player1.score + (roundWinner === 1 ? 1 : 0);
      const p2Score = roomData.player2.score + (roundWinner === 2 ? 1 : 0);

      if (roomData.round >= TOTAL_ROUNDS) {
        let gameWinner = 'draw';
        if (p1Score > p2Score) gameWinner = roomData.player1.name;
        else if (p2Score > p1Score) gameWinner = roomData.player2.name;
        await updateDoc(doc(db, 'xo_rooms', roomId), {
          board: newBoard,
          'player1.score': p1Score,
          'player2.score': p2Score,
          status: 'finished',
          winner: gameWinner,
        });
      } else {
        const nextRound = roomData.round + 1;
        const nextStarter = roomData.roundStarter === 1 ? 2 : 1;
        await updateDoc(doc(db, 'xo_rooms', roomId), {
          board: emptyBoard(),
          'player1.score': p1Score,
          'player2.score': p2Score,
          round: nextRound,
          roundStarter: nextStarter,
          currentTurn: nextStarter,
        });
      }
    } else {
      await updateDoc(doc(db, 'xo_rooms', roomId), {
        board: newBoard,
        currentTurn: nextTurn,
      });
    }
  };

  const handleLeave = () => {
    Alert.alert('مغادرة', 'سيفوز خصمك إذا غادرت!', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'مغادرة', style: 'destructive', onPress: async () => {
        if (roomId) await deleteDoc(doc(db, 'xo_rooms', roomId));
        onBack();
      }},
    ]);
  };

  // ── انتظار لاعب ──
  if (phase === 'waiting') return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#06061a" />
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>→</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerEmoji}>✕○</Text>
          <Text style={styles.headerTitle}>أونلاين</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>
      <View style={styles.centerContent}>
        <ActivityIndicator color="#f59e0b" size="large" />
        <Text style={styles.searchingText}>بانتظار خصم...</Text>
        <Text style={styles.searchingHint}>سيتم المطابقة تلقائياً</Text>
      </View>
    </View>
  );

  if (phase === 'searching') return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#06061a" />
      <View style={styles.centerContent}>
        <ActivityIndicator color="#f59e0b" size="large" />
        <Text style={styles.searchingText}>جارٍ البحث...</Text>
      </View>
    </View>
  );

  // ── اللعبة ──
  if (phase === 'playing' && roomData) {
    const myNum = isPlayer1 ? 1 : 2;
    const isMyTurn = roomData.currentTurn === myNum;
    const mySymbol = roomData.currentTurn === roomData.roundStarter ? 'X' : 'O';
    const opponentName = isPlayer1 ? roomData.player2?.name : roomData.player1?.name;
    const myScore = isPlayer1 ? roomData.player1?.score : roomData.player2?.score;
    const oppScore = isPlayer1 ? roomData.player2?.score : roomData.player1?.score;

    const winResult = checkWinner(roomData.board);
    const winLine = (winResult && winResult.winner !== 'draw') ? winResult.line : [];

    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#06061a" />
        <View style={styles.header}>
          <TouchableOpacity onPress={handleLeave} style={styles.backBtn}>
            <Text style={styles.backText}>→</Text>
          </TouchableOpacity>
          <Text style={styles.roundLabel}>الجولة {roomData.round} / {TOTAL_ROUNDS}</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.scoreboard}>
          <View style={[styles.scoreCard, myScore > oppScore && styles.scoreCardLeading]}>
            <Text style={styles.scoreName}>{myName}</Text>
            <Text style={styles.scoreNum}>{myScore}</Text>
          </View>
          <Text style={styles.scoreVs}>VS</Text>
          <View style={[styles.scoreCard, oppScore > myScore && styles.scoreCardLeading]}>
            <Text style={styles.scoreName}>{opponentName}</Text>
            <Text style={styles.scoreNum}>{oppScore}</Text>
          </View>
        </View>

        <View style={styles.turnIndicator}>
          <Text style={styles.turnText}>
            {isMyTurn ? `دورك (${mySymbol})` : `دور ${opponentName}...`}
          </Text>
        </View>

        <BoardGrid
          board={roomData.board}
          onPress={handleCell}
          disabled={!isMyTurn}
          winLine={winLine}
        />
      </View>
    );
  }

  // ── انتهت اللعبة ──
  if (phase === 'finished' && roomData) {
    const myScore = isPlayer1 ? roomData.player1?.score : roomData.player2?.score;
    const oppScore = isPlayer1 ? roomData.player2?.score : roomData.player1?.score;
    const opponentName = isPlayer1 ? roomData.player2?.name : roomData.player1?.name;
    const iWon = myScore > oppScore;
    const isDraw = myScore === oppScore;

    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#06061a" />
        <View style={styles.centerContent}>
          <Text style={styles.gameOverEmoji}>{isDraw ? '🤝' : iWon ? '🏆' : '😔'}</Text>
          <Text style={styles.gameOverTitle}>
            {isDraw ? 'تعادل!' : iWon ? 'فزت!' : 'فاز خصمك'}
          </Text>
          <View style={styles.finalScoreRow}>
            <View style={styles.finalScoreBox}>
              <Text style={styles.finalScoreName}>{myName}</Text>
              <Text style={styles.finalScoreNum}>{myScore}</Text>
            </View>
            <Text style={styles.finalScoreVs}>—</Text>
            <View style={styles.finalScoreBox}>
              <Text style={styles.finalScoreName}>{opponentName}</Text>
              <Text style={styles.finalScoreNum}>{oppScore}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.backHomeBtn} onPress={onBack}>
            <Text style={styles.backHomeBtnText}>العودة للقائمة</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return null;
}

// ══════════════════════════════════════════
// مكوّن الشبكة
// ══════════════════════════════════════════
function BoardGrid({ board, onPress, disabled, winLine = [] }) {
  const cellAnims = useRef(board.map(() => new Animated.Value(0))).current;

  const handlePress = (i) => {
    if (board[i] || disabled) return;
    Animated.spring(cellAnims[i], { toValue: 1, friction: 5, useNativeDriver: true }).start();
    onPress(i);
  };

  // reset animation when board resets
  useEffect(() => {
    board.forEach((cell, i) => {
      if (!cell) cellAnims[i].setValue(0);
    });
  }, [board]);

  return (
    <View style={styles.boardWrap}>
      <View style={styles.board}>
        {board.map((cell, i) => {
          const isWin = winLine.includes(i);
          const scale = cellAnims[i].interpolate({ inputRange: [0,1], outputRange: [0.5, 1] });
          return (
            <TouchableOpacity
              key={i}
              style={[
                styles.cell,
                i % 3 !== 2 && styles.cellBorderRight,
                i < 6 && styles.cellBorderBottom,
                isWin && styles.cellWin,
              ]}
              onPress={() => handlePress(i)}
              activeOpacity={cell ? 1 : 0.7}
            >
              {cell && (
                <Animated.Text style={[
                  styles.cellText,
                  cell === 'X' ? styles.cellX : styles.cellO,
                  isWin && styles.cellTextWin,
                  { transform: [{ scale }] },
                ]}>
                  {cell}
                </Animated.Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ══════════════════════════════════════════
// شاشة نهاية اللعبة (محلي)
// ══════════════════════════════════════════
function GameOverScreen({ name1, name2, score1, score2, winner, roundResults, onRematch, onBack }) {
  const isDraw = !winner;
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#06061a" />
      <View style={styles.centerContent}>
        <Text style={styles.gameOverEmoji}>{isDraw ? '🤝' : '🏆'}</Text>
        <Text style={styles.gameOverTitle}>{isDraw ? 'تعادل!' : `فاز ${winner}!`}</Text>

        <View style={styles.finalScoreRow}>
          <View style={styles.finalScoreBox}>
            <Text style={styles.finalScoreName}>{name1}</Text>
            <Text style={[styles.finalScoreNum, score1 > score2 && { color: '#f59e0b' }]}>{score1}</Text>
          </View>
          <Text style={styles.finalScoreVs}>—</Text>
          <View style={styles.finalScoreBox}>
            <Text style={styles.finalScoreName}>{name2}</Text>
            <Text style={[styles.finalScoreNum, score2 > score1 && { color: '#f59e0b' }]}>{score2}</Text>
          </View>
        </View>

        {/* سجل الجولات */}
        <View style={styles.roundHistory}>
          {roundResults.map((r, i) => (
            <View key={i} style={styles.roundHistoryRow}>
              <Text style={styles.roundHistoryLabel}>ج{r.round}</Text>
              <Text style={styles.roundHistoryResult}>
                {r.winner === 1 ? `🏆 ${name1}` : r.winner === 2 ? `🏆 ${name2}` : '🤝 تعادل'}
              </Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.rematchBtn} onPress={onRematch}>
          <Text style={styles.rematchBtnText}>🔄 إعادة</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backHomeBtn} onPress={onBack}>
          <Text style={styles.backHomeBtnText}>العودة للقائمة</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ══════════════════════════════════════════
// الشاشة الرئيسية
// ══════════════════════════════════════════
export default function XOGameScreen({ onBack, currentUser, tokens, onSpendTokens }) {
  const [view, setView] = useState('modeSelect'); // modeSelect | localSetup | localGame | onlineGame
  const [localConfig, setLocalConfig] = useState(null);

  const handleModeOnline = () => {
    if (tokens < 5) {
      Alert.alert('رصيد غير كافٍ', 'تحتاج 5 رصيد للعب');
      return;
    }
    onSpendTokens(5);
    setView('onlineGame');
  };

  const handleStartLocal = (config) => {
    if (tokens < 5) {
      Alert.alert('رصيد غير كافٍ', 'تحتاج 5 رصيد للعب');
      return;
    }
    onSpendTokens(5);
    setLocalConfig(config);
    setView('localGame');
  };

  if (view === 'modeSelect') return (
    <ModeSelect
      onLocal={() => setView('localSetup')}
      onOnline={handleModeOnline}
      onBack={onBack}
    />
  );

  if (view === 'localSetup') return (
    <LocalSetup
      onStart={handleStartLocal}
      onBack={() => setView('modeSelect')}
    />
  );

  if (view === 'localGame' && localConfig) return (
    <LocalGame
      name1={localConfig.name1}
      name2={localConfig.name2}
      xPlayer={localConfig.xPlayer}
      onBack={() => setView('modeSelect')}
    />
  );

  if (view === 'onlineGame') return (
    <OnlineXO
      onBack={() => setView('modeSelect')}
      currentUser={currentUser}
    />
  );

  return null;
}

// ══════════════════════════════════════════
// الستايلات
// ══════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#06061a', paddingTop: 56 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20, marginBottom: 16,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#0f0f2e', borderWidth: 1,
    borderColor: '#f59e0b30', alignItems: 'center', justifyContent: 'center',
  },
  backText: { color: '#f59e0b', fontSize: 20, fontWeight: '700' },
  headerCenter: { alignItems: 'center', gap: 2 },
  headerEmoji: { fontSize: 24 },
  headerTitle: { color: '#f59e0b', fontSize: 18, fontWeight: '900' },
  roundLabel: { color: '#f5c518', fontSize: 15, fontWeight: '800' },

  // info box
  infoBox: {
    marginHorizontal: 20, backgroundColor: '#0f0f2e',
    borderRadius: 18, borderWidth: 1, borderColor: '#f59e0b30',
    padding: 18, gap: 10, marginBottom: 24,
  },
  infoTitle: { color: '#f59e0b', fontSize: 15, fontWeight: '800' },
  infoText: { color: '#9090b0', fontSize: 13, lineHeight: 22, textAlign: 'right' },
  infoMeta: { flexDirection: 'row', gap: 16, justifyContent: 'center', marginTop: 4 },
  infoMetaText: { color: '#5a5a80', fontSize: 12, fontWeight: '600' },

  // أزرار الوضع
  modeButtons: { paddingHorizontal: 20, gap: 14 },
  modeBtn: {
    backgroundColor: '#0f0f2e', borderRadius: 18,
    borderWidth: 1.5, borderColor: '#f59e0b40',
    padding: 20, alignItems: 'center', gap: 6,
  },
  modeBtnOnline: { borderColor: '#34d39940' },
  modeBtnEmoji: { fontSize: 30 },
  modeBtnTitle: { color: '#f59e0b', fontSize: 17, fontWeight: '900' },
  modeBtnDesc: { color: '#5a5a80', fontSize: 13 },

  // setup
  setupBody: { paddingHorizontal: 24, gap: 10, flex: 1, paddingTop: 10 },
  setupLabel: { color: '#9090b0', fontSize: 13, fontWeight: '600', textAlign: 'right' },
  setupInput: {
    backgroundColor: '#0f0f2e', borderRadius: 14,
    borderWidth: 1, borderColor: '#ffffff15',
    color: '#e0e0ff', paddingHorizontal: 16,
    paddingVertical: 14, fontSize: 16,
  },
  xChoiceRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  xChoiceBtn: {
    flex: 1, backgroundColor: '#0f0f2e',
    borderRadius: 14, borderWidth: 1.5,
    borderColor: '#ffffff15', padding: 16,
    alignItems: 'center', gap: 6,
  },
  xChoiceBtnActive: { borderColor: '#f59e0b', backgroundColor: '#f59e0b12' },
  xChoiceMark: { color: '#f59e0b', fontSize: 24, fontWeight: '900' },
  xChoiceName: { color: '#9090b0', fontSize: 13, fontWeight: '600' },
  startBtn: {
    backgroundColor: '#f59e0b', borderRadius: 16,
    paddingVertical: 16, alignItems: 'center', marginTop: 20,
  },
  startBtnDisabled: { opacity: 0.4 },
  startBtnText: { color: '#06061a', fontSize: 16, fontWeight: '900' },

  // لوحة النقاط
  scoreboard: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 16,
    paddingHorizontal: 20, marginBottom: 14,
  },
  scoreCard: {
    flex: 1, backgroundColor: '#0f0f2e',
    borderRadius: 14, borderWidth: 1,
    borderColor: '#ffffff10', padding: 12,
    alignItems: 'center', gap: 4,
  },
  scoreCardLeading: { borderColor: '#f59e0b60', backgroundColor: '#f59e0b10' },
  scoreName: { color: '#9090b0', fontSize: 12, fontWeight: '700' },
  scoreNum: { color: '#f5c518', fontSize: 28, fontWeight: '900' },
  scoreVs: { color: '#3a3a60', fontSize: 14, fontWeight: '700' },

  // مؤشر الدور
  turnIndicator: {
    marginHorizontal: 20, backgroundColor: '#0f0f2e',
    borderRadius: 12, borderWidth: 1,
    borderColor: '#f59e0b30', paddingVertical: 10,
    alignItems: 'center', marginBottom: 20,
  },
  turnText: { color: '#f5c518', fontSize: 15, fontWeight: '800' },

  // الشبكة
  boardWrap: { alignItems: 'center', marginBottom: 24 },
  board: {
    width: 300, height: 300,
    flexDirection: 'row', flexWrap: 'wrap',
  },
  cell: {
    width: 100, height: 100,
    alignItems: 'center', justifyContent: 'center',
  },
  cellBorderRight: { borderRightWidth: 2, borderRightColor: '#ffffff20' },
  cellBorderBottom: { borderBottomWidth: 2, borderBottomColor: '#ffffff20' },
  cellWin: { backgroundColor: '#f59e0b18' },
  cellText: { fontSize: 42, fontWeight: '900' },
  cellX: { color: '#f59e0b' },
  cellO: { color: '#60a5fa' },
  cellTextWin: { textShadowColor: '#f59e0b', textShadowRadius: 12, textShadowOffset: { width: 0, height: 0 } },

  // نقاط الجولات
  roundDots: {
    flexDirection: 'row', justifyContent: 'center',
    gap: 8, paddingHorizontal: 20,
  },
  roundDot: {
    width: 30, height: 30, borderRadius: 10,
    backgroundColor: '#0f0f2e', borderWidth: 1,
    borderColor: '#ffffff10', alignItems: 'center', justifyContent: 'center',
  },
  roundDotP1: { backgroundColor: '#f59e0b30', borderColor: '#f59e0b60' },
  roundDotP2: { backgroundColor: '#60a5fa30', borderColor: '#60a5fa60' },
  roundDotDraw: { backgroundColor: '#ffffff10', borderColor: '#ffffff30' },
  roundDotCurrent: { borderColor: '#f5c518', borderWidth: 2 },
  roundDotText: { color: '#5a5a80', fontSize: 11, fontWeight: '700' },

  // انتظار
  centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 30 },
  searchingText: { color: '#f5c518', fontSize: 18, fontWeight: '800' },
  searchingHint: { color: '#5a5a80', fontSize: 13 },

  // نهاية اللعبة
  gameOverEmoji: { fontSize: 60 },
  gameOverTitle: { color: '#f5c518', fontSize: 26, fontWeight: '900', marginBottom: 8 },
  finalScoreRow: { flexDirection: 'row', alignItems: 'center', gap: 24, marginVertical: 16 },
  finalScoreBox: { alignItems: 'center', gap: 4 },
  finalScoreName: { color: '#9090b0', fontSize: 14, fontWeight: '700' },
  finalScoreNum: { color: '#e0e0ff', fontSize: 36, fontWeight: '900' },
  finalScoreVs: { color: '#3a3a60', fontSize: 20 },
  roundHistory: {
    width: '100%', gap: 6, marginBottom: 16,
    backgroundColor: '#0f0f2e', borderRadius: 14,
    borderWidth: 1, borderColor: '#ffffff10', padding: 14,
  },
  roundHistoryRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center',
  },
  roundHistoryLabel: { color: '#5a5a80', fontSize: 12, fontWeight: '700' },
  roundHistoryResult: { color: '#e0e0ff', fontSize: 13 },
  rematchBtn: {
    backgroundColor: '#f59e0b', borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 40,
  },
  rematchBtnText: { color: '#06061a', fontSize: 15, fontWeight: '900' },
  backHomeBtn: {
    backgroundColor: '#0f0f2e', borderRadius: 14,
    borderWidth: 1, borderColor: '#ffffff15',
    paddingVertical: 12, paddingHorizontal: 32,
  },
  backHomeBtnText: { color: '#9090b0', fontSize: 14, fontWeight: '700' },
});
