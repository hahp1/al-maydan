/**
 * TruthDareScreen.js
 * ════════════════════════════════════════════════
 *  النمط المخصص: المحقق يسأل أو يتحدى شفهياً كما كان
 *  النمط الجاهز: تظهر 5 خيارات عشوائية من البنك، المحقق يختار واحداً
 */

import { useState, useRef, useEffect, useCallback, memo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Easing, StatusBar, ScrollView, TextInput,
  KeyboardAvoidingView, Platform, Dimensions,
} from 'react-native';
import Svg, { Path, Circle, Line, Text as SvgText, G } from 'react-native-svg';
import { useTheme } from './ThemeContext';
import ExitButton from './ExitButton';
import { useT, useRTLStyles, useLanguage } from './I18n';
import { TruthDareEngraving } from './GameEngraving';
import { WebScreenButton, GameInfoButton } from './WebRoomService';
import { ThemedButton, ThemedCard, ThemedPill, ThemedModal, ThemedRow } from './ThemedComponents';

// ── ثوابت ──────────────────────────────────────────────────────────────
const TURNS_PER_PLAYER = 3;
const TRUTH_PTS = 10;
const DARE_PTS  = 15;
const { width: SW } = Dimensions.get('window');
const WHEEL_SIZE = Math.min(SW * 0.78, 300);
const WHEEL_R    = WHEEL_SIZE / 2;

const SLICE_COLORS_DARK  = ['#7c3aed','#db2777','#0891b2','#d97706','#059669','#dc2626','#2563eb','#7c3aed'];
const SLICE_COLORS_LIGHT = ['#8b5cf6','#ec4899','#0ea5e9','#f59e0b','#10b981','#ef4444','#3b82f6','#a855f7'];

