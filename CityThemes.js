// ══════════════════════════════════════════════════════════════
//  🌍 City Themes — مجموعة ثيمات المدن (11 مدينة)
//  أوقات: 🌅 فجر (3) | 🌇 غروب (3) | 🌕 ليل (5)
//
//  كل ثيم يحتوي على:
//  - نفس مفاتيح DARK للتوافق الكامل مع كل الشاشات
//  - isCityTheme: true — للتمييز
//  - skyGradient: [...] — ألوان السماء من الأسفل للأعلى
//  - skyBottom: string — لون أسفل السماء (للـ fade)
//  - skylineAsset: require(...) — صورة المباني الشفافة
//  - starCount: number — عدد النجوم (0 للغروب)
//  - timeOfDay: 'dawn' | 'dusk' | 'night'
// ══════════════════════════════════════════════════════════════

// ─── 🌅 فجر القدس ───────────────────────────────────────────
export const CITY_JERUSALEM = {
  id: 'city_jerusalem',
  isCityTheme: true,
  timeOfDay: 'dawn',

  // السماء: بنفسجي داكن أعلى ← ذهبي ترابي دافئ في الأفق
  skyGradient: ['#100820', '#180e30', '#281440', '#3c1c48', '#5c3040', '#7a5030'],
  skyBottom: '#7a5030',
  skylineAsset: require('./assets/skylines/jerusalem.png'),
  starCount: 12,

  // الألوان
  accent:       '#c8a855',  // ذهبي حجري دافئ
  accentSoft:   'rgba(200,168,85,0.15)',
  accentBorder: 'rgba(200,168,85,0.28)',
  purple:       '#d4906a',  // وردي ترابي — تباين واضح
  purpleSoft:   'rgba(212,144,106,0.12)',
  purpleBorder: 'rgba(212,144,106,0.28)',

  bg:          '#100820',
  bgCard:      'rgba(200,168,85,0.08)',
  bgElevated:  'rgba(200,168,85,0.12)',
  bgInput:     'rgba(122,80,48,0.30)',
  bgOverlay:   'rgba(0,0,0,0.70)',

  textPrimary:   'rgba(240,220,170,0.96)',
  textSecondary: 'rgba(185,158,100,0.75)',
  textMuted:     'rgba(200,168,85,0.50)',
  textOnAccent:  '#100820',

  border:        'rgba(200,168,85,0.20)',
  divider:       'rgba(200,168,85,0.12)',
  borderCard:    'rgba(200,168,85,0.22)',

  success:   '#34d399',
  error:     '#f87171',
  warning:   '#fbbf24',

  statusBar: 'light-content',
  statusBg:  '#100820',
};

// ─── 🌸 فجر طوكيو ────────────────────────────────────────────
export const CITY_TOKYO = {
  id: 'city_tokyo',
  isCityTheme: true,
  timeOfDay: 'dawn',

  // السماء: بنفسجي غامق أعلى ← خوخي دافئ في الأفق
  skyGradient: ['#180e28', '#301840', '#502458', '#703060', '#a04868', '#c87060'],
  skyBottom: '#c87060',
  skylineAsset: require('./assets/skylines/tokyo.png'),
  starCount: 10,

  accent:       '#f0a0b5',  // وردي خوخي فاتح
  accentSoft:   'rgba(240,160,181,0.15)',
  accentBorder: 'rgba(240,160,181,0.28)',
  purple:       '#7855a8',  // بنفسجي غامق — تباين قوي
  purpleSoft:   'rgba(120,85,168,0.12)',
  purpleBorder: 'rgba(120,85,168,0.28)',

  bg:          '#180e28',
  bgCard:      'rgba(240,160,181,0.08)',
  bgElevated:  'rgba(240,160,181,0.12)',
  bgInput:     'rgba(80,36,88,0.30)',
  bgOverlay:   'rgba(0,0,0,0.70)',

  textPrimary:   'rgba(255,220,230,0.96)',
  textSecondary: 'rgba(220,160,180,0.75)',
  textMuted:     'rgba(240,160,181,0.50)',
  textOnAccent:  '#180e28',

  border:        'rgba(240,160,181,0.20)',
  divider:       'rgba(240,160,181,0.12)',
  borderCard:    'rgba(240,160,181,0.22)',

  success:   '#34d399',
  error:     '#f87171',
  warning:   '#fbbf24',

  statusBar: 'light-content',
  statusBg:  '#180e28',
};

