import { useState, useRef, useEffect, useCallback, memo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, StatusBar, ScrollView, TextInput,
} from 'react-native';
import { useTheme } from './ThemeContext';
import { ManAnaEngraving } from './GameEngraving';
import { WebScreenButton, GameInfoButton } from './WebRoomService';
import { useT, useLanguage } from './I18n';
import { playSound } from './SoundService';
import { ThemedButton, ThemedCard, ThemedPill, ThemedModal, ThemedRow } from './ThemedComponents';

// ══════════════════════════════════════════════════════════════
//  قوائم الكلمات — التجربة العربية
// ══════════════════════════════════════════════════════════════
const WORDS_AR = {
  مشاهير: ['محمد علي كلاي','ميسي','كريستيانو رونالدو','أم كلثوم','فيروز','عادل إمام','براد بيت','ستيف جوبز','إيلون ماسك','نيلسون مانديلا','ألبرت أينشتاين','نابليون','كليوباترا','شكسبير','بيتهوفن','مايكل جاكسون','مارادونا','محمد صلاح','أوباما','هيتلر','بيل غيتس','ماريلين مونرو','ليوناردو دافنشي','غاندي','ماريا كوري','ستيفن هوكينج','إلفيس بريسلي','أرسطو','سقراط','يوليوس قيصر','تايغر وودز','لبرون جيمس','أوبرا وينفري','جاكي شان','بروس لي','تشارلي شابلن','ألفريد هيتشكوك','ستيفن سبيلبرغ','بيكاسو','موزارت','إسحاق نيوتن','داروين','فرويد','توماس إيديسون','نيل أرمسترونغ','يوري غاغارين','مدام تيريزا','لينكولن','جاستن بيبر','ريهانا'],
  مشاهير_عرب: ['عبدالحليم حافظ','وردة الجزائرية','نجاة الصغيرة','صباح','ماجدة الرومي','كاظم الساهر','عمرو دياب','محمد عبده','طلال مداح','فيصل علوي','رابح صقر','عبادي الجوهر','نوال الكويتية','ديانا حداد','أصالة','نانسي عجرم','إليسا','هيفاء وهبي','نجوى كرم','ماجدة','يوسف شاهين','عمر الشريف','فاتن حمامة','سعاد حسني','نادية لطفي','أحمد زكي','محمود عبدالعزيز','نور الشريف','يحيى الفخراني','حسين فهمي','مني زكي','غادة عادل','هند صبري','يسرا','ليلى علوي'],
  تاريخيون: ['صلاح الدين الأيوبي','هارون الرشيد','عمر بن الخطاب','خالد بن الوليد','طارق بن زياد','ابن بطوطة','ابن خلدون','ابن سينا','الخوارزمي','الرازي','عمر الخيام','المتنبي','هولاكو','جنكيز خان','سليمان القانوني','محمد الفاتح','ملكة سبأ','الإسكندر الأكبر','يوليوس قيصر','هانيبال','ريتشارد قلب الأسد','جان دارك','كريستوف كولومبس','رمسيس الثاني','توت عنخ آمون'],
  رياضيون: ['محمد صلاح','ميسي','كريستيانو رونالدو','مارادونا','بيليه','زيدان','رونالدو البرازيلي','رونالدينيو','كاكا','نيمار','مبابي','هالاند','لبرون جيمس','مايكل جوردان','كوبي براينت','محمد علي كلاي','تايسون','تايغر وودز','روجر فيدرر','رافاييل نادال','يوسين بولت','كارل لويس','مايكل شوماخر','لويس هاميلتون','سامي الجابر'],
  حيوانات: ['أسد','فيل','زرافة','بطريق','دلفين','قرد','نمر','تمساح','ببغاء','خروف','جمل','حصان','ذئب','ثعلب','أرنب','قنفذ','خفاش','حوت','قرش','كنغر','غوريلا','فهد','دب قطبي','حمار وحشي','وحيد القرن','أخطبوط','سلحفاة','طاووس','نعامة','حمامة','عقرب','كوالا','باندا','بومة','أفعى'],
  أماكن: ['برج إيفل','الكعبة المشرفة','الأهرامات','برج خليفة','تمثال الحرية','الكولوسيوم','سور الصين','أبو سمبل','بيج بن','شلالات نياغارا','جبل فوجي','البتراء','ماتشو بيتشو','برج بيزا المائل','أنغكور وات','تاج محل','أكروبوليس','ستونهنج','جبل إيفرست','الصحراء الكبرى','نهر النيل','نهر الأمازون','البحر الميت','مضيق هرمز'],
  أفلام: ['تيتانيك','أفاتار','الأسد الملك','شيرلوك هولمز','هاري بوتر','سبيدرمان','باتمان','سوبرمان','آيرون مان','كابتن أمريكا','إنترستيلار','ذا ماتريكس','جوراسيك بارك','لوردز أوف ذا رينجز','ستار وورز','ذا أفنجرز','فروزن','فايندينغ نيمو','شريك','كارز'],
  مهن: ['طبيب','مهندس','محامٍ','معلم','طيار','رجل إطفاء','شرطي','جراح','عالم','فنان','موسيقار','ممثل','مصمم','صحفي','مبرمج','مدير','رياضي','شيف','معماري','عازف'],
  كرتون: ['توم وجيري','باجز باني','سكوبي دو','سبونج بوب','ميكي ماوس','دونالد داك','أسماء','الملك سمبا','علاء الدين','سيندريلا','بياض الثلج','بينوكيو','دمبو','باماي','تارزان'],
};

