import { useState, useRef, useCallback, memo, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, ScrollView, TextInput,
  KeyboardAvoidingView, Platform, Alert, Animated,
} from 'react-native';
import { useTheme } from './ThemeContext';
import ExitButton from './ExitButton';
import { NeverHaveIEverEngraving } from './GameEngraving';
import { useLanguage } from './I18n';
import { WebScreenButton, GameInfoButton } from './WebRoomService';

// ══════════════════════════════════════════════════════════════
// جمل افتراضية — عربية وإنجليزية
// ══════════════════════════════════════════════════════════════
const STATEMENTS_AR = [
  { id: 1,  text: 'أنا لم أنم في درس أو اجتماع',              emoji: '😴' },
  { id: 2,  text: 'أنا لم أتأخر على موعد مهم',                 emoji: '⏰' },
  { id: 3,  text: 'أنا لم أكذب على والديّ',                    emoji: '🤥' },
  { id: 4,  text: 'أنا لم أبكِ بسبب فيلم',                    emoji: '😭' },
  { id: 5,  text: 'أنا لم أنسَ يوم ميلاد شخص مهم',            emoji: '🎂' },
  { id: 6,  text: 'أنا لم أتظاهر بالمرض لأتغيب',              emoji: '🤒' },
  { id: 7,  text: 'أنا لم أحذف رسالة بعد ما أرسلتها',         emoji: '📱' },
  { id: 8,  text: 'أنا لم أفشل في طبخة وأدّعيتها زينة',       emoji: '🍳' },
  { id: 9,  text: 'أنا لم أضحك في وقت غير مناسب',             emoji: '😂' },
  { id: 10, text: 'أنا لم أبعث رسالة للشخص الغلط',             emoji: '💬' },
  { id: 11, text: 'أنا لم أتجاهل مكالمة وعندي الجهاز بيدي',   emoji: '📵' },
  { id: 12, text: 'أنا لم أسرق أكل أحد من الثلاجة',            emoji: '🧊' },
  { id: 13, text: 'أنا لم أكسر شيئاً في بيت أحد وما قلت',     emoji: '💔' },
  { id: 14, text: 'أنا لم أغيّر رأيي لأن الجميع يختلف معي',   emoji: '🔄' },
  { id: 15, text: 'أنا لم أقرأ محادثة شخص بدون إذنه',         emoji: '🕵️' },
  { id: 16, text: 'أنا لم أسافر وحدي',                        emoji: '✈️' },
  { id: 17, text: 'أنا لم أنم خارج البيت في العراء',           emoji: '⛺' },
  { id: 18, text: 'أنا لم أجرب رياضة خطرة',                   emoji: '🪂' },
  { id: 19, text: 'أنا لم أركب سيارة بسرعة زيادة',             emoji: '🚗' },
  { id: 20, text: 'أنا لم أحضر حفلة لم أُدعَ إليها',          emoji: '🎉' },
  { id: 21, text: 'أنا لم أتجادل مع شخص غريب على الإنترنت',   emoji: '💻' },
  { id: 22, text: 'أنا لم أفقد صديقاً بسبب خلاف غبي',         emoji: '🤝' },
  { id: 23, text: 'أنا لم أنشر سر أحد',                       emoji: '🤫' },
  { id: 24, text: 'أنا لم أتظاهر أنني سعيد وأنا حزين',        emoji: '🎭' },
  { id: 25, text: 'أنا لم أشترِ شيئاً غالياً وندمت',          emoji: '💸' },
  { id: 26, text: 'أنا لم أستدن ولم أرجع الدين بوقته',         emoji: '💰' },
  { id: 27, text: 'أنا لم أقل لأحد "أحبك" أول مرة بالكتابة', emoji: '💌' },
  { id: 28, text: 'أنا لم أتظاهر بأنني لا أعرف شخصاً',        emoji: '👀' },
  { id: 29, text: 'أنا لم أحكم على أحد من أول نظرة وكنت غلط', emoji: '🧐' },
  { id: 30, text: 'أنا لم آكل أكل سقط على الأرض',              emoji: '🍕' },
  { id: 31, text: 'أنا لم أنم أكثر من 12 ساعة يوماً',          emoji: '🛌' },
  { id: 32, text: 'أنا لم أتكلم مع نفسي بصوت عالٍ',           emoji: '🗣️' },
  { id: 33, text: 'أنا لم أقرأ نهاية كتاب قبل المنتصف',        emoji: '📚' },
  { id: 34, text: 'أنا لم أشترِ شيئاً لأني شفته عند أحد',     emoji: '🛍️' },
  { id: 35, text: 'أنا لم أصحَ من النوم وأنا مو عارف وين أنا', emoji: '😵' },
];