// ══════════════════════════════════════════════════════════════
//  بنك المحتوى — التحديات
// ══════════════════════════════════════════════════════════════
const DARES_AR = [
  // اتصال / رسائل
  'اتصل بأبوك وقوله "ماما، الحين وين أنتي؟"',
  'اتصل بأمك وقوله "ابوي، خلّصت الأكل؟"',
  'ارسل لأول شخص في قائمة اتصالاتك: "أحبك من قلبي ❤️"',
  'اتصل بأي شخص من قائمة اتصالاتك وغنّيله "عيد ميلاد سعيد"',
  'ارسل ستيكر قلب لآخر شخص راسلته',
  'ارسل لصديقك: "محتاج رأيك بشيء مهم... أنا فاكر إنك أحسن واحد عرفته"',
  'اتصل بشخص عشوائي من قائمتك وقله "بس كنت أطمن عليك"',
  'ارسل لأمك أو أبوك: "شوقتوني، متى ترجعون؟" حتى لو في نفس الغرفة',
  'اتصل بأحد أصدقائك وقله إن لون ملابسه اليوم يعجبك',
  'ارسل لشخص ما راسلته من أسبوع: "كنت أتمنى تكون هنا اليوم"',
  'ارسل لصديقك في مجموعة العائلة: "أنا شايف كل واحد فيكم"',
  'اتصل برقم عشوائي من قائمتك وقله "مشتاق لك والله"',
  // حركات
  'ارقص لمدة دقيقة على أغنية يختارها المجموعة',
  'قلّد أي شخص في المجموعة لمدة 30 ثانية',
  'امش وتكلم بعكس يدك المفضلة طول الجولة الجاية',
  'اعمل 10 قعدات (سكوات) هنا الحين',
  'قف على رجل واحدة لمدة 30 ثانية',
  'اعمل إيموجي 😱 بوجهك وخلّه هكذا 20 ثانية',
  'امشي زي بطة من باب للباب',
  'اعمل نفسك روبوت لمدة دقيقتين ما تتكلم إلا زي روبوت',
  'قلّد إعلان إذاعي لمنتج تخيّله',
  'ارسم صورتك على ورقة في 10 ثواني وعرّضها على الجميع',
  'تكلم بصوت ولا طفل صغير لمدة دقيقتين كاملتين',
  'قلّد مقدم نشرة أخبار وقرأ آخر رسالة في جوالك بجدية تامة',
  'اعمل نفسك تذوّق أكل خيالي وعبّر بوجهك عنه',
  // أسئلة اجتماعية
  'أضف شيء محرج في قصتك في الانستقرام لمدة دقيقة واحدة',
  'اكتب تغريدة أو بوست تقول فيها "عيد ميلادي اليوم" وانشرها',
  'غيّر اسمك في المجموعة لأي شيء يختاره اليسار منك لمدة الجلسة',
  'اكتب مديح عن شخص تختاره المجموعة وأرسله له الحين',
  'اعترف بشيء لم يعرفه أحد في المجموعة من قبل',
  'شارك آخر صورة في كاميرا رولك',
  'اتصل بصديقك وقله إن فيلم أو مسلسل معين غيّر حياتك تماماً',
  'غنّ المقطع الأول من أغنيتك المفضلة أمام الجميع',
  'قلّد أحد أهلك وهو يصحّيك الصباح',
  'اعمل خطبة تشجيعية لمدة 30 ثانية لفريق رياضي خسران',
  // تحديات إبداعية
  'اخترع منتجاً غريباً وسوّقه لمدة 30 ثانية',
  'اشرح كيف تصنع طبق طعام بدون ما تذكر اسمه',
  'قل 10 أشياء تبدأ بحرف "م" في 10 ثواني',
  'قل 5 ألوان بالإنجليزي في 5 ثواني',
  'أجب على كل سؤال يُطرح عليك بسؤال مقابل لمدة دقيقة',
  'تكلم عن نفسك بصيغة الغائب لمدة دقيقة',
  'اخترع قانوناً غريباً وطبّقه على المجموعة لمدة دورتين',
  'اعمل نفسك مترجم فوري لشخص يتكلم عربي وترجم بشكل عشوائي',
  // تحديات بين اللاعبين
  'اعطِ الشخص اليمين منك ثلاثة مدائح صادقة',
  'قل الشيء الأكثر إيجابية يمكن قوله عن كل شخص في المجموعة',
  'اطلب من الشخص الأمام ما يطلبه منك بالمعنى العكسي',
  'صافح كل شخص في المجموعة بطريقة مختلفة',
  'اعطِ الشخص الأصغر في المجموعة نصيحة حكيمة بثلاثة كلمات فقط',
  // تحديات الجوال
  'اعرض آخر بحث قوم به في قوقل على الجميع',
  'اعرض آخر فيديو شفته على يوتيوب',
  'اعرض أكثر تطبيق مفتوح على جوالك',
  'شارك آخر مقطع أرسلته لأحد',
  'اعرض آخر 3 أغاني سمعتها',
  // تحديات بالأكل والمكان
  'كل أي شيء يختاره الشخص اليسار منك من الطاولة',
  'اشرب ماء بدون تحريك يديك',
  'غيّر مكان جلوسك مع أي شخص تختاره المجموعة وابق هناك لدورتين',
  // مضحكة
  'احك أضحك نكتة عندك وإذا ما ضحك أحد كرر مرتين',
  'تظاهر أن جوالك اتصل بيك وأجب وكلّم نفسك لمدة دقيقة',
  'ابدأ جملتك بـ"بسم الله" في كل مرة تتكلم لمدة 3 دورات',
  'قل كلمة "بالضبط" بعد كل جملة تقولها لمدة دقيقتين',
  'اعمل نفسك ترى شبح في زاوية الغرفة وتفاعل معه',
  'تصرف وكأنك فقدت ذاكرتك قصيرة المدى لمدة دورة واحدة',
  // اجتماعية حديثة
  'افتح سوشال ميديا واعمل لايف لـ5 ثواني',
  'اكتب رأيك الحقيقي في آخر فيلم شفته وأرسله في مجموعة العائلة',
  'غيّر صورة بروفايلك في واتساب لصورة يختارها المجموعة لمدة ساعة',
  'ارسل ستيكر عشوائي لكل شخص في قائمة "المفضلة" عندك',
  'اكتب وصف بروفايل جديد "About" في واتساب يختاره الشخص الأمامك',

  // تحديات صوتية وأداء
  'غنّي بصوت أوبرا لمدة 20 ثانية',
  'اقرأ آخر رسالة وصلتك بنبرة إعلانية دعائية',
  'قلّد صوت الملاحة (قوقل ماب) وأرشد شخص للحمام',
  'اعمل نفسك مذيع تلفزيون تنقل أحداث الجلسة هذه',
  'تكلم بلهجة خليجية مختلفة عن لهجتك لمدة دورتين',
  'اعمل صوت حيوان تختاره المجموعة كلما تكلم أحد لمدة دقيقة',
  'قلّد طريقة كلام أحد أفراد عيلتك وخلّ المجموعة تخمّن مَن',
  'اعمل نفسك تعلّم الأطفال حرف من الحروف بحماس مبالغ',
  // تحديات كتابية
  'اكتب قصيدة من 4 أسطر عن الشخص اليمين منك في 60 ثانية',
  'اكتب إعلان وظيفة لدور "صاحب الجلسة" وشاركه بالمجموعة',
  'ارسل رسالة دعائية لنفسك وكأنك تبيع نفسك بالمزاد',
  'اكتب تقييم نجمتين على "تجربة حياتك حتى الآن"',
  'ارسل تعليقاً إيجابياً كاذباً على صورة قديمة لشخص في المجموعة',
  // تحديات جسدية خفيفة
  'اعمل تمرين "الجسر" لمدة 15 ثانية',
  'امشِ بعيونك مغمضة من نقطة لنقطة يختارها الجميع',
  'اجلس بدون كرسي (هواء) لمدة 20 ثانية',
  'اعمل حركة يوغا عشوائية وخلّ الجميع يصورون',
  'حاول تلمس أنفك بلسانك',
  // تحديات مع الجوال
  'اعرض شاشتك الرئيسية ووصف كل تطبيق فيها بجملة واحدة',
  'شغّل أغنية عشوائية من مكتبتك وارقص عليها 10 ثواني',
  'ارسل لمجموعة العائلة: "الجو حلو ويعطيكم العافية 🌸"',
  'اعرض آخر شيء اشتريته أونلاين على الجميع',
  'اعرض آخر بودكاست أو فيديو حفظته',
  // تحديات إبداعية إضافية
  'اخترع اسم شركة وشعارها وكلمة تسويقية في 30 ثانية',
  'احكِ قصة رعب قصيرة مدتها 45 ثانية',
  'اعمل نفسك تقدم برنامج طبخ وأنت تصنع "طبق" خيالي',
  'اشرح مفهوم "الوقت" لشخص من كوكب آخر',
  'اخترع كلمة عربية جديدة وعرّفها للمجموعة',
  'اكتب عنوان فيلم يصف آخر أسبوع في حياتك',
  'اعمل نفسك محامي يدافع عن قرار غبي اتخذته مؤخراً',
  // تحديات مع المجموعة
  'أجرِ مقابلة عمل مع الشخص أمامك مدتها 30 ثانية',
  'اعطِ كل شخص في المجموعة لقباً يناسبه واشرح لماذا',
  'تظاهر أن الشخص اليمين منك نجم مشهور وأطلب منه توقيعاً',
  'ابدأ جملة وكل شخص في المجموعة يكمل كلمة حتى تصير جملة كاملة',
  'قيّم الجلسة هذه بنجمة من خمسة واشرح',
  // تحديات مضحكة إضافية
  'قف وخطب في الجميع عن مشكلة صغيرة كأنها أزمة عالمية',
  'تظاهر إنك تُترجم كلام الشخص بجانبك لغة إشارة (اخترع)',
  'اعمل نفسك مراسل إخباري تنقل من "موقع الجلسة"',
  'اعمل موجة (la ola) وحدك',
  'قلّد كيف يمشي كل شخص في المجموعة واحد بعد الآخر',
  'تكلم بكلمتين فقط في كل جملة لمدة دورة',
  // تحديات اجتماعية إضافية
  'ارسل لأكبر شخص في قائمتك: "كيف تسوّي قهوة؟ حاسس إنك خبير"',
  'اكتب رسالة اعتراف بخطأ لشخص ما وأرسلها فعلاً',
  'ارسل لصديق لم تتكلم معه شهر: "فكرت فيك اليوم بدون سبب"',
  'اتصل بأحد وقله "عندي خبر مهم" ثم قله "اهتم بصحتك"',
  'ارسل لشخص في قائمتك: "أنت من أكثر الناس اللي يستاهلون"',

  // تحديات صوتية وأداء
  'غنّ بصوت أوبرا مبالغ لمدة 20 ثانية',
  'اقرأ آخر رسالة وصلتك بنبرة إعلان تجاري',
  'قلّد صوت الملاحة جوجل ماب وأرشد شخص للحمام',
  'اعمل نفسك مذيع تلفزيون تنقل أحداث الجلسة',
  'تكلم بلهجة مختلفة عن لهجتك طول الجولة الجاية',
  'اعمل صوت حيوان تختاره المجموعة كلما تكلم أحد لمدة دقيقة',
  'قلّد طريقة كلام شخص من عيلتك وخل المجموعة تخمن',
  'اعمل نفسك تعلم أطفالاً حرف عربي بحماس مبالغ فيه',
  // تحديات كتابية
  'اكتب قصيدة 4 أسطر عن الشخص اليمين منك في 60 ثانية',
  'ارسل رسالة تبيع فيها نفسك وكأنك بضاعة بالمزاد',
  'اكتب تقييم نجمتين من خمس على "تجربة حياتك حتى الآن"',
  'ارسل تعليقاً إيجابياً مبالغاً على صورة قديمة لشخص في المجموعة',
  'اكتب عنوان فيلم يصف آخر أسبوع في حياتك',
  // تحديات جسدية خفيفة
  'اعمل تمرين الجسر لمدة 15 ثانية',
  'امش بعيونك مغمضة من نقطة لنقطة يختارها الجميع',
  'اجلس بدون كرسي هواء لمدة 20 ثانية',
  'اعمل حركة يوغا عشوائية وخل الجميع يصورون',
  'حاول تلمس أنفك بلسانك',
  'اعمل بوش أبس بيد واحدة أو ادعي إنك تحاول',
  // تحديات الجوال إضافية
  'اعرض شاشتك الرئيسية وصف كل تطبيق فيها بجملة',
  'شغل أغنية عشوائية وارقص عليها 10 ثواني',
  'ارسل لمجموعة العائلة: "الجو حلو ويعطيكم العافية"',
  'اعرض آخر شيء اشتريته أونلاين على الجميع',
  'اعرض آخر بودكاست أو فيديو حفظته',
  'غيّر نغمة رنينك لشيء يختاره الجميع لمدة 10 دقائق',
  'ارسل صوتية مدتها 10 ثواني لشخص عشوائي في قائمتك',
  // تحديات إبداعية إضافية
  'اخترع اسم شركة وشعار وكلمة تسويقية في 30 ثانية',
  'احكِ قصة رعب قصيرة في 45 ثانية',
  'اعمل نفسك تقدم برنامج طبخ وأنت تصنع طبق خيالي',
  'اشرح مفهوم الوقت لشخص من كوكب آخر',
  'اخترع كلمة عربية جديدة وعرّفها للمجموعة',
  'اعمل نفسك محامي يدافع عن قرار غبي اتخذته مؤخراً',
  'صف رائحة الهواء بعشر صفات مختلفة',
  'اشرح كيف تطير الطائرة بكلام طفل عمره 5 سنوات',
  // تحديات مع المجموعة
  'أجرِ مقابلة عمل مع الشخص أمامك 30 ثانية',
  'اعطِ كل شخص في المجموعة لقباً يناسبه واشرح',
  'تظاهر إن الشخص اليمين منك نجم وطلب توقيعه',
  'قيّم الجلسة بنجمة من خمسة واشرح رأيك بصدق',
  // تحديات مضحكة إضافية
  'قف وخطب في الجميع عن مشكلة صغيرة كأنها أزمة دولية',
  'تظاهر إنك تترجم كلام الشخص بجانبك لغة إشارة خيالية',
  'اعمل نفسك مراسل إخباري تنقل من موقع الجلسة',
  'اعمل موجة لا أولا وحدك',
  'قلّد طريقة مشي كل شخص في المجموعة الواحد بعد الآخر',
  'تكلم بكلمتين فقط في كل جملة لمدة دورة',
  'قل كلمة "مثيرة للاهتمام" بعد كل جملة تسمعها لمدة 2 دورة',
  // تحديات اجتماعية إضافية
  'ارسل لأكبر شخص في قائمتك: "كيف تسوي قهوة؟ حاسس إنك خبير"',
  'اكتب رسالة اعتراف بخطأ لشخص ما وأرسلها فعلاً الحين',
  'ارسل لصديق ما تكلمته شهر: "فكرت فيك اليوم بدون سبب"',
  'اتصل بأحد وقله "عندي خبر مهم" ثم قله "اهتم بصحتك"',
  'ارسل لشخص في قائمتك: "أنت من أكثر الناس اللي يستاهلون"',
  'ارسل لصديقك: "أنا عارف سرك" ولما يرد قله "اللي ما تعرف نفسك تريحها"',
  'اتصل بأمك الآن وغنّيلها أي أغنية تختارها المجموعة',
  'ارسل لآخر شخص في محادثاتك: "اشتقت لك بصراحة"',
];

