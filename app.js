 import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoginScreen from './LoginScreen';
import GameSetupScreen from './GameSetupScreen';
import GameBoardScreen from './GameBoardScreen';
import ResultsScreen from './ResultsScreen';
import AdminScreen from './AdminScreen';
import SettingsScreen from './SettingsScreen';
import TokenModal from './TokenModal';

const STORAGE_KEY = 'almaydan_categories';

export default function App() {
  const [screen, setScreen] = useState('login');
  const [user, setUser] = useState(null);
  const [tokens, setTokens] = useState(30);
  const [gameData, setGameData] = useState(null);
  const [finalScores, setFinalScores] = useState(null);
  const [categories, setCategories] = useState([]);
  const [showTokenModal, setShowTokenModal] = useState(false);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await AsyncStorage.getItem(STORAGE_KEY);
        if (data) setCategories(JSON.parse(data));
      } catch (e) {
        console.error(e);
      }
    };
    loadCategories();
  }, []);

  const handleBackFromAdmin = async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) setCategories(JSON.parse(data));
    } catch (e) {
      console.error(e);
    }
    setScreen('home');
  };

  const handleLogin = (type) => {
    setUser({ type, name: 'لاعب' });
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

  const handleRematch = () => {
    setScreen('setup');
  };

  if (screen === 'login') {
    return <LoginScreen onLogin={handleLogin} onGuest={handleGuest} />;
  }

  if (screen === 'setup') {
    return (
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
  }

  if (screen === 'board') {
    return (
      <GameBoardScreen
        team1={gameData.team1}
        team2={gameData.team2}
        selectedCategories={gameData.selectedCategories}
        onGameEnd={handleGameEnd}
        onBack={() => setScreen('home')}
      />
    );
  }

  if (screen === 'results') {
    return (
      <ResultsScreen
        team1={gameData.team1}
        team2={gameData.team2}
        score1={finalScores.score1}
        score2={finalScores.score2}
        onRematch={handleRematch}
        onHome={() => setScreen('home')}
      />
    );
  }

  if (screen === 'admin') {
    return <AdminScreen onBack={handleBackFromAdmin} />;
  }

  if (screen === 'settings') {
    return (
      <SettingsScreen
        onBack={() => setScreen('home')}
        user={user}
        tokens={tokens}
        onLogout={handleLogout}
      />
    );
  }

  // الشاشة الرئيسية
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

      <View style={styles.buttons}>
        <TouchableOpacity style={styles.btnPrimary} onPress={() => setScreen('setup')}>
          <Text style={styles.btnPrimaryText}>🎮 ابدأ لعبة جديدة</Text>
        </TouchableOpacity>
      </View>

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
  header: {
    alignItems: 'center',
    marginTop: 40,
  },
  title: {
    fontSize: 72,
    fontWeight: '900',
    color: '#f5c518',
    textShadowColor: '#f5c51888',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  subtitle: {
    fontSize: 18,
    color: '#a09060',
    marginTop: 8,
  },
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
  buttons: { width: '100%', gap: 16 },
  btnPrimary: {
    backgroundColor: '#f5c518',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 8,
  },
  btnPrimaryText: { color: '#0d0d2b', fontSize: 20, fontWeight: '800' },
});
