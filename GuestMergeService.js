/**
 * GuestMergeService.js
 * ═══════════════════════════════════════════════════════
 * عند تسجيل دخول Google/Apple بعد استخدام حساب ضيف:
 * ينقل التقدم (tokens, pro, scores) إلى الحساب الجديد
 * ═══════════════════════════════════════════════════════
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from './firebaseConfig';
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

const GUEST_KEY = 'arena_guest_profile';

/**
 * mergeGuestToAccount
 * يُستدعى بعد نجاح تسجيل الدخول بـ Google/Apple
 * @param {string} newUid   — uid الحساب الجديد
 * @param {object} newUser  — بيانات المستخدم الجديد
 */
export async function mergeGuestToAccount(newUid, newUser) {
  try {
    // 1. هل يوجد حساب ضيف محفوظ على الجهاز؟
    const raw = await AsyncStorage.getItem(GUEST_KEY);
    if (!raw) return { merged: false, reason: 'no_guest' };

    const guest = JSON.parse(raw);
    const guestUid = guest.uid || guest.guestId;
    if (!guestUid?.startsWith('#guest')) return { merged: false, reason: 'not_guest' };

    // 2. جلب بيانات الضيف من Firestore
    const guestSnap = await getDoc(doc(db, 'users', guestUid));
    if (!guestSnap.exists()) return { merged: false, reason: 'guest_not_found' };
    const guestData = guestSnap.data();

    // 3. جلب بيانات الحساب الجديد
    const newSnap = await getDoc(doc(db, 'users', newUid));
    const newData = newSnap.exists() ? newSnap.data() : {};

    // 4. دمج التقدم — نأخذ الأعلى في كل حقل
    const mergedTokens = Math.max(guestData.tokens || 0, newData.tokens || 0) +
                         Math.min(guestData.tokens || 0, newData.tokens || 0); // نجمع التوكنز

    const mergedHighScore = Math.max(
      guestData.highScore || 0,
      newData.highScore   || 0,
    );

    const updates = {
      tokens:    mergedTokens,
      highScore: mergedHighScore,
      // أي حقول إضافية
      ...(guestData.xp      && { xp:      Math.max(guestData.xp || 0, newData.xp || 0) }),
      ...(guestData.level   && { level:   Math.max(guestData.level || 1, newData.level || 1) }),
    };

    await updateDoc(doc(db, 'users', newUid), updates);

    // 5. نقل Pro إذا كان الضيف Pro
    const guestProSnap = await getDoc(doc(db, 'proUsers', guestUid));
    if (guestProSnap.exists()) {
      const guestPro = guestProSnap.data();
      const newProSnap = await getDoc(doc(db, 'proUsers', newUid));
      // انقل فقط إذا الحساب الجديد ليس Pro
      if (!newProSnap.exists()) {
        await setDoc(doc(db, 'proUsers', newUid), {
          ...guestPro,
          uid:      newUid,
          mergedFrom: guestUid,
          mergedAt:   Date.now(),
        });
      }
    }

    // 6. ضع علامة على الضيف أنه تم الدمج
    await updateDoc(doc(db, 'users', guestUid), {
      mergedTo: newUid,
      mergedAt: Date.now(),
    }).catch(() => {});

    // 7. احذف بيانات الضيف من الجهاز
    await AsyncStorage.removeItem(GUEST_KEY);

    console.log(`[GuestMerge] ${guestUid} → ${newUid} ✅`);
    return { merged: true, mergedTokens, mergedHighScore };

  } catch (e) {
    console.error('[GuestMerge] error:', e);
    return { merged: false, reason: e?.message };
  }
}
