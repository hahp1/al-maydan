import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, StatusBar, ScrollView, Alert
} from 'react-native';

// ── بنك الكلمات ──────────────────────────────────────────────
const WORDS = {
  // ── مشاهير عالميون (60) ──────────────────────────────────────
  مشاهير: [
    'محمد علي كلاي', 'ميسي', 'كريستيانو رونالدو', 'أم كلثوم', 'فيروز',
    'عادل إمام', 'براد بيت', 'ستيف جوبز', 'إيلون ماسك', 'نيلسون مانديلا',
    'ألبرت أينشتاين', 'نابليون', 'كليوباترا', 'شكسبير', 'بيتهوفن',
    'مايكل جاكسون', 'مارادونا', 'محمد صلاح', 'أوباما', 'هيتلر',
    'بيل غيتس', 'ماريلين مونرو', 'ليوناردو دافنشي', 'غاندي', 'ماريا كوري',
    'ستيفن هوكينج', 'إلفيس بريسلي', 'أرسطو', 'سقراط', 'يوليوس قيصر',
    'تايغر وودز', 'لبرون جيمس', 'أوبرا وينفري', 'جاكي شان', 'بروس لي',
    'تشارلي شابلن', 'ألفريد هيتشكوك', 'ستيفن سبيلبرغ', 'بيكاسو', 'موزارت',
    'إسحاق نيوتن', 'داروين', 'فرويد', 'ماركوني', 'توماس إيديسون',
    'رايت براذرز', 'نيل أرمسترونغ', 'يوري غاغارين', 'مدام تيريزا', 'لينكولن',
    'تشي غيفارا', 'فيدل كاسترو', 'لينين', 'ستالين', 'ملكة إليزابيث',
    'ديانا', 'هاري بوتر', 'جاستن بيبر', 'ريهانا', 'بيونسيه',
  ],

  // ── مشاهير عرب (50) ──────────────────────────────────────────
  مشاهير_عرب: [
    'عبدالحليم حافظ', 'وردة الجزائرية', 'نجاة الصغيرة', 'صباح', 'ماجدة الرومي',
    'كاظم الساهر', 'عمرو دياب', 'محمد عبده', 'طلال مداح', 'فيصل علوي',
    'رابح صقر', 'عبادي الجوهر', 'نوال الكويتية', 'ديانا حداد', 'أصالة',
    'نانسي عجرم', 'إليسا', 'هيفاء وهبي', 'نجوى كرم', 'ماجدة',
    'يوسف شاهين', 'عمر الشريف', 'فاتن حمامة', 'سعاد حسني', 'نادية لطفي',
    'أحمد زكي', 'محمود عبدالعزيز', 'نور الشريف', 'يحيى الفخراني', 'حسين فهمي',
    'مني زكي', 'غادة عادل', 'هند صبري', 'يسرا', 'ليلى علوي',
    'جمال عبدالناصر', 'أنور السادات', 'ياسر عرفات', 'الملك فيصل', 'الملك عبدالعزيز',
    'زياد الرحباني', 'مرسيل خليفة', 'فيروز', 'وديع الصافي', 'صباح فخري',
    'أبو بكر سالم', 'محمد حمام', 'حسين الجسمي', 'عبدالله الرويشد', 'ميحد حمد',
  ],

  // ── شخصيات تاريخية (40) ──────────────────────────────────────
  تاريخيون: [
    'صلاح الدين الأيوبي', 'هارون الرشيد', 'المعتصم بالله', 'عمر بن الخطاب', 'خالد بن الوليد',
    'طارق بن زياد', 'ابن بطوطة', 'ابن خلدون', 'ابن سينا', 'الخوارزمي',
    'الرازي', 'البيروني', 'عمر الخيام', 'المتنبي', 'الجاحظ',
    'هولاكو', 'جنكيز خان', 'تيمورلنك', 'سليمان القانوني', 'محمد الفاتح',
    'ملكة سبأ', 'هرقل', 'الإسكندر الأكبر', 'أغسطس قيصر', 'هانيبال',
    'ريتشارد قلب الأسد', 'جان دارك', 'كريستوف كولومبس', 'ماجلان', 'فاسكو دي غاما',
    'شارلمان', 'أتيلا', 'سبارتاكوس', 'رمسيس الثاني', 'أخناتون',
    'نفرتيتي', 'توت عنخ آمون', 'بطليموس', 'أرخميدس', 'أفلاطون',
  ],

  // ── رياضيون (40) ─────────────────────────────────────────────
  رياضيون: [
    'محمد صلاح', 'ميسي', 'كريستيانو رونالدو', 'مارادونا', 'بيليه',
    'زيدان', 'رونالدو البرازيلي', 'رونالدينيو', 'كاكا', 'نيمار',
    'مبابي', 'هالاند', 'لبرون جيمس', 'مايكل جوردان', 'كوبي براينت',
    'محمد علي كلاي', 'تايسون', 'أنتوني جوشوا', 'تايغر وودز', 'روجر فيدرر',
    'رافاييل نادال', 'نوفاك ديوكوفيتش', 'سيرينا ويليامز', 'ماريا شارابوفا', 'مايكل فيلبس',
    'يوسين بولت', 'كارل لويس', 'أيرتون سينا', 'مايكل شوماخر', 'لويس هاميلتون',
    'غريتزكي', 'كريستيان روسي', 'لانس أرمسترونغ', 'علي بن محمد', 'عمر عبدالرحمن',
    'عبدالله الطيب', 'سامي الجابر', 'ياسر القحطاني', 'شلبي حسن', 'عمر السومة',
  ],

  // ── حيوانات (50) ─────────────────────────────────────────────
  حيوانات: [
    'أسد', 'فيل', 'زرافة', 'بطريق', 'دلفين', 'قرد', 'نمر', 'تمساح',
    'ببغاء', 'خروف', 'جمل', 'حصان', 'ذئب', 'ثعلب', 'أرنب',
    'قنفذ', 'خفاش', 'حوت', 'قرش', 'كنغر',
    'غوريلا', 'فهد', 'دب قطبي', 'حمار وحشي', 'وحيد القرن',
    'أخطبوط', 'سلحفاة', 'طاووس', 'نعامة', 'حمامة',
    'عقرب', 'كوالا', 'باندا', 'بومة', 'أفعى',
    'غزال', 'فقمة', 'دب بني', 'يمامة', 'خنزير بري',
    'كركدن', 'لبؤة', 'ضبع', 'نمس', 'وعل',
    'جرو', 'قطة برية', 'سمكة قرش', 'ثعبان الملك', 'طائر الفلامينغو',
  ],

  // ── أماكن وصروح (50) ─────────────────────────────────────────
  أماكن: [
    'برج إيفل', 'الكعبة المشرفة', 'الأهرامات', 'برج خليفة', 'تمثال الحرية',
    'الكولوسيوم', 'سور الصين', 'أبو سمبل', 'بيج بن', 'ساحة تيانانمن',
    'شلالات نياغارا', 'جبل فوجي', 'البتراء', 'ماتشو بيتشو', 'برج بيزا المائل',
    'تاج محل', 'الكرملين', 'البيت الأبيض', 'أوبرا سيدني', 'جسر البوابة الذهبية',
    'أنغكور وات', 'جبل إيفرست', 'الصحراء الكبرى', 'الحرم النبوي', 'البحر الميت',
    'جزيرة المالديف', 'الأكروبول', 'برج لندن', 'قصر باكنغهام', 'مدينة البندقية',
    'مدينة بومبي', 'الريف الأيرلندي', 'منطقة الساحل العاجي', 'جزيرة هاواي', 'جزيرة سنتوريني',
    'نهر الأمازون', 'نهر النيل', 'بحيرة تيتيكاكا', 'غابة الأمازون', 'منطقة الفيوم',
    'مدينة شنغهاي', 'برج سيول', 'جسر البوسفور', 'بازار إسطنبول', 'متحف اللوفر',
    'قصر فرساي', 'كازينو مونت كارلو', 'جزيرة سنغافورة', 'بوابة الهند', 'خليج هالونغ',
  ],

  // ── دول (60) ──────────────────────────────────────────────────
  دول: [
    'السعودية', 'مصر', 'فرنسا', 'أمريكا', 'الصين',
    'اليابان', 'البرازيل', 'روسيا', 'ألمانيا', 'إيطاليا',
    'الهند', 'أستراليا', 'كندا', 'المكسيك', 'إسبانيا',
    'تركيا', 'إيران', 'باكستان', 'نيجيريا', 'جنوب أفريقيا',
    'إندونيسيا', 'تايلاند', 'المغرب', 'الجزائر', 'العراق',
    'الكويت', 'الإمارات', 'قطر', 'سويسرا', 'السويد',
    'البرتغال', 'هولندا', 'اليونان', 'بولندا', 'كوريا الجنوبية',
    'الأرجنتين', 'كولومبيا', 'كينيا', 'إثيوبيا', 'نيوزيلندا',
    'ليبيا', 'تونس', 'سوريا', 'لبنان', 'الأردن',
    'اليمن', 'عُمان', 'البحرين', 'أذربيجان', 'أوكرانيا',
    'بلجيكا', 'النمسا', 'المجر', 'تشيكيا', 'رومانيا',
    'الفلبين', 'ماليزيا', 'فيتنام', 'بنغلاديش', 'سريلانكا',
  ],

  // ── عواصم (50) ───────────────────────────────────────────────
  عواصم: [
    'الرياض', 'القاهرة', 'باريس', 'واشنطن', 'بكين',
    'طوكيو', 'برازيليا', 'موسكو', 'برلين', 'روما',
    'نيودلهي', 'كانبيرا', 'أوتاوا', 'مكسيكو سيتي', 'مدريد',
    'أنقرة', 'طهران', 'إسلام آباد', 'أبوجا', 'بريتوريا',
    'جاكرتا', 'بانكوك', 'الرباط', 'الجزائر', 'بغداد',
    'الكويت', 'أبوظبي', 'الدوحة', 'برن', 'ستوكهولم',
    'لشبونة', 'أمستردام', 'أثينا', 'وارسو', 'سيول',
    'بوينس آيريس', 'بوغوتا', 'نيروبي', 'أديس أبابا', 'ويلينغتون',
    'طرابلس', 'تونس', 'دمشق', 'بيروت', 'عمان',
    'صنعاء', 'مسقط', 'المنامة', 'باكو', 'كييف',
  ],

  // ── شخصيات خيالية (50) ───────────────────────────────────────
  شخصيات_خيالية: [
    'سوبرمان', 'باتمان', 'سبايدرمان', 'الرجل الحديدي', 'الهالك',
    'شيرلوك هولمز', 'جيمس بوند', 'إنديانا جونز', 'جاك سبارو', 'هاري بوتر',
    'هيرميون غرينجر', 'فرودو', 'غاندالف', 'دراكولا', 'فرانكنشتاين',
    'زورو', 'روبن هود', 'تارزان', 'سوبرمان', 'وندر وومن',
    'كابتن أمريكا', 'ثور', 'هالك', 'ديدبول', 'ووفرين',
    'يودا', 'دارث فيدر', 'لوك سكايووكر', 'أوبي وان', 'ر2-د2',
    'شرك', 'سمبا', 'موانا', 'الأميرة ياسمين', 'علاء الدين',
    'سندريلا', 'بياض الثلج', 'الجميلة والوحش', 'رابونزيل', 'أليس',
    'نيمو', 'دوري', 'وودي', 'باز لايتيير', 'ميكي ماوس',
    'دونالد داك', 'توم وجيري', 'باغز باني', 'سكوبي دو', 'أستريكس',
  ],
};

