/**
 * ImportScreen.js — استيراد الأسئلة
 * ══════════════════════════════════════════════
 * التغييرات:
 *  ✅ يستقبل prop: defaultLang ('ar' | 'en')
 *  ✅ كل فئة ومجموعة أسئلة تُحفظ مع lang تلقائياً
 *  ✅ عرض واضح للغة المحددة في الهيدر
 *  ✅ باقي الكود كما هو
 */

import { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, StatusBar, ScrollView, Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as XLSX from 'xlsx';
import { db } from './firebaseConfig';
import { collection, doc, setDoc, writeBatch } from 'firebase/firestore';
import { useTheme } from './ThemeContext';
import { ThemedButton, ThemedCard } from './ThemedComponents';
import { useT } from './I18n';

export default function ImportScreen({ onBack, defaultLang = 'ar' }) {
  const { theme } = useTheme();
  const t = useT();
  const [importing, setImporting] = useState(false);
  const [log,       setLog]       = useState([]);

  const addLog = (msg) => setLog(prev => [...prev, msg]);

  const langLabel = defaultLang === 'en' ? '🌍 بنك عالمي' : '🇸🇦 بنك عربي';
  const langColor = defaultLang === 'en' ? '#10b981' : '#f59e0b';

  const uploadCategoryToFirestore = async (name, questions, logFn, categoryId = null, emoji = '📁', isSpecial = false) => {
    try {
      const catId  = categoryId || name.replace(/\s+/g, '_').toLowerCase();
      const catRef = doc(db, 'categories', catId);
      await setDoc(catRef, {
        name, emoji, isSpecial: isSpecial || false, imageUrl: null,
        categoryId: catId, createdAt: Date.now(),
        lang: defaultLang, // ← الإضافة الجوهرية
      }, { merge: true });

      const batchSize = 500;
      for (let i = 0; i < questions.length; i += batchSize) {
        const batch = writeBatch(db);
        const chunk = questions.slice(i, i + batchSize);
        for (const q of chunk) {
          const qId  = q.id || `q_${Date.now()}_${Math.random().toString(36).slice(2)}`;
          const qRef = doc(db, 'categories', catId, 'questions', qId);
          batch.set(qRef, {
            level: q.level || 1,
            question: q.question || q.text || '',
            correct: q.correct || q.answer || '',
            wrong: q.wrong || [],
            imageUrl: q.imageUrl || null,
            lang: defaultLang, // ← على كل سؤال أيضاً
          });
        }
        await batch.commit();
      }
      logFn(`✅ "${name}": ${questions.length} سؤال — ${langLabel}`);
    } catch (e) { logFn(`❌ خطأ في رفع "${name}": ${e.message}`); }
  };

  const handleImportExcel = async () => {
    try {
      setImporting(true); setLog([]);
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        copyToCacheDirectory: true,
      });
      if (result.canceled) { setImporting(false); return; }
      const file = result.assets[0];
      addLog(`📂 تم اختيار: ${file.name}`);
      addLog(`🌐 اللغة: ${langLabel}`);
      const response    = await fetch(file.uri);
      const arrayBuffer = await response.arrayBuffer();
      const workbook    = XLSX.read(arrayBuffer, { type: 'array' });
      addLog(`📊 عدد الشيتات: ${workbook.SheetNames.length}`);
      let totalAdded = 0;
      for (const sheetName of workbook.SheetNames) {
        const sheet     = workbook.Sheets[sheetName];
        const rows      = XLSX.utils.sheet_to_json(sheet);
        if (rows.length === 0) { addLog(`⚠️ شيت "${sheetName}" فارغ`); continue; }
        const questions = rows.filter(row => row['السؤال'] && row['الإجابة']).map((row, i) => ({
          id: `${sheetName}_${Date.now()}_${i}`, level: Number(row['الصعوبة']) || 1,
          question: String(row['السؤال']).trim(), correct: String(row['الإجابة']).trim(),
          wrong: [row['خطأ1'], row['خطأ2'], row['خطأ3']].map(w => String(w || '').trim()).filter(Boolean),
          imageUrl: null,
        }));
        if (questions.length === 0) { addLog(`⚠️ "${sheetName}": لا أسئلة صالحة`); continue; }
        await uploadCategoryToFirestore(sheetName, questions, addLog);
        totalAdded += questions.length;
      }
      addLog(`🎉 تم! إجمالي الأسئلة: ${totalAdded}`);
    } catch (e) { addLog(`❌ خطأ: ${e.message}`); Alert.alert('', e.message); }
    setImporting(false);
  };

  const handleImportJSON = async () => {
    try {
      setImporting(true); setLog([]);
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
      if (result.canceled) { setImporting(false); return; }
      const file = result.assets[0];
      addLog(`📂 تم اختيار: ${file.name}`);
      addLog(`🌐 اللغة: ${langLabel}`);
      const response   = await fetch(file.uri);
      const data       = await response.json();
      const categories = Array.isArray(data) ? data : [data];
      let totalAdded   = 0;
      for (const cat of categories) {
        if (!cat.category || !cat.questions) { addLog(`⚠️ ملف غير صالح — يحتاج category و questions`); continue; }
        await uploadCategoryToFirestore(cat.category, cat.questions, addLog, cat.categoryId, cat.emoji, cat.isSpecial);
        totalAdded += cat.questions.length;
      }
      addLog(`🎉 تم! إجمالي الأسئلة: ${totalAdded}`);
    } catch (e) { addLog(`❌ خطأ: ${e.message}`); Alert.alert('', e.message); }
    setImporting(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.statusBg} />

      <View style={styles.header}>
        <ThemedButton onPress={onBack} label={t('common.back')} variant='ghost' size='small' />
        <Text style={[styles.title, { color: theme.accent }]}>📥 استيراد أسئلة</Text>
      </View>

      {/* بانر اللغة */}
      <View style={[styles.langBanner, { backgroundColor: langColor + '22', borderColor: langColor + '55' }]}>
        <Text style={[styles.langBannerText, { color: langColor }]}>
          {langLabel} — كل ما يُرفع الآن سيُضاف لهذا البنك
        </Text>
      </View>

      <ThemedCard style={styles.infoBox}>
        <Text style={[styles.infoTitle, { color: theme.accent }]}>📋 تنسيق JSON المطلوب:</Text>
        <Text style={[styles.infoText, { color: theme.textSecondary }]}>• categoryId: معرف إنجليزي</Text>
        <Text style={[styles.infoText, { color: theme.textSecondary }]}>• category: اسم الفئة</Text>
        <Text style={[styles.infoText, { color: theme.textSecondary }]}>• emoji: رمز الفئة</Text>
        <Text style={[styles.infoText, { color: theme.textSecondary }]}>• questions: مصفوفة الأسئلة</Text>
        <Text style={[styles.infoText, { color: theme.textSecondary }]}>• كل سؤال: level + question + correct + wrong[3]</Text>
      </View>

      <ThemedCard style={styles.infoBox}>
        <Text style={[styles.infoTitle, { color: theme.accent }]}>📊 تنسيق Excel المطلوب:</Text>
        <Text style={[styles.infoText, { color: theme.textSecondary }]}>• كل شيت = فئة</Text>
        <Text style={[styles.infoText, { color: theme.textSecondary }]}>• أعمدة: السؤال | الإجابة | الصعوبة | خطأ1 | خطأ2 | خطأ3</Text>
        <Text style={[styles.infoText, { color: theme.textSecondary }]}>• الصعوبة: 1 إلى 5</Text>
      </ThemedCard>

      <View style={styles.buttonsRow}>
        <ThemedButton onPress={handleImportJSON} disabled={importing} label={importing ? t('common.loading') : '📄 JSON'} variant='secondary' size='large' style={{ flex: 1 }} />
        <ThemedButton onPress={handleImportExcel} disabled={importing} label={importing ? t('common.loading') : '📊 Excel'} variant='success' size='large' style={{ flex: 1 }} />
      </View>

      {log.length > 0 && (
        <ScrollView style={[styles.logBox, { backgroundColor: theme.bgElevated, borderColor: theme.borderCard }]}>
          {log.map((msg, i) => (
            <Text key={i} style={[styles.logText, { color: theme.textSecondary }]}>{msg}</Text>
          ))}
        </ScrollView>
      )}

      {log.some(m => m.includes('🎉')) && (
        <ThemedButton onPress={onBack} label={`${t('common.done')} — ${t('common.back')}`} variant='success' size='large' />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, paddingHorizontal: 24, paddingVertical: 50, gap: 20 },
  header:         { flexDirection: 'row', alignItems: 'center', gap: 16 },
  backBtn:        { padding: 8 },
  backText:       { fontSize: 16, fontWeight: '700' },
  title:          { fontSize: 20, fontWeight: '900' },
  langBanner:     { borderRadius: 14, padding: 12, borderWidth: 1, alignItems: 'center' },
  langBannerText: { fontSize: 14, fontWeight: '800', textAlign: 'center' },
  infoBox:        { borderRadius: 16, padding: 16, gap: 6, borderWidth: 1 },
  infoTitle:      { fontSize: 15, fontWeight: '800', marginBottom: 4 },
  infoText:       { fontSize: 13 },
  buttonsRow:     { flexDirection: 'row', gap: 12 },
  importBtn:      { flex: 1, paddingVertical: 18, borderRadius: 16, alignItems: 'center', borderWidth: 1 },
  btnDisabled:    { opacity: 0.5 },
  importBtnText:  { fontSize: 15, fontWeight: '800' },
  logBox:         { flex: 1, borderRadius: 14, padding: 14, borderWidth: 1 },
  logText:        { fontSize: 13, marginBottom: 6, lineHeight: 20 },
  doneBtn:        { paddingVertical: 16, borderRadius: 16, alignItems: 'center', borderWidth: 1 },
  doneBtnText:    { fontSize: 16, fontWeight: '800' },
});
