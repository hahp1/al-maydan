/**
 * XPService.js
 * ════════════════════════════════════════════════════════════
 *  نظام XP — المستويات — المهام اليومية — الإنجازات الدائمة
 *
 *  هيكل Firestore:
 *  ────────────────────────────────────────────────────────
 *  users/{uid}
 *    xp            : number   ← XP التراكمي الكلي
 *    level         : number   ← المستوى الحالي (1–25)
 *    stats: {
 *      onlineGamesPlayed : number
 *      onlineWins        : number
 *      soloGamesPlayed   : number
 *      soloWins          : number
 *      totalGamesPlayed  : number
 *      gameTypesPlayed   : string[]   ← أنماط اللعب التي جرّبها
 *      streakDays        : number     ← أيام متتالية
 *      lastPlayedDate    : string     ← YYYY-MM-DD
 *      gameWins: {                    ← انتصارات per لعبة
 *        xo, bullshit, kout, domino, codenames,
 *        mafia, drawguess, wordle, ...
 *      }
 *    }
 *
 *  users/{uid}/dailyMissions (مجموعة فرعية)
 *    date          : string   ← YYYY-MM-DD
 *    missions      : Mission[]  ← المهام الـ3 اليوم
 *    completedIds  : string[]   ← IDs المكتملة + مُستلمة
 *    winsToday     : number   ← عدد الانتصارات اليوم (cap=10)
 *    xpEarnedToday : number   ← XP اليوم من الانتصارات
 *
 *  users/{uid}/achievements (مجموعة فرعية)
 *    {achievementId}: { currentVal, milestoneIndex, claimed[] }
 * ════════════════════════════════════════════════════════════
 */

import {
  doc, getDoc, setDoc, updateDoc,
  collection, getDocs, serverTimestamp,
  increment, writeBatch,
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from './firebaseConfig';

// ══════════════════════════════════════════════════════════════
//  1. جدول المستويات
// ══════════════════════════════════════════════════════════════

export const LEVELS = [
  { level: 1,  xp: 0,       label: 'مبتدئ III',          reward: 0    },
  { level: 2,  xp: 300,     label: 'مبتدئ II',           reward: 50   },
  { level: 3,  xp: 700,     label: 'مبتدئ I',            reward: 50   },
  { level: 4,  xp: 1300,    label: 'لاعب III',           reward: 75   },
  { level: 5,  xp: 2200,    label: 'لاعب II',            reward: 75   },
  { level: 6,  xp: 3500,    label: 'لاعب I',             reward: 100  },
  { level: 7,  xp: 5200,    label: 'محترف III',          reward: 100  },
  { level: 8,  xp: 7500,    label: 'محترف II',           reward: 150  },
  { level: 9,  xp: 10500,   label: 'محترف I',            reward: 150  },
  { level: 10, xp: 14000,   label: 'خبير III',           reward: 250  },
  { level: 11, xp: 18500,   label: 'خبير II',            reward: 200  },
  { level: 12, xp: 24000,   label: 'خبير I',             reward: 250  },
  { level: 13, xp: 30500,   label: 'بطل III',            reward: 300  },
  { level: 14, xp: 38000,   label: 'بطل II',             reward: 350  },
  { level: 15, xp: 47000,   label: 'بطل I',              reward: 400  },
  { level: 16, xp: 57000,   label: 'أسطورة III',         reward: 400  },
  { level: 17, xp: 68500,   label: 'أسطورة II',          reward: 450  },
  { level: 18, xp: 81500,   label: 'أسطورة I',           reward: 500  },
  { level: 19, xp: 96000,   label: 'سيد الميدان III',    reward: 550  },
  { level: 20, xp: 112000,  label: 'سيد الميدان II',     reward: 600  },
  { level: 21, xp: 130000,  label: 'سيد الميدان I',      reward: 650  },
  { level: 22, xp: 150000,  label: 'إمبراطور III',       reward: 750  },
  { level: 23, xp: 172000,  label: 'إمبراطور II',        reward: 850  },
  { level: 24, xp: 196000,  label: 'إمبراطور I',         reward: 950  },
  { level: 25, xp: 222000,  label: 'إمبراطور الميدان 🔱', reward: 1500 },
];

export const MAX_LEVEL = 25;

/** يرجع بيانات المستوى الحالي من XP التراكمي */
export const getLevelFromXP = (totalXP) => {
  let current = LEVELS[0];
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (totalXP >= LEVELS[i].xp) { current = LEVELS[i]; break; }
  }
  const nextLevel = LEVELS.find(l => l.level === current.level + 1) || null;
  const xpInLevel = totalXP - current.xp;
  const xpNeeded  = nextLevel ? nextLevel.xp - current.xp : 1;
  return {
    level: current.level,
    label: current.label,
    reward: current.reward,
    xpInLevel,
    xpNeeded,
    progress: nextLevel ? xpInLevel / xpNeeded : 1,
    isMax: current.level === MAX_LEVEL,
  };
};

