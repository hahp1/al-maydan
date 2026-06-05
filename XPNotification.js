/**
 * XPNotification.js
 * ════════════════════════════════════════════════════════════
 * نظام إشعارات عالمي لـ XP — يظهر فوق كل شيء في التطبيق
 *
 * يعرض 3 أنواع:
 *  1. +XP toast    — "+30 XP ✨" يطير من الأسفل ويختفي
 *  2. Level up     — modal احتفالي عند الترقية
 *  3. Mission done — شريط أخضر صغير عند اكتمال مهمة
 *
 * الاستخدام:
 *  // في App.js — ضعه مرة واحدة داخل TransitionRoot:
 *  import { XPNotification, useXPNotify } from './XPNotification';
 *  const xpNotify = useXPNotify();
 *  <XPNotification ref={xpNotify} />
 *
 *  // عند نهاية اللعبة:
 *  const result = await recordOnlineGameEnd(...);
 *  xpNotify.current?.show(result);
 */

import {
  useRef, useImperativeHandle, forwardRef,
  useState, useCallback, useEffect,
} from 'react';
import {
  View, Text, Modal, TouchableOpacity,
  Animated, StyleSheet,
} from 'react-native';
import { useTheme } from './ThemeContext';
import { DAILY_MISSIONS_POOL } from './XPService';
import { ThemedButton, ThemedCard, ThemedPill, ThemedRow } from './ThemedComponents';

// ════════════════════════════════════════════════════════════
//  XP Toast — يطير لأعلى ويختفي بعد 1.8 ثانية
// ════════════════════════════════════════════════════════════
function XPToast({ xpGained, visible, onHide, theme }) {
  const opacity   = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    if (!visible) return;
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, friction: 7, useNativeDriver: true }),
      Animated.timing(opacity,    { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity,    { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: -20, duration: 300, useNativeDriver: true }),
        ]).start(onHide);
      }, 1500);
    });
  }, [visible]);

  if (!visible) return null;
  return (
    <Animated.View style={[
      styles.toast,
      { backgroundColor: theme.accent + 'ee', opacity, transform: [{ translateY }] },
    ]}>
      <Text style={[styles.toastText, { color: theme.bg }]}>+{xpGained} XP ✨</Text>
    </Animated.View>
  );
}

// ════════════════════════════════════════════════════════════
//  Mission Banner — شريط أخضر صغير في الأعلى
// ════════════════════════════════════════════════════════════
function MissionBanner({ missionId, visible, onHide, theme }) {
  const translateY = useRef(new Animated.Value(-60)).current;
  const mission    = DAILY_MISSIONS_POOL.find(m => m.id === missionId);

  useEffect(() => {
    if (!visible || !mission) return;
    Animated.spring(translateY, { toValue: 0, friction: 8, useNativeDriver: true }).start(() => {
      setTimeout(() => {
        Animated.timing(translateY, { toValue: -60, duration: 300, useNativeDriver: true }).start(onHide);
      }, 2200);
    });
  }, [visible, missionId]);

  if (!visible || !mission) return null;
  return (
    <Animated.View style={[styles.banner, { transform: [{ translateY }] }]}>
      <Text style={styles.bannerText}>✅ {mission.ar}</Text>
      <Text style={styles.bannerXP}>+{mission.xp} XP</Text>
    </Animated.View>
  );
}

