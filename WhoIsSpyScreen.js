/**
 * WhoIsSpyScreen.js — من الكاذب؟
 * ══════════════════════════════════════════════════════════
 *  نمط 1: جلسة — كل اللاعبين بنفس الجهاز
 *    • كل لاعب يضغط ليرى كلمته بشكل خاص
 *    • تصويت بالتناوب لاعب واحد في كل مرة
 *    • 3 جولات — مجموع النقاط يحدد الفائز
 *
 *  نمط 2: روم أونلاين
 *    • المنشئ يختار الفئة قبل كل جولة
 *    • كل اللاعبين يرون كلمتهم بنفس الوقت على أجهزتهم
 *    • التعليمات تظهر لجميع الأجهزة
 *    • تصويت مزامن — الجميع يصوت في نفس الوقت
 *
 *  نقاط:
 *    • التصويت الصحيح على الكاذب:   2 نقطة
 *    • الكاذب لم يُكتشف (أغلبية):   3 نقاط
 *    • الكاذب يخمّن الكلمة صح:      1 نقطة إضافية
 *
 *  تكلفة: قلب واحد عند إنشاء/الانضمام للروم
 * ══════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, ScrollView, TextInput, Alert,
  Animated, KeyboardAvoidingView, Platform,
  Modal, Pressable, ActivityIndicator,
} from 'react-native';
import { useTheme } from './ThemeContext';
import ExitButton from './ExitButton';
import { WebScreenButton, GameInfoButton } from './WebRoomService';
import { spendHeart } from './HeartsService';
import { db } from './firebaseConfig';
import { playSound } from './SoundService';
import { ThemedButton, ThemedCard, ThemedPill, ThemedRow } from './ThemedComponents';
import {
  doc, setDoc, updateDoc, onSnapshot, getDoc, deleteDoc,
} from 'firebase/firestore';

// ══════════════════════════════════════════════════════════
//  قاعدة بيانات الكلمات (فئة → كلمة مشتركة + كلمة قريبة للكاذب)
// ══════════════════════════════════════════════════════════
const CATEGORIES = [
  {
    id: 'animals',   label: '🐾 حيوانات',
    words: [
      { common: 'أسد',      fake: 'نمر' },
      { common: 'فيل',      fake: 'وحيد القرن' },
      { common: 'دلفين',    fake: 'حوت' },
      { common: 'زرافة',    fake: 'جمل' },
      { common: 'ببغاء',    fake: 'طاووس' },
      { common: 'ذئب',      fake: 'ثعلب' },
      { common: 'دب قطبي',  fake: 'دب بني' },
      { common: 'قرش',      fake: 'سمكة مارلين' },
      { common: 'غوريلا',   fake: 'شمبانزي' },
      { common: 'كنغر',     fake: 'كوالا' },
      { common: 'تمساح',    fake: 'سحلية' },
      { common: 'أخطبوط',   fake: 'حبّار' },
      { common: 'نعامة',    fake: 'طائر الرهو' },
      { common: 'فهد',      fake: 'أبو هريرة الكبير' },
      { common: 'حصان',     fake: 'حمار وحشي' },
    ],
  },
  {
    id: 'food',      label: '🍕 أكل',
    words: [
      { common: 'بيتزا',      fake: 'مانقيش' },
      { common: 'سوشي',       fake: 'ساشيمي' },
      { common: 'برجر',       fake: 'ساندويش' },
      { common: 'شاورما',     fake: 'كباب' },
      { common: 'باستا',      fake: 'معكرونة بولونيز' },
      { common: 'تشيز كيك',   fake: 'تيراميسو' },
      { common: 'كبسة',       fake: 'مندي' },
      { common: 'فلافل',      fake: 'طعمية' },
      { common: 'حمص',        fake: 'فتوش' },
      { common: 'لحم بالعجين',fake: 'بيتزا عربية' },
      { common: 'مسخن',       fake: 'فتة دجاج' },
      { common: 'ذيابة',      fake: 'باجية' },
      { common: 'محلبية',     fake: 'أرز بالحليب' },
      { common: 'كنافة',      fake: 'بسبوسة' },
      { common: 'قطايف',      fake: 'كليجة' },
    ],
  },
  {
    id: 'sports',    label: '⚽ رياضة',
    words: [
      { common: 'كرة القدم',     fake: 'الرجبي' },
      { common: 'السباحة',       fake: 'الغوص' },
      { common: 'التنس',         fake: 'بادمنتون' },
      { common: 'كرة السلة',     fake: 'كرة اليد' },
      { common: 'الملاكمة',      fake: 'فنون قتالية مختلطة' },
      { common: 'الجودو',        fake: 'الكاراتيه' },
      { common: 'الغولف',        fake: 'الكريكيت' },
      { common: 'سباق السيارات', fake: 'سباق الدراجات النارية' },
      { common: 'الفروسية',      fake: 'سباق الجمال' },
      { common: 'الجمباز',       fake: 'الأكروبات' },
      { common: 'رمي الرمح',     fake: 'رمي القرص' },
      { common: 'القفز بالزانة', fake: 'القفز الطويل' },
      { common: 'التجديف',       fake: 'الكايالك' },
      { common: 'الهوكي',        fake: 'الكيرلنج' },
      { common: 'الرماية',       fake: 'القنص' },
    ],
  },
  {
    id: 'places',    label: '🗺️ أماكن',
    words: [
      { common: 'برج إيفل',          fake: 'برج بيزا' },
      { common: 'الأهرامات',          fake: 'أبو سمبل' },
      { common: 'تاج محل',            fake: 'قلعة الحمراء' },
      { common: 'برج خليفة',          fake: 'برج الفاروق' },
      { common: 'الكعبة المشرفة',     fake: 'المسجد النبوي' },
      { common: 'الكولوسيوم',         fake: 'البانثيون' },
      { common: 'ماتشو بيتشو',        fake: 'الأزتيك' },
      { common: 'شلالات نياغارا',     fake: 'شلالات فيكتوريا' },
      { common: 'جبل إيفرست',         fake: 'جبل كيليمنجارو' },
      { common: 'الصحراء الكبرى',     fake: 'صحراء غوبي' },
      { common: 'نهر النيل',           fake: 'نهر الأمازون' },
      { common: 'البحر الميت',        fake: 'بحيرة التبت' },
      { common: 'مدينة البتراء',      fake: 'تدمر' },
      { common: 'سور الصين',          fake: 'قلعة باغراس' },
      { common: 'تمثال الحرية',       fake: 'تمثال المسيح الفادي' },
    ],
  },
  {
    id: 'jobs',      label: '💼 مهن',
    words: [
      { common: 'طيار',         fake: 'مضيف طيران' },
      { common: 'جراح',         fake: 'طبيب طوارئ' },
      { common: 'محامٍ',        fake: 'قاضٍ' },
      { common: 'معمار',        fake: 'مصمم داخلي' },
      { common: 'مبرمج',        fake: 'محلل بيانات' },
      { common: 'صحفي',         fake: 'مذيع' },
      { common: 'شيف',          fake: 'خباز' },
      { common: 'ممثل',         fake: 'مخرج' },
      { common: 'موسيقار',      fake: 'ملحن' },
      { common: 'رجل إطفاء',   fake: 'شرطي' },
      { common: 'بيطري',        fake: 'طبيب نفسي' },
      { common: 'فلكي',         fake: 'فيزيائي' },
      { common: 'دبلوماسي',     fake: 'سفير' },
      { common: 'رياضي محترف',  fake: 'مدرب رياضي' },
      { common: 'مصمم أزياء',   fake: 'مصور أزياء' },
    ],
  },
  {
    id: 'movies',    label: '🎬 أفلام',
    words: [
      { common: 'تيتانيك',         fake: 'كاسبلانكا' },
      { common: 'الأسد الملك',     fake: 'الكتاب الغابة' },
      { common: 'هاري بوتر',       fake: 'السيد الخواتم' },
      { common: 'أفاتار',          fake: 'إنترستيلار' },
      { common: 'ذا ماتريكس',      fake: 'إنسبشن' },
      { common: 'جوراسيك بارك',    fake: 'ذا لوست وورلد' },
      { common: 'ستار وورز',       fake: 'ستار تريك' },
      { common: 'باتمان',          fake: 'سبايدر مان' },
      { common: 'ذا أفنجرز',      fake: 'جاستس ليغ' },
      { common: 'فروزن',           fake: 'تانغلد' },
      { common: 'شريك',            fake: 'كارز' },
      { common: 'إنسايد آوت',      fake: 'كوكو' },
      { common: 'وول-إي',          fake: 'آبولو' },
      { common: 'الجوكر',          fake: 'مستر فريدم' },
      { common: 'باراسايت',        fake: 'درايف ماي كار' },
    ],
  },
  {
    id: 'tech',      label: '💻 تقنية',
    words: [
      { common: 'آيفون',        fake: 'سامسونغ S' },
      { common: 'يوتيوب',       fake: 'تيك توك' },
      { common: 'تويتر/X',      fake: 'ثريدز' },
      { common: 'تيسلا',        fake: 'ريفيان' },
      { common: 'بلايستيشن',    fake: 'إكس بوكس' },
      { common: 'نتفليكس',      fake: 'ديزني بلس' },
      { common: 'جوجل',         fake: 'مايكروسوفت' },
      { common: 'تشات جي بي تي',fake: 'كلود' },
      { common: 'ميتا',         fake: 'سناب شات' },
      { common: 'أمازون',       fake: 'علي بابا' },
      { common: 'ماك بوك',      fake: 'سيرفس برو' },
      { common: 'إيرباد',       fake: 'سوني WH' },
      { common: 'درون',         fake: 'روبوت طائر' },
      { common: 'ميتافيرس',     fake: 'الواقع المعزز' },
      { common: 'بلوتوث',       fake: 'واي فاي 7' },
    ],
  },
  {
    id: 'nature',    label: '🌿 طبيعة',
    words: [
      { common: 'بركان',       fake: 'فوهة نيزك' },
      { common: 'زلزال',       fake: 'تسونامي' },
      { common: 'قوس قزح',     fake: 'هالة شمسية' },
      { common: 'شفق قطبي',    fake: 'عاصفة مغناطيسية' },
      { common: 'كسوف الشمس',  fake: 'خسوف القمر' },
      { common: 'إعصار',       fake: 'عاصفة رعدية' },
      { common: 'صاعقة',       fake: 'عاصفة رملية' },
      { common: 'بحيرة فوهة',  fake: 'بحيرة ملحية' },
      { common: 'شلال',        fake: 'نبع مائي' },
      { common: 'كهف',         fake: 'مغارة جليدية' },
      { common: 'صحراء',       fake: 'أرض جرداء' },
      { common: 'جليد',        fake: 'ثلج' },
      { common: 'مرجان',       fake: 'طحلب بحري' },
      { common: 'أمازون',      fake: 'غابة بورنيو' },
      { common: 'ضباب',        fake: 'سحاب منخفض' },
    ],
  },
  {
    id: 'music',     label: '🎵 موسيقى',
    words: [
      { common: 'بيانو',         fake: 'أورغ' },
      { common: 'غيتار',         fake: 'عود' },
      { common: 'طبلة',          fake: 'دف' },
      { common: 'كمان',          fake: 'فيولا' },
      { common: 'ناي',           fake: 'مزمار' },
      { common: 'باس غيتار',     fake: 'سيلو' },
      { common: 'أوبرا',         fake: 'موسيقى تصويرية' },
      { common: 'راب',           fake: 'آر أند بي' },
      { common: 'جاز',           fake: 'بلوز' },
      { common: 'ميتال',         fake: 'روك' },
      { common: 'موسيقى شعبية',  fake: 'موسيقى تراثية' },
      { common: 'ديسكو',         fake: 'فانك' },
      { common: 'سمفونية',       fake: 'كونشرتو' },
      { common: 'كورال',         fake: 'فرقة موسيقية' },
      { common: 'مهرجانات',      fake: 'مهبط' },
    ],
  },
  {
    id: 'history',   label: '🏛️ تاريخ',
    words: [
      { common: 'ألكسندر الأكبر', fake: 'يوليوس قيصر' },
      { common: 'كليوباترا',      fake: 'نفرتيتي' },
      { common: 'جنكيز خان',      fake: 'تيمورلنك' },
      { common: 'نابليون',        fake: 'لويس الرابع عشر' },
      { common: 'صلاح الدين',     fake: 'خالد بن الوليد' },
      { common: 'هارون الرشيد',   fake: 'المأمون' },
      { common: 'أتاتورك',        fake: 'سليمان القانوني' },
      { common: 'لينكولن',        fake: 'جورج واشنطن' },
      { common: 'هيتلر',          fake: 'موسوليني' },
      { common: 'تشرشل',          fake: 'روزفلت' },
      { common: 'ماو تسي تونغ',   fake: 'هو شي منه' },
      { common: 'غاندي',          fake: 'مانديلا' },
      { common: 'ماركو بولو',     fake: 'ابن بطوطة' },
      { common: 'كولومبس',        fake: 'ماجلان' },
      { common: 'رمسيس الثاني',   fake: 'تحتمس الثالث' },
    ],
  },
  {
    id: 'brands',    label: '🛍️ براندات',
    words: [
      { common: 'نايك',       fake: 'أديداس' },
      { common: 'آبل',        fake: 'سامسونغ' },
      { common: 'مرسيدس',     fake: 'BMW' },
      { common: 'لويس فيتون', fake: 'غوتشي' },
      { common: 'ماكدونالدز', fake: 'بيرغر كينغ' },
      { common: 'ستاربكس',    fake: 'كوستا' },
      { common: 'أيكيا',      fake: 'هوم سنتر' },
      { common: 'زارا',       fake: 'مانغو' },
      { common: 'شانيل',      fake: 'ديور' },
      { common: 'رولكس',      fake: 'أوميغا' },
      { common: 'لامبورغيني', fake: 'فيراري' },
      { common: 'بيرغرز',     fake: 'وندي' },
      { common: 'بلاي ستيشن', fake: 'نينتندو' },
      { common: 'ريد بول',    fake: 'مونستر' },
      { common: 'ليغو',       fake: 'بلايموبيل' },
    ],
  },
  {
    id: 'body',      label: '🧠 جسم الإنسان',
    words: [
      { common: 'القلب',        fake: 'الكبد' },
      { common: 'الدماغ',       fake: 'النخاع الشوكي' },
      { common: 'الرئة',        fake: 'الحجاب الحاجز' },
      { common: 'الكلية',       fake: 'البنكرياس' },
      { common: 'العين',        fake: 'الأذن الداخلية' },
      { common: 'الأسنان',      fake: 'اللسان' },
      { common: 'الأظافر',      fake: 'الشعر' },
      { common: 'الجلد',        fake: 'الغضروف' },
      { common: 'الوريد',       fake: 'الشريان' },
      { common: 'الهرمون',      fake: 'الإنزيم' },
      { common: 'الخلية',       fake: 'الجزيء' },
      { common: 'الصفيحة',      fake: 'كريات حمراء' },
      { common: 'الذاكرة',      fake: 'المخيخ' },
      { common: 'الغدة الدرقية',fake: 'الغدة الكظرية' },
      { common: 'العمود الفقري',fake: 'القص' },
    ],
  },
  {
    id: 'colors',    label: '🎨 ألوان وفنون',
    words: [
      { common: 'الموناليزا',    fake: 'فتاة بقرط لؤلؤ' },
      { common: 'دافنشي',        fake: 'ميكيلانجيلو' },
      { common: 'فان غوخ',       fake: 'بول غوغان' },
      { common: 'بيكاسو',        fake: 'سالفادور دالي' },
      { common: 'الأزرق الكوبالت',fake: 'اللازوردي' },
      { common: 'التشابك اللوني', fake: 'التدرج اللوني' },
      { common: 'التجريد',        fake: 'الانطباعية' },
      { common: 'النحت',          fake: 'الفخار' },
      { common: 'الخط العربي',    fake: 'الزخرفة الإسلامية' },
      { common: 'الأكواريل',      fake: 'الغواش' },
      { common: 'جدارية',         fake: 'لوحة زيتية' },
      { common: 'تصوير ضوئي',    fake: 'رسم رقمي' },
      { common: 'أورغامي',        fake: 'كيريغامي' },
      { common: 'موزاييك',        fake: 'زجاج ملون' },
      { common: 'الرسم الكاريكاتيري', fake: 'الرسم الساخر' },
    ],
  },
  {
    id: 'transport', label: '🚗 مواصلات',
    words: [
      { common: 'طائرة مروحية', fake: 'طائرة نفاثة' },
      { common: 'سفينة بخارية', fake: 'ناقلة نفط' },
      { common: 'قطار سريع',    fake: 'مترو أنفاق' },
      { common: 'دراجة هوائية', fake: 'سكوتر كهربائي' },
      { common: 'غواصة',        fake: 'زورق' },
      { common: 'مركبة فضائية', fake: 'قمر صناعي' },
      { common: 'تاكسي طائر',   fake: 'طائرة شراعية' },
      { common: 'حافلة',        fake: 'ترام' },
      { common: 'شاحنة نقل',    fake: 'شاحنة صهريج' },
      { common: 'دباب',         fake: 'جرار' },
      { common: 'مركبة هجينة',  fake: 'سيارة هيدروجينية' },
      { common: 'قارب شراعي',   fake: 'قارب بخاري' },
      { common: 'منطاد',        fake: 'طائرة بالون' },
      { common: 'توك توك',      fake: 'دراجة بثلاث عجلات' },
      { common: 'قطار بضائع',   fake: 'قطار ركاب' },
    ],
  },
  {
    id: 'hobbies',   label: '🎯 هوايات',
    words: [
      { common: 'الطبخ',           fake: 'صناعة الحلوى' },
      { common: 'الرسم',           fake: 'النحت' },
      { common: 'تسلق الجبال',     fake: 'المشي في الجبال' },
      { common: 'الصيد',           fake: 'الغوص' },
      { common: 'الشطرنج',         fake: 'الداما' },
      { common: 'كرة الطاولة',     fake: 'البادمنتون' },
      { common: 'القراءة',         fake: 'الاستماع للبودكاست' },
      { common: 'التصوير',         fake: 'التصوير بالدرون' },
      { common: 'ألعاب الفيديو',   fake: 'ألعاب الطاولة' },
      { common: 'البرمجة',         fake: 'تصميم المواقع' },
      { common: 'العزف',           fake: 'الغناء' },
      { common: 'الكتابة الإبداعية',fake: 'كتابة الشعر' },
      { common: 'الحياكة',         fake: 'صنع المجوهرات' },
      { common: 'جمع الطوابع',     fake: 'جمع العملات' },
      { common: 'الرقص',           fake: 'اليوغا' },
    ],
  },
];

// ══════════════════════════════════════════════════════════
//  ثوابت اللعبة
// ══════════════════════════════════════════════════════════
const TOTAL_ROUNDS    = 3;
const VOTE_TIME       = 60;   // ثانية
const POINTS_VOTE_OK  = 2;    // لاعب يصوت صح
const POINTS_LIAR_SAFE = 3;   // الكاذب لا يُكتشف
const POINTS_LIAR_GUESS = 1;  // الكاذب يخمن الكلمة صح

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickWord(categoryId) {
  const cat = CATEGORIES.find(c => c.id === categoryId);
  if (!cat) return { common: '—', fake: '—' };
  return cat.words[Math.floor(Math.random() * cat.words.length)];
}

function genRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// ══════════════════════════════════════════════════════════
//  أنيميشن fade بسيط
// ══════════════════════════════════════════════════════════
function useFadeIn() {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 380, useNativeDriver: true }).start();
  }, []);
  return anim;
}

// لون الأكسنت للعبة: برتقالي-أحمر
const ACCENT   = '#f97316';
const ACCENT_S = '#f9731620';
const ACCENT_B = '#f9731640';

// ══════════════════════════════════════════════════════════
//  الشاشة الرئيسية للعبة
// ══════════════════════════════════════════════════════════
export default function WhoIsSpyScreen({ onBack, currentUser, onHeartSpent }) {
  const { theme, themeId } = useTheme();
  // phase: 'menu' | 'local_setup' | 'local_play' | 'online_lobby'
  const [phase, setPhase] = useState('menu');

  // ── بيانات مشتركة ──
  const [players,   setPlayers]   = useState([]);
  const [scores,    setScores]    = useState({});
  const [round,     setRound]     = useState(1);

  const fade = useFadeIn();

  // ── شاشة القائمة ──────────────────────────────────────
  if (phase === 'menu') {
    return (
      <Animated.View style={[s.flex, { backgroundColor: 'transparent', opacity: fade }]}>
        <StatusBar barStyle={theme.statusBar} />
        {/* خلفية زخرفية */}
        <View style={s.bgDeco} pointerEvents="none">
          <Text style={[s.bgDecoText, { color: ACCENT }]}>🕵️</Text>
        </View>

        <SafeHeader>
          <ThemedButton onPress={onBack} label="→" variant="ghost" size="small" style={s.backBtn} />
          <GameInfoButton gameType="who_lying" lang="ar" style={[s.headerIcon, { backgroundColor: theme.bgCard, borderColor: ACCENT_B }]} />
        </SafeHeader>

        <View style={s.menuCenter}>
          <Text style={s.menuEmoji}>🕵️</Text>
          <Text style={[s.menuTitle, { color: ACCENT }]}>من الكاذب؟</Text>
          <Text style={[s.menuSub, { color: theme.textMuted }]}>كلمة مشتركة — شخص واحد يكذب</Text>

          <View style={s.modeRow}>
            {/* جلسة */}
            <ThemedCard onPress={() => setPhase('local_setup')} style={s.modeCard} variant='accent'>
              <Text style={s.modeCardEmoji}>🏠</Text>
              <Text style={[s.modeCardTitle, { color: ACCENT }]}>جلسة</Text>
              <Text style={[s.modeCardDesc, { color: theme.textMuted }]}>نفس الجهاز{'\n'}بدون إنترنت</Text>
            </ThemedCard>

            {/* أونلاين */}
            <ThemedCard onPress={() => setPhase('online_lobby')} style={s.modeCard}>
              <Text style={s.modeCardEmoji}>🌐</Text>
              <Text style={[s.modeCardTitle, { color: theme.textPrimary }]}>روم</Text>
              <Text style={[s.modeCardDesc, { color: theme.textMuted }]}>كل شخص{'\n'}بجهازه</Text>
            </ThemedCard>
          </View>

          {/* نظام النقاط */}
          <View style={[s.rulesBox, { backgroundColor: theme.bgCard, borderColor: ACCENT_B }]}>
            <Text style={[s.rulesTitle, { color: ACCENT }]}>⚖️ نظام النقاط</Text>
            <ScoreRule icon="✅" text={`التصويت الصح على الكاذب = ${POINTS_VOTE_OK} نقاط`} theme={theme} />
            <ScoreRule icon="🤥" text={`الكاذب لا يُكتشف = ${POINTS_LIAR_SAFE} نقاط`} theme={theme} />
            <ScoreRule icon="🔍" text={`الكاذب يخمّن الكلمة صح = ${POINTS_LIAR_GUESS} نقطة إضافية`} theme={theme} />
          </View>
        </View>
      </Animated.View>
    );
  }

  if (phase === 'local_setup') {
    return (
      <LocalSetupPhase
        theme={theme}
        onBack={() => setPhase('menu')}
        onStart={(playerList, catId) => {
          const sc = {};
          playerList.forEach(p => { sc[p] = 0; });
          setPlayers(playerList);
          setScores(sc);
          setRound(1);
          setPhase({ type: 'local_play', catId });
        }}
      />
    );
  }

  if (phase?.type === 'local_play') {
    return (
      <LocalPlayPhase
        theme={theme}
        players={players}
        initialScores={scores}
        totalRounds={TOTAL_ROUNDS}
        initialCatId={phase.catId}
        onBack={() => setPhase('menu')}
      />
    );
  }

  if (phase === 'online_lobby') {
    return (
      <OnlineLobbyPhase
        theme={theme}
        currentUser={currentUser}
        onHeartSpent={onHeartSpent}
        onBack={() => setPhase('menu')}
      />
    );
  }

  return null;
}

