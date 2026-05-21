import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar,
  Dimensions, PanResponder, Animated, Platform,
} from 'react-native';
import { useTheme } from './ThemeContext';
import ExitButton from './ExitButton';
import { useLanguage } from './I18n';
import { WebScreenButton, GameInfoButton } from './WebRoomService';
import { playSound } from './SoundService';

const { width: SW, height: SH } = Dimensions.get('window');

/* ═══════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════ */
const TILE_W = 28;   // board horizontal tile width
const TILE_H = 16;   // board horizontal tile height
const DTILE_W = 16;  // board double tile width  (vertical double)
const DTILE_H = 28;  // board double tile height
const TILE_GAP = 1;
const BOARD_MARGIN_H = 62; // left/right reserved for side players

const HAND_TILE_W = 44;
const HAND_TILE_H = 76;

const TURN_DURATION = 25; // seconds

const PLAYER_NAMES = { 0: 'أنت', 1: 'teammate', 2: 'left', 3: 'right' };
// positions: 0=me(bottom), 1=top(teammate), 2=left(opponent), 3=right(opponent)
// teams: red=[0,1]  blue=[2,3]

/* ═══════════════════════════════════════════════
   PIP LAYOUTS  3×3 grid indices 0..8
   tl tc tr | ml mc mr | bl bc br
═══════════════════════════════════════════════ */
const PIPS = {
  0: [],
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

/* ═══════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════ */
function buildDeck() {
  const d = [];
  for (let a = 0; a <= 6; a++) for (let b = a; b <= 6; b++) d.push([a, b]);
  return d;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function sumHand(hand) {
  return hand.reduce((s, t) => s + t[0] + t[1], 0);
}

function boardEnds(board) {
  if (!board.length) return { left: -1, right: -1 };
  return { left: board[0][0], right: board[board.length - 1][1] };
}

function canPlayTile(tile, board) {
  if (!board.length) return true;
  const { left, right } = boardEnds(board);
  return tile[0] === left || tile[1] === left || tile[0] === right || tile[1] === right;
}

function placeTileOnBoard(board, tile, toRight) {
  const newBoard = [...board];
  const { left, right } = boardEnds(board);
  const tp = [...tile];

  if (!board.length) {
    newBoard.push(tp);
  } else if (toRight) {
    if (tp[0] === right) newBoard.push(tp);
    else if (tp[1] === right) newBoard.push([tp[1], tp[0]]);
    else if (tp[0] === left) newBoard.unshift([tp[1], tp[0]]);
    else newBoard.unshift(tp);
  } else {
    if (tp[1] === left) newBoard.unshift(tp);
    else if (tp[0] === left) newBoard.unshift([tp[1], tp[0]]);
    else if (tp[1] === right) newBoard.push([tp[1], tp[0]]);
    else newBoard.push(tp);
  }
  return newBoard;
}

function bestPlayableTile(hand, board) {
  // returns { idx, toRight } for the highest-value playable tile
  const { left, right } = boardEnds(board);
  let best = null, bestSum = -1;
  hand.forEach((t, i) => {
    if (!canPlayTile(t, board)) return;
    const s = t[0] + t[1];
    if (s > bestSum) {
      bestSum = s;
      const toRight = (t[0] === right || t[1] === right);
      best = { idx: i, toRight };
    }
  });
  return best;
}

/* ═══════════════════════════════════════════════
   PIP DOT component
═══════════════════════════════════════════════ */
function PipGrid({ value, isDouble, size = 'board' }) {
  const positions = PIPS[value] || [];
  // Percentage-based so dots always scale proportionally with tile size
  const dotPct = size === 'hand' ? '55%' : '52%';
  const padPct = size === 'hand' ? '8%' : '10%';

  return (
    <View style={{ flex: 1, padding: padPct }}>
      <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap' }}>
        {Array.from({ length: 9 }).map((_, i) => (
          <View key={i} style={{ width: '33.33%', height: '33.33%', alignItems: 'center', justifyContent: 'center' }}>
            {positions.includes(i) && (
              <View style={{
                width: dotPct, aspectRatio: 1, borderRadius: 999,
                backgroundColor: isDouble ? '#a82020' : '#1c1c2e',
              }} />
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

/* ═══════════════════════════════════════════════
   DOMINO TILE component — board version (scales proportionally)
═══════════════════════════════════════════════ */
function BoardTile({ a, b, style }) {
  const isDouble = a === b;
  // Always render vertical (column), scale to fit given dimensions
  return (
    <View style={[{
      backgroundColor: '#f9f5ed',
      borderRadius: 3,
      borderWidth: 1.2,
      borderColor: '#c4aa80',
      overflow: 'hidden',
      flexDirection: isDouble ? 'column' : 'row',
      shadowColor: '#000', shadowOffset: { width: 1, height: 2 },
      shadowOpacity: 0.32, shadowRadius: 2, elevation: 3,
    }, style]}>
      {/* Glare */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%',
        backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 3 }} pointerEvents="none" />

      <PipGrid value={a} isDouble={isDouble} size="board" />

      {/* Divider */}
      <View style={isDouble
        ? { height: 1.2, backgroundColor: 'rgba(0,0,0,0.14)', marginHorizontal: '10%' }
        : { width: 1.2, backgroundColor: 'rgba(0,0,0,0.14)', marginVertical: '10%' }
      } />

      <PipGrid value={b} isDouble={isDouble} size="board" />
    </View>
  );
}

/* ═══════════════════════════════════════════════
   HAND TILE component
═══════════════════════════════════════════════ */
function HandTile({ a, b, selected, unplayable, style }) {
  const isDouble = a === b;
  return (
    <View style={[{
      width: HAND_TILE_W, height: HAND_TILE_H,
      backgroundColor: '#f9f5ed',
      borderRadius: 7,
      borderWidth: selected ? 2 : 1.5,
      borderColor: selected ? '#f5c842' : '#c4aa80',
      overflow: 'hidden',
      flexDirection: 'column',
      opacity: unplayable ? 0.35 : 1,
      shadowColor: selected ? '#f5c842' : '#000',
      shadowOffset: { width: 0, height: selected ? 4 : 2 },
      shadowOpacity: selected ? 0.5 : 0.3,
      shadowRadius: selected ? 8 : 3,
      elevation: selected ? 8 : 3,
      transform: [{ translateY: selected ? -10 : 0 }],
    }, style]}>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%',
        backgroundColor: 'rgba(255,255,255,0.28)', borderRadius: 7 }} pointerEvents="none" />

      <PipGrid value={a} isDouble={isDouble} size="hand" />

      <View style={{ height: 1.5, backgroundColor: 'rgba(0,0,0,0.13)', marginHorizontal: '12%' }} />

      <PipGrid value={b} isDouble={isDouble} size="hand" />
    </View>
  );
}

/* ═══════════════════════════════════════════════
   FACE-DOWN CARDS (stacked side-by-side)
═══════════════════════════════════════════════ */
function FaceDownStack({ count, direction = 'horizontal' }) {
  // direction: 'horizontal' (top player) | 'vertical' (side players)
  const isH = direction === 'horizontal';
  const cW = isH ? 16 : 28;
  const cH = isH ? 28 : 16;
  const overlap = isH ? -5 : -6;

  return (
    <View style={{
      flexDirection: isH ? 'row' : 'column',
      alignItems: 'center',
    }}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={{
          width: cW, height: cH,
          backgroundColor: '#f9f5ed',
          borderRadius: 3,
          borderWidth: 1,
          borderColor: '#c4aa80',
          marginLeft: isH && i > 0 ? overlap : 0,
          marginTop: !isH && i > 0 ? overlap : 0,
          shadowColor: '#000', shadowOffset: { width: 1, height: 1 },
          shadowOpacity: 0.28, shadowRadius: 1, elevation: 2,
          backgroundColor: '#f0ebe0',
          // back pattern via inner border
        }}>
          <View style={{
            position: 'absolute', inset: 2,
            borderRadius: 2, borderWidth: 1,
            borderColor: 'rgba(150,100,60,0.2)',
          }} />
        </View>
      ))}
    </View>
  );
}

/* ═══════════════════════════════════════════════
   PLAYER LABEL (avatar + name + online dot)
═══════════════════════════════════════════════ */
function PlayerLabel({ name, emoji, bg, isActive, timerPct, showTimer, side = 'top' }) {
  const isLeft = side === 'left';
  const isRight = side === 'right';

  const avatarEl = (
    <View style={{ position: 'relative' }}>
      <View style={[styles.avatar, {
        backgroundColor: bg || '#555',
        borderColor: isActive ? '#f5c842' : 'rgba(255,255,255,0.15)',
        borderWidth: isActive ? 2.5 : 2,
        shadowColor: isActive ? '#f5c842' : '#000',
        shadowOpacity: isActive ? 0.5 : 0.2,
        shadowRadius: isActive ? 8 : 3,
        elevation: isActive ? 6 : 2,
      }]}>
        <Text style={{ fontSize: 16 }}>{emoji || '🎮'}</Text>
      </View>
      <View style={styles.onlineDot} />
    </View>
  );

  const nameEl = (
    <View style={[styles.nameTag, isActive && styles.nameTagActive]}>
      <Text style={[styles.nameText, side === 'bottom' && styles.nameTextMe]}>{name}</Text>
    </View>
  );

  return (
    <View style={{ alignItems: isRight ? 'flex-end' : isLeft ? 'flex-start' : 'center', gap: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6,
        flexDirection: isLeft ? 'row-reverse' : 'row' }}>
        {avatarEl}
        {nameEl}
      </View>
      {showTimer && (
        <View style={[styles.timerBar, { alignSelf: side === 'bottom' ? 'center' : undefined }]}>
          <View style={[styles.timerFill, {
            width: `${timerPct}%`,
            backgroundColor: timerPct > 50 ? '#2ecc71' : timerPct > 22 ? '#f39c12' : '#e74c3c',
          }]} />
        </View>
      )}
    </View>
  );
}

/* ═══════════════════════════════════════════════
   BOARD LAYOUT COMPUTATION
   Tiles snake: right → bend down → left → bend down → right …
   Each tile is scaled to fit exactly (no clipping).
═══════════════════════════════════════════════ */
function computeBoardLayout(board, areaW, areaH) {
  if (!board.length) return [];

  const minX = BOARD_MARGIN_H;
  const maxX = areaW - BOARD_MARGIN_H;
  const centerY = Math.floor(areaH * 0.42);
  const rowStep = DTILE_H + 8;

  const positions = [];
  let x = minX;
  let y = centerY;
  let dir = 1; // 1=right -1=left
  let row = 0;

  // Try to center the first row
  const firstRowTiles = [];
  let rowW = 0;
  for (let i = 0; i < board.length; i++) {
    const isD = board[i][0] === board[i][1];
    const tw = isD ? DTILE_W : TILE_W;
    if (rowW + tw + TILE_GAP > maxX - minX) break;
    firstRowTiles.push(i);
    rowW += tw + TILE_GAP;
  }
  if (firstRowTiles.length === board.length) {
    x = minX + Math.floor((maxX - minX - rowW) / 2);
  }

  for (let i = 0; i < board.length; i++) {
    const t = board[i];
    const isD = t[0] === t[1];
    const tw = isD ? DTILE_W : TILE_W;
    const th = isD ? DTILE_H : TILE_H;

    // Bend check before placing
    if (dir === 1 && x + tw > maxX) {
      row++;
      y = centerY + row * rowStep;
      dir = -1;
      x = maxX - tw;
    } else if (dir === -1 && x < minX) {
      row++;
      y = centerY + row * rowStep;
      dir = 1;
      x = minX;
    }

    positions.push({
      x,
      y: y - Math.floor(th / 2),
      w: tw,
      h: th,
      a: t[0],
      b: t[1],
      isDouble: isD,
    });

    x += dir * (tw + TILE_GAP);
  }
  return positions;
}

/* ═══════════════════════════════════════════════
   PASS BUBBLE
═══════════════════════════════════════════════ */
function PassBubble({ visible, style }) {
  if (!visible) return null;
  return (
    <View style={[{
      backgroundColor: 'rgba(231,76,60,0.9)',
      paddingHorizontal: 12, paddingVertical: 4,
      borderRadius: 10, position: 'absolute',
    }, style]}>
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12, letterSpacing: 1 }}>PASS</Text>
    </View>
  );
}

/* ═══════════════════════════════════════════════
   RESULT SCREEN
═══════════════════════════════════════════════ */
function ResultScreen({ scores, playerNames, visible, onNewGame, onExit }) {
  if (!visible) return null;
  const redWon = scores.red >= 151;
  return (
    <View style={styles.resultOverlay}>
      <Text style={{ fontSize: 52 }}>{redWon ? '🏆' : '🏆'}</Text>
      <Text style={styles.resultTitle}>
        {redWon ? `فاز ${playerNames[0]} & ${playerNames[1]}!` : `فاز ${playerNames[2]} & ${playerNames[3]}!`}
      </Text>
      <View style={{ flexDirection: 'row', gap: 14 }}>
        {[
          { label: `${playerNames[0]} & ${playerNames[1]}`, pts: scores.red, won: redWon },
          { label: `${playerNames[2]} & ${playerNames[3]}`, pts: scores.blue, won: !redWon },
        ].map((team, i) => (
          <View key={i} style={[styles.resultCard, team.won && styles.resultCardWin]}>
            {team.won && (
              <View style={styles.winBadge}>
                <Text style={{ fontSize: 9, fontWeight: '900', color: '#1a1a1a' }}>🏆 الفائز</Text>
              </View>
            )}
            <Text style={{ fontSize: 10, color: team.won ? 'rgba(245,200,66,0.85)' : 'rgba(255,255,255,0.55)', marginBottom: 3 }}>{team.label}</Text>
            <Text style={{ fontSize: 30, fontWeight: '900', color: team.won ? '#f5c842' : '#fff' }}>
              {team.pts}<Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: '400' }}> نقطة</Text>
            </Text>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
        <TouchableOpacity onPress={onExit} style={styles.resBtnSec}>
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontWeight: '700' }}>🚪 خروج</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onNewGame} style={styles.resBtnPri}>
          <Text style={{ color: '#1a1a1a', fontWeight: '900' }}>▶ جولة جديدة</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ═══════════════════════════════════════════════
   MAIN SCREEN
═══════════════════════════════════════════════ */
export default function DominoGameScreen({ onBack, currentUser, players: initialPlayers, onGameEnd }) {
  const { theme, themeId } = useTheme();
  const { lang } = useLanguage();

  // ── Game state ──
  const [hands, setHands] = useState([[], [], [], []]);
  const [board, setBoard] = useState([]);
  const [current, setCurrent] = useState(0);
  const [scores, setScores] = useState({ red: 0, blue: 0 });
  const [roundNum, setRoundNum] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [roundOver, setRoundOver] = useState(false);
  const [lastPlayed, setLastPlayed] = useState(-1);

  // ── UI state ──
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [dragTileIdx, setDragTileIdx] = useState(null);
  const [passBubble, setPassBubble] = useState([false, false, false, false]);
  const [timerPct, setTimerPct] = useState(100);
  const [boardArea, setBoardArea] = useState({ x: 0, y: 0, width: SW, height: 400 });

  // ── Refs ──
  const botTimeouts = useRef([]);
  const timerRef = useRef(null);
  const timerPctRef = useRef(100);
  const currentRef = useRef(0);
  const handsRef = useRef([[], [], [], []]);
  const boardRef = useRef([]);
  const roundOverRef = useRef(false);
  const gameOverRef = useRef(false);
  const boardAreaRef = useRef({ x: 0, y: 0, width: SW, height: 400 });
  const dragTileIdxRef = useRef(null); // Fix: ref so PanResponder closure always reads latest value

  // Player info (names/emojis can come from props or defaults)
  const playerInfo = [
    { name: currentUser?.name || 'أنت',   emoji: '😎', bg: '#fa709a', team: 'red' },
    { name: 'ساره',   emoji: '👩',         bg: '#f093fb', team: 'red' },
    { name: 'فيصل',  emoji: '👨',         bg: '#43e97b', team: 'blue' },
    { name: 'علي',   emoji: '🧔',         bg: '#4facfe', team: 'blue' },
  ];

  /* ── Sync refs ── */
  useEffect(() => { currentRef.current = current; }, [current]);
  useEffect(() => { handsRef.current = hands; }, [hands]);
  useEffect(() => { boardRef.current = board; }, [board]);
  useEffect(() => { roundOverRef.current = roundOver; }, [roundOver]);
  useEffect(() => { gameOverRef.current = gameOver; }, [gameOver]);
  useEffect(() => { dragTileIdxRef.current = dragTileIdx; }, [dragTileIdx]);

  /* ── Init game ── */
  useEffect(() => { startNewRound(0, { red: 0, blue: 0 }, 1, true); }, []);

  function startNewRound(startPlayer, currentScores, roundNumber, isFirst = false) {
    const deck = shuffle(buildDeck());
    const newHands = [deck.slice(0, 7), deck.slice(7, 14), deck.slice(14, 21), deck.slice(21, 28)];

    // First round: find who has 6:6
    let starter = startPlayer;
    if (isFirst) {
      for (let i = 0; i < 4; i++) {
        if (newHands[i].some(t => t[0] === 6 && t[1] === 6)) { starter = i; break; }
      }
    }

    setHands(newHands);
    setBoard([]);
    setCurrent(starter);
    setRoundNum(roundNumber);
    setRoundOver(false);
    setSelectedIdx(null);
    setDragTileIdx(null);
    setDragging(false);
    setPassBubble([false, false, false, false]);
    handsRef.current = newHands;
    boardRef.current = [];
    roundOverRef.current = false;
    currentRef.current = starter;

    startTimer(100);

    // If starter != me, trigger bot (and if first round, auto-place 6:6)
    if (starter !== 0) {
      scheduleBot(starter, isFirst, newHands, []);
    } else if (isFirst) {
      // Me has 6:6 — auto place it (first round rule)
      const idx66 = newHands[0].findIndex(t => t[0] === 6 && t[1] === 6);
      if (idx66 >= 0) {
        setTimeout(() => autoPlace(0, idx66, true, newHands, []), 600);
      }
    }
  }

  /* ── Timer ── */
  function startTimer(startPct) {
    if (timerRef.current) clearInterval(timerRef.current);
    timerPctRef.current = startPct;
    setTimerPct(startPct);

    timerRef.current = setInterval(() => {
      if (roundOverRef.current || gameOverRef.current) { clearInterval(timerRef.current); return; }
      if (currentRef.current !== 0) { return; } // only tick for human turn

      timerPctRef.current = Math.max(0, timerPctRef.current - (100 / TURN_DURATION / 2.5));
      setTimerPct(Math.round(timerPctRef.current));

      if (timerPctRef.current <= 0) {
        clearInterval(timerRef.current);
        // Auto-play for human (timeout)
        const h = handsRef.current[0];
        const b = boardRef.current;
        if (h.some(t => canPlayTile(t, b))) {
          const best = bestPlayableTile(h, b);
          if (best) autoPlace(0, best.idx, best.toRight, handsRef.current, boardRef.current);
        } else {
          doPass(0);
        }
      }
    }, 400);
  }

  function resetTimer() {
    startTimer(100);
  }

  /* ── Place tile (for any player) ── */
  function autoPlace(pidx, tileIdx, toRight, currentHands, currentBoard) {
    if (roundOverRef.current || gameOverRef.current) return;

    const newBoard = placeTileOnBoard(currentBoard, currentHands[pidx][tileIdx], toRight);
    const newHands = currentHands.map((h, i) => i === pidx ? h.filter((_, j) => j !== tileIdx) : [...h]);

    setBoard(newBoard);
    setHands(newHands);
    boardRef.current = newBoard;
    handsRef.current = newHands;
    setLastPlayed(pidx);

    if (newHands[pidx].length === 0) {
      endRound(pidx, 'domino', newHands, newBoard);
      return;
    }

    const next = (pidx + 1) % 4;
    setCurrent(next);
    currentRef.current = next;
    setSelectedIdx(null);
    setDragTileIdx(null);

    if (next === 0) {
      resetTimer();
    } else {
      scheduleBot(next, false, newHands, newBoard);
    }
  }

  /* ── Pass ── */
  function doPass(pidx) {
    if (roundOverRef.current || gameOverRef.current) return;

    setPassBubble(pb => { const n = [...pb]; n[pidx] = true; return n; });
    setTimeout(() => setPassBubble(pb => { const n = [...pb]; n[pidx] = false; return n; }), 1800);

    // Check if all blocked
    const h = handsRef.current;
    const b = boardRef.current;
    const allBlocked = h.every((hand, i) => !hand.some(t => canPlayTile(t, b)));
    if (allBlocked) { endRound(-1, 'blocked', h, b); return; }

    const next = (pidx + 1) % 4;
    setCurrent(next);
    currentRef.current = next;

    if (next === 0) {
      resetTimer();
    } else {
      scheduleBot(next, false, handsRef.current, boardRef.current);
    }
  }

  /* ── Schedule bot ── */
  function scheduleBot(pidx, force66, currentHands, currentBoard) {
    if (pidx === 0) return;
    const delay = 800 + Math.random() * 1000;
    const t = setTimeout(() => {
      if (roundOverRef.current || gameOverRef.current) return;
      if (currentRef.current !== pidx) return;

      const h = handsRef.current[pidx];
      const b = boardRef.current;

      if (force66) {
        const idx = h.findIndex(t => t[0] === 6 && t[1] === 6);
        if (idx >= 0) { autoPlace(pidx, idx, true, handsRef.current, boardRef.current); return; }
      }

      if (!h.some(t => canPlayTile(t, b))) {
        doPass(pidx);
        return;
      }
      const best = bestPlayableTile(h, b);
      if (best) autoPlace(pidx, best.idx, best.toRight, handsRef.current, boardRef.current);
    }, delay);
    botTimeouts.current.push(t);
  }

  /* ── End round ── */
  function endRound(winnerId, reason, finalHands, finalBoard) {
    if (gameOverRef.current) return;
    roundOverRef.current = true;
    setRoundOver(true);
    if (timerRef.current) clearInterval(timerRef.current);

    setScores(prev => {
      let roundPts = 0;
      let newScores = { ...prev };

      if (reason === 'domino') {
        const isRed = [0, 1].includes(winnerId);
        const oppSum = isRed
          ? sumHand(finalHands[2]) + sumHand(finalHands[3])
          : sumHand(finalHands[0]) + sumHand(finalHands[1]);
        roundPts = oppSum;
        if (isRed) newScores.red += roundPts;
        else newScores.blue += roundPts;
      } else {
        // blocked
        const redSum = sumHand(finalHands[0]) + sumHand(finalHands[1]);
        const blueSum = sumHand(finalHands[2]) + sumHand(finalHands[3]);
        if (redSum < blueSum) newScores.red += blueSum;
        else if (blueSum < redSum) newScores.blue += redSum;
      }

      if (newScores.red >= 151 || newScores.blue >= 151) {
        gameOverRef.current = true;
        // اللاعب دائماً في الفريق الأحمر (index 0) في هذه اللعبة المحلية
        if (onGameEnd) onGameEnd(newScores.red >= 151);
        setTimeout(() => setGameOver(true), 600);
      } else {
        setTimeout(() => {
          setRoundNum(r => {
            const nextRound = r + 1;
            const nextStarter = winnerId >= 0 ? winnerId : 0;
            startNewRound(nextStarter, newScores, nextRound, false);
            return nextRound;
          });
        }, 1400);
      }
      return newScores;
    });
  }

  /* ── Human plays tile ── */
  function humanPlay(tileIdx, toRight) {
    if (currentRef.current !== 0 || roundOverRef.current || gameOverRef.current) return;
    const tile = handsRef.current[0][tileIdx];
    if (!tile || !canPlayTile(tile, boardRef.current)) return;
    playSound('card_play');
    if (timerRef.current) clearInterval(timerRef.current);
    autoPlace(0, tileIdx, toRight, handsRef.current, boardRef.current);
  }

  /* ── Drag handlers ── */
  const boardAreaRef2 = useRef(null);

  function onBoardLayout(e) {
    const { x, y, width, height } = e.nativeEvent.layout;
    setBoardArea({ x, y, width, height });
    boardAreaRef.current = { x, y, width, height };
  }

  function createPanResponder(tileIdx) {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 4 || Math.abs(gs.dx) > 4,

      onPanResponderGrant: (e) => {
        const tile = handsRef.current[0][tileIdx];
        if (!tile || !canPlayTile(tile, boardRef.current)) return;
        dragTileIdxRef.current = tileIdx;
        setDragTileIdx(tileIdx);
        setDragPos({ x: e.nativeEvent.pageX, y: e.nativeEvent.pageY });
        setDragging(true);
        setSelectedIdx(tileIdx);
      },

      onPanResponderMove: (e) => {
        setDragPos({ x: e.nativeEvent.pageX, y: e.nativeEvent.pageY });
      },

      onPanResponderRelease: (e) => {
        setDragging(false);
        const px = e.nativeEvent.pageX;
        const py = e.nativeEvent.pageY;
        const ba = boardAreaRef.current;
        const currentDragIdx = dragTileIdxRef.current; // read from ref — always fresh

        const onBoard = px > ba.x && px < ba.x + ba.width &&
                        py > ba.y && py < ba.y + ba.height;

        if (onBoard && currentDragIdx !== null) {
          const midX = ba.x + ba.width / 2;
          const toRight = px > midX;
          humanPlay(currentDragIdx, toRight);
        }
        dragTileIdxRef.current = null;
        setDragTileIdx(null);
        setDragging(false);
      },

      onPanResponderTerminate: () => {
        setDragging(false);
        dragTileIdxRef.current = null;
        setDragTileIdx(null);
      },
    });
  }

  // Pre-create panResponders for up to 7 hand tiles
  const panResponders = useRef(
    Array.from({ length: 7 }, (_, i) => createPanResponder(i))
  );

  // Rebuild panResponders when hand changes (needed for correct closure)
  useEffect(() => {
    panResponders.current = Array.from({ length: 7 }, (_, i) => createPanResponder(i));
  }, [hands, board, current, roundOver, gameOver, dragTileIdx]);

  /* ── Board layout ── */
  const boardPositions = computeBoardLayout(board, boardArea.width || SW - 16, boardArea.height || 400);

  /* ── Render ── */
  const isMyTurn = current === 0 && !roundOver && !gameOver;

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ── HEADER ── */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <ExitButton onPress={onBack} />
          <GameInfoButton gameType="domino" lang={lang} />
          <WebScreenButton
            playerUid={currentUser?.uid || 'dom_p0'}
            playerName={playerInfo?.[0]?.name || ''}
            gameType="domino"
            gameRoomId={roomId || ''}
            getPublicData={() => ({ scores, round: roundNum })}
            themeName={themeId || 'dark'}
          />
        </View>

        <View style={styles.scores}>
          <View style={[styles.scoreCard, { borderColor: 'rgba(231,76,60,0.3)' }]}>
            <View style={[styles.teamDot, { backgroundColor: '#e74c3c' }]} />
            <View>
              <Text style={styles.teamNames}>{playerInfo[0].name} & {playerInfo[1].name}</Text>
              <Text style={styles.teamPts}>{scores.red} <Text style={styles.teamPtsOf}>/ 151</Text></Text>
            </View>
          </View>
          <Text style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>·</Text>
          <View style={[styles.scoreCard, { borderColor: 'rgba(52,152,219,0.3)' }]}>
            <View style={[styles.teamDot, { backgroundColor: '#3498db' }]} />
            <View>
              <Text style={styles.teamNames}>{playerInfo[2].name} & {playerInfo[3].name}</Text>
              <Text style={styles.teamPts}>{scores.blue} <Text style={styles.teamPtsOf}>/ 151</Text></Text>
            </View>
          </View>
        </View>

        <View style={{ width: 34 }} />
      </View>

      {/* ── ROUND BADGE ── */}
      <View style={styles.roundBadge}>
        <Text style={styles.roundText}>الجولة {roundNum} · دور: {playerInfo[current].name}</Text>
      </View>

      {/* ══════════════════════════════
          GAME AREA
      ══════════════════════════════ */}
      <View style={styles.gameArea} onLayout={onBoardLayout}>

        {/* ── TOP PLAYER (teammate) ── */}
        <View style={styles.playerTop}>
          <PlayerLabel
            name={playerInfo[1].name}
            emoji={playerInfo[1].emoji}
            bg={playerInfo[1].bg}
            isActive={current === 1}
            side="top"
          />
          <FaceDownStack count={hands[1].length} direction="horizontal" />
          <PassBubble visible={passBubble[1]} style={{ top: -28, alignSelf: 'center' }} />
        </View>

        {/* ── LEFT PLAYER (opponent) ── */}
        <View style={styles.playerLeft}>
          <PlayerLabel
            name={playerInfo[2].name}
            emoji={playerInfo[2].emoji}
            bg={playerInfo[2].bg}
            isActive={current === 2}
            side="left"
          />
          <FaceDownStack count={hands[2].length} direction="vertical" />
          <PassBubble visible={passBubble[2]} style={{ bottom: -28, alignSelf: 'center' }} />
        </View>

        {/* ── RIGHT PLAYER (opponent) ── */}
        <View style={styles.playerRight}>
          <PlayerLabel
            name={playerInfo[3].name}
            emoji={playerInfo[3].emoji}
            bg={playerInfo[3].bg}
            isActive={current === 3}
            side="right"
          />
          <FaceDownStack count={hands[3].length} direction="vertical" />
          <PassBubble visible={passBubble[3]} style={{ bottom: -28, alignSelf: 'center' }} />
        </View>

        {/* ── BOARD TILES ── */}
        {boardPositions.map((pos, i) => (
          <BoardTile
            key={i}
            a={pos.a}
            b={pos.b}
            style={{
              position: 'absolute',
              left: pos.x,
              top: pos.y,
              width: pos.w,
              height: pos.h,
            }}
          />
        ))}

        {/* ── BOTTOM PLAYER (me) ── */}
        <View style={styles.playerBottom}>
          {isMyTurn && (
            <Text style={styles.turnArrow}>▲ دورك</Text>
          )}
          <PlayerLabel
            name={playerInfo[0].name}
            emoji={playerInfo[0].emoji}
            bg={playerInfo[0].bg}
            isActive={current === 0}
            timerPct={timerPct}
            showTimer={current === 0}
            side="bottom"
          />
          <PassBubble visible={passBubble[0]} style={{ top: -28, alignSelf: 'center' }} />
        </View>

      </View>{/* /gameArea */}

      {/* ══════════════════════════════
          MY HAND
      ══════════════════════════════ */}
      <View style={styles.handSection}>
        <Text style={styles.handLabel}>بطاقاتي</Text>
        <View style={styles.handRow}>
          {hands[0].map((tile, idx) => {
            const playable = canPlayTile(tile, board);
            const pr = panResponders.current[idx];
            return (
              <View
                key={idx}
                {...(pr ? pr.panHandlers : {})}
              >
                <HandTile
                  a={tile[0]}
                  b={tile[1]}
                  selected={selectedIdx === idx}
                  unplayable={!playable || !isMyTurn}
                />
              </View>
            );
          })}
        </View>
      </View>

      {/* ── DRAG GHOST ── */}
      {dragging && dragTileIdx !== null && hands[0][dragTileIdx] && (
        <View
          pointerEvents="none"
          style={[styles.dragGhost, { left: dragPos.x - HAND_TILE_W / 2, top: dragPos.y - HAND_TILE_H / 2 }]}
        >
          <HandTile
            a={hands[0][dragTileIdx][0]}
            b={hands[0][dragTileIdx][1]}
            selected={false}
            unplayable={false}
          />
        </View>
      )}

      {/* ── RESULT SCREEN ── */}
      <ResultScreen
        scores={scores}
        playerNames={playerInfo.map(p => p.name)}
        visible={gameOver}
        onNewGame={() => {
          setGameOver(false);
          gameOverRef.current = false;
          const newScores = { red: 0, blue: 0 };
          setScores(newScores);
          startNewRound(0, newScores, 1, true);
        }}
        onExit={onBack}
      />
    </View>
  );
}

