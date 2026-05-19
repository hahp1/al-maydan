import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = 'arena_theme_id';

// ══════════════════════════════════════════════════════════════
//  🌑🌕 Standard — الثيمان الأساسيان
// ══════════════════════════════════════════════════════════════

export const DARK = {
  id: 'dark',
  bg:          '#07071f',
  bgCard:      '#12123a',
  bgElevated:  '#1a1a4a',
  bgInput:     '#0e0e30',
  bgOverlay:   'rgba(0,0,0,0.75)',
  textPrimary:   '#f0f0ff',
  textSecondary: '#9090c0',
  textMuted:     '#50507a',
  textOnAccent:  '#07071f',
  accent:        '#f5c518',
  accentSoft:    '#f5c51822',
  accentBorder:  '#f5c51840',
  purple:        '#a78bfa',
  purpleSoft:    '#7c3aed22',
  purpleBorder:  '#7c3aed55',
  border:        '#1e1e4e',
  divider:       '#1e1e4e',
  borderCard:    '#2a2a60',
  success:       '#34d399',
  error:         '#f87171',
  warning:       '#fbbf24',
  statusBar:     'light-content',
  statusBg:      '#07071f',
};

export const LIGHT = {
  id: 'light',
  bg:          '#f0f0fa',
  bgCard:      '#ffffff',
  bgElevated:  '#e8e8f8',
  bgInput:     '#f8f8ff',
  bgOverlay:   'rgba(0,0,0,0.45)',
  textPrimary:   '#1a1a3e',
  textSecondary: '#5a5a8a',
  textMuted:     '#9090b0',
  textOnAccent:  '#1a1a3e',
  accent:        '#d4a800',
  accentSoft:    '#f5c51820',
  accentBorder:  '#f5c51850',
  purple:        '#7c3aed',
  purpleSoft:    '#7c3aed15',
  purpleBorder:  '#7c3aed40',
  border:        '#dcdcf0',
  divider:       '#e8e8f5',
  borderCard:    '#dcdcf0',
  success:       '#059669',
  error:         '#dc2626',
  warning:       '#d97706',
  statusBar:     'dark-content',
  statusBg:      '#f0f0fa',
};

// ══════════════════════════════════════════════════════════════
//  🌫️ Mist — الثيمات الخمسة
// ══════════════════════════════════════════════════════════════

export const TRUE_MIST = {
  id: 'truemist',
  isMist: true,
  isLight: true,
  bg:          '#e8eaec',
  bgCard:      'rgba(255,255,255,0.70)',
  bgElevated:  'rgba(255,255,255,0.50)',
  bgInput:     'rgba(255,255,255,0.60)',
  bgOverlay:   'rgba(20,30,45,0.30)',
  textPrimary:   'rgba(26,34,46,0.92)',
  textSecondary: 'rgba(80,96,112,0.72)',
  textMuted:     'rgba(96,112,128,0.50)',
  textOnAccent:  '#ffffff',
  accent:        '#8898a8',
  accentSoft:    'rgba(136,152,168,0.15)',
  accentBorder:  'rgba(136,152,168,0.30)',
  purple:        '#6878900',
  purpleSoft:    'rgba(104,120,144,0.12)',
  purpleBorder:  'rgba(104,120,144,0.30)',
  border:        'rgba(140,155,170,0.22)',
  divider:       'rgba(140,155,170,0.15)',
  borderCard:    'rgba(255,255,255,0.65)',
  success:       '#059669',
  error:         '#dc2626',
  warning:       '#d97706',
  statusBar:     'dark-content',
  statusBg:      '#e8eaec',
  logoVowel: '#a0b0c0',
  logoCons:  '#788898',
  mistGradient: ['#e8eaec', '#d0d5da'],
};

export const BLUE_MIST = {
  id: 'bluemist',
  isMist: true,
  isLight: false,
  bg:          '#0a1228',
  bgCard:      'rgba(40,65,160,0.30)',
  bgElevated:  'rgba(50,78,175,0.22)',
  bgInput:     'rgba(28,48,118,0.42)',
  bgOverlay:   'rgba(0,0,0,0.65)',
  textPrimary:   'rgba(190,208,255,0.96)',
  textSecondary: 'rgba(120,150,220,0.72)',
  textMuted:     'rgba(90,120,200,0.50)',
  textOnAccent:  '#ffffff',
  accent:        '#5878d0',
  accentSoft:    'rgba(88,120,208,0.15)',
  accentBorder:  'rgba(88,120,208,0.30)',
  purple:        '#3858b0',
  purpleSoft:    'rgba(56,88,176,0.12)',
  purpleBorder:  'rgba(56,88,176,0.30)',
  border:        'rgba(70,105,200,0.28)',
  divider:       'rgba(70,105,200,0.18)',
  borderCard:    'rgba(105,140,215,0.25)',
  success:       '#34d399',
  error:         '#f87171',
  warning:       '#fbbf24',
  statusBar:     'light-content',
  statusBg:      '#0a1228',
  logoVowel: '#5878d0',
  logoCons:  '#3858b0',
  mistGradient: ['#121e3e', '#0a1228'],
};