const WORDS_EN = {
  celebrities: ['Muhammad Ali','Messi','Cristiano Ronaldo','Taylor Swift','Beyoncé','Tom Hanks','Brad Pitt','Steve Jobs','Elon Musk','Nelson Mandela','Albert Einstein','Napoleon','Cleopatra','Shakespeare','Beethoven','Michael Jackson','Maradona','Mohamed Salah','Obama','Hitler','Bill Gates','Marilyn Monroe','Leonardo da Vinci','Gandhi','Marie Curie','Stephen Hawking','Elvis Presley','Aristotle','Socrates','Julius Caesar','Tiger Woods','LeBron James','Oprah Winfrey','Jackie Chan','Bruce Lee','Charlie Chaplin','Alfred Hitchcock','Steven Spielberg','Picasso','Mozart','Isaac Newton','Darwin','Freud','Thomas Edison','Neil Armstrong','Yuri Gagarin','Mother Teresa','Lincoln','Justin Bieber','Rihanna'],
  celebrities2: ['Lady Gaga','Madonna','Ariana Grande','Adele','Ed Sheeran','Drake','Eminem','Kanye West','Jay-Z','Justin Timberlake','Leonardo DiCaprio','Johnny Depp','Robert Downey Jr','Scarlett Johansson','Jennifer Lawrence','Angelina Jolie','Will Smith','Denzel Washington','Morgan Freeman','Robert De Niro','Al Pacino','Tom Cruise','Keanu Reeves','Dwayne Johnson','Chris Hemsworth','Ryan Reynolds','Emma Watson','Kim Kardashian','Kylie Jenner','Cardi B','Billie Eilish','Selena Gomez','Harry Styles','BTS','Shakira'],
  historical: ['Saladin','Charlemagne','George Washington','Winston Churchill','Abraham Lincoln','Christopher Columbus','Marco Polo','Ibn Battuta','Ibn Sina','Leonardo da Vinci','Omar Khayyam','Galileo','Genghis Khan','Attila the Hun','Suleiman the Magnificent','Mehmed the Conqueror','Queen Elizabeth I','Alexander the Great','Julius Caesar','Hannibal','Richard the Lionheart','Joan of Arc','Napoleon Bonaparte','Ramses II','Tutankhamun'],
  athletes: ['Mohamed Salah','Messi','Cristiano Ronaldo','Maradona','Pelé','Zidane','Ronaldo (Brazil)','Ronaldinho','Kaká','Neymar','Mbappé','Haaland','LeBron James','Michael Jordan','Kobe Bryant','Muhammad Ali','Mike Tyson','Tiger Woods','Roger Federer','Rafael Nadal','Usain Bolt','Carl Lewis','Michael Schumacher','Lewis Hamilton','Serena Williams'],
  animals: ['Lion','Elephant','Giraffe','Penguin','Dolphin','Monkey','Tiger','Crocodile','Parrot','Sheep','Camel','Horse','Wolf','Fox','Rabbit','Hedgehog','Bat','Whale','Shark','Kangaroo','Gorilla','Cheetah','Polar Bear','Zebra','Rhinoceros','Octopus','Turtle','Peacock','Ostrich','Pigeon','Scorpion','Koala','Panda','Owl','Snake'],
  places: ['Eiffel Tower','Statue of Liberty','Pyramids of Giza','Burj Khalifa','White House','Colosseum','Great Wall of China','Mount Rushmore','Big Ben','Niagara Falls','Mount Fuji','Petra','Machu Picchu','Leaning Tower of Pisa','Angkor Wat','Taj Mahal','Acropolis','Stonehenge','Grand Canyon','Mount Everest','Sahara Desert','Nile River','Amazon River','Dead Sea','Sydney Opera House'],
  movies: ['Titanic','Avatar','The Lion King','Sherlock Holmes','Harry Potter','Spider-Man','Batman','Superman','Iron Man','Captain America','Interstellar','The Matrix','Jurassic Park','Lord of the Rings','Star Wars','The Avengers','Frozen','Finding Nemo','Shrek','Cars'],
  professions: ['Doctor','Engineer','Lawyer','Teacher','Pilot','Firefighter','Police Officer','Surgeon','Scientist','Artist','Musician','Actor','Designer','Journalist','Programmer','Manager','Athlete','Chef','Architect','Dancer'],
  cartoons: ['Tom and Jerry','Bugs Bunny','Scooby-Doo','SpongeBob','Mickey Mouse','Donald Duck','Pikachu','Simba','Aladdin','Cinderella','Snow White','Pinocchio','Dumbo','Bambi','Tarzan'],
};

