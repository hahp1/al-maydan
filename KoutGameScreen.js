import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, Animated, Alert, ActivityIndicator,
  ScrollView, TextInput, Modal,
} from 'react-native';
import { db, auth } from './firebaseConfig';
import LeaveModal from './LeaveModal';
import {
  doc, setDoc, onSnapshot, updateDoc, deleteDoc,
  collection, serverTimestamp, arrayUnion, getDoc, query, where, getDocs,
} from 'firebase/firestore';

// ══════════════════════════════════════════════════════════════
// ثوابت
// ══════════════════════════════════════════════════════════════
const COST      = 10;   // تكلفة اللعبة لكل لاعب
const WIN_LIMIT = 51;   // حد الفوز بالنقاط

// المزايدة: عدد اللمات 5-9
const BID_LABELS = { 5:'باب (٥)', 6:'ستة (٦)', 7:'سبعة (٧)', 8:'ثمانية (٨)', 9:'باون (٩)' };

const SUITS    = ['♠','♥','♦','♣'];
const RANKS    = ['5','6','7','8','9','10','J','Q','K','A'];
const RANK_VAL = { '5':1,'6':2,'7':3,'8':4,'9':5,'10':6,'J':7,'Q':8,'K':9,'A':10 };
const RANK_AR  = { '5':'٥','6':'٦','7':'٧','8':'٨','9':'٩','10':'١٠','J':'جاك','Q':'دامة','K':'كنج','A':'خال' };
const SUIT_COLOR = { '♠':'#c8c8ff','♣':'#c8c8ff','♥':'#ff6b6b','♦':'#ff6b6b' };

const TEAM_OF    = { 0:0, 1:1, 2:0, 3:1 }; // فريق٠: مقاعد 0+2 | فريق١: مقاعد 1+3
const SEAT_LABEL = ['جنوب','شرق','شمال','غرب'];

// ── بناء وتوزيع الورق ──
function buildDeck() {
  const d = [];
  for (const s of SUITS) for (const r of RANKS) d.push({ suit:s, rank:r, id:`${r}${s}` });
  return d; // 40 ورقة
}
function shuffle(a) {
  const b=[...a];
  for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];}
  return b;
}
function dealKout(n) {
  const deck = shuffle(buildDeck());
  const hands = Array.from({length:n},()=>[]);
  deck.forEach((c,i)=>hands[i%n].push(c));
  return hands;
}

function genCode(){ return Math.random().toString(36).slice(2,8).toUpperCase(); }
function getUid(){
  const u = auth.currentUser?.uid;
  if (u) return u;
  if (!global._gUid) global._gUid = 'guest_'+Math.random().toString(36).slice(2,10);
  return global._gUid;
}

// ── منطق الورق ──
function cardPower(card, trumpSuit, leadSuit) {
  if (!card) return -1;
  const base = RANK_VAL[card.rank] || 0;
  if (card.suit === trumpSuit) return base + 200;
  if (card.suit === leadSuit)  return base + 100;
  return base;
}
function winnerOfTrick(trick, trumpSuit) {
  if (!trick || trick.length === 0) return null;
  const lead = trick[0].card.suit;
  let best = trick[0];
  for (const t of trick) {
    if (cardPower(t.card, trumpSuit, lead) > cardPower(best.card, trumpSuit, lead)) best = t;
  }
  return best.seat;
}

// ── حساب نتيجة الجولة ──
// القواعد:
// - نجح الفريق المزايد: يأخذ عدد اللمات المزايَد نقاطاً
// - فشل غير ملزوم: الخصم يأخذ ضعف عدد اللمات المزايَد
// - فشل ملزوم: الخصم يأخذ نفس عدد اللمات (بدون ضعف)
// - كوت ناجح: الفريق المزايد يأخذ اللمات × 2
// - كوت فاشل: الخصم يأخذ اللمات × 2
function calcRoundResult(bidWinner, bidValue, t0tricks, t1tricks, nPlayers, isForcedBid) {
  const bidTeam      = TEAM_OF[bidWinner ?? 0];
  const bidderTricks = bidTeam === 0 ? t0tricks : t1tricks;
  const allTricks    = nPlayers === 4 ? 10 : 9;

  if (bidValue === 'kout') {
    const pts = allTricks * 2;
    if (bidderTricks === allTricks) {
      return bidTeam === 0
        ? { team0: pts, team1: 0, note: `كوت ناجح! الفريق ١ يأخذ ${pts} نقطة` }
        : { team0: 0, team1: pts, note: `كوت ناجح! الفريق ٢ يأخذ ${pts} نقطة` };
    } else {
      return bidTeam === 0
        ? { team0: 0, team1: pts, note: `كوت فاشل! الفريق ٢ يأخذ ${pts} نقطة` }
        : { team0: pts, team1: 0, note: `كوت فاشل! الفريق ١ يأخذ ${pts} نقطة` };
    }
  }

  const bid = parseInt(bidValue) || 5;
  if (bidderTricks >= bid) {
    return bidTeam === 0
      ? { team0: bid, team1: 0, note: `الفريق ١ نجح (${bidderTricks}/${bid} لمة)` }
      : { team0: 0, team1: bid, note: `الفريق ٢ نجح (${bidderTricks}/${bid} لمة)` };
  } else {
    // فشل: ملزوم → نفس العدد | غير ملزوم → ضعف العدد
    const pts = isForcedBid ? bid : bid * 2;
    const tag = isForcedBid ? '' : ' (ضعف)';
    return bidTeam === 0
      ? { team0: 0, team1: pts, note: `الفريق ١ فشل — الفريق ٢ يأخذ ${pts} نقطة${tag}` }
      : { team0: pts, team1: 0, note: `الفريق ٢ فشل — الفريق ١ يأخذ ${pts} نقطة${tag}` };
  }
}

// ── حالة جولة مزايدة جديدة ──
function buildNextBiddingState(players, prevBidWinner) {
  const n        = players.length;
  const newHands = dealKout(n);
  const updated  = players.map((p,i) => ({ ...p, hand: newHands[i] }));
  const nextSeat = ((prevBidWinner ?? 0) + 1) % n;
  return {
    players:        updated,
    phase:          'bidding',
    bids:           [],
    currentBidSeat: nextSeat,
    bidWinner:      null,
    bidValue:       null,
    isForcedBid:    false,
    trumpSuit:      null,
    choosingTrump:  false,
    currentTrick:   [],
    tricks:         [],
    team0Tricks:    0,
    team1Tricks:    0,
    trickStartedAt: Date.now(),
  };
}

