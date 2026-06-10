/**
 * HeartIcon.js — قلب مصمم احترافياً بأسلوب راقٍ
 * ════════════════════════════════════════════════════════════════
 *  ✅ SVG-based — وضوح مثالي بكل الأحجام
 *  ✅ 4 أنماط بصرية حسب مجموعة الثيم:
 *     • Standard (Dark/Light) → قلب صلب مع highlight راقي
 *     • Mist → glassmorphism شفاف مع inner glow ناعم
 *     • Crystal → gradient + shimmer + facets كريستالية
 *     • City → gradient ذهبي/معدني فاخر يعكس accent المدينة
 *  ✅ اللون يتكيف تلقائياً مع `theme.accent` لكل ثيم مفرد
 *  ✅ حالة فارغة (empty) أنيقة — مو 🖤
 *  ✅ Pulse animation للحالة الحرجة
 *  ✅ Bounce animation عند التغيير
 *  ✅ احتراف في كل بكسل — لا يبدو رخيصاً
 *
 *  Usage:
 *    <HeartIcon size={28} filled />
 *    <HeartIcon size={64} filled animated pulseWhenZero hearts={0} />
 *    <HeartIcon size={20} filled={false} />   // قلب فارغ
 *    <HeartIcon size={120} filled pro />       // مع تاج Pro
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
  Filter,
  FeGaussianBlur,
  FeMerge,
  FeMergeNode,
  ClipPath,
  Mask,
  Rect,
  Ellipse,
  Circle,
} from 'react-native-svg';
import { useTheme } from './ThemeContext';

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedPath = Animated.createAnimatedComponent(Path);

// ─── شكل القلب الكلاسيكي (path علمي ومتناسق) ───────────────
// رسم قلب بنسب الذهبية: متوازن، بدون حواف حادة، شكل ناضج
const HEART_PATH =
  'M50 86 ' +
  'C 50 86, 12 62, 12 36 ' +
  'C 12 22, 22 12, 35 12 ' +
  'C 43 12, 48 17, 50 22 ' +
  'C 52 17, 57 12, 65 12 ' +
  'C 78 12, 88 22, 88 36 ' +
  'C 88 62, 50 86, 50 86 Z';

// ─── أداة تحويل HEX إلى RGB لتلوين الـ alpha ─────────────────
function hexToRgb(hex) {
  if (!hex || typeof hex !== 'string') return { r: 239, g: 68, b: 68 };
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean.split('').map(c => c + c).join('')
      : clean.slice(0, 6);
  return {
    r: parseInt(full.slice(0, 2), 16) || 0,
    g: parseInt(full.slice(2, 4), 16) || 0,
    b: parseInt(full.slice(4, 6), 16) || 0,
  };
}

function rgba(hex, a) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

// ─── تفتيح/تغميق اللون بنسبة مئوية ──────────────────────────
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

// ─── تحديد مجموعة الثيم ─────────────────────────────────────
function getThemeStyle(theme) {
  if (theme?.isCrystal) return 'crystal';
  if (theme?.isCityTheme) return 'city';
  if (theme?.isMist) return 'mist';
  return 'standard'; // Dark / Light / fallback
}

// ══════════════════════════════════════════════════════════════
//  HeartIcon — المكوّن الرئيسي
// ══════════════════════════════════════════════════════════════
function HeartIcon({
  size = 28,
  filled = true,
  animated = false,
  pulseWhenZero = false,
  hearts = 1,
  pro = false,
  color,          // override للون (اختياري)
  glow = true,
  style,
}) {
  const { theme } = useTheme();
  const styleType = getThemeStyle(theme);

  // ─── اللون الأساسي ──
  // إذا empty/zero → رمادي خافت
  // إذا filled → accent الثيم (أو color المُمرّر)
  const isEmpty = !filled || hearts === 0;
  const baseColor = color || (isEmpty ? '#6b7280' : theme.accent || '#ef4444');

  // ─── animations ──
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  // Pulse عند صفر قلوب
  useEffect(() => {
    if (pulseWhenZero && hearts === 0) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.12, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1,    duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [pulseWhenZero, hearts]);

  // Bounce عند تغير hearts
  useEffect(() => {
    if (!animated) return;
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.2, duration: 180, easing: Easing.out(Easing.back(2)), useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1,   duration: 220, easing: Easing.out(Easing.ease),    useNativeDriver: true }),
    ]).start();
  }, [hearts, animated]);

  // Shimmer لـ Crystal و City
  useEffect(() => {
    if (isEmpty) return;
    if (styleType === 'crystal' || styleType === 'city') {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
          Animated.timing(shimmerAnim, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [styleType, isEmpty]);

  // ─── ألوان مشتقة من baseColor ──
  const colors = useMemo(() => {
    const light  = lighten(baseColor, 0.45);  // highlight
    const xlight = lighten(baseColor, 0.75);  // shimmer/sparkle
    const dark   = darken(baseColor, 0.25);   // shadow
    const xdark  = darken(baseColor, 0.50);   // deep shadow
    return { base: baseColor, light, xlight, dark, xdark };
  }, [baseColor]);

  // ─── عند الحالة الفارغة: قلب outline راقٍ ─────────────────
  if (isEmpty) {
    return (
      <Animated.View
        style={[
          { width: size, height: size, transform: [{ scale: pulseAnim }] },
          style,
        ]}
      >
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Defs>
            {/* Subtle inner gradient حتى للقلب الفارغ — يعطي عمق */}
            <LinearGradient id="emptyGrad" x1="50%" y1="0%" x2="50%" y2="100%">
              <Stop offset="0%"   stopColor="#9ca3af" stopOpacity="0.18" />
              <Stop offset="100%" stopColor="#4b5563" stopOpacity="0.10" />
            </LinearGradient>
          </Defs>
          <Path
            d={HEART_PATH}
            fill="url(#emptyGrad)"
            stroke="#6b7280"
            strokeWidth="2.5"
            strokeOpacity="0.55"
            strokeLinejoin="round"
          />
        </Svg>
      </Animated.View>
    );
  }

  // ─── render حسب نمط الثيم ─────────────────────────────────
  const heart = (() => {
    switch (styleType) {
      case 'crystal':  return <CrystalHeart colors={colors} shimmerAnim={shimmerAnim} pro={pro} />;
      case 'city':     return <CityHeart    colors={colors} shimmerAnim={shimmerAnim} pro={pro} />;
      case 'mist':     return <MistHeart    colors={colors} pro={pro} />;
      default:         return <StandardHeart colors={colors} pro={pro} />;
    }
  })();

  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          transform: [{ scale: Animated.multiply(scaleAnim, pulseAnim) }],
        },
        style,
      ]}
    >
      {/* Glow طبقة خارجية ناعمة — يعطي إحساس premium */}
      {glow && (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            styles.glowContainer,
            {
              shadowColor: colors.base,
              shadowOpacity: styleType === 'crystal' ? 0.85 : styleType === 'mist' ? 0.55 : 0.65,
              shadowRadius: size * 0.28,
              shadowOffset: { width: 0, height: 0 },
              // Android: elevation
              elevation: 0,
            },
          ]}
        >
          <Svg width={size} height={size} viewBox="0 0 100 100">
            <Path d={HEART_PATH} fill={colors.base} fillOpacity={0.001} />
          </Svg>
        </View>
      )}

      <Svg width={size} height={size} viewBox="0 0 100 100">
        {heart}
      </Svg>

      {/* تاج Pro صغير — اختياري */}
      {pro && (
        <View
          pointerEvents="none"
          style={[styles.crown, { width: size * 0.42, height: size * 0.42, top: -size * 0.08, right: -size * 0.06 }]}
        >
          <Svg width="100%" height="100%" viewBox="0 0 100 100">
            <Defs>
              <LinearGradient id="crownGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%"   stopColor="#fde68a" />
                <Stop offset="50%"  stopColor="#f59e0b" />
                <Stop offset="100%" stopColor="#b45309" />
              </LinearGradient>
            </Defs>
            <Path
              d="M20 65 L20 40 L35 55 L50 25 L65 55 L80 40 L80 65 Z"
              fill="url(#crownGrad)"
              stroke="#92400e"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <Circle cx="50" cy="22" r="6" fill="#fef3c7" stroke="#92400e" strokeWidth="1.5" />
          </Svg>
        </View>
      )}
    </Animated.View>
  );
}