export const GREEN_MIST = {
  id: 'greenmist',
  isMist: true,
  isLight: false,
  bg:          '#071510',
  bgCard:      'rgba(30,80,45,0.38)',
  bgElevated:  'rgba(38,95,55,0.28)',
  bgInput:     'rgba(20,60,32,0.45)',
  bgOverlay:   'rgba(0,0,0,0.65)',
  textPrimary:   'rgba(170,240,195,0.96)',
  textSecondary: 'rgba(100,185,130,0.72)',
  textMuted:     'rgba(70,148,98,0.50)',
  textOnAccent:  '#ffffff',
  accent:        '#3a9058',
  accentSoft:    'rgba(58,144,88,0.15)',
  accentBorder:  'rgba(58,144,88,0.30)',
  purple:        '#286040',
  purpleSoft:    'rgba(40,96,64,0.12)',
  purpleBorder:  'rgba(40,96,64,0.30)',
  border:        'rgba(45,110,65,0.28)',
  divider:       'rgba(45,110,65,0.18)',
  borderCard:    'rgba(80,148,100,0.25)',
  success:       '#34d399',
  error:         '#f87171',
  warning:       '#fbbf24',
  statusBar:     'light-content',
  statusBg:      '#071510',
  logoVowel: '#3a9058',
  logoCons:  '#286040',
  mistGradient: ['#0e2418', '#071510'],
};

export const ORANGE_MIST = {
  id: 'orangemist',
  isMist: true,
  isLight: false,
  bg:          '#0e0a04',
  bgCard:      'rgba(160,70,15,0.25)',
  bgElevated:  'rgba(175,82,18,0.18)',
  bgInput:     'rgba(120,52,10,0.38)',
  bgOverlay:   'rgba(0,0,0,0.65)',
  textPrimary:   'rgba(255,210,160,0.96)',
  textSecondary: 'rgba(200,140,80,0.72)',
  textMuted:     'rgba(165,108,52,0.50)',
  textOnAccent:  '#ffffff',
  accent:        '#c05814',
  accentSoft:    'rgba(192,88,20,0.14)',
  accentBorder:  'rgba(192,88,20,0.26)',
  purple:        '#984010',
  purpleSoft:    'rgba(152,64,16,0.11)',
  purpleBorder:  'rgba(152,64,16,0.26)',
  border:        'rgba(155,75,18,0.26)',
  divider:       'rgba(155,75,18,0.16)',
  borderCard:    'rgba(185,110,45,0.22)',
  success:       '#34d399',
  error:         '#f87171',
  warning:       '#fbbf24',
  statusBar:     'light-content',
  statusBg:      '#0e0a04',
  logoVowel: '#c05814',
  logoCons:  '#984010',
  mistGradient: ['#1c1006', '#0e0a04'],
};

export const BLACK_MIST = {
  id: 'blackmist',
  isMist: true,
  isLight: false,
  bg:          '#0e1014',
  bgCard:      'rgba(80,100,120,0.22)',
  bgElevated:  'rgba(90,112,135,0.16)',
  bgInput:     'rgba(60,78,95,0.32)',
  bgOverlay:   'rgba(0,0,0,0.72)',
  textPrimary:   'rgba(200,215,225,0.96)',
  textSecondary: 'rgba(140,165,185,0.72)',
  textMuted:     'rgba(100,125,145,0.50)',
  textOnAccent:  '#ffffff',
  accent:        '#607080',
  accentSoft:    'rgba(96,112,128,0.15)',
  accentBorder:  'rgba(96,112,128,0.28)',
  purple:        '#485868',
  purpleSoft:    'rgba(72,88,104,0.12)',
  purpleBorder:  'rgba(72,88,104,0.28)',
  border:        'rgba(88,110,130,0.26)',
  divider:       'rgba(88,110,130,0.16)',
  borderCard:    'rgba(115,138,158,0.22)',
  success:       '#34d399',
  error:         '#f87171',
  warning:       '#fbbf24',
  statusBar:     'light-content',
  statusBg:      '#0e1014',
  logoVowel: '#607080',
  logoCons:  '#485868',
  mistGradient: ['#181c22', '#0e1014'],
};

// ══════════════════════════════════════════════════════════════
//  💎 Crystal — الثيمات الستة
//  كل ثيم يحتوي على:
//  - نفس مفاتيح DARK/LIGHT للتوافق الكامل مع كل الشاشات
//  - isCrystal: true — للتمييز
//  - crystalColor / crystalSoft / crystalBorder — للبطاقات
//  - orbColors — للكرات خلف البطاقات في HomeScreen
// ══════════════════════════════════════════════════════════════

export const CRYSTAL_RUBY = {
  id: 'crystal_ruby',
  isCrystal: true,
  isLight: false,
  bg:          '#06010a',
  bgCard:      'rgba(180,15,35,0.14)',
  bgElevated:  'rgba(180,15,35,0.20)',
  bgInput:     'rgba(130,8,22,0.20)',
  bgOverlay:   'rgba(0,0,0,0.75)',
  textPrimary:   'rgba(255,215,222,0.96)',
  textSecondary: 'rgba(218,138,152,0.75)',
  textMuted:     'rgba(158,78,92,0.55)',
  textOnAccent:  '#06010a',
  accent:        '#eb3c5a',
  accentSoft:    'rgba(235,60,90,0.13)',
  accentBorder:  'rgba(235,60,90,0.22)',
  purple:        '#d05570',
  purpleSoft:    'rgba(208,85,112,0.10)',
  purpleBorder:  'rgba(208,85,112,0.22)',
  border:        'rgba(180,15,35,0.20)',
  divider:       'rgba(180,15,35,0.12)',
  borderCard:    'rgba(235,60,90,0.18)',
  success:       '#34d399',
  error:         '#f87171',
  warning:       '#fbbf24',
  statusBar:     'light-content',
  statusBg:      '#06010a',
  crystalColor:  '#b0101e',
  crystalLight:  '#eb3c5a',
  crystalSoft:   'rgba(235,60,90,0.10)',
  crystalBorder: 'rgba(235,60,90,0.20)',
  orbColors:     ['#b0101e', '#780010', '#eb3c5a', '#b0101e'],
};

