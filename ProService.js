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

  // بحث مباشر بـ #guest uid
  if (lower.startsWith('#guest')) {
    const num  = lower.slice(6);
    const name = `ضيف${num}`;
    return { uid: lower, name, username: lower, email: '', isGuest: true };
  }

  // بحث بـ email أو username في Firestore
  try {
    const snap  = await getDocs(collection(db, 'users'));
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
    const isGuest = uid.startsWith('#guest');
    let userData  = { email: '', username: uid, name: isGuest ? `ضيف${uid.slice(6)}` : '' };

    // للمستخدمين المسجلين — جلب بياناتهم من Firestore
    if (!isGuest) {
      const userSnap = await getDoc(doc(db, 'users', uid));
      if (!userSnap.exists()) return { success: false, error: 'المستخدم غير موجود' };
      userData = userSnap.data();
    }

    const data = {
      uid,
      email:     userData.email    || '',
      username:  userData.username || uid,
      name:      userData.name     || uid,
      isGuest:   isGuest,
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
//  Theme Purchases — شراء الثيمات بالتوكن (Offline-First)
// ────────────────────────────────────────────────────────────
//  المبدأ: AsyncStorage هو "مصدر الحقيقة" للملكية.
//   • الشراء يُحفظ محلياً فوراً → دائمي، يعمل أونلاين وأوفلاين.
//   • الضيوف (#guest…): محلي فقط — لا نلمس Firestore إطلاقاً
//     (request.auth == null لهم، فالقاعدة ترفضهم بحق).
//   • المسجّلون: نرفع لـ Firestore عند توفّر الإنترنت؛ إن فشل
//     الرفع (offline) يُسجَّل المعرّف في قائمة "معلّقة" تُرفع لاحقاً.
//   • usePurchasedThemes يدمج (المحلي ∪ السحابي) — المحلي يظهر فوراً.
// ════════════════════════════════════════════════════════════

const PURCHASED_CACHE_KEY = 'arena_purchased_themes_v1'; // + '_' + uid
const PENDING_SYNC_KEY    = 'arena_themes_pending_sync';  // + '_' + uid

const isGuestUid = (uid) => typeof uid === 'string' && uid.startsWith('#guest');

// ── أدوات تخزين محلي ──────────────────────────────────────────
async function readLocalThemes(uid) {
  try {
    const raw = await AsyncStorage.getItem(PURCHASED_CACHE_KEY + '_' + uid);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

async function writeLocalThemes(uid, ids) {
  try {
    const unique = Array.from(new Set(ids));
    await AsyncStorage.setItem(PURCHASED_CACHE_KEY + '_' + uid, JSON.stringify(unique));
    return unique;
  } catch { return ids; }
}

async function readPendingThemes(uid) {
  try {
    const raw = await AsyncStorage.getItem(PENDING_SYNC_KEY + '_' + uid);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

async function writePendingThemes(uid, ids) {
  try {
    const unique = Array.from(new Set(ids));
    await AsyncStorage.setItem(PENDING_SYNC_KEY + '_' + uid, JSON.stringify(unique));
  } catch { /* تجاهل */ }
}

/**
 * hook — يجلب Set من IDs الثيمات المشتراة للمستخدم.
 * يقرأ المحلي فوراً (يعمل أوفلاين)، ثم يدمج مع Firestore للمسجّلين.
 */
export function usePurchasedThemes(user) {
  const [purchased, setPurchased] = useState(new Set());
  const [loaded, setLoaded] = useState(false);
  const uid = user?.uid || user?.guestId;

  useEffect(() => {
    if (!uid) { setPurchased(new Set()); setLoaded(true); return; }

    let mounted = true;
    setLoaded(false);

    // 1. اقرأ المحلي فوراً — يعمل دائماً (أونلاين/أوفلاين، ضيف/مسجّل)
    readLocalThemes(uid).then(ids => {
      if (!mounted) return;
      if (ids.length) setPurchased(new Set(ids));
      setLoaded(true); // المحلي جاهز — كافٍ للملكية الأوفلاين
    });

    // 2. الضيوف: لا اشتراك Firestore — محلي فقط
    if (isGuestUid(uid)) {
      return () => { mounted = false; };
    }

    // 3. المسجّلون: اشترك بـ Firestore وادمج (لا تستبدل) مع المحلي
    const ref = doc(db, 'userThemes', uid);
    const unsub = onSnapshot(
      ref,
      async (snap) => {
        if (!mounted) return;
        const cloudIds = snap.exists() ? (snap.data().purchased || []) : [];
        const localIds = await readLocalThemes(uid);
        const mergedIds = Array.from(new Set([...localIds, ...cloudIds]));
        await writeLocalThemes(uid, mergedIds);
        if (mounted) { setPurchased(new Set(mergedIds)); setLoaded(true); }
      },
      () => { /* offline — نبقى على المحلي */ }
    );

    return () => { mounted = false; unsub(); };
  }, [uid]);

  return { purchased, loaded };
}

/**
 * يتحقق إذا الثيم متاح للمستخدم
 * @param {{ id: string, price: number }} themeItem
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
 * شراء ثيم بالتوكن — Offline-First، لا يفشل بسبب الشبكة.
 *
 * @param {string} uid          - uid المسجّل أو guestId (#guest…)
 * @param {string} themeId
 * @param {number} price        - سعر الثيم بالتوكن
 * @param {number} currentTokens
 * @returns {Promise<{ success, newTokens?, pendingSync?, error? }>}
 */
export async function purchaseTheme(uid, themeId, price, currentTokens) {
  if (!uid || !themeId) {
    return { success: false, error: 'بيانات ناقصة' };
  }
  if (currentTokens < price) {
    return { success: false, error: 'رصيد التوكن غير كافٍ' };
  }

  // ── 1) تحقق محلي: مشتراة مسبقاً؟ ──
  const localIds = await readLocalThemes(uid);
  if (localIds.includes(themeId)) {
    return { success: true, newTokens: currentTokens }; // بلا خصم مكرر
  }

  const newTokens = currentTokens - price;

  // ── 2) احفظ الملكية محلياً فوراً (دائمي، لا يفشل) ──
  const mergedLocal = await writeLocalThemes(uid, [...localIds, themeId]);

  // ── 3) الضيوف: انتهينا — محلي فقط، نجاح مؤكَّد ──
  if (isGuestUid(uid)) {
    return { success: true, newTokens, pendingSync: false };
  }

  // ── 4) المسجّلون: حاول الرفع لـ Firestore بدون أن نمنع النجاح ──
  try {
    const ref      = doc(db, 'userThemes', uid);
    const snap     = await getDoc(ref);
    const cloudIds = snap.exists() ? (snap.data().purchased || []) : [];
    const cloudMerged = Array.from(new Set([...cloudIds, ...mergedLocal]));

    await setDoc(ref, { purchased: cloudMerged }, { merge: true });
    await setDoc(doc(db, 'users', uid), { tokens: newTokens }, { merge: true });

    return { success: true, newTokens, pendingSync: false };
  } catch (e) {
    // offline أو رفض مؤقت — نُسجّل للمزامنة لاحقاً ونعتبر الشراء ناجحاً محلياً
    const pending = await readPendingThemes(uid);
    await writePendingThemes(uid, [...pending, themeId]);
    return { success: true, newTokens, pendingSync: true };
  }
}

/**
 * مزامنة المشتريات المعلّقة للمستخدمين المسجّلين عند عودة الإنترنت.
 * تُستدعى من App.js عند رصد اتصال (أو عند تسجيل الدخول).
 *
 * @param {object} user - كائن المستخدم ({ uid, isGuest, tokens? })
 * @returns {Promise<{ synced: number }>}
 */
export async function syncPendingThemes(user) {
  const uid = user?.uid;
  if (!uid || isGuestUid(uid) || user?.isGuest) return { synced: 0 };

  const pending = await readPendingThemes(uid);
  if (!pending.length) return { synced: 0 };

  try {
    const ref      = doc(db, 'userThemes', uid);
    const snap     = await getDoc(ref);
    const cloudIds = snap.exists() ? (snap.data().purchased || []) : [];
    const localIds = await readLocalThemes(uid);

    const merged = Array.from(new Set([...cloudIds, ...localIds, ...pending]));
    await setDoc(ref, { purchased: merged }, { merge: true });

    // التوكن: ارفع الرصيد المحلي الحالي إن توفّر (مصدره useTokenSync المحلي)
    if (typeof user?.tokens === 'number') {
      await setDoc(doc(db, 'users', uid), { tokens: user.tokens }, { merge: true });
    }

    await writePendingThemes(uid, []); // أُفرغت القائمة
    await writeLocalThemes(uid, merged);
    return { synced: pending.length };
  } catch {
    // ما زلنا offline — نُبقي القائمة كما هي للمحاولة لاحقاً
    return { synced: 0 };
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
