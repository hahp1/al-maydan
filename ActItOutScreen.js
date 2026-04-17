import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, StatusBar, ScrollView,
} from 'react-native';

// ─────────────────────────────────────────────────────────────
// بنك الكلمات — مناسبة للتمثيل بالجسم
// ─────────────────────────────────────────────────────────────

// 👤 أشخاص مشهورون
const PERSONS = [
  'جاك نيكلسون','توم هانكس','ليوناردو دي كابريو','براد بيت','جوني ديب',
  'ويل سميث','دينزل واشنطن','مورغان فريمان','روبرت داوني جونيور','كيانو ريفز',
  'أرنولد شوارزنيغر','سيلفستر ستالون','بروس ويليس','نيكولاس كيج','توم كروز',
  'مارلون براندو','آل باتشينو','روبرت دي نيرو','كلينت إيستوود','هاريسون فورد',
  'أنجلينا جولي','ميريل ستريب','سكارليت جوهانسون','جينيفر لوبيز','ريانا',
  'بيونسيه','ليدي غاغا','تايلور سويفت','ماريا كاري','مايكل جاكسون',
  'إلفيس بريسلي','مادونا','إد شيران','جاستن بيبر','مارك زوكربيرغ',
  'ستيف جوبز','إيلون ماسك','بيل غيتس','جيف بيزوس','أوبرا وينفري',
  'محمد علي','مايكل جوردان','ليبرون جيمس','كوبي براينت','شاكيل أونيل',
  'رونالدو','ميسي','نيمار','كيليان مبابي','زين الدين زيدان',
  'رونالدينيو','بيليه','دييغو مارادونا','تييري أنري','ديفيد بيكهام',
  'روجر فيدرر','رافاييل نادال','نوفاك ديوكوفيتش','محمد صلاح','ساديو ماني',
  'أوساين بولت','مايكل فيلبس','سيرينا ويليامز','تايغر وودز','فلويد مايويذر',
  'نابليون بونابرت','ألبرت أينشتاين','إسحاق نيوتن','غاليليو','تشارلز داروين',
  'كليوباترا','يوليوس قيصر','الإسكندر الأكبر','جنكيز خان','صلاح الدين الأيوبي',
  'نيلسون مانديلا','مارتن لوثر كينغ','غاندي','ونستون تشرشل',
  'أم كلثوم','فيروز','عبدالحليم حافظ','فريد الأطرش','وردة الجزائرية',
  'محمد عبده','طلال مداح','كاظم الساهر','ماجد المهندس','أصالة',
  'عادل إمام','نور الشريف','يسرا','هند صبري','منى زكي',
  'أحمد زكي','محمود عبدالعزيز','دريد لحام','سعد الصغير','تامر حسني',
  'ياسر العرفات','صدام حسين','معمر القذافي','جمال عبدالناصر',
  'شارلي شابلن','مريلين مونرو','أودري هيبورن','بروس لي','جاكي شان',
  'جيم كاري','آدم ساندلر','ستيف كاريل','مورغان فريمان','دنيا سمير غانم',
];

// 🐾 حيوانات
const ANIMALS = [
  'أسد','نمر','فيل','زرافة','دب','ذئب','ثعلب','أرنب','قرد','غوريلا',
  'حصان','جمل','بقرة','خروف','دجاجة','بطريق','كنغر','كوالا','باندا','حمار',
  'تمساح','حية','ضفدع','سلحفاة','قرش','دلفين','حوت','أخطبوط','فرس النهر','وحيد القرن',
  'نسر','صقر','بومة','ببغاء','طاووس','هدهد','عقاب','نعامة','خفاش','حمامة',
  'قنفذ','سنجاب','فهد','حمار وحشي','ضبع','غزال','فيل بحري','كركدن','جاموس',
  'عقرب','ضبة','ثعبان الكوبرا','قطة','كلب','ديك','بطة','أوز','سمكة','كراكي',
  'قرد الشمبانزي','الدب القطبي','الثعلب القطبي','الذئب الرمادي','النمر الثلجي',
];

