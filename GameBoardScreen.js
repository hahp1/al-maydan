import { useState } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  StatusBar, ScrollView, useWindowDimensions, Alert,
} from 'react-native';
import QuestionScreen from './QuestionScreen';

const pointColors = {
  100: '#1a3a6e',
  200: '#1a5a3a',
  300: '#5a5a00',
  400: '#7a3a00',
  500: '#7a1a1a',
};

// level في JSON الجديد → نقاط اللعبة
const LEVEL_TO_POINTS = { 1: 100, 2: 200, 3: 300, 4: 400, 5: 500 };
const POINTS_TO_LEVEL = { 100: 1, 200: 2, 300: 3, 400: 4, 500: 5 };

const POINTS = [500, 400, 300, 200, 100];

export default function GameBoardScreen({ onGameEnd, team1, team2, selectedCategories, gameMode = 'classic' }) {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const numCats = selectedCategories.length;

  const [scores, setScores] = useState({ team1: 0, team2: 0 });
  const [currentTeam, setCurrentTeam] = useState(1);
  const [usedQuestions, setUsedQuestions] = useState({});
  const [activeQuestion, setActiveQuestion] = useState(null);

  const totalQuestions = numCats * 10;
  const isUsed = (catId, pts, side) => !!usedQuestions[`${catId}-${pts}-${side}`];

  const handleOpenQuestion = (cat, pts, side) => {
    if (isUsed(cat.id, pts, side)) return;

    const questions = cat.questions || [];
    if (questions.length === 0) {
      Alert.alert('تنبيه', 'لا توجد أسئلة في هذه الفئة!');
      return;
    }

    // فلترة حسب المستوى إذا كان JSON بالصيغة الجديدة
    const targetLevel = POINTS_TO_LEVEL[pts];
    const levelQuestions = questions.filter(q => q.level === targetLevel);
    const pool = levelQuestions.length > 0 ? levelQuestions : questions;
    const q = pool[Math.floor(Math.random() * pool.length)];

    setActiveQuestion({ cat, pts, side, question: q });
  };

  const handleAnswer = (teamNum, pts) => {
    const key = `${activeQuestion.cat.id}-${activeQuestion.pts}-${activeQuestion.side}`;
    const newUsed = { ...usedQuestions, [key]: true };
    setUsedQuestions(newUsed);
    let newScores = { ...scores };
    if (teamNum !== null) newScores[`team${teamNum}`] += pts;
    setScores(newScores);
    setCurrentTeam(currentTeam === 1 ? 2 : 1);
    setActiveQuestion(null);
    if (Object.keys(newUsed).length === totalQuestions) onGameEnd(newScores.team1, newScores.team2);
  };

  const handleEndGame = () => {
    Alert.alert(
      '🏁 إنهاء اللعبة',
      'هل أنت متأكد من إنهاء اللعبة؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'إنهاء', style: 'destructive', onPress: () => onGameEnd(scores.team1, scores.team2) },
      ]
    );
  };

  // ── حساب عرض العمود ──
  const hPad = 10;
  const gap = 6;
  const availableW = width - hPad * 2 - gap * (numCats - 1);
  const idealColW = availableW / numCats;
  const minColW = isLandscape ? 90 : 68;
  const colWidth = Math.max(idealColW, minColW);

  if (activeQuestion) {
    const q = activeQuestion.question;
    return (
      <QuestionScreen
        question={q.question ?? q.text}        // دعم الصيغتين
        answer={q.correct ?? q.answer}         // دعم الصيغتين
        wrong={q.wrong ?? []}                  // الإجابات الخاطئة
        points={activeQuestion.pts}
        category={activeQuestion.cat.name}
        team1={team1}
        team2={team2}
        currentTeam={currentTeam}
        onAnswer={handleAnswer}
        onBack={() => setActiveQuestion(null)}
        mode={gameMode}                        // 'classic' | 'mcq'
      />
    );
  }

  // ── الشريط العلوي ──
  const TopBar = () => (
    <View style={styles.topBar}>

      {/* يسار: زر إنهاء */}
      <TouchableOpacity style={styles.endBtn} onPress={handleEndGame}>
        <Text style={styles.endIcon}>🏁</Text>
        <Text style={styles.endText}>إنهاء</Text>
      </TouchableOpacity>

      {/* فريق 2 */}
      <View style={styles.teamCard}>
        <Text style={styles.teamName} numberOfLines={1}>
          {scores.team2 > scores.team1 && scores.team2 > 0 ? '👑 ' : ''}{team2}
        </Text>
        <Text style={styles.teamScore}>{scores.team2}</Text>
      </View>

      <View style={styles.spacer} />

      {/* فريق 1 */}
      <View style={styles.teamCard}>
        <Text style={styles.teamName} numberOfLines={1}>
          {scores.team1 >= scores.team2 && scores.team1 > 0 ? '👑 ' : ''}{team1}
        </Text>
        <Text style={styles.teamScore}>{scores.team1}</Text>
      </View>

      {/* الدور */}
      <View style={styles.turnCard}>
        <Text style={styles.turnLabel}>دور</Text>
        <Text style={styles.turnName} numberOfLines={1}>
          {currentTeam === 1 ? team1 : team2}
        </Text>
      </View>

    </View>
  );

  // ── لوحة الأسئلة ──
  const Board = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: hPad, paddingVertical: 8 }}
    >
      <View style={{ gap: 6 }}>
        {/* رؤوس الفئات */}
        <View style={{ flexDirection: 'row', gap }}>
          {selectedCategories.map((cat) => (
            <View key={cat.id} style={[styles.catHeader, { width: colWidth }]}>
              <Text style={styles.catEmoji}>{cat.emoji}</Text>
              <Text style={styles.catHeaderText} numberOfLines={2}>{cat.name}</Text>
            </View>
          ))}
        </View>

        {/* صفوف النقاط */}
        {POINTS.map((pts) => (
          <View key={pts} style={{ flexDirection: 'row', gap }}>
            {selectedCategories.map((cat) => (
              <View
                key={cat.id}
                style={[styles.cellPair, { width: colWidth, backgroundColor: pointColors[pts] }]}
              >
                <TouchableOpacity
                  style={[styles.cell, isUsed(cat.id, pts, 'L') && styles.cellUsed]}
                  onPress={() => handleOpenQuestion(cat, pts, 'L')}
                >
                  <Text style={[styles.cellText, isUsed(cat.id, pts, 'L') && styles.cellTextUsed]}>
                    {pts}
                  </Text>
                </TouchableOpacity>
                <View style={styles.cellDivider} />
                <TouchableOpacity
                  style={[styles.cell, isUsed(cat.id, pts, 'R') && styles.cellUsed]}
                  onPress={() => handleOpenQuestion(cat, pts, 'R')}
                >
                  <Text style={[styles.cellText, isUsed(cat.id, pts, 'R') && styles.cellTextUsed]}>
                    {pts}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a1f" />
      <TopBar />
      <View style={{ flex: 1 }}>
        <Board />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0d0d2b',
    paddingTop: 46,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a0a1f',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a3e',
    gap: 8,
  },
  spacer: { flex: 1 },
  teamCard: {
    alignItems: 'center',
    backgroundColor: '#1a1a3e',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#2a2a55',
    minWidth: 80,
  },
  teamName: {
    color: '#a09060',
    fontSize: 11,
    fontWeight: '700',
    maxWidth: 100,
    textAlign: 'center',
  },
  teamScore: {
    color: '#f5c518',
    fontSize: 20,
    fontWeight: '900',
  },
  turnCard: {
    alignItems: 'center',
    backgroundColor: '#f5c518',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 75,
  },
  turnLabel: { color: '#0d0d2b', fontSize: 10, fontWeight: '700' },
  turnName: {
    color: '#0d0d2b',
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
    maxWidth: 90,
  },
  endBtn: {
    alignItems: 'center',
    backgroundColor: '#1a1a3e',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#ff444433',
    minWidth: 54,
  },
  endIcon: { fontSize: 16 },
  endText: { color: '#ff6666', fontSize: 10, fontWeight: '700' },
  catHeader: {
    backgroundColor: '#1a1a3e',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#2a2a55',
  },
  catEmoji: { fontSize: 20 },
  catHeaderText: {
    color: '#f5c518',
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
    paddingHorizontal: 2,
  },
  cellPair: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cell: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.15)' },
  cellUsed: { opacity: 0.2 },
  cellText: { color: '#ffffff', fontSize: 12, fontWeight: '900' },
  cellTextUsed: { color: '#888' },
});