// ══════════════════════════════════════════════════════════════
//  بنك المحتوى — الأسئلة
// ══════════════════════════════════════════════════════════════
const TRUTHS_AR = [
  // محرجة خفيفة
  'ما آخر كذبة قلتها على أهلك؟',
  'من أكثر شخص يزعجك في المجموعة هذي؟ (قله بصراحة)',
  'ما الشيء اللي تعمله في السر وتخجل منه لو علم به أحد؟',
  'كم مرة رددت على رسالة بـ"أوكي" وأنت تقصد العكس؟',
  'ما أغرب سبب اعتذرت به من موعد؟',
  'من آخر شخص بحثت عنه في الانستقرام؟',
  'كم مرة تفحص جوالك بعد ما تنام؟',
  'ما الشيء اللي اشتريته وما استخدمته ولا مرة؟',
  'من آخر شخص حلمت فيه؟',
  'ما السبب الحقيقي لآخر مرة تأخرت فيها؟',
  'هل سبق وأخبرت شخص بسر شخص آخر؟',
  'ما أكبر تظاهر قمت به أمام الناس؟',
  'ما الإيموجي اللي ترسله أكثر ولما تشوفه تحس بالحرج؟',
  'كم مرة بدأت تكتب رسالة وحذفتها قبل ما ترسلها اليوم؟',
  'ما أكثر شيء تندم على قوله في الأسبوع الماضي؟',
  // عائلية
  'من أقرب واحد لك في عيلتك ولماذا؟',
  'ما أكثر حاجة تقوم بها والدتك تزعجك لكن تبتسم من الداخل؟',
  'ما آخر مرة كذبت على أبوك وما هي القصة؟',
  'ما الشيء الذي لا تستطيع قوله لعيلتك لكن تودّ لو تقوله؟',
  'من في عيلتك يفهمك أكثر من الجميع؟',
  // صداقات
  'ما أسوأ هدية تلقيتها من صديق وتظاهرت أنها تعجبك؟',
  'من في المجموعة تعتقد إنه ما يعرفك حق معرفتك؟',
  'ما أكثر شيء تحسد عليه صديقك في هذه المجموعة؟',
  'هل سبق وشعرت أن صديقك الأقرب خذلك؟',
  'هل تتمنى أنك تغيّر رأي أحدهم فيك؟ من هو ولماذا؟',
  // مضحكة
  'ما أغرب فكرة خطرت ببالك هذا الأسبوع؟',
  'ما الشيء الذي تتظاهر أنك تفهم فيه وما تفهم منه شيئاً؟',
  'ما آخر مسلسل بكيت فيه وما صدّقت نفسك؟',
  'كم ساعة تقضيها يومياً على التيك توك أو الريلز؟',
  'ما أكثر عذر استخدمته لرفض دعوة اجتماعية؟',
  'ما آخر صورة سيلفي التقطتها ولم تنشرها؟ لماذا؟',
  'ما أغرب شيء أكلته وعجبك؟',
  'هل لديك نغمة رنين محرجة ما تعترف بها؟',
  'ما أكثر أغنية تغنيها وحدك في السيارة؟',
  'ما آخر فيديو أضحكك وأنت وحدك؟',
  // طموحات وأحلام
  'ما الحلم الذي تخجل من قوله للناس؟',
  'ما المهنة التي كنت تتمناها في طفولتك وتتمنى لو تحققت؟',
  'ما الشيء الذي كسرت وعداً لنفسك بخصوصه أكثر من مرة؟',
  'لو عندك مليون ريال اليوم، ما أول شيء تسوي؟',
  'ما الشيء اللي تمنيت ما تعلمه؟',
  // اجتماعية ومحرجة أكثر
  'هل سبق وتجسست على أحد في السوشال ميديا لفترة طويلة؟',
  'ما الشيء الذي فعلته لجذب انتباه أحدهم وما نجح؟',
  'هل سبق وأرسلت رسالة لشخص خطأ؟ وماذا كانت؟',
  'ما أكثر رأي تقوله بينك وبين نفسك لكن لا تجرؤ على قوله علناً؟',
  'من الشخص الذي تودّ لو تعتذر له الآن؟',
  'ما الشيء الذي تفعله ولو علم به أصدقاؤك لتفاجأوا؟',
  'هل سبق وادّعيت أنك مريض لتتهرب من شيء؟',
  'ما أكبر سر يعرفه شخص واحد فقط عنك؟',
  'هل سبق وأنهيت صداقة بطريقة لا تفخر بها؟',
  'هل تتذكر آخر مرة اعتذرت حقاً وكنت تقصد ذلك؟',
  // أسئلة وجدانية
  'ما الشيء الذي تتمنى أن تغيّره في نفسك؟',
  'ما أصعب شيء مررت فيه وخرجت منه أقوى؟',
  'هل أنت سعيد الآن بشكل عام؟ لماذا أو لماذا لا؟',
  'ما آخر شيء جعلك تتوقف وتتأمل الحياة؟',
  'ما النصيحة التي لو قالها لك نفسك قبل 5 سنوات كانت ستغيّر شيئاً؟',
  // علاقات
  'ما أكثر شيء يبحث عنه الناس فيك وأنت تعتقد أنه مش حقيقياً؟',
  'هل سبق وأحسست بالغيرة من أحد في هذه المجموعة؟',
  'ما أول شيء تلاحظه في الشخص الجديد؟',
  'ما الصفة التي تجذبك بالناس لكن تجعلك تبتعد أحياناً؟',
  'هل تعتقد أن الناس يرونك كما أنت حقاً؟',
  // مضحكة محرجة
  'كم مرة تصحّح النبضات لإيهام نفسك أن الوقت لم يأتِ للنوم؟',
  'ما أغرب بحث قمت به على يوتيوب هذا الشهر؟',
  'هل تغني في الحمام؟ ما الأغنية المفضلة هناك؟',
  'هل تتحدث مع نفسك؟ ما آخر شيء قلته لنفسك؟',
  'ما الأكلة التي تأكلها سراً ولا تعترف بها أمام الآخرين؟',
  'ما أكثر عادة عندك تعتقد إن الناس ما يعرفون فيها؟',
  'هل نسيت يوماً اسم أحد وتظاهرت أنك تتذكره؟',
  'ما آخر مرة ضحكت حتى بكيت؟ وما السبب؟',
  'هل حفظت رقم هاتف أحد حذفته من قائمتك؟',
  'كم مرة أعدت مشاهدة نفس الفيلم أو المسلسل؟',
  // أسئلة عن المجموعة
  'من في المجموعة أكثر واحد يتجنب الجدي؟',
  'لو كانت المجموعة فرقة موسيقية من يلعب دور المغني؟',
  'من في المجموعة أكثر واحد تثق برأيه؟',
  'لو سافرت مع شخص واحد من المجموعة، من ستختار؟',
  'من في المجموعة أكثر واحد تتمنى إنك تتعلم شيئاً منه؟',
  'لو كانت المجموعة شخصية واحدة، ما وصفها؟',

  // محرجة متوسطة
  'ما أكثر تصرف تندم عليه أمام أصدقائك؟',
  'هل سبق وسرقت شيئاً صغيراً؟ وما القصة؟',
  'ما أغرب سبب جعلك تُحب أغنية معينة؟',
  'ما الاعتقاد الغريب الذي تؤمن به ويضحك الناس منه؟',
  'لو تقدر تحذف ذكرى واحدة من ذاكرتك، ما هي؟',
  'هل تتظاهر أنك لم تر رسالة لتتجنب الرد عليها؟',
  'ما أكبر غلطة ارتكبتها وما اعترفت بها لأحد؟',
  'ما الشيء الذي تعمله سراً وتعتقد إن ما أحد يعمله غيرك؟',
  'ما أغرب فوبيا أو خوف غير منطقي عندك؟',
  'هل سبق وتجسست على جوال أحد؟',
  // عن الماضي
  'ما أحرج موقف مررت فيه في المدرسة أو الجامعة؟',
  'ما الشيء الذي أقسمت تتركه ورجعت إليه أكثر من مرة؟',
  'ما الشيء الذي خسرته وأتمنى لو استرجعته؟',
  'ما أغرب هواية مررت فيها وتوقفت عنها؟',
  'ما الشخصية التي كنت تتمنى تكونها في طفولتك؟',
  // عن المجموعة
  'من في المجموعة أكثر واحد تلجأ إليه وقت المشاكل؟',
  'لو قدرت تبدّل حياتك مع أحد في المجموعة، مَن ستختار ولماذا؟',
  'ما أكثر شيء أدهشك من أحد في المجموعة؟',
  'من في المجموعة تعتقد إنه سيصبح الأنجح في المستقبل؟',
  'هل سبق وغضبت من أحد في المجموعة ولم تقل له؟',
  // فلسفية وعميقة
  'ما الشيء الذي تعيد التفكير فيه قبل النوم كثيراً؟',
  'لو كان عندك يوم واحد لم يعرف عنه أحد، ما الذي ستفعله؟',
  'ما أكبر درس علّمتك إياه الحياة حتى الآن؟',
  'هل تعتقد أن الناس يحبونك لمن أنت أم لما تقدمه؟',
  'ما الجانب من شخصيتك الذي تخفيه عن الجميع؟',
  'لو تعرف تاريخ وفاتك، هل تريد أن تعرف؟ ولماذا؟',
  // مضحكة
  'ما أسخف شيء خسرت فيه نقاشاً؟',
  'كم مرة تنظر في المرآة يومياً تقريباً؟',
  'ما الفيلم أو المسلسل الذي تخجل أن تقول إنك تحبه؟',
  'هل سبق وتظاهرت أنك تضحك على نكتة ما فهمتها؟',
  'ما آخر شيء اشتريته وأنت نادم عليه؟',
  'هل تتحدث مع نفسك بصوت عالٍ؟ ما آخر شيء قلته؟',
  'ما أطول وقت مضيت بدون ما تحمم؟',
  'ما الطبق الذي تأكله وتقول إنك لا تحبه أمام الناس؟',
  'هل سبق وكذبت على طبيب؟ كيف؟',
  'ما أكثر عادة سيئة ولا تستطيع التركها؟',
  // عن التكنولوجيا والسوشال
  'كم ساعة تمضي على جوالك يومياً بصدق؟',
  'ما الحساب الذي تتابعه ولا تعترف به؟',
  'هل سبق وأنشأت حساباً مزيفاً؟ لأي غرض؟',
  'كم مرة شيّكت على منشور شخص لا تتابعه؟',
  'ما أسوأ تعليق أو رسالة ندمت على إرسالها؟',
  'ما آخر منشور أحببته بعد سنوات من نشره؟',
  // مواقف حياتية
  'ما أكثر قرار اتخذته وعارضك فيه الجميع وثبتّ عليه؟',
  'لو تعود لعمر 15، ما الشيء الذي ستغيره؟',
  'ما الشيء الذي تعمله بشكل مختلف عن معظم الناس وتفخر به؟',
  'ما الموقف الذي شعرت فيه أنك أكثر شجاعة مما تعتقد؟',
  'ما أكبر خطر أقدمت عليه وأسفر عن نتيجة جيدة؟',
  // محرجة عالية قليلاً
  'ما أكثر جملة قالها لك أحد وأثّرت فيك رغم مرور الوقت؟',
  'ما الشيء الذي تتمنى لو قلته لشخص فقدته؟',
  'من هو الشخص الذي تعتقد إنك لم تكن منصفاً له؟',
  'هل سبق وحسدت أحداً على شيء ولم تعترف؟',
  'ما الأمنية التي تخجل أن تذكرها حتى لنفسك؟',

  // محرجة متوسطة
  'ما أكثر تصرف تندم عليه أمام أصدقائك؟',
  'هل سبق وسرقت شيئاً صغيراً وما القصة؟',
  'ما الاعتقاد الغريب الذي تؤمن به ويضحك الناس منه؟',
  'لو تقدر تحذف ذكرى واحدة من ذاكرتك ما هي؟',
  'هل تتظاهر أنك لم تر رسالة لتتجنب الرد عليها؟',
  'ما أكبر غلطة ارتكبتها وما اعترفت بها لأحد؟',
  'ما أغرب فوبيا أو خوف غير منطقي عندك؟',
  'هل سبق وتجسست على جوال أحد؟',
  'ما أكثر جملة تقولها لنفسك في المرآة؟',
  'ما الشيء الذي تفعله وأنت متأكد ما أحد يعمله غيرك؟',
  // عن الماضي
  'ما أحرج موقف مررت فيه في المدرسة أو الجامعة؟',
  'ما الشيء الذي أقسمت تتركه ورجعت إليه أكثر من مرة؟',
  'ما أغرب هواية مررت فيها ثم تركتها؟',
  'ما الشخصية التي كنت تتمنى تكونها في طفولتك؟',
  'ما أكبر كذبة قلتها في مقابلة عمل أو دراسة؟',
  // عن المجموعة
  'من في المجموعة أكثر واحد تلجأ إليه وقت المشاكل؟',
  'لو قدرت تبدّل حياتك مع أحد في المجموعة من ستختار؟',
  'ما أكثر شيء أدهشك من أحد في المجموعة؟',
  'من في المجموعة تعتقد إنه سيصبح الأنجح مستقبلاً؟',
  'هل سبق وغضبت من أحد في المجموعة ولم تقل له؟',
  'من في المجموعة تظن إنه يخفي أكثر شيء عن الباقين؟',
  // فلسفية وعميقة
  'ما الشيء الذي تعيد التفكير فيه كثيراً قبل النوم؟',
  'لو كان عندك يوم لا يعرف عنه أحد ماذا ستفعل؟',
  'ما أكبر درس علّمتك إياه الحياة حتى الآن؟',
  'هل تعتقد الناس يحبونك لمن أنت أم لما تقدمه؟',
  'ما الجانب من شخصيتك الذي تخفيه عن الجميع؟',
  'لو تعرف تاريخ وفاتك هل تريد أن تعرف؟ ولماذا؟',
  'ما أكثر شيء تخاف منه في المستقبل؟',
  'لو كتبت كتاباً عن حياتك ما عنوانه؟',
  // مضحكة
  'ما أسخف شيء خسرت فيه نقاشاً؟',
  'كم مرة تنظر في المرآة يومياً تقريباً؟',
  'ما الفيلم أو المسلسل الذي تخجل أن تقول إنك تحبه؟',
  'هل سبق وتظاهرت أنك تضحك على نكتة ما فهمتها؟',
  'ما آخر شيء اشتريته وأنت نادم عليه؟',
  'ما أطول وقت مضيت بدون ما تحمم؟',
  'هل تتحدث مع نفسك بصوت عالٍ؟',
  'ما الطبق الذي تأكله سراً وتقول أمام الناس إنك لا تحبه؟',
  'هل سبق وكذبت على طبيب؟',
  'ما أكثر عادة سيئة ولا تستطيع تركها؟',
  'كم مرة ضغطت "تذكير لاحقاً" على تحديث الجوال؟',
  'ما أكثر بهانة استخدمتها لتتأخر في الصباح؟',
  // التكنولوجيا والسوشال
  'كم ساعة تمضي على جوالك يومياً بصدق؟',
  'ما الحساب الذي تتابعه ولا تعترف به؟',
  'هل سبق وأنشأت حساباً مزيفاً؟',
  'كم مرة شيّكت على منشور شخص لا تتابعه رسمياً؟',
  'ما أسوأ تعليق أو رسالة ندمت على إرسالها؟',
  'ما التطبيق الذي لو عرف أحد إنك تفتحه كثيراً تحرجت؟',
  'كم مرة حذفت تطبيقاً ثم أعدت تحميله؟',
  // مواقف حياتية
  'ما أكثر قرار اتخذته وعارضك الجميع وثبتّ عليه؟',
  'لو تعود لعمر 15 ما الشيء الذي ستغيره؟',
  'ما الشيء الذي تعمله بشكل مختلف عن الناس وتفخر به؟',
  'ما الموقف الذي شعرت فيه إنك أشجع مما تتخيل؟',
  // محرجة عميقة
  'ما أكثر جملة قالها لك أحد وأثّرت فيك رغم مرور الوقت؟',
  'ما الشيء الذي تتمنى لو قلته لشخص فقدته؟',
  'من هو الشخص الذي تعتقد إنك لم تكن منصفاً له؟',
  'هل سبق وحسدت أحداً على شيء ولم تعترف؟',
  'ما الأمنية التي تخجل أن تذكرها حتى لنفسك؟',
  'من هو آخر شخص اعتذرت له وكنت تقصد ذلك حقاً؟',
  'هل هناك شيء تعتذر منه لنفسك؟',
  'ما الشيء الذي كنت تتمناه كثيراً وتحقق لك وأهملته؟',
];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildVictimQueue(players) {
  let q = [];
  players.forEach(p => { for (let i = 0; i < TURNS_PER_PLAYER; i++) q.push(p.id); });
  return shuffle(q);
}