// ─── 🌫️ فجر أمستردام ─────────────────────────────────────────
export const CITY_AMSTERDAM = {
  id: 'city_amsterdam',
  isCityTheme: true,
  timeOfDay: 'dawn',

  // السماء: أزرق داكن أعلى ← رمادي ضبابي فاتح في الأفق
  skyGradient: ['#0c1420', '#141e2e', '#1e2c3c', '#283848', '#384858', '#485868'],
  skyBottom: '#485868',
  skylineAsset: require('./assets/skylines/amsterdam.png'),
  starCount: 6,

  accent:       '#8ab5d5',  // أزرق رمادي ضبابي
  accentSoft:   'rgba(138,181,213,0.15)',
  accentBorder: 'rgba(138,181,213,0.28)',
  purple:       '#c0d8ee',  // أفتح وأبرد — تباين معكوس ناعم
  purpleSoft:   'rgba(192,216,238,0.12)',
  purpleBorder: 'rgba(192,216,238,0.28)',

  bg:          '#0c1420',
  bgCard:      'rgba(138,181,213,0.08)',
  bgElevated:  'rgba(138,181,213,0.12)',
  bgInput:     'rgba(30,44,60,0.40)',
  bgOverlay:   'rgba(0,0,0,0.70)',

  textPrimary:   'rgba(210,228,242,0.96)',
  textSecondary: 'rgba(150,182,208,0.75)',
  textMuted:     'rgba(138,181,213,0.50)',
  textOnAccent:  '#0c1420',

  border:        'rgba(138,181,213,0.20)',
  divider:       'rgba(138,181,213,0.12)',
  borderCard:    'rgba(138,181,213,0.22)',

  success:   '#34d399',
  error:     '#f87171',
  warning:   '#fbbf24',

  statusBar: 'light-content',
  statusBg:  '#0c1420',
};

// ─── 🌴 غروب بغداد ───────────────────────────────────────────
export const CITY_BAGHDAD = {
  id: 'city_baghdad',
  isCityTheme: true,
  timeOfDay: 'dusk',

  // السماء: نيلي داكن أعلى ← ذهبي مخفف في الأفق (مش محرق)
  skyGradient: ['#0a0418', '#180830', '#300e50', '#501838', '#783020', '#a06020', '#c89030'],
  skyBottom: '#8a6020',  // مخفف بدل #c89030 المشبع
  skylineAsset: require('./assets/skylines/baghdad.png'),
  starCount: 5,

  accent:       '#d4a028',  // ذهبي صافٍ — لون دجلة
  accentSoft:   'rgba(212,160,40,0.15)',
  accentBorder: 'rgba(212,160,40,0.28)',
  purple:       '#a04830',  // أحمر طيني حار — تباين دافئ/حار
  purpleSoft:   'rgba(160,72,48,0.12)',
  purpleBorder: 'rgba(160,72,48,0.28)',

  bg:          '#0a0418',
  bgCard:      'rgba(212,160,40,0.08)',
  bgElevated:  'rgba(212,160,40,0.12)',
  bgInput:     'rgba(80,24,56,0.35)',
  bgOverlay:   'rgba(0,0,0,0.72)',

  textPrimary:   'rgba(245,220,160,0.96)',
  textSecondary: 'rgba(200,165,95,0.75)',
  textMuted:     'rgba(212,160,40,0.50)',
  textOnAccent:  '#0a0418',

  border:        'rgba(212,160,40,0.20)',
  divider:       'rgba(212,160,40,0.12)',
  borderCard:    'rgba(212,160,40,0.22)',

  success:   '#34d399',
  error:     '#f87171',
  warning:   '#fbbf24',

  statusBar: 'light-content',
  statusBg:  '#0a0418',
};

