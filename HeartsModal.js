/**
 * HeartsModal.js — نافذة القلوب الكاملة
 * ════════════════════════════════════════════════
 *  ✅ عدد القلوب الحالي مع أنيميشن
 *  ✅ عداد تنازلي حتى تجدد القلب
 *  ✅ زر مشاهدة إعلان ← قلب (5/يوم)
 *  ✅ شراء قلوب بالتوكنز (4 باقات)
 *  ✅ اشتراك Pro → ∞ قلوب
 *  ✅ أصوات reward عند كل حالة
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Modal, View, Text, TouchableOpacity,
  StyleSheet, ScrollView, Animated, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from './ThemeContext';
import {
  earnHeartFromAd,
  buyHeartsWithTokens,
  getRefillCountdown,
  HEART_PACKAGES,
  HEARTS_CONFIG,
} from './HeartsService';
import { playSound } from './SoundService';

const PRO_KEY = 'arena_is_pro';

export default function HeartsModal({
  visible,
  onClose,
  hearts,
  setHearts,
  tokens,
  setTokens,
  adsLeft,
  setAdsLeft,
  onAdWatched,
}) {
  const { theme } = useTheme();

  const [countdown,   setCountdown]   = useState(null);
  const [buying,      setBuying]      = useState(false);
  const [watchingAd,  setWatchingAd]  = useState(false);
  const [isPro,       setIsPro]       = useState(false);
  const [bonusCount,  setBonusCount]  = useState(0);

  const scaleAnim  = useRef(new Animated.Value(1)).current;
  const bounceHeart = useCallback(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1.3, friction: 4, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1,   friction: 5, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (!visible) return;
    AsyncStorage.getItem(PRO_KEY).then(v => setIsPro(v === 'true'));
    getRefillCountdown().then(setCountdown);
    const interval = setInterval(() => {
      getRefillCountdown().then(setCountdown);
    }, 30000);
    return () => clearInterval(interval);
  }, [visible]);

  // ── مشاهدة إعلان ──
  const handleWatchAd = async () => {
    if (adsLeft <= 0 && !isPro) {
      Alert.alert('وصلت الحد اليومي', `${HEARTS_CONFIG.maxAdDaily} إعلانات للقلوب/يوم`);
      return;
    }

    setWatchingAd(true);

    setTimeout(async () => {
      if (isPro) {
        setBonusCount(prev => prev + 1);
        bounceHeart();
        playSound('reward_heart_ad');
        setWatchingAd(false);
        Alert.alert('❤️ +1', 'قلب مجاني للـ Pro!\nشكراً على مشاهدة الإعلان 🤑', [{ text: 'يلا!' }]);
      } else {
        const result = await earnHeartFromAd();
        setWatchingAd(false);
        if (result.success) {
          setHearts(result.hearts);
          setAdsLeft(result.adsLeft);
          bounceHeart();
          playSound('reward_heart_ad');
          if (onAdWatched) onAdWatched();
        } else {
          Alert.alert('وصلت الحد', `${HEARTS_CONFIG.maxAdDaily} إعلانات/يوم للقلوب`);
        }
      }
    }, 2500);
  };

  // ── شراء بالتوكنز ──
  const handleBuy = async (pkg) => {
    if (tokens < pkg.tokens) {
      Alert.alert('توكنز غير كافية', `تحتاج 🪙 ${pkg.tokens}`);
      return;
    }
    setBuying(pkg.id);
    const result = await buyHeartsWithTokens(pkg.id, tokens, hearts);
    setBuying(false);
    if (result.success) {
      setHearts(result.hearts);
      setTokens(result.tokens);
      bounceHeart();
      playSound('reward_tokens');
    }
  };

  const heartsDisplay = isPro
    ? `∞${bonusCount > 0 ? `+${bonusCount}` : ''}`
    : String(hearts);

  const heartColor = (isPro || hearts > 0) ? '#ef4444' : '#6b7280';
  const heartEmoji = (isPro || hearts > 0) ? '❤️' : '🖤';

  const renderHeartDots = () => {
    if (isPro) return null;
    const max = Math.max(hearts, HEARTS_CONFIG.maxFreeDaily);
    return (
      <View style={styles.heartDots}>
        {[...Array(max)].map((_, i) => (
          <Text key={i} style={styles.heartDot}>
            {i < hearts ? '❤️' : '🖤'}
          </Text>
        ))}
        {hearts > HEARTS_CONFIG.maxFreeDaily && (
          <Text style={[styles.extraHearts, { color: heartColor }]}>+{hearts - HEARTS_CONFIG.maxFreeDaily}</Text>
        )}
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: theme.bgCard, borderColor: theme.accentBorder }]}>

          <View style={styles.headerRow}>
            <Text style={[styles.sheetTitle, { color: theme.accent }]}>القلوب</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text style={[styles.closeBtn, { color: theme.textMuted }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.heartsBox, { backgroundColor: theme.bgInput, borderColor: heartColor + '40' }]}>
            <Animated.Text style={[
              styles.heartsNumber,
              { color: heartColor, transform: [{ scale: scaleAnim }] },
            ]}>
              {heartEmoji} {heartsDisplay}
            </Animated.Text>

            {renderHeartDots()}

            {isPro && (
              <View style={[styles.proBadge, { backgroundColor: '#f59e0b22', borderColor: '#f59e0b55' }]}>
                <Text style={[styles.proText, { color: '#f59e0b' }]}>👑 Pro — قلوب لا محدودة</Text>
              </View>
            )}

            {!isPro && hearts < HEARTS_CONFIG.maxFreeDaily && countdown && (
              <View style={[styles.countdownRow, { backgroundColor: theme.bgCard }]}>
                <Text style={styles.countdownEmoji}>⏰</Text>
                <Text style={[styles.countdownText, { color: theme.textMuted }]}>
                  قلب جديد بعد {countdown}
                </Text>
              </View>
            )}

            {!isPro && (
              <Text style={[styles.refillNote, { color: theme.textMuted }]}>
                {HEARTS_CONFIG.maxFreeDaily} قلوب مجانية يومياً · تجديد كل {HEARTS_CONFIG.refillHours} ساعات
              </Text>
            )}
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 16 }}>

            <View style={[styles.section, { backgroundColor: theme.bgInput, borderColor: theme.success + '33' }]}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionEmoji}>📺</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sectionTitle, { color: theme.success }]}>
                    {isPro ? 'شاهد إعلاناً ← ❤️ +1 (∞ مجاني!)' : 'شاهد إعلاناً ← ❤️ +1 مجاناً'}
                  </Text>
                  {!isPro && (
                    <Text style={[styles.sectionSub, { color: theme.textMuted }]}>
                      متبقي اليوم: {adsLeft}/{HEARTS_CONFIG.maxAdDaily}
                    </Text>
                  )}
                  {isPro && (
                    <Text style={[styles.sectionSub, { color: '#f59e0b' }]}>
                      لا حد يومي للـ Pro 🤑
                    </Text>
                  )}
                </View>
              </View>
              <TouchableOpacity
                style={[
                  styles.adBtn,
                  { backgroundColor: theme.success },
                  (watchingAd || (!isPro && adsLeft <= 0)) && { backgroundColor: theme.bgElevated },
                ]}
                onPress={handleWatchAd}
                disabled={watchingAd || (!isPro && adsLeft <= 0)}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.adBtnText,
                  { color: '#fff' },
                  (watchingAd || (!isPro && adsLeft <= 0)) && { color: theme.textMuted },
                ]}>
                  {watchingAd ? '⏳ جاري الإعلان...' : (!isPro && adsLeft <= 0) ? '✋ حد اليوم' : '▶️ شاهد الآن'}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.groupLabel, { color: theme.textMuted }]}>شراء بالتوكنز 🪙 {tokens}</Text>
            <View style={styles.packagesGrid}>
              {HEART_PACKAGES.map(pkg => {
                const canAfford = tokens >= pkg.tokens;
                return (
                  <TouchableOpacity
                    key={pkg.id}
                    style={[
                      styles.pkgCard,
                      {
                        backgroundColor: canAfford ? theme.bgInput : theme.bgElevated,
                        borderColor: canAfford ? '#ef444440' : theme.border,
                      },
                    ]}
                    onPress={() => handleBuy(pkg)}
                    disabled={!!buying || !canAfford}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.pkgHearts}>{'❤️'.repeat(Math.min(pkg.hearts, 5))}{pkg.hearts > 5 ? `×${pkg.hearts}` : ''}</Text>
                    <Text style={[styles.pkgCount, { color: canAfford ? '#ef4444' : theme.textMuted }]}>
                      {pkg.hearts} {pkg.hearts === 1 ? 'قلب' : 'قلوب'}
                    </Text>
                    <View style={[
                      styles.pkgPrice,
                      { backgroundColor: canAfford ? '#ef444418' : theme.bgElevated, borderColor: canAfford ? '#ef444433' : theme.border },
                    ]}>
                      <Text style={[styles.pkgPriceText, { color: canAfford ? '#ef4444' : theme.textMuted }]}>
                        🪙 {pkg.tokens}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[styles.proCard, { backgroundColor: '#f59e0b18', borderColor: '#f59e0b55' }]}
              onPress={() => Alert.alert('👑 Pro', 'الاشتراك سيكون متاحاً عند الإطلاق الرسمي', [{ text: 'حسناً' }])}
              activeOpacity={0.85}
            >
              <View style={styles.proCardLeft}>
                <Text style={styles.proCardEmoji}>👑</Text>
                <View>
                  <Text style={[styles.proCardTitle, { color: '#f59e0b' }]}>اشتراك Pro</Text>
                  <Text style={[styles.proCardSub, { color: theme.textMuted }]}>
                    ∞ قلوب · بدون إعلانات · كل الثيمات
                  </Text>
                </View>
              </View>
              <View style={[styles.proCardBadge, { backgroundColor: '#f59e0b' }]}>
                <Text style={styles.proCardBadgeText}>4.99$/شهر</Text>
              </View>
            </TouchableOpacity>

            <View style={{ height: 20 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:         { flex: 1, backgroundColor: '#000000aa', justifyContent: 'flex-end' },
  sheet:           { borderTopLeftRadius: 30, borderTopRightRadius: 30, borderWidth: 1, padding: 24, paddingBottom: 16, maxHeight: '90%' },
  headerRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sheetTitle:      { fontSize: 22, fontWeight: '900' },
  closeBtn:        { fontSize: 22, fontWeight: '600', padding: 4 },
  heartsBox:       { borderRadius: 20, borderWidth: 1.5, padding: 20, alignItems: 'center', gap: 10 },
  heartsNumber:    { fontSize: 52, fontWeight: '900' },
  heartDots:       { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap', justifyContent: 'center' },
  heartDot:        { fontSize: 22 },
  extraHearts:     { fontSize: 16, fontWeight: '800', marginLeft: 4 },
  proBadge:        { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  proText:         { fontSize: 13, fontWeight: '800' },
  countdownRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14 },
  countdownEmoji:  { fontSize: 16 },
  countdownText:   { fontSize: 13, fontWeight: '600' },
  refillNote:      { fontSize: 11, textAlign: 'center', lineHeight: 16 },
  section:         { borderRadius: 18, borderWidth: 1, padding: 14, gap: 10, marginBottom: 12 },
  sectionHeader:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionEmoji:    { fontSize: 28 },
  sectionTitle:    { fontSize: 15, fontWeight: '800' },
  sectionSub:      { fontSize: 12, marginTop: 2 },
  adBtn:           { borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  adBtnText:       { fontSize: 15, fontWeight: '800' },
  groupLabel:      { fontSize: 12, fontWeight: '700', marginBottom: 10, letterSpacing: 0.5, textTransform: 'uppercase' },
  packagesGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  pkgCard:         { width: '47.5%', borderRadius: 16, borderWidth: 1.5, padding: 14, alignItems: 'center', gap: 6 },
  pkgHearts:       { fontSize: 20 },
  pkgCount:        { fontSize: 15, fontWeight: '800' },
  pkgPrice:        { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  pkgPriceText:    { fontSize: 13, fontWeight: '800' },
  proCard:         { borderRadius: 20, borderWidth: 1.5, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  proCardLeft:     { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  proCardEmoji:    { fontSize: 28 },
  proCardTitle:    { fontSize: 16, fontWeight: '900' },
  proCardSub:      { fontSize: 12, marginTop: 2 },
  proCardBadge:    { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14 },
  proCardBadgeText:{ fontSize: 13, fontWeight: '900', color: '#000' },
});
