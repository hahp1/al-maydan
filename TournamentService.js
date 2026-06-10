/**
 * TournamentService.js — منطق البطولة الكامل
 * ════════════════════════════════════════════════
 *
 *  هيكل Firestore:
 *  ─────────────────────────────────────────────
 *  tournaments/{tournamentId}
 *    id:           string
 *    weekNumber:   number          (رقم البطولة)
 *    startsAt:     Timestamp
 *    endsAt:       Timestamp
 *    scoringEndsAt:Timestamp       (endsAt - 36 ساعة)
 *    status:       'upcoming'|'active'|'scoring_closed'|'finished'
 *    createdAt:    Timestamp
 *
 *  tournaments/{tournamentId}/scores/{userId}
 *    userId:       string
 *    name:         string
 *    score:        number
 *    gamesPlayed:  number
 *    lastUpdated:  Timestamp
 *
 *  tournaments/{tournamentId}/prizes_distributed: boolean
 *
 *  pastWinners/{tournamentId}
 *    tournamentId: string
 *    weekNumber:   number
 *    startsAt:     Timestamp
 *    endsAt:       Timestamp
 *    winners: [
 *      { rank, userId, name, score }  // أول 3
 *    ]
 *
 *  الجوائز (توكنز):
 *    🥇 المركز 1       → 2500 توكن
 *    🥈 المركز 2       → 1500 توكن
 *    🥉 المركز 3       → 1000 توكن
 *    4  - 10           → 500  توكن
 *    11 - 20           → 250  توكن
 *
 *  قواعد:
 *  - السكورات تُحسب فقط في الأوضاع المُصنَّفة
 *  - عند وصول البطولة لـ scoringEndsAt: status = 'scoring_closed'
 *    اللعب يستمر لكن السكورات لا تُحسب
 *  - عند endsAt: status = 'finished'، الجوائز تُوزَّع مرة واحدة
 */

import {
  doc, collection, getDoc, getDocs, setDoc, updateDoc,
  addDoc, query, orderBy, limit, onSnapshot,
  serverTimestamp, Timestamp, where, writeBatch, increment,
} from 'firebase/firestore';
import { db } from './firebaseConfig';

// ══════════════════════════════════════════════
//  الثوابت
// ══════════════════════════════════════════════

export const TOURNAMENT_PRIZES = [
  { rank: 1,  tokens: 2500 },
  { rank: 2,  tokens: 1500 },
  { rank: 3,  tokens: 1000 },
  { rank: 4,  tokens: 500  },
  { rank: 5,  tokens: 500  },
  { rank: 6,  tokens: 500  },
  { rank: 7,  tokens: 500  },
  { rank: 8,  tokens: 500  },
  { rank: 9,  tokens: 500  },
  { rank: 10, tokens: 500  },
  { rank: 11, tokens: 250  },
  { rank: 12, tokens: 250  },
  { rank: 13, tokens: 250  },
  { rank: 14, tokens: 250  },
  { rank: 15, tokens: 250  },
  { rank: 16, tokens: 250  },
  { rank: 17, tokens: 250  },
  { rank: 18, tokens: 250  },
  { rank: 19, tokens: 250  },
  { rank: 20, tokens: 250  },
];

// مدة البطولة: 5 أيام (الخميس 00:00 → الثلاثاء 00:00)
// يومان راحة (الثلاثاء 00:00 → الخميس 00:00) — اللعب مستمر بدون حساب
// السكورنغ يُغلق قبل دقيقة واحدة من نهاية البطولة
export const TOURNAMENT_DURATION_MS      = 5 * 24 * 60 * 60 * 1000;  // 5 أيام
export const SCORING_CLOSE_BEFORE_END_MS = 1 * 60 * 1000;             // دقيقة واحدة
export const REST_DURATION_MS            = 2 * 24 * 60 * 60 * 1000;  // يومان راحة