function pick5(pool, usedRef) {
  // اختر 5 عشوائية من البنك بدون تكرار حتى يُستنفد
  const remaining = pool.filter(item => !usedRef.current.has(item));
  if (remaining.length < 5) {
    usedRef.current.clear(); // إعادة تعيين عند الاستنفاد
    return shuffle([...pool]).slice(0, 5);
  }
  const chosen = shuffle(remaining).slice(0, 5);
  chosen.forEach(item => usedRef.current.add(item));
  return chosen;
}

// ══════════════════════════════════════════════════════════════
//  SpinWheel
// ══════════════════════════════════════════════════════════════
const SpinWheel = memo(({ players, excludeId, onDone, label, theme }) => {
  const COLORS = theme.isLight ? SLICE_COLORS_LIGHT : SLICE_COLORS_DARK;
  const eligible = players.filter(p => p.id !== excludeId);
  const names = eligible;
  const count = names.length;
  const rotAnim  = useRef(new Animated.Value(0)).current;
  const totalRot = useRef(0);
  const [spinning, setSpinning] = useState(false);
  const [winner,   setWinner]   = useState(null);
  const sliceAngle = 360 / count;

  function polarToXY(angle, r) {
    const rad = ((angle - 90) * Math.PI) / 180;
    return { x: WHEEL_R + r * Math.cos(rad), y: WHEEL_R + r * Math.sin(rad) };
  }
  function buildSlicePath(index) {
    const start = index * sliceAngle, end = start + sliceAngle;
    const p1 = polarToXY(start, WHEEL_R - 2), p2 = polarToXY(end, WHEEL_R - 2);
    const large = sliceAngle > 180 ? 1 : 0;
    return `M ${WHEEL_R} ${WHEEL_R} L ${p1.x} ${p1.y} A ${WHEEL_R - 2} ${WHEEL_R - 2} 0 ${large} 1 ${p2.x} ${p2.y} Z`;
  }
  function sliceMidAngle(index) { return index * sliceAngle + sliceAngle / 2; }

  const spin = useCallback(() => {
    if (spinning || winner) return;
    setSpinning(true);
    const winnerIdx = Math.floor(Math.random() * count);
    const winnerPlayer = names[winnerIdx];
    const targetSliceCenter = winnerIdx * sliceAngle + sliceAngle / 2;
    const stopAngle = 360 - targetSliceCenter;
    const currentMod = totalRot.current % 360;
    let delta = stopAngle - currentMod;
    if (delta < 0) delta += 360;
    const fullSpins = (5 + Math.floor(Math.random() * 3)) * 360;
    const targetTotal = totalRot.current + fullSpins + delta;
    totalRot.current = targetTotal;
    Animated.timing(rotAnim, {
      toValue: targetTotal, duration: 4000 + Math.random() * 1000,
      easing: Easing.out(Easing.cubic), useNativeDriver: true,
    }).start(() => {
      setSpinning(false); setWinner(winnerPlayer);
      setTimeout(() => onDone(winnerPlayer), 700);
    });
  }, [spinning, winner, count, names, rotAnim, onDone, sliceAngle]);

  const rotate = rotAnim.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'] });

  return (
    <View style={styles.wheelSection}>
      <Text style={[styles.wheelLabel, { color: theme.textSecondary }]}>{label}</Text>
      <View style={[styles.wheelContainer, { width: WHEEL_SIZE + 24, height: WHEEL_SIZE + 40 }]}>
        <View style={[styles.pointer, { borderBottomColor: theme.accent }]} />
        <Animated.View style={[styles.wheelSvgWrap, { transform: [{ rotate }], width: WHEEL_SIZE, height: WHEEL_SIZE, borderRadius: WHEEL_R }]}>
          <Svg width={WHEEL_SIZE} height={WHEEL_SIZE}>
            <Circle cx={WHEEL_R} cy={WHEEL_R} r={WHEEL_R - 2} fill={theme.bgCard} />
            {names.map((player, i) => {
              const color = COLORS[i % COLORS.length];
              const midAngle = sliceMidAngle(i);
              const labelR = WHEEL_R * 0.62;
              const labelPos = polarToXY(midAngle, labelR);
              const shortName = player.name.length > 7 ? player.name.slice(0, 6) + '…' : player.name;
              return (
                <G key={player.id}>
                  <Path d={buildSlicePath(i)} fill={color} stroke={theme.bg} strokeWidth={1.5} />
                  <SvgText x={labelPos.x} y={labelPos.y} fill="#ffffff"
                    fontSize={count > 6 ? 10 : count > 4 ? 12 : 14} fontWeight="bold"
                    textAnchor="middle" alignmentBaseline="middle"
                    rotation={midAngle - 90} origin={`${labelPos.x}, ${labelPos.y}`}>
                    {shortName}
                  </SvgText>
                </G>
              );
            })}
            <Circle cx={WHEEL_R} cy={WHEEL_R} r={WHEEL_R * 0.18} fill={theme.bg} stroke={theme.accent} strokeWidth={2} />
          </Svg>
        </Animated.View>
        <View style={[styles.wheelRing, { width: WHEEL_SIZE + 8, height: WHEEL_SIZE + 8, borderRadius: (WHEEL_SIZE + 8) / 2, borderColor: theme.accentBorder }]} />
      </View>
      {!winner && (
        <ThemedButton onPress={spin} disabled={spinning}
          label={spinning ? '⏳ جاري الدوران...' : '🎰 دوّر العجلة'}
          variant={spinning ? 'secondary' : 'primary'} size='large' style={styles.spinBtn} />
      )}
      {winner && (
        <View style={[styles.winnerBadge, { backgroundColor: theme.bgCard, borderColor: theme.accent }]}>
          <Text style={[styles.winnerBadgeText, { color: theme.accent }]}>🎯 {winner.name}</Text>
        </View>
      )}
    </View>
  );
});