export const CRYSTAL_EMERALD = {
  id: 'crystal_emerald',
  isCrystal: true,
  isLight: false,
  bg:          '#010904',
  bgCard:      'rgba(2,100,70,0.16)',
  bgElevated:  'rgba(2,100,70,0.22)',
  bgInput:     'rgba(1,68,46,0.20)',
  bgOverlay:   'rgba(0,0,0,0.75)',
  textPrimary:   'rgba(185,248,208,0.96)',
  textSecondary: 'rgba(100,195,140,0.75)',
  textMuted:     'rgba(55,135,88,0.55)',
  textOnAccent:  '#010904',
  accent:        '#0aaa73',
  accentSoft:    'rgba(10,170,115,0.13)',
  accentBorder:  'rgba(10,170,115,0.22)',
  purple:        '#28b882',
  purpleSoft:    'rgba(40,184,130,0.10)',
  purpleBorder:  'rgba(40,184,130,0.22)',
  border:        'rgba(2,100,70,0.20)',
  divider:       'rgba(2,100,70,0.12)',
  borderCard:    'rgba(10,170,115,0.18)',
  success:       '#34d399',
  error:         '#f87171',
  warning:       '#fbbf24',
  statusBar:     'light-content',
  statusBg:      '#010904',
  crystalColor:  '#036845',
  crystalLight:  '#0aaa73',
  crystalSoft:   'rgba(10,170,115,0.10)',
  crystalBorder: 'rgba(10,170,115,0.20)',
  orbColors:     ['#036845', '#024d32', '#0aaa73', '#036845'],
};

export const CRYSTAL_SAPPHIRE = {
  id: 'crystal_sapphire',
  isCrystal: true,
  isLight: false,
  bg:          '#01020e',
  bgCard:      'rgba(20,50,130,0.16)',
  bgElevated:  'rgba(20,50,130,0.22)',
  bgInput:     'rgba(10,26,82,0.22)',
  bgOverlay:   'rgba(0,0,0,0.75)',
  textPrimary:   'rgba(208,225,255,0.96)',
  textSecondary: 'rgba(118,158,228,0.75)',
  textMuted:     'rgba(62,102,182,0.55)',
  textOnAccent:  '#01020e',
  accent:        '#3273e6',
  accentSoft:    'rgba(50,115,230,0.13)',
  accentBorder:  'rgba(50,115,230,0.22)',
  purple:        '#5495f0',
  purpleSoft:    'rgba(84,149,240,0.10)',
  purpleBorder:  'rgba(84,149,240,0.22)',
  border:        'rgba(20,50,130,0.22)',
  divider:       'rgba(20,50,130,0.13)',
  borderCard:    'rgba(50,115,230,0.18)',
  success:       '#34d399',
  error:         '#f87171',
  warning:       '#fbbf24',
  statusBar:     'light-content',
  statusBg:      '#01020e',
  crystalColor:  '#1a3580',
  crystalLight:  '#3273e6',
  crystalSoft:   'rgba(50,115,230,0.10)',
  crystalBorder: 'rgba(50,115,230,0.20)',
  orbColors:     ['#1a3580', '#1a3aa0', '#3273e6', '#1a3580'],
};

export const CRYSTAL_AMETHYST = {
  id: 'crystal_amethyst',
  isCrystal: true,
  isLight: false,
  bg:          '#030108',
  bgCard:      'rgba(80,20,175,0.17)',
  bgElevated:  'rgba(80,20,175,0.23)',
  bgInput:     'rgba(48,10,112,0.22)',
  bgOverlay:   'rgba(0,0,0,0.75)',
  textPrimary:   'rgba(232,222,255,0.96)',
  textSecondary: 'rgba(162,132,235,0.75)',
  textMuted:     'rgba(102,68,185,0.55)',
  textOnAccent:  '#030108',
  accent:        '#804beb',
  accentSoft:    'rgba(128,75,235,0.13)',
  accentBorder:  'rgba(128,75,235,0.22)',
  purple:        '#9d70f5',
  purpleSoft:    'rgba(157,112,245,0.10)',
  purpleBorder:  'rgba(157,112,245,0.22)',
  border:        'rgba(80,20,175,0.22)',
  divider:       'rgba(80,20,175,0.13)',
  borderCard:    'rgba(128,75,235,0.18)',
  success:       '#34d399',
  error:         '#f87171',
  warning:       '#fbbf24',
  statusBar:     'light-content',
  statusBg:      '#030108',
  crystalColor:  '#521898',
  crystalLight:  '#804beb',
  crystalSoft:   'rgba(128,75,235,0.10)',
  crystalBorder: 'rgba(128,75,235,0.20)',
  orbColors:     ['#521898', '#421580', '#804beb', '#521898'],
};

