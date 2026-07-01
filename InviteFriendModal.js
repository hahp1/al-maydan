/**
 * InviteFriendModal.js
 * ═══════════════════════════════════════════════════════════════
 * مودال دعوة موحّد لكل الألعاب التي فيها غرف أونلاين.
 *
 * يحتوي مرتّباً:
 *   1) كرت الكود + الرابط المباشر (ضغطة = نسخ الرابط) + توست بالثيم
 *   2) زر «إرسال الرابط» → Share.share (يفتح واتساب/تيليجرام…)
 *   3) قائمة الأصدقاء لإرسال دعوة داخل التطبيق (إن وُجدوا)
 *
 * الرابط: https://playarnex.com/join/CODE  (App Link)
 *   - التطبيق مثبّت → يفتح مباشرة على مودال الانضمام
 *   - غير مثبّت    → صفحة join تحوّل إلى Google Play
 * ═══════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, Modal, ScrollView, TouchableOpacity,
  StyleSheet, Share, Animated, ActivityIndicator,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from './ThemeContext';
import { ThemedButton } from './ThemedComponents';
import { getFriendsList, sendGameInvite } from './friendService';

const WEB_BASE = 'https://playarnex.com';
export const buildJoinLink = (code) => `${WEB_BASE}/join/${code}`;

export default function InviteFriendModal({
  visible,
  onClose,
  code,
  gameLabel = 'مباراة',
  currentUser = null,
  isRTL = true,
}) {
  const { theme } = useTheme();
  const link = code ? buildJoinLink(code) : '';

  const [copied, setCopied]     = useState(false);
  const copiedAnim = useRef(new Animated.Value(0)).current;
  const copiedTimer = useRef(null);

  const [friends, setFriends]     = useState([]);
  const [loadingFr, setLoadingFr] = useState(false);
  const [invited, setInvited]     = useState({}); // uid -> 'sending'|'sent'

  // تحميل الأصدقاء عند الفتح (لمستخدم مسجّل فقط)
  useEffect(() => {
    if (!visible || !currentUser?.uid || currentUser?.isGuest) { setFriends([]); return; }
    let alive = true;
    setLoadingFr(true);
    getFriendsList(currentUser.uid)
      .then(list => { if (alive) setFriends(list || []); })
      .catch(() => { if (alive) setFriends([]); })
      .finally(() => { if (alive) setLoadingFr(false); });
    return () => { alive = false; };
  }, [visible, currentUser?.uid]);

  useEffect(() => () => { if (copiedTimer.current) clearTimeout(copiedTimer.current); }, []);

  const showCopied = useCallback(() => {
    setCopied(true);
    Animated.timing(copiedAnim, { toValue: 1, duration: 160, useNativeDriver: true }).start();
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => {
      Animated.timing(copiedAnim, { toValue: 0, duration: 200, useNativeDriver: true })
        .start(() => setCopied(false));
    }, 1500);
  }, []);

  const handleCopyLink = useCallback(async () => {
    if (!link) return;
    try { await Clipboard.setStringAsync(link); showCopied(); } catch (_) {}
  }, [link]);

  const handleShare = useCallback(async () => {
    if (!link) return;
    const msg = isRTL
      ? `تعال نلعب «${gameLabel}» في Arena! 🎮\nالكود: ${code}\nأو افتح الرابط مباشرة:\n${link}`
      : `Join me in "${gameLabel}" on Arena! 🎮\nCode: ${code}\nOr open directly:\n${link}`;
    try { await Share.share({ message: msg }); } catch (_) {}
  }, [link, code, gameLabel, isRTL]);

  const handleInviteFriend = useCallback(async (friend) => {
    if (!currentUser?.uid || !friend?.uid || !code) return;
    setInvited(prev => ({ ...prev, [friend.uid]: 'sending' }));
    try {
      await sendGameInvite(currentUser.uid, currentUser.name || 'لاعب', friend.uid, code, gameLabel);
      setInvited(prev => ({ ...prev, [friend.uid]: 'sent' }));
    } catch (_) {
      setInvited(prev => { const n = { ...prev }; delete n[friend.uid]; return n; });
    }
  }, [currentUser, code, gameLabel]);

  if (!visible) return null;

  const displayCode = code
    ? (code.length > 4 ? code.replace(/(.{1,3})/g, '$1 ').trim() : code)
    : '—';

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={s.overlay}>
        <View style={[s.box, { backgroundColor: theme.bgCard, borderColor: theme.borderCard || theme.border }]}>
          <Text style={[s.title, { color: theme.accent }]}>
            {isRTL ? '🎮 ادعُ صديقاً' : '🎮 Invite a friend'}
          </Text>

          {/* 1) كرت الكود + الرابط — ضغطة = نسخ الرابط */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleCopyLink}
            style={[s.codeCard, { backgroundColor: theme.bgElevated || theme.bg, borderColor: theme.accentBorder || theme.border }]}
          >
            <Text style={[s.codeLbl, { color: theme.textMuted }]}>
              {isRTL ? 'كود الغرفة' : 'Room code'}
            </Text>
            <Text style={[s.code, { color: theme.textPrimary }]}>{displayCode}</Text>
            <View style={[s.linkRow, { borderColor: theme.border }]}>
              <Text style={[s.linkText, { color: theme.accent }]} numberOfLines={1}>
                {link.replace('https://', '')}
              </Text>
              <Text style={[s.copyHint, { color: theme.textMuted }]}>
                {isRTL ? '📋 نسخ' : '📋 Copy'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* 2) إرسال الرابط (واتساب/تيليجرام…) */}
          <ThemedButton
            onPress={handleShare}
            label={isRTL ? '📤 إرسال الرابط' : '📤 Send link'}
            variant="primary"
            size="large"
            style={s.fullBtn}
          />

          {/* 3) دعوة الأصدقاء داخل التطبيق */}
          <View style={s.friendsSection}>
            <Text style={[s.sectionLbl, { color: theme.textSecondary }]}>
              {isRTL ? 'أو ادعُ صديقاً من قائمتك' : 'Or invite from your friends'}
            </Text>

            {(!currentUser?.uid || currentUser?.isGuest) ? (
              <Text style={[s.hint, { color: theme.textMuted }]}>
                {isRTL ? 'سجّل دخولك لإضافة أصدقاء ودعوتهم مباشرة' : 'Sign in to add and invite friends'}
              </Text>
            ) : loadingFr ? (
              <ActivityIndicator color={theme.accent} style={{ marginVertical: 12 }} />
            ) : friends.length === 0 ? (
              <Text style={[s.hint, { color: theme.textMuted }]}>
                {isRTL ? 'لا يوجد أصدقاء بعد — أضفهم من شاشة الأصدقاء' : 'No friends yet — add them in Friends'}
              </Text>
            ) : (
              <ScrollView style={{ maxHeight: 180 }} showsVerticalScrollIndicator={false}>
                {friends.map(fr => {
                  const st = invited[fr.uid];
                  return (
                    <View key={fr.uid} style={[s.friendRow, { borderColor: theme.border }]}>
                      <View style={[s.avatar, { backgroundColor: theme.bgElevated || theme.bg }]}>
                        <Text style={{ fontSize: 16 }}>{(fr.name || '?').charAt(0)}</Text>
                      </View>
                      <Text style={[s.friendName, { color: theme.textPrimary }]} numberOfLines={1}>
                        {fr.name || 'صديق'}
                      </Text>
                      <ThemedButton
                        onPress={() => handleInviteFriend(fr)}
                        label={st === 'sent' ? (isRTL ? '✓ تم' : '✓ Sent') : (isRTL ? 'دعوة' : 'Invite')}
                        variant={st === 'sent' ? 'ghost' : 'secondary'}
                        size="small"
                        disabled={!!st}
                        style={{ minWidth: 76 }}
                      />
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>

          <ThemedButton
            onPress={onClose}
            label={isRTL ? 'إغلاق' : 'Close'}
            variant="ghost"
            size="medium"
            style={s.fullBtn}
          />
        </View>

        {/* توست تم النسخ — بالثيم */}
        {copied && (
          <Animated.View
            pointerEvents="none"
            style={[
              s.toast,
              {
                backgroundColor: theme.bgElevated || theme.bgCard,
                borderColor: theme.accentBorder || theme.border,
                opacity: copiedAnim,
                transform: [{ translateY: copiedAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
              },
            ]}
          >
            <Text style={[s.toastText, { color: theme.accent }]}>
              {isRTL ? '✓ تم نسخ الرابط' : '✓ Link copied'}
            </Text>
          </Animated.View>
        )}
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  box:         { width: '100%', maxWidth: 380, borderRadius: 24, padding: 24, gap: 14, borderWidth: 1 },
  title:       { fontSize: 20, fontWeight: '900', textAlign: 'center' },
  codeCard:    { borderRadius: 18, borderWidth: 1.5, padding: 16, alignItems: 'center', gap: 6 },
  codeLbl:     { fontSize: 12, fontWeight: '700' },
  code:        { fontSize: 30, fontWeight: '900', letterSpacing: 4 },
  linkRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, width: '100%', marginTop: 6, paddingTop: 10, borderTopWidth: 1 },
  linkText:    { fontSize: 13, fontWeight: '700', flex: 1 },
  copyHint:    { fontSize: 12, fontWeight: '700' },
  fullBtn:     { width: '100%' },
  friendsSection: { gap: 8 },
  sectionLbl:  { fontSize: 13, fontWeight: '700', textAlign: 'center' },
  hint:        { fontSize: 13, textAlign: 'center', paddingVertical: 10 },
  friendRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1 },
  avatar:      { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  friendName:  { flex: 1, fontSize: 14, fontWeight: '700' },
  toast:       { position: 'absolute', bottom: 36, alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 14, borderWidth: 1.5 },
  toastText:   { fontSize: 14, fontWeight: '800' },
});
