/**
 * DrawGuessGameScreen.js — رسم وتخمين 🎨
 * ══════════════════════════════════════════════════════════════
 *  وضعيات اللعب:
 *  ─────────────
 *  1. محلي         — لاعبان على نفس الجهاز
 *  2. أونلاين عشوائي — يبحث عن لاعب تلقائياً (بوت بعد 60ث)
 *  3. مع صديق       — إنشاء غرفة بكود 6 أحرف أو انضمام بالكود
 *
 *  Firebase structure (rooms/{roomId}):
 *  ─────────────────────────────────────
 *  {
 *    id, gameType: 'drawguess', mode: 'random'|'friend',
 *    friendCode, lang, status: 'waiting'|'wordchoice'|'drawing'|'result'|'finished',
 *    round, totalRounds: 6,
 *    drawerUid, word, wordChoices[],
 *    strokes: [{color,size,points:[{x,y}]}],
 *    scores: { [uid]: number },
 *    roundResult: 'correct'|'timeout'|null,
 *    roundWinnerUid, timerStart,
 *    player1: { uid, name }, player2: { uid, name },
 *    createdAt, lastUpdate,
 *  }
 *
 *  الرسم أونلاين: strokes تُرسل كل 150ms (throttled) لتقليل Firestore writes.
 */

import React, {
  useState, useEffect, useRef, useCallback, useMemo,
} from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar,
  PanResponder, Alert, Animated, TextInput, ScrollView,
  Platform, Dimensions, Modal, ActivityIndicator,
  Clipboard,
} from 'react-native';
import { db } from './firebaseConfig';
import {
  doc, setDoc, updateDoc, onSnapshot,
  collection, query, where, getDocs, getDoc,
} from 'firebase/firestore';
import { useTheme } from './ThemeContext';
import ExitButton from './ExitButton';
import { useLanguage } from './I18n';
import { WebScreenButton, GameInfoButton } from './WebRoomService';

// ══════════════════════════════════════════════════════════
//  Constants
// ══════════════════════════════════════════════════════════
const { width: SW } = Dimensions.get('window');
const CANVAS_W      = SW - 32;
const CANVAS_H      = 260;
const ROUND_TIME    = 60;
const TOTAL_ROUNDS  = 6;
const BOT_WAIT_MS   = 60000;
const STROKE_MS     = 150;

const PALETTE = [
  '#000000','#ffffff','#ef4444','#f97316',
  '#eab308','#22c55e','#3b82f6','#a855f7',
  '#ec4899','#06b6d4','#f59e0b','#84cc16',
];
const BRUSH_SIZES = [4, 8, 14, 22];

// ══════════════════════════════════════════════════════════
//  Word Banks
// ══════════════════════════════════════════════════════════
const WORDS_AR = [
  'قطة','كلب','أسد','فيل','طائر','سمكة','حصان','ثعلب','دب','قرد',
  'تفاحة','موزة','بيتزا','برجر','كعكة','آيس كريم','عصير','شاي','قهوة','شوكولاتة',
  'كرة قدم','سباحة','تنس','دراجة','جري','ملاكمة','تزلج','رمي','كرة السلة','غوص',
  'كرسي','طاولة','باب','نافذة','مفتاح','مرآة','سجادة','ثلاجة','تلفاز','سرير',
  'شجرة','جبل','بحر','نهر','شمس','قمر','نجمة','سحاب','صحراء','زهرة',
  'طبيب','معلم','طيار','طباخ','رسام','موسيقى','ممثل','نجار','بناء','شرطي',
  'سيارة','قطار','طائرة','سفينة','دراجة','حافلة','مروحية','غواصة','صاروخ','قارب',
  'قلب','يد','عين','انف','اذن','قدم','شعر','فم','راس','ذراع',
];
const WORDS_EN = [
  'cat','dog','lion','elephant','bird','fish','horse','fox','bear','monkey',
  'apple','banana','pizza','burger','cake','icecream','juice','tea','coffee','chocolate',
  'football','basketball','swimming','tennis','cycling','running','boxing','skiing','archery','diving',
  'chair','table','door','window','key','mirror','carpet','fridge','television','bed',
  'tree','mountain','sea','river','sun','moon','star','cloud','desert','flower',
  'doctor','teacher','pilot','chef','painter','musician','actor','carpenter','builder','police',
  'car','train','airplane','ship','bicycle','bus','helicopter','submarine','rocket','boat',
  'heart','hand','eye','nose','ear','foot','hair','mouth','head','arm',
];

const getNewWords = (lang, n = 3) =>
  [...(lang === 'ar' ? WORDS_AR : WORDS_EN)].sort(() => Math.random() - 0.5).slice(0, n);

const genCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

// ══════════════════════════════════════════════════════════
//  DrawingCanvas (pure RN, no SVG)
// ══════════════════════════════════════════════════════════
function DrawingCanvas({ strokes, currentStroke }) {
  const allStrokes = currentStroke ? [...strokes, currentStroke] : strokes;
  return (
    <View style={{ width: CANVAS_W, height: CANVAS_H, backgroundColor: '#ffffff', overflow: 'hidden', position: 'relative' }}>
      {allStrokes.map((stroke, si) =>
        stroke.points.map((pt, pi) => {
          if (pi === 0) return null;
          const prev = stroke.points[pi - 1];
          const dx = pt.x - prev.x; const dy = pt.y - prev.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          if (len < 0.5) return null;
          const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
          return (
            <View key={`${si}-${pi}`} style={{
              position: 'absolute',
              left: prev.x, top: prev.y - stroke.size / 2,
              width: len + stroke.size, height: stroke.size,
              backgroundColor: stroke.color,
              borderRadius: stroke.size / 2,
              transform: [{ rotate: `${angle}deg` }],
            }} />
          );
        })
      )}
      {allStrokes.length === 0 && (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 40, opacity: 0.15 }}>✏️</Text>
        </View>
      )}
    </View>
  );
}

// ══════════════════════════════════════════════════════════
//  TimerBar
// ══════════════════════════════════════════════════════════
function TimerBar({ timeLeft, total }) {
  const pct   = timeLeft / total;
  const color = pct > 0.5 ? '#22c55e' : pct > 0.25 ? '#f59e0b' : '#ef4444';
  const anim  = useRef(new Animated.Value(pct)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: pct, duration: 500, useNativeDriver: false }).start();
  }, [pct]);
  const w = anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  return (
    <View style={s.timerTrack}>
      <Animated.View style={[s.timerFill, { width: w, backgroundColor: color }]} />
      <Text style={[s.timerNum, { color }]}>{timeLeft}s</Text>
    </View>
  );
}

