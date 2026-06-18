import { initializeApp } from 'firebase/app';
import { getFirestore, getDocs, collection } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
} from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyDIQ21c2LL4n-rJCKXqPNChv02QK1CIvBM",
  authDomain: "al-maydan-53953.firebaseapp.com",
  databaseURL: "https://al-maydan-53953-default-rtdb.firebaseio.com",
  projectId: "al-maydan-53953",
  storageBucket: "al-maydan-53953.firebasestorage.app",
  messagingSenderId: "961744403836",
  appId: "1:961744403836:web:81b65856b0c0c6a143f8f9"
};

const app = initializeApp(firebaseConfig);

// ── Auth مع حفظ الجلسة بين عمليات فتح التطبيق ──────────────────
// getAuth() على React Native يحفظ الجلسة في الذاكرة فقط، فتُفقد عند
// إغلاق التطبيق ويُطرد المستخدم لشاشة الدخول عند كل فتح. الحل القياسي
// هو initializeAuth مع getReactNativePersistence(AsyncStorage).
// نلفّه بـ try/catch: لو هُيّئ Auth مسبقاً أو اختلف الـ API نرجع لـ
// getAuth بدل كسر البناء.
let _auth;
try {
  _auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (e) {
  _auth = getAuth(app);
}
export const auth = _auth;

export const db      = getFirestore(app);
export const storage = getStorage(app);
export const rtdb    = getDatabase(app);

// ════════════════════════════════════════════════════════════
//  Question Cache — أسئلة الفئات (Offline-First)
// ────────────────────────────────────────────────────────────
//  بعد أول جلب ناجح لفئة، نخزّن مستنداتها كاملةً (نص + رابط imageUrl)
//  في AsyncStorage. لا نميّز السؤال النصي من المصوّر — نخزّن الكل.
//  وقت اللعب أوفلاين: نقرأ من الكاش، والصور المصوّرة تُعرض من disk
//  cache الخاص بـ expo-image إن كانت مُحمّلة سابقاً، وإلا تُتخطّى.
// ════════════════════════════════════════════════════════════

const QCACHE_PREFIX = 'arena_qcache_v1_'; // + categoryId

async function readQuestionCache(categoryId) {
  try {
    const raw = await AsyncStorage.getItem(QCACHE_PREFIX + categoryId);
    if (!raw) return null;
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : null;
  } catch { return null; }
}

async function writeQuestionCache(categoryId, questions) {
  try {
    await AsyncStorage.setItem(QCACHE_PREFIX + categoryId, JSON.stringify(questions));
  } catch { /* تجاهل — التخزين أفضل جهد */ }
}

/**
 * يجلب أسئلة فئة واحدة — Offline-First.
 *  • يحاول Firestore أولاً (المصدر الأحدث).
 *  • ينجح  → يحدّث الكاش ويرجع.
 *  • يفشل (offline) → يرجع من الكاش المحلي إن وُجد، وإلا [].
 * @param {string} categoryId
 * @returns {Promise<Array>} questions[]
 */
export async function fetchCategoryQuestions(categoryId) {
  try {
    const snap = await getDocs(collection(db, 'categories', categoryId, 'questions'));
    const questions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    // خزّن للأوفلاين (لا ننتظر)
    writeQuestionCache(categoryId, questions);
    return questions;
  } catch (e) {
    // offline أو خطأ — جرّب الكاش المحلي
    const cached = await readQuestionCache(categoryId);
    return cached || [];
  }
}

/**
 * يجلب أسئلة مجموعة فئات بالتوازي
 * @param {string[]} categoryIds
 * @returns {Promise<Object>} { [categoryId]: questions[] }
 */
export async function fetchQuestionsForCategories(categoryIds) {
  const results = await Promise.all(
    categoryIds.map(async (id) => {
      const questions = await fetchCategoryQuestions(id);
      return [id, questions];
    })
  );
  return Object.fromEntries(results);
}

/**
 * هل لهذه الفئة أسئلة مُخزّنة محلياً (متاحة أوفلاين)؟
 * @param {string} categoryId
 * @returns {Promise<boolean>}
 */
export async function isCategoryCachedOffline(categoryId) {
  const cached = await readQuestionCache(categoryId);
  return Array.isArray(cached) && cached.length > 0;
}

/**
 * يفحص مجموعة فئات دفعة واحدة: أيّها متاح أوفلاين.
 * @param {string[]} categoryIds
 * @returns {Promise<Object>} { [categoryId]: boolean }
 */
export async function getOfflineAvailability(categoryIds) {
  const entries = await Promise.all(
    categoryIds.map(async (id) => [id, await isCategoryCachedOffline(id)])
  );
  return Object.fromEntries(entries);
}
