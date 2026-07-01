/**
 * ThemedComponents.js
 * ════════════════════════════════════════════════════════════════
 * نظام مكوّنات UI كامل يتكيف مع كل ثيم تلقائياً
 *
 * المكوّنات:
 *   ThemedButton   ← أزرار (primary / secondary / danger / ghost)
 *   ThemedCard     ← بطاقات ومستطيلات
 *   ThemedPill     ← pills صغيرة (قلوب، توكن، badges)
 *   ThemedModal    ← نوافذ حوار
 *   ThemedRow      ← صفوف قوائم (الإعدادات)
 *   ThemedInput    ← حقول إدخال
 *
 * الثيمات:
 *   🌑 Dark (Neon)  → شفاف + border يشع + glow هادئ
 *   ☀️ Light        → أبيض + بنفسجي + توهج خفيف
 *   🌫️ Mist         → glass + sheen أبيض
 *   💎 Crystal      → gradient بلوري + shimmer
 *   🌆 City         → gradient المدينة
 */

import { useRef, useEffect, memo } from 'react';
import {
  View, Text, TouchableOpacity, TextInput,
  Modal, StyleSheet, Animated, Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from './ThemeContext';
import CrystalSurface from './CrystalSurface';

// ── مساعدات ──────────────────────────────────────────────────
function hexToRgba(hex, alpha) {
  if (!hex || typeof hex !== 'string') return `rgba(128,128,128,${alpha})`;
  const h = hex.replace('#', '');
  const f = h.length === 3 ? h.split('').map(c=>c+c).join('') : h.slice(0,6);
  return `rgba(${parseInt(f.slice(0,2),16)||0},${parseInt(f.slice(2,4),16)||0},${parseInt(f.slice(4,6),16)||0},${alpha})`;
}

// ── shimmer animation ─────────────────────────────────────────
const Shimmer = memo(({ color = 'rgba(255,255,255,0.50)', duration = 2600, borderRadius = 12 }) => {
  const anim = useRef(new Animated.Value(-1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(anim, { toValue:1, duration, easing:Easing.inOut(Easing.ease), useNativeDriver:true })
    );
    loop.start();
    return () => loop.stop();
  }, []);
  const translateX = anim.interpolate({ inputRange:[-1,1], outputRange:['-100%','100%'] });
  return (
    <Animated.View pointerEvents="none"
      style={[StyleSheet.absoluteFill, { overflow:'hidden', borderRadius, transform:[{translateX}] }]}>
      <LinearGradient
        colors={['transparent', color, 'transparent']}
        start={{x:0,y:0.5}} end={{x:1,y:0.5}}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
});

// ── glow pulse ────────────────────────────────────────────────
const GlowPulse = memo(({ color, borderRadius = 12 }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue:1, duration:2600, easing:Easing.inOut(Easing.ease), useNativeDriver:false }),
        Animated.timing(anim, { toValue:0, duration:2600, easing:Easing.inOut(Easing.ease), useNativeDriver:false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  const shadowOpacity = anim.interpolate({ inputRange:[0,1], outputRange:[0.18, 0.42] });
  return (
    <Animated.View pointerEvents="none"
      style={[StyleSheet.absoluteFill, {
        borderRadius,
        shadowColor: color,
        shadowOffset: {width:0,height:0},
        shadowOpacity,
        shadowRadius: 12,
      }]}
    />
  );
});

// ── حساب tokens البصرية لكل ثيم ─────────────────────────────
function getTokens(theme, variant = 'primary') {
  const ac = variant === 'danger'    ? theme.error  :
             variant === 'secondary' ? theme.purple :
             variant === 'success'   ? theme.success:
             theme.accent;
  const acS = variant === 'danger'    ? hexToRgba(theme.error,  0.10) :
              variant === 'secondary' ? theme.purpleSoft :
              variant === 'success'   ? hexToRgba(theme.success, 0.12) :
              theme.accentSoft;
  const acB = variant === 'danger'    ? hexToRgba(theme.error,  0.28) :
              variant === 'secondary' ? theme.purpleBorder :
              variant === 'success'   ? hexToRgba(theme.success, 0.30) :
              theme.accentBorder;

  // ── Crystal ──
  if (theme.isCrystal) {
    const cL = theme.crystalLight || ac;
    const cC = theme.crystalColor || ac;
    const cG = theme.crystalGlow  || ac;
    return {
      gradColors:   [hexToRgba(cL,0.18), hexToRgba(cC,0.08), hexToRgba('#000000',0.25)],
      gradStart:    {x:0.2,y:0}, gradEnd:{x:0.8,y:1},
      border:       hexToRgba(cL,0.38),
      borderWidth:  1.2,
      shadow:       { shadowColor:cG, shadowOffset:{width:0,height:0}, shadowOpacity:0.35, shadowRadius:12, elevation:6 },
      textColor:    cL,
      textShadow:   { textShadowColor:hexToRgba(cG,0.55), textShadowOffset:{width:0,height:0}, textShadowRadius:8 },
      showShimmer:  true,
      shimmerColor: 'rgba(255,255,255,0.55)',
      showSheen:    true,
      sheenColor:   hexToRgba(cL,0.20),
      showGlow:     false,
    };
  }

  // ── Mist ──
  if (theme.isMist) {
    const glass = theme.bgCard;
    const isLight = theme.isLight;
    const sheen = isLight ? 'rgba(255,255,255,0.55)' : hexToRgba(ac, 0.14);
    return {
      gradColors:   [theme.bgElevated, theme.bgCard],
      gradStart:    {x:0,y:0}, gradEnd:{x:0,y:1},
      border:       theme.borderCard,
      borderWidth:  1,
      shadow:       { shadowColor:ac, shadowOffset:{width:0,height:2}, shadowOpacity:0.15, shadowRadius:8, elevation:3 },
      textColor:    variant === 'primary' ? ac : theme.textPrimary,
      textShadow:   {},
      showShimmer:  false,
      shimmerColor: sheen,
      showSheen:    true,
      sheenColor:   sheen,
      showGlow:     false,
    };
  }

  // ── City ──
  if (theme.isCityTheme) {
    return {
      gradColors:   [hexToRgba(ac,0.22), hexToRgba(ac,0.10), hexToRgba(ac,0.18)],
      gradStart:    {x:0,y:0}, gradEnd:{x:0.5,y:1},
      border:       hexToRgba(ac,0.42),
      borderWidth:  1,
      shadow:       { shadowColor:ac, shadowOffset:{width:0,height:2}, shadowOpacity:0.30, shadowRadius:10, elevation:5 },
      textColor:    theme.textPrimary,
      textShadow:   {},
      showShimmer:  true,
      shimmerColor: 'rgba(255,255,255,0.40)',
      showSheen:    true,
      sheenColor:   'rgba(255,255,255,0.12)',
      showGlow:     false,
    };
  }

  // ── Light ──
  if (theme.isLight) {
    const isPrimary = variant === 'primary';
    return {
      gradColors:   isPrimary ? [ac, hexToRgba(ac,0.85)] : ['#ffffff', '#f9f5ff'],
      gradStart:    {x:0,y:0}, gradEnd:{x:0.5,y:1},
      border:       isPrimary ? 'transparent' : acB,
      borderWidth:  isPrimary ? 0 : 1.2,
      shadow:       { shadowColor:ac, shadowOffset:{width:0,height:2}, shadowOpacity:isPrimary?0.22:0.10, shadowRadius:isPrimary?10:6, elevation:isPrimary?4:2 },
      textColor:    isPrimary ? '#ffffff' : ac,
      textShadow:   {},
      showShimmer:  false,
      shimmerColor: 'rgba(255,255,255,0.40)',
      showSheen:    true,
      sheenColor:   'rgba(255,255,255,0.40)',
      showGlow:     isPrimary,
      glowColor:    theme.lightGlow || hexToRgba(ac,0.12),
    };
  }

  // ── Dark (Neon) — الافتراضي ──
  return {
    gradColors:   [hexToRgba(ac,0.14), hexToRgba(ac,0.06)],
    gradStart:    {x:0,y:0}, gradEnd:{x:0.5,y:1},
    border:       acB,
    borderWidth:  1.2,
    shadow:       { shadowColor:ac, shadowOffset:{width:0,height:0}, shadowOpacity:0.22, shadowRadius:10, elevation:5 },
    textColor:    ac,
    textShadow:   { textShadowColor:hexToRgba(ac,0.45), textShadowOffset:{width:0,height:0}, textShadowRadius:7 },
    showShimmer:  false,
    shimmerColor: 'rgba(255,255,255,0.30)',
    showSheen:    true,
    sheenColor:   hexToRgba(ac,0.07),
    showGlow:     true,
    glowColor:    ac,
  };
}

// ════════════════════════════════════════════════════════════════
//  ThemedButton
// ════════════════════════════════════════════════════════════════
export const ThemedButton = memo(function ThemedButton({
  onPress, label, icon, emoji,
  variant  = 'primary',
  size     = 'medium',
  disabled = false,
  fullWidth,
  style, textStyle,
}) {
  const { theme } = useTheme();
  // الأزرار الصغيرة (خروج/رجوع/أيقونات) لا تتمدد افتراضياً ما لم يُطلب صراحةً
  const isFullWidth = fullWidth === undefined ? size !== 'small' : fullWidth;
  const scale = useRef(new Animated.Value(1)).current;
  const onIn  = () => Animated.spring(scale, { toValue:0.96, useNativeDriver:true, speed:50 }).start();
  const onOut = () => Animated.spring(scale, { toValue:1.00, useNativeDriver:true, speed:30 }).start();

  const tk = getTokens(theme, variant);
  const sz = { small:{pv:9,ph:16,r:12,fs:13,gap:5}, medium:{pv:13,ph:20,r:14,fs:15,gap:6}, large:{pv:16,ph:24,r:16,fs:17,gap:7} }[size]||{pv:13,ph:20,r:14,fs:15,gap:6};

  return (
    <Animated.View style={[isFullWidth?{width:'100%'}:{alignSelf:'flex-start'}, {transform:[{scale}], opacity:disabled?0.42:1}, style]}>
      <TouchableOpacity onPress={disabled?undefined:onPress} onPressIn={onIn} onPressOut={onOut}
        activeOpacity={0.88} disabled={disabled}>
        <LinearGradient colors={theme.isCrystal ? ['transparent','transparent'] : tk.gradColors} start={tk.gradStart} end={tk.gradEnd}
          style={[cs.btn, { paddingVertical:sz.pv, paddingHorizontal:sz.ph, borderRadius:sz.r,
            borderWidth:theme.isCrystal?0:tk.borderWidth, borderColor:tk.border }, theme.isCrystal?null:tk.shadow]}>
          {theme.isCrystal && <View pointerEvents="none" style={cs.themeLayer}><CrystalSurface theme={theme} radius={sz.r} tier="full" /></View>}
          {!theme.isCrystal && tk.showSheen && <View pointerEvents="none" style={[cs.sheen,{zIndex:0,borderRadius:sz.r,backgroundColor:tk.sheenColor}]}/>}
          {!theme.isCrystal && tk.showShimmer && <View pointerEvents="none" style={cs.themeLayer}><Shimmer color={tk.shimmerColor} borderRadius={sz.r}/></View>}
          {!theme.isCrystal && tk.showGlow    && <View pointerEvents="none" style={cs.themeLayer}><GlowPulse color={tk.glowColor||tk.border} borderRadius={sz.r}/></View>}
          <View style={[cs.row,{gap:sz.gap, zIndex:5}]}>
            {(emoji||icon) && <Text style={{fontSize:sz.fs+1,lineHeight:sz.fs+5}}>{emoji||icon}</Text>}
            <Text style={[cs.btnTxt,{fontSize:sz.fs,color:tk.textColor,...tk.textShadow},textStyle]}>
              {label}
            </Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
});

// ════════════════════════════════════════════════════════════════
//  ThemedCard
// ════════════════════════════════════════════════════════════════
export const ThemedCard = memo(function ThemedCard({
  children, style,
  variant  = 'default',   // 'default' | 'accent' | 'elevated'
  onPress,
  disabled = false,
  activeOpacity = 0.82,
  padding  = 16,
  radius   = 16,
}) {
  const { theme } = useTheme();
  const tk = getTokens(theme, variant === 'accent' ? 'primary' : 'secondary');

  const cardBg     = variant === 'elevated' ? theme.bgElevated : theme.bgCard;
  const cardBorder = variant === 'accent'   ? tk.border        : theme.borderCard;
  const cardShadow = variant === 'accent'   ? tk.shadow        :
    { shadowColor: theme.accent, shadowOffset:{width:0,height:2}, shadowOpacity:0.08, shadowRadius:6, elevation:2 };

  // استخرج layout props من style لتمريرها للـ View الداخلي
  // حتى يعمل flexDirection:'row' وغيره على الـ children مباشرة
  const flatStyle = style ? (Array.isArray(style) ? Object.assign({}, ...style.map(s => s||{})) : style) : {};
  const layoutProps = {
    flexDirection:    flatStyle.flexDirection,
    alignItems:       flatStyle.alignItems,
    justifyContent:   flatStyle.justifyContent,
    flexWrap:         flatStyle.flexWrap,
    gap:              flatStyle.gap,
  };
  // احذف القيم undefined لتجنب تأثيرات غير مقصودة
  Object.keys(layoutProps).forEach(k => layoutProps[k] === undefined && delete layoutProps[k]);

  // خصائص الأبعاد/الموضع يجب أن تنطبق على الغلاف (TouchableOpacity)
  // وليس على الـ LinearGradient الداخلي — وإلا ينكمش الغلاف ويُقصّ المحتوى
  // (سبب اختفاء أسماء الفئات في البطاقات ذات flex/aspectRatio/maxWidth)
  const SIZING_KEYS = [
    'flex','flexGrow','flexShrink','flexBasis','alignSelf',
    'width','height','minWidth','minHeight','maxWidth','maxHeight','aspectRatio',
    'margin','marginTop','marginBottom','marginLeft','marginRight',
    'marginHorizontal','marginVertical','position','top','bottom','left','right',
  ];
  const wrapperSizing = {};
  SIZING_KEYS.forEach(k => { if (flatStyle[k] !== undefined) wrapperSizing[k] = flatStyle[k]; });

  const hasWrapperSizing = onPress && Object.keys(wrapperSizing).length > 0;

  // عند نقل الأبعاد للغلاف، ننظّف الـ style الداخلي منها لتجنّب التعارض
  const innerStyle = hasWrapperSizing
    ? (() => { const cp = { ...flatStyle }; SIZING_KEYS.forEach(k => delete cp[k]); return cp; })()
    : style;

  const inner = (
    <LinearGradient
      colors={theme.isCrystal ? ['transparent','transparent'] :
              variant === 'accent' ? tk.gradColors :
              theme.isMist    ? [theme.bgElevated, theme.bgCard] :
              [cardBg, cardBg]}
      start={{x:0.2,y:0}} end={{x:0.8,y:1}}
      style={[cs.card, { padding, borderRadius:radius, borderWidth:theme.isCrystal?0:1, borderColor:theme.isCrystal?'transparent':cardBorder }, theme.isCrystal?null:cardShadow, innerStyle, hasWrapperSizing && cs.fillInner]}
    >
      {theme.isCrystal && <View pointerEvents="none" style={cs.themeLayer}><CrystalSurface theme={theme} radius={radius} tier="full" /></View>}
      {theme.isMist && (
        <View pointerEvents="none" style={[cs.sheen,{zIndex:0,borderRadius:radius,backgroundColor:theme.isLight?'rgba(255,255,255,0.55)':hexToRgba(theme.accent,0.10)}]}/>
      )}
      {(theme.isNeon || (!theme.isLight&&!theme.isMist&&!theme.isCrystal&&!theme.isCityTheme)) && variant==='accent' && (
        <View pointerEvents="none" style={cs.themeLayer}><GlowPulse color={theme.accent} borderRadius={radius}/></View>
      )}
      {theme.isLight && variant==='accent' && (
        <View pointerEvents="none" style={cs.themeLayer}><GlowPulse color={theme.lightGlow||hexToRgba(theme.accent,0.10)} borderRadius={radius}/></View>
      )}
      <View style={[{position:'relative', zIndex:5}, layoutProps, hasWrapperSizing && cs.fillChild]}>{children}</View>
    </LinearGradient>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        activeOpacity={activeOpacity}
        style={[wrapperSizing, disabled && { opacity: 0.5 }]}
      >
        {inner}
      </TouchableOpacity>
    );
  }
  return inner;
});

// ════════════════════════════════════════════════════════════════
//  ThemedPill  — للقلوب والتوكن والـ badges
// ════════════════════════════════════════════════════════════════
export const ThemedPill = memo(function ThemedPill({
  children, style, textStyle,
  variant = 'default',   // 'default' | 'accent' | 'success' | 'danger'
  onPress,
  small = false,
}) {
  const { theme } = useTheme();
  const tk = getTokens(theme, variant === 'accent' ? 'primary' :
                               variant === 'success' ? 'success' :
                               variant === 'danger'  ? 'danger'  : 'secondary');

  const bg     = theme.isMist ? theme.bgCard : theme.isCrystal ?
    hexToRgba(theme.crystalLight||theme.accent,0.12) : theme.bgCard;
  const border = variant === 'default' ? theme.borderCard : tk.border;
  const color  = variant === 'default' ? theme.textPrimary : tk.textColor;
  const pv = small ? 4 : 6;
  const ph = small ? 8 : 12;
  const r  = small ? 10 : 14;
  const fs = small ? 11 : 13;

  const inner = (
    <LinearGradient
      colors={theme.isCrystal ? ['transparent','transparent'] :
        theme.isMist ? [theme.bgElevated, theme.bgCard] :
        [bg, bg]}
      start={{x:0,y:0}} end={{x:0.5,y:1}}
      style={[cs.pill, {paddingVertical:pv, paddingHorizontal:ph, borderRadius:r,
        borderWidth:1, borderColor:theme.isCrystal?'transparent':border,
        shadowColor:variant!=='default'?tk.border:theme.accent,
        shadowOffset:{width:0,height:0}, shadowOpacity:theme.isCrystal?0:(theme.isNeon?0.25:0.08), shadowRadius:6,
      }, style]}
    >
      {theme.isCrystal && <View pointerEvents="none" style={cs.themeLayer}><CrystalSurface theme={theme} radius={r} tier="mini" /></View>}
      {theme.isMist && (
        <View pointerEvents="none" style={[cs.sheen,{zIndex:0,borderRadius:r,
          backgroundColor:theme.isLight?'rgba(255,255,255,0.55)':hexToRgba(theme.accent,0.10)}]}/>
      )}
      {typeof children === 'string'
        ? <Text style={[{fontSize:fs,fontWeight:'700',color,zIndex:5,...tk.textShadow},textStyle]}>{children}</Text>
        : <View style={{zIndex:5,flexDirection:'row',alignItems:'center'}}>{children}</View>}
    </LinearGradient>
  );

  if (onPress) return <TouchableOpacity onPress={onPress} activeOpacity={0.8}>{inner}</TouchableOpacity>;
  return inner;
});

// ════════════════════════════════════════════════════════════════
//  ThemedModal
// ════════════════════════════════════════════════════════════════
export const ThemedModal = memo(function ThemedModal({
  visible, onClose, children,
  title, emoji,
  maxWidth = 360,
}) {
  const { theme } = useTheme();
  const tk = getTokens(theme, 'primary');

  const overlayColor = theme.bgOverlay || 'rgba(0,0,0,0.85)';
  const cardRadius   = 24;

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose} statusBarTranslucent>
      <View style={[cs.overlay, {backgroundColor:overlayColor}]}>
        <LinearGradient
          colors={theme.isCrystal ? ['transparent','transparent'] :
            theme.isMist ? [theme.bgElevated, theme.bgCard] :
            theme.isLight ? ['#ffffff','#faf6ff'] :
            [theme.bgElevated, theme.bgCard]}
          start={{x:0.2,y:0}} end={{x:0.8,y:1}}
          style={[cs.modalCard, {
            maxWidth, borderRadius:cardRadius,
            borderWidth: theme.isCrystal ? 0 : 1,
            borderColor: theme.isCrystal ? 'transparent' :
                         theme.isMist    ? theme.borderCard :
                         theme.isLight   ? theme.borderCard :
                         tk.border,
            ...(theme.isCrystal ? {} : tk.shadow),
          }]}
        >
          {theme.isCrystal && <View pointerEvents="none" style={cs.themeLayer}><CrystalSurface theme={theme} radius={cardRadius} tier="full" /></View>}
          {(theme.isMist||theme.isLight) && (
            <View pointerEvents="none" style={[cs.sheen,{zIndex:0,borderRadius:cardRadius,
              backgroundColor: theme.isMist    ? (theme.isLight?'rgba(255,255,255,0.55)':hexToRgba(theme.accent,0.10)) :
                               'rgba(255,255,255,0.38)'}]}/>
          )}
          {(theme.isNeon||(!theme.isLight&&!theme.isMist&&!theme.isCrystal&&!theme.isCityTheme)) && (
            <View pointerEvents="none" style={cs.themeLayer}><GlowPulse color={theme.accent} borderRadius={cardRadius}/></View>
          )}
          <View style={{position:'relative',zIndex:5,width:'100%',alignItems:'center',gap:10,padding:24}}>
            {emoji && <Text style={{fontSize:40}}>{emoji}</Text>}
            {title && <Text style={[cs.modalTitle,{color:theme.textPrimary}]}>{title}</Text>}
            {children}
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );
});

