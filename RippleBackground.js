/**
 * RippleBackground.js
 * موجات ماء متحركة لثيمات Mist — خفيفة، لا تتراكم، لا تسبب crash
 * تُستخدم داخل كل شاشة مباشرة (وليس في ThemeProvider)
 */

import React, { useEffect, useRef, memo } from 'react';
import { Animated, Easing, StyleSheet, View ,
  useWindowDimensions} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';


const MIST_CFG = {
  truemist:   { accent: '#8898a8', secondary: 'rgba(104,120,144,0.25)', light: '#b0c0d0', cycle: 20000, gradients: ['#e8eaec', '#d8dcdf'] },
  bluemist:   { accent: '#5878d0', secondary: 'rgba(56,88,176,0.20)',   light: '#8aabf0', cycle: 18000, gradients: ['#121e3e', '#0a1228'] },
  greenmist:  { accent: '#3a9058', secondary: 'rgba(40,96,64,0.20)',    light: '#60b878', cycle: 19000, gradients: ['#0e2418', '#071510'] },
  orangemist: { accent: '#c05814', secondary: 'rgba(152,64,16,0.18)',   light: '#e07838', cycle: 17000, gradients: ['#1a0c02', '#0e0a04'] },
  blackmist:  { accent: '#607080', secondary: 'rgba(72,88,104,0.15)',   light: '#8090a0', cycle: 22000, gradients: ['#0e0a08', '#080504'] },
};

const CX = W * 0.5;
const CY = H * 0.42;
const MAX_R = W * 0.88;

// حلقة واحدة خفيفة — useNativeDriver دائماً
const RippleRing = memo(({ delay, cycle, size, accent, secondary }) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, {
          toValue: 1,
          duration: cycle,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.05, 1] });
  const opacity = anim.interpolate({ inputRange: [0, 0.1, 0.6, 1], outputRange: [0, 0.45, 0.12, 0] });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: CX - size,
        top:  CY - size,
        width:  size * 2,
        height: size * 2,
        borderRadius: size,
        borderWidth: 1,
        borderColor: accent,
        opacity,
        transform: [{ scale }],
      }}
    />
  );
});

// نواة الضوء — كرة صغيرة بلون مغاير
const MistCore = memo(({ accent, light }) => (
  <View
    pointerEvents="none"
    style={{
      position: 'absolute',
      left: CX - 18,
      top:  CY - 18,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: light + '28',
      shadowColor: accent,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: W * 0.06,
      elevation: 0,
    }}
  />
));

const RippleBackground = memo(({ theme }) => {
  if (!theme?.isMist) return null;
  const cfg = MIST_CFG[theme.id];
  if (!cfg) return null;

  const rings = [
    { size: MAX_R * 0.45, delay: 0 },
    { size: MAX_R * 0.62, delay: cfg.cycle * 0.25 },
    { size: MAX_R * 0.78, delay: cfg.cycle * 0.50 },
    { size: MAX_R * 0.92, delay: cfg.cycle * 0.75 },
  ];

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* خلفية gradient */}
      <LinearGradient
        colors={cfg.gradients}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
      />

      {/* الحلقات */}
      {rings.map((r, i) => (
        <RippleRing
          key={i}
          delay={r.delay}
          cycle={cfg.cycle}
          size={r.size}
          accent={cfg.accent}
          secondary={cfg.secondary}
        />
      ))}

      {/* نواة الضوء — كرة بلون مغاير */}
      <MistCore accent={cfg.accent} light={cfg.light} />

      {/* ضباب ناعم */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0, right: 0,
          top: H * 0.28,
          height: H * 0.44,
          backgroundColor: '#ffffff03',
        }}
      />
    </View>
  );
});

export default RippleBackground;