// ══════════════════════════════════════════════════════════════
//  STANDARD HEART — Dark/Light
//  قلب صلب أنيق مع highlight ناعم + ظل داخلي خفيف
// ══════════════════════════════════════════════════════════════
const StandardHeart = memo(({ colors }) => (
  <>
    <Defs>
      {/* gradient رأسي — أفتح من الأعلى، أغمق من الأسفل */}
      <LinearGradient id="stdMain" x1="50%" y1="0%" x2="50%" y2="100%">
        <Stop offset="0%"   stopColor={colors.light} />
        <Stop offset="45%"  stopColor={colors.base} />
        <Stop offset="100%" stopColor={colors.dark} />
      </LinearGradient>

      {/* highlight لامع علوي يساري — يعطي حجم 3D */}
      <RadialGradient id="stdHighlight" cx="35%" cy="28%" r="35%" fx="32%" fy="22%">
        <Stop offset="0%"   stopColor="#ffffff" stopOpacity="0.55" />
        <Stop offset="60%"  stopColor="#ffffff" stopOpacity="0.10" />
        <Stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
      </RadialGradient>

      {/* ظل داخلي سفلي — depth */}
      <RadialGradient id="stdShadow" cx="55%" cy="80%" r="40%">
        <Stop offset="0%"   stopColor={colors.xdark} stopOpacity="0.35" />
        <Stop offset="100%" stopColor={colors.xdark} stopOpacity="0" />
      </RadialGradient>
    </Defs>

    {/* الجسم الرئيسي */}
    <Path d={HEART_PATH} fill="url(#stdMain)" />
    {/* الـ shadow الداخلي */}
    <Path d={HEART_PATH} fill="url(#stdShadow)" />
    {/* الـ highlight */}
    <Path d={HEART_PATH} fill="url(#stdHighlight)" />

    {/* خط حواف خفيف — يعطي تعريف نظيف */}
    <Path
      d={HEART_PATH}
      fill="none"
      stroke={colors.xdark}
      strokeWidth="1.2"
      strokeOpacity="0.35"
      strokeLinejoin="round"
    />
  </>
));

