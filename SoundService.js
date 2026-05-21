/**
 * SoundService.js
 * مركز إدارة الأصوات في تطبيق الميدان
 *
 * الملفات المطلوبة في assets/sounds/ :
 *   bg_music.mp3              — موسيقى خلفية هادئة (loop)
 *   tap.mp3                   — صوت ضغطة زر
 *   card_play.mp3             — صوت لعب ورقة
 *   countdown.mp3             — تيك تاك آخر 5 ثوانٍ
 *   correct.mp3               — إجابة صحيحة
 *   wrong.mp3                 — إجابة خاطئة
 *   win.mp3                   — فوز
 *   lose.mp3                  — خسارة
 *   splash.mp3                — ترحيب عند فتح التطبيق
 *   reward_tokens.mp3         — جمع توكنز (فوز أو إعلان)
 *   reward_task.mp3           — مكافأة المهام اليومية
 *   reward_heart_refresh.mp3  — تجدد قلب
 *   reward_heart_ad.mp3       — قلب من إعلان
 */

import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MUSIC_KEY  = 'almaydan_music_enabled';
const SOUNDS_KEY = 'almaydan_sounds_enabled';

let musicEnabled  = true;
let soundsEnabled = true;
let bgMusic       = null;

const soundCache = {};

// ── مسارات الملفات ──
const SOUND_FILES = {
  tap:                   require('./assets/sounds/tap.mp3'),
  card_play:             require('./assets/sounds/card_play.mp3'),
  countdown:             require('./assets/sounds/countdown.mp3'),
  correct:               require('./assets/sounds/correct.mp3'),
  wrong:                 require('./assets/sounds/wrong.mp3'),
  win:                   require('./assets/sounds/win.mp3'),
  lose:                  require('./assets/sounds/lose.mp3'),
  splash:                require('./assets/sounds/splash.mp3'),
  reward_tokens:         require('./assets/sounds/reward_tokens.mp3'),
  reward_task:           require('./assets/sounds/reward_task.mp3'),
  reward_heart_refresh:  require('./assets/sounds/reward_heart_refresh.mp3'),
  reward_heart_ad:       require('./assets/sounds/reward_heart_ad.mp3'),
  maktshof_accuse:       require('./assets/sounds/maktshof_accuse.mp3'),
  maktshof_laugh:        require('./assets/sounds/maktshof_laugh.mp3'),
};

// ── علو كل صوت ──
const VOLUMES = {
  tap:                   0.28,
  card_play:             0.38,
  countdown:             0.30,
  correct:               0.48,
  wrong:                 0.38,
  win:                   0.55,
  lose:                  0.40,
  splash:                0.50,
  reward_tokens:         0.52,
  reward_task:           0.58,
  reward_heart_refresh:  0.40,
  reward_heart_ad:       0.50,
  maktshof_accuse:       0.90,
  maktshof_laugh:        0.85,
};

// ── تهيئة الإعدادات ──
export const initSoundService = async () => {
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS:    true,
      staysActiveInBackground: false,
      shouldDuckAndroid:       true,
    });

    const music  = await AsyncStorage.getItem(MUSIC_KEY);
    const sounds = await AsyncStorage.getItem(SOUNDS_KEY);

    musicEnabled  = music  === null ? true : music  === 'true';
    soundsEnabled = sounds === null ? true : sounds === 'true';

    await preloadSounds();
  } catch (e) {
    console.warn('SoundService init error:', e);
  }
};

// ── تحميل مسبق بالتوازي ──
const preloadSounds = async () => {
  if (!soundsEnabled) return;
  // تنظيف أي أصوات محملة مسبقاً (لتفادي double-load عند re-enable)
  for (const [key, sound] of Object.entries(soundCache)) {
    try { await sound.unloadAsync(); } catch (_) {}
    delete soundCache[key];
  }
  // تحميل كل الأصوات بالتوازي بدل الواحدة تلو الأخرى
  await Promise.all(
    Object.entries(SOUND_FILES).map(async ([key, file]) => {
      try {
        const { sound } = await Audio.Sound.createAsync(file, { volume: VOLUMES[key] ?? 0.4 });
        soundCache[key] = sound;
      } catch (_) {
        // الملف غير موجود — نتجاهل
      }
    })
  );
};

// ── تشغيل الموسيقى الخلفية ──
export const playBgMusic = async () => {
  if (!musicEnabled) return;
  try {
    if (bgMusic) {
      await bgMusic.stopAsync();
      await bgMusic.unloadAsync();
      bgMusic = null;
    }
    const { sound } = await Audio.Sound.createAsync(
      require('./assets/sounds/bg_music.mp3'),
      { isLooping: true, volume: 0.18 }
    );
    bgMusic = sound;
    await bgMusic.playAsync();
  } catch (e) {}
};

// ── إيقاف الموسيقى الخلفية ──
export const stopBgMusic = async () => {
  try {
    if (bgMusic) {
      await bgMusic.stopAsync();
      await bgMusic.unloadAsync();
      bgMusic = null;
    }
  } catch (e) {}
};

// ── تشغيل صوت قصير ──
export const playSound = async (name) => {
  if (!soundsEnabled) return;
  try {
    const sound = soundCache[name];
    if (!sound) return;
    await sound.setPositionAsync(0);
    await sound.setVolumeAsync(VOLUMES[name] ?? 0.4);
    await sound.playAsync();
  } catch (e) {}
};

// ── تفعيل/تعطيل الموسيقى ──
export const setMusicEnabled = async (val) => {
  musicEnabled = val;
  await AsyncStorage.setItem(MUSIC_KEY, String(val));
  if (val) await playBgMusic();
  else      await stopBgMusic();
};

// ── تفعيل/تعطيل الأصوات ──
export const setSoundsEnabled = async (val) => {
  soundsEnabled = val;
  await AsyncStorage.setItem(SOUNDS_KEY, String(val));
  if (val && Object.keys(soundCache).length === 0) {
    await preloadSounds();
  }
};

// ── قراءة الحالة ──
export const getMusicEnabled  = () => musicEnabled;
export const getSoundsEnabled = () => soundsEnabled;

// ── تنظيف عند إغلاق التطبيق ──
export const cleanupSounds = async () => {
  try {
    await stopBgMusic();
    for (const sound of Object.values(soundCache)) {
      await sound.unloadAsync();
    }
  } catch (e) {}
};
