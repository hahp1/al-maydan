/**
 * App.js — محدّث
 * ════════════════════════════════════════════════════════════
 *  ✅ كل الوظائف السابقة محفوظة
 *  ✅ initSoundService + playBgMusic عند البوت
 *  ✅ splash عند أول دخول بعد اللوغان
 *  ✅ win/lose عند نهاية اللعبة
 *  ✅ KeepAlive للشاشات الرئيسية — لا unmount عند الانتقال
 *  ✅ Fade transition ناعم بين الشاشات
 *  ✅ Lazy mount لشاشات الألعاب
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { BackHandler, Alert, View, ActivityIndicator, Modal, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCachedCategories } from './UseCachedCategories';
import { auth } from './firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { initServerTime } from './ServerTime';

const SESSION_KEY = 'almaydan_session';

// ── Providers ──
import { ThemeProvider, useTheme, ALL_THEMES } from './ThemeContext';
import { LanguageProvider, LangSync, tStatic } from './I18n';

// ── سلاسة التنقل ──
import { KeepAliveScreen, TransitionRoot, useLazyScreen } from './ScreenTransition';

// ── موثوقية التطبيق ──
import ErrorBoundary from './ErrorBoundary';
import NetStatus     from './NetStatus';
import { useTokenSync }    from './useTokenSync';
import { XPNotification, useXPNotify } from './XPNotification';
import { useProStatus, usePurchasedThemes, isThemeUnlocked, purchaseTheme } from './ProService';

// ── شاشات ──
import OnboardingScreen, { EXPERIENCE_KEY, EXPERIENCES } from './OnboardingScreen';
import LoginScreen          from './LoginScreen';
import GameSetupScreen      from './GameSetupScreen';
import GameBoardScreen      from './GameBoardScreen';
import ResultsScreen        from './ResultsScreen';
import AdminScreen          from './AdminScreen';
import SettingsScreen       from './SettingsScreen';
import TokenModal           from './TokenModal';
import SoloGameScreen       from './SoloGameScreen';
import OnlineGameScreen     from './OnlineGameScreen';
import HomeScreen           from './HomeScreen';
import KnowledgeArenaScreen from './KnowledgeArenaScreen';
import GamesArenaScreen     from './GamesArenaScreen';
import FriendsScreen        from './FriendsScreen';
import ProfileScreen        from './ProfileScreen';
import XOGameScreen         from './XOGameScreen';
import BullshitGameScreen   from './BullshitGameScreen';
import MafiaGameScreen      from './MafiaGameScreen';
import CodenamesGameScreen  from './CodenamesGameScreen';
import KoutGameScreen       from './KoutGameScreen';
import ManAnaScreen from './ManAnaScreen';
import ActItOutScreen       from './ActItOutScreen';
import TruthDareScreen      from './TruthDareScreen';
import DominoGameScreen     from './DominoGameScreen';
import BilootGameScreen     from './BilootGameScreen';
import RankFriendsScreen    from './RankFriends';
import NeverHaveIEver       from './NeverHaveIEverScreen';
import DrawGuessScreen      from './DrawGuessGameScreen';
import WordleGameScreen     from './WordleGameScreen';
import WhoIsSpyScreen       from './WhoIsSpyScreen';
import GuessImageScreen     from './GuessImageScreen';
import { CityBackground }   from './GameEngraving';

// ── القلوب ──
import { loadHearts, spendHeart } from './HeartsService';
import HeartsModal from './HeartsModal';

// ── البطولة ──
import { getActiveTournament, addTournamentScore, autoCreateNextTournament } from './TournamentService';

// ── XP ──
import {
  recordOnlineGameEnd,
  recordSoloGameEnd,
  recordDailyLogin,
  recordAdWatched,
} from './XPService';

// ── الأصوات ──
import {
  initSoundService,
  playBgMusic,
  playSound,
} from './SoundService';

const HIGHSCORE_KEY = 'almaydan_highscore';

// ─── Wrapper يلف شاشات ألعاب الجلسة بخلفية المدينة ───────────
function GameScreenWrapper({ theme, children }) {
  return (
    <CityBackground theme={theme}>
      {children}
    </CityBackground>
  );
}

// ══════════════════════════════════════════════════════════════
//  NoHeartsModal
// ══════════════════════════════════════════════════════════════
function NoHeartsModal({ visible, cost, onClose, onOpenHearts }) {
  const { theme } = useTheme();
  if (!visible) return null;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={nhStyles.overlay}>
        <View style={[nhStyles.box, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
          <Text style={nhStyles.emoji}>💔</Text>
          <Text style={[nhStyles.title, { color: theme.accent }]}>قلوب غير كافية</Text>
          <Text style={[nhStyles.desc, { color: theme.textMuted }]}>
            تحتاج {cost} {cost === 1 ? 'قلب' : 'قلبين'} لبدء هذه اللعبة
          </Text>
          <TouchableOpacity
            style={[nhStyles.btn, { backgroundColor: '#ef4444' }]}
            onPress={() => { onClose(); onOpenHearts(); }}
          >
            <Text style={nhStyles.btnText}>احصل على قلوب ❤️</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={nhStyles.cancelBtn}>
            <Text style={[nhStyles.cancelText, { color: theme.textMuted }]}>إلغاء</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const nhStyles = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: '#00000099', justifyContent: 'center', alignItems: 'center', padding: 32 },
  box:        { width: '100%', borderRadius: 24, padding: 28, alignItems: 'center', gap: 12, borderWidth: 1 },
  emoji:      { fontSize: 52 },
  title:      { fontSize: 20, fontWeight: '900' },
  desc:       { fontSize: 14, textAlign: 'center', lineHeight: 22 },
  btn:        { paddingVertical: 14, paddingHorizontal: 32, borderRadius: 16, marginTop: 4 },
  btnText:    { fontSize: 16, fontWeight: '800', color: '#fff' },
  cancelBtn:  { paddingVertical: 8 },
  cancelText: { fontSize: 14 },
});

// UIDs المصرح لهم بدخول شاشة الادمن (أضف uid حسابك هنا)
const ADMIN_UIDS = [
  'Haho1',  // Expo account placeholder - استبدل بـ Firebase UID الفعلي
];

const GAME_SCREENS = [
  'xo', 'bullshit', 'mafia', 'codenames', 'kout', 'manana', 'actitout',
  'wordle', 'truthdare', 'dominoes', 'biloot', 'rankfriends',
  'neverhaveiever', 'drawguess', 'board', 'solo', 'soloTournament', 'online',
  'whoisspy', 'guessimage',
];

// ══════════════════════════════════════════════════════════════
//  MainApp
// ══════════════════════════════════════════════════════════════
function MainApp() {
  const { theme, themeId, setThemeId } = useTheme();
  const [experience,        setExperience]        = useState(null);
  const [bootLoading,       setBootLoading]       = useState(true);
  const [screen,            setScreen]            = useState('login');
  const [user,              setUser]              = useState(null);
  const [initialTokens,     setInitialTokens]     = useState(30);
  const [tokens, setTokens] = useTokenSync(user, initialTokens);
  const [gameData,          setGameData]          = useState(null);
  const [finalScores,       setFinalScores]       = useState(null);
  // ── الفئات: cache ذكي — تظهر فوراً من AsyncStorage ──
  const { categories } = useCachedCategories();

  // ── Pro status ──
  const { isPro }      = useProStatus(user);
  const { purchased }  = usePurchasedThemes(user);

  // إذا انتهى Pro والثيم المختار غير مشترى → نُعيده للـ dark
  useEffect(() => {
    const current = ALL_THEMES.find(t => t.id === themeId);
    if (current && !isThemeUnlocked(current, isPro, purchased)) {
      setThemeId('dark');
    }
  }, [isPro]);
  const [showTokenModal,    setShowTokenModal]    = useState(false);
  const [highScore,         setHighScore]         = useState(0);
  const [gameMode,          setGameMode]          = useState('local');
  const [friendsInitialTab, setFriendsInitialTab] = useState('friends');

  // ── القلوب ──
  const [hearts,          setHearts]          = useState(3);
  const [adsLeft,         setAdsLeft]         = useState(5);
  const [showHeartsModal, setShowHeartsModal] = useState(false);
  const [noHeartsVisible, setNoHeartsVisible] = useState(false);
  const [noHeartsCost,    setNoHeartsCost]    = useState(1);

  // ── البطولة ──
  const activeTournamentRef = useRef(null);

  // ── مرجع المستخدم الحالي ──
  const userRef   = useRef(null);
  const xpNotify  = useXPNotify();
  useEffect(() => { userRef.current = user; }, [user]);

  // ── تهيئة الأصوات عند بوت التطبيق ──
  useEffect(() => {
    initSoundService().then(() => {
      playBgMusic();
    });
  }, []);

  // ── تحميل البيانات الأولية + استعادة الجلسة ──
  useEffect(() => {
    const restore = async () => {
      // مزامنة وقت السيرفر أولاً
      initServerTime().catch(() => {});
      try {
        // 1. استعادة التجربة
        const exp = await AsyncStorage.getItem(EXPERIENCE_KEY);
        if (exp === EXPERIENCES.GLOBAL || exp === EXPERIENCES.ARABIC) setExperience(exp);

        // 2. استعادة الجلسة
        const sessionRaw = await AsyncStorage.getItem(SESSION_KEY);
        if (sessionRaw) {
          const session = JSON.parse(sessionRaw);

          if (session.isGuest) {
            // ضيف — استعادة مباشرة
            setUser(session);
            setInitialTokens(session.tokens ?? 0);
            setScreen('home');
          } else {
            // مستخدم مسجل — تحقق من Firebase Auth
            const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
              unsubscribe();
              if (firebaseUser && firebaseUser.uid === session.uid) {
                // الجلسة لا تزال صالحة
                setUser(session);
                setInitialTokens(session.tokens ?? 30);
                setScreen('home');
              } else {
                // انتهت الجلسة — حذف وإعادة للـ login
                await AsyncStorage.removeItem(SESSION_KEY);
                setScreen('login');
              }
            });
            // timeout: لو Firebase تأخر (offline token منتهي) → استخدم الـ cache
            setTimeout(() => {
              if (screen === 'login' && session?.uid) {
                setUser(session);
                setInitialTokens(session.tokens ?? 30);
                setScreen('home');
              }
            }, 3000);
          }
        }
      } catch (e) {
        console.warn('Session restore error:', e);
      } finally {
        setBootLoading(false);
      }
    };
    restore();
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(HIGHSCORE_KEY).then(v => { if (v) setHighScore(parseInt(v)); });
  }, []);

  useEffect(() => {
    loadHearts().then(({ hearts: h, adsLeft: al }) => {
      setHearts(h);
      setAdsLeft(al);
    });
  }, []);

  useEffect(() => {
    // جلب البطولة الحالية + إنشاء القادمة تلقائياً إذا لم توجد
    getActiveTournament().then(tour => { activeTournamentRef.current = tour; });
    autoCreateNextTournament().catch(() => {});
  }, []);

  // ── تسجيل الدخول اليومي + splash ──
  useEffect(() => {
    if (!user) return;
    const uid     = user?.uid || user?.guestId;
    const isGuest = !!user?.isGuest;
    if (uid) {
      recordDailyLogin(uid, isGuest).catch(() => {});
    }
    // صوت الترحيب عند أول دخول
    playSound('splash');
  }, [user?.uid, user?.guestId]);

  // ══════════════════════════════════════════════
  //  tryStartGame
  // ══════════════════════════════════════════════
  const tryStartGame = useCallback(async (targetScreen, cost = 1, extraAction = null, deferred = false) => {
    // Pro: قلوب لا محدودة — لا نخصم
    if (isPro) {
      if (extraAction) extraAction();
      setScreen(targetScreen);
      return;
    }
    // deferred = true → للألعاب الأونلاين: انتقل أولاً، اقتطع بعد بدء اللعبة الفعلي
    if (deferred) {
      if (extraAction) extraAction();
      setScreen(targetScreen);
      return;
    }
    const result = await spendHeart(cost);
    if (!result.success) {
      setNoHeartsCost(cost);
      setNoHeartsVisible(true);
      return;
    }
    setHearts(result.hearts);
    if (extraAction) extraAction();
    setScreen(targetScreen);
  }, [isPro]);

  // spendHeartNow — يُستدعى من داخل اللعبة بعد نجاح الاتصال
  const spendHeartNow = useCallback(async (cost = 1) => {
    if (isPro) return true;
    const result = await spendHeart(cost);
    if (!result.success) {
      setNoHeartsCost(cost);
      setNoHeartsVisible(true);
      return false;
    }
    setHearts(result.hearts);
    return true;
  }, [isPro]);

  // ══════════════════════════════════════════════
  //  onTournamentScore
  // ══════════════════════════════════════════════
  const onTournamentScore = useCallback(async (scoreToAdd) => {
    if (!scoreToAdd || scoreToAdd <= 0) return;
    const tournament = activeTournamentRef.current;
    if (!tournament?.id || !tournament.isActive) return;
    const u      = userRef.current;
    const userId = u?.uid ?? u?.id;
    const name   = u?.name ?? 'لاعب';
    if (!userId) return;
    const result = await addTournamentScore(tournament.id, userId, name, scoreToAdd);
    if (result.success && __DEV__) console.log(`[Tournament] +${scoreToAdd} → ${result.newScore}`);
  }, []);

  // ══════════════════════════════════════════════
  //  onOnlineGameEnd — XP + صوت
  // ══════════════════════════════════════════════
  const onOnlineGameEnd = useCallback(async (gameName, won) => {
    const u       = userRef.current;
    const uid     = u?.uid || u?.guestId;
    const isGuest = !!u?.isGuest;
    playSound(won ? 'win' : 'lose');
    if (!uid) return;
    try {
      const result = await recordOnlineGameEnd(uid, gameName, won, isGuest);
      xpNotify.current?.show(result);
      // إذا ارتفع المستوى، حدّث tokens في الـ state
      if (result?.levelReward > 0) setTokens(t => t + result.levelReward);
    } catch (e) {
      if (__DEV__) console.warn('[XP] onOnlineGameEnd:', e);
    }
  }, []);

  // ══════════════════════════════════════════════
  //  onSoloGameEnd — XP + صوت
  // ══════════════════════════════════════════════
  const onSoloGameEnd = useCallback(async (won) => {
    const u       = userRef.current;
    const uid     = u?.uid || u?.guestId;
    const isGuest = !!u?.isGuest;
    playSound(won ? 'win' : 'lose');
    if (!uid) return;
    try {
      const result = await recordSoloGameEnd(uid, won, isGuest);
      xpNotify.current?.show(result);
      if (result?.levelReward > 0) setTokens(t => t + result.levelReward);
    } catch (e) {
      if (__DEV__) console.warn('[XP] onSoloGameEnd:', e);
    }
  }, []);

  // ══════════════════════════════════════════════
  //  onAdWatched — XP
  // ══════════════════════════════════════════════
  const onAdWatched = useCallback(async () => {
    const u       = userRef.current;
    const uid     = u?.uid || u?.guestId;
    const isGuest = !!u?.isGuest;
    if (!uid) return;
    try {
      await recordAdWatched(uid, isGuest);
    } catch (e) {
      console.warn('[XP] onAdWatched error:', e);
    }
  }, []);

  // ── BackHandler ──

  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen === 'login' || !experience) return false;
      if (GAME_SCREENS.includes(screen)) {
        Alert.alert(tStatic('common.leave') + ' 🚪', tStatic('leave.message'), [
          { text: tStatic('common.cancel'), style: 'cancel' },
          { text: tStatic('common.leave'), style: 'destructive', onPress: () => setScreen('games') },
        ]);
        return true;
      }
      if (['games', 'knowledge', 'friends', 'settings', 'profile'].includes(screen)) {
        setScreen('home'); return true;
      }
      if (screen === 'home') {
        Alert.alert(tStatic('common.exit'), '', [
          { text: tStatic('common.cancel'), style: 'cancel' },
          { text: tStatic('common.exit'), style: 'destructive', onPress: () => BackHandler.exitApp() },
        ]);
        return true;
      }
      return false;
    });
    return () => handler.remove();
  }, [screen, experience]);

  // ══════════════════════════════════════════════════════════════
  //  useLazyScreen hooks — يجب أن تكون قبل أي early return
  //  (Rules of Hooks: لا hooks بعد conditional returns)
  // ══════════════════════════════════════════════════════════════
  const showSetup          = useLazyScreen(screen === 'setup');
  const showKnowledge      = useLazyScreen(screen === 'knowledge');
  const showBoard          = useLazyScreen(screen === 'board');
  const showResults        = useLazyScreen(screen === 'results');
  const showSolo           = useLazyScreen(screen === 'solo');
  const showSoloTournament = useLazyScreen(screen === 'soloTournament');
  const showOnline         = useLazyScreen(screen === 'online');
  const showXO             = useLazyScreen(screen === 'xo');
  const showBullshit       = useLazyScreen(screen === 'bullshit');
  const showMafia          = useLazyScreen(screen === 'mafia');
  const showCodenames      = useLazyScreen(screen === 'codenames');
  const showKout           = useLazyScreen(screen === 'kout');
  const showDominoes       = useLazyScreen(screen === 'dominoes');
  const showBiloot         = useLazyScreen(screen === 'biloot');
  const showDrawguess      = useLazyScreen(screen === 'drawguess');
  const showWordle         = useLazyScreen(screen === 'wordle');
  const showActItOut       = useLazyScreen(screen === 'actitout');
  const showManana         = useLazyScreen(screen === 'manana');
  const showTruthDare      = useLazyScreen(screen === 'truthdare');
  const showRankFriends    = useLazyScreen(screen === 'rankfriends');
  const showNeverHaveIEver = useLazyScreen(screen === 'neverhaveiever');
  const showWhoIsSpy       = useLazyScreen(screen === 'whoisspy');
  const showGuessImage     = useLazyScreen(screen === 'guessimage');
  const showAdmin          = useLazyScreen(screen === 'admin');
  const showProfile        = useLazyScreen(screen === 'profile');
  const showSettings       = useLazyScreen(screen === 'settings');

  // ── Loading ──
  if (bootLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f0f1a' }}>
        <ActivityIndicator size="large" color="#f5c518" />
      </View>
    );
  }

  // إذا لم تُختر تجربة بعد → أعد للوغين
  if (!experience && screen !== 'login') {
    return (
      <LoginScreen
        onLogin={async (userData, exp) => {
          setUser(userData);
          setInitialTokens(userData.tokens ?? 30);
          if (exp) setExperience(exp);
          await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(userData)).catch(() => {});
          setScreen('home');
        }}
        onGuest={async (guestProfile, exp) => {
          setUser(guestProfile);
          setInitialTokens(guestProfile.tokens ?? 0);
          if (exp) setExperience(exp);
          await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(guestProfile)).catch(() => {});
          setScreen('home');
        }}
      />
    );
  }

  const isGlobal = experience === EXPERIENCES.GLOBAL;

  const sharedProps = {
    user, tokens, setTokens, setScreen,
    showTokenModal, setShowTokenModal,
    highScore, experience, isGlobal,
    hearts, setHearts,
    isPro,
    onOpenHeartsModal: () => setShowHeartsModal(true),
    activeTournament: activeTournamentRef.current,
  };

  // ── تسجيل الدخول ──
  if (screen === 'login') return (
    <LoginScreen
      onLogin={async (userData, exp) => {
        setUser(userData);
        setInitialTokens(userData.tokens ?? 30);
        if (exp) setExperience(exp);
        await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(userData)).catch(() => {});
        setScreen('home');
      }}
      onGuest={async (guestProfile, exp) => {
        setUser(guestProfile);
        setInitialTokens(guestProfile.tokens ?? 0);
        if (exp) setExperience(exp);
        await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(guestProfile)).catch(() => {});
        setScreen('home');
      }}
    />
  );

  // ── Modals مشتركة ──
  const commonModals = (
    <>
      <HeartsModal
        visible={showHeartsModal}
        onClose={() => setShowHeartsModal(false)}
        hearts={hearts}
        setHearts={setHearts}
        tokens={tokens}
        setTokens={setTokens}
        adsLeft={adsLeft}
        setAdsLeft={setAdsLeft}
        onAdWatched={onAdWatched}
      />
      <NoHeartsModal
        visible={noHeartsVisible}
        cost={noHeartsCost}
        onClose={() => setNoHeartsVisible(false)}
        onOpenHearts={() => { setNoHeartsVisible(false); setShowHeartsModal(true); }}
      />
    </>
  );

  // ══════════════════════════════════════════════════════════════
  //  الـ render الرئيسي — TransitionRoot يُغلّف كل شيء
  // ══════════════════════════════════════════════════════════════
  return (
    <TransitionRoot screen={screen} style={{ backgroundColor: theme.bg }}>

      {/* ── مؤشر الاتصال — يظهر فوق كل شيء عند offline ── */}
      <NetStatus />

      {/* ── إشعارات XP / level up / missions — فوق كل الشاشات ── */}
      <XPNotification ref={xpNotify} />

      {/* ── الشاشات الرئيسية: KeepAlive — لا تُدمَّر عند الانتقال ── */}
      <KeepAliveScreen active={screen === 'home'}>
        <HomeScreen {...sharedProps} />
        {commonModals}
      </KeepAliveScreen>

      <KeepAliveScreen active={screen === 'games'}>
        <GamesArenaScreen
          setScreen={setScreen}
          user={user}
          setGameMode={setGameMode}
          tryStartGame={(screen, cost, extra) => tryStartGame(screen, cost, extra, screen !== 'mafia' && screen !== 'actitout' && screen !== 'truthdare' && screen !== 'rankfriends' && screen !== 'neverhaveiever' && screen !== 'manana' && screen !== 'whoisspy' && screen !== 'guessimage')}
        />
        {commonModals}
      </KeepAliveScreen>

      {showKnowledge && (
        <KeepAliveScreen active={screen === 'knowledge'}>
          <GameScreenWrapper theme={theme}>
            <KnowledgeArenaScreen
              {...sharedProps}
              tryStartGame={tryStartGame}
              currentUser={user}
              categories={isGlobal
                ? categories.filter(c => !c.lang || c.lang === 'en')
                : categories.filter(c => !c.lang || c.lang === 'ar')}
            />
          </GameScreenWrapper>
          {commonModals}
        </KeepAliveScreen>
      )}

      <KeepAliveScreen active={screen === 'friends'}>
        <FriendsScreen user={user} setScreen={setScreen} initialTab={friendsInitialTab} />
      </KeepAliveScreen>

      {/* ── شاشات Lazy: تُنشَأ عند الطلب وتُدمَّر بعد المغادرة ── */}

      {showProfile && (
        <KeepAliveScreen active={screen === 'profile'}>
          <ProfileScreen user={user} setScreen={setScreen} />
        </KeepAliveScreen>
      )}

      {showSettings && (
        <KeepAliveScreen active={screen === 'settings'}>
          <SettingsScreen
            onBack={() => setScreen('home')}
            user={user} tokens={tokens} setTokens={setTokens}
            experience={experience} isPro={isPro} purchased={purchased}
            onChangeExperience={async (newExp) => {
              await AsyncStorage.setItem(EXPERIENCE_KEY, newExp);
              setExperience(newExp);
            }}
            onLogout={async () => { await AsyncStorage.removeItem(SESSION_KEY).catch(()=>{}); setUser(null); setInitialTokens(30); setScreen('login'); }}
          />
        </KeepAliveScreen>
      )}

      {showAdmin && ADMIN_UIDS.includes(user?.uid) && (
        <KeepAliveScreen active={screen === 'admin'}>
          <AdminScreen onBack={() => setScreen('home')} />
        </KeepAliveScreen>
      )}

      {/* ── ألعاب تريفيا ── */}
      {showSetup && (
        <KeepAliveScreen active={screen === 'setup'}>
          <GameScreenWrapper theme={theme}>
            <GameSetupScreen
              onStart={({ team1, team2, categories: catCount, selected }) => {
                const selectedCats = categories.filter(c => selected.includes(c.id));
                setGameData({ team1, team2, categories: catCount, selectedCategories: selectedCats });
                setScreen('board');
              }}
              onBack={() => setScreen('knowledge')}
              tokens={tokens}
              categories={categories}
              onOpenTokenModal={() => setShowTokenModal(true)}
            />
          </GameScreenWrapper>
          <TokenModal
            visible={showTokenModal}
            onClose={() => setShowTokenModal(false)}
            tokens={tokens}
            onAddTokens={(amount) => setTokens(t => t + amount)}
          />
        </KeepAliveScreen>
      )}

      {showBoard && gameData && (
        <KeepAliveScreen active={screen === 'board'}>
          <GameScreenWrapper theme={theme}>
            <GameBoardScreen
              team1={gameData.team1} team2={gameData.team2}
              selectedCategories={gameData.selectedCategories}
              onGameEnd={(s1, s2) => {
                const won = s1 > s2;
                playSound(won ? 'win' : 'lose');
                setFinalScores({ score1: s1, score2: s2 });
                setScreen('results');
              }}
              onBack={() => setScreen('knowledge')}
              currentUser={user}
            />
          </GameScreenWrapper>
        </KeepAliveScreen>
      )}

      {showResults && finalScores && (
        <KeepAliveScreen active={screen === 'results'}>
          <GameScreenWrapper theme={theme}>
            <ResultsScreen
              team1={gameData.team1} team2={gameData.team2}
              score1={finalScores.score1} score2={finalScores.score2}
              onRematch={() => setScreen('setup')}
              onHome={() => setScreen('home')}
            />
          </GameScreenWrapper>
        </KeepAliveScreen>
      )}

      {showSolo && (
        <KeepAliveScreen active={screen === 'solo'}>
          <GameScreenWrapper theme={theme}>
            <SoloGameScreen
              categories={isGlobal ? categories.filter(c => !c.lang || c.lang === 'en') : categories.filter(c => !c.lang || c.lang === 'ar')}
              onBack={() => setScreen('knowledge')}
              playerName={user?.name || 'لاعب'}
              onHighScoreUpdate={(s) => setHighScore(s)}
              onGameEnd={(won) => onSoloGameEnd(won)}
            />
          </GameScreenWrapper>
        </KeepAliveScreen>
      )}

      {showSoloTournament && (
        <KeepAliveScreen active={screen === 'soloTournament'}>
          <GameScreenWrapper theme={theme}>
            <SoloGameScreen
              categories={isGlobal ? categories.filter(c => !c.lang || c.lang === 'en') : categories.filter(c => !c.lang || c.lang === 'ar')}
              onBack={() => setScreen('knowledge')}
              playerName={user?.name || 'لاعب'}
              onHighScoreUpdate={(s) => setHighScore(s)}
              isTournament={true}
              currentUser={user}
              onTournamentScore={onTournamentScore}
              onGameEnd={(won) => onSoloGameEnd(won)}
            />
          </GameScreenWrapper>
        </KeepAliveScreen>
      )}

      {showOnline && (
        <KeepAliveScreen active={screen === 'online'}>
          <GameScreenWrapper theme={theme}>
            <OnlineGameScreen
              categories={isGlobal ? categories.filter(c => !c.lang || c.lang === 'en') : categories.filter(c => !c.lang || c.lang === 'ar')}
              onBack={() => setScreen('knowledge')}
              currentUser={user}
              onTournamentScore={onTournamentScore}
              onGameEnd={(won) => onOnlineGameEnd('trivia', won)}
            />
          </GameScreenWrapper>
        </KeepAliveScreen>
      )}

      {/* ── ألعاب الميدان — deferred=true للأونلاين ── */}
      {showXO && (
        <KeepAliveScreen active={screen === 'xo'}>
          <GameScreenWrapper theme={theme}>
            <XOGameScreen onBack={() => setScreen('games')} currentUser={user} onGameEnd={(won) => onOnlineGameEnd('xo', won)} onGameReady={() => spendHeartNow(1)} />
          </GameScreenWrapper>
        </KeepAliveScreen>
      )}

      {showBullshit && (
        <KeepAliveScreen active={screen === 'bullshit'}>
          <GameScreenWrapper theme={theme}>
            <BullshitGameScreen onBack={() => setScreen('games')} currentUser={user} mode={gameMode} onGameEnd={(won) => onOnlineGameEnd('bullshit', won)} onGameReady={() => spendHeartNow(1)} />
          </GameScreenWrapper>
        </KeepAliveScreen>
      )}

      {showMafia && (
        <KeepAliveScreen active={screen === 'mafia'}>
          <GameScreenWrapper theme={theme}>
            <MafiaGameScreen onBack={() => setScreen('games')} currentUser={user} onGameEnd={(won) => onOnlineGameEnd('mafia', won)} onGameReady={() => spendHeartNow(1)} />
          </GameScreenWrapper>
        </KeepAliveScreen>
      )}

      {showCodenames && (
        <KeepAliveScreen active={screen === 'codenames'}>
          <GameScreenWrapper theme={theme}>
            <CodenamesGameScreen onBack={() => setScreen('games')} currentUser={user} experience={experience} onGameEnd={(won) => onOnlineGameEnd('codenames', won)} onGameReady={() => spendHeartNow(1)} />
          </GameScreenWrapper>
        </KeepAliveScreen>
      )}

      {showKout && (
        <KeepAliveScreen active={screen === 'kout'}>
          <GameScreenWrapper theme={theme}>
            <KoutGameScreen onBack={() => setScreen('games')} currentUser={user} onGameEnd={(won) => onOnlineGameEnd('kout', won)} onGameReady={() => spendHeartNow(1)} />
          </GameScreenWrapper>
        </KeepAliveScreen>
      )}

      {showDominoes && (
        <KeepAliveScreen active={screen === 'dominoes'}>
          <GameScreenWrapper theme={theme}>
            <DominoGameScreen onBack={() => setScreen('games')} currentUser={user} onGameEnd={(won) => onOnlineGameEnd('domino', won)} onGameReady={() => spendHeartNow(1)} />
          </GameScreenWrapper>
        </KeepAliveScreen>
      )}

      {showBiloot && (
        <KeepAliveScreen active={screen === 'biloot'}>
          <GameScreenWrapper theme={theme}>
            <BilootGameScreen onBack={() => setScreen('games')} currentUser={user} onGameEnd={(won) => onOnlineGameEnd('biloot', won)} onGameReady={() => spendHeartNow(1)} />
          </GameScreenWrapper>
        </KeepAliveScreen>
      )}

      {showDrawguess && (
        <KeepAliveScreen active={screen === 'drawguess'}>
          <GameScreenWrapper theme={theme}>
            <DrawGuessScreen onBack={() => setScreen('games')} currentUser={user} mode={gameMode} onGameEnd={(won) => onOnlineGameEnd('drawguess', won)} onGameReady={() => spendHeartNow(1)} />
          </GameScreenWrapper>
        </KeepAliveScreen>
      )}

      {showWordle && (
        <KeepAliveScreen active={screen === 'wordle'}>
          <GameScreenWrapper theme={theme}>
            <WordleGameScreen onBack={() => setScreen('games')} currentUser={user} experience={experience} onGameEnd={(won) => onOnlineGameEnd('wordle', won)} onGameReady={() => spendHeartNow(1)} />
          </GameScreenWrapper>
        </KeepAliveScreen>
      )}

      {showActItOut && (
        <KeepAliveScreen active={screen === 'actitout'}>
          <GameScreenWrapper theme={theme}>
            <ActItOutScreen onBack={() => setScreen('games')} experience={experience} />
          </GameScreenWrapper>
        </KeepAliveScreen>
      )}

      {!isGlobal && showManana && (
        <KeepAliveScreen active={screen === 'manana'}>
          <GameScreenWrapper theme={theme}>
            <ManAnaScreen onBack={() => setScreen('games')} isGlobal={isGlobal} />
          </GameScreenWrapper>
        </KeepAliveScreen>
      )}

      {!isGlobal && showTruthDare && (
        <KeepAliveScreen active={screen === 'truthdare'}>
          <GameScreenWrapper theme={theme}>
            <TruthDareScreen onBack={() => setScreen('games')} />
          </GameScreenWrapper>
        </KeepAliveScreen>
      )}

      {!isGlobal && showRankFriends && (
        <KeepAliveScreen active={screen === 'rankfriends'}>
          <GameScreenWrapper theme={theme}>
            <RankFriendsScreen onBack={() => setScreen('games')} experience={experience} />
          </GameScreenWrapper>
        </KeepAliveScreen>
      )}

      {showNeverHaveIEver && (
        <KeepAliveScreen active={screen === 'neverhaveiever'}>
          <GameScreenWrapper theme={theme}>
            <NeverHaveIEver onBack={() => setScreen('games')} experience={experience} />
          </GameScreenWrapper>
        </KeepAliveScreen>
      )}

      {!isGlobal && showWhoIsSpy && (
        <KeepAliveScreen active={screen === 'whoisspy'}>
          <GameScreenWrapper theme={theme}>
            <WhoIsSpyScreen onBack={() => setScreen('games')} currentUser={user} />
          </GameScreenWrapper>
        </KeepAliveScreen>
      )}

      {!isGlobal && showGuessImage && (
        <KeepAliveScreen active={screen === 'guessimage'}>
          <GameScreenWrapper theme={theme}>
            <GuessImageScreen
              onBack={() => setScreen('games')}
              currentUser={user}
              onGameEnd={(won) => onOnlineGameEnd('guessimage', won)}
              onGameReady={() => spendHeartNow(1)}
            />
          </GameScreenWrapper>
        </KeepAliveScreen>
      )}

    </TransitionRoot>
  );
}

// ══════════════════════════════════════════════════════════════
//  App — Providers + ErrorBoundary
// ══════════════════════════════════════════════════════════════
export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <LanguageProvider>
          <LangSync />
          <MainApp />
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