// ══════════════════════════════════════════════════════════════
//  MIST HEART — glassmorphism شفاف
//  قلب شبه شفاف بحواف ناعمة + inner glow
// ══════════════════════════════════════════════════════════════
const MistHeart = memo(({ colors }) => (
  <>
    <Defs>
      {/* جسم زجاجي شبه شفاف */}
      <LinearGradient id="mistMain" x1="50%" y1="0%" x2="50%" y2="100%">
        <Stop offset="0%"   stopColor={colors.light} stopOpacity="0.75" />
        <Stop offset="60%"  stopColor={colors.base}  stopOpacity="0.55" />
        <Stop offset="100%" stopColor={colors.dark}  stopOpacity="0.85" />
      </LinearGradient>

      {/* highlight زجاجي علوي */}
      <RadialGradient id="mistHL" cx="40%" cy="30%" r="45%">
        <Stop offset="0%"   stopColor="#ffffff" stopOpacity="0.70" />
        <Stop offset="50%"  stopColor="#ffffff" stopOpacity="0.20" />
        <Stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
      </RadialGradient>

      {/* inner glow — يعطي إحساس ضوء داخلي */}
      <RadialGradient id="mistGlow" cx="50%" cy="55%" r="50%">
        <Stop offset="0%"   stopColor={colors.xlight} stopOpacity="0.45" />
        <Stop offset="80%"  stopColor={colors.base}   stopOpacity="0" />
      </RadialGradient>
    </Defs>

    {/* خلفية ضبابية */}
    <Path d={HEART_PATH} fill="url(#mistMain)" />
    {/* glow داخلي */}
    <Path d={HEART_PATH} fill="url(#mistGlow)" />
    {/* highlight زجاجي */}
    <Path d={HEART_PATH} fill="url(#mistHL)" />

    {/* حافة زجاجية فاتحة */}
    <Path
      d={HEART_PATH}
      fill="none"
      stroke={colors.light}
      strokeWidth="1.8"
      strokeOpacity="0.85"
      strokeLinejoin="round"
    />

    {/* highlight thin خط لامع */}
    <Path
      d="M 30 22 C 35 18, 42 17, 47 21"
      fill="none"
      stroke="#ffffff"
      strokeOpacity="0.65"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
  </>
));