export const CRYSTAL_TOPAZ = {
  id: 'crystal_topaz',
  isCrystal: true,
  isLight: false,
  bg:          '#060501',
  bgCard:      'rgba(140,115,0,0.15)',
  bgElevated:  'rgba(140,115,0,0.21)',
  bgInput:     'rgba(100,82,0,0.22)',
  bgOverlay:   'rgba(0,0,0,0.75)',
  textPrimary:   'rgba(255,248,180,0.96)',
  textSecondary: 'rgba(210,178,42,0.75)',
  textMuted:     'rgba(168,138,18,0.55)',
  textOnAccent:  '#060501',
  accent:        '#d4b800',
  accentSoft:    'rgba(212,184,0,0.13)',
  accentBorder:  'rgba(212,184,0,0.22)',
  purple:        '#a89000',
  purpleSoft:    'rgba(168,144,0,0.10)',
  purpleBorder:  'rgba(168,144,0,0.22)',
  border:        'rgba(140,115,0,0.22)',
  divider:       'rgba(140,115,0,0.13)',
  borderCard:    'rgba(212,184,0,0.18)',
  success:       '#34d399',
  error:         '#f87171',
  warning:       '#fbbf24',
  statusBar:     'light-content',
  statusBg:      '#060501',
  crystalColor:  '#8a7200',
  crystalLight:  '#d4b800',
  crystalSoft:   'rgba(212,184,0,0.10)',
  crystalBorder: 'rgba(212,184,0,0.20)',
  orbColors:     ['#8a7200', '#6e5a00', '#d4b800', '#8a7200'],
};

export const CRYSTAL_DIAMOND = {
  id: 'crystal_diamond',
  isCrystal: true,
  isLight: false,

  bg:          '#05070f',
  bgCard:      'rgba(71,85,105,0.12)',
  bgElevated:  'rgba(71,85,105,0.18)',
  bgInput:     'rgba(30,41,59,0.25)',
  bgOverlay:   'rgba(0,0,0,0.75)',

  textPrimary:   'rgba(240,245,255,0.96)',
  textSecondary: 'rgba(170,185,210,0.75)',
  textMuted:     'rgba(100,120,155,0.55)',
  textOnAccent:  '#05070f',

  accent:        '#94a3b8',
  accentSoft:    'rgba(148,163,184,0.15)',
  accentBorder:  'rgba(148,163,184,0.25)',
  purple:        '#cbd5e1',
  purpleSoft:    'rgba(203,213,225,0.12)',
  purpleBorder:  'rgba(203,213,225,0.28)',

  border:        'rgba(71,85,105,0.25)',
  divider:       'rgba(71,85,105,0.15)',
  borderCard:    'rgba(148,163,184,0.18)',

  success:       '#34d399',
  error:         '#f87171',
  warning:       '#fbbf24',

  statusBar:     'light-content',
  statusBg:      '#05070f',

  crystalColor:  '#475569',
  crystalLight:  '#94a3b8',
  crystalSoft:   'rgba(148,163,184,0.12)',
  crystalBorder: 'rgba(148,163,184,0.20)',
  orbColors:     ['#334155', '#1e293b', '#94a3b8', '#475569'],
};


// ══════════════════════════════════════════════════════════════
//  🌍 City Themes — مجموعة ثيمات المدن (11 مدينة)
//  أوقات: 🌅 فجر (3) | 🌇 غروب (3) | 🌕 ليل (5)
// ══════════════════════════════════════════════════════════════

export const CITY_JERUSALEM = {
  id: 'city_jerusalem', isCityTheme: true, timeOfDay: 'dawn',
  skyGradient: ['#100820','#180e30','#281440','#3c1c48','#5c3040','#7a5030'],
  skyBottom: '#7a5030',
  skylineAsset: require('./assets/skylines/jerusalem.webp'),
  starCount: 12,
  accent: '#c8a855', accentSoft: 'rgba(200,168,85,0.15)', accentBorder: 'rgba(200,168,85,0.28)',
  purple: '#d4906a', purpleSoft: 'rgba(212,144,106,0.12)', purpleBorder: 'rgba(212,144,106,0.28)',
  bg: '#100820', bgCard: 'rgba(200,168,85,0.08)', bgElevated: 'rgba(200,168,85,0.12)',
  bgInput: 'rgba(122,80,48,0.30)', bgOverlay: 'rgba(0,0,0,0.70)',
  textPrimary: 'rgba(240,220,170,0.96)', textSecondary: 'rgba(185,158,100,0.75)',
  textMuted: 'rgba(200,168,85,0.50)', textOnAccent: '#100820',
  border: 'rgba(200,168,85,0.20)', divider: 'rgba(200,168,85,0.12)', borderCard: 'rgba(200,168,85,0.22)',
  success: '#34d399', error: '#f87171', warning: '#fbbf24',
  statusBar: 'light-content', statusBg: '#100820',
};

export const CITY_TOKYO = {
  id: 'city_tokyo', isCityTheme: true, timeOfDay: 'dawn',
  skyGradient: ['#180e28','#301840','#502458','#703060','#a04868','#c87060'],
  skyBottom: '#c87060',
  skylineAsset: require('./assets/skylines/tokyo.webp'),
  starCount: 10,
  accent: '#f0a0b5', accentSoft: 'rgba(240,160,181,0.15)', accentBorder: 'rgba(240,160,181,0.28)',
  purple: '#7855a8', purpleSoft: 'rgba(120,85,168,0.12)', purpleBorder: 'rgba(120,85,168,0.28)',
  bg: '#180e28', bgCard: 'rgba(240,160,181,0.08)', bgElevated: 'rgba(240,160,181,0.12)',
  bgInput: 'rgba(80,36,88,0.30)', bgOverlay: 'rgba(0,0,0,0.70)',
  textPrimary: 'rgba(255,220,230,0.96)', textSecondary: 'rgba(220,160,180,0.75)',
  textMuted: 'rgba(240,160,181,0.50)', textOnAccent: '#180e28',
  border: 'rgba(240,160,181,0.20)', divider: 'rgba(240,160,181,0.12)', borderCard: 'rgba(240,160,181,0.22)',
  success: '#34d399', error: '#f87171', warning: '#fbbf24',
  statusBar: 'light-content', statusBg: '#180e28',
};