// ════════════════════════════════════════════════════════════════
//  ThemedRow  — صفوف القوائم (الإعدادات)
// ════════════════════════════════════════════════════════════════
export const ThemedRow = memo(function ThemedRow({
  children, onPress, style,
  showArrow = false,
  variant   = 'default',
}) {
  const { theme } = useTheme();
  const tk = getTokens(theme, variant==='accent'?'primary':'secondary');

  const bg     = theme.bgCard;
  const border = variant==='accent' ? tk.border : theme.borderCard;

  const inner = (
    <LinearGradient
      colors={theme.isCrystal ? ['transparent','transparent'] :
        theme.isMist ? [theme.bgElevated, theme.bgCard] :
        [bg, bg]}
      start={{x:0,y:0}} end={{x:0.8,y:1}}
      style={[cs.row2, {
        borderWidth:1, borderColor:theme.isCrystal?'transparent':border,
        borderRadius:14,
        shadowColor:theme.accent, shadowOffset:{width:0,height:1},
        shadowOpacity: theme.isCrystal ? 0 : (theme.isNeon ? 0.14 : theme.isLight ? 0.06 : 0.06),
        shadowRadius:4, elevation:1,
      }, style]}
    >
      {theme.isCrystal && <View pointerEvents="none" style={cs.themeLayer}><CrystalSurface theme={theme} radius={14} tier="full" /></View>}
      {theme.isMist && (
        <View pointerEvents="none" style={[cs.sheen,{zIndex:0,borderRadius:14,
          backgroundColor:theme.isLight?'rgba(255,255,255,0.55)':hexToRgba(theme.accent,0.08)}]}/>
      )}
      <View style={[cs.rowContent,{zIndex:5}]}>{children}</View>
      {showArrow && <Text style={[cs.arrow,{color:theme.textMuted,zIndex:5}]}>‹</Text>}
    </LinearGradient>
  );

  if (onPress) return <TouchableOpacity onPress={onPress} activeOpacity={0.8}>{inner}</TouchableOpacity>;
  return inner;
});