// ══════════════════════════════════════════════════════════════
//  2. Pool المهام اليومية (27 مهمة)
// ══════════════════════════════════════════════════════════════

export const DAILY_MISSIONS_POOL = [
  // ── ألعاب أونلاين ──
  { id: 'dm_play1',        type: 'online_play',   target: 1,  xp: 25,  ar: 'العب لعبة أونلاين واحدة',          en: 'Play 1 online game'            },
  { id: 'dm_play2',        type: 'online_play',   target: 2,  xp: 40,  ar: 'العب لعبتين أونلاين',              en: 'Play 2 online games'           },
  { id: 'dm_win1',         type: 'online_win',    target: 1,  xp: 40,  ar: 'فز بلعبة أونلاين',                 en: 'Win 1 online game'             },
  { id: 'dm_win2',         type: 'online_win',    target: 2,  xp: 65,  ar: 'فز بلعبتين أونلاين',               en: 'Win 2 online games'            },
  { id: 'dm_win3',         type: 'online_win',    target: 3,  xp: 90,  ar: 'فز بثلاث ألعاب أونلاين',           en: 'Win 3 online games'            },
  // ── ألعاب محددة ──
  { id: 'dm_xo',           type: 'game_play',     game: 'xo',        target: 1, xp: 30, ar: 'العب لعبة XO أونلاين',           en: 'Play XO online'                },
  { id: 'dm_bullshit',     type: 'game_play',     game: 'bullshit',  target: 1, xp: 30, ar: 'العب لعبة كاذبون',               en: 'Play Bullshit'                 },
  { id: 'dm_kout',         type: 'game_play',     game: 'kout',      target: 1, xp: 30, ar: 'العب لعبة كوت بو 6',             en: 'Play Kout Bo 6'                },
  { id: 'dm_domino',       type: 'game_play',     game: 'domino',    target: 1, xp: 30, ar: 'العب لعبة دومينو',               en: 'Play Domino'                   },
  { id: 'dm_drawguess',    type: 'game_play',     game: 'drawguess', target: 1, xp: 30, ar: 'العب رسم وتخمين',                en: 'Play Draw & Guess'             },
  { id: 'dm_codenames',    type: 'game_play',     game: 'codenames', target: 1, xp: 30, ar: 'العب كلمات سرية',                en: 'Play Codenames'                },
  { id: 'dm_wordle',       type: 'game_play',     game: 'wordle',    target: 1, xp: 30, ar: 'العب حرّف',                      en: 'Play Harrif'                   },
  // ── ألعاب متنوعة ──
  { id: 'dm_variety3',     type: 'variety',       target: 3,  xp: 75,  ar: 'العب 3 ألعاب مختلفة اليوم',         en: 'Play 3 different game types'   },
  // ── الصديق ──
  { id: 'dm_friend',       type: 'play_friend',   target: 1,  xp: 35,  ar: 'العب مع صديق',                      en: 'Play with a friend'            },
  // ── Solo ──
  { id: 'dm_solo_play',    type: 'solo_play',     target: 1,  xp: 30,  ar: 'العب لعبة ثلاثية',                  en: 'Play a trivia game'            },
  { id: 'dm_solo_win',     type: 'solo_win',      target: 1,  xp: 40,  ar: 'فز بلعبة ثلاثية',                   en: 'Win a trivia game'             },
  { id: 'dm_solo3',        type: 'solo_play',     target: 3,  xp: 55,  ar: 'أجب على 10 أسئلة صح في الثلاثية',  en: 'Answer 10 correct trivia Qs'   },
  // ── الإعلانات ──
  { id: 'dm_ad1',          type: 'watch_ad',      target: 1,  xp: 20,  ar: 'شاهد إعلاناً واحداً',               en: 'Watch 1 ad'                    },
  { id: 'dm_ad3',          type: 'watch_ad',      target: 3,  xp: 45,  ar: 'شاهد 3 إعلانات',                    en: 'Watch 3 ads'                   },
  // ── فوز في ألعاب محددة ──
  { id: 'dm_win_xo',       type: 'game_win',      game: 'xo',        target: 1, xp: 40, ar: 'فز بلعبة XO',               en: 'Win at XO'                     },
  { id: 'dm_win_bullshit', type: 'game_win',      game: 'bullshit',  target: 1, xp: 40, ar: 'فز في كاذبون',               en: 'Win at Bullshit'               },
  { id: 'dm_win_kout',     type: 'game_win',      game: 'kout',      target: 1, xp: 40, ar: 'فز في كوت بو 6',             en: 'Win at Kout Bo 6'              },
  { id: 'dm_win_wordle',   type: 'game_win',      game: 'wordle',    target: 1, xp: 35, ar: 'أكمل كلمة في حرّف',          en: 'Complete a word in Harrif'     },
  // ── تفاعل اجتماعي ──
  { id: 'dm_chat',         type: 'send_message',  target: 1,  xp: 20,  ar: 'أرسل رسالة لصديق',                  en: 'Send a message to a friend'    },
  { id: 'dm_invite',       type: 'invite_friend', target: 1,  xp: 25,  ar: 'ادعُ صديقاً لغرفة',                 en: 'Invite a friend to a room'     },
  // ── مزيج ──
  { id: 'dm_play3',        type: 'online_play',   target: 3,  xp: 55,  ar: 'العب 3 ألعاب أونلاين',              en: 'Play 3 online games'           },
  { id: 'dm_login',        type: 'daily_login',   target: 1,  xp: 15,  ar: 'افتح التطبيق اليوم ✅',             en: 'Open the app today ✅'         },
];

