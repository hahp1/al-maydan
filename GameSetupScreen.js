import { useState, useCallback, memo, useMemo } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  TextInput, StatusBar, ScrollView, useWindowDimensions,
} from 'react-native';
import { useTheme } from './ThemeContext';
import { useT, useRTLStyles } from './I18n';
import CachedCategoryImage from './CachedCategoryImage';
import { ThemedButton, ThemedCard, ThemedPill, ThemedModal, ThemedRow } from './ThemedComponents';
import ExitButton from './ExitButton';

const CategoryCard = memo(({ cat, isSelected, isFull, itemSize, onPress, theme }) => (
  <ThemedCard
    style={[
      styles.catCard,
      { width: itemSize, height: itemSize, backgroundColor: theme.bgCard, borderColor: theme.borderCard },
      isSelected && { backgroundColor: theme.accentSoft, borderColor: theme.accent },
      isFull     && styles.catCardDisabled,
    ]}
    onPress={onPress}
    disabled={isFull && !isSelected}
    activeOpacity={0.8}
  >
    <CachedCategoryImage
      imageUrl={cat.imageUrl}
      emoji={cat.emoji}
      size={itemSize * 0.44}
    />
    <Text style={[styles.catName, { color: isSelected ? theme.accent : theme.textPrimary }]}>{cat.name}</Text>
    {isSelected && (
      <View style={[styles.checkBadge, { backgroundColor: theme.accent }]}>
        <Text style={[styles.checkText, { color: theme.textOnAccent }]}>✓</Text>
      </View>
    )}
  </ThemedCard>
));

const CountButton = memo(({ num, active, onPress, theme }) => (
  <ThemedCard
    style={[
      styles.catBtn,
      { backgroundColor: theme.bgCard, borderColor: theme.borderCard },
      active && { backgroundColor: theme.accent, borderColor: theme.accent },
    ]}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <Text style={[styles.catBtnNum, { color: active ? theme.textOnAccent : theme.accent }]}>{num}</Text>
  </ThemedCard>
));

