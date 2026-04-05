import { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, StatusBar, ScrollView, useWindowDimensions } from 'react-native';

export default function GameSetupScreen({ onStart, onBack, tokens, categories = [], onOpenTokenModal }) {
  const [team1, setTeam1] = useState('');
  const [team2, setTeam2] = useState('');
  const [catCount, setCatCount] = useState(4);
  const [selected, setSelected] = useState([]);

  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const numColumns = isTablet ? 4 : 3;
  const itemSize = (width - 48 - (numColumns - 1) * 12) / numColumns * 0.65;

  const costs = { 4: 20, 5: 25, 6: 30 };
  const cost = costs[catCount];
  const canStart = team1.trim() && team2.trim() && tokens >= cost && selected.length === catCount;

  const toggleCategory = (id) => {
    if (selected.includes(id)) {
      setSelected(selected.filter((s) => s !== id));
    } else {
      if (selected.length < catCount) {
        setSelected([...selected, id]);
      }
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0d0d2b" />

      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>→ رجوع</Text>
        </TouchableOpacity>
        <Text style={styles.title}>إنشاء لعبة</Text>
        <TouchableOpacity style={styles.tokenBadge} onPress={onOpenTokenModal}>
          <Text style={styles.tokenText}>🪙 {tokens}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🏆 أسماء الفرق</Text>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>الفريق الأول</Text>
          <TextInput
            style={styles.input}
            placeholder="اسم الفريق الأول"
            placeholderTextColor="#555577"
            value={team1}
            onChangeText={setTeam1}
            textAlign="right"
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>الفريق الثاني</Text>
          <TextInput
            style={styles.input}
            placeholder="اسم الفريق الثاني"
            placeholderTextColor="#555577"
            value={team2}
            onChangeText={setTeam2}
            textAlign="right"
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📚 عدد الفئات</Text>
        <View style={styles.categoriesRow}>
          {[4, 5, 6].map((num) => (
            <TouchableOpacity
              key={num}
              style={[styles.catBtn, catCount === num && styles.catBtnActive]}
              onPress={() => { setCatCount(num); setSelected([]); }}
            >
              <Text style={[styles.catBtnNum, catCount === num && styles.catBtnNumActive]}>
                {num}
              </Text>
              <Text style={[styles.catBtnCost, catCount === num && styles.catBtnCostActive]}>
                🪙 {costs[num]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          🎯 اختر الفئات ({selected.length}/{catCount})
        </Text>
        {categories.length === 0 ? (
          <Text style={styles.emptyText}>لا توجد فئات — أضف فئات من لوحة الإدارة أولاً</Text>
        ) : (
          <View style={styles.grid}>
            {categories.map((cat) => {
              const isSelected = selected.includes(cat.id);
              const isFull = selected.length >= catCount && !isSelected;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.catCard,
                    { width: itemSize, height: itemSize },
                    isSelected && styles.catCardSelected,
                    isFull && styles.catCardDisabled,
                  ]}
                  onPress={() => !isFull && toggleCategory(cat.id)}
                >
                  <Text style={styles.catEmoji}>{cat.emoji}</Text>
                  <Text style={[styles.catName, isSelected && styles.catNameSelected]}>
                    {cat.name}
                  </Text>
                  {isSelected && (
                    <View style={styles.checkBadge}>
                      <Text style={styles.checkText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      <TouchableOpacity
        style={[styles.startBtn, !canStart && styles.startBtnDisabled]}
        onPress={() => canStart && onStart({ team1, team2, categories: catCount, selected })}
      >
        <Text style={[styles.startBtnText, !canStart && styles.startBtnTextDisabled]}>
          {tokens < cost ? '❌ رصيد غير كافٍ' :
           selected.length < catCount ? `اختر ${catCount - selected.length} فئات أخرى` :
           '🎮 ابدأ اللعبة'}
        </Text>
      </TouchableOpacity>

      {tokens < cost && (
        <TouchableOpacity style={styles.getTokensBtn} onPress={onOpenTokenModal}>
          <Text style={styles.getTokensText}>احصل على المزيد من النقاط 🪙</Text>
        </TouchableOpacity>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#0d0d2b',
    paddingHorizontal: 24,
    paddingVertical: 50,
    gap: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: { padding: 8 },
  backText: { color: '#f5c518', fontSize: 16, fontWeight: '700' },
  title: { fontSize: 22, fontWeight: '900', color: '#f5c518' },
  tokenBadge: {
    backgroundColor: '#1a1a3e',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f5c51855',
  },
  tokenText: { color: '#f5c518', fontSize: 15, fontWeight: '700' },
  section: { gap: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#f5c518' },
  inputGroup: { gap: 8 },
  label: { color: '#a09060', fontSize: 14, fontWeight: '600' },
  input: {
    backgroundColor: '#1a1a3e',
    borderWidth: 1.5,
    borderColor: '#2a2a55',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#ffffff',
    fontSize: 16,
  },
  categoriesRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  catBtn: {
    flex: 1,
    backgroundColor: '#1a1a3e',
    borderWidth: 1.5,
    borderColor: '#2a2a55',
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
    gap: 8,
  },
  catBtnActive: { backgroundColor: '#f5c518', borderColor: '#f5c518' },
  catBtnNum: { fontSize: 28, fontWeight: '900', color: '#f5c518' },
  catBtnNumActive: { color: '#0d0d2b' },
  catBtnCost: { fontSize: 13, color: '#a09060', fontWeight: '600' },
  catBtnCostActive: { color: '#0d0d2b' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  catCard: {
    backgroundColor: '#1a1a3e',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#2a2a55',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    position: 'relative',
  },
  catCardSelected: {
    backgroundColor: '#1a2a1a',
    borderColor: '#f5c518',
  },
  catCardDisabled: { opacity: 0.4 },
  catEmoji: { fontSize: 36 },
  catName: { fontSize: 13, fontWeight: '700', color: '#ffffff', textAlign: 'center' },
  catNameSelected: { color: '#f5c518' },
  checkBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#f5c518',
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: { color: '#0d0d2b', fontSize: 13, fontWeight: '900' },
  startBtn: {
    backgroundColor: '#f5c518',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 8,
  },
  startBtnDisabled: { backgroundColor: '#2a2a45' },
  startBtnText: { color: '#0d0d2b', fontSize: 20, fontWeight: '800' },
  startBtnTextDisabled: { color: '#555577' },
  getTokensBtn: { alignItems: 'center', paddingVertical: 12 },
  getTokensText: { color: '#a09060', fontSize: 14, textDecorationLine: 'underline' },
  emptyText: { color: '#a09060', textAlign: 'center', fontSize: 15, paddingVertical: 20 },
});
