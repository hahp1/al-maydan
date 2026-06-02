/**
 * GameBoardScreen.js — محدّث
 * ════════════════════════════════════════════════
 *  ✅ tokens و setTokens ممررة من App.js
 *  ✅ onSwapSame / onSwapRandom مبنيّة هنا وممررة لـ QuestionScreen
 *  ✅ onSpendTokens يخصم من tokens ويحدّث الـ state
 *  ✅ باقي منطق اللوح محفوظ كما هو
 */

import { useState, useCallback, memo, useMemo, useEffect } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  StatusBar, ScrollView, useWindowDimensions, Alert, ActivityIndicator, BackHandler } from 'react-native';
import QuestionScreen from './QuestionScreen';
import { useTheme } from './ThemeContext';
import LeaveModal from './LeaveModal';
import { useT, useLanguage } from './I18n';
import { WebScreenButton, GameInfoButton } from './WebRoomService';
import { fetchQuestionsForCategories } from './firebaseConfig';
import { ThemedButton, ThemedCard, ThemedPill, ThemedModal, ThemedRow } from './ThemedComponents';

const pointColors      = { 100: '#1a3a6e', 200: '#1a5a3a', 300: '#5a5a00', 400: '#7a3a00', 500: '#7a1a1a' };
const pointColorsLight = { 100: '#2a5aaa', 200: '#2a8a5a', 300: '#8a8a00', 400: '#aa5a00', 500: '#aa2a2a' };

const POINTS_TO_LEVEL = { 100: 1, 200: 2, 300: 3, 400: 4, 500: 5 };
const POINTS = [500, 400, 300, 200, 100];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const Cell = memo(({ used, pts, onPress }) => (
  <TouchableOpacity style={[styles.cell, used && styles.cellUsed]} onPress={onPress} disabled={used}>
    <Text style={[styles.cellText, used && styles.cellTextUsed]}>{pts}</Text>
  </TouchableOpacity>
));

const CategoryHeader = memo(({ cat, colWidth, theme }) => (
  <View style={[styles.catHeader, { width: colWidth, backgroundColor: theme.bgCard, borderColor: theme.borderCard }]}>
    <Text style={styles.catEmoji}>{cat.emoji}</Text>
    <Text style={[styles.catHeaderText, { color: theme.accent }]} numberOfLines={2}>{cat.name}</Text>
  </View>
));

const TopBar = memo(({ scores, team1, team2, currentTeam, onEnd, theme, t, currentUser, themeId, lang }) => (
  <View style={[styles.topBar, { backgroundColor: theme.bgElevated, borderBottomColor: theme.divider }]}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <TouchableOpacity style={[styles.endBtn, { backgroundColor: theme.bgCard, borderColor: '#ff444433' }]} onPress={onEnd}>
        <Text style={styles.endIcon}>🏁</Text>
        <Text style={[styles.endText, { color: theme.error }]}>{t('board.endBtn')}</Text>
      </TouchableOpacity>
      <GameInfoButton gameType="classic" lang={lang} />
      <WebScreenButton
        playerUid={currentUser?.uid || 'board_p0'}
        playerName={team1 || ''}
        gameType="classic"
        getPublicData={() => ({ scores, team1, team2, currentTeam })}
        themeName={themeId || 'dark'}
      />
    </View>

    <View style={[styles.teamCard, { backgroundColor: theme.bgCard, borderColor: theme.borderCard }]}>
      <Text style={[styles.teamName, { color: theme.textSecondary }]} numberOfLines={1}>
        {scores.team2 > scores.team1 && scores.team2 > 0 ? '👑 ' : ''}{team2}
      </Text>
      <Text style={[styles.teamScore, { color: theme.accent }]}>{scores.team2}</Text>
    </View>

    <View style={styles.spacer} />

    <View style={[styles.teamCard, { backgroundColor: theme.bgCard, borderColor: theme.borderCard }]}>
      <Text style={[styles.teamName, { color: theme.textSecondary }]} numberOfLines={1}>
        {scores.team1 >= scores.team2 && scores.team1 > 0 ? '👑 ' : ''}{team1}
      </Text>
      <Text style={[styles.teamScore, { color: theme.accent }]}>{scores.team1}</Text>
    </View>
  </View>
));

