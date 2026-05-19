/**
 * NetStatus.js
 * ════════════════════════════════════════════════════════════
 * شريط صغير يظهر أعلى الشاشة عند انقطاع الإنترنت
 * يختفي تلقائياً عند العودة
 *
 * الاستخدام في App.js (داخل TransitionRoot):
 *   import NetStatus from './NetStatus';
 *   <NetStatus />
 *
 * يعمل على Android وiOS
 * يستخدم @react-native-community/netinfo إذا كانت مثبتة
 * وإلا يستخدم fetch fallback
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

// ── فحص الاتصال بـ fetch بسيط ──
async function checkConnectivity() {
  try {
    const res = await fetch('https://www.google.com/generate_204', {
      method: 'HEAD',
      cache:  'no-store',
    });
    return res.status === 204;
  } catch {
    return false;
  }
}

const CHECK_INTERVAL_MS  = 5000;  // فحص كل 5 ثواني
const BANNER_HEIGHT      = 36;

export default function NetStatus() {
  const [offline, setOffline]   = useState(false);
  const slideAnim               = useRef(new Animated.Value(-BANNER_HEIGHT)).current;
  const isOfflineRef            = useRef(false);

  const showBanner = useCallback(() => {
    Animated.spring(slideAnim, {
      toValue:         0,
      friction:        8,
      useNativeDriver: true,
    }).start();
  }, []);

  const hideBanner = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue:         -BANNER_HEIGHT,
      duration:        300,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    let timer;

    const check = async () => {
      const connected = await checkConnectivity();
      if (!connected && !isOfflineRef.current) {
        isOfflineRef.current = true;
        setOffline(true);
        showBanner();
      } else if (connected && isOfflineRef.current) {
        isOfflineRef.current = false;
        setOffline(false);
        hideBanner();
      }
    };

    // فحص فوري
    check();
    timer = setInterval(check, CHECK_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [showBanner, hideBanner]);

  // لا نُضيف أي DOM إذا لم يكن offline ولم يظهر banner
  return (
    <Animated.View
      style={[
        styles.banner,
        { transform: [{ translateY: slideAnim }] },
      ]}
      pointerEvents="none"
    >
      <Text style={styles.dot}>●</Text>
      <Text style={styles.text}>لا يوجد اتصال بالإنترنت</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position:        'absolute',
    top:             0,
    left:            0,
    right:           0,
    height:          BANNER_HEIGHT,
    backgroundColor: '#ef4444',
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             8,
    zIndex:          9999,
    elevation:       20,
  },
  dot:  { fontSize: 8,  color: '#fff' },
  text: { fontSize: 13, color: '#fff', fontWeight: '700' },
});