// ══════════════════════════════════════════════════════════════
// شريط الوقت
// ══════════════════════════════════════════════════════════════
function TimerBar({ startedAt, seconds, onTimeout, active }) {
  const [rem, setRem] = useState(seconds);
  const anim    = useRef(new Animated.Value(1)).current;
  const animRef = useRef(null);
  const cbRef   = useRef(false);

  useEffect(() => {
    if (!startedAt) return;
    cbRef.current = false;
    const elapsed = Math.floor((Date.now() - startedAt) / 1000);
    const left    = Math.max(0, seconds - elapsed);
    setRem(left);
    if (animRef.current) animRef.current.stop();
    anim.setValue(left / seconds);
    animRef.current = Animated.timing(anim, { toValue:0, duration:left*1000, useNativeDriver:false });
    animRef.current.start();
    const iv = setInterval(() => {
      setRem(r => {
        if (r <= 1) {
          clearInterval(iv);
          if (active && !cbRef.current) { cbRef.current = true; onTimeout?.(); }
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [startedAt]);

  const color = rem > 20 ? '#22c55e' : rem > 10 ? '#f59e0b' : '#ef4444';
  return (
    <View style={tb.wrap}>
      <View style={tb.track}>
        <Animated.View style={[tb.fill, {
          width: anim.interpolate({ inputRange:[0,1], outputRange:['0%','100%'] }),
          backgroundColor: color,
        }]} />
      </View>
      <Text style={[tb.num, { color }]}>{rem}s</Text>
    </View>
  );
}
const tb = StyleSheet.create({
  wrap:  { flexDirection:'row', alignItems:'center', gap:8, paddingHorizontal:16, paddingVertical:4 },
  track: { flex:1, height:6, backgroundColor:'#1a1a3e', borderRadius:3, overflow:'hidden' },
  fill:  { height:'100%', borderRadius:3 },
  num:   { fontSize:13, fontWeight:'900', minWidth:30, textAlign:'right' },
});

// ══════════════════════════════════════════════════════════════
// المكوّن الرئيسي
// ══════════════════════════════════════════════════════════════
export default function KoutGameScreen({ onBack, currentUser, tokens, onSpendTokens }) {
  const [phase,          setPhase]         = useState('menu');
  const [roomId,         setRoomId]        = useState(null);
  const [roomData,       setRoomData]      = useState(null);
  const [myUid,          setMyUid]         = useState(null);
  const [myName,         setMyName]        = useState('');
  const [loading,        setLoading]       = useState(false);
  const [joinCode,       setJoinCode]      = useState('');
  const [friendSearch,   setFriendSearch]  = useState('');
  const [friendResults,  setFriendResults] = useState([]);
  const [searching,      setSearching]     = useState(false);
  const [desiredCount,   setDesiredCount]  = useState(4);
  const [selectedCard,   setSelectedCard]  = useState(null);
  const [showLeave,      setShowLeave]     = useState(false);
  const startedRef = useRef(false);
  const unsubRef   = useRef(null);
  const fadeAnim   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setMyUid(getUid());
    setMyName(currentUser?.name || auth.currentUser?.displayName || 'لاعب');
    Animated.timing(fadeAnim, { toValue:1, duration:400, useNativeDriver:true }).start();
    return () => { if (unsubRef.current) unsubRef.current(); };
  }, []);

  // ── مراقبة الغرفة ──
  function subscribeRoom(id) {
    if (unsubRef.current) unsubRef.current();
    startedRef.current = false;
    unsubRef.current = onSnapshot(doc(db,'kout_rooms',id), async snap => {
      if (!snap.exists()) { setPhase('menu'); setRoomId(null); setRoomData(null); return; }
      const data = snap.data();
      setRoomData(data);

      // اكتملت الغرفة → ابدأ تلقائياً (الهوست فقط)
      if (data.phase === 'lobby'
          && data.hostUid === getUid()
          && data.players.length >= data.maxPlayers
          && !startedRef.current) {
        startedRef.current = true;
        await autoStartGame(data, id);
        return;
      }

      if      (data.phase === 'lobby')   setPhase('lobby');
      else if (data.phase === 'bidding') setPhase('bidding');
      else if (data.phase === 'game')    setPhase('game');
      else if (data.phase === 'result')  setPhase('result');
    });
  }

  async function autoStartGame(data, id) {
    const players  = [...data.players];
    const n        = players.length;
    const newHands = dealKout(n);
    const updated  = players.map((p,i) => ({ ...p, hand: newHands[i] }));
    await updateDoc(doc(db,'kout_rooms',id), {
      phase:          'bidding',
      players:        updated,
      bids:           [],
      currentBidSeat: 0,
      bidWinner:      null,
      bidValue:       null,
      isForcedBid:    false,
      trumpSuit:      null,
      choosingTrump:  false,
      currentTrick:   [],
      tricks:         [],
      team0Tricks:    0,
      team1Tricks:    0,
      totalScore:     { team0: 0, team1: 0 },
      trickStartSeat: 0,
      trickStartedAt: Date.now(),
      gameStartedAt:  Date.now(),
    });
  }

  // ── إنشاء غرفة ──
  async function createRoom(isRandom = false) {
    if (tokens < COST) { Alert.alert('رصيد غير كافٍ', `تحتاج ${COST} رصيد`); return; }
    setLoading(true);
    try {
      const uid  = getUid();
      const code = genCode();
      const maxP = isRandom ? 4 : desiredCount;
      await setDoc(doc(collection(db,'kout_rooms'), code), {
        code,
        phase:      'lobby',
        isRandom,
        maxPlayers: maxP,
        hostUid:    uid,
        players:    [{ uid, name: myName, seatIndex: 0 }],
        totalScore: { team0: 0, team1: 0 },
        createdAt:  serverTimestamp(),
      });
      onSpendTokens(COST);
      setRoomId(code);
      subscribeRoom(code);
    } catch (e) { Alert.alert('خطأ', e.message); }
    setLoading(false);
  }

  // ── انضمام ──
  async function joinRoom(code) {
    const id = (code || '').trim().toUpperCase();
    if (!id) return;
    if (tokens < COST) { Alert.alert('رصيد غير كافٍ', `تحتاج ${COST} رصيد`); return; }
    setLoading(true);
    try {
      const ref  = doc(db,'kout_rooms',id);
      const snap = await getDoc(ref);
      if (!snap.exists()) { Alert.alert('الغرفة غير موجودة'); setLoading(false); return; }
      const data = snap.data();
      if (data.players.length >= data.maxPlayers) { Alert.alert('الغرفة ممتلئة'); setLoading(false); return; }
      if (data.phase !== 'lobby') { Alert.alert('اللعبة بدأت'); setLoading(false); return; }
      const uid = getUid();
      if (!data.players.find(p => p.uid === uid)) {
        const seat = data.players.length;
        await updateDoc(ref, {
          players: arrayUnion({ uid, name: myName, seatIndex: seat }),
        });
        onSpendTokens(COST);
      }
      setRoomId(id);
      subscribeRoom(id);
    } catch (e) { Alert.alert('خطأ', e.message); }
    setLoading(false);
  }

  // ══════════════════════════════════════════════════════════════
  // المزايدة
  // ══════════════════════════════════════════════════════════════
  async function placeBid(value) {
    const uid      = getUid();
    const me       = roomData?.players.find(p => p.uid === uid);
    if (!me) return;
    const seat     = me.seatIndex;
    const bids     = roomData.bids || [];
    const nPlayers = roomData.players.length;
    const newBid   = { uid, seat, value, name: me.name };
    const newBids  = [...bids, newBid];
    const nextSeat = (seat + 1) % nPlayers;

    if (value === 'kout' || newBids.length >= nPlayers) {
      // انتهت المزايدة
      const realBids = newBids.filter(b => b.value !== 'pass');
      let winner, winVal, forcedBids = newBids, isForced = false;

      if (value === 'kout') {
        winner = seat; winVal = 'kout';
      } else if (realBids.length === 0) {
        // كل اللاعبين مرروا → اللاعب الأخير ملزوم بـ 5
        const lastPlayer = roomData.players.find(p => p.seatIndex === seat);
        const forcedEntry = { uid: lastPlayer.uid, seat, value: 5, name: lastPlayer.name, forced: true };
        forcedBids = [...newBids, forcedEntry];
        winner = seat; winVal = 5; isForced = true;
      } else {
        const top = realBids.reduce((a,b) =>
          (b.value === 'kout' ? 99 : b.value) > (a.value === 'kout' ? 99 : a.value) ? b : a
        );
        winner = top.seat; winVal = top.value;
      }

      await updateDoc(doc(db,'kout_rooms',roomId), {
        bids:           forcedBids,
        phase:          'game',
        bidWinner:      winner,
        bidValue:       winVal,
        isForcedBid:    isForced,
        trumpSuit:      null,
        choosingTrump:  true,
        currentSeat:    winner,
        trickStartSeat: winner,
        trickStartedAt: Date.now(),
      });
    } else {
      await updateDoc(doc(db,'kout_rooms',roomId), {
        bids:           newBids,
        currentBidSeat: nextSeat,
      });
    }
  }

  // ── اختيار الحكم ──
  async function chooseTrump(suit) {
    await updateDoc(doc(db,'kout_rooms',roomId), {
      trumpSuit:     suit,
      choosingTrump: false,
    });
  }

  // ══════════════════════════════════════════════════════════════
  // لعب ورقة
  // ══════════════════════════════════════════════════════════════
  async function playCard(card) {
    const uid      = getUid();
    const me       = roomData?.players.find(p => p.uid === uid);
    if (!me) return;
    const seat     = me.seatIndex;
    const nPlayers = roomData.players.length;
    if (roomData.currentSeat !== seat) return;

    const trick = roomData.currentTrick || [];
    if (trick.length > 0) {
      const leadSuit = trick[0].card.suit;
      const hasLead  = me.hand.some(c => c.suit === leadSuit);
      if (hasLead && card.suit !== leadSuit) {
        Alert.alert('يجب لعب نفس اللون', `عندك ${leadSuit}`);
        return;
      }
    }

    const newHand  = me.hand.filter(c => c.id !== card.id);
    const newTrick = [...trick, { uid, seat, card, name: me.name }];
    const players  = roomData.players.map(p => p.uid===uid ? { ...p, hand: newHand } : p);

    if (newTrick.length === nPlayers) {
      const winSeat   = winnerOfTrick(newTrick, roomData.trumpSuit);
      const winTeam   = TEAM_OF[winSeat];
      const t0t       = (roomData.team0Tricks || 0) + (winTeam===0 ? 1 : 0);
      const t1t       = (roomData.team1Tricks || 0) + (winTeam===1 ? 1 : 0);
      const newTricks = [...(roomData.tricks || []), { cards: newTrick, winner: winSeat }];
      const cardsLeft = players.reduce((s,p) => s + p.hand.length, 0);

      if (cardsLeft === 0) {
        const result = calcRoundResult(
          roomData.bidWinner, roomData.bidValue, t0t, t1t, nPlayers, roomData.isForcedBid
        );
        const newTotal = {
          team0: (roomData.totalScore?.team0 || 0) + result.team0,
          team1: (roomData.totalScore?.team1 || 0) + result.team1,
        };
        const gameWinner = newTotal.team0 >= WIN_LIMIT ? 0
                         : newTotal.team1 >= WIN_LIMIT ? 1
                         : null;
        const nextState = gameWinner === null
          ? buildNextBiddingState(players, roomData.bidWinner)
          : {};
        await updateDoc(doc(db,'kout_rooms',roomId), {
          players,
          tricks:          newTricks,
          team0Tricks:     t0t,
          team1Tricks:     t1t,
          totalScore:      newTotal,
          lastRoundResult: result,
          phase:           gameWinner !== null ? 'result' : 'bidding',
          winner:          gameWinner,
          ...nextState,
        });
      } else {
        await updateDoc(doc(db,'kout_rooms',roomId), {
          players,
          currentTrick:    [],
          tricks:          newTricks,
          team0Tricks:     t0t,
          team1Tricks:     t1t,
          currentSeat:     winSeat,
          trickStartSeat:  winSeat,
          trickStartedAt:  Date.now(),
          lastTrickWinner: winSeat,
        });
      }
    } else {
      // اتجاه اللعب: عكس عقارب الساعة
      const nextSeat = (seat - 1 + nPlayers) % nPlayers;
      await updateDoc(doc(db,'kout_rooms',roomId), {
        players,
        currentTrick:   newTrick,
        currentSeat:    nextSeat,
        trickStartedAt: Date.now(),
      });
    }
    setSelectedCard(null);
  }

  // ── بحث أصدقاء ──
  async function searchFriends(text) {
    setFriendSearch(text);
    if (text.length < 2) { setFriendResults([]); return; }
    setSearching(true);
    try {
      const q = query(collection(db,'users'), where('displayName','>=',text), where('displayName','<=',text+'\uf8ff'));
      const snap = await getDocs(q);
      setFriendResults(snap.docs.map(d=>({ uid:d.id, ...d.data() })).filter(u=>u.uid!==getUid()));
    } catch {}
    setSearching(false);
  }
  async function inviteFriend(friend) {
    if (!roomId) return;
    try {
      await updateDoc(doc(db,'users',friend.uid), {
        invites: arrayUnion({ roomId, game:'kout', from: myName, at: Date.now() }),
      });
      Alert.alert('تمت الدعوة ✓', `دُعي ${friend.displayName}`);
    } catch {}
  }

  // ── مغادرة ──
  function leaveRoom() { setShowLeave(true); }

  async function confirmLeave() {
    setShowLeave(false);
    if (unsubRef.current) unsubRef.current();
    if (roomId) {
      try {
        const snap = await getDoc(doc(db,'kout_rooms',roomId));
        if (snap.exists()) {
          const data = snap.data();
          if (data.phase === 'lobby') onSpendTokens && onSpendTokens(-COST);
          if (data.phase === 'lobby' && data.hostUid === getUid()) {
            await deleteDoc(doc(db,'kout_rooms',roomId));
          } else {
            await updateDoc(doc(db,'kout_rooms',roomId), {
              players: data.players.filter(p => p.uid !== getUid()),
            });
          }
        }
      } catch {}
    }
    setRoomId(null); setRoomData(null); setPhase('menu');
  }

  // ══════════════════════════════════════════════════════════════
  // قيم مشتقة
  // ══════════════════════════════════════════════════════════════
  const myPlayer   = roomData?.players?.find(p => p.uid === myUid);
  const mySeat     = myPlayer?.seatIndex ?? 0;
  const myTeam     = TEAM_OF[mySeat] ?? 0;
  const isMyTurn   = roomData?.currentSeat === mySeat;
  const isBidTurn  = roomData?.currentBidSeat === mySeat;
  const isChoosing = roomData?.choosingTrump && roomData?.bidWinner === mySeat;
  const totalScore = roomData?.totalScore || { team0:0, team1:0 };
  const myScore    = myTeam===0 ? totalScore.team0 : totalScore.team1;
  const oppScore   = myTeam===0 ? totalScore.team1 : totalScore.team0;
  const bidVal     = roomData?.bidValue;
  const bidWinSeat = roomData?.bidWinner ?? 0;
  const bidWinTeam = TEAM_OF[bidWinSeat];
  const bidLabel   = bidVal==='kout'?'كوت!':BID_LABELS[bidVal]||String(bidVal);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ◀ قائمة
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (phase === 'menu') return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#06061a" />
      <Animated.View style={{ opacity: fadeAnim, flex:1 }}>
        <View style={s.header}>
          <TouchableOpacity onPress={onBack} style={s.backBtn}>
            <Text style={s.backText}>←</Text>
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <Text style={s.headerEmoji}>🂡</Text>
            <Text style={s.headerTitle}>كوت بو 6</Text>
          </View>
          <View style={s.tokenBadge}><Text style={s.tokenText}>🪙 {tokens}</Text></View>
        </View>

        <ScrollView contentContainerStyle={s.menuScroll} showsVerticalScrollIndicator={false}>
          <View style={s.infoBox}>
            <Text style={s.infoTitle}>🂡 كيف تلعب كوت؟</Text>
            <Text style={s.infoText}>
              لعبة ورق خليجية لـ4 لاعبين (فريقان). تبدأ بالمزايدة على عدد اللمات (5-9).
              الرابح يحدد نوع الحكم ويحاول تحقيق مزايدته.{'\n\n'}
              • نجح → يأخذ عدد اللمات نقاطاً{'\n'}
              • فشل → الخصم يأخذ نفس العدد{'\n'}
              • كل مرروا → اللاعب الأخير ملزوم بـ 5 (باب){'\n'}
              • كوت (كل اللمات) → نقاط مضاعفة{'\n'}
              • الفائز: أول فريق يصل {WIN_LIMIT} نقطة
            </Text>
            <View style={s.infoMeta}>
              <Text style={s.infoMetaText}>👥 4–6 لاعبين</Text>
              <Text style={s.infoMetaText}>🪙 {COST} رصيد</Text>
              <Text style={s.infoMetaText}>🏆 حد: {WIN_LIMIT} نقطة</Text>
            </View>
          </View>

          <View style={s.section}>
            <Text style={s.sectionTitle}>عدد اللاعبين (غرفة الأصدقاء)</Text>
            <View style={s.countRow}>
              {[4,6].map(n => (
                <TouchableOpacity
                  key={n} style={[s.countBtn, desiredCount===n&&s.countBtnActive]}
                  onPress={() => setDesiredCount(n)}
                >
                  <Text style={[s.countBtnText, desiredCount===n&&s.countBtnTextActive]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={s.btnGroup}>
            <TouchableOpacity style={s.btnPrimary} onPress={() => createRoom(true)} disabled={loading}>
              <Text style={s.btnIcon}>🎲</Text>
              <View>
                <Text style={s.btnPrimaryText}>لعب عشوائي</Text>
                <Text style={s.btnSub}>4 لاعبين • {COST} رصيد</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={s.btnSecondary} onPress={() => createRoom(false)} disabled={loading}>
              <Text style={s.btnIcon}>👥</Text>
              <View>
                <Text style={s.btnSecondaryText}>أنشئ غرفة أصدقاء</Text>
                <Text style={[s.btnSub,{color:'#a0a0c0'}]}>{desiredCount} لاعبين • {COST} رصيد</Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={s.section}>
            <Text style={s.sectionTitle}>انضم بكود</Text>
            <View style={s.joinBox}>
              <TextInput
                style={s.joinInput} placeholder="أدخل الكود" placeholderTextColor="#555577"
                value={joinCode} onChangeText={t => setJoinCode(t.toUpperCase())}
                maxLength={6} autoCapitalize="characters"
              />
              <TouchableOpacity style={s.joinBtn} onPress={() => joinRoom(joinCode)}>
                <Text style={s.joinBtnText}>انضم</Text>
              </TouchableOpacity>
            </View>
          </View>

          {loading && <ActivityIndicator color="#8b5cf6" size="large" />}
        </ScrollView>
      </Animated.View>
    </View>
  );

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ◀ لوبي
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (phase === 'lobby') return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#06061a" />
      <View style={s.header}>
        <TouchableOpacity onPress={leaveRoom} style={s.backBtn}><Text style={s.backText}>←</Text></TouchableOpacity>
        <Text style={s.headerTitle}>🂡 انتظار اللاعبين</Text>
        <View style={s.tokenBadge}><Text style={s.tokenText}>🪙 {tokens}</Text></View>
      </View>
      <ScrollView contentContainerStyle={s.menuScroll}>
        <View style={s.codeBig}>
          <Text style={s.codeLabel}>كود الغرفة</Text>
          <Text style={s.codeValue}>{roomId}</Text>
          <Text style={s.codeHint}>اللعبة تبدأ تلقائياً عند اكتمال اللاعبين</Text>
        </View>

        <View style={s.roomProgress}>
          <View style={s.roomProgressTrack}>
            <View style={[s.roomProgressFill, {
              width: `${((roomData?.players?.length||0)/(roomData?.maxPlayers||4))*100}%`
            }]} />
          </View>
          <Text style={s.roomProgressText}>
            {roomData?.players?.length||0} / {roomData?.maxPlayers||4} لاعبين
          </Text>
        </View>

        <View style={s.lobbySection}>
          <Text style={s.lobbySTitle}>اللاعبون</Text>
          {Array.from({length: roomData?.maxPlayers||4}).map((_,i) => {
            const p = roomData?.players?.[i];
            return (
              <View key={i} style={[s.playerSlot, p&&s.playerSlotFilled]}>
                <Text style={s.playerSlotEmoji}>{p?(TEAM_OF[i]===0?'🟣':'🔵'):'⏳'}</Text>
                {p
                  ? <Text style={s.playerSlotName}>{p.name} ({SEAT_LABEL[i]})</Text>
                  : <Text style={s.emptySlot}>في انتظار لاعب...</Text>}
                {p?.uid===myUid && <Text style={s.meTag}>أنت</Text>}
              </View>
            );
          })}
        </View>

        {!roomData?.isRandom && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>ادعُ أصدقاء</Text>
            <TextInput
              style={s.joinInput} placeholder="ابحث باسم الصديق" placeholderTextColor="#555577"
              value={friendSearch} onChangeText={searchFriends}
            />
            {searching && <ActivityIndicator color="#8b5cf6" size="small" />}
            {friendResults.map(f => (
              <TouchableOpacity key={f.uid} style={s.friendResult} onPress={() => inviteFriend(f)}>
                <Text style={s.friendResultName}>{f.displayName}</Text>
                <Text style={s.friendResultInvite}>دعوة ←</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={s.waitingBox}>
          <ActivityIndicator color="#8b5cf6" size="small" />
          <Text style={s.waitingText}>في انتظار اكتمال اللاعبين...</Text>
        </View>
      </ScrollView>
      <LeaveModal visible={showLeave} onCancel={()=>setShowLeave(false)} onConfirm={confirmLeave} />
    </View>
  );

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ◀ المزايدة
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (phase === 'bidding') {
    const bids     = roomData?.bids || [];
    const bidSeat  = roomData?.currentBidSeat ?? 0;
    const lastReal = [...bids].reverse().find(b => b.value !== 'pass');
    const minBid   = lastReal ? (lastReal.value === 'kout' ? 999 : (lastReal.value||5) + 1) : 5;
    const validBids= [5,6,7,8,9].filter(v => v >= minBid);
    const curP     = roomData?.players?.find(p => p.seatIndex === bidSeat);

    return (
      <View style={s.container}>
        <StatusBar barStyle="light-content" backgroundColor="#06061a" />
        <View style={s.gameHeader}>
          <TouchableOpacity onPress={leaveRoom} style={s.backBtn}><Text style={s.backText}>←</Text></TouchableOpacity>
          <View style={{ alignItems:'center' }}>
            <Text style={s.gameTitle}>🂡 المزايدة</Text>
            <Text style={s.gameSubtitle}>حد الفوز: {WIN_LIMIT} نقطة</Text>
          </View>
          <View style={s.scoresBadge}><Text style={s.scoresText}>⭐ {myScore}–{oppScore}</Text></View>
        </View>

        <ScrollView contentContainerStyle={{ padding:16, gap:14 }}>
          <View style={s.bidsHistory}>
            <Text style={s.sectionTitle}>المزايدات</Text>
            {bids.length===0
              ? <Text style={{color:'#555577',textAlign:'center',fontSize:13}}>لا مزايدات بعد</Text>
              : bids.map((b,i)=>(
                  <View key={i} style={s.bidRow}>
                    <Text style={s.bidName}>{b.name}{b.forced?' (ملزوم)':''}</Text>
                    <Text style={[
                      s.bidVal,
                      b.value==='kout'&&{color:'#f5c518'},
                      b.value==='pass'&&{color:'#555577'},
                      b.forced&&{color:'#ef4444'},
                    ]}>
                      {b.value==='pass'?'طاف':b.value==='kout'?'🏆 كوت!':BID_LABELS[b.value]||b.value}
                    </Text>
                  </View>
                ))
            }
          </View>

          {isBidTurn ? (
            <View style={{ gap:12 }}>
              <Text style={[s.sectionTitle,{color:'#f5c518'}]}>دورك — زايد أو طاف</Text>
              <View style={s.bidGrid}>
                {validBids.map(v=>(
                  <TouchableOpacity key={v} style={s.bidOption} onPress={()=>placeBid(v)}>
                    <Text style={s.bidOptionNum}>{v}</Text>
                    <Text style={s.bidOptionLabel}>{BID_LABELS[v]}</Text>
                  </TouchableOpacity>
                ))}
                {minBid <= 9 && (
                  <TouchableOpacity style={[s.bidOption,s.bidKout]} onPress={()=>placeBid('kout')}>
                    <Text style={[s.bidOptionNum,{color:'#f5c518'}]}>كوت</Text>
                    <Text style={[s.bidOptionLabel,{color:'#f5c518'}]}>كل اللمات</Text>
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity style={s.btnOutline} onPress={()=>placeBid('pass')}>
                <Text style={s.btnOutlineText}>طاف (تمرير)</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.waitingBox}>
              <ActivityIndicator color="#8b5cf6" size="small" />
              <Text style={s.waitingText}>في انتظار {curP?.name||'...'}</Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ◀ اللعبة
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (phase === 'game') {
    const myHand    = myPlayer?.hand || [];
    const trick     = roomData?.currentTrick || [];
    const trump     = roomData?.trumpSuit;
    const seatOrder = [mySeat, (mySeat+1)%4, (mySeat+2)%4, (mySeat+3)%4];
    const playerAt  = si => roomData?.players?.find(p => p.seatIndex===si);
    const myTricks  = myTeam===0 ? (roomData?.team0Tricks||0) : (roomData?.team1Tricks||0);
    const oppTricks = myTeam===0 ? (roomData?.team1Tricks||0) : (roomData?.team0Tricks||0);

    return (
      <View style={s.container}>
        <StatusBar barStyle="light-content" backgroundColor="#06061a" />

        <View style={s.gameHeader}>
          <TouchableOpacity onPress={leaveRoom} style={s.backBtn}><Text style={s.backText}>←</Text></TouchableOpacity>
          <View style={{ alignItems:'center' }}>
            <Text style={s.gameTitle}>🂡 كوت</Text>
            {trump && <Text style={{color:SUIT_COLOR[trump]||'#fff',fontSize:14,fontWeight:'800'}}>حكم: {trump}</Text>}
          </View>
          <View style={s.scoresBadge}><Text style={s.scoresText}>⭐ {myScore}–{oppScore}</Text></View>
        </View>

        <View style={s.roundBar}>
          <Text style={s.roundBarText}>
            لماتك: {myTricks}
            {bidWinTeam===myTeam ? `  🎯 مزايدة: ${bidLabel}` : ''}
          </Text>
          <Text style={s.roundBarText}>خصمك: {oppTricks}</Text>
        </View>

        <TimerBar
          startedAt={roomData?.trickStartedAt} seconds={45}
          active={isMyTurn && !roomData?.choosingTrump}
          onTimeout={() => { if (myHand.length>0) playCard(myHand[0]); }}
        />

        {isMyTurn && !roomData?.choosingTrump
          ? <View style={s.myTurnBanner}><Text style={s.myTurnText}>🎯 دورك!</Text></View>
          : !roomData?.choosingTrump && (
            <View style={s.waitBanner}>
              <Text style={s.waitBannerText}>{playerAt(roomData?.currentSeat)?.name||'...'} يلعب...</Text>
            </View>
          )
        }

        {/* مودال الحكم */}
        {isChoosing && (
          <Modal transparent animationType="fade">
            <View style={s.modalOverlay}>
              <View style={s.modalBox}>
                <Text style={s.modalTitle}>اختر الحكم 🃏</Text>
                <Text style={s.modalSub}>
                  {roomData?.isForcedBid ? 'ملزوم (باب=5) — ' : ''}
                  مزايدتك: {bidLabel}
                </Text>
                <View style={s.suitRow}>
                  {SUITS.map(suit=>(
                    <TouchableOpacity key={suit} style={s.suitBtn} onPress={()=>chooseTrump(suit)}>
                      <Text style={[s.suitBtnText,{color:SUIT_COLOR[suit]}]}>{suit}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </Modal>
        )}

        {/* الطاولة */}
        <View style={s.table}>
          {/* شمال (شريك) */}
          {(()=>{
            const p = playerAt(seatOrder[2]);
            return (
              <View style={s.playerNorth}>
                <Text style={[s.playerName, TEAM_OF[seatOrder[2]]===myTeam&&s.allyName]}>
                  {p?.name||'...'} {TEAM_OF[seatOrder[2]]===myTeam?'🤝':'⚔️'}
                </Text>
                <Text style={s.cardCount}>{p?.hand?.length||0} 🃏</Text>
                <View style={s.hiddenHand}>
                  {Array.from({length:Math.min(p?.hand?.length||0,5)}).map((_,i)=>(
                    <View key={i} style={s.hiddenCard}/>
                  ))}
                </View>
              </View>
            );
          })()}

          <View style={s.tableMiddle}>
            {/* يسار */}
            {(()=>{
              const p = playerAt(seatOrder[3]);
              return (
                <View style={s.playerSide}>
                  <Text style={[s.playerName,{fontSize:11},TEAM_OF[seatOrder[3]]===myTeam&&s.allyName]}>
                    {p?.name||'...'} {TEAM_OF[seatOrder[3]]===myTeam?'🤝':'⚔️'}
                  </Text>
                  <Text style={s.cardCount}>{p?.hand?.length||0} 🃏</Text>
                </View>
              );
            })()}

            {/* الصنج */}
            <View style={s.trickArea}>
              {trick.length===0 && !trump
                ? <Text style={s.trickEmpty}>🂠</Text>
                : trick.length===0
                ? <Text style={[s.trumpDisplay,{color:SUIT_COLOR[trump]||'#fff'}]}>{trump}</Text>
                : trick.map((t,i)=>(
                    <View key={i} style={[s.trickCard,{borderColor:SUIT_COLOR[t.card.suit]||'#fff'}]}>
                      <Text style={[s.trickCardRank,{color:SUIT_COLOR[t.card.suit]||'#fff'}]}>
                        {RANK_AR[t.card.rank]}{t.card.suit}
                      </Text>
                      <Text style={s.trickCardName}>{t.name}</Text>
                    </View>
                  ))
              }
            </View>

            {/* يمين */}
            {(()=>{
              const p = playerAt(seatOrder[1]);
              return (
                <View style={s.playerSide}>
                  <Text style={[s.playerName,{fontSize:11},TEAM_OF[seatOrder[1]]===myTeam&&s.allyName]}>
                    {p?.name||'...'} {TEAM_OF[seatOrder[1]]===myTeam?'🤝':'⚔️'}
                  </Text>
                  <Text style={s.cardCount}>{p?.hand?.length||0} 🃏</Text>
                </View>
              );
            })()}
          </View>

          {roomData?.lastTrickWinner!==undefined && trick.length===0 && (
            <Text style={s.lastTrickNote}>
              آخر لمة: {playerAt(roomData.lastTrickWinner)?.name||'...'}
            </Text>
          )}
        </View>

        {/* يدي */}
        <View style={s.handArea}>
          <Text style={s.handLabel}>يدك ({myHand.length} ورقة)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.handScroll}>
            {myHand
              .slice()
              .sort((a,b) => a.suit!==b.suit?a.suit.localeCompare(b.suit):(RANK_VAL[b.rank]||0)-(RANK_VAL[a.rank]||0))
              .map(card=>(
                <TouchableOpacity
                  key={card.id}
                  style={[
                    s.card,
                    selectedCard?.id===card.id&&s.cardSelected,
                    !isMyTurn&&s.cardDisabled,
                    card.suit===trump&&s.cardTrump,
                  ]}
                  onPress={()=>{
                    if (!isMyTurn||roomData?.choosingTrump) return;
                    if (selectedCard?.id===card.id) playCard(card);
                    else setSelectedCard(card);
                  }}
                  disabled={!isMyTurn||!!roomData?.choosingTrump}
                >
                  <Text style={[s.cardRank,{color:SUIT_COLOR[card.suit]||'#fff'}]}>
                    {RANK_AR[card.rank]}
                  </Text>
                  <Text style={{fontSize:16,color:SUIT_COLOR[card.suit]||'#fff'}}>{card.suit}</Text>
                </TouchableOpacity>
              ))
            }
          </ScrollView>
          {selectedCard && isMyTurn && (
            <TouchableOpacity style={s.playBtn} onPress={()=>playCard(selectedCard)}>
              <Text style={s.playBtnText}>العب {RANK_AR[selectedCard.rank]}{selectedCard.suit}</Text>
            </TouchableOpacity>
          )}
          {isMyTurn && !selectedCard && !roomData?.choosingTrump && (
            <Text style={{color:'#555577',fontSize:12,textAlign:'center',marginTop:4}}>
              اضغط مرتين على الورقة للعبها
            </Text>
          )}
        </View>
      </View>
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ◀ النتائج
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (phase === 'result') {
    const winner     = roomData?.winner;
    const iWon       = winner === myTeam;
    const lastRes    = roomData?.lastRoundResult;
    const team0Names = roomData?.players?.filter(p=>TEAM_OF[p.seatIndex]===0).map(p=>p.name).join(' & ');
    const team1Names = roomData?.players?.filter(p=>TEAM_OF[p.seatIndex]===1).map(p=>p.name).join(' & ');

    return (
      <View style={s.container}>
        <StatusBar barStyle="light-content" backgroundColor="#06061a" />
        <View style={s.gameHeader}>
          <TouchableOpacity onPress={onBack} style={s.backBtn}><Text style={s.backText}>←</Text></TouchableOpacity>
          <Text style={s.gameTitle}>🏆 النهاية</Text>
          <View/>
        </View>
        <View style={s.resultContent}>
          <Text style={s.resultEmoji}>{iWon?'🏆':'😔'}</Text>
          <Text style={[s.resultTitle,{color:iWon?'#f5c518':'#ef4444'}]}>
            {iWon?'فريقك فاز!':'الفريق الآخر فاز'}
          </Text>
          {lastRes?.note && <Text style={s.resultNote}>{lastRes.note}</Text>}
          <View style={s.teamsRow}>
            <View style={[s.teamBox,{borderColor:'#8b5cf6'}]}>
              <Text style={[s.teamBoxTitle,{color:'#8b5cf6'}]}>الفريق ١</Text>
              <Text style={s.teamBoxPlayers}>{team0Names}</Text>
              <Text style={s.teamBoxScore}>{totalScore.team0}</Text>
              <Text style={s.teamBoxLabel}>نقطة</Text>
            </View>
            <Text style={s.vsText}>VS</Text>
            <View style={[s.teamBox,{borderColor:'#06b6d4'}]}>
              <Text style={[s.teamBoxTitle,{color:'#06b6d4'}]}>الفريق ٢</Text>
              <Text style={s.teamBoxPlayers}>{team1Names}</Text>
              <Text style={s.teamBoxScore}>{totalScore.team1}</Text>
              <Text style={s.teamBoxLabel}>نقطة</Text>
            </View>
          </View>
          <Text style={s.resultNote}>حد الفوز: {WIN_LIMIT} نقطة</Text>
          <TouchableOpacity style={s.btnPrimary} onPress={leaveRoom}>
            <Text style={s.btnIcon}>🏠</Text>
            <Text style={s.btnPrimaryText}>الرئيسية</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[s.container,{alignItems:'center',justifyContent:'center'}]}>
      <ActivityIndicator color="#8b5cf6" size="large"/>
      <LeaveModal visible={showLeave} onCancel={()=>setShowLeave(false)} onConfirm={confirmLeave} />
    </View>
  );
}

// ══════════════════════════════════════════════════════════════
// الأنماط
// ══════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  container:    { flex:1, backgroundColor:'#06061a' },

  header:       { flexDirection:'row', alignItems:'center', justifyContent:'space-between',
                  paddingHorizontal:16, paddingTop:52, paddingBottom:12,
                  backgroundColor:'#0a0a20', borderBottomWidth:1, borderBottomColor:'#1a1a3e' },
  headerCenter: { flexDirection:'row', alignItems:'center', gap:8 },
  headerEmoji:  { fontSize:24 },
  headerTitle:  { fontSize:20, fontWeight:'900', color:'#8b5cf6' },
  backBtn:      { padding:8 },
  backText:     { color:'#8b5cf6', fontSize:18, fontWeight:'700' },
  tokenBadge:   { backgroundColor:'#8b5cf620', paddingHorizontal:10, paddingVertical:5, borderRadius:12, borderWidth:1, borderColor:'#8b5cf640' },
  tokenText:    { color:'#8b5cf6', fontWeight:'800', fontSize:14 },

  menuScroll:   { padding:20, gap:16 },
  infoBox:      { backgroundColor:'#1a1a3e', borderRadius:16, padding:18, borderWidth:1, borderColor:'#8b5cf630', gap:10 },
  infoTitle:    { color:'#8b5cf6', fontSize:16, fontWeight:'800' },
  infoText:     { color:'#c0c0e0', fontSize:13, lineHeight:22, textAlign:'right' },
  infoMeta:     { flexDirection:'row', gap:12, flexWrap:'wrap' },
  infoMetaText: { color:'#a09060', fontSize:12 },

  section:           { gap:10 },
  sectionTitle:      { color:'#8b5cf6', fontSize:15, fontWeight:'800', textAlign:'right' },
  countRow:          { flexDirection:'row', gap:10 },
  countBtn:          { flex:1, backgroundColor:'#1a1a3e', borderRadius:12, paddingVertical:14, alignItems:'center', borderWidth:1.5, borderColor:'#2a2a55' },
  countBtnActive:    { backgroundColor:'#8b5cf622', borderColor:'#8b5cf6' },
  countBtnText:      { color:'#a0a0c0', fontSize:18, fontWeight:'700' },
  countBtnTextActive:{ color:'#8b5cf6' },

  btnGroup:        { gap:12 },
  btnPrimary:      { backgroundColor:'#8b5cf6', borderRadius:16, paddingVertical:16, paddingHorizontal:20, flexDirection:'row', alignItems:'center', gap:14 },
  btnIcon:         { fontSize:24 },
  btnPrimaryText:  { color:'#fff', fontSize:17, fontWeight:'800' },
  btnSub:          { color:'#d0c0ff', fontSize:12, marginTop:2 },
  btnSecondary:    { backgroundColor:'#1a1a3e', borderRadius:16, paddingVertical:16, paddingHorizontal:20, flexDirection:'row', alignItems:'center', gap:14, borderWidth:1.5, borderColor:'#8b5cf640' },
  btnSecondaryText:{ color:'#8b5cf6', fontSize:17, fontWeight:'800' },
  btnOutline:      { borderRadius:16, paddingVertical:14, alignItems:'center', borderWidth:1.5, borderColor:'#8b5cf640' },
  btnOutlineText:  { color:'#8b5cf6', fontSize:16, fontWeight:'700' },

  joinBox:    { flexDirection:'row', gap:10, alignItems:'center' },
  joinInput:  { flex:1, backgroundColor:'#1a1a3e', color:'#fff', borderRadius:12, paddingHorizontal:14, paddingVertical:12, borderWidth:1.5, borderColor:'#2a2a55', fontSize:15, textAlign:'center', letterSpacing:4 },
  joinBtn:    { backgroundColor:'#8b5cf6', borderRadius:12, paddingHorizontal:18, paddingVertical:13 },
  joinBtnText:{ color:'#fff', fontWeight:'800', fontSize:15 },

  codeBig:   { backgroundColor:'#1a1a3e', borderRadius:20, padding:24, alignItems:'center', gap:6, borderWidth:1.5, borderColor:'#8b5cf640' },
  codeLabel: { color:'#a09060', fontSize:13 },
  codeValue: { color:'#8b5cf6', fontSize:42, fontWeight:'900', letterSpacing:8 },
  codeHint:  { color:'#555577', fontSize:12, textAlign:'center' },

  roomProgress:      { gap:6 },
  roomProgressTrack: { height:8, backgroundColor:'#1a1a3e', borderRadius:4, overflow:'hidden' },
  roomProgressFill:  { height:'100%', backgroundColor:'#8b5cf6', borderRadius:4 },
  roomProgressText:  { color:'#a09060', fontSize:13, textAlign:'right' },

  lobbySection:    { gap:8 },
  lobbySTitle:     { color:'#8b5cf6', fontSize:15, fontWeight:'800', textAlign:'right' },
  playerSlot:      { backgroundColor:'#0f0f2e', borderRadius:14, padding:14, flexDirection:'row', alignItems:'center', gap:10, borderWidth:1, borderColor:'#1a1a40' },
  playerSlotFilled:{ borderColor:'#8b5cf640' },
  playerSlotEmoji: { fontSize:20 },
  playerSlotName:  { flex:1, color:'#e0e0ff', fontSize:14, fontWeight:'700', textAlign:'right' },
  meTag:           { color:'#8b5cf6', fontSize:11, fontWeight:'800', backgroundColor:'#8b5cf620', paddingHorizontal:8, paddingVertical:3, borderRadius:8 },
  emptySlot:       { color:'#333355', fontSize:14, flex:1, textAlign:'center' },
  friendResult:    { backgroundColor:'#0f0f2e', borderRadius:12, padding:12, flexDirection:'row', alignItems:'center', borderWidth:1, borderColor:'#1a1a40' },
  friendResultName:{ flex:1, color:'#e0e0ff', fontSize:14, fontWeight:'700', textAlign:'right' },
  friendResultInvite:{ color:'#8b5cf6', fontSize:13, fontWeight:'700' },
  waitingBox:      { flexDirection:'row', alignItems:'center', gap:12, justifyContent:'center', padding:16 },
  waitingText:     { color:'#a09060', fontSize:13 },

  gameHeader:   { flexDirection:'row', alignItems:'center', justifyContent:'space-between',
                  paddingHorizontal:16, paddingTop:52, paddingBottom:12,
                  backgroundColor:'#0a0a20', borderBottomWidth:1, borderBottomColor:'#1a1a3e' },
  gameTitle:    { color:'#8b5cf6', fontSize:18, fontWeight:'900' },
  gameSubtitle: { color:'#555577', fontSize:11, textAlign:'center' },
  scoresBadge:  { backgroundColor:'#f5c51820', paddingHorizontal:12, paddingVertical:6, borderRadius:12, borderWidth:1, borderColor:'#f5c51850' },
  scoresText:   { color:'#f5c518', fontWeight:'900', fontSize:14 },

  roundBar:     { flexDirection:'row', justifyContent:'space-between', paddingHorizontal:16, paddingVertical:6, backgroundColor:'#0d0d2b' },
  roundBarText: { color:'#a09060', fontSize:12 },

  myTurnBanner: { backgroundColor:'#f5c51820', paddingVertical:7, borderBottomWidth:1, borderBottomColor:'#f5c51840' },
  myTurnText:   { color:'#f5c518', fontSize:14, fontWeight:'800', textAlign:'center' },
  waitBanner:   { backgroundColor:'#1a1a3e', paddingVertical:7, borderBottomWidth:1, borderBottomColor:'#2a2a55' },
  waitBannerText:{ color:'#555577', fontSize:13, textAlign:'center' },

  bidsHistory:  { backgroundColor:'#1a1a3e', borderRadius:14, padding:14, gap:8, borderWidth:1, borderColor:'#8b5cf630' },
  bidRow:       { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingVertical:3 },
  bidName:      { color:'#e0e0ff', fontSize:14, fontWeight:'700' },
  bidVal:       { color:'#8b5cf6', fontSize:15, fontWeight:'900' },
  bidGrid:      { flexDirection:'row', flexWrap:'wrap', gap:10 },
  bidOption:    { backgroundColor:'#1a1a3e', borderRadius:12, paddingVertical:12, paddingHorizontal:16,
                  borderWidth:1.5, borderColor:'#8b5cf640', minWidth:80, alignItems:'center', gap:3 },
  bidOptionNum: { color:'#8b5cf6', fontSize:20, fontWeight:'900' },
  bidOptionLabel:{ color:'#a09060', fontSize:11 },
  bidKout:      { backgroundColor:'#f5c51810', borderColor:'#f5c51840' },

  table:        { flex:1, padding:10, justifyContent:'space-between' },
  playerNorth:  { alignItems:'center', gap:3 },
  playerSide:   { alignItems:'center', justifyContent:'center', gap:2, minWidth:60 },
  tableMiddle:  { flexDirection:'row', alignItems:'center', justifyContent:'space-between', flex:1 },
  playerName:   { color:'#e0e0ff', fontSize:12, fontWeight:'700', textAlign:'center' },
  allyName:     { color:'#22c55e' },
  cardCount:    { color:'#555577', fontSize:11 },
  hiddenHand:   { flexDirection:'row', gap:2 },
  hiddenCard:   { width:18, height:28, backgroundColor:'#1a1a3e', borderRadius:4, borderWidth:1, borderColor:'#2a2a55' },

  trickArea:    { flex:1, alignItems:'center', justifyContent:'center', gap:4,
                  backgroundColor:'#0d0d2b', borderRadius:16, marginHorizontal:6, padding:8,
                  borderWidth:1, borderColor:'#1a1a40', flexWrap:'wrap', flexDirection:'row' },
  trickEmpty:   { fontSize:40, color:'#2a2a55' },
  trumpDisplay: { fontSize:36, fontWeight:'900' },
  trickCard:    { backgroundColor:'#1a1a3e', borderRadius:8, padding:6, alignItems:'center', borderWidth:1.5, margin:2 },
  trickCardRank:{ fontSize:14, fontWeight:'900' },
  trickCardName:{ color:'#555577', fontSize:10 },
  lastTrickNote:{ color:'#555577', fontSize:11, textAlign:'center' },

  handArea:   { backgroundColor:'#0a0a20', borderTopWidth:1, borderTopColor:'#1a1a3e', padding:10, gap:6 },
  handLabel:  { color:'#8b5cf6', fontSize:13, fontWeight:'700', textAlign:'right' },
  handScroll: { gap:6, paddingHorizontal:4, paddingBottom:4 },
  card:        { backgroundColor:'#1a1a3e', borderRadius:10, padding:8, alignItems:'center', minWidth:44, borderWidth:2, borderColor:'#2a2a55', gap:1 },
  cardSelected:{ borderColor:'#f5c518', backgroundColor:'#f5c51815', transform:[{translateY:-12}] },
  cardDisabled:{ opacity:0.45 },
  cardTrump:   { backgroundColor:'#8b5cf615', borderColor:'#8b5cf650' },
  cardRank:    { fontSize:15, fontWeight:'900' },
  playBtn:     { backgroundColor:'#8b5cf6', margin:6, borderRadius:14, paddingVertical:12, alignItems:'center' },
  playBtnText: { color:'#fff', fontSize:15, fontWeight:'900' },

  modalOverlay: { flex:1, backgroundColor:'#000000bb', alignItems:'center', justifyContent:'center' },
  modalBox:     { backgroundColor:'#1a1a3e', borderRadius:20, padding:28, alignItems:'center', gap:16,
                  borderWidth:2, borderColor:'#8b5cf6', minWidth:280 },
  modalTitle:   { color:'#8b5cf6', fontSize:22, fontWeight:'900' },
  modalSub:     { color:'#a09060', fontSize:13, textAlign:'center' },
  suitRow:      { flexDirection:'row', gap:16 },
  suitBtn:      { backgroundColor:'#0d0d2b', borderRadius:14, padding:16, borderWidth:2, borderColor:'#8b5cf640' },
  suitBtnText:  { fontSize:32, fontWeight:'900' },

  resultContent: { flex:1, alignItems:'center', justifyContent:'center', padding:24, gap:16 },
  resultEmoji:   { fontSize:80 },
  resultTitle:   { fontSize:32, fontWeight:'900' },
  resultNote:    { color:'#a09060', fontSize:13, textAlign:'center' },
  teamsRow:      { flexDirection:'row', alignItems:'center', gap:12, width:'100%' },
  teamBox:       { flex:1, borderRadius:16, borderWidth:1.5, padding:14, gap:4, backgroundColor:'#1a1a3e', alignItems:'center' },
  teamBoxTitle:  { fontSize:14, fontWeight:'800' },
  teamBoxPlayers:{ color:'#9090b0', fontSize:11, textAlign:'center' },
  teamBoxScore:  { fontSize:36, fontWeight:'900', color:'#f5c518' },
  teamBoxLabel:  { color:'#555577', fontSize:12 },
  vsText:        { color:'#555577', fontSize:18, fontWeight:'900' },
});