// ══════════════════════════════════════════════════════════════
//  3. الإنجازات الدائمة
// ══════════════════════════════════════════════════════════════

/** milestones: مصفوفة أرقام الأهداف المتصاعدة */
export const ACHIEVEMENTS = [
  // ── انتصارات إجمالية ──
  {
    id: 'total_wins',
    ar: 'المنتصر', en: 'The Victor',
    icon: '⚔️',
    stat: 'onlineWins',
    milestones: [3, 10, 25, 50, 100, 200, 500],
    xpPerMilestone: [80, 120, 180, 250, 350, 500, 800],
  },
  // ── ألعاب ملعوبة ──
  {
    id: 'total_games',
    ar: 'مدمن الألعاب', en: 'Game Addict',
    icon: '🎮',
    stat: 'totalGamesPlayed',
    milestones: [5, 15, 30, 75, 150, 300, 500, 1000],
    xpPerMilestone: [50, 80, 120, 180, 250, 350, 500, 700],
  },
  // ── أيام متتالية ──
  {
    id: 'streak',
    ar: 'الملتزم', en: 'Committed',
    icon: '📅',
    stat: 'streakDays',
    milestones: [3, 7, 14, 30, 60, 100],
    xpPerMilestone: [60, 100, 180, 350, 600, 1000],
  },
  // ── XO ──
  {
    id: 'wins_xo',
    ar: 'بطل XO', en: 'XO Champion',
    icon: '❌',
    stat: 'gameWins.xo',
    milestones: [5, 20, 50, 100, 300, 500],
    xpPerMilestone: [60, 100, 160, 250, 400, 600],
  },
  // ── كاذبون ──
  {
    id: 'wins_bullshit',
    ar: 'ملك الكذابين', en: 'Bluff King',
    icon: '🃏',
    stat: 'gameWins.bullshit',
    milestones: [5, 20, 50, 100, 300, 500],
    xpPerMilestone: [60, 100, 160, 250, 400, 600],
  },
  // ── كوت بو 6 ──
  {
    id: 'wins_kout',
    ar: 'سيد الكوت', en: 'Kout Master',
    icon: '🂡',
    stat: 'gameWins.kout',
    milestones: [5, 20, 50, 100, 300, 500],
    xpPerMilestone: [60, 100, 160, 250, 400, 600],
  },
  // ── دومينو ──
  {
    id: 'wins_domino',
    ar: 'حارس الدومينو', en: 'Domino Guard',
    icon: '🁣',
    stat: 'gameWins.domino',
    milestones: [5, 20, 50, 100, 300, 500],
    xpPerMilestone: [60, 100, 160, 250, 400, 600],
  },
  // ── رسم وتخمين ──
  {
    id: 'wins_drawguess',
    ar: 'الفنان الماهر', en: 'Master Artist',
    icon: '🎨',
    stat: 'gameWins.drawguess',
    milestones: [5, 20, 50, 100, 300, 500],
    xpPerMilestone: [60, 100, 160, 250, 400, 600],
  },
  // ── حرّف (Wordle) ──
  {
    id: 'wins_wordle',
    ar: 'ساحر الكلمات', en: 'Word Wizard',
    icon: '🔤',
    stat: 'gameWins.wordle',
    milestones: [5, 20, 50, 100, 300, 500],
    xpPerMilestone: [60, 100, 160, 250, 400, 600],
  },
  // ── Solo Trivia ──
  {
    id: 'solo_wins',
    ar: 'بطل الثلاثية', en: 'Trivia Champion',
    icon: '🧠',
    stat: 'soloWins',
    milestones: [3, 10, 25, 50, 100],
    xpPerMilestone: [60, 100, 160, 250, 400],
  },
  // ── مستكشف الميدان (لا نهائي — آخر رقم = عدد الأنماط) ──
  {
    id: 'explorer',
    ar: 'مستكشف الميدان', en: 'Arena Explorer',
    icon: '🗺️',
    stat: 'gameTypesPlayed',
    isCounted: true,   // نحسب length المصفوفة
    // آخر milestone = عدد أنماط اللعب الكلي في التطبيق
    milestones: [2, 4, 6, 8, 10, 12, 15],
    xpPerMilestone: [30, 30, 40, 40, 50, 50, 75],
  },
];

