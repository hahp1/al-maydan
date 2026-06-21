/**
 * CodenamesGameScreen.js
 * ══════════════════════════════════════════════════════════════
 * لعبة Codenames — 4 لاعبين، فريقان، جاسوسَان
 *
 * مراحل:
 *   lobby     → انتظار 4 لاعبين + اختيار الجواسيس
 *   playing   → اللعب الفعلي
 *   finished  → الفائز
 *
 * هيكل Firestore (rooms/{roomId}):
 *   players: { [uid]: { name, team:'red'|'blue', role:'spy'|'op', joinedAt } }
 *   board: [ { word, owner:'red'|'blue'|'neutral'|'black', imgIdx } ]
 *   revealed: [ index, ... ]
 *   clues: [ { team, word, count, round } ]
 *   currentClue: { word, count } | null
 *   turn: 'red'|'blue'
 *   phase: 'spy'|'op'
 *   guessesLeft: number
 *   redLeft / blueLeft: number
 *   status: 'lobby'|'playing'|'finished'
 *   winner: 'red'|'blue'|null
 *   spyRed / spyBlue: uid
 * ══════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  StatusBar, ScrollView, TextInput, Animated, Modal, ImageBackground, Image,
  useWindowDimensions, Dimensions } from 'react-native';
import { db } from './firebaseConfig';
import {
  doc, setDoc, updateDoc, onSnapshot, getDoc,
  collection, query, where, getDocs, limit,
} from 'firebase/firestore';
import { useTheme } from './ThemeContext';
import ExitButton from './ExitButton';
import { useLanguage } from './I18n';
import { CodenamesEngraving } from './GameEngraving';
import { WebScreenButton, GameInfoButton } from './WebRoomService';
import { ThemedButton, ThemedCard, ThemedPill, ThemedRow } from './ThemedComponents';
import OnlineRoomSetup, { OnlineWaitingLobby } from './OnlineRoomSetup';

// ─── صور البطاقات ──────────────────────────────────────────────
// 4 صور لكل لون: 0-3 أزرق، 4-7 أحمر، 8-11 بيج/محايد
const CARD_IMAGES = {
  blue:    [
    require('./assets/codenames/card_00.webp'),
    require('./assets/codenames/card_04.webp'),
    require('./assets/codenames/card_08.webp'),
    require('./assets/codenames/card_11.webp'),
  ],
  red:     [
    require('./assets/codenames/card_01.webp'),
    require('./assets/codenames/card_05.webp'),
    require('./assets/codenames/card_06.webp'),
    require('./assets/codenames/card_10.webp'),
  ],
  neutral: [
    require('./assets/codenames/card_02.webp'),
    require('./assets/codenames/card_03.webp'),
    require('./assets/codenames/card_07.webp'),
    require('./assets/codenames/card_09.webp'),
  ],
};

// اختيار عشوائي لرقم الصورة (يُحفظ في board عند الإنشاء)
function randomImgIdx() { return Math.floor(Math.random() * 4); }

// ─── قائمة الكلمات العربية ─────────────────────────────────────
const WORD_POOL_EN = [
  // Nature
  'Mountain','River','Sea','Desert','Forest','Island','Volcano','Cave','Waterfall','Oasis',
  'Plain','Hill','Summit','Bay','Lake','Swamp','Coral','Reef','Snow','Fire',
  'Water','Wind','Dust','Sand','Rock','Lightning','Thunder','Cloud','Fog','Storm',
  // Animals
  'Lion','Tiger','Elephant','Giraffe','Horse','Wolf','Fox','Rabbit','Monkey','Bear',
  'Bird','Eagle','Penguin','Dolphin','Whale','Fish','Crocodile','Snake','Scorpion','Bee',
  'Butterfly','Parrot','Dove','Falcon','Camel','Cheetah','Deer','Sheep','Rooster','Owl',
  // Professions
  'Doctor','Lawyer','Engineer','Teacher','Pilot','Chef','Artist','Writer','Actor','Singer',
  'Athlete','Soldier','Officer','Judge','Pharmacist','Mechanic','Carpenter','Blacksmith','Builder','Farmer',
  'Fisher','Painter','Photographer','Musician','Director','Astronaut','Diver','Translator','Activist','Driver',
  // Cities & Countries
  'Mecca','Baghdad','Cairo','Dubai','Riyadh','Beirut','Amman','Damascus','Kuwait','Muscat',
  'London','Paris','Tokyo','New York','Rome','Berlin','Madrid','Moscow','Beijing','Sydney',
  // Buildings & Places
  'Palace','Tower','Church','Mosque','Temple','Prison','Hospital','School','University','Stadium',
  'Theater','Museum','Library','Market','Airport','Harbor','Station','Hotel','Restaurant','Nightclub',
  // Transport
  'Car','Train','Airplane','Ship','Bicycle','Subway','Taxi','Yacht','Rocket','Helicopter',
  // Tech & Tools
  'Phone','Screen','Camera','Telescope','Microscope','Computer','Robot','Key','Lock','Sword',
  'Shield','Bow','Cannon','Radar','Satellite','Radio','Printer','Lens','Wave','Atom',
  // Food & Things
  'Coffee','Tea','Bread','Date','Pomegranate','Olive','Honey','Milk','Mushroom','Spice',
  // Emotions & Concepts
  'Love','Fear','Hope','Dream','Peace','War','Justice','Secret','Betrayal','Loyalty',
  'Generosity','Courage','Patience','Anger','Joy','Sadness','Loneliness','Trust','Lie','Truth',
  // Household & General
  'Mirror','Clock','Book','Pen','Paper','Painting','Song','Dance','Game','Film',
  'Story','Letter','Door','Window','Ladder','Lamp','Table','Chair','Bed','Tent',
  // Space & Science
  'Star','Moon','Sun','Planet','Galaxy','Black Hole','Meteor','Space','Gravity','Light',
];

const WORD_POOL = [
  // طبيعة
  'جبل','نهر','بحر','صحراء','غابة','جزيرة','بركان','كهف','شلال','واحة',
  'سهل','تل','قمة','خليج','بحيرة','مستنقع','مرجان','شعاب','ثلج','نار',
  'ماء','هواء','تراب','رمل','صخرة','برق','رعد','سحاب','ضباب','عاصفة',
  // حيوانات
  'أسد','نمر','فيل','زرافة','حصان','ذئب','ثعلب','أرنب','قرد','دب',
  'طائر','نسر','بطريق','دلفين','حوت','سمكة','تمساح','ثعبان','عقرب','نحلة',
  'فراشة','ببغاء','حمامة','صقر','جمل','فهد','غزال','خروف','ديك','بومة',
  // مهن ووظائف
  'طبيب','محامي','مهندس','معلم','طيار','شيف','فنان','كاتب','ممثل','مغني',
  'رياضي','جندي','شرطي','قاضي','صيدلاني','ميكانيكي','نجار','حداد','بنّاء','مزارع',
  'صياد','رسام','مصوّر','موسيقار','مخرج','رائد فضاء','غواص','مترجم','ناشط','سائق',
  // بلدان ومدن
  'مكة','بغداد','القاهرة','دبي','الرياض','بيروت','عمّان','دمشق','الكويت','مسقط',
  'لندن','باريس','طوكيو','نيويورك','روما','برلين','مدريد','موسكو','بكين','سيدني',
  // مبانٍ وأماكن
  'قصر','برج','كنيسة','مسجد','معبد','سجن','مستشفى','مدرسة','جامعة','ملعب',
  'مسرح','متحف','مكتبة','سوق','مطار','ميناء','محطة','فندق','مطعم','ملهى',
  // وسائل نقل
  'سيارة','قطار','طيارة','سفينة','دراجة','مترو','تاكسي','يخت','صاروخ','مروحية',
  // تقنية وأدوات
  'هاتف','شاشة','كاميرا','تلسكوب','مجهر','حاسوب','روبوت','مفتاح','قفل','سيف',
  'درع','قوس','مدفع','رادار','قمر صناعي','لاسلكي','طابعة','عدسة','موجة','ذرة',
  // طعام وأشياء
  'قهوة','شاي','خبز','تمر','رمّان','زيتون','عسل','لبن','فطر','بهار',
  // مشاعر ومفاهيم
  'حب','خوف','أمل','حلم','سلام','حرب','عدل','سر','خيانة','وفاء',
  'كرم','شجاعة','صبر','غضب','فرح','حزن','وحدة','ثقة','كذب','صدق',
  // أشياء عامة
  'مرآة','ساعة','كتاب','قلم','ورقة','لوحة','أغنية','رقصة','لعبة','فيلم',
  'قصة','رسالة','باب','نافذة','سلّم','مصباح','طاولة','كرسي','سرير','خيمة',
  // فضاء وعلوم
  'نجمة','قمر','شمس','كوكب','مجرة','ثقب أسود','نيزك','فضاء','جاذبية','ضوء',
];

// ─── توليد اللوحة ──────────────────────────────────────────────
function generateBoard(lang = 'ar') {
  const activePool = lang === 'en' ? WORD_POOL_EN : WORD_POOL;
  const shuffled = [...activePool].sort(() => Math.random() - 0.5).slice(0, 25);
  const owners = [
    ...Array(9).fill('red'),
    ...Array(8).fill('blue'),
    ...Array(7).fill('neutral'),
    'black',
  ].sort(() => Math.random() - 0.5);
  return shuffled.map((word, i) => ({
    word,
    owner: owners[i],
    imgIdx: randomImgIdx(),
  }));
}

// ─── ثوابت اللون ───────────────────────────────────────────────
const TEAM_COLOR = { red: '#E05252', blue: '#4A90D9' };
const TEAM_DARK  = { red: '#5a1010', blue: '#0b2a55' };
const TEAM_AR    = { red: 'الأحمر', blue: 'الأزرق' };

// ألوان خلفية البطاقة المكشوفة (بدون صورة = black)
const REV_BG = {
  red:     '#8B1A1A',
  blue:    '#0D3D7A',
  neutral: '#4a3d28',
  black:   '#0f0f0f',
};

const COLS     = 5;
const H_PAD    = 16;
const GAP      = 5;
const CARD_W   = (Dimensions.get('window').width - H_PAD * 2 - GAP * (COLS - 1)) / COLS;
const CARD_H   = CARD_W * 0.65; // نسبة أبعاد 16:9 تقريباً على شبكة صغيرة

// ════════════════════════════════════════════════════════════════
export default function CodenamesGameScreen({ onBack, currentUser, onGameEnd, onGameReady }) {
  const { width: W, height: H } = useWindowDimensions();
  const cc = useMemo(() => makeStyles(W, H), [W, H]);
  const { theme, themeId } = useTheme();
  const { lang } = useLanguage();

  const myUid  = currentUser?.uid  || `guest_${Math.random().toString(36).slice(2, 8)}`;
  const myName = currentUser?.name || 'لاعب';

  const [roomId,     setRoomId]     = useState(null);
  const [roomData,   setRoomData]   = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);
  const [clueInput,  setClueInput]  = useState('');
  const [clueCount,  setClueCount]  = useState(2);
  const [pendingIdx, setPendingIdx] = useState(null);
  const [collapsed,  setCollapsed]  = useState(new Set());

  // ── اختيار الوضع ──
  const [selectedMode,  setSelectedMode]  = useState(null);
  const [joinCodeInput, setJoinCodeInput] = useState(null);
  const [friendCode,    setFriendCode]    = useState(null);
  const isRTL = lang === 'ar';

  const unsubRef = useRef(null);

  const handleModeSelect = (mode, code = null) => {
    setJoinCodeInput(code);
    setSelectedMode(mode);
  };

  useEffect(() => {
    if (!selectedMode) return;
    if (selectedMode === 'random') initRoom(null);
    if (selectedMode === 'create') initRoom('create');
    if (selectedMode === 'join')   initRoom('join', joinCodeInput);
    return () => unsubRef.current?.();
  }, [selectedMode, joinCodeInput]);

  // ─── إنشاء / الانضمام (يدعم عشوائي + صديق) ──────────────────
  const initRoom = async (mode, joinCode = null) => {
    try {
      setLoading(true);
      setError(null);

      // وضع الانضمام بكود
      if (mode === 'join') {
        const normalCode = (joinCode || '').trim().toUpperCase();
        if (normalCode.length < 4) { setError('كود غير صحيح'); setLoading(false); return; }
        const snap = await getDocs(query(collection(db, 'rooms'), where('friendCode','==',normalCode), where('gameType','==','codenames'), where('status','==','lobby')));
        if (snap.empty) { setError('لم يتم العثور على الغرفة'); setLoading(false); return; }
        const rData = snap.docs[0].data();
        const rId   = snap.docs[0].id;
        const players = rData.players || {};
        const uids = Object.keys(players);
        if (uids.length >= 4) { setError('الغرفة ممتلئة'); setLoading(false); return; }
        await updateDoc(doc(db, 'rooms', rId), {
          [`players.${myUid}`]: { name: myName, team: uids.length < 2 ? 'red' : 'blue', role: 'op', joinedAt: Date.now() },
        });
        setRoomId(rId);
        listenToRoom(rId);
        setLoading(false);
        return;
      }

      // وضع إنشاء بكود صديق
      if (mode === 'create') {
        const code  = Math.random().toString(36).substring(2, 8).toUpperCase();
        const rId   = `codenames_fr_${code}`;
        const board = generateBoard(lang);
        await setDoc(doc(db, 'rooms', rId), {
          gameType: 'codenames', friendCode: code, mode: 'friend',
          status: 'lobby',
          players: { [myUid]: { name: myName, team: 'red', role: 'op', joinedAt: Date.now() } },
          board, revealed: [], clues: [], currentClue: null,
          turn: 'red', phase: 'spy', guessesLeft: 0,
          redLeft: board.filter(c => c.owner === 'red').length,
          blueLeft: board.filter(c => c.owner === 'blue').length,
          spyRed: null, spyBlue: null, winner: null,
          createdAt: Date.now(), lastUpdate: Date.now(),
        });
        setFriendCode(code);
        setRoomId(rId);
        listenToRoom(rId);
        setLoading(false);
        return;
      }

      // وضع عشوائي — الغرفة المفتوحة
      const roomRef = doc(db, 'rooms', 'codenames_lobby_open');
      const snap    = await getDoc(roomRef);

      if (snap.exists()) {
        const data = snap.data(); const players = data.players || {}; const uids = Object.keys(players);
        if (uids.includes(myUid)) { setRoomId('codenames_lobby_open'); listenToRoom('codenames_lobby_open'); setLoading(false); return; }
        if (uids.length < 4 && data.status === 'lobby') {
          await updateDoc(roomRef, {
            [`players.${myUid}`]: { name: myName, team: uids.length < 2 ? 'red' : 'blue', role: 'op', joinedAt: Date.now() },
          });
          setRoomId('codenames_lobby_open'); listenToRoom('codenames_lobby_open'); setLoading(false); return;
        }
      }
      const board = generateBoard(lang);
      await setDoc(roomRef, {
        gameType: 'codenames', mode: 'random', status: 'lobby',
        players: { [myUid]: { name: myName, team: 'red', role: 'op', joinedAt: Date.now() } },
        board, revealed: [], clues: [], currentClue: null,
        turn: 'red', phase: 'spy', guessesLeft: 0,
        redLeft: board.filter(c => c.owner === 'red').length,
        blueLeft: board.filter(c => c.owner === 'blue').length,
        spyRed: null, spyBlue: null, winner: null,
        createdAt: Date.now(), lastUpdate: Date.now(),
      });
      setRoomId('codenames_lobby_open'); listenToRoom('codenames_lobby_open'); setLoading(false);
    } catch (e) { setError(e.message); setLoading(false); }
  };

  const listenToRoom = (rId) => {
    unsubRef.current = onSnapshot(
      doc(db, 'rooms', rId),
      (snap) => { if (snap.exists()) setRoomData(snap.data()); },
      (e)    => setError(e.message),
    );
  };

  const updateRoom = (updates) =>
    updateDoc(doc(db, 'rooms', roomId), { ...updates, lastUpdate: Date.now() });

  // ── شاشة اختيار الوضع ──
  if (!selectedMode) {
    return (
      <OnlineRoomSetup
        gameEmoji="🔐"
        gameTitleAr="كودنيمز"
        gameTitleEn="Codenames"
        descAr="فريقان — 4 لاعبين — الجاسوس يعطي الإشارة"
        descEn="2 teams — 4 players — the spy gives clues"
        onBack={onBack}
        onSelect={handleModeSelect}
      />
    );
  }

  if (selectedMode === 'create' && loading) {
    return (
      <OnlineWaitingLobby
        friendCode={friendCode}
        isFriend={true}
        isRTL={isRTL}
        theme={theme}
        gameEmoji="🔐"
        gameLabel="كلمات السر"
        currentUser={currentUser}
        onCancel={onBack}
      />
    );
  }

  // ─── حراسة ─────────────────────────────────────────────────
  if (!roomId || !roomData) {
    if (loading) return <LoadingScreen theme={theme} />;
    if (error)   return <ErrorScreen   theme={theme} error={error} onBack={onBack} />;
    return <LoadingScreen theme={theme} />;
  }

  const {
    players = {}, board = [], revealed = [], clues = [],
    currentClue = null, turn = 'red', phase = 'spy',
    guessesLeft = 0, redLeft = 9, blueLeft = 8,
    spyRed = null, spyBlue = null, winner = null, status = 'lobby',
  } = roomData;

  const myPlayer       = players[myUid];
  const myTeam         = myPlayer?.team || 'red';
  const myRole         = myPlayer?.role || 'op';
  const iAmSpymaster   = myRole === 'spy';
  const playerList     = Object.entries(players);
  const redTeam        = playerList.filter(([, p]) => p.team === 'red');
  const blueTeam       = playerList.filter(([, p]) => p.team === 'blue');
  const revealedSet    = new Set(revealed);

  const isMyTurn     = turn === myTeam;
  const isMySpyTurn  = isMyTurn && phase === 'spy' && iAmSpymaster;
  const isMyOpTurn   = isMyTurn && phase === 'op'  && !iAmSpymaster;

  // ─── Lobby: اختيار جاسوس ──────────────────────────────────
  const becomeSpymaster = async (team) => {
    const field = team === 'red' ? 'spyRed' : 'spyBlue';
    await updateRoom({
      [field]: myUid,
      [`players.${myUid}`]: { ...myPlayer, role: 'spy' },
    });
  };

  const switchTeam = async () => {
    const newTeam = myTeam === 'red' ? 'blue' : 'red';
    await updateRoom({ [`players.${myUid}`]: { ...myPlayer, team: newTeam, role: 'op' } });
  };

  const canStart = playerList.length === 4 && spyRed && spyBlue;
  const startGame = async () => { if (canStart) { await updateRoom({ status: 'playing' }); onGameReady?.(); } };

  // ─── إرسال تلميح ──────────────────────────────────────────
  const sendClue = async () => {
    if (!clueInput.trim()) return;
    const clue = { team: myTeam, word: clueInput.trim().toUpperCase(), count: clueCount, round: clues.length };
    await updateRoom({
      currentClue: clue,
      clues: [...clues, clue],
      phase: 'op',
      guessesLeft: clueCount + 1,
    });
    setClueInput('');
    setClueCount(2);
  };

  // ─── لمس بطاقة (pending) ──────────────────────────────────
  const touchCard = (index) => {
    if (revealedSet.has(index)) return;
    if (iAmSpymaster) return;
    if (turn !== myTeam) return;
    if (phase !== 'op') return;
    // لمسة ثانية على نفس البطاقة = إلغاء
    if (pendingIdx === index) { setPendingIdx(null); return; }
    setPendingIdx(index);
  };

  // ─── تأكيد الاختيار ───────────────────────────────────────
  const confirmCard = async () => {
    if (pendingIdx === null) return;
    const idx  = pendingIdx;
    setPendingIdx(null);
    const card = board[idx];
    const newRevealed = [...revealed, idx];
    let updates = { revealed: newRevealed };

    if (card.owner === 'black') {
      updates.winner = turn === 'red' ? 'blue' : 'red';
      updates.status = 'finished';
    } else if (card.owner === turn) {
      const remaining = (turn === 'red' ? redLeft : blueLeft) - 1;
      updates[turn === 'red' ? 'redLeft' : 'blueLeft'] = remaining;
      updates.guessesLeft = guessesLeft - 1;
      if (remaining === 0) {
        updates.winner = turn;
        updates.status = 'finished';
      } else if (guessesLeft - 1 === 0) {
        Object.assign(updates, switchTurn(turn));
      }
    } else {
      if (card.owner !== 'neutral') {
        const other   = turn === 'red' ? 'blue' : 'red';
        const otherRem = (other === 'red' ? redLeft : blueLeft) - 1;
        updates[other === 'red' ? 'redLeft' : 'blueLeft'] = otherRem;
        if (otherRem === 0) { updates.winner = other; updates.status = 'finished'; }
      }
      Object.assign(updates, switchTurn(turn));
    }
    await updateRoom(updates);
  };

  const switchTurn = (cur) => ({
    turn: cur === 'red' ? 'blue' : 'red',
    phase: 'spy',
    currentClue: null,
    guessesLeft: 0,
  });

  const endTurn = async () => { await updateRoom(switchTurn(turn)); setPendingIdx(null); };

  // ─── toggle الصورة (صغيرة ↔ كبيرة) على البطاقة المكشوفة ──
  const toggleCollapse = (index) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index); else next.add(index);
      return next;
    });
  };

  // ════════════════════════════════════════════════════════════
  //  LOBBY
  // ════════════════════════════════════════════════════════════
  if (status === 'lobby') {
    return (
      <View style={[s.container, { backgroundColor: 'transparent' }]}>
        <CodenamesEngraving theme={theme} />
        <StatusBar barStyle={theme.statusBar} />

        <View style={s.topBar}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <ExitButton onPress={onBack} />
            <GameInfoButton gameType="codenames" lang={lang} />
            <WebScreenButton
              playerUid={myUid}
              playerName={myName}
              gameType="codenames"
              gameRoomId={roomId || ''}
              getPublicData={() => ({ status, players: Object.keys(players || {}).length })}
              themeName={themeId || 'dark'}
            />
          </View>
          <Text style={[s.title, { color: theme.accent }]}>الاسم الرمزي</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
          <View style={[s.waitBanner, { backgroundColor: theme.bgCard }]}>
            <Text style={[s.waitText, { color: theme.textPrimary }]}>
              {playerList.length < 4
                ? `⏳ في انتظار اللاعبين... (${playerList.length}/4)`
                : !spyRed || !spyBlue
                ? '🕵️ يجب أن يختار كل فريق جاسوسه'
                : '✅ جاهز للبدء!'}
            </Text>
          </View>

          <View style={s.teamsRow}>
            {(['red', 'blue']).map(team => {
              const members   = team === 'red' ? redTeam : blueTeam;
              const spyUid    = team === 'red' ? spyRed : spyBlue;
              const spyName   = spyUid ? (players[spyUid]?.name || '') : null;
              const canBeSpy  = myTeam === team && !iAmSpymaster && !spyUid;
              const tc        = TEAM_COLOR[team];

              return (
                <View key={team} style={[s.teamCard, { borderColor: tc }]}>
                  <View style={[s.teamHeader, { backgroundColor: tc }]}>
                    <Text style={s.teamHeaderText}>فريق {TEAM_AR[team]}</Text>
                  </View>
                  <View style={s.teamBody}>
                    {members.map(([uid, p]) => (
                      <Text key={uid} style={[s.memberName, { color: theme.textPrimary }]}>
                        {uid === myUid ? '▶ ' : '  '}{p.name}
                        {uid === spyUid ? ' 🕵️' : ''}
                      </Text>
                    ))}
                    {members.length === 0 && (
                      <Text style={{ color: theme.textSecondary, fontSize: 12 }}>لا أحد بعد</Text>
                    )}
                    <View style={[s.spyRow]}>
                      <Text style={{ color: theme.textSecondary, fontSize: 12 }}>الجاسوس: </Text>
                      <Text style={{ color: tc, fontWeight: 'bold', fontSize: 13 }}>{spyName || '—'}</Text>
                    </View>
                    {canBeSpy && (
                      <ThemedButton onPress={() => becomeSpymaster(team)} label='🕵️ كن الجاسوس' variant='primary' size='small' style={s.spyBtn} />
                    )}
                  </View>
                </View>
              );
            })}
          </View>

          {!iAmSpymaster && (
            <ThemedButton onPress={switchTeam} label={`⇄ انتقل إلى فريق ${TEAM_AR[myTeam === 'red' ? 'blue' : 'red']}`} variant='secondary' size='medium' style={s.switchBtn} />
          )}

          {canStart && (
            <ThemedButton onPress={startGame} label='▶ ابدأ اللعبة' variant='primary' size='large' style={s.startBtn} />
          )}
        </ScrollView>
      </View>
    );
  }

  // ════════════════════════════════════════════════════════════
  //  FINISHED
  // ════════════════════════════════════════════════════════════
  if (status === 'finished') {
    const iWon = winner === myTeam;
    if (onGameEnd) onGameEnd(iWon);
    return (
      <View style={[s.container, { backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' }]}>
        <CodenamesEngraving theme={theme} />
        <StatusBar barStyle={theme.statusBar} />
        <Text style={{ fontSize: 72 }}>{winner === 'red' ? '🔴' : '🔵'}</Text>
        <Text style={[s.winnerText, { color: TEAM_COLOR[winner] }]}>فاز فريق {TEAM_AR[winner]}!</Text>
        <ThemedButton onPress={onBack} label='الخروج' variant='primary' size='large' style={[s.startBtn, { marginTop: 32 }]} />
      </View>
    );
  }

  // ════════════════════════════════════════════════════════════
  //  PLAYING
  // ════════════════════════════════════════════════════════════
  const pendingWord = pendingIdx !== null ? board[pendingIdx]?.word : null;

  return (
    <View style={[s.container, { backgroundColor: 'transparent' }]}>
      <CodenamesEngraving theme={theme} />
      <StatusBar barStyle={theme.statusBar} />

      {/* ══ الشريط العلوي ══ */}
      <View style={s.topBar}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <ExitButton onPress={onBack} />
          <GameInfoButton gameType="codenames" lang={lang} />
          <WebScreenButton
            playerUid={myUid}
            playerName={myName}
            gameType="codenames"
            gameRoomId={roomId || ''}
            getPublicData={() => ({ turn, phase, redLeft, blueLeft })}
            themeName={themeId || 'dark'}
          />
        </View>

        {/* عداد الفريقين */}
        <View style={s.countersRow}>
          <View style={[s.counter, { backgroundColor: TEAM_DARK.red + 'cc',
                        borderWidth: turn==='red' ? 2 : 0, borderColor: TEAM_COLOR.red }]}>
            <Text style={[s.counterNum, { color: TEAM_COLOR.red }]}>{redLeft}</Text>
          </View>
          <Text style={{ color: theme.textSecondary, fontSize: 10, marginHorizontal: 4 }}>vs</Text>
          <View style={[s.counter, { backgroundColor: TEAM_DARK.blue + 'cc',
                        borderWidth: turn==='blue' ? 2 : 0, borderColor: TEAM_COLOR.blue }]}>
            <Text style={[s.counterNum, { color: TEAM_COLOR.blue }]}>{blueLeft}</Text>
          </View>
        </View>

        <View style={{ width: 36 }} />
      </View>

      {/* ══ سجل التلميحات — أفقي قابل للتمرير ══ */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.cluesScroll}
        contentContainerStyle={{ gap: 7, paddingHorizontal: 12, alignItems: 'center' }}
      >
        {clues.map((c, i) => (
          <View key={i} style={[s.cluePill, { backgroundColor: TEAM_COLOR[c.team] + '22', borderColor: TEAM_COLOR[c.team] }]}>
            {/* نقطة لون الفريق */}
            <View style={[s.clueTeamDot, { backgroundColor: TEAM_COLOR[c.team] }]} />
            <Text style={[s.clueWord, { color: TEAM_COLOR[c.team] }]}>{c.word}</Text>
            {/* دائرة العدد بلون الفريق */}
            <View style={[s.clueCountCircle, { backgroundColor: TEAM_COLOR[c.team] }]}>
              <Text style={s.clueCountNum}>{c.count}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* ══ اللوحة ══ */}
      <View style={s.board}>
        {board.map((card, index) => (
          <CodeCard cc={cc}             key={index}
            index={index}
            card={card}
            isRevealed={revealedSet.has(index)}
            isPending={pendingIdx === index}
            isCollapsed={collapsed.has(index)}
            iAmSpymaster={iAmSpymaster}
            canPress={!revealedSet.has(index) && isMyOpTurn}
            onPress={() => touchCard(index)}
            onPressRevealed={() => toggleCollapse(index)}
          />
        ))}
      </View>

      {/* ══ شريط التأكيد (pending) ══ */}
      {pendingIdx !== null && isMyOpTurn && (
        <View style={[s.confirmBar, { backgroundColor: theme.bgCard, borderColor: TEAM_COLOR[myTeam] + '66' }]}>
          <Text style={{ color: theme.textSecondary, fontSize: 12 }}>هل تختار</Text>
          <Text style={[s.confirmWord, { color: TEAM_COLOR[myTeam] }]}>{pendingWord}</Text>
          <Text style={{ color: theme.textSecondary, fontSize: 12 }}>؟</Text>
          <ThemedButton onPress={confirmCard} label='✔ تأكيد' variant='primary' size='small' style={s.confirmYes} />
          <ThemedButton onPress={() => setPendingIdx(null)} label='✕' variant='ghost' size='small' style={s.confirmNo} />
        </View>
      )}

      {/* ══ شريط الإجراء ══ */}
      <View style={[s.actionBar, { backgroundColor: theme.bgCard }]}>

        {/* جاسوس يكتب تلميحه */}
        {isMySpyTurn && (
          <View style={s.spyInputRow}>
            <TextInput
              style={[s.clueField, { color: theme.textPrimary, borderColor: TEAM_COLOR[myTeam] }]}
              placeholder="كلمتك المفتاحية..."
              placeholderTextColor={theme.textSecondary}
              value={clueInput}
              onChangeText={setClueInput}
              autoCorrect={false}
            />
            <ThemedCard onPress={() => setClueCount(Math.max(1, clueCount - 1))} style={s.countBtn}>
              <Text style={{ color: theme.textPrimary, fontSize: 16 }}>−</Text>
            </ThemedCard>
            <Text style={[s.countNum, { color: TEAM_COLOR[myTeam] }]}>{clueCount}</Text>
            <ThemedCard onPress={() => setClueCount(Math.min(9, clueCount + 1))} style={s.countBtn}>
              <Text style={{ color: theme.textPrimary, fontSize: 16 }}>+</Text>
            </ThemedCard>
            <ThemedButton onPress={sendClue} label='إرسال' variant='primary' size='small' style={s.sendBtn} />
          </View>
        )}

        {/* أوبيراتيف: التلميح الحالي + إنهاء الدور */}
        {isMyOpTurn && currentClue && pendingIdx === null && (
          <View style={s.opRow}>
            <View style={[s.currentCluePill, { borderColor: TEAM_COLOR[turn] }]}>
              <Text style={[s.currentClueWord, { color: TEAM_COLOR[turn] }]}>{currentClue.word}</Text>
              <View style={[s.clueCountCircle, { backgroundColor: TEAM_COLOR[turn] }]}>
                <Text style={s.clueCountNum}>{currentClue.count}</Text>
              </View>
            </View>
            <Text style={[s.guessLeft, { color: theme.textSecondary }]}>محاولات: {guessesLeft}</Text>
            <ThemedButton onPress={endTurn} label='إنهاء الدور' variant='ghost' size='small' style={s.endTurnBtn} />
          </View>
        )}

        {/* انتظار دور الآخر */}
        {!isMyTurn && (
          <Text style={[s.waitingText, { color: theme.textSecondary }]}>
            {phase === 'spy'
              ? `⏳ جاسوس فريق ${TEAM_AR[turn]} يكتب تلميحه...`
              : `⏳ فريق ${TEAM_AR[turn]} يختار...`}
          </Text>
        )}

        {/* جاسوس ينتظر فريقه */}
        {isMyTurn && iAmSpymaster && phase === 'op' && (
          <Text style={[s.waitingText, { color: TEAM_COLOR[myTeam] }]}>🕵️ فريقك يختار... انتظر</Text>
        )}
      </View>
    </View>
  );
}

