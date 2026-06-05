/**
 * LifelineBar.js — وسائل المساعدة (محدّثة)
 * ═══════════════════════════════════════════
 * الأسماء الجديدة:
 *   💡 تلميح             = 3 توكنز  (Classic فقط)
 *   ➖ حذف اجابتين       = 3 توكنز  (MCQ/Solo/Online فقط)
 *   🔄 تغيير السؤال      = 3 توكنز  (الكل)
 *   🎲 تغيير الفئة       = 4 توكنز  (الكل)
 *   ⏩ تمديد الوقت +2د    = 5 توكنز  (Solo/Online فقط)
 *
 * قواعد:
 *   - كل وسيلة مرة واحدة فقط لكل لعبة كاملة (لا تتجدد بين الأسئلة)
 *   - تتجدد فقط عند بدء لعبة جديدة
 *   - بديل مجاني: مشاهدة إعلان (يوقف المؤقت أثناء الإعلان)
 *   - البريميوم: كل الوسائل مجانية تماماً
 */

import { useState, memo, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Modal, ActivityIndicator, Alert,
} from 'react-native';
import { useTheme } from './ThemeContext';
import { ThemedButton, ThemedCard, ThemedPill, ThemedRow } from './ThemedComponents';

// مدة تمديد الوقت بالثواني (120 ثانية = دقيقتان)
const EXTEND_SECS = 120;

const LIFELINES = [
  {
    key:   'hint',
    emoji: '💡',
    label: 'تلميح',
    desc:  'أول حرف من الجواب',
    cost:  3,
    modes: ['classic'],
  },
  {
    key:   'eliminate',
    emoji: '➖',
    label: 'حذف اجابتين',
    desc:  'أزل اثنتين من الإجابات الخاطئة',
    cost:  3,
    modes: ['mcq', 'solo', 'online'],
  },
  {
    key:   'swapSame',
    emoji: '🔄',
    label: 'تغيير السؤال',
    desc:  'سؤال آخر — نفس الفئة والمستوى',
    cost:  3,
    modes: ['classic', 'mcq', 'solo', 'online'],
  },
  {
    key:   'swapRandom',
    emoji: '🎲',
    label: 'تغيير الفئة',
    desc:  'سؤال من أي فئة',
    cost:  4,
    modes: ['classic', 'mcq', 'solo', 'online'],
  },
  {
    key:   'extend',
    emoji: '⏩',
    label: `تمديد الوقت`,
    desc:  `يضيف ${EXTEND_SECS / 60} دقيقتين للوقت المتبقي`,
    cost:  5,
    modes: ['solo', 'online'],
  },
];

// ══════════════════════════════════════════════
//  LifelineBtn
// ══════════════════════════════════════════════
const LifelineBtn = memo(({ lifeline, used, onPress, theme, isPremium }) => (
  <ThemedCard
    onPress={() => !used && onPress(lifeline)}
    disabled={used}
    style={[styles.btn, used && styles.btnUsed]}
  >
    <Text style={[styles.btnEmoji, used && styles.emojiUsed]}>
      {used ? '✓' : lifeline.emoji}
    </Text>
    <Text
      style={[styles.btnLabel, { color: used ? theme.textMuted : theme.textPrimary }]}
      numberOfLines={1}
    >
      {used ? 'استُخدمت' : lifeline.label}
    </Text>
    {!used && (
      <View style={[styles.costBadge, { backgroundColor: theme.accent + '22' }]}>
        <Text style={[styles.costText, { color: theme.accent }]}>
          {isPremium ? '🆓' : `🪙${lifeline.cost}`}
        </Text>
      </View>
    )}
  </ThemedCard>
));