// ════════════════════════════════════════════════════════════════
//  ThemedInput
// ════════════════════════════════════════════════════════════════
export const ThemedInput = memo(function ThemedInput({ style, inputStyle, label, ...props }) {
  const { theme } = useTheme();
  return (
    <View style={[{width:'100%'},style]}>
      {label && <Text style={{color:theme.textMuted,fontSize:12,marginBottom:5,marginRight:4}}>{label}</Text>}
      <LinearGradient
        colors={theme.isCrystal ? ['transparent','transparent'] :
          theme.isMist ? [theme.bgElevated, theme.bgCard] :
          [theme.bgInput, theme.bgInput]}
        start={{x:0,y:0}} end={{x:0.5,y:1}}
        style={{borderRadius:12, borderWidth:1,
          borderColor: theme.isCrystal ? 'transparent' :
                       theme.isLight   ? theme.borderCard : theme.accentBorder,
          overflow:'hidden', position:'relative'}}
      >
        {theme.isCrystal && <View pointerEvents="none" style={cs.themeLayer}><CrystalSurface theme={theme} radius={12} tier="mini" /></View>}
        <TextInput
          placeholderTextColor={theme.textMuted}
          style={[{
            paddingHorizontal:16, paddingVertical:13,
            fontSize:15, color:theme.textPrimary,
            backgroundColor:'transparent', zIndex:5,
          }, inputStyle]}
          {...props}
        />
      </LinearGradient>
    </View>
  );
});

