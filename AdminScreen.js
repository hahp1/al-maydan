/**
 * AdminScreen.js — لوحة الإدارة
 * ══════════════════════════════════════════════
 * التغييرات:
 *  ✅ زران للاستيراد: 📥 رفع عربي (lang:'ar') و 📥 رفع عالمي (lang:'en')
 *  ✅ عرض lang بجانب كل فئة في القائمة
 *  ✅ عرض إحصائيات منفصلة: فئات عربية / عالمية
 *  ✅ باقي الكود كما هو
 */

import { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, TextInput,
  StatusBar, ScrollView, Alert,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { db, storage } from './firebaseConfig';
import {
  collection, doc, setDoc, getDocs, deleteDoc,
  updateDoc, writeBatch, onSnapshot,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import AddQuestionScreen from './AddQuestionScreen';
import ImportScreen from './ImportScreen';
import { useTheme } from './ThemeContext';
import { useT, useRTLStyles } from './I18n';
import { ThemedButton, ThemedCard } from './ThemedComponents';
import {
  grantPro, revokePro, getAllProUsers, findUserByEmailOrUsername,
} from './ProService';

const ADMIN_PASSWORD = 'AlMaydan@2026!';

export default function AdminScreen({ onBack }) {
  const { theme } = useTheme();
  const t  = useT();
  const rs = useRTLStyles();

  const [authenticated,   setAuthenticated]   = useState(false);
  const [password,        setPassword]        = useState('');
  const [error,           setError]           = useState('');
  const [selectedCategory,setSelectedCategory]= useState(null);
  const [showImport,      setShowImport]      = useState(false);
  const [importLang,      setImportLang]      = useState('ar');
  const [categories,      setCategories]      = useState([]);

  // ── Pro Management ──
  const [proSearch,    setProSearch]    = useState('');
  const [proSearching, setProSearching] = useState(false);
  const [proFound,     setProFound]     = useState(null);   // المستخدم المُعثور عليه
  const [proNote,      setProNote]      = useState('');
  const [proList,      setProList]      = useState([]);
  const [proLoading,   setProLoading]   = useState(false);

  const loadProList = async () => {
    setProLoading(true);
    const list = await getAllProUsers();
    setProList(list);
    setProLoading(false);
  };

  const handleProSearch = async () => {
    if (!proSearch.trim()) return;
    setProSearching(true);
    setProFound(null);
    const user = await findUserByEmailOrUsername(proSearch.trim());
    setProFound(user || false);
    setProSearching(false);
  };

  const handleGrantPro = async () => {
    if (!proFound?.uid) return;
    // ADMIN_UIDS[0] كـ adminUid — مؤقتاً
    const result = await grantPro(proFound.uid, 'admin', proNote || 'تفعيل يدوي');
    if (result.success) {
      Alert.alert('✅', `تم تفعيل Pro لـ ${proFound.name || proFound.username}`);
      setProFound(null); setProSearch(''); setProNote('');
      loadProList();
    } else {
      Alert.alert('❌', result.error || 'حدث خطأ');
    }
  };

  const handleRevokePro = (uid, name) => {
    Alert.alert('إلغاء Pro', `إلغاء Pro من ${name}؟`, [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'نعم، إلغاء', style: 'destructive', onPress: async () => {
        await revokePro(uid);
        loadProList();
      }},
    ]);
  };
  const [loading,         setLoading]         = useState(false);
  const [newCatName,      setNewCatName]      = useState('');
  const [newCatEmoji,     setNewCatEmoji]     = useState('');
  const [uploadingImage,  setUploadingImage]  = useState(false);
  const [filterLang,      setFilterLang]      = useState('all'); // 'all' | 'ar' | 'en'

  useEffect(() => {
    if (!authenticated) return;
    setLoading(true);
    const unsub = onSnapshot(collection(db, 'categories'), async (snapshot) => {
      const cats = [];
      for (const d of snapshot.docs) {
        const data  = d.data();
        const qSnap = await getDocs(collection(db, 'categories', d.id, 'questions'));
        cats.push({ id: d.id, ...data, questionsCount: qSnap.size });
      }
      setCategories(cats);
      setLoading(false);
    });
    loadProList(); // تحميل قائمة Pro
    return () => unsub();
  }, [authenticated]);

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) { setAuthenticated(true); setError(''); }
    else setError('كلمة المرور خاطئة!');
  };

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    const catId = newCatName.trim().replace(/\s+/g, '_').toLowerCase() + '_' + Date.now();
    await setDoc(doc(db, 'categories', catId), {
      name: newCatName.trim(), emoji: newCatEmoji.trim() || '📁',
      isSpecial: false, imageUrl: null, categoryId: catId,
      createdAt: Date.now(),
      lang: filterLang === 'en' ? 'en' : 'ar', // lang حسب الفلتر الحالي
    });
    setNewCatName(''); setNewCatEmoji('');
  };

  const handleDeleteCategory = (id, name) => {
    Alert.alert('⚠️ تأكيد الحذف', `هل أنت متأكد من حذف فئة "${name}" وجميع أسئلتها؟`, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: async () => {
        const qSnap = await getDocs(collection(db, 'categories', id, 'questions'));
        const batch = writeBatch(db);
        qSnap.forEach(d => batch.delete(d.ref));
        await batch.commit();
        await deleteDoc(doc(db, 'categories', id));
      }},
    ]);
  };

  const handleUploadImage = async (catId) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('', 'نحتاج إذن الوصول للصور'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.7,
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
      Alert.alert('✅', 'تم رفع الصورة بنجاح!');
    } catch (e) { Alert.alert('', e.message); }
    finally { setUploadingImage(false); }
  };

  const handleSaveQuestions = async (newQuestions, newName, newEmoji) => {
    const catId = selectedCategory.id;
    await updateDoc(doc(db, 'categories', catId), {
      name: newName || selectedCategory.name, emoji: newEmoji || selectedCategory.emoji,
    });
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
        wrong: q.wrong || [], imageUrl: q.imageUrl || null,
      });
    }
    await addBatch.commit();
    setSelectedCategory(null);
  };

  const openImport = (lang) => {
    setImportLang(lang);
    setShowImport(true);
  };

  // ── إحصائيات ──
  const arCats = categories.filter(c => !c.lang || c.lang === 'ar');
  const enCats = categories.filter(c => c.lang === 'en');
  const displayedCats = filterLang === 'all' ? categories
    : filterLang === 'ar' ? arCats : enCats;

  // ── شاشة تسجيل الدخول ──
  if (!authenticated) {
    return (
      <View style={[styles.fullScreen, { backgroundColor: 'transparent' }]}>
        <StatusBar barStyle={theme.statusBar} backgroundColor={theme.statusBg} />
        <View style={styles.loginBox}>
          <Text style={styles.lockIcon}>🔐</Text>
          <Text style={[styles.loginTitle, { color: theme.accent }]}>لوحة الإدارة</Text>
          <Text style={[styles.loginSubtitle, { color: theme.textSecondary }]}>أدخل كلمة المرور للدخول</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, color: theme.textPrimary }, rs.textInput]}
            placeholder="كلمة المرور" placeholderTextColor={theme.textMuted}
            value={password} onChangeText={setPassword} secureTextEntry
          />
          {error ? <Text style={[styles.error, { color: theme.error }]}>{error}</Text> : null}
          <ThemedButton onPress={handleLogin} label={t('common.start')} variant='primary' size='large' style={styles.loginBtn} />
          <ThemedButton onPress={onBack} label={t('common.back')} variant='ghost' size='small' style={styles.backBtn} />
        </View>
      </View>
    );
  }

  if (showImport) return (
    <ImportScreen
      onBack={() => setShowImport(false)}
      defaultLang={importLang}
    />
  );

  if (selectedCategory) return (
    <AddQuestionScreenWrapper
      category={selectedCategory}
      onBack={() => setSelectedCategory(null)}
      onSave={handleSaveQuestions}
    />
  );

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: 'transparent' }]}>
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.statusBg} />

      <View style={styles.header}>
        <ThemedButton onPress={onBack} label={t('common.back')} variant='ghost' size='small' style={styles.backBtn} />
        <Text style={[styles.title, { color: theme.accent }]}>لوحة الإدارة</Text>
        <ThemedButton onPress={() => setAuthenticated(false)} label={`${t('common.exit')} 🔒`} variant='danger' size='small' style={styles.logoutBtn} />
      </View>

      {/* إحصائيات */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: theme.bgCard, borderColor: theme.accentBorder }]}>
          <Text style={[styles.statNum, { color: theme.accent }]}>{arCats.length}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>فئة 🇸🇦</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.bgCard, borderColor: theme.accentBorder }]}>
          <Text style={[styles.statNum, { color: theme.accent }]}>{enCats.length}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>فئة 🌍</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.bgCard, borderColor: theme.accentBorder }]}>
          <Text style={[styles.statNum, { color: theme.accent }]}>{categories.reduce((a, c) => a + (c.questionsCount || 0), 0)}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>سؤال</Text>
        </View>
      </View>

      {/* زران الاستيراد */}
      <View style={styles.importRow}>
        <ThemedButton onPress={() => openImport('ar')} label='🇸🇦 رفع عربي' variant='secondary' size='large' style={{ flex: 1 }} />
        <ThemedButton onPress={() => openImport('en')} label='🌍 رفع عالمي' variant='success' size='large' style={{ flex: 1 }} />
      </View>

      {/* إضافة فئة جديدة */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.accent }]}>➕ إضافة فئة جديدة</Text>
        {/* فلتر اللغة للفئة الجديدة */}
        <View style={styles.langToggle}>
          <ThemedButton onPress={() => setFilterLang('ar')} label='🇸🇦 عربي' variant={filterLang !== 'en' ? 'primary' : 'ghost'} size='small' style={styles.langBtn} />
          <ThemedButton onPress={() => setFilterLang('en')} label='🌍 عالمي' variant={filterLang === 'en' ? 'success' : 'ghost'} size='small' style={styles.langBtn} />
        </View>
        <View style={styles.addRow}>
          <TextInput
            style={[styles.input, { flex: 1, backgroundColor: theme.bgCard, borderColor: theme.borderCard, color: theme.textPrimary }, rs.textInput]}
            placeholder="اسم الفئة" placeholderTextColor={theme.textMuted}
            value={newCatName} onChangeText={setNewCatName}
          />
          <TextInput
            style={[styles.input, { width: 60, backgroundColor: theme.bgCard, borderColor: theme.borderCard, color: theme.textPrimary }]}
            placeholder="🎯" placeholderTextColor={theme.textMuted}
            value={newCatEmoji} onChangeText={setNewCatEmoji} textAlign="center"
          />
          <ThemedButton onPress={handleAddCategory} label='إضافة' variant='primary' size='small' style={styles.addBtn} />
        </View>
      </View>

      {/* قائمة الفئات مع فلتر */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.accent }]}>📚 الفئات الحالية</Text>
          <View style={styles.filterRow}>
            {['all', 'ar', 'en'].map(l => (
              <ThemedButton
                key={l}
                onPress={() => setFilterLang(l)}
                label={l === 'all' ? 'الكل' : l === 'ar' ? '🇸🇦' : '🌍'}
                variant={filterLang === l ? 'primary' : 'ghost'}
                size='small'
                style={styles.filterBtn}
              />
            ))}
          </View>
        </View>

        {loading ? (
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>{t('common.loading')}</Text>
        ) : displayedCats.length === 0 ? (
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>{t('setup.noCats')}</Text>
        ) : (
          displayedCats.map((cat) => (
            <View key={cat.id} style={[styles.catRow, { backgroundColor: theme.bgCard, borderColor: theme.borderCard }]}>
              <ThemedCard
                onPress={() => handleUploadImage(cat.id)}
                style={styles.catImageBox}
              >
                {cat.imageUrl
                  ? <ExpoImage source={{ uri: cat.imageUrl }} style={styles.catImage} onError={() => {}} cachePolicy="disk" contentFit="cover" />
                  : <Text style={styles.catEmoji}>{cat.emoji}</Text>}
                <Text style={styles.uploadHint}>📷</Text>
              </ThemedCard>
              <View style={styles.catInfo}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.catName, { color: theme.textPrimary }]}>{cat.name}</Text>
                  <Text style={styles.catLang}>{cat.lang === 'en' ? '🌍' : '🇸🇦'}</Text>
                </View>
                <Text style={[styles.catQuestions, { color: theme.textSecondary }]}>{cat.questionsCount || 0} سؤال</Text>
                {cat.isSpecial && <Text style={[styles.specialTag, { color: theme.accent }]}>{t('solo.special')}</Text>}
              </View>
              <View style={styles.catActions}>
                <ThemedButton onPress={() => setSelectedCategory(cat)} label='✏️ أسئلة' variant='secondary' size='small' style={styles.editBtn} />
                <ThemedButton onPress={() => handleDeleteCategory(cat.id, cat.name)} label='🗑️' variant='danger' size='small' style={styles.deleteBtn} />
              </View>
            </View>
          ))
        )}
      </View>
      {/* ══════════════════ قسم Pro ══════════════════ */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.accent }]}>⭐ إدارة Pro</Text>

        {/* بحث عن مستخدم */}
        <View style={[styles.proSearchRow]}>
          <TextInput
            style={[styles.input, { flex: 1, color: theme.textPrimary, borderColor: theme.borderCard, backgroundColor: theme.bgCard }]}
            placeholder="بريد إلكتروني أو username"
            placeholderTextColor={theme.textMuted}
            value={proSearch}
            onChangeText={setProSearch}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <ThemedButton onPress={handleProSearch} disabled={proSearching} label={proSearching ? '...' : '🔍'} variant='primary' size='small' style={styles.proSearchBtn} />
        </View>

        {/* نتيجة البحث */}
        {proFound === false && (
          <Text style={[styles.proNotFound, { color: theme.error || '#ef4444' }]}>
            لا يوجد مستخدم بهذا البريد أو الـ username
          </Text>
        )}
        {proFound && proFound.uid && (
          <View style={[styles.proFoundCard, { backgroundColor: theme.bgCard, borderColor: theme.accent + '40' }]}>
            <Text style={[styles.proFoundName, { color: theme.textPrimary }]}>
              👤 {proFound.name} ({proFound.username})
            </Text>
            <Text style={[styles.proFoundEmail, { color: theme.textMuted }]}>{proFound.email}</Text>
            <TextInput
              style={[styles.input, { color: theme.textPrimary, borderColor: theme.borderCard, backgroundColor: 'transparent', marginTop: 8 }]}
              placeholder="ملاحظة (اختياري)"
              placeholderTextColor={theme.textMuted}
              value={proNote}
              onChangeText={setProNote}
            />
            <ThemedButton onPress={handleGrantPro} label='⭐ تفعيل Pro' variant='success' size='medium' style={styles.proGrantBtn} />
          </View>
        )}

        {/* قائمة المستخدمين Pro الحاليين */}
        <Text style={[styles.proListTitle, { color: theme.textMuted }]}>
          المستخدمون Pro الحاليون ({proList.length})
        </Text>
        {proLoading
          ? <Text style={{ color: theme.textMuted, textAlign: 'center' }}>جاري التحميل...</Text>
          : proList.length === 0
            ? <Text style={{ color: theme.textMuted, textAlign: 'center' }}>لا يوجد مستخدمون Pro</Text>
            : proList.map(p => (
                <View key={p.id} style={[styles.proUserRow, { backgroundColor: theme.bgCard, borderColor: theme.borderCard }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.proUserName, { color: theme.textPrimary }]}>
                      ⭐ {p.name} — @{p.username}
                    </Text>
                    <Text style={[styles.proUserEmail, { color: theme.textMuted }]}>{p.email}</Text>
                    {p.note ? <Text style={[styles.proUserNote, { color: theme.textMuted }]}>📝 {p.note}</Text> : null}
                    {p.expiresAt && (
                      <Text style={[styles.proUserNote, { color: '#f59e0b' }]}>
                        ⏰ ينتهي: {new Date(p.expiresAt.toMillis?.() ?? p.expiresAt).toLocaleDateString('ar')}
                      </Text>
                    )}
                  </View>
                  <ThemedButton onPress={() => handleRevokePro(p.id, p.name)} label='إلغاء' variant='danger' size='small' style={styles.deleteBtn} />
                </View>
              ))
        }
      </View>

    </ScrollView>
  );
}

