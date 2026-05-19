import { useEffect, useRef, memo } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useTheme } from './ThemeContext';
import { useT } from './I18n';
import { playSound } from './SoundService';

const REWARDS    = { 1: 10, 2: 10, 3: 10, 4: 15, 5: 20, 6: 25, 7: 30 };
const DAYS_ARRAY = [1, 2, 3, 4, 5, 6, 7];

function getDay(streak) { return ((streak - 1) % 7) + 1; }

const DayBox = memo(({ d, isToday, isPast, theme, t }) => (
  <View style={[
    styles.dayBox,
    { backgroundColor: theme.bgElevated, borderColor: theme.borderCard },
    isPast  && { backgroundColor: theme.success + '18', borderColor: theme.success + '44' },
    isToday && { backgroundColor: '#2a2200', borderColor: theme.accent, borderWidth: 2 },
  ]}>
    <Text style={[styles.dayReward, { color: theme.textMuted }, isToday && { color: theme.accent }]}>
      {REWARDS[d]}🪙
    </Text>
    <Text style={[styles.dayNum, { color: theme.textMuted }, isToday && { color: theme.accent }]}>
      {d === 7 ? t('daily.day7') : `${d}`}
    </Text>
    {isPast  && <Text style={styles.doneCheck}>✓</Text>}
    {isToday && <View style={[styles.todayDot, { backgroundColor: theme.accent }]} />}
  </View>
));

export default function DailyRewardModal({ visible, streak, reward, onClaim }) {
  const { theme } = useTheme();
  const t = useT();

  const scaleAnim   = useRef(new Animated.Value(0.7)).current;
  const coinAnim    = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0.2)).current;
  const glowLoop    = useRef(null);

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0.7);
      coinAnim.setValue(0);
      glowOpacity.setValue(0.2);
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 100, useNativeDriver: true }),
        Animated.timing(coinAnim,  { toValue: 1, duration: 500, delay: 200, useNativeDriver: true }),
      ]).start();
      glowLoop.current = Animated.loop(Animated.sequence([
        Animated.timing(glowOpacity, { toValue: 0.9, duration: 900, useNativeDriver: true }),
        Animated.timing(glowOpacity, { toValue: 0.2, duration: 900, useNativeDriver: true }),
      ]));
      glowLoop.current.start();
      // صوت ظهور المكافأة اليومية
      playSound('reward_task');
    } else {
      glowLoop.current?.stop();
    }
    return () => glowLoop.current?.stop();
  }, [visible]);

  const currentDay = getDay(streak);
  const coinScale  = coinAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <Animated.View style={[
          styles.card,
          { backgroundColor: theme.bgCard, borderColor: theme.accentBorder, transform: [{ scale: scaleAnim }] },
        ]}>
          <Text style={styles.emoji}>🎁</Text>
          <Text style={[styles.title, { color: theme.accent }]}>{t('daily.title')}</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {currentDay === 1 && streak > 1 ? t('daily.resetSub') : t('daily.subtitle')}
          </Text>

          <View style={styles.daysRow}>
            {DAYS_ARRAY.map(d => (
              <DayBox key={d} d={d} isToday={d === currentDay} isPast={d < currentDay} theme={theme} t={t} />
            ))}
          </View>

          <View style={styles.rewardBoxOuter}>
            <Animated.View style={[styles.rewardGlow, { opacity: glowOpacity }]} />
            <View style={[styles.rewardBox, { backgroundColor: theme.bgElevated, borderColor: `${theme.accent}66` }]}>
              <Animated.Text style={[styles.rewardCoin, { transform: [{ scale: coinScale }] }]}>🪙</Animated.Text>
              <Text style={[styles.rewardAmount, { color: theme.accent }]}>+{reward}</Text>
              <Text style={[styles.rewardLabel, { color: theme.textSecondary }]}>{t('daily.token')}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.claimBtn, { backgroundColor: theme.accent }]}
            onPress={onClaim}
            activeOpacity={0.85}
          >
            <Text style={[styles.claimText, { color: theme.textOnAccent }]}>{t('daily.claim')}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:        { flex: 1, backgroundColor: '#00000099', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card:           { borderRadius: 28, padding: 24, width: '100%', alignItems: 'center', gap: 14, borderWidth: 1.5, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 12 },
  emoji:          { fontSize: 52 },
  title:          { fontSize: 26, fontWeight: '900', letterSpacing: 1 },
  subtitle:       { fontSize: 13, textAlign: 'center' },
  daysRow:        { flexDirection: 'row', gap: 5, width: '100%', justifyContent: 'center' },
  dayBox:         { flex: 1, borderRadius: 12, alignItems: 'center', paddingVertical: 8, gap: 4, borderWidth: 1, minWidth: 38 },
  dayReward:      { fontSize: 9, fontWeight: '700' },
  dayNum:         { fontSize: 11, fontWeight: '800' },
  doneCheck:      { color: '#4aff4a', fontSize: 10, fontWeight: '900' },
  todayDot:       { width: 6, height: 6, borderRadius: 3, marginTop: 1 },
  rewardBoxOuter: { position: 'relative', borderRadius: 20, overflow: 'hidden' },
  rewardGlow:     { ...StyleSheet.absoluteFillObject, borderRadius: 20 },
  rewardBox:      { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 20, paddingVertical: 16, paddingHorizontal: 28, borderWidth: 2, margin: 2 },
  rewardCoin:     { fontSize: 38 },
  rewardAmount:   { fontSize: 44, fontWeight: '900' },
  rewardLabel:    { fontSize: 16, fontWeight: '700', marginTop: 8 },
  claimBtn:       { paddingVertical: 16, paddingHorizontal: 40, borderRadius: 18, width: '100%', alignItems: 'center', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 8 },
  claimText:      { fontSize: 18, fontWeight: '900' },
});
