/**
 * i18n.js — نظام ترجمة Arena المحسّن
 * ════════════════════════════════════
 *  ✅ تغيير اللغة فوري بدون restart
 *  ✅ RTL/LTR تلقائي للـ layout
 *  ✅ useRTLStyles() — ستايلات تتكيف أوتوماتيك
 *  ✅ تغيير اللغة مع fade animation سلس
 *  ✅ لا إعادة رسم غير ضرورية (useMemo + context splitting)
 *
 * التغييرات الجديدة:
 *  ✅ مفاتيح وسائل المساعدة (lifeline.*)
 *  ✅ مفاتيح البطولة (tournament.*)
 *  ✅ مفاتيح وضع الفردي المزدوج (solo.training, solo.tournamentMode...)
 *  ✅ مفاتيح الإعلانات المحدّثة (tokens.perAd, tokens.cooldown)
 */

import React, {
  createContext, useContext, useState,
  useCallback, useEffect, useMemo, useRef, memo,
} from 'react';
import { Animated, Text, View, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LANG_KEY = 'arena_language';

// ══════════════════════════════════════════════════════════════
// قاموس الترجمات
// ══════════════════════════════════════════════════════════════
const T = {

  // ── مشترك ──────────────────────────────────────────────────
  'common.ok':           { ar: 'حسناً',         en: 'OK' },
  'common.cancel':       { ar: 'إلغاء',         en: 'Cancel' },
  'common.back':         { ar: '→ رجوع',        en: 'Back ←' },
  'common.backArrow':    { ar: '→',             en: '←' },
  'common.yes':          { ar: 'نعم',           en: 'Yes' },
  'common.no':           { ar: 'لا',            en: 'No' },
  'common.or':           { ar: 'أو',            en: 'or' },
  'common.loading':      { ar: 'جارٍ...',       en: 'Loading...' },
  'common.start':        { ar: 'ابدأ',          en: 'Start' },
  'common.next':         { ar: 'التالي',        en: 'Next' },
  'common.done':         { ar: 'تم',            en: 'Done' },
  'common.retry':        { ar: 'حاول مجدداً',  en: 'Try Again' },
  'common.guest':        { ar: '👤 ضيف',        en: '👤 Guest' },
  'common.round':        { ar: 'جولة',          en: 'Round' },
  'common.winner':       { ar: 'الفائز',        en: 'Winner' },
  'common.win':          { ar: 'فاز!',          en: 'Wins!' },
  'common.draw':         { ar: 'تعادل!',        en: 'Draw!' },
  'common.points':       { ar: 'نقطة',          en: 'pts' },
  'common.correct':      { ar: '✅ صحيح',       en: '✅ Correct' },
  'common.wrong':        { ar: '❌ خطأ',         en: '❌ Wrong' },
  'common.returnHome':   { ar: '🏠 الرئيسية',   en: '🏠 Home' },
  'common.newGame':      { ar: '🔄 جولة جديدة', en: '🔄 New Round' },
  'common.playAgain':    { ar: '🔄 العب مجدداً', en: '🔄 Play Again' },
  'common.insufficient': { ar: '❌ رصيد غير كافٍ', en: '❌ Insufficient balance' },
  'common.leave':        { ar: 'مغادرة',        en: 'Leave' },
  'common.exit':         { ar: 'خروج',          en: 'Exit' },
  'common.return':       { ar: 'العودة ←',      en: '→ Return' },

  // ── تسجيل الدخول ──────────────────────────────────────────
  'login.tagline':   { ar: 'ميدان التحدي ⚔️',        en: 'The Challenge Arena ⚔️' },
  'login.googleBtn': { ar: 'تسجيل الدخول بـ Google',  en: 'Sign in with Google' },
  'login.guestBtn':  { ar: '👤 المتابعة كضيف',        en: '👤 Continue as Guest' },
  'login.guestNote': { ar: 'كضيف لن يُحفظ تقدمك عبر الأجهزة', en: "Progress won't sync across devices as guest" },
  'login.or':        { ar: 'أو',                      en: 'or' },

  // ── الرئيسية ───────────────────────────────────────────────
  'home.subtitle':        { ar: 'ميدان التحدي ⚔️',       en: 'The Challenge Arena ⚔️' },
  'home.knowledgeTitle':  { ar: 'ميدان\nالمعلومات',      en: 'Knowledge\nArena' },
  'home.knowledgeDesc':   { ar: 'معلومات · ثقافة · تحديات', en: 'Trivia · Culture · Challenges' },
  'home.knowledgeBadge':  { ar: '3 أنماط',               en: '3 Modes' },
  'home.gamesTitle':      { ar: 'ميدان\nالألعاب',         en: 'Games\nArena' },
  'home.gamesDesc':       { ar: 'XO · بوليشيت · كوت · دومينو...', en: 'XO · Bullshit · Kout · Domino...' },
  'home.gamesBadge':      { ar: 'قريباً 🔥',              en: 'Coming Soon 🔥' },
  'home.friendsBtn':      { ar: '👥  الأصدقاء',            en: '👥  Friends' },
  'home.highScore':       { ar: '🏆 رقمك القياسي: {n} نقطة', en: '🏆 Your Best: {n} pts' },
  'home.guestUser':       { ar: '👤 ضيف',                 en: '👤 Guest' },

  // ── ميدان المعلومات ────────────────────────────────────────
  'knowledge.title':       { ar: 'ميدان المعلومات', en: 'Knowledge Arena' },
  'knowledge.chooseMode':  { ar: 'اختر نمط اللعب',  en: 'Choose Game Mode' },
  'knowledge.teamsTitle':  { ar: 'فريقين',           en: 'Two Teams' },
  'knowledge.teamsDesc':   { ar: 'تنافس بين فريقين مباشرة', en: 'Head-to-head team competition' },
  'knowledge.teamsCost':   { ar: '🪙 حسب الفئات',    en: '🪙 By category' },
  'knowledge.soloTitle':   { ar: 'فردي',             en: 'Solo' },
  'knowledge.soloDesc':    { ar: 'العب منفرداً واكسر الأرقام', en: 'Play solo and break records' },
  'knowledge.soloNoCoins': { ar: '❌ رصيد غير كافٍ', en: '❌ Insufficient balance' },
  'knowledge.onlineTitle': { ar: 'تحدي عن بُعد',    en: 'Remote Challenge' },
  'knowledge.onlineDesc':  { ar: 'العب ضد لاعب عشوائي', en: 'Play against a random player' },
  'knowledge.balance':     { ar: '🪙 رصيدك: {n} رمز', en: '🪙 Balance: {n} coins' },
  'knowledge.addCoins':    { ar: '+ إضافة',           en: '+ Add' },
  'knowledge.highScore':   { ar: '🏆 رقمك القياسي: {n} نقطة', en: '🏆 Best: {n} pts' },

  // ── إعداد اللعبة ───────────────────────────────────────────
  'setup.title':         { ar: 'إنشاء لعبة',   en: 'Create Game' },
  'setup.teamsSection':  { ar: '🏆 أسماء الفرق', en: '🏆 Team Names' },
  'setup.team1':         { ar: 'الفريق الأول',  en: 'Team 1' },
  'setup.team2':         { ar: 'الفريق الثاني', en: 'Team 2' },
  'setup.team1ph':       { ar: 'اسم الفريق الأول',  en: 'Team 1 name' },
  'setup.team2ph':       { ar: 'اسم الفريق الثاني', en: 'Team 2 name' },
  'setup.catsSection':   { ar: '📚 عدد الفئات', en: '📚 Number of Categories' },
  'setup.chooseCats':    { ar: '🎯 اختر الفئات ({s}/{c})', en: '🎯 Choose Categories ({s}/{c})' },
  'setup.noCats':        { ar: 'لا توجد فئات — أضف فئات من لوحة الإدارة أولاً', en: 'No categories — add from Admin panel first' },
  'setup.startBtn':      { ar: '🎮 ابدأ اللعبة', en: '🎮 Start Game' },
  'setup.notEnoughCats': { ar: 'اختر {n} فئات أخرى', en: 'Choose {n} more categories' },
  'setup.getCoins':      { ar: 'احصل على المزيد من النقاط 🪙', en: 'Get more coins 🪙' },

  // ── لوحة اللعبة ────────────────────────────────────────────
  'board.endBtn':  { ar: 'إنهاء',                          en: 'End' },
  'board.endQ':    { ar: '🏁 إنهاء اللعبة',                en: '🏁 End Game' },
  'board.endMsg':  { ar: 'هل أنت متأكد من إنهاء اللعبة؟', en: 'Are you sure you want to end?' },
  'board.endYes':  { ar: 'إنهاء',                          en: 'End' },
  'board.turn':    { ar: 'دور',                             en: 'Turn' },
  'board.noCatsQ': { ar: 'لا توجد أسئلة في هذه الفئة!',   en: 'No questions in this category!' },

  // ── شاشة السؤال ────────────────────────────────────────────
  'question.showAnswer':    { ar: '👁 عرض الإجابة',     en: '👁 Show Answer' },
  'question.correctAnswer': { ar: 'الإجابة الصحيحة:',   en: 'Correct Answer:' },
  'question.whoAnswered':   { ar: 'من أجاب صح؟',        en: 'Who answered correctly?' },
  'question.nobody':        { ar: '❌ لا أحد',           en: '❌ Nobody' },
  'question.returnBoard':   { ar: '← العودة للوحة',     en: 'Back to Board →' },
  'question.correct':       { ar: '🎉 إجابة صحيحة!',   en: '🎉 Correct!' },
  'question.wrong':         { ar: '💔 إجابة خاطئة!',   en: '💔 Wrong!' },
  'question.classic':       { ar: '🎙 كلاسيك',          en: '🎙 Classic' },
  'question.mcq':           { ar: '🔤 MCQ',              en: '🔤 MCQ' },
  'question.turnTeam':      { ar: 'دور فريق:',           en: 'Team turn:' },
  'question.lettersAr':     { ar: 'أ,ب,ج,د',            en: 'A,B,C,D' },

  // ── النتائج ────────────────────────────────────────────────
  'results.winnerLabel': { ar: 'الفائز',              en: 'Winner' },
  'results.rematch':     { ar: '⚔️ مباراة انتقام',    en: '⚔️ Rematch' },
  'results.diff':        { ar: 'فاز {w} بفارق {d} نقطة', en: '{w} won by {d} pts' },

  // ── فردي ───────────────────────────────────────────────────
  'solo.level':          { ar: 'المستوى {l} — {p} نقطة', en: 'Level {l} — {p} pts' },
  'solo.roundOf':        { ar: 'جولة {c} / {t}',         en: 'Round {c} / {t}' },
  'solo.pickTitle':      { ar: 'اختر فئتك للسؤال القادم', en: 'Pick your category' },
  'solo.questionOf':     { ar: '{n} سؤال',               en: '{n} questions' },
  'solo.timeout':        { ar: '⏰ انتهى الوقت!',        en: "⏰ Time's up!" },
  'solo.answer':         { ar: 'الإجابة:',               en: 'Answer:' },
  'solo.newRecord':      { ar: 'رقم قياسي جديد!',       en: 'New Record!' },
  'solo.gameOver':       { ar: 'انتهت اللعبة',           en: 'Game Over' },
  'solo.rightAnswers':   { ar: 'إجابة صحيحة',            en: 'Correct Answers' },
  'solo.wrongAnswers':   { ar: 'إجابة خاطئة',            en: 'Wrong Answers' },
  'solo.bestScore':      { ar: '🏆 أعلى رقم',            en: '🏆 Best Score' },
  'solo.special':        { ar: '⭐ خاصة',               en: '⭐ Special' },
  // ✅ جديد: وضع الفردي المزدوج
  'solo.chooseMode':     { ar: '🎮 اختر وضع الفردي',    en: '🎮 Choose Solo Mode' },
  'solo.training':       { ar: 'تدريب',                  en: 'Training' },
  'solo.trainingDesc':   { ar: 'اختر فئاتك بحرية — لا يُحتسب في البطولة', en: 'Choose freely — not counted in tournament' },
  'solo.tournamentMode': { ar: 'بطولة',                  en: 'Tournament' },
  'solo.tournamentDesc': { ar: 'فئات عشوائية — يُحتسب في الصدارة', en: 'Random categories — counted in leaderboard' },
  'solo.modeBadge':      { ar: 'خيارين',                 en: '2 Modes' },

  // ── أونلاين ────────────────────────────────────────────────
  'online.searching': { ar: 'جاري البحث عن خصم...',   en: 'Searching for opponent...' },
  'online.cancel':    { ar: 'إلغاء',                   en: 'Cancel' },
  'online.pickCat':   { ar: 'اختر فئة',                en: 'Choose Category' },
  'online.reaction':  { ar: '😄 رد فعل',               en: '😄 React' },
  'online.leave':     { ar: '🚪 مغادرة',               en: '🚪 Leave' },
  'online.stickers':  { ar: 'ستيكرات',                 en: 'Stickers' },
  'online.quickMsgs': { ar: 'رسائل سريعة',             en: 'Quick Messages' },
  'online.iWon':      { ar: 'فزت!',                    en: 'You Won!' },
  'online.iLost':     { ar: 'خسرت!',                   en: 'You Lost!' },
  'online.errorMsg':  { ar: 'حدث خطأ، حاول مجدداً',   en: 'An error occurred, try again' },
  'online.leaveMsg':  { ar: 'ستخرج من اللعبة الحالية', en: 'You will leave the current game' },
  'online.waiting':   { ar: '⏳ في انتظار لاعب...',    en: '⏳ Waiting for player...' },

  // ── إعدادات ────────────────────────────────────────────────
  'settings.title':              { ar: 'الإعدادات',              en: 'Settings' },
  'settings.guestAccount':       { ar: 'حساب ضيف',              en: 'Guest Account' },
  'settings.googleAccount':      { ar: 'حساب Google',            en: 'Google Account' },
  'settings.appleAccount':       { ar: 'حساب Apple',             en: 'Apple Account' },
  'settings.tokensSection':      { ar: '🪙 النقاط',              en: '🪙 Coins' },
  'settings.balance':            { ar: 'رصيدك الحالي',           en: 'Your Balance' },
  'settings.balanceVal':         { ar: '{n} نقطة',               en: '{n} coins' },
  'settings.soundSection':       { ar: '🔊 الصوت والموسيقى',     en: '🔊 Sound & Music' },
  'settings.music':              { ar: '🎵 الموسيقى الخلفية',    en: '🎵 Background Music' },
  'settings.musicSub':           { ar: 'موسيقى هادئة أثناء اللعب', en: 'Calm music while playing' },
  'settings.sounds':             { ar: '🔔 أصوات التطبيق',       en: '🔔 App Sounds' },
  'settings.soundsSub':          { ar: 'أصوات الأزرار والألعاب', en: 'Button and game sounds' },
  'settings.themeSection':       { ar: '🎨 المظهر',              en: '🎨 Appearance' },
  'settings.darkMode':           { ar: 'الوضع الليلي',           en: 'Dark Mode' },
  'settings.darkModeSub':        { ar: 'الوضع الليلي مفعّل دائماً حالياً', en: 'Dark mode is always on for now' },
  'settings.darkModeComingSoon': { ar: 'قريباً',                 en: 'Coming Soon' },
  'settings.darkModeMsg':        { ar: 'الوضع النهاري سيكون متاحاً في الإصدار القادم!', en: 'Light mode coming in the next version!' },
  'settings.notiSection':        { ar: '🔔 الإشعارات',           en: '🔔 Notifications' },
  'settings.notifications':      { ar: 'إشعارات التطبيق',        en: 'App Notifications' },
  'settings.notiSub':            { ar: 'تنبيهات العروض والتحديثات', en: 'Alerts for offers and updates' },
  'settings.langSection':        { ar: '🌐 اللغة',               en: '🌐 Language' },
  'settings.aboutSection':       { ar: 'ℹ️ عن التطبيق',          en: 'ℹ️ About' },
  'settings.appInfo':            { ar: 'معلومات التطبيق',         en: 'App Info' },
  'settings.version':            { ar: 'الإصدار 1.0.0',          en: 'Version 1.0.0' },
  'settings.rate':               { ar: '⭐ قيّم التطبيق',        en: '⭐ Rate the App' },
  'settings.rateTitle':          { ar: '⭐ قيّم التطبيق',        en: '⭐ Rate the App' },
  'settings.rateMsg':            { ar: 'شكراً لدعمك! تقييمك يساعدنا على التحسين.', en: 'Thanks! Ratings help us improve.' },
  'settings.rateLater':          { ar: 'لاحقاً',                 en: 'Later' },
  'settings.rateNow':            { ar: '⭐ قيّم الآن',           en: '⭐ Rate Now' },
  'settings.logout':             { ar: '🚪 تسجيل الخروج',        en: '🚪 Log Out' },
  'settings.logoutMsg':          { ar: 'هل تريد تسجيل الخروج؟', en: 'Do you want to log out?' },
  'settings.changeExp':          { ar: '🔄 تغيير التجربة',       en: '🔄 Change Experience' },
  'settings.changeExpMsg':       { ar: 'ستعود لشاشة الاختيار',   en: 'You will return to the selection screen' },
  'settings.experienceSection':  { ar: '🌐 التجربة',              en: '🌐 Experience' },
  'settings.experience':         { ar: 'نوع التجربة',              en: 'Experience Type' },
  'settings.experienceSub':      { ar: 'اختر لغة المحتوى والألعاب', en: 'Choose content and game language' },
  'settings.experienceArabic':   { ar: 'التجربة العربية 🕌',       en: 'Arabic Experience 🕌' },
  'settings.experienceGlobal':   { ar: 'Global Games 🌍',           en: 'Global Games 🌍' },
  'settings.darkModeOn':         { ar: 'مفعّل',                    en: 'On' },
  'settings.darkModeOff':        { ar: 'معطّل',                    en: 'Off' },
  'settings.terms':              { ar: 'الشروط والأحكام',           en: 'Terms & Conditions' },
  'settings.termsMsg':           { ar: 'الشروط والأحكام ستكون متاحة عند الإطلاق الرسمي.', en: 'Terms & Conditions will be available at official launch.' },
  'settings.contact':            { ar: 'تواصل معنا',                en: 'Contact Us' },
  'settings.contactMsg':         { ar: 'support@arnex.studio',      en: 'support@arnex.studio' },
  'settings.aboutTitle':         { ar: 'ℹ️ عن التطبيق',            en: 'ℹ️ About' },
  'settings.aboutMsg':           { ar: 'Arena — ميدان التحدي\nالإصدار 1.0.0\nArnex Studio © 2026', en: 'Arena — The Challenge Arena\nVersion 1.0.0\nArnex Studio © 2026' },
  'settings.rateSoon':           { ar: 'شكراً! التقييم سيكون متاحاً في المتجر قريباً.', en: 'Thanks! Rating will be available on the store soon.' },
  'settings.logoutTitle':        { ar: 'تسجيل الخروج',             en: 'Log Out' },
  'settings.logoutConfirm':      { ar: 'تسجيل الخروج',             en: 'Log Out' },
  'settings.buyCoins':           { ar: 'شراء نقاط',                en: 'Buy Coins' },
  'settings.buyCoinsMsg':        { ar: 'متاح قريباً عند الإطلاق الرسمي.', en: 'Coming soon at official launch.' },
  'settings.copyright':          { ar: 'Arnex Studio © 2026',      en: 'Arnex Studio © 2026' },

  // ── الرموز ─────────────────────────────────────────────────
  'tokens.title':      { ar: 'رصيدك الحالي',    en: 'Your Balance' },
  'tokens.watchAd':    { ar: '📺 شاهد إعلاناً واحصل على عملات', en: '📺 Watch ad to earn coins' },
  'tokens.reward':     { ar: '+{n} 🪙 لكل إعلان', en: '+{n} 🪙 per ad' },
  'tokens.adsLeft':    { ar: 'متبقي {n}/{t} إعلانات اليوم', en: '{n}/{t} ads remaining today' },
  'tokens.watching':   { ar: '⏳ جارٍ...',       en: '⏳ Loading...' },
  'tokens.tomorrow':   { ar: '⏰ غداً',          en: '⏰ Tomorrow' },
  'tokens.watch':      { ar: '▶️ شاهد',         en: '▶️ Watch' },
  'tokens.congrats':   { ar: '🎉 تهانينا!',     en: '🎉 Congratulations!' },
  'tokens.earned':     { ar: 'حصلت على {n} 🪙', en: 'You earned {n} 🪙' },
  'tokens.great':      { ar: 'رائع!',            en: 'Great!' },
  'tokens.upgrade':    { ar: '⬆️ الترقية للبرو', en: '⬆️ Upgrade to Pro' },
  'tokens.buyCoins':   { ar: '🪙 شراء عملات',   en: '🪙 Buy Coins' },
  'tokens.planSilver': { ar: 'فضي',              en: 'Silver' },
  'tokens.planGold':   { ar: 'ذهبي',             en: 'Gold' },
  'tokens.planDiamond':{ ar: 'ماسي',             en: 'Diamond' },
  'tokens.month':      { ar: 'لمدة شهر',         en: '1 Month' },
  'tokens.year':       { ar: 'لمدة سنة',         en: '1 Year' },
  'tokens.lifetime':   { ar: 'دائمي',            en: 'Lifetime' },
  'tokens.small':      { ar: 'صغيرة',            en: 'Small' },
  'tokens.medium':     { ar: 'متوسطة',           en: 'Medium' },
  'tokens.large':      { ar: 'كبيرة',            en: 'Large' },
  'tokens.xlarge':     { ar: 'ضخمة',             en: 'Extra Large' },
  'tokens.planMsg':    { ar: 'سعر الاشتراك: {p}\n\nميزة الاشتراك ستكون متاحة عند إطلاق التطبيق الرسمي.', en: 'Subscription price: {p}\n\nThis feature will be available at official launch.' },
  'tokens.pkgMsg':     { ar: 'السعر: {p}\n\nميزة الشراء ستكون متاحة عند إطلاق التطبيق الرسمي.', en: 'Price: {p}\n\nPurchase will be available at official launch.' },
  // ✅ جديد
  'tokens.perAd':      { ar: 'لكل إعلان',        en: 'per ad' },
  'tokens.cooldown':   { ar: 'انتظر {n} ثانية',  en: 'Wait {n}s' },

  // ── المكافأة اليومية ───────────────────────────────────────
  'daily.title':    { ar: 'مكافأة يومية',             en: 'Daily Reward' },
  'daily.subtitle': { ar: 'تسجيل دخول متتالي',        en: 'Consecutive Login' },
  'daily.resetSub': { ar: 'رحّبنا بعودتك! يبدأ العداد من جديد', en: 'Welcome back! Counter resets' },
  'daily.claim':    { ar: 'استلام المكافأة 🎉',        en: 'Claim Reward 🎉' },
  'daily.token':    { ar: 'توكن',                      en: 'coins' },
  'daily.day7':     { ar: '٧✨',                       en: '7✨' },

  // ── LeaveModal ─────────────────────────────────────────────
  'leave.title':   { ar: 'مغادرة اللعبة',               en: 'Leave Game' },
  'leave.message': { ar: 'هل تريد مغادرة اللعبة؟',      en: 'Do you want to leave the game?' },
  'leave.cancel':  { ar: 'إلغاء',                        en: 'Cancel' },
  'leave.confirm': { ar: 'مغادرة',                       en: 'Leave' },

  // ── الأصدقاء ───────────────────────────────────────────────
  'friends.title':       { ar: '👥 الأصدقاء',             en: '👥 Friends' },
  'friends.addGroup':    { ar: '＋ مجموعة',               en: '＋ Group' },
  'friends.tabChats':    { ar: '💬 المحادثات',            en: '💬 Chats' },
  'friends.tabAdd':      { ar: '🔍 إضافة',                en: '🔍 Add' },
  'friends.tabRequests': { ar: '🔔 الطلبات',              en: '🔔 Requests' },
  'friends.noChats':     { ar: 'لا توجد محادثات بعد',    en: 'No conversations yet' },
  'friends.noChatsHint': { ar: 'أضف أصدقاء من تبويب "إضافة"', en: 'Add friends from the "Add" tab' },
  'friends.noRequests':  { ar: 'لا توجد طلبات',           en: 'No requests' },
  'friends.startChat':   { ar: 'ابدأ المحادثة...',        en: 'Start chatting...' },
  'friends.searchPh':    { ar: 'ابحث بالاسم أو الـ username...', en: 'Search by name or username...' },
  'friends.noResults':   { ar: 'لا نتائج',                en: 'No results' },
  'friends.addBtn':      { ar: '＋ إضافة',                en: '＋ Add' },
  'friends.sent':        { ar: '✓ أُرسل',                 en: '✓ Sent' },
  'friends.sayHi':       { ar: 'قل مرحباً!',              en: 'Say Hello!' },

  // ── ألعاب الميدان ──────────────────────────────────────────
  'games.title':                 { ar: 'ميدان الألعاب',   en: 'Games Arena' },
  'games.jalsa':                 { ar: 'جلسة',            en: 'Party' },
  'games.online':                { ar: 'أونلاين',         en: 'Online' },
  'games.jalsaDesc':             { ar: 'ألعاب تلعبها مع أصدقائك في نفس المكان', en: 'Games to play together in the same room' },
  'games.onlineDesc':            { ar: 'ألعاب تنافسية أونلاين مع أصدقائك', en: 'Competitive online games with friends' },
  'games.jalsaTab':              { ar: 'جلسة',            en: 'Party' },
  'games.onlineTab':             { ar: 'أونلاين',         en: 'Online' },
  'games.comingSoon':            { ar: 'قريباً',          en: 'Coming Soon' },
  'games.soon':                  { ar: 'قريباً',          en: 'Soon' },
  'games.newBadge':              { ar: 'جديد',            en: 'New' },
  'games.xo_title':              { ar: 'XO',              en: 'XO' },
  'games.xo_desc':               { ar: 'تحدّ صديقك في XO الكلاسيكية', en: 'Challenge a friend in classic XO' },
  'games.xo_players':            { ar: '2 لاعبين',       en: '2 players' },
  'games.bullshit_title':        { ar: 'مكشوف',           en: 'Busted' },
  'games.bullshit_desc':         { ar: 'اكشف الكاذب قبل أن يُكشف',   en: 'Catch the bluffer before they catch you' },
  'games.bullshit_players':      { ar: '3–6 لاعبين',     en: '3–6 players' },
  'games.codenames_title':       { ar: 'كلمات سرية',     en: 'Codenames' },
  'games.codenames_desc':        { ar: 'أوصل فريقك للكلمات', en: 'Lead your team to the words' },
  'games.codenames_players':     { ar: '4–8 لاعبين',     en: '4–8 players' },
  'games.manana_title':          { ar: 'من أنا؟',         en: 'Who Am I?' },
  'games.manana_desc':           { ar: 'ارفع الهاتف على جبهتك وخمّن', en: 'Hold phone to forehead and guess' },
  'games.manana_players':        { ar: '2–8 لاعبين',     en: '2–8 players' },
  'games.actitout_title':        { ar: 'بدون كلام',       en: 'Act It Out' },
  'games.actitout_desc':         { ar: 'مثّل الكلمة وفريقك يخمّن', en: 'Act it out, team guesses' },
  'games.actitout_players':      { ar: '4–12 لاعبين',    en: '4–12 players' },
  'games.truthdare_title':       { ar: 'صراحة أو تحدي',  en: 'Truth or Dare' },
  'games.truthdare_desc':        { ar: 'عجلة تختار من يسأل ومن يُسأل', en: 'Spin to pick who asks' },
  'games.truthdare_players':     { ar: '2+ لاعبين',      en: '2+ players' },
  'games.rankfriends_title':     { ar: 'رتّب أصدقاءك',   en: 'Rank Your Friends' },
  'games.rankfriends_desc':      { ar: 'من الأكثر كذباً؟ من سيتزوج أول؟', en: 'Who lies most? Who marries first?' },
  'games.rankfriends_players':   { ar: '3–10 لاعبين',    en: '3–10 players' },
  'games.neverhaveiever_title':  { ar: 'ما سويت',        en: 'Never Have I Ever' },
  'games.neverhaveiever_desc':   { ar: 'اعترف أو خسر إصبعاً', en: 'Confess or lose a finger' },
  'games.neverhaveiever_players':{ ar: '2–8 لاعبين',     en: '2–8 players' },
  'games.drawguess_title':       { ar: 'رسم وتخمين',     en: 'Draw & Guess' },
  'games.drawguess_desc':        { ar: 'ارسم والآخرون يخمّنون', en: 'Draw and let others guess' },
  'games.drawguess_players':     { ar: '2–8 لاعبين',     en: '2–8 players' },

  'games.mafia_title':    { ar: 'المافيا',                      en: 'Mafia' },
  'games.mafia_desc':     { ar: 'اكشف المافيا قبل فوات الأوان', en: "Unmask the mafia before it's too late" },
  'games.mafia_players':  { ar: '5–12 لاعباً',                   en: '5–12 players' },
  'games.wordle_title':   { ar: 'وردل',                          en: 'Wordle' },
  'games.wordle_desc':    { ar: 'خمّن الكلمة في 6 محاولات',      en: 'Guess the word in 6 tries' },
  'games.wordle_players': { ar: '2–8 لاعبين',                   en: '2–8 players' },
  'games.kout_title':            { ar: 'كوت بو 6',       en: 'Kout Bo 6' },
  'games.kout_desc':             { ar: 'لعبة ورق خليجية تنافسية', en: 'Gulf competitive card game' },
  'games.kout_players':          { ar: '4–6 لاعبين',     en: '4–6 players' },
  'games.biloot_title':          { ar: 'بلوت',            en: 'Baloot' },
  'games.biloot_desc':           { ar: 'لعبة البلوت الكلاسيكية', en: 'Classic Baloot card game' },
  'games.biloot_players':        { ar: '4 لاعبين',        en: '4 players' },
  'games.dominoes_title':        { ar: 'دومينو',           en: 'Dominoes' },
  'games.dominoes_desc':         { ar: 'رتّب قطعك وتحدَّ خصومك', en: 'Place your tiles and challenge opponents' },
  'games.dominoes_players':      { ar: '4 لاعبين',        en: '4 players' },
  'games.whoisspy_title':       { ar: 'من الجاسوس؟',            en: "Who's the Spy?" },
  'games.whoisspy_desc':        { ar: 'كلمة مشتركة وشخص واحد يكذب', en: 'One shared word, one spy' },
  'games.whoisspy_players':     { ar: '3–12 لاعباً',              en: '3–12 players' },
  'games.poker_title':           { ar: 'بوكر',             en: 'Poker' },
  'games.poker_desc':            { ar: 'بوكر تكساس — قريباً', en: "Texas Hold'em — Coming soon" },
  'games.poker_players':         { ar: '2–6 لاعبين',      en: '2–6 players' },
  'games.guessimage_title':      { ar: 'تخمين الصورة',    en: 'Guess the Image' },
  'games.guessimage_desc':       { ar: 'صورة أمامك — خصمك يسأل وأنت تجيب', en: 'Image on your face — opponent asks yes/no' },
  'games.guessimage_players':    { ar: 'لاعبان',           en: '2 players' },

  // ── XO ─────────────────────────────────────────────────────
  'xo.youWon':        { ar: '🎉 فزت!',               en: '🎉 You Won!' },
  'xo.opponentWon':   { ar: '😔 الخصم فاز',          en: '😔 Opponent Won' },
  'xo.drawMsg':       { ar: '🤝 تعادل!',             en: '🤝 Draw!' },
  'xo.score':         { ar: 'النتيجة',               en: 'Score' },
  'xo.round':         { ar: 'جولة {c}/{t}',          en: 'Round {c}/{t}' },
  'xo.waiting':       { ar: '⏳ انتظار الخصم...',    en: '⏳ Waiting for opponent...' },
  'xo.searching':     { ar: '🔍 البحث عن خصم...',   en: '🔍 Searching for opponent...' },
  'xo.botPlaying':    { ar: '🤖 البوت يفكر...',      en: '🤖 Bot is thinking...' },
  'xo.playAgain':     { ar: 'جولة أخرى',             en: 'Play Again' },
  'xo.randomMode':    { ar: '🎲 عشوائي',             en: '🎲 Random' },
  'xo.randomDesc':    { ar: 'العب ضد لاعب عشوائي — بوت بعد 60 ثانية', en: 'Play vs random player — bot after 60s' },
  'xo.inviteMode':    { ar: '👥 دعوة صديق',          en: '👥 Invite Friend' },
  'xo.inviteDesc':    { ar: 'أنشئ غرفة خاصة وأرسل الكود لصديقك', en: 'Create a private room and share the code' },
  'xo.sameDevice':    { ar: '📱 نفس الجهاز',         en: '📱 Same Device' },
  'xo.sameDeviceDesc':{ ar: 'العب مع صديق على نفس الجهاز', en: 'Play with a friend on the same device' },
  'xo.createRoom':    { ar: '➕ إنشاء غرفة',         en: '➕ Create Room' },
  'xo.createRoomDesc':{ ar: 'سيُولَّد كود خاص — أرسله لصديقك', en: 'A private code will be generated — share it' },
  'xo.roomCode':      { ar: 'كود الغرفة',            en: 'Room Code' },
  'xo.copyCode':      { ar: 'نسخ الكود',             en: 'Copy Code' },
  'xo.copied':        { ar: 'تم النسخ',              en: 'Copied' },
  'xo.inviteMsg':     { ar: 'انضم لجلسة XO، الكود:', en: 'Join my XO game, code:' },
  'xo.waitingFriend': { ar: 'في انتظار صديقك...',   en: 'Waiting for your friend...' },
  'xo.joinWithCode':  { ar: 'انضم برمز صديقك',       en: "Join with your friend's code" },
  'xo.codePh':        { ar: '000000',                en: '000000' },
  'xo.join':          { ar: 'انضم',                  en: 'Join' },
  'xo.joining':       { ar: '⏳ جارٍ الانضمام...',  en: '⏳ Joining...' },
  'xo.roomNotFound':  { ar: 'الغرفة غير موجودة أو امتلأت', en: 'Room not found or already full' },

  // ── Mafia ──────────────────────────────────────────────────
  'mafia.role_mafia':     { ar: 'مافيا',                    en: 'Mafia' },
  'mafia.role_detective': { ar: 'محقق',                    en: 'Detective' },
  'mafia.role_doctor':    { ar: 'طبيب',                    en: 'Doctor' },
  'mafia.role_civilian':  { ar: 'مواطن',                   en: 'Civilian' },
  'mafia.day':            { ar: '☀️ النهار',                en: '☀️ Day' },
  'mafia.night':          { ar: '🌙 الليل',                 en: '🌙 Night' },
  'mafia.vote':           { ar: 'صوّت لطرد',               en: 'Vote to Eliminate' },
  'mafia.mafiaWin':       { ar: '🔪 المافيا فازت!',        en: '🔪 Mafia Won!' },
  'mafia.civWin':         { ar: '✅ المواطنون فازوا!',     en: '✅ Civilians Won!' },
  'mafia.waiting':        { ar: 'انتظار اللاعبين...',      en: 'Waiting for players...' },
  'mafia.minPlayers':     { ar: 'يحتاج 4 لاعبين على الأقل', en: 'Needs at least 4 players' },

  // ── Bullshit ───────────────────────────────────────────────
  'bullshit.title':    { ar: 'بوليشيت',                    en: 'Bullshit' },
  'bullshit.yourTurn': { ar: 'دورك! العب ورقة',            en: 'Your Turn! Play a card' },
  'bullshit.challenge':{ ar: '🚩 كذب!',                   en: '🚩 Bullshit!' },
  'bullshit.pass':     { ar: '✅ صدّق',                   en: '✅ Believe' },
  'bullshit.waiting':  { ar: 'انتظار اللاعبين...',         en: 'Waiting for players...' },
  'bullshit.cards':    { ar: '{n} ورقة',                  en: '{n} card(s)' },
  'bullshit.pile':     { ar: 'الكومة: {n} ورقة',          en: 'Pile: {n} card(s)' },
  'bullshit.gameWin':  { ar: '🏆 فزت باللعبة!',           en: '🏆 You won the game!' },
  'bullshit.cleared':  { ar: '🎉 تفريغ! أنت تفوز بالجولة', en: '🎉 Empty! You win this round' },

  // ── Codenames ──────────────────────────────────────────────
  'codenames.title':         { ar: 'كلمات سرية',           en: 'Codenames' },
  'codenames.blueTeam':      { ar: 'الفريق الأزرق',        en: 'Blue Team' },
  'codenames.redTeam':       { ar: 'الفريق الأحمر',        en: 'Red Team' },
  'codenames.spymaster':     { ar: 'قائد',                 en: 'Spymaster' },
  'codenames.operative':     { ar: 'عميل',                 en: 'Operative' },
  'codenames.giveClue':      { ar: 'أعطِ تلميحاً',         en: 'Give a Clue' },
  'codenames.endTurn':       { ar: 'إنهاء الدور',           en: 'End Turn' },
  'codenames.blueWin':       { ar: '🏆 الفريق الأزرق فاز!', en: '🏆 Blue Team Won!' },
  'codenames.redWin':        { ar: '🏆 الفريق الأحمر فاز!', en: '🏆 Red Team Won!' },
  'codenames.hitAssassin':   { ar: '💀 لمستم العميل! خسرتم', en: '💀 Hit the Assassin! You lose' },
  'codenames.noPlayers':     { ar: 'لا يوجد لاعبون نشطون حالياً', en: 'No active players currently' },
  'codenames.createPrivate': { ar: 'إنشاء غرفة خاصة',      en: 'Create Private Room' },

  // ── Man Ana ────────────────────────────────────────────────
  'manana.title':        { ar: '🤔 من أنا؟',              en: '🤔 Who Am I?' },
  'manana.subtitle':     { ar: 'ارفع الهاتف على جبهتك وخمّن الشخصية', en: 'Hold phone to forehead and guess' },
  'manana.playerCount':  { ar: 'عدد اللاعبين',            en: 'Number of Players' },
  'manana.timePerRound': { ar: 'وقت كل جولة',             en: 'Time Per Round' },
  'manana.playerTurn':   { ar: 'دور اللاعب {n}',          en: "Player {n}'s Turn" },
  'manana.raisePhone':   { ar: 'ارفع الهاتف على جبهتك\nثم اضغط ابدأ', en: 'Raise phone to forehead\nthen press Start' },
  'manana.correct':      { ar: '✅ صح',                   en: '✅ Correct' },
  'manana.skip':         { ar: '⏭ تخطي',                 en: '⏭ Skip' },
  'manana.timeUp':       { ar: 'انتهى وقت اللاعب {n}',   en: "Player {n}'s time is up" },
  'manana.score':        { ar: 'نقاطه: {n}',              en: 'Score: {n}' },
  'manana.nextPlayer':   { ar: 'دور اللاعب {n} ←',       en: "Player {n}'s Turn →" },
  'manana.winner':       { ar: 'اللاعب {n} فاز!',        en: 'Player {n} Won!' },

  // ── Truth or Dare ──────────────────────────────────────────
  'truthdare.title':        { ar: '😈 صراحة أو تحدي',    en: '😈 Truth or Dare' },
  'truthdare.enterNames':   { ar: 'أدخل أسماء اللاعبين', en: 'Enter player names' },
  'truthdare.spinBtn':      { ar: '🎰 دوّر',             en: '🎰 Spin' },
  'truthdare.spinning':     { ar: '⏳ جاري...',           en: '⏳ Spinning...' },
  'truthdare.truth':        { ar: '🗣 صراحة',            en: '🗣 Truth' },
  'truthdare.dare':         { ar: '😈 تحدي',             en: '😈 Dare' },
  'truthdare.answered':     { ar: '✅ أجاب صادقاً',       en: '✅ Answered Honestly' },
  'truthdare.refused':      { ar: '❌ رفض',              en: '❌ Refused' },
  'truthdare.doneChallenge':{ ar: '✅ نفّذ التحدي',      en: '✅ Completed Dare' },
  'truthdare.finalResults': { ar: 'النتائج النهائية',     en: 'Final Results' },

  // ── Never Have I Ever ──────────────────────────────────────
  'neverhaveiever.title':    { ar: '☝️ أنا لم أفعل',      en: '☝️ Never Have I Ever' },
  'neverhaveiever.subtitle': { ar: 'كل لاعب يبدأ بـ 5 أصابع — من يخسر كل أصابعه أولاً يخسر!', en: 'Everyone starts with 5 fingers — who loses all first?' },
  'neverhaveiever.didIt':    { ar: '✋ فعلتها',           en: '✋ I Did It' },
  'neverhaveiever.didntDoIt':{ ar: '☝️ لم أفعل',         en: '☝️ Never Done It' },
  'neverhaveiever.round':    { ar: 'جملة {n} / {t}',      en: 'Statement {n} / {t}' },
  'neverhaveiever.loser':    { ar: '{n} خسر!',            en: '{n} lost!' },

  // ── Rank Friends ───────────────────────────────────────────
  'rankfriends.title':       { ar: '🏆 رتّب أصدقاءك',    en: '🏆 Rank Your Friends' },
  'rankfriends.qOf':         { ar: 'سؤال {c} / {t}',      en: 'Question {c} / {t}' },
  'rankfriends.nextQ':       { ar: 'السؤال التالي ←',     en: 'Next Question →' },
  'rankfriends.showResults': { ar: 'عرض النتائج 🏆',      en: 'Show Results 🏆' },
  'rankfriends.resetRank':   { ar: '↺ إعادة الترتيب',    en: '↺ Reset Ranking' },
  'rankfriends.revealTitle': { ar: 'إليكم ما قاله الجميع... 👀', en: "Here's what everyone said... 👀" },
  'rankfriends.exitQ':       { ar: 'هل تريد الخروج من اللعبة؟', en: 'Exit the game?' },
  'rankfriends.minPlayers':  { ar: 'أضف 3 لاعبين على الأقل', en: 'Add at least 3 players' },
  'rankfriends.coinsNeeded': { ar: 'تحتاج 10 توكنز لبدء اللعبة', en: 'Need 10 coins to start' },
  'rankfriends.goToMarket':  { ar: 'اذهب إلى السوق',     en: 'Go to Store' },
  'rankfriends.startBtn':    { ar: '🏆 ابدأ اللعبة  🪙 10', en: '🏆 Start Game  🪙 10' },

  // ── Act It Out ─────────────────────────────────────────────
  'actitout.title':       { ar: '🕺 بدون كلام',           en: '🕺 Act It Out' },
  'actitout.subtitle':    { ar: 'مثّل الكلمة وفريقك يخمّن قبل انتهاء الوقت', en: 'Act out the word before time runs out' },
  'actitout.reveal':      { ar: 'اكشف ←',                en: 'Reveal →' },
  'actitout.guessed':     { ar: '✅ خمّن الفريق! +10',   en: '✅ Team Guessed! +10' },
  'actitout.correct':     { ar: '✓ صح! +10',             en: '✓ Correct! +10' },
  'actitout.wrong':       { ar: '✗ خطأ',                 en: '✗ Wrong' },
  'actitout.skipRound':   { ar: 'تخطي الجولة',           en: 'Skip Round' },
  'actitout.stealChance': { ar: 'فرصة {t} للسرقة 🔥',   en: "{t}'s steal chance 🔥" },
  'actitout.timeUp':      { ar: 'انتهى الوقت!',          en: "Time's Up!" },
  'actitout.teamGuessed': { ar: '✅ أجاب الفريق! +10',   en: '✅ Team Guessed! +10' },

  // ── Draw & Guess ───────────────────────────────────────────
  'drawguess.title':     { ar: '🎨 رسم وتخمين',           en: '🎨 Draw & Guess' },
  'drawguess.subtitle':  { ar: 'ارسم والآخرون يخمّنون — الأسرع يفوز!', en: 'Draw and let others guess — fastest wins!' },
  'drawguess.start':     { ar: 'ابدأ اللعبة ←',           en: 'Start Game →' },
  'drawguess.correct':   { ar: '🎉 صح!',                 en: '🎉 Correct!' },
  'drawguess.wrong':     { ar: '❌ خطأ',                  en: '❌ Wrong' },
  'drawguess.roundEnd':  { ar: '⏰ انتهت الجولة!',        en: '⏰ Round Over!' },
  'drawguess.wordWas':   { ar: 'الكلمة كانت: {w}',        en: 'The word was: {w}' },
  'drawguess.nextRound': { ar: 'الجولة التالية ←',        en: 'Next Round →' },
  'drawguess.gameOver':  { ar: 'انتهت اللعبة!',           en: 'Game Over!' },

  // ── Wordle ─────────────────────────────────────────────────
  'wordle.title':        { ar: 'خمّن الكلمة',             en: 'Wordle' },
  'wordle.solo':         { ar: '🎯 فردي',                 en: '🎯 Solo' },
  'wordle.local':        { ar: '🏠 محلي',                 en: '🏠 Local' },
  'wordle.online':       { ar: '🌐 أونلاين',              en: '🌐 Online' },
  'wordle.soloDesc':     { ar: 'خمّن الكلمة في 6 محاولات', en: 'Guess the word in 6 tries' },
  'wordle.localDesc':    { ar: 'العب مع صديق على نفس الجهاز', en: 'Play with a friend on the same device' },
  'wordle.onlineDesc':   { ar: 'تحدَّ أصدقاءك عبر الإنترنت', en: 'Challenge friends online' },
  'wordle.yourTurn':     { ar: 'دورك',                    en: 'Your Turn' },
  'wordle.opponentTurn': { ar: 'دور الخصم',               en: "Opponent's Turn" },
  'wordle.youWon':       { ar: '🎉 فزت!',                 en: '🎉 You Won!' },
  'wordle.opponentWon':  { ar: '😔 الخصم فاز',            en: '😔 Opponent Won' },
  'wordle.draw':         { ar: '🤝 تعادل!',               en: '🤝 Draw!' },
  'wordle.notWord':      { ar: 'ليست كلمة صحيحة',         en: 'Not a valid word' },
  'wordle.tooShort':     { ar: 'الكلمة قصيرة جداً',       en: 'Word too short' },
  'wordle.solved':       { ar: '✅ أصبت! الكلمة: {w}',   en: '✅ Correct! Word: {w}' },
  'wordle.failed':       { ar: '❌ الكلمة كانت: {w}',    en: '❌ The word was: {w}' },
  'wordle.searching':    { ar: '🔍 البحث عن خصم...',     en: '🔍 Searching for opponent...' },
  'wordle.waiting':      { ar: '⏳ انتظار الخصم...',      en: '⏳ Waiting for opponent...' },
  'wordle.roomCode':     { ar: 'كود الغرفة',              en: 'Room Code' },
  'wordle.share':        { ar: 'مشاركة الكود',            en: 'Share Code' },
  'wordle.enter':        { ar: 'انضم برمز',               en: 'Join with code' },
  'wordle.attemptsLeft': { ar: 'محاولات متبقية: {n}',     en: 'Attempts left: {n}' },

  // ── Onboarding ─────────────────────────────────────────────
  'onboarding.choose':         { ar: 'اختر تجربتك',       en: 'Choose your experience' },
  'onboarding.footer':         { ar: 'يمكنك تغيير هذا لاحقاً من الإعدادات', en: 'You can change this later in Settings' },
  'onboarding.global.title':   { ar: 'Global Games',       en: 'Global Games' },
  'onboarding.global.desc':    { ar: 'ألعاب جماعية بدون حدود لغوية', en: 'Party games for everyone, no language barriers' },
  'onboarding.global.f1':      { ar: '✅ XO · بوليشيت · مافيا · رسم', en: '✅ XO · Bullshit · Mafia · Drawing' },
  'onboarding.global.f2':      { ar: '✅ بدون كلام · كلمات سرية', en: '✅ Act It Out · Codenames' },
  'onboarding.global.f3':      { ar: '✅ أونلاين وجلسة',   en: '✅ Online & Local play' },
  'onboarding.arabic.title':   { ar: 'التجربة العربية',    en: 'Arabic Experience' },
  'onboarding.arabic.desc':    { ar: 'كل شيء + أسئلة ثقافية عربية', en: 'Everything + Arabic trivia' },
  'onboarding.arabic.f1':      { ar: '✅ كل ألعاب Global', en: '✅ All Global games' },
  'onboarding.arabic.f2':      { ar: '✅ ميدان المعلومات — أسئلة ثقافية', en: '✅ Knowledge Arena — trivia' },
  'onboarding.arabic.f3':      { ar: '✅ من أنا؟ · صراحة أو تحدي', en: '✅ Who Am I? · Truth or Dare' },

  // ── ✅ جديد: وسائل المساعدة ────────────────────────────────
  'lifeline.bar':            { ar: '🛡️ وسائل المساعدة',       en: '🛡️ Lifelines' },
  'lifeline.hint':           { ar: '💡 تلميح',                 en: '💡 Hint' },
  'lifeline.hintDesc':       { ar: 'أول حرف من الجواب',        en: 'First letter of the answer' },
  'lifeline.eliminate':      { ar: '➖ حذف خيارين',            en: '➖ Eliminate 2' },
  'lifeline.eliminateDesc':  { ar: 'أزل اثنين من الإجابات الخاطئة', en: 'Remove 2 wrong choices' },
  'lifeline.swapSame':       { ar: '🔄 تبديل (نفس)',            en: '🔄 Swap (Same)' },
  'lifeline.swapSameDesc':   { ar: 'سؤال آخر — نفس الفئة والمستوى', en: 'Another Q — same category & level' },
  'lifeline.swapRandom':     { ar: '🎲 تبديل (عشوائي)',         en: '🎲 Swap (Random)' },
  'lifeline.swapRandomDesc': { ar: 'سؤال من أي فئة',           en: 'Question from any category' },
  'lifeline.freeze':         { ar: '⏸ تجميد الوقت',            en: '⏸ Freeze Timer' },
  'lifeline.freezeDesc':     { ar: 'يوقف العداد 20 ثانية',     en: 'Pause timer for 20 seconds' },
  'lifeline.used':           { ar: 'استُخدمت',                  en: 'Used' },
  'lifeline.cost':           { ar: 'السعر',                     en: 'Cost' },
  'lifeline.watchAd':        { ar: '📺 شاهد إعلاناً مجاناً',   en: '📺 Watch ad for free' },
  'lifeline.premiumFree':    { ar: '💎 مجاني — بريميوم',       en: '💎 Free — Premium' },
  'lifeline.useTokens':      { ar: '🪙 استخدم {n} توكن',        en: '🪙 Use {n} tokens' },
  'lifeline.useFree':        { ar: '💎 استخدم مجاناً',          en: '💎 Use for free' },
  'lifeline.hintAlert':      { ar: '💡 تلميح',                 en: '💡 Hint' },
  'lifeline.hintMsg':        { ar: 'الإجابة تبدأ بـ: "{c}"',   en: 'Answer starts with: "{c}"' },
  'lifeline.noMore':         { ar: 'لا توجد أسئلة أخرى في هذه الفئة', en: 'No more questions in this category' },
  'lifeline.noQuestions':    { ar: 'لا توجد أسئلة متاحة',      en: 'No questions available' },
  'lifeline.insufficientMsg':{ ar: 'شاهد إعلاناً للحصول على الوسيلة مجاناً', en: 'Watch an ad to use this lifeline for free' },

  // ── ✅ جديد: البطولة ───────────────────────────────────────
  'tournament.week':         { ar: 'بطولة الأسبوع',            en: 'Weekly Tournament' },
  'tournament.endsIn':       { ar: '⏰ ينتهي بعد:',             en: '⏰ Ends in:' },
  'tournament.ended':        { ar: 'انتهت',                     en: 'Ended' },
  'tournament.joinNow':      { ar: '⚡ شارك الآن',              en: '⚡ Join Now' },
  'tournament.leaderboard':  { ar: '🏅 الصدارة',                en: '🏅 Leaderboard' },
  'tournament.myRank':       { ar: 'مركزك:',                    en: 'Your rank:' },
  'tournament.pts':          { ar: 'نقطة',                      en: 'pts' },
  'tournament.prize1':       { ar: '🥇 بريميوم شهر + 1,000 توكن', en: '🥇 1 Month Premium + 1,000 coins' },
  'tournament.prize2':       { ar: '🥈 بريميوم شهر + 800 توكن',   en: '🥈 1 Month Premium + 800 coins' },
  'tournament.prize3':       { ar: '🥉 بريميوم شهر + 600 توكن',   en: '🥉 1 Month Premium + 600 coins' },
  'tournament.prize4_10':    { ar: '500 توكن',                  en: '500 coins' },
  'tournament.prize11_20':   { ar: '300 توكن',                  en: '300 coins' },

};

// ══════════════════════════════════════════════════════════════
// Context
// ══════════════════════════════════════════════════════════════
const LangContext = createContext({ lang: 'ar', setLang: () => {}, isRTL: true });
const I18nContext = createContext(() => '');

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState('ar');
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    AsyncStorage.getItem(LANG_KEY).then(saved => {
      if (saved === 'ar' || saved === 'en') setLangState(saved);
    });
  }, []);

  const setLang = useCallback(async (newLang) => {
    if (newLang === lang) return;
    Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      setLangState(newLang);
      AsyncStorage.setItem(LANG_KEY, newLang);
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });
  }, [lang, fadeAnim]);

  const isRTL = lang === 'ar';

  const t = useCallback((key, params) => {
    const entry = T[key];
    if (!entry) return key;
    let text = entry[lang] ?? entry.ar ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replaceAll(`{${k}}`, String(v));
      }
    }
    return text;
  }, [lang]);

  const langValue = useMemo(() => ({ lang, setLang, isRTL, fadeAnim }), [lang, setLang, isRTL]);

  return (
    <LangContext.Provider value={langValue}>
      <I18nContext.Provider value={t}>
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          {children}
        </Animated.View>
      </I18nContext.Provider>
    </LangContext.Provider>
  );
}