// ══════════════════════════════════════════════
//  ConfirmModal
// ══════════════════════════════════════════════
const ConfirmModal = memo(({
  visible, lifeline, tokens, isPremium,
  onConfirm, onWatchAd, onCancel, theme,
}) => {
  const [loading, setLoading] = useState(false);
  const canAfford = isPremium || tokens >= (lifeline?.cost ?? 0);

  const handleConfirm = useCallback(async () => {
    setLoading(true);
    await onConfirm();
    setLoading(false);
  }, [onConfirm]);

  const handleAd = useCallback(async () => {
    setLoading(true);
    await onWatchAd();
    setLoading(false);
  }, [onWatchAd]);

  if (!lifeline) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalBox, { backgroundColor: theme.bgCard, borderColor: theme.accentBorder }]}>
          <Text style={styles.modalEmoji}>{lifeline.emoji}</Text>
          <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>{lifeline.label}</Text>
          <Text style={[styles.modalDesc,  { color: theme.textSecondary }]}>{lifeline.desc}</Text>

          <View style={[styles.priceRow, { backgroundColor: theme.bgElevated }]}>
            {isPremium ? (
              <Text style={[styles.priceValue, { color: '#f59e0b' }]}>💎 مجاني — بريميوم</Text>
            ) : (
              <>
                <Text style={[styles.priceLabel,   { color: theme.textSecondary }]}>السعر</Text>
                <Text style={[styles.priceValue,   { color: theme.accent }]}>🪙 {lifeline.cost}</Text>
                <Text style={[styles.balanceLabel, { color: canAfford ? theme.success : theme.error }]}>
                  رصيدك: {tokens} {canAfford ? '✓' : '✗'}
                </Text>
              </>
            )}
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={theme.accent} style={{ marginTop: 16 }} />
          ) : (
            <View style={styles.modalBtns}>
              {canAfford && (
                <ThemedButton onPress={handleConfirm} label={isPremium ? '💎 استخدم مجاناً' : `🪙 استخدم ${lifeline.cost} توكن`} variant='primary' size='large' style={styles.modalBtnPrimary} />
              )}
              {!isPremium && (
                <ThemedButton onPress={handleAd} label='📺 شاهد إعلاناً مجاناً' variant='secondary' size='large' style={styles.modalBtnAd} />
              )}
              <ThemedButton onPress={onCancel} label='إلغاء' variant='ghost' size='medium' style={styles.modalBtnCancel} />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
});

