import { memo, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, StatusBar } from 'react-native';
import { useTheme } from './ThemeContext';
import { useT } from './I18n';
import { ThemedButton, ThemedCard } from './ThemedComponents';

const ResultsScreen = memo(function ResultsScreen({ team1, team2, score1, score2, onRematch, onHome }) {
  const { theme } = useTheme();
  const t = useT();

  const isDraw      = score1 === score2;
  const winner      = score1 > score2 ? team1 : team2;
  const diff        = Math.abs(score1 - score2);

  const handleRematch = useCallback(() => onRematch(), [onRematch]);
  const handleHome    = useCallback(() => onHome(),    [onHome]);

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.statusBg} />

      <Text style={styles.trophy}>🏆</Text>

      {isDraw ? (
        <Text style={[styles.drawTitle, { color: theme.accent }]}>{t('common.draw')}</Text>
      ) : (
        <View style={styles.winnerSection}>
          <Text style={[styles.winnerLabel, { color: theme.textSecondary }]}>{t('results.winnerLabel')}</Text>
          <Text style={[styles.winnerName, { color: theme.accent }]}>{winner}</Text>
          <Text style={styles.winnerCrown}>👑</Text>
        </View>
      )}

      <View style={styles.scoresBox}>
        <View style={[
          styles.scoreCard,
          { backgroundColor: theme.bgCard, borderColor: theme.borderCard },
          !isDraw && winner === team1 && { borderColor: theme.accent },
        ]}>
          <Text style={[styles.scoreTeam, { color: theme.textSecondary }]}>{team1}</Text>
          <Text style={[styles.scorePoints, { color: theme.accent }]}>{score1}</Text>
          <Text style={[styles.scoreLabel, { color: theme.textMuted }]}>{t('common.points')}</Text>
        </View>

        <Text style={[styles.vs, { color: theme.textMuted }]}>VS</Text>

        <View style={[
          styles.scoreCard,
          { backgroundColor: theme.bgCard, borderColor: theme.borderCard },
          !isDraw && winner === team2 && { borderColor: theme.accent },
        ]}>
          <Text style={[styles.scoreTeam, { color: theme.textSecondary }]}>{team2}</Text>
          <Text style={[styles.scorePoints, { color: theme.accent }]}>{score2}</Text>
          <Text style={[styles.scoreLabel, { color: theme.textMuted }]}>{t('common.points')}</Text>
        </View>
      </View>

      {!isDraw && (
        <Text style={[styles.difference, { color: theme.textSecondary }]}>
          {t('results.diff', { w: winner, d: diff })}
        </Text>
      )}

      <View style={styles.buttons}>
        <ThemedButton onPress={handleRematch} label={t('results.rematch')} variant="primary" size="large" />
        <ThemedButton onPress={handleHome} label={t('common.returnHome')} variant="secondary" size="medium" />
      </View>
    </View>
  );
});

export default ResultsScreen;

const styles = StyleSheet.create({
  container:     { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 24 },
  trophy:        { fontSize: 80 },
  drawTitle:     { fontSize: 48, fontWeight: '900', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 20 },
  winnerSection: { alignItems: 'center', gap: 4 },
  winnerLabel:   { fontSize: 16, fontWeight: '700' },
  winnerName:    { fontSize: 42, fontWeight: '900', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 20 },
  winnerCrown:   { fontSize: 32 },
  scoresBox:     { flexDirection: 'row', alignItems: 'center', gap: 16, width: '100%' },
  scoreCard:     { flex: 1, borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1.5, gap: 4 },
  scoreTeam:     { fontSize: 14, fontWeight: '700', textAlign: 'center' },
  scorePoints:   { fontSize: 36, fontWeight: '900' },
  scoreLabel:    { fontSize: 12 },
  vs:            { fontSize: 18, fontWeight: '900' },
  difference:    { fontSize: 14, textAlign: 'center' },
  buttons:       { width: '100%', gap: 12 },
  btnRematch:    { paddingVertical: 18, borderRadius: 16, alignItems: 'center', elevation: 8 },
  btnRematchText:{ fontSize: 18, fontWeight: '800' },
  btnHome:       { paddingVertical: 16, borderRadius: 16, alignItems: 'center', borderWidth: 1.5 },
  btnHomeText:   { fontSize: 16, fontWeight: '700' },
});