// ════════════════════════════════════════════════════════════════
//  CodeCard — بطاقة واحدة
// ════════════════════════════════════════════════════════════════
function CodeCard({
  cc, index, card, isRevealed, isPending, isCollapsed,
  iAmSpymaster, canPress, onPress, onPressRevealed,
}) {
  const { word, owner, imgIdx } = card;

  // اختيار الصورة المناسبة
  const imgSource = isRevealed && owner !== 'black'
    ? CARD_IMAGES[owner]?.[imgIdx] ?? null
    : null;

  // خلفية البطاقة
  const cardBg = isRevealed
    ? REV_BG[owner] || REV_BG.neutral
    : iAmSpymaster
      ? SPY_BG[owner] || '#1e2340'
      : '#1e2340';

  // عند الضغط
  const handlePress = () => {
    if (isRevealed) { onPressRevealed(); return; }
    if (canPress)   { onPress(); }
  };

  return (
    <ThemedCard
      onPress={handlePress}
      style={[
        cc.card,
        { backgroundColor: cardBg, width: CARD_W, height: CARD_H },
        isPending && cc.pending,
        isRevealed && cc.revealed,
      ]}
    >
      {/* ── صورة الغطاء (بطاقة مكشوفة + مالك ≠ black) ── */}
      {isRevealed && imgSource && (
        <Image
          source={imgSource}
          style={[
            cc.coverImg,
            isCollapsed ? cc.imgSmall : cc.imgFull,
          ]}
          resizeMode="cover"
        />
      )}

      {/* ── الكلمة ── */}
      <Text
        style={[
          cc.word,
          isRevealed && { color: '#fff', opacity: isCollapsed ? 1 : 0 },
          !isRevealed && { color: theme.textMuted },
        ]}
        numberOfLines={1}
      >
        {word}
      </Text>

      {/* ── علامة الجاسوس (غير مكشوفة) ── */}
      {iAmSpymaster && !isRevealed && (
        <View style={cc.spyDot}>
          <View style={[cc.spyDotInner, { backgroundColor: SPY_DOT_COLOR[owner] }]} />
        </View>
      )}

      {/* ── علامة ✓ عند pending ── */}
      {isPending && (
        <View style={cc.pendingTick}>
          <Text style={{ color: '#111', fontSize: 9, fontWeight: '900' }}>✓</Text>
        </View>
      )}
    </ThemedCard>
  );
}

