/**
 * OnlineRoomSetup.js — نسخة نهائية
 * ════════════════════════════════════════════════
 *  ✅ mode='friend' يُخفي خيار "لعب عشوائي" (مسار مع صديق)
 *  ✅ mode='all' يُظهر الكل (المسار العام)
 *  ✅ بطاقة الكود: حقل كبير واضح + زر انضمام بعرض كامل تحته
 *  ✅ شاشة الانتظار: كود + نسخ + مشاركة + دعوة أصدقاء داخل التطبيق + إلغاء
 */

import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, StyleSheet, StatusBar,
  TouchableOpacity, Animated, Share, Alert,
  ActivityIndicator, ScrollView,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from './ThemeContext';
import { useLanguage } from './I18n';
import ExitButton from './ExitButton';
import { ThemedButton } from './ThemedComponents';
import { getFriendsList, sendGameInvite } from './friendService';

export default function OnlineRoomSetup({
  mode        = 'all',     // 'all' | 'friend'
  gameEmoji   = '🎮',
  gameTitleAr = 'لعبة',
  gameTitleEn = 'Game',
  descAr      = '',
  descEn      = '',
  localOption = false,     // إظهار خيار "على جهاز واحد"
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
  const textColor  = theme.textPrimary   || theme.accent || '#fff';
  const subColor   = theme.textSecondary || theme.textMuted;
  const cardBg     = theme.bgCard        || theme.bgElevated;
  const cardBorder = theme.borderCard    || theme.border;

  const OptionCard = ({ iconBg, emoji, titleText, subText, onPress }) => (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[s.optionCard, { backgroundColor: cardBg, borderColor: cardBorder }]}
    >
      <View style={[s.optionIcon, { backgroundColor: iconBg }]}>
        <Text style={s.optionEmoji}>{emoji}</Text>
      </View>
      <View style={s.optionText}>
        {!!titleText && <Text style={[s.optionTitle, { color: textColor }]}>{titleText}</Text>}
        {!!subText   && <Text style={[s.optionSub,   { color: subColor }]}>{subText}</Text>}
      </View>
      <Text style={[s.arrow, { color: subColor }]}>{'←'}</Text>
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
          {!!desc && <Text style={[s.desc, { color: subColor }]}>{desc}</Text>}
        </View>

        {/* ── خيار عشوائي — يظهر فقط في الوضع العام ── */}
        {mode !== 'friend' && (
          <OptionCard
            iconBg={theme.accentSoft}
            emoji="🌐"
            titleText={isRTL ? 'لعب عشوائي' : 'Random Match'}
            subText={isRTL ? 'ابحث عن منافس تلقائياً' : 'Find an opponent automatically'}
            onPress={() => onSelect('random')}
          />
        )}

        {/* ── خيار اللعب على جهاز واحد ── */}
        {localOption && (
          <OptionCard
            iconBg="#8b5cf620"
            emoji="📱"
            titleText={isRTL ? 'على جهاز واحد' : 'Same Device'}
            subText={isRTL ? 'تبادلا الجهاز كل دور — بلا إنترنت' : 'Pass the device each turn — offline'}
            onPress={() => onSelect('local')}
          />
        )}

        {/* ── إنشاء غرفة صديق ── */}
        <OptionCard
          iconBg="#10b98120"
          emoji="🔗"
          titleText={isRTL ? 'إنشاء غرفة' : 'Create Room'}
          subText={isRTL ? 'احصل على كود وشاركه مع صديقك' : 'Get a code and share it'}
          onPress={() => onSelect('create')}
        />

        {/* ── الانضمام بكود — حقل كبير + زر بعرض كامل ── */}
        <View style={[s.joinCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <View style={s.joinHeader}>
            <View style={[s.optionIcon, { backgroundColor: '#f59e0b20' }]}>
              <Text style={s.optionEmoji}>🔑</Text>
            </View>
            <Text style={[s.optionTitle, { color: textColor }]}>
              {isRTL ? 'انضم بكود صديقك' : 'Join with Code'}
            </Text>
          </View>

          <TextInput
            style={[
              s.codeInput,
              {
                backgroundColor: theme.bgInput || theme.bgElevated,
                color:           textColor,
                borderColor:     joinErr ? '#ef4444' : (theme.border || cardBorder),
              },
            ]}
            placeholder={isRTL ? '• • • • • •' : 'CODE'}
            placeholderTextColor={subColor}
            value={joinCode}
            onChangeText={v => { setJoinCode(v.toUpperCase()); setJoinErr(''); }}
            maxLength={8}
            autoCapitalize="characters"
            autoCorrect={false}
            textAlign="center"
            returnKeyType="go"
            onSubmitEditing={handleJoin}
          />

          {!!joinErr && <Text style={s.errorText}>{joinErr}</Text>}

          <ThemedButton
            onPress={handleJoin}
            label={isRTL ? 'انضم للغرفة' : 'Join Room'}
            variant="primary"
            size="large"
            style={s.joinBtn}
          />
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
  gameEmoji   = '🎮',
  gameLabel   = 'مباراة',
  currentUser = null,
}) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const [friends,    setFriends]    = useState([]);
  const [loadingFr,  setLoadingFr]  = useState(false);
  const [invitedSet, setInvitedSet] = useState({}); // uid -> 'sending'|'sent'

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

  // جلب قائمة الأصدقاء للدعوة الداخلية (فقط عند وجود كود ومستخدم مسجّل)
  useEffect(() => {
    const uid = currentUser?.uid;
    if (!isFriend || !friendCode || !uid) return;
    setLoadingFr(true);
    getFriendsList(uid)
      .then(setFriends)
      .catch(() => {})
      .finally(() => setLoadingFr(false));
  }, [isFriend, friendCode, currentUser?.uid]);

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

  const handleInvite = async (friend) => {
    const uid  = currentUser?.uid;
    const name = currentUser?.name || 'صديق';
    if (!uid || !friendCode || invitedSet[friend.uid]) return;
    setInvitedSet(p => ({ ...p, [friend.uid]: 'sending' }));
    const res = await sendGameInvite(uid, name, friend.uid, friendCode, gameLabel);
    setInvitedSet(p => ({ ...p, [friend.uid]: res?.success ? 'sent' : undefined }));
    if (!res?.success) {
      Alert.alert(isRTL ? 'تعذّر الإرسال' : 'Failed', isRTL ? 'حاول مجدداً' : 'Try again');
    }
  };

  const textColor = theme.textPrimary   || theme.accent || '#fff';
  const subColor  = theme.textSecondary || theme.textMuted;

  return (
    <View style={[wl.container, { backgroundColor: 'transparent' }]}>
      <StatusBar barStyle={theme.statusBar} />

      <View style={wl.topBar}>
        <ExitButton onPress={onCancel} />
      </View>

      <ScrollView
        contentContainerStyle={wl.scroll}
        showsVerticalScrollIndicator={false}
      >
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
              <ThemedButton onPress={handleCopy}  label={isRTL ? '📋 نسخ' : '📋 Copy'}   variant="secondary" size="small" style={wl.actionBtn} />
              <ThemedButton onPress={handleShare} label={isRTL ? '📤 مشاركة' : '📤 Share'} variant="primary"   size="small" style={wl.actionBtn} />
            </View>

            {/* دعوة أصدقاء داخل التطبيق */}
            <View style={wl.inviteSection}>
              <Text style={[wl.inviteTitle, { color: subColor }]}>
                {isRTL ? 'أو ادعُ صديقاً' : 'Or invite a friend'}
              </Text>

              {loadingFr ? (
                <ActivityIndicator color={theme.accent} style={{ marginTop: 8 }} />
              ) : friends.length === 0 ? (
                <Text style={[wl.noFriends, { color: subColor }]}>
                  {isRTL ? 'لا يوجد أصدقاء بعد — استخدم المشاركة' : 'No friends yet — use Share'}
                </Text>
              ) : (
                <View style={wl.friendsList}>
                  {friends.map(fr => {
                    const st = invitedSet[fr.uid];
                    return (
                      <View
                        key={fr.uid}
                        style={[wl.friendRow, { backgroundColor: theme.bgCard, borderColor: theme.border }]}
                      >
                        <View style={[wl.friendAvatar, { backgroundColor: theme.accentSoft }]}>
                          <Text style={[wl.friendAvatarTxt, { color: theme.accent }]}>
                            {(fr.name || '؟')[0]}
                          </Text>
                        </View>
                        <Text style={[wl.friendName, { color: textColor }]} numberOfLines={1}>
                          {fr.name}
                        </Text>
                        <ThemedButton
                          onPress={() => handleInvite(fr)}
                          disabled={!!st}
                          label={st === 'sent' ? (isRTL ? '✓ أُرسلت' : '✓ Sent')
                               : st === 'sending' ? '...'
                               : (isRTL ? 'دعوة' : 'Invite')}
                          variant={st === 'sent' ? 'secondary' : 'primary'}
                          size="small"
                          style={wl.inviteBtn}
                        />
                      </View>
                    );
                  })}
                </View>
              )}
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

        <ThemedButton
          onPress={onCancel}
          label={isRTL ? 'إلغاء' : 'Cancel'}
          variant="ghost"
          size="medium"
          style={{ marginTop: 8, minWidth: 200 }}
        />
      </ScrollView>
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

  joinCard:    { borderRadius: 18, borderWidth: 1.5, padding: 18, gap: 14 },
  joinHeader:  { flexDirection: 'row', alignItems: 'center', gap: 14 },
  codeInput:   {
    height: 60,
    borderRadius: 14,
    borderWidth: 2,
    paddingHorizontal: 16,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 8,
  },
  joinBtn:     { width: '100%' },
  errorText:   { color: '#ef4444', fontSize: 13, textAlign: 'center' },
});

const wl = StyleSheet.create({
  container:   { flex: 1, paddingTop: 56 },
  topBar:      { paddingHorizontal: 20 },
  scroll:      { alignItems: 'center', paddingHorizontal: 24, paddingBottom: 40, gap: 12 },
  emoji:       { fontSize: 60, marginTop: 8, marginBottom: 8 },
  title:       { fontSize: 20, fontWeight: '800', textAlign: 'center' },
  codeSection: { width: '100%', alignItems: 'center', gap: 10 },
  codeLbl:     { fontSize: 13, fontWeight: '600' },
  codeBox:     { width: '100%', borderRadius: 16, borderWidth: 2, paddingVertical: 16, paddingHorizontal: 20, alignItems: 'center', gap: 4 },
  codeText:    { fontSize: 32, fontWeight: '900', letterSpacing: 6 },
  copyHint:    { fontSize: 12 },
  btnsRow:     { flexDirection: 'row', gap: 12, width: '100%', justifyContent: 'center' },
  actionBtn:   { flex: 1, maxWidth: 160 },
  subText:     { fontSize: 14, textAlign: 'center' },

  inviteSection: { width: '100%', marginTop: 10, gap: 8 },
  inviteTitle:   { fontSize: 13, fontWeight: '700', textAlign: 'center' },
  noFriends:     { fontSize: 12, textAlign: 'center', marginTop: 4 },
  friendsList:   { gap: 8 },
  friendRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, borderWidth: 1, padding: 10 },
  friendAvatar:  { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  friendAvatarTxt:{ fontSize: 16, fontWeight: '800' },
  friendName:    { flex: 1, fontSize: 14, fontWeight: '700' },
  inviteBtn:     { minWidth: 76, flexShrink: 0 },

  dotsRow:     { flexDirection: 'row', gap: 8, marginTop: 8 },
  dot:         { width: 8, height: 8, borderRadius: 4, opacity: 0.7 },
});
