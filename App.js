import { useState, useEffect } from 'react';
import { StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from './firebaseConfig';
import { collection, getDocs, onSnapshot } from 'firebase/firestore';

// شاشات موجودة
import LoginScreen from './LoginScreen';
import GameSetupScreen from './GameSetupScreen';
import GameBoardScreen from './GameBoardScreen';
import ResultsScreen from './ResultsScreen';
import AdminScreen from './AdminScreen';
import SettingsScreen from './SettingsScreen';
import TokenModal from './TokenModal';
import SoloGameScreen from './SoloGameScreen';
import OnlineGameScreen from './OnlineGameScreen';

// شاشات جديدة
import HomeScreen from './HomeScreen';
import KnowledgeArenaScreen from './KnowledgeArenaScreen';
import GamesArenaScreen from './GamesArenaScreen';
import FriendsScreen from './FriendsScreen';
import XOGameScreen from './XOGameScreen';
import BullshitGameScreen from './BullshitGameScreen';
import MafiaGameScreen from './MafiaGameScreen';
import CodenamesGameScreen from './CodenamesGameScreen';
import KoutGameScreen from './KoutGameScreen';

const HIGHSCORE_KEY = 'almaydan_highscore';

export default function App() {
  const [screen, setScreen] = useState('login');
  const [user, setUser] = useState(null);
  const [tokens, setTokens] = useState(30);
  const [gameData, setGameData] = useState(null);
  const [finalScores, setFinalScores] = useState(null);
  const [categories, setCategories] = useState([]);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [highScore, setHighScore] = useState(0);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'categories'), async (snapshot) => {
      const cats = [];
      for (const d of snapshot.docs) {
        const data = d.data();
        const qSnap = await getDocs(collection(db, 'categories', d.id, 'questions'));
        const questions = qSnap.docs.map(q => ({ id: q.id, ...q.data() }));
        cats.push({ id: d.id, ...data, questions });
      }
      setCategories(cats);
    });
    AsyncStorage.getItem(HIGHSCORE_KEY).then(v => { if (v) setHighScore(parseInt(v)); });
    return () => unsub();
  }, []);

  const sharedProps = { user, tokens, setTokens, setScreen, showTokenModal, setShowTokenModal, highScore };

  // ── تسجيل الدخول ──
  if (screen === 'login') return (
    <LoginScreen
      onLogin={(userData) => { setUser(userData); setTokens(userData.tokens ?? 30); setScreen('home'); }}
      onGuest={() => { setUser({ type: 'guest', name: 'ضيف' }); setScreen('home'); }}
    />
  );

  // ── الشاشات الرئيسية ──
  if (screen === 'home') return <HomeScreen {...sharedProps} />;
  if (screen === 'knowledge') return <KnowledgeArenaScreen {...sharedProps} />;
  if (screen === 'games') return <GamesArenaScreen {...sharedProps} />;
  if (screen === 'friends') return <FriendsScreen user={user} setScreen={setScreen} />;

  // ── ميدان المعلومات ──
  if (screen === 'setup') return (
    <>
      <GameSetupScreen
        onStart={({ team1, team2, categories: catCount, selected }) => {
          const costs = { 4: 20, 5: 25, 6: 30 };
          setTokens(t => t - costs[catCount]);
          const selectedCats = categories.filter(c => selected.includes(c.id));
          setGameData({ team1, team2, categories: catCount, selectedCategories: selectedCats });
          setScreen('board');
        }}
        onBack={() => setScreen('knowledge')}
        tokens={tokens}
        categories={categories}
        onOpenTokenModal={() => setShowTokenModal(true)}
      />
      <TokenModal
        visible={showTokenModal}
        onClose={() => setShowTokenModal(false)}
        tokens={tokens}
        onAddTokens={(amount) => setTokens(t => t + amount)}
      />
    </>
  );

  if (screen === 'board') return (
    <GameBoardScreen
      team1={gameData.team1}
      team2={gameData.team2}
      selectedCategories={gameData.selectedCategories}
      onGameEnd={(s1, s2) => { setFinalScores({ score1: s1, score2: s2 }); setScreen('results'); }}
      onBack={() => setScreen('knowledge')}
    />
  );

  if (screen === 'results') return (
    <ResultsScreen
      team1={gameData.team1}
      team2={gameData.team2}
      score1={finalScores.score1}
      score2={finalScores.score2}
      onRematch={() => setScreen('setup')}
      onHome={() => setScreen('home')}
    />
  );

  if (screen === 'solo') return (
    <SoloGameScreen
      categories={categories}
      onBack={() => setScreen('knowledge')}
      playerName={user?.name || 'لاعب'}
      onHighScoreUpdate={(s) => setHighScore(s)}
    />
  );

  if (screen === 'online') return (
    <OnlineGameScreen
      categories={categories}
      onBack={() => setScreen('knowledge')}
      currentUser={user}
    />
  );

  // ── ألعاب الميدان ──
  if (screen === 'xo') return (
    <XOGameScreen
      onBack={() => setScreen('games')}
      currentUser={user}
      tokens={tokens}
      onSpendTokens={(amount) => setTokens(t => t - amount)}
    />
  );

  if (screen === 'bullshit') return (
    <BullshitGameScreen
      onBack={() => setScreen('games')}
      currentUser={user}
      tokens={tokens}
      onSpendTokens={(amount) => setTokens(t => t - amount)}
    />
  );

  if (screen === 'mafia') return (
    <MafiaGameScreen
      onBack={() => setScreen('games')}
      currentUser={user}
      tokens={tokens}
      onSpendTokens={(amount) => setTokens(t => t - amount)}
    />
  );

  if (screen === 'codenames') return (
    <CodenamesGameScreen
      onBack={() => setScreen('games')}
      currentUser={user}
      tokens={tokens}
      onSpendTokens={(amount) => setTokens(t => t - amount)}
    />
  );

  if (screen === 'kout') return (
    <KoutGameScreen
      onBack={() => setScreen('games')}
      currentUser={user}
      tokens={tokens}
      onSpendTokens={(amount) => setTokens(t => t - amount)}
    />
  );

  // ── أخرى ──
  if (screen === 'admin') return <AdminScreen onBack={() => setScreen('home')} />;

  if (screen === 'settings') return (
    <SettingsScreen
      onBack={() => setScreen('home')}
      user={user}
      tokens={tokens}
      onLogout={() => { setUser(null); setTokens(30); setScreen('login'); }}
    />
  );

  return null;
}