// ══════════════════════════════════════════════════════════════
// Hooks
// ══════════════════════════════════════════════════════════════
export function useLanguage() {
  const { lang, setLang, isRTL } = useContext(LangContext);
  const t = useContext(I18nContext);
  return { t, lang, setLang, isRTL };
}

export function useT() {
  return useContext(I18nContext);
}

// ══════════════════════════════════════════════════════════════
// useRTLStyles
// ══════════════════════════════════════════════════════════════
export function useRTLStyles() {
  const { isRTL } = useContext(LangContext);
  return useMemo(() => ({
    text:         { textAlign: isRTL ? 'right' : 'left' },
    textCenter:   { textAlign: 'center' },
    textInput:    { textAlign: isRTL ? 'right' : 'left' },
    row:          { flexDirection: isRTL ? 'row' : 'row-reverse' },
    rowReverse:   { flexDirection: isRTL ? 'row-reverse' : 'row' },
    rowNormal:    { flexDirection: 'row' },
    paddingStart: isRTL ? { paddingRight: 16 } : { paddingLeft: 16 },
    paddingEnd:   isRTL ? { paddingLeft:  16 } : { paddingRight: 16 },
    marginStart:  isRTL ? { marginRight: 16  } : { marginLeft: 16 },
    fontFamily:   isRTL ? undefined : undefined,
    dir:          isRTL ? 'rtl' : 'ltr',
    isRTL,
  }), [isRTL]);
}

// ══════════════════════════════════════════════════════════════
// مكوّنات مساعدة
// ══════════════════════════════════════════════════════════════
export const Txt = memo(({ k, params, style, ...props }) => {
  const t = useT();
  return <Text style={style} {...props}>{t(k, params)}</Text>;
});

export const RTLView = memo(({ style, children, ...props }) => {
  const { isRTL } = useContext(LangContext);
  return (
    <View style={[{ flexDirection: isRTL ? 'row' : 'row-reverse' }, style]} {...props}>
      {children}
    </View>
  );
});

// ══════════════════════════════════════════════════════════════
// دوال مساعدة خارج المكوّنات
// ══════════════════════════════════════════════════════════════
let _currentLang = 'ar';

export function tStatic(key, params) {
  const entry = T[key];
  if (!entry) return key;
  let text = entry[_currentLang] ?? entry.ar ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replaceAll(`{${k}}`, String(v));
    }
  }
  return text;
}

export function LangSync() {
  const { lang } = useContext(LangContext);
  useEffect(() => { _currentLang = lang; }, [lang]);
  return null;
}
 