// ════════════════════════════════════════════════════════════════
//  ThemedChip — صفّ أفقي موحّد (topBar chips, البطولة, أي زر صفّي)
// ────────────────────────────────────────────────────────────────
//  لماذا مكوّن منفصل عن ThemedPill؟
//   • يدعم flexDirection:'row' أصيلاً: المحتوى يوضع مباشرة داخل الـ
//     LinearGradient (الذي هو صف)، وطبقة الكريستال مطلقة فوقه فلا
//     تكسر الصف (عيب ThemedCard المعروف مع row).
//   • يقبل height ثابتاً (للارتفاع الموحّد TOP_BAR_H في الـ topBar).
//   • مصدر واحد لتطبيق الثيم → يستحيل أن "يُنسى" عنصر بلا كريستال.
//
//  variant: 'default' | 'accent' | 'heart' | 'tournament' | 'muted'
//  لون النص/الحد يُحسب من الثيم؛ مرّر colorOverride للحالات الخاصة
//  (مثل القلوب التي تتغيّر حسب العدد، أو البطولة الذهبية الثابتة).
// ════════════════════════════════════════════════════════════════
export const ThemedChip = memo(function ThemedChip({
  children, onPress, style,
  variant = 'default',
  radius = 14,
  colorOverride,            // يتجاوز لون الحد/التوهّج (للقلوب/البطولة)
  activeOpacity = 0.75,
  hitSlop,
  disabled = false,
}) {
  const { theme } = useTheme();

  // اللون الأساسي للحد والخلفية حسب الـ variant
  const baseColor =
    colorOverride                  ? colorOverride :
    variant === 'accent'           ? theme.accent  :
    variant === 'tournament'       ? '#f59e0b'     :
    variant === 'muted'            ? theme.textMuted :
                                     theme.accent;

  // خلفية/حدّ غير الكريستال
  const solidBg =
    variant === 'accent'     ? theme.accentSoft :
    variant === 'muted'      ? theme.bgElevated :
    variant === 'tournament' ? hexToRgba(baseColor, 0.06) :
                               theme.bgElevated;
  const solidBorder =
    variant === 'muted'      ? theme.borderCard :
                               hexToRgba(baseColor, theme.isLight ? 0.34 : 0.34);

  const inner = (
    <LinearGradient
      colors={theme.isCrystal ? ['transparent', 'transparent'] :
              theme.isMist    ? [theme.bgElevated, theme.bgCard] :
              [solidBg, solidBg]}
      start={{x:0, y:0}} end={{x:0.8, y:1}}
      style={[cs.chip, {
        borderRadius: radius,
        borderWidth: theme.isCrystal ? 0 : 1,
        borderColor: theme.isCrystal ? 'transparent' : solidBorder,
        shadowColor: baseColor,
        shadowOffset: {width:0, height:0},
        shadowOpacity: theme.isCrystal ? 0 : (theme.isNeon ? 0.18 : 0.08),
        shadowRadius: 6,
      }, style]}
    >
      {theme.isCrystal && (
        <View pointerEvents="none" style={cs.themeLayer}>
          <CrystalSurface theme={theme} radius={radius} tier="mini" />
        </View>
      )}
      {theme.isMist && (
        <View pointerEvents="none" style={[cs.sheen, {zIndex:0, borderRadius:radius,
          backgroundColor: theme.isLight ? 'rgba(255,255,255,0.55)' : hexToRgba(theme.accent, 0.10)}]}/>
      )}
      {children}
    </LinearGradient>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={disabled ? undefined : onPress}
        activeOpacity={activeOpacity}
        hitSlop={hitSlop}
        disabled={disabled}
      >
        {inner}
      </TouchableOpacity>
    );
  }
  return inner;
});

