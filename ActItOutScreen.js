import { useState, useRef, useEffect, useCallback, memo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, StatusBar, ScrollView, TextInput,
} from 'react-native';
import { useTheme } from './ThemeContext';
import ExitButton from './ExitButton';
import { ActItOutEngraving } from './GameEngraving';
import { useT, useRTLStyles, useLanguage } from './I18n';
import { WebScreenButton, GameInfoButton } from './WebRoomService';
import { playSound } from './SoundService';
import { ThemedButton, ThemedCard, ThemedPill, ThemedModal, ThemedRow } from './ThemedComponents';

// ══════════════════════════════════════════════════════════════
// محتوى عربي
// ══════════════════════════════════════════════════════════════
const PERSONS = ['جاك نيكلسون','توم هانكس','ليوناردو دي كابريو','براد بيت','جوني ديب','ويل سميث','دينزل واشنطن','مورغان فريمان','روبرت داوني جونيور','كيانو ريفز','أرنولد شوارزنيغر','بروس ويليس','توم كروز','أنجلينا جولي','ميريل ستريب','سكارليت جوهانسون','بيونسيه','ليدي غاغا','تايلور سويفت','مايكل جاكسون','إلفيس بريسلي','مارك زوكربيرغ','ستيف جوبز','إيلون ماسك','بيل غيتس','محمد علي','مايكل جوردان','كوبي براينت','رونالدو','ميسي','نيمار','مبابي','زيدان','بيليه','مارادونا','روجر فيدرر','محمد صلاح','أوساين بولت','مايكل فيلبس','سيرينا ويليامز','نابليون بونابرت','ألبرت أينشتاين','غاندي','نيلسون مانديلا','أم كلثوم','فيروز','عبدالحليم حافظ','محمد عبده','عادل إمام','نور الشريف'];
const ANIMALS  = ['أسد','نمر','فيل','زرافة','دب','ذئب','ثعلب','أرنب','قرد','غوريلا','حصان','جمل','بقرة','خروف','دجاجة','بطريق','كنغر','كوالا','باندا','تمساح','حية','ضفدع','سلحفاة','قرش','دلفين','حوت','أخطبوط','فرس النهر','وحيد القرن','نسر','صقر','بومة','ببغاء','طاووس','نعامة','قنفذ','فهد','حمار وحشي','ضبع','غزال'];
const MOVIES   = ['تيتانيك','الأسد الملك','هاري بوتر','ستار وورز','الرجل العنكبوت','أفاتار','الجوكر','باتمان','سوبرمان','الرجل الحديدي','إنترستيلار','المصفوفة','الأب الروحي','شينلر ليست','فورست غامب','جيمس بوند','ميشن إمبوسيبل','فاست فيوريوس','أفنجرز','توي ستوري','فروزن','شريك','باب الحارة','قيامة أرطغرل','حريم السلطان','بريكنج باد','غيم أوف ثرونز','فريندز','ذا أوفيس','سترنجر ثينغز','سبونج بوب','توم وجيري','ناروتو','ون بيس'];
const PLACES   = ['أمريكا','الصين','روسيا','فرنسا','ألمانيا','إنجلترا','إيطاليا','اليابان','البرازيل','أستراليا','مصر','السعودية','الإمارات','المغرب','تركيا','باريس','لندن','روما','مدريد','برلين','طوكيو','بكين','موسكو','دبي','القاهرة','إسطنبول','برج إيفل','الأهرامات','برج خليفة','تمثال الحرية','سور الصين','البتراء','تاج محل','الكعبة المشرفة'];
const NORMAL_WORDS = [...PERSONS, ...ANIMALS, ...MOVIES, ...PLACES];
const AMTHAL = ['إن مع العسر يسرا','الصبر مفتاح الفرج','العقل زينة','من جد وجد','الوقت كالسيف','الصدق منجاة','ابدأ بنفسك','خذ من الدنيا ما أعطتك'];
const ASHAAR  = ['على قدر أهل العزم تأتي العزائم','وما نيل المطالب بالتمني ولكن تؤخذ الدنيا غلابا','إذا أنت أكرمت الكريم ملكته','تعلم فليس المرء يولد عالما','إنما الأمم الأخلاق ما بقيت'];

