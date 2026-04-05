import { StyleSheet, Text, View, TouchableOpacity, StatusBar } from 'react-native';

export default function ResultsScreen({ team1, team2, score1, score2, onRematch, onHome }) {
  const isDraw = score1 === score2;
  const winner = score1 > score2 ? team1 : team2;
  const winnerScore = score1 > score2 ? score1 : score2;
  const loserScore = score1 > score2 ? score2 : score1;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0d0d2b" />

      {/* Trophy */}
      <Text style={styles.trophy}>🏆</Text>

      {/* Result Title */}
      {isDraw ? (
        <Text style={styles.drawTitle}>تعادل!</Text>
      ) : (
        <View style={styles.winnerSection}>
          <Text style={styles.winnerLabel}>الفائز</Text>
          <Text style={styles.winnerName}>{winner}</Text>
          <Text style={styles.winnerCrown}>👑</Text>
        </View>
      )}

      {/* Scores */}
      <View style={styles.scoresBox}>
        <View style={[styles.scoreCard, !isDraw && winner === team1 && styles.scoreCardWinner]}>
          <Text style={styles.scoreTeam}>{team1}</Text>
          <Text style={styles.scorePoints}>{score1}</Text>
          <Text style={styles.scoreLabel}>نقطة</Text>
        </View>

        <Text style={styles.vs}>VS</Text>

        <View style={[styles.scoreCard, !isDraw && winner === team2 && styles.scoreCardWinner]}>
          <Text style={styles.scoreTeam}>{team2}</Text>
          <Text style={styles.scorePoints}>{score2}</Text>
          <Text style={styles.scoreLabel}>نقطة</Text>
        </View>
      </View>

      {/* Difference */}
      {!isDraw && (
        <Text style={styles.difference}>
          فاز {winner} بفارق {Math.abs(score1 - score2)} نقطة
        </Text>
      )}

      {/* Buttons */}
      <View style={styles.buttons}>
        <TouchableOpacity style={styles.btnRematch} onPress={onRematch}>
          <Text style={styles.btnRematchText}>⚔️ مباراة انتقام</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btnHome} onPress={onHome}>
          <Text style={styles.btnHomeText}>🏠 العودة للصفحة الرئيسية</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d2b',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 24,
  },
  trophy: {
    fontSize: 80,
  },
  drawTitle: {
    fontSize: 48,
    fontWeight: '900',
    color: '#f5c518',
    textShadowColor: '#f5c51888',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  winnerSection: {
    alignItems: 'center',
    gap: 4,
  },
  winnerLabel: {
    color: '#a09060',
    fontSize: 16,
    fontWeight: '700',
  },
  winnerName: {
    color: '#f5c518',
    fontSize: 42,
    fontWeight: '900',
    textShadowColor: '#f5c51888',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  winnerCrown: {
    fontSize: 32,
  },
  scoresBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    width: '100%',
  },
  scoreCard: {
    flex: 1,
    backgroundColor: '#1a1a3e',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#2a2a55',
    gap: 4,
  },
  scoreCardWinner: {
    borderColor: '#f5c518',
    backgroundColor: '#1a1a2e',
  },
  scoreTeam: {
    color: '#a09060',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  scorePoints: {
    color: '#f5c518',
    fontSize: 36,
    fontWeight: '900',
  },
  scoreLabel: {
    color: '#555577',
    fontSize: 12,
  },
  vs: {
    color: '#555577',
    fontSize: 18,
    fontWeight: '900',
  },
  difference: {
    color: '#a09060',
    fontSize: 14,
    textAlign: 'center',
  },
  buttons: {
    width: '100%',
    gap: 12,
  },
  btnRematch: {
    backgroundColor: '#f5c518',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 8,
  },
  btnRematchText: {
    color: '#0d0d2b',
    fontSize: 18,
    fontWeight: '800',
  },
  btnHome: {
    backgroundColor: '#1a1a3e',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#f5c518',
  },
  btnHomeText: {
    color: '#f5c518',
    fontSize: 16,
    fontWeight: '700',
  },
});