export default function GameBoardScreen({
  onGameEnd, team1, team2, selectedCategories,
  gameMode = 'classic',
  tokens = 0,
  setTokens,
  currentUser,
}) {
  const { theme, isDark, themeId } = useTheme();
  const t = useT();
  const { lang } = useLanguage();
  const { width, height }  = useWindowDimensions();
  const isLandscape = width > height;
  const numCats     = selectedCategories.length;

  const [scores,         setScores]         = useState({ team1: 0, team2: 0 });
  const [currentTeam,    setCurrentTeam]    = useState(1);
  const [usedQuestions,  setUsedQuestions]  = useState({});
  const [activeQuestion,  setActiveQuestion]  = useState(null);
  const [leaveVisible,    setLeaveVisible]    = useState(false);

  // ── أسئلة تُجلب lazy عند بداية اللوح ──
  const [questionsMap, setQuestionsMap] = useState(null); // { [catId]: questions[] }
  const [loadingQ,     setLoadingQ]     = useState(true);

  useEffect(() => {
    const ids = selectedCategories.map(c => c.id);
    fetchQuestionsForCategories(ids)
      .then(map => setQuestionsMap(map))
      .catch(() => setQuestionsMap({}))
      .finally(() => setLoadingQ(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // دمج metadata الفئات مع الأسئلة المجلوبة
  const enrichedCategories = useMemo(() => {
    if (!questionsMap) return selectedCategories;
    return selectedCategories.map(c => ({
      ...c,
      questions: questionsMap[c.id] ?? [],
    }));
  }, [selectedCategories, questionsMap]);

  const totalQuestions = numCats * 10;

  const colWidth = useMemo(() => {
    const hPad = 10, gap = 6;
    const available = width - hPad * 2 - gap * (numCats - 1);
    const ideal  = available / numCats;
    const minCol = isLandscape ? 90 : 68;
    return Math.max(ideal, minCol);
  }, [width, isLandscape, numCats]);

  const pColors = theme.isLight ? pointColorsLight : pointColors;

  const isUsed = useCallback((catId, pts, side) =>
    !!usedQuestions[`${catId}-${pts}-${side}`],
  [usedQuestions]);

  const handleOpenQuestion = useCallback((cat, pts, side) => {
    if (usedQuestions[`${cat.id}-${pts}-${side}`]) return;
    const questions = cat.questions || [];
    if (questions.length === 0) { Alert.alert('', t('board.noCatsQ')); return; }
    const targetLevel    = POINTS_TO_LEVEL[pts];
    const levelQuestions = questions.filter(q => q.level === targetLevel);
    const pool = levelQuestions.length > 0 ? levelQuestions : questions;
    const q    = pool[Math.floor(Math.random() * pool.length)];
    setActiveQuestion({ cat, pts, side, question: q });
  }, [usedQuestions, t]);

  const handleAnswer = useCallback((teamNum, pts) => {
    const key = `${activeQuestion.cat.id}-${activeQuestion.pts}-${activeQuestion.side}`;
    setUsedQuestions(prev => {
      const newUsed   = { ...prev, [key]: true };
      const newScores = { ...scores };
      if (teamNum !== null) newScores[`team${teamNum}`] += pts;
      setScores(newScores);
      setCurrentTeam(tk => tk === 1 ? 2 : 1);
      setActiveQuestion(null);
      if (Object.keys(newUsed).length === totalQuestions) onGameEnd(newScores.team1, newScores.team2);
      return newUsed;
    });
  }, [activeQuestion, scores, totalQuestions, onGameEnd]);

  const handleEndGame = useCallback(() => {
    Alert.alert(t('board.endQ'), t('board.endMsg'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('board.endYes'), style: 'destructive', onPress: () => onGameEnd(scores.team1, scores.team2) },
    ]);
  }, [scores, onGameEnd, t]);

  const handleBack = useCallback(() => {
    if (activeQuestion) { setActiveQuestion(null); return; }
    setLeaveVisible(true);
  }, [activeQuestion]);

  // اعترض السحب من الطرف وزر الرجوع
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (activeQuestion) { setActiveQuestion(null); return true; }
      setLeaveVisible(true);
      return true;
    });
    return () => sub.remove();
  }, [activeQuestion]);

  // ── خصم التوكنز لوسائل المساعدة ──
  const handleSpendTokens = useCallback((cost) => {
    if (tokens < cost) return false;
    setTokens?.(prev => prev - cost);
    return true;
  }, [tokens, setTokens]);

  // ── تبديل نفس الفئة (swapSame) ──
  const handleSwapSame = useCallback(() => {
    if (!activeQuestion) return null;
    const { cat, pts } = activeQuestion;
    const targetLevel  = POINTS_TO_LEVEL[pts];
    const pool         = (cat.questions || []).filter(q =>
      q.level === targetLevel && q !== activeQuestion.question
    );
    if (pool.length === 0) return null;
    const newQ = pool[Math.floor(Math.random() * pool.length)];
    setActiveQuestion(prev => ({ ...prev, question: newQ }));
    return { question: newQ.question ?? newQ.text, answer: newQ.correct ?? newQ.answer, wrong: newQ.wrong ?? [] };
  }, [activeQuestion]);

  // ── تبديل عشوائي (swapRandom) ──
  const handleSwapRandom = useCallback(() => {
    const allQs = enrichedCategories.flatMap(cat =>
      (cat.questions || []).map(q => ({ ...q, catName: cat.name, catEmoji: cat.emoji }))
    );
    if (allQs.length === 0) return null;
    const newQ = allQs[Math.floor(Math.random() * allQs.length)];
    setActiveQuestion(prev => ({
      ...prev,
      question: newQ,
      cat: { ...prev.cat, name: newQ.catName, emoji: newQ.catEmoji },
    }));
    return { question: newQ.question ?? newQ.text, answer: newQ.correct ?? newQ.answer, wrong: newQ.wrong ?? [] };
  }, [enrichedCategories]);

  // ── loading ──
  if (loadingQ) {
    return (
      <View style={[styles.root, { backgroundColor: theme.bg, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  if (activeQuestion) {
    const q = activeQuestion.question;
    return (
      <QuestionScreen
        question={q.question ?? q.text}
        answer={q.correct   ?? q.answer}
        wrong={q.wrong      ?? []}
        points={activeQuestion.pts}
        category={activeQuestion.cat.name}
        team1={team1}
        team2={team2}
        currentTeam={currentTeam}
        onAnswer={handleAnswer}
        onBack={handleBack}
        mode={gameMode}
        tokens={tokens}
        onSpendTokens={handleSpendTokens}
        onSwapSame={handleSwapSame}
        onSwapRandom={handleSwapRandom}
        imageUrl={q.imageUrl ?? null}
      />
    );
  }

  const hPad = 10, gap = 6;

  return (
    <View style={[styles.root, { backgroundColor: theme.isCityTheme ? 'transparent' : theme.bg }]}>
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.statusBg} />

      <TopBar
        scores={scores} team1={team1} team2={team2}
        currentTeam={currentTeam} onEnd={handleEndGame}
        theme={theme} t={t} currentUser={currentUser} themeId={themeId} lang={lang}
      />

      <View style={{ flex: 1 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: hPad, paddingVertical: 8 }}
        >
          <View style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', gap }}>
              {enrichedCategories.map(cat => (
                <CategoryHeader key={cat.id} cat={cat} colWidth={colWidth} theme={theme} />
              ))}
            </View>
            {POINTS.map(pts => (
              <View key={pts} style={{ flexDirection: 'row', gap }}>
                {enrichedCategories.map(cat => (
                  <View key={cat.id} style={[styles.cellPair, { width: colWidth, backgroundColor: pColors[pts] }]}>
                    <Cell used={isUsed(cat.id, pts, 'L')} pts={pts} onPress={() => handleOpenQuestion(cat, pts, 'L')} />
                    <View style={styles.cellDivider} />
                    <Cell used={isUsed(cat.id, pts, 'R')} pts={pts} onPress={() => handleOpenQuestion(cat, pts, 'R')} />
                  </View>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:          { flex: 1, paddingTop: 46 },
  topBar:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: 1, gap: 8 },
  spacer:        { flex: 1 },
  teamCard:      { alignItems: 'center', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, minWidth: 80 },
  teamName:      { fontSize: 11, fontWeight: '700', maxWidth: 100, textAlign: 'center' },
  teamScore:     { fontSize: 20, fontWeight: '900' },
  endBtn:        { alignItems: 'center', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, minWidth: 54 },
  endIcon:       { fontSize: 16 },
  endText:       { fontSize: 10, fontWeight: '700' },
  catHeader:     { borderRadius: 10, paddingVertical: 10, alignItems: 'center', gap: 4, borderWidth: 1 },
  catEmoji:      { fontSize: 20 },
  catHeaderText: { fontSize: 10, fontWeight: '800', textAlign: 'center', paddingHorizontal: 2 },
  cellPair:      { flexDirection: 'row', borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  cell:          { flex: 1, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  cellDivider:   { width: 1, backgroundColor: 'rgba(255,255,255,0.15)' },
  cellUsed:      { opacity: 0.2 },
  cellText:      { fontSize: 12, fontWeight: '900' },
  cellTextUsed:  { color: '#888' },
});
