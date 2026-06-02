import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  StatusBar, Alert, Image
} from 'react-native';
import { useOnlineGame } from './useOnlineGame';
import { useTheme } from './ThemeContext';
import ExitButton from './ExitButton';
import { useLanguage } from './I18n';
import { XOEngraving } from './GameEngraving';
import { WebScreenButton, GameInfoButton } from './WebRoomService';
import { ThemedButton, ThemedCard, ThemedPill, ThemedRow } from './ThemedComponents';

const LINES = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6],
];

// ── حساب الفائز ──────────────────────────────────────────────
function calculateWinner(squares) {
  for (const [a, b, c] of LINES) {
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return { winner: squares[a], line: [a, b, c] };
    }
  }
  return null;
}

// ── ذكاء البوت ───────────────────────────────────────────────
function getBotMove(board, botSymbol) {
  const playerSymbol = botSymbol === 'O' ? 'X' : 'O';
  const empty = board.map((v, i) => v === null ? i : null).filter(i => i !== null);
  if (empty.length === 0) return null;

  // 1) هل يستطيع البوت الفوز الآن؟
  for (const idx of empty) {
    const test = [...board];
    test[idx] = botSymbol;
    if (calculateWinner(test)) return idx;
  }

  // 2) هل الخصم سيفوز بخطوة واحدة؟ → امنعه
  for (const idx of empty) {
    const test = [...board];
    test[idx] = playerSymbol;
    if (calculateWinner(test)) return idx;
  }

  // 3) هل الخصم لديه خطوتان رابحتان؟ → امنع إحداهما
  const threats = [];
  for (const idx of empty) {
    const test = [...board];
    test[idx] = playerSymbol;
    let wins = 0;
    for (const idx2 of empty.filter(i => i !== idx)) {
      const test2 = [...test];
      test2[idx2] = playerSymbol;
      if (calculateWinner(test2)) wins++;
    }
    if (wins >= 2) threats.push(idx);
  }
  if (threats.length > 0) return threats[Math.floor(Math.random() * threats.length)];

  // 4) الوسط
  if (board[4] === null) return 4;

  // 5) أفضل موقع استراتيجي: ابحث عن أكثر مربع يُكمّل صفاً للبوت
  let bestScore = -1;
  let bestMove = null;
  for (const idx of empty) {
    let score = 0;
    for (const [a, b, c] of LINES) {
      if (![a, b, c].includes(idx)) continue;
      const line = [board[a], board[b], board[c]];
      if (line.includes(playerSymbol)) continue;
      const mine = line.filter(v => v === botSymbol).length;
      score += mine + 1;
    }
    if (score > bestScore) { bestScore = score; bestMove = idx; }
  }
  if (bestMove !== null) return bestMove;

  // 6) عشوائي
  return empty[Math.floor(Math.random() * empty.length)];
}

const TOTAL_ROUNDS = 7;

