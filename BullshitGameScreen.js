import React, { useState, useEffect, useRef } from 'react';
import { useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  StatusBar, ScrollView, Alert, Animated, Modal
,
  useWindowDimensions} from 'react-native';
import { useOnlineGame } from './useOnlineGame';
import { useTheme } from './ThemeContext';
import ExitButton from './ExitButton';
import { useLanguage } from './I18n';
import LeaveModal from './LeaveModal';
import { WebScreenButton, GameInfoButton } from './WebRoomService';
import { playSound } from './SoundService';
import { ThemedButton, ThemedCard, ThemedPill, ThemedModal, ThemedRow } from './ThemedComponents';
import OnlineRoomSetup, { OnlineWaitingLobby } from './OnlineRoomSetup';


// ─────────────────────────────────────────────
//  بيانات الكروت
// ─────────────────────────────────────────────
const SUITS = ['♠', '♥', '♦', '♣'];
const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const RED_SUITS = ['♥', '♦'];

function buildDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const val of VALUES) {
      deck.push({ suit, val, id: `${val}${suit}` });
    }
  }
  return deck;
}

function shuffleDeck(deck) {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

function dealHands(players, deck) {
  const hands = {};
  players.forEach((p) => (hands[p.uid] = []));
  deck.forEach((card, i) => {
    hands[players[i % players.length].uid].push(card);
  });
  return hands;
}

// ─────────────────────────────────────────────
//  مكوّن الكرت الواحد
// ─────────────────────────────────────────────
function PlayingCard({ card, selected, onPress, theme, disabled, size = 'normal' }) {
  const isRed = RED_SUITS.includes(card.suit);
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.92, duration: 80, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();
    onPress && onPress(card);
  };

  const cardW = size === 'small' ? 44 : 58;
  const cardH = size === 'small' ? 64 : 84;
  const valSize = size === 'small' ? 13 : 17;
  const suitSize = size === 'small' ? 16 : 22;

  // لون الكرت يتأثر بالثيم
  const cardBg = theme.isCrystal
    ? selected
      ? theme.accentBorder
      : theme.bgElevated
    : theme.isMist
    ? selected
      ? 'rgba(255,255,255,0.75)'
      : 'rgba(255,255,255,0.55)'
    : selected
    ? theme.accentBorder
    : theme.bgElevated;

  const cardBorder = selected
    ? theme.accent
    : theme.borderCard;

  const shadowStyle = theme.isCrystal && selected
    ? {
        shadowColor: theme.accent,
        shadowOpacity: 0.7,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 0 },
        elevation: 10,
      }
    : { elevation: 2 };

  return (
    <ThemedCard onPress={handlePress} disabled={disabled}>
      <Animated.View
        style={[
          {
            width: cardW,
            height: cardH,
            borderRadius: 8,
            backgroundColor: cardBg,
            borderWidth: selected ? 2 : 1,
            borderColor: cardBorder,
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: 4,
            paddingHorizontal: 3,
            marginRight: size === 'small' ? 4 : 6,
          },
          shadowStyle,
          { transform: [{ scale }, { translateY: selected ? -8 : 0 }] },
        ]}
      >
        {/* أعلى الكرت */}
        <View style={{ alignSelf: 'flex-start' }}>
          <Text style={{ fontSize: valSize, fontWeight: '800', color: isRed ? '#e53e3e' : '#1a1a2e', lineHeight: valSize + 2 }}>
            {card.val}
          </Text>
          <Text style={{ fontSize: valSize - 3, color: isRed ? '#e53e3e' : '#1a1a2e', lineHeight: valSize }}>
            {card.suit}
          </Text>
        </View>

        {/* وسط الكرت */}
        <Text style={{ fontSize: suitSize, color: isRed ? '#e53e3e' : '#1a1a2e' }}>
          {card.suit}
        </Text>

        {/* أسفل الكرت - مقلوب */}
        <View style={{ alignSelf: 'flex-end', transform: [{ rotate: '180deg' }] }}>
          <Text style={{ fontSize: valSize, fontWeight: '800', color: isRed ? '#e53e3e' : '#1a1a2e', lineHeight: valSize + 2 }}>
            {card.val}
          </Text>
          <Text style={{ fontSize: valSize - 3, color: isRed ? '#e53e3e' : '#1a1a2e', lineHeight: valSize }}>
            {card.suit}
          </Text>
        </View>
      </Animated.View>
    </ThemedCard>
  );
}