// عدد أنماط اللعب الكلي (يُحدَّث كلما أضفنا لعبة)
export const TOTAL_GAME_TYPES = 15;

// ══════════════════════════════════════════════════════════════
//  4. XP Constants
// ══════════════════════════════════════════════════════════════

export const XP_ONLINE_WIN  = 30;
export const XP_ONLINE_LOSS = 15;
export const XP_WIN_CAP_PER_DAY = 10;  // حد الانتصارات اليومية المحسوبة

// ══════════════════════════════════════════════════════════════
//  5. أدوات التاريخ
// ══════════════════════════════════════════════════════════════

const todayStr = () => new Date().toISOString().split('T')[0]; // YYYY-MM-DD

// ══════════════════════════════════════════════════════════════
//  6. اختيار 3 مهام عشوائية من الـ pool
// ══════════════════════════════════════════════════════════════

/**
 * يختار 3 مهام عشوائية من الـ pool بدون تكرار.
 * يستخدم التاريخ كـ seed لضمان ثبات المهام طوال اليوم
 * لنفس المستخدم (بدون الحاجة لـ cloud function).
 */
const pickDailyMissions = (uid) => {
  const date = todayStr();
  // seed بسيط من uid + date
  const seed = [...(uid + date)].reduce((a, c) => a + c.charCodeAt(0), 0);

  const pool = [...DAILY_MISSIONS_POOL];
  const picked = [];
  let s = seed;

  while (picked.length < 3 && pool.length > 0) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const idx = Math.abs(s) % pool.length;
    picked.push(pool.splice(idx, 1)[0]);
  }
  return picked;
};

// ══════════════════════════════════════════════════════════════
//  7. جلب/تهيئة المهام اليومية
// ══════════════════════════════════════════════════════════════

/**
 * يرجع المهام اليومية الـ3 الخاصة باليوم.
 * إذا كانت بيانات اليوم موجودة في Firestore يستخدمها،
 * وإلا يولّد جديدة ويحفظها.
 *
 * للضيف: يستخدم AsyncStorage بدل Firestore.
 */
export const getDailyMissions = async (uid, isGuest = false) => {
  const date = todayStr();

  if (isGuest) {
    const raw = await AsyncStorage.getItem(`guest_daily_${date}`);
    if (raw) return JSON.parse(raw);
    const missions = pickDailyMissions(uid);
    const data = { date, missions, completedIds: [], progress: {}, winsToday: 0, xpEarnedToday: 0 };
    await AsyncStorage.setItem(`guest_daily_${date}`, JSON.stringify(data));
    return data;
  }

  const ref  = doc(db, 'users', uid, 'dailyMissions', date);
  const snap = await getDoc(ref);

  if (snap.exists()) return snap.data();

  const missions = pickDailyMissions(uid);
  const data = {
    date,
    missions,
    completedIds: [],
    progress: {},       // { [missionId]: currentCount }
    winsToday: 0,
    xpEarnedToday: 0,
  };
  await setDoc(ref, data);
  return data;
};

// ══════════════════════════════════════════════════════════════
//  8. تحديث تقدم مهمة معينة
// ══════════════════════════════════════════════════════════════

