// ══════════════════════════════════════════════════════════════
//  🌍 City Themes — مجموعة ثيمات المدن (11 مدينة)
//  أوقات: 🌅 فجر (3) | 🌇 غروب (3) | 🌕 ليل (5)
//
//  ⚠️ هذا الملف هو مصدر الحقيقة الوحيد لثيمات المدن
//  ThemeContext.js يستورد منه مباشرة
// ══════════════════════════════════════════════════════════════

// ─── 🌅 فجر القدس ───────────────────────────────────────────
export const CITY_JERUSALEM = {
  id: 'city_jerusalem', isCityTheme: true, timeOfDay: 'dawn',
  skyGradient: ['#100820','#180e30','#281440','#3c1c48','#5c3040','#7a5030'],
  skyBottom: '#7a5030',
  skylineAsset: require('./assets/skylines/jerusalem.png'),
  starCount: 12,
  accent: '#c8a855', accentSoft: 'rgba(200,168,85,0.15)', accentBorder: 'rgba(200,168,85,0.28)',
  purple: '#d4906a', purpleSoft: 'rgba(212,144,106,0.12)', purpleBorder: 'rgba(212,144,106,0.28)',
  bg: '#100820', bgCard: 'rgba(200,168,85,0.08)', bgElevated: 'rgba(200,168,85,0.12)',
  bgInput: 'rgba(122,80,48,0.30)', bgOverlay: 'rgba(0,0,0,0.70)',
  textPrimary: 'rgba(240,220,170,0.96)', textSecondary: 'rgba(185,158,100,0.75)',
  textMuted: 'rgba(200,168,85,0.50)', textOnAccent: '#100820',
  border: 'rgba(200,168,85,0.20)', divider: 'rgba(200,168,85,0.12)', borderCard: 'rgba(200,168,85,0.22)',
  success: '#34d399', error: '#f87171', warning: '#fbbf24',
  statusBar: 'light-content', statusBg: '#100820',
};

// ─── 🌸 فجر طوكيو ────────────────────────────────────────────
export const CITY_TOKYO = {
  id: 'city_tokyo', isCityTheme: true, timeOfDay: 'dawn',
  skyGradient: ['#180e28','#301840','#502458','#703060','#a04868','#c87060'],
  skyBottom: '#c87060',
  skylineAsset: require('./assets/skylines/tokyo.png'),
  starCount: 10,
  accent: '#f0a0b5', accentSoft: 'rgba(240,160,181,0.15)', accentBorder: 'rgba(240,160,181,0.28)',
  purple: '#7855a8', purpleSoft: 'rgba(120,85,168,0.12)', purpleBorder: 'rgba(120,85,168,0.28)',
  bg: '#180e28', bgCard: 'rgba(240,160,181,0.08)', bgElevated: 'rgba(240,160,181,0.12)',
  bgInput: 'rgba(80,36,88,0.30)', bgOverlay: 'rgba(0,0,0,0.70)',
  textPrimary: 'rgba(255,220,230,0.96)', textSecondary: 'rgba(220,160,180,0.75)',
  textMuted: 'rgba(240,160,181,0.50)', textOnAccent: '#180e28',
  border: 'rgba(240,160,181,0.20)', divider: 'rgba(240,160,181,0.12)', borderCard: 'rgba(240,160,181,0.22)',
  success: '#34d399', error: '#f87171', warning: '#fbbf24',
  statusBar: 'light-content', statusBg: '#180e28',
};

// ─── 🌫️ فجر أمستردام ─────────────────────────────────────────
export const CITY_AMSTERDAM = {
  id: 'city_amsterdam', isCityTheme: true, timeOfDay: 'dawn',
  skyGradient: ['#080f1c','#0f1c2e','#1a2a40','#263850','#3a5265','#587280'],
  skyBottom: '#587280',
  skylineAsset: require('./assets/skylines/amsterdam.png'),
  starCount: 8,
  accent: '#5a96c8', accentSoft: 'rgba(90,150,200,0.14)', accentBorder: 'rgba(90,150,200,0.28)',
  purple: '#98c0de', purpleSoft: 'rgba(152,192,222,0.10)', purpleBorder: 'rgba(152,192,222,0.26)',
  bg: '#080f1c', bgCard: 'rgba(90,150,200,0.10)', bgElevated: 'rgba(90,150,200,0.14)',
  bgInput: 'rgba(18,30,52,0.40)', bgOverlay: 'rgba(0,0,0,0.70)',
  textPrimary: 'rgba(195,222,242,0.96)', textSecondary: 'rgba(120,165,200,0.75)',
  textMuted: 'rgba(90,150,200,0.48)', textOnAccent: '#080f1c',
  border: 'rgba(90,150,200,0.18)', divider: 'rgba(90,150,200,0.10)', borderCard: 'rgba(90,150,200,0.20)',
  success: '#34d399', error: '#f87171', warning: '#fbbf24',
  statusBar: 'light-content', statusBg: '#080f1c',
};