// ══════════════════════════════════════════════════════════
//  WordChoiceModal
// ══════════════════════════════════════════════════════════
function WordChoiceModal({ visible, words, onPick, theme, isRTL }) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={s.modalBg}>
        <View style={[s.wcCard, { backgroundColor: theme.bgCard, borderColor: theme.accentBorder }]}>
          <Text style={[s.wcTitle, { color: theme.textPrimary }]}>
            {isRTL ? '🎨 اختر كلمة لترسمها' : '🎨 Choose a word to draw'}
          </Text>
          {words.map(w => (
            <TouchableOpacity key={w}
              style={[s.wcBtn, { backgroundColor: theme.bgElevated, borderColor: theme.border }]}
              onPress={() => onPick(w)} activeOpacity={0.75}>
              <Text style={[s.wcBtnText, { color: theme.textPrimary }]}>{w}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════
//  RoundResult
// ══════════════════════════════════════════════════════════
function RoundResult({ result, word, winnerName, isRTL, theme, onNext, nextLabel }) {
  const won = result === 'correct';
  const sc  = useRef(new Animated.Value(0.6)).current;
  useEffect(() => { Animated.spring(sc, { toValue: 1, useNativeDriver: true, tension: 80 }).start(); }, []);
  return (
    <View style={[s.resultOverlay, { backgroundColor: theme.bgOverlay }]}>
      <Animated.View style={[s.resultCard,
        { backgroundColor: theme.bgCard, borderColor: won ? '#22c55e' : '#ef4444', transform: [{ scale: sc }] }]}>
        <Text style={s.resultEmoji}>{won ? '🎉' : '⏰'}</Text>
        <Text style={[s.resultTitle, { color: won ? '#22c55e' : '#ef4444' }]}>
          {won
            ? (winnerName ? (isRTL ? `${winnerName} خمّنها!` : `${winnerName} got it!`) : (isRTL ? 'صحيح!' : 'Correct!'))
            : (isRTL ? 'انتهى الوقت!' : "Time's up!")}
        </Text>
        <View style={[s.resultWordBox, { backgroundColor: theme.bgElevated }]}>
          <Text style={[s.resultWordLabel, { color: theme.textSecondary }]}>{isRTL ? 'الكلمة كانت' : 'The word was'}</Text>
          <Text style={[s.resultWordValue, { color: theme.accent }]}>{word}</Text>
        </View>
        <TouchableOpacity style={[s.nextBtn, { backgroundColor: theme.accent }]} onPress={onNext} activeOpacity={0.8}>
          <Text style={[s.nextBtnText, { color: theme.textOnAccent }]}>
            {nextLabel || (isRTL ? 'التالي ←' : 'Next →')}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ══════════════════════════════════════════════════════════
//  WaitingLobby
// ══════════════════════════════════════════════════════════
function WaitingLobby({ theme, isRTL, friendCode, isFriend, onCancel }) {
  const da = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(da, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(da, { toValue: 0.3, duration: 700, useNativeDriver: true }),
    ])).start();
  }, []);
  return (
    <View style={[s.lobbyWrap, { backgroundColor: theme.isCityTheme ? 'transparent' : theme.bg }]}>
      <StatusBar barStyle={theme.statusBar} />
      <ExitButton onPress={onBack} />
      <Text style={s.lobbyBigEmoji}>🎨</Text>
      <Text style={[s.lobbyTitle, { color: theme.textPrimary }]}>
        {isRTL ? 'بانتظار لاعب...' : 'Waiting for player...'}
      </Text>
      {isFriend && friendCode ? (
        <>
          <Text style={[s.lobbySub, { color: theme.textSecondary }]}>
            {isRTL ? 'شارك الكود مع صديقك' : 'Share this code with your friend'}
          </Text>
          <TouchableOpacity
            style={[s.codeBox, { backgroundColor: theme.bgCard, borderColor: theme.accentBorder }]}
            onPress={() => { Clipboard.setString(friendCode); Alert.alert(isRTL ? 'تم النسخ ✓' : 'Copied ✓', friendCode); }}
            activeOpacity={0.8}>
            <Text style={[s.codeText, { color: theme.accent }]}>{friendCode}</Text>
            <Text style={[s.codeCopy, { color: theme.textSecondary }]}>{isRTL ? '📋 اضغط للنسخ' : '📋 Tap to copy'}</Text>
          </TouchableOpacity>
        </>
      ) : (
        <Text style={[s.lobbySub, { color: theme.textSecondary }]}>
          {isRTL ? 'يبحث عن منافس... (بوت بعد 60 ثانية)' : 'Finding opponent... (bot after 60s)'}
        </Text>
      )}
      <Animated.View style={[s.dotsRow, { opacity: da }]}>
        {[0, 1, 2].map(i => <View key={i} style={[s.dot, { backgroundColor: theme.accent }]} />)}
      </Animated.View>
      <TouchableOpacity style={[s.cancelBtn, { borderColor: theme.border }]} onPress={onCancel}>
        <Text style={[s.cancelBtnText, { color: theme.textSecondary }]}>{isRTL ? 'إلغاء' : 'Cancel'}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ══════════════════════════════════════════════════════════
//  GameOver
// ══════════════════════════════════════════════════════════
function GameOver({ players, scores, myUid, isRTL, theme, onBack }) {
  const s1 = scores[players[0]?.uid] || 0;
  const s2 = scores[players[1]?.uid] || 0;
  const winnerUid = s1 > s2 ? players[0]?.uid : s2 > s1 ? players[1]?.uid : null;
  const winnerName = players.find(p => p.uid === winnerUid)?.name;
  const iWon = winnerUid === myUid;
  const sc = useRef(new Animated.Value(0.8)).current;
  useEffect(() => { Animated.spring(sc, { toValue: 1, useNativeDriver: true }).start(); }, []);
  return (
    <View style={[s.flex1, { backgroundColor: theme.isCityTheme ? 'transparent' : theme.bg, alignItems: 'center', justifyContent: 'center' }]}>
      <StatusBar barStyle={theme.statusBar} />
      <Animated.View style={[s.goCard, { backgroundColor: theme.bgCard, borderColor: theme.accentBorder, transform: [{ scale: sc }] }]}>
        <Text style={s.goEmoji}>{!winnerUid ? '🤝' : iWon ? '🏆' : '😔'}</Text>
        <Text style={[s.goTitle, { color: theme.textPrimary }]}>{isRTL ? 'انتهت اللعبة!' : 'Game Over!'}</Text>
        {winnerName
          ? <Text style={[s.goWinner, { color: theme.accent }]}>{isRTL ? `🎉 الفائز: ${winnerName}` : `🎉 Winner: ${winnerName}`}</Text>
          : <Text style={[s.goWinner, { color: theme.accent }]}>{isRTL ? '🤝 تعادل!' : '🤝 Draw!'}</Text>}
        <View style={[s.goScoreRow, { borderColor: theme.border }]}>
          {players.map((p, i) => (
            <View key={p.uid} style={s.goScoreCol}>
              <Text style={[s.goScoreName, { color: theme.textSecondary }]}>{p.name}</Text>
              <Text style={[s.goScoreVal, { color: theme.textPrimary }]}>{scores[p.uid] || 0}</Text>
            </View>
          ))}
        </View>
        <TouchableOpacity style={[s.goBtn, { backgroundColor: theme.accent }]} onPress={onBack} activeOpacity={0.8}>
          <Text style={[s.goBtnText, { color: theme.textOnAccent }]}>{isRTL ? '← خروج' : 'Exit →'}</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ══════════════════════════════════════════════════════════
//  MAIN
// ══════════════════════════════════════════════════════════
export default function DrawGuessGameScreen({ onBack, currentUser, onGameEnd }) {
  const { theme, themeId } = useTheme();
  const { lang }  = useLanguage();
  const isRTL     = lang === 'ar';

  const myUid  = currentUser?.uid  || `guest_${Math.random().toString(36).slice(2, 8)}`;
  const myName = currentUser?.name || (isRTL ? 'لاعب' : 'Player');

  // ── Screens ──
  const [screen, setScreen]       = useState('modeSelect');
  // modeSelect | setup | joining | lobby | game | gameover

  // ── Mode ──
  const [gameMode, setGameMode]   = useState(null);
  // 'local' | 'random' | 'friend_create' | 'friend_join'

  // ── Join input ──
  const [joinCode, setJoinCode]   = useState('');
  const [joinErr,  setJoinErr]    = useState('');

  // ── Local setup ──
  const [lp1, setLp1] = useState('');
  const [lp2, setLp2] = useState('');

  // ── Local state ──
  const [localPlayers, setLocalPlayers] = useState(['', '']);
  const [localRound,   setLocalRound]   = useState(0);
  const [localScores,  setLocalScores]  = useState([0, 0]);
  const [localPhase,   setLocalPhase]   = useState('wordchoice');
  const [localWord,    setLocalWord]    = useState('');
  const [localWords,   setLocalWords]   = useState([]);
  const [localResult,  setLocalResult]  = useState(null);
  const [localTime,    setLocalTime]    = useState(ROUND_TIME);
  const [guessText,    setGuessText]    = useState('');
  const localTimerRef = useRef(null);

  // ── Online Firebase ──
  const [roomId,   setRoomId]   = useState(null);
  const [roomData, setRoomData] = useState(null);
  const unsubRef  = useRef(null);
  const botRef    = useRef(null);

  // ── Drawing ──
  const [strokes,       setStrokes]       = useState([]);
  const [currentStroke, setCurrentStroke] = useState(null);
  const [penColor,      setPenColor]      = useState('#000000');
  const [brushSize,     setBrushSize]     = useState(8);
  const [isEraser,      setIsEraser]      = useState(false);
  const lastSendRef = useRef(0);

  // ── Shake ──
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const doShake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8,  duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 5,  duration: 45, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,  duration: 35, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  // ── Online timer ──
  const [onlineTime, setOnlineTime] = useState(ROUND_TIME);
  const onlineTimerRef = useRef(null);

  // cleanup
  useEffect(() => () => {
    unsubRef.current?.();
    clearTimeout(botRef.current);
    clearInterval(localTimerRef.current);
    clearInterval(onlineTimerRef.current);
  }, []);

  // ──────────────────────────────────────────────────────
  //  Firebase helpers
  // ──────────────────────────────────────────────────────
  const listenRoom = useCallback((rid) => {
    unsubRef.current?.();
    unsubRef.current = onSnapshot(doc(db, 'rooms', rid), snap => {
      if (snap.exists()) setRoomData(snap.data());
    });
  }, []);

  const roomUpdate = useCallback(async (updates) => {
    if (!roomId) return;
    try { await updateDoc(doc(db, 'rooms', roomId), { ...updates, lastUpdate: Date.now() }); }
    catch (e) { console.warn(e); }
  }, [roomId]);

  // ──────────────────────────────────────────────────────
  //  Online: random
  // ──────────────────────────────────────────────────────
  const startRandom = useCallback(async () => {
    setGameMode('random');
    setScreen('lobby');
    try {
      const q = query(collection(db, 'rooms'),
        where('gameType', '==', 'drawguess'),
        where('status',   '==', 'waiting'),
        where('lang',     '==', lang));
      const snap = await getDocs(q);
      const avail = snap.docs.find(d => {
        const r = d.data();
        return r.player1?.uid !== myUid && !r.player2?.uid;
      });
      if (avail) {
        const rid = avail.id;
        const rd  = avail.data();
        const botUid2 = rd.player1.uid;
        await updateDoc(doc(db, 'rooms', rid), {
          'player2.uid': myUid, 'player2.name': myName,
          status: 'wordchoice', wordChoices: getNewWords(lang, 3),
          drawerUid: rd.player1.uid,
          scores: { [rd.player1.uid]: 0, [myUid]: 0 },
          strokes: [], timerStart: Date.now(), lastUpdate: Date.now(),
        });
        setRoomId(rid); listenRoom(rid); setScreen('game');
        return;
      }
      const rid = `dg_rnd_${Date.now()}_${myUid.slice(0,6)}`;
      await setDoc(doc(db, 'rooms', rid), {
        id: rid, gameType: 'drawguess', mode: 'random',
        lang, status: 'waiting',
        player1: { uid: myUid, name: myName },
        player2: { uid: null, name: null },
        round: 0, totalRounds: TOTAL_ROUNDS,
        scores: { [myUid]: 0 }, drawerUid: myUid,
        wordChoices: [], word: '', strokes: [],
        roundResult: null, roundWinnerUid: null,
        createdAt: Date.now(), lastUpdate: Date.now(),
      });
      setRoomId(rid); listenRoom(rid);
      botRef.current = setTimeout(async () => {
        try {
          const s2 = await getDoc(doc(db, 'rooms', rid));
          if (s2.exists() && s2.data().status === 'waiting') {
            const botUid = `bot_${rid}`;
            await updateDoc(doc(db, 'rooms', rid), {
              'player2.uid': botUid, 'player2.name': '🤖 Bot',
              status: 'wordchoice', wordChoices: getNewWords(lang, 3),
              scores: { [myUid]: 0, [botUid]: 0 },
              strokes: [], timerStart: Date.now(), lastUpdate: Date.now(),
            });
          }
        } catch (e) {}
      }, BOT_WAIT_MS);
    } catch (e) {
      console.error(e);
      setScreen('modeSelect');
      Alert.alert(isRTL ? 'خطأ' : 'Error', String(e.message));
    }
  }, [lang, myUid, myName, isRTL, listenRoom]);

  // ──────────────────────────────────────────────────────
  //  Online: create friend room
  // ──────────────────────────────────────────────────────
  const createFriend = useCallback(async () => {
    setGameMode('friend_create');
    setScreen('lobby');
    try {
      const friendCode = genCode();
      const rid = `dg_fr_${friendCode}_${Date.now()}`;
      await setDoc(doc(db, 'rooms', rid), {
        id: rid, gameType: 'drawguess', mode: 'friend',
        friendCode, lang, status: 'waiting',
        player1: { uid: myUid, name: myName },
        player2: { uid: null, name: null },
        round: 0, totalRounds: TOTAL_ROUNDS,
        scores: { [myUid]: 0 }, drawerUid: myUid,
        wordChoices: [], word: '', strokes: [],
        roundResult: null, roundWinnerUid: null,
        createdAt: Date.now(), lastUpdate: Date.now(),
      });
      setRoomId(rid); listenRoom(rid);
    } catch (e) {
      console.error(e); setScreen('modeSelect');
    }
  }, [lang, myUid, myName, listenRoom]);

  // ──────────────────────────────────────────────────────
  //  Online: join by code
  // ──────────────────────────────────────────────────────
  const joinByCode = useCallback(async () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length < 4) { setJoinErr(isRTL ? 'الكود قصير' : 'Code too short'); return; }
    setJoinErr(''); setGameMode('friend_join'); setScreen('joining');
    try {
      const q = query(collection(db, 'rooms'),
        where('gameType',   '==', 'drawguess'),
        where('friendCode', '==', code),
        where('status',     '==', 'waiting'));
      const snap = await getDocs(q);
      if (snap.empty) {
        setScreen('modeSelect');
        setJoinErr(isRTL ? 'كود غير صحيح أو انتهت الغرفة' : 'Code not found or room expired');
        return;
      }
      const rd  = snap.docs[0].data();
      const rid = snap.docs[0].id;
      await updateDoc(doc(db, 'rooms', rid), {
        'player2.uid': myUid, 'player2.name': myName,
        status: 'wordchoice', wordChoices: getNewWords(lang, 3),
        drawerUid: rd.player1.uid,
        scores: { [rd.player1.uid]: 0, [myUid]: 0 },
        strokes: [], timerStart: Date.now(), lastUpdate: Date.now(),
      });
      setRoomId(rid); listenRoom(rid); setScreen('game');
    } catch (e) {
      console.error(e); setScreen('modeSelect');
      Alert.alert(isRTL ? 'خطأ' : 'Error', String(e.message));
    }
  }, [joinCode, lang, myUid, myName, isRTL, listenRoom]);

  // ──────────────────────────────────────────────────────
  //  Online watchers
  // ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!roomData) return;
    if (screen === 'lobby' && roomData.status !== 'waiting') {
      clearTimeout(botRef.current);
      setScreen('game');
    }
    if (roomData.status === 'finished') setScreen('gameover');
  }, [roomData, screen]);

  // online timer
  const amIDrawer = roomData?.drawerUid === myUid;
  useEffect(() => {
    if (roomData?.status !== 'drawing' || !roomData?.timerStart) return;
    clearInterval(onlineTimerRef.current);
    const tick = () => {
      const elapsed = Math.floor((Date.now() - roomData.timerStart) / 1000);
      const left = Math.max(0, ROUND_TIME - elapsed);
      setOnlineTime(left);
      if (left === 0) {
        clearInterval(onlineTimerRef.current);
        if (amIDrawer) roomUpdate({ status: 'result', roundResult: 'timeout', roundWinnerUid: null });
      }
    };
    tick();
    onlineTimerRef.current = setInterval(tick, 500);
    return () => clearInterval(onlineTimerRef.current);
  }, [roomData?.status, roomData?.timerStart]);

  // sync remote strokes for guesser
  useEffect(() => {
    if (roomData?.status === 'drawing' && !amIDrawer) {
      setStrokes(roomData.strokes || []);
    }
    if (roomData?.status === 'wordchoice') {
      setStrokes([]); setCurrentStroke(null);
    }
  }, [roomData?.strokes, roomData?.status, amIDrawer]);

  // ──────────────────────────────────────────────────────
  //  Online: actions
  // ──────────────────────────────────────────────────────
  const handleOnlineWordPick = useCallback(async (word) => {
    await roomUpdate({
      word, status: 'drawing',
      strokes: [], roundResult: null, roundWinnerUid: null,
      timerStart: Date.now(),
    });
  }, [roomUpdate]);

  const [onlineGuess, setOnlineGuess] = useState('');
  const handleOnlineGuess = useCallback(async () => {
    if (!onlineGuess.trim() || !roomData?.word) return;
    const norm = t => t.trim().toLowerCase().replace(/\s+/g, '');
    if (norm(onlineGuess) === norm(roomData.word)) {
      clearInterval(onlineTimerRef.current);
      const newScores = { ...(roomData.scores || {}), [myUid]: ((roomData.scores || {})[myUid] || 0) + 1 };
      await roomUpdate({ status: 'result', roundResult: 'correct', roundWinnerUid: myUid, scores: newScores });
      setOnlineGuess('');
    } else {
      doShake(); setOnlineGuess('');
    }
  }, [onlineGuess, roomData, myUid, roomUpdate, doShake]);

  const handleOnlineNext = useCallback(async () => {
    const nextRound = (roomData?.round || 0) + 1;
    if (nextRound >= TOTAL_ROUNDS) {
      await roomUpdate({ status: 'finished' });
      return;
    }
    const nextDrawer = roomData?.drawerUid === roomData?.player1?.uid
      ? roomData?.player2?.uid : roomData?.player1?.uid;
    await roomUpdate({
      round: nextRound, status: 'wordchoice',
      wordChoices: getNewWords(lang, 3),
      drawerUid: nextDrawer,
      word: '', strokes: [],
      roundResult: null, roundWinnerUid: null, timerStart: null,
    });
  }, [roomData, lang, roomUpdate]);

  // flush strokes to firebase (throttled)
  const flushStrokes = useCallback(async (s) => {
    const now = Date.now();
    if (now - lastSendRef.current < STROKE_MS) return;
    lastSendRef.current = now;
    try { await updateDoc(doc(db, 'rooms', roomId), { strokes: s, lastUpdate: now }); }
    catch (e) {}
  }, [roomId]);

  // ──────────────────────────────────────────────────────
  //  PanResponder
  // ──────────────────────────────────────────────────────
  const isOnline  = ['random','friend_create','friend_join'].includes(gameMode);
  const canDraw   = isOnline ? (amIDrawer && roomData?.status === 'drawing') : (localPhase === 'drawing');
  const activeCol = isEraser ? '#ffffff' : penColor;
  const activeSz  = isEraser ? brushSize * 2.5 : brushSize;

  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => canDraw,
    onMoveShouldSetPanResponder:  () => canDraw,
    onPanResponderGrant: evt => {
      const { locationX: x, locationY: y } = evt.nativeEvent;
      setCurrentStroke({ points: [{ x, y }], color: activeCol, size: activeSz });
    },
    onPanResponderMove: evt => {
      const { locationX: x, locationY: y } = evt.nativeEvent;
      setCurrentStroke(prev => prev ? { ...prev, points: [...prev.points, { x, y }] } : null);
    },
    onPanResponderRelease: () => {
      setCurrentStroke(prev => {
        if (!prev) return null;
        const next = [...strokes, prev];
        setStrokes(next);
        if (isOnline) flushStrokes(next);
        return null;
      });
    },
    onPanResponderTerminate: () => setCurrentStroke(null),
  }), [canDraw, activeCol, activeSz, strokes, isOnline, flushStrokes]);

  // ──────────────────────────────────────────────────────
  //  Local timer
  // ──────────────────────────────────────────────────────
  const startLocalTimer = useCallback(() => {
    clearInterval(localTimerRef.current);
    setLocalTime(ROUND_TIME);
    localTimerRef.current = setInterval(() => {
      setLocalTime(prev => {
        if (prev <= 1) {
          clearInterval(localTimerRef.current);
          setLocalResult('timeout'); setLocalPhase('result');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const handleLocalWordPick = useCallback((word) => {
    setLocalWord(word); setStrokes([]); setCurrentStroke(null); setGuessText('');
    setLocalPhase('drawing'); startLocalTimer();
  }, [startLocalTimer]);

  const handleLocalGuess = useCallback(() => {
    if (!guessText.trim()) return;
    const norm = t => t.trim().toLowerCase().replace(/\s+/g, '');
    if (norm(guessText) === norm(localWord)) {
      clearInterval(localTimerRef.current);
      const gi = 1 - (localRound % 2);
      setLocalScores(prev => { const n = [...prev]; n[gi]++; return n; });
      setLocalResult('correct'); setLocalPhase('result');
    } else { doShake(); setGuessText(''); }
  }, [guessText, localWord, localRound, doShake]);

  const handleLocalNext = useCallback(() => {
    const next = localRound + 1;
    if (next >= TOTAL_ROUNDS) { setScreen('gameover'); return; }
    setLocalRound(next);
    setStrokes([]); setCurrentStroke(null); setLocalResult(null);
    setLocalWords(getNewWords(lang, 3));
    setLocalPhase('wordchoice');
  }, [localRound, lang]);

  // ──────────────────────────────────────────────────────
  //  Exit
  // ──────────────────────────────────────────────────────
  const handleExit = useCallback(() => {
    Alert.alert(
      isRTL ? 'خروج' : 'Exit',
      isRTL ? 'هل تريد الخروج من اللعبة؟' : 'Exit game?',
      [
        { text: isRTL ? 'إلغاء' : 'Cancel', style: 'cancel' },
        {
          text: isRTL ? 'خروج' : 'Exit', style: 'destructive',
          onPress: async () => {
            clearInterval(localTimerRef.current); clearInterval(onlineTimerRef.current);
            clearTimeout(botRef.current); unsubRef.current?.();
            if (roomId) {
              try { await updateDoc(doc(db, 'rooms', roomId), { status: 'abandoned', lastUpdate: Date.now() }); }
              catch (e) {}
            }
            onBack();
          },
        },
      ]
    );
  }, [isRTL, roomId, onBack]);

  // ──────────────────────────────────────────────────────
  //  Shared renders
  // ──────────────────────────────────────────────────────
  const renderHeader = (roundLabel, roleText, p1, s1, p2, s2) => (
    <View style={[s.header, { borderBottomColor: theme.border }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <ExitButton onPress={onBack} />
        <GameInfoButton gameType="draw_guess" lang={lang} />
        <WebScreenButton
          playerUid={myUid}
          playerName={myName}
          gameType="draw_guess"
          gameRoomId={roomId || ''}
          getPublicData={() => ({ round: roomData?.round || 0, status: roomData?.status })}
          themeName={themeId || 'dark'}
        />
      </View>
      <View style={s.hCenter}>
        <Text style={[s.hRound, { color: theme.textSecondary }]}>{roundLabel}</Text>
        {!!roleText && <Text style={[s.hRole, { color: theme.textPrimary }]}>{roleText}</Text>}
      </View>
      <View style={s.hScores}>
        {[[p1, s1],[p2, s2]].map(([name, sc2], i) => (
          <View key={i} style={[s.sPill, { backgroundColor: theme.bgElevated }]}>
            <Text style={[s.sPillVal, { color: theme.accent }]}>{sc2}</Text>
            <Text style={[s.sPillName, { color: theme.textSecondary }]}>{name?.split(' ')[0]}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderToolbar = () => (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
        {PALETTE.map(c => (
          <TouchableOpacity key={c}
            style={[s.colorDot, { backgroundColor: c, borderColor: penColor === c && !isEraser ? theme.accent : 'transparent' }]}
            onPress={() => { setPenColor(c); setIsEraser(false); }} />
        ))}
      </ScrollView>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          {BRUSH_SIZES.map(sz => (
            <TouchableOpacity key={sz}
              style={[s.brushBtn, { borderColor: brushSize === sz && !isEraser ? theme.accent : theme.border }]}
              onPress={() => { setBrushSize(sz); setIsEraser(false); }}>
              <View style={{ width: sz, height: sz, borderRadius: sz, backgroundColor: theme.textPrimary }} />
            </TouchableOpacity>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <TouchableOpacity style={[s.toolBtn, { backgroundColor: isEraser ? theme.accentSoft : theme.bgElevated, borderColor: isEraser ? theme.accent : theme.border }]}
            onPress={() => setIsEraser(e => !e)}>
            <Text style={s.toolBtnTxt}>⬜</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.toolBtn, { backgroundColor: theme.bgElevated, borderColor: theme.border }]}
            onPress={() => setStrokes(prev => prev.slice(0, -1))}>
            <Text style={s.toolBtnTxt}>↩</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.toolBtn, { backgroundColor: '#ef444415', borderColor: '#ef444440' }]}
            onPress={() => Alert.alert(isRTL ? 'مسح؟' : 'Clear?', '', [
              { text: isRTL ? 'إلغاء' : 'Cancel', style: 'cancel' },
              { text: isRTL ? 'مسح' : 'Clear', style: 'destructive', onPress: () => setStrokes([]) },
            ])}>
            <Text style={s.toolBtnTxt}>🗑</Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );

  // ──────────────────────────────────────────────────────
  //  SCREENS
  // ──────────────────────────────────────────────────────

  /* ── Mode Select ── */
  if (screen === 'modeSelect') {
    return (
      <View style={[s.flex1, { backgroundColor: theme.isCityTheme ? 'transparent' : theme.bg }]}>
        <StatusBar barStyle={theme.statusBar} />
        <ExitButton onPress={onBack} />
        <ScrollView contentContainerStyle={s.modeContent} keyboardShouldPersistTaps="handled">
          <Text style={s.bigEmoji}>🎨</Text>
          <Text style={[s.bigTitle, { color: theme.textPrimary }]}>{isRTL ? 'رسم وتخمين' : 'Draw & Guess'}</Text>

          {/* Local */}
          <TouchableOpacity style={[s.modeCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}
            onPress={() => { setGameMode('local'); setScreen('setup'); }} activeOpacity={0.8}>
            <Text style={s.modeEmoji}>📱</Text>
            <View style={s.modeTxt}>
              <Text style={[s.modeCardTitle, { color: theme.textPrimary }]}>{isRTL ? 'محلي' : 'Local'}</Text>
              <Text style={[s.modeCardSub, { color: theme.textSecondary }]}>{isRTL ? 'لاعبان على نفس الجهاز' : 'Two players, one device'}</Text>
            </View>
            <Text style={[s.modeArr, { color: theme.accent }]}>›</Text>
          </TouchableOpacity>

          {/* Random */}
          <TouchableOpacity style={[s.modeCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}
            onPress={startRandom} activeOpacity={0.8}>
            <Text style={s.modeEmoji}>🌐</Text>
            <View style={s.modeTxt}>
              <Text style={[s.modeCardTitle, { color: theme.textPrimary }]}>{isRTL ? 'عشوائي أونلاين' : 'Random Online'}</Text>
              <Text style={[s.modeCardSub, { color: theme.textSecondary }]}>{isRTL ? 'العب مع لاعب عشوائي' : 'Play with a random player'}</Text>
            </View>
            <Text style={[s.modeArr, { color: theme.accent }]}>›</Text>
          </TouchableOpacity>

          {/* Friend create */}
          <TouchableOpacity style={[s.modeCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}
            onPress={createFriend} activeOpacity={0.8}>
            <Text style={s.modeEmoji}>🔗</Text>
            <View style={s.modeTxt}>
              <Text style={[s.modeCardTitle, { color: theme.textPrimary }]}>{isRTL ? 'مع صديق — أنشئ غرفة' : 'With Friend — Create'}</Text>
              <Text style={[s.modeCardSub, { color: theme.textSecondary }]}>{isRTL ? 'أنشئ غرفة وشارك الكود' : 'Create a room & share the code'}</Text>
            </View>
            <Text style={[s.modeArr, { color: theme.accent }]}>›</Text>
          </TouchableOpacity>

          {/* Friend join */}
          <View style={[s.joinCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
            <Text style={s.modeEmoji}>🔑</Text>
            <View style={s.modeTxt}>
              <Text style={[s.modeCardTitle, { color: theme.textPrimary }]}>{isRTL ? 'انضم بكود' : 'Join by Code'}</Text>
              <TextInput
                style={[s.joinInput, {
                  backgroundColor: theme.bgInput,
                  borderColor: joinErr ? theme.error : theme.border,
                  color: theme.textPrimary,
                }]}
                placeholder={isRTL ? 'أدخل الكود' : 'Enter code'}
                placeholderTextColor={theme.textMuted}
                value={joinCode}
                onChangeText={t => { setJoinCode(t.toUpperCase()); setJoinErr(''); }}
                maxLength={8} autoCapitalize="characters" autoCorrect={false}
              />
              {!!joinErr && <Text style={[s.joinErr, { color: theme.error }]}>{joinErr}</Text>}
            </View>
            <TouchableOpacity style={[s.joinBtn, { backgroundColor: theme.accent }]} onPress={joinByCode} activeOpacity={0.8}>
              <Text style={[s.joinBtnTxt, { color: theme.textOnAccent }]}>{isRTL ? 'انضم' : 'Join'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  /* ── Setup (local) ── */
  if (screen === 'setup') {
    const canStart = lp1.trim() && lp2.trim();
    return (
      <View style={[s.flex1, { backgroundColor: theme.isCityTheme ? 'transparent' : theme.bg }]}>
        <StatusBar barStyle={theme.statusBar} />
        <ExitButton onPress={() => setScreen('modeSelect')} />
        <ScrollView contentContainerStyle={s.modeContent} keyboardShouldPersistTaps="handled">
          <Text style={s.bigEmoji}>🎨</Text>
          <Text style={[s.bigTitle, { color: theme.textPrimary }]}>{isRTL ? 'محلي' : 'Local Game'}</Text>
          <View style={[s.setupCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
            <Text style={[s.setupLbl, { color: theme.textSecondary }]}>{isRTL ? 'اللاعب الأول' : 'Player 1'}</Text>
            <TextInput style={[s.setupInput, { backgroundColor: theme.bgInput, borderColor: theme.border, color: theme.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}
              placeholder={isRTL ? 'الاسم 🎨' : 'Name 🎨'}
              placeholderTextColor={theme.textMuted} value={lp1} onChangeText={setLp1} maxLength={15} />
            <View style={[s.divider, { backgroundColor: theme.divider }]} />
            <Text style={[s.setupLbl, { color: theme.textSecondary }]}>{isRTL ? 'اللاعب الثاني' : 'Player 2'}</Text>
            <TextInput style={[s.setupInput, { backgroundColor: theme.bgInput, borderColor: theme.border, color: theme.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}
              placeholder={isRTL ? 'الاسم 🤔' : 'Name 🤔'}
              placeholderTextColor={theme.textMuted} value={lp2} onChangeText={setLp2} maxLength={15} />
          </View>
          <TouchableOpacity
            style={[s.startBtn, { backgroundColor: canStart ? theme.accent : theme.bgElevated, opacity: canStart ? 1 : 0.5 }]}
            disabled={!canStart}
            onPress={() => {
              setLocalPlayers([lp1.trim(), lp2.trim()]);
              setLocalRound(0); setLocalScores([0, 0]);
              setLocalWords(getNewWords(lang, 3)); setLocalPhase('wordchoice');
              setScreen('game');
            }}>
            <Text style={[s.startBtnTxt, { color: canStart ? theme.textOnAccent : theme.textMuted }]}>
              {isRTL ? '🎮 ابدأ' : '🎮 Start'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  /* ── Joining spinner ── */
  if (screen === 'joining') {
    return (
      <View style={[s.flex1, { backgroundColor: theme.isCityTheme ? 'transparent' : theme.bg, alignItems: 'center', justifyContent: 'center' }]}>
        <StatusBar barStyle={theme.statusBar} />
        <ActivityIndicator size="large" color={theme.accent} />
        <Text style={[{ color: theme.textSecondary, marginTop: 16, fontSize: 14 }]}>
          {isRTL ? 'جارٍ الانضمام...' : 'Joining...'}
        </Text>
      </View>
    );
  }

  /* ── Lobby ── */
  if (screen === 'lobby') {
    return (
      <WaitingLobby
        theme={theme} isRTL={isRTL}
        friendCode={roomData?.friendCode || ''}
        isFriend={gameMode === 'friend_create'}
        onCancel={async () => {
          clearTimeout(botRef.current); unsubRef.current?.();
          if (roomId) {
            try { await updateDoc(doc(db, 'rooms', roomId), { status: 'abandoned' }); } catch (e) {}
          }
          setRoomId(null); setRoomData(null); setScreen('modeSelect');
        }}
      />
    );
  }

  /* ── Game Over ── */
  if (screen === 'gameover') {
    if (isOnline && roomData) {
      const ops    = [roomData.player1, roomData.player2].filter(Boolean);
      const sc     = roomData.scores || {};
      const s1     = sc[ops[0]?.uid] || 0;
      const s2     = sc[ops[1]?.uid] || 0;
      const winUid = s1 > s2 ? ops[0]?.uid : s2 > s1 ? ops[1]?.uid : null;
      if (onGameEnd) onGameEnd(winUid === myUid);
      return <GameOver players={ops} scores={sc} myUid={myUid} isRTL={isRTL} theme={theme} onBack={onBack} />;
    }
    // local — اللاعب 0 هو الإنسان
    const localWon = (localScores[0] || 0) >= (localScores[1] || 0);
    if (onGameEnd) onGameEnd(localWon);
    return (
      <GameOver
        players={[{ uid: '0', name: localPlayers[0] }, { uid: '1', name: localPlayers[1] }]}
        scores={{ '0': localScores[0], '1': localScores[1] }}
        myUid="0" isRTL={isRTL} theme={theme} onBack={onBack}
      />
    );
  }

  /* ── GAME ── */

  // ── ONLINE game ──
  if (isOnline && roomData) {
    const ops2      = [roomData.player1, roomData.player2].filter(Boolean);
    const other     = ops2.find(p => p.uid !== myUid);
    const round     = roomData.round || 0;
    const status    = roomData.status;
    const rl        = isRTL ? `جولة ${round + 1} / ${TOTAL_ROUNDS}` : `Round ${round + 1} / ${TOTAL_ROUNDS}`;
    const drawerName= ops2.find(p => p.uid === roomData.drawerUid)?.name || '';

    // wordchoice
    if (status === 'wordchoice') {
      if (amIDrawer) {
        return (
          <View style={[s.flex1, { backgroundColor: theme.isCityTheme ? 'transparent' : theme.bg }]}>
            {renderHeader(rl, '', ops2[0]?.name, roomData.scores?.[ops2[0]?.uid] || 0, ops2[1]?.name, roomData.scores?.[ops2[1]?.uid] || 0)}
            <WordChoiceModal visible={true} words={roomData.wordChoices || []} onPick={handleOnlineWordPick} theme={theme} isRTL={isRTL} />
          </View>
        );
      }
      return (
        <View style={[s.flex1, { backgroundColor: theme.isCityTheme ? 'transparent' : theme.bg }]}>
          <StatusBar barStyle={theme.statusBar} />
          {renderHeader(rl, '', ops2[0]?.name, roomData.scores?.[ops2[0]?.uid] || 0, ops2[1]?.name, roomData.scores?.[ops2[1]?.uid] || 0)}
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <ActivityIndicator size="large" color={theme.accent} />
            <Text style={[{ color: theme.textSecondary, fontSize: 15 }]}>
              {isRTL ? `${drawerName} يختار الكلمة...` : `${drawerName} is choosing...`}
            </Text>
          </View>
        </View>
      );
    }

    // drawing
    if (status === 'drawing') {
      const roleText = amIDrawer
        ? (isRTL ? '✏️ أنت ترسم' : '✏️ You draw')
        : (isRTL ? '🤔 أنت تخمّن' : '🤔 You guess');
      return (
        <View style={[s.flex1, { backgroundColor: theme.isCityTheme ? 'transparent' : theme.bg }]}>
          <StatusBar barStyle={theme.statusBar} />
          {renderHeader(rl, roleText, ops2[0]?.name, roomData.scores?.[ops2[0]?.uid] || 0, ops2[1]?.name, roomData.scores?.[ops2[1]?.uid] || 0)}
          <TimerBar timeLeft={onlineTime} total={ROUND_TIME} />
          <ScrollView style={s.flex1} contentContainerStyle={s.gameContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={[s.section, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
              {amIDrawer ? (
                <>
                  <View style={[s.wordBadge, { backgroundColor: theme.accentSoft, borderColor: theme.accentBorder }]}>
                    <Text style={[s.wordBadgeTxt, { color: theme.accent }]}>{roomData.word}</Text>
                  </View>
                  <View style={[s.canvasCont, { borderColor: theme.border }]} {...pan.panHandlers}>
                    <DrawingCanvas strokes={strokes} currentStroke={currentStroke} />
                  </View>
                  {renderToolbar()}
                </>
              ) : (
                <>
                  <Text style={[s.sectionTitle, { color: theme.textPrimary }]}>
                    {isRTL ? `${drawerName} يرسم...` : `${drawerName} is drawing...`}
                  </Text>
                  <View style={[s.canvasCont, { borderColor: theme.border }]}>
                    <DrawingCanvas strokes={roomData.strokes || []} currentStroke={null} />
                  </View>
                  <Animated.View style={[s.guessRow, { transform: [{ translateX: shakeAnim }] }]}>
                    <TextInput
                      style={[s.guessInput, { backgroundColor: theme.bgInput, borderColor: theme.border, color: theme.textPrimary, textAlign: isRTL ? 'right' : 'left', flex: 1 }]}
                      placeholder={isRTL ? 'اكتب تخمينك...' : 'Type your guess...'}
                      placeholderTextColor={theme.textMuted}
                      value={onlineGuess} onChangeText={setOnlineGuess}
                      onSubmitEditing={handleOnlineGuess} returnKeyType="send"
                      autoCorrect={false} autoCapitalize="none"
                    />
                    <TouchableOpacity style={[s.guessBtn, { backgroundColor: theme.accent }]} onPress={handleOnlineGuess}>
                      <Text style={[s.guessBtnTxt, { color: theme.textOnAccent }]}>{isRTL ? 'تخمين' : 'Guess'}</Text>
                    </TouchableOpacity>
                  </Animated.View>
                </>
              )}
            </View>
          </ScrollView>
        </View>
      );
    }

    // result
    if (status === 'result') {
      const wn = ops2.find(p => p.uid === roomData.roundWinnerUid)?.name;
      const isLast = (round + 1) >= TOTAL_ROUNDS;
      return (
        <View style={[s.flex1, { backgroundColor: theme.isCityTheme ? 'transparent' : theme.bg }]}>
          {renderHeader(rl, '', ops2[0]?.name, roomData.scores?.[ops2[0]?.uid] || 0, ops2[1]?.name, roomData.scores?.[ops2[1]?.uid] || 0)}
          <RoundResult
            result={roomData.roundResult} word={roomData.word}
            winnerName={wn} isRTL={isRTL} theme={theme}
            onNext={handleOnlineNext}
            nextLabel={isLast ? (isRTL ? '🏆 النتيجة النهائية' : '🏆 Final Results') : undefined}
          />
        </View>
      );
    }

    // fallback
    return (
      <View style={[s.flex1, { backgroundColor: theme.isCityTheme ? 'transparent' : theme.bg, alignItems: 'center', justifyContent: 'center' }]}>
        <StatusBar barStyle={theme.statusBar} />
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  // ── LOCAL game ──
  const di = localRound % 2;
  const gi = 1 - di;
  const dn = localPlayers[di];
  const gn = localPlayers[gi];
  const rl2 = isRTL ? `جولة ${localRound + 1} / ${TOTAL_ROUNDS}` : `Round ${localRound + 1} / ${TOTAL_ROUNDS}`;
  const roleLocal = localPhase === 'drawing'
    ? (isRTL ? `✏️ ${dn} يرسم` : `✏️ ${dn} draws`) : '';

  return (
    <View style={[s.flex1, { backgroundColor: theme.isCityTheme ? 'transparent' : theme.bg }]}>
      <StatusBar barStyle={theme.statusBar} />
      {renderHeader(rl2, roleLocal, localPlayers[0], localScores[0], localPlayers[1], localScores[1])}

      {localPhase === 'drawing' && <TimerBar timeLeft={localTime} total={ROUND_TIME} />}

      <WordChoiceModal
        visible={localPhase === 'wordchoice'}
        words={localWords} onPick={handleLocalWordPick}
        theme={theme} isRTL={isRTL}
      />

      {localPhase === 'drawing' && (
        <ScrollView style={s.flex1} contentContainerStyle={s.gameContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Drawer */}
          <View style={[s.section, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
            <Text style={[s.sectionTitle, { color: theme.textPrimary }]}>
              {isRTL ? `🎨 ${dn} — ارسم:` : `🎨 ${dn} — Draw:`}
            </Text>
            <View style={[s.wordBadge, { backgroundColor: theme.accentSoft, borderColor: theme.accentBorder }]}>
              <Text style={[s.wordBadgeTxt, { color: theme.accent }]}>{localWord}</Text>
            </View>
            <View style={[s.canvasCont, { borderColor: theme.border }]} {...pan.panHandlers}>
              <DrawingCanvas strokes={strokes} currentStroke={currentStroke} />
            </View>
            {renderToolbar()}
          </View>

          {/* Guesser */}
          <View style={[s.section, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
            <Text style={[s.sectionTitle, { color: theme.textPrimary }]}>
              {isRTL ? `🤔 ${gn} — تخمين:` : `🤔 ${gn} — Guess:`}
            </Text>
            <Animated.View style={[s.guessRow, { transform: [{ translateX: shakeAnim }] }]}>
              <TextInput
                style={[s.guessInput, { backgroundColor: theme.bgInput, borderColor: theme.border, color: theme.textPrimary, textAlign: isRTL ? 'right' : 'left', flex: 1 }]}
                placeholder={isRTL ? 'اكتب تخمينك...' : 'Type your guess...'}
                placeholderTextColor={theme.textMuted}
                value={guessText} onChangeText={setGuessText}
                onSubmitEditing={handleLocalGuess} returnKeyType="send"
                autoCorrect={false} autoCapitalize="none"
              />
              <TouchableOpacity style={[s.guessBtn, { backgroundColor: theme.accent }]} onPress={handleLocalGuess}>
                <Text style={[s.guessBtnTxt, { color: theme.textOnAccent }]}>{isRTL ? 'تخمين' : 'Guess'}</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </ScrollView>
      )}

      {localPhase === 'result' && (
        <RoundResult
          result={localResult} word={localWord}
          winnerName={localResult === 'correct' ? gn : null}
          isRTL={isRTL} theme={theme} onNext={handleLocalNext}
          nextLabel={(localRound + 1 >= TOTAL_ROUNDS)
            ? (isRTL ? '🏆 النتيجة النهائية' : '🏆 Final Results') : undefined}
        />
      )}
    </View>
  );
}

// ══════════════════════════════════════════════════════════
//  Styles
// ══════════════════════════════════════════════════════════
const s = StyleSheet.create({
  flex1: { flex: 1 },

  exitBtnAbs: {
    position: 'absolute', top: Platform.OS === 'ios' ? 52 : 16, left: 16,
    width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18, zIndex: 10,
  },
  exitBtn:  { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18 },
  exitIcon: { fontSize: 18, fontWeight: '700' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'ios' ? 52 : 16,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  hCenter:  { flex: 1, alignItems: 'center' },
  hRound:   { fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },
  hRole:    { fontSize: 13, fontWeight: '700', marginTop: 1 },
  hScores:  { flexDirection: 'row', gap: 6 },
  sPill:    { alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  sPillVal: { fontSize: 16, fontWeight: '800' },
  sPillName:{ fontSize: 9, fontWeight: '600' },

  timerTrack: {
    height: 6, backgroundColor: 'rgba(128,128,128,0.15)',
    marginHorizontal: 16, marginTop: 4, borderRadius: 3, overflow: 'hidden',
  },
  timerFill: { height: '100%', borderRadius: 3, position: 'absolute', left: 0, top: 0 },
  timerNum:  { position: 'absolute', right: 4, fontSize: 10, fontWeight: '700', lineHeight: 16 },

  gameContent: { padding: 12, paddingBottom: 32, gap: 12 },
  section:     { borderRadius: 16, padding: 14, borderWidth: 1, gap: 10 },
  sectionTitle:{ fontSize: 13, fontWeight: '700' },
  wordBadge:   { alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  wordBadgeTxt:{ fontSize: 20, fontWeight: '800' },
  canvasCont:  { borderRadius: 12, borderWidth: 1, overflow: 'hidden', backgroundColor: '#ffffff' },
  colorDot:    { width: 28, height: 28, borderRadius: 14, marginRight: 6, borderWidth: 2.5 },
  brushBtn:    { width: 34, height: 34, borderRadius: 8, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  toolBtn:     { width: 34, height: 34, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  toolBtnTxt:  { fontSize: 15 },

  guessRow:    { flexDirection: 'row', gap: 8, alignItems: 'center' },
  guessInput:  { height: 46, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 15, fontWeight: '600' },
  guessBtn:    { height: 46, paddingHorizontal: 18, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  guessBtnTxt: { fontSize: 14, fontWeight: '700' },

  modalBg:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center' },
  wcCard:    { width: SW - 60, borderRadius: 20, padding: 24, borderWidth: 1.5, gap: 12, alignItems: 'stretch' },
  wcTitle:   { fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  wcBtn:     { paddingVertical: 14, borderRadius: 14, alignItems: 'center', borderWidth: 1 },
  wcBtnText: { fontSize: 20, fontWeight: '700' },

  resultOverlay:  { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  resultCard:     { width: SW - 60, borderRadius: 24, padding: 28, alignItems: 'center', borderWidth: 2, gap: 12 },
  resultEmoji:    { fontSize: 56 },
  resultTitle:    { fontSize: 22, fontWeight: '800', textAlign: 'center' },
  resultWordBox:  { width: '100%', borderRadius: 14, padding: 14, alignItems: 'center', gap: 4 },
  resultWordLabel:{ fontSize: 12, fontWeight: '600' },
  resultWordValue:{ fontSize: 26, fontWeight: '800' },
  nextBtn:        { marginTop: 6, paddingHorizontal: 40, paddingVertical: 13, borderRadius: 14 },
  nextBtnText:    { fontSize: 16, fontWeight: '700' },

  goCard:      { width: SW - 48, borderRadius: 24, padding: 28, alignItems: 'center', borderWidth: 1.5, gap: 10 },
  goEmoji:     { fontSize: 64 },
  goTitle:     { fontSize: 24, fontWeight: '800' },
  goWinner:    { fontSize: 18, fontWeight: '700' },
  goScoreRow:  { flexDirection: 'row', gap: 32, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 16, marginTop: 4, width: '100%', justifyContent: 'center' },
  goScoreCol:  { alignItems: 'center', gap: 4 },
  goScoreName: { fontSize: 13, fontWeight: '600' },
  goScoreVal:  { fontSize: 36, fontWeight: '900' },
  goBtn:       { marginTop: 8, paddingHorizontal: 40, paddingVertical: 13, borderRadius: 14 },
  goBtnText:   { fontSize: 16, fontWeight: '700' },

  modeContent:    { flexGrow: 1, alignItems: 'center', padding: 24, paddingTop: 70, paddingBottom: 40, gap: 14 },
  bigEmoji:       { fontSize: 64 },
  bigTitle:       { fontSize: 26, fontWeight: '900', letterSpacing: 0.5 },
  modeCard:       { width: '100%', flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 16, borderWidth: 1, gap: 12 },
  modeEmoji:      { fontSize: 28, width: 40, textAlign: 'center' },
  modeTxt:        { flex: 1 },
  modeCardTitle:  { fontSize: 16, fontWeight: '700' },
  modeCardSub:    { fontSize: 12, marginTop: 2 },
  modeArr:        { fontSize: 24, fontWeight: '300' },
  joinCard:       { width: '100%', flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 16, borderWidth: 1, gap: 12 },
  joinInput:      { height: 40, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 18, fontWeight: '700', letterSpacing: 2, marginTop: 6, textAlign: 'center' },
  joinErr:        { fontSize: 11, marginTop: 3 },
  joinBtn:        { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  joinBtnTxt:     { fontSize: 14, fontWeight: '700' },

  setupCard:  { width: '100%', borderRadius: 18, padding: 18, borderWidth: 1, gap: 8 },
  setupLbl:   { fontSize: 12, fontWeight: '600', letterSpacing: 0.4 },
  setupInput: { height: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 16, fontWeight: '600' },
  divider:    { height: StyleSheet.hairlineWidth, marginVertical: 4 },
  startBtn:   { width: '100%', paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  startBtnTxt:{ fontSize: 17, fontWeight: '800' },

  lobbyWrap:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  lobbyBigEmoji:{ fontSize: 72, marginBottom: 16 },
  lobbyTitle:   { fontSize: 22, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  lobbySub:     { fontSize: 14, textAlign: 'center', marginBottom: 20 },
  codeBox:      { paddingHorizontal: 32, paddingVertical: 16, borderRadius: 18, borderWidth: 2, alignItems: 'center', marginBottom: 24, gap: 4 },
  codeText:     { fontSize: 36, fontWeight: '900', letterSpacing: 6 },
  codeCopy:     { fontSize: 13 },
  dotsRow:      { flexDirection: 'row', gap: 8, marginBottom: 32 },
  dot:          { width: 10, height: 10, borderRadius: 5 },
  cancelBtn:    { paddingHorizontal: 28, paddingVertical: 11, borderRadius: 12, borderWidth: 1 },
  cancelBtnText:{ fontSize: 14, fontWeight: '600' },
});