/**
 * يُحدِّث تقدم المهام اليومية بناءً على حدث.
 *
 * @param uid         - معرف المستخدم
 * @param eventType   - نوع الحدث (مثل 'online_win', 'watch_ad', ...)
 * @param eventData   - بيانات إضافية { game, count }
 * @param isGuest     - هل ضيف؟
 * @returns { completedMissions: string[], xpGained: number }
 *          completedMissions = IDs المهام التي اكتملت الآن (لعرض الـ toast)
 */
export const updateMissionProgress = async (uid, eventType, eventData = {}, isGuest = false) => {
  const date    = todayStr();
  let dailyData = await getDailyMissions(uid, isGuest);

  const { missions, completedIds, progress } = dailyData;
  const newProgress    = { ...progress };
  const newCompleted   = [...completedIds];
  const freshlyDone    = [];   // اكتملت للتو (لم تكن مكتملة قبل)
  let xpGained = 0;

  for (const mission of missions) {
    if (newCompleted.includes(mission.id)) continue;  // مكتملة ومُستلمة

    let matches = false;

    switch (mission.type) {
      case 'online_play':
        matches = ['online_win', 'online_loss'].includes(eventType);
        break;
      case 'online_win':
        matches = eventType === 'online_win';
        break;
      case 'game_play':
        matches = (eventType === 'online_play' || eventType === 'online_win' || eventType === 'online_loss')
               && eventData.game === mission.game;
        break;
      case 'game_win':
        matches = eventType === 'online_win' && eventData.game === mission.game;
        break;
      case 'solo_play':
        matches = eventType === 'solo_play';
        break;
      case 'solo_win':
        matches = eventType === 'solo_win';
        break;
      case 'watch_ad':
        matches = eventType === 'watch_ad';
        break;
      case 'variety':
        matches = eventType === 'new_game_type';
        break;
      case 'play_friend':
        matches = eventType === 'play_friend';
        break;
      case 'send_message':
        matches = eventType === 'send_message';
        break;
      case 'invite_friend':
        matches = eventType === 'invite_friend';
        break;
      case 'daily_login':
        matches = eventType === 'daily_login';
        break;
      default:
        break;
    }

    if (!matches) continue;

    const prev = newProgress[mission.id] || 0;
    const next = Math.min(prev + (eventData.count || 1), mission.target);
    newProgress[mission.id] = next;

    // اكتملت الآن؟ — نتحقق أنها لم تُستلم بعد (completedIds يخزن mission.id مباشرة)
    if (next >= mission.target && !newCompleted.includes(mission.id)) {
      freshlyDone.push(mission.id);
    }
  }

  // حفظ التقدم المحدَّث (بدون إضافة completedIds — يتم عند الاستلام)
  const updatedData = { ...dailyData, progress: newProgress };

  if (isGuest) {
    await AsyncStorage.setItem(`guest_daily_${date}`, JSON.stringify(updatedData));
  } else {
    await updateDoc(doc(db, 'users', uid, 'dailyMissions', date), { progress: newProgress });
  }

  return { freshlyDone, xpGained };
};

// ══════════════════════════════════════════════════════════════
//  9. استلام مكافأة مهمة (عند الضغط على زر "استلام")
// ══════════════════════════════════════════════════════════════

/**
 * @returns { xpGained, newXP, newLevel, leveledUp, levelReward }
 */
export const claimMissionReward = async (uid, missionId, isGuest = false) => {
  const date    = todayStr();
  const mission = DAILY_MISSIONS_POOL.find(m => m.id === missionId);
  if (!mission) return { xpGained: 0 };

  let dailyData = await getDailyMissions(uid, isGuest);

  // منع الاستلام المزدوج
  if (dailyData.completedIds.includes(missionId)) return { xpGained: 0 };

  const newCompletedIds = [...dailyData.completedIds, missionId];
  const updatedDaily    = { ...dailyData, completedIds: newCompletedIds };

  if (isGuest) {
    await AsyncStorage.setItem(`guest_daily_${date}`, JSON.stringify(updatedDaily));
    // للضيف نحدّث XP محلياً فقط
    const guestXP = await getGuestXP();
    const newXP   = guestXP + mission.xp;
    await setGuestXP(newXP);
    const levelInfo = getLevelFromXP(newXP);
    return { xpGained: mission.xp, newXP, ...levelInfo, leveledUp: false };
  }

  // تحديث daily
  await updateDoc(doc(db, 'users', uid, 'dailyMissions', date), {
    completedIds: newCompletedIds,
  });

  // إضافة XP
  return await addXP(uid, mission.xp);
};

// ══════════════════════════════════════════════════════════════
//  10. إضافة XP ومعالجة ترقية المستوى
// ══════════════════════════════════════════════════════════════

