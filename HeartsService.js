/**
 * HeartsService.js — نظام القلوب المُحدّث
 * ════════════════════════════════════════════════════════════════
 *  ✅ سقف صارم: 3 قلوب — لا تتجاوز إلا بالشراء بالكوينات
 *  ✅ الشحن: 5 ساعات/قلب — لا تجديد إلا إذا hearts < 3
 *  ✅ عداد الشحن يبدأ فقط عند استهلاك قلب (مو منذ بداية الحساب)
 *  ✅ لا منحة يومية تلقائية — الشحن فقط
 *  ✅ الإعلانات: تشتغل فقط عند hearts < 3 (5 إعلانات/يوم كحد أقصى)
 *  ✅ الشراء بالتوكنز: الوحيد المسموح للتجاوز فوق 3
 *  ✅ Pro: قلوب لا محدودة (مستثنى من كل القواعد أعلاه)
 *
 *  ⚠️ نموذج بيانات جديد:
 *    - عداد الشحن (`lastRefill`) يُضبط عند:
 *      • استهلاك قلب يُنزل العدد من 3 → 2 (يبدأ الشحن)
 *      • إكمال شحن قلب (يبدأ شحن القلب التالي إذا hearts < 3)
 *      • إعلان أو شراء يرفع العدد لـ 3 → يُلغى الشحن
 *    - إذا hearts >= 3: lastRefill يُعتبر "متوقف" — لا يُحسب وقت
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ══════════════════════════════════════════════════════════════
//  الإعدادات
// ══════════════════════════════════════════════════════════════
export const HEARTS_CONFIG = {
  maxFreeDaily: 3,    // السقف الصارم (لا يتجاوز إلا بالشراء)
  refillHours:  4,    // ساعات لشحن قلب واحد
  maxAdDaily:   5,    // أقصى إعلانات للقلوب/يوم
  costNormal:   1,    // تكلفة اللعبة العادية
  costClassic:  2,    // تكلفة كلاسيك تريفيا
};

// أسعار حزم القلوب بالتوكنز
export const HEART_PACKAGES = [
  { id: 'h1',  hearts: 1,  tokens: 20,  label: '❤️ قلب واحد'      },
  { id: 'h3',  hearts: 3,  tokens: 50,  label: '❤️❤️❤️ 3 قلوب'    },
  { id: 'h5',  hearts: 5,  tokens: 75,  label: '❤️×5 باقة'         },
  { id: 'h10', hearts: 10, tokens: 120, label: '❤️×10 باقة كبيرة' },
];

// مفاتيح AsyncStorage
const KEYS = {
  hearts:     'arena_hearts',
  lastRefill: 'arena_hearts_refill',
  adsToday:   'arena_hearts_ads',
  adsDate:    'arena_hearts_ads_date',
};

const REFILL_MS = () => HEARTS_CONFIG.refillHours * 60 * 60 * 1000;

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

// ══════════════════════════════════════════════════════════════
//  loadHearts — تحميل حالة القلوب كاملة
//  ──────────────────────────────────────────────────────────────
//  منطق الشحن المتقدم:
//   • إذا hearts >= 3 → لا شحن (lastRefill متوقف)
//   • إذا hearts < 3 → نحسب hoursPassed منذ lastRefill
//     - كل 4 ساعات = قلب واحد (حتى نصل لـ 3)
//     - الباقي يبقى يعدّ على القلب التالي
// ══════════════════════════════════════════════════════════════
export async function loadHearts() {
  try {
    const [heartsRaw, lastRefillRaw, adsTodayRaw, adsDateRaw] = await AsyncStorage.multiGet([
      KEYS.hearts, KEYS.lastRefill, KEYS.adsToday, KEYS.adsDate,
    ]);

    const today = todayStr();
    const now   = Date.now();
    const MAX   = HEARTS_CONFIG.maxFreeDaily;
    const TICK  = REFILL_MS();

    // ── حالة أول تشغيل: امنح 3 قلوب مرة واحدة ──
    let hearts;
    if (heartsRaw[1] === null || heartsRaw[1] === undefined) {
      hearts = MAX;
      await AsyncStorage.setItem(KEYS.hearts, String(MAX));
    } else {
      hearts = parseInt(heartsRaw[1]) || 0;
    }

    let lastRefill = lastRefillRaw[1] ? parseInt(lastRefillRaw[1]) : 0;

    // ── حساب الشحن إذا hearts < 3 ──
    if (hearts < MAX && lastRefill > 0) {
      const elapsed     = now - lastRefill;
      const heartsToAdd = Math.floor(elapsed / TICK);

      if (heartsToAdd > 0) {
        const slotsAvailable = MAX - hearts;
        const earned         = Math.min(heartsToAdd, slotsAvailable);
        hearts += earned;

        if (hearts >= MAX) {
          // وصلنا السقف → نوقف عداد الشحن
          lastRefill = 0;
        } else {
          // ندفع lastRefill للأمام بمقدار earned×TICK
          // (المتبقي من elapsed يحسب على القلب التالي)
          lastRefill = lastRefill + (earned * TICK);
        }

        await AsyncStorage.multiSet([
          [KEYS.hearts,     String(hearts)],
          [KEYS.lastRefill, String(lastRefill)],
        ]);
      }
    } else if (hearts >= MAX && lastRefill > 0) {
      // safety: إذا hearts = MAX لكن lastRefill شغّال → نوقفه
      lastRefill = 0;
      await AsyncStorage.setItem(KEYS.lastRefill, '0');
    }

    // ── إحصائيات إعلانات القلوب ──
    const adsDate  = adsDateRaw[1] ?? '';
    const adsToday = (adsDate === today && adsTodayRaw[1])
      ? parseInt(adsTodayRaw[1]) : 0;

    // ── الوقت المتبقي للقلب القادم ──
    const msUntilRefill = (hearts < MAX && lastRefill > 0)
      ? Math.max(0, (lastRefill + TICK) - now)
      : 0;

    return {
      hearts,
      adsToday,
      adsLeft:       Math.max(0, HEARTS_CONFIG.maxAdDaily - adsToday),
      msUntilRefill,
      isCharging:    hearts < MAX && lastRefill > 0,
    };
  } catch (e) {
    console.error('loadHearts error:', e);
    return { hearts: 3, adsToday: 0, adsLeft: 5, msUntilRefill: 0, isCharging: false };
  }
}

// ══════════════════════════════════════════════════════════════
//  spendHeart — خصم قلوب عند بدء اللعبة
//  ──────────────────────────────────────────────────────────────
//  منطق مهم: إذا الاستهلاك ينقل العدد من ≥3 إلى <3 → يبدأ عداد الشحن
//             إذا lastRefill كان شغّال أصلاً → يبقى كما هو (لا نُعيد ضبطه)
// ══════════════════════════════════════════════════════════════
export async function spendHeart(cost = 1) {
  try {
    const [heartsRaw, lastRefillRaw] = await AsyncStorage.multiGet([KEYS.hearts, KEYS.lastRefill]);
    const hearts     = heartsRaw[1] ? parseInt(heartsRaw[1]) : 0;
    const lastRefill = lastRefillRaw[1] ? parseInt(lastRefillRaw[1]) : 0;
    const MAX        = HEARTS_CONFIG.maxFreeDaily;

    if (hearts < cost) return { success: false, hearts };

    const newHearts = hearts - cost;
    let newLastRefill = lastRefill;

    // إذا كان عند السقف (≥ MAX) ونزل تحته → نبدأ الشحن الآن
    if (hearts >= MAX && newHearts < MAX) {
      newLastRefill = Date.now();
    }

    await AsyncStorage.multiSet([
      [KEYS.hearts,     String(newHearts)],
      [KEYS.lastRefill, String(newLastRefill)],
    ]);

    return { success: true, hearts: newHearts };
  } catch (e) {
    console.error('spendHeart error:', e);
    return { success: false, hearts: 0 };
  }
}

// ══════════════════════════════════════════════════════════════
//  earnHeartFromAd — قلب من إعلان مكافأة
//  ──────────────────────────────────────────────────────────────
//  ⛔ لا يشتغل إذا hearts >= 3 (الإعلانات لا تنفع عند الامتلاء)
//  ✅ يشتغل فقط إذا hearts < 3
//  ✅ إذا الإعلان رفع hearts إلى 3 → يوقف عداد الشحن
// ══════════════════════════════════════════════════════════════
export async function earnHeartFromAd() {
  try {
    const today = todayStr();
    const [adsDateRaw, adsTodayRaw, heartsRaw, lastRefillRaw] = await AsyncStorage.multiGet([
      KEYS.adsDate, KEYS.adsToday, KEYS.hearts, KEYS.lastRefill,
    ]);

    const adsDate  = adsDateRaw[1] ?? '';
    const adsToday = (adsDate === today && adsTodayRaw[1])
      ? parseInt(adsTodayRaw[1]) : 0;
    const hearts     = heartsRaw[1] ? parseInt(heartsRaw[1]) : 0;
    const lastRefill = lastRefillRaw[1] ? parseInt(lastRefillRaw[1]) : 0;
    const MAX        = HEARTS_CONFIG.maxFreeDaily;

    // ⛔ القلوب ممتلئة → لا حاجة للإعلان
    if (hearts >= MAX) {
      return {
        success: false,
        hearts,
        adsLeft: Math.max(0, HEARTS_CONFIG.maxAdDaily - adsToday),
        reason:  'hearts_full',
      };
    }

    // ⛔ تجاوزت حد الإعلانات اليومية
    if (adsToday >= HEARTS_CONFIG.maxAdDaily) {
      return {
        success: false,
        hearts,
        adsLeft: 0,
        reason:  'limit_reached',
      };
    }

    const newAds    = adsToday + 1;
    const newHearts = hearts + 1;
    // إذا وصلنا للسقف → أوقف الشحن
    const newLastRefill = newHearts >= MAX ? 0 : lastRefill;

    await AsyncStorage.multiSet([
      [KEYS.adsDate,    today],
      [KEYS.adsToday,   String(newAds)],
      [KEYS.hearts,     String(newHearts)],
      [KEYS.lastRefill, String(newLastRefill)],
    ]);

    return {
      success: true,
      hearts:  newHearts,
      adsLeft: HEARTS_CONFIG.maxAdDaily - newAds,
      reason:  null,
    };
  } catch (e) {
    console.error('earnHeartFromAd error:', e);
    return { success: false, hearts: 0, adsLeft: 0, reason: 'error' };
  }
}

// ══════════════════════════════════════════════════════════════
//  buyHeartsWithTokens — شراء قلوب بالتوكنز
//  ──────────────────────────────────────────────────────────────
//  ✅ الطريقة الوحيدة للتجاوز فوق السقف (3)
//  ✅ إذا الشراء رفع hearts إلى ≥ 3 → يوقف الشحن
//  ✅ إذا الشراء أبقاهم تحت 3 → يبقى الشحن كما هو
// ══════════════════════════════════════════════════════════════
export async function buyHeartsWithTokens(packageId, currentTokens, currentHearts) {
  const pkg = HEART_PACKAGES.find(p => p.id === packageId);
  if (!pkg) return { success: false, reason: 'invalid_package' };
  if (currentTokens < pkg.tokens) {
    return { success: false, hearts: currentHearts, tokens: currentTokens, reason: 'not_enough_tokens' };
  }
  try {
    const lastRefillRaw = await AsyncStorage.getItem(KEYS.lastRefill);
    const lastRefill    = lastRefillRaw ? parseInt(lastRefillRaw) : 0;
    const MAX           = HEARTS_CONFIG.maxFreeDaily;

    const newHearts = currentHearts + pkg.hearts;
    // إذا تجاوزت السقف → أوقف الشحن
    const newLastRefill = newHearts >= MAX ? 0 : lastRefill;

    await AsyncStorage.multiSet([
      [KEYS.hearts,     String(newHearts)],
      [KEYS.lastRefill, String(newLastRefill)],
    ]);

    return {
      success: true,
      hearts:  newHearts,
      tokens:  currentTokens - pkg.tokens,
      reason:  null,
    };
  } catch (e) {
    console.error('buyHeartsWithTokens error:', e);
    return { success: false, reason: 'error' };
  }
}

// ══════════════════════════════════════════════════════════════
//  getRefillCountdown — الوقت المتبقي للتجديد كنص
//  returns: "4س 32د" أو "45د" أو null إذا لا شحن
// ══════════════════════════════════════════════════════════════
export async function getRefillCountdown() {
  try {
    const [heartsRaw, lastRefillRaw] = await AsyncStorage.multiGet([KEYS.hearts, KEYS.lastRefill]);
    const hearts     = heartsRaw[1] ? parseInt(heartsRaw[1]) : 0;
    const lastRefill = lastRefillRaw[1] ? parseInt(lastRefillRaw[1]) : 0;

    if (hearts >= HEARTS_CONFIG.maxFreeDaily) return null;
    if (lastRefill === 0) return null;

    const nextRefillMs = lastRefill + REFILL_MS();
    const msLeft       = Math.max(0, nextRefillMs - Date.now());
    if (msLeft === 0) return null;

    const totalMin = Math.floor(msLeft / 60000);
    const h        = Math.floor(totalMin / 60);
    const m        = totalMin % 60;
    return h > 0 ? `${h}س ${m}د` : `${m}د`;
  } catch {
    return null;
  }
}

// ══════════════════════════════════════════════════════════════
//  getChargeProgress — نسبة شحن القلب الحالي (0.0 - 1.0)
//  للاستخدام في HeartBar — يعطي wave animation سلس
// ══════════════════════════════════════════════════════════════
export async function getChargeProgress() {
  try {
    const [heartsRaw, lastRefillRaw] = await AsyncStorage.multiGet([KEYS.hearts, KEYS.lastRefill]);
    const hearts     = heartsRaw[1] ? parseInt(heartsRaw[1]) : 0;
    const lastRefill = lastRefillRaw[1] ? parseInt(lastRefillRaw[1]) : 0;

    if (hearts >= HEARTS_CONFIG.maxFreeDaily) return 0;
    if (lastRefill === 0) return 0;

    const elapsed = Date.now() - lastRefill;
    const ratio   = elapsed / REFILL_MS();
    return Math.max(0, Math.min(1, ratio));
  } catch {
    return 0;
  }
}
