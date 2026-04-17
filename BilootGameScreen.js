/**
 * BilootGameScreen.js  —  بلوت خليجي
 * فريقان 2v2 | مزايدة 77-99 / كابوت | فوز بـ 152 نقطة
 * بوتات بعد 60 ثانية إذا لم تكتمل الغرفة
 */

import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, ScrollView, ActivityIndicator,
  TextInput, Animated,
} from 'react-native';
import { db, auth } from './firebaseConfig';
import {
  doc, setDoc, onSnapshot, updateDoc, getDoc, serverTimestamp,
} from 'firebase/firestore';

// ══════════════════════════════════════════════════════════════
// ثوابت
// ══════════════════════════════════════════════════════════════
const WIN_SCORE  = 152;
const LOBBY_WAIT = 60;
const TURN_TIME  = 30;
const BOT_DELAY  = 1000;

// فريق0 = مقعد 0+2 | فريق1 = مقعد 1+3
const TEAM_OF   = { 0:0, 1:1, 2:0, 3:1 };
const SEAT_LABEL = ['جنوب','شرق','شمال','غرب'];

// ── الورق ──────────────────────────────────────────────────────
const SUITS  = ['♠','♥','♦','♣'];
const RANKS  = ['A','K','Q','J','10','9','8','7'];
const SUIT_COLOR = { '♠':'#c8c8ff','♣':'#c8c8ff','♥':'#ff6b6b','♦':'#ff6b6b' };
const SUIT_AR    = { '♠':'بستوني','♥':'قلبي','♦':'ديناري','♣':'خشبي' };

// قيمة الورق في اللعب العادي
const RANK_VAL = { A:11, K:4, Q:3, J:2, '10':10, '9':0, '8':0, '7':0 };
// قيمة الورق عندما يكون أتو
const RANK_TRUMP_VAL = { A:11, K:4, Q:3, J:20, '10':10, '9':14, '8':0, '7':0 };

// رتبة ترتيب اللعب (كبر = أعلى)
const RANK_ORDER = { A:8, K:7, Q:6, J:5, '10':4, '9':3, '8':2, '7':1 };
const RANK_TRUMP_ORDER = { A:8, K:7, Q:6, '10':5, '9':4, '8':3, '7':2, J:9 }; // الجاك أتو = أعلى

function cardVal(rank, isTrump)  { return isTrump ? (RANK_TRUMP_VAL[rank]||0) : (RANK_VAL[rank]||0); }
function cardOrder(rank, isTrump){ return isTrump ? (RANK_TRUMP_ORDER[rank]||0) : (RANK_ORDER[rank]||0); }

function cardPower(card, trump, lead) {
  if (!card) return -1;
  if (card.suit === trump) return cardOrder(card.rank, true)  + 200;
  if (card.suit === lead)  return cardOrder(card.rank, false) + 100;
  return cardOrder(card.rank, false);
}

function winnerOfTrick(trick, trump) {
  if (!trick?.length) return 0;
  const lead = trick[0].card.suit;
  let best = trick[0];
  for (const t of trick)
    if (cardPower(t.card, trump, lead) > cardPower(best.card, trump, lead)) best = t;
  return best.seat;
}

// نقاط اللمة
function trickPoints(trick, trump) {
  return trick.reduce((s, t) => s + cardVal(t.card.rank, t.card.suit === trump), 0);
}

// ── توزيع 52 ورقة ──────────────────────────────────────────────
function buildDeck() {
  const d = [];
  for (const s of SUITS) for (const r of RANKS) d.push({ suit:s, rank:r });
  return d;
}
function shuffle(a) {
  const b = [...a];
  for (let i=b.length-1; i>0; i--) {
    const j = Math.floor(Math.random()*(i+1));
    [b[i],b[j]] = [b[j],b[i]];
  }
  return b;
}
function dealHands() {
  const deck = shuffle(buildDeck());
  const hands = [[],[],[],[]];
  deck.forEach((c,i) => hands[i%4].push(c));
  return hands; // 13 ورقة لكل لاعب
}

// ── قواعد المزايدة ──────────────────────────────────────────────
// مزايدة بلوت: 77-99 (فردي)، 100، كابوت
const BID_OPTIONS = [
  ...Array.from({length:12}, (_,i) => 77 + i*2).filter(v=>v<=99),
  100, 'kaboot'
];
const BID_LABEL = { kaboot:'كابوت' };
function bidLabel(b) { return b === 'kaboot' ? 'كابوت' : String(b); }
function bidVal(b)   { return b === 'kaboot' ? 200 : (typeof b==='number' ? b : 77); }