// ══════════════════════════════════════════════════════════════
//  CRYSTAL HEART — كريستال/جوهرة فاخرة
//  gradient متعدد الطبقات + facets + shimmer متحرك
// ══════════════════════════════════════════════════════════════
const CrystalHeart = memo(({ colors, shimmerAnim }) => {
  // shimmer ينتقل من -30 إلى 130 على المحور x
  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-40, 140],
  });

  return (
    <>
      <Defs>
        {/* gradient رأسي متعدد المراحل — يحاكي عمق الجوهرة */}
        <LinearGradient id="crysMain" x1="50%" y1="0%" x2="50%" y2="100%">
          <Stop offset="0%"   stopColor={colors.xlight} />
          <Stop offset="25%"  stopColor={colors.light} />
          <Stop offset="55%"  stopColor={colors.base} />
          <Stop offset="85%"  stopColor={colors.dark} />
          <Stop offset="100%" stopColor={colors.xdark} />
        </LinearGradient>

        {/* facet أيسر — جهة مضيئة */}
        <LinearGradient id="crysFacetL" x1="0%" y1="20%" x2="100%" y2="80%">
          <Stop offset="0%"   stopColor="#ffffff" stopOpacity="0.45" />
          <Stop offset="50%"  stopColor="#ffffff" stopOpacity="0.18" />
          <Stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </LinearGradient>

        {/* facet أيمن — جهة معتمة */}
        <LinearGradient id="crysFacetR" x1="100%" y1="20%" x2="0%" y2="80%">
          <Stop offset="0%"   stopColor={colors.xdark} stopOpacity="0.45" />
          <Stop offset="100%" stopColor={colors.xdark} stopOpacity="0" />
        </LinearGradient>

        {/* highlight علوي قوي */}
        <RadialGradient id="crysHL" cx="38%" cy="22%" r="32%">
          <Stop offset="0%"   stopColor="#ffffff" stopOpacity="0.85" />
          <Stop offset="50%"  stopColor="#ffffff" stopOpacity="0.25" />
          <Stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </RadialGradient>

        {/* shimmer متحرك — شريط ضوء ينزلق */}
        <LinearGradient id="crysShimmer" x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%"   stopColor="#ffffff" stopOpacity="0" />
          <Stop offset="45%"  stopColor="#ffffff" stopOpacity="0" />
          <Stop offset="50%"  stopColor="#ffffff" stopOpacity="0.55" />
          <Stop offset="55%"  stopColor="#ffffff" stopOpacity="0" />
          <Stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </LinearGradient>

        {/* clip path للـ shimmer ليبقى داخل القلب */}
        <ClipPath id="crysClip">
          <Path d={HEART_PATH} />
        </ClipPath>
      </Defs>

      {/* الجسم الرئيسي */}
      <Path d={HEART_PATH} fill="url(#crysMain)" />

      {/* facets جانبية */}
      <Path d={HEART_PATH} fill="url(#crysFacetR)" />
      <Path d={HEART_PATH} fill="url(#crysFacetL)" />

      {/* خط facet مركزي وهمي — يعطي إحساس الجوهرة المقطوعة */}
      <Path
        d="M 50 22 L 50 84"
        stroke="#ffffff"
        strokeOpacity="0.18"
        strokeWidth="1"
      />

      {/* shimmer متحرك */}
      <G clipPath="url(#crysClip)">
        <AnimatedG translateX={translateX}>
          <Rect x="0" y="0" width="40" height="100" fill="url(#crysShimmer)" />
        </AnimatedG>
      </G>

      {/* highlight علوي ناصع */}
      <Path d={HEART_PATH} fill="url(#crysHL)" />

      {/* sparkle dot صغير — لمسة بريق */}
      <Circle cx="36" cy="28" r="2.5" fill="#ffffff" fillOpacity="0.85" />
      <Circle cx="30" cy="35" r="1.2" fill="#ffffff" fillOpacity="0.55" />

      {/* حافة كريستالية محددة */}
      <Path
        d={HEART_PATH}
        fill="none"
        stroke={colors.xlight}
        strokeWidth="1.2"
        strokeOpacity="0.65"
        strokeLinejoin="round"
      />
    </>
  );
});

