import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, StatusBar, ScrollView, TextInput,
  Alert, KeyboardAvoidingView, Platform, PanResponder,
  Dimensions,
} from 'react-native';
import { db } from './firebaseConfig';
import LeaveModal from './LeaveModal';
import {
  collection, doc, setDoc, onSnapshot,
  updateDoc, serverTimestamp, getDoc, deleteDoc,
} from 'firebase/firestore';

const { width: SCREEN_W } = Dimensions.get('window');
const CANVAS_SIZE = Math.min(SCREEN_W - 40, 360);
const ROUND_DURATION = 80; // ثانية
const POINTS_FAST = 100;
const POINTS_SLOW = 50;

// ── كلمات الرسم ──────────────────────────────────────────────
const WORDS = {
  حيوانات: ['قطة', 'كلب', 'فيل', 'زرافة', 'أسد', 'قرد', 'أرنب', 'بطة', 'سمكة', 'فراشة', 'نمر', 'حصان', 'دجاجة', 'بقرة', 'خروف'],
  طعام: ['بيتزا', 'برغر', 'تفاحة', 'موز', 'كيكة', 'قهوة', 'شاي', 'بيضة', 'خبز', 'شوكولاتة', 'آيسكريم', 'رز', 'شاورما', 'سمكة', 'عنب'],
  مكان: ['بيت', 'مدرسة', 'مستشفى', 'مطار', 'شارع', 'حديقة', 'بحر', 'جبل', 'صحراء', 'مطعم', 'مسجد', 'دكان', 'سوق', 'ملعب', 'قلعة'],
  أشياء: ['كرسي', 'طاولة', 'تلفاز', 'هاتف', 'سيارة', 'طائرة', 'مفتاح', 'قلم', 'كتاب', 'ساعة', 'نظارة', 'حقيبة', 'مصباح', 'مروحة', 'ثلاجة'],
  أفعال: ['يركض', 'يطير', 'يسبح', 'يرسم', 'ينام', 'يأكل', 'يضحك', 'يبكي', 'يقفز', 'يرقص'],
};

const ALL_WORDS = Object.values(WORDS).flat();

const COLORS = ['#fff', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#a855f7', '#ec4899', '#000'];
const SIZES = [3, 6, 10, 16];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateRoomCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ── لوحة الرسم ───────────────────────────────────────────────
function DrawingCanvas({ paths, onNewPath, onNewPoint, isDrawer, currentColor, brushSize }) {
  const canvasRef = useRef(null);
  const currentPath = useRef(null);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => isDrawer,
      onMoveShouldSetPanResponder: () => isDrawer,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const pathId = Date.now().toString();
        currentPath.current = { id: pathId, color: currentColor, size: brushSize, points: [{ x: locationX, y: locationY }] };
        onNewPath && onNewPath(currentPath.current);
      },
      onPanResponderMove: (evt) => {
        if (!currentPath.current) return;
        const { locationX, locationY } = evt.nativeEvent;
        const point = { x: locationX, y: locationY };
        currentPath.current.points.push(point);
        onNewPoint && onNewPoint(currentPath.current.id, point);
      },
      onPanResponderRelease: () => {
        currentPath.current = null;
      },
    })
  ).current;

  return (
    <View
      style={[cv.canvas, { width: CANVAS_SIZE, height: CANVAS_SIZE }]}
      {...panResponder.panHandlers}
    >
      {paths.map((path) => (
        <PathLine key={path.id} path={path} />
      ))}
    </View>
  );
}

function PathLine({ path }) {
  if (!path.points || path.points.length < 2) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {path.points.slice(1).map((pt, i) => {
        const prev = path.points[i];
        const dx = pt.x - prev.x;
        const dy = pt.y - prev.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        return (
          <View key={i} style={{
            position: 'absolute',
            left: prev.x,
            top: prev.y - path.size / 2,
            width: length,
            height: path.size,
            backgroundColor: path.color,
            borderRadius: path.size / 2,
            transform: [{ rotate: `${angle}deg` }, { translateX: 0 }],
            transformOrigin: '0 50%',
          }} />
        );
      })}
    </View>
  );
}

const cv = StyleSheet.create({
  canvas: {
    backgroundColor: '#1a1a3e',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#ffffff20',
    overflow: 'hidden',
    alignSelf: 'center',
  },
});