export const CITY_AMSTERDAM = {
  id: 'city_amsterdam', isCityTheme: true, timeOfDay: 'dawn',
  skyGradient: ['#080f1c','#0f1c2e','#1a2a40','#263850','#3a5265','#587280'],
  skyBottom: '#587280',
  skylineAsset: require('./assets/skylines/amsterdam.webp'),
  starCount: 8,
  accent: '#5a96c8', accentSoft: 'rgba(90,150,200,0.14)', accentBorder: 'rgba(90,150,200,0.28)',
  purple: '#98c0de', purpleSoft: 'rgba(152,192,222,0.10)', purpleBorder: 'rgba(152,192,222,0.26)',
  bg: '#080f1c', bgCard: 'rgba(90,150,200,0.10)', bgElevated: 'rgba(90,150,200,0.14)',
  bgInput: 'rgba(18,30,52,0.40)', bgOverlay: 'rgba(0,0,0,0.70)',
  textPrimary: 'rgba(195,222,242,0.96)', textSecondary: 'rgba(120,165,200,0.75)',
  textMuted: 'rgba(90,150,200,0.48)', textOnAccent: '#080f1c',
  border: 'rgba(90,150,200,0.18)', divider: 'rgba(90,150,200,0.10)', borderCard: 'rgba(90,150,200,0.20)',
  success: '#34d399', error: '#f87171', warning: '#fbbf24',
  statusBar: 'light-content', statusBg: '#080f1c',
};

export const CITY_BAGHDAD = {
  id: 'city_baghdad', isCityTheme: true, timeOfDay: 'dusk',
  skyGradient: ['#0a0418','#180830','#300e50','#501838','#783020','#a06020','#c89030'],
  skyBottom: '#8a6020',
  skylineAsset: require('./assets/skylines/baghdad.webp'),
  starCount: 5,
  accent: '#d4a028', accentSoft: 'rgba(212,160,40,0.15)', accentBorder: 'rgba(212,160,40,0.28)',
  purple: '#a04830', purpleSoft: 'rgba(160,72,48,0.12)', purpleBorder: 'rgba(160,72,48,0.28)',
  bg: '#0a0418', bgCard: 'rgba(212,160,40,0.08)', bgElevated: 'rgba(212,160,40,0.12)',
  bgInput: 'rgba(80,24,56,0.35)', bgOverlay: 'rgba(0,0,0,0.72)',
  textPrimary: 'rgba(245,220,160,0.96)', textSecondary: 'rgba(200,165,95,0.75)',
  textMuted: 'rgba(212,160,40,0.50)', textOnAccent: '#0a0418',
  border: 'rgba(212,160,40,0.20)', divider: 'rgba(212,160,40,0.12)', borderCard: 'rgba(212,160,40,0.22)',
  success: '#34d399', error: '#f87171', warning: '#fbbf24',
  statusBar: 'light-content', statusBg: '#0a0418',
};

export const CITY_ISTANBUL = {
  id: 'city_istanbul', isCityTheme: true, timeOfDay: 'dusk',
  skyGradient: ['#080418','#180830','#301060','#501848','#783040','#a04028','#b85828'],
  skyBottom: '#7a4018',
  skylineAsset: require('./assets/skylines/istanbul.webp'),
  starCount: 4,
  accent: '#d06030', accentSoft: 'rgba(208,96,48,0.15)', accentBorder: 'rgba(208,96,48,0.28)',
  purple: '#8040a0', purpleSoft: 'rgba(128,64,160,0.12)', purpleBorder: 'rgba(128,64,160,0.28)',
  bg: '#080418', bgCard: 'rgba(208,96,48,0.08)', bgElevated: 'rgba(208,96,48,0.12)',
  bgInput: 'rgba(80,24,72,0.35)', bgOverlay: 'rgba(0,0,0,0.72)',
  textPrimary: 'rgba(245,210,185,0.96)', textSecondary: 'rgba(205,155,115,0.75)',
  textMuted: 'rgba(208,96,48,0.50)', textOnAccent: '#080418',
  border: 'rgba(208,96,48,0.20)', divider: 'rgba(208,96,48,0.12)', borderCard: 'rgba(208,96,48,0.22)',
  success: '#34d399', error: '#f87171', warning: '#fbbf24',
  statusBar: 'light-content', statusBg: '#080418',
};

export const CITY_ALEXANDRIA = {
  id: 'city_alexandria', isCityTheme: true, timeOfDay: 'dusk',
  skyGradient: ['#080818','#100c30','#201848','#3c2860','#604050','#885030','#a86828'],
  skyBottom: '#724818',
  skylineAsset: require('./assets/skylines/alexandria.webp'),
  starCount: 3,
  accent: '#e89830', accentSoft: 'rgba(232,152,48,0.15)', accentBorder: 'rgba(232,152,48,0.28)',
  purple: '#4878b8', purpleSoft: 'rgba(72,120,184,0.12)', purpleBorder: 'rgba(72,120,184,0.28)',
  bg: '#080818', bgCard: 'rgba(232,152,48,0.08)', bgElevated: 'rgba(232,152,48,0.12)',
  bgInput: 'rgba(60,40,96,0.35)', bgOverlay: 'rgba(0,0,0,0.72)',
  textPrimary: 'rgba(248,220,165,0.96)', textSecondary: 'rgba(205,165,100,0.75)',
  textMuted: 'rgba(232,152,48,0.50)', textOnAccent: '#080818',
  border: 'rgba(232,152,48,0.20)', divider: 'rgba(232,152,48,0.12)', borderCard: 'rgba(232,152,48,0.22)',
  success: '#34d399', error: '#f87171', warning: '#fbbf24',
  statusBar: 'light-content', statusBg: '#080818',
};

