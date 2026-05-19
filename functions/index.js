/**
 * Arena — Firebase Cloud Functions
 * ════════════════════════════════════════════════════════════════
 *
 *  الدوال:
 *
 *  1. autoDistributePrizes (Scheduled — كل ساعة)
 *     يفحص البطولات المنتهية ويوزع الجوائز تلقائياً
 *     ضمان: خلال ساعة من انتهاء البطولة بغض النظر عن المستخدمين
 *
 *  2. autoCreateNextTournament (Scheduled — كل ساعة)
 *     عند انتهاء البطولة وعدم وجود بطولة قادمة → ينشئ تلقائياً
 *     (اختياري — يمكن إيقافه والإنشاء يدوياً من AdminScreen)
 *
 *  3. onTournamentFinished (Firestore Trigger)
 *     يُشغَّل لحظة تغيير status → 'finished' في Firestore
 *     ضمان مزدوج مع autoDistributePrizes
 *
 *  4. closeScoringWindow (Scheduled — كل 30 دقيقة)
 *     يُغلق نافذة الحساب تلقائياً (scoringEndsAt)
 *
 *  نموذج Firestore:
 *  ─────────────────────────────────────────────────────────────
 *  tournaments/{id}
 *    status:              'upcoming'|'active'|'scoring_closed'|'finished'
 *    startsAt:            Timestamp
 *    endsAt:              Timestamp
 *    scoringEndsAt:       Timestamp
 *    weekNumber:          number
 *    prizes_distributed:  boolean
 *
 *  tournaments/{id}/scores/{userId}
 *    name:        string
 *    score:       number
 *    gamesPlayed: number
 *
 *  users/{userId}/rewards/{rewardId}
 *    type:         'tournament_prize'
 *    tournamentId: string
 *    weekNumber:   number
 *    rank:         number
 *    tokens:       number
 *    claimed:      boolean
 *    createdAt:    Timestamp
 *
 *  pastWinners/{tournamentId}
 *    winners: [{ rank, userId, name, score }]
 */

const functions  = require('firebase-functions');
const admin      = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

