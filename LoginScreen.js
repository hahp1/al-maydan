/**
 * LoginScreen.js — مُصلَح
 * ════════════════════════════════════════════════════════════
 *  ✅ اختيار اللغة والتجربة كـ Picker منسدل في المنتصف
 *  ✅ لا شاشة Onboarding منفصلة
 *  ✅ Google + Apple + Guest
 *  ✅ Arnex Studio © 2026
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, Modal,
  StatusBar, ActivityIndicator, Animated, Platform, Alert, ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db, auth } from './firebaseConfig';
import { mergeGuestToAccount } from './GuestMergeService';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleAuthProvider, OAuthProvider, signInWithCredential } from 'firebase/auth';
import { saveUserToFirestore } from './UserService';
import { useTheme } from './ThemeContext';
import { useLanguage } from './I18n';
import { EXPERIENCE_KEY, EXPERIENCES } from './OnboardingScreen';
import { ThemedButton, ThemedCard, ThemedPill, ThemedModal, ThemedRow } from './ThemedComponents';

WebBrowser.maybeCompleteAuthSession();

const GUEST_KEY = 'arena_guest_profile';

const getOrCreateGuest = async (lang) => {
  try {
    const raw = await AsyncStorage.getItem(GUEST_KEY);
    if (raw) return JSON.parse(raw);
    // 4 أرقام من timestamp + حرفان عشوائيان = فريد عملياً
    const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const ts    = Date.now();
    const num   = String(ts).slice(-4);
    const rand  = CHARS[Math.floor(Math.random() * CHARS.length)] +
                  CHARS[Math.floor(Math.random() * CHARS.length)];
    const suffix = `${num}${rand}`;                           // مثال: 3847KX
    const uid    = `#guest${suffix}`;                         // مثال: #guest3847KX
    const name   = lang === 'ar' ? `ضيف${suffix}` : `Guest${suffix}`;
    const profile = { guestId: uid, uid, name, isGuest: true, tokens: 0, createdAt: ts };
    await AsyncStorage.setItem(GUEST_KEY, JSON.stringify(profile));
    // سجّل الضيف في Firestore
    try {
      await setDoc(doc(db, 'users', uid), {
        uid, name, isGuest: true, tokens: 0,
        createdAt: ts, mergedTo: null,
      });
    } catch (e) {
      console.warn('Guest Firestore save:', e?.message);
    }
    return profile;
  } catch {
    const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const ts    = Date.now();
    const num   = String(ts).slice(-4);
    const rand  = CHARS[Math.floor(Math.random() * CHARS.length)] +
                  CHARS[Math.floor(Math.random() * CHARS.length)];
    const suffix = `${num}${rand}`;
    const uid    = `#guest${suffix}`;
    return { guestId: uid, uid, name: lang === 'ar' ? `ضيف${suffix}` : `Guest${suffix}`, isGuest: true, tokens: 0 };
  }
};

const STARS = [...Array(20)].map((_, i) => ({
  key: i,
  top:  `${Math.floor((i * 41 + 7) % 94)}%`,
  left: `${Math.floor((i * 67 + 13) % 96)}%`,
  size: i % 4 === 0 ? 3 : 2,
  opacity: 0.15 + (i % 5) * 0.07,
}));

// ── Picker بسيط ─────────────────────────────────────────────
function OptionPicker({ label, options, selected, onSelect, theme }) {
  const [open, setOpen] = useState(false);
  const selectedOpt = options.find(o => o.value === selected) || options[0];
  return (
    <View style={{ width: '100%' }}>
      <ThemedCard
        onPress={() => setOpen(v => !v)}
        style={pick.btn}
      >
        <Text style={[pick.label, { color: theme.textMuted }]}>{label}</Text>
        <View style={pick.right}>
          <Text style={[pick.selected, { color: theme.accent }]}>
            {selectedOpt?.emoji} {selectedOpt?.label}
          </Text>
          <Text style={[pick.arrow, { color: theme.textMuted }]}>{open ? '▲' : '▼'}</Text>
        </View>
      </ThemedCard>
      {open && (
        <View style={[pick.dropdown, { backgroundColor: theme.bgCard, borderColor: theme.accentBorder }]}>
          {options.map(opt => (
            <ThemedCard
              key={opt.value}
              onPress={() => { onSelect(opt.value); setOpen(false); }}
              style={pick.option}
              variant={opt.value === selected ? 'accent' : 'default'}
            >
              <View style={{ flex: 1 }}>
                <Text style={[pick.optionText, { color: opt.value === selected ? theme.accent : theme.textPrimary }]}>
                  {opt.emoji} {opt.label}
                </Text>
                {opt.sub && (
                  <Text style={[pick.optionSub, { color: theme.textMuted }]}>{opt.sub}</Text>
                )}
              </View>
              {opt.value === selected && (
                <Text style={{ color: theme.accent, fontSize: 14 }}>✓</Text>
              )}
            </ThemedCard>
          ))}
        </View>
      )}
    </View>
  );
}

const pick = StyleSheet.create({
  btn:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 16, borderWidth: 1 },
  label:       { fontSize: 13, fontWeight: '600' },
  right:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  selected:    { fontSize: 15, fontWeight: '700' },
  arrow:       { fontSize: 12 },
  dropdown:    { borderRadius: 14, borderWidth: 1, marginTop: 4, overflow: 'hidden' },
  option:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  optionText:  { fontSize: 15, fontWeight: '600' },
  optionSub:   { fontSize: 11, marginTop: 2 },
});

// ── مودال تحذير تعارض الدمج ────────────────────────────────
function MergeConflictModal({ visible, onContinue, onCancel, theme, lang }) {
  if (!visible) return null;
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={mcStyles.overlay}>
        <View style={[mcStyles.box, { backgroundColor: theme.bgCard, borderColor: '#ef444455' }]}>
          <Text style={mcStyles.icon}>⚠️</Text>
          <Text style={[mcStyles.title, { color: theme.textPrimary }]}>
            {lang === 'ar' ? 'تحذير' : 'Warning'}
          </Text>
          <Text style={[mcStyles.body, { color: theme.textSecondary }]}>
            {lang === 'ar'
              ? 'الاستمرار في فتح الحساب المسجل سابقاً سيؤدي إلى حذف تقدمك الحالي كضيف.'
              : 'Continuing with this account will overwrite your current guest progress.'}
          </Text>
          <View style={[mcStyles.note, { backgroundColor: '#f59e0b18', borderColor: '#f59e0b44' }]}>
            <Text style={[mcStyles.noteText, { color: '#f59e0b' }]}>
              {lang === 'ar'
                ? '💡 لو تريد حفظ تقدمك، سجّل دخول بحساب غير مسجل بالتطبيق سابقاً'
                : '💡 To keep your progress, sign in with a new account not previously used in this app'}
            </Text>
          </View>
          <View style={mcStyles.btns}>
            <ThemedButton onPress={onCancel}   label={lang==='ar'?'← رجوع':'← Back'}      variant="secondary" size="medium" fullWidth={false} style={{flex:1}} />
            <ThemedButton onPress={onContinue} label={lang==='ar'?'استمرار ←':'Continue →'} variant="danger"    size="medium" fullWidth={false} style={{flex:1}} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const mcStyles = StyleSheet.create({
  overlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center', padding: 28 },
  box:      { width: '100%', borderRadius: 24, borderWidth: 1.5, padding: 24, gap: 14 },
  icon:     { fontSize: 44, textAlign: 'center' },
  title:    { fontSize: 20, fontWeight: '900', textAlign: 'center' },
  body:     { fontSize: 14, lineHeight: 22, textAlign: 'center' },
  note:     { borderRadius: 14, borderWidth: 1, padding: 12 },
  noteText: { fontSize: 12, lineHeight: 18, textAlign: 'center' },
  btns:     { flexDirection: 'row', gap: 10, marginTop: 4 },
  btn:      { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', borderWidth: 1.5 },
  btnText:  { fontSize: 15, fontWeight: '800' },
});

// تتحقق: هل الضيف موجود على الجهاز + الحساب الجديد عنده تقدم سابق؟
async function checkMergeConflict(newUid) {
  try {
    const raw = await AsyncStorage.getItem('arena_guest_profile');
    if (!raw) return false; // لا يوجد ضيف
    const guest = JSON.parse(raw);
    if (!guest?.uid?.startsWith('#guest')) return false;
    // هل الحساب الجديد عنده تقدم؟
    const snap = await getDoc(doc(db, 'users', newUid));
    if (!snap.exists()) return false;
    const data = snap.data();
    // يعتبر "عنده تقدم" إذا tokens > 0 أو highScore > 0 أو createdAt موجود
    return (data.tokens > 0 || data.highScore > 0 || !!data.createdAt);
  } catch {
    return false;
  }
}

export default function LoginScreen({ onLogin, onGuest }) {
  const { theme } = useTheme();
  const { t, lang, setLang } = useLanguage();

  const [loadingGoogle,  setLoadingGoogle]  = useState(false);
  const [loadingApple,   setLoadingApple]   = useState(false);
  const [loadingGuest,   setLoadingGuest]   = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [experience,     setExperience]     = useState(EXPERIENCES.ARABIC);
  const [mergeConflict,  setMergeConflict]  = useState(null); // { newUid, userData, experience }

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const titleY    = useRef(new Animated.Value(-30)).current;
  const btnY      = useRef(new Animated.Value(40)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef(null);

  useEffect(() => {
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
    }
    // استرجع التجربة المحفوظة إن وُجدت
    AsyncStorage.getItem(EXPERIENCE_KEY).then(v => {
      if (v === EXPERIENCES.GLOBAL || v === EXPERIENCES.ARABIC) setExperience(v);
    });
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 650, useNativeDriver: true }),
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

  useEffect(() => {
    if (response?.type !== 'success') {
      if (response?.type === 'error' || response?.type === 'cancel') {
        setLoadingGoogle(false);
      }
      return;
    }

    const signIn = async () => {
      try {
        // Custom URI scheme → idToken في authentication
        // Web flow → id_token في params
        const idToken =
          response.authentication?.idToken ??
          response.params?.id_token;

        if (!idToken) {
          // fallback: استخدم access_token مباشرة مع userInfo
          const accessToken =
            response.authentication?.accessToken ??
            response.params?.access_token;

          if (!accessToken) {
            console.error('No token received from Google');
            setLoadingGoogle(false);
            return;
          }

          const credential = GoogleAuthProvider.credential(null, accessToken);
          const result = await signInWithCredential(auth, credential);
          const u = result.user;
          const userData = await saveUserToFirestore({
            uid: u.uid, name: u.displayName, email: u.email, photo: u.photoURL,
          });
          await saveExperience(experience);
          onLogin(userData, experience);
          return;
        }

        const credential = GoogleAuthProvider.credential(idToken);
        const result = await signInWithCredential(auth, credential);
        const u = result.user;
        const userData = await saveUserToFirestore({
          uid: u.uid, name: u.displayName, email: u.email, photo: u.photoURL,
        });
        // تحقق من تعارض الضيف مع حساب موجود
        const conflict = await checkMergeConflict(u.uid);
        if (conflict) {
          setMergeConflict({ newUid: u.uid, userData, exp: experience });
          setLoadingGoogle(false);
          return;
        }
        await mergeGuestToAccount(u.uid, userData).catch(() => {});
        await saveExperience(experience);
        onLogin(userData, experience);
      } catch (e) {
        console.error('Google sign-in error:', e);
        setLoadingGoogle(false);
      }
    };

    signIn();
  }, [response, experience]);

  const saveExperience = async (exp) => {
    await AsyncStorage.setItem(EXPERIENCE_KEY, exp);
  };

  const handleGoogle = useCallback(async () => {
    if (loadingGoogle || !request) return;
    setLoadingGoogle(true);
    await promptAsync();
  }, [loadingGoogle, request, promptAsync]);

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
      const provider   = new OAuthProvider('apple.com');
      const oauthCred  = provider.credential({ idToken: credential.identityToken });
      const result     = await signInWithCredential(auth, oauthCred);
      const u          = result.user;
      const fallback   = lang === 'ar' ? 'مستخدم' : 'User';
      const displayName = credential.fullName
        ? `${credential.fullName.givenName || ''} ${credential.fullName.familyName || ''}`.trim() || fallback
        : u.displayName || fallback;
      const userData = await saveUserToFirestore({ uid: u.uid, name: displayName, email: u.email || credential.email, photo: u.photoURL });
      // تحقق من تعارض الضيف مع حساب موجود
      const conflict = await checkMergeConflict(u.uid);
      if (conflict) {
        setMergeConflict({ newUid: u.uid, userData, exp: experience });
        setLoadingApple(false);
        return;
      }
      await mergeGuestToAccount(u.uid, userData).catch(() => {});
      await saveExperience(experience);
      onLogin(userData, experience);
    } catch (e) {
      if (e.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('', lang === 'ar' ? 'فشل تسجيل الدخول' : 'Apple Sign-In failed');
      }
      setLoadingApple(false);
    }
  }, [loadingApple, lang, experience, onLogin]);

  // handlers للـ conflict modal
  const handleConflictContinue = useCallback(async () => {
    if (!mergeConflict) return;
    const { newUid, userData, exp } = mergeConflict;
    setMergeConflict(null);
    // استمر بدون دمج — تقدم الضيف يُحذف
    await saveExperience(exp);
    onLogin(userData, exp);
  }, [mergeConflict, onLogin]);

  const handleConflictCancel = useCallback(() => {
    setMergeConflict(null);
  }, []);

  const handleGuest = useCallback(async () => {
    if (loadingGuest) return;
    setLoadingGuest(true);
    try {
      const guestProfile = await getOrCreateGuest(lang);
      await saveExperience(experience);
      onGuest(guestProfile, experience);
    } catch {
      const num = Math.floor(1000 + Math.random() * 9000);
      const p = { guestId: `guest_${Date.now()}`, name: lang === 'ar' ? `ضيف${num}` : `Guest${num}`, isGuest: true, tokens: 0 };
      await saveExperience(experience);
      onGuest(p, experience);
    } finally {
      setLoadingGuest(false);
    }
  }, [loadingGuest, lang, experience, onGuest]);

  const langOptions = [
    { value: 'ar', label: 'العربية', emoji: '🇸🇦' },
    { value: 'en', label: 'English', emoji: '🇬🇧' },
  ];
  const expOptions = [
    {
      value: EXPERIENCES.ARABIC,
      label: lang === 'ar' ? 'التجربة العربية' : 'Arabic Experience',
      emoji: '🕌',
      sub:   lang === 'ar'
        ? 'جلسة وألعاب وأسئلة — كل شيء بالعربي 🇸🇦'
        : 'Games, party & trivia — everything in Arabic 🇸🇦',
    },
    {
      value: EXPERIENCES.GLOBAL,
      label: 'Global Games',
      emoji: '🌍',
      sub:   'Same games & party — trivia in English 🌐',
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.statusBg} />

      {/* نجوم الخلفية */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {STARS.map(s => (
          <View key={s.key} style={[styles.star, {
            top: s.top, left: s.left, width: s.size, height: s.size,
            opacity: theme.isLight ? s.opacity * 0.4 : s.opacity,
            backgroundColor: theme.isLight ? theme.purple : theme.accent + 'cc',
          }]} />
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* اللوغو */}
        <Animated.View style={[styles.logoWrap, { opacity: fadeAnim, transform: [{ translateY: titleY }] }]}>
          <Animated.Text style={[
            styles.logoText,
            { color: theme.accent, textShadowColor: theme.accent + '44', transform: [{ scale: pulseAnim }] },
          ]}>
            Arena
          </Animated.Text>
          <Text style={[styles.tagline, { color: theme.textMuted }]}>
            {lang === 'ar' ? 'ميدان التحدي' : 'The Challenge Arena'}
          </Text>
        </Animated.View>

        {/* ── اختيار اللغة والتجربة ── */}
        <Animated.View style={[styles.pickersWrap, { opacity: fadeAnim }]}>
          <OptionPicker
            label={lang === 'ar' ? 'اللغة' : 'Language'}
            options={langOptions}
            selected={lang}
            onSelect={setLang}
            theme={theme}
          />
          <OptionPicker
            label={lang === 'ar' ? 'نوع التجربة' : 'Experience'}
            options={expOptions}
            selected={experience}
            onSelect={setExperience}
            theme={theme}
          />
        </Animated.View>

        {/* ── الأزرار ── */}
        <Animated.View style={[styles.btnsWrap, { opacity: fadeAnim, transform: [{ translateY: btnY }] }]}>

          {/* Google */}
          <ThemedButton
            onPress={handleGoogle}
            label={loadingGoogle ? '...' : (lang === 'ar' ? 'تسجيل الدخول بـ Google' : 'Sign in with Google')}
            emoji="G"
            variant="primary"
            size="large"
            disabled={!request || loadingGoogle}
          />

          {/* Apple — iOS فقط */}
          {appleAvailable && (
            <ThemedButton
              onPress={handleApple}
              label={loadingApple ? '...' : (lang === 'ar' ? 'تسجيل الدخول بـ Apple' : 'Sign in with Apple')}
              emoji=""
              variant="primary"
              size="large"
              disabled={loadingApple}
            />
          )}

          {/* فاصل */}
          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: theme.divider }]} />
            <Text style={[styles.dividerText, { color: theme.textMuted }]}>
              {lang === 'ar' ? 'أو' : 'or'}
            </Text>
            <View style={[styles.dividerLine, { backgroundColor: theme.divider }]} />
          </View>

          {/* ضيف */}
          <ThemedButton
            onPress={handleGuest}
            label={loadingGuest ? '...' : (lang === 'ar' ? 'متابعة كضيف' : 'Continue as Guest')}
            emoji="👤"
            variant="ghost"
            size="medium"
            disabled={loadingGuest}
          />
          {false && <Text style={[styles.guestText, { color: theme.textMuted }]}>
                  👤 {lang === 'ar' ? 'متابعة كضيف' : 'Continue as Guest'}
                </Text>
            }

          <Text style={[styles.guestNote, { color: theme.textMuted + '99' }]}>
            {lang === 'ar'
              ? 'تقدم الضيف يُحفظ على جهازك فقط'
              : 'Guest progress is saved on this device only'}
          </Text>
        </Animated.View>

        <MergeConflictModal
          visible={!!mergeConflict}
          onContinue={handleConflictContinue}
          onCancel={handleConflictCancel}
          theme={theme}
          lang={lang}
        />

        <Animated.Text style={[styles.footer, { opacity: fadeAnim, color: theme.textMuted }]}>
          Arnex Studio © 2026
        </Animated.Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1 },
  scroll:       { flexGrow: 1, alignItems: 'center', justifyContent: 'space-between', paddingTop: 70, paddingBottom: 36, paddingHorizontal: 28, gap: 32 },
  star:         { position: 'absolute', borderRadius: 99 },
  logoWrap:     { alignItems: 'center' },
  logoText:     { fontSize: 72, fontWeight: '900', letterSpacing: 2, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 28 },
  tagline:      { fontSize: 16, marginTop: 8, letterSpacing: 1 },
  pickersWrap:  { width: '100%', gap: 12 },
  btnsWrap:     { width: '100%', gap: 14 },
  googleBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 16, borderRadius: 18, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8 },
  appleBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, borderRadius: 18, backgroundColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  btnDisabled:  { opacity: 0.55 },
  googleIcon:   { fontSize: 18, fontWeight: '900', fontStyle: 'italic' },
  googleText:   { fontSize: 16, fontWeight: '800' },
  appleIcon:    { fontSize: 20, color: '#ffffff', marginRight: 4 },
  appleText:    { fontSize: 16, fontWeight: '700', color: '#ffffff' },
  dividerRow:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dividerLine:  { flex: 1, height: 1 },
  dividerText:  { fontSize: 13 },
  guestBtn:     { paddingVertical: 11, borderRadius: 14, borderWidth: 1, alignItems: 'center' },
  guestText:    { fontSize: 14, fontWeight: '600' },
  guestNote:    { fontSize: 11, textAlign: 'center', marginTop: -6 },
  footer:       { fontSize: 11 },
});
