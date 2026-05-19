/**
 * ScreenTransition.js
 * ════════════════════════════════════════════════════════════
 *
 *  يحل 3 مشاكل دفعة واحدة:
 *
 *  1. Keep-Alive للشاشات الرئيسية
 *     home / games / knowledge / friends لا تُدمَّر عند الانتقال
 *     بل تختفي بـ display:none — تحتفظ بـ state، animation، Firebase listeners
 *
 *  2. Fade transition ناعم 180ms بين كل شاشة
 *     بدل القفز المفاجئ الحالي
 *
 *  3. Lazy mount لشاشات الألعاب
 *     شاشة اللعبة لا تُنشَأ حتى يزورها المستخدم أول مرة
 *     بعدها تبقى مُهيَّأة ما دام في اللعبة
 *
 *  الاستخدام في App.js:
 *  ─────────────────────
 *  import { KeepAliveScreen, useScreenTransition } from './ScreenTransition';
 *
 *  // بدل:   if (screen === 'home') return <HomeScreen />
 *  // اكتب:
 *  <KeepAliveScreen active={screen === 'home'}>
 *    <HomeScreen {...props} />
 *  </KeepAliveScreen>
 *
 *  // للانتقالات:
 *  const { transitionStyle } = useScreenTransition(screen);
 *  <Animated.View style={[{flex:1}, transitionStyle]}>
 *    { ... screen content ... }
 *  </Animated.View>
 */

import {
  useRef, useEffect, useState, useCallback, memo,
} from 'react';
import { View, Animated, StyleSheet } from 'react-native';

// ════════════════════════════════════════════════════════════
//  KeepAliveScreen
//  يُبقي الشاشة في الـ tree لكن يخفيها بـ display:none
//  → لا re-mount، لا فقدان state، لا إعادة Firebase listeners
// ════════════════════════════════════════════════════════════
export const KeepAliveScreen = memo(function KeepAliveScreen({ active, children, style }) {
  // نُنشئ الشاشة فور أول ظهور، ثم نبقيها دائماً
  const [mounted, setMounted] = useState(active);

  useEffect(() => {
    if (active && !mounted) setMounted(true);
  }, [active]);

  if (!mounted) return null;

  return (
    <View
      style={[StyleSheet.absoluteFill, style, { display: active ? 'flex' : 'none' }]}
      pointerEvents={active ? 'auto' : 'none'}
    >
      {children}
    </View>
  );
});

// ════════════════════════════════════════════════════════════
//  useScreenTransition
//  يُعطي Animated.Value جاهز لـ fade عند تغيير الشاشة
// ════════════════════════════════════════════════════════════
const FADE_DURATION = 180; // ms — سريع بما يكفي ليبدو سلساً

export function useScreenTransition(screen) {
  const fadeAnim   = useRef(new Animated.Value(1)).current;
  const prevScreen = useRef(screen);

  useEffect(() => {
    if (prevScreen.current === screen) return;
    prevScreen.current = screen;

    // fade out → fade in
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue:        0,
        duration:       FADE_DURATION * 0.4,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue:        1,
        duration:       FADE_DURATION * 0.6,
        useNativeDriver: true,
      }),
    ]).start();
  }, [screen]);

  return { transitionStyle: { opacity: fadeAnim } };
}

// ════════════════════════════════════════════════════════════
//  useLazyScreen
//  شاشة اللعبة: لا تُنشَأ حتى يُطلبها المستخدم
//  بعدها تبقى في memory ما دام active === true
//  عند active === false تنتظر DELAY_UNMOUNT ثم تُدمَّر (تحرير memory)
// ════════════════════════════════════════════════════════════
const DELAY_UNMOUNT_MS = 500; // ms بعد مغادرة شاشة اللعبة

export function useLazyScreen(active) {
  const [shouldRender, setShouldRender] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (active) {
      clearTimeout(timerRef.current);
      setShouldRender(true);
    } else {
      // تأخير التدمير — لإتاحة transition animation قبل الإزالة
      timerRef.current = setTimeout(() => {
        setShouldRender(false);
      }, DELAY_UNMOUNT_MS);
    }
    return () => clearTimeout(timerRef.current);
  }, [active]);

  return shouldRender;
}

// ════════════════════════════════════════════════════════════
//  TransitionRoot
//  يُغلّف المحتوى الكامل بـ fade transition
//  ضعه مباشرة في App.js بدل View العادي
// ════════════════════════════════════════════════════════════
export const TransitionRoot = memo(function TransitionRoot({ screen, children, style }) {
  const { transitionStyle } = useScreenTransition(screen);
  return (
    <Animated.View style={[{ flex: 1 }, transitionStyle, style]}>
      {children}
    </Animated.View>
  );
});
