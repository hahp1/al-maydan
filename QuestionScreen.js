import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, StatusBar } from 'react-native';

export default function QuestionScreen({ question, points, category, team1, team2, currentTeam, onAnswer, onBack }) {
  const [seconds, setSeconds] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [answered, setAnswered] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds(s => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const handleAnswer = (teamNum) => {
    setAnswered(true);
    onAnswer(teamNum, points);
  };

  const handleWrongAnswer = () => {
    setAnswered(true);
    onAnswer(null, 0);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0d0d2b" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← رجوع</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.categoryText}>{category}</Text>
          <View style={styles.pointsBadge}>
            <Text style={styles.pointsText}>{points} نقطة</Text>
          </View>
        </View>
        <View style={styles.timerBadge}>
          <Text style={styles.timerText}>⏱ {formatTime(seconds)}</Text>
        </View>
      </View>

      {/* Turn indicator */}
      <View style={styles.turnBar}>
        <Text style={styles.turnText}>
          دور فريق: <Text style={styles.turnTeam}>{currentTeam === 1 ? team1 : team2}</Text>
        </Text>
      </View>

      {/* Question */}
      <View style={styles.questionBox}>
        <Text style={styles.questionText}>{question}</Text>
      </View>

      {/* Answer Section */}
      {!showAnswer ? (
        <TouchableOpacity style={styles.showAnswerBtn} onPress={() => setShowAnswer(true)}>
          <Text style={styles.showAnswerText}>👁 عرض الإجابة</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.answerSection}>
          <Text style={styles.answerLabel}>الإجابة الصحيحة:</Text>
          <View style={styles.answerBox}>
            <Text style={styles.answerText}>{question?.answer || 'الإجابة هنا'}</Text>
          </View>

          {!answered && (
            <View style={styles.whoAnswered}>
              <Text style={styles.whoLabel}>من أجاب صح؟</Text>
              <View style={styles.whoButtons}>
                <TouchableOpacity
                  style={styles.btnTeam1}
                  onPress={() => handleAnswer(1)}
                >
                  <Text style={styles.btnTeamText}>✅ {team1}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.btnTeam2}
                  onPress={() => handleAnswer(2)}
                >
                  <Text style={styles.btnTeamText}>✅ {team2}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.btnNone}
                  onPress={handleWrongAnswer}
                >
                  <Text style={styles.btnNoneText}>❌ لا أحد</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {answered && (
            <TouchableOpacity style={styles.continueBtn} onPress={onBack}>
              <Text style={styles.continueBtnText}>← العودة للوحة</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d2b',
    paddingTop: 50,
    paddingHorizontal: 20,
    gap: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: { padding: 8 },
  backText: { color: '#f5c518', fontSize: 16, fontWeight: '700' },
  headerCenter: {
    alignItems: 'center',
    gap: 6,
  },
  categoryText: {
    color: '#a09060',
    fontSize: 16,
    fontWeight: '700',
  },
  pointsBadge: {
    backgroundColor: '#f5c518',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 20,
  },
  pointsText: {
    color: '#0d0d2b',
    fontSize: 14,
    fontWeight: '900',
  },
  timerBadge: {
    backgroundColor: '#1a1a3e',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f5c51855',
  },
  timerText: {
    color: '#f5c518',
    fontSize: 15,
    fontWeight: '700',
  },
  turnBar: {
    backgroundColor: '#1a1a3e',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f5c51833',
  },
  turnText: {
    color: '#a09060',
    fontSize: 15,
    fontWeight: '600',
  },
  turnTeam: {
    color: '#f5c518',
    fontWeight: '900',
  },
  questionBox: {
    flex: 1,
    backgroundColor: '#1a1a3e',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#2a2a55',
  },
  questionText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 36,
  },
  showAnswerBtn: {
    backgroundColor: '#f5c518',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 8,
  },
  showAnswerText: {
    color: '#0d0d2b',
    fontSize: 18,
    fontWeight: '800',
  },
  answerSection: {
    gap: 16,
  },
  answerLabel: {
    color: '#a09060',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  answerBox: {
    backgroundColor: '#1a3a1a',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#2a5a2a',
  },
  answerText: {
    color: '#4aff4a',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  whoAnswered: {
    gap: 12,
  },
  whoLabel: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  whoButtons: {
    gap: 10,
  },
  btnTeam1: {
    backgroundColor: '#1a3a6e',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4a6aae',
  },
  btnTeam2: {
    backgroundColor: '#1a5a3a',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4aaa6a',
  },
  btnNone: {
    backgroundColor: '#3a1a1a',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#7a3a3a',
  },
  btnTeamText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  btnNoneText: {
    color: '#ff6666',
    fontSize: 16,
    fontWeight: '700',
  },
  continueBtn: {
    backgroundColor: '#f5c518',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 8,
  },
  continueBtnText: {
    color: '#0d0d2b',
    fontSize: 18,
    fontWeight: '800',
  },
});
