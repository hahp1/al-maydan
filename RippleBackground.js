/**
 * RippleBackground.js
 * موجات ماء متحركة لثيمات Mist — تظهر تلقائياً في كل الشاشات
 * مدمجة في ThemeProvider
 */

import React, { useEffect, useRef, memo } from 'react';
import { Animated, Easing, StyleSheet, View, Dimensions } from 'react-native';

const { width: SW, height: SH } = Dimensions.get('window');

// إعدادات كل ثيم Mist — ألوان حقيقية من ThemeContext
const MIST_CFG = {
  truemist:   { accent:'#8898a8', secondary:'rgba(104,120,144,0.35)', light:'#b0c0d0', cycle:18000 },
  bluemist:   { accent:'#5878d0', secondary:'rgba(56,88,176,0.30)',   light:'#8aabf0', cycle:15000 },
  greenmist:  { accent:'#3a9058', secondary:'rgba(40,96,64,0.30)',    light:'#60b878', cycle:16000 },
  orangemist: { accent:'#c05814', secondary:'rgba(152,64,16,0.28)',   light:'#e07838', cycle:14000 },
  blackmist:  { accent:'#607080', secondary:'rgba(72,88,104,0.25)',   light:'#8090a0', cycle:20000 },
};

// النواة ثابتة في الوسط الذهبي
const CX = SW * 0.52;
const CY = SH * 0.44;
const MAX_R = SW * 0.92;

// ── حلقة واحدة ──
const RippleRing = memo(({ delay, cycle, maxR, accent, secondary }) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, {
          toValue:        1,
          duration:       cycle,
          easing:         Easing.linear,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const scale = anim.interpolate({
    inputRange:  [0, 1],
    outputRange: [0.02, 1],
  });

  const opacity = anim.interpolate({
    inputRange:  [0, 0.08, 0.55, 1],
    outputRange: [0,  0.55, 0.18, 0],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position:        'absolute',
        left:            CX - maxR,
        top:             CY - maxR,
        width:           maxR * 2,
        height:          maxR * 2,
        borderRadius:    maxR,
        borderWidth:     1,
        borderColor:     accent,
        backgroundColor: secondary,
        opacity,
        transform:       [{ scale }],
      }}
    />
  );
});

// ── المكوّن الرئيسي ──
const RippleBackground = memo(({ theme }) => {
  if (!theme?.isMist) return null;

  const cfg = MIST_CFG[theme.id];
  if (!cfg) return null;

  // 4 حلقات — أقطار متزايدة طبيعياً
  const rings = [
    { maxR: MAX_R * 0.55, delay: 0                    },
    { maxR: MAX_R * 0.70, delay: cfg.cycle * 0.25     },
    { maxR: MAX_R * 0.82, delay: cfg.cycle * 0.50     },
    { maxR: MAX_R * 0.92, delay: cfg.cycle * 0.75     },
  ];

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* خلفية الثيم */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.bg }]} />

      {/* الحلقات */}
      {rings.map((r, i) => (
        <RippleRing
          key={i}
          delay={r.delay}
          cycle={cfg.cycle}
          maxR={r.maxR}
          accent={cfg.accent}
          secondary={cfg.secondary}
        />
      ))}

      {/* نواة الضوء الثابتة */}
      <View
        pointerEvents="none"
        style={{
          position:        'absolute',
          left:            CX - SW * 0.055,
          top:             CY - SW * 0.055,
          width:           SW * 0.11,
          height:          SW * 0.11,
          borderRadius:    SW * 0.055,
          backgroundColor: cfg.light + '18',
          shadowColor:     cfg.accent,
          shadowOffset:    { width: 0, height: 0 },
          shadowOpacity:   0.9,
          shadowRadius:    SW * 0.07,
          elevation:       0,
        }}
      />

      {/* ضباب ناعم */}
      <View
        pointerEvents="none"
        style={{
          position:        'absolute',
          left: 0, right: 0,
          top:             SH * 0.30,
          height:          SH * 0.40,
          backgroundColor: '#ffffff04',
        }}
      />
    </View>
  );
});

export default RippleBackground;
