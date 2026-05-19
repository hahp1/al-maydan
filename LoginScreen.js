/**
 * LoginScreen.js — محدّث
 * ════════════════════════════════════════════════════════════
 *  ✅ أيقونة تغيير اللغة في الأعلى (LanguageSelector)
 *  ✅ زر Apple Sign-In (يظهر على iOS فقط)
 *  ✅ ترجمات كاملة من I18n
 *  ✅ زر ضيف صغير بالأسفل — يُنشئ/يسترجع guest profile من AsyncStorage
 *  ✅ Arnex Studio © 2026
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  StatusBar, ActivityIndicator, Animated, Platform, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleAuthProvider, OAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from './firebaseConfig';
import { saveUserToFirestore } from './UserService';
import { useTheme } from './ThemeContext';
import { useLanguage } from './I18n';
import LanguageSelector from './LanguageSelector';

WebBrowser.maybeCompleteAuthSession();

// ── مفتاح التخزين المحلي للضيف ──
const GUEST_KEY = 'arena_guest_profile';

/** ينشئ أو يسترجع ملف الضيف من AsyncStorage */
const getOrCreateGuest = async (lang) => {
  try {
    const raw = await AsyncStorage.getItem(GUEST_KEY);
    if (raw) return JSON.parse(raw);

    // إنشاء ضيف جديد
    const num     = Math.floor(1000 + Math.random() * 9000);
    const name    = lang === 'ar' ? `ضيف${num}` : `Guest${num}`;
    const guestId = `guest_${Date.now()}_${num}`;
    const profile = { guestId, name, isGuest: true, tokens: 0, createdAt: Date.now() };
    await AsyncStorage.setItem(GUEST_KEY, JSON.stringify(profile));
    return profile;
  } catch {
    const num = Math.floor(1000 + Math.random() * 9000);
    return { guestId: `guest_${Date.now()}`, name: lang === 'ar' ? `ضيف${num}` : `Guest${num}`, isGuest: true, tokens: 0 };
  }
};

const STARS = [...Array(20)].map((_, i) => ({
  key: i,
  top:  `${Math.floor((i * 41 + 7) % 94)}%`,
  left: `${Math.floor((i * 67 + 13) % 96)}%`,
  size: i % 4 === 0 ? 3 : 2,
  opacity: 0.15 + (i % 5) * 0.07,
}));