// 🎬 أفلام ومسلسلات معروفة
const MOVIES = [
  'تيتانيك','الأسد الملك','هاري بوتر','ستار وورز','الرجل العنكبوت',
  'أفاتار','الجوكر','باتمان','سوبرمان','الرجل الحديدي',
  'إنترستيلار','المصفوفة','الأب الروحي','شينلر ليست','فورست غامب',
  'جيمس بوند','ميشن إمبوسيبل','فاست فيوريوس','ترانسفورمرز','أفنجرز',
  'توي ستوري','فروزن','شريك','المدهشون','كارز',
  'ديدبول','لوغان','كابتن أمريكا','ثور','غوردانز رينجرز',
  'باب الحارة','بقعة ضوء','مرايا','ضيعة ضايعة','عطر الشام',
  'نسر الصعيد','الملك','الجماعة','قيامة أرطغرل','حريم السلطان',
  'بريكنج باد','غيم أوف ثرونز','فريندز','ذا أوفيس','سترنجر ثينغز',
  'لوسيفر','فيكينغز','نارككوس','مانداليوريان','ذا كراون',
  'دكتور هاوس','CSI','ووكنق ديد','بريزن بريك','سبونج بوب',
  'توم وجيري','بوكيمون','دراغون بول','ناروتو','ون بيس',
  'الحارة','سامي وسيف','أبو جانتي','مسلسل نور','سلسل الذهب',
  'إنديانا جونز','الجاسوس','شيرلوك هولمز','هرقل بوارو','جيمس بوند',
];

// 🌍 دول وأماكن مشهورة
const PLACES = [
  'أمريكا','الصين','روسيا','فرنسا','ألمانيا','إنجلترا','إيطاليا','إسبانيا','اليابان','الهند',
  'البرازيل','أستراليا','كندا','المكسيك','كوريا الجنوبية','تركيا','مصر','السعودية','العراق','الإمارات',
  'المغرب','الأرجنتين','جنوب أفريقيا','إيران','باكستان','هولندا','السويد','سويسرا','اليونان','البرتغال',
  'باريس','لندن','روما','مدريد','برلين','طوكيو','بكين','موسكو','واشنطن','نيويورك',
  'دبي','الرياض','القاهرة','بغداد','أبوظبي','الكويت','الدوحة','عمّان','بيروت','دمشق',
  'طهران','إسطنبول','أثينا','أمستردام','برشلونة','ميلان','ميونيخ','فيينا','براغ','سيدني',
  'برج إيفل','الأهرامات','برج خليفة','تمثال الحرية','برج بيزا المائل',
  'الكولوسيوم','سور الصين العظيم','البتراء','ماتشو بيتشو','تاج محل',
  'أبو سمبل','شلالات نياغارا','جبل فوجي','جبل إيفرست','جزر المالديف',
  'الكعبة المشرفة','المسجد النبوي','القدس','ديزني لاند','مدينة البندقية',
  'درب التبانة','نهر الأمازون','الصحراء الكبرى','الربع الخالي','غابة الأمازون',
  'الحاجز المرجاني العظيم','جزيرة هاواي','جزيرة بالي','كيب تاون','ريو دي جانيرو',
];

const NORMAL_WORDS = [...PERSONS, ...ANIMALS, ...MOVIES, ...PLACES];

// 💬 أمثال شعبية (50)
const AMTHAL = [
  'العقل زينة',
  'الصبر مفتاح الفرج',
  'من جد وجد',
  'اتق شر من أحسنت إليه',
  'الوقت كالسيف إن لم تقطعه قطعك',
  'خير الكلام ما قل ودل',
  'الحر تكفيه الإشارة',
  'القناعة كنز لا يفنى',
  'أهل مكة أدرى بشعابها',
  'درهم وقاية خير من قنطار علاج',
  'العين بصيرة واليد قصيرة',
  'إذا كان الكلام من فضة فالسكوت من ذهب',
  'الجار قبل الدار',
  'يد واحدة لا تصفق',
  'من حفر حفرة لأخيه وقع فيها',
  'البعد عن العين بعد عن القلب',
  'العصفور في اليد خير من عشرة على الشجرة',
  'الغائب حجته معه',
  'لا تؤجل عمل اليوم إلى الغد',
  'ما حك جلدك مثل ظفرك',
  'كل فتاة بأبيها معجبة',
  'العلم في الصغر كالنقش على الحجر',
  'الكذب مقياسه قصير',
  'الجاهل عدو نفسه',
  'من طلب العلا سهر الليالي',
  'رب أخ لك لم تلده أمك',
  'الفرصة لا تأتي مرتين',
  'الصديق وقت الضيق',
  'المرء كثير بأخيه',
  'الشجرة المثمرة يرمونها بالحجارة',
  'من أمن العقوبة أساء الأدب',
  'ربما أضرك ما تتمنى',
  'ما ضاع حق وراءه مطالب',
  'الناس للناس',
  'المعدة بيت الداء',
  'اعمل خيرا وارمه في البحر',
  'العجلة من الشيطان',
  'بالعقل لا بالطول',
  'ابدأ بنفسك',
  'الحسنة تمحو السيئة',
  'إن مع العسر يسرا',
  'للصبر حدود',
  'زرع الخير يبقى ثمره',
  'الحمد لله على كل حال',
  'خذ من الدنيا ما أعطتك',
  'الإنسان مرهون بعمله',
  'كن ابن من شئت واكتسب أدبا',
  'أعطِ الخبازَ خبزه ولو أكل نصفه',
  'استعن بالصبر والصلاة',
  'بلا سبب ما يجي الطرب',
];

