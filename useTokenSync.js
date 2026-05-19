/**
 * useTokenSync.js
 * ════════════════════════════════════════════════════════════
 * يُزامن رصيد tokens مع Firestore بـ debounce 2 ثانية
 * لمنع فقدان الرصيد عند إعادة فتح التطبيق
 *
 * الاستخدام في App.js:
 *   import { useTokenSync } from './useTokenSync';
 *
 *   // استبدل:
 *   const [tokens, setTokens] = useState(30);
 *
 *   // بـ:
 *   const [tokens, setTokens] = useTokenSync(user, initialTokens);
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { db } from './firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';

const DEBOUNCE_MS = 2000; // 2 ثانية قبل الكتابة للـ Firestore

export function useTokenSync(user, initialTokens = 30) {
  const [tokens,  setTokensState] = useState(initialTokens);
  const timerRef                  = useRef(null);
  const pendingRef                = useRef(null);

  // عند تغيير المستخدم (login/logout) نُحدّث الـ initial value
  useEffect(() => {
    setTokensState(initialTokens);
  }, [user?.uid, user?.guestId, initialTokens]);

  // دالة setTokens المُعدَّلة — تُحدّث state فوراً وتُزامن Firestore بـ debounce
  const setTokens = useCallback((updater) => {
    setTokensState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      pendingRef.current = next;

      // debounce: نُلغي أي sync سابق ونُعيد الجدولة
      clearTimeout(timerRef.current);

      const uid = user?.uid;
      if (uid && pendingRef.current !== null) {
        timerRef.current = setTimeout(async () => {
          const val = pendingRef.current;
          if (val === null) return;
          try {
            await updateDoc(doc(db, 'users', uid), { tokens: val });
          } catch (e) {
            // صامت — نتجنب alert عند خطأ شبكة
            console.warn('[useTokenSync] sync failed:', e?.message);
          }
        }, DEBOUNCE_MS);
      }

      return next;
    });
  }, [user?.uid]);

  // cleanup عند unmount
  useEffect(() => {
    return () => {
      clearTimeout(timerRef.current);
    };
  }, []);

  return [tokens, setTokens];
}