// ══════════════════════════════════════════════════════════════
//  الثوابت — يجب أن تطابق TournamentService.js
// ══════════════════════════════════════════════════════════════
const TOURNAMENT_PRIZES = [
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

// البطولة: خميس 00:00 → اثنين 23:59 (5 أيام)
// راحة:    ثلاثاء + أربعاء (يومان انتظار وشوق)
// النقاط تُقبل حتى آخر لحظة (اثنين 23:59)
const TOURNAMENT_DURATION_MS      = 5 * 24 * 60 * 60 * 1000; // 5 أيام
const SCORING_CLOSE_BEFORE_END_MS = 1 * 60 * 1000;           // دقيقة واحدة فقط قبل النهاية

// ══════════════════════════════════════════════════════════════
//  الدالة الجوهرية: distributePrizesCore
//  تُستخدم من عدة دوال — منع التكرار بـ prizes_distributed
// ══════════════════════════════════════════════════════════════
async function distributePrizesCore(tournamentId) {
  const tourRef  = db.collection('tournaments').doc(tournamentId);
  const tourSnap = await tourRef.get();

  if (!tourSnap.exists) {
    functions.logger.warn('distributePrizesCore: tournament not found', tournamentId);
    return { skipped: true, reason: 'not_found' };
  }

  const tourData = tourSnap.data();

  // ── حماية من التوزيع المزدوج (transaction) ──
  // نستخدم transaction لضمان atomicity
  const alreadyDone = await db.runTransaction(async (tx) => {
    const snap = await tx.get(tourRef);
    if (snap.data()?.prizes_distributed) return true;
    // علامة مسبقة لمنع أي race condition
    tx.update(tourRef, { prizes_distributing: true });
    return false;
  });

  if (alreadyDone) {
    functions.logger.info('distributePrizesCore: already distributed', tournamentId);
    return { skipped: true, reason: 'already_distributed' };
  }

  // ── جلب أعلى 20 لاعب ──
  const scoresSnap = await db
    .collection('tournaments').doc(tournamentId)
    .collection('scores')
    .orderBy('score', 'desc')
    .limit(20)
    .get();

  if (scoresSnap.empty) {
    await tourRef.update({
      status:              'finished',
      prizes_distributed:  true,
      prizes_distributing: false,
      finishedAt:          admin.firestore.FieldValue.serverTimestamp(),
    });
    functions.logger.info('distributePrizesCore: no players', tournamentId);
    return { skipped: false, playersRewarded: 0 };
  }

  const batch   = db.batch();
  const winners = [];

  scoresSnap.docs.forEach((d, i) => {
    const rank   = i + 1;
    const prize  = TOURNAMENT_PRIZES.find(p => p.rank === rank);
    const tokens = prize?.tokens ?? 0;
    const userId = d.id;
    const data   = d.data();

    if (tokens > 0) {
      // إنشاء مستند reward لكل لاعب فائز
      const rewardRef = db
        .collection('users').doc(userId)
        .collection('rewards').doc();

      batch.set(rewardRef, {
        type:         'tournament_prize',
        tournamentId,
        weekNumber:   tourData.weekNumber ?? 0,
        rank,
        tokens,
        createdAt:    admin.firestore.FieldValue.serverTimestamp(),
        claimed:      false,
        playerName:   data.name ?? '',
        playerScore:  data.score ?? 0,
      });
    }

    if (rank <= 3) {
      winners.push({
        rank,
        userId,
        name:  data.name  ?? '',
        score: data.score ?? 0,
      });
    }
  });

  // ── حفظ الفائزين في pastWinners ──
  const pastRef = db.collection('pastWinners').doc(tournamentId);
  batch.set(pastRef, {
    tournamentId,
    weekNumber: tourData.weekNumber ?? 0,
    startsAt:   tourData.startsAt,
    endsAt:     tourData.endsAt,
    winners,
    totalPlayers: scoresSnap.size,
    createdAt:  admin.firestore.FieldValue.serverTimestamp(),
  });

  // ── تحديث حالة البطولة ──
  batch.update(tourRef, {
    status:              'finished',
    prizes_distributed:  true,
    prizes_distributing: false,
    finishedAt:          admin.firestore.FieldValue.serverTimestamp(),
  });

  await batch.commit();

  functions.logger.info(
    'distributePrizesCore: ✅ done',
    tournamentId,
    `— ${scoresSnap.size} players rewarded`
  );

  return { skipped: false, playersRewarded: scoresSnap.size, winners };
}

// ══════════════════════════════════════════════════════════════
//  1. autoDistributePrizes — Scheduled كل ساعة
//     يفحص كل البطولات المنتهية التي لم تُوزَّع جوائزها بعد
// ══════════════════════════════════════════════════════════════
exports.autoDistributePrizes = functions
  .region('us-central1')
  .pubsub
  .schedule('every 60 minutes')
  .timeZone('Asia/Riyadh')
  .onRun(async (context) => {
    functions.logger.info('autoDistributePrizes: checking...');

    const now = Date.now();

    // ── جلب البطولات المنتهية (endsAt < now) التي لم تُوزَّع ──
    const snap = await db.collection('tournaments')
      .where('prizes_distributed', '==', false)
      .where('status', 'in', ['active', 'scoring_closed', 'finished'])
      .get();

    if (snap.empty) {
      functions.logger.info('autoDistributePrizes: nothing to process');
      return null;
    }

    let processed = 0;

    for (const d of snap.docs) {
      const data   = d.data();
      const endsAt = data.endsAt?.toMillis ? data.endsAt.toMillis() : (data.endsAt ?? 0);

      if (now < endsAt) {
        // البطولة لم تنته بعد — تخطَّ
        continue;
      }

      functions.logger.info('autoDistributePrizes: processing', d.id);

      try {
        const result = await distributePrizesCore(d.id);
        if (!result.skipped) processed++;
        functions.logger.info('autoDistributePrizes: result for', d.id, result);
      } catch (e) {
        functions.logger.error('autoDistributePrizes: error for', d.id, e);
      }
    }

    functions.logger.info(`autoDistributePrizes: done — processed ${processed} tournaments`);
    return null;
  });

// ══════════════════════════════════════════════════════════════
//  2. closeScoringWindow — Scheduled كل 30 دقيقة
//     يُغلق نافذة الحساب تلقائياً عند scoringEndsAt
// ══════════════════════════════════════════════════════════════
exports.closeScoringWindow = functions
  .region('us-central1')
  .pubsub
  .schedule('every 30 minutes')
  .timeZone('Asia/Riyadh')
  .onRun(async (context) => {
    const now = Date.now();

    const snap = await db.collection('tournaments')
      .where('status', '==', 'active')
      .get();

    if (snap.empty) return null;

    const batch = db.batch();
    let count = 0;

    snap.docs.forEach(d => {
      const data         = d.data();
      const scoringEndsAt = data.scoringEndsAt?.toMillis
        ? data.scoringEndsAt.toMillis()
        : (data.scoringEndsAt ?? 0);

      if (now >= scoringEndsAt) {
        batch.update(d.ref, { status: 'scoring_closed' });
        count++;
        functions.logger.info('closeScoringWindow: closing scoring for', d.id);
      }
    });

    if (count > 0) await batch.commit();
    functions.logger.info(`closeScoringWindow: closed ${count} tournaments`);
    return null;
  });

// ══════════════════════════════════════════════════════════════
//  3. onTournamentStatusChange — Firestore Trigger
//     يُشغَّل لحظة تغيير status في أي وثيقة tournament
//     ضمان مزدوج: إذا غيّر أي client أو function الـ status
//     لـ 'finished' → يُوزَّع الجوائز فوراً
// ══════════════════════════════════════════════════════════════
exports.onTournamentStatusChange = functions
  .region('us-central1')
  .firestore
  .document('tournaments/{tournamentId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after  = change.after.data();
    const { tournamentId } = context.params;

    // اشتغل فقط عند التغيير إلى 'finished'
    if (before.status === after.status) return null;
    if (after.status !== 'finished')    return null;
    if (after.prizes_distributed)       return null; // تُوزَّع بالفعل

    functions.logger.info('onTournamentStatusChange: status → finished for', tournamentId);

    try {
      const result = await distributePrizesCore(tournamentId);
      functions.logger.info('onTournamentStatusChange: result', result);
    } catch (e) {
      functions.logger.error('onTournamentStatusChange: error', e);
    }

    return null;
  });

