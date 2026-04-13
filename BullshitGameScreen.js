import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, Animated, Alert, ActivityIndicator,
  ScrollView, TextInput,
} from 'react-native';
import { db, auth } from './firebaseConfig';
import {
  doc, setDoc, onSnapshot, updateDoc, deleteDoc,
  collection, query, where, getDocs, serverTimestamp,
  arrayUnion, getDoc,
} from 'firebase/firestore';

// ══════════════════════════════════════
// ثوابت
// ══════════════════════════════════════
const SUITS  = ['♠', '♥', '♦', '♣'];
const RANKS  = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
const RANK_AR = { A:'آس','2':'٢','3':'٣','4':'٤','5':'٥','6':'٦','7':'٧','8':'٨','9':'٩','10':'١٠',J:'جاك',Q:'ملكة',K:'ملك' };
const SUIT_COLOR = { '♠':'#e0e0ff','♣':'#e0e0ff','♥':'#ff6b6b','♦':'#ff6b6b' };
const MIN_PLAYERS = 3;
const MAX_PLAYERS = 6;
const COST = 10;
const TURN_SECONDS = 30;

function buildDeck() {
  const d = [];
  for (const s of SUITS) for (const r of RANKS) d.push({ suit:s, rank:r, id:`${r}${s}` });
  return d;
}
function shuffle(a) {
  const b = [...a];
  for (let i = b.length-1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1)); [b[i],b[j]]=[b[j],b[i]]; }
  return b;
}
function dealCards(n) {
  const deck = shuffle(buildDeck());
  const hands = Array.from({length:n},()=>[]);
  deck.forEach((c,i) => hands[i%n].push(c));
  return hands;
}
function genCode() { return Math.random().toString(36).slice(2,8).toUpperCase(); }
function getUid() {
  const u = auth.currentUser?.uid;
  if (u) return u;
  if (!global._gUid) global._gUid = 'guest_'+Math.random().toString(36).slice(2,10);
  return global._gUid;
}