// ══════════════════════════════════════════════
//  getActiveTournament — جلب البطولة الحالية
//  returns: tournament object | null
// ══════════════════════════════════════════════
export async function getActiveTournament() {
  try {
    const now = Date.now();
    const q = query(
      collection(db, 'tournaments'),
      where('status', 'in', ['active', 'scoring_closed', 'upcoming']),
      orderBy('startsAt', 'asc'),
      limit(1),
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;

    const d = snap.docs[0];
    const data = { id: d.id, ...d.data() };

    // تحويل Timestamps إلى milliseconds
    const endsAt       = data.endsAt?.toMillis       ? data.endsAt.toMillis()       : data.endsAt;
    const startsAt     = data.startsAt?.toMillis      ? data.startsAt.toMillis()     : data.startsAt;
    const scoringEndsAt= data.scoringEndsAt?.toMillis ? data.scoringEndsAt.toMillis(): data.scoringEndsAt;

    // تحقق تلقائي من الحالة وحدّثها إذا لزم
    if (now >= endsAt && data.status !== 'finished') {
      await updateDoc(doc(db, 'tournaments', d.id), { status: 'finished' });
      // توزيع الجوائز (بدون انتظار)
      distributePrizes(d.id).catch(console.error);
      return null;
    }

    if (now >= scoringEndsAt && data.status === 'active') {
      await updateDoc(doc(db, 'tournaments', d.id), { status: 'scoring_closed' });
      data.status = 'scoring_closed';
    }

    return {
      ...data,
      endsAt,
      startsAt,
      scoringEndsAt,
      isActive:        data.status === 'active',
      isScoringClosed: data.status === 'scoring_closed',
    };
  } catch (e) {
    console.error('getActiveTournament error:', e);
    return null;
  }
}

// ══════════════════════════════════════════════
//  subscribeToActiveTournament — مستمع حي
//  callback: (tournament | null) => void
//  returns: unsubscribe function
// ══════════════════════════════════════════════
export function subscribeToActiveTournament(callback) {
  const q = query(
    collection(db, 'tournaments'),
    where('status', 'in', ['active', 'scoring_closed']),
    orderBy('startsAt', 'desc'),
    limit(1),
  );

  return onSnapshot(q, (snap) => {
    if (snap.empty) { callback(null); return; }
    const d    = snap.docs[0];
    const data = { id: d.id, ...d.data() };

    const now          = Date.now();
    const endsAt       = data.endsAt?.toMillis       ? data.endsAt.toMillis()       : (data.endsAt ?? 0);
    const startsAt     = data.startsAt?.toMillis      ? data.startsAt.toMillis()     : (data.startsAt ?? 0);
    const scoringEndsAt= data.scoringEndsAt?.toMillis ? data.scoringEndsAt.toMillis(): (data.scoringEndsAt ?? 0);

    callback({
      ...data,
      endsAt,
      startsAt,
      scoringEndsAt,
      isActive:        data.status === 'active' && now < scoringEndsAt,
      isScoringClosed: data.status === 'scoring_closed' || (data.status === 'active' && now >= scoringEndsAt),
    });
  }, (err) => {
    console.error('subscribeToActiveTournament error:', err);
    callback(null);
  });
}

// ══════════════════════════════════════════════
//  subscribeToLeaderboard — الصدارة الحية
//  tournamentId: string
//  callback: (scores[]) => void
//  returns: unsubscribe function
// ══════════════════════════════════════════════
export function subscribeToLeaderboard(tournamentId, callback) {
  const q = query(
    collection(db, 'tournaments', tournamentId, 'scores'),
    orderBy('score', 'desc'),
    limit(20),
  );
  return onSnapshot(q, (snap) => {
    const scores = snap.docs.map((d, i) => ({
      rank: i + 1,
      userId: d.id,
      ...d.data(),
    }));
    callback(scores);
  }, (err) => {
    console.error('subscribeToLeaderboard error:', err);
    callback([]);
  });
}

// ══════════════════════════════════════════════
//  addTournamentScore — إضافة/تحديث نقاط لاعب
//  يُستدعى في نهاية كل لعبة مصنَّفة
//
//  tournamentId:  string
//  userId:        string
//  userName:      string
//  scoreToAdd:    number   (النقاط التي كسبها في هذه اللعبة)
//
//  returns: { success, newScore } | { success: false }
// ══════════════════════════════════════════════
export async function addTournamentScore(tournamentId, userId, userName, scoreToAdd) {
  if (!tournamentId || !userId || !scoreToAdd || scoreToAdd <= 0) {
    return { success: false, reason: 'invalid_params' };
  }

  try {
    // تحقق من أن البطولة لا تزال تقبل سكورات
    const tourRef  = doc(db, 'tournaments', tournamentId);
    const tourSnap = await getDoc(tourRef);
    if (!tourSnap.exists()) return { success: false, reason: 'tournament_not_found' };

    const tourData = tourSnap.data();
    const now      = Date.now();
    const scoringEndsAt = tourData.scoringEndsAt?.toMillis
      ? tourData.scoringEndsAt.toMillis()
      : tourData.scoringEndsAt;

    // إذا انتهى وقت الحساب أو انتهت البطولة → لا نُسجّل
    if (tourData.status === 'finished' || tourData.status === 'scoring_closed' || now >= scoringEndsAt) {
      return { success: false, reason: 'scoring_closed' };
    }

    const scoreRef  = doc(db, 'tournaments', tournamentId, 'scores', userId);
    const scoreSnap = await getDoc(scoreRef);

    if (scoreSnap.exists()) {
      // increment() يمنع race condition إذا تزامنت لعبتان
      await updateDoc(scoreRef, {
        score:       increment(scoreToAdd),
        gamesPlayed: increment(1),
        name:        userName,
        lastUpdated: serverTimestamp(),
      });
      const newScore = (scoreSnap.data().score ?? 0) + scoreToAdd;
      return { success: true, newScore };
    } else {
      await setDoc(scoreRef, {
        userId,
        name:        userName,
        score:       scoreToAdd,
        gamesPlayed: 1,
        lastUpdated: serverTimestamp(),
      });
      return { success: true, newScore: scoreToAdd };
    }
  } catch (e) {
    console.error('addTournamentScore error:', e);
    return { success: false, reason: 'error' };
  }
}

// ══════════════════════════════════════════════
//  getUserTournamentScore — نقاط لاعب واحد
// ══════════════════════════════════════════════
export async function getUserTournamentScore(tournamentId, userId) {
  try {
    const snap = await getDoc(doc(db, 'tournaments', tournamentId, 'scores', userId));
    if (!snap.exists()) return { score: 0, rank: null, gamesPlayed: 0 };

    const data = snap.data();

    // حساب المركز (نعدّ كم شخص سكوره أعلى)
    const higherQ = query(
      collection(db, 'tournaments', tournamentId, 'scores'),
      where('score', '>', data.score),
    );
    const higherSnap = await getDocs(higherQ);
    const rank       = higherSnap.size + 1;

    return { score: data.score ?? 0, rank, gamesPlayed: data.gamesPlayed ?? 0 };
  } catch (e) {
    console.error('getUserTournamentScore error:', e);
    return { score: 0, rank: null, gamesPlayed: 0 };
  }
}

// ══════════════════════════════════════════════
//  isUserInTournament — هل اللاعب مشترك؟
// ══════════════════════════════════════════════
export async function isUserInTournament(tournamentId, userId) {
  try {
    const snap = await getDoc(doc(db, 'tournaments', tournamentId, 'scores', userId));
    return snap.exists();
  } catch {
    return false;
  }
}

// ══════════════════════════════════════════════
//  distributePrizes — توزيع الجوائز عند النهاية
//  يُنفَّذ مرة واحدة فقط (مؤمَّن بـ prizes_distributed)
// ══════════════════════════════════════════════
export async function distributePrizes(tournamentId) {
  try {
    const tourRef  = doc(db, 'tournaments', tournamentId);
    const tourSnap = await getDoc(tourRef);
    if (!tourSnap.exists()) return;

    const tourData = tourSnap.data();

    // منع التوزيع المزدوج
    if (tourData.prizes_distributed) {
      
      return;
    }

    // جلب أعلى 20 لاعب
    const scoresQ  = query(
      collection(db, 'tournaments', tournamentId, 'scores'),
      orderBy('score', 'desc'),
      limit(20),
    );
    const scoresSnap = await getDocs(scoresQ);
    if (scoresSnap.empty) {
      await updateDoc(tourRef, { prizes_distributed: true });
      return;
    }

    const winners = [];
    const batch   = writeBatch(db);

    scoresSnap.docs.forEach((d, i) => {
      const rank    = i + 1;
      const prize   = TOURNAMENT_PRIZES.find(p => p.rank === rank);
      const tokens  = prize?.tokens ?? 0;
      const userId  = d.id;
      const data    = d.data();

      if (tokens > 0) {
        // سجّل المكافأة في مجموعة rewards لكل لاعب
        const rewardRef = doc(collection(db, 'users', userId, 'rewards'));
        batch.set(rewardRef, {
          type:           'tournament_prize',
          tournamentId,
          weekNumber:     tourData.weekNumber ?? 0,
          rank,
          tokens,
          createdAt:      serverTimestamp(),
          claimed:        false,
        });
      }

      if (rank <= 3) {
        winners.push({ rank, userId, name: data.name, score: data.score });
      }
    });

    // حفظ الفائزين في pastWinners
    await setDoc(doc(db, 'pastWinners', tournamentId), {
      tournamentId,
      weekNumber:  tourData.weekNumber ?? 0,
      startsAt:    tourData.startsAt,
      endsAt:      tourData.endsAt,
      winners,
      createdAt:   serverTimestamp(),
    });

    // تنفيذ batch + علامة التوزيع
    await batch.commit();
    await updateDoc(tourRef, {
      status:              'finished',
      prizes_distributed:  true,
    });

  } catch (e) {
    console.error('distributePrizes error:', e);
  }
}

// ══════════════════════════════════════════════
//  claimPrize — المطالبة بجائزة (تُضاف للتوكنز)
//  rewardId:       string (id في users/{uid}/rewards)
//  currentTokens:  number
//  returns: { success, tokens, rewardTokens }
// ══════════════════════════════════════════════
export async function claimPrize(userId, rewardId, currentTokens) {
  try {
    const rewardRef  = doc(db, 'users', userId, 'rewards', rewardId);
    const rewardSnap = await getDoc(rewardRef);
    if (!rewardSnap.exists()) return { success: false, reason: 'not_found' };

    const reward = rewardSnap.data();
    if (reward.claimed) return { success: false, reason: 'already_claimed' };

    const newTokens = currentTokens + (reward.tokens ?? 0);

    await updateDoc(rewardRef, {
      claimed:   true,
      claimedAt: serverTimestamp(),
    });

    // تحديث توكنز المستخدم في Firestore أيضاً (اختياري)
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      await updateDoc(userRef, { tokens: newTokens });
    }

    return { success: true, tokens: newTokens, rewardTokens: reward.tokens };
  } catch (e) {
    console.error('claimPrize error:', e);
    return { success: false, reason: 'error' };
  }
}

