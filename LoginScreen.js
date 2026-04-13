import { useState, useRef, useEffect } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  StatusBar, ActivityIndicator, Animated
} from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from './firebaseConfig';
import { saveUserToFirestore } from './userService';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen({ onLogin, onGuest }) {
  const [loadingGoogle, setLoadingGoogle] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const titleY = useRef(new Animated.Value(-30)).current;
  const btnY = useRef(new Animated.Value(40)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.spring(titleY, { toValue: 0, friction: 7, useNativeDriver: true }),
      Animated.spring(btnY, { toValue: 0, friction: 7, delay: 300, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: '961744403836-as5ilmqr28k91uso1bkvqeb4ss5h9gpl.apps.googleusercontent.com',
    webClientId: '961744403836-as5ilmqr28k91uso1bkvqeb4ss5h9gpl.apps.googleusercontent.com',
  });

  const handleGoogle = async () => {
    setLoadingGoogle(true);
    try {
      const result = await promptAsync();
      if (result?.type === 'success') {
        const { id_token } = result.params;
        const credential = GoogleAuthProvider.credential(id_token);
        const userCredential = await signInWithCredential(auth, credential);
        const firebaseUser = userCredential.user;

        // حفظ/تحديث في Firestore
        const userData = await saveUserToFirestore({
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || 'مستخدم',
          email: firebaseUser.email,
          photo: firebaseUser.photoURL,
        });

        onLogin(userData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingGoogle(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#06061a" />

      {/* نجوم خلفية */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {[...Array(20)].map((_, i) => (
          <View key={i} style={[styles.star, {
            top: `${(i * 41 + 5) % 95}%`,
            left: `${(i * 67 + 13) % 93}%`,
            width: i % 4 === 0 ? 3 : 2,
            height: i % 4 === 0 ? 3 : 2,
            opacity: 0.15 + (i % 5) * 0.06,
          }]} />
        ))}
      </View>

      {/* عنوان */}
      <Animated.View style={[styles.titleWrap, { opacity: fadeAnim, transform: [{ translateY: titleY }] }]}>
        <Animated.Text style={[styles.title, { transform: [{ scale: pulseAnim }] }]}>
          الميدان
        </Animated.Text>
        <Text style={styles.subtitle}>تنافس · تحدّى · انتصر</Text>

        {/* زخرفة */}
        <View style={styles.decorRow}>
          <View style={styles.decorLine} />
          <Text style={styles.decorEmoji}>⚔️</Text>
          <View style={styles.decorLine} />
        </View>
      </Animated.View>

      {/* أزرار */}
      <Animated.View style={[styles.btns, { opacity: fadeAnim, transform: [{ translateY: btnY }] }]}>

        {/* Google */}
        <TouchableOpacity
          style={[styles.googleBtn, (loadingGoogle || !request) && styles.btnDisabled]}
          onPress={handleGoogle}
          disabled={loadingGoogle || !request}
          activeOpacity={0.85}
        >
          {loadingGoogle ? (
            <ActivityIndicator color="#06061a" size="small" />
          ) : (
            <>
              <Text style={styles.googleIcon}>G</Text>
              <Text style={styles.googleText}>الدخول بـ Google</Text>
            </>
          )}
        </TouchableOpacity>

        {/* فاصل */}
        <View style={styles.orRow}>
          <View style={styles.orLine} />
          <Text style={styles.orText}>أو</Text>
          <View style={styles.orLine} />
        </View>

        {/* ضيف */}
        <TouchableOpacity style={styles.guestBtn} onPress={onGuest} activeOpacity={0.8}>
          <Text style={styles.guestText}>👤  دخول كضيف</Text>
        </TouchableOpacity>

        <Text style={styles.guestNote}>
          الضيف لا يستطيع استخدام الأصدقاء والمحادثات
        </Text>
      </Animated.View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#06061a',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingHorizontal: 28,
    paddingVertical: 60,
  },
  star: {
    position: 'absolute',
    borderRadius: 99,
    backgroundColor: '#fff',
  },

  // عنوان
  titleWrap: { alignItems: 'center', gap: 10 },
  title: {
    fontSize: 80,
    fontWeight: '900',
    color: '#f5c518',
    textShadowColor: '#f5c51855',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 30,
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: 17,
    color: '#7a6a40',
    letterSpacing: 3,
    fontWeight: '500',
  },
  decorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  decorLine: { flex: 1, height: 1, backgroundColor: '#f5c51825' },
  decorEmoji: { fontSize: 18 },

  // أزرار
  btns: { width: '100%', gap: 14 },
  googleBtn: {
    backgroundColor: '#f5c518',
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#f5c518',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  btnDisabled: { opacity: 0.6 },
  googleIcon: {
    fontSize: 18,
    fontWeight: '900',
    color: '#06061a',
    fontStyle: 'italic',
  },
  googleText: {
    color: '#06061a',
    fontSize: 17,
    fontWeight: '800',
  },

  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  orLine: { flex: 1, height: 1, backgroundColor: '#ffffff15' },
  orText: { color: '#3a3a60', fontSize: 13 },

  guestBtn: {
    borderWidth: 1.5,
    borderColor: '#f5c51830',
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: '#0f0f2e',
  },
  guestText: { color: '#f5c518', fontSize: 16, fontWeight: '700' },
  guestNote: {
    color: '#3a3a60',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 2,
  },
});