// 📜 أبيات شعر معروفة (50)
const ASHAAR = [
  'لكل داء دواء يستطب به إلا الحماقة أعيت من يداويها',
  'على قدر أهل العزم تأتي العزائم وتأتي على قدر الكرام المكارم',
  'وما نيل المطالب بالتمني ولكن تؤخذ الدنيا غلابا',
  'إذا المرء لا يرعاك إلا تكلفا فدعه ولا تكثر عليه التأسفا',
  'إذا أنت أكرمت الكريم ملكته وإن أنت أكرمت اللئيم تمردا',
  'تعلم فليس المرء يولد عالما وليس أخو علم كمن هو جاهل',
  'عش عزيزا أو مت وأنت كريم بين أسياف مجدك والمكارم',
  'إذا كنت في نعمة فارعها إن المعاصي تزيل النعم',
  'إذا الشعب يوما أراد الحياة فلا بد أن يستجيب القدر',
  'بلادي وإن جارت علي عزيزة وأهلي وإن ضنوا علي كرام',
  'ألا ليت الشباب يعود يوما فأخبره بما فعل المشيب',
  'إنما الأمم الأخلاق ما بقيت فإن هم ذهبت أخلاقهم ذهبوا',
  'وطني لو شغلت بالخلد عنه نازعتني إليه في الخلد نفسي',
  'ليس الجمال بأثواب تزيننا إن الجمال جمال العلم والأدب',
  'لا تقل من أين أبدأ قل هنا أبدأ الآن',
  'ما أجمل الدنيا إذا ابتسمت لنا وما أقسى الأيام حين تعبس',
  'الصبر جميل والفرج قريب ومن صبر ظفر بما يريد',
  'يا دار ما فعلت بك الأيام وكيف غيرتك الليالي والعام',
  'رحل الذين أحبهم وبقيت مثل السيف فرد',
  'كن ابن يومك لا تضيع ساعة في غد مجهول أو أمس قد مضى',
  'الشمس تشرق كل يوم وتغيب وما بين الشروق والغياب حياة',
  'من يزرع الخير يحصد السعادة ومن يزرع الشر يحصد الندامة',
  'وخير الناس ذو قلب سليم وخير العيش ما صفا ودام',
  'لكل شيء إذا ما تم نقصان فلا يغر بطيب العيش إنسان',
  'سأظل أمشي وإن طالت بي الدروب ما دام في القلب أمل وفي الروح حب',
  'يا أيها الإنسان ما أغراك بربك الكريم',
  'إذا أعياك داء فاطلب شفاءه من الله فهو الشافي الكافي',
  'أبي الذي علمني كيف أكون رجلا وأمي التي علمتني كيف أحب',
  'قالوا الغياب يميت الحب قلت لهم وكيف يموت ما في القلب',
  'سلامي على وطني كل يوم وللوطن الحب والانتماء',
  'أنا من أهوى ومن أهوى أنا نحن روحان حللنا بدنا',
  'وللموت خير من حياة الذليل في ظل من لا يريد له الكرامة',
  'يا قلب كم لاقيت من هموم ومع ذلك ما زلت تنبض',
  'ترحل عني ولكن لا تغيب عن بالي فأنت روحي وأنت سبب حياتي',
  'يا أمة العرب قومي من رقادك فالمجد ينتظر صحوتك',
  'وإذا تأملت الحياة وجدتها مثل الخيال تزول وتنقضي',
  'شعرت بأن الأرض ضاقت رحابها وأن السماء أغلقت أبوابها',
  'إذا لم تستح فاصنع ما شئت فالحياء زينة الرجال',
  'لا تبكِ على اللبن المسكوب فما مضى لن يعود',
  'ما أجمل العيش لو أن الفتى حجر تنبو الصروف عنه وهو صلد',
  'حياتك لحظات اغتنمها قبل أن تفوتها اللحظات',
  'فلو أن ما أسعى لأدنى معيشة كفاني ولم أطلب قليل من المال',
  'يقولون لي فيك انقباض وإنما رأوا رجلا عن موقف الذل أحجما',
  'وتظن روحي أن هذا الوداع يصبح لقاء في يوم ما',
  'أحب أمي حبا جما وقلبي بحبها طافح',
  'كم ذا يكابد عاشق متيم طول الليالي وهو يبكي ويلوم',
  'وفي الليل من نجم يضيء لنا الدروب وفي الفجر أمل جديد',
  'لو كان في قلبي سواك ما بكيت عليك دمعة',
  'يا رب لك الحمد كما ينبغي لجلال وجهك وعظيم سلطانك',
  'لا تغضب ولا تيأس وثق بالله دائما فهو الكريم وهو الرزاق',
];

