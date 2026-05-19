import { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, StatusBar, ScrollView, Alert } from 'react-native';
import { useTheme } from './ThemeContext';

export default function AddQuestionScreen({ category, onBack, onSave, onRename }) {
  const { theme } = useTheme();
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [difficulty, setDifficulty] = useState(100);
  const [questions, setQuestions] = useState(category?.questions || []);
  const [editingId, setEditingId] = useState(null);
  const [catName, setCatName] = useState(category?.name || '');
  const [catEmoji, setCatEmoji] = useState(category?.emoji || '📁');
  const [editingName, setEditingName] = useState(false);

  const difficulties = [100, 200, 300, 400, 500];

  const difficultyColors = {
    100: '#1a3a6e',
    200: '#1a5a3a',
    300: '#5a5a00',
    400: '#7a3a00',
    500: '#7a1a1a',
  };

  const handleAdd = () => {
    if (!question.trim() || !answer.trim()) return;
    if (editingId) {
      setQuestions(questions.map(q =>
        q.id === editingId ? { ...q, text: question.trim(), answer: answer.trim(), difficulty } : q
      ));
      setEditingId(null);
    } else {
      setQuestions([...questions, {
        id: Date.now(),
        text: question.trim(),
        answer: answer.trim(),
        difficulty,
      }]);
    }
    setQuestion('');
    setAnswer('');
  };

  const handleEdit = (q) => {
    setQuestion(q.text);
    setAnswer(q.answer);
    setDifficulty(q.difficulty);
    setEditingId(q.id);
  };

  const handleDelete = (id) => {
    Alert.alert(
      '⚠️ تأكيد الحذف',
      'هل أنت متأكد من حذف هذا السؤال؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'حذف', style: 'destructive', onPress: () => setQuestions(questions.filter(q => q.id !== id)) }
      ]
    );
  };

  const handleSaveAll = () => {
    onSave(questions, catName.trim(), catEmoji.trim());
  };

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.statusBg} />

      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={[styles.backText, { color: theme.accent }]}>→ رجوع</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.accent }]}>{catEmoji} {catName}</Text>
        <View style={[styles.countBadge, { backgroundColor: theme.bgCard, borderColor: theme.accentBorder }]}>
          <Text style={[styles.countText, { color: theme.accent }]}>{questions.length} سؤال</Text>
        </View>
      </View>

      {/* تعديل اسم الفئة */}
      <View style={styles.section}>
        <TouchableOpacity
          style={[styles.renameToggle, { backgroundColor: theme.bgCard, borderColor: theme.accentBorder }]}
          onPress={() => setEditingName(!editingName)}
        >
          <Text style={[styles.renameToggleText, { color: theme.accent }]}>
            {editingName ? '🔼 إخفاء تعديل الفئة' : '✏️ تعديل اسم الفئة'}
          </Text>
        </TouchableOpacity>

        {editingName && (
          <View style={styles.renameRow}>
            <TextInput
              style={[styles.input, { flex: 1, backgroundColor: theme.bgInput, borderColor: theme.border, color: theme.textPrimary }]}
              placeholder="اسم الفئة"
              placeholderTextColor={theme.textMuted}
              value={catName}
              onChangeText={setCatName}
              textAlign="right"
            />
            <TextInput
              style={[styles.input, { width: 60, backgroundColor: theme.bgInput, borderColor: theme.border, color: theme.textPrimary }]}
              placeholder="🎯"
              placeholderTextColor={theme.textMuted}
              value={catEmoji}
              onChangeText={setCatEmoji}
              textAlign="center"
            />
          </View>
        )}
      </View>

      {/* Add/Edit Question Form */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.accent }]}>{editingId ? '✏️ تعديل سؤال' : '➕ إضافة سؤال'}</Text>

        <Text style={[styles.label, { color: theme.textSecondary }]}>مستوى الصعوبة</Text>
        <View style={styles.diffRow}>
          {difficulties.map((d) => (
            <TouchableOpacity
              key={d}
              style={[styles.diffBtn, { backgroundColor: difficultyColors[d] }, difficulty === d && styles.diffBtnActive]}
              onPress={() => setDifficulty(d)}
            >
              <Text style={styles.diffBtnText}>{d}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { color: theme.textSecondary }]}>السؤال</Text>
        <TextInput
          style={[styles.input, styles.inputMulti, { backgroundColor: theme.bgInput, borderColor: theme.border, color: theme.textPrimary }]}
          placeholder="اكتب السؤال هنا"
          placeholderTextColor={theme.textMuted}
          value={question}
          onChangeText={setQuestion}
          textAlign="right"
          multiline
          numberOfLines={3}
        />

        <Text style={[styles.label, { color: theme.textSecondary }]}>الإجابة</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.bgInput, borderColor: theme.border, color: theme.textPrimary }]}
          placeholder="الإجابة الصحيحة"
          placeholderTextColor={theme.textMuted}
          value={answer}
          onChangeText={setAnswer}
          textAlign="right"
        />

        <View style={styles.formButtons}>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: theme.accent }, (!question.trim() || !answer.trim()) && { backgroundColor: theme.bgElevated }]}
            onPress={handleAdd}
          >
            <Text style={[styles.addBtnText, { color: theme.textOnAccent }]}>{editingId ? '💾 حفظ التعديل' : '➕ إضافة السؤال'}</Text>
          </TouchableOpacity>
          {editingId && (
            <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: theme.bgElevated, borderColor: theme.error + "55" }]} onPress={() => { setEditingId(null); setQuestion(''); setAnswer(''); }}>
              <Text style={[styles.cancelBtnText, { color: theme.error }]}>❌ إلغاء</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Questions List */}
      {questions.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.accent }]}>📋 الأسئلة ({questions.length})</Text>
          {questions.map((q) => (
            <View key={q.id} style={[styles.questionCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
              <View style={[styles.diffBadge, { backgroundColor: difficultyColors[q.difficulty] }]}>
                <Text style={styles.diffBadgeText}>{q.difficulty}</Text>
              </View>
              <View style={styles.questionInfo}>
                <Text style={[styles.questionText, { color: theme.textPrimary }]} numberOfLines={2}>{q.text}</Text>
                <Text style={[styles.answerText, { color: theme.success }]}>✅ {q.answer}</Text>
              </View>
              <View style={styles.qActions}>
                <TouchableOpacity onPress={() => handleEdit(q)}>
                  <Text style={styles.editIcon}>✏️</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(q.id)}>
                  <Text style={styles.deleteIcon}>🗑️</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.bgCard, borderColor: theme.success + "66" }]} onPress={handleSaveAll}>
        <Text style={[styles.saveBtnText, { color: theme.success }]}>💾 حفظ الكل ({questions.length})</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    
    paddingHorizontal: 24,
    paddingVertical: 50,
    gap: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: { padding: 8 },
  backText: { color: "#f5c518", fontSize: 16, fontWeight: '700' },
  title: { fontSize: 18, fontWeight: '900', color: "#f5c518" },
  countBadge: {
    
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f5c51855',
  },
  countText: { color: "#f5c518", fontSize: 13, fontWeight: '700' },
  section: { gap: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: "#f5c518" },
  label: { color: '#a09060', fontSize: 14, fontWeight: '600' },
  renameToggle: {
    
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f5c51833',
    alignItems: 'center',
  },
  renameToggleText: { color: "#f5c518", fontSize: 15, fontWeight: '700' },
  renameRow: { flexDirection: 'row', gap: 8 },
  diffRow: { flexDirection: 'row', gap: 8 },
  diffBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  diffBtnActive: { borderColor: '#f5c518' },
  diffBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
  input: {
    
    borderWidth: 1.5,
    borderColor: '#2a2a55',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#ffffff',
    fontSize: 16,
  },
  inputMulti: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  formButtons: { gap: 10 },
  addBtn: {
    backgroundColor: '#f5c518',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 8,
  },
  addBtnDisabled: {  },
  addBtnText: { color: '#0d0d2b', fontSize: 17, fontWeight: '800' },
  cancelBtn: {
    
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    ,
  },
  cancelBtnText: { , fontSize: 16, fontWeight: '700' },
  questionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    
    borderRadius: 14,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#2a2a55',
  },
  diffBadge: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diffBadgeText: { color: '#ffffff', fontSize: 12, fontWeight: '900' },
  questionInfo: { flex: 1, gap: 4 },
  questionText: { fontSize: 14, fontWeight: '600' },
  answerText: { , fontSize: 12, fontWeight: '600' },
  qActions: { gap: 8, alignItems: 'center' },
  editIcon: { fontSize: 20 },
  deleteIcon: { fontSize: 20 },
  saveBtn: {
    
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#2a8a5a',
    elevation: 8,
  },
  saveBtnText: { color: '#ffffff', fontSize: 18, fontWeight: '800' },
});