// ── منطق الجولة ──────────────────────────────────────────────
function newRoundState(dealerSeat=0) {
  const hands = dealHands();
  return {
    hands,
    phase: 'bidding',      // bidding | choosingTrump | playing | roundOver
    dealer: dealerSeat,
    bidTurn: (dealerSeat+1)%4,
    bids: [],              // [{seat, bid}]
    highBid: null,         // {seat, bid}
    passCount: 0,
    trump: null,
    currentTurn: null,
    trick: [],             // [{seat, card}]
    tricks: [],            // لمات منتهية
    pts: [0,0],            // نقاط اللمات هذه الجولة [فريق0, فريق1]
    trickStartedAt: null,
  };
}

// حساب نتيجة الجولة
function calcRound(round, totalScores) {
  const bidSeat = round.highBid.seat;
  const bidTeam = TEAM_OF[bidSeat];
  const bv = bidVal(round.highBid.bid);
  const bidderPts = round.pts[bidTeam];
  const oppPts    = round.pts[1-bidTeam];

  // كابوت = لازم يأخذ كل اللمات
  if (round.highBid.bid === 'kaboot') {
    const allTricks = 13;
    const bidderTricks = round.tricks.filter(t => TEAM_OF[t.winner] === bidTeam).length;
    if (bidderTricks === allTricks) {
      const add = [0,0]; add[bidTeam] = 200;
      return add;
    } else {
      const add = [0,0]; add[1-bidTeam] = 200;
      return add;
    }
  }

  // عادي
  if (bidderPts >= bv) {
    // نجح: كل فريق يأخذ نقاطه الفعلية
    return [round.pts[0], round.pts[1]];
  } else {
    // فشل: الخصم يأخذ كل النقاط (bv + oppPts)
    const add = [0,0];
    add[1-bidTeam] = bv + oppPts;
    return add;
  }
}

// ── مساعدات ──
function genCode() { return Math.random().toString(36).slice(2,7).toUpperCase(); }
function getUid() {
  if (auth?.currentUser?.uid) return auth.currentUser.uid;
  if (!global._bilootUid) global._bilootUid = 'guest_'+Math.random().toString(36).slice(2,10);
  return global._bilootUid;
}

// ── البوت: اختيار ورقة ──
function botPickCard(hand, trick, trump) {
  const legal = legalCards(hand, trick, trump);
  if (!legal.length) return hand[0];
  return legal[Math.floor(Math.random()*legal.length)];
}

// ── ورق قابلة للعب ──
function legalCards(hand, trick, trump) {
  if (!trick.length) return hand;
  const leadSuit = trick[0].card.suit;
  const hasSuit  = hand.filter(c => c.suit === leadSuit);
  if (hasSuit.length) return hasSuit;
  const hasTrump = hand.filter(c => c.suit === trump);
  if (hasTrump.length) return hasTrump;
  return hand;
}

