import { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, TextInput,
  StatusBar, ScrollView, Alert, Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { db, storage } from './firebaseConfig';
import {
  collection, doc, setDoc, getDocs, deleteDoc,
  updateDoc, writeBatch, onSnapshot,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import AddQuestionScreen from './AddQuestionScreen';
import ImportScreen from './ImportScreen';

const ADMIN_PASSWORD = 'AlMaydan@2026!';

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
  const [uploadingImage, setUploadingImage] = useState(false);

  // ── تحميل الفئات من Firestore realtime ──
  useEffect(() => {
    if (!authenticated) return;
    setLoading(true);

    const unsub = onSnapshot(collection(db, 'categories'), async (snapshot) => {
      const cats = [];
      for (const d of snapshot.docs) {
        const data = d.data();
        // تحميل عدد الأسئلة
        const qSnap = await getDocs(collection(db, 'categories', d.id, 'questions'));
        cats.push({ id: d.id, ...data, questionsCount: qSnap.size });
      }
      setCategories(cats);
      setLoading(false);
    });

    return () => unsub();
  }, [authenticated]);

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true);
      setError('');
    } else {
      setError('كلمة المرور خاطئة!');
    }
  };

  // ── إضافة فئة جديدة ──
  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    const catId = newCatName.trim().replace(/\s+/g, '_').toLowerCase() + '_' + Date.now();
    await setDoc(doc(db, 'categories', catId), {
      name: newCatName.trim(),
      emoji: newCatEmoji.trim() || '📁',
      isSpecial: false,
      imageUrl: null,
      categoryId: catId,
      createdAt: Date.now(),
    });
    setNewCatName('');
    setNewCatEmoji('');
  };

  // ── حذف فئة ──
  const handleDeleteCategory = (id, name) => {
    Alert.alert(
      '⚠️ تأكيد الحذف',
      `هل أنت متأكد من حذف فئة "${name}" وجميع أسئلتها؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف', style: 'destructive',
          onPress: async () => {
            // احذف الأسئلة أولاً
            const qSnap = await getDocs(collection(db, 'categories', id, 'questions'));
            const batch = writeBatch(db);
            qSnap.forEach(d => batch.delete(d.ref));
            await batch.commit();
            // احذف الفئة
            await deleteDoc(doc(db, 'categories', id));
          }
        }
      ]
    );
  };

  // ── رفع صورة الفئة ──
  const handleUploadImage = async (catId) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('تنبيه', 'نحتاج إذن الوصول للصور');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (result.canceled) return;

    try {
      setUploadingImage(true);
      const uri = result.assets[0].uri;
      const response = await fetch(uri);
      const blob = await response.blob();

      const storageRef = ref(storage, `categories/${catId}/cover.jpg`);
      await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(storageRef);

      await updateDoc(doc(db, 'categories', catId), { imageUrl: url });
      Alert.alert('✅ تم', 'تم رفع الصورة بنجاح!');
    } catch (e) {
      Alert.alert('خطأ', e.message);
    } finally {
      setUploadingImage(false);
    }
  };

  // ── حفظ الأسئلة من AddQuestionScreen ──
  const handleSaveQuestions = async (newQuestions, newName, newEmoji) => {
    const catId = selectedCategory.id;

    // حدّث بيانات الفئة
    await updateDoc(doc(db, 'categories', catId), {
      name: newName || selectedCategory.name,
      emoji: newEmoji || selectedCategory.emoji,
    });

    // احذف الأسئلة القديمة وارفع الجديدة
    const qSnap = await getDocs(collection(db, 'categories', catId, 'questions'));
    const deleteBatch = writeBatch(db);
    qSnap.forEach(d => deleteBatch.delete(d.ref));
    await deleteBatch.commit();

    const addBatch = writeBatch(db);
    for (const q of newQuestions) {
      const qRef = doc(db, 'categories', catId, 'questions', String(q.id));
      addBatch.set(qRef, {
        level: q.level || q.difficulty || 1,
        question: q.text || q.question || '',
        correct: q.answer || q.correct || '',
        wrong: q.wrong || [],
        imageUrl: q.imageUrl || null,
      });
    }
    await addBatch.commit();
    setSelectedCategory(null);
  };

  // ── شاشة تسجيل الدخول ──
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

  if (showImport) return <ImportScreen onBack={() => setShowImport(false)} />;

  if (selectedCategory) {
    // تحميل الأسئلة للفئة المختارة
    return (
      <AddQuestionScreenWrapper
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

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{categories.length}</Text>
          <Text style={styles.statLabel}>فئة</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{categories.reduce((a, c) => a + (c.questionsCount || 0), 0)}</Text>
          <Text style={styles.statLabel}>سؤال</Text>
        </View>
      </View>

      {/* Import Button */}
      <TouchableOpacity style={styles.importBtn} onPress={() => setShowImport(true)}>
        <Text style={styles.importBtnText}>📥 استيراد أسئلة (JSON / Excel)</Text>
      </TouchableOpacity>

      {/* Add Category */}
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

      {/* Categories List */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📚 الفئات الحالية</Text>
        {loading ? (
          <Text style={styles.loadingText}>جاري التحميل من Firestore...</Text>
        ) : categories.length === 0 ? (
          <Text style={styles.loadingText}>لا توجد فئات — أضف أو استورد</Text>
        ) : (
          categories.map((cat) => (
            <View key={cat.id} style={styles.catRow}>
              {/* صورة الفئة */}
              <TouchableOpacity
                style={styles.catImageBox}
                onPress={() => handleUploadImage(cat.id)}
              >
                {cat.imageUrl ? (
                  <Image source={{ uri: cat.imageUrl }} style={styles.catImage} />
                ) : (
                  <Text style={styles.catEmoji}>{cat.emoji}</Text>
                )}
                <Text style={styles.uploadHint}>📷</Text>
              </TouchableOpacity>

              <View style={styles.catInfo}>
                <Text style={styles.catName}>{cat.name}</Text>
                <Text style={styles.catQuestions}>{cat.questionsCount || 0} سؤال</Text>
                {cat.isSpecial && <Text style={styles.specialTag}>⭐ خاصة</Text>}
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

// ── Wrapper لتحميل أسئلة الفئة من Firestore ──
function AddQuestionScreenWrapper({ category, onBack, onSave }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDocs(collection(db, 'categories', category.id, 'questions')).then(snap => {
      const qs = snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        text: d.data().question,
        answer: d.data().correct,
        difficulty: d.data().level,
      }));
      setQuestions(qs);
      setLoading(false);
    });
  }, []);

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: '#0d0d2b', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#f5c518', fontSize: 18 }}>جاري التحميل...</Text>
    </View>
  );

  return (
    <AddQuestionScreen
      category={{ ...category, questions }}
      onBack={onBack}
      onSave={onSave}
    />
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
  addBtn: { backgroundColor: '#f5c518', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14 },
  addBtnText: { color: '#0d0d2b', fontSize: 15, fontWeight: '800' },
  loadingText: { color: '#a09060', textAlign: 'center', fontSize: 15 },
  catRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a3e', borderRadius: 14, padding: 14, gap: 12, borderWidth: 1, borderColor: '#2a2a55' },
  catImageBox: { width: 56, height: 56, borderRadius: 12, backgroundColor: '#0d0d2b', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#2a2a55', position: 'relative' },
  catImage: { width: 56, height: 56, borderRadius: 12 },
  catEmoji: { fontSize: 26 },
  uploadHint: { position: 'absolute', bottom: -2, right: -2, fontSize: 14 },
  catInfo: { flex: 1, gap: 4 },
  catName: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  catQuestions: { color: '#a09060', fontSize: 12 },
  specialTag: { color: '#f5c518', fontSize: 11, fontWeight: '700' },
  catActions: { flexDirection: 'row', gap: 8 },
  editBtn: { backgroundColor: '#1a3a6e', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  editBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  deleteBtn: { backgroundColor: '#3a1a1a', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  deleteBtnText: { fontSize: 16 },
});
