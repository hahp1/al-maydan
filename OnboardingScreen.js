/**
 * OnboardingScreen.js — شاشة اختيار التجربة
 * ════════════════════════════════════════════════════════════
 * تظهر مرة واحدة فقط عند أول فتح للتطبيق
 * يختار المستخدم بين:
 *   🌍 Global Games  — ألعاب فقط، عالمي
 *   🕌 التجربة العربية — كل شيء (ألعاب + أسئلة ثقافية)
 *
 * الاختيار يُحفظ في AsyncStorage ولا يُسأل مرة ثانية
 * يمكن تغييره من SettingsScreen
 */

import React, { useRef, useEffect, useCallback, useState } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  StatusBar, Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from './ThemeContext';
import { useLanguage } from './I18n';
import LanguageSelector from './LanguageSelector';
import { ThemedButton, ThemedCard, ThemedPill, ThemedModal, ThemedRow } from './ThemedComponents';

export const EXPERIENCE_KEY = 'arena_experience';

export const EXPERIENCES = {
  GLOBAL: 'global',
  ARABIC: 'arabic',
};

export default function OnboardingScreen({ onSelect }) {
  const { theme, isDark } = useTheme();
  const { t } = useLanguage();
  const [selecting, setSelecting] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const logoY    = useRef(new Animated.Value(-30)).current;
  const card1Y   = useRef(new Animated.Value(50)).current;
  const card2Y   = useRef(new Animated.Value(50)).current;
  const langY    = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(logoY,  { toValue: 0, friction: 7, useNativeDriver: true }),
      Animated.spring(langY,  { toValue: 0, friction: 8, delay: 100, useNativeDriver: true }),
      Animated.spring(card1Y, { toValue: 0, friction: 7, delay: 250, useNativeDriver: true }),
      Animated.spring(card2Y, { toValue: 0, friction: 7, delay: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleSelect = useCallback(async (experience) => {
    if (selecting) return;
    setSelecting(true);
    try {
      await AsyncStorage.setItem(EXPERIENCE_KEY, experience);
      onSelect?.(experience);
    } catch (e) {
      console.error('Failed to save experience:', e);
      setSelecting(false);
    }
  }, [onSelect, selecting]);

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.statusBg} />

      {/* أيقونة اللغة */}
      <Animated.View
        style={[
          styles.langWrap,
          { opacity: fadeAnim, transform: [{ translateY: langY }] },
        ]}
      >
        <LanguageSelector />
      </Animated.View>

      {/* اللوغو */}
      <Animated.View
        style={[
          styles.logoWrap,
          { opacity: fadeAnim, transform: [{ translateY: logoY }] },
        ]}
      >
        <Text style={[styles.logo, { color: theme.accent }]}>Arena</Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>
          {t('onboarding.choose')}
        </Text>
      </Animated.View>

      {/* البطاقات */}
      <View style={styles.cardsWrap}>
        {/* Global Games */}
        <Animated.View
          style={{ opacity: fadeAnim, transform: [{ translateY: card1Y }] }}
        >
          <ThemedCard onPress={() => !selecting && handleSelect(EXPERIENCES.GLOBAL)} radius={20} padding={20} variant="default">
            <Text style={styles.cardIcon}>🌍</Text>
            <View style={styles.cardContent}>
              <Text style={[styles.cardTitle, { color: theme.purple }]}>
                {t('onboarding.global.title')}
              </Text>
              <Text style={[styles.cardDesc, { color: theme.textMuted }]}>
                {t('onboarding.global.desc')}
              </Text>
              <View style={styles.cardFeatures}>
                <Text style={[styles.feature, { color: theme.textMuted }]}>
                  {t('onboarding.global.f1')}
                </Text>
                <Text style={[styles.feature, { color: theme.textMuted }]}>
                  {t('onboarding.global.f2')}
                </Text>
                <Text style={[styles.feature, { color: theme.textMuted }]}>
                  {t('onboarding.global.f3')}
                </Text>
              </View>
            </View>
            <Text style={[styles.arrow, { color: theme.purple }]}>›</Text>
          </ThemedCard>
        </Animated.View>

        {/* التجربة العربية */}
        <Animated.View
          style={{ opacity: fadeAnim, transform: [{ translateY: card2Y }] }}
        >
          <ThemedCard onPress={() => !selecting && handleSelect(EXPERIENCES.ARABIC)} radius={20} padding={20} variant="accent">
            <Text style={styles.cardIcon}>🕌</Text>
            <View style={styles.cardContent}>
              <Text style={[styles.cardTitle, styles.arTitle, { color: theme.accent }]}>
                {t('onboarding.arabic.title')}
              </Text>
              <Text style={[styles.cardDesc, styles.arText, { color: theme.textMuted }]}>
                {t('onboarding.arabic.desc')}
              </Text>
              <View style={styles.cardFeatures}>
                <Text style={[styles.feature, styles.arText, { color: theme.textMuted }]}>
                  {t('onboarding.arabic.f1')}
                </Text>
                <Text style={[styles.feature, styles.arText, { color: theme.textMuted }]}>
                  {t('onboarding.arabic.f2')}
                </Text>
                <Text style={[styles.feature, styles.arText, { color: theme.textMuted }]}>
                  {t('onboarding.arabic.f3')}
                </Text>
              </View>
            </View>
            <Text style={[styles.arrow, { color: theme.accent }]}>›</Text>
          </ThemedCard>
        </Animated.View>
      </View>

      {/* Footer */}
      <Animated.Text
        style={[styles.footer, { opacity: fadeAnim, color: theme.textMuted }]}
      >
        {t('onboarding.footer')}
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: 24,
  },
  langWrap: {
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  logoWrap: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 40,
  },
  logo: {
    fontSize: 56,
    fontWeight: '900',
    letterSpacing: 2,
    textShadowColor: '#f5c51844',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 14,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  cardsWrap: {
    flex: 1,
    justifyContent: 'center',
    gap: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1.5,
    gap: 16,
  },
  cardIcon:    { fontSize: 44 },
  cardContent: { flex: 1 },
  cardTitle: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  arTitle:  { textAlign: 'right', letterSpacing: 0 },
  cardDesc: {
    fontSize: 13,
    marginBottom: 10,
    lineHeight: 18,
  },
  arText: { textAlign: 'right' },
  cardFeatures: { gap: 3 },
  feature: {
    fontSize: 12,
    lineHeight: 17,
  },
  arrow: {
    fontSize: 32,
    fontWeight: '300',
  },
  footer: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 20,
    opacity: 0.6,
  },
});
 