export const CITY_PARIS = {
  id: 'city_paris', isCityTheme: true, timeOfDay: 'night',
  skyGradient: ['#050818','#0a1028','#121838','#0a0e22','#07091a'],
  skyBottom: '#07091a',
  skylineAsset: require('./assets/skylines/paris.webp'),
  starCount: 38,
  accent: '#f0d837', accentSoft: 'rgba(240,216,55,0.13)', accentBorder: 'rgba(240,216,55,0.28)',
  purple: '#8868c0', purpleSoft: 'rgba(136,104,192,0.10)', purpleBorder: 'rgba(136,104,192,0.26)',
  bg: '#07091a', bgCard: 'rgba(240,216,55,0.09)', bgElevated: 'rgba(240,216,55,0.13)',
  bgInput: 'rgba(14,18,50,0.40)', bgOverlay: 'rgba(0,0,0,0.72)',
  textPrimary: 'rgba(255,248,200,0.96)', textSecondary: 'rgba(200,175,60,0.75)',
  textMuted: 'rgba(240,216,55,0.48)', textOnAccent: '#07091a',
  border: 'rgba(240,216,55,0.18)', divider: 'rgba(240,216,55,0.10)', borderCard: 'rgba(240,216,55,0.20)',
  success: '#34d399', error: '#f87171', warning: '#fbbf24',
  statusBar: 'light-content', statusBg: '#07091a',
};

export const CITY_NEWYORK = {
  id: 'city_newyork', isCityTheme: true, timeOfDay: 'night',
  skyGradient: ['#0e0820','#160c30','#1c0e3a','#140828','#0c0418'],
  skyBottom: '#0c0418',
  skylineAsset: require('./assets/skylines/newyork.webp'),
  starCount: 15,
  accent: '#e83848', accentSoft: 'rgba(232,56,72,0.15)', accentBorder: 'rgba(232,56,72,0.28)',
  purple: '#4888f0', purpleSoft: 'rgba(72,136,240,0.12)', purpleBorder: 'rgba(72,136,240,0.28)',
  bg: '#0c0418', bgCard: 'rgba(232,56,72,0.08)', bgElevated: 'rgba(232,56,72,0.12)',
  bgInput: 'rgba(20,8,40,0.40)', bgOverlay: 'rgba(0,0,0,0.72)',
  textPrimary: 'rgba(255,220,224,0.96)', textSecondary: 'rgba(220,150,158,0.75)',
  textMuted: 'rgba(232,56,72,0.50)', textOnAccent: '#0c0418',
  border: 'rgba(232,56,72,0.20)', divider: 'rgba(232,56,72,0.12)', borderCard: 'rgba(232,56,72,0.22)',
  success: '#34d399', error: '#f87171', warning: '#fbbf24',
  statusBar: 'light-content', statusBg: '#0c0418',
};

export const CITY_LONDON = {
  id: 'city_london', isCityTheme: true, timeOfDay: 'night',
  skyGradient: ['#0e0e18','#161620','#1c1c2c','#141420','#0c0c14'],
  skyBottom: '#0c0c14',
  skylineAsset: require('./assets/skylines/london.webp'),
  starCount: 8,
  accent: '#f0a028', accentSoft: 'rgba(240,160,40,0.15)', accentBorder: 'rgba(240,160,40,0.28)',
  purple: '#5870a0', purpleSoft: 'rgba(88,112,160,0.12)', purpleBorder: 'rgba(88,112,160,0.28)',
  bg: '#0c0c14', bgCard: 'rgba(240,160,40,0.08)', bgElevated: 'rgba(240,160,40,0.12)',
  bgInput: 'rgba(20,20,36,0.40)', bgOverlay: 'rgba(0,0,0,0.72)',
  textPrimary: 'rgba(245,225,190,0.96)', textSecondary: 'rgba(200,165,110,0.75)',
  textMuted: 'rgba(240,160,40,0.50)', textOnAccent: '#0c0c14',
  border: 'rgba(240,160,40,0.20)', divider: 'rgba(240,160,40,0.12)', borderCard: 'rgba(240,160,40,0.22)',
  success: '#34d399', error: '#f87171', warning: '#fbbf24',
  statusBar: 'light-content', statusBg: '#0c0c14',
};

export const CITY_RIYADH = {
  id: 'city_riyadh', isCityTheme: true, timeOfDay: 'night',
  skyGradient: ['#050e20','#081830','#0a1c38','#071428','#040c18'],
  skyBottom: '#040c18',
  skylineAsset: require('./assets/skylines/riyadh.webp'),
  starCount: 40,
  accent: '#e8f0ff', accentSoft: 'rgba(232,240,255,0.12)', accentBorder: 'rgba(232,240,255,0.22)',
  purple: '#6090d0', purpleSoft: 'rgba(96,144,208,0.12)', purpleBorder: 'rgba(96,144,208,0.28)',
  bg: '#040c18', bgCard: 'rgba(232,240,255,0.06)', bgElevated: 'rgba(232,240,255,0.10)',
  bgInput: 'rgba(7,20,40,0.40)', bgOverlay: 'rgba(0,0,0,0.72)',
  textPrimary: 'rgba(220,232,255,0.96)', textSecondary: 'rgba(160,192,235,0.75)',
  textMuted: 'rgba(232,240,255,0.45)', textOnAccent: '#040c18',
  border: 'rgba(232,240,255,0.15)', divider: 'rgba(232,240,255,0.08)', borderCard: 'rgba(232,240,255,0.18)',
  success: '#34d399', error: '#f87171', warning: '#fbbf24',
  statusBar: 'light-content', statusBg: '#040c18',
};