// ══════════════════════════════════════
// شريط الوقت
// ══════════════════════════════════════
function TimerBar({ isMyTurn, turnStartedAt, seconds, onTimeout }) {
  const [remaining, setRemaining] = useState(seconds);
  const anim = useRef(new Animated.Value(1)).current;
  const animRef = useRef(null);

  useEffect(() => {
    if (!turnStartedAt) return;
    const elapsed = Math.floor((Date.now() - turnStartedAt) / 1000);
    const left = Math.max(0, seconds - elapsed);
    setRemaining(left);

    // أنيميشن شريط
    if (animRef.current) animRef.current.stop();
    anim.setValue(left / seconds);
    animRef.current = Animated.timing(anim, {
      toValue: 0,
      duration: left * 1000,
      useNativeDriver: false,
    });
    animRef.current.start();

    // عداد
    const iv = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) {
          clearInterval(iv);
          if (isMyTurn) onTimeout();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [turnStartedAt]);

  const barColor = remaining > 15 ? '#22c55e' : remaining > 8 ? '#f59e0b' : '#ef4444';

  return (
    <View style={timerStyles.wrap}>
      <View style={timerStyles.track}>
        <Animated.View style={[timerStyles.fill, {
          width: anim.interpolate({ inputRange:[0,1], outputRange:['0%','100%'] }),
          backgroundColor: barColor,
        }]} />
      </View>
      <Text style={[timerStyles.count, { color: barColor }]}>{remaining}s</Text>
    </View>
  );
}
const timerStyles = StyleSheet.create({
  wrap:  { flexDirection:'row', alignItems:'center', gap:8, paddingHorizontal:16, paddingVertical:6 },
  track: { flex:1, height:6, backgroundColor:'#1a1a3e', borderRadius:3, overflow:'hidden' },
  fill:  { height:'100%', borderRadius:3 },
  count: { fontSize:14, fontWeight:'900', minWidth:30, textAlign:'right' },
});

// ══════════════════════════════════════
// المكوّن الرئيسي
// ══════════════════════════════════════
export default function BullshitGameScreen({ onBack, currentUser, tokens, onSpendTokens }) {
  const [phase,          setPhase]          = useState('menu');
  const [roomId,         setRoomId]         = useState(null);
  const [roomData,       setRoomData]       = useState(null);
  const [myUid,          setMyUid]          = useState(null);
  const [myName,         setMyName]         = useState('');
  const [loading,        setLoading]        = useState(false);
  const [friendSearch,   setFriendSearch]   = useState('');
  const [friendResults,  setFriendResults]  = useState([]);
  const [searching,      setSearching]      = useState(false);
  const [selectedCards,  setSelectedCards]  = useState([]);
  const [desiredCount,   setDesiredCount]   = useState(4);
  const animPile = useRef(new Animated.Value(1)).current;
  const unsubRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const uid = getUid();
    setMyUid(uid);
    setMyName(currentUser?.name || auth.currentUser?.displayName || 'لاعب');
    Animated.timing(fadeAnim, { toValue:1, duration:400, useNativeDriver:true }).start();
    return () => { if (unsubRef.current) unsubRef.current(); };
  }, []);

  // ─── مراقبة الغرفة + تشغيل تلقائي ───
  function subscribeRoom(id) {
    if (unsubRef.current) unsubRef.current();
    unsubRef.current = onSnapshot(doc(db,'bullshit_rooms',id), async (snap) => {
      if (!snap.exists()) { setPhase('menu'); setRoomId(null); setRoomData(null); return; }
      const data = snap.data();
      setRoomData(data);

      if (data.phase === 'lobby') {
        setPhase('lobby');
        // الهوست يبدأ تلقائياً عند اكتمال الغرفة
        const uid = getUid();
        if (data.hostUid === uid && data.players.length >= data.maxPlayers) {
          await doStartGame(data, id);
        }
      } else if (data.phase === 'game')   setPhase('game');
      else if (data.phase === 'result')  setPhase('result');
    });
  }

  // ─── بدء اللعبة تلقائياً ───
  async function doStartGame(data, id) {
    const n = data.players.length;
    const hands = dealCards(n);
    const updatedPlayers = data.players.map((p,i) => ({
      ...p, hand: hands[i], cardCount: hands[i].length,
    }));
    await updateDoc(doc(db,'bullshit_rooms',id), {
      phase: 'game',
      players: updatedPlayers,
      pile: [],
      currentTurnUid: updatedPlayers[0].uid,
      rankIndex: 0,
      currentRank: RANKS[0],
      lastPlay: null,
      winner: null,
      turnStartedAt: Date.now(),
    });
  }

  // ─── إنشاء غرفة ───
  async function createRoom(isRandom = false) {
    if (tokens < COST) { Alert.alert('رصيد غير كافٍ',`تحتاج ${COST} رصيد`); return; }
    setLoading(true);
    try {
      const uid = getUid();
      const code = genCode();
      await setDoc(doc(collection(db,'bullshit_rooms'), code), {
        code, phase:'lobby', isRandom,
        maxPlayers: desiredCount, minPlayers: MIN_PLAYERS,
        createdAt: serverTimestamp(), hostUid: uid,
        players: [{ uid, name:myName, isHost:true, isReady:false, hand:[], cardCount:0 }],
        pile:[], currentTurnUid:null, currentRank:null, rankIndex:0,
        lastPlay:null, winner:null, turnStartedAt:null,
      });
      onSpendTokens(COST);
      setRoomId(code);
      subscribeRoom(code);
    } catch(e) { Alert.alert('خطأ',e.message); }
    setLoading(false);
  }

  // ─── انضمام بكود ───
  async function joinRoom(code) {
    if (!code) return;
    if (tokens < COST) { Alert.alert('رصيد غير كافٍ'); return; }
    setLoading(true);
    try {
      const uid = getUid();
      const roomRef = doc(db,'bullshit_rooms',code.toUpperCase());
      const snap = await getDoc(roomRef);
      if (!snap.exists()) { Alert.alert('الغرفة غير موجودة'); setLoading(false); return; }
      const data = snap.data();
      if (data.phase !== 'lobby') { Alert.alert('اللعبة بدأت بالفعل'); setLoading(false); return; }
      if (data.players.length >= data.maxPlayers) { Alert.alert('الغرفة ممتلئة'); setLoading(false); return; }
      if (!data.players.some(p => p.uid === uid)) {
        await updateDoc(roomRef, {
          players: arrayUnion({ uid, name:myName, isHost:false, isReady:false, hand:[], cardCount:0 }),
        });
      }
      onSpendTokens(COST);
      setRoomId(code.toUpperCase());
      subscribeRoom(code.toUpperCase());
    } catch(e) { Alert.alert('خطأ',e.message); }
    setLoading(false);
  }

  // ─── لعب عشوائي ───
  async function findRandomRoom() {
    if (tokens < COST) { Alert.alert('رصيد غير كافٍ'); return; }
    setLoading(true);
    try {
      const uid = getUid();
      const q = query(collection(db,'bullshit_rooms'), where('phase','==','lobby'), where('isRandom','==',true));
      const snap = await getDocs(q);
      let joined = false;
      for (const d of snap.docs) {
        const data = d.data();
        if (data.players.length < data.maxPlayers && !data.players.some(p=>p.uid===uid)) {
          await updateDoc(d.ref, {
            players: arrayUnion({ uid, name:myName, isHost:false, isReady:false, hand:[], cardCount:0 }),
          });
          onSpendTokens(COST);
          setRoomId(d.id);
          subscribeRoom(d.id);
          joined = true;
          break;
        }
      }
      if (!joined) await createRoom(true);
    } catch(e) { Alert.alert('خطأ',e.message); }
    setLoading(false);
  }

  // ─── بحث صديق ───
  async function searchFriend(text) {
    setFriendSearch(text);
    if (text.length < 2) { setFriendResults([]); return; }
    setSearching(true);
    try {
      const q = query(collection(db,'users'), where('nameLower','>=',text.toLowerCase()), where('nameLower','<=',text.toLowerCase()+'\uf8ff'));
      const snap = await getDocs(q);
      setFriendResults(snap.docs.map(d=>({uid:d.id,...d.data()})).filter(u=>u.uid!==myUid).slice(0,5));
    } catch { setFriendResults([]); }
    setSearching(false);
  }

  async function inviteFriend(friend) {
    if (!roomId||!roomData) return;
    if (roomData.players.some(p=>p.uid===friend.uid)) { Alert.alert('موجود بالفعل'); return; }
    if (roomData.players.length >= roomData.maxPlayers) { Alert.alert('الغرفة ممتلئة'); return; }
    await setDoc(doc(db,'invites',`${roomId}_${friend.uid}`), {
      roomId, fromName:myName, fromUid:myUid, toUid:friend.uid,
      code:roomId, game:'bullshit', createdAt:serverTimestamp(),
    });
    Alert.alert('✅ تم إرسال الدعوة',`دُعي ${friend.name||friend.uid}`);
  }

  // ─── إلعب ورق ───
  async function playCards() {
    if (!roomData || selectedCards.length === 0) return;
    const uid = getUid();
    if (roomData.currentTurnUid !== uid) { Alert.alert('ليس دورك!'); return; }
    const roomRef = doc(db,'bullshit_rooms',roomId);
    const me = roomData.players.find(p=>p.uid===uid);
    const played = me.hand.filter(c=>selectedCards.includes(c.id));
    const newHand = me.hand.filter(c=>!selectedCards.includes(c.id));
    const newPile = [...(roomData.pile||[]), ...played.map(c=>({...c, playedBy:uid, claimedRank:roomData.currentRank}))];
    const nextIdx = (roomData.players.findIndex(p=>p.uid===uid)+1) % roomData.players.length;
    const nextRankIdx = (roomData.rankIndex+1) % RANKS.length;
    const updatedPlayers = roomData.players.map(p=> p.uid===uid ? {...p, hand:newHand, cardCount:newHand.length} : p);
    const winner = newHand.length===0 ? uid : null;
    await updateDoc(roomRef, {
      pile: newPile,
      players: updatedPlayers,
      currentTurnUid: roomData.players[nextIdx].uid,
      rankIndex: nextRankIdx,
      currentRank: RANKS[nextRankIdx],
      lastPlay: { playerUid:uid, playerName:me.name, count:played.length, claimedRank:roomData.currentRank, cards:played },
      winner,
      phase: winner ? 'result' : 'game',
      turnStartedAt: Date.now(),
    });
    setSelectedCards([]);
    Animated.sequence([
      Animated.timing(animPile,{toValue:1.15,duration:150,useNativeDriver:true}),
      Animated.timing(animPile,{toValue:1,duration:150,useNativeDriver:true}),
    ]).start();
  }

  // ─── انتهى الوقت ───
  async function handleTimeout() {
    if (!roomData) return;
    const uid = getUid();
    if (roomData.currentTurnUid !== uid) return;
    // يضع ورقة عشوائية تلقائياً
    const me = roomData.players.find(p=>p.uid===uid);
    if (!me || me.hand.length === 0) return;
    const randomCard = me.hand[0];
    setSelectedCards([randomCard.id]);
    // تأخير قصير ثم يلعب
    setTimeout(() => playCards(), 300);
  }

  // ─── بوليشيت! ───
  async function callBullshit() {
    if (!roomData?.lastPlay) return;
    const uid = getUid();
    if (roomData.lastPlay.playerUid === uid) { Alert.alert('لا تستطيع اتهام نفسك!'); return; }
    const roomRef = doc(db,'bullshit_rooms',roomId);
    const lastPlay = roomData.lastPlay;
    const liar = lastPlay.cards.some(c=>c.rank !== lastPlay.claimedRank);
    const loserUid = liar ? lastPlay.playerUid : uid;
    const loser = roomData.players.find(p=>p.uid===loserUid);
    const newHand = [...(loser.hand||[]), ...(roomData.pile||[])];
    const updatedPlayers = roomData.players.map(p=> p.uid===loserUid ? {...p, hand:newHand, cardCount:newHand.length} : p);
    await updateDoc(roomRef, {
      pile:[], players:updatedPlayers,
      currentTurnUid: loserUid,
      lastPlay:null,
      turnStartedAt: Date.now(),
      lastBullshit: {
        callerUid:uid, callerName:roomData.players.find(p=>p.uid===uid)?.name,
        liar, loserName:loser.name, loserUid,
      },
    });
    Alert.alert(liar ? '😂 كاذب!' : '😅 غلطت!',
      liar ? `${lastPlay.playerName} كان يكذب! يأخذ كل الكومة`
           : `${roomData.players.find(p=>p.uid===uid)?.name} غلط! يأخذ كل الكومة`);
  }

  // ─── مغادرة ───
  async function leaveRoom() {
    Alert.alert('مغادرة','هل تريد مغادرة الغرفة؟',[
      { text:'إلغاء', style:'cancel' },
      { text:'مغادرة', style:'destructive', onPress: async () => {
        const uid = getUid();
        if (roomId) {
          const snap = await getDoc(doc(db,'bullshit_rooms',roomId));
          if (snap.exists()) {
            const d = snap.data();
            // استرداد الرصيد إذا لم تبدأ اللعبة بعد
            if (d.phase === 'lobby') onSpendTokens(-COST);
            if (d.hostUid===uid && d.players.length<=1) await deleteDoc(doc(db,'bullshit_rooms',roomId));
            else await updateDoc(doc(db,'bullshit_rooms',roomId), { players: d.players.filter(p=>p.uid!==uid) });
          }
        }
        if (unsubRef.current) unsubRef.current();
        setRoomId(null); setRoomData(null); setPhase('menu');
      }},
    ]);
  }

  // ─── حسابات ───
  const myPlayer = roomData?.players?.find(p=>p.uid===myUid);
  const isHost   = roomData?.hostUid === myUid;
  const isMyTurn = roomData?.currentTurnUid === myUid;

  // ─── الشاشات ───
  if (loading) return (
    <View style={s.center}>
      <ActivityIndicator size="large" color="#ef4444" />
      <Text style={s.loadingText}>جاري الاتصال...</Text>
    </View>
  );

  if (phase==='result') return (
    <ResultScreen roomData={roomData} myUid={myUid}
      onBack={()=>{leaveRoom(); onBack();}} onPlayAgain={leaveRoom} />
  );

  if (phase==='game') return (
    <GameScreen
      roomData={roomData} myUid={myUid} myPlayer={myPlayer}
      isMyTurn={isMyTurn} selectedCards={selectedCards} setSelectedCards={setSelectedCards}
      currentRank={roomData?.currentRank} turnStartedAt={roomData?.turnStartedAt}
      onPlay={playCards} onBullshit={callBullshit} onLeave={leaveRoom}
      onTimeout={handleTimeout} animPile={animPile}
      roomId={roomId} myName={myName}
      messages={roomData?.messages || []}
    />
  );

  if (phase==='lobby') return (
    <LobbyScreen
      roomData={roomData} roomId={roomId} myUid={myUid} isHost={isHost}
      friendSearch={friendSearch} friendResults={friendResults} searching={searching}
      onSearch={searchFriend} onInvite={inviteFriend} onLeave={leaveRoom}
      desiredCount={desiredCount}
    />
  );

  return (
    <MenuScreen
      fadeAnim={fadeAnim} desiredCount={desiredCount} setDesiredCount={setDesiredCount}
      onCreatePrivate={()=>createRoom(false)} onCreateRandom={findRandomRoom}
      onJoin={joinRoom} onBack={onBack} tokens={tokens} cost={COST}
    />
  );
}