/* ═══════════════════════════════════════════════
   STYLES
═══════════════════════════════════════════════ */
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 52 : 36,
    paddingHorizontal: 14,
    paddingBottom: 8,
    gap: 8,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.38)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  exitBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  scores: { flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 6, alignItems: 'center' },
  scoreCard: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(0,0,0,0.42)',
    borderWidth: 1,
    borderRadius: 18, paddingVertical: 5, paddingHorizontal: 10,
    justifyContent: 'center',
  },
  teamDot: { width: 7, height: 7, borderRadius: 4 },
  teamNames: { fontSize: 9, color: 'rgba(255,255,255,0.6)' },
  teamPts: { fontSize: 16, fontWeight: '900', color: '#fff', lineHeight: 18 },
  teamPtsOf: { fontSize: 8, color: 'rgba(255,255,255,0.35)', fontWeight: '400' },

  // Round badge
  roundBadge: {
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.38)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 10, paddingVertical: 3, paddingHorizontal: 12,
    marginBottom: 2, zIndex: 10,
  },
  roundText: { fontSize: 10, color: 'rgba(255,255,255,0.5)' },

  // Game area
  gameArea: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },

  // Player positions
  playerTop: {
    position: 'absolute', top: 8, left: 0, right: 0,
    alignItems: 'center', gap: 5, zIndex: 15,
  },
  playerLeft: {
    position: 'absolute', left: 8, top: '35%',
    alignItems: 'flex-start', gap: 6, zIndex: 15,
  },
  playerRight: {
    position: 'absolute', right: 8, top: '35%',
    alignItems: 'flex-end', gap: 6, zIndex: 15,
  },
  playerBottom: {
    position: 'absolute', bottom: 8, left: 0, right: 0,
    alignItems: 'center', gap: 4, zIndex: 15,
  },

  // Avatar
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2,
  },
  onlineDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#2ecc71',
    borderWidth: 2, borderColor: '#0a2e18',
  },
  nameTag: {
    backgroundColor: 'rgba(0,0,0,0.38)',
    paddingHorizontal: 9, paddingVertical: 3,
    borderRadius: 9,
  },
  nameTagActive: {
    backgroundColor: 'rgba(245,200,66,0.18)',
    borderWidth: 1, borderColor: 'rgba(245,200,66,0.3)',
  },
  nameText: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },
  nameTextMe: { color: '#fff' },

  // Timer
  timerBar: {
    width: 70, height: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 2, overflow: 'hidden',
  },
  timerFill: { height: '100%', borderRadius: 2 },

  turnArrow: {
    color: '#f5c842', fontSize: 11, fontWeight: '700',
    marginBottom: 2,
  },

  // Hand
  handSection: {
    paddingHorizontal: 10, paddingTop: 5, paddingBottom: Platform.OS === 'ios' ? 22 : 14,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.50)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  handLabel: {
    fontSize: 10, color: 'rgba(255,255,255,0.38)',
    textAlign: 'center', letterSpacing: 1, marginBottom: 7,
  },
  handRow: {
    flexDirection: 'row', justifyContent: 'center',
    gap: 6, flexWrap: 'nowrap',
  },

  // Drag ghost
  dragGhost: {
    position: 'absolute', zIndex: 999,
    opacity: 0.88,
    transform: [{ rotate: '5deg' }, { scale: 1.06 }],
  },

  // Result
  resultOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.84)',
    alignItems: 'center', justifyContent: 'center',
    gap: 16, zIndex: 100, borderRadius: 0,
  },
  resultTitle: {
    fontSize: 24, fontWeight: '900', color: '#f5c842', letterSpacing: 1,
  },
  resultCard: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14, padding: 16,
    alignItems: 'center', minWidth: 90, position: 'relative',
  },
  resultCardWin: {
    borderColor: '#f5c842',
    backgroundColor: 'rgba(245,200,66,0.09)',
    shadowColor: '#f5c842', shadowOpacity: 0.2, shadowRadius: 12, elevation: 6,
  },
  winBadge: {
    position: 'absolute', top: -10, alignSelf: 'center',
    backgroundColor: '#f5c842',
    paddingHorizontal: 9, paddingVertical: 2, borderRadius: 8,
  },
  resBtnPri: {
    backgroundColor: '#f5c842',
    paddingVertical: 12, paddingHorizontal: 22,
    borderRadius: 14,
  },
  resBtnSec: {
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)',
    paddingVertical: 12, paddingHorizontal: 22,
    borderRadius: 14,
  },
});