// ══════════════════════════════════════════════════════════════
// المكوّن الرئيسي
// ══════════════════════════════════════════════════════════════
export default function BilootGameScreen({ onBack, currentUser }) {
  const [uiPhase, setUiPhase] = useState('lobby'); // lobby|waiting|playing|over
  const [roomCode, setRoomCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [roomData, setRoomData] = useState(null);
  const [mySeat,   setMySeat]   = useState(null);
  const [waitSec,  setWaitSec]  = useState(LOBBY_WAIT);
  const [turnSec,  setTurnSec]  = useState(TURN_TIME);
  const [scores,   setScores]   = useState([0,0]);
  const [winner,   setWinner]   = useState(null);
  const [msg,      setMsg]      = useState('');

  const myUid       = getUid();
  const unsubRef    = useRef(null);
  const waitRef     = useRef(null);
  const botRef      = useRef(null);
  const turnRef     = useRef(null);

  const isHost = roomData?.hostUid === myUid;

  useEffect(() => () => {
    unsubRef.current?.();
    clearInterval(waitRef.current);
    clearTimeout(botRef.current);
    clearInterval(turnRef.current);
  }, []);

  // ══════════════════════════════════════════════════════════════
  // إنشاء / انضمام
  // ══════════════════════════════════════════════════════════════
  async function handleCreate() {
    const code = genCode();
    const round = newRoundState(0);
    await setDoc(doc(db,'biloot_rooms',code), {
      code, hostUid:myUid, status:'waiting',
      seats: [{ uid:myUid, name:currentUser?.name||'ضيف', isBot:false }, null, null, null],
      scores:[0,0], round,
      createdAt: serverTimestamp(),
    });
    setRoomCode(code); setMySeat(0);
    subscribe(code,0); setUiPhase('waiting');
    startWaitTimer(code);
  }

  async function handleJoin() {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    const snap = await getDoc(doc(db,'biloot_rooms',code));
    if (!snap.exists()) { setMsg('الغرفة غير موجودة'); return; }
    const d = snap.data();
    if (d.status !== 'waiting') { setMsg('الغرفة بدأت'); return; }
    const seat = d.seats.findIndex(s => !s);
    if (seat === -1) { setMsg('الغرفة ممتلئة'); return; }
    const seats = [...d.seats];
    seats[seat] = { uid:myUid, name:currentUser?.name||'ضيف', isBot:false };
    await updateDoc(doc(db,'biloot_rooms',code), { seats });
    setRoomCode(code); setMySeat(seat);
    subscribe(code,seat); setUiPhase('waiting');
  }

  // ══════════════════════════════════════════════════════════════
  // مراقبة الغرفة
  // ══════════════════════════════════════════════════════════════
  function subscribe(code, seat) {
    unsubRef.current?.();
    unsubRef.current = onSnapshot(doc(db,'biloot_rooms',code), snap => {
      if (!snap.exists()) { setUiPhase('lobby'); return; }
      const d = snap.data();
      setRoomData(d);
      setScores(d.scores||[0,0]);
      if (d.status==='playing') { clearInterval(waitRef.current); setUiPhase('playing'); }
      if (d.status==='over')    { setWinner(d.winner); setUiPhase('over'); }
    });
  }

  // بدء تلقائي عند اكتمال الغرفة
  useEffect(() => {
    if (!isHost || !roomData || roomData.status!=='waiting') return;
    if (roomData.seats.every(s=>s)) {
      clearInterval(waitRef.current);
      updateDoc(doc(db,'biloot_rooms',roomCode),{ status:'playing' });
    }
  }, [roomData?.seats]);

  // ══════════════════════════════════════════════════════════════
  // مؤقت الانتظار
  // ══════════════════════════════════════════════════════════════
  function startWaitTimer(code) {
    let s = LOBBY_WAIT;
    waitRef.current = setInterval(async () => {
      s--; setWaitSec(s);
      if (s<=0) { clearInterval(waitRef.current); await fillBots(code); }
    },1000);
  }

  async function fillBots(code) {
    const snap = await getDoc(doc(db,'biloot_rooms',code));
    if (!snap.exists()) return;
    const d = snap.data();
    if (d.status!=='waiting') return;
    const seats = [...d.seats];
    const names = ['بوت أ','بوت ب','بوت ج'];
    let bi=0;
    for (let i=0;i<4;i++) if (!seats[i]) seats[i]={ uid:`bot_${i}`, name:names[bi++]||`بوت${i}`, isBot:true };
    await updateDoc(doc(db,'biloot_rooms',code),{ seats, status:'playing' });
  }

  // ══════════════════════════════════════════════════════════════
  // مؤقت الدور (للاعب الحقيقي)
  // ══════════════════════════════════════════════════════════════
  useEffect(() => {
    clearInterval(turnRef.current);
    if (uiPhase!=='playing' || !roomData?.round) return;
    const round = roomData.round;
    if (round.phase==='roundOver') return;

    const cur = round.phase==='bidding' ? round.bidTurn : round.currentTurn;
    if (cur !== mySeat) return;

    // تحقق ورق قابلة للعب — إذا ما عنده تمرر تلقائياً بعد ثانية
    if (round.phase==='playing') {
      const myHand = round.hands[mySeat]||[];
      const legal = legalCards(myHand, round.trick, round.trump);
      if (!legal.length) {
        setTurnSec(0);
        turnRef.current = setTimeout(() => advanceTurn(round, mySeat), 1000);
        return;
      }
    }

    setTurnSec(TURN_TIME);
    let s = TURN_TIME;
    turnRef.current = setInterval(() => {
      s--; setTurnSec(s);
      if (s<=0) {
        clearInterval(turnRef.current);
        if (round.phase==='bidding') handleBotBid(mySeat, round);
        else                         handleAutoPlay(mySeat, round);
      }
    },1000);
    return () => clearInterval(turnRef.current);
  }, [roomData?.round?.bidTurn, roomData?.round?.currentTurn, roomData?.round?.phase, uiPhase]);

  // ══════════════════════════════════════════════════════════════
  // البوت
  // ══════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!isHost || uiPhase!=='playing' || !roomData?.round) return;
    const round = roomData.round;
    if (round.phase==='roundOver') return;

    const cur = round.phase==='bidding' ? round.bidTurn : round.currentTurn;
    const player = roomData.seats[cur];
    if (!player?.isBot) return;

    clearTimeout(botRef.current);
    botRef.current = setTimeout(() => {
      if (round.phase==='bidding')      handleBotBid(cur, round);
      else if (round.phase==='choosingTrump') handleBotTrump(cur, round);
      else                              handleAutoPlay(cur, round);
    }, BOT_DELAY);
  }, [roomData?.round?.bidTurn, roomData?.round?.currentTurn, roomData?.round?.phase, uiPhase]);

  // ══════════════════════════════════════════════════════════════
  // منطق المزايدة
  // ══════════════════════════════════════════════════════════════
  async function placeBid(seat, bid) {
    const round = roomData.round;
    const bids  = [...(round.bids||[]), { seat, bid }];
    const high  = round.highBid;
    const isHigher = !high || bidVal(bid) > bidVal(high.bid);
    const newHigh  = isHigher ? { seat, bid } : high;
    const nextSeat = (seat+1)%4;
    const passCount = bid==='pass' ? (round.passCount||0)+1 : 0;

    // انتهت المزايدة إذا مرر الجميع بعد المزايدة، أو مرر 3 متتالين
    const biddingDone = (newHigh && passCount>=3) || (!newHigh && passCount>=4);

    if (biddingDone) {
      if (!newHigh) {
        // كلهم مرروا → جولة جديدة
        const nr = newRoundState((round.dealer+1)%4);
        await updateDoc(doc(db,'biloot_rooms',roomCode),{ round:nr });
        return;
      }
      // ابدأ اختيار الأتو
      await updateDoc(doc(db,'biloot_rooms',roomCode),{
        round:{ ...round, bids, highBid:newHigh, passCount,
                phase:'choosingTrump', bidTurn:newHigh.seat }
      });
      return;
    }

    await updateDoc(doc(db,'biloot_rooms',roomCode),{
      round:{ ...round, bids, highBid:newHigh, passCount, bidTurn:nextSeat }
    });
  }

  function handleBotBid(seat, round) {
    // البوت يزايد عشوائياً أو يمرر
    const doPass = Math.random() < 0.5;
    if (doPass || !round.highBid) {
      placeBid(seat, doPass ? 'pass' : 77);
    } else {
      const cur = bidVal(round.highBid.bid);
      const next = BID_OPTIONS.find(b => bidVal(b) > cur);
      placeBid(seat, next || 'pass');
    }
  }

  // ══════════════════════════════════════════════════════════════
  // اختيار الأتو
  // ══════════════════════════════════════════════════════════════
  async function chooseTrump(seat, suit) {
    const round = roomData.round;
    const firstTurn = (seat+1)%4; // يبدأ اللعب من اليسار
    await updateDoc(doc(db,'biloot_rooms',roomCode),{
      round:{
        ...round,
        phase:'playing',
        trump: suit,
        currentTurn: firstTurn,
        trick:[],
        trickStartedAt: Date.now(),
      }
    });
  }

  function handleBotTrump(seat, round) {
    // البوت يختار أتو عشوائي
    const suit = SUITS[Math.floor(Math.random()*SUITS.length)];
    chooseTrump(seat, suit);
  }

  // ══════════════════════════════════════════════════════════════
  // اللعب
  // ══════════════════════════════════════════════════════════════
  async function playCard(seat, card) {
    const round = roomData.round;
    const newHands = round.hands.map((h,i) =>
      i===seat ? h.filter(c=>!(c.suit===card.suit&&c.rank===card.rank)) : h
    );
    const newTrick = [...round.trick, { seat, card }];

    if (newTrick.length < 4) {
      // اللمة لم تكتمل
      await updateDoc(doc(db,'biloot_rooms',roomCode),{
        round:{ ...round, hands:newHands, trick:newTrick,
                currentTurn:(seat+1)%4, trickStartedAt:Date.now() }
      });
      return;
    }

    // اللمة اكتملت
    const trickWinner = winnerOfTrick(newTrick, round.trump);
    const pts = [...round.pts];
    pts[TEAM_OF[trickWinner]] += trickPoints(newTrick, round.trump);
    const tricks = [...(round.tricks||[]), { cards:newTrick, winner:trickWinner }];

    // آخر لمة → +10 للفائز باللمة الأخيرة
    const isLastTrick = newHands.every(h=>h.length===0);
    if (isLastTrick) pts[TEAM_OF[trickWinner]] += 10;

    if (isLastTrick) {
      // انتهت الجولة
      const add = calcRound({ ...round, pts, tricks, highBid:round.highBid }, scores);
      const newScores = [scores[0]+add[0], scores[1]+add[1]];
      if (newScores[0]>=WIN_SCORE || newScores[1]>=WIN_SCORE) {
        const w = newScores[0]>=WIN_SCORE ? 0 : 1;
        await updateDoc(doc(db,'biloot_rooms',roomCode),{
          scores:newScores, status:'over', winner:w,
          round:{ ...round, phase:'roundOver', pts, tricks }
        });
      } else {
        const nr = newRoundState((round.dealer+1)%4);
        await updateDoc(doc(db,'biloot_rooms',roomCode),{ scores:newScores, round:nr });
      }
      return;
    }

    await updateDoc(doc(db,'biloot_rooms',roomCode),{
      round:{ ...round, hands:newHands, trick:[], pts, tricks,
              currentTurn:trickWinner, trickStartedAt:Date.now() }
    });
  }

  function handleAutoPlay(seat, round) {
    const hand = round.hands[seat]||[];
    const card = botPickCard(hand, round.trick, round.trump);
    if (card) playCard(seat, card);
  }

  async function advanceTurn(round, seat) {
    // لا ورق قانونية — مرر (لا يحدث في بلوت عادةً لكن كضمان)
    const nextTurn = (seat+1)%4;
    await updateDoc(doc(db,'biloot_rooms',roomCode),{
      round:{ ...round, currentTurn:nextTurn }
    });
  }

  // ══════════════════════════════════════════════════════════════
  // UI helpers
  // ══════════════════════════════════════════════════════════════
  function CardView({ card, playable:isPlayable, onPress, small=false }) {
    const color = SUIT_COLOR[card.suit]||'#fff';
    const s = small ? cs.cardSmall : cs.card;
    return (
      <TouchableOpacity
        style={[s, isPlayable && cs.cardPlayable, !isPlayable && { opacity:0.6 }]}
        onPress={isPlayable ? onPress : null}
        disabled={!isPlayable}
        activeOpacity={0.75}
      >
        <Text style={[cs.cardRank, { color }]}>{card.rank}</Text>
        <Text style={[cs.cardSuit, { color }]}>{card.suit}</Text>
      </TouchableOpacity>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // رندر
  // ══════════════════════════════════════════════════════════════

  // لوبي
  if (uiPhase==='lobby') return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#06061a"/>
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}><Text style={s.backTxt}>→</Text></TouchableOpacity>
        <Text style={s.headerTitle}>🃏 بلوت</Text>
        <View style={{width:40}}/>
      </View>
      <View style={s.center}>
        <Text style={s.bigEmoji}>🃏</Text>
        <Text style={s.title}>بلوت الفريقين</Text>
        <Text style={s.sub}>الفوز بـ 152 | 4 لاعبين</Text>
        {msg?<Text style={s.err}>{msg}</Text>:null}
        <TouchableOpacity style={s.btn} onPress={handleCreate}><Text style={s.btnTxt}>إنشاء غرفة</Text></TouchableOpacity>
        <View style={s.row}>
          <TextInput style={s.codeInput} placeholder="كود الغرفة" placeholderTextColor="#3a3a60"
            value={joinCode} onChangeText={setJoinCode} autoCapitalize="characters" maxLength={6}/>
          <TouchableOpacity style={[s.btn,{flex:0,paddingHorizontal:20}]} onPress={handleJoin}>
            <Text style={s.btnTxt}>انضم</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // انتظار
  if (uiPhase==='waiting') return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#06061a"/>
      <View style={s.header}>
        <TouchableOpacity onPress={()=>{setUiPhase('lobby');setRoomCode('');}} style={s.backBtn}>
          <Text style={s.backTxt}>→</Text></TouchableOpacity>
        <Text style={s.headerTitle}>انتظار</Text>
        <View style={{width:40}}/>
      </View>
      <View style={s.center}>
        <Text style={s.title}>كود الغرفة</Text>
        <Text style={s.codeDisplay}>{roomCode}</Text>
        <Text style={s.sub}>أرسل الكود لأصدقائك</Text>
        <View style={s.seatsGrid}>
          {[0,1,2,3].map(i=>{
            const seat = roomData?.seats?.[i];
            const t = TEAM_OF[i];
            return (
              <View key={i} style={[s.seatCard, t===0?s.t0card:s.t1card]}>
                <Text style={s.seatPos}>{SEAT_LABEL[i]}</Text>
                <Text style={s.seatName}>{seat?.name||'...'}</Text>
                <Text style={t===0?s.t0txt:s.t1txt}>{t===0?'فريق 🔵':'فريق 🔴'}</Text>
              </View>
            );
          })}
        </View>
        <Text style={s.sub}>بوتات تنضم بعد {waitSec} ث</Text>
        <ActivityIndicator color="#8b5cf6" style={{marginTop:12}}/>
      </View>
    </View>
  );

  // انتهت اللعبة
  if (uiPhase==='over') {
    const wName = winner===0?'الفريق الأزرق 🔵':'الفريق الأحمر 🔴';
    return (
      <View style={s.container}>
        <View style={s.center}>
          <Text style={{fontSize:60}}>🏆</Text>
          <Text style={s.title}>فاز {wName}</Text>
          <Text style={s.sub}>{scores[0]} – {scores[1]}</Text>
          <TouchableOpacity style={s.btn} onPress={onBack}><Text style={s.btnTxt}>الخروج</Text></TouchableOpacity>
        </View>
      </View>
    );
  }

  // تحميل
  if (uiPhase!=='playing' || !roomData?.round)
    return <View style={s.container}><ActivityIndicator color="#8b5cf6" style={{marginTop:80}}/></View>;

  const round    = roomData.round;
  const myHand   = round.hands[mySeat]||[];
  const isMyBidTurn  = round.phase==='bidding' && round.bidTurn===mySeat;
  const isMyTrump    = round.phase==='choosingTrump' && round.highBid?.seat===mySeat;
  const isMyPlayTurn = round.phase==='playing' && round.currentTurn===mySeat;
  const legal        = legalCards(myHand, round.trick, round.trump);
  const legalSet     = new Set(legal.map(c=>`${c.suit}${c.rank}`));

  const curName = round.phase==='bidding'
    ? roomData.seats[round.bidTurn]?.name
    : round.phase==='choosingTrump'
      ? roomData.seats[round.highBid?.seat]?.name
      : roomData.seats[round.currentTurn]?.name;

  const timerColor = turnSec<=10 ? '#ef4444' : '#8b5cf6';

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#06061a"/>

      {/* هيدر */}
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}><Text style={s.backTxt}>→</Text></TouchableOpacity>
        <View style={{alignItems:'center'}}>
          <Text style={s.headerTitle}>🃏 بلوت</Text>
          <Text style={s.scoreBar}>🔵 {scores[0]}  –  {scores[1]} 🔴</Text>
        </View>
        <View style={{width:40}}/>
      </View>

      {/* معلومات الجولة */}
      <View style={s.roundInfo}>
        {round.trump && <Text style={s.trumpBadge}>الأتو: {round.trump} {SUIT_AR[round.trump]}</Text>}
        {round.highBid && <Text style={s.bidBadge}>المزايدة: {bidLabel(round.highBid.bid)} ({roomData.seats[round.highBid.seat]?.name})</Text>}
      </View>

      {/* شريط الوقت */}
      {(isMyBidTurn||isMyTrump||isMyPlayTurn) && (
        <View style={s.timerWrap}>
          <View style={s.timerBg}>
            <View style={[s.timerFill,{width:`${(turnSec/TURN_TIME)*100}%`,backgroundColor:timerColor}]}/>
          </View>
          <Text style={[s.timerNum,{color:timerColor}]}>{turnSec}ث</Text>
        </View>
      )}

      {/* مؤشر الدور */}
      <View style={s.turnRow}>
        {isMyBidTurn||isMyTrump||isMyPlayTurn
          ? <Text style={s.yourTurn}>⚡ دورك!</Text>
          : <Text style={s.theirTurn}>دور {curName||'...'}</Text>}
      </View>

      {/* اللمة الحالية */}
      <View style={s.trickWrap}>
        <Text style={s.trickLabel}>اللمة الحالية</Text>
        <View style={s.trickRow}>
          {round.trick.map((t,i)=>(
            <View key={i} style={{alignItems:'center',gap:3}}>
              <Text style={s.trickSeat}>{roomData.seats[t.seat]?.name}</Text>
              <CardView card={t.card} playable={false}/>
            </View>
          ))}
          {round.trick.length===0 && <Text style={s.emptyTrick}>—</Text>}
        </View>
      </View>

      {/* مرحلة المزايدة */}
      {round.phase==='bidding' && isMyBidTurn && (
        <View style={s.bidPanel}>
          <Text style={s.panelTitle}>اختر مزايدتك</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8,padding:8}}>
            <TouchableOpacity style={[s.bidBtn,s.passBtn]} onPress={()=>placeBid(mySeat,'pass')}>
              <Text style={s.passTxt}>تمرير</Text>
            </TouchableOpacity>
            {BID_OPTIONS.filter(b=>!round.highBid||bidVal(b)>bidVal(round.highBid.bid)).map(b=>(
              <TouchableOpacity key={b} style={s.bidBtn} onPress={()=>placeBid(mySeat,b)}>
                <Text style={s.bidTxt}>{bidLabel(b)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* اختيار الأتو */}
      {round.phase==='choosingTrump' && isMyTrump && (
        <View style={s.bidPanel}>
          <Text style={s.panelTitle}>اختر الأتو</Text>
          <View style={s.suitsRow}>
            {SUITS.map(suit=>(
              <TouchableOpacity key={suit} style={s.suitBtn} onPress={()=>chooseTrump(mySeat,suit)}>
                <Text style={[s.suitTxt,{color:SUIT_COLOR[suit]}]}>{suit}</Text>
                <Text style={s.suitAr}>{SUIT_AR[suit]}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* يد اللاعب */}
      <View style={s.handWrap}>
        <Text style={s.handLabel}>يدي ({myHand.length})</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.handScroll}>
          {myHand.map((card,i)=>{
            const playable = isMyPlayTurn && legalSet.has(`${card.suit}${card.rank}`);
            return (
              <CardView key={i} card={card} playable={playable}
                onPress={()=>playCard(mySeat,card)}/>
            );
          })}
        </ScrollView>
      </View>

      {/* لاعبون آخرون */}
      <View style={s.othersRow}>
        {[0,1,2,3].filter(i=>i!==mySeat).map(i=>{
          const isCur = (round.phase==='bidding'&&round.bidTurn===i)
            || (round.phase==='playing'&&round.currentTurn===i)
            || (round.phase==='choosingTrump'&&round.highBid?.seat===i);
          return (
            <View key={i} style={s.otherBox}>
              <Text style={[s.otherName, isCur&&{color:'#8b5cf6'}]}>{roomData.seats[i]?.name||'...'}</Text>
              <Text style={s.otherCards}>🃏 {round.hands[i]?.length??0}</Text>
              {isCur&&<Text style={s.activeDot}>●</Text>}
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════
// ستايلات
// ══════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  container: { flex:1, backgroundColor:'#06061a', paddingTop:56 },
  header: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:20, marginBottom:8 },
  backBtn: { width:40,height:40,borderRadius:12,backgroundColor:'#0f0f2e',borderWidth:1,borderColor:'#8b5cf640',alignItems:'center',justifyContent:'center' },
  backTxt: { color:'#8b5cf6',fontSize:20,fontWeight:'700' },
  headerTitle: { color:'#8b5cf6',fontSize:18,fontWeight:'900' },
  scoreBar: { color:'#a0a0c0',fontSize:13,marginTop:2 },

  center: { flex:1,alignItems:'center',justifyContent:'center',paddingHorizontal:24,gap:14 },
  bigEmoji: { fontSize:64 },
  title: { color:'#fff',fontSize:22,fontWeight:'900' },
  sub: { color:'#5a5a80',fontSize:13 },
  err: { color:'#ef4444',fontSize:13 },
  btn: { backgroundColor:'#8b5cf6',borderRadius:14,paddingVertical:13,paddingHorizontal:40,alignSelf:'stretch',alignItems:'center' },
  btnTxt: { color:'#fff',fontSize:15,fontWeight:'800' },
  row: { flexDirection:'row',gap:10,alignSelf:'stretch' },
  codeInput: { flex:1,backgroundColor:'#0f0f2e',borderRadius:14,borderWidth:1,borderColor:'#8b5cf640',color:'#fff',fontSize:17,paddingHorizontal:14,paddingVertical:11,textAlign:'center',letterSpacing:4 },
  codeDisplay: { color:'#8b5cf6',fontSize:38,fontWeight:'900',letterSpacing:8 },
  seatsGrid: { flexDirection:'row',flexWrap:'wrap',gap:10,justifyContent:'center' },
  seatCard: { width:140,borderRadius:14,padding:12,borderWidth:1.5,alignItems:'center',gap:4 },
  t0card: { backgroundColor:'#0a1a2e',borderColor:'#3b82f640' },
  t1card: { backgroundColor:'#2e0a0a',borderColor:'#ef444440' },
  seatPos: { color:'#5a5a80',fontSize:11 },
  seatName: { color:'#fff',fontSize:14,fontWeight:'700' },
  t0txt: { color:'#3b82f6',fontSize:12,fontWeight:'700' },
  t1txt: { color:'#ef4444',fontSize:12,fontWeight:'700' },

  roundInfo: { flexDirection:'row',gap:10,paddingHorizontal:16,marginBottom:4,flexWrap:'wrap' },
  trumpBadge: { backgroundColor:'#8b5cf620',borderRadius:8,paddingHorizontal:10,paddingVertical:4,color:'#8b5cf6',fontSize:12,fontWeight:'700' },
  bidBadge: { backgroundColor:'#06b6d420',borderRadius:8,paddingHorizontal:10,paddingVertical:4,color:'#06b6d4',fontSize:12 },

  timerWrap: { flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:16,marginBottom:4 },
  timerBg: { flex:1,height:5,backgroundColor:'#1a1a3a',borderRadius:3,overflow:'hidden' },
  timerFill: { height:5,borderRadius:3 },
  timerNum: { fontWeight:'900',fontSize:14,minWidth:28,textAlign:'right' },

  turnRow: { paddingHorizontal:16,marginBottom:6 },
  yourTurn: { color:'#8b5cf6',fontWeight:'900',fontSize:14 },
  theirTurn: { color:'#5a5a80',fontSize:13 },

  trickWrap: { backgroundColor:'#080820',borderTopWidth:1,borderBottomWidth:1,borderColor:'#8b5cf620',padding:10,minHeight:100 },
  trickLabel: { color:'#3a3a60',fontSize:11,marginBottom:6 },
  trickRow: { flexDirection:'row',gap:10,flexWrap:'wrap' },
  trickSeat: { color:'#5a5a80',fontSize:10,textAlign:'center' },
  emptyTrick: { color:'#3a3a60',fontSize:18,margin:'auto' },

  bidPanel: { backgroundColor:'#0f0f2e',borderTopWidth:1,borderColor:'#8b5cf620',padding:10 },
  panelTitle: { color:'#a78bfa',fontSize:13,fontWeight:'700',marginBottom:6 },
  bidBtn: { backgroundColor:'#1e1b4b',borderRadius:10,paddingHorizontal:16,paddingVertical:10,borderWidth:1,borderColor:'#8b5cf640' },
  bidTxt: { color:'#a78bfa',fontWeight:'700',fontSize:14 },
  passBtn: { borderColor:'#5a5a8060' },
  passTxt: { color:'#5a5a80',fontWeight:'700',fontSize:14 },
  suitsRow: { flexDirection:'row',gap:12,justifyContent:'center',marginTop:4 },
  suitBtn: { width:70,height:70,borderRadius:14,backgroundColor:'#1e1b4b',borderWidth:1.5,borderColor:'#8b5cf640',alignItems:'center',justifyContent:'center',gap:4 },
  suitTxt: { fontSize:26,fontWeight:'900' },
  suitAr: { color:'#5a5a80',fontSize:10 },

  handWrap: { paddingHorizontal:12,paddingVertical:8,borderTopWidth:1,borderColor:'#8b5cf620' },
  handLabel: { color:'#5a5a80',fontSize:11,marginBottom:6 },
  handScroll: { gap:6,alignItems:'center' },

  othersRow: { flexDirection:'row',justifyContent:'space-around',padding:10,borderTopWidth:1,borderColor:'#ffffff10' },
  otherBox: { alignItems:'center',gap:3 },
  otherName: { color:'#5a5a80',fontSize:11 },
  otherCards: { color:'#fff',fontSize:13,fontWeight:'700' },
  activeDot: { color:'#8b5cf6',fontSize:12 },
});

const cs = StyleSheet.create({
  card: { width:44,height:68,backgroundColor:'#f0ede0',borderRadius:8,borderWidth:1.5,borderColor:'#c8b89040',alignItems:'center',justifyContent:'center',gap:2 },
  cardSmall: { width:34,height:52,backgroundColor:'#f0ede0',borderRadius:6,borderWidth:1,borderColor:'#c8b89040',alignItems:'center',justifyContent:'center',gap:1 },
  cardRank: { fontSize:16,fontWeight:'900' },
  cardSuit: { fontSize:14 },
  cardPlayable: { borderColor:'#8b5cf6',borderWidth:2.5,backgroundColor:'#f0ebff' },
});