// ══════════════════════════════════════════════════════════════
//  SetupScreen
// ══════════════════════════════════════════════════════════════
function SetupScreen({ onStart, onBack, theme, t, rs }) {
  const [names,    setNames]   = useState(['', '']);
  const [gameMode, setGameMode] = useState('auto'); // 'auto' | 'custom'

  const updateName   = useCallback((i, val) => setNames(prev => { const n = [...prev]; n[i] = val; return n; }), []);
  const addPlayer    = useCallback(() => { if (names.length < 10) setNames(prev => [...prev, '']); }, [names.length]);
  const removePlayer = useCallback((i) => { setNames(prev => prev.filter((_, idx) => idx !== i)); }, []);

  const handleStart = useCallback(() => {
    const valid = names.map(n => n.trim()).filter(Boolean);
    if (valid.length < 2) return;
    onStart(valid.map((name, i) => ({ id: i + 1, name })), gameMode);
  }, [names, onStart, gameMode]);

  const canStart = names.filter(n => n.trim()).length >= 2;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { backgroundColor: 'transparent' }]}>
        <ThemedButton onPress={onBack} label="→" variant="ghost" size="small" fullWidth={false} />
        <Text style={[styles.headerTitle, { color: theme.accent }]}>😈 صراحة أو تحدي</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.setupContent]} keyboardShouldPersistTaps="handled">
        <StatusBar barStyle={theme.statusBar} backgroundColor={theme.statusBg} />

        {/* ── اختيار النمط ── */}
        <Text style={[styles.setupSubtitle, { color: theme.textMuted }]}>اختر نمط اللعب</Text>
        <View style={styles.modeRow}>
          <TouchableOpacity
            style={[styles.modeCard, { borderColor: gameMode === 'auto' ? theme.accent : theme.border,
              backgroundColor: gameMode === 'auto' ? theme.accent + '18' : theme.bgCard }]}
            onPress={() => setGameMode('auto')}
          >
            <Text style={styles.modeEmoji}>🎴</Text>
            <Text style={[styles.modeTitle, { color: gameMode === 'auto' ? theme.accent : theme.textPrimary }]}>النمط الجاهز</Text>
            <Text style={[styles.modeDesc, { color: theme.textMuted }]}>بنك أسئلة وتحديات جاهز، تختار المحقق من 5 خيارات</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeCard, { borderColor: gameMode === 'custom' ? theme.accent : theme.border,
              backgroundColor: gameMode === 'custom' ? theme.accent + '18' : theme.bgCard }]}
            onPress={() => setGameMode('custom')}
          >
            <Text style={styles.modeEmoji}>🗣</Text>
            <Text style={[styles.modeTitle, { color: gameMode === 'custom' ? theme.accent : theme.textPrimary }]}>النمط المخصص</Text>
            <Text style={[styles.modeDesc, { color: theme.textMuted }]}>المحقق يبتكر السؤال أو التحدي بنفسه شفهياً</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.setupSubtitle, { color: theme.textMuted, marginTop: 8 }]}>أدخل أسماء اللاعبين (2-10)</Text>

        {names.map((name, i) => (
          <View key={i} style={styles.nameRow}>
            <View style={[styles.playerNumBadge, { backgroundColor: theme.accent + '22' }]}>
              <Text style={[styles.playerNumText, { color: theme.accent }]}>{i + 1}</Text>
            </View>
            <TextInput
              style={[styles.input, { backgroundColor: theme.bgCard, borderColor: theme.border, color: theme.textPrimary }, rs.textInput]}
              placeholder={`اللاعب ${i + 1}`} placeholderTextColor={theme.textMuted}
              value={name} onChangeText={v => updateName(i, v)} returnKeyType="next"
            />
            {names.length > 2 && (
              <ThemedButton onPress={() => removePlayer(i)} label='✕' variant='danger' size='small' style={styles.removeBtn} />
            )}
          </View>
        ))}

        {names.length < 10 && (
          <ThemedButton onPress={addPlayer} label='＋ أضف لاعباً' variant='secondary' size='medium' style={styles.addBtn} />
        )}

        <ThemedButton
          onPress={handleStart} disabled={!canStart}
          label='ابدأ اللعبة ←'
          variant={canStart ? 'primary' : 'secondary'} size='large' style={styles.startBtn}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ══════════════════════════════════════════════════════════════