const STATEMENTS_EN = [
  { id: 1,  text: "I've never fallen asleep in class or a meeting",      emoji: '😴' },
  { id: 2,  text: "I've never been late for an important appointment",   emoji: '⏰' },
  { id: 3,  text: "I've never lied to my parents",                       emoji: '🤥' },
  { id: 4,  text: "I've never cried because of a movie",                 emoji: '😭' },
  { id: 5,  text: "I've never forgotten someone's birthday",             emoji: '🎂' },
  { id: 6,  text: "I've never faked being sick to skip something",       emoji: '🤒' },
  { id: 7,  text: "I've never unsent a message after sending it",        emoji: '📱' },
  { id: 8,  text: "I've never failed a dish and pretended it was good",  emoji: '🍳' },
  { id: 9,  text: "I've never laughed at the wrong moment",              emoji: '😂' },
  { id: 10, text: "I've never texted the wrong person",                  emoji: '💬' },
  { id: 11, text: "I've never ignored a call with my phone in my hand",  emoji: '📵' },
  { id: 12, text: "I've never stolen food from someone's fridge",        emoji: '🧊' },
  { id: 13, text: "I've never broken something at a friend's place and stayed quiet", emoji: '💔' },
  { id: 14, text: "I've never changed my opinion just because everyone disagreed", emoji: '🔄' },
  { id: 15, text: "I've never read someone's chat without permission",   emoji: '🕵️' },
  { id: 16, text: "I've never traveled alone",                           emoji: '✈️' },
  { id: 17, text: "I've never slept outdoors",                           emoji: '⛺' },
  { id: 18, text: "I've never tried an extreme sport",                   emoji: '🪂' },
  { id: 19, text: "I've never ridden in a car going way too fast",       emoji: '🚗' },
  { id: 20, text: "I've never crashed a party I wasn't invited to",      emoji: '🎉' },
  { id: 21, text: "I've never argued with a stranger online",            emoji: '💻' },
  { id: 22, text: "I've never lost a friend over something stupid",      emoji: '🤝' },
  { id: 23, text: "I've never told someone else's secret",               emoji: '🤫' },
  { id: 24, text: "I've never pretended to be happy when I was sad",     emoji: '🎭' },
  { id: 25, text: "I've never bought something expensive and regretted it", emoji: '💸' },
  { id: 26, text: "I've never borrowed money and failed to pay it back on time", emoji: '💰' },
  { id: 27, text: "I've never said 'I love you' for the first time in text", emoji: '💌' },
  { id: 28, text: "I've never pretended not to know someone",            emoji: '👀' },
  { id: 29, text: "I've never judged someone on first sight and been wrong", emoji: '🧐' },
  { id: 30, text: "I've never eaten food that fell on the floor",        emoji: '🍕' },
  { id: 31, text: "I've never slept for more than 12 hours",             emoji: '🛌' },
  { id: 32, text: "I've never talked to myself out loud",                emoji: '🗣️' },
  { id: 33, text: "I've never read the end of a book before the middle", emoji: '📚' },
  { id: 34, text: "I've never bought something just because a friend had it", emoji: '🛍️' },
  { id: 35, text: "I've never woken up not knowing where I was",         emoji: '😵' },
];

// ══════════════════════════════════════════════════════════════
// أدوات
// ══════════════════════════════════════════════════════════════
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const GREEN      = '#10b981';
const GREEN_SOFT = '#10b98118';
const GREEN_LINE = '#10b98155';
const HIT        = { top: 10, bottom: 10, left: 10, right: 10 };

// نصوص داخلية
const TXT = {
  title:           { ar: 'أنا لم...',                     en: 'Never Have I Ever' },
  subtitle:        { ar: 'من فعلها يخسر إصبع!',           en: 'Did it? Lose a finger!' },
  modeTitle:       { ar: 'اختر نوع اللعبة',               en: 'Choose Game Type' },
  modeDefault:     { ar: 'لعبة جاهزة',                    en: 'Ready Game' },
  modeDefaultDesc: { ar: 'جمل جاهزة ومتنوعة للعب فوراً', en: 'Ready-made statements, play instantly' },
  modeCustom:      { ar: 'لعبة مخصصة',                   en: 'Custom Game' },
  modeCustomDesc:  { ar: 'كل لاعب يكتب أشياء ما سواها',  en: 'Each player writes their own statements' },
  addPlayers:      { ar: 'أضف اللاعبين',                  en: 'Add Players' },
  playerName:      { ar: 'اسم اللاعب...',                 en: 'Player name...' },
  minPlayers:      { ar: 'يجب إضافة ٣ لاعبين على الأقل', en: 'At least 3 players required' },
  dupName:         { ar: 'هذا الاسم موجود مسبقاً',        en: 'Name already added' },
  startGame:       { ar: 'ابدأ اللعبة',                   en: 'Start Game' },
  customTitle:     { ar: 'أضف الجمل',                     en: 'Add Statements' },
  customHint:      { ar: 'كل لاعب يكتب أشياء ما سواها — الجملة تبدأ بـ "أنا لم..."', en: 'Each player writes things they\'ve never done' },
  addStmt:         { ar: 'اكتب الجملة هنا...',            en: 'Write statement here...' },
  addBtn:          { ar: 'إضافة',                         en: 'Add' },
  editBtn:         { ar: 'تعديل',                         en: 'Edit' },
  deleteBtn:       { ar: 'حذف',                           en: 'Delete' },
  saveBtn:         { ar: 'حفظ',                           en: 'Save' },
  stmtCount:       { ar: '{n} جملة',                     en: '{n} statements' },
  minStmts:        { ar: 'أضف ٥ جمل على الأقل للبدء',    en: 'Add at least 5 statements to start' },
  maxStmts:        { ar: 'الحد الأقصى {n} جملة',         en: 'Max {n} statements' },
  startCustom:     { ar: 'ابدأ اللعبة',                   en: 'Start Game' },
  turnOf:          { ar: 'دور',                           en: "It's" },
  turnName:        { ar: '{name}',                        en: "{name}'s turn" },
  didIt:           { ar: '✋  فعلتها',                    en: '✋  I Did It' },
  didntIt:         { ar: '☝️  لم أفعل',                  en: '☝️  Never Done It' },
  roundLabel:      { ar: 'جملة {n} من {t}',              en: 'Statement {n} of {t}' },
  gameOver:        { ar: 'انتهت اللعبة!',                en: 'Game Over!' },
  loser:           { ar: '😢 {name} خسر كل أصابعه!',    en: '😢 {name} is out!' },
  playAgain:       { ar: 'جولة جديدة',                   en: 'Play Again' },
  exitGame:        { ar: 'الخروج من اللعبة؟',            en: 'Exit game?' },
  exitConfirm:     { ar: 'سيتم إلغاء الجولة الحالية',   en: 'Current round will be cancelled' },
  yes:             { ar: 'نعم',                           en: 'Yes' },
  no:              { ar: 'لا',                            en: 'No' },
  back:            { ar: 'رجوع',                          en: 'Back' },
};

