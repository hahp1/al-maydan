import { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, StatusBar, ScrollView, Switch, Alert, Linking } from 'react-native';

export default function SettingsScreen({ onBack, user, tokens, onLogout }) {
  const [darkMode, setDarkMode] = useState(true);
  const [notifications, setNotifications] = useState(true);

  const handleBuyTokens = () => {
    Alert.alert('🪙 شراء نقاط', 'ميزة الشراء ستكون متاحة قريباً!', [{ text: 'حسناً' }]);
  };

  const handleLogout = () => {
    Alert.alert(
      '🚪 تسجيل الخروج',
      'هل أنت متأكد من تسجيل الخروج؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'خروج', style: 'destructive', onPress: onLogout }
      ]
    );
  };

  const handleRate = () => {
    Alert.alert(
      '⭐ قيّم التطبيق',
      'شكراً لدعمك! تقييمك يساعدنا على التحسين.',
      [
        { text: 'لاحقاً', style: 'cancel' },
        {
          text: '⭐ قيّم الآن',
          onPress: () => Linking.openURL('https://play.google.com/store').catch(() => {
            Alert.alert('قريباً', 'سيكون التطبيق متاحاً في المتاجر قريباً!', [{ text: 'حسناً' }]);
          })
        }
      ]
    );
  };

  const handleLanguage = () => {
    Alert.alert('🌐 اللغة', 'اللغات المتاحة حالياً: العربية فقط\nسيتم إضافة لغات أخرى قريباً.', [{ text: 'حسناً' }]);
  };

  const handleAbout = () => {
    Alert.alert('ℹ️ عن التطبيق', 'الميدان 🏆\nالإصدار 1.0.0\n\nتطبيق مسابقات ثقافية تنافسية بين فريقين.\n\nللتواصل: almaydan@support.com', [{ text: 'حسناً' }]);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0d0d2b" />

      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>→ رجوع</Text>
        </TouchableOpacity>
        <Text style={styles.title}>الإعدادات</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* بطاقة الحساب */}
      <View style={styles.accountCard}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>
            {user?.type === 'guest' ? '👤' : user?.type === 'google' ? 'G' : ''}
          </Text>
        </View>
        <View style={styles.accountInfo}>
          <Text style={styles.accountName}>
            {user?.type === 'guest' ? 'ضيف' : user?.name || 'لاعب'}
          </Text>
          <Text style={styles.accountType}>
            {user?.type === 'guest' ? 'حساب ضيف' :
             user?.type === 'google' ? 'حساب Google' : 'حساب Apple'}
          </Text>
        </View>
        <View style={styles.tokenBadge}>
          <Text style={styles.tokenNum}>{tokens}</Text>
          <Text style={styles.tokenLabel}>🪙</Text>
        </View>
      </View>

      {/* النقاط */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🪙 النقاط</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>رصيدك الحالي</Text>
            <Text style={styles.rowValue}>{tokens} نقطة</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.packagesRow}>
            {[
              { amount: 100, price: '0.99$' },
              { amount: 300, price: '2.49$' },
              { amount: 700, price: '4.99$' },
            ].map((pack) => (
              <TouchableOpacity key={pack.amount} style={styles.packCard} onPress={handleBuyTokens}>
                <Text style={styles.packAmount}>{pack.amount}</Text>
                <Text style={styles.packCoin}>🪙</Text>
                <Text style={styles.packPrice}>{pack.price}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* المظهر */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎨 المظهر</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View>
              <Text style={styles.rowLabel}>الوضع الليلي</Text>
              <Text style={styles.rowSub}>الوضع الليلي مفعّل دائماً حالياً</Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={(val) => {
                setDarkMode(val);
                if (!val) Alert.alert('قريباً', 'الوضع النهاري سيكون متاحاً في الإصدار القادم!', [{ text: 'حسناً' }]);
              }}
              trackColor={{ false: '#2a2a55', true: '#f5c518' }}
              thumbColor={darkMode ? '#0d0d2b' : '#ffffff'}
            />
          </View>
        </View>
      </View>

      {/* الإشعارات */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔔 الإشعارات</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View>
              <Text style={styles.rowLabel}>إشعارات التطبيق</Text>
              <Text style={styles.rowSub}>تنبيهات العروض والتحديثات</Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: '#2a2a55', true: '#f5c518' }}
              thumbColor={notifications ? '#0d0d2b' : '#ffffff'}
            />
          </View>
        </View>
      </View>

      {/* اللغة */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🌐 اللغة</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.row} onPress={handleLanguage}>
            <Text style={styles.rowLabel}>اللغة الحالية</Text>
            <View style={styles.rowRight}>
              <Text style={styles.rowValue}>العربية 🇸🇦</Text>
              <Text style={styles.arrow}>‹</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* عن التطبيق */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ℹ️ عن التطبيق</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.row} onPress={handleAbout}>
            <Text style={styles.rowLabel}>معلومات التطبيق</Text>
            <View style={styles.rowRight}>
              <Text style={styles.rowValue}>الإصدار 1.0.0</Text>
              <Text style={styles.arrow}>‹</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.divider} />
          {/* ⭐ قيّم التطبيق */}
          <TouchableOpacity style={styles.row} onPress={handleRate}>
            <Text style={styles.rowLabel}>⭐ قيّم التطبيق</Text>
            <Text style={styles.arrow}>‹</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.row}
            onPress={() => Alert.alert('الشروط', 'شروط الاستخدام وسياسة الخصوصية ستكون متاحة قريباً.', [{ text: 'حسناً' }])}
          >
            <Text style={styles.rowLabel}>شروط الاستخدام</Text>
            <Text style={styles.arrow}>‹</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.row}
            onPress={() => Alert.alert('تواصل معنا', 'البريد الإلكتروني:\nalmaydan@support.com', [{ text: 'حسناً' }])}
          >
            <Text style={styles.rowLabel}>تواصل معنا</Text>
            <Text style={styles.arrow}>‹</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* تسجيل الخروج */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>🚪 تسجيل الخروج</Text>
      </TouchableOpacity>

      <Text style={styles.version}>الميدان © 2026 — جميع الحقوق محفوظة</Text>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#0d0d2b',
    paddingHorizontal: 20,
    paddingVertical: 50,
    gap: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: { padding: 8 },
  backText: { color: '#f5c518', fontSize: 16, fontWeight: '700' },
  title: { fontSize: 22, fontWeight: '900', color: '#f5c518' },
  accountCard: {
    backgroundColor: '#1a1a3e',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: '#f5c51833',
  },
  avatarCircle: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#f5c518',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 26, fontWeight: '900', color: '#0d0d2b' },
  accountInfo: { flex: 1 },
  accountName: { color: '#ffffff', fontSize: 18, fontWeight: '800' },
  accountType: { color: '#a09060', fontSize: 13, marginTop: 2 },
  tokenBadge: {
    alignItems: 'center',
    backgroundColor: '#0d0d2b',
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 14, borderWidth: 1, borderColor: '#f5c51855',
  },
  tokenNum: { color: '#f5c518', fontSize: 20, fontWeight: '900' },
  tokenLabel: { fontSize: 14 },
  section: { gap: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#f5c518', paddingRight: 4 },
  card: {
    backgroundColor: '#1a1a3e',
    borderRadius: 16, borderWidth: 1, borderColor: '#2a2a55', overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', padding: 16,
  },
  rowLabel: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
  rowSub: { color: '#a09060', fontSize: 12, marginTop: 2 },
  rowValue: { color: '#a09060', fontSize: 14 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  arrow: { color: '#555577', fontSize: 22, fontWeight: '300' },
  divider: { height: 1, backgroundColor: '#2a2a55', marginHorizontal: 16 },
  packagesRow: { flexDirection: 'row', gap: 10, padding: 16, paddingTop: 12 },
  packCard: {
    flex: 1, backgroundColor: '#0d0d2b', borderRadius: 12,
    padding: 12, alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: '#f5c51833',
  },
  packAmount: { color: '#f5c518', fontSize: 20, fontWeight: '900' },
  packCoin: { fontSize: 16 },
  packPrice: { color: '#a09060', fontSize: 12, fontWeight: '700' },
  logoutBtn: {
    backgroundColor: '#3a1a1a', paddingVertical: 16,
    borderRadius: 16, alignItems: 'center',
    borderWidth: 1, borderColor: '#7a3a3a',
  },
  logoutText: { color: '#ff6666', fontSize: 16, fontWeight: '700' },
  version: { color: '#333355', fontSize: 12, textAlign: 'center', paddingBottom: 10 },
});
