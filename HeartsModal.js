/**
 * HeartsModal.js — مُصلَح
 * ✅ زر الإغلاق يعمل (overlay قابل للضغط)
 * ✅ ScrollView بداخل sheet فقط — الهيدر ثابت دائماً
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Modal, View, Text, TouchableOpacity, Pressable,
  StyleSheet, ScrollView, Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HeartIcon     from './HeartIcon';
import ChargingHeart from './ChargingHeart';
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
  visible, onClose,
  hearts, setHearts,
  tokens, setTokens,
  adsLeft, setAdsLeft,
  onAdWatched,
}) {
  const { theme } = useTheme();

  const [countdown,  setCountdown]  = useState(null);
  const [buying,     setBuying]     = useState(false);
  const [watchingAd, setWatchingAd] = useState(false);
  const [isPro,      setIsPro]      = useState(false);
  const [bonusCount, setBonusCount] = useState(0);
  const [infoMsg,    setInfoMsg]    = useState(null);

  const scaleAnim = useRef(new Animated.Value(1)).current;
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
    const interval = setInterval(() => getRefillCountdown().then(setCountdown), 30000);
    return () => clearInterval(interval);
  }, [visible]);

  const handleWatchAd = async () => {
    if (adsLeft <= 0 && !isPro) {
      setInfoMsg(`وصلت الحد اليومي — ${HEARTS_CONFIG.maxAdDaily} إعلانات/يوم`);
      return;
    }
    setWatchingAd(true);
    setTimeout(async () => {
      const result = await earnHeartFromAd(isPro);
      if (result.success) {
        setHearts(result.hearts);
        if (!isPro) setAdsLeft(result.adsLeft);
        setBonusCount(prev => prev + 1);
        bounceHeart();
        playSound('reward_heart_ad');
        if (onAdWatched) onAdWatched();
      }
      setWatchingAd(false);
    }, 2500);
  };

  const handleBuy = async (pkg) => {
    if (buying) return;
    if (tokens < pkg.tokens) {
      setInfoMsg(`رصيد غير كافٍ — تحتاج ${pkg.tokens} 🪙`);
      return;
    }
    setBuying(true);
    const result = await buyHeartsWithTokens(pkg.tokens, pkg.hearts, tokens);
    if (result.success) {
      setHearts(result.hearts);
      setTokens(result.tokens);
      bounceHeart();
      playSound('reward_heart_refresh');
    }
    setBuying(false);
  };

  const heartColor = hearts === 0 ? '#888' : hearts <= 1 ? '#ef4444' : '#f87171';
  const heartsDisplay = isPro ? '∞' : `${hearts + bonusCount}`;

  const renderHeartDots = () => {
    const displayCount = 3; // دائماً 3 قلوب بصرياً
    const actualFilled = hearts + bonusCount;
    const filledDots   = Math.min(actualFilled, displayCount);
    const isCharging   = actualFilled < HEARTS_CONFIG.maxFreeDaily;
    const extraCount   = actualFilled > displayCount ? actualFilled - displayCount : 0;

    return (
      <View style={styles.heartDots}>
        {[...Array(displayCount)].map((_, i) => (
          i < filledDots - (isCharging && i === filledDots - 1 ? 1 : 0)
            ? <HeartIcon key={i} size={28} filled animated={i === filledDots - 1 && !isCharging} />
            : i === filledDots && isCharging
              ? <ChargingHeart key={i} size={28} progress={0.3} />
              : i < filledDots
                ? <HeartIcon key={i} size={28} filled animated={i === filledDots - 1} />
                : <HeartIcon key={i} size={28} filled={false} />
        ))}
        {extraCount > 0 && (
          <Text style={[styles.extraHearts, { color: heartColor }]}>+{extraCount}</Text>
        )}
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {/* Overlay — يُغلق عند الضغط خارج الشيت */}
      <Pressable style={styles.overlay} onPress={onClose}>
        {/* Sheet — يمنع انتشار الضغط للـ overlay */}
        <Pressable style={[styles.sheet, { backgroundColor: theme.bgCard, borderColor: theme.accentBorder }]}>

          {/* ── هيدر ثابت — دائماً ظاهر ── */}
          <View style={styles.headerRow}>
            <Text style={[styles.sheetTitle, { color: theme.accent }]}>❤️ القلوب</Text>
            <ExitButton onPress={onClose} size={32}
            </TouchableOpacity>
          </View>

          {/* ── عداد القلوب ── */}
          <View style={[styles.heartsBox, { backgroundColor: theme.bgInput, borderColor: heartColor + '40' }]}>
            <Animated.View style={{ transform: [{ scale: scaleAnim }], alignItems: 'center' }}>
              <HeartIcon
                size={72}
                filled={hearts > 0 || isPro}
                animated
                pulseWhenZero
                hearts={hearts}
                pro={isPro}
                glow
              />
              <Text style={[styles.heartsNumber, { color: heartColor, marginTop: 6 }]}>
                {heartsDisplay}
              </Text>
            </Animated.View>

            {infoMsg && (
            <View style={[styles.infoBanner, { backgroundColor: theme.error + '18', borderColor: theme.error + '44' }]}>
              <Text style={[styles.infoTxt, { color: theme.error }]}>{infoMsg}</Text>
              <TouchableOpacity onPress={() => setInfoMsg(null)} hitSlop={{top:8,bottom:8,left:8,right:8}}>
                <Text style={{ color: theme.error, fontSize: 14 }}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
          {!isPro && renderHeartDots()}

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
                يتجدد قلب كل {HEARTS_CONFIG.refillHours} ساعات
              </Text>
            )}
          </View>

          {/* ── المحتوى القابل للتمرير ── */}
          <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 14 }}>

            {/* إعلان → قلب */}
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
                    <Text style={[styles.sectionSub, { color: '#f59e0b' }]}>لا حد يومي للـ Pro 🤑</Text>
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

            {/* شراء بالتوكنز */}
            <Text style={[styles.groupLabel, { color: theme.textMuted }]}>شراء بالتوكنز 🪙 {tokens}</Text>
            <View style={styles.packagesGrid}>
              {HEART_PACKAGES.map(pkg => {
                const canAfford = tokens >= pkg.tokens;
                return (
                  <TouchableOpacity
                    key={pkg.tokens}
                    style={[
                      styles.pkgCard,
                      { backgroundColor: theme.bgCard, borderColor: canAfford ? heartColor + '55' : theme.borderCard },
                      !canAfford && { opacity: 0.5 },
                      buying && { opacity: 0.6 },
                    ]}
                    onPress={() => handleBuy(pkg)}
                    disabled={buying || !canAfford}
                    activeOpacity={0.8}
                  >
                    <View style={{ flexDirection: 'row', gap: 2 }}>
                      {[...Array(Math.min(pkg.hearts, 5))].map((_, i) => (
                        <HeartIcon key={i} size={18} filled glow={false} />
                      ))}
                    </View>
                    <Text style={[styles.pkgCount, { color: heartColor }]}>+{pkg.hearts} قلوب</Text>
                    <View style={[styles.pkgPrice, { backgroundColor: theme.accent + '22', borderColor: theme.accent }]}>
                      <Text style={[styles.pkgPriceText, { color: theme.accent }]}>🪙 {pkg.tokens}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Pro */}
            <TouchableOpacity
              style={[styles.proCard, { backgroundColor: '#f59e0b0e', borderColor: '#f59e0b55' }]}
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

            <View style={{ height: 24 }} />
          </ScrollView>

        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:         { flex: 1, backgroundColor: '#000000eb', justifyContent: 'flex-end' },
  sheet:           { borderTopLeftRadius: 30, borderTopRightRadius: 30, borderWidth: 1, padding: 24, paddingBottom: 0, maxHeight: '90%' },
  headerRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sheetTitle:      { fontSize: 20, fontWeight: '900' },
  closeBtnWrap:    { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  closeBtn:        { fontSize: 20, fontWeight: '700' },
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
  groupLabel:      { fontSize: 12, fontWeight: '700', marginBottom: 10, letterSpacing: 0.5 },
  packagesGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  pkgCard:         { width: '47.5%', borderRadius: 16, borderWidth: 1.5, padding: 14, alignItems: 'center', gap: 6 },
  pkgHearts:       { fontSize: 20 },
  pkgCount:        { fontSize: 15, fontWeight: '800' },
  pkgPrice:        { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  pkgPriceText:    { fontSize: 13, fontWeight: '800' },
  proCard:         { borderRadius: 20, borderWidth: 1.5, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  proCardLeft:     { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  proCardEmoji:    { fontSize: 28 },
  proCardTitle:    { fontSize: 16, fontWeight: '900' },
  proCardSub:      { fontSize: 12, marginTop: 2 },
  proCardBadge:    { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14 },
  proCardBadgeText:{ fontSize: 13, fontWeight: '900', color: '#000' },
  infoBanner:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 10, padding: 10, borderWidth: 1, width: '100%' },
  infoTxt:         { fontSize: 12, fontWeight: '700', flex: 1 },
});