// ─────────────────────────────────────────────
//  كرت مقلوب (على الطاولة) بـ rotation عشوائي
// ─────────────────────────────────────────────
function FaceDownCard({ index, theme }) {
  const rot = ((index * 7) % 21) - 10; // -10 to +10 deg
  const shift = ((index * 3) % 9) - 4;

  const cardBg = theme.isCrystal
    ? theme.crystalColor || theme.bgElevated
    : theme.isMist
    ? 'rgba(80,100,180,0.55)'
    : '#1a2a6c';

  return (
    <View
      style={{
        position: 'absolute',
        width: 52,
        height: 74,
        borderRadius: 8,
        backgroundColor: cardBg,
        borderWidth: 2,
        borderColor: theme.accent,
        transform: [{ rotate: `${rot}deg` }, { translateX: shift }, { translateY: shift / 2 }],
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.4,
        shadowRadius: 4,
        elevation: 4 + index,
      }}
    >
      {/* نقش الكرت */}
      <Text style={{ color: theme.accent, fontSize: 22, opacity: 0.6 }}>🂠</Text>
    </View>
  );
}

// ─────────────────────────────────────────────
//  زر إعلان الرقم
// ─────────────────────────────────────────────
function DeclareButton({ label, selected, onPress, theme }) {
  const glowStyle = theme.isCrystal && selected
    ? {
        shadowColor: theme.accent,
        shadowOpacity: 0.9,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 0 },
        elevation: 12,
      }
    : {};

  return (
    <ThemedCard
      onPress={() => onPress(label)}
      variant={selected ? 'accent' : 'default'}
      style={[
        {
          paddingHorizontal: 10,
          paddingVertical: 7,
          borderRadius: 8,
          alignItems: 'center',
          minWidth: 38,
          margin: 3,
        },
        glowStyle,
      ]}
    >
      <Text style={{ color: selected ? theme.bg : theme.textPrimary, fontWeight: '700', fontSize: 13 }}>
        {label}
      </Text>
    </ThemedCard>
  );
}