function AddQuestionScreenWrapper({ category, onBack, onSave }) {
  const { theme } = useTheme();
  const t = useT();
  const [questions, setQuestions] = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    getDocs(collection(db, 'categories', category.id, 'questions')).then(snap => {
      const qs = snap.docs.map(d => ({
        id: d.id, ...d.data(),
        text: d.data().question, answer: d.data().correct, difficulty: d.data().level,
      }));
      setQuestions(qs);
      setLoading(false);
    });
  }, []);

  if (loading) return (
    <View style={[styles.fullScreen, { backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' }]}>
      <Text style={[styles.loadingText, { color: theme.accent, fontSize: 18 }]}>{t('common.loading')}</Text>
    </View>
  );

  return <AddQuestionScreen category={{ ...category, questions }} onBack={onBack} onSave={onSave} />;
}

const styles = StyleSheet.create({
  fullScreen:    { flex: 1 },
  container:     { flexGrow: 1, paddingHorizontal: 24, paddingVertical: 50, gap: 24 },
  loginBox:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 24 },
  lockIcon:      { fontSize: 60 },
  loginTitle:    { fontSize: 28, fontWeight: '900' },
  loginSubtitle: { fontSize: 14 },
  input:         { borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, width: '100%' },
  error:         { fontSize: 14, fontWeight: '700' },
  loginBtn:      { paddingVertical: 16, borderRadius: 16, alignItems: 'center', width: '100%', elevation: 8 },
  loginBtnText:  { fontSize: 18, fontWeight: '800' },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn:       { padding: 8 },
  backText:      { fontSize: 16, fontWeight: '700' },
  title:         { fontSize: 20, fontWeight: '900' },
  logoutBtn:     { padding: 8 },
  logoutText:    { fontSize: 14, fontWeight: '700' },
  statsRow:      { flexDirection: 'row', gap: 10 },
  statCard:      { flex: 1, borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1, gap: 4 },
  statNum:       { fontSize: 28, fontWeight: '900' },
  statLabel:     { fontSize: 12, fontWeight: '600' },

  // زران الاستيراد
  importRow:     { flexDirection: 'row', gap: 12 },
  importBtn:     { flex: 1, paddingVertical: 16, borderRadius: 14, alignItems: 'center', borderWidth: 1 },
  importBtnText: { fontSize: 15, fontWeight: '800' },

  // إضافة فئة
  section:       { gap: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle:  { fontSize: 18, fontWeight: '800' },
  langToggle:    { flexDirection: 'row', gap: 8 },
  langBtn:       { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: '#ffffff11' },
  langBtnText:   { fontSize: 13, fontWeight: '700' },
  addRow:        { flexDirection: 'row', gap: 8, alignItems: 'center' },
  addBtn:        { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14 },
  addBtnText:    { fontSize: 15, fontWeight: '800' },
  loadingText:   { textAlign: 'center', fontSize: 15 },

  // فلتر
  filterRow:     { flexDirection: 'row', gap: 6 },
  filterBtn:     { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: '#ffffff11' },
  filterBtnText: { fontSize: 13, fontWeight: '700' },

  // قائمة الفئات
  catRow:        { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14, gap: 12, borderWidth: 1 },
  catImageBox:   { width: 56, height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, position: 'relative' },
  catImage:      { width: 56, height: 56, borderRadius: 12 },
  catEmoji:      { fontSize: 26 },
  uploadHint:    { position: 'absolute', bottom: -2, right: -2, fontSize: 14 },
  catInfo:       { flex: 1, gap: 4 },
  catName:       { fontSize: 16, fontWeight: '700' },
  catLang:       { fontSize: 14 },
  catQuestions:  { fontSize: 12 },
  specialTag:    { fontSize: 11, fontWeight: '700' },
  catActions:    { flexDirection: 'row', gap: 8 },
  editBtn:       { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  editBtnText:   { fontSize: 13, fontWeight: '700' },
  deleteBtn:     { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  deleteBtnText: { fontSize: 16 },

  // Pro Management
  proSearchRow:  { flexDirection: 'row', gap: 10, alignItems: 'center' },
  proSearchBtn:  { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  proNotFound:   { fontSize: 13, textAlign: 'center', fontWeight: '700' },
  proFoundCard:  { borderRadius: 16, borderWidth: 1, padding: 14, gap: 4 },
  proFoundName:  { fontSize: 15, fontWeight: '800' },
  proFoundEmail: { fontSize: 12 },
  proGrantBtn:   { paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  proGrantText:  { color: '#fff', fontWeight: '900', fontSize: 15 },
  proListTitle:  { fontSize: 13, fontWeight: '700', marginTop: 4 },
  proUserRow:    { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, padding: 12, gap: 8 },
  proUserName:   { fontSize: 14, fontWeight: '800' },
  proUserEmail:  { fontSize: 12 },
  proUserNote:   { fontSize: 11, marginTop: 2 },
});