// ══════════════════════════════════════════════════════════════
//  CITY HEART — معدني/ذهبي فاخر
//  gradient ذهبي/معدني يلائم أجواء ثيمات المدن الليلية
// ══════════════════════════════════════════════════════════════
const CityHeart = memo(({ colors, shimmerAnim }) => {
  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-50, 130],
  });

  return (
    <>
      <Defs>
        {/* gradient معدني عمودي */}
        <LinearGradient id="cityMain" x1="50%" y1="0%" x2="50%" y2="100%">
          <Stop offset="0%"   stopColor={colors.light} />
          <Stop offset="30%"  stopColor={colors.base} />
          <Stop offset="55%"  stopColor={colors.dark} />
          <Stop offset="75%"  stopColor={colors.base} />
          <Stop offset="100%" stopColor={colors.xdark} />
        </LinearGradient>

        {/* highlight أفقي علوي — لمعة معدنية */}
        <LinearGradient id="cityShine" x1="0%" y1="35%" x2="100%" y2="40%">
          <Stop offset="0%"   stopColor="#ffffff" stopOpacity="0" />
          <Stop offset="35%"  stopColor="#ffffff" stopOpacity="0.20" />
          <Stop offset="50%"  stopColor="#ffffff" stopOpacity="0.55" />
          <Stop offset="65%"  stopColor="#ffffff" stopOpacity="0.20" />
          <Stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </LinearGradient>

        {/* highlight علوي */}
        <RadialGradient id="cityHL" cx="40%" cy="25%" r="35%">
          <Stop offset="0%"   stopColor="#ffffff" stopOpacity="0.55" />
          <Stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </RadialGradient>

        {/* shimmer متحرك */}
        <LinearGradient id="cityShimmer" x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%"   stopColor="#ffffff" stopOpacity="0" />
          <Stop offset="48%"  stopColor="#ffffff" stopOpacity="0" />
          <Stop offset="52%"  stopColor="#ffffff" stopOpacity="0.40" />
          <Stop offset="56%"  stopColor="#ffffff" stopOpacity="0" />
          <Stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </LinearGradient>

        <ClipPath id="cityClip">
          <Path d={HEART_PATH} />
        </ClipPath>
      </Defs>

      {/* الجسم المعدني */}
      <Path d={HEART_PATH} fill="url(#cityMain)" />

      {/* خط لمعة معدنية أفقي */}
      <Path d={HEART_PATH} fill="url(#cityShine)" />

      {/* shimmer متحرك */}
      <G clipPath="url(#cityClip)">
        <AnimatedG translateX={translateX}>
          <Rect x="0" y="0" width="35" height="100" fill="url(#cityShimmer)" />
        </AnimatedG>
      </G>

      {/* highlight علوي */}
      <Path d={HEART_PATH} fill="url(#cityHL)" />

      {/* sparkle خفيف */}
      <Circle cx="35" cy="30" r="1.8" fill="#ffffff" fillOpacity="0.75" />

      {/* حافة ذهبية محددة */}
      <Path
        d={HEART_PATH}
        fill="none"
        stroke={colors.light}
        strokeWidth="1.5"
        strokeOpacity="0.75"
        strokeLinejoin="round"
      />
    </>
  );
});

// ══════════════════════════════════════════════════════════════
//  styles
// ══════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  glowContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  crown: {
    position: 'absolute',
  },
});

export default memo(HeartIcon);