// ══════════════════════════════════════════════════════════
//  مساعد عرض قاعدة النقاط
// ══════════════════════════════════════════════════════════
function ScoreRule({ icon, text, theme }) {
  return (
    <View style={s.ruleRow}>
      <Text style={s.ruleIcon}>{icon}</Text>
      <Text style={[s.ruleText, { color: theme.textSecondary }]}>{text}</Text>
    </View>
  );
}

function SafeHeader({ children }) {
  return <View style={s.safeHeader}>{children}</View>;
}

// ══════════════════════════════════════════════════════════
//  نمط 1 — إعداد الجلسة المحلية
// ══════════════════════════════════════════════════════════
function LocalSetupPhase({ theme, onBack, onStart }) {
  const [playerName, setPlayerName] = useState('');
  const [players,    setPlayers]    = useState([]);
  const [catId,      setCatId]      = useState(CATEGORIES[0].id);
  const fade = useFadeIn();

  const addPlayer = useCallback(() => {
    const name = playerName.trim();
    if (!name) return;
    if (players.length >= 12) return Alert.alert('', 'الحد الأقصى 12 لاعباً');
    if (players.includes(name)) return Alert.alert('', 'هذا الاسم مكرر');
    setPlayers(p => [...p, name]);
    setPlayerName('');
  }, [playerName, players]);

  const removePlayer = useCallback((i) => {
    setPlayers(p => p.filter((_, idx) => idx !== i));
  }, []);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[s.flex, { backgroundColor: 'transparent' }]}
    >
      <Animated.View style={{ flex: 1, opacity: fade }}>
        <StatusBar barStyle={theme.statusBar} />

        <SafeHeader>
          <ThemedButton onPress={onBack} label="→" variant="ghost" size="small" style={s.backBtn} />
          <Text style={[s.headerTitle, { color: ACCENT }]}>🏠 جلسة</Text>
          <View style={{ width: 40 }} />
        </SafeHeader>

        <ScrollView contentContainerStyle={s.setupContent} keyboardShouldPersistTaps="handled">

          {/* اختيار الفئة */}
          <Text style={[s.sectionLabel, { color: theme.textSecondary }]}>📂 الفئة</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 2 }}>
              {CATEGORIES.map(cat => (
                <ThemedCard
                  key={cat.id}
                  onPress={() => setCatId(cat.id)}
                  style={s.catChip}
                  variant={catId === cat.id ? 'accent' : 'default'}
                >
                  <Text style={[s.catChipText, { color: catId === cat.id ? ACCENT : theme.textMuted }]}>
                    {cat.label}
                  </Text>
                </ThemedCard>
              ))}
            </View>
          </ScrollView>

          {/* إضافة لاعبين */}
          <Text style={[s.sectionLabel, { color: theme.textSecondary }]}>
            👥 اللاعبون ({players.length} / 12 — لازم 3 على الأقل)
          </Text>
          <View style={s.inputRow}>
            <TextInput
              style={[s.input, { backgroundColor: theme.bgCard, borderColor: ACCENT_B, color: theme.textPrimary }]}
              placeholder="اسم اللاعب..."
              placeholderTextColor={theme.textMuted}
              value={playerName}
              onChangeText={setPlayerName}
              onSubmitEditing={addPlayer}
              returnKeyType="done"
            />
            <ThemedButton onPress={addPlayer} label='＋' variant='primary' size='small' style={s.addBtn} />
          </View>

          <View style={s.playersList}>
            {players.map((name, i) => (
              <View key={i} style={[s.playerChip, { backgroundColor: theme.bgCard, borderColor: ACCENT_B }]}>
                <Text style={[s.chipNum, { backgroundColor: ACCENT }]}>{i + 1}</Text>
                <Text style={[s.chipName, { color: theme.textPrimary }]}>{name}</Text>
                <TouchableOpacity onPress={() => removePlayer(i)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={{ color: '#ef444480', fontSize: 16 }}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {players.length >= 3 && (
              <ThemedButton onPress={() => onStart(players, catId)} label='ابدأ اللعبة ←' variant='primary' size='large' style={s.startBtn} />
          )}
        </ScrollView>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

// ══════════════════════════════════════════════════════════
//  نمط 1 — اللعب المحلي (3 جولات)
// ══════════════════════════════════════════════════════════
function LocalPlayPhase({ theme, players, initialScores, totalRounds, initialCatId, onBack }) {
  // phases: 'cat_pick' | 'word_reveal' | 'discuss' | 'vote_turn' | 'liar_guess' | 'round_result' | 'final'
  const [localPhase, setLocalPhase] = useState('word_reveal');
  const [round,      setRound]      = useState(1);
  const [scores,     setScores]     = useState(initialScores);
  const [catId,      setCatId]      = useState(initialCatId);

  // بيانات الجولة
  const [wordPair,   setWordPair]   = useState(() => pickWord(initialCatId));
  const [lyingIdx,   setLyingIdx]   = useState(() => Math.floor(Math.random() * players.length));
  const [revealIdx,  setRevealIdx]  = useState(0);    // أي لاعب يرى كلمته الآن
  const [revealed,   setRevealed]   = useState(false); // هل يرى الكلمة
  const [votes,      setVotes]      = useState({});    // { playerName: votedFor }
  const [voteIdx,    setVoteIdx]    = useState(0);     // دور التصويت
  const [voteTimer,  setVoteTimer]  = useState(VOTE_TIME);
  const [selectedVote, setSelVote]  = useState(null);
  const timerRef = useRef(null);

  // خيارات تخمين الكاذب للكلمة (4 اختيارات)
  const [guessOptions, setGuessOptions] = useState([]);
  const [lyingGuess,   setLyingGuess]   = useState(null);

  const lyingName = players[lyingIdx];

  // ── بناء خيارات تخمين الكاذب ────────────────────────
  const buildGuessOptions = useCallback((word, catId) => {
    const cat = CATEGORIES.find(c => c.id === catId);
    if (!cat) return [word];
    const others = cat.words
      .map(w => w.common)
      .filter(w => w !== word);
    const distractors = shuffle(others).slice(0, 3);
    return shuffle([word, ...distractors]);
  }, []);

  // ── مؤقت التصويت ────────────────────────────────────
  useEffect(() => {
    if (localPhase !== 'vote_turn') return;
    if (voteTimer <= 0) { handleVoteSubmit(selectedVote); return; }
    if (voteTimer <= 5) playSound('countdown');
    timerRef.current = setTimeout(() => setVoteTimer(t => t - 1), 1000);
    return () => clearTimeout(timerRef.current);
  }, [localPhase, voteTimer, voteIdx]);

  const startVoting = useCallback(() => {
    setVoteIdx(0);
    setVotes({});
    setSelVote(null);
    setVoteTimer(VOTE_TIME);
    setLocalPhase('vote_turn');
  }, []);

  const handleVoteSubmit = useCallback((voted) => {
    clearTimeout(timerRef.current);
    const currentVoter = players[voteIdx];
    const v = voted ?? players.find(p => p !== currentVoter) ?? players[0];
    const newVotes = { ...votes, [currentVoter]: v };
    setVotes(newVotes);

    if (voteIdx + 1 >= players.length) {
      // كل الأصوات اكتملت — نحسب النتيجة
      finishVoting(newVotes);
    } else {
      setVoteIdx(i => i + 1);
      setSelVote(null);
      setVoteTimer(VOTE_TIME);
    }
  }, [voteIdx, votes, players]);

  const finishVoting = useCallback((finalVotes) => {
    // احسب الأصوات على كل لاعب
    const tally = {};
    players.forEach(p => { tally[p] = 0; });
    Object.values(finalVotes).forEach(v => { if (v) tally[v] = (tally[v] || 0) + 1; });

    const liar = lyingName;
    const votesOnLiar = tally[liar] || 0;
    const majority = players.length / 2;
    const liarCaught = votesOnLiar > majority;

    // نقاط التصويت الصحيح
    const newScores = { ...scores };
    players.forEach(p => {
      if (finalVotes[p] === liar && p !== liar) {
        newScores[p] = (newScores[p] || 0) + POINTS_VOTE_OK;
      }
    });

    if (!liarCaught) {
      // الكاذب في أمان
      newScores[liar] = (newScores[liar] || 0) + POINTS_LIAR_SAFE;
      setScores(newScores);
      setVotes(finalVotes);
      setLocalPhase('round_result');
    } else {
      // الكاذب اتكشف — يخمّن الكلمة؟
      const opts = buildGuessOptions(wordPair.common, catId);
      setGuessOptions(opts);
      setLyingGuess(null);
      setScores(newScores);
      setVotes(finalVotes);
      setLocalPhase('liar_guess');
    }
  }, [players, lyingName, scores, wordPair, catId, buildGuessOptions]);

  const handleLiarGuess = useCallback((guess) => {
    setLyingGuess(guess);
    const correct = guess === wordPair.common;
    if (correct) {
      setScores(sc => ({
        ...sc,
        [lyingName]: (sc[lyingName] || 0) + POINTS_LIAR_GUESS,
      }));
    }
    setTimeout(() => setLocalPhase('round_result'), 600);
  }, [lyingName, wordPair]);

  const nextRound = useCallback(() => {
    if (round >= totalRounds) {
      setLocalPhase('final');
      return;
    }
    const newRound = round + 1;
    const newCat   = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
    setRound(newRound);
    setCatId(newCat.id);
    setWordPair(pickWord(newCat.id));
    setLyingIdx(Math.floor(Math.random() * players.length));
    setRevealIdx(0);
    setRevealed(false);
    setVotes({});
    setSelVote(null);
    setVoteTimer(VOTE_TIME);
    setLyingGuess(null);
    setLocalPhase('word_reveal');
  }, [round, totalRounds, players]);

  const fade = useFadeIn();

  // ────────────────────────────────────────────────────
  //  عرض الكلمة — كل لاعب يضغط ليرى
  // ────────────────────────────────────────────────────
  if (localPhase === 'word_reveal') {
    const current = players[revealIdx];
    const isLiar  = revealIdx === lyingIdx;

    return (
      <Animated.View style={[s.flex, { backgroundColor: 'transparent', opacity: fade }]}>
        <StatusBar barStyle={theme.statusBar} />
        <View style={s.gameHeader}>
          <TouchableOpacity onPress={() => Alert.alert('خروج', 'هل تريد الخروج؟', [
            { text: 'لا' }, { text: 'نعم', onPress: onBack }])}>
            <Text style={{ color: '#ef4444', fontSize: 20, fontWeight: '700' }}>✕</Text>
          </TouchableOpacity>
          <View style={[s.roundPill, { backgroundColor: theme.bgCard }]}>
            <Text style={{ color: ACCENT, fontWeight: '800' }}>جولة {round}/{totalRounds}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <ScoreChip players={players} scores={scores} theme={theme} />
          </View>
        </View>

        <View style={s.revealCenter}>
          <Text style={[s.revealStep, { color: theme.textMuted }]}>
            {revealIdx + 1} / {players.length}
          </Text>
          <View style={[s.revealCard, { backgroundColor: theme.bgCard, borderColor: ACCENT_B }]}>
            <Text style={[s.revealPlayerName, { color: ACCENT }]}>{current}</Text>
            {!revealed ? (
              <ThemedButton onPress={() => setRevealed(true)} label='🫣 أرِني' variant='primary' size='large' style={s.bigBtn} />
            ) : (
              <View style={s.wordRevealBox}>
                <Text style={[s.wordRevealLabel, { color: theme.textMuted }]}>
                  {isLiar ? '🤥 أنت الكاذب' : '✅ كلمتك'}
                </Text>
                <Text style={[s.wordRevealValue, { color: isLiar ? '#ef4444' : ACCENT }]}>
                  {isLiar ? wordPair.fake : wordPair.common}
                </Text>

                <ThemedButton
                  onPress={() => { setRevealed(false); if (revealIdx + 1 >= players.length) { setLocalPhase('discuss'); } else { setRevealIdx(r => r + 1); } }}
                  label={revealIdx + 1 >= players.length ? 'الجميع رأى — ابدأ النقاش ←' : 'التالي ←'}
                  variant='secondary' size='large'
                  style={{ marginTop: 16 }}
                />
              </View>
            )}
          </View>

          {/* فئة الجولة */}
          <View style={[s.catBadge, { backgroundColor: theme.bgCard, borderColor: ACCENT_B }]}>
            <Text style={[s.catBadgeText, { color: theme.textMuted }]}>
              الفئة: {CATEGORIES.find(c => c.id === catId)?.label}
            </Text>
          </View>
        </View>
      </Animated.View>
    );
  }

  // ────────────────────────────────────────────────────
  //  مرحلة النقاش
  // ────────────────────────────────────────────────────
  if (localPhase === 'discuss') {
    // نظام السؤال المنظم: كل لاعب يُسأل مرتين من شخصين مختلفين
    // questioner = (targetIdx + 1 + questionIdx) % players.length
    const totalQuestions  = players.length * 2; // مرتين لكل لاعب
    const [qStep, setQStep] = React.useState(0); // 0 .. totalQuestions-1
    const targetIdx    = Math.floor(qStep / 2);           // اللاعب المستهدف
    const questionerIdx = (targetIdx + 1 + (qStep % 2)) % players.length; // السائل
    const targetName    = players[targetIdx];
    const questionerName = players[questionerIdx];
    const isLastStep    = qStep + 1 >= totalQuestions;

    return (
      <Animated.View style={[s.flex, { backgroundColor: 'transparent', opacity: fade }]}>
        <StatusBar barStyle={theme.statusBar} />
        <View style={s.gameHeader}>
          <TouchableOpacity onPress={() => Alert.alert('خروج', 'هل تريد الخروج؟', [
            { text: 'لا' }, { text: 'نعم', onPress: onBack }])}>
            <Text style={{ color: '#ef4444', fontSize: 20, fontWeight: '700' }}>✕</Text>
          </TouchableOpacity>
          <View style={[s.roundPill, { backgroundColor: theme.bgCard }]}>
            <Text style={{ color: ACCENT, fontWeight: '800' }}>جولة {round}/{totalRounds} — نقاش</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>

        <View style={s.discussCenter}>
          {/* شريط تقدم النقاش */}
          <View style={{ width: '80%', marginBottom: 8 }}>
            <Text style={[s.revealStep, { color: theme.textMuted, textAlign: 'center' }]}>
              {qStep + 1} / {totalQuestions}
            </Text>
            <View style={[s.progressTrack, { backgroundColor: theme.border, marginTop: 4 }]}>
              <View style={[s.progressFill, { backgroundColor: ACCENT, width: `${((qStep + 1) / totalQuestions) * 100}%` }]} />
            </View>
          </View>

          {/* بطاقة السؤال */}
          <View style={[s.revealCard, { backgroundColor: theme.bgCard, borderColor: ACCENT_B, width: '88%' }]}>
            {/* السائل */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Text style={{ fontSize: 20 }}>🎤</Text>
              <Text style={[s.revealInstruction, { color: theme.textMuted, flex: 1 }]}>السائل</Text>
              <Text style={[s.revealPlayerName, { color: ACCENT }]}>{questionerName}</Text>
            </View>

            {/* السهم */}
            <Text style={{ fontSize: 22, textAlign: 'center', marginVertical: 4 }}>↓</Text>

            {/* المستهدف */}
            <View style={[{ backgroundColor: ACCENT_S, borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: ACCENT_B }]}>
              <Text style={[s.revealInstruction, { color: theme.textMuted }]}>اسألوه: كيف تصف الكلمة؟</Text>
              <Text style={[s.revealPlayerName, { color: ACCENT, fontSize: 22, marginTop: 4 }]}>{targetName}</Text>
            </View>
          </View>

          <ThemedButton
            onPress={() => { if (isLastStep) { startVoting(); } else { setQStep(q => q + 1); } }}
            label='🗳️ ابدأ التصويت'
            variant='primary' size='large'
            style={{ marginTop: 24, width: '80%' }}
          />
        </View>
      </Animated.View>
    );
  }

  // ────────────────────────────────────────────────────
  //  مرحلة التصويت — لاعب واحد في كل مرة
  // ────────────────────────────────────────────────────
  if (localPhase === 'vote_turn') {
    const voter     = players[voteIdx];
    const choices   = players.filter(p => p !== voter);
    const timerPct  = voteTimer / VOTE_TIME;
    const timerColor = voteTimer > 20 ? '#10b981' : voteTimer > 10 ? '#f59e0b' : '#ef4444';

    return (
      <Animated.View style={[s.flex, { backgroundColor: 'transparent', opacity: fade }]}>
        <StatusBar barStyle={theme.statusBar} />
        <View style={s.gameHeader}>
          <View style={[s.quitBtn, { backgroundColor: theme.bgCard, opacity: 0.3 }]} />
          <View style={[s.roundPill, { backgroundColor: theme.bgCard }]}>
            <Text style={{ color: ACCENT, fontWeight: '800' }}>
              تصويت {voteIdx + 1}/{players.length}
            </Text>
          </View>
          <View style={{ width: 36 }} />
        </View>

        <View style={s.voteContent}>
          {/* عداد الوقت */}
          <View style={[s.timerRow, { backgroundColor: theme.bgCard, borderColor: timerColor + '40' }]}>
            <Text style={[s.timerNum, { color: timerColor }]}>{voteTimer}</Text>
            <View style={[s.timerBarBg, { backgroundColor: theme.bgElevated }]}>
              <View style={[s.timerBarFill, { width: `${timerPct * 100}%`, backgroundColor: timerColor }]} />
            </View>
            <Text style={[s.timerLabel, { color: theme.textMuted }]}>ث</Text>
          </View>

          <Text style={[s.voteVoterName, { color: ACCENT }]}>{voter}</Text>
          <Text style={[s.voteQuestion, { color: theme.textPrimary }]}>من تظن أنه الكاذب؟</Text>

          <View style={s.voteChoices}>
            {choices.map(name => (
              <ThemedCard
                key={name}
                onPress={() => setSelVote(name)}
                style={s.voteChoice}
                variant={selectedVote === name ? 'accent' : 'default'}
              >
                <Text style={[s.voteChoiceName, { color: selectedVote === name ? ACCENT : theme.textPrimary }]}>
                  {name}
                </Text>
                {selectedVote === name && <Text style={{ fontSize: 18 }}>🎯</Text>}
              </ThemedCard>
            ))}
          </View>

          <ThemedButton
            onPress={() => handleVoteSubmit(selectedVote)}
            label={selectedVote ? `✓ صوّت على ${selectedVote}` : 'تخطّ (بدون صوت)'}
            variant={selectedVote ? 'primary' : 'ghost'}
            size='large'
            style={{ width: '80%' }}
          />
        </View>
      </Animated.View>
    );
  }

  // ────────────────────────────────────────────────────
  //  تخمين الكاذب للكلمة
  // ────────────────────────────────────────────────────
  if (localPhase === 'liar_guess') {
    return (
      <Animated.View style={[s.flex, { backgroundColor: 'transparent', opacity: fade }]}>
        <StatusBar barStyle={theme.statusBar} />
        <View style={s.voteContent}>
          <Text style={s.discussEmoji}>🤥</Text>
          <Text style={[s.discussTitle, { color: '#ef4444' }]}>اتُكشفت يا {lyingName}!</Text>
          <Text style={[s.discussDesc, { color: theme.textMuted }]}>
            خمّن الكلمة الصحيحة واربح نقطة إضافية
          </Text>

          <View style={s.voteChoices}>
            {guessOptions.map(opt => (
              <ThemedCard
                key={opt}
                onPress={() => !lyingGuess && handleLiarGuess(opt)}
                style={s.voteChoice}
                variant={lyingGuess === opt ? 'accent' : 'default'}
              >
                <Text style={[s.voteChoiceName, { color: lyingGuess === opt ? ACCENT : theme.textPrimary }]}>
                  {opt}
                </Text>
                {lyingGuess && opt === wordPair.common && <Text style={{ fontSize: 18 }}>✅</Text>}
                {lyingGuess && opt !== wordPair.common && lyingGuess === opt && <Text style={{ fontSize: 18 }}>❌</Text>}
              </ThemedCard>
            ))}
          </View>
        </View>
      </Animated.View>
    );
  }

  // ────────────────────────────────────────────────────
  //  نتيجة الجولة
  // ────────────────────────────────────────────────────
  if (localPhase === 'round_result') {
    const tally = {};
    players.forEach(p => { tally[p] = 0; });
    Object.values(votes).forEach(v => { if (v) tally[v] = (tally[v] || 0) + 1; });
    const votesOnLiar = tally[lyingName] || 0;
    const majority    = players.length / 2;
    const liarCaught  = votesOnLiar > majority;
    const liarGuessedRight = lyingGuess === wordPair.common;

    return (
      <Animated.View style={[s.flex, { backgroundColor: 'transparent', opacity: fade }]}>
        <StatusBar barStyle={theme.statusBar} />
        <ScrollView contentContainerStyle={s.resultContent}>

          {/* رأس النتيجة */}
          <View style={[s.resultHeader, { backgroundColor: liarCaught ? '#ef444418' : '#10b98118',
            borderColor: liarCaught ? '#ef444440' : '#10b98140' }]}>
            <Text style={s.resultEmoji}>{liarCaught ? '🕵️ اتكشف الكاذب!' : '🤥 الكاذب نجا!'}</Text>
            <Text style={[s.resultLiarName, { color: liarCaught ? '#ef4444' : '#10b981' }]}>
              {lyingName} كان الكاذب
            </Text>
            <Text style={[s.resultWord, { color: theme.textMuted }]}>
              الكلمة الصحيحة: <Text style={{ color: ACCENT, fontWeight: '700' }}>{wordPair.common}</Text>
            </Text>
            <Text style={[s.resultWord, { color: theme.textMuted }]}>
              كلمة الكاذب: <Text style={{ color: '#ef4444', fontWeight: '700' }}>{wordPair.fake}</Text>
            </Text>
            {liarCaught && lyingGuess !== null && (
              <Text style={[s.resultWord, { color: liarGuessedRight ? '#10b981' : '#ef4444' }]}>
                {liarGuessedRight ? `✅ ${lyingName} خمّن الكلمة صح (+${POINTS_LIAR_GUESS} نقطة)` : `❌ ${lyingName} لم يخمّن الكلمة`}
              </Text>
            )}
          </View>

          {/* الأصوات */}
          <Text style={[s.sectionLabel, { color: theme.textSecondary }]}>🗳️ الأصوات</Text>
          {players.map(p => (
            <View key={p} style={[s.voteResultRow, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
              <Text style={[s.voteResultVoter, { color: theme.textSecondary }]}>{p}</Text>
              <Text style={{ color: theme.textMuted }}>→</Text>
              <Text style={[s.voteResultTarget, {
                color: votes[p] === lyingName ? '#10b981' : '#ef4444',
                fontWeight: '700',
              }]}>
                {votes[p] || '—'}
              </Text>
              {votes[p] === lyingName && <Text>✅</Text>}
            </View>
          ))}

          {/* النقاط */}
          <Text style={[s.sectionLabel, { color: theme.textSecondary, marginTop: 12 }]}>📊 النقاط</Text>
          {[...players].sort((a, b) => (scores[b] || 0) - (scores[a] || 0)).map((p, i) => (
            <View key={p} style={[s.scoreRow, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
              <Text style={[s.scoreRank, { color: i === 0 ? ACCENT : theme.textMuted }]}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
              </Text>
              <Text style={[s.scoreName, { color: theme.textPrimary }]}>{p}</Text>
              <Text style={[s.scorePoints, { color: ACCENT }]}>{scores[p] || 0} نقطة</Text>
            </View>
          ))}

          <ThemedButton
            onPress={nextRound}
            label={round >= totalRounds ? '🏆 النتيجة النهائية' : `جولة ${round + 1} →`}
            variant='primary' size='large'
            style={{ marginTop: 20, width: '80%', alignSelf: 'center' }}
          />
        </ScrollView>
      </Animated.View>
    );
  }

  // ────────────────────────────────────────────────────
  //  النتيجة النهائية
  // ────────────────────────────────────────────────────
  if (localPhase === 'final') {
    const sorted = [...players].sort((a, b) => (scores[b] || 0) - (scores[a] || 0));
    const winner = sorted[0];
    return (
      <Animated.View style={[s.flex, { backgroundColor: 'transparent', opacity: fade }]}>
        <StatusBar barStyle={theme.statusBar} />
        <ScrollView contentContainerStyle={s.resultContent}>
          <Text style={[s.finalEmoji]}>🏆</Text>
          <Text style={[s.finalTitle, { color: ACCENT }]}>انتهت اللعبة!</Text>
          <Text style={[s.finalWinner, { color: theme.textPrimary }]}>
            الفائز: <Text style={{ color: ACCENT, fontWeight: '800' }}>{winner}</Text>
          </Text>

          {sorted.map((p, i) => (
            <View key={p} style={[s.scoreRow, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
              <Text style={[s.scoreRank, { color: i === 0 ? ACCENT : theme.textMuted }]}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
              </Text>
              <Text style={[s.scoreName, { color: theme.textPrimary }]}>{p}</Text>
              <Text style={[s.scorePoints, { color: ACCENT }]}>{scores[p] || 0} نقطة</Text>
            </View>
          ))}

          <ThemedButton
            onPress={onBack}
            label='🏠 العودة للقائمة'
            variant='primary' size='large'
            style={{ marginTop: 24, width: '80%', alignSelf: 'center' }}
          />
        </ScrollView>
      </Animated.View>
    );
  }

  return null;
}

// ══════════════════════════════════════════════════════════
//  مساعد عرض النقاط في الهيدر
// ══════════════════════════════════════════════════════════
function ScoreChip({ players, scores, theme }) {
  const top = [...players].sort((a, b) => (scores[b] || 0) - (scores[a] || 0))[0];
  if (!top) return null;
  return (
    <View style={[s.scoreChip, { backgroundColor: theme.bgCard, borderColor: ACCENT_B }]}>
      <Text style={[s.scoreChipText, { color: ACCENT }]}>🥇 {top}: {scores[top] || 0}</Text>
    </View>
  );
}

// ══════════════════════════════════════════════════════════
//  نمط 2 — روم الأونلاين (إنشاء / انضمام)
// ══════════════════════════════════════════════════════════
function OnlineLobbyPhase({ theme, currentUser, onBack, onHeartSpent }) {
  const [lobbyPhase, setLobbyPhase] = useState('choose'); // choose | create | join | waiting | play
  const [roomCode,   setRoomCode]   = useState('');
  const [inputCode,  setInputCode]  = useState('');
  const [roomData,   setRoomData]   = useState(null);
  const [isHost,     setIsHost]     = useState(false);
  const [loading,    setLoading]    = useState(false);
  const unsubRef = useRef(null);
  const fade = useFadeIn();

  const myUid  = currentUser?.uid  || `guest_${Math.random().toString(36).slice(2,8)}`;
  const myName = currentUser?.name || 'لاعب';

  useEffect(() => {
    return () => {
      if (unsubRef.current) unsubRef.current();
    };
  }, []);

  // ── خصم قلب ──────────────────────────────────────────
  const trySpendHeart = useCallback(async () => {
    const { success } = await spendHeart(1);
    if (!success) {
      Alert.alert('💔 لا يوجد قلوب', 'تحتاج قلباً للعب. انتظر التجديد أو شاهد إعلاناً.');
      return false;
    }
    onHeartSpent?.(); // حدّث عدّاد القلوب في الواجهة الرئيسية
    return true;
  }, [onHeartSpent]);

  // ── إنشاء روم ────────────────────────────────────────
  const createRoom = useCallback(async () => {
    const ok = await trySpendHeart();
    if (!ok) return;
    setLoading(true);
    const code = genRoomCode();
    const data = {
      code,
      hostUid:   myUid,
      hostName:  myName,
      players:   { [myUid]: { name: myName, score: 0, joined: Date.now() } },
      phase:     'waiting',
      round:     1,
      catId:     CATEGORIES[0].id,
      wordPair:  null,
      lyingUid:  null,
      votes:     {},
      createdAt: Date.now(),
    };
    try {
      await setDoc(doc(db, 'whoLyingRooms', code), data);
      setRoomCode(code);
      setIsHost(true);
      setRoomData(data);
      listenRoom(code);
      setLobbyPhase('waiting');
    } catch (e) {
      Alert.alert('خطأ', 'فشل إنشاء الروم');
    }
    setLoading(false);
  }, [myUid, myName, trySpendHeart]);

  // ── انضمام لروم ──────────────────────────────────────
  const joinRoom = useCallback(async () => {
    const code = inputCode.trim().toUpperCase();
    if (code.length < 5) return Alert.alert('', 'أدخل الكود كاملاً (5 أحرف)');
    const ok = await trySpendHeart();
    if (!ok) return;
    setLoading(true);
    try {
      const snap = await getDoc(doc(db, 'whoLyingRooms', code));
      if (!snap.exists()) { Alert.alert('', 'الروم غير موجود'); setLoading(false); return; }
      const data = snap.data();
      if (data.phase !== 'waiting') { Alert.alert('', 'اللعبة بدأت بالفعل'); setLoading(false); return; }
      const playerCount = Object.keys(data.players || {}).length;
      if (playerCount >= 12) { Alert.alert('', 'الروم ممتلئ'); setLoading(false); return; }

      await updateDoc(doc(db, 'whoLyingRooms', code), {
        [`players.${myUid}`]: { name: myName, score: 0, joined: Date.now() },
      });
      setRoomCode(code);
      setIsHost(false);
      listenRoom(code);
      setLobbyPhase('waiting');
    } catch (e) {
      Alert.alert('خطأ', 'فشل الانضمام');
    }
    setLoading(false);
  }, [inputCode, myUid, myName, trySpendHeart]);

  // ── مراقبة الروم ─────────────────────────────────────
  const listenRoom = useCallback((code) => {
    if (unsubRef.current) unsubRef.current();
    unsubRef.current = onSnapshot(doc(db, 'whoLyingRooms', code), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      setRoomData(data);
      if (data.phase === 'playing') setLobbyPhase('play');
    });
  }, []);

  // ── المضيف يبدأ اللعبة ───────────────────────────────
  const startGame = useCallback(async () => {
    if (!roomData) return;
    const playerList = Object.keys(roomData.players);
    if (playerList.length < 3) return Alert.alert('', 'تحتاج 3 لاعبين على الأقل');
    const catId   = roomData.catId || CATEGORIES[0].id;
    const word    = pickWord(catId);
    const lyingUid = playerList[Math.floor(Math.random() * playerList.length)];
    await updateDoc(doc(db, 'whoLyingRooms', roomCode), {
      phase:    'playing',
      round:    1,
      wordPair: word,
      lyingUid,
      votes:    {},
      guessOptions: shuffle([
        word.common,
        ...shuffle(CATEGORIES.find(c => c.id === catId)?.words.map(w => w.common).filter(w => w !== word.common) || []).slice(0, 3),
      ]),
    });
  }, [roomData, roomCode]);

  // ────────────────────────────────────────────────────
  if (lobbyPhase === 'choose') {
    return (
      <Animated.View style={[s.flex, { backgroundColor: 'transparent', opacity: fade }]}>
        <StatusBar barStyle={theme.statusBar} />
        <SafeHeader>
          <ThemedButton onPress={onBack} label="→" variant="ghost" size="small" style={s.backBtn} />
          <Text style={[s.headerTitle, { color: ACCENT }]}>🌐 روم</Text>
          <View style={{ width: 40 }} />
        </SafeHeader>

        <View style={s.menuCenter}>
          <Text style={[s.menuSub, { color: theme.textMuted, marginBottom: 24 }]}>
            كل شخص بجهازه — يحتاج إنترنت
          </Text>

          <View style={s.modeRow}>
            <ThemedCard onPress={() => setLobbyPhase('create')} style={s.modeCard} variant='accent'>
              <Text style={s.modeCardEmoji}>＋</Text>
              <Text style={[s.modeCardTitle, { color: ACCENT }]}>أنشئ روم</Text>
              <Text style={[s.modeCardDesc, { color: theme.textMuted }]}>تأخذ كود{'\n'}وتشارك الأصدقاء</Text>
            </ThemedCard>

            <ThemedCard onPress={() => setLobbyPhase('join')} style={s.modeCard}>
              <Text style={s.modeCardEmoji}>🔑</Text>
              <Text style={[s.modeCardTitle, { color: theme.textPrimary }]}>انضم بكود</Text>
              <Text style={[s.modeCardDesc, { color: theme.textMuted }]}>أدخل كود{'\n'}من صديقك</Text>
            </ThemedCard>
          </View>

          <View style={[s.heartNote, { backgroundColor: theme.bgCard, borderColor: ACCENT_B }]}>
            <Text style={[s.heartNoteText, { color: theme.textMuted }]}>
              ❤️ تكلفة اللعبة: قلب واحد عند الانضمام أو الإنشاء
            </Text>
          </View>
        </View>
      </Animated.View>
    );
  }

  if (lobbyPhase === 'create') {
    return (
      <Animated.View style={[s.flex, { backgroundColor: 'transparent', opacity: fade }]}>
        <StatusBar barStyle={theme.statusBar} />
        <SafeHeader>
          <ThemedButton onPress={() => setLobbyPhase('choose')} label='→' variant='ghost' size='small' style={s.backBtn} />
          <Text style={[s.headerTitle, { color: ACCENT }]}>إنشاء روم</Text>
          <View style={{ width: 40 }} />
        </SafeHeader>

        <View style={s.menuCenter}>
          <Text style={[s.discussDesc, { color: theme.textMuted, textAlign: 'center', marginBottom: 24 }]}>
            بعد الإنشاء ستحصل على كود تشاركه مع أصدقائك (تكلفة ❤️ قلب واحد)
          </Text>
          {loading ? (
            <ActivityIndicator size="large" color={ACCENT} />
          ) : (
            <ThemedButton onPress={createRoom} label='＋ أنشئ الروم' variant='primary' size='large' style={{ width: '80%' }} />
          )}
        </View>
      </Animated.View>
    );
  }

  if (lobbyPhase === 'join') {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[s.flex, { backgroundColor: 'transparent' }]}>
        <Animated.View style={{ flex: 1, opacity: fade }}>
          <StatusBar barStyle={theme.statusBar} />
          <SafeHeader>
            <ThemedButton onPress={() => setLobbyPhase('choose')} label='→' variant='ghost' size='small' style={s.backBtn} />
            <Text style={[s.headerTitle, { color: ACCENT }]}>انضم بكود</Text>
            <View style={{ width: 40 }} />
          </SafeHeader>

          <View style={s.menuCenter}>
            <Text style={[s.discussDesc, { color: theme.textMuted, textAlign: 'center', marginBottom: 16 }]}>
              أدخل كود الروم (5 أحرف) — تكلفة ❤️ قلب واحد
            </Text>
            <TextInput
              style={[s.codeInput, { backgroundColor: theme.bgCard, borderColor: ACCENT_B, color: theme.textPrimary }]}
              placeholder="· · · · ·"
              placeholderTextColor={theme.textMuted}
              value={inputCode}
              onChangeText={v => setInputCode(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5))}
              autoCapitalize="characters"
              maxLength={5}
            />
            {loading ? (
              <ActivityIndicator size="large" color={ACCENT} style={{ marginTop: 16 }} />
            ) : (
              <ThemedButton onPress={joinRoom} label='🔑 انضم' variant='primary' size='large' style={{ marginTop: 16, width: '80%' }} />
            )}
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    );
  }

  // ── غرفة الانتظار ────────────────────────────────────
  if (lobbyPhase === 'waiting') {
    const playerList = Object.values(roomData?.players || {});
    const catId = roomData?.catId || CATEGORIES[0].id;

    return (
      <Animated.View style={[s.flex, { backgroundColor: 'transparent', opacity: fade }]}>
        <StatusBar barStyle={theme.statusBar} />
        <View style={s.gameHeader}>
          <ExitButton onPress={() => { if (unsubRef.current) unsubRef.current(); onBack(); }} size={36} />
          <View style={[s.roundPill, { backgroundColor: theme.bgCard }]}>
            <Text style={{ color: ACCENT, fontWeight: '800' }}>غرفة الانتظار</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={s.waitingContent}>
          {/* كود الروم */}
          <View style={[s.codeBadge, { backgroundColor: ACCENT_S, borderColor: ACCENT }]}>
            <Text style={[s.codeLabel, { color: theme.textMuted }]}>كود الروم</Text>
            <Text style={[s.codeValue, { color: ACCENT }]}>{roomCode}</Text>
            <Text style={[s.codeHint, { color: theme.textMuted }]}>شارك الكود مع أصدقائك</Text>
          </View>

          {/* اللاعبون */}
          <Text style={[s.sectionLabel, { color: theme.textSecondary }]}>
            👥 اللاعبون ({playerList.length})
          </Text>
          {playerList.map(p => (
            <View key={p.name} style={[s.playerChip, { backgroundColor: theme.bgCard, borderColor: ACCENT_B }]}>
              <Text style={[s.chipNum, { backgroundColor: ACCENT }]}>✓</Text>
              <Text style={[s.chipName, { color: theme.textPrimary }]}>
                {p.name} {p.name === myName ? '(أنت)' : ''}
                {roomData?.hostName === p.name ? ' 👑' : ''}
              </Text>
            </View>
          ))}

          {/* المضيف يختار الفئة ويبدأ */}
          {isHost && (
            <>
              <Text style={[s.sectionLabel, { color: theme.textSecondary, marginTop: 16 }]}>📂 الفئة</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {CATEGORIES.map(cat => (
                    <ThemedCard
                      key={cat.id}
                      onPress={() => updateDoc(doc(db, 'whoLyingRooms', roomCode), { catId: cat.id })}
                      style={s.catChip}
                      variant={catId === cat.id ? 'accent' : 'default'}
                    >
                      <Text style={[s.catChipText, { color: catId === cat.id ? ACCENT : theme.textMuted }]}>
                        {cat.label}
                      </Text>
                    </ThemedCard>
                  ))}
                </View>
              </ScrollView>

              <ThemedButton
                onPress={startGame}
                disabled={playerList.length < 3}
                label={playerList.length < 3 ? `انتظر 3 لاعبين (${playerList.length})` : 'ابدأ اللعبة ←'}
                variant={playerList.length >= 3 ? 'primary' : 'secondary'}
                size='large'
                style={{ marginTop: 24, width: '80%', alignSelf: 'center' }}
              />
            </>
          )}

          {!isHost && (
            <View style={[s.waitingNote, { backgroundColor: theme.bgCard, borderColor: ACCENT_B }]}>
              <ActivityIndicator size="small" color={ACCENT} />
              <Text style={[s.waitingNoteText, { color: theme.textMuted }]}>
                انتظر حتى يبدأ المضيف...
              </Text>
            </View>
          )}
        </ScrollView>
      </Animated.View>
    );
  }

  // ── اللعبة الأونلاين ─────────────────────────────────
  if (lobbyPhase === 'play') {
    return (
      <OnlinePlayPhase
        theme={theme}
        roomCode={roomCode}
        roomData={roomData}
        myUid={myUid}
        myName={myName}
        isHost={isHost}
        onBack={() => { if (unsubRef.current) unsubRef.current(); onBack(); }}
      />
    );
  }

  return null;
}

// ══════════════════════════════════════════════════════════
//  نمط 2 — اللعب الأونلاين (داخل الروم)
// ══════════════════════════════════════════════════════════
function OnlinePlayPhase({ theme, roomCode, roomData: initialData, myUid, myName, isHost, onBack }) {
  const [roomData,  setRoomData]  = useState(initialData);
  const [myVote,    setMyVote]    = useState(null);
  const [voted,     setVoted]     = useState(false);
  const [voteTimer, setVoteTimer] = useState(VOTE_TIME);
  const [wordSeen,  setWordSeen]  = useState(false);
  const [liarGuess, setLiarGuess] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'whoLyingRooms', roomCode), (snap) => {
      if (!snap.exists()) return;
      setRoomData(snap.data());
    });
    return () => unsub();
  }, [roomCode]);

  // مؤقت التصويت
  useEffect(() => {
    if (roomData?.phase !== 'voting') return;
    if (voted) return;
    if (voteTimer <= 0) { submitVote(myVote); return; }
    if (voteTimer <= 5) playSound('countdown');
    timerRef.current = setTimeout(() => setVoteTimer(t => t - 1), 1000);
    return () => clearTimeout(timerRef.current);
  }, [roomData?.phase, voteTimer, voted]);

  // حساب نتيجة التصويت (المضيف فقط)
  useEffect(() => {
    if (!isHost || roomData?.phase !== 'voting') return;
    const players  = Object.keys(roomData.players || {});
    const allVoted = players.every(uid => roomData.votes?.[uid]);
    if (!allVoted) return;
    finishOnlineVoting();
  }, [roomData?.votes]);

  const submitVote = useCallback(async (votedUid) => {
    if (voted) return;
    const target = votedUid || Object.keys(roomData?.players || {}).find(u => u !== myUid) || myUid;
    setVoted(true);
    clearTimeout(timerRef.current);
    await updateDoc(doc(db, 'whoLyingRooms', roomCode), {
      [`votes.${myUid}`]: target,
    });
  }, [voted, myUid, roomCode, roomData]);

  const finishOnlineVoting = useCallback(async () => {
    const players   = Object.keys(roomData.players || {});
    const votes     = roomData.votes || {};
    const lyingUid  = roomData.lyingUid;
    const tally     = {};
    players.forEach(uid => { tally[uid] = 0; });
    Object.values(votes).forEach(v => { if (v) tally[v] = (tally[v] || 0) + 1; });

    const votesOnLiar = tally[lyingUid] || 0;
    const liarCaught  = votesOnLiar > players.length / 2;

    const newScores = { ...Object.fromEntries(players.map(uid => [uid, roomData.players[uid]?.score || 0])) };
    players.forEach(uid => {
      if (votes[uid] === lyingUid && uid !== lyingUid) {
        newScores[uid] = (newScores[uid] || 0) + POINTS_VOTE_OK;
      }
    });
    if (!liarCaught) {
      newScores[lyingUid] = (newScores[lyingUid] || 0) + POINTS_LIAR_SAFE;
    }

    const updates = {
      phase:     liarCaught ? 'liar_guess' : 'round_result',
      liarCaught,
    };
    players.forEach(uid => {
      updates[`players.${uid}.score`] = newScores[uid] || 0;
    });
    await updateDoc(doc(db, 'whoLyingRooms', roomCode), updates);
  }, [roomData, roomCode]);

  const submitLiarGuess = useCallback(async (guess) => {
    if (liarGuess) return;
    setLiarGuess(guess);
    const correct = guess === roomData?.wordPair?.common;
    const updates = { phase: 'round_result', liarGuess: guess, liarGuessedRight: correct };
    if (correct) {
      updates[`players.${myUid}.score`] = (roomData?.players?.[myUid]?.score || 0) + POINTS_LIAR_GUESS;
    }
    await updateDoc(doc(db, 'whoLyingRooms', roomCode), updates);
  }, [liarGuess, myUid, roomCode, roomData]);

  const nextOnlineRound = useCallback(async () => {
    const round = (roomData?.round || 1);
    if (round >= TOTAL_ROUNDS) {
      await updateDoc(doc(db, 'whoLyingRooms', roomCode), { phase: 'final' });
      return;
    }
    const newRound = round + 1;
    const catId    = roomData?.catId || CATEGORIES[0].id;
    const word     = pickWord(catId);
    const players  = Object.keys(roomData?.players || {});
    const lyingUid = players[Math.floor(Math.random() * players.length)];
    await updateDoc(doc(db, 'whoLyingRooms', roomCode), {
      phase:    'playing',
      round:    newRound,
      wordPair: word,
      lyingUid,
      votes:    {},
      liarCaught:     false,
      liarGuess:      null,
      liarGuessedRight: false,
      guessOptions: shuffle([
        word.common,
        ...shuffle(CATEGORIES.find(c => c.id === catId)?.words.map(w => w.common).filter(w => w !== word.common) || []).slice(0, 3),
      ]),
    });
    setMyVote(null);
    setVoted(false);
    setVoteTimer(VOTE_TIME);
    setWordSeen(false);
    setLiarGuess(null);
  }, [roomData, roomCode]);

  if (!roomData) return <LoadingView theme={theme} />;

  const phase    = roomData.phase;
  const players  = roomData.players || {};
  const lyingUid = roomData.lyingUid;
  const wordPair = roomData.wordPair || {};
  const amLiar   = myUid === lyingUid;
  const myWord   = amLiar ? wordPair.fake : wordPair.common;
  const round    = roomData.round || 1;

  // ── عرض الكلمة لكل لاعب ──────────────────────────────
  if (phase === 'playing') {
    const catLabel = CATEGORIES.find(c => c.id === roomData.catId)?.label || '';
    // تعليمات بالترتيب للنقاش
    const playerNames = Object.values(players).map(p => p.name);

    return (
      <View style={[s.flex, { backgroundColor: 'transparent' }]}>
        <StatusBar barStyle={theme.statusBar} />
        <View style={s.gameHeader}>
          <ExitButton onPress={onBack} />
          <View style={[s.roundPill, { backgroundColor: theme.bgCard }]}>
            <Text style={{ color: ACCENT, fontWeight: '800' }}>جولة {round}/{TOTAL_ROUNDS}</Text>
          </View>
          <WebScreenButton
            playerUid={myUid}
            playerName={myName}
            gameType="who_lying"
            gameRoomId={roomCode}
            getPublicData={() => ({ phase, round, catId: roomData.catId })}
            themeName={themeId || 'dark'}
          />
        </View>

        <ScrollView contentContainerStyle={s.onlinePlayContent}>
          {/* فئة الجولة */}
          <View style={[s.catBadge, { backgroundColor: theme.bgCard, borderColor: ACCENT_B, alignSelf: 'center', marginBottom: 8 }]}>
            <Text style={[s.catBadgeText, { color: theme.textMuted }]}>الفئة: {catLabel}</Text>
          </View>

          {/* كلمة اللاعب */}
          {!wordSeen ? (
            <ThemedCard
              onPress={() => setWordSeen(true)}
              style={[s.revealCard, { margin: 16 }]}
            >
              <Text style={[s.revealPlayerName, { color: ACCENT }]}>كلمتك</Text>
              <Text style={[s.revealInstruction, { color: theme.textMuted }]}>
                اضغط لترى كلمتك وحدك
              </Text>
              <Text style={{ fontSize: 40, marginTop: 8 }}>🫣</Text>
            </ThemedCard>
          ) : (
            <View style={[s.revealCard, { backgroundColor: amLiar ? '#ef444418' : ACCENT_S,
              borderColor: amLiar ? '#ef444440' : ACCENT_B, margin: 16 }]}>
              <Text style={[s.revealPlayerName, { color: amLiar ? '#ef4444' : ACCENT }]}>
                {amLiar ? '🤥 أنت الكاذب!' : '✅ كلمتك'}
              </Text>
              <Text style={[s.wordRevealValue, { color: amLiar ? '#ef4444' : ACCENT }]}>
                {myWord}
              </Text>

            </View>
          )}

          {/* تعليمات النقاش */}
          <View style={[s.instructBox, { backgroundColor: theme.bgCard, borderColor: ACCENT_B, margin: 16 }]}>
            <Text style={[s.instructTitle, { color: ACCENT }]}>🎙️ ترتيب النقاش</Text>
            {playerNames.map((name, i) => (
              <Text key={name} style={[s.instructText, { color: theme.textSecondary }]}>
                {i + 1}. {name} — اسألوه: كيف تصف الكلمة؟
              </Text>
            ))}
            <Text style={[s.instructText, { color: theme.textMuted, marginTop: 8 }]}>
              بعد النقاش يبدأ المضيف التصويت
            </Text>
          </View>

          {/* المضيف يبدأ التصويت */}
          {isHost && (
            <ThemedButton
              onPress={() => updateDoc(doc(db, 'whoLyingRooms', roomCode), { phase: 'voting', votes: {} })}
              label='🗳️ ابدأ التصويت'
              variant='primary' size='large'
              style={{ width: '80%', alignSelf: 'center', marginBottom: 24 }}
            />
          )}
        </ScrollView>
      </View>
    );
  }

  // ── التصويت الأونلاين ────────────────────────────────
  if (phase === 'voting') {
    const playerEntries = Object.entries(players).filter(([uid]) => uid !== myUid);
    const timerColor = voteTimer > 20 ? '#10b981' : voteTimer > 10 ? '#f59e0b' : '#ef4444';
    const totalVotes = Object.keys(roomData.votes || {}).length;
    const totalPlayers = Object.keys(players).length;

    return (
      <View style={[s.flex, { backgroundColor: 'transparent' }]}>
        <StatusBar barStyle={theme.statusBar} />
        <View style={s.gameHeader}>
          <View style={[s.quitBtn, { opacity: 0 }]} />
          <View style={[s.roundPill, { backgroundColor: theme.bgCard }]}>
            <Text style={{ color: ACCENT, fontWeight: '800' }}>التصويت</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>

        <View style={s.voteContent}>
          {/* مؤقت + عدد الأصوات */}
          <View style={[s.timerRow, { backgroundColor: theme.bgCard, borderColor: timerColor + '40' }]}>
            <Text style={[s.timerNum, { color: timerColor }]}>{voted ? '✓' : voteTimer}</Text>
            <View style={{ flex: 1 }}>
              <View style={[s.timerBarBg, { backgroundColor: theme.bgElevated }]}>
                <View style={[s.timerBarFill, { width: `${(voteTimer / VOTE_TIME) * 100}%`, backgroundColor: timerColor }]} />
              </View>
              <Text style={[{ color: theme.textMuted, fontSize: 11, marginTop: 2 }]}>
                {totalVotes}/{totalPlayers} صوّتوا
              </Text>
            </View>
          </View>

          {voted ? (
            <View style={[s.waitingNote, { backgroundColor: theme.bgCard, borderColor: ACCENT_B }]}>
              <ActivityIndicator size="small" color={ACCENT} />
              <Text style={[s.waitingNoteText, { color: theme.textMuted }]}>
                انتظر بقية اللاعبين...
              </Text>
            </View>
          ) : (
            <>
              <Text style={[s.voteQuestion, { color: theme.textPrimary }]}>من تظن أنه الكاذب؟</Text>
              <View style={s.voteChoices}>
                {playerEntries.map(([uid, p]) => (
                  <ThemedCard
                    key={uid}
                    onPress={() => setMyVote(uid)}
                    style={s.voteChoice}
                    variant={myVote === uid ? 'accent' : 'default'}
                  >
                    <Text style={[s.voteChoiceName, { color: myVote === uid ? ACCENT : theme.textPrimary }]}>
                      {p.name}
                    </Text>
                    {myVote === uid && <Text style={{ fontSize: 18 }}>🎯</Text>}
                  </ThemedCard>
                ))}
              </View>
              <ThemedButton
                onPress={() => submitVote(myVote)}
                label={myVote ? '✓ تأكيد التصويت' : 'تخطّ'}
                variant={myVote ? 'primary' : 'ghost'}
                size='large'
                style={{ width: '80%' }}
              />
            </>
          )}
        </View>
      </View>
    );
  }

  // ── تخمين الكاذب ─────────────────────────────────────
  if (phase === 'liar_guess') {
    const opts = roomData.guessOptions || [wordPair.common];

    return (
      <View style={[s.flex, { backgroundColor: 'transparent' }]}>
        <StatusBar barStyle={theme.statusBar} />
        <View style={s.voteContent}>
          <Text style={s.discussEmoji}>🤥</Text>
          {amLiar ? (
            <>
              <Text style={[s.discussTitle, { color: '#ef4444' }]}>اتُكشفت!</Text>
              <Text style={[s.discussDesc, { color: theme.textMuted }]}>
                خمّن الكلمة الصحيحة واربح نقطة
              </Text>
              <View style={s.voteChoices}>
                {opts.map(opt => (
                  <ThemedCard
                    key={opt}
                    onPress={() => !liarGuess && submitLiarGuess(opt)}
                    style={s.voteChoice}
                    variant={liarGuess === opt ? 'accent' : 'default'}
                  >
                    <Text style={[s.voteChoiceName, { color: liarGuess === opt ? ACCENT : theme.textPrimary }]}>
                      {opt}
                    </Text>
                  </ThemedCard>
                ))}
              </View>
            </>
          ) : (
            <View style={[s.waitingNote, { backgroundColor: theme.bgCard, borderColor: ACCENT_B }]}>
              <ActivityIndicator size="small" color={ACCENT} />
              <Text style={[s.waitingNoteText, { color: theme.textMuted }]}>
                الكاذب يختار...
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  // ── نتيجة الجولة أونلاين ──────────────────────────────
  if (phase === 'round_result') {
    const liarName   = players[lyingUid]?.name || '?';
    const liarCaught = roomData.liarCaught;
    const lyingRight = roomData.liarGuessedRight;
    const sortedPlayers = Object.entries(players).sort(([,a],[,b]) => (b.score||0) - (a.score||0));

    return (
      <View style={[s.flex, { backgroundColor: 'transparent' }]}>
        <StatusBar barStyle={theme.statusBar} />
        <ScrollView contentContainerStyle={s.resultContent}>
          <View style={[s.resultHeader, { backgroundColor: liarCaught ? '#ef444418' : '#10b98118',
            borderColor: liarCaught ? '#ef444440' : '#10b98140' }]}>
            <Text style={s.resultEmoji}>{liarCaught ? '🕵️ اتكشف الكاذب!' : '🤥 الكاذب نجا!'}</Text>
            <Text style={[s.resultLiarName, { color: liarCaught ? '#ef4444' : '#10b981' }]}>
              {liarName} كان الكاذب
            </Text>
            <Text style={[s.resultWord, { color: theme.textMuted }]}>
              الكلمة الصحيحة: <Text style={{ color: ACCENT, fontWeight: '700' }}>{wordPair.common}</Text>
            </Text>
            <Text style={[s.resultWord, { color: theme.textMuted }]}>
              كلمة الكاذب: <Text style={{ color: '#ef4444', fontWeight: '700' }}>{wordPair.fake}</Text>
            </Text>
            {liarCaught && (
              <Text style={[s.resultWord, { color: lyingRight ? '#10b981' : '#ef4444' }]}>
                {lyingRight ? `✅ ${liarName} خمّن الكلمة صح (+${POINTS_LIAR_GUESS})` : `❌ ${liarName} لم يخمّن`}
              </Text>
            )}
          </View>

          <Text style={[s.sectionLabel, { color: theme.textSecondary }]}>📊 النقاط</Text>
          {sortedPlayers.map(([uid, p], i) => (
            <View key={uid} style={[s.scoreRow, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
              <Text style={[s.scoreRank, { color: i === 0 ? ACCENT : theme.textMuted }]}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
              </Text>
              <Text style={[s.scoreName, { color: uid === myUid ? ACCENT : theme.textPrimary }]}>
                {p.name}{uid === myUid ? ' (أنت)' : ''}
              </Text>
              <Text style={[s.scorePoints, { color: ACCENT }]}>{p.score || 0} نقطة</Text>
            </View>
          ))}

          {isHost && (
            <ThemedButton
              onPress={nextOnlineRound}
              label={round >= TOTAL_ROUNDS ? '🏆 النتيجة النهائية' : `جولة ${round + 1} →`}
              variant='primary' size='large'
              style={{ marginTop: 20, width: '80%', alignSelf: 'center' }}
            />
          )}
          {!isHost && (
            <View style={[s.waitingNote, { backgroundColor: theme.bgCard, borderColor: ACCENT_B }]}>
              <ActivityIndicator size="small" color={ACCENT} />
              <Text style={[s.waitingNoteText, { color: theme.textMuted }]}>انتظر المضيف...</Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  // ── النهائية أونلاين ──────────────────────────────────
  if (phase === 'final') {
    const sortedPlayers = Object.entries(players).sort(([,a],[,b]) => (b.score||0) - (a.score||0));
    const winnerName = sortedPlayers[0]?.[1]?.name || '?';

    return (
      <View style={[s.flex, { backgroundColor: 'transparent' }]}>
        <StatusBar barStyle={theme.statusBar} />
        <ScrollView contentContainerStyle={s.resultContent}>
          <Text style={s.finalEmoji}>🏆</Text>
          <Text style={[s.finalTitle, { color: ACCENT }]}>انتهت اللعبة!</Text>
          <Text style={[s.finalWinner, { color: theme.textPrimary }]}>
            الفائز: <Text style={{ color: ACCENT, fontWeight: '800' }}>{winnerName}</Text>
          </Text>

          {sortedPlayers.map(([uid, p], i) => (
            <View key={uid} style={[s.scoreRow, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
              <Text style={[s.scoreRank, { color: i === 0 ? ACCENT : theme.textMuted }]}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
              </Text>
              <Text style={[s.scoreName, { color: uid === myUid ? ACCENT : theme.textPrimary }]}>
                {p.name}{uid === myUid ? ' (أنت)' : ''}
              </Text>
              <Text style={[s.scorePoints, { color: ACCENT }]}>{p.score || 0} نقطة</Text>
            </View>
          ))}

          <ThemedButton
            onPress={onBack}
            label='🏠 العودة'
            variant='primary' size='large'
            style={{ marginTop: 24, width: '80%', alignSelf: 'center' }}
          />
        </ScrollView>
      </View>
    );
  }

  return <LoadingView theme={theme} />;
}

function LoadingView({ theme }) {
  return (
    <View style={[s.flex, { backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' }]}>
      <ActivityIndicator size="large" color={ACCENT} />
    </View>
  );
}

// ══════════════════════════════════════════════════════════
//  ستايلات
// ══════════════════════════════════════════════════════════
const s = StyleSheet.create({
  flex:              { flex: 1 },

  // ── هيدر ──────────────────────────────────────────────
  safeHeader:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                       paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12, gap: 8 },
  gameHeader:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                       paddingHorizontal: 16, paddingTop: 52, paddingBottom: 10, gap: 8 },
  backBtn:           { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  quitBtn:           { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  headerTitle:       { fontSize: 17, fontWeight: '800' },
  headerIcon:        { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  roundPill:         { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12 },

  // ── قائمة ──────────────────────────────────────────────
  bgDeco:            { position: 'absolute', top: 80, left: 0, right: 0, alignItems: 'center', opacity: 0.05 },
  bgDecoText:        { fontSize: 220 },
  menuCenter:        { flex: 1, paddingHorizontal: 20, paddingTop: 20, alignItems: 'center', justifyContent: 'center' },
  menuEmoji:         { fontSize: 64, marginBottom: 8 },
  menuTitle:         { fontSize: 30, fontWeight: '900', marginBottom: 4 },
  menuSub:           { fontSize: 14, marginBottom: 24, textAlign: 'center' },
  modeRow:           { flexDirection: 'row', gap: 16, marginBottom: 24 },
  modeCard:          { flex: 1, borderRadius: 18, borderWidth: 1.5, paddingVertical: 20,
                       alignItems: 'center', gap: 6 },
  modeCardEmoji:     { fontSize: 32 },
  modeCardTitle:     { fontSize: 16, fontWeight: '800' },
  modeCardDesc:      { fontSize: 12, textAlign: 'center', lineHeight: 18 },
  rulesBox:          { width: '100%', borderRadius: 14, borderWidth: 1, padding: 14, gap: 8 },
  rulesTitle:        { fontSize: 14, fontWeight: '800', marginBottom: 4 },
  ruleRow:           { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ruleIcon:          { fontSize: 16 },
  ruleText:          { fontSize: 12, flex: 1 },

  // ── إعداد ──────────────────────────────────────────────
  setupContent:      { paddingHorizontal: 16, paddingBottom: 32, paddingTop: 8 },
  sectionLabel:      { fontSize: 13, fontWeight: '700', marginBottom: 8, marginTop: 4 },
  catChip:           { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  catChipText:       { fontSize: 13, fontWeight: '600' },
  inputRow:          { flexDirection: 'row', gap: 8, marginBottom: 10 },
  input:             { flex: 1, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14,
                       paddingVertical: 10, fontSize: 15, textAlign: 'right' },
  addBtn:            { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  addBtnText:        { color: '#fff', fontSize: 22, fontWeight: '700' },
  playersList:       { gap: 6, marginBottom: 16 },
  playerChip:        { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12,
                       borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  chipNum:           { width: 24, height: 24, borderRadius: 12, color: '#fff', fontSize: 12,
                       fontWeight: '800', textAlign: 'center', lineHeight: 24 },
  chipName:          { flex: 1, fontSize: 14, fontWeight: '600' },
  startBtn:          { borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  startBtnText:      { color: '#fff', fontSize: 16, fontWeight: '800' },

  // ── عرض الكلمة ─────────────────────────────────────────
  revealCenter:      { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  revealStep:        { fontSize: 13, marginBottom: 12 },
  revealCard:        { width: '100%', borderRadius: 20, borderWidth: 1.5, padding: 24, alignItems: 'center', gap: 10 },
  revealPlayerName:  { fontSize: 22, fontWeight: '900' },
  revealInstruction: { fontSize: 14, textAlign: 'center' },
  wordRevealBox:     { alignItems: 'center', gap: 8 },
  wordRevealLabel:   { fontSize: 12, fontWeight: '600' },
  wordRevealValue:   { fontSize: 36, fontWeight: '900' },
  wordRevealHint:    { fontSize: 12, textAlign: 'center' },
  catBadge:          { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12, borderWidth: 1, marginTop: 16 },
  catBadgeText:      { fontSize: 12 },

  // ── نقاش ───────────────────────────────────────────────
  discussCenter:     { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  discussEmoji:      { fontSize: 64, textAlign: 'center', marginBottom: 8 },
  discussTitle:      { fontSize: 24, fontWeight: '900', textAlign: 'center', marginBottom: 8 },
  discussDesc:       { fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 16 },
  instructBox:       { width: '100%', borderRadius: 14, borderWidth: 1, padding: 14, gap: 8 },
  instructTitle:     { fontSize: 14, fontWeight: '800' },
  instructText:      { fontSize: 13, lineHeight: 20 },

  // ── تصويت ──────────────────────────────────────────────
  voteContent:       { flex: 1, paddingHorizontal: 20, paddingTop: 16, alignItems: 'center', gap: 12 },
  timerRow:          { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12,
                       borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8, width: '100%' },
  timerNum:          { fontSize: 22, fontWeight: '900', width: 32, textAlign: 'center' },
  timerBarBg:        { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  timerBarFill:      { height: '100%', borderRadius: 3 },
  timerLabel:        { fontSize: 12, width: 12 },
  voteVoterName:     { fontSize: 22, fontWeight: '900' },
  voteQuestion:      { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  voteChoices:       { width: '100%', gap: 8 },
  voteChoice:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                       borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 13 },
  voteChoiceName:    { fontSize: 16, fontWeight: '700' },

  // ── نتائج ──────────────────────────────────────────────
  resultContent:     { padding: 20, gap: 8, paddingBottom: 40 },
  resultHeader:      { borderRadius: 18, borderWidth: 1, padding: 16, alignItems: 'center', gap: 6, marginBottom: 8 },
  resultEmoji:       { fontSize: 22, fontWeight: '800', textAlign: 'center' },
  resultLiarName:    { fontSize: 18, fontWeight: '800' },
  resultWord:        { fontSize: 13, textAlign: 'center' },
  voteResultRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10,
                       borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  voteResultVoter:   { flex: 1, fontSize: 13 },
  voteResultTarget:  { fontSize: 13 },
  scoreRow:          { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12,
                       borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
  scoreRank:         { fontSize: 20, width: 32 },
  scoreName:         { flex: 1, fontSize: 14, fontWeight: '700' },
  scorePoints:       { fontSize: 14, fontWeight: '800' },

  // ── نهائي ──────────────────────────────────────────────
  finalEmoji:        { fontSize: 64, textAlign: 'center', marginBottom: 4 },
  finalTitle:        { fontSize: 28, fontWeight: '900', textAlign: 'center', marginBottom: 4 },
  finalWinner:       { fontSize: 18, textAlign: 'center', marginBottom: 16 },

  // ── مشترك ──────────────────────────────────────────────
  bigBtn:            { borderRadius: 14, paddingVertical: 14, paddingHorizontal: 24, alignItems: 'center' },
  bigBtnText:        { color: '#fff', fontSize: 16, fontWeight: '800' },
  scoreChip:         { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
  scoreChipText:     { fontSize: 12, fontWeight: '700' },

  // ── أونلاين ────────────────────────────────────────────
  onlinePlayContent: { paddingBottom: 32 },
  waitingContent:    { padding: 16, paddingBottom: 40 },
  codeBadge:         { borderRadius: 18, borderWidth: 2, padding: 20, alignItems: 'center', gap: 4, marginBottom: 20 },
  codeLabel:         { fontSize: 12, fontWeight: '600' },
  codeValue:         { fontSize: 38, fontWeight: '900', letterSpacing: 8 },
  codeHint:          { fontSize: 12 },
  codeInput:         { borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 20, paddingVertical: 14,
                       fontSize: 28, fontWeight: '800', textAlign: 'center', letterSpacing: 8, width: '70%' },
  waitingNote:       { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12,
                       borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12, marginTop: 12 },
  waitingNoteText:   { fontSize: 14 },
  heartNote:         { borderRadius: 12, borderWidth: 1, padding: 12, marginTop: 8 },
  heartNoteText:     { fontSize: 12, textAlign: 'center' },
});
