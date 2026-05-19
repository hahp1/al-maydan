/**
 * DailyRewardService.js — خدمة المكافأة اليومية
 * ════════════════════════════════════════════════
 *  ✅ يتحقق إذا كان المستخدم يستحق مكافأة اليوم
 *  ✅ يحفظ آخر تاريخ مطالبة في AsyncStorage
 *  ✅ يحسب الـ streak ويكافئ على التواصل
 *  ✅ لا يعتمد على Firebase — يعمل بدون إنترنت
 *
 * التغييرات عن النسخة السابقة:
 *  ✅ جدول المكافآت محدّث: 15، 15، 20، 20، 25، 30، 50
 *  ✅ مكافأة اليوم السابع = 50 توكن (بدل 30)
 *  ✅ الحد الأدنى 15 توكن (بدل 10)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const DAILY_LAST_CLAIM_KEY = 'arena_daily_last_claim';
const DAILY_STREAK_KEY     = 'arena_daily_streak';

// جدول المكافآت — يتكرر كل 7 أيام
// اليوم 7 مكافأة كبيرة لتشجيع التواصل
const REWARDS = { 1: 15, 2: 15, 3: 20, 4: 20, 5: 25, 6: 30, 7: 50 };

function getTodayDateStr() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function getYesterdayDateStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/**
 * يتحقق إذا يجب عرض نافذة المكافأة اليومية
 * @returns {{ shouldShow: boolean, alreadyClaimed: boolean, streak: number, reward: number }}
 */
export async function checkDailyReward() {
  try {
    const today     = getTodayDateStr();
    const yesterday = getYesterdayDateStr();

    const lastClaim  = await AsyncStorage.getItem(DAILY_LAST_CLAIM_KEY);
    const streakStr  = await AsyncStorage.getItem(DAILY_STREAK_KEY);
    const streak     = streakStr ? parseInt(streakStr, 10) : 0;

    // إذا طالب اليوم بالفعل
    if (lastClaim === today) {
      return { shouldShow: false, alreadyClaimed: true, streak, reward: 0 };
    }

    // حساب الـ streak الجديد
    let newStreak;
    if (lastClaim === yesterday) {
      // تواصل — زيادة الـ streak
      newStreak = streak + 1;
    } else {
      // انقطع التواصل أو أول مرة — بداية من الصفر
      newStreak = 1;
    }

    const dayNum = ((newStreak - 1) % 7) + 1;
    const reward = REWARDS[dayNum] ?? 15;

    return { shouldShow: true, alreadyClaimed: false, streak: newStreak, reward };
  } catch (e) {
    console.error('checkDailyReward error:', e);
    return { shouldShow: false, alreadyClaimed: false, streak: 1, reward: 15 };
  }
}

/**
 * يسجّل المطالبة باليوم ويحفظ الـ streak
 * @param {number} newStreak — الـ streak الجديد بعد المطالبة
 */
export async function claimDailyReward(newStreak) {
  try {
    const today = getTodayDateStr();
    await AsyncStorage.multiSet([
      [DAILY_LAST_CLAIM_KEY, today],
      [DAILY_STREAK_KEY,     String(newStreak)],
    ]);
  } catch (e) {
    console.error('claimDailyReward error:', e);
  }
}