// ─── 🌴 غروب بغداد ───────────────────────────────────────────
export const CITY_BAGHDAD = {
  id: 'city_baghdad', isCityTheme: true, timeOfDay: 'dusk',
  skyGradient: ['#0a0418','#180830','#300e50','#501838','#783020','#a06020','#c89030'],
  skyBottom: '#8a6020',
  skylineAsset: require('./assets/skylines/baghdad.png'),
  starCount: 5,
  accent: '#d4a028', accentSoft: 'rgba(212,160,40,0.15)', accentBorder: 'rgba(212,160,40,0.28)',
  purple: '#a04830', purpleSoft: 'rgba(160,72,48,0.12)', purpleBorder: 'rgba(160,72,48,0.28)',
  bg: '#0a0418', bgCard: 'rgba(212,160,40,0.08)', bgElevated: 'rgba(212,160,40,0.12)',
  bgInput: 'rgba(80,24,56,0.35)', bgOverlay: 'rgba(0,0,0,0.72)',
  textPrimary: 'rgba(245,220,160,0.96)', textSecondary: 'rgba(200,165,95,0.75)',
  textMuted: 'rgba(212,160,40,0.50)', textOnAccent: '#0a0418',
  border: 'rgba(212,160,40,0.20)', divider: 'rgba(212,160,40,0.12)', borderCard: 'rgba(212,160,40,0.22)',
  success: '#34d399', error: '#f87171', warning: '#fbbf24',
  statusBar: 'light-content', statusBg: '#0a0418',
};

// ─── 🌉 غروب إسطنبول ─────────────────────────────────────────
export const CITY_ISTANBUL = {
  id: 'city_istanbul', isCityTheme: true, timeOfDay: 'dusk',
  skyGradient: ['#080418','#180830','#301060','#501848','#783040','#a04028','#b85828'],
  skyBottom: '#7a4018',
  skylineAsset: require('./assets/skylines/istanbul.png'),
  starCount: 4,
  accent: '#d06030', accentSoft: 'rgba(208,96,48,0.15)', accentBorder: 'rgba(208,96,48,0.28)',
  purple: '#8040a0', purpleSoft: 'rgba(128,64,160,0.12)', purpleBorder: 'rgba(128,64,160,0.28)',
  bg: '#080418', bgCard: 'rgba(208,96,48,0.08)', bgElevated: 'rgba(208,96,48,0.12)',
  bgInput: 'rgba(80,24,72,0.35)', bgOverlay: 'rgba(0,0,0,0.72)',
  textPrimary: 'rgba(245,210,185,0.96)', textSecondary: 'rgba(205,155,115,0.75)',
  textMuted: 'rgba(208,96,48,0.50)', textOnAccent: '#080418',
  border: 'rgba(208,96,48,0.20)', divider: 'rgba(208,96,48,0.12)', borderCard: 'rgba(208,96,48,0.22)',
  success: '#34d399', error: '#f87171', warning: '#fbbf24',
  statusBar: 'light-content', statusBg: '#080418',
};