// ─── 🌉 غروب إسطنبول ─────────────────────────────────────────
export const CITY_ISTANBUL = {
  id: 'city_istanbul',
  isCityTheme: true,
  timeOfDay: 'dusk',

  // السماء: نيلي داكن أعلى ← برتقالي أحمر مخفف في الأفق
  skyGradient: ['#080418', '#180830', '#301060', '#501848', '#783040', '#a04028', '#b85828'],
  skyBottom: '#7a4018',  // مخفف بدل #c06030
  skylineAsset: require('./assets/skylines/istanbul.png'),
  starCount: 4,

  accent:       '#d06030',  // برتقالي محمر — لون البوسفور
  accentSoft:   'rgba(208,96,48,0.15)',
  accentBorder: 'rgba(208,96,48,0.28)',
  purple:       '#8040a0',  // بنفسجي أفق — تباين دافئ/بارد قوي
  purpleSoft:   'rgba(128,64,160,0.12)',
  purpleBorder: 'rgba(128,64,160,0.28)',

  bg:          '#080418',
  bgCard:      'rgba(208,96,48,0.08)',
  bgElevated:  'rgba(208,96,48,0.12)',
  bgInput:     'rgba(80,24,72,0.35)',
  bgOverlay:   'rgba(0,0,0,0.72)',

  textPrimary:   'rgba(245,210,185,0.96)',
  textSecondary: 'rgba(205,155,115,0.75)',
  textMuted:     'rgba(208,96,48,0.50)',
  textOnAccent:  '#080418',

  border:        'rgba(208,96,48,0.20)',
  divider:       'rgba(208,96,48,0.12)',
  borderCard:    'rgba(208,96,48,0.22)',

  success:   '#34d399',
  error:     '#f87171',
  warning:   '#fbbf24',

  statusBar: 'light-content',
  statusBg:  '#080418',
};

// ─── 🌊 غروب الإسكندرية ──────────────────────────────────────
export const CITY_ALEXANDRIA = {
  id: 'city_alexandria',
  isCityTheme: true,
  timeOfDay: 'dusk',

  // السماء: أزرق داكن أعلى ← ذهبي برتقالي مخفف في الأفق
  skyGradient: ['#080818', '#100c30', '#201848', '#3c2860', '#604050', '#885030', '#a86828'],
  skyBottom: '#724818',  // مخفف بدل #d08830
  skylineAsset: require('./assets/skylines/alexandria.png'),
  starCount: 3,

  accent:       '#e89830',  // ذهبي غروب البحر
  accentSoft:   'rgba(232,152,48,0.15)',
  accentBorder: 'rgba(232,152,48,0.28)',
  purple:       '#4878b8',  // أزرق بحري عميق — تباين ذهبي/أزرق
  purpleSoft:   'rgba(72,120,184,0.12)',
  purpleBorder: 'rgba(72,120,184,0.28)',

  bg:          '#080818',
  bgCard:      'rgba(232,152,48,0.08)',
  bgElevated:  'rgba(232,152,48,0.12)',
  bgInput:     'rgba(60,40,96,0.35)',
  bgOverlay:   'rgba(0,0,0,0.72)',

  textPrimary:   'rgba(248,220,165,0.96)',
  textSecondary: 'rgba(205,165,100,0.75)',
  textMuted:     'rgba(232,152,48,0.50)',
  textOnAccent:  '#080818',

  border:        'rgba(232,152,48,0.20)',
  divider:       'rgba(232,152,48,0.12)',
  borderCard:    'rgba(232,152,48,0.22)',

  success:   '#34d399',
  error:     '#f87171',
  warning:   '#fbbf24',

  statusBar: 'light-content',
  statusBg:  '#080818',
};