// ألوان الجاسوس (خلفية خفيفة للبطاقة غير المكشوفة)
const SPY_BG = {
  red:     '#3a0e0e',
  blue:    '#0b1f40',
  neutral: '#2a2318',
  black:   '#111',
};
const SPY_DOT_COLOR = {
  red:     '#E05252',
  blue:    '#4A90D9',
  neutral: '#9E8E75',
  black:   '#555',
};

function makeStyles(W, H) { return StyleSheet.create({
  card: {
    borderRadius: 8,
    margin: GAP / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    elevation: 2,
  },
  pending: {
    borderWidth: 2,
    borderColor: '#F0C040',
    shadowColor: '#F0C040',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 6,
    elevation: 6,
  },
  revealed: {
    borderColor: 'rgba(255,255,255,0.18)',
  },
  // صورة الغطاء — تغطي البطاقة كاملاً
  coverImg: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 7,
  },
  imgFull: {
    opacity: 1,
    transform: [{ scale: 1 }],
  },
  // عند التصغير: الصورة تصغر لأعلى-يسار والكلمة تظهر
  imgSmall: {
    opacity: 0.35,
    top: 2, left: 2,
    right: undefined, bottom: undefined,
    width: CARD_W * 0.38,
    height: CARD_H * 0.42,
    borderRadius: 4,
  },
  word: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: 3,
    letterSpacing: 0.3,
    zIndex: 2,
  },
  spyDot: {
    position: 'absolute',
    top: 3, right: 4,
    zIndex: 3,
  },
  spyDotInner: {
    width: 8, height: 8, borderRadius: 4,
    opacity: 0.85,
  },
  pendingTick: {
    position: 'absolute',
    top: 3, right: 3,
    width: 15, height: 15,
    borderRadius: 8,
    backgroundColor: '#F0C040',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
});

