import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar,
  Dimensions, Platform, Modal, ScrollView,
} from 'react-native';
import { useTheme } from './ThemeContext';
import { useLanguage } from './I18n';
import { useOnlineGame } from './useOnlineGame';
import { WebScreenButton, GameInfoButton } from './WebRoomService';
import { playSound } from './SoundService';
import { ThemedButton, ThemedCard, ThemedPill, ThemedRow } from './ThemedComponents';
import CrystalTable from './CrystalTable';

const { width: SW, height: SH } = Dimensions.get('window');

const CARD_W   = 46;
const CARD_H   = 64;
const TRICK_W  = 50;
const TRICK_H  = 70;
const TURN_SEC = 20;
const WIN_SCORE = 152;
const HAND_OVERLAP = -16;

const SUITS      = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' };
const SUIT_COLOR = { spades: '#1a1a2e', hearts: '#c0392b', diamonds: '#c0392b', clubs: '#1a1a2e' };
const SUIT_NAME  = { spades: 'بستوني', hearts: 'قلوب', diamonds: 'ديامونا', clubs: 'شومة' };

const CARD_POINTS  = { A: 11, '10': 10, K: 4, Q: 3, J: 2, '9': 0, '8': 0, '7': 0 };
const TRUMP_POINTS = { J: 20, '9': 14, A: 11, '10': 10, K: 4, Q: 3, '8': 0, '7': 0 };
const TRUMP_STR    = { J: 20, '9': 14, A: 11, '10': 10, K: 4, Q: 3, '8': 2, '7': 1 };

function buildDeck() {
  const ranks = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const deck = [];
  ['spades', 'hearts', 'diamonds', 'clubs'].forEach(suit => {
    ranks.forEach((rank, i) => deck.push({ suit, rank, value: i }));
  });
  return deck;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function sortHand(hand, trump) {
  if (!hand?.length) return [];
  const tr = hand.filter(c => c.suit === trump)
    .sort((a, b) => (TRUMP_STR[b.rank] ?? 0) - (TRUMP_STR[a.rank] ?? 0));
  const rest = [];
  ['spades', 'hearts', 'diamonds', 'clubs'].filter(s => s !== trump).forEach(s => {
    rest.push(...hand.filter(c => c.suit === s).sort((a, b) => b.value - a.value));
  });
  return [...tr, ...rest];
}

function trickPoints(trick, trump) {
  return trick.reduce((sum, { card }) => {
    const pts = card.suit === trump ? (TRUMP_POINTS[card.rank] ?? 0) : (CARD_POINTS[card.rank] ?? 0);
    return sum + pts;
  }, 0);
}

function cardStr(card, trump, led) {
  if (card.suit === trump) return 100 + (TRUMP_STR[card.rank] ?? 0);
  if (card.suit === led) return card.value;
  return -1;
}

function trickWinner(trick, trump) {
  if (!trick?.length) return null;
  const led = trick[0].card.suit;
  return trick.reduce((best, t) =>
    cardStr(t.card, trump, led) > cardStr(best.card, trump, led) ? t : best
  ).uid;
}

function bilootBonus(hand) {
  return ['spades', 'hearts', 'diamonds', 'clubs'].reduce((sum, s) => {
    const hasK = hand.some(c => c.suit === s && c.rank === 'K');
    const hasA = hand.some(c => c.suit === s && c.rank === 'A');
    return sum + (hasK && hasA ? 20 : 0);
  }, 0);
}

function FaceDownStack({ count, direction = 'horizontal' }) {
  const n = Math.min(count || 0, 8);
  if (direction === 'horizontal') {
    return (
      <View style={{ flexDirection: 'row', transform: [{ rotate: '180deg' }] }}>
        {Array.from({ length: n }).map((_, i) => (
          <View key={i} style={[st.miniCard, { marginLeft: i === 0 ? 0 : -10, zIndex: n - i }]} />
        ))}
      </View>
    );
  }
  const isLeft = direction === 'side-left';
  return (
    <View style={{
      transform: [
        { rotate: isLeft ? '-90deg' : '90deg' },
        { translateX: isLeft ? -(n * 3) : (n * 3) },
      ],
    }}>
      <View style={{ flexDirection: 'row' }}>
        {Array.from({ length: n }).map((_, i) => (
          <View key={i} style={[st.miniCardSide, { marginLeft: i === 0 ? 0 : -13, zIndex: i + 1 }]} />
        ))}
      </View>
    </View>
  );
}

function PlayerLabel({ name, isActive, timerPct, showTimer, isBot, side = 'top', teamColor }) {
  const isLeft  = side === 'left';
  const isRight = side === 'right';

  const avatarEl = (
    <View style={{ position: 'relative' }}>
      <View style={[st.avatar, {
        borderColor: isActive ? '#f5c842' : (teamColor ?? 'rgba(255,255,255,0.15)'),
        borderWidth: isActive ? 2.5 : 2,
        shadowColor: isActive ? '#f5c842' : '#000',
        shadowOpacity: isActive ? 0.55 : 0.2,
        shadowRadius: isActive ? 8 : 3,
        elevation: isActive ? 6 : 2,
      }]}>
        <Text style={{ fontSize: 16 }}>{isBot ? '🤖' : '👤'}</Text>
      </View>
      <View style={st.onlineDot} />
    </View>
  );

  const nameEl = (
    <View style={[st.nameTag, isActive && st.nameTagActive]}>
      <Text style={st.nameText} numberOfLines={1}>{name}</Text>
    </View>
  );

  const rowStyle = isLeft
    ? { flexDirection: 'row', alignItems: 'center', gap: 5 }
    : isRight
      ? { flexDirection: 'row-reverse', alignItems: 'center', gap: 5 }
      : { flexDirection: 'row', alignItems: 'center', gap: 6 };

  return (
    <View style={{ alignItems: isRight ? 'flex-end' : isLeft ? 'flex-start' : 'center', gap: 4 }}>
      <View style={rowStyle}>
        {isLeft  ? <>{nameEl}{avatarEl}</> : null}
        {isRight ? <>{nameEl}{avatarEl}</> : null}
        {!isLeft && !isRight ? <>{avatarEl}{nameEl}</> : null}
      </View>
      {showTimer && (
        <View style={st.timerBar}>
          <View style={[st.timerFill, {
            width: `${timerPct}%`,
            backgroundColor: timerPct > 50 ? '#2ecc71' : timerPct > 22 ? '#f39c12' : '#e74c3c',
          }]} />
        </View>
      )}
    </View>
  );
}

function PlayingCard({ card, selected, playable, isTrump, style, width = CARD_W, height = CARD_H, onPress }) {
  if (!card) return null;
  const color    = SUIT_COLOR[card.suit];
  const suitChar = SUITS[card.suit];
  const fs       = width < 44 ? 10 : 11;
  const big      = width < 44 ? 18 : 20;

  return (
    <TouchableOpacity
      activeOpacity={playable ? 0.85 : 1}
      onPress={playable ? onPress : undefined}
      style={[{
        width, height,
        backgroundColor: '#f8f2e4',
        borderRadius: 6,
        borderWidth: selected ? 2 : 1.5,
        borderColor: selected ? '#f59e0b' : isTrump ? '#c9922a' : '#d5cbb8',
        alignItems: 'center', justifyContent: 'center',
        shadowColor: selected ? '#f59e0b' : '#000',
        shadowOffset: { width: 0, height: selected ? 5 : 2 },
        shadowOpacity: selected ? 0.55 : 0.3,
        shadowRadius: selected ? 8 : 3,
        elevation: selected ? 10 : 3,
        overflow: 'hidden',
        transform: [{ translateY: selected ? -24 : playable ? -12 : 0 }],
      }, style]}>
      <View style={{ position: 'absolute', top: 3, left: 4, alignItems: 'center' }}>
        <Text style={{ fontSize: fs, fontWeight: '900', color, fontFamily: 'Georgia' }}>{card.rank}</Text>
        <Text style={{ fontSize: fs - 2, color }}>{suitChar}</Text>
      </View>
      <Text style={{ fontSize: big, color }}>{suitChar}</Text>
      <View style={{ position: 'absolute', bottom: 3, right: 4, alignItems: 'center', transform: [{ rotate: '180deg' }] }}>
        <Text style={{ fontSize: fs, fontWeight: '900', color, fontFamily: 'Georgia' }}>{card.rank}</Text>
        <Text style={{ fontSize: fs - 2, color }}>{suitChar}</Text>
      </View>
      {!playable && (
        <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.42)', borderRadius: 6 }} />
      )}
    </TouchableOpacity>
  );
}