// ══════════════════════════════════════════════
//  LifelinesBar — المكوّن الرئيسي
//
//  Props:
//   mode:           'classic' | 'mcq' | 'solo' | 'online'
//   tokens:         number
//   isPremium:      boolean
//   onSpendTokens:  (cost) => boolean|Promise<boolean>
//   onWatchAd:      () => Promise<void>
//   onTimerPause:   () => void           ← يوقف المؤقت (للإعلان)
//   onTimerResume:  () => void           ← يستأنف المؤقت
//   onTimerExtend:  (seconds) => void    ← يضيف ثواني للمؤقت (تمديد الوقت)
//   onHint:         () => string         ← يرجع أول حرف من الجواب
//   onEliminate:    () => void
//   onSwapSame:     () => void
//   onSwapRandom:   () => void
//   usedLifelines:  Set<string>          ← الوسائل المستخدمة في هذه اللعبة
//   onLifelineUsed: (key) => void
// ══════════════════════════════════════════════
export default function LifelinesBar({
  mode = 'classic',
  tokens = 0,
  isPremium = false,
  onSpendTokens,
  onWatchAd,
  onTimerPause,
  onTimerResume,
  onTimerExtend,
  onHint,
  onEliminate,
  onSwapSame,
  onSwapRandom,
  usedLifelines = new Set(),
  onLifelineUsed,
}) {
  const { theme } = useTheme();
  const [selected, setSelected] = useState(null);

  const visible = LIFELINES.filter(l => l.modes.includes(mode));

  const executeLifeline = useCallback(async (lifeline) => {
    switch (lifeline.key) {
      case 'hint': {
        const firstLetter = onHint?.();
        return firstLetter;
      }
      case 'eliminate':
        onEliminate?.();
        break;
      case 'swapSame':
        onSwapSame?.();
        break;
      case 'swapRandom':
        onSwapRandom?.();
        break;
      case 'extend':
        // تمديد الوقت: يضيف EXTEND_SECS للمؤقت الحالي
        onTimerExtend?.(EXTEND_SECS);
        break;
    }
    return null;
  }, [onHint, onEliminate, onSwapSame, onSwapRandom, onTimerExtend]);

  const finish = useCallback(async (lifeline, withAd = false) => {
    if (withAd) {
      // وقف المؤقت أثناء مشاهدة الإعلان
      onTimerPause?.();
      try {
        await onWatchAd?.();
      } finally {
        onTimerResume?.();
      }
    } else if (!isPremium) {
      const ok = await onSpendTokens?.(lifeline.cost);
      if (ok === false) {
        Alert.alert('رصيد غير كافٍ', 'شاهد إعلاناً للحصول على الوسيلة مجاناً');
        return;
      }
    }
    const result = await executeLifeline(lifeline);
    onLifelineUsed?.(lifeline.key);
    if (lifeline.key === 'hint' && result) {
      Alert.alert('💡 تلميح', `الإجابة تبدأ بـ: "${result}"`);
    }
    setSelected(null);
  }, [isPremium, onSpendTokens, onWatchAd, onTimerPause, onTimerResume, executeLifeline, onLifelineUsed]);

  return (
    <>
      <View style={styles.bar}>
        <Text style={[styles.barLabel, { color: theme.textMuted }]}>🛡️ وسائل المساعدة</Text>
        <View style={styles.btnsRow}>
          {visible.map(l => (
            <LifelineBtn
              key={l.key}
              lifeline={l}
              used={usedLifelines.has(l.key)}
              onPress={setSelected}
              theme={theme}
              isPremium={isPremium}
            />
          ))}
        </View>
      </View>

      <ConfirmModal
        visible={!!selected}
        lifeline={selected}
        tokens={tokens}
        isPremium={isPremium}
        onConfirm={() => finish(selected, false)}
        onWatchAd={() => finish(selected, true)}
        onCancel={() => setSelected(null)}
        theme={theme}
      />
    </>
  );
}

// ══════════════════════════════════════════════
//  Styles
// ══════════════════════════════════════════════
const styles = StyleSheet.create({
  bar:                { gap: 6 },
  barLabel:           { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  btnsRow:            { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  btn:                { alignItems: 'center', gap: 2, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 14, borderWidth: 1, minWidth: 72 },
  btnUsed:            { opacity: 0.35, borderStyle: 'dashed' },
  btnEmoji:           { fontSize: 22 },
  emojiUsed:          { fontSize: 16 },
  btnLabel:           { fontSize: 10, fontWeight: '700', textAlign: 'center' },
  costBadge:          { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, marginTop: 2 },
  costText:           { fontSize: 9, fontWeight: '800' },
  modalOverlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalBox:           { width: '100%', maxWidth: 360, borderRadius: 24, padding: 24, gap: 12, alignItems: 'center', borderWidth: 1 },
  modalEmoji:         { fontSize: 48 },
  modalTitle:         { fontSize: 20, fontWeight: '900', textAlign: 'center' },
  modalDesc:          { fontSize: 14, textAlign: 'center' },
  priceRow:           { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 10, borderRadius: 14, width: '100%', justifyContent: 'center' },
  priceLabel:         { fontSize: 13 },
  priceValue:         { fontSize: 18, fontWeight: '900' },
  balanceLabel:       { fontSize: 13, fontWeight: '700' },
  modalBtns:          { width: '100%', gap: 10, marginTop: 4 },
  modalBtnPrimary:    { paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  modalBtnAd:         { paddingVertical: 14, borderRadius: 14, alignItems: 'center', borderWidth: 1 },
  modalBtnCancel:     { paddingVertical: 10, alignItems: 'center' },
  modalBtnText:       { fontSize: 15, fontWeight: '800' },
  modalBtnCancelText: { fontSize: 14 },
});
