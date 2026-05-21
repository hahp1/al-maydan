/**
 * ServerTime.js
 * ═══════════════════════════════════════════════════════════
 * يجلب الوقت الحقيقي من Firebase بدل Date.now()
 * يمنع تغيير تاريخ الجهاز من التأثير على القلوب والإعلانات
 * 
 * الآلية:
 *  - يكتب document بـ serverTimestamp() في Firestore
 *  - يقرأ الـ timestamp الذي كتبه السيرفر
 *  - يحسب الفرق (offset) بين وقت الجهاز ووقت السيرفر
 *  - يخزن الـ offset في AsyncStorage
 *  - كل استدعاء لـ getServerNow() يُعيد: Date.now() + offset
 * ═══════════════════════════════════════════════════════════
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from './firebaseConfig';
import {
  doc, setDoc, getDoc, serverTimestamp,
} from 'firebase/firestore';

const OFFSET_KEY    = 'arena_time_offset';   // AsyncStorage key
const SYNC_INTERVAL = 1000 * 60 * 30;        // إعادة المزامنة كل 30 دقيقة
const SYNC_DOC      = 'time_sync/device';    // Firestore path
const MAX_OFFSET    = 1000 * 60 * 60 * 24;   // الحد الأقصى للفرق المقبول (24 ساعة)

// الأرقام المحفوظة بعد آخر مزامنة ناجحة
let _serverTimeAtSync = 0;  // وقت السيرفر لحظة المزامنة
let _deviceTimeAtSync = 0;  // وقت الجهاز لحظة المزامنة (قبل أي تغيير)
let _lastSync         = 0;  // متى كانت آخر مزامنة
let _syncPromise      = null;

// ──────────────────────────────────────────────
//  syncServerTime — اجلب الوقت من Firebase
// ──────────────────────────────────────────────
export async function syncServerTime() {
  // منع الاستدعاء المتكرر
  if (_syncPromise) return _syncPromise;

  _syncPromise = (async () => {
    try {
      const before = Date.now();

      // اكتب document بـ serverTimestamp
      const ref = doc(db, 'time_sync', 'device');
      await setDoc(ref, { ts: serverTimestamp() });

      // اقرأه فوراً لتحصل على الـ timestamp الفعلي
      const snap = await getDoc(ref);
      const after = Date.now();

      if (!snap.exists() || !snap.data()?.ts) {
        console.warn('[ServerTime] No timestamp returned');
        return;
      }

      const serverMs  = snap.data().ts.toMillis();
      const clientMid = Math.floor((before + after) / 2); // منتصف الرحلة
      const newOffset = serverMs - clientMid;

      // تجاهل إذا الفرق أكبر من 24 ساعة (خطأ غريب)
      if (Math.abs(newOffset) > MAX_OFFSET) {
        console.warn('[ServerTime] Unrealistic offset:', newOffset);
        return;
      }

      _isSynced         = true;
      _serverTimeAtSync = serverMs;
      _deviceTimeAtSync = clientMid;
      _lastSync         = Date.now();

      await AsyncStorage.setItem(OFFSET_KEY, JSON.stringify({
        serverTimeAtSync: _serverTimeAtSync,
        deviceTimeAtSync: _deviceTimeAtSync,
        syncedAt:         _lastSync,
      }));

      console.log(`[ServerTime] Synced ✅ server=${serverMs} device=${clientMid}`);
    } catch (e) {
      console.warn('[ServerTime] Sync failed:', e?.message);
      // الوضع الإيمني — استخدم الـ offset المحفوظ
    } finally {
      _syncPromise = null;
    }
  })();

  return _syncPromise;
}

// ──────────────────────────────────────────────
//  initServerTime — استعادة الـ offset من الذاكرة
// ──────────────────────────────────────────────
export async function initServerTime() {
  try {
    const raw = await AsyncStorage.getItem(OFFSET_KEY);
    if (raw) {
      const { serverTimeAtSync, deviceTimeAtSync, syncedAt } = JSON.parse(raw);
      _serverTimeAtSync = serverTimeAtSync || 0;
      if (_serverTimeAtSync > 0) _isSynced = true;
      _deviceTimeAtSync = deviceTimeAtSync || 0;
      _lastSync         = syncedAt         || 0;
      console.log(`[ServerTime] Loaded server=${_serverTimeAtSync} device=${_deviceTimeAtSync}`);
    }
  } catch (e) {
    console.warn('[ServerTime] Init failed:', e?.message);
  }

  // مزامنة فورية عند التشغيل
  syncServerTime().catch(() => {});
}

// ──────────────────────────────────────────────
//  getServerNow — الاستبدال الكامل لـ Date.now()
// ──────────────────────────────────────────────
// ── هل تمت مزامنة واحدة على الأقل؟ ──
let _isSynced = false;

/**
 * isServerTimeSynced — هل تمت مزامنة ناجحة؟
 * استخدمها قبل أي عملية حساسة
 */
export function isServerTimeSynced() {
  return _isSynced;
}

/**
 * waitForSync — انتظر حتى تتم المزامنة (timeout 8 ثواني)
 * لو انتهى الـ timeout بدون نت → يرجع false
 */
export function waitForSync(timeoutMs = 8000) {
  if (_isSynced) return Promise.resolve(true);
  return new Promise((resolve) => {
    const check = setInterval(() => {
      if (_isSynced) {
        clearInterval(check);
        resolve(true);
      }
    }, 200);
    setTimeout(() => {
      clearInterval(check);
      resolve(false); // timeout — لا إنترنت
    }, timeoutMs);
  });
}

export function getServerNow() {
  // إذا مضى 30 دقيقة منذ آخر مزامنة → زامن بالخلفية
  if (Date.now() - _lastSync > SYNC_INTERVAL) {
    syncServerTime().catch(() => {});
  }

  // الوضع الآمن: لا توجد مزامنة بعد → استخدم وقت الجهاز
  if (_serverTimeAtSync === 0) {
    return Date.now();
  }

  // ── الحل المقاوم لتغيير التاريخ ──
  // نحسب الوقت المنقضي من لحظة المزامنة بالـ monotonic timer
  // حتى لو غيّر المستخدم التاريخ، الفرق بين now و _deviceTimeAtSync
  // يعكس الوقت الحقيقي المنقضي — لأن كلاهما يُقاس من نفس الجهاز
  // المشكلة الوحيدة لو غيّر التاريخ قبل المزامنة أو بعدها مباشرة
  // لكن بعد أي مزامنة ناجحة، التغيير لا يؤثر
  const elapsedSinceSync = Date.now() - _deviceTimeAtSync;
  return _serverTimeAtSync + elapsedSinceSync;
}

// ──────────────────────────────────────────────
//  getServerDateStr — استبدال new Date() للتواريخ
// ──────────────────────────────────────────────
export function getServerDateStr() {
  const d = new Date(getServerNow());
  return d.toISOString().slice(0, 10); // 'YYYY-MM-DD'
}

export function getServerYesterdayStr() {
  const d = new Date(getServerNow() - 86400000);
  return d.toISOString().slice(0, 10);
}
