import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, StatusBar, ScrollView } from 'react-native';

// يخلط المصفوفة عشوائياً
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── نمط كلاسيك: المضيف يقرأ السؤال ويحكم ──
function ClassicMode({ question, answer, points, team1, team2, currentTeam, onAnswer, onBack }) {
  const [seconds, setSeconds] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [answered, setAnswered] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
  };

  return (
    <>
      {/* Question */}
      <View style={styles.questionBox}>
        <Text style={styles.timerFloating}>⏱ {formatTime(seconds)}</Text>
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
            <Text style={styles.answerText}>{answer}</Text>
          </View>

          {!answered && (
            <View style={styles.whoAnswered}>
              <Text style={styles.whoLabel}>من أجاب صح؟</Text>
              <View style={styles.whoButtons}>
                <TouchableOpacity style={styles.btnTeam1} onPress={() => { setAnswered(true); onAnswer(1, points); }}>
                  <Text style={styles.btnTeamText}>✅ {team1}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnTeam2} onPress={() => { setAnswered(true); onAnswer(2, points); }}>
                  <Text style={styles.btnTeamText}>✅ {team2}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnNone} onPress={() => { setAnswered(true); onAnswer(null, 0); }}>
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
    </>
  );
}

// ── نمط MCQ: 4 خيارات، المستخدم يختار ──
function MCQMode({ question, answer, wrong, points, team1, team2, currentTeam, onAnswer, onBack }) {
  const [seconds, setSeconds] = useState(0);
  const [selected, setSelected] = useState(null);
  const [choices] = useState(() => shuffleArray([answer, ...wrong]));

  useEffect(() => {
    const timer = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const handleSelect = (choice) => {
    if (selected) return;
    setSelected(choice);
  };

  const isCorrect = selected === answer;

  const getChoiceStyle = (choice) => {
    if (!selected) return styles.choiceBtn;
    if (choice === answer) return [styles.choiceBtn, styles.choiceCorrect];
    if (choice === selected) return [styles.choiceBtn, styles.choiceWrong];
    return [styles.choiceBtn, styles.choiceDim];
  };

  const getChoiceTextStyle = (choice) => {
    if (!selected) return styles.choiceText;
    if (choice === answer) return [styles.choiceText, styles.choiceTextCorrect];
    if (choice === selected) return [styles.choiceText, styles.choiceTextWrong];
    return [styles.choiceText, styles.choiceTextDim];
  };

  return (
    <>
      {/* Question */}
      <View style={styles.questionBox}>
        <Text style={styles.timerFloating}>⏱ {formatTime(seconds)}</Text>
        <Text style={styles.questionText}>{question}</Text>
      </View>

      {/* Choices */}
      <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={styles.choicesContainer}>
        {choices.map((choice, i) => (
          <TouchableOpacity
            key={i}
            style={getChoiceStyle(choice)}
            onPress={() => handleSelect(choice)}
            disabled={!!selected}
          >
            <View style={styles.choiceRow}>
              <Text style={styles.choiceLetter}>
                {['أ', 'ب', 'ج', 'د'][i]}
              </Text>
              <Text style={getChoiceTextStyle(choice)}>{choice}</Text>
              {selected && choice === answer && <Text style={styles.choiceIcon}>✅</Text>}
              {selected && choice === selected && choice !== answer && <Text style={styles.choiceIcon}>❌</Text>}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Result after selection */}
      {selected && (
        <View style={styles.mcqResult}>
          <Text style={[styles.mcqResultText, isCorrect ? styles.mcqCorrectText : styles.mcqWrongText]}>
            {isCorrect ? '🎉 إجابة صحيحة!' : '💔 إجابة خاطئة!'}
          </Text>
          <View style={styles.whoButtons}>
            {isCorrect && (
              <>
                <TouchableOpacity style={styles.btnTeam1} onPress={() => onAnswer(1, points)}>
                  <Text style={styles.btnTeamText}>✅ {team1} أجاب</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnTeam2} onPress={() => onAnswer(2, points)}>
                  <Text style={styles.btnTeamText}>✅ {team2} أجاب</Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity style={isCorrect ? styles.btnNone : styles.continueBtn} onPress={() => onAnswer(null, 0)}>
              <Text style={isCorrect ? styles.btnNoneText : styles.continueBtnText}>
                {isCorrect ? '❌ لا أحد' : '← العودة للوحة'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </>
  );
}

// ── الشاشة الرئيسية ──
export default function QuestionScreen({
  question,
  answer,
  wrong,          // مصفوفة الإجابات الخاطئة (من JSON الجديد)
  points,
  category,
  team1,
  team2,
  currentTeam,
  onAnswer,
  onBack,
  mode = 'classic', // 'classic' | 'mcq'
}) {
  const isMCQ = mode === 'mcq' && wrong && wrong.length >= 3;

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
        <View style={[styles.modeBadge, isMCQ && styles.modeBadgeMCQ]}>
          <Text style={styles.modeText}>{isMCQ ? '🔤 MCQ' : '🎙 كلاسيك'}</Text>
        </View>
      </View>

      {/* Turn indicator */}
      <View style={styles.turnBar}>
        <Text style={styles.turnText}>
          دور فريق: <Text style={styles.turnTeam}>{currentTeam === 1 ? team1 : team2}</Text>
        </Text>
      </View>

      {/* Mode Content */}
      {isMCQ ? (
        <MCQMode
          question={question}
          answer={answer}
          wrong={wrong}
          points={points}
          team1={team1}
          team2={team2}
          currentTeam={currentTeam}
          onAnswer={onAnswer}
          onBack={onBack}
        />
      ) : (
        <ClassicMode
          question={question}
          answer={answer}
          points={points}
          team1={team1}
          team2={team2}
          currentTeam={currentTeam}
          onAnswer={onAnswer}
          onBack={onBack}
        />
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
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: { padding: 8 },
  backText: { color: '#f5c518', fontSize: 16, fontWeight: '700' },
  headerCenter: { alignItems: 'center', gap: 6 },
  categoryText: { color: '#a09060', fontSize: 16, fontWeight: '700' },
  pointsBadge: {
    backgroundColor: '#f5c518',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 20,
  },
  pointsText: { color: '#0d0d2b', fontSize: 14, fontWeight: '900' },
  modeBadge: {
    backgroundColor: '#1a1a3e',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f5c51855',
  },
  modeBadgeMCQ: {
    borderColor: '#4a8aff55',
    backgroundColor: '#1a1a4e',
  },
  modeText: { color: '#f5c518', fontSize: 13, fontWeight: '700' },
  turnBar: {
    backgroundColor: '#1a1a3e',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f5c51833',
  },
  turnText: { color: '#a09060', fontSize: 15, fontWeight: '600' },
  turnTeam: { color: '#f5c518', fontWeight: '900' },

  // ── سؤال ──
  questionBox: {
    flex: 1,
    maxHeight: 220,
    backgroundColor: '#1a1a3e',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#2a2a55',
    position: 'relative',
  },
  timerFloating: {
    position: 'absolute',
    top: 10,
    right: 14,
    color: '#f5c51888',
    fontSize: 12,
    fontWeight: '700',
  },
  questionText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 34,
  },

  // ── كلاسيك ──
  showAnswerBtn: {
    backgroundColor: '#f5c518',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 8,
  },
  showAnswerText: { color: '#0d0d2b', fontSize: 18, fontWeight: '800' },
  answerSection: { gap: 12 },
  answerLabel: { color: '#a09060', fontSize: 14, fontWeight: '700', textAlign: 'center' },
  answerBox: {
    backgroundColor: '#1a3a1a',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#2a5a2a',
  },
  answerText: { color: '#4aff4a', fontSize: 20, fontWeight: '800', textAlign: 'center' },
  whoAnswered: { gap: 10 },
  whoLabel: { color: '#ffffff', fontSize: 16, fontWeight: '800', textAlign: 'center' },
  whoButtons: { gap: 10 },
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
  btnTeamText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  btnNoneText: { color: '#ff6666', fontSize: 16, fontWeight: '700' },
  continueBtn: {
    backgroundColor: '#f5c518',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 8,
  },
  continueBtnText: { color: '#0d0d2b', fontSize: 18, fontWeight: '800' },

  // ── MCQ ──
  choicesContainer: { gap: 10 },
  choiceBtn: {
    backgroundColor: '#1a1a3e',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: '#2a2a55',
  },
  choiceCorrect: {
    backgroundColor: '#1a3a1a',
    borderColor: '#4aff4a',
  },
  choiceWrong: {
    backgroundColor: '#3a1a1a',
    borderColor: '#ff4444',
  },
  choiceDim: { opacity: 0.4 },
  choiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  choiceLetter: {
    color: '#f5c518',
    fontSize: 16,
    fontWeight: '900',
    width: 24,
    textAlign: 'center',
  },
  choiceText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  choiceTextCorrect: { color: '#4aff4a' },
  choiceTextWrong: { color: '#ff6666' },
  choiceTextDim: { color: '#888' },
  choiceIcon: { fontSize: 18 },
  mcqResult: { gap: 12 },
  mcqResultText: { fontSize: 20, fontWeight: '900', textAlign: 'center' },
  mcqCorrectText: { color: '#4aff4a' },
  mcqWrongText: { color: '#ff6666' },
});