// ═══════════════════════════════════════════════════════════════
// ── وضع الجلسة (LOCAL) ─────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════
function LocalMode({ onBack }) {
  const [phase, setPhase] = useState('setup');
  const [playerName, setPlayerName] = useState('');
  const [players, setPlayers] = useState([]);
  const [currentDrawerIdx, setCurrentDrawerIdx] = useState(0);
  const [currentWord, setCurrentWord] = useState('');
  const [wordOptions, setWordOptions] = useState([]);
  const [paths, setPaths] = useState([]);
  const [guess, setGuess] = useState('');
  const [timeLeft, setTimeLeft] = useState(ROUND_DURATION);
  const [scores, setScores] = useState({});
  const [roundNum, setRoundNum] = useState(1);
  const [totalRounds, setTotalRounds] = useState(3);
  const [guessedPlayers, setGuessedPlayers] = useState([]);
  const [roundOrder, setRoundOrder] = useState([]);
  const [roundIdx, setRoundIdx] = useState(0);
  const [color, setColor] = useState('#fff');
  const [brushSize, setBrushSize] = useState(6);
  const [showLeave, setShowLeave] = useState(false);

  const timerRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [phase]);

  function addPlayer() {
    const name = playerName.trim();
    if (!name) return;
    if (players.length >= 8) return Alert.alert('', 'الحد الأقصى 8 لاعبين');
    if (players.find(p => p.name === name)) return Alert.alert('', 'الاسم موجود');
    setPlayers(prev => [...prev, { id: Date.now().toString(), name }]);
    setPlayerName('');
  }

  function startGame() {
    if (players.length < 2) return Alert.alert('', 'أضف لاعبين على الأقل');
    const order = [];
    for (let r = 0; r < totalRounds; r++) {
      shuffle(players).forEach(p => order.push(p.id));
    }
    setRoundOrder(order);
    setRoundIdx(0);
    const initScores = {};
    players.forEach(p => { initScores[p.id] = 0; });
    setScores(initScores);
    showWordChoice(order[0]);
  }

  function showWordChoice(drawerId) {
    const opts = shuffle(ALL_WORDS).slice(0, 3);
    setWordOptions(opts);
    setCurrentDrawerIdx(players.findIndex(p => p.id === drawerId));
    fadeAnim.setValue(0);
    setPhase('wordChoice');
  }

  function chooseWord(word) {
    setCurrentWord(word);
    setPaths([]);
    setGuessedPlayers([]);
    setTimeLeft(ROUND_DURATION);
    fadeAnim.setValue(0);
    setPhase('draw');
    startTimer();
  }

  function startTimer() {
    clearInterval(timerRef.current);
    let t = ROUND_DURATION;
    timerRef.current = setInterval(() => {
      t -= 1;
      setTimeLeft(t);
      if (t <= 0) {
        clearInterval(timerRef.current);
        endRound();
      }
    }, 1000);
  }

  function endRound() {
    clearInterval(timerRef.current);
    fadeAnim.setValue(0);
    setPhase('roundEnd');
  }

  function handleGuess(guesser) {
    const g = guess.trim();
    if (!g) return;
    if (g === currentWord) {
      const elapsed = ROUND_DURATION - timeLeft;
      const pts = elapsed < 30 ? POINTS_FAST : POINTS_SLOW;
      setScores(prev => ({ ...prev, [guesser.id]: (prev[guesser.id] || 0) + pts }));
      // الرسّام يأخذ نقاط أيضاً
      const drawer = players[currentDrawerIdx];
      setScores(prev => ({ ...prev, [drawer.id]: (prev[drawer.id] || 0) + 30 }));
      setGuessedPlayers(prev => [...prev, guesser.id]);
      setGuess('');
      Alert.alert('🎉 صح!', `+${pts} نقطة`);

      // إذا خمّن الجميع
      if (guessedPlayers.length + 1 >= players.length - 1) {
        clearInterval(timerRef.current);
        setTimeout(endRound, 800);
      }
    } else {
      Alert.alert('❌ خطأ', 'حاول مرة ثانية');
    }
  }

  function nextRound() {
    const nextIdx = roundIdx + 1;
    if (nextIdx >= roundOrder.length) {
      setPhase('end');
      return;
    }
    setRoundIdx(nextIdx);
    showWordChoice(roundOrder[nextIdx]);
  }

  function handleNewPath(path) {
    setPaths(prev => [...prev, path]);
  }

  function handleNewPoint(pathId, point) {
    setPaths(prev => prev.map(p =>
      p.id === pathId ? { ...p, points: [...p.points, point] } : p
    ));
  }

  function clearCanvas() { setPaths([]); }

  const drawer = players[currentDrawerIdx];
  const nonDrawers = players.filter(p => p.id !== drawer?.id);

  // ── إعداد ──
  if (phase === 'setup') return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.header}>
          <TouchableOpacity onPress={()=>setShowLeave(true)} style={[styles.backBtn, { borderColor: '#3b82f630' }]}>
            <Text style={[styles.backText, { color: '#3b82f6' }]}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerEmoji}>🎨</Text>
            <Text style={[styles.headerTitle, { color: '#3b82f6' }]}>رسم وتخمين — جلسة</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView contentContainerStyle={styles.setupContent} keyboardShouldPersistTaps="handled">
          <View style={[styles.rulesCard, { borderColor: '#3b82f630' }]}>
            <Text style={[styles.rulesTitle, { color: '#3b82f6' }]}>🖌️ كيف تلعب؟</Text>
            <Text style={styles.rulesText}>
              شخص يرسم كلمة والباقين يخمنون!{'\n'}
              الأسرع في التخمين ← أكثر نقاط.{'\n'}
              كل شخص يرسم دوره بالتناوب.
            </Text>
          </View>

          <View style={styles.inputRow}>
            <TouchableOpacity style={[styles.addBtn, { backgroundColor: '#3b82f6' }]} onPress={addPlayer}>
              <Text style={styles.addBtnText}>+ إضافة</Text>
            </TouchableOpacity>
            <TextInput
              style={[styles.input, { borderColor: '#3b82f630' }]}
              placeholder="اسم اللاعب..." placeholderTextColor="#3a3a60"
              value={playerName} onChangeText={setPlayerName}
              onSubmitEditing={addPlayer} textAlign="right"
            />
          </View>

          {players.map((p, i) => (
            <View key={p.id} style={[styles.playerChip, { borderColor: '#3b82f630' }]}>
              <TouchableOpacity onPress={() => setPlayers(prev => prev.filter(x => x.id !== p.id))} style={styles.chipRemove}>
                <Text style={styles.chipRemoveText}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.chipName}>{p.name}</Text>
              <Text style={[styles.chipNum, { backgroundColor: '#3b82f6' }]}>{i + 1}</Text>
            </View>
          ))}

          <View style={styles.roundsRow}>
            <Text style={styles.roundsLabel}>عدد الجولات:</Text>
            {[2, 3, 5].map(n => (
              <TouchableOpacity key={n}
                style={[styles.roundBtn, totalRounds === n && styles.roundBtnActive]}
                onPress={() => setTotalRounds(n)}>
                <Text style={[styles.roundBtnText, totalRounds === n && styles.roundBtnTextActive]}>{n}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {players.length >= 2 && (
            <TouchableOpacity style={[styles.startBtn, { backgroundColor: '#3b82f6' }]} onPress={startGame}>
              <Text style={styles.startBtnText}>🎨 ابدأ اللعبة</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );

  // ── اختيار الكلمة ──
  if (phase === 'wordChoice') return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.centerContent}>
        <Text style={styles.wordChoiceTitle}>🖌️ دور {drawer?.name}</Text>
        <Text style={styles.wordChoiceSub}>اختر كلمة للرسم (الآخرون لا ينظرون!)</Text>
        {wordOptions.map(w => (
          <TouchableOpacity key={w} style={styles.wordOptionBtn} onPress={() => chooseWord(w)}>
            <Text style={styles.wordOptionText}>{w}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // ── الرسم ──
  if (phase === 'draw') return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.drawHeader}>
        <View style={styles.timerBadge}>
          <Text style={[styles.timerText, timeLeft <= 15 && styles.timerRed]}>{timeLeft}s</Text>
        </View>
        <View style={styles.wordBadge}>
          <Text style={styles.wordBadgeText}>{currentWord}</Text>
        </View>
        <TouchableOpacity style={styles.clearBtn} onPress={clearCanvas}>
          <Text style={styles.clearBtnText}>🗑️</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.drawerLabel}>🖌️ {drawer?.name} يرسم</Text>

      <DrawingCanvas
        paths={paths}
        onNewPath={handleNewPath}
        onNewPoint={handleNewPoint}
        isDrawer={true}
        currentColor={color}
        brushSize={brushSize}
      />

      {/* أدوات */}
      <View style={styles.toolsRow}>
        {COLORS.map(c => (
          <TouchableOpacity key={c} style={[styles.colorBtn, { backgroundColor: c }, color === c && styles.colorBtnActive]}
            onPress={() => setColor(c)} />
        ))}
      </View>
      <View style={styles.toolsRow}>
        {SIZES.map(s => (
          <TouchableOpacity key={s} style={[styles.sizeBtn, brushSize === s && styles.sizeBtnActive]}
            onPress={() => setBrushSize(s)}>
            <View style={{ width: s * 2, height: s * 2, borderRadius: s, backgroundColor: color }} />
          </TouchableOpacity>
        ))}
      </View>

      {/* المخمّنون */}
      <ScrollView horizontal style={styles.guessersRow} contentContainerStyle={{ gap: 10, paddingHorizontal: 20 }}>
        {nonDrawers.map(p => (
          <View key={p.id} style={[styles.guesserChip, guessedPlayers.includes(p.id) && styles.guesserChipDone]}>
            <Text style={styles.guesserName}>{p.name}</Text>
            {guessedPlayers.includes(p.id) && <Text style={styles.guesserCheck}>✓</Text>}
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity style={styles.endRoundBtn} onPress={endRound}>
        <Text style={styles.endRoundBtnText}>إنهاء الدور ←</Text>
      </TouchableOpacity>
    </View>
  );

  // ── نهاية الجولة / تخمين ──
  if (phase === 'roundEnd') return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.centerContent}>
        <Text style={styles.revealWordTitle}>الكلمة كانت:</Text>
        <Text style={styles.revealWord}>{currentWord}</Text>
        <View style={styles.miniScores}>
          {[...players].sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0)).map(p => (
            <View key={p.id} style={styles.miniScoreRow}>
              <Text style={styles.miniScoreName}>{p.name}</Text>
              <Text style={styles.miniScorePts}>{scores[p.id] || 0} نقطة</Text>
            </View>
          ))}
        </View>
        <TouchableOpacity style={[styles.startBtn, { backgroundColor: '#3b82f6', marginTop: 16 }]} onPress={nextRound}>
          <Text style={styles.startBtnText}>الجولة التالية ←</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ── النهاية ──
  if (phase === 'end') {
    const sorted = [...players].sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0));
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <ScrollView contentContainerStyle={styles.endContent}>
          <Text style={styles.endTitle}>🏆 النتائج النهائية</Text>
          {sorted.map((p, i) => (
            <View key={p.id} style={styles.endRow}>
              <Text style={styles.endPos}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}</Text>
              <Text style={styles.endName}>{p.name}</Text>
              <Text style={styles.endPts}>{scores[p.id] || 0} نقطة</Text>
            </View>
          ))}
          <TouchableOpacity style={[styles.startBtn, { backgroundColor: '#3b82f6' }]} onPress={startGame}>
            <Text style={styles.startBtnText}>🔄 جولة جديدة</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.startBtn, styles.outlineBtn, { borderColor: '#3b82f650' }]} onPress={onBack}>
            <Text style={[styles.outlineBtnText, { color: '#3b82f6' }]}>🏠 الرئيسية</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return (
    <LeaveModal visible={showLeave} onCancel={()=>setShowLeave(false)} onConfirm={onBack} />
  );
}