/**
 * الوظيفة المركزية لإضافة XP.
 * تتحقق من ترقية المستوى وتوزع التوكنز تلقائياً.
 * @returns { xpGained, newXP, level, label, leveledUp, levelReward }
 */
export const addXP = async (uid, xpToAdd) => {
  const userRef  = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) return { xpGained: 0 };

  const data   = userSnap.data();
  const oldXP  = data.xp    || 0;
  const oldLvl = data.level  || 1;
  const newXP  = oldXP + xpToAdd;

  const newInfo  = getLevelFromXP(newXP);
  const leveledUp = newInfo.level > oldLvl;

  // استخدم increment() لتجنب race condition
  const updates = {
    xp:    increment(xpToAdd),
    level: newInfo.level,
  };

  // جائزة ترقية المستوى
  let levelReward = 0;
  if (leveledUp) {
    for (let lvl = oldLvl + 1; lvl <= newInfo.level; lvl++) {
      const lvlData = LEVELS.find(l => l.level === lvl);
      if (lvlData?.reward) levelReward += lvlData.reward;
    }
    if (levelReward > 0) {
      updates.tokens = increment(levelReward);
    }
  }

  await updateDoc(userRef, updates);

  return {
    xpGained:    xpToAdd,
    newXP,
    level:       newInfo.level,
    label:       newInfo.label,
    progress:    newInfo.progress,
    leveledUp,
    levelReward,
  };
};

// ══════════════════════════════════════════════════════════════
//  11. تسجيل نهاية لعبة أونلاين (win/loss)
// ══════════════════════════════════════════════════════════════

/**
 * يُستدعى من OnlineGameScreen عند انتهاء اللعبة.
 * @param gameName - اسم اللعبة (xo, bullshit, kout, ...)
 * @param won      - هل فاز؟
 */
export const recordOnlineGameEnd = async (uid, gameName, won, isGuest = false) => {
  const date = todayStr();
  let xpToAdd = won ? XP_ONLINE_WIN : XP_ONLINE_LOSS;

  if (isGuest) {
    const guestXP   = await getGuestXP();
    const guestData = JSON.parse(await AsyncStorage.getItem('guest_stats') || '{}');
    const winsToday = guestData.winsToday === date ? (guestData.winCount || 0) : 0;

    if (won && winsToday >= XP_WIN_CAP_PER_DAY) xpToAdd = 0;
    const newXP = guestXP + xpToAdd;
    await setGuestXP(newXP);

    const newStats = {
      winsToday: date,
      winCount:  won ? Math.min(winsToday + 1, XP_WIN_CAP_PER_DAY) : winsToday,
      onlineGamesPlayed: (guestData.onlineGamesPlayed || 0) + 1,
      onlineWins:        (guestData.onlineWins || 0) + (won ? 1 : 0),
    };
    await AsyncStorage.setItem('guest_stats', JSON.stringify(newStats));
    await updateMissionProgress(uid, won ? 'online_win' : 'online_loss', { game: gameName }, true);
    return { xpGained: xpToAdd };
  }

  // ── مستخدم مسجل — قراءة واحدة فقط ──
  const userRef  = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) return { xpGained: 0 };
  const data  = userSnap.data();
  const stats = data.stats || {};

  // فحص cap الانتصارات اليومية من daily doc
  const dailyRef  = doc(db, 'users', uid, 'dailyMissions', date);
  const dailySnap = await getDoc(dailyRef);
  const dailyData = dailySnap.exists() ? dailySnap.data() : { winsToday: 0 };

  if (won && (dailyData.winsToday || 0) >= XP_WIN_CAP_PER_DAY) xpToAdd = 0;

  // ── batch: جمع كل الكتابات في عملية واحدة ──
  const batch = writeBatch(db);

  // 1. تحديث إحصائيات المستخدم
  const gameWins = stats.gameWins || {};
  const statUpdates = {
    'stats.onlineGamesPlayed': increment(1),
    'stats.totalGamesPlayed':  increment(1),
  };
  if (won) {
    statUpdates['stats.onlineWins']              = increment(1);
    statUpdates[`stats.gameWins.${gameName}`]    = increment(1);
  }
  const typesPlayed = stats.gameTypesPlayed || [];
  if (!typesPlayed.includes(gameName)) {
    statUpdates['stats.gameTypesPlayed'] = [...typesPlayed, gameName];
  }
  if (xpToAdd > 0) {
    statUpdates.xp    = increment(xpToAdd);
    // احسب المستوى الجديد
    const newXP   = (data.xp || 0) + xpToAdd;
    const newInfo = getLevelFromXP(newXP);
    statUpdates.level = newInfo.level;
    const oldLvl  = data.level || 1;
    if (newInfo.level > oldLvl) {
      let levelReward = 0;
      for (let lvl = oldLvl + 1; lvl <= newInfo.level; lvl++) {
        const lvlData = LEVELS.find(l => l.level === lvl);
        if (lvlData?.reward) levelReward += lvlData.reward;
      }
      if (levelReward > 0) statUpdates.tokens = increment(levelReward);
      // إرجاع leveledUp info
      batch.update(userRef, statUpdates);
      if (won) batch.update(dailyRef, { winsToday: increment(1) });
      await batch.commit();
      const { freshlyDone } = await updateMissionProgress(uid, won ? 'online_win' : 'online_loss', { game: gameName });
      // achievements بشكل lazy — لا نوقف اللعبة عليها
      checkAndUpdateAchievements(uid).catch(() => {});
      return {
        xpGained: xpToAdd, newXP,
        level: newInfo.level, label: newInfo.label,
        progress: newInfo.progress,
        leveledUp: true, levelReward,
        freshlyDone,
      };
    }
  }

  batch.update(userRef, statUpdates);
  if (won) batch.update(dailyRef, { winsToday: increment(1) });
  await batch.commit();

  // المهام والإنجازات بعد الـ batch
  const { freshlyDone } = await updateMissionProgress(uid, won ? 'online_win' : 'online_loss', { game: gameName });
  checkAndUpdateAchievements(uid).catch(() => {}); // fire-and-forget

  const newXP   = (data.xp || 0) + xpToAdd;
  const newInfo = getLevelFromXP(newXP);

  return {
    xpGained:   xpToAdd,
    newXP,
    level:      newInfo.level,
    label:      newInfo.label,
    progress:   newInfo.progress,
    leveledUp:  false,
    levelReward: 0,
    freshlyDone,
  };
};