// ══════════════════════════════════════════════════════════════
// شاشة 1 — اختيار النمط
// ══════════════════════════════════════════════════════════════
function ModeScreen({ onPickMode, theme, tx }) {
  return (
    <ScrollView contentContainerStyle={[styles.modeContainer, { backgroundColor: theme.isCityTheme ? 'transparent' : theme.bg }]}>
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.statusBg} />
      <Text style={[styles.bigEmoji]}>☝️</Text>
      <Text style={[styles.pageTitle, { color: GREEN }]}>{tx('title')}</Text>
      <Text style={[styles.pageSub, { color: theme.textMuted }]}>{tx('subtitle')}</Text>

      <Text style={[styles.sectionLabel, { color: theme.textSecondary, marginTop: 12 }]}>
        {tx('modeTitle')}
      </Text>

      <TouchableOpacity
        style={[styles.modeCard, { backgroundColor: theme.bgCard, borderColor: GREEN_LINE }]}
        onPress={() => onPickMode('default')}
        activeOpacity={0.85}
      >
        <Text style={styles.modeEmoji}>🎲</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.modeName, { color: theme.textPrimary }]}>{tx('modeDefault')}</Text>
          <Text style={[styles.modeDesc, { color: theme.textMuted }]}>{tx('modeDefaultDesc')}</Text>
        </View>
        <View style={[styles.modeArrowBadge, { backgroundColor: GREEN_SOFT }]}>
          <Text style={[styles.modeArrow, { color: GREEN }]}>←</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.modeCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}
        onPress={() => onPickMode('custom')}
        activeOpacity={0.85}
      >
        <Text style={styles.modeEmoji}>✍️</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.modeName, { color: theme.textPrimary }]}>{tx('modeCustom')}</Text>
          <Text style={[styles.modeDesc, { color: theme.textMuted }]}>{tx('modeCustomDesc')}</Text>
        </View>
        <View style={[styles.modeArrowBadge, { backgroundColor: theme.bgElevated || theme.bgCard }]}>
          <Text style={[styles.modeArrow, { color: theme.textMuted }]}>←</Text>
        </View>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ══════════════════════════════════════════════════════════════
