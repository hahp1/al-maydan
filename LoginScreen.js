import { useState } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  StatusBar, Alert, ActivityIndicator,
} from 'react-native';

// ══════════════════════════════════════════
// عند EAS Build، أضف هذا في package.json:
// "expo-auth-session", "expo-web-browser"
// وفعّل الكود المعلّق أدناه
// ══════════════════════════════════════════

export default function LoginScreen({ onLogin, onGuest }) {
  const [loadingGoogle, setLoadingGoogle] = useState(false);

  const handleGoogle = async () => {
    setLoadingGoogle(true);
    try {
      // ── TODO: فعّل عند EAS Build ──
      // import * as Google from 'expo-auth-session/providers/google';
      // import * as WebBrowser from 'expo-web-browser';
      // WebBrowser.maybeCompleteAuthSession();
      //
      // const [request, response, promptAsync] = Google.useAuthRequest({
      //   androidClientId: 'YOUR_ANDROID_CLIENT_ID',
      //   webClientId: 'YOUR_WEB_CLIENT_ID',
      // });
      // const result = await promptAsync();
      // if (result.type === 'success') {
      //   const userInfo = await fetch(
      //     'https://www.googleapis.com/userinfo/v2/me',
      //     { headers: { Authorization: `Bearer ${result.authentication.accessToken}` } }
      //   ).then(r => r.json());
      //   onLogin('google', userInfo.name, userInfo.email);
      // }
      // ─────────────────────────────────

      // مؤقتاً في Snack — محاكاة
      await new Promise(r => setTimeout(r, 800));
      onLogin('google');
    } catch (e) {
      Alert.alert('خطأ', 'فشل تسجيل الدخول، حاول مرة أخرى.');
    } finally {
      setLoadingGoogle(false);
    }
  };

  const handleApple = () => {
    Alert.alert(
      '🍎 قريباً',
      'تسجيل الدخول عبر Apple سيكون متاحاً على iOS قريباً.',
      [{ text: 'حسناً' }]
    );
  };

  const handleTerms = () => {
    Alert.alert(
      '📄 شروط الاستخدام',
      'شروط الاستخدام:\n\n' +
      '• يجب أن يكون عمر المستخدم 13 سنة أو أكثر.\n' +
      '• يُحظر استخدام التطبيق لأغراض غير مشروعة.\n' +
      '• المحتوى داخل التطبيق محمي بحقوق الملكية الفكرية.\n' +
      '• نحتفظ بحق تعديل الشروط في أي وقت.\n\n' +
      'سياسة الخصوصية:\n\n' +
      '• نجمع فقط البيانات الضرورية لتشغيل التطبيق.\n' +
      '• لا نبيع بياناتك لأطراف ثالثة.\n' +
      '• يمكنك حذف حسابك وبياناتك في أي وقت.\n' +
      '• نستخدم Firebase لتخزين البيانات بأمان.',
      [{ text: 'فهمت ✓' }]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0d0d2b" />

      <View style={styles.header}>
        <Text style={styles.title}>الميدان</Text>
        <Text style={styles.subtitle}>سجّل الدخول للبدء</Text>
      </View>

      <View style={styles.buttons}>

        {/* Google */}
        <TouchableOpacity
          style={[styles.btnGoogle, loadingGoogle && styles.btnDisabled]}
          onPress={handleGoogle}
          disabled={loadingGoogle}
        >
          {loadingGoogle ? (
            <ActivityIndicator color="#4285F4" size="small" />
          ) : (
            <View style={styles.googleG}>
              <Text style={styles.googleGText}>G</Text>
            </View>
          )}
          <Text style={styles.btnTextDark}>
            {loadingGoogle ? 'جاري الدخول...' : 'تسجيل الدخول عن طريق Google'}
          </Text>
        </TouchableOpacity>

        {/* Apple */}
        <TouchableOpacity style={styles.btnApple} onPress={handleApple}>
          <View style={styles.appleA}>
            <Text style={styles.appleAText}></Text>
          </View>
          <Text style={styles.btnTextLight}>تسجيل الدخول عن طريق Apple</Text>
          <View style={styles.soonBadge}>
            <Text style={styles.soonText}>قريباً</Text>
          </View>
        </TouchableOpacity>

        {/* ضيف */}
        <TouchableOpacity style={styles.btnGuest} onPress={onGuest}>
          <Text style={styles.btnGuestText}>الدخول كضيف — لعبة تجريبية واحدة</Text>
        </TouchableOpacity>

      </View>

      {/* الشروط والسياسة — قابلة للضغط */}
      <TouchableOpacity onPress={handleTerms}>
        <Text style={styles.note}>
          بتسجيل الدخول توافق على{' '}
          <Text style={styles.noteLink}>شروط الاستخدام وسياسة الخصوصية</Text>
        </Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d2b',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 80,
    paddingHorizontal: 24,
  },
  header: { alignItems: 'center' },
  title: {
    fontSize: 64,
    fontWeight: '900',
    color: '#f5c518',
    textShadowColor: '#f5c51888',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  subtitle: { fontSize: 18, color: '#a09060', marginTop: 8 },
  buttons: { width: '100%', gap: 16 },

  // Google
  btnGoogle: {
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    elevation: 4,
  },
  btnDisabled: { opacity: 0.7 },
  googleG: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#ddd',
  },
  googleGText: { fontSize: 18, fontWeight: '900', color: '#4285F4' },
  btnTextDark: { fontSize: 16, fontWeight: '700', color: '#333333' },

  // Apple
  btnApple: {
    backgroundColor: '#000000',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    elevation: 4,
  },
  appleA: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  appleAText: { fontSize: 22, color: '#ffffff', fontWeight: '900' },
  btnTextLight: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
  soonBadge: {
    backgroundColor: '#f5c518',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  soonText: { color: '#0d0d2b', fontSize: 11, fontWeight: '800' },

  // ضيف
  btnGuest: { paddingVertical: 14, alignItems: 'center' },
  btnGuestText: { color: '#a09060', fontSize: 14, textDecorationLine: 'underline' },

  // الشروط
  note: { color: '#555577', fontSize: 12, textAlign: 'center' },
  noteLink: { color: '#a09060', textDecorationLine: 'underline' },
});
