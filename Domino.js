/**
 * DominoGameScreen.js
 * دومينو – فريقين | اللعب من الجانبين فقط | فوز بـ 151
 * بعد 60 ثانية من البحث عن غرفة → بوتات تملأ المقاعد الفارغة
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, Animated, Alert, ScrollView,
  Modal, ActivityIndicator, TextInput,
} from 'react-native';
import { db, auth } from './firebaseConfig';
import {
  doc, setDoc, onSnapshot, updateDoc, deleteDoc,
  collection, serverTimestamp, arrayUnion, getDoc,
  query, where, getDocs,
} from 'firebase/firestore';

// ══════════════════════════════════════════════════════════════
// ثوابت
// ══════════════════════════════════════════════════════════════
const WIN_SCORE   = 151;
const BOT_DELAY   = 1200; // مللي‌ثانية بين حركات البوت
const LOBBY_WAIT  = 60;   // ثواني انتظار قبل إضافة بوتات
const TEAM_OF     = { 0: 0, 1: 1, 2: 0, 3: 1 }; // فريق0: مقاعد 0+2 | فريق1: مقاعد 1+3
const SEAT_LABEL  = ['جنوب', 'شرق', 'شمال', 'غرب'];
const SEAT_LABEL_EN = ['south', 'east', 'north', 'west'];

// ══════════════════════════════════════════════════════════════
// منطق الدومينو
// ══════════════════════════════════════════════════════════════

/** بناء مجموعة كاملة 0-6 */
function buildDominoSet() {
  const tiles = [];
  for (let i = 0; i <= 6; i++)
    for (let j = i; j <= 6; j++)
      tiles.push([i, j]);
  return tiles; // 28 قطعة
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** توزيع 7 قطع لكل لاعب */
function dealHands() {
  const tiles = shuffle(buildDominoSet());
  const hands = [[], [], [], []];
  for (let i = 0; i < 28; i++) hands[i % 4].push(tiles[i]);
  return hands;
}

/** إيجاد أثقل قطعة مزدوجة في اليد (للبداية) */
function findHighestDouble(hand) {
  let best = null;
  for (const t of hand) {
    if (t[0] === t[1]) {
      if (!best || t[0] > best[0]) best = t;
    }
  }
  return best;
}

/** إيجاد أثقل قطعة في اليد عموماً */
function findHeaviest(hand) {
  return hand.reduce((a, b) => (a[0] + a[1] >= b[0] + b[1] ? a : b), hand[0]);
}

/**
 * القطع القابلة للعب من اليد على الطرفين المكشوفَين
 * board: مصفوفة { tile, side } حيث side: 'L'|'R'
 * openLeft / openRight: الرقم المكشوف على اليسار/اليمين
 */
function playable(hand, openLeft, openRight, boardEmpty) {
  if (boardEmpty) return hand.map(t => ({ tile: t, side: 'L' }));
  const moves = [];
  for (const t of hand) {
    if (t[0] === openLeft || t[1] === openLeft)
      moves.push({ tile: t, side: 'L' });
    if (t[0] === openRight || t[1] === openRight)
      moves.push({ tile: t, side: 'R' });
  }
  // إزالة التكرار (نفس القطعة + الجانبين لو القيمتان متساويتان)
  return moves;
}

/**
 * تطبيق حركة على حالة البورد
 * returns { newBoard, newOpenLeft, newOpenRight }
 */
function applyMove(board, openLeft, openRight, tile, side) {
  const newBoard = [...board];
  let newLeft = openLeft;
  let newRight = openRight;

  if (newBoard.length === 0) {
    newBoard.push({ tile, side: 'L' });
    newLeft  = tile[0];
    newRight = tile[1];
    return { newBoard, newOpenLeft: newLeft, newOpenRight: newRight };
  }

  if (side === 'L') {
    // الجانب الأيسر
    const newTile = tile[1] === openLeft ? tile : [tile[1], tile[0]];
    newBoard.unshift({ tile: newTile, side: 'L' });
    newLeft = newTile[0];
  } else {
    // الجانب الأيمن
    const newTile = tile[0] === openRight ? tile : [tile[1], tile[0]];
    newBoard.push({ tile: newTile, side: 'R' });
    newRight = newTile[1];
  }
  return { newBoard, newOpenLeft: newLeft, newOpenRight: newRight };
}

/** جمع نقاط اليد */
function handSum(hand) {
  return hand.reduce((s, t) => s + t[0] + t[1], 0);
}

/** جمع نقاط الجولة (نقاط الخاسر تُضاف للفائز) */
function calcRoundScore(hands, winnerSeat) {
  const winTeam = TEAM_OF[winnerSeat];
  const loserSum = hands.reduce((s, h, i) => {
    if (TEAM_OF[i] !== winTeam) s += handSum(h);
    return s;
  }, 0);
  // تقريب لأقرب 5
  return Math.round(loserSum / 5) * 5;
}

/** حالة جديدة لجولة */
function newRoundState(dealerSeat = 0) {
  const hands = dealHands();
  // من يبدأ: من عنده [6,6]، وإلا أثقل مزدوجة، وإلا الجيران
  let starter = -1;
  let bestDouble = -1;
  for (let i = 0; i < 4; i++) {
    const d = findHighestDouble(hands[i]);
    if (d && d[0] > bestDouble) { bestDouble = d[0]; starter = i; }
  }
  if (starter === -1) starter = dealerSeat;
  return {
    hands,
    board: [],
    openLeft: null,
    openRight: null,
    currentTurn: starter,
    passCount: 0,
    roundOver: false,
    roundWinner: null,
  };
}

function genCode() {
  return Math.random().toString(36).slice(2, 7).toUpperCase();
}
function getUid() {
  return auth?.currentUser?.uid || 'guest_' + Math.random().toString(36).slice(2, 8);
}

// ══════════════════════════════════════════════════════════════
// المكوّن الرئيسي
// ══════════════════════════════════════════════════════════════
export default function DominoGameScreen({ onBack, currentUser, tokens, onSpendTokens }) {
  const [phase, setPhase] = useState('lobby'); // lobby | waiting | playing | gameOver
  const [roomCode, setRoomCode]   = useState('');
  const [joinCode, setJoinCode]   = useState('');
  const [roomData, setRoomData]   = useState(null);
  const [mySeat, setMySeat]       = useState(null);
  const [waitSec, setWaitSec]     = useState(LOBBY_WAIT);
  const [selectedTile, setSelectedTile] = useState(null);
  const [msg, setMsg]             = useState('');
  const [scores, setScores]       = useState([0, 0]); // [فريق0, فريق1]
  const [gameOver, setGameOver]   = useState(null);   // { winner: 0|1 }

  const unsubRef  = useRef(null);
  const botTimerRef = useRef(null);
  const waitTimerRef = useRef(null);

  const myUid = getUid();
  const isHost = roomData?.hostUid === myUid;

  // ── cleanup عند الخروج ──
  useEffect(() => {
    return () => {
      if (unsubRef.current) unsubRef.current();
      clearTimeout(botTimerRef.current);
      clearInterval(waitTimerRef.current);
    };
  }, []);

  // ══════════════════════════════════════════════════════════════
  // إنشاء غرفة
  // ══════════════════════════════════════════════════════════════
  async function handleCreate() {
    const code = genCode();
    const round = newRoundState(0);
    const roomRef = doc(db, 'domino_rooms', code);
    const seat0 = {
      uid: myUid,
      name: currentUser?.name || 'ضيف',
      isBot: false,
    };
    await setDoc(roomRef, {
      code,
      hostUid: myUid,
      seats: [seat0, null, null, null],
      scores: [0, 0],
      round,
      createdAt: serverTimestamp(),
      status: 'waiting', // waiting | playing | over
    });
    setRoomCode(code);
    setMySeat(0);
    subscribeRoom(code, 0);
    setPhase('waiting');
    startWaitTimer(code);
  }

  // ══════════════════════════════════════════════════════════════
  // الانضمام لغرفة
  // ══════════════════════════════════════════════════════════════
  async function handleJoin() {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    const roomRef = doc(db, 'domino_rooms', code);
    const snap = await getDoc(roomRef);
    if (!snap.exists()) { Alert.alert('خطأ', 'الغرفة غير موجودة'); return; }
    const data = snap.data();
    if (data.status !== 'waiting') { Alert.alert('خطأ', 'الغرفة بدأت بالفعل'); return; }
    // إيجاد مقعد فارغ
    const seat = data.seats.findIndex(s => s === null || s === undefined);
    if (seat === -1) { Alert.alert('خطأ', 'الغرفة ممتلئة'); return; }
    const updated = [...data.seats];
    updated[seat] = { uid: myUid, name: currentUser?.name || 'ضيف', isBot: false };
    await updateDoc(roomRef, { seats: updated });
    setRoomCode(code);
    setMySeat(seat);
    subscribeRoom(code, seat);
    setPhase('waiting');
  }

  // ══════════════════════════════════════════════════════════════
  // الاشتراك في تحديثات الغرفة
  // ══════════════════════════════════════════════════════════════
  function subscribeRoom(code, seat) {
    const roomRef = doc(db, 'domino_rooms', code);
    if (unsubRef.current) unsubRef.current();
    unsubRef.current = onSnapshot(roomRef, snap => {
      if (!snap.exists()) { setPhase('lobby'); return; }
      const d = snap.data();
      setRoomData(d);
      setScores(d.scores || [0, 0]);

      if (d.status === 'playing' && phase !== 'playing') {
        clearInterval(waitTimerRef.current);
        setPhase('playing');
      }
      if (d.status === 'over') {
        setGameOver({ winner: d.winner });
        setPhase('gameOver');
      }
    });
  }

  // ══════════════════════════════════════════════════════════════
  // مؤقت الانتظار → إضافة بوتات
  // ══════════════════════════════════════════════════════════════
  function startWaitTimer(code) {
    let sec = LOBBY_WAIT;
    waitTimerRef.current = setInterval(async () => {
      sec--;
      setWaitSec(sec);
      if (sec <= 0) {
        clearInterval(waitTimerRef.current);
        await fillWithBots(code);
      }
    }, 1000);
  }

  async function fillWithBots(code) {
    const roomRef = doc(db, 'domino_rooms', code);
    const snap = await getDoc(roomRef);
    if (!snap.exists()) return;
    const d = snap.data();
    if (d.status !== 'waiting') return;
    const seats = [...d.seats];
    const botNames = ['بوت أ', 'بوت ب', 'بوت ج'];
    let botIdx = 0;
    for (let i = 0; i < 4; i++) {
      if (!seats[i]) {
        seats[i] = { uid: `bot_${i}`, name: botNames[botIdx++] || `بوت ${i}`, isBot: true };
      }
    }
    await updateDoc(roomRef, { seats, status: 'playing' });
  }

  // ══════════════════════════════════════════════════════════════
  // بدء اللعبة (الهوست عندما يكتمل العدد)
  // ══════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!roomData || !isHost) return;
    if (roomData.status === 'waiting') {
      const full = roomData.seats.every(s => s !== null && s !== undefined);
      if (full) {
        clearInterval(waitTimerRef.current);
        updateDoc(doc(db, 'domino_rooms', roomCode), { status: 'playing' });
      }
    }
  }, [roomData]);

  // ══════════════════════════════════════════════════════════════
  // منطق البوت
  // ══════════════════════════════════════════════════════════════
  useEffect(() => {
    if (phase !== 'playing' || !roomData || !isHost) return;
    const round = roomData.round;
    if (!round || round.roundOver) return;

    const seat = round.currentTurn;
    const player = roomData.seats[seat];
    if (!player?.isBot) return;

    clearTimeout(botTimerRef.current);
    botTimerRef.current = setTimeout(() => {
      botPlay(seat, round);
    }, BOT_DELAY);
  }, [roomData?.round?.currentTurn, phase]);

  async function botPlay(seat, round) {
    const hand = round.hands[seat];
    const boardEmpty = round.board.length === 0;
    const moves = playable(hand, round.openLeft, round.openRight, boardEmpty);

    if (moves.length === 0) {
      // البوت يمرر
      await passTurn(seat, round);
      return;
    }
    // اختيار عشوائي
    const move = moves[Math.floor(Math.random() * moves.length)];
    await makeMove(seat, round, move.tile, move.side);
  }

  // ══════════════════════════════════════════════════════════════
  // حركة لاعب
  // ══════════════════════════════════════════════════════════════
  async function makeMove(seat, round, tile, side) {
    const { newBoard, newOpenLeft, newOpenRight } = applyMove(
      round.board, round.openLeft, round.openRight, tile, side
    );
    const newHands = round.hands.map((h, i) =>
      i === seat ? h.filter(t => !(t[0] === tile[0] && t[1] === tile[1])) : h
    );
    const nextTurn = (seat + 1) % 4;

    // هل انتهت الجولة؟ (يد فارغة)
    if (newHands[seat].length === 0) {
      await endRound(seat, newHands, round.board);
      return;
    }

    const newRound = {
      ...round,
      hands: newHands,
      board: newBoard,
      openLeft: newOpenLeft,
      openRight: newOpenRight,
      currentTurn: nextTurn,
      passCount: 0,
    };
    await updateDoc(doc(db, 'domino_rooms', roomCode), { round: newRound });
  }

  async function passTurn(seat, round) {
    const nextTurn = (seat + 1) % 4;
    const newPassCount = (round.passCount || 0) + 1;

    // إذا مرّر الجميع → انتهت الجولة بالتوقف
    if (newPassCount >= 4) {
      await endRoundBlocked(round);
      return;
    }
    const newRound = { ...round, currentTurn: nextTurn, passCount: newPassCount };
    await updateDoc(doc(db, 'domino_rooms', roomCode), { round: newRound });
  }

  async function endRound(winnerSeat, hands, board) {
    const pts = calcRoundScore(hands, winnerSeat);
    const winTeam = TEAM_OF[winnerSeat];
    const newScores = [...(roomData.scores || [0, 0])];
    newScores[winTeam] += pts;

    if (newScores[0] >= WIN_SCORE || newScores[1] >= WIN_SCORE) {
      const winner = newScores[0] >= WIN_SCORE ? 0 : 1;
      await updateDoc(doc(db, 'domino_rooms', roomCode), {
        scores: newScores,
        status: 'over',
        winner,
      });
    } else {
      // جولة جديدة
      const nextDealer = (winnerSeat + 1) % 4;
      const nr = newRoundState(nextDealer);
      await updateDoc(doc(db, 'domino_rooms', roomCode), {
        scores: newScores,
        round: nr,
      });
    }
  }

  async function endRoundBlocked(round) {
    // الفريق ذو أقل مجموع يفوز
    const teamSum = [0, 0];
    round.hands.forEach((h, i) => { teamSum[TEAM_OF[i]] += handSum(h); });
    const winTeam = teamSum[0] <= teamSum[1] ? 0 : 1;
    const pts = teamSum[1 - winTeam]; // نقاط الخاسر
    const rounded = Math.round(pts / 5) * 5;
    const newScores = [...(roomData.scores || [0, 0])];
    newScores[winTeam] += rounded;

    if (newScores[0] >= WIN_SCORE || newScores[1] >= WIN_SCORE) {
      const winner = newScores[0] >= WIN_SCORE ? 0 : 1;
      await updateDoc(doc(db, 'domino_rooms', roomCode), {
        scores: newScores, status: 'over', winner,
      });
    } else {
      const nr = newRoundState((round.currentTurn + 1) % 4);
      await updateDoc(doc(db, 'domino_rooms', roomCode), { scores: newScores, round: nr });
    }
  }

  // ══════════════════════════════════════════════════════════════
  // حركة اللاعب الحقيقي
  // ══════════════════════════════════════════════════════════════
  function handleTilePress(tile) {
    if (!roomData) return;
    const round = roomData.round;
    if (round.currentTurn !== mySeat) return;
    const myHand = round.hands[mySeat];
    const boardEmpty = round.board.length === 0;
    const moves = playable(myHand, round.openLeft, round.openRight, boardEmpty);
    const possible = moves.filter(m => m.tile[0] === tile[0] && m.tile[1] === tile[1]);

    if (possible.length === 0) { setMsg('هذه القطعة لا تتناسب الآن'); return; }
    if (possible.length === 1) {
      setSelectedTile(null);
      setMsg('');
      makeMove(mySeat, round, tile, possible[0].side);
    } else {
      // القطعة تتناسب من الجانبين → اطلب اختيار الجانب
      setSelectedTile(tile);
      setMsg('اختر الجانب للوضع');
    }
  }

  function handleSideSelect(side) {
    if (!selectedTile || !roomData) return;
    const round = roomData.round;
    setSelectedTile(null);
    setMsg('');
    makeMove(mySeat, round, selectedTile, side);
  }

  function handlePass() {
    if (!roomData) return;
    const round = roomData.round;
    if (round.currentTurn !== mySeat) return;
    const myHand = round.hands[mySeat];
    const boardEmpty = round.board.length === 0;
    const moves = playable(myHand, round.openLeft, round.openRight, boardEmpty);
    if (moves.length > 0) { setMsg('لديك قطع قابلة للعب!'); return; }
    passTurn(mySeat, round);
  }

  // ══════════════════════════════════════════════════════════════
  // رندر القطعة
  // ══════════════════════════════════════════════════════════════
  function TileView({ tile, horizontal = false, small = false, highlight = false, onPress }) {
    const size = small ? 28 : 38;
    const dot = small ? 5 : 7;
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={!onPress}
        style={[
          styles.tile,
          horizontal ? styles.tileH : styles.tileV,
          { width: horizontal ? size * 2 + 2 : size, minHeight: horizontal ? size : size * 2 + 2 },
          highlight && styles.tileHighlight,
          small && styles.tileSmall,
        ]}
        activeOpacity={onPress ? 0.7 : 1}
      >
        <DotGrid n={tile[0]} size={size} dot={dot} />
        <View style={[styles.tileDivider, horizontal ? styles.tileDividerH : styles.tileDividerV]} />
        <DotGrid n={tile[1]} size={size} dot={dot} />
      </TouchableOpacity>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // ── UI ─────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════

  // ── لوبي ──
  if (phase === 'lobby') return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#06061a" />
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>→</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🁣 دومينو</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={styles.lobbyCenter}>
        <Text style={styles.lobbyEmoji}>🁣</Text>
        <Text style={styles.lobbyTitle}>دومينو الفريقين</Text>
        <Text style={styles.lobbyDesc}>الفوز بـ 151 نقطة | 4 لاعبين</Text>

        <TouchableOpacity style={styles.bigBtn} onPress={handleCreate}>
          <Text style={styles.bigBtnText}>إنشاء غرفة</Text>
        </TouchableOpacity>

        <View style={styles.joinRow}>
          <TextInput
            style={styles.codeInput}
            placeholder="كود الغرفة"
            placeholderTextColor="#3a3a60"
            value={joinCode}
            onChangeText={setJoinCode}
            autoCapitalize="characters"
            maxLength={6}
          />
          <TouchableOpacity style={[styles.bigBtn, { flex: 0, paddingHorizontal: 20 }]} onPress={handleJoin}>
            <Text style={styles.bigBtnText}>انضم</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // ── انتظار ──
  if (phase === 'waiting') return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#06061a" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { setPhase('lobby'); setRoomCode(''); }} style={styles.backBtn}>
          <Text style={styles.backText}>→</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🁣 انتظار</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={styles.lobbyCenter}>
        <Text style={styles.lobbyTitle}>كود الغرفة</Text>
        <Text style={styles.codeDisplay}>{roomCode}</Text>
        <Text style={styles.lobbyDesc}>أرسل الكود لأصدقائك</Text>

        {/* المقاعد */}
        <View style={styles.seatsGrid}>
          {[0, 1, 2, 3].map(i => {
            const s = roomData?.seats?.[i];
            const team = TEAM_OF[i];
            return (
              <View key={i} style={[styles.seatCard, team === 0 ? styles.team0Card : styles.team1Card]}>
                <Text style={styles.seatLabel}>{SEAT_LABEL[i]}</Text>
                <Text style={styles.seatName}>{s?.name || '...'}</Text>
                <Text style={[styles.seatTeam, team === 0 ? styles.t0 : styles.t1]}>
                  {team === 0 ? 'فريق 🔵' : 'فريق 🔴'}
                </Text>
              </View>
            );
          })}
        </View>

        <Text style={styles.waitText}>بوتات تنضم بعد {waitSec} ث</Text>
        <ActivityIndicator color="#06b6d4" style={{ marginTop: 12 }} />
      </View>
    </View>
  );

  // ── لعبة انتهت ──
  if (phase === 'gameOver' && gameOver) {
    const winTeamName = gameOver.winner === 0 ? 'الفريق الأزرق 🔵' : 'الفريق الأحمر 🔴';
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#06061a" />
        <View style={styles.lobbyCenter}>
          <Text style={{ fontSize: 60 }}>🏆</Text>
          <Text style={styles.lobbyTitle}>فاز {winTeamName}</Text>
          <Text style={styles.lobbyDesc}>
            {scores[0]} – {scores[1]}
          </Text>
          <TouchableOpacity style={styles.bigBtn} onPress={onBack}>
            <Text style={styles.bigBtnText}>الخروج</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── اللعب ──
  if (phase !== 'playing' || !roomData?.round) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color="#06b6d4" style={{ marginTop: 80 }} />
      </View>
    );
  }

  const round   = roomData.round;
  const myHand  = round.hands[mySeat] || [];
  const boardEmpty = round.board.length === 0;
  const myMoves = playable(myHand, round.openLeft, round.openRight, boardEmpty);
  const myMovableTiles = new Set(myMoves.map(m => `${m.tile[0]}-${m.tile[1]}`));
  const isMyTurn = round.currentTurn === mySeat;
  const canPass  = isMyTurn && myMoves.length === 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#06061a" />

      {/* هيدر */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>→</Text>
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.headerTitle}>🁣 دومينو</Text>
          <Text style={styles.scoreText}>🔵 {scores[0]}  –  {scores[1]} 🔴</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* البورد */}
      <View style={styles.boardWrap}>
        {round.board.length === 0 ? (
          <Text style={styles.boardEmpty}>ابدأ بوضع قطعة</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.boardScroll}>
            {round.board.map((item, idx) => (
              <TileView key={idx} tile={item.tile} horizontal />
            ))}
          </ScrollView>
        )}
        {round.board.length > 0 && (
          <View style={styles.openEnds}>
            <Text style={styles.openEnd}>◄ {round.openLeft}</Text>
            <Text style={styles.openEnd}>{round.openRight} ►</Text>
          </View>
        )}
      </View>

      {/* اختيار الجانب */}
      {selectedTile && (
        <View style={styles.sideModal}>
          <Text style={styles.sideTitle}>ضع القطعة في أي جانب؟</Text>
          <View style={{ flexDirection: 'row', gap: 16, marginTop: 12 }}>
            <TouchableOpacity style={styles.sideBtn} onPress={() => handleSideSelect('L')}>
              <Text style={styles.sideBtnText}>◄ اليسار ({round.openLeft})</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sideBtn} onPress={() => handleSideSelect('R')}>
              <Text style={styles.sideBtnText}>اليمين ({round.openRight}) ►</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => { setSelectedTile(null); setMsg(''); }}>
            <Text style={{ color: '#666', marginTop: 10 }}>إلغاء</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* مؤشر الدور */}
      <View style={styles.turnBar}>
        {isMyTurn ? (
          <Text style={styles.yourTurn}>⚡ دورك!</Text>
        ) : (
          <Text style={styles.theirTurn}>
            دور {roomData.seats[round.currentTurn]?.name || '...'}
          </Text>
        )}
        {msg ? <Text style={styles.msgText}>{msg}</Text> : null}
      </View>

      {/* يد اللاعب */}
      <View style={styles.handWrap}>
        <Text style={styles.handTitle}>يدي ({myHand.length})</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.handScroll}>
          {myHand.map((tile, idx) => {
            const canPlay = myMovableTiles.has(`${tile[0]}-${tile[1]}`);
            return (
              <TileView
                key={idx}
                tile={tile}
                small
                highlight={isMyTurn && canPlay}
                onPress={isMyTurn ? () => handleTilePress(tile) : null}
              />
            );
          })}
        </ScrollView>
        {canPass && (
          <TouchableOpacity style={styles.passBtn} onPress={handlePass}>
            <Text style={styles.passBtnText}>تمرير</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* أيدي اللاعبين الآخرين */}
      <View style={styles.othersRow}>
        {[0, 1, 2, 3].filter(i => i !== mySeat).map(i => (
          <View key={i} style={styles.otherPlayer}>
            <Text style={styles.otherName}>{roomData.seats[i]?.name || '...'}</Text>
            <Text style={styles.otherCount}>🁣 {round.hands[i]?.length ?? 0}</Text>
            {round.currentTurn === i && <Text style={styles.activeDot}>●</Text>}
          </View>
        ))}
      </View>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════
// مكوّن نقاط الدومينو
// ══════════════════════════════════════════════════════════════
function DotGrid({ n, size, dot }) {
  // مواضع النقاط لكل رقم
  const layouts = {
    0: [],
    1: [[0.5, 0.5]],
    2: [[0.25, 0.25], [0.75, 0.75]],
    3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]],
    4: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]],
    5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]],
    6: [[0.25, 0.2], [0.75, 0.2], [0.25, 0.5], [0.75, 0.5], [0.25, 0.8], [0.75, 0.8]],
  };
  const positions = layouts[n] || [];
  return (
    <View style={{ width: size, height: size, position: 'relative' }}>
      {positions.map(([cx, cy], i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            width: dot, height: dot,
            borderRadius: dot / 2,
            backgroundColor: '#1e293b',
            left: cx * size - dot / 2,
            top:  cy * size - dot / 2,
          }}
        />
      ))}
    </View>
  );
}