// ─── 🗼 ليل باريس ────────────────────────────────────────────
export const CITY_PARIS = {
  id: 'city_paris',
  isCityTheme: true,
  timeOfDay: 'night',

  // سماء نيلي دافئ — انعكاس أضواء باريس الذهبية
  skyGradient: ['#100e30', '#181440', '#1e1a48', '#161438', '#0e0c24'],
  skyBottom: '#0e0c24',
  skylineAsset: require('./assets/skylines/paris.png'),
  starCount: 35,

  accent:       '#e8d040',  // ذهبي برج إيفل
  accentSoft:   'rgba(232,208,64,0.15)',
  accentBorder: 'rgba(232,208,64,0.28)',
  purple:       '#9070c8',  // بنفسجي باريسي
  purpleSoft:   'rgba(144,112,200,0.12)',
  purpleBorder: 'rgba(144,112,200,0.28)',

  bg:          '#0e0c24',
  bgCard:      'rgba(232,208,64,0.08)',
  bgElevated:  'rgba(232,208,64,0.12)',
  bgInput:     'rgba(22,20,56,0.40)',
  bgOverlay:   'rgba(0,0,0,0.72)',

  textPrimary:   'rgba(248,240,190,0.96)',
  textSecondary: 'rgba(210,185,120,0.75)',
  textMuted:     'rgba(232,208,64,0.50)',
  textOnAccent:  '#0e0c24',

  border:        'rgba(232,208,64,0.20)',
  divider:       'rgba(232,208,64,0.12)',
  borderCard:    'rgba(232,208,64,0.22)',

  success:   '#34d399',
  error:     '#f87171',
  warning:   '#fbbf24',

  statusBar: 'light-content',
  statusBg:  '#0e0c24',
};

// ─── 🗽 ليل نيويورك ──────────────────────────────────────────
export const CITY_NEWYORK = {
  id: 'city_newyork',
  isCityTheme: true,
  timeOfDay: 'night',

  // بنفسجي محمر — انعكاس أضواء المدينة التي لا تنام
  skyGradient: ['#0e0820', '#160c30', '#1c0e3a', '#140828', '#0c0418'],
  skyBottom: '#0c0418',
  skylineAsset: require('./assets/skylines/newyork.png'),
  starCount: 15,

  accent:       '#e83848',  // أحمر Times Square
  accentSoft:   'rgba(232,56,72,0.15)',
  accentBorder: 'rgba(232,56,72,0.28)',
  purple:       '#4888f0',  // أزرق نيون — تباين أحمر/أزرق مثالي
  purpleSoft:   'rgba(72,136,240,0.12)',
  purpleBorder: 'rgba(72,136,240,0.28)',

  bg:          '#0c0418',
  bgCard:      'rgba(232,56,72,0.08)',
  bgElevated:  'rgba(232,56,72,0.12)',
  bgInput:     'rgba(20,8,40,0.40)',
  bgOverlay:   'rgba(0,0,0,0.72)',

  textPrimary:   'rgba(255,220,224,0.96)',
  textSecondary: 'rgba(220,150,158,0.75)',
  textMuted:     'rgba(232,56,72,0.50)',
  textOnAccent:  '#0c0418',

  border:        'rgba(232,56,72,0.20)',
  divider:       'rgba(232,56,72,0.12)',
  borderCard:    'rgba(232,56,72,0.22)',

  success:   '#34d399',
  error:     '#f87171',
  warning:   '#fbbf24',

  statusBar: 'light-content',
  statusBg:  '#0c0418',
};

// ─── 🌁 ليل لندن ─────────────────────────────────────────────
export const CITY_LONDON = {
  id: 'city_london',
  isCityTheme: true,
  timeOfDay: 'night',

  // رمادي ضبابي — الضباب يحتجز ضوء القمر
  skyGradient: ['#0e0e18', '#161620', '#1c1c2c', '#141420', '#0c0c14'],
  skyBottom: '#0c0c14',
  skylineAsset: require('./assets/skylines/london.png'),
  starCount: 8,

  accent:       '#f0a028',  // برتقالي ضباب لندن
  accentSoft:   'rgba(240,160,40,0.15)',
  accentBorder: 'rgba(240,160,40,0.28)',
  purple:       '#5870a0',  // رمادي أزرق بارد — تباين دافئ/بارد
  purpleSoft:   'rgba(88,112,160,0.12)',
  purpleBorder: 'rgba(88,112,160,0.28)',

  bg:          '#0c0c14',
  bgCard:      'rgba(240,160,40,0.08)',
  bgElevated:  'rgba(240,160,40,0.12)',
  bgInput:     'rgba(20,20,36,0.40)',
  bgOverlay:   'rgba(0,0,0,0.72)',

  textPrimary:   'rgba(245,225,190,0.96)',
  textSecondary: 'rgba(200,165,110,0.75)',
  textMuted:     'rgba(240,160,40,0.50)',
  textOnAccent:  '#0c0c14',

  border:        'rgba(240,160,40,0.20)',
  divider:       'rgba(240,160,40,0.12)',
  borderCard:    'rgba(240,160,40,0.22)',

  success:   '#34d399',
  error:     '#f87171',
  warning:   '#fbbf24',

  statusBar: 'light-content',
  statusBg:  '#0c0c14',
};