// ─────────────────────────────────────────────────────────────

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildRounds() {
  const normal = shuffle(NORMAL_WORDS).slice(0, 8);
  const mathal = shuffle(AMTHAL)[0];
  const shear  = shuffle(ASHAAR)[0];
  return [
    ...normal.map(w => ({ word: w, type: 'normal' })),
    { word: mathal, type: 'mathal' },
    { word: shear,  type: 'shear'  },
  ];
}

// ── شاشة الإعداد ─────────────────────────────────────────────
function SetupScreen({ onStart }) {
  const [timeLimit, setTimeLimit] = useState(60);

  return (
    <ScrollView style={s.setupContainer} contentContainerStyle={s.setupContent}>
      <Text style={s.title}>🕺 بدون كلام</Text>
      <Text style={s.subtitle}>مثّل الكلمة وفريقك يخمّن قبل انتهاء الوقت</Text>

      <View style={s.section}>
        <Text style={s.label}>وقت كل جولة للتمثيل</Text>
        <View style={s.options}>
          {[45, 60, 90].map(t => (
            <TouchableOpacity
              key={t}
              style={[s.optBtn, timeLimit === t && s.optBtnActive]}
              onPress={() => setTimeLimit(t)}
            >
              <Text style={[s.optText, timeLimit === t && s.optTextActive]}>{t}ث</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={s.infoCard}>
        <Text style={s.infoTitle}>📋 هيكل الجولات العشر</Text>
        <Text style={s.infoRow}>🎭 جولات 1–8: أشخاص / حيوانات / أفلام / أماكن</Text>
        <Text style={s.infoRow}>💬 جولة 9: مثل شعبي</Text>
        <Text style={s.infoRow}>📜 جولة 10: بيت شعر</Text>
        <Text style={s.infoNote}>كل جولة = 10 نقاط • السرقة = 10 نقاط</Text>
      </View>

      <View style={s.statsCard}>
        <Text style={s.statsTitle}>📊 بنك الكلمات</Text>
        <Text style={s.statsRow}>👤 {PERSONS.length} شخصية مشهورة</Text>
        <Text style={s.statsRow}>🐾 {ANIMALS.length} حيوان</Text>
        <Text style={s.statsRow}>🎬 {MOVIES.length} فيلم ومسلسل</Text>
        <Text style={s.statsRow}>🌍 {PLACES.length} دولة ومكان</Text>
        <Text style={s.statsRow}>💬 {AMTHAL.length} مثل شعبي</Text>
        <Text style={s.statsRow}>📜 {ASHAAR.length} بيت شعر</Text>
        <Text style={s.statsTotal}>المجموع: {NORMAL_WORDS.length + AMTHAL.length + ASHAAR.length} عنصر</Text>
      </View>

      <TouchableOpacity style={s.startBtn} onPress={() => onStart({ timeLimit })}>
        <Text style={s.startText}>ابدأ اللعبة ←</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ── شاشة اللعب ───────────────────────────────────────────────
function PlayScreen({ timeLimit, onBack }) {
  const rounds = useRef(buildRounds()).current;
  const [roundIndex, setRoundIndex] = useState(0);
  const [scores, setScores] = useState([0, 0]);
  const [actingTeam, setActingTeam] = useState(0);
  const [phase, setPhase] = useState('ready');
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const timerColor = useRef(new Animated.Value(0)).current;

  const currentRound = rounds[roundIndex];
  const isLastTwoRounds = roundIndex >= 8;
  const roundLabel = roundIndex < 8
    ? `جولة ${roundIndex + 1}`
    : roundIndex === 8 ? 'جولة الأمثال 💬' : 'جولة الشعر 📜';

  useEffect(() => {
    if (phase !== 'acting') return;
    if (timeLeft <= 0) { setPhase('steal'); return; }
    const t = setTimeout(() => setTimeLeft(x => x - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, timeLeft]);

  useEffect(() => {
    Animated.timing(timerColor, {
      toValue: timeLeft < 10 ? 1 : 0,
      duration: 300, useNativeDriver: false,
    }).start();
  }, [timeLeft < 10]);

  const timerBg = timerColor.interpolate({
    inputRange: [0, 1], outputRange: ['#1e1b4b', '#450a0a'],
  });

  function startActing() { setPhase('acting'); setTimeLeft(timeLimit); }

  function teamGuessed() {
    const ns = [...scores]; ns[actingTeam] += 10; nextRound(ns);
  }
  function stealSuccess() {
    const other = actingTeam === 0 ? 1 : 0;
    const ns = [...scores]; ns[other] += 10; nextRound(ns);
  }
  function stealFailed() { nextRound(scores); }

  function nextRound(ns) {
    setScores(ns);
    if (roundIndex + 1 >= rounds.length) { setPhase('done'); return; }
    setRoundIndex(i => i + 1);
    setActingTeam(t => t === 0 ? 1 : 0);
    setPhase('ready');
  }

  if (phase === 'done') {
    const winner = scores[0] > scores[1] ? 'الفريق الأول'
      : scores[1] > scores[0] ? 'الفريق الثاني' : null;
    return (
      <View style={s.centerContainer}>
        <Text style={s.bigEmoji}>🏆</Text>
        <Text style={s.winnerTitle}>{winner ? `${winner} فاز!` : 'تعادل!'}</Text>
        <View style={s.finalScores}>
          <View style={s.finalTeam}>
            <Text style={s.finalTeamName}>الفريق الأول</Text>
            <Text style={[s.finalScore, scores[0] >= scores[1] && s.finalScoreWin]}>{scores[0]}</Text>
          </View>
          <Text style={s.vs}>VS</Text>
          <View style={s.finalTeam}>
            <Text style={s.finalTeamName}>الفريق الثاني</Text>
            <Text style={[s.finalScore, scores[1] > scores[0] && s.finalScoreWin]}>{scores[1]}</Text>
          </View>
        </View>
        <TouchableOpacity style={s.actionBtn} onPress={onBack}>
          <Text style={s.actionText}>العودة للقائمة</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (phase === 'steal') {
    const other = actingTeam === 0 ? 1 : 0;
    return (
      <View style={s.centerContainer}>
        <Text style={s.bigEmoji}>⏰</Text>
        <Text style={s.phaseTitle}>انتهى الوقت!</Text>
        <Text style={s.stealPrompt}>فرصة الفريق {other === 0 ? 'الأول' : 'الثاني'} للسرقة 🔥</Text>
        <Text style={s.stealHint}>جواب واحد فقط</Text>
        <View style={s.stealBtns}>
          <TouchableOpacity style={s.stealFailBtn} onPress={stealFailed}>
            <Text style={s.stealFailText}>✗ خطأ</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.stealSuccessBtn} onPress={stealSuccess}>
            <Text style={s.stealSuccessText}>✓ صح! +10</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={s.skipRoundBtn} onPress={() => nextRound(scores)}>
          <Text style={s.skipRoundText}>تخطي الجولة</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (phase === 'ready') {
    return (
      <View style={s.centerContainer}>
        <View style={s.scoreboard}>
          <View style={[s.scoreTeam, actingTeam === 0 && s.scoreTeamActive]}>
            <Text style={s.scoreTeamName}>الفريق الأول</Text>
            <Text style={s.scoreTeamScore}>{scores[0]}</Text>
          </View>
          <View style={[s.scoreTeam, actingTeam === 1 && s.scoreTeamActive]}>
            <Text style={s.scoreTeamName}>الفريق الثاني</Text>
            <Text style={s.scoreTeamScore}>{scores[1]}</Text>
          </View>
        </View>
        <Text style={s.roundLabel}>{roundLabel}</Text>
        {isLastTwoRounds && (
          <Text style={s.specialHint}>
            {roundIndex === 8 ? '💬 مثل شعبي — مثّله بأي طريقة!' : '📜 بيت شعر — المهم فريقك يعرفه!'}
          </Text>
        )}
        <Text style={s.phaseTitle}>دور الفريق {actingTeam === 0 ? 'الأول' : 'الثاني'}</Text>
        <Text style={s.instruction}>الممثل فقط يضغط "اكشف"{'\n'}والباقين يغمضون أعينهم</Text>
        <TouchableOpacity style={s.actionBtn} onPress={startActing}>
          <Text style={s.actionText}>اكشف ←</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.centerContainer}>
      <Animated.View style={[s.timerCircle, { backgroundColor: timerBg }]}>
        <Text style={[s.timerText, timeLeft < 10 && s.timerTextRed]}>{timeLeft}</Text>
      </Animated.View>
      <View style={[s.wordCard, isLastTwoRounds && s.wordCardSpecial]}>
        {isLastTwoRounds && (
          <Text style={s.wordType}>
            {currentRound.type === 'mathal' ? '💬 مثل شعبي' : '📜 بيت شعر'}
          </Text>
        )}
        <Text style={[s.wordText, isLastTwoRounds && s.wordTextSmall]}>
          {currentRound.word}
        </Text>
      </View>
      <View style={s.liveScores}>
        <Text style={s.liveScore}>الأول: {scores[0]}</Text>
        <Text style={s.liveScoreSep}>|</Text>
        <Text style={s.liveScore}>الثاني: {scores[1]}</Text>
      </View>
      <TouchableOpacity style={s.correctBtn} onPress={teamGuessed}>
        <Text style={s.correctText}>✓ الفريق خمّن صح! +10</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── المكوّن الرئيسي ─────────────────────────────────────────
export default function ActItOutScreen({ onBack }) {
  const [gameStarted, setGameStarted] = useState(false);
  const [config, setConfig] = useState(null);

  return (
    <View style={{ flex: 1, backgroundColor: '#06061a' }}>
      <StatusBar barStyle="light-content" backgroundColor="#06061a" />
      <TouchableOpacity style={s.backBtn} onPress={onBack}>
        <Text style={s.backText}>→ رجوع</Text>
      </TouchableOpacity>
      {!gameStarted
        ? <SetupScreen onStart={cfg => { setConfig(cfg); setGameStarted(true); }} />
        : <PlayScreen timeLimit={config.timeLimit} onBack={onBack} />
      }
    </View>
  );
}

// ── الستايلات ────────────────────────────────────────────────
const s = StyleSheet.create({
  backBtn: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 8 },
  backText: { color: '#ec4899', fontSize: 16, fontWeight: '700' },
  setupContainer: { flex: 1, backgroundColor: '#06061a' },
  setupContent: { padding: 24, paddingBottom: 60, alignItems: 'center', gap: 20 },
  title: { color: '#fff', fontSize: 32, fontWeight: '900', marginTop: 8 },
  subtitle: { color: '#5a5a80', fontSize: 14, textAlign: 'center' },
  section: { width: '100%', gap: 12 },
  label: { color: '#ec4899', fontSize: 16, fontWeight: '700', textAlign: 'right' },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'flex-end' },
  optBtn: {
    paddingHorizontal: 18, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1.5, borderColor: '#ec489930', backgroundColor: '#0f0f2e',
  },
  optBtnActive: { borderColor: '#ec4899', backgroundColor: '#1a0a12' },
  optText: { color: '#5a5a80', fontSize: 15, fontWeight: '700' },
  optTextActive: { color: '#ec4899' },
  infoCard: {
    width: '100%', backgroundColor: '#0f0f2e',
    borderRadius: 16, borderWidth: 1.5, borderColor: '#ec489930', padding: 16, gap: 6,
  },
  infoTitle: { color: '#ec4899', fontSize: 15, fontWeight: '800', marginBottom: 4 },
  infoRow: { color: '#a0a0c0', fontSize: 13 },
  infoNote: { color: '#5a5a80', fontSize: 12, marginTop: 4 },
  statsCard: {
    width: '100%', backgroundColor: '#0a0a1e',
    borderRadius: 16, borderWidth: 1.5, borderColor: '#ffffff10', padding: 16, gap: 5,
  },
  statsTitle: { color: '#a78bfa', fontSize: 14, fontWeight: '800', marginBottom: 4 },
  statsRow: { color: '#5a5a80', fontSize: 12 },
  statsTotal: { color: '#a78bfa', fontSize: 13, fontWeight: '700', marginTop: 4 },
  startBtn: {
    backgroundColor: '#be185d', borderRadius: 16,
    paddingVertical: 16, paddingHorizontal: 48, marginTop: 8,
  },
  startText: { color: '#fff', fontSize: 18, fontWeight: '900' },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 20 },
  bigEmoji: { fontSize: 64 },
  phaseTitle: { color: '#fff', fontSize: 24, fontWeight: '900', textAlign: 'center' },
  instruction: { color: '#5a5a80', fontSize: 14, textAlign: 'center', lineHeight: 24 },
  roundLabel: { color: '#ec4899', fontSize: 18, fontWeight: '800' },
  specialHint: { color: '#f59e0b', fontSize: 13, textAlign: 'center' },
  scoreboard: { flexDirection: 'row', gap: 16 },
  scoreTeam: {
    flex: 1, alignItems: 'center', padding: 12,
    backgroundColor: '#0f0f2e', borderRadius: 14, borderWidth: 1.5, borderColor: '#ffffff10',
  },
  scoreTeamActive: { borderColor: '#ec489980', backgroundColor: '#1a0a12' },
  scoreTeamName: { color: '#5a5a80', fontSize: 12, fontWeight: '600' },
  scoreTeamScore: { color: '#fff', fontSize: 28, fontWeight: '900' },
  timerCircle: {
    width: 90, height: 90, borderRadius: 45,
    borderWidth: 2, borderColor: '#ec489940', alignItems: 'center', justifyContent: 'center',
  },
  timerText: { color: '#ec4899', fontSize: 36, fontWeight: '900' },
  timerTextRed: { color: '#ef4444' },
  wordCard: {
    backgroundColor: '#1a0a12', borderRadius: 24, borderWidth: 2, borderColor: '#ec489950',
    paddingVertical: 32, paddingHorizontal: 28, minWidth: 280, alignItems: 'center', gap: 8,
  },
  wordCardSpecial: { borderColor: '#f59e0b80', backgroundColor: '#1a1200' },
  wordType: { color: '#f59e0b', fontSize: 14, fontWeight: '700' },
  wordText: { color: '#fff', fontSize: 30, fontWeight: '900', textAlign: 'center' },
  wordTextSmall: { fontSize: 18 },
  liveScores: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  liveScore: { color: '#5a5a80', fontSize: 14, fontWeight: '600' },
  liveScoreSep: { color: '#3a3a60' },
  stealPrompt: { color: '#f59e0b', fontSize: 20, fontWeight: '800', textAlign: 'center' },
  stealHint: { color: '#5a5a80', fontSize: 14 },
  stealBtns: { flexDirection: 'row', gap: 14, width: '100%' },
  stealFailBtn: {
    flex: 1, paddingVertical: 16, borderRadius: 16,
    backgroundColor: '#1e1b4b', borderWidth: 1.5, borderColor: '#ffffff20', alignItems: 'center',
  },
  stealFailText: { color: '#5a5a80', fontSize: 16, fontWeight: '700' },
  stealSuccessBtn: { flex: 1, paddingVertical: 16, borderRadius: 16, backgroundColor: '#10b981', alignItems: 'center' },
  stealSuccessText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  skipRoundBtn: { marginTop: 4 },
  skipRoundText: { color: '#3a3a60', fontSize: 13 },
  actionBtn: { backgroundColor: '#be185d', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 40 },
  actionText: { color: '#fff', fontSize: 18, fontWeight: '900' },
  correctBtn: {
    backgroundColor: '#10b981', borderRadius: 16,
    paddingVertical: 18, paddingHorizontal: 32, width: '100%', alignItems: 'center',
  },
  correctText: { color: '#fff', fontSize: 17, fontWeight: '900' },
  winnerTitle: { color: '#fff', fontSize: 28, fontWeight: '900' },
  finalScores: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  finalTeam: { alignItems: 'center', gap: 6 },
  finalTeamName: { color: '#5a5a80', fontSize: 14, fontWeight: '600' },
  finalScore: { color: '#fff', fontSize: 48, fontWeight: '900' },
  finalScoreWin: { color: '#f59e0b' },
  vs: { color: '#3a3a60', fontSize: 20, fontWeight: '800' },
});