// ══════════════════════════════════════════════════════════════
//  12. فحص وتحديث الإنجازات الدائمة
// ══════════════════════════════════════════════════════════════

/**
 * يفحص كل الإنجازات بعد أي حدث ويُحدِّث Firestore
 * @returns مصفوفة الإنجازات التي بلغت milestone جديدة
 */
export const checkAndUpdateAchievements = async (uid) => {
  const userRef  = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) return [];

  const data  = userSnap.data();
  const stats = data.stats || {};

  const achRef      = collection(db, 'users', uid, 'achievements');
  const achSnap     = await getDocs(achRef);
  const achData     = {};
  achSnap.forEach(d => { achData[d.id] = d.data(); });

  const newlyUnlocked = [];

  for (const ach of ACHIEVEMENTS) {
    const current = achData[ach.id] || { milestoneIndex: -1, claimed: [] };
    let value;

    if (ach.isCounted) {
      // مستكشف الميدان — نحسب عدد العناصر
      value = (stats.gameTypesPlayed || []).length;
    } else if (ach.stat.includes('.')) {
      // nested stat مثل gameWins.xo
      const [parent, child] = ach.stat.split('.');
      value = (stats[parent] || {})[child] || 0;
    } else {
      value = stats[ach.stat] || 0;
    }

    // هل بلغ milestone جديدة؟
    let newMilestoneIndex = current.milestoneIndex;
    for (let i = current.milestoneIndex + 1; i < ach.milestones.length; i++) {
      if (value >= ach.milestones[i]) {
        newMilestoneIndex = i;
        newlyUnlocked.push({
          achievementId:  ach.id,
          milestoneIndex: i,
          milestone:      ach.milestones[i],
          xp:             ach.xpPerMilestone[i],
          ar:             ach.ar,
          en:             ach.en,
          icon:           ach.icon,
        });
      }
    }

    if (newMilestoneIndex !== current.milestoneIndex) {
      await setDoc(
        doc(db, 'users', uid, 'achievements', ach.id),
        { milestoneIndex: newMilestoneIndex, claimed: current.claimed || [] },
        { merge: true }
      );
    }
  }

  // إضافة XP لكل milestone جديدة بُلغت
  for (const item of newlyUnlocked) {
    if (item.xp > 0) await addXP(uid, item.xp);
  }

  return newlyUnlocked;
};

// ══════════════════════════════════════════════════════════════
//  13. تسجيل نهاية لعبة Solo
// ══════════════════════════════════════════════════════════════