const ALL_WORDS = Object.values(WORDS).flat();

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── شاشة الإعداد ─────────────────────────────────────────────
function SetupScreen({ onStart }) {
  const [playerCount, setPlayerCount] = useState(4);
  const [timeLimit, setTimeLimit] = useState(60);

  return (
    <ScrollView style={setup.container} contentContainerStyle={setup.content}>
      <Text style={setup.title}>🤔 من أنا؟</Text>
      <Text style={setup.subtitle}>ارفع الهاتف على جبهتك وخمّن من أنت</Text>

      {/* عدد اللاعبين */}
      <View style={setup.section}>
        <Text style={setup.label}>عدد اللاعبين</Text>
        <View style={setup.options}>
          {[2, 3, 4, 5, 6, 7, 8].map(n => (
            <TouchableOpacity
              key={n}
              style={[setup.optBtn, playerCount === n && setup.optBtnActive]}
              onPress={() => setPlayerCount(n)}
            >
              <Text style={[setup.optText, playerCount === n && setup.optTextActive]}>{n}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* الوقت */}
      <View style={setup.section}>
        <Text style={setup.label}>وقت كل جولة</Text>
        <View style={setup.options}>
          {[60, 90, 120].map(t => (
            <TouchableOpacity
              key={t}
              style={[setup.optBtn, timeLimit === t && setup.optBtnActive]}
              onPress={() => setTimeLimit(t)}
            >
              <Text style={[setup.optText, timeLimit === t && setup.optTextActive]}>
                {t}ث
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity style={setup.startBtn} onPress={() => onStart({ playerCount, timeLimit })}>
        <Text style={setup.startText}>ابدأ اللعبة ←</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ── شاشة اللعب ───────────────────────────────────────────────
function PlayScreen({ playerCount, timeLimit, onBack }) {
  const words = useRef(shuffle(ALL_WORDS)).current;
  const [wordIndex, setWordIndex] = useState(0);
  const [currentPlayer, setCurrentPlayer] = useState(1);
  const [scores, setScores] = useState(Array(playerCount).fill(0));
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [phase, setPhase] = useState('ready'); // ready | playing | result
  const [revealed, setRevealed] = useState(false);
  const tiltAnim = useRef(new Animated.Value(0)).current;

  // تايمر
  useEffect(() => {
    if (phase !== 'playing') return;
    if (timeLeft <= 0) { setPhase('result'); return; }
    const t = setTimeout(() => setTimeLeft(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, timeLeft]);

  // أنيميشن إمالة الهاتف
  useEffect(() => {
    if (phase === 'playing') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(tiltAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
          Animated.timing(tiltAnim, { toValue: 0, duration: 1200, useNativeDriver: true }),
        ])
      ).start();
    } else {
      tiltAnim.setValue(0);
    }
  }, [phase]);

  function startRound() {
    setPhase('playing');
    setTimeLeft(timeLimit);
    setRevealed(false);
  }

  function gotIt() {
    const newScores = [...scores];
    newScores[currentPlayer - 1] += 1;
    setScores(newScores);
    nextWord();
  }

  function skip() {
    nextWord();
  }

  function nextWord() {
    if (wordIndex + 1 >= words.length) {
      setPhase('result');
      return;
    }
    setWordIndex(i => i + 1);
  }

  function nextPlayer() {
    const next = (currentPlayer % playerCount) + 1;
    setCurrentPlayer(next);
    setPhase('ready');
    setRevealed(false);
  }

  const rotate = tiltAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-5deg', '5deg'],
  });

  // شاشة النتائج النهائية
  if (words.length === 0 || (phase === 'result' && currentPlayer === playerCount)) {
    const maxScore = Math.max(...scores);
    const winner = scores.indexOf(maxScore) + 1;
    return (
      <View style={play.container}>
        <Text style={play.bigEmoji}>🏆</Text>
        <Text style={play.winnerText}>اللاعب {winner} فاز!</Text>
        <Text style={play.winnerScore}>{maxScore} نقطة</Text>
        <View style={play.allScores}>
          {scores.map((s, i) => (
            <Text key={i} style={play.scoreRow}>
              اللاعب {i + 1}: {s} نقطة {i + 1 === winner ? '👑' : ''}
            </Text>
          ))}
        </View>
        <TouchableOpacity style={play.actionBtn} onPress={onBack}>
          <Text style={play.actionText}>العودة للقائمة</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // شاشة النتيجة بعد الجولة
  if (phase === 'result') {
    return (
      <View style={play.container}>
        <Text style={play.bigEmoji}>⏱️</Text>
        <Text style={play.roundTitle}>انتهى وقت اللاعب {currentPlayer}</Text>
        <Text style={play.scoreNow}>نقاطه: {scores[currentPlayer - 1]}</Text>
        <TouchableOpacity style={play.actionBtn} onPress={nextPlayer}>
          <Text style={play.actionText}>دور اللاعب {(currentPlayer % playerCount) + 1} ←</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // شاشة الاستعداد
  if (phase === 'ready') {
    return (
      <View style={play.container}>
        <Text style={play.bigEmoji}>📱</Text>
        <Text style={play.roundTitle}>دور اللاعب {currentPlayer}</Text>
        <Text style={play.instruction}>
          ارفع الهاتف على جبهتك{'\n'}ثم اضغط ابدأ
        </Text>
        <TouchableOpacity style={play.actionBtn} onPress={startRound}>
          <Text style={play.actionText}>ابدأ ←</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // شاشة اللعب الفعلية
  return (
    <View style={play.container}>
      {/* تايمر */}
      <View style={[play.timerWrap, timeLeft <= 10 && play.timerWrapRed]}>
        <Text style={[play.timer, timeLeft <= 10 && play.timerRed]}>{timeLeft}</Text>
      </View>

      {/* الكلمة */}
      <Animated.View style={[play.wordCard, { transform: [{ rotate }] }]}>
        <Text style={play.word}>{words[wordIndex]}</Text>
      </Animated.View>

      {/* أزرار */}
      <View style={play.btns}>
        <TouchableOpacity style={play.skipBtn} onPress={skip}>
          <Text style={play.skipText}>تخطي ⏭</Text>
        </TouchableOpacity>
        <TouchableOpacity style={play.correctBtn} onPress={gotIt}>
          <Text style={play.correctText}>✓ صح</Text>
        </TouchableOpacity>
      </View>

      <Text style={play.scoreHint}>نقاط اللاعب {currentPlayer}: {scores[currentPlayer - 1]}</Text>
    </View>
  );
}

// ── المكوّن الرئيسي ─────────────────────────────────────────
export default function ManAnaScreen({ onBack, tokens = 0, onSpendTokens, onOpenTokenModal }) {
  const [gameStarted, setGameStarted] = useState(false);
  const [config, setConfig] = useState(null);

  function handleStart(cfg) {
    if (tokens < 10) {
      Alert.alert('رصيد غير كافٍ 🪙', 'تحتاج 10 توكنز لبدء اللعبة', [
        { text: 'اذهب إلى السوق', onPress: () => onOpenTokenModal && onOpenTokenModal() },
        { text: 'إلغاء', style: 'cancel' },
      ]);
      return;
    }
    onSpendTokens && onSpendTokens(10);
    setConfig(cfg);
    setGameStarted(true);
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#06061a' }}>
      <StatusBar barStyle="light-content" backgroundColor="#06061a" />
      <View style={topBar.header}>
        <TouchableOpacity style={topBar.backBtn} onPress={onBack}>
          <Text style={topBar.backText}>←</Text>
        </TouchableOpacity>
        <Text style={topBar.title}>🤔 من أنا؟</Text>
        <View style={topBar.tokenBadge}>
          <Text style={topBar.tokenText}>🪙 {tokens}</Text>
        </View>
      </View>

      {!gameStarted ? (
        <SetupScreen onStart={handleStart} />
      ) : (
        <PlayScreen
          playerCount={config.playerCount}
          timeLimit={config.timeLimit}
          onBack={onBack}
        />
      )}
    </View>
  );
}

// ── الستايلات ────────────────────────────────────────────────
const topBar = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 8,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#0f0f2e', borderWidth: 1,
    borderColor: '#a78bfa30', alignItems: 'center', justifyContent: 'center',
  },
  backText: { color: '#a78bfa', fontSize: 20, fontWeight: '700' },
  title: { color: '#a78bfa', fontSize: 17, fontWeight: '900' },
  tokenBadge: {
    backgroundColor: '#f59e0b22', borderWidth: 1,
    borderColor: '#f59e0b50', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  tokenText: { color: '#f59e0b', fontSize: 13, fontWeight: '700' },
});

const setup = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#06061a' },
  content: { padding: 24, paddingBottom: 60, alignItems: 'center', gap: 28 },
  title: { color: '#fff', fontSize: 32, fontWeight: '900', marginTop: 8 },
  subtitle: { color: '#5a5a80', fontSize: 14, textAlign: 'center' },
  section: { width: '100%', gap: 12 },
  label: { color: '#a78bfa', fontSize: 16, fontWeight: '700', textAlign: 'right' },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'flex-end' },
  optBtn: {
    paddingHorizontal: 18, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1.5, borderColor: '#a78bfa30',
    backgroundColor: '#0f0f2e',
  },
  optBtnActive: { borderColor: '#a78bfa', backgroundColor: '#1e1b4b' },
  optText: { color: '#5a5a80', fontSize: 15, fontWeight: '700' },
  optTextActive: { color: '#a78bfa' },
  startBtn: {
    backgroundColor: '#7c3aed', borderRadius: 16,
    paddingVertical: 16, paddingHorizontal: 48, marginTop: 8,
  },
  startText: { color: '#fff', fontSize: 18, fontWeight: '900' },
});

const play = StyleSheet.create({
  container: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: 24, gap: 24,
  },
  bigEmoji: { fontSize: 64 },
  roundTitle: { color: '#fff', fontSize: 24, fontWeight: '900', textAlign: 'center' },
  instruction: { color: '#5a5a80', fontSize: 16, textAlign: 'center', lineHeight: 26 },
  scoreNow: { color: '#a78bfa', fontSize: 20, fontWeight: '700' },
  timerWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#0f0f2e', borderWidth: 2, borderColor: '#a78bfa50',
    alignItems: 'center', justifyContent: 'center',
  },
  timerWrapRed: { borderColor: '#ef444480' },
  timer: { color: '#a78bfa', fontSize: 32, fontWeight: '900' },
  timerRed: { color: '#ef4444' },
  wordCard: {
    backgroundColor: '#1e1b4b', borderRadius: 24,
    borderWidth: 2, borderColor: '#a78bfa50',
    paddingVertical: 40, paddingHorizontal: 32,
    minWidth: 280, alignItems: 'center',
  },
  word: { color: '#fff', fontSize: 36, fontWeight: '900', textAlign: 'center' },
  btns: { flexDirection: 'row', gap: 16 },
  skipBtn: {
    flex: 1, paddingVertical: 16, borderRadius: 16,
    backgroundColor: '#1e1b4b', borderWidth: 1.5, borderColor: '#ffffff20',
    alignItems: 'center',
  },
  skipText: { color: '#5a5a80', fontSize: 16, fontWeight: '700' },
  correctBtn: {
    flex: 1, paddingVertical: 16, borderRadius: 16,
    backgroundColor: '#10b981', alignItems: 'center',
  },
  correctText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  scoreHint: { color: '#3a3a60', fontSize: 13 },
  actionBtn: {
    backgroundColor: '#7c3aed', borderRadius: 16,
    paddingVertical: 16, paddingHorizontal: 48,
  },
  actionText: { color: '#fff', fontSize: 18, fontWeight: '900' },
  allScores: { gap: 8, alignItems: 'center' },
  scoreRow: { color: '#a78bfa', fontSize: 16, fontWeight: '600' },
  winnerText: { color: '#fff', fontSize: 28, fontWeight: '900' },
  winnerScore: { color: '#f59e0b', fontSize: 22, fontWeight: '700' },
});