const ALL_WORDS_AR = Object.values(WORDS_AR).flat();
const ALL_WORDS_EN = Object.values(WORDS_EN).flat();

// ─── نقاط ───────────────────────────────────────────────────
const POINTS_CORRECT = 10;
const POINTS_SKIP    = -2;
// ─── ثواني العداد قبل ظهور الكلمة ──────────────────────────
const REVEAL_COUNTDOWN = 3;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ══════════════════════════════════════════════════════════════
//  شاشة الإعداد — إدخال أسماء اللاعبين
// ══════════════════════════════════════════════════════════════
function SetupScreen({ onStart, theme, t, isGlobal }) {
  const [playerCount, setPlayerCount] = useState(4);
  const [timeLimit,   setTimeLimit]   = useState(120);
  const [names,       setNames]       = useState(['','','','']);

  const updateName = (i, v) => setNames(prev => { const n = [...prev]; n[i] = v; return n; });

  const syncCount = (count) => {
    setPlayerCount(count);
    setNames(prev => {
      const n = [...prev];
      while (n.length < count) n.push('');
      return n.slice(0, count);
    });
  };

  const handleStart = () => {
    const finalNames = names.map((nm, i) =>
      nm.trim() ? nm.trim() : (isGlobal ? `Player ${i + 1}` : `لاعب ${i + 1}`)
    );
    onStart({ playerCount, timeLimit, names: finalNames });
  };

  return (
    <ScrollView contentContainerStyle={[styles.setupContainer, { backgroundColor: 'transparent' }]}>
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.statusBg} />
      <Text style={[styles.title, { color: theme.accent }]}>
        {isGlobal ? '🤔 Who Am I?' : '🤔 من أنا؟'}
      </Text>
      <Text style={[styles.subtitle, { color: theme.textMuted }]}>
        {isGlobal ? 'Hold phone to forehead and guess' : 'ارفع الهاتف على جبهتك وخمّن الشخصية'}
      </Text>

      {/* عدد اللاعبين */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
          {isGlobal ? 'Number of Players' : 'عدد اللاعبين'}
        </Text>
        <View style={styles.options}>
          {[2,3,4,5,6,7,8].map(n => (
            <ThemedCard key={n} onPress={() => syncCount(n)} style={styles.optBtn} variant={playerCount === n ? 'accent' : 'default'}>
              <Text style={[styles.optText, { color: playerCount === n ? theme.accent : theme.textMuted }]}>{n}</Text>
            </ThemedCard>
          ))}
        </View>
      </View>

      {/* أسماء اللاعبين */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
          {isGlobal ? 'Player Names' : 'أسماء اللاعبين'}
        </Text>
        {names.map((nm, i) => (
          <TextInput
            key={i}
            style={[styles.nameInput, { backgroundColor: theme.bgCard, borderColor: theme.border, color: theme.textPrimary }]}
            placeholder={isGlobal ? `Player ${i + 1}` : `لاعب ${i + 1}`}
            placeholderTextColor={theme.textMuted}
            value={nm}
            onChangeText={v => updateName(i, v)}
            maxLength={20}
          />
        ))}
      </View>

      {/* الوقت */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
          {isGlobal ? 'Time Per Turn' : 'وقت كل دور'}
        </Text>
        <View style={styles.options}>
          {[60,90,120].map(tv => (
            <ThemedCard key={tv} onPress={() => setTimeLimit(tv)} style={styles.optBtn} variant={timeLimit === tv ? 'accent' : 'default'}>
              <Text style={[styles.optText, { color: timeLimit === tv ? theme.accent : theme.textMuted }]}>{isGlobal ? `${tv}s` : `${tv}ث`}</Text>
            </ThemedCard>
          ))}
        </View>
      </View>

      <ThemedButton onPress={handleStart} label={isGlobal ? 'Start Game →' : 'ابدأ اللعبة ←'} variant='primary' size='large' style={styles.startBtn} />
    </ScrollView>
  );
}

// ══════════════════════════════════════════════════════════════
//  شاشة اللعب الرئيسية
// ══════════════════════════════════════════════════════════════
function PlayScreen({ playerCount, timeLimit, playerNames, onBack, theme, t, isGlobal, themeId }) {
  const { lang } = useLanguage();
  const wordsPool = isGlobal ? ALL_WORDS_EN : ALL_WORDS_AR;
  const words = useRef(shuffle(wordsPool)).current;

  // ترتيب اللاعبين عشوائي
  const playerOrder = useRef(shuffle([...Array(playerCount).keys()])).current; // indices 0..n-1

  const [turnIndex,    setTurnIndex]    = useState(0);       // index في playerOrder
  const [wordIndex,    setWordIndex]    = useState(0);
  const [scores,       setScores]       = useState(() => Array(playerCount).fill(0));
  const [timeLeft,     setTimeLeft]     = useState(timeLimit);
  // phases: 'between' | 'countdown' | 'playing' | 'result' | 'finished'
  const [phase,        setPhase]        = useState('between');
  const [revealCount,  setRevealCount]  = useState(0); // عداد 3 ثواني قبل الكلمة

  const tiltAnim = useRef(new Animated.Value(0)).current;
  const tiltLoop = useRef(null);

  const currentPlayerIdx  = playerOrder[turnIndex]; // 0-based index في scores/names
  const currentPlayerName = playerNames[currentPlayerIdx];
  const totalTurns        = playerCount;

  // ─── مؤقت اللعب ────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing') return;
    if (timeLeft <= 0) { setPhase('result'); return; }
    if (timeLeft <= 5) playSound('countdown');
    const timer = setTimeout(() => setTimeLeft(s => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, timeLeft]);

  // ─── عداد الـ 3 ثواني قبل ظهور الكلمة ──────────────────────
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (revealCount <= 0) { setPhase('playing'); return; }
    const timer = setTimeout(() => setRevealCount(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, revealCount]);

  // ─── حركة الهاتف ───────────────────────────────────────────
  useEffect(() => {
    if (phase === 'playing') {
      tiltLoop.current = Animated.loop(Animated.sequence([
        Animated.timing(tiltAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(tiltAnim, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ]));
      tiltLoop.current.start();
    } else {
      tiltLoop.current?.stop();
      tiltAnim.setValue(0);
    }
    return () => tiltLoop.current?.stop();
  }, [phase]);

  const startReveal = useCallback(() => {
    setRevealCount(REVEAL_COUNTDOWN);
    setPhase('countdown');
  }, []);

  const startRound = useCallback(() => {
    setPhase('playing');
    setTimeLeft(timeLimit);
  }, [timeLimit]);

  const nextWord = useCallback(() => {
    if (wordIndex + 1 >= words.length) { setPhase('result'); return; }
    setRevealCount(REVEAL_COUNTDOWN);
    setPhase('countdown');
    setWordIndex(i => i + 1);
  }, [wordIndex, words.length]);

  const gotIt = useCallback(() => {
    setScores(prev => { const n = [...prev]; n[currentPlayerIdx] += POINTS_CORRECT; return n; });
    nextWord();
  }, [currentPlayerIdx, nextWord]);

  const skip = useCallback(() => {
    setScores(prev => { const n = [...prev]; n[currentPlayerIdx] = Math.max(0, n[currentPlayerIdx] + POINTS_SKIP); return n; });
    nextWord();
  }, [currentPlayerIdx, nextWord]);

  const nextTurn = useCallback(() => {
    const next = turnIndex + 1;
    if (next >= totalTurns) {
      setPhase('finished');
    } else {
      setTurnIndex(next);
      setPhase('between');
      setWordIndex(wi => wi); // keep global word index advancing
    }
  }, [turnIndex, totalTurns]);

  const rotate = tiltAnim.interpolate({ inputRange: [0, 1], outputRange: ['-5deg', '5deg'] });

  // ─── شريط تقدم اللعبة + زر خروج (مشترك في الأعلى) ─────────
  const TopBar = ({ showProgress = true }) => (
    <View style={styles.topBar}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <ThemedButton onPress={onBack} label={isGlobal ? '✕ Exit' : '✕ خروج'} variant='ghost' size='small' style={styles.exitBtn} />
        <GameInfoButton gameType="man_ana" lang={lang} />
        <WebScreenButton
          playerUid={`mana_${playerNames?.[0] || 'p0'}`}
          playerName={currentPlayerName || ''}
          gameType="man_ana"
          getPublicData={() => ({ currentWord: word, turnIndex, currentPlayer: currentPlayerName })}
          themeName={themeId || 'dark'}
        />
      </View>
      {showProgress && (
        <View style={styles.progressWrap}>
          <Text style={[styles.turnLabel, { color: theme.textMuted }]}>
            {isGlobal ? `Turn ${turnIndex + 1}/${totalTurns}` : `دور ${turnIndex + 1}/${totalTurns}`}
          </Text>
          <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
            <View style={[styles.progressFill, { backgroundColor: theme.accent, width: `${((turnIndex) / totalTurns) * 100}%` }]} />
          </View>
        </View>
      )}
    </View>
  );

  // ══════════════════════════════════════════════════════════════
  // ── 🏁 الشاشة النهائية ──────────────────────────────────────
  // ══════════════════════════════════════════════════════════════
  if (phase === 'finished') {
    const ranked = scores
      .map((s, i) => ({ name: playerNames[i], score: s, idx: i }))
      .sort((a, b) => b.score - a.score);
    const medals = ['🥇','🥈','🥉'];
    return (
      <View style={[styles.screen, { backgroundColor: 'transparent' }]}>
        <TopBar showProgress={false} />
        <ScrollView contentContainerStyle={styles.finishedContent}>
          <Text style={styles.trophyEmoji}>🏆</Text>
          <Text style={[styles.winnerName, { color: theme.accent }]}>{ranked[0].name}</Text>
          <Text style={[styles.winnerScore, { color: theme.textPrimary }]}>
            {ranked[0].score} {isGlobal ? 'pts' : 'نقطة'}
          </Text>
          <View style={[styles.rankList, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
            {ranked.map((r, i) => (
              <View key={r.idx} style={[styles.rankRow, i < ranked.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
                <Text style={styles.rankMedal}>{medals[i] ?? `#${i + 1}`}</Text>
                <Text style={[styles.rankName, { color: theme.textPrimary }]}>{r.name}</Text>
                <Text style={[styles.rankScore, { color: theme.accent }]}>
                  {r.score} {isGlobal ? 'pts' : 'نقطة'}
                </Text>
              </View>
            ))}
          </View>
          <ThemedButton onPress={onBack} label={isGlobal ? 'Return Home' : 'العودة للرئيسية'} variant='primary' size='large' style={[styles.startBtn, { marginTop: 24 }]} />
        </ScrollView>
      </View>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // ── بين الأدوار — يظهر النقاط وزر التالي ──────────────────
  // ══════════════════════════════════════════════════════════════
  if (phase === 'between') {
    const nextPlayerIdx = playerOrder[turnIndex];
    const nextPlayerName = playerNames[nextPlayerIdx];
    const sortedScores = scores
      .map((s, i) => ({ name: playerNames[i], score: s }))
      .sort((a, b) => b.score - a.score);

    return (
      <View style={[styles.screen, { backgroundColor: 'transparent' }]}>
        <TopBar />
        <ScrollView contentContainerStyle={styles.betweenContent}>
          <Text style={styles.phoneEmoji}>📱</Text>
          <Text style={[styles.roundTitle, { color: theme.textPrimary }]}>
            {isGlobal ? `${nextPlayerName}'s Turn` : `دور ${nextPlayerName}`}
          </Text>
          <Text style={[styles.instruction, { color: theme.textMuted }]}>
            {isGlobal
              ? 'Hold the phone up so other players\ncan see it and answer your questions'
              : 'احمل الهاتف بيدك ليراه اللاعبون الآخرون\nويجيبوا عن الشخصية التي تمثّلها'}
          </Text>

          {/* نقاط اللاعبين بين الأدوار */}
          {turnIndex > 0 && (
            <View style={[styles.scoreboard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
              <Text style={[styles.scoreboardTitle, { color: theme.textSecondary }]}>
                {isGlobal ? 'Scores' : 'النقاط'}
              </Text>
              {sortedScores.map((r, i) => (
                <View key={i} style={styles.scoreboardRow}>
                  <Text style={[styles.scoreboardName, { color: theme.textPrimary }]}>{r.name}</Text>
                  <Text style={[styles.scoreboardScore, { color: theme.accent }]}>
                    {r.score} {isGlobal ? 'pts' : 'نقطة'}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <ThemedButton onPress={startReveal} label={isGlobal ? '▶ Start Turn' : '▶ ابدأ الدور'} variant='success' size='large' style={styles.startBtn} />
        </ScrollView>
      </View>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // ── عداد 3 ثواني قبل ظهور الكلمة ──────────────────────────
  // ══════════════════════════════════════════════════════════════
  if (phase === 'countdown') {
    return (
      <View style={[styles.screen, { backgroundColor: 'transparent' }]}>
        <TopBar />
        <View style={styles.centeredContent}>
          <Text style={[styles.countdownNumber, { color: theme.accent }]}>
            {revealCount > 0 ? revealCount : ''}
          </Text>
          <Text style={[styles.instruction, { color: theme.textMuted }]}>
            {isGlobal ? 'Get ready...' : 'استعد...'}
          </Text>
        </View>
      </View>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // ── نهاية الدور — انتهى الوقت ──────────────────────────────
  // ══════════════════════════════════════════════════════════════
  if (phase === 'result') {
    const isLast = turnIndex + 1 >= totalTurns;
    return (
      <View style={[styles.screen, { backgroundColor: 'transparent' }]}>
        <TopBar />
        <View style={styles.centeredContent}>
          <Text style={styles.phoneEmoji}>⏱️</Text>
          <Text style={[styles.roundTitle, { color: theme.textPrimary }]}>
            {isGlobal
              ? `Time's up for ${currentPlayerName}!`
              : `انتهى وقت ${currentPlayerName}!`}
          </Text>
          <Text style={[styles.scoreBig, { color: theme.accent }]}>
            {scores[currentPlayerIdx]} {isGlobal ? 'pts' : 'نقطة'}
          </Text>
          <ThemedButton
            onPress={nextTurn}
            label={isLast ? (isGlobal ? 'See Results 🏆' : 'عرض النتائج 🏆') : (isGlobal ? `Next: ${playerNames[playerOrder[turnIndex + 1]]} →` : `→ دور ${playerNames[playerOrder[turnIndex + 1]]}`)}
            variant='primary' size='large'
            style={styles.startBtn}
          />
        </View>
      </View>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // ── أثناء اللعب ────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════
  const word = words[wordIndex] || '';
  const timerPct = (timeLeft / timeLimit) * 100;
  const timerColor = timeLeft > timeLimit * 0.4 ? theme.accent : timeLeft > timeLimit * 0.2 ? '#f59e0b' : '#ef4444';

  return (
    <View style={[styles.screen, { backgroundColor: 'transparent' }]}>
      <TopBar />

      {/* شريط الوقت */}
      <View style={[styles.timerTrack, { backgroundColor: theme.border }]}>
        <Animated.View style={[styles.timerFill, { backgroundColor: timerColor, width: `${timerPct}%` }]} />
      </View>

      <View style={styles.playContent}>
        <Text style={[styles.timerText, { color: timerColor }]}>{timeLeft}{isGlobal ? 's' : 'ث'}</Text>

        <Animated.View style={[styles.phoneWrap, { transform: [{ rotate }] }]}>
          <View style={[styles.phoneCard, { backgroundColor: theme.bgCard, borderColor: theme.accentBorder }]}>
            <Text style={[styles.wordText, { color: theme.textPrimary }]}>{word}</Text>
          </View>
        </Animated.View>

        <Text style={[styles.playerLabel, { color: theme.textSecondary }]}>
          {isGlobal ? currentPlayerName : currentPlayerName}
        </Text>

        <View style={styles.actionRow}>
          <ThemedCard onPress={gotIt} style={styles.actionBtn} variant='success'>
            <Text style={[styles.actionText, { color: '#fff' }]}>{isGlobal ? '✅ Correct\n+10' : '✅ عرّفها\n+١٠'}</Text>
          </ThemedCard>
          <ThemedCard onPress={skip} style={styles.actionBtn}>
            <Text style={[styles.actionText, { color: theme.textSecondary }]}>{isGlobal ? '⏭ Skip\n-2' : '⏭ تخطي\n-٢'}</Text>
          </ThemedCard>
        </View>
      </View>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════
//  الجذر
// ══════════════════════════════════════════════════════════════
export default function ManAnaScreen({ onBack, isGlobal = false }) {
  const { theme, themeId } = useTheme();
  const t = useT();
  const [gameConfig, setGameConfig] = useState(null);

  const handleStart = useCallback((config) => setGameConfig(config), []);
  const handleBack  = useCallback(() => {
    if (gameConfig) setGameConfig(null);
    else onBack();
  }, [gameConfig, onBack]);

  return (
    <View style={[styles.root, { backgroundColor: 'transparent' }]}>
      <ManAnaEngraving theme={theme} />
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.statusBg} />
      {!gameConfig
        ? (
          <>
            <SetupScreen onStart={handleStart} theme={theme} t={t} isGlobal={isGlobal} />
            <ThemedButton onPress={onBack} label={t('common.back')} variant='ghost' size='small' style={styles.backBtn} />
          </>
        )
        : (
          <PlayScreen
            playerCount={gameConfig.playerCount}
            timeLimit={gameConfig.timeLimit}
            playerNames={gameConfig.names}
            onBack={handleBack}
            theme={theme}
            t={t}
            isGlobal={isGlobal}
            themeId={themeId}
          />
        )
      }
    </View>
  );
}

const HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

const styles = StyleSheet.create({
  root:             { flex: 1 },
  screen:           { flex: 1 },

  // TopBar
  topBar:           { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 10, gap: 12 },
  exitBtn:          { paddingVertical: 6, paddingHorizontal: 4 },
  exitText:         { fontSize: 15, fontWeight: '700' },
  progressWrap:     { flex: 1, gap: 4 },
  turnLabel:        { fontSize: 12, fontWeight: '600', textAlign: 'right' },
  progressTrack:    { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill:     { height: '100%', borderRadius: 3 },

  // Timer bar
  timerTrack:       { height: 5, marginHorizontal: 16, borderRadius: 3, overflow: 'hidden' },
  timerFill:        { height: '100%', borderRadius: 3 },

  // Setup
  backBtn:          { position: 'absolute', top: 52, right: 20, padding: 8 },
  backText:         { fontSize: 15, fontWeight: '700' },
  setupContainer:   { flexGrow: 1, padding: 24, paddingTop: 60, gap: 24 },
  title:            { fontSize: 30, fontWeight: '900', textAlign: 'center' },
  subtitle:         { fontSize: 14, textAlign: 'center' },
  section:          { gap: 10 },
  sectionLabel:     { fontSize: 15, fontWeight: '700' },
  options:          { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  optBtn:           { borderRadius: 12, paddingHorizontal: 18, paddingVertical: 10, borderWidth: 1.5 },
  optText:          { fontSize: 15, fontWeight: '700' },
  nameInput:        { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, textAlign: 'right' },
  startBtn:         { paddingVertical: 18, borderRadius: 16, alignItems: 'center', elevation: 8 },
  startText:        { fontSize: 18, fontWeight: '800' },

  // Between turns
  betweenContent:   { flexGrow: 1, alignItems: 'center', padding: 24, gap: 20 },
  phoneEmoji:       { fontSize: 64, marginTop: 10 },
  roundTitle:       { fontSize: 24, fontWeight: '800', textAlign: 'center' },
  instruction:      { fontSize: 15, textAlign: 'center', lineHeight: 24 },
  scoreboard:       { width: '100%', borderRadius: 16, borderWidth: 1.5, padding: 16, gap: 10 },
  scoreboardTitle:  { fontSize: 13, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  scoreboardRow:    { flexDirection: 'row', justifyContent: 'space-between' },
  scoreboardName:   { fontSize: 15, fontWeight: '600' },
  scoreboardScore:  { fontSize: 15, fontWeight: '800' },

  // Countdown
  centeredContent:  { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 20 },
  countdownNumber:  { fontSize: 96, fontWeight: '900' },

  // Playing
  playContent:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, padding: 24 },
  timerText:        { fontSize: 48, fontWeight: '900' },
  phoneWrap:        { width: '100%' },
  phoneCard:        { borderRadius: 24, padding: 32, alignItems: 'center', borderWidth: 2, minHeight: 160, justifyContent: 'center' },
  wordText:         { fontSize: 32, fontWeight: '900', textAlign: 'center', lineHeight: 44 },
  playerLabel:      { fontSize: 16, fontWeight: '700' },
  actionRow:        { flexDirection: 'row', gap: 12, width: '100%' },
  actionBtn:        { flex: 1, paddingVertical: 18, borderRadius: 16, alignItems: 'center', elevation: 6 },
  actionText:       { fontSize: 16, fontWeight: '800', textAlign: 'center', lineHeight: 22 },

  // Result
  scoreBig:         { fontSize: 36, fontWeight: '900' },

  // Finished
  finishedContent:  { flexGrow: 1, alignItems: 'center', padding: 24, paddingTop: 10, gap: 16 },
  trophyEmoji:      { fontSize: 72 },
  winnerName:       { fontSize: 28, fontWeight: '900' },
  winnerScore:      { fontSize: 22, fontWeight: '700' },
  rankList:         { width: '100%', borderRadius: 16, borderWidth: 1.5, overflow: 'hidden' },
  rankRow:          { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  rankMedal:        { fontSize: 22, width: 36, textAlign: 'center' },
  rankName:         { flex: 1, fontSize: 16, fontWeight: '700' },
  rankScore:        { fontSize: 16, fontWeight: '800' },
});
 
