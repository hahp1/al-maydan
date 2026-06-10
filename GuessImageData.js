// GuessImageData.js — ملف التجميع الرئيسي
// يجمع الأجزاء الثلاثة في export واحد

import { GUESS_IMAGE_DATA_1 } from './GuessImageData_1';
import { GUESS_IMAGE_DATA_2 } from './GuessImageData_2';
import { GUESS_IMAGE_DATA_3 } from './GuessImageData_3';

export { GUESS_CATEGORIES, pickRandomImage } from './GuessImageData_3';

export const GUESS_IMAGE_DATA = {
  ...GUESS_IMAGE_DATA_1,
  ...GUESS_IMAGE_DATA_2,
  ...GUESS_IMAGE_DATA_3,
};
