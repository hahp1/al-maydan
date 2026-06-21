/**
 * ChargingHeart.js — قلب الشحن مع موجة سائل
 * ════════════════════════════════════════════════════════════════
 *  ✅ قلب outline رمادي + سائل ملوّن يرتفع داخله حسب progress (0-1)
 *  ✅ موجة sine متحركة على سطح السائل (يشعر بأنه ماء حقيقي)
 *  ✅ اللون يأخذ accent الثيم (يتطابق مع القلوب الممتلئة)
 *  ✅ Bubbles صغيرة ترتفع داخل السائل (لمسة احترافية)
 *  ✅ Glow ناعم حول السائل
 *  ✅ يتكيف مع كل مجموعات الثيمات
 *
 *  Props:
 *    - size: number
 *    - progress: number 0-1 (نسبة الامتلاء)
 */

import { useRef, useEffect, useMemo, memo } from 'react';
import { View, Animated, Easing, StyleSheet } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Path,
  G,
  ClipPath,
  Circle,
  Rect,
} from 'react-native-svg';
import { useTheme } from './ThemeContext';

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// نفس HEART_PATH من HeartIcon لتطابق تام
const HEART_PATH =
  'M50 86 ' +
  'C 50 86, 12 62, 12 36 ' +
  'C 12 22, 22 12, 35 12 ' +
  'C 43 12, 48 17, 50 22 ' +
  'C 52 17, 57 12, 65 12 ' +
  'C 78 12, 88 22, 88 36 ' +
  'C 88 62, 50 86, 50 86 Z';

// ─── حدود القلب على المحور Y داخل الـ viewBox 0-100 ──
const HEART_Y_TOP    = 12;  // أعلى نقطة في القلب
const HEART_Y_BOTTOM = 86;  // أسفل نقطة في القلب
const HEART_HEIGHT   = HEART_Y_BOTTOM - HEART_Y_TOP;

// ─── أدوات اللون ──
function hexToRgb(hex) {
  if (!hex || typeof hex !== 'string') return { r: 239, g: 68, b: 68 };
  const clean = hex.replace('#', '');
  const full = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean.slice(0, 6);
  return {
    r: parseInt(full.slice(0, 2), 16) || 0,
    g: parseInt(full.slice(2, 4), 16) || 0,
    b: parseInt(full.slice(4, 6), 16) || 0,
  };
}

function lighten(hex, amt) {
  const { r, g, b } = hexToRgb(hex);
  const f = (c) => Math.min(255, Math.max(0, Math.round(c + (255 - c) * amt)));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}

function darken(hex, amt) {
  const { r, g, b } = hexToRgb(hex);
  const f = (c) => Math.min(255, Math.max(0, Math.round(c * (1 - amt))));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}

