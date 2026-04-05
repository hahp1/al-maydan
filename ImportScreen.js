import { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, StatusBar, ScrollView, Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as XLSX from 'xlsx';

const STORAGE_KEY = 'almaydan_categories';

export default function ImportScreen({ onBack }) {
  const [importing, setImporting] = useState(false);
  const [log, setLog] = useState([]);

  const addLog = (msg) => setLog(prev => [...prev, msg]);

  const handleImport = async () => {
    try {
      setImporting(true);
      setLog([]);

      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        setImporting(false);
        return;
      }

      const file = result.assets[0];
      addLog(`📂 تم اختيار: ${file.name}`);

      const response = await fetch(file.uri);
      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });

      addLog(`📊 عدد الشيتات: ${workbook.SheetNames.length}`);

      const existing = await AsyncStorage.getItem(STORAGE_KEY);
      const categories = existing ? JSON.parse(existing) : [];

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
          .map(row => ({
            id: Date.now() + Math.random(),
            text: String(row['السؤال']).trim(),
            answer: String(row['الإجابة']).trim(),
            difficulty: Number(row['الصعوبة']) || 100,
          }));

        if (questions.length === 0) {
          addLog(`⚠️ "${sheetName}": لا أسئلة صالحة (تأكد من أعمدة: السؤال، الإجابة، الصعوبة)`);
          continue;
        }

        const existing_cat = categories.find(c => c.name === sheetName);
        if (existing_cat) {
          existing_cat.questions = [...existing_cat.questions, ...questions];
          addLog(`✅ "${sheetName}": أضفنا ${questions.length} سؤال للفئة الموجودة`);
        } else {
          categories.push({
            id: Date.now().toString() + Math.random(),
            name: sheetName,
            emoji: '📁',
            image: null,
            questions,
          });
          addLog(`✅ "${sheetName}": فئة جديدة بـ ${questions.length} سؤال`);
        }

        totalAdded += questions.length;
      }

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
      addLog(`🎉 تم! إجمالي الأسئلة المضافة: ${totalAdded}`);

    } catch (e) {
      addLog(`❌ خطأ: ${e.message}`);
      Alert.alert('خطأ', e.message);
    }

    setImporting(false);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0d0d2b" />

      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>→ رجوع</Text>
        </TouchableOpacity>
        <Text style={styles.title}>📥 استيراد من Excel</Text>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>📋 تنسيق الملف المطلوب:</Text>
        <Text style={styles.infoText}>• كل شيت = فئة واحدة</Text>
        <Text style={styles.infoText}>• اسم الشيت = اسم الفئة</Text>
        <Text style={styles.infoText}>• أعمدة مطلوبة: السؤال | الإجابة | الصعوبة</Text>
        <Text style={styles.infoText}>• الصعوبة: 100، 200، 300، 400، أو 500</Text>
      </View>

      <TouchableOpacity
        style={[styles.importBtn, importing && styles.importBtnDisabled]}
        onPress={handleImport}
        disabled={importing}
      >
        <Text style={styles.importBtnText}>
          {importing ? '⏳ جاري الاستيراد...' : '📂 اختر ملف Excel'}
        </Text>
      </TouchableOpacity>

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
  importBtn: { backgroundColor: '#1a3a6e', paddingVertical: 18, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#4a6aae', elevation: 4 },
  importBtnDisabled: { opacity: 0.5 },
  importBtnText: { color: '#ffffff', fontSize: 17, fontWeight: '800' },
  logBox: { flex: 1, backgroundColor: '#0a0a1e', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#2a2a55' },
  logText: { color: '#cccccc', fontSize: 13, marginBottom: 6, lineHeight: 20 },
  doneBtn: { backgroundColor: '#1a5a3a', paddingVertical: 16, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#2a8a5a' },
  doneBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
});