// شاشة 2أ — إعداد اللاعبين (لعبة جاهزة)
// ══════════════════════════════════════════════════════════════
function DefaultSetupScreen({ onStart, theme, tx, lang }) {
  const [playerName, setPlayerName] = useState('');
  const [players, setPlayers]       = useState([]);

  const addPlayer = useCallback(() => {
    const name = playerName.trim();
    if (!name) return;
    if (players.length >= 10) return;
    if (players.find(p => p.name === name)) {
      Alert.alert('', tx('dupName'));
      return;
    }
    setPlayers(prev => [...prev, { id: Date.now().toString(), name, fingers: 5 }]);
    setPlayerName('');
  }, [playerName, players, tx]);

  const removePlayer = useCallback((id) => {
    setPlayers(prev => prev.filter(p => p.id !== id));
  }, []);

  const handleStart = useCallback(() => {
    if (players.length < 3) {
      Alert.alert('', tx('minPlayers'));
      return;
    }
    const pool = isGlobal ? STATEMENTS_EN : STATEMENTS_AR;
    onStart({ players, statements: pool });
  }, [players, lang, onStart, tx]);

  const canStart = players.length >= 3;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[styles.setupContainer, { backgroundColor: theme.isCityTheme ? 'transparent' : theme.bg }]} keyboardShouldPersistTaps="handled">
        <StatusBar barStyle={theme.statusBar} backgroundColor={theme.statusBg} />
        <Text style={styles.setupEmoji}>🎲</Text>
        <Text style={[styles.pageTitle, { color: GREEN }]}>{tx('modeDefault')}</Text>

        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>{tx('addPlayers')}</Text>

        {/* حقل الإدخال */}
        <View style={[styles.inputRow, { backgroundColor: theme.bgCard, borderColor: GREEN_LINE }]}>
          <TextInput
            value={playerName}
            onChangeText={setPlayerName}
            onSubmitEditing={addPlayer}
            placeholder={tx('playerName')}
            placeholderTextColor={theme.textMuted}
            style={[styles.nameInput, { color: theme.textPrimary }]}
            returnKeyType="done"
            maxLength={20}
          />
          <TouchableOpacity
            style={[styles.addPlayerBtn, { backgroundColor: GREEN, opacity: playerName.trim() ? 1 : 0.4 }]}
            onPress={addPlayer}
            activeOpacity={0.8}
            disabled={!playerName.trim()}
          >
            <Text style={styles.addPlayerBtnText}>＋</Text>
          </TouchableOpacity>
        </View>

        {/* قائمة اللاعبين */}
        <View style={styles.playersList}>
          {players.map((p, i) => (
            <View key={p.id} style={[styles.playerChip, { backgroundColor: theme.bgCard, borderColor: GREEN_LINE }]}>
              <View style={[styles.chipNum, { backgroundColor: GREEN }]}>
                <Text style={styles.chipNumText}>{i + 1}</Text>
              </View>
              <Text style={[styles.chipName, { color: theme.textPrimary }]}>{p.name}</Text>
              <TouchableOpacity
                style={styles.chipRemove}
                onPress={() => removePlayer(p.id)}
                hitSlop={HIT}
              >
                <Text style={styles.chipRemoveText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* زر البدء */}
        <TouchableOpacity
          style={[styles.startBtn, {
            backgroundColor: canStart ? GREEN : theme.bgCard,
            borderWidth: canStart ? 0 : 1.5,
            borderColor: theme.border,
            marginTop: 8,
          }]}
          onPress={handleStart}
          activeOpacity={0.85}
          disabled={!canStart}
        >
          <Text style={[styles.startBtnText, { color: canStart ? '#fff' : theme.textMuted }]}>
            {canStart ? tx('startGame') : `${tx('minPlayers')}`}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ══════════════════════════════════════════════════════════════
// شاشة 2ب — إعداد اللعبة المخصصة (لاعبين + جمل)
// ══════════════════════════════════════════════════════════════
function CustomSetupScreen({ onStart, theme, tx, lang, maxStatements }) {
  const [playerName, setPlayerName] = useState('');
  const [players, setPlayers]       = useState([]);
  const [stmtInput, setStmtInput]   = useState('');
  const [statements, setStatements] = useState([]);  // [{id, text}]
  const [editingId, setEditingId]   = useState(null);
  const [editText, setEditText]     = useState('');

  const addPlayer = useCallback(() => {
    const name = playerName.trim();
    if (!name) return;
    if (players.find(p => p.name === name)) { Alert.alert('', tx('dupName')); return; }
    if (players.length >= 10) return;
    setPlayers(prev => [...prev, { id: Date.now().toString(), name, fingers: 5 }]);
    setPlayerName('');
  }, [playerName, players, tx]);

  const removePlayer = useCallback((id) => setPlayers(prev => prev.filter(p => p.id !== id)), []);

  const addStatement = useCallback(() => {
    const text = stmtInput.trim();
    if (!text) return;
    if (statements.length >= maxStatements) {
      Alert.alert('', tx('maxStmts', { n: maxStatements }));
      return;
    }
    setStatements(prev => [...prev, { id: Date.now().toString(), text }]);
    setStmtInput('');
  }, [stmtInput, statements, maxStatements, tx]);

  const deleteStatement = useCallback((id) => setStatements(prev => prev.filter(s => s.id !== id)), []);

  const startEdit = useCallback((s) => {
    setEditingId(s.id);
    setEditText(s.text);
  }, []);

  const saveEdit = useCallback(() => {
    const text = editText.trim();
    if (!text) return;
    setStatements(prev => prev.map(s => s.id === editingId ? { ...s, text } : s));
    setEditingId(null);
    setEditText('');
  }, [editingId, editText]);

  const canStart = players.length >= 3 && statements.length >= 5;

  const handleStart = useCallback(() => {
    const built = statements.map((s, i) => ({ id: 1000 + i, text: s.text, emoji: '✍️' }));
    onStart({ players, statements: built });
  }, [players, statements, onStart]);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.setupContainer, { backgroundColor: theme.isCityTheme ? 'transparent' : theme.bg }]}
        keyboardShouldPersistTaps="handled"
      >
        <StatusBar barStyle={theme.statusBar} backgroundColor={theme.statusBg} />
        <Text style={styles.setupEmoji}>✍️</Text>
        <Text style={[styles.pageTitle, { color: GREEN }]}>{tx('modeCustom')}</Text>

        {/* ── قسم اللاعبين ── */}
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>{tx('addPlayers')}</Text>
        <View style={[styles.inputRow, { backgroundColor: theme.bgCard, borderColor: GREEN_LINE }]}>
          <TextInput
            value={playerName}
            onChangeText={setPlayerName}
            onSubmitEditing={addPlayer}
            placeholder={tx('playerName')}
            placeholderTextColor={theme.textMuted}
            style={[styles.nameInput, { color: theme.textPrimary }]}
            returnKeyType="done"
            maxLength={20}
          />
          <TouchableOpacity
            style={[styles.addPlayerBtn, { backgroundColor: GREEN, opacity: playerName.trim() ? 1 : 0.4 }]}
            onPress={addPlayer}
            activeOpacity={0.8}
            disabled={!playerName.trim()}
          >
            <Text style={styles.addPlayerBtnText}>＋</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.playersList}>
          {players.map((p, i) => (
            <View key={p.id} style={[styles.playerChip, { backgroundColor: theme.bgCard, borderColor: GREEN_LINE }]}>
              <View style={[styles.chipNum, { backgroundColor: GREEN }]}>
                <Text style={styles.chipNumText}>{i + 1}</Text>
              </View>
              <Text style={[styles.chipName, { color: theme.textPrimary }]}>{p.name}</Text>
              <TouchableOpacity style={styles.chipRemove} onPress={() => removePlayer(p.id)} hitSlop={HIT}>
                <Text style={styles.chipRemoveText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* ── قسم الجمل ── */}
        <View style={[styles.customStmtHeader, { marginTop: 12 }]}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>{tx('customTitle')}</Text>
          <View style={[styles.countPill, {
            backgroundColor: statements.length >= 5 ? GREEN_SOFT : theme.bgCard,
            borderColor: statements.length >= 5 ? GREEN_LINE : theme.border,
          }]}>
            <Text style={[styles.countPillText, { color: statements.length >= 5 ? GREEN : theme.textMuted }]}>
              {statements.length} / {maxStatements}
            </Text>
          </View>
        </View>

        <Text style={[styles.customHintText, { color: theme.textMuted }]}>{tx('customHint')}</Text>

        {/* حقل إضافة جملة */}
        <View style={[styles.inputRow, { backgroundColor: theme.bgCard, borderColor: GREEN_LINE }]}>
          <TextInput
            value={stmtInput}
            onChangeText={setStmtInput}
            onSubmitEditing={addStatement}
            placeholder={tx('addStmt')}
            placeholderTextColor={theme.textMuted}
            style={[styles.nameInput, { color: theme.textPrimary }]}
            returnKeyType="done"
            maxLength={120}
          />
          <TouchableOpacity
            style={[styles.addPlayerBtn, {
              backgroundColor: stmtInput.trim() && statements.length < maxStatements ? GREEN : theme.bgElevated || '#333',
              opacity: stmtInput.trim() && statements.length < maxStatements ? 1 : 0.4,
            }]}
            onPress={addStatement}
            activeOpacity={0.8}
          >
            <Text style={styles.addPlayerBtnText}>＋</Text>
          </TouchableOpacity>
        </View>

        {/* قائمة الجمل المضافة */}
        <View style={styles.stmtList}>
          {statements.map((s, i) => (
            <View key={s.id} style={[styles.stmtItem, { backgroundColor: theme.bgCard, borderColor: GREEN_LINE }]}>
              {editingId === s.id ? (
                // وضع التعديل
                <View style={{ flex: 1, gap: 8 }}>
                  <TextInput
                    value={editText}
                    onChangeText={setEditText}
                    style={[styles.editInput, { color: theme.textPrimary, borderColor: GREEN_LINE }]}
                    multiline
                    maxLength={120}
                    autoFocus
                  />
                  <TouchableOpacity
                    style={[styles.saveBtn, { backgroundColor: GREEN }]}
                    onPress={saveEdit}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.saveBtnText}>{tx('saveBtn')}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                // وضع العرض
                <>
                  <View style={[styles.stmtNumBadge, { backgroundColor: GREEN_SOFT }]}>
                    <Text style={[styles.stmtNum, { color: GREEN }]}>{i + 1}</Text>
                  </View>
                  <Text style={[styles.stmtText, { color: theme.textPrimary }]} numberOfLines={3}>{s.text}</Text>
                  <View style={styles.stmtActions}>
                    <TouchableOpacity
                      style={[styles.stmtActionBtn, { borderColor: '#f59e0b50', backgroundColor: '#f59e0b10' }]}
                      onPress={() => startEdit(s)}
                      hitSlop={HIT}
                    >
                      <Text style={[styles.stmtActionText, { color: '#f59e0b' }]}>{tx('editBtn')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.stmtActionBtn, { borderColor: '#ef444450', backgroundColor: '#ef444410' }]}
                      onPress={() => deleteStatement(s.id)}
                      hitSlop={HIT}
                    >
                      <Text style={[styles.stmtActionText, { color: '#ef4444' }]}>{tx('deleteBtn')}</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          ))}
        </View>

        {/* زر البدء */}
        <TouchableOpacity
          style={[styles.startBtn, {
            backgroundColor: canStart ? GREEN : theme.bgCard,
            borderWidth: canStart ? 0 : 1.5,
            borderColor: theme.border,
            marginTop: 16,
          }]}
          onPress={handleStart}
          activeOpacity={0.85}
          disabled={!canStart}
        >
          <Text style={[styles.startBtnText, { color: canStart ? '#fff' : theme.textMuted }]}>
            {canStart
              ? tx('startCustom')
              : statements.length < 5
                ? tx('minStmts')
                : tx('minPlayers')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ══════════════════════════════════════════════════════════════
// بطاقة أصابع لاعب
// ══════════════════════════════════════════════════════════════
const PlayerFingersCard = memo(({ player, isActive, theme }) => (
  <View style={[
    styles.fingerCard,
    { backgroundColor: theme.bgCard, borderColor: isActive ? GREEN : theme.border },
    isActive && { borderColor: GREEN, backgroundColor: GREEN_SOFT },
  ]}>
    <Text style={[styles.fingerName, { color: isActive ? GREEN : theme.textSecondary }]} numberOfLines={1}>
      {player.name}
    </Text>
    <View style={styles.fingersRow}>
      {Array(5).fill(0).map((_, i) => (
        <Text key={i} style={[styles.fingerEmoji, i >= player.fingers && styles.fingerDown]}>☝️</Text>
      ))}
    </View>
    <Text style={[styles.fingerCount, { color: player.fingers > 0 ? GREEN : '#ef4444' }]}>
      {player.fingers}/5
    </Text>
  </View>
));

// ══════════════════════════════════════════════════════════════
// شاشة اللعب الفعلي
// ══════════════════════════════════════════════════════════════
function GameScreen({ initialPlayers, statements, onBack, theme, tx }) {
  // رتّب الجمل عشوائياً مرة واحدة
  const orderedStmts = useRef(shuffle(statements)).current;
  const totalStmts   = orderedStmts.length;

  const [stmtIdx, setStmtIdx]     = useState(0);  // الجملة الحالية
  const [players, setPlayers]     = useState(initialPlayers);
  // ترتيب اللاعبين لهذه الجملة (عشوائي ومختلف لكل جملة)
  const [turnOrder, setTurnOrder] = useState(() => shuffle(initialPlayers.map(p => p.id)));
  const [turnPos, setTurnPos]     = useState(0);  // من أين وصلنا في هذه الجملة
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const currentStmt   = orderedStmts[stmtIdx];
  const currentPlayerId = turnOrder[turnPos];
  const currentPlayer   = players.find(p => p.id === currentPlayerId);

  // انتقال سلس بين الجمل
  const animateNext = useCallback((fn) => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
      fn();
      Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: true }).start();
    });
  }, [fadeAnim]);

  const handleAnswer = useCallback((didIt) => {
    let updatedPlayers = players;
    if (didIt) {
      updatedPlayers = players.map(p =>
        p.id === currentPlayerId ? { ...p, fingers: Math.max(0, p.fingers - 1) } : p
      );
      setPlayers(updatedPlayers);
    }

    const nextTurnPos = turnPos + 1;

    if (nextTurnPos >= turnOrder.length) {
      // انتهى كل اللاعبين من هذه الجملة — انتقل للجملة التالية
      const nextStmtIdx = stmtIdx + 1;
      if (nextStmtIdx >= totalStmts) {
        // انتهت كل الجمل
        animateNext(() => setStmtIdx(nextStmtIdx));
        return;
      }
      // جملة جديدة بترتيب عشوائي جديد للاعبين (من اللاعبين الأحياء)
      const alivePlayers = updatedPlayers.filter(p => p.fingers > 0);
      if (alivePlayers.length < 2) {
        animateNext(() => setStmtIdx(nextStmtIdx));
        return;
      }
      const newOrder = shuffle(updatedPlayers.map(p => p.id));
      animateNext(() => {
        setStmtIdx(nextStmtIdx);
        setTurnOrder(newOrder);
        setTurnPos(0);
      });
    } else {
      // اللاعب التالي في نفس الجملة
      setTurnPos(nextTurnPos);
    }
  }, [players, currentPlayerId, turnPos, turnOrder, stmtIdx, totalStmts, animateNext]);

  const handleExitRequest = useCallback(() => {
    Alert.alert(tx('exitGame'), tx('exitConfirm'), [
      { text: tx('no') },
      { text: tx('yes'), style: 'destructive', onPress: onBack },
    ]);
  }, [tx, onBack]);

  // شاشة النهاية
  const loser = useMemo(() => players.find(p => p.fingers === 0), [players]);
  const gameEnded = stmtIdx >= totalStmts || !!loser;

  if (gameEnded) {
    return (
      <View style={[styles.endContainer, { backgroundColor: theme.isCityTheme ? 'transparent' : theme.bg }]}>
        <NeverHaveIEverEngraving theme={theme} />
        <Text style={styles.finishEmoji}>{loser ? '😢' : '🎉'}</Text>
        <Text style={[styles.finishTitle, { color: GREEN }]}>
          {loser ? tx('loser', { name: loser.name }) : tx('gameOver')}
        </Text>
        <View style={styles.finalScores}>
          {[...players].sort((a, b) => b.fingers - a.fingers).map((p, i) => (
            <View key={p.id} style={[styles.finalRow, { backgroundColor: theme.bgCard, borderColor: i === 0 ? GREEN_LINE : theme.border }]}>
              <Text style={[styles.finalRank, { color: i === 0 ? GREEN : theme.textMuted }]}>
                {i === 0 ? '🏆' : `${i + 1}.`}
              </Text>
              <Text style={[styles.finalName, { color: theme.textPrimary }]}>{p.name}</Text>
              <View style={styles.fingersRow}>
                {Array(5).fill(0).map((_, fi) => (
                  <Text key={fi} style={[styles.fingerEmoji, fi >= p.fingers && styles.fingerDown]}>☝️</Text>
                ))}
              </View>
              <Text style={[styles.fingerCount, { color: p.fingers > 0 ? GREEN : '#ef4444' }]}>{p.fingers}</Text>
            </View>
          ))}
        </View>
        <TouchableOpacity style={[styles.startBtn, { backgroundColor: GREEN }]} onPress={onBack} activeOpacity={0.85}>
          <Text style={[styles.startBtnText, { color: '#fff' }]}>{tx('playAgain')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.playRoot, { backgroundColor: theme.isCityTheme ? 'transparent' : theme.bg }]}>
      <NeverHaveIEverEngraving theme={theme} />
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.statusBg} />

      {/* زر الخروج + زر شاشة كبيرة */}
      <View style={styles.exitBtnRow}>
        <ExitButton onPress={onBack} />
        <GameInfoButton gameType="never_have" lang={lang} />
        <WebScreenButton
          playerUid="nhi_p0"
          playerName=""
          gameType="never_have"
          getPublicData={() => ({ stmtIdx, totalStmts })}
          themeName={themeId || 'dark'}
        />
      </View>

      {/* شريط التقدم */}
      <View style={styles.progressWrap}>
        <Text style={[styles.progressLabel, { color: theme.textMuted }]}>
          {tx('roundLabel', { n: stmtIdx + 1, t: totalStmts })}
        </Text>
        <View style={[styles.progressBar, { backgroundColor: theme.bgCard }]}>
          <View style={[styles.progressFill, { width: `${((stmtIdx) / totalStmts) * 100}%` }]} />
        </View>
      </View>

      {/* شريط اللاعبين وأصابعهم */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.playersBar}
      >
        {players.map(p => (
          <PlayerFingersCard
            key={p.id}
            player={p}
            isActive={p.id === currentPlayerId}
            theme={theme}
          />
        ))}
      </ScrollView>

      {/* بطاقة الجملة + دور اللاعب */}
      <Animated.View style={[styles.stmtSection, { opacity: fadeAnim }]}>
        {/* دور اللاعب */}
        <View style={[styles.turnBadge, { backgroundColor: GREEN_SOFT, borderColor: GREEN_LINE }]}>
          <Text style={[styles.turnLabel, { color: GREEN }]}>
            {tx('turnOf')}
          </Text>
          <Text style={[styles.turnName, { color: GREEN }]}>
            {currentPlayer?.name}
          </Text>
        </View>

        {/* بطاقة الجملة */}
        <View style={[styles.stmtCard, { backgroundColor: theme.bgCard, borderColor: GREEN_LINE }]}>
          <Text style={styles.stmtEmoji}>{currentStmt?.emoji || '☝️'}</Text>
          <Text style={[styles.stmtCardText, { color: theme.textPrimary }]}>
            {currentStmt?.text}
          </Text>
          {/* مؤشر اللاعب الحالي */}
          <View style={styles.turnDots}>
            {turnOrder.map((pid, i) => (
              <View
                key={pid}
                style={[
                  styles.dot,
                  {
                    backgroundColor: i < turnPos
                      ? theme.textMuted
                      : i === turnPos
                        ? GREEN
                        : `${GREEN}30`,
                    width: i === turnPos ? 20 : 8,
                  },
                ]}
              />
            ))}
          </View>
        </View>

        {/* زرا الإجابة */}
        <View style={styles.answerBtns}>
          <TouchableOpacity
            style={[styles.answerBtn, styles.didItBtn]}
            onPress={() => handleAnswer(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.answerBtnEmoji}>✋</Text>
            <Text style={[styles.answerBtnText, { color: '#ff6b6b' }]}>{tx('didIt')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.answerBtn, styles.didntBtn]}
            onPress={() => handleAnswer(false)}
            activeOpacity={0.85}
          >
            <Text style={styles.answerBtnEmoji}>☝️</Text>
            <Text style={[styles.answerBtnText, { color: '#4ade80' }]}>{tx('didntIt')}</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════
// المكوّن الرئيسي
// ══════════════════════════════════════════════════════════════
export default function NeverHaveIEver({ onBack, experience }) {
  const { theme, themeId } = useTheme();
  const { t, lang } = useLanguage();
  const isGlobal = experience === 'global';

  const tx = useCallback((key, params) => {
    const entry = TXT[key];
    if (!entry) return key;
    let text = entry[lang] ?? entry.ar ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replaceAll(`{${k}}`, String(v));
      }
    }
    return text;
  }, [lang]);

  // المراحل: 'mode' | 'default-setup' | 'custom-setup' | 'play'
  const [stage, setStage]           = useState('mode');
  const [gameConfig, setGameConfig] = useState(null);

  // الحد الأقصى للجمل في اللعبة المخصصة = عدد جمل اللعبة الجاهزة
  const maxStatements = isGlobal ? STATEMENTS_EN.length : STATEMENTS_AR.length;

  const handlePickMode = useCallback((m) => {
    setStage(m === 'default' ? 'default-setup' : 'custom-setup');
  }, []);

  const handleStart = useCallback(({ players, statements }) => {
    setGameConfig({ players, statements });
    setStage('play');
  }, []);

  const handleBack = useCallback(() => {
    if (stage === 'play') {
      setStage('mode');
      setGameConfig(null);
      return;
    }
    if (stage === 'default-setup' || stage === 'custom-setup') {
      setStage('mode');
      return;
    }
    onBack();
  }, [stage, onBack]);

  return (
    <View style={[styles.root, { backgroundColor: theme.isCityTheme ? 'transparent' : theme.bg }]}>
      {/* زر رجوع خارج شاشة اللعب */}
      {stage !== 'play' && (
        <ExitButton onPress={handleBack} />
      )}

      {stage === 'mode' && (
        <ModeScreen onPickMode={handlePickMode} theme={theme} tx={tx} />
      )}
      {stage === 'default-setup' && (
        <DefaultSetupScreen onStart={handleStart} theme={theme} tx={tx} lang={lang} />
      )}
      {stage === 'custom-setup' && (
        <CustomSetupScreen onStart={handleStart} theme={theme} tx={tx} lang={lang} isGlobal={isGlobal} maxStatements={maxStatements} />
      )}
      {stage === 'play' && gameConfig && (
        <GameScreen
          initialPlayers={gameConfig.players}
          statements={gameConfig.statements}
          onBack={handleBack}
          theme={theme}
          t={t}
          tx={tx}
        />
      )}
    </View>
  );
}