// ══════════════════════════════════════════════════════════════
//  4. autoCreateNextTournament — كل أربعاء الساعة 23:50 (توقيت الرياض)
//     ينشئ بطولة تبدأ الخميس 00:00 وتنتهي الاثنين 23:59
//     الجدول الثابت:
//       🟢 خميس  00:00 → تبدأ البطولة
//       🔒 اثنين 12:00 → يُغلق الحساب (scoringEndsAt)
//       🔴 اثنين 23:59 → تنتهي البطولة + توزيع الجوائز
//       ⏳ ثلاثاء + أربعاء → راحة وانتظار (يومان)
//  يمكن تعطيله وإنشاء البطولات يدوياً من AdminScreen
// ══════════════════════════════════════════════════════════════
exports.autoCreateNextTournament = functions
  .region('us-central1')
  .pubsub
  .schedule('50 23 * * 3') // كل أربعاء 23:50 توقيت الرياض
  .timeZone('Asia/Riyadh')
  .onRun(async (context) => {
    functions.logger.info('autoCreateNextTournament: checking...');

    // هل يوجد بطولة active أو upcoming؟
    const activeSnap = await db.collection('tournaments')
      .where('status', 'in', ['active', 'scoring_closed', 'upcoming'])
      .limit(1)
      .get();

    if (!activeSnap.empty) {
      functions.logger.info('autoCreateNextTournament: tournament already exists, skipping');
      return null;
    }

    // احسب رقم البطولة التالي
    const allSnap = await db.collection('tournaments')
      .orderBy('weekNumber', 'desc')
      .limit(1)
      .get();

    const lastWeek   = allSnap.empty ? 0 : (allSnap.docs[0].data().weekNumber ?? 0);
    const weekNumber = lastWeek + 1;

    // ── حساب الخميس القادم 00:00 بتوقيت الرياض (UTC+3) ──
    // نحن الآن أربعاء 23:50 الرياض = أربعاء 20:50 UTC
    // الخميس 00:00 الرياض = أربعاء 21:00 UTC (بعد 10 دقائق تقريباً)
    const now          = new Date();
    const riyadhOffset = 3 * 60 * 60 * 1000; // UTC+3

    // أوجد الخميس القادم 00:00 بتوقيت الرياض
    const nowRiyadh    = new Date(now.getTime() + riyadhOffset);
    const dayOfWeek    = nowRiyadh.getUTCDay(); // 0=أحد, 3=أربعاء, 4=خميس
    const daysToThurs  = (4 - dayOfWeek + 7) % 7 || 7; // أيام حتى الخميس القادم

    const thursdayRiyadh = new Date(nowRiyadh);
    thursdayRiyadh.setUTCDate(nowRiyadh.getUTCDate() + daysToThurs);
    thursdayRiyadh.setUTCHours(0, 0, 0, 0); // 00:00 الرياض = الخميس منتصف الليل

    const startMs      = thursdayRiyadh.getTime() - riyadhOffset; // تحويل لـ UTC
    const endMs        = startMs + TOURNAMENT_DURATION_MS;        // + 5 أيام = الاثنين 23:59
    const scoringEndMs = endMs - SCORING_CLOSE_BEFORE_END_MS;     // الاثنين 12:00

    await db.collection('tournaments').add({
      weekNumber,
      startsAt:           admin.firestore.Timestamp.fromMillis(startMs),
      endsAt:             admin.firestore.Timestamp.fromMillis(endMs),
      scoringEndsAt:      admin.firestore.Timestamp.fromMillis(scoringEndMs),
      status:             'upcoming',
      prizes_distributed: false,
      createdAt:          admin.firestore.FieldValue.serverTimestamp(),
      createdBy:          'auto_function',
    });

    functions.logger.info(
      `autoCreateNextTournament: ✅ created week ${weekNumber}`,
      `starts: ${new Date(startMs).toISOString()} (Thursday 00:00 Riyadh)`,
      `ends:   ${new Date(endMs).toISOString()} (Monday 23:59 Riyadh)`
    );

    return null;
  });

// ══════════════════════════════════════════════════════════════
//  5. activateUpcomingTournaments — Scheduled كل ساعة
//     يُفعّل البطولات الـ upcoming عند حلول startsAt
// ══════════════════════════════════════════════════════════════
exports.activateUpcomingTournaments = functions
  .region('us-central1')
  .pubsub
  .schedule('every 60 minutes')
  .timeZone('Asia/Riyadh')
  .onRun(async (context) => {
    const now = Date.now();

    const snap = await db.collection('tournaments')
      .where('status', '==', 'upcoming')
      .get();

    if (snap.empty) return null;

    const batch = db.batch();
    let count = 0;

    snap.docs.forEach(d => {
      const data     = d.data();
      const startsAt = data.startsAt?.toMillis
        ? data.startsAt.toMillis()
        : (data.startsAt ?? 0);

      if (now >= startsAt) {
        batch.update(d.ref, { status: 'active' });
        count++;
        functions.logger.info('activateUpcomingTournaments: activating', d.id);
      }
    });

    if (count > 0) await batch.commit();
    functions.logger.info(`activateUpcomingTournaments: activated ${count} tournaments`);
    return null;
  });