// ══════════════════════════════════════════════
//  getPendingRewards — الجوائز غير المستلمة
// ══════════════════════════════════════════════
export async function getPendingRewards(userId) {
  try {
    const q    = query(
      collection(db, 'users', userId, 'rewards'),
      where('claimed', '==', false),
      orderBy('createdAt', 'desc'),
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error('getPendingRewards error:', e);
    return [];
  }
}

// ══════════════════════════════════════════════
//  getPastWinners — الفائزون السابقون
//  limit_: عدد البطولات السابقة (default 10)
// ══════════════════════════════════════════════
export async function getPastWinners(limit_ = 10) {
  try {
    const q    = query(
      collection(db, 'pastWinners'),
      orderBy('endsAt', 'desc'),
      limit(limit_),
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({
      id: d.id,
      ...d.data(),
      endsAt:   d.data().endsAt?.toMillis   ? d.data().endsAt.toMillis()   : d.data().endsAt,
      startsAt: d.data().startsAt?.toMillis ? d.data().startsAt.toMillis() : d.data().startsAt,
    }));
  } catch (e) {
    console.error('getPastWinners error:', e);
    return [];
  }
}

// ══════════════════════════════════════════════
//  getNextTournamentStartTime — موعد القادمة
//  returns: { startsAt: number } | null
// ══════════════════════════════════════════════
export async function getNextTournamentStartTime() {
  try {
    // أولاً: هل توجد بطولة upcoming؟
    const q = query(
      collection(db, 'tournaments'),
      where('status', '==', 'upcoming'),
      orderBy('startsAt', 'asc'),
      limit(1),
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const data     = snap.docs[0].data();
      const startsAt = data.startsAt?.toMillis ? data.startsAt.toMillis() : data.startsAt;
      return { startsAt };
    }
    // ثانياً: احسب الخميس القادم
    const nextThursday = getNextThursdayMidnight();
    return { startsAt: nextThursday.getTime(), isEstimate: true };
  } catch (e) {
    console.error('getNextTournamentStartTime error:', e);
    return null;
  }
}

// ══════════════════════════════════════════════
//  getNextThursdayMidnight — الخميس القادم 00:00
// ══════════════════════════════════════════════
export function getNextThursdayMidnight(fromDate = new Date()) {
  const d = new Date(fromDate);
  // اضبط على منتصف الليل
  d.setHours(0, 0, 0, 0);
  // الخميس = 4 في JS (0=الأحد)
  const day = d.getDay();
  const daysUntilThursday = (4 - day + 7) % 7 || 7; // إذا اليوم خميس → الخميس القادم
  d.setDate(d.getDate() + daysUntilThursday);
  return d;
}

// ══════════════════════════════════════════════
//  autoCreateNextTournament — ينشئ البطولة القادمة
//  تلقائياً إذا لم تكن موجودة
//  يُستدعى عند فتح التطبيق
// ══════════════════════════════════════════════
export async function autoCreateNextTournament() {
  try {
    const now = Date.now();

    // 1. هل توجد بطولة نشطة أو قادمة؟
    const activeQ = query(
      collection(db, 'tournaments'),
      where('status', 'in', ['active', 'scoring_closed', 'upcoming']),
      limit(1),
    );
    const activeSnap = await getDocs(activeQ);
    if (!activeSnap.empty) return null; // موجودة، لا نحتاج إنشاء

    // 2. احسب رقم البطولة
    const allQ   = query(collection(db, 'tournaments'), orderBy('weekNumber', 'desc'), limit(1));
    const allSnap = await getDocs(allQ);
    const lastWeek = allSnap.empty ? 0 : (allSnap.docs[0].data().weekNumber ?? 0);
    const weekNumber = lastWeek + 1;

    // 3. الخميس القادم 00:00
    const startDate = getNextThursdayMidnight();
    const startMs   = startDate.getTime();
    const endMs     = startMs + TOURNAMENT_DURATION_MS;        // الثلاثاء 00:00
    const scoringEndMs = endMs - SCORING_CLOSE_BEFORE_END_MS; // قبل دقيقة من النهاية

    const ref = await addDoc(collection(db, 'tournaments'), {
      weekNumber,
      startsAt:           Timestamp.fromMillis(startMs),
      endsAt:             Timestamp.fromMillis(endMs),
      scoringEndsAt:      Timestamp.fromMillis(scoringEndMs),
      status:             startMs <= now ? 'active' : 'upcoming',
      prizes_distributed: false,
      createdAt:          serverTimestamp(),
    });

    return { success: true, id: ref.id, weekNumber, startsAt: startMs, endsAt: endMs };
  } catch (e) {
    console.error('autoCreateNextTournament error:', e);
    return null;
  }
}

// ══════════════════════════════════════════════
//  createTournament — إنشاء يدوي (Admin)
//  weekNumber:  number
//  startsAt:    Date (default = الخميس القادم)
// ══════════════════════════════════════════════
export async function createTournament(weekNumber, startsAt) {
  try {
    const startDate    = startsAt ?? getNextThursdayMidnight();
    const startMs      = startDate.getTime ? startDate.getTime() : startDate;
    const endMs        = startMs + TOURNAMENT_DURATION_MS;
    const scoringEndMs = endMs   - SCORING_CLOSE_BEFORE_END_MS;
    const now          = Date.now();

    const ref = await addDoc(collection(db, 'tournaments'), {
      weekNumber,
      startsAt:           Timestamp.fromMillis(startMs),
      endsAt:             Timestamp.fromMillis(endMs),
      scoringEndsAt:      Timestamp.fromMillis(scoringEndMs),
      status:             startMs <= now ? 'active' : 'upcoming',
      prizes_distributed: false,
      createdAt:          serverTimestamp(),
    });

    return { success: true, id: ref.id };
  } catch (e) {
    console.error('createTournament error:', e);
    return { success: false };
  }
}

// ══════════════════════════════════════════════
//  formatCountdown — تنسيق العداد
//  ms: milliseconds remaining
//  returns: string "2ي 14س 32د" أو "45د"
// ══════════════════════════════════════════════
export function formatCountdown(ms) {
  if (ms <= 0) return '00:00:00';
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;

  if (d > 0) return `${d}ي ${h}س ${m}د`;
  const hh = String(h).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

// ══════════════════════════════════════════════
//  getPrizeForRank — جائزة مركز معين
// ══════════════════════════════════════════════
export function getPrizeForRank(rank) {
  const prize = TOURNAMENT_PRIZES.find(p => p.rank === rank);
  return prize?.tokens ?? 0;
}

// ══════════════════════════════════════════════
//  RANKED_MODES — الأوضاع التي تُحسب في البطولة
// ══════════════════════════════════════════════
export const RANKED_MODES = ['soloTournament', 'online_random', 'online_friend'];