// ─── 🏙️ ليل الرياض ───────────────────────────────────────────
export const CITY_RIYADH = {
  id: 'city_riyadh',
  isCityTheme: true,
  timeOfDay: 'night',

  // أزرق صحراوي نظيف — سماء صافية بلا ضباب
  skyGradient: ['#050e20', '#081830', '#0a1c38', '#071428', '#040c18'],
  skyBottom: '#040c18',
  skylineAsset: require('./assets/skylines/riyadh.png'),
  starCount: 40,

  accent:       '#e8f0ff',  // أبيض فضي ناصع — أضواء الأبراج
  accentSoft:   'rgba(232,240,255,0.12)',
  accentBorder: 'rgba(232,240,255,0.22)',
  purple:       '#6090d0',  // أزرق صحراوي — تباين أبيض/أزرق
  purpleSoft:   'rgba(96,144,208,0.12)',
  purpleBorder: 'rgba(96,144,208,0.28)',

  bg:          '#040c18',
  bgCard:      'rgba(232,240,255,0.06)',
  bgElevated:  'rgba(232,240,255,0.10)',
  bgInput:     'rgba(7,20,40,0.40)',
  bgOverlay:   'rgba(0,0,0,0.72)',

  textPrimary:   'rgba(220,232,255,0.96)',
  textSecondary: 'rgba(160,192,235,0.75)',
  textMuted:     'rgba(232,240,255,0.45)',
  textOnAccent:  '#040c18',

  border:        'rgba(232,240,255,0.15)',
  divider:       'rgba(232,240,255,0.08)',
  borderCard:    'rgba(232,240,255,0.18)',

  success:   '#34d399',
  error:     '#f87171',
  warning:   '#fbbf24',

  statusBar: 'light-content',
  statusBg:  '#040c18',
};

// ─── ✨ ليل دبي ──────────────────────────────────────────────
export const CITY_DUBAI = {
  id: 'city_dubai',
  isCityTheme: true,
  timeOfDay: 'night',

  // نيلي فاخر عميق — ناطحات السحاب تقطع الأفق
  skyGradient: ['#080616', '#0e0c20', '#14102a', '#0c0a1c', '#06040e'],
  skyBottom: '#06040e',
  skylineAsset: require('./assets/skylines/dubai.png'),
  starCount: 28,

  accent:       '#f0c818',  // ذهبي أصفر فاخر
  accentSoft:   'rgba(240,200,24,0.15)',
  accentBorder: 'rgba(240,200,24,0.28)',
  purple:       '#8090e0',  // أزرق فضي — تباين ذهبي/فضي فاخر
  purpleSoft:   'rgba(128,144,224,0.12)',
  purpleBorder: 'rgba(128,144,224,0.28)',

  bg:          '#06040e',
  bgCard:      'rgba(240,200,24,0.08)',
  bgElevated:  'rgba(240,200,24,0.12)',
  bgInput:     'rgba(12,10,28,0.40)',
  bgOverlay:   'rgba(0,0,0,0.72)',

  textPrimary:   'rgba(255,245,195,0.96)',
  textSecondary: 'rgba(220,192,110,0.75)',
  textMuted:     'rgba(240,200,24,0.50)',
  textOnAccent:  '#06040e',

  border:        'rgba(240,200,24,0.20)',
  divider:       'rgba(240,200,24,0.12)',
  borderCard:    'rgba(240,200,24,0.22)',

  success:   '#34d399',
  error:     '#f87171',
  warning:   '#fbbf24',

  statusBar: 'light-content',
  statusBg:  '#06040e',
};