// ══════════════════════════════════════
// شاشة القائمة
// ══════════════════════════════════════
function MenuScreen({ fadeAnim, desiredCount, setDesiredCount, onCreatePrivate, onCreateRandom, onJoin, onBack, tokens, cost }) {
  const [joinCode, setJoinCode] = useState('');
  const [showJoin, setShowJoin] = useState(false);
  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#06061a" />
      <Animated.View style={[s.header,{opacity:fadeAnim}]}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}><Text style={s.backText}>→</Text></TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerEmoji}>🃏</Text>
          <Text style={s.headerTitle}>بوليشيت</Text>
        </View>
        <View style={s.tokenBadge}><Text style={s.tokenText}>🪙 {tokens}</Text></View>
      </Animated.View>

      <ScrollView contentContainerStyle={s.menuScroll} showsVerticalScrollIndicator={false}>
        <Animated.View style={[s.infoBox,{opacity:fadeAnim}]}>
          <Text style={s.infoTitle}>📖 كيفية اللعب</Text>
          <Text style={s.infoText}>{'• يضع كل لاعب ورقة أو أكثر ويدّعي أنها الرتبة المطلوبة\n• قل "بوليشيت!" إذا شككت في الكذب\n• الكاذب يأخذ كل الكومة — والمشكك الخاطئ أيضاً!\n• لكل دور 30 ثانية فقط ⏱\n• أول من ينهي ورقه يفوز 🏆'}</Text>
          <View style={s.infoMeta}>
            <Text style={s.infoMetaText}>👤 {MIN_PLAYERS}–{MAX_PLAYERS}</Text>
            <Text style={s.infoMetaText}>🪙 {cost} رصيد</Text>
            <Text style={s.infoMetaText}>⏱ 30 ث/دور</Text>
          </View>
        </Animated.View>

        <Animated.View style={[s.section,{opacity:fadeAnim}]}>
          <Text style={s.sectionTitle}>عدد اللاعبين</Text>
          <View style={s.countRow}>
            {[3,4,5,6].map(n=>(
              <TouchableOpacity key={n} style={[s.countBtn, desiredCount===n && s.countBtnActive]} onPress={()=>setDesiredCount(n)}>
                <Text style={[s.countBtnText, desiredCount===n && s.countBtnTextActive]}>{n}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        <Animated.View style={[s.btnGroup,{opacity:fadeAnim}]}>
          <TouchableOpacity style={s.btnPrimary} onPress={onCreatePrivate}>
            <Text style={s.btnIcon}>🔒</Text>
            <View>
              <Text style={s.btnPrimaryText}>إنشاء غرفة خاصة</Text>
              <Text style={s.btnSub}>تبدأ تلقائياً عند اكتمال اللاعبين</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={s.btnSecondary} onPress={onCreateRandom}>
            <Text style={s.btnIcon}>🌍</Text>
            <View>
              <Text style={s.btnSecondaryText}>لعب عشوائي</Text>
              <Text style={s.btnSub}>انضم أو ابدأ غرفة عشوائية</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={s.btnOutline} onPress={()=>setShowJoin(v=>!v)}>
            <Text style={s.btnOutlineText}>🔑 انضم بكود</Text>
          </TouchableOpacity>

          {showJoin && (
            <View style={s.joinBox}>
              <TextInput style={s.joinInput} placeholder="كود الغرفة" placeholderTextColor="#555577"
                value={joinCode} onChangeText={t=>setJoinCode(t.toUpperCase())} maxLength={6} autoCapitalize="characters" />
              <TouchableOpacity style={s.joinBtn} onPress={()=>onJoin(joinCode)}>
                <Text style={s.joinBtnText}>انضم</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ══════════════════════════════════════
// شاشة اللوبي
// ══════════════════════════════════════
function LobbyScreen({ roomData, roomId, myUid, isHost, friendSearch, friendResults, searching, onSearch, onInvite, onLeave, desiredCount }) {
  const players   = roomData?.players || [];
  const maxPlayers = roomData?.maxPlayers || desiredCount;
  const filled    = players.length;
  const pct       = filled / maxPlayers;

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#06061a" />
      <View style={s.header}>
        <TouchableOpacity onPress={onLeave} style={s.backBtn}><Text style={s.backText}>→</Text></TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerEmoji}>🃏</Text>
          <Text style={s.headerTitle}>انتظار اللاعبين</Text>
        </View>
        <View style={{width:40}}/>
      </View>

      <ScrollView contentContainerStyle={{padding:20,gap:16}} showsVerticalScrollIndicator={false}>
        {/* كود الغرفة */}
        <View style={s.codeBig}>
          <Text style={s.codeLabel}>كود الغرفة</Text>
          <Text style={s.codeValue}>{roomId}</Text>
          <Text style={s.codeHint}>شارك الكود — تبدأ اللعبة تلقائياً عند الاكتمال</Text>
        </View>

        {/* شريط تقدم الغرفة */}
        <View style={s.roomProgress}>
          <View style={s.roomProgressTrack}>
            <View style={[s.roomProgressFill,{width:`${pct*100}%`}]} />
          </View>
          <Text style={s.roomProgressText}>{filled}/{maxPlayers} لاعبين</Text>
        </View>

        {/* اللاعبون */}
        <View style={s.lobbySection}>
          <Text style={s.lobbySTitle}>اللاعبون</Text>
          {Array.from({length:maxPlayers}).map((_,i)=>{
            const p = players[i];
            return (
              <View key={i} style={[s.playerSlot, p && s.playerSlotFilled]}>
                {p ? (
                  <>
                    <Text style={s.playerSlotEmoji}>{p.isHost ? '👑' : '🎮'}</Text>
                    <Text style={s.playerSlotName}>{p.name||p.uid}</Text>
                    {p.uid===myUid && <Text style={s.meTag}>أنت</Text>}
                  </>
                ) : (
                  <Text style={s.emptySlot}>⏳ ينتظر...</Text>
                )}
              </View>
            );
          })}
        </View>

        {/* دعوة صديق */}
        {isHost && filled < maxPlayers && (
          <View style={s.lobbySection}>
            <Text style={s.lobbySTitle}>دعوة صديق</Text>
            <TextInput style={s.joinInput} placeholder="ابحث عن اسم صديق..." placeholderTextColor="#555577"
              value={friendSearch} onChangeText={onSearch} />
            {searching && <ActivityIndicator color="#ef4444" style={{marginTop:8}}/>}
            {friendResults.map(f=>(
              <TouchableOpacity key={f.uid} style={s.friendResult} onPress={()=>onInvite(f)}>
                <Text style={s.friendResultName}>{f.name||f.uid}</Text>
                <Text style={s.friendResultInvite}>دعوة ✉️</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* رسالة انتظار */}
        <View style={s.waitingBox}>
          <ActivityIndicator color="#ef4444"/>
          <Text style={s.waitingText}>
            {filled >= maxPlayers ? '🚀 تبدأ اللعبة الآن...' : `انتظار ${maxPlayers - filled} لاعبين إضافيين`}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ══════════════════════════════════════
// مكوّن الجات
// ══════════════════════════════════════
function ChatOverlay({ messages, myUid, myName, roomId, onClose }) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  async function sendMessage() {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      await updateDoc(doc(db, 'bullshit_rooms', roomId), {
        messages: arrayUnion({
          uid: myUid,
          name: myName,
          text: trimmed,
          time: Date.now(),
        }),
      });
      setText('');
    } catch (e) { Alert.alert('خطأ', e.message); }
    setSending(false);
  }

  return (
    <View style={chat.overlay}>
      {/* هيدر الجات */}
      <View style={chat.header}>
        <TouchableOpacity onPress={onClose} style={chat.closeBtn}>
          <Text style={chat.closeText}>✕</Text>
        </TouchableOpacity>
        <Text style={chat.headerTitle}>💬 جات الغرفة</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* الرسائل */}
      <ScrollView
        ref={scrollRef}
        style={chat.msgList}
        contentContainerStyle={chat.msgListContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.length === 0 && (
          <Text style={chat.emptyText}>لا رسائل بعد — قل شيئاً! 👋</Text>
        )}
        {messages.map((m, i) => {
          const isMe = m.uid === myUid;
          return (
            <View key={i} style={[chat.msgRow, isMe && chat.msgRowMe]}>
              {!isMe && <Text style={chat.msgName}>{m.name}</Text>}
              <View style={[chat.bubble, isMe ? chat.bubbleMe : chat.bubbleOther]}>
                <Text style={[chat.bubbleText, isMe && chat.bubbleTextMe]}>{m.text}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* حقل الإدخال */}
      <View style={chat.inputRow}>
        <TextInput
          style={chat.input}
          placeholder="اكتب رسالة..."
          placeholderTextColor="#555577"
          value={text}
          onChangeText={setText}
          maxLength={120}
          textAlign="right"
          onSubmitEditing={sendMessage}
          returnKeyType="send"
        />
        <TouchableOpacity
          style={[chat.sendBtn, (!text.trim() || sending) && chat.sendBtnDisabled]}
          onPress={sendMessage}
          disabled={!text.trim() || sending}
        >
          <Text style={chat.sendIcon}>➤</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
const chat = StyleSheet.create({
  overlay:      { position:'absolute', top:0, left:0, right:0, bottom:0, backgroundColor:'#06061af5', zIndex:100, flexDirection:'column' },
  header:       { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingTop:52, paddingBottom:12, borderBottomWidth:1, borderBottomColor:'#1a1a3e' },
  headerTitle:  { color:'#ef4444', fontSize:17, fontWeight:'900' },
  closeBtn:     { width:36, height:36, borderRadius:10, backgroundColor:'#1a1a3e', alignItems:'center', justifyContent:'center' },
  closeText:    { color:'#ef4444', fontSize:16, fontWeight:'900' },
  msgList:      { flex:1 },
  msgListContent:{ padding:16, gap:10 },
  emptyText:    { color:'#555577', fontSize:14, textAlign:'center', marginTop:40 },
  msgRow:       { alignItems:'flex-start', gap:2 },
  msgRowMe:     { alignItems:'flex-end' },
  msgName:      { color:'#a09060', fontSize:11, fontWeight:'700', paddingHorizontal:4 },
  bubble:       { maxWidth:'78%', borderRadius:14, paddingHorizontal:14, paddingVertical:8 },
  bubbleOther:  { backgroundColor:'#1a1a3e', borderBottomLeftRadius:4 },
  bubbleMe:     { backgroundColor:'#ef4444', borderBottomRightRadius:4 },
  bubbleText:   { color:'#e0e0ff', fontSize:14, lineHeight:20 },
  bubbleTextMe: { color:'#fff' },
  inputRow:     { flexDirection:'row', gap:10, padding:12, borderTopWidth:1, borderTopColor:'#1a1a3e', alignItems:'center' },
  input:        { flex:1, backgroundColor:'#1a1a3e', color:'#fff', borderRadius:12, paddingHorizontal:14, paddingVertical:11, fontSize:14, borderWidth:1, borderColor:'#2a2a55' },
  sendBtn:      { width:44, height:44, borderRadius:12, backgroundColor:'#ef4444', alignItems:'center', justifyContent:'center' },
  sendBtnDisabled:{ opacity:0.4 },
  sendIcon:     { color:'#fff', fontSize:18, fontWeight:'900' },
});

// ══════════════════════════════════════
// شاشة اللعبة
// ══════════════════════════════════════
function GameScreen({ roomData, myUid, myPlayer, isMyTurn, selectedCards, setSelectedCards, currentRank, turnStartedAt, onPlay, onBullshit, onLeave, onTimeout, animPile, roomId, myName, messages }) {
  const pile     = roomData?.pile || [];
  const lastPlay = roomData?.lastPlay;
  const players  = roomData?.players || [];
  const myHand   = myPlayer?.hand || [];
  const [chatOpen, setChatOpen] = useState(false);
  const [lastSeenCount, setLastSeenCount] = useState(0);
  const unread = chatOpen ? 0 : Math.max(0, messages.length - lastSeenCount);

  function toggleCard(id) {
    if (!isMyTurn) return;
    setSelectedCards(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev,id]);
  }

  function openChat() { setLastSeenCount(messages.length); setChatOpen(true); }

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#06061a"/>

      {/* هيدر */}
      <View style={s.gameHeader}>
        <TouchableOpacity onPress={onLeave} style={s.backBtn}><Text style={s.backText}>→</Text></TouchableOpacity>
        <Text style={s.gameTitle}>🃏 بوليشيت</Text>
        <View style={s.rankBadge}>
          <Text style={s.rankBadgeText}>{RANK_AR[currentRank]||currentRank}</Text>
        </View>
      </View>

      {/* شريط الوقت */}
      <TimerBar
        isMyTurn={isMyTurn}
        turnStartedAt={turnStartedAt}
        seconds={TURN_SECONDS}
        onTimeout={onTimeout}
      />

      {/* اسم اللاعب الحالي */}
      {roomData?.currentTurnUid && (
        <View style={s.currentTurnBanner}>
          {isMyTurn
            ? <Text style={s.currentTurnMe}>✨ دورك — العب {RANK_AR[currentRank]||currentRank}</Text>
            : <Text style={s.currentTurnOther}>
                دور {players.find(p=>p.uid===roomData.currentTurnUid)?.name||'اللاعب'}
              </Text>
          }
        </View>
      )}

      {/* اللاعبون الآخرون */}
      <View style={s.othersRow}>
        {players.filter(p=>p.uid!==myUid).map(p=>(
          <View key={p.uid} style={[s.otherPlayer, roomData.currentTurnUid===p.uid && s.otherPlayerActive]}>
            <Text style={s.otherEmoji}>{roomData.currentTurnUid===p.uid ? '⭐' : '👤'}</Text>
            <Text style={s.otherName}>{p.name?.split(' ')[0]||'لاعب'}</Text>
            <Text style={s.otherCards}>🃏 {p.cardCount}</Text>
          </View>
        ))}
      </View>

      {/* الكومة */}
      <View style={s.pileArea}>
        <Animated.View style={[s.pileBox,{transform:[{scale:animPile}]}]}>
          <Text style={s.pileEmoji}>🎴</Text>
          <Text style={s.pileCount}>{pile.length} ورقة</Text>
        </Animated.View>

        {lastPlay && (
          <View style={s.lastPlayBox}>
            <Text style={s.lastPlayText}>
              {lastPlay.playerName} ← {lastPlay.count} × {RANK_AR[lastPlay.claimedRank]||lastPlay.claimedRank}
            </Text>
          </View>
        )}

        {lastPlay && lastPlay.playerUid !== myUid && (
          <TouchableOpacity style={s.bullshitBtn} onPress={onBullshit}>
            <Text style={s.bullshitBtnText}>💥 بوليشيت!</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ورق اللاعب */}
      <View style={s.handArea}>
        <Text style={s.handTitle}>ورقك ({myHand.length})</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.handScroll}>
          {myHand.map(card=>(
            <TouchableOpacity key={card.id}
              style={[s.card, selectedCards.includes(card.id) && s.cardSelected]}
              onPress={()=>toggleCard(card.id)} activeOpacity={isMyTurn?0.7:1}>
              <Text style={[s.cardRank,{color:SUIT_COLOR[card.suit]}]}>{card.rank}</Text>
              <Text style={[s.cardSuit,{color:SUIT_COLOR[card.suit]}]}>{card.suit}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* زر اللعب */}
      {isMyTurn && (
        <TouchableOpacity
          style={[s.playBtn, selectedCards.length===0 && {opacity:0.4}]}
          onPress={()=>selectedCards.length>0 && onPlay()}
          disabled={selectedCards.length===0}>
          <Text style={s.playBtnText}>
            🃏 العب {selectedCards.length>0?`${selectedCards.length} × `:''}{RANK_AR[currentRank]||currentRank}
          </Text>
        </TouchableOpacity>
      )}

      {/* زر الجات العائم */}
      <TouchableOpacity style={s.chatFab} onPress={openChat} activeOpacity={0.85}>
        <Text style={s.chatFabIcon}>💬</Text>
        {unread > 0 && (
          <View style={s.chatBadge}>
            <Text style={s.chatBadgeText}>{unread > 9 ? '9+' : unread}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* overlay الجات */}
      {chatOpen && (
        <ChatOverlay
          messages={messages}
          myUid={myUid}
          myName={myName}
          roomId={roomId}
          onClose={() => { setLastSeenCount(messages.length); setChatOpen(false); }}
        />
      )}
    </View>
  );
}

// ══════════════════════════════════════
// شاشة النتيجة
// ══════════════════════════════════════
function ResultScreen({ roomData, myUid, onBack, onPlayAgain }) {
  const winner   = roomData?.players?.find(p=>p.uid===roomData?.winner);
  const isWinner = roomData?.winner === myUid;
  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#06061a"/>
      <View style={s.resultContent}>
        <Text style={s.resultEmoji}>{isWinner?'🏆':'😅'}</Text>
        <Text style={s.resultTitle}>{isWinner?'فزت!':'انتهت اللعبة'}</Text>
        {winner && <Text style={s.resultWinner}>الفائز: {winner.name}</Text>}
        <View style={s.finalPlayers}>
          {(roomData?.players||[]).sort((a,b)=>a.cardCount-b.cardCount).map((p,i)=>(
            <View key={p.uid} style={[s.finalPlayer, p.uid===roomData?.winner && s.finalPlayerWinner]}>
              <Text style={s.finalRank}>{i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}.`}</Text>
              <Text style={s.finalName}>{p.name}</Text>
              <Text style={s.finalCards}>{p.cardCount} ورقة</Text>
            </View>
          ))}
        </View>
        <TouchableOpacity style={s.btnPrimary} onPress={onPlayAgain}>
          <Text style={s.btnIcon}>🔄</Text>
          <Text style={s.btnPrimaryText}>العب مجدداً</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.btnOutline} onPress={onBack}>
          <Text style={s.btnOutlineText}>🏠 الرئيسية</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ══════════════════════════════════════
// الأنماط
// ══════════════════════════════════════
const s = StyleSheet.create({
  container:   { flex:1, backgroundColor:'#06061a' },
  center:      { flex:1, backgroundColor:'#06061a', alignItems:'center', justifyContent:'center', gap:16 },
  loadingText: { color:'#ef4444', fontSize:16 },

  header: { flexDirection:'row', alignItems:'center', justifyContent:'space-between',
            paddingHorizontal:16, paddingTop:52, paddingBottom:12,
            backgroundColor:'#0a0a20', borderBottomWidth:1, borderBottomColor:'#1a1a3e' },
  headerCenter: { flexDirection:'row', alignItems:'center', gap:8 },
  headerEmoji:  { fontSize:24 },
  headerTitle:  { fontSize:20, fontWeight:'900', color:'#ef4444' },
  backBtn:      { padding:8 },
  backText:     { color:'#ef4444', fontSize:18, fontWeight:'700' },
  tokenBadge:   { backgroundColor:'#ef444420', paddingHorizontal:10, paddingVertical:5, borderRadius:12, borderWidth:1, borderColor:'#ef444440' },
  tokenText:    { color:'#ef4444', fontWeight:'800', fontSize:14 },

  menuScroll: { padding:20, gap:20 },
  infoBox:    { backgroundColor:'#1a1a3e', borderRadius:16, padding:18, borderWidth:1, borderColor:'#ef444430', gap:10 },
  infoTitle:  { color:'#ef4444', fontSize:16, fontWeight:'800' },
  infoText:   { color:'#c0c0e0', fontSize:14, lineHeight:22, textAlign:'right' },
  infoMeta:   { flexDirection:'row', gap:12 },
  infoMetaText:{ color:'#a09060', fontSize:13 },

  section:          { gap:10 },
  sectionTitle:     { color:'#ef4444', fontSize:15, fontWeight:'800', textAlign:'right' },
  countRow:         { flexDirection:'row', gap:10 },
  countBtn:         { flex:1, backgroundColor:'#1a1a3e', borderRadius:12, paddingVertical:14, alignItems:'center', borderWidth:1.5, borderColor:'#2a2a55' },
  countBtnActive:   { backgroundColor:'#ef444422', borderColor:'#ef4444' },
  countBtnText:     { color:'#a0a0c0', fontSize:18, fontWeight:'700' },
  countBtnTextActive:{ color:'#ef4444' },

  btnGroup:       { gap:12 },
  btnPrimary:     { backgroundColor:'#ef4444', borderRadius:16, paddingVertical:16, paddingHorizontal:20, flexDirection:'row', alignItems:'center', gap:14 },
  btnIcon:        { fontSize:24 },
  btnPrimaryText: { color:'#fff', fontSize:17, fontWeight:'800' },
  btnSub:         { color:'#ffcccc', fontSize:12, marginTop:2 },
  btnSecondary:   { backgroundColor:'#1a1a3e', borderRadius:16, paddingVertical:16, paddingHorizontal:20, flexDirection:'row', alignItems:'center', gap:14, borderWidth:1.5, borderColor:'#ef444440' },
  btnSecondaryText:{ color:'#ef4444', fontSize:17, fontWeight:'800' },
  btnOutline:     { borderRadius:16, paddingVertical:14, alignItems:'center', borderWidth:1.5, borderColor:'#ef444440' },
  btnOutlineText: { color:'#ef4444', fontSize:16, fontWeight:'700' },
  joinBox:        { flexDirection:'row', gap:10, alignItems:'center' },
  joinInput:      { flex:1, backgroundColor:'#1a1a3e', color:'#fff', borderRadius:12, paddingHorizontal:14, paddingVertical:12, borderWidth:1.5, borderColor:'#2a2a55', fontSize:15, textAlign:'center', letterSpacing:4 },
  joinBtn:        { backgroundColor:'#ef4444', borderRadius:12, paddingHorizontal:18, paddingVertical:13 },
  joinBtnText:    { color:'#fff', fontWeight:'800', fontSize:15 },

  codeBig:     { backgroundColor:'#1a1a3e', borderRadius:20, padding:24, alignItems:'center', gap:6, borderWidth:1.5, borderColor:'#ef444440' },
  codeLabel:   { color:'#a09060', fontSize:13 },
  codeValue:   { color:'#ef4444', fontSize:42, fontWeight:'900', letterSpacing:8 },
  codeHint:    { color:'#555577', fontSize:12, textAlign:'center' },

  roomProgress:      { gap:6 },
  roomProgressTrack: { height:8, backgroundColor:'#1a1a3e', borderRadius:4, overflow:'hidden' },
  roomProgressFill:  { height:'100%', backgroundColor:'#ef4444', borderRadius:4 },
  roomProgressText:  { color:'#a09060', fontSize:13, textAlign:'right' },

  lobbySection:  { gap:8 },
  lobbySTitle:   { color:'#ef4444', fontSize:15, fontWeight:'800', textAlign:'right' },
  playerSlot:    { backgroundColor:'#0f0f2e', borderRadius:14, padding:14, flexDirection:'row', alignItems:'center', gap:12, borderWidth:1, borderColor:'#1a1a40' },
  playerSlotFilled:{ borderColor:'#ef444440' },
  playerSlotEmoji: { fontSize:22 },
  playerSlotName:  { flex:1, color:'#e0e0ff', fontSize:15, fontWeight:'700', textAlign:'right' },
  meTag:         { color:'#ef4444', fontSize:11, fontWeight:'800', backgroundColor:'#ef444420', paddingHorizontal:8, paddingVertical:3, borderRadius:8 },
  emptySlot:     { color:'#333355', fontSize:14, flex:1, textAlign:'center' },
  friendResult:  { backgroundColor:'#0f0f2e', borderRadius:12, padding:12, flexDirection:'row', alignItems:'center', borderWidth:1, borderColor:'#1a1a40' },
  friendResultName:   { flex:1, color:'#e0e0ff', fontSize:14, fontWeight:'700', textAlign:'right' },
  friendResultInvite: { color:'#ef4444', fontSize:13, fontWeight:'700' },
  waitingBox:    { flexDirection:'row', alignItems:'center', gap:12, justifyContent:'center', padding:16 },
  waitingText:   { color:'#a09060', fontSize:14 },

  gameHeader: { flexDirection:'row', alignItems:'center', justifyContent:'space-between',
                paddingHorizontal:16, paddingTop:52, paddingBottom:12,
                backgroundColor:'#0a0a20', borderBottomWidth:1, borderBottomColor:'#1a1a3e' },
  gameTitle:  { color:'#ef4444', fontSize:18, fontWeight:'900' },
  rankBadge:  { backgroundColor:'#f5c51820', paddingHorizontal:12, paddingVertical:6, borderRadius:12, borderWidth:1, borderColor:'#f5c51850' },
  rankBadgeText:{ color:'#f5c518', fontWeight:'900', fontSize:15 },

  currentTurnBanner: { backgroundColor:'#1a1a3e', paddingVertical:8, paddingHorizontal:16, borderBottomWidth:1, borderBottomColor:'#2a2a55' },
  currentTurnMe:    { color:'#f5c518', fontSize:14, fontWeight:'800', textAlign:'center' },
  currentTurnOther: { color:'#a09060', fontSize:13, textAlign:'center' },

  othersRow:       { flexDirection:'row', flexWrap:'wrap', gap:8, padding:10, justifyContent:'center' },
  otherPlayer:     { backgroundColor:'#1a1a3e', borderRadius:12, padding:8, alignItems:'center', gap:3, minWidth:65, borderWidth:1.5, borderColor:'#2a2a55' },
  otherPlayerActive:{ borderColor:'#ef4444', backgroundColor:'#ef444415' },
  otherEmoji:      { fontSize:20 },
  otherName:       { color:'#e0e0ff', fontSize:11, fontWeight:'700' },
  otherCards:      { color:'#a09060', fontSize:11 },

  pileArea:    { flex:1, alignItems:'center', justifyContent:'center', gap:10, padding:12 },
  pileBox:     { backgroundColor:'#1a1a3e', borderRadius:20, padding:24, alignItems:'center', gap:6, borderWidth:2, borderColor:'#ef444440' },
  pileEmoji:   { fontSize:48 },
  pileCount:   { color:'#ef4444', fontSize:16, fontWeight:'700' },
  lastPlayBox: { backgroundColor:'#0f0f2e', borderRadius:12, padding:10, borderWidth:1, borderColor:'#ef444430' },
  lastPlayText:{ color:'#e0e0ff', fontSize:14, fontWeight:'700', textAlign:'center' },
  bullshitBtn: { backgroundColor:'#ef4444', borderRadius:16, paddingVertical:12, paddingHorizontal:24 },
  bullshitBtnText:{ color:'#fff', fontSize:18, fontWeight:'900' },

  handArea:   { backgroundColor:'#0a0a20', borderTopWidth:1, borderTopColor:'#1a1a3e', padding:10, gap:6 },
  handTitle:  { color:'#f5c518', fontSize:13, fontWeight:'700', textAlign:'right' },
  handScroll: { gap:6, paddingHorizontal:4, paddingBottom:4 },
  card:        { backgroundColor:'#1a1a3e', borderRadius:10, padding:8, alignItems:'center', minWidth:48, borderWidth:2, borderColor:'#2a2a55', gap:1 },
  cardSelected:{ borderColor:'#ef4444', backgroundColor:'#ef444422', transform:[{translateY:-10}] },
  cardRank:    { fontSize:16, fontWeight:'900' },
  cardSuit:    { fontSize:14 },
  playBtn:     { backgroundColor:'#ef4444', margin:10, borderRadius:16, paddingVertical:14, alignItems:'center' },
  playBtnText: { color:'#fff', fontSize:16, fontWeight:'900' },

  chatFab: {
    position:'absolute', bottom:80, right:16,
    width:52, height:52, borderRadius:26,
    backgroundColor:'#ef4444', alignItems:'center', justifyContent:'center',
    shadowColor:'#ef4444', shadowOpacity:0.5, shadowRadius:8, shadowOffset:{width:0,height:4},
    elevation:8,
  },
  chatFabIcon:  { fontSize:24 },
  chatBadge:    { position:'absolute', top:-4, right:-4, backgroundColor:'#f5c518', borderRadius:10, minWidth:20, height:20, alignItems:'center', justifyContent:'center', paddingHorizontal:4 },
  chatBadgeText:{ color:'#06061a', fontSize:11, fontWeight:'900' },

  resultContent:      { flex:1, alignItems:'center', justifyContent:'center', padding:24, gap:16 },
  resultEmoji:        { fontSize:80 },
  resultTitle:        { color:'#ef4444', fontSize:36, fontWeight:'900' },
  resultWinner:       { color:'#f5c518', fontSize:20, fontWeight:'700' },
  finalPlayers:       { width:'100%', gap:8 },
  finalPlayer:        { backgroundColor:'#1a1a3e', borderRadius:14, padding:14, flexDirection:'row', alignItems:'center', gap:12, borderWidth:1.5, borderColor:'#2a2a55' },
  finalPlayerWinner:  { borderColor:'#f5c518', backgroundColor:'#f5c51815' },
  finalRank:          { fontSize:22 },
  finalName:          { flex:1, color:'#e0e0ff', fontSize:15, fontWeight:'700', textAlign:'right' },
  finalCards:         { color:'#a09060', fontSize:12 },
});
