import { memo } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from './ThemeContext';
import { useT } from './I18n';

const LeaveModal = memo(function LeaveModal({ visible, onCancel, onConfirm, message }) {
  const { theme } = useTheme();
  const t = useT();

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onCancel} statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: '#ef444440' }]}>
          <Text style={styles.emoji}>🚪</Text>
          <Text style={[styles.title, { color: theme.textPrimary }]}>{t('leave.title')}</Text>
          <Text style={[styles.msg, { color: theme.textSecondary }]}>{message || t('leave.message')}</Text>
          <View style={styles.btns}>
            <TouchableOpacity
              style={[styles.cancelBtn, { backgroundColor: theme.bgElevated, borderColor: theme.border }]}
              onPress={onCancel}
              activeOpacity={0.8}
            >
              <Text style={[styles.cancelText, { color: theme.textSecondary }]}>{t('leave.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={onConfirm} activeOpacity={0.8}>
              <Text style={[styles.confirmText, { color: theme.error }]}>{t('leave.confirm')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
});

export default LeaveModal;

const styles = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: '#000000aa', alignItems: 'center', justifyContent: 'center', padding: 32 },
  card:       { borderRadius: 24, borderWidth: 1.5, padding: 28, width: '100%', alignItems: 'center', gap: 12 },
  emoji:      { fontSize: 40 },
  title:      { fontSize: 20, fontWeight: '900' },
  msg:        { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  btns:       { flexDirection: 'row', gap: 12, width: '100%', marginTop: 8 },
  cancelBtn:  { flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, alignItems: 'center' },
  cancelText: { fontSize: 16, fontWeight: '700' },
  confirmBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: '#ef444420', borderWidth: 1.5, borderColor: '#ef444460', alignItems: 'center' },
  confirmText:{ fontSize: 16, fontWeight: '900' },
});