// ════════════════════════════════════════════════════════════
//  Level Up Modal — احتفالي
// ════════════════════════════════════════════════════════════
function LevelUpModal({ data, onClose, theme }) {
  const scale   = useRef(new Animated.Value(0.5)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!data) return;
    Animated.parallel([
      Animated.spring(scale,   { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  }, [data]);

  if (!data) return null;
  return (
    <Modal transparent animationType="none" visible={!!data} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View style={[
          styles.levelCard,
          { backgroundColor: theme.bgCard, borderColor: theme.accent + '60',
            transform: [{ scale }], opacity },
        ]}>
          <Text style={styles.levelEmoji}>🏆</Text>
          <Text style={[styles.levelTitle, { color: theme.accent }]}>ترقية مستوى!</Text>
          <Text style={[styles.levelLabel, { color: theme.textPrimary }]}>{data.label}</Text>
          <Text style={[styles.levelNum,   { color: theme.textMuted }]}>المستوى {data.level}</Text>
          {data.levelReward > 0 && (
            <View style={[styles.rewardRow, { backgroundColor: theme.accent + '18' }]}>
              <Text style={[styles.rewardText, { color: theme.accent }]}>
                🪙 +{data.levelReward} توكن
              </Text>
            </View>
          )}
          <ThemedButton onPress={onClose} label='رائع! 🎉' variant='primary' size='large' style={styles.closeBtn} />
        </Animated.View>
      </View>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════
//  XPNotification — المكوّن الرئيسي
// ════════════════════════════════════════════════════════════
export const XPNotification = forwardRef(function XPNotification(_, ref) {
  const { theme } = useTheme();

  const [xpToast,     setXpToast]     = useState({ visible: false, xp: 0 });
  const [missionBanner, setMissionBanner] = useState({ visible: false, id: null });
  const [levelUpData, setLevelUpData] = useState(null);

  // Queue للمهام — يعرض واحدة تلو الأخرى
  const missionQueue = useRef([]);
  const showingMission = useRef(false);

  const showNextMission = useCallback(() => {
    if (showingMission.current || missionQueue.current.length === 0) return;
    showingMission.current = true;
    const id = missionQueue.current.shift();
    setMissionBanner({ visible: true, id });
  }, []);

  const handleMissionHide = useCallback(() => {
    setMissionBanner({ visible: false, id: null });
    showingMission.current = false;
    setTimeout(showNextMission, 200);
  }, [showNextMission]);

  // API عبر ref
  useImperativeHandle(ref, () => ({
    show: (result) => {
      if (!result) return;
      const { xpGained, leveledUp, level, label, levelReward, freshlyDone } = result;

      // XP toast
      if (xpGained > 0) {
        setXpToast({ visible: true, xp: xpGained });
      }

      // Level up modal
      if (leveledUp) {
        setLevelUpData({ level, label, levelReward: levelReward || 0 });
      }

      // Mission banners
      if (freshlyDone?.length > 0) {
        missionQueue.current.push(...freshlyDone);
        setTimeout(showNextMission, xpGained > 0 ? 400 : 0);
      }
    },
  }), [showNextMission]);

  return (
    <>
      <XPToast
        xpGained={xpToast.xp}
        visible={xpToast.visible}
        onHide={() => setXpToast(p => ({ ...p, visible: false }))}
        theme={theme}
      />
      <MissionBanner
        missionId={missionBanner.id}
        visible={missionBanner.visible}
        onHide={handleMissionHide}
        theme={theme}
      />
      <LevelUpModal
        data={levelUpData}
        onClose={() => setLevelUpData(null)}
        theme={theme}
      />
    </>
  );
});

// Hook مساعد للاستخدام في App.js
export function useXPNotify() {
  return useRef(null);
}

// ════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  // XP Toast
  toast: {
    position:        'absolute',
    bottom:          90,
    alignSelf:       'center',
    paddingHorizontal: 20,
    paddingVertical:  10,
    borderRadius:    24,
    zIndex:          9998,
    elevation:       19,
  },
  toastText: { fontSize: 15, fontWeight: '800' },

  // Mission Banner
  banner: {
    position:        'absolute',
    top:             0,
    left:            0,
    right:           0,
    height:          48,
    backgroundColor: '#16a34a',
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'space-between',
    paddingHorizontal: 16,
    zIndex:          9997,
    elevation:       18,
  },
  bannerText: { fontSize: 13, color: '#fff', fontWeight: '700', flex: 1 },
  bannerXP:   { fontSize: 13, color: '#bbf7d0', fontWeight: '800' },

  // Level Up Modal
  overlay: {
    flex:            1,
    backgroundColor: '#00000088',
    justifyContent:  'center',
    alignItems:      'center',
    padding:         32,
  },
  levelCard: {
    width:           '100%',
    maxWidth:        320,
    borderRadius:    24,
    borderWidth:     1.5,
    padding:         28,
    alignItems:      'center',
    gap:             10,
  },
  levelEmoji: { fontSize: 56 },
  levelTitle: { fontSize: 24, fontWeight: '900' },
  levelLabel: { fontSize: 20, fontWeight: '800' },
  levelNum:   { fontSize: 14 },
  rewardRow:  { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 12, marginTop: 4 },
  rewardText: { fontSize: 16, fontWeight: '800' },
  closeBtn:   { marginTop: 8, paddingHorizontal: 36, paddingVertical: 14, borderRadius: 16 },
  closeBtnText: { fontSize: 16, fontWeight: '800' },
});
