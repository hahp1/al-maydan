import { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, StatusBar, ScrollView, Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as XLSX from 'xlsx';
import { db } from './firebaseConfig';
import {
  collection, doc, setDoc, getDocs, writeBatch
} from 'firebase/firestore';

export default function ImportScreen({ onBack }) {
  const [importing, setImporting] = useState(false);
  const [log, setLog] = useState([]);

  const addLog = (msg) => setLog(prev => [...prev, msg]);

  // ── استيراد من Excel ──
  const handleImportExcel = async () => {
    try {
      setImporting(true);
      setLog([]);

      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        copyToCacheDirectory: true,
      });

      if (result.canceled) { setImporting(false); return; }

      const file = result.assets[0];
      addLog(`📂 تم اختيار: ${file.name}`);

      const response = await fetch(file.uri);
      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });

      addLog(`📊 عدد الشيتات: ${workbook.SheetNames.length}`);

      let totalAdded = 0;

      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet);

        if (rows.length === 0) {
          addLog(`⚠️ شيت "${sheetName}" فارغ`);
          continue;
        }

        const questions = rows
          .filter(row => row['السؤال'] && row['الإجابة'])
          .map((row, i) => ({
            id: `${sheetName}_${Date.now()}_${i}`,
            level: Number(row['الصعوبة']) || 1,
            question: String(row['السؤال']).trim(),
            correct: String(row['الإجابة']).trim(),
            wrong: [
              String(row['خطأ1'] || '').trim(),
              String(row['خطأ2'] || '').trim(),
              String(row['خطأ3'] || '').trim(),
            ].filter(w => w !== ''),
            imageUrl: null,
          }));

        if (questions.length === 0) {
          addLog(`⚠️ "${sheetName}": لا أسئلة صالحة`);
          continue;
        }

        await uploadCategoryToFirestore(sheetName, questions, addLog);
        totalAdded += questions.length;
      }

      addLog(`🎉 تم! إجمالي الأسئلة المضافة: ${totalAdded}`);

    } catch (e) {
      addLog(`❌ خطأ: ${e.message}`);
      Alert.alert('خطأ', e.message);
    }

    setImporting(false);
  };

  // ── استيراد من JSON ──
  const handleImportJSON = async () => {
    try {
      setImporting(true);
      setLog([]);

      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled) { setImporting(false); return; }

      const file = result.assets[0];
      addLog(`📂 تم اختيار: ${file.name}`);

      const response = await fetch(file.uri);
      const data = await response.json();

      // دعم ملف واحد أو مصفوفة ملفات
      const categories = Array.isArray(data) ? data : [data];

      let totalAdded = 0;

      for (const cat of categories) {
        if (!cat.category || !cat.questions) {
          addLog(`⚠️ ملف غير صالح — يحتاج category و questions`);
          continue;
        }

        await uploadCategoryToFirestore(
          cat.category,
          cat.questions,
          addLog,
          cat.categoryId,
          cat.emoji,
          cat.isSpecial,
        );

        totalAdded += cat.questions.length;
      }

      addLog(`🎉 تم! إجمالي الأسئلة المضافة: ${totalAdded}`);

    } catch (e) {
      addLog(`❌ خطأ: ${e.message}`);
      Alert.alert('خطأ', e.message);
    }

    setImporting(false);
  };

  // ── رفع فئة كاملة لـ Firestore ──
  const uploadCategoryToFirestore = async (
    name, questions, log,
    categoryId = null,
    emoji = '📁',
    isSpecial = false,
  ) => {
    try {
      const catId = categoryId || name.replace(/\s+/g, '_').toLowerCase();
      const catRef = doc(db, 'categories', catId);

      // احفظ بيانات الفئة
      await setDoc(catRef, {
        name,
        emoji,
        isSpecial: isSpecial || false,
        imageUrl: null,
        categoryId: catId,
        createdAt: Date.now(),
      }, { merge: true });

      // ارفع الأسئلة على دفعات (batch)
      const batchSize = 500;
      for (let i = 0; i < questions.length; i += batchSize) {
        const batch = writeBatch(db);
        const chunk = questions.slice(i, i + batchSize);

        for (const q of chunk) {
          const qId = q.id || `q_${Date.now()}_${Math.random().toString(36).slice(2)}`;
          const qRef = doc(db, 'categories', catId, 'questions', qId);
          batch.set(qRef, {
            level: q.level || 1,
            question: q.question || q.text || '',
            correct: q.correct || q.answer || '',
            wrong: q.wrong || [],
            imageUrl: q.imageUrl || null,
          });
        }

        await batch.commit();
      }

      log(`✅ "${name}": ${questions.length} سؤال تم رفعه لـ Firestore`);

    } catch (e) {
      log(`❌ خطأ في رفع "${name}": ${e.message}`);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0d0d2b" />

      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>→ رجوع</Text>
        </TouchableOpacity>
        <Text style={styles.title}>📥 استيراد أسئلة</Text>
      </View>

      {/* JSON Format Info */}
      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>📋 تنسيق JSON المطلوب:</Text>
        <Text style={styles.infoText}>• categoryId: معرف إنجليزي</Text>
        <Text style={styles.infoText}>• category: اسم عربي</Text>
        <Text style={styles.infoText}>• emoji: رمز الفئة</Text>
        <Text style={styles.infoText}>• questions: مصفوفة الأسئلة</Text>
        <Text style={styles.infoText}>• كل سؤال: level + question + correct + wrong[3]</Text>
      </View>

      {/* Excel Format Info */}
      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>📊 تنسيق Excel المطلوب:</Text>
        <Text style={styles.infoText}>• كل شيت = فئة</Text>
        <Text style={styles.infoText}>• أعمدة: السؤال | الإجابة | الصعوبة | خطأ1 | خطأ2 | خطأ3</Text>
        <Text style={styles.infoText}>• الصعوبة: 1 إلى 5</Text>
      </View>

      {/* Buttons */}
      <View style={styles.buttonsRow}>
        <TouchableOpacity
          style={[styles.importBtn, importing && styles.importBtnDisabled]}
          onPress={handleImportJSON}
          disabled={importing}
        >
          <Text style={styles.importBtnText}>
            {importing ? '⏳ جاري...' : '📄 استيراد JSON'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.importBtnExcel, importing && styles.importBtnDisabled]}
          onPress={handleImportExcel}
          disabled={importing}
        >
          <Text style={styles.importBtnText}>
            {importing ? '⏳ جاري...' : '📊 استيراد Excel'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Log */}
      {log.length > 0 && (
        <ScrollView style={styles.logBox}>
          {log.map((msg, i) => (
            <Text key={i} style={styles.logText}>{msg}</Text>
          ))}
        </ScrollView>
      )}

      {log.some(m => m.includes('🎉')) && (
        <TouchableOpacity style={styles.doneBtn} onPress={onBack}>
          <Text style={styles.doneBtnText}>✅ تم - رجوع للوحة الإدارة</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d2b', paddingHorizontal: 24, paddingVertical: 50, gap: 20 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  backBtn: { padding: 8 },
  backText: { color: '#f5c518', fontSize: 16, fontWeight: '700' },
  title: { fontSize: 20, fontWeight: '900', color: '#f5c518' },
  infoBox: { backgroundColor: '#1a1a3e', borderRadius: 16, padding: 16, gap: 6, borderWidth: 1, borderColor: '#2a2a55' },
  infoTitle: { color: '#f5c518', fontSize: 15, fontWeight: '800', marginBottom: 4 },
  infoText: { color: '#a09060', fontSize: 13 },
  buttonsRow: { flexDirection: 'row', gap: 12 },
  importBtn: {
    flex: 1, backgroundColor: '#1a3a6e', paddingVertical: 18,
    borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#4a6aae',
  },
  importBtnExcel: {
    flex: 1, backgroundColor: '#1a5a3a', paddingVertical: 18,
    borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#2a8a5a',
  },
  importBtnDisabled: { opacity: 0.5 },
  importBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
  logBox: { flex: 1, backgroundColor: '#0a0a1e', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#2a2a55' },
  logText: { color: '#cccccc', fontSize: 13, marginBottom: 6, lineHeight: 20 },
  doneBtn: { backgroundColor: '#1a5a3a', paddingVertical: 16, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#2a8a5a' },
  doneBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
});