// ════════════════════════════════════════════════════════════════
//  styles مشتركة
// ════════════════════════════════════════════════════════════════
const cs = StyleSheet.create({
  btn:       { overflow:'hidden', position:'relative' },
  sheen:     { position:'absolute', top:0, left:0, right:0, height:'46%' },
  row:       { flexDirection:'row', alignItems:'center', justifyContent:'center', position:'relative', zIndex:2 },
  btnTxt:    { fontWeight:'800', textAlign:'center', letterSpacing:0.3 },
  card:      { overflow:'hidden', position:'relative' },
  themeLayer:{ ...StyleSheet.absoluteFillObject, zIndex:0 },
  fillInner: { flex:1, width:'100%', height:'100%', alignSelf:'stretch' },
  fillChild: { flex:1, width:'100%' },
  pill:      { overflow:'hidden', position:'relative', flexDirection:'row', alignItems:'center' },
  chip:      { overflow:'hidden', position:'relative', flexDirection:'row', alignItems:'center', justifyContent:'center' },
  overlay:   { flex:1, alignItems:'center', justifyContent:'center', padding:24 },
  modalCard: { width:'100%', overflow:'hidden', position:'relative' },
  modalTitle:{ fontSize:20, fontWeight:'900', textAlign:'center' },
  row2:      { overflow:'hidden', position:'relative', paddingHorizontal:16, paddingVertical:14 },
  rowContent:{ flexDirection:'row', alignItems:'center', flex:1, position:'relative' },
  arrow:     { fontSize:20, position:'absolute', left:14, top:'50%', marginTop:-12, zIndex:3 },
});

// default export للتوافق
export default { ThemedButton, ThemedCard, ThemedPill, ThemedChip, ThemedModal, ThemedRow, ThemedInput };