// ─────────────────────────────────────────────
//  Modal نتيجة التشكيك
// ─────────────────────────────────────────────
function AccusationModal({ accusation, players, myUid, theme, onClose }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    // صوت النتيجة: صادق → ضحكة استهزاء، كاذب → صمت
    if (!isBluff) {
      setTimeout(() => playSound('maktshof_laugh'), 500);
    }
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true }),
    ]).start();
  }, []);

  const { isBluff, accusedUid, accuserUid, declaredVal, actualCard, penaltyCards } = accusation;

  const accusedName = players.find(p => p.uid === accusedUid)?.name || '؟';
  const accuserName = players.find(p => p.uid === accuserUid)?.name || '؟';
  const loserName = isBluff ? accusedName : accuserName;
  const loserUid = isBluff ? accusedUid : accuserUid;

  const isLoser = loserUid === myUid;

  const resultColor = isBluff ? theme.error : theme.success;
  const bgColor = theme.isMist
    ? 'rgba(10,10,40,0.92)'
    : theme.bgOverlay;

  return (
    <Modal transparent animationType="none">
      <View style={{ flex: 1, backgroundColor: bgColor, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View
          style={[
            {
              backgroundColor: theme.bgCard,
              borderRadius: 20,
              padding: 28,
              width: W * 0.85,
              alignItems: 'center',
              borderWidth: 2,
              borderColor: resultColor,
            },
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
            theme.isCrystal
              ? { shadowColor: resultColor, shadowOpacity: 0.6, shadowRadius: 20, elevation: 20 }
              : {},
          ]}
        >
          <Text style={{ fontSize: 48 }}>{isBluff ? '🤥' : '😇'}</Text>
          <Text style={{ fontSize: 22, fontWeight: '800', color: resultColor, marginTop: 8, textAlign: 'center' }}>
            {isBluff ? '🎯 مكشوف' : '😇 كان صادقاً'}
          </Text>

          <View style={{ marginTop: 16, padding: 12, backgroundColor: theme.bgElevated, borderRadius: 12, width: '100%' }}>
            <Text style={{ color: theme.textSecondary, textAlign: 'center', marginBottom: 8, fontSize: 13 }}>
              أعلن <Text style={{ color: theme.accent, fontWeight: '700' }}>{accusedName}</Text> عن وضع{' '}
              <Text style={{ color: theme.accent, fontWeight: '700' }}>{declaredVal}</Text>
            </Text>
            {actualCard && (
              <Text style={{ color: theme.textPrimary, textAlign: 'center', fontSize: 13 }}>
                الكرت الفعلي:{' '}
                <Text style={{ color: RED_SUITS.includes(actualCard.suit) ? '#fc8181' : theme.textPrimary, fontWeight: '800' }}>
                  {actualCard.val}{actualCard.suit}
                </Text>
              </Text>
            )}
          </View>

          <View style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 20 }}>📦</Text>
            <Text style={{ color: theme.textPrimary, fontSize: 14 }}>
              <Text style={{ color: resultColor, fontWeight: '700' }}>{loserName}</Text>
              {' '}يأخذ{' '}
              <Text style={{ color: theme.accent, fontWeight: '700' }}>{penaltyCards}</Text>
              {' '}كرت{penaltyCards > 1 ? 'اً' : ''}
            </Text>
          </View>

          {isLoser && (
            <Text style={{ color: theme.warning, marginTop: 8, fontSize: 13, textAlign: 'center' }}>
              أنت الخاسر هذه الجولة 😬
            </Text>
          )}

          <ThemedButton onPress={onClose} label='استمرار' variant='primary' size='large' style={{ marginTop: 20 }} />
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────
//  الشاشة الرئيسية
// ─────────────────────────────────────────────
export default function BullshitGameScreen({ onBack, currentUser, onGameEnd, onGameReady }) {
  const { width: W, height: H } = useWindowDimensions();
  const s = useMemo(() => makeStyles(W, H), [W, H]);
  const { theme, themeId } = useTheme();
  const { lang } = useLanguage();
  const isRTL = lang === 'ar';

  // ── اختيار الوضع ──
  const [selectedMode,  setSelectedMode]  = useState(null);
  const [joinCodeInput, setJoinCodeInput] = useState(null);

  const handleModeSelect = (mode, code = null) => {
    setJoinCodeInput(code);
    setSelectedMode(mode);
  };

  const {
    roomId,
    isPlayer1,
    roomData,
    loading,
    error,
    friendCode,
    updateRoom,
    endGame,
    leaveRoom,
  } = useOnlineGame('maktshof', currentUser, onGameReady, selectedMode, joinCodeInput);

  const [leaveModalVisible, setLeaveModalVisible] = useState(false);

  // ── حالة اللعبة ──
  const [players, setPlayers] = useState([]);
  const [hands, setHands] = useState({}); // { uid: [cards] }
  const [pile, setPile] = useState([]); // كل الكروت على الطاولة
  const [playHistory, setPlayHistory] = useState([]); // [{ uid, declaredVal, actualCards }]
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
  const [gameStatus, setGameStatus] = useState('waiting');
  const [selectedCards, setSelectedCards] = useState([]);
  const [declaredVal, setDeclaredVal] = useState(null);
  const [accusationResult, setAccusationResult] = useState(null);

  const myUid = currentUser?.uid;
  const myHand = hands[myUid] || [];
  const myPlayerIdx = players.findIndex(p => p.uid === myUid);
  const isMyTurn = currentPlayerIdx === myPlayerIdx;
  const currentPlayerName = players[currentPlayerIdx]?.name || '...';

  // ── تهيئة اللعبة (Player1 فقط) ──
  useEffect(() => {
    if (roomData?.players && roomData.players.length >= 2 && isPlayer1 && roomData.gameStatus === 'waiting') {
      const deck = shuffleDeck(buildDeck());
      const dealtHands = dealHands(roomData.players, deck);
      updateRoom({
        gameStatus: 'playing',
        hands: dealtHands,
        pile: [],
        playHistory: [],
        currentPlayerIdx: 0,
      });
    }
  }, [roomData?.players?.length, isPlayer1]);

  // ── مزامنة من Firestore ──
  useEffect(() => {
    if (!roomData) return;
    if (roomData.players) setPlayers(roomData.players);
    if (roomData.hands) setHands(roomData.hands);
    if (roomData.pile !== undefined) setPile(roomData.pile);
    if (roomData.playHistory) setPlayHistory(roomData.playHistory);
    if (roomData.currentPlayerIdx !== undefined) setCurrentPlayerIdx(roomData.currentPlayerIdx);
    if (roomData.gameStatus) setGameStatus(roomData.gameStatus);
    if (roomData.accusationResult && !accusationResult) {
      setAccusationResult(roomData.accusationResult);
    }
  }, [roomData]);

  // ── toggle اختيار كرت ──
  const toggleCard = (card) => {
    if (!isMyTurn) return;
    setSelectedCards(prev => {
      const exists = prev.find(c => c.id === card.id);
      return exists ? prev.filter(c => c.id !== card.id) : [...prev, card];
    });
  };

  // ── لعب الكروت ──
  const handlePlay = async () => {
    if (!isMyTurn) { Alert.alert('ليس دورك'); return; }
    if (selectedCards.length === 0) { Alert.alert('اختر كرت واحد على الأقل'); return; }
    if (!declaredVal) { Alert.alert('أعلن الرقم أولاً'); return; }
    playSound('card_play');

    const newHand = myHand.filter(c => !selectedCards.find(s => s.id === c.id));
    const newHands = { ...hands, [myUid]: newHand };
    const newPile = [...pile, ...selectedCards];
    const newHistory = [...playHistory, {
      uid: myUid,
      declaredVal,
      actualCards: selectedCards,
      pileCountBefore: pile.length,
    }];

    setSelectedCards([]);
    setDeclaredVal(null);

    const nextIdx = (currentPlayerIdx + 1) % players.length;

    // هل الفائز (يدخالية)؟
    if (newHand.length === 0) {
      await updateRoom({
        hands: newHands,
        pile: newPile,
        playHistory: newHistory,
        currentPlayerIdx: nextIdx,
        winner: myUid,
        gameStatus: 'finished',
      });
      return;
    }

    await updateRoom({
      hands: newHands,
      pile: newPile,
      playHistory: newHistory,
      currentPlayerIdx: nextIdx,
    });
  };

  // ── منطق التشكيك الحقيقي ──
  const handleAccuse = async () => {
    if (playHistory.length === 0) { Alert.alert('لا أحد لعب بعد'); return; }
    playSound('maktshof_accuse');

    const lastPlay = playHistory[playHistory.length - 1];
    const { uid: accusedUid, declaredVal: lastDeclaredVal, actualCards } = lastPlay;

    // هل كان كاذباً؟ = أي كرت من كروته الفعلية لا يطابق القيمة المُعلنة
    const isBluff = actualCards.some(c => c.val !== lastDeclaredVal);

    // الخاسر يأخذ كل كروت الطاولة
    const penaltyCards = pile.length;
    const loserUid = isBluff ? accusedUid : myUid;

    // أعطِ كروت الطاولة للخاسر
    const loserCurrentHand = hands[loserUid] || [];
    const newLoserHand = [...loserCurrentHand, ...pile];
    const newHands = { ...hands, [loserUid]: newLoserHand };

    const result = {
      isBluff,
      accusedUid,
      accuserUid: myUid,
      declaredVal: lastDeclaredVal,
      actualCard: actualCards[0],
      penaltyCards,
    };

    await updateRoom({
      accusationResult: result,
      hands: newHands,
      pile: [],
      playHistory: [],
      currentPlayerIdx: players.findIndex(p => p.uid === loserUid),
    });
  };

  // ── إغلاق modal التشكيك ──
  const handleCloseAccusation = async () => {
    setAccusationResult(null);
    await updateRoom({ accusationResult: null });
  };

  // ── خروج ──
  const handleQuit = () => setLeaveModalVisible(true);
  const handleConfirmQuit = async () => {
    setLeaveModalVisible(false);
    await leaveRoom();
    onBack();
  };

  // ─── شاشات Loading/Error ───
  if (error) {
    return (
      <View style={[s.container, { backgroundColor: 'transparent' }]}>
        <StatusBar barStyle={theme.statusBar} />
        <View style={s.center}>
          <Text style={{ color: theme.error, fontSize: 16 }}>❌ {error}</Text>
          <ThemedButton onPress={onBack} label='→ رجوع' variant='ghost' size='medium' />
        </View>
      </View>
    );
  }

  // ── شاشة اختيار الوضع ──
  if (!selectedMode) {
    return (
      <OnlineRoomSetup
        gameEmoji="🃏"
        gameTitleAr="مكشوف"
        gameTitleEn="Bullshit"
        descAr="ألعاب الكوت والبلف"
        descEn="Bluffing card game"
        onBack={onBack}
        onSelect={handleModeSelect}
      />
    );
  }

  // ── انتظار صديق ──
  if (selectedMode === 'create' && loading) {
    return (
      <OnlineWaitingLobby
        friendCode={friendCode}
        isFriend={true}
        isRTL={isRTL}
        theme={theme}
        gameEmoji="🃏"
        onCancel={onBack}
      />
    );
  }

  if (loading || gameStatus === 'waiting') {
    return (
      <View style={[s.container, { backgroundColor: 'transparent' }]}>
        <StatusBar barStyle={theme.statusBar} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, margin: 16 }}>
          <ExitButton onPress={() => setLeaveModalVisible(true)} />
          <GameInfoButton gameType="maktshof" lang={lang} />
          <WebScreenButton
            playerUid={myUid}
            playerName={currentUser?.name || ''}
            gameType="maktshof"
            gameRoomId={roomId || ''}
            getPublicData={() => ({ status: 'lobby' })}
            themeName={themeId || 'dark'}
          />
        </View>
        <View style={s.center}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={{ color: theme.textPrimary, marginTop: 12, fontSize: 14 }}>
            {loading ? 'جاري الاتصال...' : 'في انتظار اللاعبين...'}
          </Text>
        </View>
        <LeaveModal
          visible={leaveModalVisible}
          onCancel={() => setLeaveModalVisible(false)}
          onConfirm={handleConfirmQuit}
        />
      </View>
    );
  }

  if (gameStatus === 'finished') {
    const winner = players.find(p => p.uid === roomData?.winner);
    const iWon   = roomData?.winner === myUid;
    // تسجيل XP مرة واحدة
    if (onGameEnd) onGameEnd(iWon);
    return (
      <View style={[s.container, { backgroundColor: 'transparent' }]}>
        <StatusBar barStyle={theme.statusBar} />
        <View style={s.center}>
          <Text style={{ fontSize: 60 }}>🏆</Text>
          <Text style={{ color: theme.accent, fontSize: 24, fontWeight: '800', marginTop: 12 }}>
            {winner?.name || 'فائز'}
          </Text>
          <Text style={{ color: theme.textSecondary, marginTop: 4 }}>أنهى كروته أولاً!</Text>
          <ThemedButton onPress={onBack} label='→ رجوع' variant='ghost' size='medium' />
        </View>
      </View>
    );
  }

  // ─── تحضير Pile Visualization ───
  const pileVisible = Math.min(pile.length, 5);

  // ─── الخلفية حسب الثيم ───
  const tableBg = theme.isCrystal
    ? theme.bgCard
    : theme.isMist
    ? theme.bgCard
    : theme.bgCard;

  const accuseColor = theme.isCrystal
    ? theme.error
    : theme.isMist && !theme.isLight
    ? '#f87171'
    : '#ef4444';

  return (
    <View style={[s.container, { backgroundColor: 'transparent' }]}>
      <StatusBar barStyle={theme.statusBar} />

      {/* ── Header ── */}
      <View style={s.topRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <ExitButton onPress={onBack} />
          <GameInfoButton gameType="maktshof" lang={lang} />
          <WebScreenButton
            playerUid={myUid}
            playerName={currentUser?.name || ''}
            gameType="maktshof"
            gameRoomId={roomId || ''}
            getPublicData={() => ({ currentPlayerIdx, playersCount: players.length, pileCount: pile?.length || 0 })}
            themeName={themeId || 'dark'}
          />
        </View>
        <View style={s.titleBlock}>
          <Text style={{ color: theme.accent, fontWeight: '800', fontSize: 16 }}>BS / كذبة</Text>
          <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 2 }}>
            دور: <Text style={{ color: theme.textPrimary, fontWeight: '700' }}>{currentPlayerName}</Text>
            {isMyTurn ? ' (أنت)' : ''}
          </Text>
        </View>
        <View style={[s.pileBadge, { backgroundColor: theme.bgElevated, borderColor: theme.borderCard }]}>
          <Text style={{ color: theme.accent, fontSize: 11, fontWeight: '700' }}>🂠 {pile.length}</Text>
        </View>
      </View>

      {/* ── صف اللاعبين ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.playersRow}>
        {players.map((p, idx) => {
          const pHand = hands[p.uid] || [];
          const isTurn = idx === currentPlayerIdx;
          const isMe = p.uid === myUid;
          return (
            <View
              key={p.uid}
              style={[
                s.playerChip,
                {
                  backgroundColor: isTurn ? theme.accentBorder : theme.bgElevated,
                  borderColor: isTurn ? theme.accent : theme.borderCard,
                },
              ]}
            >
              <Text style={{ fontSize: 18 }}>{isMe ? '🙋' : '👤'}</Text>
              <Text style={{ color: theme.textPrimary, fontSize: 11, fontWeight: isTurn ? '700' : '400' }}>
                {p.name}
              </Text>
              <Text style={{ color: theme.textMuted, fontSize: 10 }}>{pHand.length} 🂠</Text>
            </View>
          );
        })}
      </ScrollView>

      {/* ── منطقة الطاولة ── */}
      <View style={[s.tableArea, { backgroundColor: 'rgba(0,0,0,0.30)', borderColor: theme.borderCard }]}>
        {pile.length === 0 ? (
          <Text style={{ color: theme.textMuted, fontSize: 13 }}>الطاولة فارغة</Text>
        ) : (
          <View style={s.pileContainer}>
            {Array.from({ length: pileVisible }).map((_, i) => (
              <FaceDownCard key={i} index={i} theme={theme} />
            ))}
          </View>
        )}

        {/* إعلان آخر لعب */}
        {playHistory.length > 0 && (
          <View style={[s.lastDeclareTag, { backgroundColor: theme.bgElevated, borderColor: theme.borderCard }]}>
            <Text style={{ color: theme.textSecondary, fontSize: 11 }}>
              {players.find(p => p.uid === playHistory[playHistory.length - 1].uid)?.name}:
            </Text>
            <Text style={{ color: theme.accent, fontWeight: '800', fontSize: 13, marginLeft: 4 }}>
              {playHistory[playHistory.length - 1].actualCards.length}×{' '}
              {playHistory[playHistory.length - 1].declaredVal}
            </Text>
          </View>
        )}
      </View>

      {/* ── زر التشكيك ── */}
      {!isMyTurn && playHistory.length > 0 && (
        <ThemedButton onPress={handleAccuse} label='🃏 مكشوف' variant='primary' size='large' style={[s.accuseBtn, { backgroundColor: accuseColor }]} />
      )}

      {/* ── إعلان الرقم ── */}
      {isMyTurn && (
        <View style={[s.declareArea, { backgroundColor: theme.bgCard, borderColor: theme.borderCard }]}>
          <Text style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 6, textAlign: 'center' }}>
            اختر الرقم الذي ستعلنه ({selectedCards.length} {selectedCards.length === 1 ? 'كرت' : 'كروت'}):
          </Text>
          <View style={s.declareGrid}>
            {VALUES.map(val => (
              <DeclareButton
                key={val}
                label={val}
                selected={declaredVal === val}
                onPress={setDeclaredVal}
                theme={theme}
              />
            ))}
          </View>
        </View>
      )}

      {/* ── يدي ── */}
      <View style={s.handArea}>
        <Text style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 8, textAlign: 'center' }}>
          يدك — {myHand.length} كرت
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 4 }}>
          {myHand.map(card => (
            <PlayingCard
              key={card.id}
              card={card}
              selected={!!selectedCards.find(c => c.id === card.id)}
              onPress={isMyTurn ? toggleCard : undefined}
              theme={theme}
              disabled={!isMyTurn}
            />
          ))}
        </ScrollView>
      </View>

      {/* ── زر اللعب ── */}
      {isMyTurn && (
        <ThemedButton
          onPress={handlePlay}
          disabled={selectedCards.length === 0 || !declaredVal}
          label={selectedCards.length > 0 && declaredVal ? 'العب الكروت ←' : 'اختر كروتاً ورقماً'}
          variant={selectedCards.length > 0 && declaredVal ? 'primary' : 'secondary'}
          size='large'
          style={s.playBtn}
        />
      )}

      {/* ── Modal التشكيك ── */}
      {accusationResult && (
        <AccusationModal
          accusation={accusationResult}
          players={players}
          myUid={myUid}
          theme={theme}
          onClose={handleCloseAccusation}
        />
      )}

      {/* ── Modal الخروج ── */}
      <LeaveModal
        visible={leaveModalVisible}
        onCancel={() => setLeaveModalVisible(false)}
        onConfirm={handleConfirmQuit}
      />
    </View>
  );
}

// ─────────────────────────────────────────────
//  الستايلات
// ─────────────────────────────────────────────
function makeStyles(W, H) { return StyleSheet.create({
  container: { flex: 1, paddingTop: 48 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  titleBlock: { flex: 1, alignItems: 'center' },
  pileBadge: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 12, borderWidth: 1,
  },

  playersRow: {
    paddingHorizontal: 12,
    maxHeight: 82,
    marginBottom: 12,
  },
  playerChip: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    marginRight: 8,
    gap: 2,
  },

  tableArea: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    height: H * 0.18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    overflow: 'hidden',
  },
  pileContainer: {
    width: 100,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  lastDeclareTag: {
    position: 'absolute',
    bottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },

  accuseBtn: {
    marginHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 8,
  },

  declareArea: {
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  declareGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },

  handArea: {
    flex: 1,
    paddingTop: 4,
    minHeight: 110,
    maxHeight: 130,
    marginBottom: 6,
  },

  playBtn: {
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1.5,
  },

  btn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
});
}
 
