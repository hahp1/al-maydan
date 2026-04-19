import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';

/**
 * LeaveModal — modal مغادرة داكن موحد لكل الألعاب
 * Props:
 *   visible: bool
 *   onCancel: fn
 *   onConfirm: fn
 *   message?: string  (اختياري)
 */
export default function LeaveModal({ visible, onCancel, onConfirm, message }) {
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onCancel}>
      <View style={s.overlay}>
        <View style={s.card}>
          <Text style={s.emoji}>🚪</Text>
          <Text style={s.title}>مغادرة اللعبة</Text>
          <Text style={s.msg}>{message || 'هل تريد مغادرة اللعبة؟'}</Text>
          <View style={s.btns}>
            <TouchableOpacity style={s.cancelBtn} onPress={onCancel} activeOpacity={0.8}>
              <Text style={s.cancelText}>إلغاء</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.confirmBtn} onPress={onConfirm} activeOpacity={0.8}>
              <Text style={s.confirmText}>مغادرة</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: '#000000aa',
    alignItems: 'center', justifyContent: 'center',
    padding: 32,
  },
  card: {
    backgroundColor: '#0f0f2e', borderRadius: 24,
    borderWidth: 1.5, borderColor: '#ef444440',
    padding: 28, width: '100%', alignItems: 'center', gap: 12,
  },
  emoji: { fontSize: 40 },
  title: { color: '#fff', fontSize: 20, fontWeight: '900' },
  msg: { color: '#8080aa', fontSize: 15, textAlign: 'center', lineHeight: 22 },
  btns: { flexDirection: 'row', gap: 12, width: '100%', marginTop: 8 },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    backgroundColor: '#1e1b4b', borderWidth: 1.5,
    borderColor: '#ffffff20', alignItems: 'center',
  },
  cancelText: { color: '#a0a0c0', fontSize: 16, fontWeight: '700' },
  confirmBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    backgroundColor: '#ef444420', borderWidth: 1.5,
    borderColor: '#ef444460', alignItems: 'center',
  },
  confirmText: { color: '#ef4444', fontSize: 16, fontWeight: '900' },
});