// ─── 🌊 غروب الإسكندرية ──────────────────────────────────────
export const CITY_ALEXANDRIA = {
  id: 'city_alexandria', isCityTheme: true, timeOfDay: 'dusk',
  skyGradient: ['#080818','#100c30','#201848','#3c2860','#604050','#885030','#a86828'],
  skyBottom: '#724818',
  skylineAsset: require('./assets/skylines/alexandria.png'),
  starCount: 3,
  accent: '#e89830', accentSoft: 'rgba(232,152,48,0.15)', accentBorder: 'rgba(232,152,48,0.28)',
  purple: '#4878b8', purpleSoft: 'rgba(72,120,184,0.12)', purpleBorder: 'rgba(72,120,184,0.28)',
  bg: '#080818', bgCard: 'rgba(232,152,48,0.08)', bgElevated: 'rgba(232,152,48,0.12)',
  bgInput: 'rgba(60,40,96,0.35)', bgOverlay: 'rgba(0,0,0,0.72)',
  textPrimary: 'rgba(248,220,165,0.96)', textSecondary: 'rgba(205,165,100,0.75)',
  textMuted: 'rgba(232,152,48,0.50)', textOnAccent: '#080818',
  border: 'rgba(232,152,48,0.20)', divider: 'rgba(232,152,48,0.12)', borderCard: 'rgba(232,152,48,0.22)',
  success: '#34d399', error: '#f87171', warning: '#fbbf24',
  statusBar: 'light-content', statusBg: '#080818',
};

// ─── 🗼 ليل باريس ────────────────────────────────────────────
export const CITY_PARIS = {
  id: 'city_paris', isCityTheme: true, timeOfDay: 'night',
  skyGradient: ['#050818','#0a1028','#121838','#0a0e22','#07091a'],
  skyBottom: '#07091a',
  skylineAsset: require('./assets/skylines/paris.png'),
  starCount: 38,
  accent: '#f0d837', accentSoft: 'rgba(240,216,55,0.13)', accentBorder: 'rgba(240,216,55,0.28)',
  purple: '#8868c0', purpleSoft: 'rgba(136,104,192,0.10)', purpleBorder: 'rgba(136,104,192,0.26)',
  bg: '#07091a', bgCard: 'rgba(240,216,55,0.09)', bgElevated: 'rgba(240,216,55,0.13)',
  bgInput: 'rgba(14,18,50,0.40)', bgOverlay: 'rgba(0,0,0,0.72)',
  textPrimary: 'rgba(255,248,200,0.96)', textSecondary: 'rgba(200,175,60,0.75)',
  textMuted: 'rgba(240,216,55,0.48)', textOnAccent: '#07091a',
  border: 'rgba(240,216,55,0.18)', divider: 'rgba(240,216,55,0.10)', borderCard: 'rgba(240,216,55,0.20)',
  success: '#34d399', error: '#f87171', warning: '#fbbf24',
  statusBar: 'light-content', statusBg: '#07091a',
};

// ─── 🗽 ليل نيويورك ──────────────────────────────────────────
export const CITY_NEWYORK = {
  id: 'city_newyork', isCityTheme: true, timeOfDay: 'night',
  skyGradient: ['#0e0820','#160c30','#1c0e3a','#140828','#0c0418'],
  skyBottom: '#0c0418',
  skylineAsset: require('./assets/skylines/newyork.png'),
  starCount: 15,
  accent: '#e83848', accentSoft: 'rgba(232,56,72,0.15)', accentBorder: 'rgba(232,56,72,0.28)',
  purple: '#4888f0', purpleSoft: 'rgba(72,136,240,0.12)', purpleBorder: 'rgba(72,136,240,0.28)',
  bg: '#0c0418', bgCard: 'rgba(232,56,72,0.08)', bgElevated: 'rgba(232,56,72,0.12)',
  bgInput: 'rgba(20,8,40,0.40)', bgOverlay: 'rgba(0,0,0,0.72)',
  textPrimary: 'rgba(255,220,224,0.96)', textSecondary: 'rgba(220,150,158,0.75)',
  textMuted: 'rgba(232,56,72,0.50)', textOnAccent: '#0c0418',
  border: 'rgba(232,56,72,0.20)', divider: 'rgba(232,56,72,0.12)', borderCard: 'rgba(232,56,72,0.22)',
  success: '#34d399', error: '#f87171', warning: '#fbbf24',
  statusBar: 'light-content', statusBg: '#0c0418',
};