export const CITY_DUBAI = {
  id: 'city_dubai', isCityTheme: true, timeOfDay: 'night',
  skyGradient: ['#080616','#0e0c20','#14102a','#0c0a1c','#06040e'],
  skyBottom: '#06040e',
  skylineAsset: require('./assets/skylines/dubai.webp'),
  starCount: 28,
  accent: '#f0c818', accentSoft: 'rgba(240,200,24,0.15)', accentBorder: 'rgba(240,200,24,0.28)',
  purple: '#8090e0', purpleSoft: 'rgba(128,144,224,0.12)', purpleBorder: 'rgba(128,144,224,0.28)',
  bg: '#06040e', bgCard: 'rgba(240,200,24,0.08)', bgElevated: 'rgba(240,200,24,0.12)',
  bgInput: 'rgba(12,10,28,0.40)', bgOverlay: 'rgba(0,0,0,0.72)',
  textPrimary: 'rgba(255,245,195,0.96)', textSecondary: 'rgba(220,192,110,0.75)',
  textMuted: 'rgba(240,200,24,0.50)', textOnAccent: '#06040e',
  border: 'rgba(240,200,24,0.20)', divider: 'rgba(240,200,24,0.12)', borderCard: 'rgba(240,200,24,0.22)',
  success: '#34d399', error: '#f87171', warning: '#fbbf24',
  statusBar: 'light-content', statusBg: '#06040e',
};


// ══════════════════════════════════════════════════════════════
//  📋 ALL_THEMES — مقسّمة بأربع مجموعات
// ══════════════════════════════════════════════════════════════