// ══════════════════════════════════════════════════════════════
// الستايلات
// ══════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  root:             { flex: 1 },

  // زر رجوع عالمي
  globalBackBtn:    { position: 'absolute', top: 52, left: 20, width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center', zIndex: 20 },
  globalBackText:   { fontSize: 14, fontWeight: '700' },

  // شاشة النمط
  modeContainer:    { flexGrow: 1, padding: 24, paddingTop: 80, gap: 14, alignItems: 'stretch' },
  bigEmoji:         { fontSize: 64, textAlign: 'center' },
  pageTitle:        { fontSize: 26, fontWeight: '900', textAlign: 'center' },
  pageSub:          { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  sectionLabel:     { fontSize: 15, fontWeight: '700' },
  modeCard:         { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 20, borderWidth: 1.5, padding: 18 },
  modeEmoji:        { fontSize: 34 },
  modeName:         { fontSize: 17, fontWeight: '800', marginBottom: 4 },
  modeDesc:         { fontSize: 12, lineHeight: 18 },
  modeArrowBadge:   { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  modeArrow:        { fontSize: 18, fontWeight: '900' },

  // شاشة الإعداد
  setupContainer:   { flexGrow: 1, padding: 20, paddingTop: 80, paddingBottom: 60, gap: 14 },
  setupEmoji:       { fontSize: 54, textAlign: 'center' },
  inputRow:         { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 8, gap: 10 },
  nameInput:        { flex: 1, fontSize: 15, paddingVertical: 6 },
  addPlayerBtn:     { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  addPlayerBtnText: { color: '#fff', fontWeight: '900', fontSize: 20 },
  playersList:      { gap: 8 },
  playerChip:       { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 13, borderWidth: 1.5, padding: 12 },
  chipNum:          { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  chipNumText:      { color: '#fff', fontWeight: '900', fontSize: 13 },
  chipName:         { flex: 1, fontSize: 15, fontWeight: '600' },
  chipRemove:       { width: 28, height: 28, borderRadius: 8, backgroundColor: '#ef444420', alignItems: 'center', justifyContent: 'center' },
  chipRemoveText:   { color: '#ef4444', fontWeight: '700', fontSize: 12 },
  startBtn:         { borderRadius: 16, paddingVertical: 15, alignItems: 'center' },
  startBtnText:     { fontSize: 16, fontWeight: '800' },

  // قسم الجمل المخصصة
  customStmtHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  countPill:        { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 99, borderWidth: 1.5 },
  countPillText:    { fontSize: 13, fontWeight: '800' },
  customHintText:   { fontSize: 12, lineHeight: 18 },
  stmtList:         { gap: 10 },
  stmtItem:         { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, borderWidth: 1.5, padding: 12 },
  stmtNumBadge:     { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  stmtNum:          { fontSize: 13, fontWeight: '900' },
  stmtText:         { flex: 1, fontSize: 14, lineHeight: 20 },
  stmtActions:      { gap: 6 },
  stmtActionBtn:    { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  stmtActionText:   { fontSize: 12, fontWeight: '700' },
  editInput:        { borderWidth: 1.5, borderRadius: 10, padding: 8, fontSize: 14, minHeight: 40 },
  saveBtn:          { borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
  saveBtnText:      { color: '#fff', fontWeight: '800', fontSize: 14 },

  // شاشة اللعب
  playRoot:         { flex: 1, paddingTop: 52 },
  exitBtn:          { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  exitBtnRow:       { position: 'absolute', top: 52, left: 16, zIndex: 20, flexDirection: 'row', alignItems: 'center', gap: 10 },
  exitBtnText:      { fontSize: 14, fontWeight: '700' },
  progressWrap:     { paddingHorizontal: 20, paddingTop: 12, gap: 6 },
  progressLabel:    { fontSize: 12, textAlign: 'center', fontWeight: '700' },
  progressBar:      { height: 5, borderRadius: 3, overflow: 'hidden' },
  progressFill:     { height: '100%', backgroundColor: GREEN, borderRadius: 3 },
  playersBar:       { paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  fingerCard:       { borderRadius: 14, borderWidth: 1.5, padding: 10, alignItems: 'center', gap: 5, minWidth: 75 },
  fingerName:       { fontSize: 11, fontWeight: '700', maxWidth: 70, textAlign: 'center' },
  fingersRow:       { flexDirection: 'row', gap: 1 },
  fingerEmoji:      { fontSize: 14 },
  fingerDown:       { opacity: 0.12 },
  fingerCount:      { fontSize: 12, fontWeight: '800' },

  stmtSection:      { flex: 1, paddingHorizontal: 20, paddingBottom: 24, gap: 14, justifyContent: 'center' },
  turnBadge:        { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', paddingHorizontal: 18, paddingVertical: 9, borderRadius: 99, borderWidth: 1.5 },
  turnLabel:        { fontSize: 14, fontWeight: '700' },
  turnName:         { fontSize: 16, fontWeight: '900' },
  stmtCard:         { borderRadius: 24, borderWidth: 1.5, padding: 24, alignItems: 'center', gap: 12 },
  stmtEmoji:        { fontSize: 52 },
  stmtCardText:     { fontSize: 18, fontWeight: '700', textAlign: 'center', lineHeight: 28 },
  turnDots:         { flexDirection: 'row', gap: 5, alignItems: 'center', marginTop: 4 },
  dot:              { height: 8, borderRadius: 4 },
  answerBtns:       { flexDirection: 'row', gap: 12 },
  answerBtn:        { flex: 1, borderRadius: 18, paddingVertical: 16, alignItems: 'center', gap: 4, borderWidth: 1.5 },
  didItBtn:         { borderWidth: 1 },
  didntBtn:         { borderWidth: 1 },
  answerBtnEmoji:   { fontSize: 26 },
  answerBtnText:    { fontSize: 15, fontWeight: '800' },

  // شاشة النهاية
  endContainer:     { flex: 1, paddingTop: 80, padding: 24, gap: 16, alignItems: 'center', justifyContent: 'center' },
  finishEmoji:      { fontSize: 72 },
  finishTitle:      { fontSize: 22, fontWeight: '900', textAlign: 'center' },
  finalScores:      { gap: 10, width: '100%' },
  finalRow:         { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, padding: 12, borderWidth: 1.5 },
  finalRank:        { fontSize: 18, width: 30, textAlign: 'center' },
  finalName:        { flex: 1, fontSize: 14, fontWeight: '700' },
});
