/**
 * useCachedCategories.js
 * ════════════════════════════════════════════════════════════
 * Cache ذكي لـ metadata الفئات (id, name, emoji, isSpecial, imageUrl)
 *
 * السلوك:
 *  1. أول فتح للتطبيق:
 *     → يُظهر cached من AsyncStorage فوراً (0ms perceived load)
 *     → يشترك بـ onSnapshot في الخلفية
 *     → إذا تغيّرت بيانات Firestore يُحدِّث الـ state والـ cache
 *
 *  2. الزيارات التالية:
 *     → الفئات تظهر فوراً بدون spinner أو انتظار
 *     → Firestore يُحدِّث في الخلفية صامتاً
 *
 *  3. Offline:
 *     → الفئات تظهر من الـ cache
 *     → onSnapshot يستخدم Firestore offline cache (built-in)
 *
 * صور الغلاف (imageUrl):
 *  → expo-image يتولى disk+memory caching تلقائياً
 *  → بعد أول تحميل الصورة تبقى على الجهاز
 *
 * الاستخدام في App.js:
 *  const { categories, loading } = useCachedCategories();
 */

import { useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from './firebaseConfig';

const CACHE_KEY        = 'arena_categories_cache_v2';
const CACHE_TS_KEY     = 'arena_categories_cache_ts';
const STALE_MS         = 24 * 60 * 60 * 1000; // 24 ساعة

// الحقول التي نحفظها فقط — بدون أسئلة
const METADATA_FIELDS = ['id', 'name', 'emoji', 'isSpecial', 'imageUrl', 'categoryId', 'lang'];

function pickMetadata(cat) {
  const out = {};
  for (const k of METADATA_FIELDS) {
    if (cat[k] !== undefined) out[k] = cat[k];
  }
  return out;
}

// مقارنة سريعة: هل تغيّرت الفئات؟
function hasChanged(cached, fresh) {
  if (!cached || cached.length !== fresh.length) return true;
  const cachedMap = Object.fromEntries(cached.map(c => [c.id, c]));
  for (const f of fresh) {
    const c = cachedMap[f.id];
    if (!c) return true;
    for (const k of METADATA_FIELDS) {
      if (c[k] !== f[k]) return true;
    }
  }
  return false;
}

export function useCachedCategories() {
  const [categories, setCategories] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const cachedRef = useRef(null); // نسخة الـ cache الحالية في memory

  useEffect(() => {
    let unsubFirestore = null;
    let active = true;

    async function init() {
      // ── الخطوة 1: اعرض الـ cache المحفوظ فوراً ──
      try {
        const raw = await AsyncStorage.getItem(CACHE_KEY);
        if (raw && active) {
          const cached = JSON.parse(raw);
          if (Array.isArray(cached) && cached.length > 0) {
            cachedRef.current = cached;
            setCategories(cached);
            setLoading(false);
          }
        }
      } catch (_) {}

      // ── الخطوة 2: اشترك بـ Firestore في الخلفية ──
      unsubFirestore = onSnapshot(
        collection(db, 'categories'),
        { includeMetadataChanges: false },
        (snapshot) => {
          if (!active) return;

          const fresh = snapshot.docs.map(d => ({
            id: d.id,
            ...pickMetadata({ id: d.id, ...d.data() }),
          }));

          // فقط إذا تغيّر شيء فعلاً
          if (hasChanged(cachedRef.current, fresh)) {
            cachedRef.current = fresh;
            setCategories(fresh);

            // حفظ في AsyncStorage (async — لا ننتظر)
            AsyncStorage.setItem(CACHE_KEY, JSON.stringify(fresh)).catch(() => {});
            AsyncStorage.setItem(CACHE_TS_KEY, String(Date.now())).catch(() => {});
          }

          setLoading(false);
        },
        (error) => {
          // Firestore فشل (offline) — الـ cache موجود من الخطوة 1
          if (__DEV__) console.warn('[useCachedCategories] snapshot error:', error?.message);
          setLoading(false);
        }
      );
    }

    init();

    return () => {
      active = false;
      unsubFirestore?.();
    };
  }, []);

  return { categories, loading };
}

/**
 * مسح الـ cache يدوياً (عند logout أو تحديث قسري)
 */
export async function clearCategoriesCache() {
  await AsyncStorage.multiRemove([CACHE_KEY, CACHE_TS_KEY]);
}