// ═══════════════════════════════════════════════════════════════
// ── وضع الأونلاين ───────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════
function OnlineMode({ onBack, currentUser }) {
  const [phase, setPhase] = useState('lobby');
  const [roomCode, setRoomCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [roomData, setRoomData] = useState(null);
  const [paths, setPaths] = useState([]);
  const [guess, setGuess] = useState('');
  const [timeLeft, setTimeLeft] = useState(ROUND_DURATION);
  const [myId] = useState(currentUser?.uid || `guest_${Date.now()}`);
  const [myName] = useState(currentUser?.name || currentUser?.displayName || 'لاعب');
  const [color, setColor] = useState('#fff');
  const [brushSize, setBrushSize] = useState(6);
  const [wordOptions, setWordOptions] = useState([]);
  const [showLeave, setShowLeave] = useState(false);

  const timerRef = useRef(null);
  const roomRef = useRef(null);
  const unsub = useRef(null);

  useEffect(() => () => {
    clearInterval(timerRef.current);
    if (unsub.current) unsub.current();
  }, []);

  async function createRoom() {
    const code = generateRoomCode();
    setRoomCode(code);
    const ref = doc(db, 'drawguess_rooms', code);
    roomRef.current = ref;
    const roomObj = {
      code,
      hostId: myId,
      players: [{ id: myId, name: myName, score: 0 }],
      phase: 'waiting',
      currentDrawerId: myId,
      currentWord: '',
      wordOptions: shuffle(ALL_WORDS).slice(0, 3),
      round: 1,
      maxRounds: 3,
      paths: [],
      guessedIds: [],
      createdAt: serverTimestamp(),
    };
    await setDoc(ref, roomObj);
    subscribeRoom(code);
    setPhase('waiting');
  }

  async function joinRoom() {
    const code = inputCode.trim();
    if (code.length !== 6) return Alert.alert('', 'أدخل كود صحيح من 6 أرقام');
    const ref = doc(db, 'drawguess_rooms', code);
    const snap = await getDoc(ref);
    if (!snap.exists()) return Alert.alert('', 'الغرفة غير موجودة');
    const data = snap.data();
    if (data.phase !== 'waiting') return Alert.alert('', 'اللعبة بدأت مسبقاً');
    if (data.players.length >= 8) return Alert.alert('', 'الغرفة ممتلئة');
    setRoomCode(code);
    roomRef.current = ref;
    const newPlayers = [...data.players, { id: myId, name: myName, score: 0 }];
    await updateDoc(ref, { players: newPlayers });
    subscribeRoom(code);
    setPhase('waiting');
  }

  function subscribeRoom(code) {
    if (unsub.current) unsub.current();
    const ref = doc(db, 'drawguess_rooms', code);
    unsub.current = onSnapshot(ref, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      setRoomData(data);
      if (data.phase === 'game') {
        setPaths(data.paths || []);
        setPhase('game');
      }
      if (data.phase === 'end') setPhase('end');
    });
  }

  async function startOnlineGame() {
    if (!roomRef.current) return;
    await updateDoc(roomRef.current, { phase: 'game' });
  }

  async function handleOnlinePath(path) {
    if (!roomRef.current) return;
    const newPaths = [...(roomData?.paths || []), path];
    await updateDoc(roomRef.current, { paths: newPaths });
  }

  async function handleOnlinePoint(pathId, point) {
    if (!roomRef.current || !roomData) return;
    const updatedPaths = (roomData.paths || []).map(p =>
      p.id === pathId ? { ...p, points: [...p.points, point] } : p
    );
    await updateDoc(roomRef.current, { paths: updatedPaths });
  }

  async function clearOnlineCanvas() {
    if (!roomRef.current) return;
    await updateDoc(roomRef.current, { paths: [] });
  }

  async function chooseOnlineWord(word) {
    if (!roomRef.current) return;
    await updateDoc(roomRef.current, { currentWord: word, guessedIds: [], paths: [] });
  }

  async function submitOnlineGuess() {
    if (!roomData || !guess.trim()) return;
    const g = guess.trim();
    setGuess('');
    if (g === roomData.currentWord) {
      const elapsed = ROUND_DURATION - timeLeft;
      const pts = elapsed < 30 ? POINTS_FAST : POINTS_SLOW;
      const updatedPlayers = roomData.players.map(p =>
        p.id === myId ? { ...p, score: (p.score || 0) + pts } : p
      );
      const guessedIds = [...(roomData.guessedIds || []), myId];
      await updateDoc(roomRef.current, { players: updatedPlayers, guessedIds });
      Alert.alert('🎉 صح!', `+${pts} نقطة`);
    } else {
      Alert.alert('❌ خطأ', 'حاول مرة ثانية');
    }
  }

  const isHost = roomData?.hostId === myId;
  const isDrawer = roomData?.currentDrawerId === myId;
  const drawer = roomData?.players?.find(p => p.id === roomData?.currentDrawerId);

  // ── اللوبي ──
  if (phase === 'lobby') return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={[styles.backBtn, { borderColor: '#a855f730' }]}>
          <Text style={[styles.backText, { color: '#a855f7' }]}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerEmoji}>🌐</Text>
          <Text style={[styles.headerTitle, { color: '#a855f7' }]}>رسم وتخمين — أونلاين</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>
      <View style={styles.lobbyContent}>
        <TouchableOpacity style={[styles.startBtn, { backgroundColor: '#a855f7' }]} onPress={createRoom}>
          <Text style={styles.startBtnText}>🏠 أنشئ غرفة جديدة</Text>
        </TouchableOpacity>
        <Text style={styles.orText}>أو</Text>
        <TextInput
          style={[styles.input, { borderColor: '#a855f730', textAlign: 'center', fontSize: 22, letterSpacing: 6 }]}
          placeholder="أدخل كود الغرفة"
          placeholderTextColor="#3a3a60"
          value={inputCode}
          onChangeText={setInputCode}
          keyboardType="number-pad"
          maxLength={6}
        />
        <TouchableOpacity style={[styles.startBtn, { backgroundColor: '#6d28d9' }]} onPress={joinRoom}>
          <Text style={styles.startBtnText}>🚪 انضم للغرفة</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ── انتظار ──
  if (phase === 'waiting') return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.centerContent}>
        <Text style={styles.roomCodeLabel}>كود الغرفة:</Text>
        <Text style={styles.roomCodeText}>{roomCode}</Text>
        <Text style={styles.shareHint}>شارك الكود مع أصدقائك</Text>
        <View style={styles.waitingPlayers}>
          {(roomData?.players || []).map(p => (
            <View key={p.id} style={styles.waitingChip}>
              <Text style={styles.waitingName}>{p.name}</Text>
              {p.id === roomData?.hostId && <Text style={styles.hostBadge}>مضيف</Text>}
            </View>
          ))}
        </View>
        {isHost && (roomData?.players?.length || 0) >= 2 && (
          <TouchableOpacity style={[styles.startBtn, { backgroundColor: '#a855f7', marginTop: 20 }]} onPress={startOnlineGame}>
            <Text style={styles.startBtnText}>🎨 ابدأ اللعبة</Text>
          </TouchableOpacity>
        )}
        {!isHost && <Text style={styles.waitingMsg}>في انتظار المضيف ليبدأ اللعبة...</Text>}
        <TouchableOpacity style={[styles.startBtn, styles.outlineBtn, { borderColor: '#a855f750', marginTop: 12 }]} onPress={() => {
          if (unsub.current) unsub.current();
          setPhase('lobby');
        }}>
          <Text style={[styles.outlineBtnText, { color: '#a855f7' }]}>مغادرة الغرفة</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ── لعبة أونلاين ──
  if (phase === 'game' && roomData) {
    const word = roomData.currentWord;
    const showWordChoice = isDrawer && !word;

    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.drawHeader}>
          <Text style={[styles.timerText, { color: '#a855f7' }]}>جولة {roomData.round}/{roomData.maxRounds}</Text>
          <View style={styles.wordBadge}>
            <Text style={styles.wordBadgeText}>
              {isDrawer ? word || '...' : word ? '_'.repeat(word.length) : '...'}
            </Text>
          </View>
          <Text style={[styles.drawerLabel, { fontSize: 12 }]}>🖌️ {drawer?.name}</Text>
        </View>

        {showWordChoice && (
          <View style={styles.wordChoiceOverlay}>
            <Text style={styles.wordChoiceTitle}>اختر كلمة للرسم:</Text>
            {(roomData.wordOptions || []).map(w => (
              <TouchableOpacity key={w} style={styles.wordOptionBtn} onPress={() => chooseOnlineWord(w)}>
                <Text style={styles.wordOptionText}>{w}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <DrawingCanvas
          paths={paths}
          onNewPath={isDrawer ? handleOnlinePath : undefined}
          onNewPoint={isDrawer ? handleOnlinePoint : undefined}
          isDrawer={isDrawer}
          currentColor={color}
          brushSize={brushSize}
        />

        {isDrawer && (
          <>
            <View style={styles.toolsRow}>
              {COLORS.map(c => (
                <TouchableOpacity key={c} style={[styles.colorBtn, { backgroundColor: c }, color === c && styles.colorBtnActive]}
                  onPress={() => setColor(c)} />
              ))}
            </View>
            <TouchableOpacity style={styles.clearBtn} onPress={clearOnlineCanvas}>
              <Text style={styles.clearBtnText}>🗑️ مسح</Text>
            </TouchableOpacity>
          </>
        )}

        {!isDrawer && !roomData.guessedIds?.includes(myId) && (
          <View style={styles.guessInputRow}>
            <TouchableOpacity style={[styles.addBtn, { backgroundColor: '#a855f7' }]} onPress={submitOnlineGuess}>
              <Text style={styles.addBtnText}>تخمين</Text>
            </TouchableOpacity>
            <TextInput
              style={[styles.input, { flex: 1, borderColor: '#a855f730' }]}
              placeholder="اكتب تخمينك..."
              placeholderTextColor="#3a3a60"
              value={guess}
              onChangeText={setGuess}
              onSubmitEditing={submitOnlineGuess}
              textAlign="right"
            />
          </View>
        )}

        {roomData.guessedIds?.includes(myId) && (
          <View style={styles.guessedBanner}>
            <Text style={styles.guessedText}>✓ خمّنت الكلمة! انتظر الآخرين</Text>
          </View>
        )}

        <ScrollView horizontal style={styles.onlineScores} contentContainerStyle={{ gap: 10, paddingHorizontal: 20 }}>
          {(roomData.players || []).sort((a, b) => b.score - a.score).map(p => (
            <View key={p.id} style={[styles.onlineScoreChip, p.id === myId && styles.myScoreChip]}>
              <Text style={styles.onlineScoreName}>{p.name}</Text>
              <Text style={styles.onlineScorePts}>{p.score || 0}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  // ── نهاية أونلاين ──
  if (phase === 'end' && roomData) {
    const sorted = [...(roomData.players || [])].sort((a, b) => b.score - a.score);
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <ScrollView contentContainerStyle={styles.endContent}>
          <Text style={styles.endTitle}>🏆 النتائج</Text>
          {sorted.map((p, i) => (
            <View key={p.id} style={[styles.endRow, p.id === myId && { borderColor: '#a855f750' }]}>
              <Text style={styles.endPos}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}</Text>
              <Text style={styles.endName}>{p.name}</Text>
              <Text style={styles.endPts}>{p.score || 0} نقطة</Text>
            </View>
          ))}
          <TouchableOpacity style={[styles.startBtn, styles.outlineBtn, { borderColor: '#a855f750', marginTop: 16 }]} onPress={() => {
            if (unsub.current) unsub.current();
            onBack();
          }}>
            <Text style={[styles.outlineBtnText, { color: '#a855f7' }]}>🏠 الرئيسية</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return (
    <LeaveModal visible={showLeave} onCancel={()=>setShowLeave(false)} onConfirm={()=>{if(unsub.current)unsub.current();onBack();}} />
  );
}

// ═══════════════════════════════════════════════════════════════
// ── الشاشة الرئيسية: اختيار النمط ──────────────────────────────
// ═══════════════════════════════════════════════════════════════
export default function DrawGuessScreen({ onBack, currentUser, mode }) {
  const [selectedMode, setSelectedMode] = useState(mode || null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  if (selectedMode === 'local') return <LocalMode onBack={() => setSelectedMode(null)} />;
  if (selectedMode === 'online') return <OnlineMode onBack={() => setSelectedMode(null)} currentUser={currentUser} />;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#06061a" />
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerEmoji}>🎨</Text>
          <Text style={styles.headerTitle}>رسم وتخمين</Text>
        </View>
        <View style={{ width: 40 }} />
      </Animated.View>

      <Animated.View style={[styles.modeContent, { opacity: fadeAnim }]}>
        <Text style={styles.modeTitle}>اختر طريقة اللعب</Text>

        <TouchableOpacity style={styles.modeCard} onPress={() => setSelectedMode('local')}>
          <Text style={styles.modeEmoji}>🏠</Text>
          <View style={styles.modeInfo}>
            <Text style={styles.modeName}>جلسة</Text>
            <Text style={styles.modeDesc}>العب مع من حولك بجهاز واحد</Text>
          </View>
          <Text style={styles.modeArrow}>←</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.modeCard, styles.modeCardOnline]} onPress={() => setSelectedMode('online')}>
          <Text style={styles.modeEmoji}>🌐</Text>
          <View style={styles.modeInfo}>
            <Text style={[styles.modeName, { color: '#a855f7' }]}>أونلاين</Text>
            <Text style={styles.modeDesc}>أنشئ غرفة أو انضم بكود</Text>
          </View>
          <Text style={[styles.modeArrow, { color: '#a855f7' }]}>←</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ── الستايلات ────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#06061a', paddingTop: 56 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20, marginBottom: 16,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#0f0f2e',
    borderWidth: 1, borderColor: '#ffffff20',
    alignItems: 'center', justifyContent: 'center',
  },
  backText: { color: '#a78bfa', fontSize: 20, fontWeight: '700' },
  headerCenter: { alignItems: 'center', gap: 2 },
  headerEmoji: { fontSize: 24 },
  headerTitle: { color: '#a78bfa', fontSize: 16, fontWeight: '900' },

  setupContent: { paddingHorizontal: 20, paddingBottom: 60, gap: 12 },
  rulesCard: {
    backgroundColor: '#0f0f2e', borderRadius: 16, borderWidth: 1.5,
    padding: 16, gap: 8,
  },
  rulesTitle: { fontWeight: '800', fontSize: 15, textAlign: 'center' },
  rulesText: { color: '#8080aa', fontSize: 13, lineHeight: 22, textAlign: 'center' },

  inputRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  input: {
    flex: 1, backgroundColor: '#0f0f2e', borderWidth: 1.5,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    color: '#fff', fontSize: 15,
  },
  addBtn: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  addBtnText: { color: '#000', fontWeight: '900', fontSize: 14 },
  playerChip: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f0f2e',
    borderRadius: 12, borderWidth: 1, padding: 12, gap: 10,
  },
  chipNum: {
    width: 26, height: 26, borderRadius: 8, textAlign: 'center',
    lineHeight: 26, color: '#000', fontWeight: '900', fontSize: 13,
  },
  chipName: { flex: 1, color: '#fff', fontSize: 15, fontWeight: '600' },
  chipRemove: {
    width: 26, height: 26, borderRadius: 8, backgroundColor: '#ef444420',
    alignItems: 'center', justifyContent: 'center',
  },
  chipRemoveText: { color: '#ef4444', fontWeight: '700', fontSize: 12 },

  roundsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center' },
  roundsLabel: { color: '#8080aa', fontSize: 14 },
  roundBtn: {
    width: 40, height: 40, borderRadius: 10, backgroundColor: '#0f0f2e',
    borderWidth: 1, borderColor: '#ffffff20', alignItems: 'center', justifyContent: 'center',
  },
  roundBtnActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  roundBtnText: { color: '#5a5a80', fontWeight: '700' },
  roundBtnTextActive: { color: '#fff' },

  startBtn: { borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 8 },
  startBtnText: { color: '#000', fontWeight: '900', fontSize: 16 },
  outlineBtn: { backgroundColor: 'transparent', borderWidth: 1.5 },
  outlineBtnText: { fontWeight: '900', fontSize: 16 },

  // اختيار كلمة
  centerContent: { flex: 1, padding: 20, justifyContent: 'center', alignItems: 'center', gap: 16 },
  wordChoiceTitle: { color: '#fff', fontSize: 20, fontWeight: '900', textAlign: 'center' },
  wordChoiceSub: { color: '#5a5a80', fontSize: 13, textAlign: 'center' },
  wordOptionBtn: {
    backgroundColor: '#0f0f2e', borderRadius: 16, borderWidth: 1.5,
    borderColor: '#3b82f650', padding: 18, width: '100%', alignItems: 'center',
  },
  wordOptionText: { color: '#3b82f6', fontSize: 20, fontWeight: '800' },

  // رسم
  drawHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, marginBottom: 8,
  },
  timerBadge: {
    backgroundColor: '#0f0f2e', borderRadius: 10, padding: 8,
    borderWidth: 1, borderColor: '#ffffff20',
  },
  timerText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  timerRed: { color: '#ef4444' },
  wordBadge: {
    backgroundColor: '#0f0f2e', borderRadius: 10, padding: 8,
    borderWidth: 1, borderColor: '#ffffff20',
  },
  wordBadgeText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 2 },
  clearBtn: {
    backgroundColor: '#0f0f2e', borderRadius: 10, padding: 8,
    borderWidth: 1, borderColor: '#ef444430',
  },
  clearBtnText: { color: '#ef4444', fontSize: 14 },
  drawerLabel: { color: '#8080aa', fontSize: 13, textAlign: 'center', marginBottom: 4 },

  toolsRow: {
    flexDirection: 'row', justifyContent: 'center', gap: 8,
    paddingHorizontal: 20, marginTop: 8,
  },
  colorBtn: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 1, borderColor: '#ffffff30',
  },
  colorBtnActive: { borderWidth: 3, borderColor: '#fff', transform: [{ scale: 1.2 }] },
  sizeBtn: {
    width: 40, height: 40, borderRadius: 10, backgroundColor: '#0f0f2e',
    borderWidth: 1, borderColor: '#ffffff20',
    alignItems: 'center', justifyContent: 'center',
  },
  sizeBtnActive: { borderColor: '#fff', borderWidth: 2 },

  guessersRow: { marginTop: 8, maxHeight: 50 },
  guesserChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#0f0f2e', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: '#ffffff15',
  },
  guesserChipDone: { borderColor: '#10b98150', backgroundColor: '#10b98110' },
  guesserName: { color: '#8080aa', fontSize: 13 },
  guesserCheck: { color: '#10b981', fontWeight: '700' },

  endRoundBtn: {
    margin: 16, backgroundColor: '#3b82f6', borderRadius: 14,
    padding: 14, alignItems: 'center',
  },
  endRoundBtnText: { color: '#fff', fontWeight: '900', fontSize: 15 },

  // نهاية جولة
  revealWordTitle: { color: '#8080aa', fontSize: 16 },
  revealWord: { color: '#fff', fontSize: 32, fontWeight: '900' },
  miniScores: { width: '100%', gap: 8 },
  miniScoreRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: '#0f0f2e', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#ffffff15',
  },
  miniScoreName: { color: '#fff', fontWeight: '600' },
  miniScorePts: { color: '#3b82f6', fontWeight: '700' },

  // نهاية
  endContent: { paddingHorizontal: 20, paddingBottom: 60, gap: 12, paddingTop: 20 },
  endTitle: { color: '#fff', fontSize: 22, fontWeight: '900', textAlign: 'center' },
  endRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#0f0f2e', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#ffffff15',
  },
  endPos: { fontSize: 22, width: 34 },
  endName: { flex: 1, color: '#fff', fontSize: 16, fontWeight: '700' },
  endPts: { color: '#3b82f6', fontSize: 15, fontWeight: '700' },

  // مختار النمط
  modeContent: { flex: 1, paddingHorizontal: 20, gap: 16, justifyContent: 'center' },
  modeTitle: { color: '#8080aa', fontSize: 16, textAlign: 'center', marginBottom: 8 },
  modeCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#0f0f2e', borderRadius: 20,
    borderWidth: 1.5, borderColor: '#3b82f640', padding: 20,
  },
  modeCardOnline: { borderColor: '#a855f740' },
  modeEmoji: { fontSize: 36 },
  modeInfo: { flex: 1, gap: 4 },
  modeName: { color: '#3b82f6', fontSize: 18, fontWeight: '900' },
  modeDesc: { color: '#5a5a80', fontSize: 13 },
  modeArrow: { color: '#3b82f6', fontSize: 22, fontWeight: '700' },

  // أونلاين
  lobbyContent: { flex: 1, padding: 20, gap: 14, justifyContent: 'center' },
  orText: { color: '#3a3a60', textAlign: 'center', fontSize: 16 },
  roomCodeLabel: { color: '#8080aa', fontSize: 16 },
  roomCodeText: { color: '#a855f7', fontSize: 48, fontWeight: '900', letterSpacing: 8 },
  shareHint: { color: '#3a3a60', fontSize: 13 },
  waitingPlayers: { gap: 10, width: '100%' },
  waitingChip: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#0f0f2e', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#a855f730',
  },
  waitingName: { color: '#fff', fontWeight: '600', fontSize: 15 },
  hostBadge: {
    color: '#a855f7', fontSize: 11, fontWeight: '700',
    backgroundColor: '#a855f720', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  waitingMsg: { color: '#3a3a60', fontSize: 14, textAlign: 'center' },
  wordChoiceOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#06061aee', zIndex: 10,
    justifyContent: 'center', alignItems: 'center', gap: 14, padding: 30,
  },
  guessInputRow: {
    flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginTop: 8,
  },
  guessedBanner: {
    backgroundColor: '#10b98120', margin: 16, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#10b98140',
  },
  guessedText: { color: '#10b981', textAlign: 'center', fontWeight: '700' },
  onlineScores: { maxHeight: 55, marginTop: 6 },
  onlineScoreChip: {
    backgroundColor: '#0f0f2e', borderRadius: 10, padding: 10,
    alignItems: 'center', gap: 4, minWidth: 70,
    borderWidth: 1, borderColor: '#ffffff15',
  },
  myScoreChip: { borderColor: '#a855f750', backgroundColor: '#a855f710' },
  onlineScoreName: { color: '#8080aa', fontSize: 11 },
  onlineScorePts: { color: '#fff', fontWeight: '900', fontSize: 14 },
});
