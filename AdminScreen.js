import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, StatusBar, ScrollView, Image, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AddQuestionScreen from './AddQuestionScreen';
import ImportScreen from './ImportScreen';

const ADMIN_PASSWORD = 'AlMaydan@2026!';
const STORAGE_KEY = 'almaydan_categories';

export default function AdminScreen({ onBack }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatEmoji, setNewCatEmoji] = useState('');

  const loadCategories = async () => {
    setLoading(true);
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) setCategories(JSON.parse(data));
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const saveCategories = async (cats) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cats));
      setCategories(cats);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (authenticated) loadCategories();
  }, [authenticated]);

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true);
      setError('');
    } else {
      setError('كلمة المرور خاطئة!');
    }
  };

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    const newCat = {
      id: Date.now().toString(),
      name: newCatName.trim(),
      emoji: newCatEmoji || '📁',
      image: null,
      questions: [],
    };
    const updated = [...categories, newCat];
    await saveCategories(updated);
    setNewCatName('');
    setNewCatEmoji('');
  };

  const handleDeleteCategory = async (id, name) => {
    Alert.alert(
      '⚠️ تأكيد الحذف',
      `هل أنت متأكد من حذف فئة "${name}" وجميع أسئلتها؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            const updated = categories.filter(c => c.id !== id);
            await saveCategories(updated);
          }
        }
      ]
    );
  };

  const handleSaveQuestions = async (newQuestions, newName, newEmoji) => {
    const updated = categories.map(c =>
      c.id === selectedCategory.id
        ? { ...c, questions: newQuestions, name: newName || c.name, emoji: newEmoji || c.emoji }
        : c
    );
    await saveCategories(updated);
    setSelectedCategory(null);
  };

  if (!authenticated) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0d0d2b" />
        <View style={styles.loginBox}>
          <Text style={styles.lockIcon}>🔐</Text>
          <Text style={styles.loginTitle}>لوحة الإدارة</Text>
          <Text style={styles.loginSubtitle}>أدخل كلمة المرور للدخول</Text>
          <TextInput
            style={styles.input}
            placeholder="كلمة المرور"
            placeholderTextColor="#555577"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textAlign="right"
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <TouchableOpacity style={styles.loginBtn} onPress={handleLogin}>
            <Text style={styles.loginBtnText}>دخول</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Text style={styles.backText}>→ رجوع</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (showImport) {
    return <ImportScreen onBack={() => { setShowImport(false); loadCategories(); }} />;
  }

  if (selectedCategory) {
    return (
      <AddQuestionScreen
        category={selectedCategory}
        onBack={() => setSelectedCategory(null)}
        onSave={handleSaveQuestions}
      />
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0d0d2b" />
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>→ رجوع</Text>
        </TouchableOpacity>
        <Text style={styles.title}>لوحة الإدارة</Text>
        <TouchableOpacity onPress={() => setAuthenticated(false)} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>خروج 🔒</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{categories.length}</Text>
          <Text style={styles.statLabel}>فئة</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{categories.reduce((a, c) => a + (c.questions?.length || 0), 0)}</Text>
          <Text style={styles.statLabel}>سؤال</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.importBtn} onPress={() => setShowImport(true)}>
        <Text style={styles.importBtnText}>📥 استيراد أسئلة من Excel</Text>
      </TouchableOpacity>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>➕ إضافة فئة جديدة</Text>
        <View style={styles.addRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="اسم الفئة"
            placeholderTextColor="#555577"
            value={newCatName}
            onChangeText={setNewCatName}
            textAlign="right"
          />
          <TextInput
            style={[styles.input, { width: 60 }]}
            placeholder="🎯"
            placeholderTextColor="#555577"
            value={newCatEmoji}
            onChangeText={setNewCatEmoji}
            textAlign="center"
          />
          <TouchableOpacity style={styles.addBtn} onPress={handleAddCategory}>
            <Text style={styles.addBtnText}>إضافة</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📚 الفئات الحالية</Text>
        {loading ? (
          <Text style={styles.loadingText}>جاري التحميل...</Text>
        ) : categories.length === 0 ? (
          <Text style={styles.loadingText}>لا توجد فئات — أضف فئات أو استورد من Excel</Text>
        ) : (
          categories.map((cat) => (
            <View key={cat.id} style={styles.catRow}>
              <View style={styles.catImagePlaceholder}>
                <Text style={styles.catEmoji}>{cat.emoji}</Text>
              </View>
              <View style={styles.catInfo}>
                <Text style={styles.catName}>{cat.name}</Text>
                <Text style={styles.catQuestions}>{cat.questions?.length || 0} سؤال</Text>
              </View>
              <View style={styles.catActions}>
                <TouchableOpacity style={styles.editBtn} onPress={() => setSelectedCategory(cat)}>
                  <Text style={styles.editBtnText}>✏️ أسئلة</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteCategory(cat.id, cat.name)}>
                  <Text style={styles.deleteBtnText}>🗑️</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#0d0d2b', paddingHorizontal: 24, paddingVertical: 50, gap: 24 },
  loginBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 24 },
  lockIcon: { fontSize: 60 },
  loginTitle: { fontSize: 28, fontWeight: '900', color: '#f5c518' },
  loginSubtitle: { color: '#a09060', fontSize: 14 },
  input: { backgroundColor: '#1a1a3e', borderWidth: 1.5, borderColor: '#2a2a55', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, color: '#ffffff', fontSize: 16, width: '100%' },
  error: { color: '#ff6666', fontSize: 14, fontWeight: '700' },
  loginBtn: { backgroundColor: '#f5c518', paddingVertical: 16, borderRadius: 16, alignItems: 'center', width: '100%', elevation: 8 },
  loginBtnText: { color: '#0d0d2b', fontSize: 18, fontWeight: '800' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { padding: 8 },
  backText: { color: '#f5c518', fontSize: 16, fontWeight: '700' },
  title: { fontSize: 20, fontWeight: '900', color: '#f5c518' },
  logoutBtn: { padding: 8 },
  logoutText: { color: '#ff6666', fontSize: 14, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, backgroundColor: '#1a1a3e', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#f5c51833', gap: 4 },
  statNum: { color: '#f5c518', fontSize: 32, fontWeight: '900' },
  statLabel: { color: '#a09060', fontSize: 14, fontWeight: '600' },
  importBtn: { backgroundColor: '#1a3a6e', paddingVertical: 14, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: '#4a6aae' },
  importBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  section: { gap: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#f5c518' },
  addRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  addBtn: { backgroundColor: '#f5c518', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, alignItems: 'center' },
  addBtnText: { color: '#0d0d2b', fontSize: 15, fontWeight: '800' },
  loadingText: { color: '#a09060', textAlign: 'center', fontSize: 15 },
  catRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a3e', borderRadius: 14, padding: 14, gap: 12, borderWidth: 1, borderColor: '#2a2a55' },
  catImagePlaceholder: { width: 52, height: 52, borderRadius: 10, backgroundColor: '#0d0d2b', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#2a2a55' },
  catEmoji: { fontSize: 26 },
  catInfo: { flex: 1, gap: 4 },
  catName: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  catQuestions: { color: '#a09060', fontSize: 12 },
  catActions: { flexDirection: 'row', gap: 8 },
  editBtn: { backgroundColor: '#1a3a6e', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  editBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  deleteBtn: { backgroundColor: '#3a1a1a', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  deleteBtnText: { fontSize: 16 },
});