export const THEME_GROUPS = [
  {
    groupId: 'standard',
    groupLabel: 'Standard',
    groupLabelAr: 'قبل الضجيج الأول',
    groupEmoji: '⭐',
    themes: [
      { theme: DARK,  id: 'dark',  label: 'Dark',  labelAr: 'داكن',  emoji: '🌙', previewBg: '#07071f', previewAccent: '#f5c518', price: 0 },
      { theme: LIGHT, id: 'light', label: 'Light', labelAr: 'فاتح', emoji: '☀️', previewBg: '#f0f0fa', previewAccent: '#d4a800', price: 0 },
    ],
  },
  {
    groupId: 'mist',
    groupLabel: 'Mist',
    groupLabelAr: 'بين الوضوح والضباب',
    groupEmoji: '🌫️',
    themes: [
      { theme: TRUE_MIST,    id: 'truemist',    label: 'True Mist',    labelAr: 'الضباب الثلجي', emoji: '❄️', previewBg: '#daeefa', previewAccent: '#3a8fd0', isMist: true, price: 0   },
      { theme: BLUE_MIST,   id: 'bluemist',    label: 'Blue Mist',    labelAr: 'الضباب الأزرق', emoji: '🔵', previewBg: '#0e1228', previewAccent: '#aab8f0', isMist: true, price: 200 },
      { theme: GREEN_MIST,  id: 'greenmist',   label: 'Green Mist',   labelAr: 'الضباب الأخضر', emoji: '🟢', previewBg: '#060e07', previewAccent: '#88d098', isMist: true, price: 350 },
      { theme: ORANGE_MIST, id: 'orangemist',  label: 'Orange Mist',  labelAr: 'الضباب الذهبي', emoji: '🟠', previewBg: '#0c0802', previewAccent: '#d0a038', isMist: true, price: 500 },
      { theme: BLACK_MIST,  id: 'blackmist',   label: 'Black Mist',   labelAr: 'الضباب الأسود', emoji: '🤎', previewBg: '#080504', previewAccent: '#c0a090', isMist: true, price: 800 },
    ],
  },
  {
    groupId: 'crystal',
    groupLabel: 'Crystal',
    groupLabelAr: 'حين يتحرر الضوء',
    groupEmoji: '💎',
    themes: [
      { theme: CRYSTAL_DIAMOND,  id: 'crystal_diamond',  label: 'Diamond',  labelAr: 'الماس',            emoji: '⬜', previewBg: '#05070f', previewAccent: '#94a3b8', isCrystal: true, price: 0    },
      { theme: CRYSTAL_RUBY,     id: 'crystal_ruby',     label: 'Ruby',     labelAr: 'الياقوت',          emoji: '🔴', previewBg: '#07020a', previewAccent: '#ff4d6d', isCrystal: true, price: 300  },
      { theme: CRYSTAL_EMERALD,  id: 'crystal_emerald',  label: 'Emerald',  labelAr: 'الزمرد',           emoji: '🟢', previewBg: '#010a05', previewAccent: '#10b981', isCrystal: true, price: 500  },
      { theme: CRYSTAL_SAPPHIRE, id: 'crystal_sapphire', label: 'Sapphire', labelAr: 'الياقوت الأزرق',  emoji: '🔵', previewBg: '#01030f', previewAccent: '#3b82f6', isCrystal: true, price: 750  },
      { theme: CRYSTAL_AMETHYST, id: 'crystal_amethyst', label: 'Amethyst', labelAr: 'الجمشت',           emoji: '🟣', previewBg: '#040108', previewAccent: '#8b5cf6', isCrystal: true, price: 1000 },
      { theme: CRYSTAL_TOPAZ,    id: 'crystal_topaz',    label: 'Topaz',    labelAr: 'التوباز',          emoji: '🟡', previewBg: '#060300', previewAccent: '#f59e0b', isCrystal: true, price: 1500 },
    ],
  },
  {
    groupId: 'cities',
    groupLabel: 'Dusk till Dawn',
    groupLabelAr: 'حين ينام الضوء',
    groupEmoji: '🌆',
    themes: [
      // 🌕 ليل — الأرخص
      { theme: CITY_PARIS,      id: 'city_paris',      label: 'Paris Night',      labelAr: 'ليل باريس',        emoji: '🗼', timeOfDay: 'night', previewBg: '#1e1a48', previewAccent: '#e8d040', isCityTheme: true, price: 0   },
      { theme: CITY_NEWYORK,    id: 'city_newyork',    label: 'New York Night',   labelAr: 'ليل نيويورك',      emoji: '🗽', timeOfDay: 'night', previewBg: '#1c0e3a', previewAccent: '#e83848', isCityTheme: true, price: 400 },
      { theme: CITY_LONDON,     id: 'city_london',     label: 'London Night',     labelAr: 'ليل لندن',         emoji: '🌁', timeOfDay: 'night', previewBg: '#1c1c2c', previewAccent: '#f0a028', isCityTheme: true, price: 500 },
      { theme: CITY_RIYADH,     id: 'city_riyadh',     label: 'Riyadh Night',     labelAr: 'ليل الرياض',       emoji: '🏙️', timeOfDay: 'night', previewBg: '#0a1c38', previewAccent: '#e8f0ff', isCityTheme: true, price: 600 },
      { theme: CITY_DUBAI,      id: 'city_dubai',      label: 'Dubai Night',      labelAr: 'ليل دبي',          emoji: '✨', timeOfDay: 'night', previewBg: '#14102a', previewAccent: '#f0c818', isCityTheme: true, price: 800 },
      // 🌇 غروب
      { theme: CITY_ALEXANDRIA, id: 'city_alexandria', label: 'Alexandria Dusk',  labelAr: 'غروب الإسكندرية', emoji: '🌊', timeOfDay: 'dusk',  previewBg: '#3c2860', previewAccent: '#e89830', isCityTheme: true, price: 400  },
      { theme: CITY_BAGHDAD,    id: 'city_baghdad',    label: 'Baghdad Dusk',     labelAr: 'غروب بغداد',       emoji: '🌴', timeOfDay: 'dusk',  previewBg: '#501838', previewAccent: '#d4a028', isCityTheme: true, price: 800  },
      { theme: CITY_ISTANBUL,   id: 'city_istanbul',   label: 'Istanbul Dusk',    labelAr: 'غروب إسطنبول',    emoji: '🌉', timeOfDay: 'dusk',  previewBg: '#501848', previewAccent: '#d06030', isCityTheme: true, price: 1200 },
      // 🌅 فجر — الأغلى
      { theme: CITY_AMSTERDAM,  id: 'city_amsterdam',  label: 'Amsterdam Dawn',   labelAr: 'فجر أمستردام',    emoji: '🌫️', timeOfDay: 'dawn',  previewBg: '#1e2c3c', previewAccent: '#8ab5d5', isCityTheme: true, price: 600  },
      { theme: CITY_JERUSALEM,  id: 'city_jerusalem',  label: 'Jerusalem Dawn',   labelAr: 'فجر القدس',        emoji: '🕌', timeOfDay: 'dawn',  previewBg: '#281440', previewAccent: '#c8a855', isCityTheme: true, price: 1200 },
      { theme: CITY_TOKYO,      id: 'city_tokyo',      label: 'Tokyo Dawn',       labelAr: 'فجر طوكيو',       emoji: '🌸', timeOfDay: 'dawn',  previewBg: '#502458', previewAccent: '#f0a0b5', isCityTheme: true, price: 1800 },
    ],
  },
];

// للتوافق مع الكود القديم الذي يستخدم ALL_THEMES
export const ALL_THEMES = THEME_GROUPS.flatMap(g => g.themes);

const THEME_MAP = Object.fromEntries(ALL_THEMES.map(t => [t.id, t.theme]));

// ══════════════════════════════════════════════════════════════
//  Context
// ══════════════════════════════════════════════════════════════

const ThemeContext = createContext({
  themeId:    'dark',
  theme:      DARK,
  isDark:     true,
  setThemeId: () => {},
  toggleTheme: () => {},
  setDark:    () => {},
});

export function ThemeProvider({ children }) {
  const [themeId, setThemeIdState] = useState('dark');

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY)
      .then(val => {
        if (val && THEME_MAP[val]) setThemeIdState(val);
      })
      .catch(() => {});
  }, []);

  const setThemeId = useCallback((id) => {
    if (!THEME_MAP[id]) return;
    setThemeIdState(id);
    AsyncStorage.setItem(THEME_KEY, id).catch(() => {});
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeId(themeId === 'dark' ? 'light' : 'dark');
  }, [themeId, setThemeId]);

  const setDark = useCallback((val) => {
    setThemeId(val ? 'dark' : 'light');
  }, [setThemeId]);

  const theme  = THEME_MAP[themeId] || DARK;
  const isDark = theme.isLight === true ? false : (themeId !== 'light');

  return (
    <ThemeContext.Provider value={{
      themeId,
      theme,
      isDark,
      setThemeId,
      toggleTheme,
      setDark,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
