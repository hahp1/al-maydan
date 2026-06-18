/**
 * GuestMergeService.js
 * ═══════════════════════════════════════════════════════════════
 * نقل تقدّم الضيف إلى حساب جوجل/آبل *جديد* (لم يُسجّل من قبل).
 *
 *  يُستدعى من resolveAccountLogin في LoginScreen، وفقط عندما يكون
 *  الحساب جديداً (الحساب المسجّل سابقاً لا يُدمج — قرار تصميمي).
 *
 *  يَنقل (offline-first — المصدر المحلي أولاً):
 *   • التوكنز   : arena_tokens_local_{uid}  (+ Firestore users/{uid}.tokens)
 *   • الثيمات   : arena_purchased_themes_v1_{uid} (+ userThemes/{uid})
 *   • XP/Level/highScore : من Firestore الضيف إن وُجدت
 *   • Pro       : proUsers/{uid} إن كان الضيف Pro
 *   • القلوب    : مفاتيحها عامة على الجهاز (arena_hearts…) فلا تحتاج
 *                 نقلاً — تبقى كما هي لنفس الجهاز.
 *
 *  يُرجع: { merged, userData } — userData بعد دمج التقدّم، جاهزة للجلسة.
 * ═══════════════════════════════════════════════════════════════
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from './firebaseConfig';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const GUEST_KEY            = 'arena_guest_profile';
const TOKENS_LOCAL_KEY     = 'arena_tokens_local';           // + '_' + uid
const PURCHASED_CACHE_KEY  = 'arena_purchased_themes_v1';    // + '_' + uid

// ── أدوات قراءة محلية آمنة ────────────────────────────────────
async function readLocalInt(key) {
  try {
    const raw = await AsyncStorage.getItem(key);
    const n = raw != null ? parseInt(raw, 10) : NaN;
    return Number.isFinite(n) ? n : null;
  } catch { return null; }
}

async function readLocalArray(key) {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

/**
 * mergeGuestToAccount
 * @param {string} newUid   — uid الحساب الجديد
 * @param {object} newUser  — userData القادمة من saveUserToFirestore
 * @returns {Promise<{ merged: boolean, userData?: object, reason?: string }>}
 */
export async function mergeGuestToAccount(newUid, newUser = {}) {
  try {
    // 1) هل يوجد ضيف على الجهاز؟
    const raw = await AsyncStorage.getItem(GUEST_KEY);
    if (!raw) return { merged: false, reason: 'no_guest' };

    const guest = JSON.parse(raw);
    const guestUid = guest.uid || guest.guestId;
    // ضيف صالح: إما isGuest flag (الضيف الجديد بـ Firebase uid) أو #guest (القديم)
    const isGuestProfile = guest.isGuest === true || guestUid?.startsWith('#guest');
    if (!guestUid || !isGuestProfile) return { merged: false, reason: 'not_guest' };
    // لا تدمج الحساب مع نفسه (الضيف الجديد قد يشارك نفس الـ Firebase uid بعد الترقية)
    if (guestUid === newUid) return { merged: false, reason: 'same_uid' };

    // 2) بيانات الضيف: المحلي هو المصدر، مع تكميل من Firestore إن توفّر
    const guestLocalTokens = await readLocalInt(`${TOKENS_LOCAL_KEY}_${guestUid}`);
    const guestThemesLocal = await readLocalArray(`${PURCHASED_CACHE_KEY}_${guestUid}`);

    let guestCloud = {};
    try {
      const gSnap = await getDoc(doc(db, 'users', guestUid));
      if (gSnap.exists()) guestCloud = gSnap.data();
    } catch (_) { /* offline — نكتفي بالمحلي */ }

    let guestThemesCloud = [];
    try {
      const gtSnap = await getDoc(doc(db, 'userThemes', guestUid));
      if (gtSnap.exists()) guestThemesCloud = gtSnap.data().purchased || [];
    } catch (_) {}

    // 3) القيم الحالية للحساب الجديد (newUser من saveUserToFirestore)
    const newTokens    = typeof newUser.tokens === 'number' ? newUser.tokens : 0;
    const newHighScore = newUser.highScore || 0;
    const newXp        = newUser.xp || 0;
    const newLevel     = newUser.level || 1;

    // رصيد الضيف الفعلي: الأعلى بين المحلي والسحابي
    const guestTokens = Math.max(
      guestLocalTokens != null ? guestLocalTokens : 0,
      guestCloud.tokens || 0,
    );

    // 4) الدمج
    //    التوكنز: جمع رصيد الضيف + الترحيبي للحساب الجديد
    const mergedTokens    = guestTokens + newTokens;
    const mergedHighScore = Math.max(guestCloud.highScore || 0, newHighScore);
    const mergedXp        = Math.max(guestCloud.xp || 0, newXp);
    const mergedLevel     = Math.max(guestCloud.level || 1, newLevel);
    const mergedThemes    = Array.from(new Set([
      ...guestThemesLocal, ...guestThemesCloud,
      ...(Array.isArray(newUser.purchasedThemes) ? newUser.purchasedThemes : []),
    ]));

    // 5) اكتب التقدّم على الحساب الجديد — محلياً (دائم) ثم سحابياً
    await AsyncStorage.setItem(`${TOKENS_LOCAL_KEY}_${newUid}`, String(mergedTokens)).catch(() => {});
    if (mergedThemes.length) {
      await AsyncStorage.setItem(`${PURCHASED_CACHE_KEY}_${newUid}`, JSON.stringify(mergedThemes)).catch(() => {});
    }

    const userUpdates = {
      tokens:    mergedTokens,
      highScore: mergedHighScore,
      xp:        mergedXp,
      level:     mergedLevel,
    };
    try {
      await setDoc(doc(db, 'users', newUid), userUpdates, { merge: true });
      if (mergedThemes.length) {
        await setDoc(doc(db, 'userThemes', newUid), { purchased: mergedThemes }, { merge: true });
      }
    } catch (_) { /* offline — المحلي محفوظ، والمزامنة تتم لاحقاً */ }

    // 6) نقل Pro إن كان الضيف Pro والحساب الجديد ليس Pro
    try {
      const guestProSnap = await getDoc(doc(db, 'proUsers', guestUid));
      if (guestProSnap.exists()) {
        const newProSnap = await getDoc(doc(db, 'proUsers', newUid));
        if (!newProSnap.exists()) {
          await setDoc(doc(db, 'proUsers', newUid), {
            ...guestProSnap.data(),
            uid:        newUid,
            mergedFrom: guestUid,
            mergedAt:   Date.now(),
          });
        }
      }
    } catch (_) {}

    // 7) علّم مستند الضيف أنه دُمج (لا يكسر شيئاً إن فشل)
    try {
      await updateDoc(doc(db, 'users', guestUid), {
        mergedTo: newUid, mergedAt: Date.now(),
      });
    } catch (_) {}

    // 8) احذف ملف الضيف من الجهاز (تقدّمه انتقل بالكامل)
    await AsyncStorage.removeItem(GUEST_KEY).catch(() => {});

    // 9) أرجِع userData النهائية للجلسة
    const userData = {
      ...newUser,
      tokens:    mergedTokens,
      highScore: mergedHighScore,
      xp:        mergedXp,
      level:     mergedLevel,
    };
    return { merged: true, userData };

  } catch (e) {
    console.error('[GuestMerge] error:', e);
    return { merged: false, reason: e?.message };
  }
}
