import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Core imports — نصف الأول ──
import { ThemeProvider, useTheme, ALL_THEMES } from './ThemeContext';
import { LanguageProvider, LangSync } from './I18n';
import { ThemedButton } from './ThemedComponents';
import ErrorBoundary from './ErrorBoundary';
import NetStatus from './NetStatus';
import { useTokenSync } from './useTokenSync';
import { XPNotification, useXPNotify } from './XPNotification';
import { useProStatus, usePurchasedThemes, isThemeUnlocked } from './ProService';
import { auth } from './firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { initServerTime } from './ServerTime';
import { useCachedCategories } from './UseCachedCategories';

// ── شاشات أساسية ──
import LoginScreen from './LoginScreen';
import HomeScreen from './HomeScreen';
import HeartsModal from './HeartsModal';
import { loadHearts } from './HeartsService';
import { initSoundService, playBgMusic } from './SoundService';
import OnboardingScreen, { EXPERIENCE_KEY, EXPERIENCES } from './OnboardingScreen';

function Inner() {
  const { theme } = useTheme();
  return (
    <View style={[s.root, { backgroundColor: theme.bg }]}>
      <Text style={[s.text, { color: theme.accent }]}>✅ Build 2 يعمل</Text>
      <Text style={[s.sub, { color: theme.textSecondary }]}>Core imports OK</Text>
    </View>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <ThemeProvider>
          <Inner />
        </ThemeProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}

const s = StyleSheet.create({
  root: { flex:1, alignItems:'center', justifyContent:'center' },
  text: { fontSize:28, fontWeight:'900', marginBottom:8 },
  sub:  { fontSize:16 },
});
