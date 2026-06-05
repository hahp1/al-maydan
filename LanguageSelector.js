/**
 * LanguageSelector.js — أيقونة تبديل اللغة مع قائمة منسدلة
 * ════════════════════════════════════════════════════════════
 * - تعرض اللغة الحالية (🌐 English ▾)
 * - عند الضغط: قائمة منسدلة بكل اللغات المتاحة
 * - قابلة للتوسع: فقط غيّر enabled: true لإضافة لغة جديدة
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated,
  Modal, Pressable,
} from 'react-native';
import { useLanguage, useT } from './I18n';
import { useTheme } from './ThemeContext';
import { ThemedCard } from './ThemedComponents';

// ══════════════════════════════════════════════════════════════
// قائمة اللغات — قابلة للتوسع
// لإضافة لغة جديدة: غيّر enabled: false إلى true
// ══════════════════════════════════════════════════════════════
export const AVAILABLE_LANGUAGES = [
  { code: 'en', name: 'English',    nativeName: 'English',            flag: '🇬🇧', rtl: false, enabled: true  },
  { code: 'ar', name: 'Arabic',     nativeName: 'العربية',            flag: '🇸🇦', rtl: true,  enabled: true  },
  { code: 'tr', name: 'Turkish',    nativeName: 'Türkçe',             flag: '🇹🇷', rtl: false, enabled: false },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia',   flag: '🇮🇩', rtl: false, enabled: false },
  { code: 'fa', name: 'Persian',    nativeName: 'فارسی',              flag: '🇮🇷', rtl: true,  enabled: false },
  { code: 'es', name: 'Spanish',    nativeName: 'Español',            flag: '🇪🇸', rtl: false, enabled: false },
  { code: 'fr', name: 'French',     nativeName: 'Français',           flag: '🇫🇷', rtl: false, enabled: false },
];

export const getActiveLanguages = () =>
  AVAILABLE_LANGUAGES.filter(l => l.enabled);

export const getLanguageByCode = (code) =>
  AVAILABLE_LANGUAGES.find(l => l.code === code) || AVAILABLE_LANGUAGES[0];

// ══════════════════════════════════════════════════════════════
// Component
// ══════════════════════════════════════════════════════════════
export default function LanguageSelector({ compact = false }) {
  const { lang, setLang } = useLanguage();
  const t = useT();
  const { theme, isDark } = useTheme();
  const [open, setOpen] = useState(false);
  const arrowAnim = useRef(new Animated.Value(0)).current;
  const activeLanguages = getActiveLanguages();
  const current = getLanguageByCode(lang);

  useEffect(() => {
    Animated.timing(arrowAnim, {
      toValue: open ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [open]);

  const arrowRotation = arrowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const handleSelect = async (code) => {
    setOpen(false);
    if (code !== lang) {
      await setLang(code);
    }
  };

  return (
    <>
      {/* الزر الرئيسي */}
      <ThemedCard
        onPress={() => setOpen(true)}
        style={styles.trigger}
      >
        <Text style={styles.globeIcon}>🌐</Text>
        {!compact && (
          <Text style={[styles.triggerText, { color: theme.textPrimary }]}>
            {current.nativeName}
          </Text>
        )}
        <Animated.Text
          style={[
            styles.arrow,
            { color: theme.textMuted, transform: [{ rotate: arrowRotation }] },
          ]}
        >
          ▾
        </Animated.Text>
      </ThemedCard>

      {/* القائمة المنسدلة كـ Modal */}
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
        statusBarTranslucent
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            style={[
              styles.menu,
              {
                backgroundColor: theme.bgCard,
                borderColor: theme.border,
                shadowColor: theme.bg,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.menuTitle, { color: theme.textMuted }]}>
              {t('langselector.choose')}
            </Text>

            {activeLanguages.map((l) => {
              const isActive = l.code === lang;
              return (
                <TouchableOpacity
                  key={l.code}
                  style={[
                    styles.menuItem,
                    {
                      backgroundColor: isActive
                        ? theme.accentSoft
                        : 'transparent',
                    },
                  ]}
                  onPress={() => handleSelect(l.code)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.menuFlag}>{l.flag}</Text>
                  <Text
                    style={[
                      styles.menuItemText,
                      {
                        color: isActive ? theme.accent : theme.textPrimary,
                        fontWeight: isActive ? '800' : '600',
                      },
                    ]}
                  >
                    {l.nativeName}
                  </Text>
                  {isActive && (
                    <Text style={[styles.check, { color: theme.accent }]}>✓</Text>
                  )}
                </TouchableOpacity>
              );
            })}

            <View style={[styles.divider, { backgroundColor: theme.divider || '#00000010' }]} />
            <Text style={[styles.comingSoon, { color: theme.textMuted }]}>
              {t('langselector.comingSoon')}
            </Text>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 22,
    borderWidth: 1,
  },
  globeIcon:    { fontSize: 16 },
  triggerText:  { fontSize: 14, fontWeight: '700', letterSpacing: 0.3 },
  arrow:        { fontSize: 12, fontWeight: '900' },

  backdrop: {
    flex: 1,
    backgroundColor: '#00000060',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  menu: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  menuTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginVertical: 2,
  },
  menuFlag:     { fontSize: 26 },
  menuItemText: { flex: 1, fontSize: 16 },
  check:        { fontSize: 18, fontWeight: '900' },
  divider:      { height: 1, marginVertical: 10 },
  comingSoon:   { fontSize: 12, textAlign: 'center', fontStyle: 'italic', paddingVertical: 4 },
});