export const recordSoloGameEnd = async (uid, won, isGuest = false) => {
  const xpToAdd = won ? 25 : 10;

  if (isGuest) {
    const guestXP = await getGuestXP();
    await setGuestXP(guestXP + xpToAdd);
    await updateMissionProgress(uid, won ? 'solo_win' : 'solo_play', {}, true);
    return { xpGained: xpToAdd };
  }

  const userRef  = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) return { xpGained: 0 };
  const data   = userSnap.data();
  const oldXP  = data.xp    || 0;
  const oldLvl = data.level  || 1;
  const newXP  = oldXP + xpToAdd;
  const newInfo = getLevelFromXP(newXP);
  const leveledUp = newInfo.level > oldLvl;

  const statUpdates = {
    'stats.soloGamesPlayed':  increment(1),
    'stats.totalGamesPlayed': increment(1),
    xp:    increment(xpToAdd),
    level: newInfo.level,
    ...(won ? { 'stats.soloWins': increment(1) } : {}),
  };

  let levelReward = 0;
  if (leveledUp) {
    for (let lvl = oldLvl + 1; lvl <= newInfo.level; lvl++) {
      const lvlData = LEVELS.find(l => l.level === lvl);
      if (lvlData?.reward) levelReward += lvlData.reward;
    }
    if (levelReward > 0) statUpdates.tokens = increment(levelReward);
  }

  await updateDoc(userRef, statUpdates);

  const { freshlyDone } = await updateMissionProgress(uid, won ? 'solo_win' : 'solo_play');
  checkAndUpdateAchievements(uid).catch(() => {}); // fire-and-forget

  return {
    xpGained: xpToAdd, newXP,
    level: newInfo.level, label: newInfo.label,
    progress: newInfo.progress,
    leveledUp, levelReward,
    freshlyDone,
  };
};

// ══════════════════════════════════════════════════════════════
//  14. تسجيل مشاهدة إعلان
// ══════════════════════════════════════════════════════════════

export const recordAdWatched = async (uid, isGuest = false) => {
  const { freshlyDone } = await updateMissionProgress(uid, 'watch_ad', {}, isGuest);
  return { freshlyDone };
};

// ══════════════════════════════════════════════════════════════
//  15. تسجيل تسجيل الدخول اليومي
// ══════════════════════════════════════════════════════════════

export const recordDailyLogin = async (uid, isGuest = false) => {
  const { freshlyDone } = await updateMissionProgress(uid, 'daily_login', {}, isGuest);

  if (!isGuest) {
    // تحديث الـ streak
    const userRef  = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const data  = userSnap.data();
      const stats = data.stats || {};
      const last  = stats.lastPlayedDate || '';
      const today = todayStr();

      if (last !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yStr = yesterday.toISOString().split('T')[0];
        const streak = last === yStr ? (stats.streakDays || 0) + 1 : 1;
        await updateDoc(userRef, {
          'stats.streakDays':    streak,
          'stats.lastPlayedDate': today,
        });
        await checkAndUpdateAchievements(uid);
      }
    }
  }

  return { freshlyDone };
};

// ══════════════════════════════════════════════════════════════
//  16. Guest XP helpers (AsyncStorage)
// ══════════════════════════════════════════════════════════════

const GUEST_XP_KEY = 'guest_xp_total';
export const getGuestXP  = async () => parseInt(await AsyncStorage.getItem(GUEST_XP_KEY) || '0');
export const setGuestXP  = async (xp) => AsyncStorage.setItem(GUEST_XP_KEY, String(xp));

// ══════════════════════════════════════════════════════════════
//  17. جلب ملخص الملف الشخصي
// ══════════════════════════════════════════════════════════════

export const getProfileSummary = async (uid, isGuest = false) => {
  if (isGuest) {
    const xp    = await getGuestXP();
    const stats = JSON.parse(await AsyncStorage.getItem('guest_stats') || '{}');
    return { xp, levelInfo: getLevelFromXP(xp), stats, isGuest: true };
  }

  const userSnap = await getDoc(doc(db, 'users', uid));
  if (!userSnap.exists()) return null;
  const data     = userSnap.data();
  const xp       = data.xp || 0;
  const levelInfo = getLevelFromXP(xp);

  // جلب الإنجازات
  const achSnap = await getDocs(collection(db, 'users', uid, 'achievements'));
  const achievements = {};
  achSnap.forEach(d => { achievements[d.id] = d.data(); });

  return {
    ...data,
    xp,
    levelInfo,
    stats: data.stats || {},
    achievements,
    isGuest: false,
  };
};
