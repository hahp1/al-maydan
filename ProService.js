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
import { db } from './FirebaseConfig';

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

// ════════════════════════════════════════════════════════════
//  Theme Purchases — شراء الثيمات بالتوكن
// ════════════════════════════════════════════════════════════

const PURCHASED_CACHE_KEY = 'arena_purchased_themes_v1';

/**
 * hook — يجلب Set من IDs الثيمات المشتراة للمستخدم
 * يقرأ من AsyncStorage أولاً ثم يتحقق من Firestore
 */
export function usePurchasedThemes(user) {
  const [purchased, setPurchased] = useState(new Set());
  const uid = user?.uid;

  useEffect(() => {
    if (!uid) { setPurchased(new Set()); return; }

    // 1. اقرأ الـ cache فوراً
    AsyncStorage.getItem(PURCHASED_CACHE_KEY + '_' + uid).then(cached => {
      if (cached) {
        try { setPurchased(new Set(JSON.parse(cached))); } catch (_) {}
      }
    });

    // 2. اشترك بـ Firestore
    const ref = doc(db, 'userThemes', uid);
    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) { setPurchased(new Set()); return; }
      const ids = snap.data().purchased || [];
      setPurchased(new Set(ids));
      AsyncStorage.setItem(PURCHASED_CACHE_KEY + '_' + uid, JSON.stringify(ids));
    }, () => {});

    return () => unsub();
  }, [uid]);

  return { purchased };
}

/**
 * يتحقق إذا الثيم متاح للمستخدم
 * @param {{ price: number }} themeItem - عنصر الثيم من ALL_THEMES
 * @param {boolean} isPro
 * @param {Set<string>} purchased
 */
export function isThemeUnlocked(themeItem, isPro, purchased) {
  if (!themeItem) return false;
  if (themeItem.price === 0) return true;   // مجاني دائماً
  if (isPro) return true;                    // Pro يفتح كل شيء
  return purchased instanceof Set
    ? purchased.has(themeItem.id)
    : false;
}

/**
 * شراء ثيم بالتوكن
 * @param {string} uid
 * @param {string} themeId
 * @param {number} price       - سعر الثيم بالتوكن
 * @param {number} currentTokens
 * @returns {Promise<{ success, newTokens?, error? }>}
 */
export async function purchaseTheme(uid, themeId, price, currentTokens) {
  if (!uid || !themeId) return { success: false, error: 'بيانات ناقصة' };
  if (currentTokens < price) {
    return { success: false, error: 'رصيد التوكن غير كافٍ' };
  }
  try {
    const ref     = doc(db, 'userThemes', uid);
    const snap    = await getDoc(ref);
    const existing = snap.exists() ? (snap.data().purchased || []) : [];

    if (existing.includes(themeId)) {
      return { success: true, newTokens: currentTokens }; // مشتراة مسبقاً
    }

    const newList     = [...existing, themeId];
    const newTokens   = currentTokens - price;

    // احفظ الثيمات المشتراة
    await setDoc(ref, { purchased: newList }, { merge: true });

    // احفظ التوكن الجديد في Firestore
    await setDoc(doc(db, 'users', uid), { tokens: newTokens }, { merge: true });

    return { success: true, newTokens };
  } catch (e) {
    return { success: false, error: e?.message || 'حدث خطأ' };
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