// ══════════════════════════════════════════════════════════════
// ستايلات
// ══════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#06061a', paddingTop: 56 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20, marginBottom: 8,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#0f0f2e', borderWidth: 1, borderColor: '#06b6d440',
    alignItems: 'center', justifyContent: 'center',
  },
  backText: { color: '#06b6d4', fontSize: 20, fontWeight: '700' },
  headerTitle: { color: '#06b6d4', fontSize: 18, fontWeight: '900' },
  scoreText: { color: '#a0a0c0', fontSize: 13, marginTop: 2 },

  // لوبي
  lobbyCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 14 },
  lobbyEmoji: { fontSize: 64 },
  lobbyTitle: { color: '#fff', fontSize: 24, fontWeight: '900' },
  lobbyDesc: { color: '#5a5a80', fontSize: 14 },
  bigBtn: {
    backgroundColor: '#06b6d4', borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 40, alignSelf: 'stretch', alignItems: 'center',
  },
  bigBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  joinRow: { flexDirection: 'row', gap: 10, alignSelf: 'stretch' },
  codeInput: {
    flex: 1, backgroundColor: '#0f0f2e', borderRadius: 14,
    borderWidth: 1, borderColor: '#06b6d440', color: '#fff',
    fontSize: 18, paddingHorizontal: 16, paddingVertical: 12,
    textAlign: 'center', letterSpacing: 4,
  },
  codeDisplay: { color: '#06b6d4', fontSize: 40, fontWeight: '900', letterSpacing: 8 },
  waitText: { color: '#5a5a80', fontSize: 13 },
  seatsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  seatCard: {
    width: 140, borderRadius: 14, padding: 12,
    borderWidth: 1.5, alignItems: 'center', gap: 4,
  },
  team0Card: { backgroundColor: '#0a1a2e', borderColor: '#3b82f640' },
  team1Card: { backgroundColor: '#2e0a0a', borderColor: '#ef444440' },
  seatLabel: { color: '#5a5a80', fontSize: 11 },
  seatName: { color: '#fff', fontSize: 14, fontWeight: '700' },
  seatTeam: { fontSize: 12, fontWeight: '700' },
  t0: { color: '#3b82f6' },
  t1: { color: '#ef4444' },

  // بورد
  boardWrap: {
    height: 130, backgroundColor: '#080820',
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#06b6d420',
    justifyContent: 'center',
  },
  boardScroll: { alignItems: 'center', paddingHorizontal: 12, gap: 2 },
  boardEmpty: { color: '#3a3a60', textAlign: 'center', fontSize: 14 },
  openEnds: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 16, marginTop: 4,
  },
  openEnd: { color: '#06b6d4', fontSize: 12, fontWeight: '700' },

  // قطعة
  tile: {
    backgroundColor: '#f0ede0',
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#c8b89040',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 3,
    margin: 2,
  },
  tileV: { flexDirection: 'column' },
  tileH: { flexDirection: 'row' },
  tileSmall: { borderRadius: 4 },
  tileHighlight: { borderColor: '#06b6d4', borderWidth: 2.5, backgroundColor: '#e8f8ff' },
  tileDivider: { backgroundColor: '#5a4a20', borderRadius: 1 },
  tileDividerV: { width: '80%', height: 1.5 },
  tileDividerH: { height: '80%', width: 1.5 },

  // اختيار الجانب
  sideModal: {
    backgroundColor: '#0f0f2e', borderWidth: 1, borderColor: '#06b6d440',
    borderRadius: 16, padding: 16, marginHorizontal: 20,
    alignItems: 'center', marginBottom: 8,
  },
  sideTitle: { color: '#fff', fontSize: 14, fontWeight: '700' },
  sideBtn: {
    backgroundColor: '#06b6d420', borderWidth: 1, borderColor: '#06b6d4',
    borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10,
  },
  sideBtnText: { color: '#06b6d4', fontWeight: '700', fontSize: 13 },

  // شريط الدور
  turnBar: {
    paddingHorizontal: 20, paddingVertical: 6,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  yourTurn: { color: '#06b6d4', fontWeight: '900', fontSize: 15 },
  theirTurn: { color: '#5a5a80', fontSize: 13 },
  msgText: { color: '#fbbf24', fontSize: 12 },

  // يد اللاعب
  handWrap: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderTopWidth: 1, borderColor: '#06b6d420',
  },
  handTitle: { color: '#5a5a80', fontSize: 11, marginBottom: 6 },
  handScroll: { alignItems: 'center', gap: 4 },
  passBtn: {
    alignSelf: 'center', marginTop: 8,
    backgroundColor: '#1e293b', borderRadius: 10,
    paddingHorizontal: 24, paddingVertical: 8,
    borderWidth: 1, borderColor: '#3b82f640',
  },
  passBtnText: { color: '#3b82f6', fontWeight: '700', fontSize: 14 },

  // لاعبون آخرون
  othersRow: {
    flexDirection: 'row', justifyContent: 'space-around',
    paddingHorizontal: 16, paddingVertical: 8,
    borderTopWidth: 1, borderColor: '#ffffff10',
  },
  otherPlayer: { alignItems: 'center', gap: 3 },
  otherName: { color: '#5a5a80', fontSize: 11 },
  otherCount: { color: '#fff', fontSize: 13, fontWeight: '700' },
  activeDot: { color: '#06b6d4', fontSize: 12 },
});
