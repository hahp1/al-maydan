/**
 * ProService.js
 * ════════════════════════════════════════════════════════════
 * نظام Pro المركزي — تفعيل يدوي من الادمن
 *
 * Firestore:
 *   proUsers/{uid} = {
 *     uid, email, username,
 *     grantedAt: Timestamp,
 *     grantedBy: string,   ← UID الادمن
 *     note: string,        ← سبب التفعيل
 *     expiresAt: null | Timestamp  ← null = دائم
 *   }
 *
 * الاستخدام:
 *   const { isPro } = useProStatus(user);
 *   if (isPro) { ... }
 */

import { useEffect, useState, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  doc, getDoc, setDoc, deleteDoc,
  collection, getDocs, query, orderBy,
  serverTimestamp, onSnapshot,
} from 'firebase/firestore';
import { db } from './firebaseConfig';

const PRO_CACHE_KEY = 'arena_is_pro_v2';
const PRO_UID_KEY   = 'arena_pro_uid';

// ════════════════════════════════════════════════════════════
//  useProStatus — hook للاستخدام في App.js
//  يقرأ من cache أولاً ثم يتحقق من Firestore
// ════════════════════════════════════════════════════════════
export function useProStatus(user) {
  const [isPro, setIsPro] = useState(false);
  const uid = user?.uid;

  useEffect(() => {
    if (!uid) { setIsPro(false); return; }

    // 1. اقرأ الـ cache فوراً
    AsyncStorage.multiGet([PRO_CACHE_KEY, PRO_UID_KEY]).then(([[, cached], [, cachedUid]]) => {
      if (cached === 'true' && cachedUid === uid) setIsPro(true);
    });

    // 2. اشترك بـ Firestore للتحديث الفوري
    const ref  = doc(db, 'proUsers', uid);
    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) {
        setIsPro(false);
        AsyncStorage.multiSet([[PRO_CACHE_KEY, 'false'], [PRO_UID_KEY, uid]]);
        return;
      }
      const data = snap.data();
      // تحقق من انتهاء الصلاحية
      if (data.expiresAt) {
        const exp = data.expiresAt.toMillis ? data.expiresAt.toMillis() : data.expiresAt;
        if (Date.now() > exp) {
          setIsPro(false);
          AsyncStorage.multiSet([[PRO_CACHE_KEY, 'false'], [PRO_UID_KEY, uid]]);
          return;
        }
      }
      setIsPro(true);
      AsyncStorage.multiSet([[PRO_CACHE_KEY, 'true'], [PRO_UID_KEY, uid]]);
    }, () => {
      // Firestore فشل (offline) — نبقى على الـ cache
    });

    return () => unsub();
  }, [uid]);

  return { isPro };
}

// ════════════════════════════════════════════════════════════
//  Admin functions — تُستدعى من AdminScreen فقط
// ════════════════════════════════════════════════════════════

/**
 * البحث عن مستخدم بالـ email أو username
 * @returns {Promise<{uid, name, email, username} | null>}
 */
export async function findUserByEmailOrUsername(query_text) {
  if (!query_text?.trim()) return null;
  const lower = query_text.toLowerCase().trim();

  // بحث بـ email
  const emailQ = query(
    collection(db, 'users'),
    orderBy('email'),
  );
  // نجلب مباشرة بدل query (Firestore لا يدعم = على email بدون index)
  try {
    const snap = await getDocs(collection(db, 'users'));
    const match = snap.docs.find(d => {
      const data = d.data();
      return (
        data.email?.toLowerCase() === lower ||
        data.username?.toLowerCase() === lower
      );
    });
    if (match) return { uid: match.id, ...match.data() };
  } catch (e) {
    console.warn('[ProService] findUser:', e?.message);
  }
  return null;
}

/**
 * تفعيل Pro لمستخدم
 * @param {string} uid           - UID المستخدم
 * @param {string} adminUid      - UID الادمن
 * @param {string} note          - سبب التفعيل
 * @param {number|null} days     - عدد الأيام (null = دائم)
 */
export async function grantPro(uid, adminUid, note = '', days = null) {
  if (!uid || !adminUid) return { success: false, error: 'بيانات ناقصة' };
  try {
    // جلب بيانات المستخدم
    const userSnap = await getDoc(doc(db, 'users', uid));
    if (!userSnap.exists()) return { success: false, error: 'المستخدم غير موجود' };
    const userData = userSnap.data();

    const data = {
      uid,
      email:     userData.email    || '',
      username:  userData.username || '',
      name:      userData.name     || '',
      grantedAt: serverTimestamp(),
      grantedBy: adminUid,
      note:      note || 'تفعيل يدوي',
      expiresAt: days
        ? new Date(Date.now() + days * 24 * 60 * 60 * 1000)
        : null,
    };

    await setDoc(doc(db, 'proUsers', uid), data);
    return { success: true };
  } catch (e) {
    return { success: false, error: e?.message };
  }
}

/**
 * إلغاء Pro لمستخدم
 */
export async function revokePro(uid) {
  if (!uid) return { success: false };
  try {
    await deleteDoc(doc(db, 'proUsers', uid));
    return { success: true };
  } catch (e) {
    return { success: false, error: e?.message };
  }
}

/**
 * جلب قائمة كل المستخدمين Pro
 */
export async function getAllProUsers() {
  try {
    const snap = await getDocs(
      query(collection(db, 'proUsers'), orderBy('grantedAt', 'desc'))
    );
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    return [];
  }
}