// ──────────────────────────────────────────────────────────────
//  ChargingHeart
// ──────────────────────────────────────────────────────────────
function ChargingHeart({ size = 28, progress = 0 }) {
  const { theme } = useTheme();
  const baseColor = theme.accent || '#ef4444';

  const colors = useMemo(() => ({
    base:   baseColor,
    light:  lighten(baseColor, 0.40),
    xlight: lighten(baseColor, 0.65),
    dark:   darken(baseColor, 0.25),
    xdark:  darken(baseColor, 0.45),
  }), [baseColor]);

  // ─── progress محدود 0-1، مع حد أدنى بصري ──
  const safeProgress = Math.max(0, Math.min(1, progress));

  // ─── حساب مستوى السائل بالـ Y coordinates ──
  // عند progress=0 → السائل في الأسفل (y = 86)
  // عند progress=1 → السائل في الأعلى (y = 12)
  const waterY = HEART_Y_BOTTOM - (HEART_HEIGHT * safeProgress);

  // ─── animations ──
  const waveAnim    = useRef(new Animated.Value(0)).current;  // موجة sine تتحرك أفقياً
  const bubble1Anim = useRef(new Animated.Value(0)).current;
  const bubble2Anim = useRef(new Animated.Value(0)).current;
  const bubble3Anim = useRef(new Animated.Value(0)).current;
  const glowAnim    = useRef(new Animated.Value(0)).current;

  // موجة أفقية مستمرة
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(waveAnim, {
        toValue: 1,
        duration: 2500,
        easing: Easing.linear,
        useNativeDriver: false,
      })
    );
    loop.start();
    return () => loop.stop();
  }, []);

  // فقاعات ترتفع
  useEffect(() => {
    if (safeProgress < 0.05) return; // لا فقاعات إذا فاضي

    const makeBubbleAnim = (anim, delay, duration) => {
      anim.setValue(0);
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
          }),
        ])
      );
    };

    const b1 = makeBubbleAnim(bubble1Anim, 0,    2800);
    const b2 = makeBubbleAnim(bubble2Anim, 900,  3200);
    const b3 = makeBubbleAnim(bubble3Anim, 1800, 2600);
    b1.start(); b2.start(); b3.start();
    return () => { b1.stop(); b2.stop(); b3.stop(); };
  }, [safeProgress]);

  // glow خفيف نابض
  useEffect(() => {
    if (safeProgress < 0.05) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [safeProgress]);

  // ─── موجة sine عبر translateX (يعطي شعور حركة السطح) ──
  const waveTranslateX = waveAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [-30, 0],   // موجة تنزلق من اليسار لليمين
  });

  // ─── فقاعات: opacity نابض ──
  const bubbleOpacity = (anim) => anim.interpolate({
    inputRange:  [0, 0.1, 0.85, 1],
    outputRange: [0,   0.7, 0.7, 0],
  });

  // ─── glow opacity نابض ──
  const glowOpacity = glowAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [0.25, 0.55],
  });

  // ─── bubble Y positions كـ Animated props مباشرة ──
  const b1y = bubble1Anim.interpolate({ inputRange: [0, 1], outputRange: [HEART_Y_BOTTOM - 5, HEART_Y_BOTTOM - 5 - 40 * safeProgress] });
  const b2y = bubble2Anim.interpolate({ inputRange: [0, 1], outputRange: [HEART_Y_BOTTOM - 8, HEART_Y_BOTTOM - 8 - 40 * safeProgress] });
  const b3y = bubble3Anim.interpolate({ inputRange: [0, 1], outputRange: [HEART_Y_BOTTOM - 4, HEART_Y_BOTTOM - 4 - 40 * safeProgress] });

  return (
    <View style={{ width: size, height: size }}>
      {/* ─── Glow overlay: Animated.View خارج Svg تماماً ─── */}
      {safeProgress > 0.05 && (
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            { opacity: glowOpacity, overflow: 'hidden' },
          ]}
        >
          <Svg width={size} height={size} viewBox="0 0 100 100">
            <Defs>
              <RadialGradient id="chgGlowOuter" cx="50%" cy="70%" r="50%">
                <Stop offset="0%"   stopColor={colors.xlight} stopOpacity="0.4" />
                <Stop offset="100%" stopColor={colors.base}   stopOpacity="0" />
              </RadialGradient>
              <ClipPath id="chgGlowClip">
                <Path d={HEART_PATH} />
              </ClipPath>
            </Defs>
            <G clipPath="url(#chgGlowClip)">
              <Path d={HEART_PATH} fill="url(#chgGlowOuter)" />
            </G>
          </Svg>
        </Animated.View>
      )}

      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          {/* ─── خلفية القلب الفارغة (outline) ─── */}
          <LinearGradient id="chgEmpty" x1="50%" y1="0%" x2="50%" y2="100%">
            <Stop offset="0%"   stopColor="#9ca3af" stopOpacity="0.15" />
            <Stop offset="100%" stopColor="#4b5563" stopOpacity="0.08" />
          </LinearGradient>

          {/* ─── السائل الملوّن ─── */}
          <LinearGradient id="chgLiquid" x1="50%" y1="0%" x2="50%" y2="100%">
            <Stop offset="0%"   stopColor={colors.light} stopOpacity="0.95" />
            <Stop offset="50%"  stopColor={colors.base}  stopOpacity="0.95" />
            <Stop offset="100%" stopColor={colors.dark}  stopOpacity="0.95" />
          </LinearGradient>

          {/* ─── highlight لسطح السائل ─── */}
          <LinearGradient id="chgSurface" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%"   stopColor="#ffffff" stopOpacity="0.0" />
            <Stop offset="50%"  stopColor="#ffffff" stopOpacity="0.6" />
            <Stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
          </LinearGradient>

          {/* ─── clip path: كل ما هو داخل القلب فقط ─── */}
          <ClipPath id="chgHeartClip">
            <Path d={HEART_PATH} />
          </ClipPath>
        </Defs>

        {/* الخلفية الفارغة (ظاهرة دائماً) */}
        <Path d={HEART_PATH} fill="url(#chgEmpty)" />

        {/* ─── السائل: clipped بشكل القلب ─── */}
        <G clipPath="url(#chgHeartClip)">
          {/* الجسم السائل — يتحرك أفقياً بالموجة */}
          <AnimatedG x={waveTranslateX}>
            {/* الجزء السفلي المملوء بالكامل */}
            <Rect
              x="-20"
              y={waterY + 6}
              width="140"
              height={100 - waterY}
              fill="url(#chgLiquid)"
            />
            {/* الموجة في الأعلى — path منحني sine */}
            <Path
              d={buildWavePath(waterY, 0)}
              fill="url(#chgLiquid)"
            />
            {/* موجة ثانية أفتح للعمق */}
            <Path
              d={buildWavePath(waterY - 1.5, 15)}
              fill={colors.xlight}
              fillOpacity="0.4"
            />
          </AnimatedG>

          {/* ─── فقاعات: props مباشرة بدون style ─── */}
          {safeProgress > 0.1 && (
            <>
              <AnimatedCircle
                cx="38"
                cy={b1y}
                r="1.8"
                fill={colors.xlight}
                fillOpacity={bubbleOpacity(bubble1Anim)}
              />
              <AnimatedCircle
                cx="55"
                cy={b2y}
                r="1.2"
                fill={colors.xlight}
                fillOpacity={bubbleOpacity(bubble2Anim)}
              />
              <AnimatedCircle
                cx="48"
                cy={b3y}
                r="1.5"
                fill={colors.xlight}
                fillOpacity={bubbleOpacity(bubble3Anim)}
              />
            </>
          )}
        </G>

        {/* ─── حدود القلب الخارجية (دائماً ظاهرة) ─── */}
        <Path
          d={HEART_PATH}
          fill="none"
          stroke={safeProgress > 0.5 ? colors.dark : '#6b7280'}
          strokeWidth="2"
          strokeOpacity={safeProgress > 0.5 ? 0.55 : 0.5}
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

// ─── بناء path للموجة sine ──
// مع موجتين منحنيتين تعطيان شكل سطح ماء حقيقي
function buildWavePath(yLevel, phase) {
  // نبدأ من خارج الـ viewBox يساراً، نرسم موجة، ننتهي خارج الـ viewBox يميناً
  // ثم ننزل لأسفل ونغلق
  const segments = 4;
  const waveWidth  = 35;
  const waveHeight = 3;

  let path = `M -20 ${yLevel + 8} `;
  // نصعد لمستوى السطح
  path += `L -20 ${yLevel} `;

  // نرسم موجات
  let x = -20;
  for (let i = 0; i < segments; i++) {
    const cx1 = x + waveWidth * 0.25;
    const cy1 = yLevel - waveHeight;
    const cx2 = x + waveWidth * 0.75;
    const cy2 = yLevel + waveHeight;
    const ex  = x + waveWidth;
    path += `C ${cx1} ${cy1}, ${cx2} ${cy2}, ${ex} ${yLevel} `;
    x = ex;
  }

  // نغلق
  path += `L ${x} ${yLevel + 8} Z`;
  return path;
}

export default memo(ChargingHeart);
