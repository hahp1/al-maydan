/**
 * TokenModal.js — محدّث
 * ════════════════════════════════════════════════
 *  ✅ MAX_ADS محدّث إلى 10 إعلانات/يوم للتوكنز
 *  ✅ AD_REWARD = 15 توكن لكل إعلان
 *  ✅ باقي الوظائف كما هي
 */

import { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from './ThemeContext';
import { useT } from './I18n';

const MAX_ADS   = 10;  // ✅ 10 إعلانات/يوم للتوكنز
const AD_REWARD = 15;  // ✅ 15 توكن لكل إعلان
const ADS_KEY   = 'almaydan_ads';

const PLANS = [
  { id: 'monthly',   icon: '🚀', nameKey: 'tokens.planMonthly',  subKey: 'tokens.planMonthlyAr',  durationKey: 'tokens.month6',   price: '$2.99'  },
  { id: 'sixmonths', icon: '⭐', nameKey: 'tokens.planSixMonths', subKey: 'tokens.planSixMonthsAr',durationKey: 'tokens.months6',  price: '$9.99'  },
  { id: 'yearly',    icon: '🏆', nameKey: 'tokens.planYearly',   subKey: 'tokens.planYearlyAr',   durationKey: 'tokens.year',     price: '$15.99' },
];

const PACKAGES = [
  { id: 'sm', labelKey: 'tokens.small',  amount: 100,  price: '0.99$' },
  { id: 'md', labelKey: 'tokens.medium', amount: 250,  price: '1.99$' },
  { id: 'lg', labelKey: 'tokens.large',  amount: 600,  price: '3.99$' },
  { id: 'xl', labelKey: 'tokens.xlarge', amount: 1500, price: '7.99$' },
];

export default function TokenModal({ visible, onClose, tokens, onAddTokens }) {
  const { theme } = useTheme();
  const t = useT();
  const [adsLeft,    setAdsLeft]    = useState(MAX_ADS);
  const [watchingAd, setWatchingAd] = useState(false);

  useEffect(() => { if (visible) loadAdsData(); }, [visible]);

  const loadAdsData = async () => {
    try {
      const raw = await AsyncStorage.getItem(ADS_KEY);
      if (raw) {
        const { date, count } = JSON.parse(raw);
        const today = new Date().toDateString();
        if (date === today) { setAdsLeft(MAX_ADS - count); }
        else {
          setAdsLeft(MAX_ADS);
          await AsyncStorage.setItem(ADS_KEY, JSON.stringify({ date: today, count: 0 }));
        }
      } else { setAdsLeft(MAX_ADS); }
    } catch (e) { console.error(e); }
  };

  const handleWatchAd = async () => {
    if (adsLeft <= 0) return;
    setWatchingAd(true);
    setTimeout(async () => {
      try {
        const today   = new Date().toDateString();
        const watched = MAX_ADS - adsLeft + 1;
        await AsyncStorage.setItem(ADS_KEY, JSON.stringify({ date: today, count: watched }));
        setAdsLeft(adsLeft - 1);
        onAddTokens(AD_REWARD);
        setWatchingAd(false);
        Alert.alert(t('tokens.congrats'), t('tokens.earned', { n: AD_REWARD }), [{ text: t('tokens.great') }]);
      } catch (e) { console.error(e); setWatchingAd(false); }
    }, 3000);
  };

  const handlePlan = (plan) => {
    Alert.alert(
      `${plan.icon} ${t(plan.nameKey)} ${t(plan.durationKey)}`,
      t('tokens.planMsg', { p: plan.price }),
      [{ text: t('common.ok') }]
    );
  };

  const handlePackage = (pkg) => {
    Alert.alert(
      `🪙 ${pkg.amount}`,
      t('tokens.pkgMsg', { p: pkg.price }),
      [{ text: t('common.ok') }]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: theme.bgCard, borderColor: theme.accentBorder }]}>

          <View style={[styles.header, { borderBottomColor: theme.divider }]}>
            <ExitButton onPress={onClose} size={34} />
            <Text style={[styles.title, { color: theme.textSecondary }]}>{t('tokens.title')}</Text>
            <Text style={[styles.balance, { color: theme.accent }]}>{tokens} 🪙</Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

            {/* إعلان للتوكنز */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.accent }]}>{t('tokens.watchAd')}</Text>
              <View style={[styles.adCard, { backgroundColor: theme.bgElevated, borderColor: theme.borderCard }]}>
                <View style={styles.adInfo}>
                  <Text style={[styles.adReward, { color: theme.textPrimary }]}>{t('tokens.reward', { n: AD_REWARD })}</Text>
                  <Text style={[styles.adCounter, { color: theme.textSecondary }]}>{t('tokens.adsLeft', { n: adsLeft, t: MAX_ADS })}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.adBtn, { backgroundColor: theme.accent }, (adsLeft <= 0 || watchingAd) && { backgroundColor: theme.bgElevated }]}
                  onPress={handleWatchAd}
                  disabled={adsLeft <= 0 || watchingAd}
                >
                  <Text style={[styles.adBtnText, { color: theme.textOnAccent }, (adsLeft <= 0 || watchingAd) && { color: theme.textMuted }]}>
                    {watchingAd ? t('tokens.watching') : adsLeft <= 0 ? t('tokens.tomorrow') : t('tokens.watch')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* ترقية */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.accent }]}>{t('tokens.upgradePremium')}</Text>
              <View style={styles.plansCol}>
                {PLANS.map((plan) => (
                  <TouchableOpacity key={plan.id} style={[styles.planCard, { backgroundColor: theme.bgElevated, borderColor: theme.accentBorder }]} onPress={() => handlePlan(plan)}>
                    <Text style={styles.planIcon}>{plan.icon}</Text>
                    <View style={styles.planInfo}>
                      <Text style={[styles.planName, { color: theme.textPrimary }]}>{t(plan.nameKey)}</Text>
                      <Text style={[styles.planDuration, { color: theme.textSecondary }]}>{t(plan.subKey)}</Text>
                    </View>
                    <Text style={[styles.planPrice, { color: theme.accent }]}>{plan.price}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* شراء توكنز */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.accent }]}>{t('tokens.buyCoins')}</Text>
              <View style={styles.packagesGrid}>
                {PACKAGES.map((pkg) => (
                  <TouchableOpacity key={pkg.id} style={[styles.packCard, { backgroundColor: theme.bgElevated, borderColor: theme.borderCard }]} onPress={() => handlePackage(pkg)}>
                    <Text style={[styles.packAmount, { color: theme.accent }]}>{pkg.amount}</Text>
                    <Text style={styles.packCoin}>🪙</Text>
                    <Text style={[styles.packLabel, { color: theme.textSecondary }]}>{t(pkg.labelKey)}</Text>
                    <View style={[styles.packPriceTag, { backgroundColor: theme.accent }]}>
                      <Text style={[styles.packPrice, { color: theme.textOnAccent }]}>{pkg.price}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'flex-end' },
  sheet:        { borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '90%', borderWidth: 1 },
  header:       { alignItems: 'center', padding: 20, borderBottomWidth: 1, gap: 4 },
  closeBtn:     { position: 'absolute', left: 20, top: 20, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  closeText:    { fontSize: 14, fontWeight: '700' },
  title:        { fontSize: 14, fontWeight: '600' },
  balance:      { fontSize: 32, fontWeight: '900' },
  content:      { padding: 20, gap: 24 },
  section:      { gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '800' },
  adCard:       { borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1 },
  adInfo:       { gap: 4 },
  adReward:     { fontSize: 16, fontWeight: '700' },
  adCounter:    { fontSize: 13 },
  adBtn:        { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12 },
  adBtnText:    { fontSize: 14, fontWeight: '800' },
  plansCol:     { gap: 10 },
  planCard:     { borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1 },
  planIcon:     { fontSize: 28 },
  planInfo:     { flex: 1 },
  planName:     { fontSize: 16, fontWeight: '800' },
  planDuration: { fontSize: 13 },
  planPrice:    { fontSize: 18, fontWeight: '900' },
  packagesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  packCard:     { width: '47%', borderRadius: 16, padding: 16, alignItems: 'center', gap: 4, borderWidth: 1 },
  packAmount:   { fontSize: 26, fontWeight: '900' },
  packCoin:     { fontSize: 20 },
  packLabel:    { fontSize: 13 },
  packPriceTag: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginTop: 4 },
  packPrice:    { fontSize: 13, fontWeight: '800' },
});
