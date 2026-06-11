// GuessImageData.js — موجّه بيانات صور تحدي التخمين
// يجمع الأجزاء الثلاثة في كائن GUESS_IMAGE_DATA موحّد
// 12 فئة × 50 صورة = 600 صورة إجمالاً

import { GUESS_IMAGE_DATA_1 } from './GuessImageData_1';
import { GUESS_IMAGE_DATA_2 } from './GuessImageData_2';
import { GUESS_IMAGE_DATA_3, GUESS_CATEGORIES } from './GuessImageData_3';

export const GUESS_IMAGE_DATA = {
  ...GUESS_IMAGE_DATA_1,
  ...GUESS_IMAGE_DATA_2,
  ...GUESS_IMAGE_DATA_3,
};

export { GUESS_CATEGORIES };

/**
 * اختيار صورة عشوائية من فئة محددة مع تجنب المكررة
 * @param {string}   catId    — معرّف الفئة
 * @param {string[]} usedIds  — معرّفات الصور المستخدمة مسبقاً
 * @returns {{ id, answer, url, info? } | null}
 */
export function pickRandomImage(catId, usedIds = []) {
  const pool = GUESS_IMAGE_DATA[catId];
  if (!pool || pool.length === 0) return null;
  const available = pool.filter(img => !usedIds.includes(img.id));
  const source = available.length > 0 ? available : pool;
  return source[Math.floor(Math.random() * source.length)];
}
