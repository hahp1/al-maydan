import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from './firebaseConfig';
import { collection, getDocs, onSnapshot } from 'firebase/firestore';
import LoginScreen from './LoginScreen';
import GameSetupScreen from './GameSetupScreen';
import GameBoardScreen from './GameBoardScreen';
import ResultsScreen from './ResultsScreen';
import AdminScreen from './AdminScreen';
import SettingsScreen from './SettingsScreen';
import TokenModal from './TokenModal';
import SoloGameScreen from './SoloGameScreen';
import OnlineGameScreen from './OnlineGameScreen';

const STORAGE_KEY = 'almaydan_categories';
const HIGHSCORE_KEY = 'almaydan_highscore';
const SOLO_COST = 10;

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

  const handleBackFromAdmin = () => setScreen('home');

  const handleLogin = (userData) => {
    setUser({ ...userData, type: 'google' });
    setScreen('home');
  };

  const handleGuest = () => {
    setUser({ type: 'guest', name: 'ضيف' });
    setScreen('home');
  };

  const handleLogout = () => {
    setUser(null);
    setTokens(30);
    setScreen('login');
  };

  const handleStartGame = ({ team1, team2, categories: catCount, selected }) => {
    const costs = { 4: 20, 5: 25, 6: 30 };
    setTokens(t => t - costs[catCount]);
    const selectedCats = categories.filter(c => selected.includes(c.id));
    setGameData({ team1, team2, categories: catCount, selectedCategories: selectedCats });
    setScreen('board');
  };

  const handleGameEnd = (score1, score2) => {
    setFinalScores({ score1, score2 });
    setScreen('results');
  };

  // ── شاشات ──
  if (screen === 'login') return <LoginScreen onLogin={handleLogin} onGuest={handleGuest} />;

  if (screen === 'setup') return (
    <>
      <GameSetupScreen
        onStart={handleStartGame}
        onBack={() => setScreen('home')}
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
      onGameEnd={handleGameEnd}
      onBack={() => setScreen('home')}
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

  if (screen === 'admin') return <AdminScreen onBack={handleBackFromAdmin} />;

  if (screen === 'settings') return (
    <SettingsScreen
      onBack={() => setScreen('home')}
      user={user}
      tokens={tokens}
      onLogout={handleLogout}
    />
  );

  if (screen === 'online') return (
    <OnlineGameScreen
      categories={categories}
      onBack={() => setScreen('home')}
      currentUser={user}
    />
  );

  if (screen === 'solo') return (
    <SoloGameScreen
      categories={categories}
      onBack={() => setScreen('home')}
      playerName={user?.name || 'لاعب'}
      onHighScoreUpdate={(newScore) => setHighScore(newScore)}
    />
  );

  // ── الشاشة الرئيسية ──
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0d0d2b" />

      <View style={styles.header}>
        <Text style={styles.title}>الميدان</Text>
        <Text style={styles.subtitle}>تنافس 💥 تحدّى ⚔️ انتصر 🎯</Text>
      </View>

      <View style={styles.userBar}>
        <TouchableOpacity onPress={() => setScreen('settings')} style={styles.settingsBtn}>
          <Text style={styles.settingsIcon}>⚙️</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowTokenModal(true)} style={styles.tokenBtn}>
          <Text style={styles.tokenText}>🪙 {tokens}</Text>
        </TouchableOpacity>
        <Text style={styles.userText}>
          {user?.type === 'guest' ? '👤 ضيف' : '👤 ' + user?.name}
        </Text>
      </View>

      {/* الرقم القياسي */}
      {highScore > 0 && (
        <View style={styles.highScoreBar}>
          <Text style={styles.highScoreText}>🏆 رقمك القياسي: {highScore} نقطة</Text>
        </View>
      )}

      <View style={styles.buttons}>

        {/* فريقين */}
        <TouchableOpacity style={styles.btnPrimary} onPress={() => setScreen('setup')}>
          <Text style={styles.btnPrimaryText}>⚔️ فريقين</Text>
          <Text style={styles.btnPrimarySubtitle}>تنافس بين فريقين</Text>
        </TouchableOpacity>

        {/* فردي */}
        <TouchableOpacity
          style={[styles.btnSolo, tokens < SOLO_COST && styles.btnDisabled]}
          onPress={() => {
            if (tokens < SOLO_COST) {
              setShowTokenModal(true);
            } else {
              setTokens(t => t - SOLO_COST);
              setScreen('solo');
            }
          }}
        >
          <Text style={styles.btnSoloText}>🎮 فردي</Text>
          <Text style={styles.btnSoloSubtitle}>
            {tokens < SOLO_COST ? '❌ رصيد غير كافٍ' : 'العب منفرداً واكسر الأرقام القياسية'}
          </Text>
        </TouchableOpacity>

        {/* تحدي عن بُعد */}
        <TouchableOpacity
          style={[styles.btnOnline, tokens < 10 && styles.btnDisabled]}
          onPress={() => {
            if (tokens < 10) {
              setShowTokenModal(true);
            } else {
              setTokens(t => t - 10);
              setScreen('online');
            }
          }}
        >
          <Text style={styles.btnOnlineText}>🌐 تحدي عن بُعد</Text>
          <Text style={styles.btnOnlineSubtitle}>
            {tokens < 10 ? '❌ رصيد غير كافٍ' : 'العب ضد لاعب عشوائي'}
          </Text>
        </TouchableOpacity>

      </View>

      {/* لوحة الإدارة */}
      <TouchableOpacity style={styles.adminBtn} onPress={() => setScreen('admin')}>
        <Text style={styles.adminBtnText}>🔐 لوحة الإدارة</Text>
      </TouchableOpacity>

      <TokenModal
        visible={showTokenModal}
        onClose={() => setShowTokenModal(false)}
        tokens={tokens}
        onAddTokens={(amount) => setTokens(t => t + amount)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d2b',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  header: { alignItems: 'center', marginTop: 20 },
  title: {
    fontSize: 72,
    fontWeight: '900',
    color: '#f5c518',
    textShadowColor: '#f5c51888',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  subtitle: { fontSize: 18, color: '#a09060', marginTop: 8 },
  userBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#1a1a3e',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f5c51833',
  },
  settingsBtn: { padding: 4 },
  settingsIcon: { fontSize: 22 },
  tokenBtn: {
    backgroundColor: '#0d0d2b',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f5c51855',
  },
  tokenText: { color: '#f5c518', fontSize: 15, fontWeight: '700' },
  userText: { color: '#f5c518', fontSize: 15, fontWeight: '600' },
  highScoreBar: {
    backgroundColor: '#1a1a3e',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#f5c51833',
    width: '100%',
    alignItems: 'center',
  },
  highScoreText: { color: '#f5c518', fontSize: 15, fontWeight: '700' },
  buttons: { width: '100%', gap: 12 },
  btnPrimary: {
    backgroundColor: '#f5c518',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 8,
    gap: 4,
  },
  btnPrimaryText: { color: '#0d0d2b', fontSize: 20, fontWeight: '800' },
  btnPrimarySubtitle: { color: '#0d0d2b99', fontSize: 13 },
  btnDisabled: { opacity: 0.5 },
  btnSolo: {
    backgroundColor: '#1a3a6e',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#4a6aae',
    gap: 4,
  },
  btnSoloText: { color: '#ffffff', fontSize: 20, fontWeight: '800' },
  btnSoloSubtitle: { color: '#a0b0d0', fontSize: 13 },
  btnOnline: {
    backgroundColor: '#1a3a5a',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#2a6aaa',
    gap: 4,
  },
  btnOnlineText: { color: '#ffffff', fontSize: 20, fontWeight: '800' },
  btnOnlineSubtitle: { color: '#a0c0d0', fontSize: 13 },
  adminBtn: {
    backgroundColor: '#1a1a3e',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#f5c51833',
  },
  adminBtnText: { color: '#f5c518', fontSize: 14, fontWeight: '700' },
});