// tokens: للعرض فقط — وسائل المساعدة تستهلكها أثناء اللعبة
// onOpenTokenModal: يفتح TokenModal لشحن التوكنز
export default function GameSetupScreen({ onStart, onBack, tokens = 0, categories = [], onOpenTokenModal }) {
  const { theme } = useTheme();
  const t  = useT();
  const rs = useRTLStyles();

  const [team1,    setTeam1]    = useState('');
  const [team2,    setTeam2]    = useState('');
  const [catCount, setCatCount] = useState(4);
  const [selected, setSelected] = useState([]);

  const { width } = useWindowDimensions();
  const isTablet   = width >= 768;
  const numColumns = isTablet ? 4 : 3;
  const itemSize   = useMemo(() =>
    (width - 48 - (numColumns - 1) * 12) / numColumns * 0.65,
  [width, numColumns]);

  const canStart = team1.trim() && team2.trim() && selected.length === catCount;

  const toggleCategory = useCallback((id) => {
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(s => s !== id);
      if (prev.length < catCount) return [...prev, id];
      return prev;
    });
  }, [catCount]);

  const handleSetCount = useCallback((num) => { setCatCount(num); setSelected([]); }, []);
  const handleStart    = useCallback(() => {
    if (canStart) onStart({ team1, team2, categories: catCount, selected });
  }, [canStart, team1, team2, catCount, selected]);

  const startBtnLabel = useMemo(() => {
    if (selected.length < catCount) return t('setup.notEnoughCats', { n: catCount - selected.length });
    return t('setup.startBtn');
  }, [selected.length, catCount, t]);

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: 'transparent' }]}
      keyboardShouldPersistTaps="handled"
    >
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.statusBg} />

      {/* ── الهيدر ── */}
      <View style={styles.header}>
        <ExitButton onPress={onBack} icon='back' size={38} />
        <Text style={[styles.title, { color: theme.accent }]}>{t('setup.title')}</Text>
        {/* رصيد التوكنز — قابل للنقر لفتح شاشة الشحن */}
        <ThemedCard
          style={[styles.tokenBadge, { backgroundColor: theme.bgCard, borderColor: theme.accentBorder }]}
          onPress={onOpenTokenModal}
          hitSlop={HIT_SLOP}
        >
          <Text style={[styles.tokenText, { color: theme.accent }]}>🪙 {tokens}</Text>
        </ThemedCard>
      </View>

      {/* ── الفرق ── */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.accent }]}>{t('setup.teamsSection')}</Text>
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>{t('setup.team1')}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, color: theme.textPrimary }, rs.textInput]}
            placeholder={t('setup.team1ph')}
            placeholderTextColor={theme.textMuted}
            value={team1}
            onChangeText={setTeam1}
            returnKeyType="next"
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>{t('setup.team2')}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, color: theme.textPrimary }, rs.textInput]}
            placeholder={t('setup.team2ph')}
            placeholderTextColor={theme.textMuted}
            value={team2}
            onChangeText={setTeam2}
            returnKeyType="done"
          />
        </View>
      </View>

      {/* ── عدد الفئات ── */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.accent }]}>{t('setup.catsSection')}</Text>
        <View style={styles.categoriesRow}>
          {[4, 5, 6].map(num => (
            <CountButton key={num} num={num} active={catCount === num} onPress={() => handleSetCount(num)} theme={theme} />
          ))}
        </View>
      </View>

      {/* ── اختيار الفئات ── */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.accent }]}>
          {t('setup.chooseCats', { s: selected.length, c: catCount })}
        </Text>
        {categories.length === 0 ? (
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>{t('setup.noCats')}</Text>
        ) : (
          <View style={styles.grid}>
            {categories.map(cat => {
              const isSelected = selected.includes(cat.id);
              const isFull     = selected.length >= catCount && !isSelected;
              return (
                <CategoryCard
                  key={cat.id} cat={cat} isSelected={isSelected} isFull={isFull}
                  itemSize={itemSize} onPress={() => toggleCategory(cat.id)} theme={theme}
                />
              );
            })}
          </View>
        )}
      </View>

      {/* ── زر البدء ── */}
      <ThemedButton
        onPress={handleStart}
        label={startBtnLabel}
        variant="primary"
        size="large"
        disabled={!canStart}
      />

      {/* ── تلميح وسائل المساعدة ── */}
      <Text style={[styles.lifelineHint, { color: theme.textMuted }]}>
        🛡️ وسائل المساعدة تستهلك 🪙 توكنز أثناء اللعبة
      </Text>

    </ScrollView>
  );
}

const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

const styles = StyleSheet.create({
  container:       { flexGrow: 1, paddingHorizontal: 24, paddingVertical: 50, gap: 32 },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn:         { padding: 8 },
  backText:        { fontSize: 16, fontWeight: '700' },
  title:           { fontSize: 22, fontWeight: '900' },
  tokenBadge:      { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  tokenText:       { fontSize: 15, fontWeight: '700' },
  section:         { gap: 16 },
  sectionTitle:    { fontSize: 18, fontWeight: '800' },
  inputGroup:      { gap: 8 },
  label:           { fontSize: 14, fontWeight: '600' },
  input:           { borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16 },
  categoriesRow:   { flexDirection: 'row', gap: 12, justifyContent: 'center' },
  catBtn:          { flex: 1, borderWidth: 1.5, borderRadius: 16, paddingVertical: 20, alignItems: 'center', gap: 8 },
  catBtnNum:       { fontSize: 28, fontWeight: '900' },
  grid:            { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  catCard:         { borderRadius: 16, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', gap: 8, position: 'relative' },
  catCardDisabled: { opacity: 0.4 },
  catEmoji:        { fontSize: 36 },
  catName:         { fontSize: 13, fontWeight: '700', textAlign: 'center' },
  checkBadge:      { position: 'absolute', top: 8, left: 8, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  checkText:       { fontSize: 13, fontWeight: '900' },
  startBtn:        { paddingVertical: 18, borderRadius: 16, alignItems: 'center', elevation: 8 },
  startBtnText:    { fontSize: 20, fontWeight: '800' },
  lifelineHint:    { fontSize: 12, textAlign: 'center', paddingBottom: 8 },
  emptyText:       { textAlign: 'center', fontSize: 15, paddingVertical: 20 },
});
