import { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MAX_ADS = 10;
const AD_REWARD = 5;
const ADS_KEY = 'almaydan_ads';

const PLANS = [
  { id: 'silver', icon: '🥈', name: 'فضي', duration: 'لمدة شهر', price: '4.99$' },
  { id: 'gold',   icon: '🥇', name: 'ذهبي', duration: 'لمدة سنة', price: '19.99$' },
  { id: 'diamond',icon: '💎', name: 'ماسي', duration: 'دائمي',    price: '29.99$' },
];

const PACKAGES = [
  { id: 'sm', label: 'صغيرة',  amount: 100,  price: '0.99$' },
  { id: 'md', label: 'متوسطة', amount: 250,  price: '1.99$' },
  { id: 'lg', label: 'كبيرة',  amount: 600,  price: '3.99$' },
  { id: 'xl', label: 'ضخمة',   amount: 1500, price: '7.99$' },
];

export default function TokenModal({ visible, onClose, tokens, onAddTokens }) {
  const [adsLeft, setAdsLeft] = useState(MAX_ADS);
  const [watchingAd, setWatchingAd] = useState(false);

  useEffect(() => {
    if (visible) loadAdsData();
  }, [visible]);

  const loadAdsData = async () => {
    try {
      const raw = await AsyncStorage.getItem(ADS_KEY);
      if (raw) {
        const { date, count } = JSON.parse(raw);
        const today = new Date().toDateString();
        if (date === today) {
          setAdsLeft(MAX_ADS - count);
        } else {
          setAdsLeft(MAX_ADS);
          await AsyncStorage.setItem(ADS_KEY, JSON.stringify({ date: today, count: 0 }));
        }
      } else {
        setAdsLeft(MAX_ADS);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleWatchAd = async () => {
    if (adsLeft <= 0) return;
    setWatchingAd(true);

    // محاكاة مشاهدة إعلان (3 ثوانٍ)
    setTimeout(async () => {
      try {
        const today = new Date().toDateString();
        const watched = MAX_ADS - adsLeft + 1;
        await AsyncStorage.setItem(ADS_KEY, JSON.stringify({ date: today, count: watched }));
        setAdsLeft(adsLeft - 1);
        onAddTokens(AD_REWARD);
        setWatchingAd(false);
        Alert.alert('🎉 تهانينا!', `حصلت على ${AD_REWARD} 🪙`, [{ text: 'رائع!' }]);
      } catch (e) {
        console.error(e);
        setWatchingAd(false);
      }
    }, 3000);
  };

  const handlePlan = (plan) => {
    Alert.alert(
      `${plan.icon} ${plan.name} ${plan.duration}`,
      `سعر الاشتراك: ${plan.price}\n\nميزة الاشتراك ستكون متاحة عند إطلاق التطبيق الرسمي.`,
      [{ text: 'حسناً' }]
    );
  };

  const handlePackage = (pkg) => {
    Alert.alert(
      `🪙 ${pkg.amount} عملة`,
      `السعر: ${pkg.price}\n\nميزة الشراء ستكون متاحة عند إطلاق التطبيق الرسمي.`,
      [{ text: 'حسناً' }]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>

          {/* هيدر */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.title}>رصيدك الحالي</Text>
            <Text style={styles.balance}>{tokens} 🪙</Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

            {/* ── قسم 1: مشاهدة إعلان ── */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📺 شاهد إعلاناً واحصل على عملات</Text>
              <View style={styles.adCard}>
                <View style={styles.adInfo}>
                  <Text style={styles.adReward}>+{AD_REWARD} 🪙 لكل إعلان</Text>
                  <Text style={styles.adCounter}>
                    متبقي {adsLeft}/{MAX_ADS} إعلانات اليوم
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.adBtn, (adsLeft <= 0 || watchingAd) && styles.adBtnDisabled]}
                  onPress={handleWatchAd}
                  disabled={adsLeft <= 0 || watchingAd}
                >
                  <Text style={styles.adBtnText}>
                    {watchingAd ? '⏳ جارٍ...' : adsLeft <= 0 ? '⏰ غداً' : '▶️ شاهد'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* ── قسم 2: الترقية للبرو ── */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>⬆️ الترقية للبرو</Text>
              <View style={styles.plansCol}>
                {PLANS.map((plan) => (
                  <TouchableOpacity key={plan.id} style={styles.planCard} onPress={() => handlePlan(plan)}>
                    <Text style={styles.planIcon}>{plan.icon}</Text>
                    <View style={styles.planInfo}>
                      <Text style={styles.planName}>{plan.name}</Text>
                      <Text style={styles.planDuration}>{plan.duration}</Text>
                    </View>
                    <Text style={styles.planPrice}>{plan.price}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* ── قسم 3: شراء العملات ── */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🪙 شراء عملات</Text>
              <View style={styles.packagesGrid}>
                {PACKAGES.map((pkg) => (
                  <TouchableOpacity key={pkg.id} style={styles.packCard} onPress={() => handlePackage(pkg)}>
                    <Text style={styles.packAmount}>{pkg.amount}</Text>
                    <Text style={styles.packCoin}>🪙</Text>
                    <Text style={styles.packLabel}>{pkg.label}</Text>
                    <View style={styles.packPriceTag}>
                      <Text style={styles.packPrice}>{pkg.price}</Text>
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
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0d0d2b',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: '#f5c51833',
  },
  header: {
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a3e',
    gap: 4,
  },
  closeBtn: {
    position: 'absolute',
    left: 20,
    top: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1a1a3e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  title: { color: '#a09060', fontSize: 14, fontWeight: '600' },
  balance: { color: '#f5c518', fontSize: 32, fontWeight: '900' },

  content: { padding: 20, gap: 24 },
  section: { gap: 12 },
  sectionTitle: { color: '#f5c518', fontSize: 16, fontWeight: '800' },

  // إعلان
  adCard: {
    backgroundColor: '#1a1a3e',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#2a2a55',
  },
  adInfo: { gap: 4 },
  adReward: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  adCounter: { color: '#a09060', fontSize: 13 },
  adBtn: {
    backgroundColor: '#f5c518',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  adBtnDisabled: { backgroundColor: '#2a2a45' },
  adBtnText: { color: '#0d0d2b', fontSize: 14, fontWeight: '800' },

  // خطط البرو
  plansCol: { gap: 10 },
  planCard: {
    backgroundColor: '#1a1a3e',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: '#f5c51833',
  },
  planIcon: { fontSize: 28 },
  planInfo: { flex: 1 },
  planName: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
  planDuration: { color: '#a09060', fontSize: 13 },
  planPrice: { color: '#f5c518', fontSize: 18, fontWeight: '900' },

  // حزم التوكن
  packagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  packCard: {
    width: '47%',
    backgroundColor: '#1a1a3e',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#2a2a55',
  },
  packAmount: { color: '#f5c518', fontSize: 26, fontWeight: '900' },
  packCoin: { fontSize: 20 },
  packLabel: { color: '#a09060', fontSize: 13 },
  packPriceTag: {
    backgroundColor: '#f5c518',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 4,
  },
  packPrice: { color: '#0d0d2b', fontSize: 13, fontWeight: '800' },
});