// ─── 🌁 ليل لندن ─────────────────────────────────────────────
export const CITY_LONDON = {
  id: 'city_london', isCityTheme: true, timeOfDay: 'night',
  skyGradient: ['#0e0e18','#161620','#1c1c2c','#141420','#0c0c14'],
  skyBottom: '#0c0c14',
  skylineAsset: require('./assets/skylines/london.png'),
  starCount: 8,
  accent: '#f0a028', accentSoft: 'rgba(240,160,40,0.15)', accentBorder: 'rgba(240,160,40,0.28)',
  purple: '#5870a0', purpleSoft: 'rgba(88,112,160,0.12)', purpleBorder: 'rgba(88,112,160,0.28)',
  bg: '#0c0c14', bgCard: 'rgba(240,160,40,0.08)', bgElevated: 'rgba(240,160,40,0.12)',
  bgInput: 'rgba(20,20,36,0.40)', bgOverlay: 'rgba(0,0,0,0.72)',
  textPrimary: 'rgba(245,225,190,0.96)', textSecondary: 'rgba(200,165,110,0.75)',
  textMuted: 'rgba(240,160,40,0.50)', textOnAccent: '#0c0c14',
  border: 'rgba(240,160,40,0.20)', divider: 'rgba(240,160,40,0.12)', borderCard: 'rgba(240,160,40,0.22)',
  success: '#34d399', error: '#f87171', warning: '#fbbf24',
  statusBar: 'light-content', statusBg: '#0c0c14',
};

// ─── 🏙️ ليل الرياض ───────────────────────────────────────────
export const CITY_RIYADH = {
  id: 'city_riyadh', isCityTheme: true, timeOfDay: 'night',
  skyGradient: ['#050e20','#081830','#0a1c38','#071428','#040c18'],
  skyBottom: '#040c18',
  skylineAsset: require('./assets/skylines/riyadh.png'),
  starCount: 40,
  accent: '#e8f0ff', accentSoft: 'rgba(232,240,255,0.12)', accentBorder: 'rgba(232,240,255,0.22)',
  purple: '#6090d0', purpleSoft: 'rgba(96,144,208,0.12)', purpleBorder: 'rgba(96,144,208,0.28)',
  bg: '#040c18', bgCard: 'rgba(232,240,255,0.06)', bgElevated: 'rgba(232,240,255,0.10)',
  bgInput: 'rgba(7,20,40,0.40)', bgOverlay: 'rgba(0,0,0,0.72)',
  textPrimary: 'rgba(220,232,255,0.96)', textSecondary: 'rgba(160,192,235,0.75)',
  textMuted: 'rgba(232,240,255,0.45)', textOnAccent: '#040c18',
  border: 'rgba(232,240,255,0.15)', divider: 'rgba(232,240,255,0.08)', borderCard: 'rgba(232,240,255,0.18)',
  success: '#34d399', error: '#f87171', warning: '#fbbf24',
  statusBar: 'light-content', statusBg: '#040c18',
};

// ─── ✨ ليل دبي ──────────────────────────────────────────────
export const CITY_DUBAI = {
  id: 'city_dubai', isCityTheme: true, timeOfDay: 'night',
  skyGradient: ['#080616','#0e0c20','#14102a','#0c0a1c','#06040e'],
  skyBottom: '#06040e',
  skylineAsset: require('./assets/skylines/dubai.png'),
  starCount: 28,
  accent: '#f0c818', accentSoft: 'rgba(240,200,24,0.15)', accentBorder: 'rgba(240,200,24,0.28)',
  purple: '#8090e0', purpleSoft: 'rgba(128,144,224,0.12)', purpleBorder: 'rgba(128,144,224,0.28)',
  bg: '#06040e', bgCard: 'rgba(240,200,24,0.08)', bgElevated: 'rgba(240,200,24,0.12)',
  bgInput: 'rgba(12,10,28,0.40)', bgOverlay: 'rgba(0,0,0,0.72)',
  textPrimary: 'rgba(255,245,195,0.96)', textSecondary: 'rgba(220,192,110,0.75)',
  textMuted: 'rgba(240,200,24,0.50)', textOnAccent: '#06040e',
  border: 'rgba(240,200,24,0.20)', divider: 'rgba(240,200,24,0.12)', borderCard: 'rgba(240,200,24,0.22)',
  success: '#34d399', error: '#f87171', warning: '#fbbf24',
  statusBar: 'light-content', statusBg: '#06040e',
};