// ══════════════════════════════════════════════════════════════
// محتوى إنجليزي
// ══════════════════════════════════════════════════════════════
const EN_PERSONS = [
  'Michael Jackson','Elvis Presley','Marilyn Monroe','Arnold Schwarzenegger','Tom Hanks',
  'Leonardo DiCaprio','Brad Pitt','Johnny Depp','Will Smith','Morgan Freeman',
  'Robert Downey Jr.','Keanu Reeves','Tom Cruise','Angelina Jolie','Meryl Streep',
  'Scarlett Johansson','Beyoncé','Lady Gaga','Taylor Swift','Britney Spears',
  'Mark Zuckerberg','Steve Jobs','Elon Musk','Bill Gates','Jeff Bezos',
  'Muhammad Ali','Michael Jordan','Kobe Bryant','Cristiano Ronaldo','Lionel Messi',
  'LeBron James','Roger Federer','Usain Bolt','Michael Phelps','Serena Williams',
  'Napoleon Bonaparte','Albert Einstein','Abraham Lincoln','Neil Armstrong','Cleopatra',
  'Barack Obama','Donald Trump','Queen Elizabeth','Winston Churchill','Nelson Mandela',
  'Charlie Chaplin','Mr. Bean','Jack Sparrow','Harry Potter','Indiana Jones',
];
const EN_ANIMALS = [
  'lion','tiger','elephant','giraffe','bear','wolf','fox','rabbit','monkey','gorilla',
  'horse','camel','cow','sheep','chicken','penguin','kangaroo','koala','panda','crocodile',
  'snake','frog','turtle','shark','dolphin','whale','octopus','hippo','rhino','eagle',
  'owl','parrot','peacock','ostrich','hedgehog','cheetah','zebra','hyena','flamingo','bat',
];
const EN_MOVIES = [
  'Titanic','The Lion King','Harry Potter','Star Wars','Spider-Man','Avatar','Joker',
  'Batman','Superman','Iron Man','Interstellar','The Matrix','The Godfather','Forrest Gump',
  'James Bond','Mission Impossible','Fast & Furious','Avengers','Toy Story','Frozen',
  'Shrek','The Office','Friends','Stranger Things','SpongeBob','Tom and Jerry','Breaking Bad',
  'Game of Thrones','The Simpsons','Jurassic Park','Home Alone','Die Hard','Rocky','Jaws',
  'Inception','Gladiator','The Dark Knight','Pulp Fiction','Goodfellas',
];
const EN_PLACES = [
  'America','China','Russia','France','Germany','England','Italy','Japan','Brazil','Australia',
  'Paris','London','Rome','Madrid','Berlin','Tokyo','New York','Las Vegas','Hollywood',
  'Eiffel Tower','Statue of Liberty','Big Ben','Colosseum','Niagara Falls',
  'Grand Canyon','Times Square','Disney World','The White House','Hollywood Sign',
  'Mount Everest','Amazon Rainforest','Sahara Desert','Great Wall of China','Antarctica',
];
const EN_NORMAL_WORDS = [...EN_PERSONS, ...EN_ANIMALS, ...EN_MOVIES, ...EN_PLACES];
const EN_QUOTES = [
  'Just Do It','I\'ll be back','May the Force be with you','To infinity and beyond',
  'You can\'t handle the truth','Why so serious?','I am your father',
  'Life is like a box of chocolates','There\'s no place like home',
  'Elementary, my dear Watson','Houston, we have a problem','You had me at hello',
];
const EN_SCENES = [
  'Titanic – standing at the bow of the ship','The Lion King – Simba held up on Pride Rock',
  'Star Wars – swinging a lightsaber','Spider-Man – shooting webs from the wrist',
  'Rocky – training montage punching the air','The Matrix – dodging bullets in slow motion',
  'Home Alone – hands on cheeks screaming','Forrest Gump – running and running',
  'Jaws – swimming in panic from a shark','Gladiator – pointing at the crowd',
  'The Godfather – making an offer you can\'t refuse','Frozen – letting it go with ice powers',
];

// ══════════════════════════════════════════════════════════════
// إعدادات الجولات — 7 جولات: 5 عادية + أمثال + شعر
// ══════════════════════════════════════════════════════════════
// ROUND_CONFIG: indexed 0..6
// roundIndex 0-4 → normal  (+0s)
// roundIndex 5   → amthal  (+30s) → 15pts / steal 20pts
// roundIndex 6   → shear   (+60s) → 20pts / steal 25pts
const ROUND_CONFIGS = [
  { type: 'normal', pts: 10, stealPts: 15, extraTime: 0  },
  { type: 'normal', pts: 10, stealPts: 15, extraTime: 0  },
  { type: 'normal', pts: 10, stealPts: 15, extraTime: 0  },
  { type: 'normal', pts: 10, stealPts: 15, extraTime: 0  },
  { type: 'normal', pts: 10, stealPts: 15, extraTime: 0  },
  { type: 'mathal', pts: 15, stealPts: 20, extraTime: 30 },
  { type: 'shear',  pts: 20, stealPts: 25, extraTime: 60 },
];

// ══════════════════════════════════════════════════════════════
// helpers
// ══════════════════════════════════════════════════════════════
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// بناء ٧ كلمات: ٥ عادية + مثل + شعر
function buildRounds(isGlobal = false) {
  if (isGlobal) {
    const normal = shuffle(EN_NORMAL_WORDS).slice(0, 5);
    const quote  = shuffle(EN_QUOTES)[0];
    const scene  = shuffle(EN_SCENES)[0];
    return [
      ...normal.map(w => ({ word: w, type: 'normal' })),
      { word: quote, type: 'quote' },
      { word: scene, type: 'scene' },
    ];
  }
  const normal = shuffle(NORMAL_WORDS).slice(0, 5);
  const mathal = shuffle(AMTHAL)[0];
  const shear  = shuffle(ASHAAR)[0];
  return [
    ...normal.map(w => ({ word: w, type: 'normal' })),
    { word: mathal, type: 'mathal' },
    { word: shear,  type: 'shear'  },
  ];
}

const HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