// ─── شاشتا التحميل والخطأ ─────────────────────────────────────
function LoadingScreen({ theme }) {
  return (
    <View style={[s.container, { backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' }]}>
      <ActivityIndicator size="large" color={theme.accent} />
    </View>
  );
}
function ErrorScreen({ theme, error, onBack }) {
  return (
    <View style={[s.container, { backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' }]}>
      <Text style={{ color: theme.error, marginBottom: 16 }}>❌ {error}</Text>
      <ThemedButton onPress={onBack} label='رجوع' variant='ghost' size='medium' style={s.startBtn} />
    </View>
  );
}

// ─── الأنماط ───────────────────────────────────────────────────
const s = StyleSheet.create({
  container:   { flex: 1, paddingTop: 48 },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },

  topBar:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, marginBottom: 4 },
  backBtn:     { width: 36, alignItems: 'center' },
  title:       { fontSize: 20, fontWeight: 'bold' },

  countersRow: { flexDirection: 'row', alignItems: 'center' },
  counter:     { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  counterNum:  { fontSize: 18, fontWeight: 'bold' },

  // ── سجل التلميحات ──
  cluesScroll: { maxHeight: 42, marginBottom: 5 },
  cluePill:    {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1.5,
  },
  clueTeamDot:   { width: 7, height: 7, borderRadius: 3.5 },
  clueWord:      { fontWeight: 'bold', fontSize: 13 },
  clueCountCircle: {
    width: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  clueCountNum:  { color: '#fff', fontSize: 11, fontWeight: 'bold' },

  // ── اللوحة ──
  board: {
    flexDirection: 'row', flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: H_PAD - GAP / 2,
    flex: 1, alignContent: 'center',
  },

  // ── شريط التأكيد ──
  confirmBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 8,
    borderTopWidth: 1,
    borderLeftWidth: 0, borderRightWidth: 0, borderBottomWidth: 0,
  },
  confirmWord:  { fontSize: 16, fontWeight: 'bold' },
  confirmYes:   { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 10 },
  confirmNo:    { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1 },

  // ── شريط الإجراء ──
  actionBar:    { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },

  spyInputRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  clueField:    {
    flex: 1, borderWidth: 1.5, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 6,
    fontSize: 14, textAlign: 'right',
  },
  countBtn:     {
    width: 30, height: 30, borderRadius: 15,
    borderWidth: 1, borderColor: '#555',
    alignItems: 'center', justifyContent: 'center',
  },
  countNum:     { fontSize: 18, fontWeight: 'bold', minWidth: 22, textAlign: 'center' },
  sendBtn:      { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10 },

  opRow:        { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  currentCluePill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 2,
  },
  currentClueWord: { fontWeight: 'bold', fontSize: 16 },
  guessLeft:    { fontSize: 12 },
  endTurnBtn:   { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1.5 },
  waitingText:  { textAlign: 'center', fontSize: 13, paddingVertical: 6 },

  // ── Lobby ──
  waitBanner:   { margin: 16, padding: 16, borderRadius: 14, alignItems: 'center' },
  waitText:     { fontSize: 15, textAlign: 'center' },
  teamsRow:     { flexDirection: 'row', gap: 12, marginHorizontal: 16 },
  teamCard:     { flex: 1, borderRadius: 14, borderWidth: 2, overflow: 'hidden' },
  teamHeader:   { padding: 10, alignItems: 'center' },
  teamHeaderText:{ color: '#fff', fontWeight: 'bold', fontSize: 14 },
  teamBody:     { padding: 12, gap: 5 },
  memberName:   { fontSize: 13, fontWeight: '600' },
  spyRow:       { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  spyBtn:       { marginTop: 8, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  spyBtnText:   { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  switchBtn:    { margin: 16, padding: 12, borderRadius: 12, borderWidth: 1.5, alignItems: 'center' },
  startBtn:     { margin: 16, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  startBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  winnerText:   { fontSize: 28, fontWeight: 'bold', marginTop: 12 },
});
}
