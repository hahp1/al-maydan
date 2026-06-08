/**
 * OnlineRoomSetup.js — محدّث
 * ════════════════════════════════════════════════
 *  ✅ Layout مُصلح: الأيقونة + النص في صف واحد صحيح
 *  ✅ textPrimary موثوق — fallback للـ accent
 *  ✅ شاشة الانتظار مُحدّثة
 */

import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, StyleSheet, StatusBar,
  TouchableOpacity, Animated, Share, Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from './ThemeContext';
import { useLanguage } from './I18n';
import ExitButton from './ExitButton';
import { ThemedButton } from './ThemedComponents';

export default function OnlineRoomSetup({
  gameEmoji   = '🎮',
  gameTitleAr = 'لعبة',
  gameTitleEn = 'Game',
  descAr      = '',
  descEn      = '',
  onBack,
  onSelect,
}) {
  const { theme } = useTheme();
  const { lang }  = useLanguage();
  const isRTL     = lang === 'ar';

  const [joinCode, setJoinCode] = useState('');
  const [joinErr,  setJoinErr]  = useState('');

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 320, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 320, useNativeDriver: true }),
    ]).start();
  }, []);

  const title = isRTL ? gameTitleAr : gameTitleEn;
  const desc  = isRTL ? descAr      : descEn;

  const handleJoin = () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length < 4) {
      setJoinErr(isRTL ? 'أدخل الكود كاملاً' : 'Enter the full code');
      return;
    }
    setJoinErr('');
    onSelect('join', code);
  };

  // ألوان مضمونة
  const textColor  = theme.textPrimary  || theme.accent || '#fff';
  const subColor   = theme.textSecondary || theme.textMuted;
  const cardBg     = theme.bgCard       || theme.bgElevated;
  const cardBorder = theme.borderCard   || theme.border;

  const OptionCard = ({ iconBg, emoji, titleText, subText, onPress, children }) => (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[s.optionCard, { backgroundColor: cardBg, borderColor: cardBorder }]}
    >
      <View style={[s.optionIcon, { backgroundColor: iconBg }]}>
        <Text style={s.optionEmoji}>{emoji}</Text>
      </View>
      <View style={s.optionText}>
        {titleText ? (
          <Text style={[s.optionTitle, { color: textColor }]}>{titleText}</Text>
        ) : null}
        {subText ? (
          <Text style={[s.optionSub, { color: subColor }]}>{subText}</Text>
        ) : null}
        {children}
      </View>
      {onPress && <Text style={[s.arrow, { color: subColor }]}>{'←'}</Text>}
    </TouchableOpacity>
  );

  return (
    <View style={[s.container, { backgroundColor: 'transparent' }]}>
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.statusBg} />
      <ExitButton onPress={onBack} />

      <Animated.View
        style={[s.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
      >
        {/* ── Header ── */}
        <View style={s.header}>
          <Text style={s.emoji}>{gameEmoji}</Text>
          <Text style={[s.title, { color: textColor }]}>{title}</Text>
          {!!desc && (
            <Text style={[s.desc, { color: subColor }]}>{desc}</Text>
          )}
        </View>

        {/* ── خيار عشوائي ── */}
        <OptionCard
          iconBg={theme.accentSoft}
          emoji="🌐"
          titleText={isRTL ? 'لعب عشوائي' : 'Random Match'}
          subText={isRTL ? 'ابحث عن منافس تلقائياً' : 'Find an opponent automatically'}
          onPress={() => onSelect('random')}
        />

        {/* ── إنشاء غرفة صديق ── */}
        <OptionCard
          iconBg="#10b98120"
          emoji="🔗"
          titleText={isRTL ? 'إنشاء غرفة مع صديق' : 'Create Friend Room'}
          subText={isRTL ? 'احصل على كود وشاركه' : 'Get a code and share it'}
          onPress={() => onSelect('create')}
        />

        {/* ── الانضمام بكود ── */}
        <View style={[s.optionCard, s.joinCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <View style={[s.optionIcon, { backgroundColor: '#f59e0b20' }]}>
            <Text style={s.optionEmoji}>🔑</Text>
          </View>
          <View style={s.joinContent}>
            <Text style={[s.optionTitle, { color: textColor }]}>
              {isRTL ? 'انضم بكود' : 'Join with Code'}
            </Text>
            <View style={s.joinRow}>
              <TextInput
                style={[
                  s.codeInput,
                  {
                    backgroundColor: theme.bgInput || theme.bgElevated,
                    color:           textColor,
                    borderColor:     joinErr ? '#ef4444' : (theme.border || cardBorder),
                  },
                ]}
                placeholder={isRTL ? 'أدخل الكود...' : 'Enter code...'}
                placeholderTextColor={subColor}
                value={joinCode}
                onChangeText={v => { setJoinCode(v.toUpperCase()); setJoinErr(''); }}
                maxLength={8}
                autoCapitalize="characters"
                textAlign="center"
                returnKeyType="go"
                onSubmitEditing={handleJoin}
              />
              <ThemedButton
                onPress={handleJoin}
                label={isRTL ? 'انضم' : 'Join'}
                variant="primary"
                size="small"
                style={s.joinBtn}
              />
            </View>
            {!!joinErr && (
              <Text style={s.errorText}>{joinErr}</Text>
            )}
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

// ── شاشة الانتظار ────────────────────────────────────────────
export function OnlineWaitingLobby({
  friendCode,
  isFriend,
  isRTL,
  theme,
  onCancel,
  gameEmoji = '🎮',
}) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const handleCopy = () => {
    if (!friendCode) return;
    Clipboard.setStringAsync(friendCode);
    Alert.alert(isRTL ? '✓ تم النسخ' : '✓ Copied', friendCode);
  };

  const handleShare = async () => {
    if (!friendCode) return;
    try {
      await Share.share({
        message: isRTL
          ? `انضم إليّ في Arena! كود الغرفة: ${friendCode}`
          : `Join me in Arena! Room code: ${friendCode}`,
      });
    } catch (_) {}
  };

  const textColor = theme.textPrimary || theme.accent || '#fff';
  const subColor  = theme.textSecondary || theme.textMuted;

  return (
    <View style={[wl.container, { backgroundColor: 'transparent' }]}>
      <StatusBar barStyle={theme.statusBar} />
      <ExitButton onPress={onCancel} />

      <Animated.Text style={[wl.emoji, { transform: [{ scale: pulseAnim }] }]}>
        {gameEmoji}
      </Animated.Text>

      <Text style={[wl.title, { color: textColor }]}>
        {isRTL ? 'في انتظار صديق...' : 'Waiting for friend...'}
      </Text>

      {isFriend && friendCode ? (
        <View style={wl.codeSection}>
          <Text style={[wl.codeLbl, { color: subColor }]}>
            {isRTL ? 'كود الغرفة' : 'Room Code'}
          </Text>
          <TouchableOpacity
            onPress={handleCopy}
            style={[wl.codeBox, { backgroundColor: theme.bgCard, borderColor: theme.accentBorder }]}
            activeOpacity={0.7}
          >
            <Text style={[wl.codeText, { color: theme.accent }]}>{friendCode}</Text>
            <Text style={[wl.copyHint, { color: subColor }]}>
              {isRTL ? '📋 اضغط للنسخ' : '📋 Tap to copy'}
            </Text>
          </TouchableOpacity>
          <View style={wl.btnsRow}>
            <ThemedButton onPress={handleCopy} label={isRTL ? '📋 نسخ' : '📋 Copy'} variant="secondary" size="small" style={wl.actionBtn} />
            <ThemedButton onPress={handleShare} label={isRTL ? '📤 مشاركة' : '📤 Share'} variant="primary" size="small" style={wl.actionBtn} />
          </View>
        </View>
      ) : (
        <Text style={[wl.subText, { color: subColor }]}>
          {isRTL ? 'يبحث عن منافس... (بوت بعد 60 ثانية)' : 'Finding opponent... (bot in 60s)'}
        </Text>
      )}

      <View style={wl.dotsRow}>
        {[0, 1, 2].map(i => (
          <View key={i} style={[wl.dot, { backgroundColor: theme.accent }]} />
        ))}
      </View>

      <ThemedButton onPress={onCancel} label={isRTL ? 'إلغاء' : 'Cancel'} variant="ghost" size="medium" style={{ marginTop: 8 }} />
    </View>
  );
}

// ════════════════════════════════════════════════
const s = StyleSheet.create({
  container:   { flex: 1, paddingTop: 56 },
  content:     { flex: 1, paddingHorizontal: 20, paddingBottom: 32, gap: 14 },
  header:      { alignItems: 'center', paddingVertical: 12, gap: 6 },
  emoji:       { fontSize: 48 },
  title:       { fontSize: 22, fontWeight: '900' },
  desc:        { fontSize: 13, textAlign: 'center' },
  // بطاقة الخيار — row layout مباشر بدون ThemedCard
  optionCard:  {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
    borderRadius: 18,
    borderWidth: 1.5,
  },
  optionIcon:  { width: 50, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  optionEmoji: { fontSize: 24 },
  optionText:  { flex: 1, gap: 3 },
  optionTitle: { fontSize: 15, fontWeight: '800' },
  optionSub:   { fontSize: 12 },
  arrow:       { fontSize: 18, fontWeight: '700', flexShrink: 0 },
  // بطاقة الكود
  joinCard:    { alignItems: 'flex-start' },
  joinContent: { flex: 1, gap: 10 },
  joinRow:     { flexDirection: 'row', gap: 8, alignItems: 'center' },
  codeInput:   { flex: 1, height: 42, borderRadius: 10, borderWidth: 1.5, paddingHorizontal: 12, fontSize: 16, fontWeight: '800', letterSpacing: 3 },
  joinBtn:     { flexShrink: 0 },
  errorText:   { color: '#ef4444', fontSize: 12, textAlign: 'right' },
});

const wl = StyleSheet.create({
  container:   { flex: 1, paddingTop: 56, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 12 },
  emoji:       { fontSize: 60, marginBottom: 8 },
  title:       { fontSize: 20, fontWeight: '800', textAlign: 'center' },
  codeSection: { width: '100%', alignItems: 'center', gap: 10 },
  codeLbl:     { fontSize: 13, fontWeight: '600' },
  codeBox:     { width: '100%', borderRadius: 16, borderWidth: 2, paddingVertical: 16, paddingHorizontal: 20, alignItems: 'center', gap: 4 },
  codeText:    { fontSize: 32, fontWeight: '900', letterSpacing: 6 },
  copyHint:    { fontSize: 12 },
  btnsRow:     { flexDirection: 'row', gap: 12, width: '100%', justifyContent: 'center' },
  actionBtn:   { flex: 1, maxWidth: 160 },
  subText:     { fontSize: 14, textAlign: 'center' },
  dotsRow:     { flexDirection: 'row', gap: 8, marginTop: 8 },
  dot:         { width: 8, height: 8, borderRadius: 4, opacity: 0.7 },
});