//  ContentCards — 5 خيارات للنمط الجاهز
// ══════════════════════════════════════════════════════════════
function ContentCards({ type, options, onSelect, theme, askerName, victimName }) {
  const isTruth = type === 'truth';
  const color   = isTrue => isTrue ? '#3b82f6' : '#ef4444';
  return (
    <View style={styles.contentCardsWrap}>
      <Text style={[styles.contentCardsTitle, { color: theme.textSecondary }]}>
        {isTrue => isTrue
          ? `${askerName} — اختر سؤالاً لـ ${victimName}:`
          : `${askerName} — اختر تحدياً لـ ${victimName}:`
        }
      </Text>
      <Text style={[styles.contentCardsTitle, { color: theme.textSecondary }]}>
        {askerName} — اختر {isTrue ? 'سؤالاً' : 'تحدياً'} لـ {victimName}:
      </Text>
      {options.map((opt, i) => (
        <TouchableOpacity
          key={i}
          onPress={() => onSelect(opt)}
          style={[styles.contentCard, { backgroundColor: theme.bgCard,
            borderColor: isTrue ? '#3b82f680' : '#ef444480' }]}
          activeOpacity={0.75}
        >
          <View style={[styles.contentCardNum, { backgroundColor: isTrue ? '#3b82f620' : '#ef444420' }]}>
            <Text style={{ color: isTrue ? '#3b82f6' : '#ef4444', fontWeight: '900', fontSize: 13 }}>{i + 1}</Text>
          </View>
          <Text style={[styles.contentCardText, { color: theme.textPrimary }]}>{opt}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ══════════════════════════════════════════════════════════════
//  GameScreen
// ══════════════════════════════════════════════════════════════
function GameScreen({ players, gameMode, onBack, theme, t, rs }) {
  const { lang, themeId } = useLanguage();
  const isAuto   = gameMode === 'auto';

  const victimQueue  = useRef(buildVictimQueue(players)).current;
  const totalTurns   = victimQueue.length;
  const usedTruths   = useRef(new Set());
  const usedDares    = useRef(new Set());

  const [turnIdx,        setTurnIdx]        = useState(0);
  const [phase,          setPhase]          = useState('spin_victim');
  // spin_victim | spin_asker | choose | pick_content | show_content | action | final
  const [victim,         setVictim]         = useState(null);
  const [asker,          setAsker]          = useState(null);
  const [choice,         setChoice]         = useState(null);
  const [contentOptions, setContentOptions] = useState([]);
  const [selectedContent,setSelectedContent]= useState(null);
  const [scores,         setScores]         = useState(() => Object.fromEntries(players.map(p => [p.id, 0])));

  const turnsPerRound = players.length;
  const totalRounds   = TURNS_PER_PLAYER;
  const currentRound  = Math.min(Math.floor(turnIdx / turnsPerRound) + 1, totalRounds);
  const progress      = turnIdx / totalTurns;
  const currentVictimId = victimQueue[turnIdx];

  const handleVictimDone = useCallback((p) => { setVictim(p); setPhase('spin_asker'); }, []);
  const handleAskerDone  = useCallback((p) => { setAsker(p);  setPhase('choose'); },   []);

  const chooseOption = useCallback((opt) => {
    setChoice(opt);
    if (isAuto) {
      // اختر 5 خيارات من البنك
      const pool = opt === 'truth' ? TRUTHS_AR : DARES_AR;
      const usedRef = opt === 'truth' ? usedTruths : usedDares;
      setContentOptions(pick5(pool, usedRef));
      setPhase('pick_content');
    } else {
      setPhase('action');
    }
  }, [isAuto]);

  const handleContentSelect = useCallback((item) => {
    setSelectedContent(item);
    setPhase('show_content');
  }, []);

  const confirmContent = useCallback(() => {
    setPhase('action');
  }, []);

  const markDone = useCallback((success) => {
    if (success && victim) {
      const pts = choice === 'truth' ? TRUTH_PTS : DARE_PTS;
      setScores(prev => ({ ...prev, [victim.id]: (prev[victim.id] || 0) + pts }));
    }
    const nextIdx = turnIdx + 1;
    if (nextIdx >= totalTurns) { setPhase('final'); return; }
    setTurnIdx(nextIdx);
    setPhase('spin_victim');
    setVictim(null); setAsker(null); setChoice(null);
    setSelectedContent(null); setContentOptions([]);
  }, [victim, choice, turnIdx, totalTurns]);

  // نتائج نهائية
  if (phase === 'final') {
    const sorted = [...players].sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0));
    return (
      <View style={[styles.finalContainer, { backgroundColor: 'transparent' }]}>
        <StatusBar barStyle={theme.statusBar} />
        <Text style={styles.finalEmoji}>🏆</Text>
        <Text style={[styles.finalTitle, { color: theme.accent }]}>النتائج النهائية</Text>
        <ScrollView style={{ width: '100%' }} contentContainerStyle={{ gap: 10, paddingBottom: 20 }}>
          {sorted.map((p, i) => (
            <View key={p.id} style={[styles.scoreRow, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
              <Text style={styles.scoreRankEmoji}>{i === 0 ? '👑' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}</Text>
              <Text style={[styles.scoreRowName, { color: theme.textPrimary }]}>{p.name}</Text>
              <Text style={[styles.scoreRowPts, { color: theme.accent }]}>{scores[p.id] || 0} نقطة</Text>
            </View>
          ))}
        </ScrollView>
        <ThemedButton onPress={onBack} label='العودة ←' variant='primary' size='large' style={styles.startBtn} />
      </View>
    );
  }

  return (
    <View style={[styles.gameRoot, { backgroundColor: 'transparent' }]}>
      <StatusBar barStyle={theme.statusBar} />

      {/* ── Header ── */}
      <View style={[styles.gameHeader, { backgroundColor: 'transparent' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <ExitButton onPress={onBack} />
          <GameInfoButton gameType="truth_dare" lang={lang} />
        </View>
        <View style={styles.roundInfo}>
          <Text style={[styles.roundText, { color: theme.textSecondary }]}>
            جولة {currentRound} / {totalRounds}
          </Text>
          <View style={[styles.modePill, { backgroundColor: isAuto ? theme.accent + '25' : theme.bgCard, borderColor: isAuto ? theme.accent : theme.border }]}>
            <Text style={{ color: isAuto ? theme.accent : theme.textMuted, fontSize: 10, fontWeight: '700' }}>
              {isAuto ? '🎴 جاهز' : '🗣 مخصص'}
            </Text>
          </View>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <View style={[styles.progressBar, { backgroundColor: theme.bgCard }]}>
        <View style={[styles.progressFill, { backgroundColor: theme.accent, width: `${progress * 100}%` }]} />
      </View>

      <ScrollView contentContainerStyle={styles.gameContent} showsVerticalScrollIndicator={false}>

        {/* عجلة الضحية */}
        {phase === 'spin_victim' && (
          <SpinWheel players={players} onDone={handleVictimDone}
            label='من هي الضحية هذه الدورة؟' theme={theme} />
        )}

        {/* عجلة المحقق */}
        {phase === 'spin_asker' && victim && (
          <SpinWheel players={players} excludeId={victim.id} onDone={handleAskerDone}
            label={`من هو المحقق مع ${victim.name}؟`} theme={theme} />
        )}

        {/* اختيار صراحة أو تحدي */}
        {phase === 'choose' && victim && asker && (
          <View style={styles.chooseSection}>
            <Text style={[styles.chooseMeta, { color: theme.textMuted }]}>
              🔍 المحقق: {asker.name}  •  🎯 الضحية: {victim.name}
            </Text>
            <Text style={[styles.chooseTitle, { color: theme.textPrimary }]}>{victim.name}، اختر:</Text>
            <ThemedCard onPress={() => chooseOption('truth')} style={styles.chooseCard} variant='accent'>
              <Text style={styles.chooseCardEmoji}>🗣</Text>
              <Text style={styles.chooseCardLabel}>صراحة</Text>
              <Text style={[styles.chooseCardPts, { color: '#93c5fd' }]}>+{TRUTH_PTS} نقطة إذا أجبت</Text>
            </ThemedCard>
            <ThemedCard onPress={() => chooseOption('dare')} style={styles.chooseCard} variant='danger'>
              <Text style={styles.chooseCardEmoji}>😈</Text>
              <Text style={styles.chooseCardLabel}>تحدي</Text>
              <Text style={[styles.chooseCardPts, { color: '#fca5a5' }]}>+{DARE_PTS} نقطة إذا نفّذت</Text>
            </ThemedCard>
          </View>
        )}

        {/* اختيار محتوى من 5 خيارات — النمط الجاهز */}
        {phase === 'pick_content' && victim && asker && (
          <ContentCards
            type={choice}
            options={contentOptions}
            onSelect={handleContentSelect}
            theme={theme}
            askerName={asker.name}
            victimName={victim.name}
          />
        )}

        {/* عرض المحتوى المختار قبل التنفيذ */}
        {phase === 'show_content' && victim && asker && selectedContent && (
          <View style={styles.actionSection}>
            <View style={[styles.actionCard, { backgroundColor: theme.bgCard,
              borderColor: choice === 'truth' ? '#3b82f6' : '#ef4444' }]}>
              <Text style={[styles.actionLabel, { color: theme.textMuted }]}>
                {choice === 'truth' ? '🗣 صراحة' : '😈 تحدي'} — المحقق: {asker.name}
              </Text>
              <View style={styles.actionPlayers}>
                <View style={[styles.playerPill, { backgroundColor: choice === 'truth' ? '#3b82f620' : '#ef444420' }]}>
                  <Text style={styles.playerPillText}>{asker.name}</Text>
                </View>
                <Text style={[styles.actionArrow, { color: theme.textMuted }]}>
                  {choice === 'truth' ? '⟶ يسأل' : '⟶ يتحدى'}
                </Text>
                <View style={[styles.playerPill, { backgroundColor: theme.bgCard, borderWidth: 1, borderColor: theme.accent }]}>
                  <Text style={[styles.playerPillText, { color: theme.accent }]}>{victim.name}</Text>
                </View>
              </View>
              {/* بطاقة المحتوى */}
              <View style={[styles.selectedContentBox, { backgroundColor: choice === 'truth' ? '#3b82f612' : '#ef444412',
                borderColor: choice === 'truth' ? '#3b82f640' : '#ef444440' }]}>
                <Text style={[styles.selectedContentText, { color: theme.textPrimary }]}>{selectedContent}</Text>
              </View>
            </View>
            <ThemedButton onPress={confirmContent}
              label={choice === 'truth' ? '✅ اقرأ السؤال وابدأ' : '✅ اشرح التحدي وابدأ'}
              variant='primary' size='large' style={styles.resultBtn} />
          </View>
        )}

        {/* مرحلة الفعل */}
        {phase === 'action' && victim && asker && (
          <View style={styles.actionSection}>
            <View style={[styles.actionCard, { backgroundColor: theme.bgCard,
              borderColor: choice === 'truth' ? '#3b82f6' : '#ef4444' }]}>
              <Text style={[styles.actionLabel, { color: theme.textMuted }]}>
                {choice === 'truth' ? '🗣 صراحة — المحقق يسأل الضحية' : '😈 تحدي — المحقق يتحدى الضحية'}
              </Text>
              <View style={styles.actionPlayers}>
                <View style={[styles.playerPill, { backgroundColor: choice === 'truth' ? '#3b82f620' : '#ef444420' }]}>
                  <Text style={styles.playerPillText}>{asker.name}</Text>
                </View>
                <Text style={[styles.actionArrow, { color: theme.textMuted }]}>
                  {choice === 'truth' ? '⟶ يسأل' : '⟶ يتحدى'}
                </Text>
                <View style={[styles.playerPill, { backgroundColor: theme.bgCard, borderWidth: 1, borderColor: theme.accent }]}>
                  <Text style={[styles.playerPillText, { color: theme.accent }]}>{victim.name}</Text>
                </View>
              </View>
              {/* في النمط الجاهز: اعرض المحتوى المختار */}
              {isAuto && selectedContent && (
                <View style={[styles.selectedContentBox, { backgroundColor: choice === 'truth' ? '#3b82f612' : '#ef444412',
                  borderColor: choice === 'truth' ? '#3b82f640' : '#ef444440' }]}>
                  <Text style={[styles.selectedContentText, { color: theme.textPrimary }]}>{selectedContent}</Text>
                </View>
              )}
            </View>

            <View style={styles.resultBtns}>
              <ThemedButton onPress={() => markDone(true)}
                label={choice === 'truth' ? '✅ أجاب صادقاً' : '✅ نفّذ التحدي'}
                variant='success' size='medium' style={styles.resultBtn} />
              <ThemedButton onPress={() => markDone(false)}
                label={choice === 'truth' ? '❌ رفض الإجابة' : '❌ لم يكمل التحدي'}
                variant='danger' size='medium' style={styles.resultBtn} />
            </View>
          </View>
        )}

        {/* لوحة النقاط */}
        <View style={[styles.scoreboard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
          <Text style={[styles.scoreboardTitle, { color: theme.textMuted }]}>النقاط</Text>
          <View style={styles.scoreboardGrid}>
            {players.map(p => (
              <View key={p.id} style={[styles.scoreChip, { borderColor: p.id === currentVictimId ? theme.accent : theme.border }]}>
                <Text style={[styles.scoreChipName, { color: p.id === currentVictimId ? theme.accent : theme.textSecondary }]} numberOfLines={1}>
                  {p.name}
                </Text>
                <Text style={[styles.scoreChipPts, { color: theme.accent }]}>{scores[p.id] || 0}</Text>
              </View>
            ))}
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════
//  Root
// ══════════════════════════════════════════════════════════════
export default function TruthDareScreen({ onBack, experience }) {
  const { theme, themeId } = useTheme();
  const t  = useT();
  const rs = useRTLStyles();
  const { lang } = useLanguage();
  const isGlobal = experience === 'global';

  const [players,  setPlayers]  = useState(null);
  const [gameMode, setGameMode] = useState('auto');

  const handleStart = useCallback((p, mode) => { setPlayers(p); setGameMode(mode); }, []);
  const handleBack  = useCallback(() => { if (players) setPlayers(null); else onBack(); }, [players, onBack]);

  return (
    <View style={[styles.root, { backgroundColor: 'transparent' }]}>
      <TruthDareEngraving theme={theme} />
      {!players
        ? <SetupScreen onStart={handleStart} onBack={handleBack} theme={theme} t={t} rs={rs} />
        : <GameScreen  players={players} gameMode={gameMode} onBack={handleBack} theme={theme} t={t} rs={rs} />
      }
    </View>
  );
}

// ══════════════════════════════════════════════════════════════
//  Styles
// ══════════════════════════════════════════════════════════════
const HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Setup
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 56 : 44, paddingBottom: 12 },
  headerTitle: { fontSize: 18, fontWeight: '900', textAlign: 'center' },
  setupContent: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32, gap: 12, alignItems: 'center' },
  setupSubtitle: { fontSize: 13, textAlign: 'center', marginBottom: 4 },

  // Mode cards
  modeRow: { flexDirection: 'row', gap: 12, width: '100%' },
  modeCard: { flex: 1, borderRadius: 16, borderWidth: 2, padding: 14, alignItems: 'center', gap: 6 },
  modeEmoji: { fontSize: 28 },
  modeTitle: { fontSize: 14, fontWeight: '800', textAlign: 'center' },
  modeDesc:  { fontSize: 11, textAlign: 'center', lineHeight: 15 },

  // Players
  nameRow:        { flexDirection: 'row', gap: 8, width: '100%', alignItems: 'center' },
  playerNumBadge: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  playerNumText:  { fontSize: 13, fontWeight: '800' },
  input:          { flex: 1, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15 },
  removeBtn:      { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  addBtn:         { borderRadius: 14, paddingVertical: 11, paddingHorizontal: 24, borderWidth: 1.5, width: '100%', alignItems: 'center' },
  startBtn:       { paddingVertical: 16, borderRadius: 16, alignItems: 'center', width: '100%', marginTop: 8, elevation: 6 },

  // Game header
  gameRoot:   { flex: 1 },
  gameHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 52 : 40, paddingBottom: 8 },
  roundInfo:  { alignItems: 'center', gap: 4 },
  roundText:  { fontSize: 15, fontWeight: '700' },
  modePill:   { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  progressBar:  { height: 5, marginHorizontal: 16, borderRadius: 4, overflow: 'hidden', marginBottom: 4 },
  progressFill: { height: '100%', borderRadius: 4 },
  gameContent:  { flexGrow: 1, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24, alignItems: 'center', gap: 20 },

  // Wheel
  wheelSection:  { alignItems: 'center', gap: 14, width: '100%' },
  wheelLabel:    { fontSize: 15, textAlign: 'center', fontWeight: '600' },
  wheelContainer:{ alignItems: 'center', justifyContent: 'center', position: 'relative' },
  pointer: { position: 'absolute', top: 0, zIndex: 10, width: 0, height: 0,
    borderLeftWidth: 12, borderRightWidth: 12, borderBottomWidth: 22,
    borderLeftColor: 'transparent', borderRightColor: 'transparent', marginTop: -4 },
  wheelSvgWrap: { overflow: 'hidden', elevation: 8, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 12 },
  wheelRing:    { position: 'absolute', borderWidth: 3, top: 16, left: 8 },
  spinBtn:      { paddingVertical: 15, paddingHorizontal: 40, borderRadius: 18, elevation: 6, borderWidth: 1.5 },
  winnerBadge:  { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 16, borderWidth: 2 },
  winnerBadgeText: { fontSize: 18, fontWeight: '900' },

  // Choose
  chooseSection: { width: '100%', gap: 14, alignItems: 'center' },
  chooseMeta:    { fontSize: 13, textAlign: 'center' },
  chooseTitle:   { fontSize: 22, fontWeight: '900', textAlign: 'center' },
  chooseCard:    { width: '100%', paddingVertical: 22, borderRadius: 20, alignItems: 'center', gap: 6, borderWidth: 1.5, elevation: 4 },
  chooseCardEmoji:  { fontSize: 36 },
  chooseCardLabel:  { color: '#ffffff', fontSize: 24, fontWeight: '900' },
  chooseCardPts:    { fontSize: 12, fontWeight: '600' },

  // Content cards
  contentCardsWrap:  { width: '100%', gap: 10 },
  contentCardsTitle: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
  contentCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1.5,
    padding: 14, gap: 12 },
  contentCardNum:  { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  contentCardText: { flex: 1, fontSize: 14, lineHeight: 20 },

  // Action
  actionSection: { width: '100%', gap: 16, alignItems: 'center' },
  actionCard:    { width: '100%', borderRadius: 20, padding: 20, gap: 12, borderWidth: 2, alignItems: 'center' },
  actionLabel:   { fontSize: 14, fontWeight: '700' },
  actionPlayers: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'center' },
  playerPill:    { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  playerPillText:{ color: '#ffffff', fontSize: 15, fontWeight: '800' },
  actionArrow:   { fontSize: 13, fontWeight: '600' },
  selectedContentBox: { width: '100%', borderRadius: 14, borderWidth: 1.5, padding: 14 },
  selectedContentText: { fontSize: 15, lineHeight: 22, textAlign: 'center', fontWeight: '600' },
  resultBtns: { flexDirection: 'column', gap: 10, width: '100%' },
  resultBtn:  { paddingVertical: 16, borderRadius: 16, alignItems: 'center', borderWidth: 1.5, elevation: 3 },

  // Scoreboard
  scoreboard:      { width: '100%', borderRadius: 16, padding: 14, borderWidth: 1, gap: 10 },
  scoreboardTitle: { fontSize: 12, textAlign: 'center', fontWeight: '600', letterSpacing: 0.5 },
  scoreboardGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  scoreChip:       { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center', borderWidth: 1.5, minWidth: 70 },
  scoreChipName:   { fontSize: 11, maxWidth: 80 },
  scoreChipPts:    { fontSize: 15, fontWeight: '900' },

  // Final
  finalContainer: { flex: 1, padding: 24, paddingTop: Platform.OS === 'ios' ? 60 : 48, alignItems: 'center', gap: 16 },
  finalEmoji:  { fontSize: 64 },
  finalTitle:  { fontSize: 26, fontWeight: '900', textAlign: 'center', marginBottom: 4 },
  scoreRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 14, borderWidth: 1 },
  scoreRankEmoji: { fontSize: 22, width: 30, textAlign: 'center' },
  scoreRowName:   { flex: 1, fontSize: 15, fontWeight: '700' },
  scoreRowPts:    { fontSize: 16, fontWeight: '900' },
});