// ══════════════════════════════════════════════════════════════
//  قائمة المجموعة للإضافة في THEME_GROUPS
// ══════════════════════════════════════════════════════════════

export const CITY_THEMES_GROUP = {
  groupId: 'cities',
  groupLabel: 'Cities',
  groupLabelAr: 'مدن العالم',
  groupEmoji: '🌍',
  themes: [
    // 🌅 فجر
    {
      theme: CITY_JERUSALEM,
      id: 'city_jerusalem',
      label: 'Jerusalem Dawn',
      labelAr: 'فجر القدس',
      emoji: '🕌',
      timeOfDay: 'dawn',
      previewBg: '#281440',
      previewAccent: '#c8a855',
      isCityTheme: true,
    },
    {
      theme: CITY_TOKYO,
      id: 'city_tokyo',
      label: 'Tokyo Dawn',
      labelAr: 'فجر طوكيو',
      emoji: '🌸',
      timeOfDay: 'dawn',
      previewBg: '#502458',
      previewAccent: '#f0a0b5',
      isCityTheme: true,
    },
    {
      theme: CITY_AMSTERDAM,
      id: 'city_amsterdam',
      label: 'Amsterdam Dawn',
      labelAr: 'فجر أمستردام',
      emoji: '🌫️',
      timeOfDay: 'dawn',
      previewBg: '#1e2c3c',
      previewAccent: '#8ab5d5',
      isCityTheme: true,
    },
    // 🌇 غروب
    {
      theme: CITY_BAGHDAD,
      id: 'city_baghdad',
      label: 'Baghdad Dusk',
      labelAr: 'غروب بغداد',
      emoji: '🌴',
      timeOfDay: 'dusk',
      previewBg: '#501838',
      previewAccent: '#d4a028',
      isCityTheme: true,
    },
    {
      theme: CITY_ISTANBUL,
      id: 'city_istanbul',
      label: 'Istanbul Dusk',
      labelAr: 'غروب إسطنبول',
      emoji: '🌉',
      timeOfDay: 'dusk',
      previewBg: '#501848',
      previewAccent: '#d06030',
      isCityTheme: true,
    },
    {
      theme: CITY_ALEXANDRIA,
      id: 'city_alexandria',
      label: 'Alexandria Dusk',
      labelAr: 'غروب الإسكندرية',
      emoji: '🌊',
      timeOfDay: 'dusk',
      previewBg: '#3c2860',
      previewAccent: '#e89830',
      isCityTheme: true,
    },
    // 🌕 ليل
    {
      theme: CITY_PARIS,
      id: 'city_paris',
      label: 'Paris Night',
      labelAr: 'ليل باريس',
      emoji: '🗼',
      timeOfDay: 'night',
      previewBg: '#1e1a48',
      previewAccent: '#e8d040',
      isCityTheme: true,
    },
    {
      theme: CITY_NEWYORK,
      id: 'city_newyork',
      label: 'New York Night',
      labelAr: 'ليل نيويورك',
      emoji: '🗽',
      timeOfDay: 'night',
      previewBg: '#1c0e3a',
      previewAccent: '#e83848',
      isCityTheme: true,
    },
    {
      theme: CITY_LONDON,
      id: 'city_london',
      label: 'London Night',
      labelAr: 'ليل لندن',
      emoji: '🌁',
      timeOfDay: 'night',
      previewBg: '#1c1c2c',
      previewAccent: '#f0a028',
      isCityTheme: true,
    },
    {
      theme: CITY_RIYADH,
      id: 'city_riyadh',
      label: 'Riyadh Night',
      labelAr: 'ليل الرياض',
      emoji: '🏙️',
      timeOfDay: 'night',
      previewBg: '#0a1c38',
      previewAccent: '#e8f0ff',
      isCityTheme: true,
    },
    {
      theme: CITY_DUBAI,
      id: 'city_dubai',
      label: 'Dubai Night',
      labelAr: 'ليل دبي',
      emoji: '✨',
      timeOfDay: 'night',
      previewBg: '#14102a',
      previewAccent: '#f0c818',
      isCityTheme: true,
    },
  ],
};