// ══════════════════════════════════════════════════════════════
// SetupScreen
// ══════════════════════════════════════════════════════════════
const SetupScreen = memo(({ onStart, onBack, theme, t, rs, isGlobal }) => {
  const [team1Name, setTeam1Name] = useState(isGlobal ? 'Team 1' : 'الفريق الأول');
  const [team2Name, setTeam2Name] = useState(isGlobal ? 'Team 2' : 'الفريق الثاني');

  const handleStart = useCallback(() => {
    onStart({
      team1Name: team1Name.trim() || (isGlobal ? 'Team 1' : 'الفريق الأول'),
      team2Name: team2Name.trim() || (isGlobal ? 'Team 2' : 'الفريق الثاني'),
    });
  }, [team1Name, team2Name, onStart]);

  return (
    <View style={{ flex: 1 }}>
      {/* Header with back button top-left */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onBack}
          style={[styles.backBtn, { backgroundColor: theme.bgCard, borderColor: '#ec489930' }]}
          hitSlop={HIT_SLOP}
        >
          <Text style={{ color: theme.accent, fontSize: 20, fontWeight: '700' }}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
          {isGlobal ? 'Act It Out 🎭' : 'مثّلها 🎭'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.setupContent, { backgroundColor: theme.isCityTheme ? 'transparent' : theme.bg }]}>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          {isGlobal ? 'Act it out — no talking, no sounds!' : 'مثّل الكلمة — بدون كلام وبدون أصوات!'}
        </Text>

        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.textPrimary }]}>
            {isGlobal ? 'Team Names' : 'أسماء الفريقين'}
          </Text>
          <View style={styles.teamRow}>
            <View style={[styles.teamInputWrap, { backgroundColor: theme.bgCard, borderColor: '#ec489950' }]}>
              <Text style={[styles.teamInputLabel, { color: '#ec4899' }]}>🔴 {isGlobal ? 'Team 1' : 'الفريق الأول'}</Text>
              <TextInput
                style={[styles.teamInput, { color: theme.textPrimary }, isGlobal ? styles.teamInputLTR : rs.textInput]}
                value={team1Name} onChangeText={setTeam1Name} maxLength={20}
              />
            </View>
            <View style={[styles.teamInputWrap, { backgroundColor: theme.bgCard, borderColor: '#3b82f650' }]}>
              <Text style={[styles.teamInputLabel, { color: '#3b82f6' }]}>🔵 {isGlobal ? 'Team 2' : 'الفريق الثاني'}</Text>
              <TextInput
                style={[styles.teamInput, { color: theme.textPrimary }, isGlobal ? styles.teamInputLTR : rs.textInput]}
                value={team2Name} onChangeText={setTeam2Name} maxLength={20}
              />
            </View>
          </View>
        </View>

        <View style={[styles.infoCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
          {isGlobal ? (
            <>
              <Text style={[styles.infoTitle, { color: theme.textPrimary }]}>📋 Round Structure (7 Rounds)</Text>
              <Text style={[styles.infoRow, { color: theme.textSecondary }]}>🎭 Rounds 1–5: People / Animals / Movies / Places</Text>
              <Text style={[styles.infoRow, { color: theme.textSecondary }]}>💬 Round 6: Famous Quote — act it out!</Text>
              <Text style={[styles.infoRow, { color: theme.textSecondary }]}>🎬 Round 7: Iconic Movie Scene — act it out!</Text>
              <Text style={[styles.infoNote, { color: theme.accent }]}>10 pts • Round 6: 15 pts • Round 7: 20 pts</Text>
              <Text style={[styles.infoNote, { color: '#f59e0b' }]}>Steal: 15 • Round 6: 20 • Round 7: 25 pts</Text>
            </>
          ) : (
            <>
              <Text style={[styles.infoTitle, { color: theme.textPrimary }]}>📋 هيكل الجولات السبع</Text>
              <Text style={[styles.infoRow, { color: theme.textSecondary }]}>🎭 جولات 1–5: أشخاص / حيوانات / أفلام / أماكن</Text>
              <Text style={[styles.infoRow, { color: theme.textSecondary }]}>💬 جولة 6: مثل شعبي (+٣٠ ثانية)</Text>
              <Text style={[styles.infoRow, { color: theme.textSecondary }]}>📜 جولة 7: بيت شعر (+دقيقة)</Text>
              <Text style={[styles.infoNote, { color: theme.accent }]}>إجابة: ١٠ | جولة ٦: ١٥ | جولة ٧: ٢٠ نقطة</Text>
              <Text style={[styles.infoNote, { color: '#f59e0b' }]}>سرقة: ١٥ | جولة ٦: ٢٠ | جولة ٧: ٢٥ نقطة</Text>
            </>
          )}
        </View>

        <TouchableOpacity style={[styles.startBtn, { backgroundColor: theme.accent }]} onPress={handleStart} activeOpacity={0.85}>
          <Text style={styles.startText}>
            {isGlobal ? 'Start Game 🎭' : 'ابدأ اللعبة 🎭'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
});

// ══════════════════════════════════════════════════════════════
// PlayScreen
// ══════════════════════════════════════════════════════════════
const BASE_TIME = 60; // الوقت الأساسي للتمثيل
const REVEAL_DURATION = 10; // ثواني تظهر فيها الكلمة
const STEAL_DURATION  = 20; // ثواني فرصة السرقة

function PlayScreen({ onBack, team1Name, team2Name, theme, t, isGlobal }) {
  const { themeId } = useTheme();
  const { lang } = useLanguage();
  // كل جولة = دوران: دور الفريق الأول ثم دور الفريق الثاني
  // roundIndex: الجولة الكاملة 0..6 (7 جولات)
  // actingTeam: 0 أو 1 (داخل الجولة)
  // turnIndex: الدور الكلي = roundIndex * 2 + actingTeam

  const rounds = useRef(buildRounds(isGlobal)).current;
  const [roundIndex, setRoundIndex] = useState(0); // 0..6
  const [actingTeam, setActingTeam] = useState(0); // 0 or 1
  const [scores,     setScores]     = useState([0, 0]);
  // phases: 'ready' | 'revealing' | 'acting' | 'steal' | 'done'
  const [phase,     setPhase]    = useState('ready');
  const [timeLeft,  setTimeLeft] = useState(BASE_TIME);
  const [stealTime, setStealTime] = useState(STEAL_DURATION);
  const [wordVisible, setWordVisible] = useState(false);

  const dangerOpacity = useRef(new Animated.Value(0)).current;
  const stealDanger   = useRef(new Animated.Value(0)).current;

  const cfg = ROUND_CONFIGS[roundIndex]; // { type, pts, stealPts, extraTime }
  const currentRound = rounds[roundIndex];
  const isSpecialRound = roundIndex >= 5;
  const actingTime = BASE_TIME + cfg.extraTime;

  // ── labels ──
  const getRoundLabel = () => {
    if (isGlobal) {
      if (roundIndex < 5)  return `Round ${roundIndex + 1} of 7`;
      if (roundIndex === 5) return 'Round 6 of 7 — Famous Quote 💬';
      return 'Round 7 of 7 — Iconic Scene 🎬';
    }
    if (roundIndex < 5)  return `الجولة ${roundIndex + 1} من 7`;
    if (roundIndex === 5) return 'الجولة 6 من 7 — الأمثال 💬';
    return 'الجولة 7 من 7 — الشعر 📜';
  };

  const getRoundTypeLabel = () => {
    if (isGlobal) {
      if (currentRound.type === 'quote') return '💬 Famous Quote';
      if (currentRound.type === 'scene') return '🎬 Movie Scene';
    } else {
      if (currentRound.type === 'mathal') return '💬 مثل شعبي';
      if (currentRound.type === 'shear')  return '📜 بيت شعر';
    }
    return null;
  };

  const t1 = actingTeam === 0 ? team1Name : team2Name;
  const t2 = actingTeam === 0 ? team2Name : team1Name;
  const t2Team = actingTeam === 0 ? 1 : 0;

  // ── timers ──
  // مرحلة إظهار الكلمة لـ١٠ ثواني
  useEffect(() => {
    if (phase !== 'revealing') return;
    setWordVisible(true);
    const hide = setTimeout(() => {
      setWordVisible(false);
      setPhase('acting');
      setTimeLeft(actingTime);
    }, REVEAL_DURATION * 1000);
    return () => clearTimeout(hide);
  }, [phase]);

  // عداد التمثيل
  useEffect(() => {
    if (phase !== 'acting') return;
    if (timeLeft <= 0) { setPhase('steal'); setStealTime(STEAL_DURATION); return; }
    if (timeLeft <= 5) playSound('countdown');
    const timer = setTimeout(() => setTimeLeft(x => x - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, timeLeft]);

  // عداد السرقة
  useEffect(() => {
    if (phase !== 'steal') return;
    if (stealTime <= 0) { handleNoAnswer(); return; }
    if (stealTime <= 5) playSound('countdown');
    const timer = setTimeout(() => setStealTime(x => x - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, stealTime]);

  // danger animation للتمثيل
  useEffect(() => {
    Animated.timing(dangerOpacity, {
      toValue: timeLeft < 10 && phase === 'acting' ? 1 : 0,
      duration: 300, useNativeDriver: true,
    }).start();
  }, [timeLeft < 10, phase]);

  // danger animation للسرقة
  useEffect(() => {
    Animated.timing(stealDanger, {
      toValue: stealTime < 8 && phase === 'steal' ? 1 : 0,
      duration: 300, useNativeDriver: true,
    }).start();
  }, [stealTime < 8, phase]);

  // ── next turn/round ──
  const goNext = useCallback((newScores) => {
    setScores(newScores);
    // إذا كان الفريق الثاني لم يؤدِّ دوره بعد
    if (actingTeam === 0) {
      setActingTeam(1);
      setPhase('ready');
      return;
    }
    // كلا الفريقين أدّيا — انتقل للجولة التالية
    if (roundIndex + 1 >= rounds.length) {
      setPhase('done');
      return;
    }
    setRoundIndex(i => i + 1);
    setActingTeam(0);
    setPhase('ready');
  }, [actingTeam, roundIndex, rounds.length]);

  const startReveal  = useCallback(() => setPhase('revealing'), []);

  // الفريق الممثِّل أجاب
  const teamGuessed  = useCallback(() => {
    const ns = [...scores];
    ns[actingTeam] += cfg.pts;
    goNext(ns);
  }, [scores, actingTeam, cfg, goNext]);

  // أجاب الفريق الأول (الممثّل) في فرصة السرقة
  const stealTeam1Answered = useCallback(() => {
    const ns = [...scores];
    ns[actingTeam] += cfg.pts;
    goNext(ns);
  }, [scores, actingTeam, cfg, goNext]);

  // الفريق الثاني سرق
  const stealSuccess = useCallback(() => {
    const ns = [...scores];
    ns[t2Team] += cfg.stealPts;
    goNext(ns);
  }, [scores, t2Team, cfg, goNext]);

  // لم يجب أحد
  const handleNoAnswer = useCallback(() => goNext(scores), [scores, goNext]);

  // ══════════════════════════════════════════════════════════════
  // PHASE: done
  // ══════════════════════════════════════════════════════════════
  if (phase === 'done') {
    const winner = scores[0] > scores[1] ? team1Name : scores[1] > scores[0] ? team2Name : null;
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.isCityTheme ? 'transparent' : theme.bg }]}>
        <Text style={styles.bigEmoji}>🏆</Text>
        <Text style={[styles.winnerTitle, { color: theme.accent }]}>
          {winner
            ? (isGlobal ? `${winner} wins!` : `${winner} فاز!`)
            : (isGlobal ? 'Draw!' : 'تعادل!')}
        </Text>
        <View style={styles.finalScores}>
          <View style={[styles.finalTeam, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
            <Text style={[styles.finalTeamName, { color: theme.textSecondary }]}>{team1Name}</Text>
            <Text style={[styles.finalScore, { color: scores[0] >= scores[1] ? theme.accent : theme.textPrimary }]}>{scores[0]}</Text>
          </View>
          <Text style={[styles.vs, { color: theme.textMuted }]}>VS</Text>
          <View style={[styles.finalTeam, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
            <Text style={[styles.finalTeamName, { color: theme.textSecondary }]}>{team2Name}</Text>
            <Text style={[styles.finalScore, { color: scores[1] > scores[0] ? theme.accent : theme.textPrimary }]}>{scores[1]}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.actionBtn} onPress={onBack} activeOpacity={0.85}>
          <Text style={styles.actionText}>{isGlobal ? 'Return Home' : t('common.returnHome')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // PHASE: steal
  // ══════════════════════════════════════════════════════════════
  if (phase === 'steal') {
    return (
      <View style={[styles.fullScreen, { backgroundColor: theme.isCityTheme ? 'transparent' : theme.bg }]}>
        {/* back btn top-left */}
        <View style={styles.floatBackRow}>
          <TouchableOpacity onPress={onBack} style={[styles.floatBack, { backgroundColor: theme.bgCard, borderColor: '#ec489930' }]} hitSlop={HIT_SLOP}>
            <Text style={{ color: theme.accent, fontSize: 20, fontWeight: '700' }}>←</Text>
          </TouchableOpacity>
          <GameInfoButton gameType="act_it_out" lang={lang} />
          <WebScreenButton
            playerUid="act_p0"
            playerName=""
            gameType="act_it_out"
            getPublicData={() => ({ phase, scores, actingTeam })}
            themeName={themeId || 'dark'}
          />
        </View>

        {/* scoreboard */}
        <View style={styles.scoreboardWrap}>
          <View style={[styles.scoreTeam, { backgroundColor: theme.bgCard, borderColor: theme.border }, actingTeam === 0 && styles.scoreTeamActive]}>
            <Text style={[styles.scoreTeamName, { color: theme.textSecondary }]}>{team1Name}</Text>
            <Text style={[styles.scoreTeamScore, { color: theme.textPrimary }]}>{scores[0]}</Text>
          </View>
          <View style={[styles.scoreTeam, { backgroundColor: theme.bgCard, borderColor: theme.border }, actingTeam === 1 && styles.scoreTeamActive]}>
            <Text style={[styles.scoreTeamName, { color: theme.textSecondary }]}>{team2Name}</Text>
            <Text style={[styles.scoreTeamScore, { color: theme.textPrimary }]}>{scores[1]}</Text>
          </View>
        </View>

        {/* شريط التقدم */}
        <View style={styles.progressWrap}>
          <Text style={[styles.progressText, { color: theme.textMuted }]}>
            {isGlobal ? `Round ${roundIndex + 1} / ${rounds.length}` : `الجولة ${roundIndex + 1} من ${rounds.length}`}
          </Text>
          <View style={[styles.progressBar, { backgroundColor: theme.bgCard }]}>
            <View style={[styles.progressFill, { width: `${((roundIndex + 1) / rounds.length) * 100}%` }]} />
          </View>
        </View>

        <View style={styles.stealContent}>
          {/* عداد السرقة */}
          <View style={[styles.stealTimerCircle, { backgroundColor: theme.bgCard }]}>
            <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: theme.error, borderRadius: 50, opacity: stealDanger }]} />
            <Text style={[styles.stealTimerText, stealTime < 8 && { color: '#ff6666' }]}>{stealTime}</Text>
          </View>

          <Text style={[styles.timeUpLabel, { color: '#f59e0b' }]}>
            {isGlobal ? "⏰ Time's Up!" : '⏰ انتهى الوقت!'}
          </Text>
          <Text style={[styles.stealPrompt, { color: theme.textPrimary }]}>
            {isGlobal
              ? `${t2} — steal attempt! 🔥`
              : `فرصة ${t2} للسرقة! 🔥`}
          </Text>
          <Text style={[styles.stealHint, { color: theme.textMuted }]}>
            {isGlobal
              ? `+${cfg.stealPts} pts for steal`
              : `السرقة = ${cfg.stealPts} نقطة`}
          </Text>

          {/* الأزرار الثلاثة */}
          <View style={styles.stealBtns}>
            {/* الفريق الأول أجاب */}
            <TouchableOpacity style={[styles.stealBtn, { backgroundColor: theme.success + '22', borderColor: theme.success + '44' }]} onPress={stealTeam1Answered} activeOpacity={0.85}>
              <Text style={styles.stealBtnEmoji}>✅</Text>
              <Text style={[styles.stealBtnLabel, { color: '#4aff4a' }]}>
                {isGlobal ? `${t1}\nAnswered` : `أجاب\n${t1}`}
              </Text>
              <Text style={[styles.stealBtnPts, { color: '#4aff4a' }]}>+{cfg.pts}</Text>
            </TouchableOpacity>

            {/* الفريق الثاني سرق */}
            <TouchableOpacity style={[styles.stealBtn, { backgroundColor: theme.purple + '22', borderColor: theme.purple + '44' }]} onPress={stealSuccess} activeOpacity={0.85}>
              <Text style={styles.stealBtnEmoji}>🔥</Text>
              <Text style={[styles.stealBtnLabel, { color: '#818cf8' }]}>
                {isGlobal ? `${t2}\nStole!` : `سرق\n${t2}`}
              </Text>
              <Text style={[styles.stealBtnPts, { color: '#818cf8' }]}>+{cfg.stealPts}</Text>
            </TouchableOpacity>

            {/* لم يجب أحد */}
            <TouchableOpacity style={[styles.stealBtn, { backgroundColor: theme.error + '22', borderColor: theme.error + '44' }]} onPress={handleNoAnswer} activeOpacity={0.85}>
              <Text style={styles.stealBtnEmoji}>❌</Text>
              <Text style={[styles.stealBtnLabel, { color: '#ff6666' }]}>
                {isGlobal ? 'No one\nAnswered' : 'لم يجب\nأحد'}
              </Text>
              <Text style={[styles.stealBtnPts, { color: '#ff6666' }]}>+0</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // PHASE: ready
  // ══════════════════════════════════════════════════════════════
  if (phase === 'ready') {
    return (
      <View style={[styles.fullScreen, { backgroundColor: theme.isCityTheme ? 'transparent' : theme.bg }]}>
        {/* back btn top-left */}
        <View style={styles.floatBackRow}>
          <TouchableOpacity onPress={onBack} style={[styles.floatBack, { backgroundColor: theme.bgCard, borderColor: '#ec489930' }]} hitSlop={HIT_SLOP}>
            <Text style={{ color: theme.accent, fontSize: 20, fontWeight: '700' }}>←</Text>
          </TouchableOpacity>
          <GameInfoButton gameType="act_it_out" lang={lang} />
          <WebScreenButton
            playerUid="act_p0"
            playerName=""
            gameType="act_it_out"
            getPublicData={() => ({ phase, scores, actingTeam })}
            themeName={themeId || 'dark'}
          />
        </View>

        {/* scoreboard */}
        <View style={styles.scoreboardWrap}>
          <View style={[styles.scoreTeam, { backgroundColor: theme.bgCard, borderColor: theme.border }, actingTeam === 0 && styles.scoreTeamActive]}>
            <Text style={[styles.scoreTeamName, { color: theme.textSecondary }]}>{team1Name}</Text>
            <Text style={[styles.scoreTeamScore, { color: theme.textPrimary }]}>{scores[0]}</Text>
          </View>
          <View style={[styles.scoreTeam, { backgroundColor: theme.bgCard, borderColor: theme.border }, actingTeam === 1 && styles.scoreTeamActive]}>
            <Text style={[styles.scoreTeamName, { color: theme.textSecondary }]}>{team2Name}</Text>
            <Text style={[styles.scoreTeamScore, { color: theme.textPrimary }]}>{scores[1]}</Text>
          </View>
        </View>

        {/* شريط التقدم */}
        <View style={styles.progressWrap}>
          <Text style={[styles.progressText, { color: theme.textMuted }]}>
            {isGlobal ? `Round ${roundIndex + 1} / ${rounds.length}` : `الجولة ${roundIndex + 1} من ${rounds.length}`}
          </Text>
          <View style={[styles.progressBar, { backgroundColor: theme.bgCard }]}>
            <View style={[styles.progressFill, { width: `${((roundIndex + 1) / rounds.length) * 100}%` }]} />
          </View>
        </View>

        <View style={styles.readyContent}>
          {isSpecialRound && (
            <Text style={[styles.specialHint, { color: theme.accent }]}>
              {isGlobal
                ? (currentRound.type === 'quote' ? '💬 Famous Quote — act without words!' : '🎬 Movie Scene — no talking!')
                : (currentRound.type === 'mathal' ? '💬 مثل شعبي — مثّله بأي طريقة!' : '📜 بيت شعر — المهم فريقك يعرفه!')}
            </Text>
          )}

          <Text style={[styles.phaseTitle, { color: theme.textPrimary }]}>
            {isGlobal ? `${t1}'s turn to act 🎭` : `دور فريق ${t1} للتمثيل 🎭`}
          </Text>

          <Text style={[styles.instruction, { color: theme.textMuted }]}>
            {isGlobal
              ? `Only the actor taps "Reveal"\nEveryone else looks away 🙈\n\nWord shows for 10 seconds then disappears`
              : `الممثل فقط يضغط "اكشف"\nوالباقين يغمضون أعينهم 🙈\n\nالكلمة تظهر ١٠ ثواني ثم تختفي`}
          </Text>

          <TouchableOpacity style={styles.actionBtn} onPress={startReveal} activeOpacity={0.85}>
            <Text style={styles.actionText}>
              {isGlobal ? 'Reveal 👁️' : 'اكشف الكلمة 👁️'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // PHASE: revealing (10 ثواني تظهر الكلمة)
  // ══════════════════════════════════════════════════════════════
  if (phase === 'revealing') {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.isCityTheme ? 'transparent' : theme.bg }]}>
        {wordVisible ? (
          <>
            <Text style={[styles.revealHint, { color: theme.textMuted }]}>
              {isGlobal ? '👁️ Memorize it! 10 seconds...' : '👁️ احفظها! ١٠ ثواني...'}
            </Text>
            {getRoundTypeLabel() && (
              <Text style={[styles.wordType, { color: theme.accent }]}>{getRoundTypeLabel()}</Text>
            )}
            <View style={[styles.wordCard, { backgroundColor: theme.bgCard, borderColor: isSpecialRound ? '#f59e0b40' : theme.border }]}>
              <Text style={[styles.wordText, { color: theme.textPrimary }, isSpecialRound && styles.wordTextSpecial]}>
                {currentRound.word}
              </Text>
            </View>
          </>
        ) : (
          <Text style={[styles.phaseTitle, { color: theme.textMuted }]}>
            {isGlobal ? 'Get ready...' : 'استعد...'}
          </Text>
        )}
      </View>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // PHASE: acting
  // ══════════════════════════════════════════════════════════════
  return (
    <View style={[styles.fullScreen, { backgroundColor: theme.isCityTheme ? 'transparent' : theme.bg }]}>
      {/* back btn top-left */}
      <View style={styles.floatBackRow}>
        <TouchableOpacity onPress={onBack} style={[styles.floatBack, { backgroundColor: theme.bgCard, borderColor: '#ec489930' }]} hitSlop={HIT_SLOP}>
          <Text style={{ color: theme.accent, fontSize: 20, fontWeight: '700' }}>←</Text>
        </TouchableOpacity>
        <GameInfoButton gameType="act_it_out" lang={lang} />
        <WebScreenButton
          playerUid="act_p0"
          playerName=""
          gameType="act_it_out"
          getPublicData={() => ({ phase, scores, actingTeam })}
          themeName={themeId || 'dark'}
        />
      </View>

      {/* scoreboard */}
      <View style={styles.scoreboardWrap}>
        <View style={[styles.scoreTeam, { backgroundColor: theme.bgCard, borderColor: theme.border }, actingTeam === 0 && styles.scoreTeamActive]}>
          <Text style={[styles.scoreTeamName, { color: theme.textSecondary }]}>{team1Name}</Text>
          <Text style={[styles.scoreTeamScore, { color: theme.textPrimary }]}>{scores[0]}</Text>
        </View>
        <View style={[styles.scoreTeam, { backgroundColor: theme.bgCard, borderColor: theme.border }, actingTeam === 1 && styles.scoreTeamActive]}>
          <Text style={[styles.scoreTeamName, { color: theme.textSecondary }]}>{team2Name}</Text>
          <Text style={[styles.scoreTeamScore, { color: theme.textPrimary }]}>{scores[1]}</Text>
        </View>
      </View>

      {/* شريط التقدم */}
      <View style={styles.progressWrap}>
        <Text style={[styles.progressText, { color: theme.textMuted }]}>
          {isGlobal ? `Round ${roundIndex + 1} / ${rounds.length}` : `الجولة ${roundIndex + 1} من ${rounds.length}`}
        </Text>
        <View style={[styles.progressBar, { backgroundColor: theme.bgCard }]}>
          <View style={[styles.progressFill, { width: `${((roundIndex + 1) / rounds.length) * 100}%` }]} />
        </View>
      </View>

      <View style={styles.actingContent}>
        {/* عداد التمثيل */}
        <View style={[styles.timerCircle, { backgroundColor: theme.bgCard }]}>
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: theme.error, borderRadius: 50, opacity: dangerOpacity }]} />
          <Text style={[styles.timerText, timeLeft < 10 && { color: '#ff6666' }]}>{timeLeft}</Text>
        </View>

        {/* معلومات الدور */}
        <Text style={[styles.actingLabel, { color: theme.textSecondary }]}>
          {isGlobal ? `${t1} is acting 🎭` : `${t1} يمثّل الآن 🎭`}
        </Text>

        {/* نقاط هذا الدور */}
        <View style={[styles.ptsHint, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
          <Text style={[styles.ptsHintText, { color: theme.textMuted }]}>
            {isGlobal
              ? `Correct: +${cfg.pts} pts  •  Steal: +${cfg.stealPts} pts`
              : `إجابة: +${cfg.pts} نقطة  •  سرقة: +${cfg.stealPts} نقطة`}
          </Text>
        </View>

        {/* زر الإكمال */}
        <TouchableOpacity style={styles.guessedBtn} onPress={teamGuessed} activeOpacity={0.85}>
          <Text style={styles.guessedText}>
            {isGlobal ? `${t1} Guessed It! ✓` : `أجاب فريق ${t1} ✓`}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════
// المكوّن الرئيسي
// ══════════════════════════════════════════════════════════════
export default function ActItOutScreen({ onBack, experience }) {
  const { theme, themeId } = useTheme();
  const t  = useT();
  const rs = useRTLStyles();
  const isGlobal = experience === 'global';

  const [config, setConfig] = useState(null);
  const handleStart = useCallback((cfg) => setConfig(cfg), []);
  const handleBack  = useCallback(() => {
    if (config) setConfig(null);
    else onBack();
  }, [config, onBack]);

  return (
    <View style={[styles.root, { backgroundColor: theme.isCityTheme ? 'transparent' : theme.bg }]}>
      <ActItOutEngraving theme={theme} />
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.statusBg} />
      {!config
        ? <SetupScreen onStart={handleStart} onBack={handleBack} theme={theme} t={t} rs={rs} isGlobal={isGlobal} />
        : <PlayScreen {...config} onBack={handleBack} theme={theme} t={t} isGlobal={isGlobal} />
      }
    </View>
  );
}

// ══════════════════════════════════════════════════════════════
// styles
// ══════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  root:             { flex: 1 },

  // header (setup)
  header:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 8 },
  headerTitle:      { fontSize: 18, fontWeight: '800' },
  backBtn:          { width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  backText:         { fontSize: 18, fontWeight: '900' },

  // floating back (play screens)
  floatBack:        { width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  floatBackRow:     { position: 'absolute', top: 52, left: 16, zIndex: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },

  // setup
  setupContent:     { padding: 24, gap: 24, paddingBottom: 40 },
  subtitle:         { fontSize: 14, textAlign: 'center' },
  section:          { gap: 12 },
  label:            { fontSize: 15, fontWeight: '700' },
  teamRow:          { flexDirection: 'row', gap: 12 },
  teamInputWrap:    { flex: 1, borderRadius: 14, borderWidth: 1.5, padding: 12, gap: 6 },
  teamInputLabel:   { fontSize: 12, fontWeight: '700' },
  teamInput:        { fontSize: 15, padding: 0 },
  teamInputLTR:     { textAlign: 'left', writingDirection: 'ltr' },
  infoCard:         { borderRadius: 16, padding: 16, gap: 8, borderWidth: 1 },
  infoTitle:        { fontSize: 14, fontWeight: '800' },
  infoRow:          { fontSize: 13 },
  infoNote:         { fontSize: 12, fontWeight: '700', marginTop: 4 },
  startBtn:         { borderRadius: 16, paddingVertical: 18, alignItems: 'center', elevation: 8 },
  startText:        { color: '#fff', fontSize: 18, fontWeight: '900' },

  // fullScreen layout (play)
  fullScreen:       { flex: 1 },
  scoreboardWrap:   { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingTop: 104, paddingBottom: 6 },
  progressWrap:     { paddingHorizontal: 16, marginTop: 6, marginBottom: 2, gap: 4 },
  progressText:     { fontSize: 12, fontWeight: '700', textAlign: 'center' },
  progressBar:      { height: 5, borderRadius: 3, overflow: 'hidden' },
  progressFill:     { height: '100%', backgroundColor: '#ec4899', borderRadius: 3 },
  scoreTeam:        { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1.5 },
  scoreTeamActive:  { borderColor: '#ec489960', backgroundColor: '#ec489910' },
  scoreTeamName:    { fontSize: 13 },
  scoreTeamScore:   { fontSize: 28, fontWeight: '900' },

  // ready content
  readyContent:     { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  roundLabel:       { fontSize: 14, textAlign: 'center' },
  specialHint:      { fontSize: 13, textAlign: 'center' },
  phaseTitle:       { fontSize: 22, fontWeight: '800', textAlign: 'center' },
  instruction:      { fontSize: 14, textAlign: 'center', lineHeight: 22 },
  actionBtn:        { backgroundColor: '#ec4899', paddingVertical: 16, paddingHorizontal: 40, borderRadius: 16, elevation: 6 },
  actionText:       { color: '#fff', fontSize: 18, fontWeight: '900' },

  // acting content
  actingContent:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  timerCircle:      { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#ffffff20' },
  timerText:        { color: '#fff', fontSize: 36, fontWeight: '900' },
  actingLabel:      { fontSize: 16, fontWeight: '700' },
  ptsHint:          { borderRadius: 10, paddingVertical: 8, paddingHorizontal: 16, borderWidth: 1 },
  ptsHintText:      { fontSize: 13 },
  guessedBtn:       { backgroundColor: '#10b981', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 16, elevation: 6 },
  guessedText:      { color: '#fff', fontSize: 16, fontWeight: '900' },

  // revealing
  centerContainer:  { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, padding: 24 },
  revealHint:       { fontSize: 14, textAlign: 'center' },
  wordCard:         { borderRadius: 20, padding: 24, width: '100%', alignItems: 'center', gap: 8, borderWidth: 1.5, minHeight: 100, justifyContent: 'center' },
  wordType:         { fontSize: 13, fontWeight: '700' },
  wordText:         { fontSize: 28, fontWeight: '900', textAlign: 'center' },
  wordTextSpecial:  { fontSize: 18, lineHeight: 28 },

  // steal
  stealContent:     { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14 },
  stealTimerCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#ffffff20' },
  stealTimerText:   { color: '#fff', fontSize: 30, fontWeight: '900' },
  timeUpLabel:      { fontSize: 20, fontWeight: '900' },
  stealPrompt:      { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  stealHint:        { fontSize: 13 },
  stealBtns:        { flexDirection: 'row', gap: 10, width: '100%' },
  stealBtn:         { flex: 1, borderRadius: 14, padding: 12, alignItems: 'center', borderWidth: 1, gap: 4 },
  stealBtnEmoji:    { fontSize: 22 },
  stealBtnLabel:    { fontSize: 13, fontWeight: '800', textAlign: 'center' },
  stealBtnPts:      { fontSize: 15, fontWeight: '900' },

  // done
  bigEmoji:         { fontSize: 72 },
  winnerTitle:      { fontSize: 28, fontWeight: '900', textAlign: 'center' },
  finalScores:      { flexDirection: 'row', alignItems: 'center', gap: 16 },
  finalTeam:        { alignItems: 'center', borderRadius: 16, padding: 20, borderWidth: 1.5 },
  finalTeamName:    { fontSize: 13 },
  finalScore:       { fontSize: 36, fontWeight: '900' },
  vs:               { fontSize: 18, fontWeight: '900' },
});
