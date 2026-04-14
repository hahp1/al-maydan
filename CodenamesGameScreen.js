import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, Animated, ScrollView, TextInput,
  Modal, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { db, auth } from './firebaseConfig';
import {
  doc, setDoc, onSnapshot, updateDoc, deleteDoc,
  collection, query, where, getDocs, serverTimestamp,
  arrayUnion, getDoc,
} from 'firebase/firestore';

const WORD_BANK = [
  'طبيب','مهندس','معلم','محامي','طيار','بحار','نجار','حداد','خياط','صياد',
  'فلاح','راعي','طباخ','حلاق','بنّاء','رسام','شاعر','كاتب','ممثل','مغني',
  'ضابط','جندي','شرطي','قاضي','وزير','رئيس','ملك','أمير','سفير','محقق',
  'مدير','محاسب','مترجم','صحفي','مصوّر','ميكانيكي','كهربائي','سباك','بستاني','حارس',
  'صيدلاني','جراح','ممرض','مختبري','مدرب','لاعب','طبيب بيطري','مصمم','باحث','أستاذ',
  'مشرف','موظف','عامل','فني','مستشار','مفتش','محلل','مدير مشروع','مبرمج','مخرج',
  'مدرسة','مستشفى','مسجد','كنيسة','فندق','سجن','سوق','مطعم','مكتبة','صيدلية',
  'مطار','محطة','ميناء','ملعب','مسرح','سينما','متحف','قلعة','قصر','برج',
  'جسر','نفق','سد','مصنع','مزرعة','ثكنة','دير','معبد','بنك','بورصة',
  'حديقة','ملاهي','حمام','مخبز','جزارة','بقالة','مستودع','محطة وقود','مول','ميدان',
  'ملجأ','محكمة','مركز شرطة','سفارة','قنصلية','وزارة','برلمان','استاد','شقة','فيلا',
  'كوخ','غرفة','قبو','علية','مصعد','ممر','بوابة','ساحة','حوش','مرآب',
  'ثلاجة','غسالة','مكواة','مكنسة','مقلاة','قدر','صحن','كوب','ملعقة','شوكة',
  'سكين','مقص','مفتاح','قفل','مصباح','مروحة','ساعة','مرآة','وسادة','بطانية',
  'سجادة','ستارة','خزانة','طاولة','كرسي','سرير','باب','نافذة','سلم','درج',
  'غلاية','مكيف','سخان','ريموت','لمبة','وعاء','طنجرة','صينية','ممسحة','فرشاة',
  'فأس','مطرقة','مسمار','مشرط','منشار','جرافة','خرطوم','دلو','عربة','حبل',
  'سلسلة','مضخة','مولد','مجرفة','رافعة','بكرة','شبكة','مصيدة','فخ','بذرة',
  'أصيص','تربة','سماد','مبيد','جزازة','مقلمة','رافعة شوكية','حفار','مثقاب','مفك',
  'أسد','نمر','فيل','زرافة','دب','ذئب','ثعلب','أرنب','قط','كلب',
  'حصان','جمل','حمار','بقرة','خروف','ماعز','خنزير','دجاجة','بطة','حمامة',
  'نسر','صقر','بومة','ببغاء','تمساح','حية','ضفدع','سلحفاة','سمكة','قرش',
  'دلفين','حوت','كنغر','قرد','غوريلا','فهد','وحيد القرن','حمار وحشي','ضبع','غزال',
  'طاووس','أوز','ديك','عصفور','خفاش','سرطان','جمبري','قنفذ','سنجاب','يمامة',
  'هدهد','طيطوى','عقاب','حجلة','دراج','قطا','زرزور','ظبي','فيل بحري','بلبل',
  'تفاح','موز','برتقال','عنب','بطيخ','مانجو','فراولة','خوخ','كمثرى','أناناس',
  'ليمون','رمان','تين','تمر','زيتون','جوافة','بابايا','توت','كرز','شمام',
  'جوز هند','نبق','عنّاب','مشمش','برقوق','كيوي','أفوكادو','درّاق','بلح','قراصيا',
  'سفرجل','توت أرضي','جاك فروت','ليتشي','جريب فروت','نخيل','زعرور','عليق','كوكب','ثمرة',
  'طماطم','بطاطس','جزر','بصل','ثوم','خيار','فلفل','باذنجان','كوسا','قرع',
  'خس','سبانخ','ملفوف','قرنبيط','بروكلي','بامية','لوبيا','فول','عدس','حمص',
  'ذرة','فجل','شمر','كرفس','لفت','سلق','هليون','بقدونس','نعناع','كراث',
  'شمندر','بطاطا حلوة','بازلاء','كزبرة','ريحان','زعتر','شبت','ملوخية','جرجير','فجل أحمر',
  'السعودية','مصر','العراق','سوريا','الأردن','لبنان','الإمارات','الكويت','قطر','البحرين',
  'المغرب','الجزائر','تونس','ليبيا','السودان','اليمن','عُمان','فلسطين','تركيا','إيران',
  'أمريكا','الصين','روسيا','فرنسا','ألمانيا','إنجلترا','إيطاليا','إسبانيا','اليابان','الهند',
  'البرازيل','أستراليا','كندا','المكسيك','كوريا','إندونيسيا','باكستان','نيجيريا','أثيوبيا','كينيا',
  'بولندا','هولندا','بلجيكا','السويد','النرويج','الدنمارك','سويسرا','النمسا','اليونان','البرتغال',
  'الأرجنتين','كولومبيا','تشيلي','بيرو','فنزويلا','جنوب أفريقيا','غانا','تنزانيا','موزمبيق','أنغولا',
  'آسيا','أفريقيا','أوروبا','أمريكا الشمالية','أمريكا الجنوبية','القطب الشمالي','القطب الجنوبي',
  'المحيط الهادئ','المحيط الأطلسي','المحيط الهندي','البحر الأحمر','البحر الأبيض المتوسط',
  'نهر النيل','نهر الأمازون','نهر الفرات','نهر دجلة','جبل إيفرست','جبال الهيمالايا',
  'الصحراء الكبرى','الربع الخالي','غابة أمازون','سهل','هضبة','واحة',
  'جزيرة','شبه جزيرة','شلال','بحيرة','بركان','كهف','وادي','ساحل','خليج','مضيق',
  'مندي','كبسة','برياني','شاورما','فلافل','حمص','منسف','مجبوس','مقلوبة','كوزي',
  'عصيدة','هريسة','مضغوط','مشاوي','كبدة','ملوخية','فتة','كشري','طاجن','جريش',
  'مرقوق','ثريد','مطازيز','لقيمات','كنافة','بقلاوة','مهلبية','أم علي','بسبوسة','قطايف',
  'بيتزا','برغر','سوشي','باستا','ناجتس','هوت دوج','ساندويتش','لازانيا','تاكو','ستيك',
  'ماء','عصير','حليب','قهوة','شاي','كولا','عرقسوس','تمر هندي','لبن','كركديه',
  'شاي بالنعناع','قهوة عربية','ليموناضة','لاتيه','كابتشينو','إسبريسو','موكا','شربات',
  'عصير برتقال','عصير مانجو','سموثي','ميلك شيك','آيس تي','زنجبيل','يانسون','خروب',
  'شمس','قمر','نجمة','كوكب','مجرة','نيزك','ثقب أسود','مذنب','سحابة','رعد',
  'برق','قوس قزح','مطر','ثلج','ضباب','عاصفة','إعصار','زلزال','تسونامي','ينبوع',
  'غروب','شروق','فجر','ظلام','أفق','سماء','هواء','نار','تراب','بلورة',
  'مريخ','زحل','المشتري','عطارد','الزهرة','أورانوس','نبتون','بلوتو','سديم','جاذبية',
  'سيارة','طائرة','قطار','سفينة','دراجة','باص','شاحنة','تاكسي','مترو','هليكوبتر',
  'قارب','يخت','دراجة نارية','جرار','غواصة','عربة خيل','ترام','عبّارة','زورق','صاروخ',
  'حافلة مدرسية','سيارة إسعاف','سيارة إطفاء','دبابة','طائرة حربية','مظلة','سكوتر','مصعد','قطار سريع','ناقلة',
  'هاتف','حاسوب','تلفاز','كاميرا','طابعة','ميكروفون','سماعة','شاشة','لوحة مفاتيح','فأرة',
  'راديو','لاب توب','تابلت','بروجيكتور','روبوت','قمر صناعي','ذكاء اصطناعي','برنامج','تطبيق','إنترنت',
  'رادار','مجهر','تلسكوب','بطارية','شاحن','كونسول ألعاب','سماعة لاسلكية','مكبر صوت','خادم','شريحة',
  'كرة قدم','سباحة','ملاكمة','تنس','سباق','تسلق','غوص','رمي','قفز','ركض',
  'كرة سلة','كرة طائرة','غولف','كريكيت','رغبي','هوكي','جودو','كاراتيه','مصارعة','شطرنج',
  'بلياردو','بولينج','دارتس','ألعاب ماء','سكي','بطولة','ميدالية','كأس','تدريب','لياقة',
  'قميص','بنطلون','ثوب','عباءة','كوفية','عمامة','حذاء','حقيبة','خاتم','قبعة',
  'معطف','جاكيت','تنورة','فستان','جلابية','غترة','شماغ','عقال','سروال','جوارب',
  'حزام','كرافتة','بدلة','نظارة','وشاح','قفاز','منديل','طوق','سوار','خلخال',
  'فرح','حزن','خوف','غضب','حب','كره','حسد','كرم','شجاعة','حكمة',
  'جمال','قوة','سرعة','هدوء','ذكاء','صبر','أمل','يأس','فخر','خجل',
  'ثقة','وفاء','صدق','أمانة','عدل','رحمة','تواضع','إخلاص','نبل','طموح',
  'حرب','سلام','ثورة','انتخاب','مهرجان','حفل','زفاف','جنازة','احتفال','مظاهرة',
  'مباراة','مسابقة','امتحان','محاكمة','اجتماع','مفاوضة','توقيع','اكتشاف','اختراع','هجرة',
  'سفر','عودة','لقاء','وداع','ميلاد','تخرج','ترقية','تقاعد','مغامرة','استكشاف',
  'ذهب','فضة','نحاس','حديد','ألومنيوم','خشب','حجر','رمال','طين','جبس',
  'زجاج','بلاستيك','قماش','جلد','صوف','قطن','حرير','ورق','كرتون','نايلون',
  'ماس','لؤلؤ','مرجان','عقيق','فيروز','زمرد','ياقوت','جرانيت','مرمر','بازلت',
];