export default function LoginScreen({ onLogin, onGuest }) {
  const { theme } = useTheme();
  const { t, lang } = useLanguage();
  const [loadingGoogle,  setLoadingGoogle]  = useState(false);
  const [loadingApple,   setLoadingApple]   = useState(false);
  const [loadingGuest,   setLoadingGuest]   = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const titleY    = useRef(new Animated.Value(-30)).current;
  const btnY      = useRef(new Animated.Value(40)).current;
  const langY     = useRef(new Animated.Value(-20)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef(null);

  useEffect(() => {
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
    }
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 650, useNativeDriver: true }),
      Animated.spring(langY,    { toValue: 0, friction: 8, useNativeDriver: true }),
      Animated.spring(titleY,   { toValue: 0, friction: 7, delay: 100, useNativeDriver: true }),
      Animated.spring(btnY,     { toValue: 0, friction: 7, delay: 280, useNativeDriver: true }),
    ]).start();

    pulseLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.07, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 2000, useNativeDriver: true }),
      ])
    );
    pulseLoop.current.start();
    return () => pulseLoop.current?.stop();
  }, []);

  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: '961744403836-g57i85o0skg0a60u6d3qub4btjubned2.apps.googleusercontent.com',
    webClientId:     '961744403836-as5ilmqr28k91uso1bkvqeb4ss5h9gpl.apps.googleusercontent.com',
  });

  // ── Google Sign-In ──
  const handleGoogle = useCallback(async () => {
    if (loadingGoogle) return;
    setLoadingGoogle(true);
    try {
      const result = await promptAsync();
      if (result?.type === 'success') {
        const { id_token }   = result.params;
        const credential     = GoogleAuthProvider.credential(id_token);
        const userCredential = await signInWithCredential(auth, credential);
        const firebaseUser   = userCredential.user;

        const userData = await saveUserToFirestore({
          uid:   firebaseUser.uid,
          name:  firebaseUser.displayName || (lang === 'ar' ? 'مستخدم' : 'User'),
          email: firebaseUser.email,
          photo: firebaseUser.photoURL,
        });
        onLogin(userData);
      } else {
        setLoadingGoogle(false);
      }
    } catch (e) {
      console.error('Google Sign-In error:', e);
      setLoadingGoogle(false);
    }
  }, [loadingGoogle, promptAsync, lang, onLogin]);

  // ── Apple Sign-In ──
  const handleApple = useCallback(async () => {
    if (loadingApple) return;
    setLoadingApple(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const { identityToken } = credential;
      if (!identityToken) throw new Error('No identity token from Apple');

      const provider       = new OAuthProvider('apple.com');
      const authCredential = provider.credential({ idToken: identityToken });
      const userCredential = await signInWithCredential(auth, authCredential);
      const firebaseUser   = userCredential.user;

      const fallbackName = lang === 'ar' ? 'مستخدم' : 'User';
      const displayName = credential.fullName
        ? `${credential.fullName.givenName || ''} ${credential.fullName.familyName || ''}`.trim() || fallbackName
        : firebaseUser.displayName || fallbackName;

      const userData = await saveUserToFirestore({
        uid:   firebaseUser.uid,
        name:  displayName,
        email: firebaseUser.email || credential.email,
        photo: firebaseUser.photoURL,
      });
      onLogin(userData);
    } catch (e) {
      if (e.code !== 'ERR_REQUEST_CANCELED') {
        console.error('Apple Sign-In error:', e);
        Alert.alert(t('common.ok'), lang === 'ar' ? 'فشل تسجيل الدخول' : 'Apple Sign-In failed');
      }
      setLoadingApple(false);
    }
  }, [loadingApple, lang, t, onLogin]);

  // ── Guest ──
  const handleGuest = useCallback(async () => {
    if (loadingGuest) return;
    setLoadingGuest(true);
    try {
      const guestProfile = await getOrCreateGuest(lang);
      onGuest(guestProfile);
    } catch {
      onGuest({ guestId: `guest_${Date.now()}`, name: lang === 'ar' ? 'ضيف' : 'Guest', isGuest: true, tokens: 0 });
    } finally {
      setLoadingGuest(false);
    }
  }, [loadingGuest, lang, onGuest]);

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.statusBg} />

      {/* نجوم الخلفية */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {STARS.map(s => (
          <View key={s.key} style={[styles.star, {
            top: s.top, left: s.left,
            width: s.size, height: s.size,
            opacity: theme.isLight ? s.opacity * 0.4 : s.opacity,
            backgroundColor: theme.isLight ? theme.purple : theme.accent + 'cc',
          }]} />
        ))}
      </View>

      {/* 🌐 أيقونة تغيير اللغة */}
      <Animated.View style={[styles.langWrap, { opacity: fadeAnim, transform: [{ translateY: langY }] }]}>
        <LanguageSelector />
      </Animated.View>

      {/* اللوغو */}
      <Animated.View style={[styles.logoWrap, { opacity: fadeAnim, transform: [{ translateY: titleY }] }]}>
        <Animated.Text style={[
          styles.logoText,
          { color: theme.accent, textShadowColor: theme.accent + '44', transform: [{ scale: pulseAnim }] },
        ]}>
          Arena
        </Animated.Text>
        <Text style={[styles.tagline, { color: theme.textMuted }]}>
          {t('login.tagline')}
        </Text>
      </Animated.View>

      {/* ── الأزرار ── */}
      <Animated.View style={[styles.btnsWrap, { opacity: fadeAnim, transform: [{ translateY: btnY }] }]}>

        {/* Google */}
        <TouchableOpacity
          style={[styles.googleBtn, { backgroundColor: theme.accent }, (!request || loadingGoogle) && styles.btnDisabled]}
          onPress={handleGoogle}
          disabled={!request || loadingGoogle}
          activeOpacity={0.85}
        >
          {loadingGoogle
            ? <ActivityIndicator color={theme.textOnAccent} size="small" />
            : <>
                <Text style={[styles.googleIcon, { color: theme.textOnAccent }]}>G</Text>
                <Text style={[styles.googleText, { color: theme.textOnAccent }]}>{t('login.googleBtn')}</Text>
              </>
          }
        </TouchableOpacity>

        {/* Apple — iOS فقط */}
        {appleAvailable && (
          <TouchableOpacity
            style={[styles.appleBtn, loadingApple && styles.btnDisabled]}
            onPress={handleApple}
            disabled={loadingApple}
            activeOpacity={0.85}
          >
            {loadingApple
              ? <ActivityIndicator color="#ffffff" size="small" />
              : <>
                  <Text style={styles.appleIcon}></Text>
                  <Text style={styles.appleText}>
                    {lang === 'ar' ? 'تسجيل الدخول بـ Apple' : 'Sign in with Apple'}
                  </Text>
                </>
            }
          </TouchableOpacity>
        )}

        {/* فاصل */}
        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: theme.divider }]} />
          <Text style={[styles.dividerText, { color: theme.textMuted }]}>{t('login.or')}</Text>
          <View style={[styles.dividerLine, { backgroundColor: theme.divider }]} />
        </View>

        {/* ── زر الضيف الصغير ── */}
        <TouchableOpacity
          style={[styles.guestBtn, { borderColor: theme.border }]}
          onPress={handleGuest}
          disabled={loadingGuest}
          activeOpacity={0.7}
        >
          {loadingGuest
            ? <ActivityIndicator size="small" color={theme.textMuted} />
            : <Text style={[styles.guestText, { color: theme.textMuted }]}>
                👤 {lang === 'ar' ? 'متابعة كضيف' : 'Continue as Guest'}
              </Text>
          }
        </TouchableOpacity>

        <Text style={[styles.guestNote, { color: theme.textMuted + '99' }]}>
          {lang === 'ar'
            ? 'تقدم الضيف يُحفظ على جهازك فقط'
            : 'Guest progress is saved on this device only'}
        </Text>
      </Animated.View>

      <Animated.Text style={[styles.footer, { opacity: fadeAnim, color: theme.textMuted }]}>
        Arnex Studio © 2026
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 50, paddingBottom: 40, paddingHorizontal: 28,
  },
  star:      { position: 'absolute', borderRadius: 99 },
  langWrap:  { width: '100%', alignItems: 'flex-end' },
  logoWrap:  { alignItems: 'center' },
  logoText:  {
    fontSize: 72, fontWeight: '900', letterSpacing: 2,
    textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 28,
  },
  tagline:   { fontSize: 16, marginTop: 8, letterSpacing: 1 },
  btnsWrap:  { width: '100%', gap: 14 },

  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
    paddingVertical: 16, borderRadius: 18,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
  },
  appleBtn:  {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    paddingVertical: 16, borderRadius: 18, backgroundColor: '#000000',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  btnDisabled:  { opacity: 0.55 },
  googleIcon:   { fontSize: 18, fontWeight: '900', fontStyle: 'italic' },
  googleText:   { fontSize: 16, fontWeight: '800' },
  appleIcon:    { fontSize: 20, color: '#ffffff', marginRight: 4 },
  appleText:    { fontSize: 16, fontWeight: '700', color: '#ffffff' },

  dividerRow:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dividerLine:  { flex: 1, height: 1 },
  dividerText:  { fontSize: 13 },

  // زر الضيف — أصغر وأخف
  guestBtn:  {
    paddingVertical: 11, borderRadius: 14,
    borderWidth: 1, alignItems: 'center',
  },
  guestText: { fontSize: 14, fontWeight: '600' },
  guestNote: { fontSize: 11, textAlign: 'center', marginTop: -6 },
  footer:    { fontSize: 11 },
});