const BID_OPTS = [77, 80, 90, 100, 110, 120, 130, 140, 150, 160, 'دبل'];

function BidModal({ visible, highBid, timerPct, onBid, onPass }) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={st.overlay}>
        <View style={[st.modal, { backgroundColor: '#0d1b2a' }]}>
          <Text style={st.modalTitle}>🤝 المزايدة</Text>
          {highBid > 0 && (
            <Text style={st.modalSub}>الحالية: {highBid} · زايد أعلى أو مرّر</Text>
          )}
          <View style={[st.mTimer, { marginBottom: 14 }]}>
            <View style={[st.mTimerFill, {
              width: `${timerPct}%`,
              backgroundColor: timerPct > 50 ? '#4ade80' : timerPct > 22 ? '#f59e0b' : '#ef4444',
            }]} />
          </View>
          <ScrollView contentContainerStyle={st.bidGrid} showsVerticalScrollIndicator={false}>
            <TouchableOpacity style={st.bidPassBtn} onPress={onPass}>
              <Text style={{ fontSize: 22 }}>✋</Text>
              <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', fontWeight: '700' }}>تمرير</Text>
            </TouchableOpacity>
            {BID_OPTS.map(n => {
              const isDbl = n === 'دبل';
              const dis   = !isDbl && typeof n === 'number' && highBid >= n;
              return (
                <TouchableOpacity
                  key={n}
                  disabled={dis}
                  style={[st.bidBtn,
                    dis && { opacity: 0.22 },
                    isDbl && { backgroundColor: 'rgba(239,68,68,0.12)', borderColor: '#ef4444' },
                  ]}
                  onPress={() => onBid(isDbl ? 250 : n, isDbl)}
                >
                  <Text style={[st.bidNum, isDbl && { color: '#ef4444', fontSize: 13 }]}>
                    {isDbl ? 'دبل' : n}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function TrumpModal({ visible, timerPct, onChoose }) {
  const [sel, setSel] = useState(null);
  useEffect(() => { if (!visible) setSel(null); }, [visible]);
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={st.overlay}>
        <View style={[st.modal, { backgroundColor: '#0d1b2a' }]}>
          <Text style={st.modalTitle}>اختر الكوز 🃏</Text>
          <Text style={st.modalSub}>الفريق الفائز بالمزايدة يختار رمز الكوز</Text>
          <View style={[st.mTimer, { marginBottom: 16 }]}>
            <View style={[st.mTimerFill, {
              width: `${timerPct}%`,
              backgroundColor: timerPct > 50 ? '#4ade80' : timerPct > 22 ? '#f59e0b' : '#ef4444',
            }]} />
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: 16 }}>
            {['spades', 'hearts', 'diamonds', 'clubs'].map(s => (
              <TouchableOpacity
                key={s}
                style={[st.suitBtn, sel === s && st.suitBtnSel]}
                onPress={() => setSel(s)}
              >
                <Text style={{ fontSize: 28, color: SUIT_COLOR[s] }}>{SUITS[s]}</Text>
                <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: '700', marginTop: 2 }}>
                  {SUIT_NAME[s]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={[st.confirmBtn, !sel && { opacity: 0.35 }]}
            onPress={sel ? () => onChoose(sel) : undefined}
            disabled={!sel}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>✓ تأكيد</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function RoundModal({ visible, result, teamAName, teamBName, totalA, totalB, onNext }) {
  if (!visible || !result) return null;
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={st.overlay}>
        <View style={[st.modal, { backgroundColor: '#0d1b2a', alignItems: 'center' }]}>
          <Text style={{ fontSize: 38, marginBottom: 6 }}>
            {result.winner === 'a' ? '🎉' : '🎊'}
          </Text>
          <Text style={st.modalTitle}>
            فاز {result.winner === 'a' ? teamAName : teamBName}!
          </Text>
          <View style={{ flexDirection: 'row', gap: 10, marginVertical: 12 }}>
            {[
              { name: teamAName, pts: result.ptsA, color: '#3b9eff' },
              { name: teamBName, pts: result.ptsB, color: '#ff7043' },
            ].map((t, i) => (
              <View key={i} style={[st.resChip, { borderColor: t.color + '44' }]}>
                <Text style={{ fontSize: 9, color: t.color, fontWeight: '700' }}>{t.name}</Text>
                <Text style={{ fontSize: 22, fontWeight: '900', color: '#fff' }}>{t.pts}</Text>
                <Text style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)' }}>هذه الجولة</Text>
              </View>
            ))}
          </View>
          {result.biloot > 0 && (
            <View style={st.bilootBadge}>
              <Text style={{ color: '#f5c842', fontWeight: '700', fontSize: 12 }}>
                🎴 بلوت! +{result.biloot} نقطة
              </Text>
            </View>
          )}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 6, marginBottom: 14 }}>
            {[
              { name: teamAName, total: totalA, color: '#3b9eff' },
              { name: teamBName, total: totalB, color: '#ff7043' },
            ].map((t, i) => (
              <View key={i} style={[st.resChip, { borderColor: t.color + '44', minWidth: 110 }]}>
                <Text style={{ fontSize: 9, color: t.color, fontWeight: '600' }}>مجموع {t.name}</Text>
                <Text style={{ fontSize: 26, fontWeight: '900', color: '#fff' }}>{t.total}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity style={[st.confirmBtn, { backgroundColor: '#16a34a' }]} onPress={onNext}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>▶ الجولة التالية</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function GameOverModal({ visible, teamAName, teamBName, totalA, totalB, onNew, onExit }) {
  if (!visible) return null;
  const aWon = totalA >= WIN_SCORE;
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={st.overlay}>
        <View style={[st.modal, { backgroundColor: '#0d1b2a', alignItems: 'center', paddingVertical: 28 }]}>
          <Text style={{ fontSize: 48 }}>🏆</Text>
          <Text style={[st.modalTitle, { marginTop: 8 }]}>
            {aWon ? `فاز ${teamAName}!` : `فاز ${teamBName}!`}
          </Text>
          <View style={{ flexDirection: 'row', gap: 10, marginVertical: 16 }}>
            {[
              { name: teamAName, total: totalA, color: '#3b9eff' },
              { name: teamBName, total: totalB, color: '#ff7043' },
            ].map((t, i) => (
              <View key={i} style={[st.resChip, { borderColor: t.color + '44', minWidth: 120 }]}>
                <Text style={{ fontSize: 10, color: t.color, fontWeight: '700' }}>{t.name}</Text>
                <Text style={{ fontSize: 28, fontWeight: '900', color: '#fff' }}>{t.total}</Text>
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity style={st.outlineBtn} onPress={onExit}>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontWeight: '700' }}>🚪 خروج</Text>
            </TouchableOpacity>
            <TouchableOpacity style={st.confirmBtn} onPress={onNew}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>▶ جولة جديدة</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ScoreBar({ teamAName, teamBName, scoreA, scoreB, trickPtsA, trickPtsB, trump }) {
  const pA = Math.min((scoreA / WIN_SCORE) * 100, 100);
  const pB = Math.min((scoreB / WIN_SCORE) * 100, 100);
  return (
    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6 }}>
      <View style={{ flex: 1, alignItems: 'flex-end' }}>
        <Text style={{ fontSize: 18, fontWeight: '900', color: '#3b9eff', lineHeight: 20 }}>{scoreA}</Text>
        <Text style={{ fontSize: 9, color: '#3b9eff', fontWeight: '600' }} numberOfLines={1}>{teamAName}</Text>
        <View style={{ width: '100%', height: 3, backgroundColor: 'rgba(59,158,255,0.15)', borderRadius: 2, marginTop: 2, overflow: 'hidden' }}>
          <View style={{ height: '100%', width: `${pA}%`, backgroundColor: '#3b9eff', borderRadius: 2 }} />
        </View>
      </View>
      <View style={{ alignItems: 'center', paddingHorizontal: 8, gap: 1, minWidth: 44 }}>
        {trump
          ? <Text style={{ fontSize: 18, color: SUIT_COLOR[trump] }}>{SUITS[trump]}</Text>
          : <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>🃏</Text>
        }
        <Text style={{ fontSize: 7, color: 'rgba(255,255,255,0.3)', fontWeight: '700' }}>/ {WIN_SCORE}</Text>
        {(trickPtsA > 0 || trickPtsB > 0) && (
          <Text style={{ fontSize: 8, color: '#f5c842', fontWeight: '700' }}>{trickPtsA}:{trickPtsB}</Text>
        )}
      </View>
      <View style={{ flex: 1, alignItems: 'flex-start' }}>
        <Text style={{ fontSize: 18, fontWeight: '900', color: '#ff7043', lineHeight: 20 }}>{scoreB}</Text>
        <Text style={{ fontSize: 9, color: '#ff7043', fontWeight: '600' }} numberOfLines={1}>{teamBName}</Text>
        <View style={{ width: '100%', height: 3, backgroundColor: 'rgba(255,112,67,0.15)', borderRadius: 2, marginTop: 2, overflow: 'hidden' }}>
          <View style={{ height: '100%', width: `${pB}%`, backgroundColor: '#ff7043', borderRadius: 2 }} />
        </View>
      </View>
    </View>
  );
}

export default function BilootGameScreen({ onBack, currentUser, onGameEnd, onGameReady }) {
  const { theme, themeId } = useTheme();
  const { lang }           = useLanguage();
  const {
    roomId, isPlayer1, roomData, loading, error,
    updateRoom, leaveRoom,
  } = useOnlineGame('biloot', currentUser, onGameReady);

  const [phase, setPhase]               = useState('waiting');
  const [players, setPlayers]           = useState([]);
  const [myHand, setMyHand]             = useState([]);
  const [currentTrick, setCurrentTrick] = useState([]);
  const [trump, setTrump]               = useState(null);
  const [highBid, setHighBid]           = useState(0);
  const [highBidder, setHighBidder]     = useState(null);
  const [isDouble, setIsDouble]         = useState(false);
  const [currentBidder, setCurrentBidder] = useState(null);
  const [currentLeader, setCurrentLeader] = useState(null);
  const [teamScores, setTeamScores]     = useState({ a: 0, b: 0 });
  const [trickPts, setTrickPts]         = useState({ a: 0, b: 0 });
  const [selectedCard, setSelectedCard] = useState(null);
  const [round, setRound]               = useState(1);
  const [roundResult, setRoundResult]   = useState(null);
  const [showRound, setShowRound]       = useState(false);
  const [showGameOver, setShowGameOver] = useState(false);
  const [timerPct, setTimerPct]         = useState(100);
  const timerRef = useRef(null);

  const myUid  = currentUser?.uid;
  const myName = currentUser?.displayName || currentUser?.name || 'أنت';

  const myIdx  = players.findIndex(p => p.uid === myUid);
  const seat   = (off) => players.length >= 4 ? players[(myIdx + off + players.length) % players.length] : null;
  const topP   = seat(2);
  const leftP  = seat(1);
  const rightP = seat(3);

  const myTeamOf = (uid) => {
    if (!players.length || myIdx < 0) return 'a';
    const idx  = players.findIndex(p => p.uid === uid);
    const s    = (idx - myIdx + players.length) % players.length;
    return s === 0 || s === 2 ? 'a' : 'b';
  };

  const teamAName = players.length >= 4
    ? `${myName} و${topP?.displayName ?? topP?.name ?? '…'}`
    : myName;
  const teamBName = players.length >= 4
    ? `${leftP?.displayName ?? leftP?.name ?? '…'} و${rightP?.displayName ?? rightP?.name ?? '…'}`
    : '…';

  const isMyTurn      = currentLeader  === myUid && phase === 'playing';
  const isMyBidTurn   = currentBidder  === myUid && phase === 'bidding';
  const isMyTrumpTurn = highBidder     === myUid && phase === 'trumpChoice';

  useEffect(() => {
    if (!roomData) return;
    if (roomData.phase)           setPhase(roomData.phase);
    if (roomData.players)         setPlayers(roomData.players);
    if (roomData.hands?.[myUid])  setMyHand(sortHand(roomData.hands[myUid], roomData.trump));
    if (roomData.currentTrick !== undefined) setCurrentTrick(roomData.currentTrick || []);
    if (roomData.trump !== undefined)        setTrump(roomData.trump);
    if (roomData.highBid !== undefined)      setHighBid(roomData.highBid);
    if (roomData.highBidder !== undefined)   setHighBidder(roomData.highBidder);
    if (roomData.isDouble !== undefined)     setIsDouble(roomData.isDouble);
    if (roomData.currentBidder !== undefined) setCurrentBidder(roomData.currentBidder);
    if (roomData.currentLeader !== undefined) setCurrentLeader(roomData.currentLeader);
    if (roomData.teamScores)      setTeamScores(roomData.teamScores);
    if (roomData.trickPts)        setTrickPts(roomData.trickPts);
    if (roomData.round)           setRound(roomData.round);
    if (roomData.phase === 'roundEnd') {
      setRoundResult(roomData.roundResult || null);
      setShowRound(true);
    }
    if (roomData.phase === 'gameOver') {
      setShowGameOver(true);
      if (onGameEnd) {
        const sc = roomData.teamScores || { a: 0, b: 0 };
        onGameEnd(sc.a >= WIN_SCORE);
      }
    }
  }, [roomData]);

  const startTimer = useCallback((onTimeout) => {
    clearInterval(timerRef.current);
    let elapsed = 0;
    setTimerPct(100);
    timerRef.current = setInterval(() => {
      elapsed += 100;
      setTimerPct(Math.max(0, 100 - (elapsed / (TURN_SEC * 1000)) * 100));
      if (elapsed >= TURN_SEC * 1000) {
        clearInterval(timerRef.current);
        onTimeout();
      }
    }, 100);
  }, []);

  useEffect(() => {
    if (isMyTurn)           startTimer(() => autoPlay());
    else if (isMyBidTurn)   startTimer(() => handleBid(null));
    else if (isMyTrumpTurn) startTimer(() => autoTrump());
    return () => clearInterval(timerRef.current);
  }, [isMyTurn, isMyBidTurn, isMyTrumpTurn]);

  const playable = useCallback(() => {
    if (!currentTrick?.length) return myHand;
    const led  = currentTrick[0].card.suit;
    const same = myHand.filter(c => c.suit === led);
    return same.length ? same : myHand;
  }, [myHand, currentTrick]);

  const isPlayable = (card) =>
    playable().some(c => c.suit === card.suit && c.rank === card.rank);

  const autoPlay = useCallback(() => {
    const p = playable();
    if (p.length) handlePlayCard(p[0]);
  }, [myHand, currentTrick, trump]);

  const autoTrump = useCallback(() => {
    const counts = { spades: 0, hearts: 0, diamonds: 0, clubs: 0 };
    myHand.forEach(c => { if (counts[c.suit] !== undefined) counts[c.suit]++; });
    const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'spades';
    handleChooseTrump(best);
  }, [myHand]);

  useEffect(() => {
    if (!isPlayer1) return;
    if (roomData?.phase === 'lobby' && roomData?.players?.length >= 4) {
      const deck  = shuffle(buildDeck());
      const hands = {};
      roomData.players.forEach((p, i) => { hands[p.uid] = deck.slice(i * 8, (i + 1) * 8); });
      updateRoom({
        hands, phase: 'bidding',
        currentBidder: roomData.players[0]?.uid,
        highBid: 0, highBidder: null, bids: {}, trump: null,
        currentTrick: [], trickWinner: null,
        trickPts: { a: 0, b: 0 },
        teamScores: roomData.teamScores || { a: 0, b: 0 },
        round: 1,
      });
    }
  }, [roomData?.phase, roomData?.players?.length]);

  const handleBid = async (amount, dbl = false) => {
    if (!isMyBidTurn) return;
    clearInterval(timerRef.current);
    const newBids   = { ...(roomData?.bids || {}), [myUid]: amount ?? 'pass' };
    const uids      = players.map(p => p.uid);
    const nextUid   = uids[(uids.indexOf(myUid) + 1) % uids.length];
    const allBid    = Object.keys(newBids).length >= players.length;
    const newHigh   = amount ?? highBid;
    const newBidder = amount ? myUid : highBidder;
    if (allBid) {
      const allPassed = Object.values(newBids).every(v => v === 'pass');
      await updateRoom(allPassed
        ? { phase: 'lobby', bids: {} }
        : { bids: newBids, highBid: newHigh, highBidder: newBidder, isDouble: dbl, phase: 'trumpChoice', currentBidder: null }
      );
    } else {
      await updateRoom({ bids: newBids, currentBidder: nextUid, highBid: newHigh, highBidder: newBidder, isDouble: dbl });
    }
  };

  const handleChooseTrump = async (suit) => {
    if (!isMyTrumpTurn) return;
    clearInterval(timerRef.current);
    await updateRoom({ trump: suit, phase: 'playing', currentLeader: highBidder });
  };

  const handlePlayCard = async (card) => {
    if (!isMyTurn || !isPlayable(card)) return;
    playSound('card_play');
    clearInterval(timerRef.current);
    const newHand  = myHand.filter(c => !(c.suit === card.suit && c.rank === card.rank));
    const newTrick = [...currentTrick, { uid: myUid, card }];
    const uids     = players.map(p => p.uid);
    const myPos    = uids.indexOf(myUid);
    const nextUid  = uids[(myPos + 1) % uids.length];
    if (newTrick.length < players.length) {
      await updateRoom({ [`hands.${myUid}`]: newHand, currentTrick: newTrick, currentLeader: nextUid });
    } else {
      const winner   = trickWinner(newTrick, trump);
      const winTeam  = myTeamOf(winner);
      const pts      = trickPoints(newTrick, trump);
      const newTrickPts = {
        a: trickPts.a + (winTeam === 'a' ? pts : 0),
        b: trickPts.b + (winTeam === 'b' ? pts : 0),
      };
      const isLast = newHand.length === 0;
      if (isLast) newTrickPts[winTeam] += 10;
      if (isLast) {
        const bonus   = bilootBonus(myHand);
        const bidTeam = myTeamOf(highBidder);
        const defTeam = bidTeam === 'a' ? 'b' : 'a';
        const bidPts  = newTrickPts[bidTeam] + bonus;
        const defPts  = newTrickPts[defTeam];
        const mul     = isDouble ? 2 : 1;
        let sA, sB, winner2;
        if (bidPts >= highBid) {
          sA = bidTeam === 'a' ? Math.round(bidPts * mul) : Math.round(defPts * mul);
          sB = bidTeam === 'b' ? Math.round(bidPts * mul) : Math.round(defPts * mul);
          winner2 = bidTeam;
        } else {
          sA = bidTeam === 'a' ? 0 : Math.round(highBid * 2 * mul);
          sB = bidTeam === 'b' ? 0 : Math.round(highBid * 2 * mul);
          winner2 = defTeam;
        }
        const newScores = { a: teamScores.a + sA, b: teamScores.b + sB };
        const gameOver  = newScores.a >= WIN_SCORE || newScores.b >= WIN_SCORE;
        await updateRoom({
          [`hands.${myUid}`]: newHand, currentTrick: newTrick,
          trickWinner: winner, trickPts: newTrickPts, teamScores: newScores,
          roundResult: { winner: winner2, ptsA: newTrickPts.a, ptsB: newTrickPts.b, scoreA: sA, scoreB: sB, biloot: bonus },
          phase: gameOver ? 'gameOver' : 'roundEnd',
        });
      } else {
        await updateRoom({
          [`hands.${myUid}`]: newHand, currentTrick: newTrick,
          trickWinner: winner, trickPts: newTrickPts, currentLeader: winner,
        });
      }
    }
    setSelectedCard(null);
  };

  const handleNextRound = async () => {
    setShowRound(false);
    const newLeader = players[round % players.length]?.uid;
    await updateRoom({
      phase: 'bidding', bids: {}, highBid: 0, highBidder: null,
      trump: null, isDouble: false, currentTrick: [], trickWinner: null,
      trickPts: { a: 0, b: 0 }, currentLeader: null,
      currentBidder: newLeader, round: round + 1,
    });
  };

  const handleQuit = async () => {
    clearInterval(timerRef.current);
    await leaveRoom();
    onBack?.();
  };

  const seatOf = (uid) => {
    const idx = players.findIndex(p => p.uid === uid);
    if (idx < 0 || myIdx < 0) return -1;
    return (idx - myIdx + players.length) % players.length;
  };
  const trickCardFor = (seat) => currentTrick.find(t => seatOf(t.uid) === seat);

  /* ── LOADING / ERROR ── */
  if (error) return (
    <View style={[st.container, { backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' }]}>
      <StatusBar barStyle={theme.statusBar} />
      <Text style={{ color: '#ef4444', fontSize: 14 }}>❌ {error}</Text>
      <TouchableOpacity onPress={onBack} style={[st.confirmBtn, { marginTop: 16 }]}>
        <Text style={{ color: '#fff', fontWeight: '700' }}>رجوع</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading || !roomId) return (
    <View style={[st.container, { backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' }]}>
      <StatusBar barStyle={theme.statusBar} />
      <Text style={{ color: theme.textPrimary ?? '#fff', fontSize: 14 }}>جاري الاتصال...</Text>
    </View>
  );

  if (players.length < 4 && phase === 'waiting') return (
    <View style={[st.container, { backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center', gap: 16 }]}>
      <StatusBar barStyle={theme.statusBar} />
      <Text style={{ fontSize: 40 }}>🃏</Text>
      <Text style={{ color: theme.textPrimary ?? '#fff', fontSize: 16, fontWeight: '900' }}>بلوت</Text>
      <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>
        في انتظار اللاعبين... {players.length}/4
      </Text>
      <TouchableOpacity onPress={handleQuit} style={st.outlineBtn}>
        <Text style={{ color: 'rgba(255,255,255,0.7)', fontWeight: '700' }}>🚪 خروج</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[st.container, { backgroundColor: 'transparent' }]}>
      <StatusBar barStyle={theme.statusBar} backgroundColor="transparent" translucent />

      {/* ══ HEADER ══ */}
      <View style={st.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <TouchableOpacity onPress={handleQuit} style={st.iconBtn}>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '700' }}>✕</Text>
          </TouchableOpacity>
          <GameInfoButton gameType="biloot" lang={lang} />
          <WebScreenButton
            playerUid={myUid}
            playerName={myName}
            gameType="biloot"
            gameRoomId={roomId || ''}
            getPublicData={() => ({ teamScores, round, trump })}
            themeName={themeId || 'dark'}
          />
        </View>
        <ScoreBar
          teamAName={teamAName} teamBName={teamBName}
          scoreA={teamScores.a} scoreB={teamScores.b}
          trickPtsA={trickPts.a} trickPtsB={trickPts.b}
          trump={trump}
        />
        <View style={{ width: 34 }} />
      </View>

      {/* ══ FELT ══ */}
      <View style={st.felt}>

        {topP && (
          <View style={st.pTop}>
            <PlayerLabel
              name={topP.displayName ?? topP.name ?? '…'}
              isActive={currentLeader === topP.uid || currentBidder === topP.uid}
              showTimer={currentLeader === topP.uid || currentBidder === topP.uid}
              timerPct={timerPct} isBot={topP.isBot} side="top"
              teamColor="rgba(59,158,255,0.5)"
            />
            <FaceDownStack count={topP.cardCount ?? 8} direction="horizontal" />
          </View>
        )}

        {leftP && (
          <View style={st.pLeft}>
            <PlayerLabel
              name={leftP.displayName ?? leftP.name ?? '…'}
              isActive={currentLeader === leftP.uid || currentBidder === leftP.uid}
              showTimer={currentLeader === leftP.uid || currentBidder === leftP.uid}
              timerPct={timerPct} isBot={leftP.isBot} side="left"
              teamColor="rgba(255,112,67,0.5)"
            />
            <View style={st.leftHandWrap}>
              <View style={{ flexDirection: 'row' }}>
                {Array.from({ length: Math.min(leftP.cardCount ?? 8, 8) }).map((_, i) => (
                  <View key={i} style={[st.miniCardSide, { marginLeft: i === 0 ? 0 : -13, zIndex: i + 1 }]} />
                ))}
              </View>
            </View>
          </View>
        )}

        {rightP && (
          <View style={st.pRight}>
            <PlayerLabel
              name={rightP.displayName ?? rightP.name ?? '…'}
              isActive={currentLeader === rightP.uid || currentBidder === rightP.uid}
              showTimer={currentLeader === rightP.uid || currentBidder === rightP.uid}
              timerPct={timerPct} isBot={rightP.isBot} side="right"
              teamColor="rgba(255,112,67,0.5)"
            />
            <View style={st.rightHandWrap}>
              <View style={{ flexDirection: 'row' }}>
                {Array.from({ length: Math.min(rightP.cardCount ?? 8, 8) }).map((_, i) => (
                  <View key={i} style={[st.miniCardSide, { marginLeft: i === 0 ? 0 : -13, zIndex: i + 1 }]} />
                ))}
              </View>
            </View>
          </View>
        )}

        {/* ── طاولة اللعب البلورية ── */}
        <CrystalTable style={st.crystalTable} />

        {/* ── منطقة الحيلة ── */}
        <View style={[st.trickArea, {
          shadowColor: theme.accent || '#f5c518',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.20,
          shadowRadius: 18,
          elevation: 8,
        }]}>
          <View style={st.trickTop}>
            {trickCardFor(2)
              ? <PlayingCard card={trickCardFor(2).card} isTrump={trickCardFor(2).card.suit === trump} playable={false} width={TRICK_W} height={TRICK_H} />
              : <View style={st.trickSlot} />}
          </View>
          <View style={st.trickLeft}>
            {trickCardFor(1)
              ? <PlayingCard card={trickCardFor(1).card} isTrump={trickCardFor(1).card.suit === trump} playable={false} width={TRICK_W} height={TRICK_H} />
              : <View style={st.trickSlot} />}
          </View>
          <View style={st.trickRight}>
            {trickCardFor(3)
              ? <PlayingCard card={trickCardFor(3).card} isTrump={trickCardFor(3).card.suit === trump} playable={false} width={TRICK_W} height={TRICK_H} />
              : <View style={st.trickSlot} />}
          </View>
          <View style={st.trickBottom}>
            {trickCardFor(0)
              ? <PlayingCard card={trickCardFor(0).card} isTrump={trickCardFor(0).card.suit === trump} playable={false} width={TRICK_W} height={TRICK_H} />
              : <View style={st.trickSlot} />}
          </View>
        </View>

        {phase === 'bidding' && currentBidder && currentBidder !== myUid && (
          <View style={st.statusChip}>
            <Text style={{ color: '#f5c842', fontSize: 11, fontWeight: '700' }}>
              {players.find(p => p.uid === currentBidder)?.displayName ?? '…'} يزايد...
            </Text>
          </View>
        )}
        {phase === 'trumpChoice' && highBidder !== myUid && (
          <View style={st.statusChip}>
            <Text style={{ color: '#f5c842', fontSize: 11, fontWeight: '700' }}>
              {players.find(p => p.uid === highBidder)?.displayName ?? '…'} يختار الكوز...
            </Text>
          </View>
        )}
        {isMyTurn && !selectedCard && (
          <View style={[st.statusChip, { backgroundColor: 'rgba(74,222,128,0.15)', borderColor: 'rgba(74,222,128,0.3)' }]}>
            <Text style={{ color: '#4ade80', fontSize: 11, fontWeight: '700' }}>دورك — اختر ورقة ▶</Text>
          </View>
        )}
      </View>

      {/* ══ يدي ══ */}
      <View style={st.handArea}>
        <View style={st.handInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={[st.avatar, {
              borderColor: isMyTurn || isMyBidTurn ? '#f5c842' : 'rgba(59,158,255,0.5)',
              borderWidth: isMyTurn || isMyBidTurn ? 2.5 : 2,
              width: 32, height: 32,
            }]}>
              <Text style={{ fontSize: 14 }}>👤</Text>
            </View>
            <View style={[st.nameTag, (isMyTurn || isMyBidTurn) && st.nameTagActive]}>
              <Text style={st.nameText}>{myName}</Text>
            </View>
          </View>
          {isMyTurn && (
            <View style={[st.turnChip, { backgroundColor: 'rgba(74,222,128,0.15)', borderColor: 'rgba(74,222,128,0.3)' }]}>
              <Text style={{ color: '#4ade80', fontSize: 10, fontWeight: '700' }}>دورك ▶</Text>
            </View>
          )}
          {isMyBidTurn && (
            <View style={[st.turnChip, { backgroundColor: 'rgba(245,198,66,0.15)', borderColor: 'rgba(245,198,66,0.3)' }]}>
              <Text style={{ color: '#f5c842', fontSize: 10, fontWeight: '700' }}>زايد ▶</Text>
            </View>
          )}
        </View>

        {(isMyTurn || isMyBidTurn || isMyTrumpTurn) && (
          <View style={st.myTimerWrap}>
            <View style={[st.myTimerFill, {
              width: `${timerPct}%`,
              backgroundColor: timerPct > 50 ? '#2ecc71' : timerPct > 22 ? '#f39c12' : '#e74c3c',
            }]} />
          </View>
        )}

        <View style={st.handRow}>
          {myHand.map((card, idx) => {
            const play = isMyTurn && isPlayable(card);
            const sel  = selectedCard?.suit === card.suit && selectedCard?.rank === card.rank;
            return (
              <View key={`${card.suit}-${card.rank}-${idx}`} style={{ zIndex: idx + 1, marginLeft: idx === 0 ? 0 : HAND_OVERLAP }}>
                <PlayingCard
                  card={card} selected={sel} playable={play}
                  isTrump={card.suit === trump} width={CARD_W} height={CARD_H}
                  onPress={() => { if (!play) return; setSelectedCard(sel ? null : card); }}
                />
              </View>
            );
          })}
        </View>

        {isMyTurn && selectedCard && (
          <TouchableOpacity style={st.playBtn} onPress={() => handlePlayCard(selectedCard)}>
            <Text style={{ color: '#fff', fontWeight: '900', fontSize: 14 }}>▶ العب</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ══ MODALS ══ */}
      <BidModal visible={isMyBidTurn} highBid={highBid} timerPct={timerPct} onBid={handleBid} onPass={() => handleBid(null)} />
      <TrumpModal visible={isMyTrumpTurn} timerPct={timerPct} onChoose={handleChooseTrump} />
      <RoundModal visible={showRound} result={roundResult} teamAName={teamAName} teamBName={teamBName} totalA={teamScores.a} totalB={teamScores.b} onNext={handleNextRound} />
      <GameOverModal
        visible={showGameOver} teamAName={teamAName} teamBName={teamBName} totalA={teamScores.a} totalB={teamScores.b}
        onNew={async () => {
          setShowGameOver(false);
          await updateRoom({ phase: 'lobby', teamScores: { a: 0, b: 0 }, bids: {}, highBid: 0, highBidder: null, trump: null, currentTrick: [], trickPts: { a: 0, b: 0 }, round: 1 });
        }}
        onExit={handleQuit}
      />
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, paddingTop: Platform.OS === 'ios' ? 50 : 42 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingBottom: 8,
    backgroundColor: 'rgba(0,0,0,0.40)',
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  iconBtn: {
    width: 32, height: 32, borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },

  felt: { flex: 1, position: 'relative', overflow: 'hidden', backgroundColor: 'transparent' },

  crystalTable: {
    position: 'absolute',
    top: '22%',
    left: SW * 0.08,
    right: SW * 0.08,
    height: SH * 0.38,
    zIndex: 2,
  },

  pTop: {
    position: 'absolute', top: 10, left: 0, right: 0,
    alignItems: 'center', gap: 6, zIndex: 15,
  },
  pLeft: {
    position: 'absolute', left: 0, top: '18%',
    alignItems: 'flex-start', gap: 6, zIndex: 15,
  },
  pRight: {
    position: 'absolute', right: 0, top: '18%',
    alignItems: 'flex-end', gap: 6, zIndex: 15,
  },
  leftHandWrap: {
    transform: [{ rotate: '-90deg' }, { translateX: -30 }, { translateY: -10 }],
  },
  rightHandWrap: {
    transform: [{ rotate: '90deg' }, { translateX: 30 }, { translateY: -10 }],
  },

  miniCard: {
    width: 22, height: 32, backgroundColor: '#1a237e',
    borderRadius: 3, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.20)',
    shadowColor: '#000', shadowOffset: { width: 1, height: 1 }, shadowOpacity: 0.4, shadowRadius: 2, elevation: 2,
  },
  miniCardSide: {
    width: 26, height: 38, backgroundColor: '#1a237e',
    borderRadius: 3, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.20)',
    shadowColor: '#000', shadowOffset: { width: 1, height: 1 }, shadowOpacity: 0.4, shadowRadius: 2, elevation: 2,
  },

  trickArea: {
    position: 'absolute', top: '50%', left: '50%',
    width: 180, height: 200, marginLeft: -90, marginTop: -110, zIndex: 5,
  },
  trickTop:    { position: 'absolute', top: 0,    left: '50%', marginLeft: -(TRICK_W / 2) },
  trickLeft:   { position: 'absolute', top: '50%', left: 0,   marginTop: -(TRICK_H / 2) },
  trickRight:  { position: 'absolute', top: '50%', right: 0,  marginTop: -(TRICK_H / 2) },
  trickBottom: { position: 'absolute', bottom: 0, left: '50%', marginLeft: -(TRICK_W / 2) },
  trickSlot: {
    width: TRICK_W, height: TRICK_H, borderRadius: 7,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderStyle: 'dashed',
  },

  statusChip: {
    position: 'absolute', bottom: 12, alignSelf: 'center',
    left: '50%', transform: [{ translateX: -80 }], width: 160,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12, paddingVertical: 5, paddingHorizontal: 10, alignItems: 'center',
  },

  handArea: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)',
    paddingTop: 8, paddingHorizontal: 10,
    paddingBottom: Platform.OS === 'ios' ? 22 : 12,
    zIndex: 20,
  },
  handInfo: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 5, paddingHorizontal: 2,
  },
  myTimerWrap: {
    width: '100%', height: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 2, overflow: 'hidden', marginBottom: 6,
  },
  myTimerFill: { height: '100%', borderRadius: 2 },
  handRow: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end',
    minHeight: CARD_H + 28, paddingTop: 16, overflow: 'visible',
  },
  playBtn: {
    alignSelf: 'center', backgroundColor: '#d97706',
    borderRadius: 12, paddingVertical: 7, paddingHorizontal: 24, marginTop: 6,
    shadowColor: '#f59e0b', shadowOpacity: 0.5, shadowRadius: 8, elevation: 6,
  },
  turnChip: { borderRadius: 10, paddingVertical: 4, paddingHorizontal: 10, borderWidth: 1 },

  avatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(30,58,90,0.9)',
    alignItems: 'center', justifyContent: 'center', borderWidth: 2,
  },
  onlineDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#2ecc71', borderWidth: 2, borderColor: '#091910',
  },
  nameTag: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9,
  },
  nameTagActive: {
    backgroundColor: 'rgba(245,200,66,0.18)',
    borderWidth: 1, borderColor: 'rgba(245,200,66,0.3)',
  },
  nameText: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.9)', maxWidth: 72 },
  timerBar: { width: 68, height: 4, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 2, overflow: 'hidden' },
  timerFill: { height: '100%', borderRadius: 2 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', alignItems: 'center', justifyContent: 'center' },
  modal: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.13)', borderRadius: 22, padding: 20, width: SW - 48, maxHeight: SH * 0.82 },
  modalTitle: { fontSize: 16, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 5 },
  modalSub: { fontSize: 11, color: 'rgba(255,255,255,0.45)', textAlign: 'center', marginBottom: 10 },
  mTimer: { width: '100%', height: 3, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' },
  mTimerFill: { height: '100%', borderRadius: 2 },
  bidGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, paddingBottom: 8 },
  bidBtn: {
    width: 56, height: 60, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  bidPassBtn: {
    width: 56, height: 60, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center', gap: 2,
  },
  bidNum: { fontSize: 19, fontWeight: '900', color: '#fff' },
  suitBtn: {
    width: 112, height: 68,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14, alignItems: 'center', justifyContent: 'center',
  },
  suitBtnSel: { borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.12)' },
  confirmBtn: { backgroundColor: '#d97706', borderRadius: 13, paddingVertical: 12, alignItems: 'center', paddingHorizontal: 20 },
  outlineBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 13, paddingVertical: 12, paddingHorizontal: 18, alignItems: 'center',
  },
  resChip: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center',
  },
  bilootBadge: {
    backgroundColor: 'rgba(245,200,66,0.12)',
    borderWidth: 1, borderColor: 'rgba(245,200,66,0.3)',
    borderRadius: 10, paddingVertical: 5, paddingHorizontal: 14, marginBottom: 8,
  },
});