const BOARD_SIZE    = 25;
const TEAM1_TOTAL   = 9;
const TEAM2_TOTAL   = 8;
const NEUTRAL_TOTAL = 7;
const KILLER_TOTAL  = 1;
const COST          = 5;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateBoard() {
  const words = shuffle(WORD_BANK).slice(0, BOARD_SIZE);
  const types = shuffle([
    ...Array(TEAM1_TOTAL).fill('team1'),
    ...Array(TEAM2_TOTAL).fill('team2'),
    ...Array(NEUTRAL_TOTAL).fill('neutral'),
    ...Array(KILLER_TOTAL).fill('killer'),
  ]);
  return words.map((word, i) => ({ word, type: types[i], revealed: false }));
}

function genCode() { return Math.random().toString(36).slice(2, 8).toUpperCase(); }
function getUid() {
  const u = auth.currentUser?.uid;
  if (u) return u;
  if (!global._cnUid) global._cnUid = 'guest_' + Math.random().toString(36).slice(2, 10);
  return global._cnUid;
}

// ══════════════════════════════════════════════════════════════
// شاشة القائمة
// ══════════════════════════════════════════════════════════════
function MenuScreen({ onBack, onCreatePrivate, onCreateRandom, onJoin, tokens, fadeAnim, randomCount, setRandomCount }) {
  const [showJoin,  setShowJoin]  = useState(false);
  const [joinCode,  setJoinCode]  = useState('');
  const [showRules, setShowRules] = useState(false);

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#06061a" />
      <Animated.View style={[s.header, { opacity: fadeAnim }]}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Text style={s.backText}>→</Text>
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerEmoji}>🔤</Text>
          <Text style={s.headerTitle}>كلمات سرية</Text>
        </View>
        <View style={s.tokenBadge}><Text style={s.tokenText}>🪙 {tokens}</Text></View>
      </Animated.View>

      <ScrollView contentContainerStyle={s.menuScroll} showsVerticalScrollIndicator={false}>
        <Animated.View style={[s.heroCard, { opacity: fadeAnim }]}>
          <Text style={s.heroEmoji}>🕵️</Text>
          <Text style={s.heroTitle}>لعبة الجواسيس</Text>
          <Text style={s.heroSub}>فريقان، جاسوسان، وكلمات سرية{'\n'}من يكشف كل كلماته أولاً يفوز</Text>
          <TouchableOpacity style={s.rulesBtn} onPress={() => setShowRules(true)}>
            <Text style={s.rulesBtnText}>📖 طريقة اللعب</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* نمط الأصدقاء */}
        <Animated.View style={[s.modeCard, s.modeCardGreen, { opacity: fadeAnim }]}>
          <View style={s.modeCardHeader}>
            <Text style={s.modeCardEmoji}>🔒</Text>
            <View style={s.modeCardInfo}>
              <Text style={[s.modeCardTitle, { color: '#10b981' }]}>غرفة خاصة مع أصدقاء</Text>
              <Text style={s.modeCardDesc}>4–8 لاعبين • كود دعوة • تختار فريقك</Text>
            </View>
            <View style={s.costBadge}><Text style={s.costText}>🪙 {COST}</Text></View>
          </View>
          <View style={s.featuresList}>
            <Text style={s.featureItem}>✓ اختر فريقك بنفسك</Text>
            <Text style={s.featureItem}>✓ الجاسوس يختاره الفريق</Text>
            <Text style={s.featureItem}>✓ شارك كود الغرفة مع أصدقائك</Text>
          </View>
          <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#10b981' }]} onPress={onCreatePrivate}>
            <Text style={s.actionBtnText}>إنشاء غرفة خاصة</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.joinLink} onPress={() => setShowJoin(v => !v)}>
            <Text style={s.joinLinkText}>🔑 عندي كود — انضم لغرفة</Text>
          </TouchableOpacity>
          {showJoin && (
            <View style={s.joinRow}>
              <TextInput
                style={s.joinInput}
                placeholder="كود الغرفة (6 أحرف)"
                placeholderTextColor="#3a3a60"
                value={joinCode}
                onChangeText={t => setJoinCode(t.toUpperCase())}
                maxLength={6}
                autoCapitalize="characters"
                textAlign="right"
              />
              <TouchableOpacity style={s.joinBtn} onPress={() => onJoin(joinCode)}>
                <Text style={s.joinBtnText}>انضم</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>

        {/* نمط العشوائيين */}
        <Animated.View style={[s.modeCard, s.modeCardBlue, { opacity: fadeAnim }]}>
          <View style={s.modeCardHeader}>
            <Text style={s.modeCardEmoji}>🌍</Text>
            <View style={s.modeCardInfo}>
              <Text style={[s.modeCardTitle, { color: '#3b82f6' }]}>لعب عشوائي</Text>
              <Text style={s.modeCardDesc}>توزيع تلقائي عادل • جاسوس عشوائي</Text>
            </View>
            <View style={s.costBadge}><Text style={s.costText}>🪙 {COST}</Text></View>
          </View>
          <View style={s.featuresList}>
            <Text style={s.featureItem}>✓ توزيع الفرق بالتساوي</Text>
            <Text style={s.featureItem}>✓ الجاسوس يُختار تلقائياً عشوائياً</Text>
            <Text style={s.featureItem}>✓ ابدأ مع لاعبين من العالم</Text>
          </View>
          <Text style={s.countLabel}>عدد اللاعبين</Text>
          <View style={s.countRow}>
            {[4, 6, 8].map(n => (
              <TouchableOpacity key={n}
                style={[s.countBtn, randomCount === n && s.countBtnActive]}
                onPress={() => setRandomCount(n)}>
                <Text style={[s.countBtnNum, randomCount === n && s.countBtnNumActive]}>{n}</Text>
                <Text style={[s.countBtnLbl, randomCount === n && { color: '#3b82f6' }]}>لاعب</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#3b82f6' }]} onPress={onCreateRandom}>
            <Text style={s.actionBtnText}>ابحث عن لاعبين 🎲</Text>
          </TouchableOpacity>
        </Animated.View>
        <View style={{ height: 32 }} />
      </ScrollView>

      {/* مودال الشرح */}
      <Modal visible={showRules} transparent animationType="slide" onRequestClose={() => setShowRules(false)}>
        <View style={s.modalOverlay}>
          <View style={s.rulesModal}>
            <Text style={s.rulesModalTitle}>🕵️ كيف تلعب كلمات سرية؟</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ marginVertical: 8 }}>
              {[
                { t: '🎯 الهدف', b: 'الفريق الذي يكشف كل كلماته على اللوحة أولاً يفوز.' },
                { t: '👥 الأدوار', b: 'كل فريق فيه جاسوس واحد يعرف أماكن جميع الكلمات، والباقون لاعبون يخمّنون.' },
                { t: '💬 التلميح', b: 'الجاسوس يعطي كلمة واحدة كتلميح + رقم يدل على عدد الكلمات المقصودة.' },
                { t: '🖱️ الاختيار', b: 'الفريق يختار الكلمات. يمكن الاختيار حتى (الرقم + 1) مرة.' },
              ].map(r => (
                <View key={r.t} style={s.ruleRow}>
                  <Text style={s.ruleRowTitle}>{r.t}</Text>
                  <Text style={s.ruleRowBody}>{r.b}</Text>
                </View>
              ))}
              <View style={s.legendGrid}>
                {[
                  { bg: '#ef444428', bc: '#ef444460', txt: '🔴 كلمات الفريق الأحمر (9)', tc: '#ef4444' },
                  { bg: '#3b82f628', bc: '#3b82f660', txt: '🔵 كلمات الفريق الأزرق (8)', tc: '#3b82f6' },
                  { bg: '#37415128', bc: '#6b728060', txt: '⚪ محايدة — ينتهي الدور', tc: '#9090b0' },
                  { bg: '#11111190', bc: '#ff000060', txt: '☠️ الكلمة القاتلة — خسارة فورية!', tc: '#ff6b6b' },
                ].map(l => (
                  <View key={l.txt} style={[s.legendItem, { backgroundColor: l.bg, borderColor: l.bc }]}>
                    <Text style={[s.legendItemText, { color: l.tc }]}>{l.txt}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
            <TouchableOpacity style={s.rulesCloseBtn} onPress={() => setShowRules(false)}>
              <Text style={s.rulesCloseBtnText}>فهمت! ✓</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════
// لوبي الأصدقاء
// ══════════════════════════════════════════════════════════════
function FriendsLobby({ roomData, roomId, myUid, isHost, onLeave, onSearch, onInvite,
  friendSearch, friendResults, searching, onStartGame, onJoinTeam, onBecomeSpymaster, onResignSpymaster }) {

  const players = roomData?.players || [];
  const team1   = players.filter(p => p.team === 'team1');
  const team2   = players.filter(p => p.team === 'team2');
  const me      = players.find(p => p.uid === myUid);
  const myTeam  = me?.team;

  const canStart = isHost
    && team1.length >= 2 && team2.length >= 2
    && team1.some(p => p.isSpymaster) && team2.some(p => p.isSpymaster);

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#06061a" />
      <View style={s.header}>
        <TouchableOpacity onPress={onLeave} style={s.backBtn}><Text style={s.backText}>→</Text></TouchableOpacity>
        <View style={s.headerCenter}><Text style={s.headerTitle}>غرفة الأصدقاء 🔒</Text></View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.lobbyScroll} showsVerticalScrollIndicator={false}>
        {/* كود */}
        <View style={s.codeBox}>
          <Text style={s.codeLabel}>كود الغرفة</Text>
          <Text style={s.codeValue}>{roomId}</Text>
          <Text style={s.codeHint}>شارك الكود مع أصدقائك 📋</Text>
        </View>

        {/* الفريقان */}
        <View style={s.teamsRow}>
          {[
            { key: 'team1', color: '#ef4444', label: '🔴 الأحمر', list: team1 },
            { key: 'team2', color: '#3b82f6', label: '🔵 الأزرق', list: team2 },
          ].map(t => (
            <View key={t.key} style={[s.teamCol, { borderColor: t.color + '40' }]}>
              <Text style={[s.teamColTitle, { color: t.color }]}>{t.label}</Text>
              <Text style={s.teamColSub}>{t.list.length} لاعبين</Text>
              {t.list.map(p => (
                <View key={p.uid} style={s.playerChip}>
                  <Text style={s.playerChipName} numberOfLines={1}>{p.name}</Text>
                  {p.isSpymaster && <Text>🕵️</Text>}
                  {p.uid === myUid && <View style={s.meTag}><Text style={s.meTagText}>أنا</Text></View>}
                </View>
              ))}
              {myTeam !== t.key && (
                <TouchableOpacity style={[s.joinTeamBtn, { borderColor: t.color + '60' }]} onPress={() => onJoinTeam(t.key)}>
                  <Text style={[s.joinTeamBtnText, { color: t.color }]}>انضم +</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        {/* أزرار اللاعب */}
        {myTeam && (
          <View style={s.myActionsBox}>
            <Text style={s.myActionsLbl}>
              أنت في الفريق {myTeam === 'team1' ? '🔴 الأحمر' : '🔵 الأزرق'}
            </Text>
            {!me?.isSpymaster ? (
              <TouchableOpacity style={s.spyBtn} onPress={onBecomeSpymaster}>
                <Text style={s.spyBtnText}>🕵️ أنا جاسوس هذا الدور</Text>
              </TouchableOpacity>
            ) : (
              <View style={s.isSpyRow}>
                <Text style={s.isSpyText}>🕵️ أنت الجاسوس</Text>
                <TouchableOpacity onPress={onResignSpymaster}>
                  <Text style={s.resignText}>تنازل</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* دعوة */}
        <View style={s.inviteBox}>
          <Text style={s.inviteTitle}>دعوة صديق ✉️</Text>
          <TextInput style={s.searchInput} placeholder="ابحث بالاسم..." placeholderTextColor="#3a3a60"
            value={friendSearch} onChangeText={onSearch} textAlign="right" />
          {searching && <ActivityIndicator size="small" color="#10b981" />}
          {friendResults.map(f => (
            <TouchableOpacity key={f.uid} style={s.friendRow} onPress={() => onInvite(f)}>
              <Text style={s.friendName}>{f.name || f.uid}</Text>
              <Text style={s.friendInvite}>دعوة ✉️</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* شروط البدء */}
        <View style={s.condBox}>
          {[
            { ok: team1.length >= 2, txt: `الأحمر: ${team1.length}/2+ لاعبين` },
            { ok: team2.length >= 2, txt: `الأزرق: ${team2.length}/2+ لاعبين` },
            { ok: team1.some(p => p.isSpymaster), txt: 'جاسوس أحمر محدد' },
            { ok: team2.some(p => p.isSpymaster), txt: 'جاسوس أزرق محدد' },
          ].map(c => (
            <Text key={c.txt} style={[s.condItem, c.ok ? s.condOk : s.condBad]}>
              {c.ok ? '✓ ' : '✗ '}{c.txt}
            </Text>
          ))}
        </View>

        {isHost ? (
          <TouchableOpacity
            style={[s.startBtn, !canStart && s.startBtnOff]}
            onPress={canStart ? onStartGame : null}
            activeOpacity={canStart ? 0.85 : 1}>
            <Text style={s.startBtnText}>{canStart ? 'ابدأ اللعبة 🚀' : 'انتظر اكتمال الشروط...'}</Text>
          </TouchableOpacity>
        ) : (
          <View style={s.waitingHost}>
            <ActivityIndicator size="small" color="#10b981" />
            <Text style={s.waitingHostText}>بانتظار المضيف ليبدأ</Text>
          </View>
        )}
        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════
// لوبي العشوائيين
// ══════════════════════════════════════════════════════════════
function RandomLobby({ roomData, myUid, onLeave }) {
  const players    = roomData?.players || [];
  const maxPlayers = roomData?.maxPlayers || 4;

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#06061a" />
      <View style={s.header}>
        <TouchableOpacity onPress={onLeave} style={s.backBtn}><Text style={s.backText}>→</Text></TouchableOpacity>
        <View style={s.headerCenter}><Text style={s.headerTitle}>بحث عن لاعبين 🌍</Text></View>
        <View style={{ width: 40 }} />
      </View>

      <View style={s.randomBody}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <View style={s.randomCountRow}>
          <Text style={[s.randomCountNum, { color: '#3b82f6' }]}>{players.length}</Text>
          <Text style={s.randomCountSep}> / </Text>
          <Text style={s.randomCountNum}>{maxPlayers}</Text>
        </View>
        <Text style={s.randomCountLabel}>لاعبين انضموا</Text>

        <View style={s.randomList}>
          {players.map((p, i) => (
            <View key={p.uid} style={[s.randomChip, p.uid === myUid && s.randomChipMe]}>
              <Text style={s.randomChipNum}>{i + 1}</Text>
              <Text style={s.randomChipName}>{p.name}</Text>
              {p.uid === myUid && <View style={s.meTag}><Text style={s.meTagText}>أنا</Text></View>}
            </View>
          ))}
          {Array(maxPlayers - players.length).fill(0).map((_, i) => (
            <View key={`e${i}`} style={s.randomEmpty}>
              <Text style={s.randomEmptyText}>انتظار...</Text>
            </View>
          ))}
        </View>
        <Text style={s.randomHint}>ستبدأ اللعبة تلقائياً عند اكتمال اللاعبين</Text>
      </View>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════
// شاشة الجاسوس (يرى اللوحة بالألوان ويدخل التلميح)
// ══════════════════════════════════════════════════════════════
function SpymasterScreen({ board, myTeam, teamColor, teamName, remainingCount, onSubmitClue }) {
  const [clueWord, setClueWord] = useState('');
  const [clueNum,  setClueNum]  = useState(1);

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="light-content" backgroundColor="#06061a" />

      <View style={[s.spyBanner, { backgroundColor: teamColor + '18', borderColor: teamColor + '50' }]}>
        <Text style={[s.spyBannerTitle, { color: teamColor }]}>🕵️ أنت الجاسوس</Text>
        <Text style={s.spyBannerSub}>{teamName} — متبقي {remainingCount} كلمة</Text>
      </View>

      <Text style={s.spyBoardHint}>لوحتك السرية — لا تُظهرها لأحد 🙈</Text>

      <View style={s.spyGrid}>
        {board.map((card, i) => {
          const bg = card.type==='team1' ? '#ef4444' : card.type==='team2' ? '#3b82f6' : card.type==='killer' ? '#111' : '#374151';
          return (
            <View key={i} style={[s.spyCell, { backgroundColor: bg, opacity: card.revealed ? 0.28 : 1 }]}>
              {card.type === 'killer' && !card.revealed && <Text style={s.killerIcon}>☠️</Text>}
              <Text style={s.spyCellTxt} numberOfLines={1} adjustsFontSizeToFit>{card.word}</Text>
            </View>
          );
        })}
      </View>

      <View style={[s.clueBox, { borderColor: teamColor + '40' }]}>
        <Text style={[s.clueBoxTitle, { color: teamColor }]}>أدخل تلميحك</Text>
        <Text style={s.clueBoxHint}>كلمة واحدة لا تكون موجودة على اللوحة</Text>
        <View style={s.clueInputRow}>
          <TextInput
            style={[s.clueWordInput, { borderColor: teamColor + '50' }]}
            value={clueWord}
            onChangeText={t => setClueWord(t.replace(/\s/g, ''))}
            placeholder="التلميح..."
            placeholderTextColor="#3a3a60"
            textAlign="right"
            maxLength={20}
          />
          <View style={s.numCtrl}>
            <TouchableOpacity style={s.numArrow} onPress={() => setClueNum(n => Math.min(9, n + 1))}>
              <Text style={s.numArrowTxt}>▲</Text>
            </TouchableOpacity>
            <Text style={[s.numVal, { color: teamColor }]}>{clueNum}</Text>
            <TouchableOpacity style={s.numArrow} onPress={() => setClueNum(n => Math.max(1, n - 1))}>
              <Text style={s.numArrowTxt}>▼</Text>
            </TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity
          style={[s.submitBtn, { backgroundColor: teamColor }, !clueWord.trim() && s.disabledBtn]}
          onPress={() => clueWord.trim() && onSubmitClue(clueWord.trim(), clueNum)}>
          <Text style={s.submitBtnTxt}>✓ أرسل التلميح للفريق</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ══════════════════════════════════════════════════════════════
// شاشة اللعبة الرئيسية
// ══════════════════════════════════════════════════════════════
function GameScreen({ roomData, myUid, onAction, onEndTurn, onLeave }) {
  const board       = roomData?.board || [];
  const currentTeam = roomData?.currentTeam;
  const clue        = roomData?.currentClue;
  const clueNum     = roomData?.currentClueNum;
  const guessesLeft = roomData?.guessesLeft;
  const me          = roomData?.players?.find(p => p.uid === myUid);
  const myTeam      = me?.team;
  const amSpy       = me?.isSpymaster;
  const isMyTeamTurn= currentTeam === myTeam;
  const canGuess    = isMyTeamTurn && !amSpy && !!clue;

  const teamColor   = currentTeam === 'team1' ? '#ef4444' : '#3b82f6';
  const myTeamColor = myTeam === 'team1'      ? '#ef4444' : '#3b82f6';

  const rem1 = board.filter(c => c.type === 'team1' && !c.revealed).length;
  const rem2 = board.filter(c => c.type === 'team2' && !c.revealed).length;

  // دور الجاسوس: عرض شاشة الجاسوس
  if (isMyTeamTurn && amSpy && !clue) {
    return (
      <SpymasterScreen
        board={board}
        myTeam={myTeam}
        teamColor={myTeamColor}
        teamName={myTeam === 'team1' ? 'الفريق الأحمر' : 'الفريق الأزرق'}
        remainingCount={myTeam === 'team1' ? rem1 : rem2}
        onSubmitClue={(word, num) => onAction({ type: 'clue', word, num })}
      />
    );
  }

  const getCardBg = (card) => {
    if (!card.revealed) return '#0d1b2e';
    if (card.type === 'team1')  return '#ef444455';
    if (card.type === 'team2')  return '#3b82f655';
    if (card.type === 'killer') return '#000';
    return '#37415155';
  };

  const getCardBorder = (card) => {
    if (!card.revealed) return canGuess ? myTeamColor + '30' : '#ffffff0e';
    if (card.type === 'team1')  return '#ef4444';
    if (card.type === 'team2')  return '#3b82f6';
    if (card.type === 'killer') return '#ff0000';
    return '#6b7280';
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#06061a" />

      {/* شريط أعلى */}
      <View style={s.gameTopBar}>
        <TouchableOpacity onPress={onLeave} style={s.backBtn}><Text style={s.backText}>→</Text></TouchableOpacity>
        <View style={[s.turnBadge, { borderColor: teamColor + '80', backgroundColor: teamColor + '15' }]}>
          <Text style={[s.turnBadgeText, { color: teamColor }]}>
            {currentTeam === 'team1' ? '🔴 دور الأحمر' : '🔵 دور الأزرق'}
          </Text>
        </View>
        <View style={s.remRow}>
          <Text style={[s.remNum, { color: '#ef4444' }]}>{rem1}</Text>
          <Text style={s.remSep}>|</Text>
          <Text style={[s.remNum, { color: '#3b82f6' }]}>{rem2}</Text>
        </View>
      </View>

      {/* شريط التلميح */}
      {clue ? (
        <View style={[s.clueBar, { borderColor: teamColor + '50', backgroundColor: teamColor + '0e' }]}>
          <Text style={s.clueBarLbl}>التلميح</Text>
          <Text style={[s.clueBarWord, { color: teamColor }]}>{clue}</Text>
          <View style={[s.clueBarNum, { backgroundColor: teamColor }]}>
            <Text style={s.clueBarNumTxt}>{clueNum}</Text>
          </View>
          <View style={s.clueBarDiv} />
          <Text style={s.guessLbl}>تبقى</Text>
          <View style={[s.guessBadge, { borderColor: teamColor + '60' }]}>
            <Text style={[s.guessNum, { color: teamColor }]}>{guessesLeft}</Text>
          </View>
        </View>
      ) : (
        <View style={[s.clueBar, { borderColor: '#ffffff10', backgroundColor: '#0f0f2e' }]}>
          <ActivityIndicator size="small" color={teamColor} />
          <Text style={[s.clueBarLbl, { marginLeft: 10 }]}>الجاسوس يكتب تلميحه...</Text>
        </View>
      )}

      {/* اللوحة */}
      <View style={s.gameGrid}>
        {board.map((card, i) => (
          <TouchableOpacity
            key={i}
            style={[s.gameCard, { backgroundColor: getCardBg(card), borderColor: getCardBorder(card) }]}
            onPress={() => canGuess && !card.revealed && onAction({ type: 'guess', index: i })}
            activeOpacity={canGuess && !card.revealed ? 0.7 : 1}
            disabled={card.revealed || !canGuess}>
            {card.revealed ? (
              <>
                <Text style={{ fontSize: card.type === 'killer' ? 18 : 13 }}>
                  {card.type === 'killer' ? '☠️' : card.type === 'team1' ? '🔴' : card.type === 'team2' ? '🔵' : '⚪'}
                </Text>
                <Text style={[s.gameCardTxt, { fontSize: 9, color: '#ffffff70' }]} numberOfLines={1}>{card.word}</Text>
              </>
            ) : (
              <Text style={s.gameCardTxt} numberOfLines={2} adjustsFontSizeToFit>{card.word}</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* الفوتر */}
      <View style={s.gameFooter}>
        {canGuess ? (
          <TouchableOpacity style={[s.endTurnBtn, { borderColor: myTeamColor + '60' }]} onPress={onEndTurn}>
            <Text style={[s.endTurnTxt, { color: myTeamColor }]}>انتهيت من دوري ←</Text>
          </TouchableOpacity>
        ) : (
          <View style={s.waitBox}>
            <Text style={s.waitTxt}>
              {amSpy && isMyTeamTurn ? '⏳ فريقك يختار...' : `⏳ انتظر دور ${currentTeam === 'team1' ? 'الأحمر 🔴' : 'الأزرق 🔵'}`}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════
// شاشة النتيجة
// ══════════════════════════════════════════════════════════════
function ResultScreen({ roomData, myUid, onLeave }) {
  const winner   = roomData?.winner;
  const reason   = roomData?.winReason;
  const wColor   = winner === 'team1' ? '#ef4444' : '#3b82f6';
  const wLabel   = winner === 'team1' ? '🔴 الفريق الأحمر' : '🔵 الفريق الأزرق';
  const scaleAnim = useRef(new Animated.Value(0.4)).current;
  const me        = roomData?.players?.find(p => p.uid === myUid);
  const iWon      = me?.team === winner;

  useEffect(() => {
    Animated.spring(scaleAnim, { toValue: 1, friction: 4, tension: 60, useNativeDriver: true }).start();
  }, []);

  return (
    <View style={[s.container, s.centerContent]}>
      <StatusBar barStyle="light-content" backgroundColor="#06061a" />
      <Animated.Text style={[s.winEmoji, { transform: [{ scale: scaleAnim }] }]}>
        {iWon ? '🏆' : '😔'}
      </Animated.Text>
      <Text style={[s.winTitle, { color: wColor }]}>فاز {wLabel}!</Text>
      <Text style={s.winReason}>{reason}</Text>

      <View style={s.resultTeamsRow}>
        {['team1', 'team2'].map(t => {
          const tc = t === 'team1' ? '#ef4444' : '#3b82f6';
          const tl = t === 'team1' ? '🔴 الأحمر' : '🔵 الأزرق';
          const tp = roomData?.players?.filter(p => p.team === t) || [];
          return (
            <View key={t} style={[s.resultTeamBox, { borderColor: tc + '40', backgroundColor: tc + '0c' }]}>
              <Text style={[s.resultTeamTitle, { color: tc }]}>{tl}</Text>
              {tp.map(p => (
                <Text key={p.uid} style={s.resultTeamPlayer}>
                  {p.isSpymaster ? '🕵️ ' : '👤 '}{p.name}
                </Text>
              ))}
            </View>
          );
        })}
      </View>

      <TouchableOpacity style={s.leaveBtn} onPress={onLeave}>
        <Text style={s.leaveBtnTxt}>← العودة للقائمة</Text>
      </TouchableOpacity>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════
// المكوّن الرئيسي
// ══════════════════════════════════════════════════════════════
export default function CodenamesGameScreen({ onBack, currentUser, tokens, onSpendTokens }) {
  const [phase,         setPhase]         = useState('menu');
  const [roomId,        setRoomId]        = useState(null);
  const [roomData,      setRoomData]      = useState(null);
  const [myUid,         setMyUid]         = useState(null);
  const [myName,        setMyName]        = useState('');
  const [loading,       setLoading]       = useState(false);
  const [friendSearch,  setFriendSearch]  = useState('');
  const [friendResults, setFriendResults] = useState([]);
  const [searching,     setSearching]     = useState(false);
  const [randomCount,   setRandomCount]   = useState(4);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const unsubRef = useRef(null);

  useEffect(() => {
    setMyUid(getUid());
    setMyName(currentUser?.name || auth.currentUser?.displayName || 'لاعب');
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    return () => { if (unsubRef.current) unsubRef.current(); };
  }, []);

  function subscribeRoom(id) {
    if (unsubRef.current) unsubRef.current();
    unsubRef.current = onSnapshot(doc(db, 'codenames_rooms', id), async snap => {
      if (!snap.exists()) { setPhase('menu'); setRoomId(null); setRoomData(null); return; }
      const data = snap.data();
      setRoomData(data);
      if      (data.phase === 'lobby_friends') setPhase('lobby_friends');
      else if (data.phase === 'lobby_random')  setPhase('lobby_random');
      else if (data.phase === 'game')          setPhase('game');
      else if (data.phase === 'result')        setPhase('result');

      const uid = getUid();
      if (data.phase === 'lobby_random' && data.hostUid === uid && data.players.length >= data.maxPlayers) {
        await doStartRandomGame(data, id);
      }
    });
  }

  async function doStartRandomGame(data, id) {
    const all  = shuffle([...data.players]);
    const half = Math.floor(all.length / 2);
    const t1   = all.slice(0, half);
    const t2   = all.slice(half);
    const s1   = Math.floor(Math.random() * t1.length);
    const s2   = Math.floor(Math.random() * t2.length);

    const updatedPlayers = all.map(p => {
      const i1 = t1.findIndex(x => x.uid === p.uid);
      const i2 = t2.findIndex(x => x.uid === p.uid);
      if (i1 >= 0) return { ...p, team: 'team1', isSpymaster: i1 === s1 };
      if (i2 >= 0) return { ...p, team: 'team2', isSpymaster: i2 === s2 };
      return p;
    });

    await updateDoc(doc(db, 'codenames_rooms', id), {
      phase: 'game', players: updatedPlayers, board: generateBoard(),
      currentTeam: 'team1', currentClue: null, currentClueNum: 0,
      guessesLeft: 0, winner: null, winReason: null,
    });
  }

  async function createPrivateRoom() {
    if ((tokens ?? 0) < COST) { Alert.alert('رصيد غير كافٍ', `تحتاج ${COST} رصيد`); return; }
    setLoading(true);
    try {
      const uid = getUid(); const code = genCode();
      await setDoc(doc(db, 'codenames_rooms', code), {
        code, phase: 'lobby_friends', isRandom: false, maxPlayers: 8, minPlayers: 4,
        createdAt: serverTimestamp(), hostUid: uid,
        players: [{ uid, name: myName, isHost: true, team: null, isSpymaster: false }],
        board: [], currentTeam: null, currentClue: null, currentClueNum: 0,
        guessesLeft: 0, winner: null, winReason: null,
      });
      onSpendTokens?.(COST); setRoomId(code); subscribeRoom(code);
    } catch (e) { Alert.alert('خطأ', e.message); }
    setLoading(false);
  }

  async function createOrJoinRandom() {
    if ((tokens ?? 0) < COST) { Alert.alert('رصيد غير كافٍ', `تحتاج ${COST} رصيد`); return; }
    setLoading(true);
    try {
      const uid = getUid();
      const q   = query(collection(db, 'codenames_rooms'),
        where('phase', '==', 'lobby_random'), where('isRandom', '==', true),
        where('maxPlayers', '==', randomCount));
      const snap = await getDocs(q);
      let joined = false;
      for (const d of snap.docs) {
        const data = d.data();
        if (data.players.length < data.maxPlayers && !data.players.some(p => p.uid === uid)) {
          await updateDoc(d.ref, { players: arrayUnion({ uid, name: myName, isHost: false, team: null, isSpymaster: false }) });
          onSpendTokens?.(COST); setRoomId(d.id); subscribeRoom(d.id); joined = true; break;
        }
      }
      if (!joined) {
        const code = genCode();
        await setDoc(doc(db, 'codenames_rooms', code), {
          code, phase: 'lobby_random', isRandom: true, maxPlayers: randomCount, minPlayers: randomCount,
          createdAt: serverTimestamp(), hostUid: uid,
          players: [{ uid, name: myName, isHost: true, team: null, isSpymaster: false }],
          board: [], currentTeam: null, currentClue: null, currentClueNum: 0,
          guessesLeft: 0, winner: null, winReason: null,
        });
        onSpendTokens?.(COST); setRoomId(code); subscribeRoom(code);
      }
    } catch (e) { Alert.alert('خطأ', e.message); }
    setLoading(false);
  }

  async function joinByCode(code) {
    if (!code || code.length < 4) return;
    if ((tokens ?? 0) < COST) { Alert.alert('رصيد غير كافٍ'); return; }
    setLoading(true);
    try {
      const uid = getUid(); const roomRef = doc(db, 'codenames_rooms', code.toUpperCase());
      const snap = await getDoc(roomRef);
      if (!snap.exists()) { Alert.alert('الغرفة غير موجودة'); setLoading(false); return; }
      const data = snap.data();
      if (data.phase !== 'lobby_friends') { Alert.alert('اللعبة بدأت أو انتهت'); setLoading(false); return; }
      if (data.players.length >= data.maxPlayers) { Alert.alert('الغرفة ممتلئة'); setLoading(false); return; }
      if (!data.players.some(p => p.uid === uid)) {
        await updateDoc(roomRef, { players: arrayUnion({ uid, name: myName, isHost: false, team: null, isSpymaster: false }) });
      }
      onSpendTokens?.(COST); setRoomId(code.toUpperCase()); subscribeRoom(code.toUpperCase());
    } catch (e) { Alert.alert('خطأ', e.message); }
    setLoading(false);
  }

  async function joinTeam(team) {
    if (!roomId) return;
    const uid = getUid();
    await updateDoc(doc(db, 'codenames_rooms', roomId), {
      players: roomData.players.map(p => p.uid === uid ? { ...p, team, isSpymaster: false } : p),
    });
  }

  async function becomeSpymaster() {
    if (!roomId) return;
    const uid = getUid(); const me = roomData?.players?.find(p => p.uid === uid);
    if (!me?.team) { Alert.alert('انضم لفريق أولاً'); return; }
    if (roomData.players.filter(p => p.team === me.team && p.uid !== uid).some(p => p.isSpymaster)) {
      Alert.alert('يوجد جاسوس بالفعل في فريقك'); return;
    }
    await updateDoc(doc(db, 'codenames_rooms', roomId), {
      players: roomData.players.map(p => p.uid === uid ? { ...p, isSpymaster: true } : p),
    });
  }

  async function resignSpymaster() {
    if (!roomId) return;
    const uid = getUid();
    await updateDoc(doc(db, 'codenames_rooms', roomId), {
      players: roomData.players.map(p => p.uid === uid ? { ...p, isSpymaster: false } : p),
    });
  }

  async function searchFriend(text) {
    setFriendSearch(text);
    if (text.length < 2) { setFriendResults([]); return; }
    setSearching(true);
    try {
      const q = query(collection(db, 'users'),
        where('nameLower', '>=', text.toLowerCase()),
        where('nameLower', '<=', text.toLowerCase() + '\uf8ff'));
      const snap = await getDocs(q);
      setFriendResults(snap.docs.map(d => ({ uid: d.id, ...d.data() })).filter(u => u.uid !== myUid).slice(0, 5));
    } catch { setFriendResults([]); }
    setSearching(false);
  }

  async function inviteFriend(friend) {
    if (!roomId || !roomData) return;
    if (roomData.players.some(p => p.uid === friend.uid)) { Alert.alert('موجود بالفعل'); return; }
    await setDoc(doc(db, 'invites', `${roomId}_${friend.uid}`), {
      roomId, fromName: myName, fromUid: myUid, toUid: friend.uid,
      code: roomId, game: 'codenames', createdAt: serverTimestamp(),
    });
    Alert.alert('✅ تم إرسال الدعوة', `دُعي ${friend.name || friend.uid}`);
  }

  async function handleAction(action) {
    if (!roomId || !roomData) return;
    const roomRef = doc(db, 'codenames_rooms', roomId);
    const board   = roomData.board.map(c => ({ ...c }));

    if (action.type === 'clue') {
      await updateDoc(roomRef, { currentClue: action.word, currentClueNum: action.num, guessesLeft: action.num + 1 });
      return;
    }

    if (action.type === 'guess') {
      const card = board[action.index];
      if (!card || card.revealed) return;
      board[action.index] = { ...card, revealed: true };
      const ct = roomData.currentTeam;
      const nt = ct === 'team1' ? 'team2' : 'team1';

      if (card.type === 'killer') {
        const gName = roomData.players?.find(p => p.uid === myUid)?.name || 'لاعب';
        await updateDoc(roomRef, { board, phase: 'result', winner: nt, winReason: `☠️ ${gName} اختار الكلمة القاتلة!` });
        return;
      }

      const rem1 = board.filter(c => c.type === 'team1' && !c.revealed).length;
      const rem2 = board.filter(c => c.type === 'team2' && !c.revealed).length;
      if (rem1 === 0) { await updateDoc(roomRef, { board, phase: 'result', winner: 'team1', winReason: '🎯 كشفوا جميع كلماتهم!' }); return; }
      if (rem2 === 0) { await updateDoc(roomRef, { board, phase: 'result', winner: 'team2', winReason: '🎯 كشفوا جميع كلماتهم!' }); return; }

      if (card.type !== ct || card.type === 'neutral') {
        await updateDoc(roomRef, { board, currentTeam: nt, currentClue: null, currentClueNum: 0, guessesLeft: 0 });
        return;
      }

      const ng = roomData.guessesLeft - 1;
      if (ng <= 0) {
        await updateDoc(roomRef, { board, currentTeam: nt, currentClue: null, currentClueNum: 0, guessesLeft: 0 });
      } else {
        await updateDoc(roomRef, { board, guessesLeft: ng });
      }
    }
  }

  async function endTurn() {
    if (!roomId || !roomData) return;
    const nt = roomData.currentTeam === 'team1' ? 'team2' : 'team1';
    await updateDoc(doc(db, 'codenames_rooms', roomId), { currentTeam: nt, currentClue: null, currentClueNum: 0, guessesLeft: 0 });
  }

  async function leaveRoom() {
    Alert.alert('مغادرة', 'هل تريد مغادرة الغرفة؟', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'مغادرة', style: 'destructive', onPress: async () => {
        const uid = getUid();
        if (roomId) {
          try {
            const snap = await getDoc(doc(db, 'codenames_rooms', roomId));
            if (snap.exists()) {
              const d = snap.data();
              if (d.phase === 'lobby_friends' || d.phase === 'lobby_random') onSpendTokens?.(-COST);
              if (d.hostUid === uid && d.players.length <= 1) await deleteDoc(doc(db, 'codenames_rooms', roomId));
              else await updateDoc(doc(db, 'codenames_rooms', roomId), { players: d.players.filter(p => p.uid !== uid) });
            }
          } catch {}
        }
        if (unsubRef.current) unsubRef.current();
        setRoomId(null); setRoomData(null); setPhase('menu');
      }},
    ]);
  }

  const isHost = roomData?.hostUid === myUid;

  if (loading) return (
    <View style={s.centerFull}>
      <ActivityIndicator size="large" color="#10b981" />
      <Text style={s.loadingTxt}>جاري الاتصال...</Text>
    </View>
  );

  if (phase === 'result')       return <ResultScreen roomData={roomData} myUid={myUid} onLeave={leaveRoom} />;
  if (phase === 'game')         return <GameScreen roomData={roomData} myUid={myUid} onAction={handleAction} onEndTurn={endTurn} onLeave={leaveRoom} />;
  if (phase === 'lobby_friends') return (
    <FriendsLobby
      roomData={roomData} roomId={roomId} myUid={myUid} isHost={isHost}
      onLeave={leaveRoom} onSearch={searchFriend} onInvite={inviteFriend}
      friendSearch={friendSearch} friendResults={friendResults} searching={searching}
      onStartGame={() => updateDoc(doc(db, 'codenames_rooms', roomId), {
        phase: 'game', board: generateBoard(),
        currentTeam: 'team1', currentClue: null, currentClueNum: 0, guessesLeft: 0, winner: null, winReason: null,
      })}
      onJoinTeam={joinTeam}
      onBecomeSpymaster={becomeSpymaster}
      onResignSpymaster={resignSpymaster}
    />
  );
  if (phase === 'lobby_random') return <RandomLobby roomData={roomData} myUid={myUid} onLeave={leaveRoom} />;

  return (
    <MenuScreen
      onBack={onBack} tokens={tokens} fadeAnim={fadeAnim}
      onCreatePrivate={createPrivateRoom} onCreateRandom={createOrJoinRandom} onJoin={joinByCode}
      randomCount={randomCount} setRandomCount={setRandomCount}
    />
  );
}

// ══════════════════════════════════════════════════════════════
// الستايلات
// ══════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#06061a', paddingTop: 52 },
  centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  centerFull:    { flex: 1, backgroundColor: '#06061a', alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingTxt:    { color: '#9090b0', fontSize: 14 },

  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 14 },
  backBtn:       { width: 40, height: 40, borderRadius: 12, backgroundColor: '#0f0f2e', borderWidth: 1, borderColor: '#10b98130', alignItems: 'center', justifyContent: 'center' },
  backText:      { color: '#10b981', fontSize: 20, fontWeight: '700' },
  headerCenter:  { alignItems: 'center', gap: 2 },
  headerEmoji:   { fontSize: 22 },
  headerTitle:   { color: '#10b981', fontSize: 16, fontWeight: '900' },
  tokenBadge:    { backgroundColor: '#f5c51818', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: '#f5c51840' },
  tokenText:     { color: '#f5c518', fontSize: 13, fontWeight: '700' },

  menuScroll:    { paddingHorizontal: 20, paddingTop: 4 },
  heroCard:      { backgroundColor: '#0f0f2e', borderRadius: 20, borderWidth: 1, borderColor: '#10b98128', padding: 20, alignItems: 'center', gap: 8, marginBottom: 16 },
  heroEmoji:     { fontSize: 44 },
  heroTitle:     { color: '#e0e0ff', fontSize: 20, fontWeight: '900' },
  heroSub:       { color: '#5a5a80', fontSize: 13, textAlign: 'center', lineHeight: 20 },
  rulesBtn:      { backgroundColor: '#10b98118', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#10b98138', marginTop: 4 },
  rulesBtnText:  { color: '#10b981', fontSize: 13, fontWeight: '700' },

  modeCard:       { backgroundColor: '#0f0f2e', borderRadius: 20, borderWidth: 1.5, padding: 16, gap: 12, marginBottom: 16 },
  modeCardGreen:  { borderColor: '#10b98138' },
  modeCardBlue:   { borderColor: '#3b82f638' },
  modeCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  modeCardEmoji:  { fontSize: 30 },
  modeCardInfo:   { flex: 1 },
  modeCardTitle:  { fontSize: 15, fontWeight: '800' },
  modeCardDesc:   { color: '#5a5a80', fontSize: 12, marginTop: 2 },
  costBadge:      { backgroundColor: '#f5c51818', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#f5c51838' },
  costText:       { color: '#f5c518', fontSize: 12, fontWeight: '700' },
  featuresList:   { gap: 4 },
  featureItem:    { color: '#9090b0', fontSize: 12 },
  actionBtn:      { borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  actionBtnText:  { color: '#fff', fontSize: 15, fontWeight: '900' },
  joinLink:       { alignItems: 'center', paddingVertical: 2 },
  joinLinkText:   { color: '#10b981', fontSize: 13, fontWeight: '600' },
  joinRow:        { flexDirection: 'row', gap: 8 },
  joinInput:      { flex: 1, backgroundColor: '#06061a', borderRadius: 12, borderWidth: 1.5, borderColor: '#10b98138', color: '#e0e0ff', paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, letterSpacing: 3 },
  joinBtn:        { backgroundColor: '#10b981', borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center' },
  joinBtnText:    { color: '#fff', fontWeight: '900', fontSize: 14 },
  countLabel:     { color: '#5a5a80', fontSize: 12, fontWeight: '600' },
  countRow:       { flexDirection: 'row', gap: 10 },
  countBtn:       { flex: 1, backgroundColor: '#06061a', borderRadius: 14, borderWidth: 1.5, borderColor: '#ffffff10', paddingVertical: 10, alignItems: 'center' },
  countBtnActive: { borderColor: '#3b82f6', backgroundColor: '#3b82f614' },
  countBtnNum:    { color: '#9090b0', fontSize: 20, fontWeight: '900' },
  countBtnNumActive: { color: '#3b82f6' },
  countBtnLbl:    { color: '#3a3a60', fontSize: 10 },

  modalOverlay:   { flex: 1, backgroundColor: '#000000cc', justifyContent: 'flex-end' },
  rulesModal:     { backgroundColor: '#0f0f2e', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: '85%', gap: 10 },
  rulesModalTitle:{ color: '#e0e0ff', fontSize: 18, fontWeight: '900', textAlign: 'center' },
  ruleRow:        { gap: 3, marginBottom: 10 },
  ruleRowTitle:   { color: '#10b981', fontSize: 14, fontWeight: '800' },
  ruleRowBody:    { color: '#9090b0', fontSize: 13, lineHeight: 20 },
  legendGrid:     { gap: 8, marginTop: 8 },
  legendItem:     { borderRadius: 10, borderWidth: 1, padding: 10 },
  legendItemText: { fontSize: 12, fontWeight: '600' },
  rulesCloseBtn:  { backgroundColor: '#10b981', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  rulesCloseBtnText: { color: '#fff', fontSize: 15, fontWeight: '900' },

  lobbyScroll:    { paddingHorizontal: 20, paddingTop: 4 },
  codeBox:        { backgroundColor: '#0f0f2e', borderRadius: 18, borderWidth: 1.5, borderColor: '#10b98138', padding: 20, alignItems: 'center', gap: 6, marginBottom: 14 },
  codeLabel:      { color: '#5a5a80', fontSize: 12 },
  codeValue:      { color: '#10b981', fontSize: 34, fontWeight: '900', letterSpacing: 6 },
  codeHint:       { color: '#3a3a60', fontSize: 11 },

  teamsRow:       { flexDirection: 'row', gap: 10, marginBottom: 12 },
  teamCol:        { flex: 1, backgroundColor: '#0f0f2e', borderRadius: 16, borderWidth: 1.5, padding: 12, gap: 6 },
  teamColTitle:   { fontSize: 14, fontWeight: '800', textAlign: 'center' },
  teamColSub:     { color: '#3a3a60', fontSize: 10, textAlign: 'center' },
  playerChip:     { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ffffff08', borderRadius: 8, paddingVertical: 5, paddingHorizontal: 7 },
  playerChipName: { color: '#e0e0ff', fontSize: 11, flex: 1, textAlign: 'right' },
  meTag:          { backgroundColor: '#10b98120', borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
  meTagText:      { color: '#10b981', fontSize: 9, fontWeight: '700' },
  joinTeamBtn:    { borderWidth: 1.5, borderRadius: 10, paddingVertical: 7, alignItems: 'center', marginTop: 2 },
  joinTeamBtnText:{ fontSize: 12, fontWeight: '700' },

  myActionsBox:   { backgroundColor: '#0f0f2e', borderRadius: 14, borderWidth: 1, borderColor: '#ffffff10', padding: 12, gap: 8, marginBottom: 10 },
  myActionsLbl:   { color: '#9090b0', fontSize: 12, fontWeight: '700', textAlign: 'center' },
  spyBtn:         { backgroundColor: '#f5c51818', borderWidth: 1.5, borderColor: '#f5c51838', borderRadius: 12, paddingVertical: 11, alignItems: 'center' },
  spyBtnText:     { color: '#f5c518', fontSize: 13, fontWeight: '700' },
  isSpyRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f5c51812', borderRadius: 10, padding: 10 },
  isSpyText:      { color: '#f5c518', fontSize: 12, fontWeight: '700' },
  resignText:     { color: '#5a5a80', fontSize: 11, textDecorationLine: 'underline' },

  inviteBox:      { backgroundColor: '#0f0f2e', borderRadius: 14, borderWidth: 1, borderColor: '#ffffff0e', padding: 12, gap: 8, marginBottom: 10 },
  inviteTitle:    { color: '#9090b0', fontSize: 13, fontWeight: '700' },
  searchInput:    { backgroundColor: '#06061a', borderRadius: 10, borderWidth: 1, borderColor: '#ffffff12', color: '#e0e0ff', paddingHorizontal: 12, paddingVertical: 9, fontSize: 14 },
  friendRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 9, backgroundColor: '#ffffff08', borderRadius: 10 },
  friendName:     { color: '#e0e0ff', fontSize: 13 },
  friendInvite:   { color: '#10b981', fontSize: 12, fontWeight: '700' },

  condBox:        { gap: 5, marginBottom: 12 },
  condItem:       { fontSize: 12, textAlign: 'right' },
  condOk:         { color: '#10b981' },
  condBad:        { color: '#ef4444' },
  startBtn:       { backgroundColor: '#10b981', borderRadius: 16, paddingVertical: 15, alignItems: 'center', marginBottom: 8 },
  startBtnOff:    { backgroundColor: '#1a3a2a', opacity: 0.6 },
  startBtnText:   { color: '#fff', fontSize: 16, fontWeight: '900' },
  waitingHost:    { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center', padding: 14 },
  waitingHostText:{ color: '#5a5a80', fontSize: 13 },

  randomBody:     { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 6 },
  randomCountRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 12 },
  randomCountNum: { color: '#e0e0ff', fontSize: 34, fontWeight: '900' },
  randomCountSep: { color: '#3a3a60', fontSize: 24 },
  randomCountLabel:{ color: '#5a5a80', fontSize: 14, marginBottom: 18 },
  randomList:     { width: '100%', gap: 8 },
  randomChip:     { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#0f0f2e', borderRadius: 12, borderWidth: 1, borderColor: '#ffffff0e', padding: 11 },
  randomChipMe:   { borderColor: '#10b98148', backgroundColor: '#10b98110' },
  randomChipNum:  { color: '#3a3a60', fontSize: 12, fontWeight: '700', width: 18 },
  randomChipName: { color: '#e0e0ff', fontSize: 13, flex: 1 },
  randomEmpty:    { backgroundColor: '#0f0f2e', borderRadius: 12, borderWidth: 1, borderColor: '#ffffff06', borderStyle: 'dashed', padding: 11, alignItems: 'center' },
  randomEmptyText:{ color: '#2a2a50', fontSize: 12 },
  randomHint:     { color: '#3a3a60', fontSize: 11, textAlign: 'center', marginTop: 14 },

  spyBanner:      { marginHorizontal: 16, borderRadius: 14, borderWidth: 1.5, padding: 12, alignItems: 'center', gap: 4, marginBottom: 8 },
  spyBannerTitle: { fontSize: 17, fontWeight: '900' },
  spyBannerSub:   { color: '#9090b0', fontSize: 12 },
  spyBoardHint:   { color: '#3a3a60', fontSize: 11, textAlign: 'center', marginBottom: 6 },
  spyGrid:        { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 4, paddingHorizontal: 12, marginBottom: 10 },
  spyCell:        { width: '18.5%', aspectRatio: 1.4, borderRadius: 7, alignItems: 'center', justifyContent: 'center', padding: 3 },
  spyCellTxt:     { color: '#fff', fontSize: 9, fontWeight: '700', textAlign: 'center' },
  killerIcon:     { fontSize: 10, position: 'absolute', top: 2 },

  clueBox:        { marginHorizontal: 14, backgroundColor: '#0f0f2e', borderRadius: 18, borderWidth: 1.5, padding: 14, gap: 10 },
  clueBoxTitle:   { fontSize: 15, fontWeight: '800', textAlign: 'right' },
  clueBoxHint:    { color: '#3a3a60', fontSize: 11, textAlign: 'right' },
  clueInputRow:   { flexDirection: 'row', gap: 10, alignItems: 'center' },
  clueWordInput:  { flex: 1, backgroundColor: '#06061a', borderRadius: 12, borderWidth: 1.5, color: '#e0e0ff', paddingHorizontal: 14, paddingVertical: 11, fontSize: 15 },
  numCtrl:        { alignItems: 'center', gap: 2 },
  numArrow:       { width: 30, height: 22, borderRadius: 7, backgroundColor: '#1a1a3e', alignItems: 'center', justifyContent: 'center' },
  numArrowTxt:    { color: '#9090b0', fontSize: 11 },
  numVal:         { fontSize: 24, fontWeight: '900', minWidth: 30, textAlign: 'center' },
  submitBtn:      { borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  submitBtnTxt:   { color: '#fff', fontSize: 14, fontWeight: '900' },
  disabledBtn:    { opacity: 0.35 },

  gameTopBar:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, marginBottom: 8 },
  turnBadge:      { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5 },
  turnBadgeText:  { fontSize: 13, fontWeight: '800' },
  remRow:         { flexDirection: 'row', alignItems: 'center', gap: 4 },
  remNum:         { fontSize: 18, fontWeight: '900' },
  remSep:         { color: '#3a3a60', fontSize: 14 },

  clueBar:        { marginHorizontal: 12, borderRadius: 14, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 9, gap: 8, marginBottom: 8 },
  clueBarLbl:     { color: '#5a5a80', fontSize: 11, fontWeight: '700' },
  clueBarWord:    { fontSize: 16, fontWeight: '900', flex: 1, textAlign: 'right' },
  clueBarNum:     { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  clueBarNumTxt:  { color: '#fff', fontSize: 12, fontWeight: '900' },
  clueBarDiv:     { width: 1, height: 18, backgroundColor: '#ffffff14' },
  guessLbl:       { color: '#5a5a80', fontSize: 11 },
  guessBadge:     { width: 28, height: 28, borderRadius: 8, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  guessNum:       { fontSize: 14, fontWeight: '900' },

  gameGrid:       { flex: 1, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 5, paddingHorizontal: 10, alignContent: 'center' },
  gameCard:       { width: '18.5%', aspectRatio: 0.85, borderRadius: 10, alignItems: 'center', justifyContent: 'center', padding: 4, borderWidth: 1.5 },
  gameCardTxt:    { color: '#e0e0ff', fontSize: 11, fontWeight: '700', textAlign: 'center' },

  gameFooter:     { paddingHorizontal: 16, paddingBottom: 14, paddingTop: 6 },
  endTurnBtn:     { borderRadius: 14, borderWidth: 1.5, paddingVertical: 13, alignItems: 'center', backgroundColor: '#0f0f2e' },
  endTurnTxt:     { fontSize: 15, fontWeight: '800' },
  waitBox:        { backgroundColor: '#0f0f2e', borderRadius: 14, paddingVertical: 13, alignItems: 'center', borderWidth: 1, borderColor: '#ffffff0e' },
  waitTxt:        { color: '#5a5a80', fontSize: 13 },

  winEmoji:       { fontSize: 80, marginBottom: 16 },
  winTitle:       { fontSize: 26, fontWeight: '900', marginBottom: 8 },
  winReason:      { color: '#9090b0', fontSize: 14, textAlign: 'center', marginBottom: 24 },
  resultTeamsRow: { flexDirection: 'row', gap: 12, width: '100%', marginBottom: 24 },
  resultTeamBox:  { flex: 1, borderRadius: 16, borderWidth: 1.5, padding: 14, gap: 6 },
  resultTeamTitle:{ fontSize: 14, fontWeight: '800', textAlign: 'center' },
  resultTeamPlayer:{ color: '#9090b0', fontSize: 12, textAlign: 'center' },
  leaveBtn:       { backgroundColor: '#0f0f2e', borderRadius: 14, borderWidth: 1, borderColor: '#ffffff12', paddingVertical: 12, paddingHorizontal: 36, alignItems: 'center' },
  leaveBtnTxt:    { color: '#9090b0', fontSize: 14, fontWeight: '700' },
});