// ── المكوّن الرئيسي ───────────────────────────────────────────
export default function XOGameScreen({ onBack, currentUser, onGameEnd, onGameReady }) {
  const { theme, themeId } = useTheme();
  const { lang } = useLanguage();
  const {
    roomId,
    isPlayer1,
    roomData,
    loading,
    error,
    updateRoom,
    endGame,
    leaveRoom,
  } = useOnlineGame('xo', currentUser, onGameReady);

  const [board, setBoard]             = useState(Array(9).fill(null));
  const [gameStatus, setGameStatus]   = useState('waiting');
  const [roundResult, setRoundResult] = useState(null); // { winner, line } | 'draw' — نتيجة الجولة الحالية
  const [matchOver, setMatchOver]     = useState(false); // انتهت كل الجولات
  const botPlayingRef = useRef(false);

  // ── مزامنة Firebase ──────────────────────────────────────────
  useEffect(() => {
    if (!roomData) return;
    if (roomData.board)      setBoard(roomData.board);
    if (roomData.gameStatus) setGameStatus(roomData.gameStatus);

    // نتيجة الجولة الحالية
    if (roomData.gameStatus === 'round_over') {
      if (roomData.roundWinner) setRoundResult({ winner: roomData.roundWinner, line: roomData.winLine || [] });
      else                      setRoundResult('draw');
    }

    // نهاية المباراة كلها
    if (roomData.gameStatus === 'finished') {
      setMatchOver(true);
      // تسجيل XP
      const sc = roomData.scores || { player1: 0, player2: 0 };
      const myFinalScore  = isPlayer1 ? sc.player1 : sc.player2;
      const oppFinalScore = isPlayer1 ? sc.player2 : sc.player1;
      if (onGameEnd) onGameEnd(myFinalScore > oppFinalScore);
    }

    // إعادة تعيين لوحة الجولة الجديدة
    if (roomData.gameStatus === 'player1_turn' || roomData.gameStatus === 'player2_turn') {
      setRoundResult(null);
      botPlayingRef.current = false;
    }
  }, [roomData]);

  // ── البوت يلعب ───────────────────────────────────────────────
  useEffect(() => {
    const isVsBot   = roomData?.player2?.uid === 'bot';
    const isBotTurn = isPlayer1 && gameStatus === 'player2_turn' && isVsBot;
    if (!isBotTurn || roundResult || matchOver || botPlayingRef.current) return;

    botPlayingRef.current = true;
    const delay = 600 + Math.random() * 600;
    const t = setTimeout(async () => {
      const move = getBotMove(board, 'O');
      if (move === null) { botPlayingRef.current = false; return; }

      const newBoard = [...board];
      newBoard[move] = 'O';
      const res = calculateWinner(newBoard);

      const currentRound  = (roomData?.currentRound  || 1);
      const scores        = roomData?.scores || { player1: 0, player2: 0 };

      if (res) {
        const newScores = {
          player1: scores.player1 + (res.winner === 'X' ? 1 : 0),
          player2: scores.player2 + (res.winner === 'O' ? 1 : 0),
        };
        const isLastRound = currentRound >= TOTAL_ROUNDS;
        if (isLastRound) {
          await endGame({
            player1: newScores.player1,
            player2: newScores.player2,
            extra: { board: newBoard, roundWinner: res.winner, winLine: res.line, scores: newScores },
          });
        } else {
          await updateRoom({
            board: newBoard, gameStatus: 'round_over',
            roundWinner: res.winner, winLine: res.line, scores: newScores,
          });
        }
      } else if (newBoard.every(c => c !== null)) {
        const isLastRound = currentRound >= TOTAL_ROUNDS;
        if (isLastRound) {
          await endGame({ player1: scores.player1, player2: scores.player2, extra: { board: newBoard, scores } });
        } else {
          await updateRoom({ board: newBoard, gameStatus: 'round_over', roundWinner: null, winLine: null, scores });
        }
      } else {
        await updateRoom({ board: newBoard, gameStatus: 'player1_turn' });
      }
      botPlayingRef.current = false;
    }, delay);
    return () => clearTimeout(t);
  }, [gameStatus, board, roomData, roundResult, matchOver]);

  // ── حركة اللاعب ──────────────────────────────────────────────
  const handleMove = async (index) => {
    if (board[index] !== null) return;
    if (roundResult || matchOver) return;
    if (gameStatus === 'waiting') return;
    if ((isPlayer1 && gameStatus !== 'player1_turn') ||
        (!isPlayer1 && gameStatus !== 'player2_turn')) return;

    const mySymbol = isPlayer1 ? 'X' : 'O';
    const newBoard = [...board];
    newBoard[index] = mySymbol;
    setBoard(newBoard);

    const res = calculateWinner(newBoard);
    const currentRound = roomData?.currentRound || 1;
    const scores       = roomData?.scores || { player1: 0, player2: 0 };

    if (res) {
      const newScores = {
        player1: scores.player1 + (res.winner === 'X' ? 1 : 0),
        player2: scores.player2 + (res.winner === 'O' ? 1 : 0),
      };
      const isLastRound = currentRound >= TOTAL_ROUNDS;
      if (isLastRound) {
        await endGame({
          player1: newScores.player1,
          player2: newScores.player2,
          extra: { board: newBoard, roundWinner: res.winner, winLine: res.line, scores: newScores },
        });
      } else {
        await updateRoom({
          board: newBoard, gameStatus: 'round_over',
          roundWinner: res.winner, winLine: res.line, scores: newScores,
        });
      }
      return;
    }
    if (newBoard.every(c => c !== null)) {
      const isLastRound = currentRound >= TOTAL_ROUNDS;
      if (isLastRound) {
        await endGame({ player1: scores.player1, player2: scores.player2, extra: { board: newBoard, scores } });
      } else {
        await updateRoom({ board: newBoard, gameStatus: 'round_over', roundWinner: null, winLine: null, scores });
      }
      return;
    }
    await updateRoom({ board: newBoard, gameStatus: isPlayer1 ? 'player2_turn' : 'player1_turn' });
  };

  // ── الجولة التالية (player1 فقط يُرسل الأمر) ─────────────────
  const handleNextRound = async () => {
    if (!isPlayer1) return; // player2 ينتظر
    const currentRound = roomData?.currentRound || 1;
    await updateRoom({
      board: Array(9).fill(null),
      gameStatus: 'player1_turn',
      currentRound: currentRound + 1,
      roundWinner: null,
      winLine: null,
    });
  };

  const handleQuit = async () => {
    await leaveRoom();
    onBack();
  };

  // ── بيانات اللاعبين والجولات ─────────────────────────────────
  const myName        = currentUser?.name || 'أنت';
  const mySymbol      = isPlayer1 ? 'X' : 'O';
  const opponentData  = isPlayer1 ? roomData?.player2 : roomData?.player1;
  const opponentName  = opponentData?.name || '...';
  const opponentPhoto = opponentData?.photoURL || null;
  const isVsBot       = opponentData?.uid === 'bot';
  const isWaiting     = !opponentData?.uid;
  const currentRound  = roomData?.currentRound || 1;
  const scores        = roomData?.scores || { player1: 0, player2: 0 };
  const myScore       = isPlayer1 ? scores.player1 : scores.player2;
  const oppScore      = isPlayer1 ? scores.player2 : scores.player1;

  const winLine = roundResult && roundResult !== 'draw' ? roundResult.line : [];

  // اسم فائز الجولة
  const getRoundWinnerName = () => {
    if (!roundResult || roundResult === 'draw') return null;
    const w = roundResult.winner;
    if (isPlayer1) return w === 'X' ? myName : opponentName;
    return w === 'O' ? myName : opponentName;
  };

  // فائز المباراة كلها
  const getMatchWinnerName = () => {
    if (scores.player1 === scores.player2) return null; // تعادل
    const p1Won = scores.player1 > scores.player2;
    return isPlayer1 ? (p1Won ? myName : opponentName) : (p1Won ? opponentName : myName);
  };

  // ── شاشات التحميل / الخطأ ────────────────────────────────────
  if (error) {
    return (
      <View style={[s.container, { backgroundColor: theme.isCityTheme ? 'transparent' : theme.bg }]}>
        <XOEngraving theme={theme} />
        <StatusBar barStyle={theme.statusBar} />
        <View style={s.center}>
          <Text style={{ color: '#ef4444', fontSize: 15 }}>❌ {error}</Text>
          <TouchableOpacity onPress={onBack} style={[s.smallBtn, { backgroundColor: theme.bgCard, marginTop: 16 }]}>
            <Text style={{ color: theme.accent }}>رجوع</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  if (loading) {
    return (
      <View style={[s.container, { backgroundColor: theme.isCityTheme ? 'transparent' : theme.bg }]}>
        <XOEngraving theme={theme} />
        <StatusBar barStyle={theme.statusBar} />
        <View style={s.center}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={{ color: theme.textPrimary, marginTop: 12 }}>جاري الاتصال...</Text>
        </View>
      </View>
    );
  }
  if (!roomId) {
    return (
      <View style={[s.container, { backgroundColor: theme.isCityTheme ? 'transparent' : theme.bg }]}>
        <XOEngraving theme={theme} />
        <StatusBar barStyle={theme.statusBar} />
        <View style={s.center}>
          <Text style={{ color: theme.textPrimary }}>لا توجد غرفة</Text>
          <TouchableOpacity onPress={onBack} style={[s.smallBtn, { backgroundColor: theme.bgCard, marginTop: 16 }]}>
            <Text style={{ color: theme.accent }}>رجوع</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── شاشة نهاية المباراة ──────────────────────────────────────
  if (matchOver) {
    const matchWinner = getMatchWinnerName();
    return (
      <View style={[s.container, { backgroundColor: theme.isCityTheme ? 'transparent' : theme.bg }]}>
        <XOEngraving theme={theme} />
        <StatusBar barStyle={theme.statusBar} />
        <View style={s.center}>
          <Text style={{ fontSize: 52, marginBottom: 8 }}>
            {matchWinner ? '🏆' : '🤝'}
          </Text>
          <Text style={[s.matchTitle, { color: theme.accent }]}>
            {matchWinner ? `${matchWinner} فاز بالمباراة!` : 'تعادل!'}
          </Text>
          <View style={[s.finalScoreBox, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
            <Text style={[s.finalScoreLabel, { color: theme.textSecondary }]}>{myName}</Text>
            <Text style={[s.finalScoreNum, { color: theme.accent }]}>{myScore} — {oppScore}</Text>
            <Text style={[s.finalScoreLabel, { color: theme.textSecondary }]}>{opponentName}</Text>
          </View>
          <TouchableOpacity
            onPress={handleQuit}
            style={[s.smallBtn, { backgroundColor: theme.bgCard, borderColor: theme.border, borderWidth: 1, marginTop: 20 }]}
          >
            <Text style={{ color: theme.textPrimary, fontWeight: '700' }}>خروج</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── الشاشة الرئيسية ───────────────────────────────────────────
  return (
    <View style={[s.container, { backgroundColor: theme.isCityTheme ? 'transparent' : theme.bg }]}>
      <XOEngraving theme={theme} />
      <StatusBar barStyle={theme.statusBar} />

      {/* ── TopBar: زر خروج + بروفايل الخصم ── */}
      <View style={s.topBar}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <ExitButton onPress={handleQuit} />
          <GameInfoButton gameType="xo" lang={lang} />
          <WebScreenButton
            playerUid={currentUser?.uid || 'xo_p0'}
            playerName={myName}
            gameType="xo"
            gameRoomId={roomId || ''}
            getPublicData={() => ({ isMyTurn, myScore, oppScore })}
            themeName={themeId || 'dark'}
          />
        </View>

        <View style={[s.opponentBar, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
          <View style={s.avatarWrap}>
            {opponentPhoto ? (
              <Image source={{ uri: opponentPhoto }} style={s.avatar} />
            ) : (
              <View style={[s.avatarFallback, { backgroundColor: theme.bgElevated }]}>
                <Text style={{ fontSize: 16 }}>
                  {isVsBot ? '🤖' : (isWaiting ? '?' : opponentName.charAt(0))}
                </Text>
              </View>
            )}
            <View style={s.onlineDot} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.opponentName, { color: theme.textPrimary }]} numberOfLines={1}>
              {isWaiting ? 'بانتظار خصم...' : opponentName}
            </Text>
            <Text style={[s.opponentSub, { color: theme.textSecondary }]}>
              {isVsBot ? 'بوت' : 'متصل'}
            </Text>
          </View>
          <Text style={{ fontSize: 20 }}>{mySymbol === 'X' ? '⭕' : '❌'}</Text>
        </View>
      </View>

      {/* ── شريط الجولة والنقاط ── */}
      {!isWaiting && (
        <View style={[s.roundBar, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
          <Text style={[s.scoreText, { color: theme.accent }]}>{myScore}</Text>
          <View style={s.roundCenter}>
            <Text style={[s.roundLabel, { color: theme.textSecondary }]}>الجولة</Text>
            <Text style={[s.roundNum, { color: theme.textPrimary }]}>{currentRound} / {TOTAL_ROUNDS}</Text>
          </View>
          <Text style={[s.scoreText, { color: theme.accent }]}>{oppScore}</Text>
        </View>
      )}

      {/* ── نتيجة الجولة ── */}
      {roundResult && (
        <View style={[s.resultBox, { backgroundColor: theme.bgCard, borderColor: theme.accentBorder }]}>
          <Text style={{ fontSize: 28, marginBottom: 2 }}>
            {roundResult === 'draw' ? '🤝' : '🏆'}
          </Text>
          <Text style={[s.resultText, { color: theme.accent }]}>
            {roundResult === 'draw' ? 'تعادل الجولة!' : `${getRoundWinnerName()} فاز بالجولة!`}
          </Text>
          {currentRound < TOTAL_ROUNDS && isPlayer1 && (
            <TouchableOpacity
              style={[s.resetBtn, { backgroundColor: theme.accent }]}
              onPress={handleNextRound}
            >
              <Text style={{ color: theme.textOnAccent, fontWeight: '900', fontSize: 14 }}>
                الجولة التالية ←
              </Text>
            </TouchableOpacity>
          )}
          {currentRound < TOTAL_ROUNDS && !isPlayer1 && (
            <Text style={[s.waitingForNext, { color: theme.textSecondary }]}>بانتظار الجولة التالية...</Text>
          )}
        </View>
      )}

      {/* ── مؤشر الدور ── */}
      {!roundResult && !isWaiting && (
        <View style={s.turnRow}>
          <View style={s.turnItem}>
            {gameStatus === 'player1_turn' && (
              <Text style={[s.turnLabel, { color: theme.success }]}>دور</Text>
            )}
            <Text style={[s.symbolBig, gameStatus === 'player1_turn' && s.symbolActive]}>❌</Text>
          </View>
          <Text style={[s.vsText, { color: theme.textMuted }]}>VS</Text>
          <View style={s.turnItem}>
            {gameStatus === 'player2_turn' && (
              <Text style={[s.turnLabel, { color: theme.error }]}>دور</Text>
            )}
            <Text style={[s.symbolBig, gameStatus === 'player2_turn' && s.symbolActive]}>⭕</Text>
          </View>
        </View>
      )}

      {/* ── اللوحة ── */}
      <View style={s.board}>
        {board.map((cell, index) => {
          const isWinCell = winLine.includes(index);
          return (
            <TouchableOpacity
              key={index}
              style={[
                s.cell,
                { backgroundColor: theme.bgCard, borderColor: theme.border },
                isWinCell && s.cellWin,
              ]}
              onPress={() => handleMove(index)}
              disabled={!!roundResult || isWaiting || matchOver}
            >
              <Text style={[s.cellText, { opacity: cell ? 1 : 0.04 }]}>
                {cell === 'X' ? '❌' : '⭕'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── رسالة انتظار الخصم ── */}
      {isWaiting && (
        <View style={[s.waitingBox, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
          <ActivityIndicator color={theme.accent} style={{ marginBottom: 8 }} />
          <Text style={[s.waitingText, { color: theme.textPrimary }]}>بانتظار الخصم...</Text>
          <Text style={[s.waitingSub, { color: theme.textSecondary }]}>ستبدأ اللعبة تلقائياً عند انضمامه</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container:  { flex: 1, paddingTop: 52, paddingHorizontal: 16 },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // TopBar
  topBar:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  quitSmall:  { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  opponentBar:{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1 },
  avatarWrap: { position: 'relative' },
  avatar:     { width: 34, height: 34, borderRadius: 17 },
  avatarFallback: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  onlineDot:  { position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: '#22c55e', borderWidth: 1.5 },
  opponentName: { fontSize: 13, fontWeight: '700' },
  opponentSub:  { fontSize: 10, marginTop: 1 },

  // Round bar
  roundBar:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8, marginBottom: 10, borderWidth: 1 },
  scoreText:  { fontSize: 22, fontWeight: '900', minWidth: 28, textAlign: 'center' },
  roundCenter:{ alignItems: 'center' },
  roundLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  roundNum:   { fontSize: 16, fontWeight: '900' },

  // Round result
  resultBox:  { borderRadius: 16, padding: 14, alignItems: 'center', marginBottom: 10, borderWidth: 1, gap: 2 },
  resultText: { fontSize: 18, fontWeight: '900' },
  resetBtn:   { marginTop: 8, paddingHorizontal: 22, paddingVertical: 9, borderRadius: 12 },
  waitingForNext: { fontSize: 12, marginTop: 6 },

  // Turn indicator
  turnRow:    { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 24, marginBottom: 10 },
  turnItem:   { alignItems: 'center', gap: 2, minHeight: 50 },
  turnLabel:  { fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  symbolBig:  { fontSize: 34, opacity: 0.4 },
  symbolActive: { opacity: 1 },
  vsText:     { fontSize: 14, fontWeight: '700', marginBottom: 6 },

  // Board
  board:      { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 12 },
  cell:       { width: '31%', aspectRatio: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 10, borderWidth: 1 },
  cellWin:    { borderColor: '#a78bfa', backgroundColor: 'rgba(167,139,250,0.15)' },
  cellText:   { fontSize: 38 },

  // Waiting
  waitingBox: { borderRadius: 14, padding: 20, alignItems: 'center', borderWidth: 1, gap: 4 },
  waitingText:{ fontSize: 16, fontWeight: '700' },
  waitingSub: { fontSize: 12 },

  // Match over screen
  matchTitle:     { fontSize: 24, fontWeight: '900', marginBottom: 20, textAlign: 'center' },
  finalScoreBox:  { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 16, paddingHorizontal: 24, paddingVertical: 14, borderWidth: 1 },
  finalScoreLabel:{ fontSize: 13, fontWeight: '700' },
  finalScoreNum:  { fontSize: 28, fontWeight: '900' },

  smallBtn:   { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12, alignItems: 'center' },
}); 
