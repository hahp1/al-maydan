/**
 * useTokenSync.js
 * ════════════════════════════════════════════════════════════
 * يُزامن رصيد tokens مع Firestore بـ debounce 2 ثانية
 * يحفظ في AsyncStorage أيضاً كـ cache محلي يمنع فقدان الرصيد
 * عند تغيير الثيم أو إعادة فتح التطبيق
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from './firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';

const DEBOUNCE_MS  = 2000;
const LOCAL_KEY    = 'arena_tokens_local'; // cache محلي

export function useTokenSync(user, initialTokens = 30) {
  const [tokens,  setTokensState] = useState(initialTokens);
  const timerRef                  = useRef(null);
  const pendingRef                = useRef(null);
  const loadedRef                 = useRef(false); // ضمان التهيئة مرة واحدة

  // ── التهيئة: من Firestore أو AsyncStorage أو initialTokens ──
  useEffect(() => {
    // إعادة تعيين loadedRef عند تغيير المستخدم لضمان إعادة التحميل
    loadedRef.current = false;

    const uid = user?.uid || user?.guestId;
    if (!uid) {
      // لا مستخدم — استخدم initialTokens
      setTokensState(initialTokens || 30);
      return;
    }

    // عند تغيير المستخدم: ابدأ بـ initialTokens أو ما هو محفوظ محلياً
    const localKey = `${LOCAL_KEY}_${uid}`;
    AsyncStorage.getItem(localKey).then(raw => {
      const localVal = raw ? parseInt(raw) : null;
      // اختر الأعلى بين initialTokens وما هو محفوظ محلياً
      const best = Math.max(initialTokens || 0, localVal || 0) || 30;
      setTokensState(best);
      loadedRef.current = true;
    }).catch(() => {
      setTokensState(initialTokens || 30);
      loadedRef.current = true;
    });
  }, [user?.uid, user?.guestId]);
  // لا نُضيف initialTokens في الـ deps لمنع reset عند كل render

  const setTokens = useCallback((updater) => {
    setTokensState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      pendingRef.current = next;

      // حفظ محلي فوري
      const uid = user?.uid || user?.guestId;
      if (uid) {
        const localKey = `${LOCAL_KEY}_${uid}`;
        AsyncStorage.setItem(localKey, String(next)).catch(() => {});
      }

      // debounce Firestore sync (للمستخدمين المسجلين فقط)
      clearTimeout(timerRef.current);
      if (user?.uid && !user?.isGuest) {
        timerRef.current = setTimeout(async () => {
          const val = pendingRef.current;
          if (val === null) return;
          try {
            await updateDoc(doc(db, 'users', user.uid), { tokens: val });
          } catch (e) {
            console.warn('[useTokenSync] sync failed:', e?.message);
          }
        }, DEBOUNCE_MS);
      }

      return next;
    });
  }, [user?.uid, user?.guestId, user?.isGuest]);

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  return [tokens, setTokens];
}
