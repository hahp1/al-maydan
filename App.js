/**
 * App.js — نسخة احترافية
 * ════════════════════════════════════════════════════════════
 *  ✅ State Machine واحدة بدل states متفرقة تتسابق
 *  ✅ Offline-first: جلسة محفوظة تعمل بدون إنترنت
 *  ✅ Firebase Auth: timeout ذكي + fallback فوري من cache
 *  ✅ لا race condition ممكن — كل تحديث دفعة وحدة
 *  ✅ كل الوظائف السابقة محفوظة 100%
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
import { useProStatus, usePurchasedThemes, isThemeUnlocked } from './ProService';

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
import ManAnaScreen         from './ManAnaScreen';
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

// ══════════════════════════════════════════════════════════════
//  State Machine — حالات التطبيق
//  loading      → يقرأ الـ cache ويتحقق من الجلسة
//  unauthenticated → شاشة تسجيل الدخول
//  authenticated   → التطبيق الكامل
// ══════════════════════════════════════════════════════════════
const AUTH_STATUS = {
  LOADING:         'loading',
  UNAUTHENTICATED: 'unauthenticated',
  AUTHENTICATED:   'authenticated',
};

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

// UIDs المصرح لهم بدخول شاشة الادمن
const ADMIN_UIDS = [
  'Haho1',
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

  // ── State Machine المركزية ──
  // كل شيء يتحدث دفعة وحدة — لا race condition
  const [authStatus,  setAuthStatus]  = useState(AUTH_STATUS.LOADING);
  const [user,        setUser]        = useState(null);
  const [experience,  setExperience]  = useState(null);
  const [screen,      setScreen]      = useState('home');

  // ── states مساعدة ──
  const [initialTokens,     setInitialTokens]     = useState(30);
  const [tokens, setTokens] = useTokenSync(user, initialTokens);
  const [gameData,          setGameData]          = useState(null);
  const [finalScores,       setFinalScores]       = useState(null);
  const { categories } = useCachedCategories();

  const { isPro }     = useProStatus(user);
  const { purchased } = usePurchasedThemes(user);

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
  const userRef             = useRef(null);
  const xpNotify            = useXPNotify();
  // Firebase Auth unsubscribe + timeout refs للتنظيف
  const authUnsubRef        = useRef(null);
  const authTimeoutRef      = useRef(null);

  useEffect(() => { userRef.current = user; }, [user]);

  // ══════════════════════════════════════════════════════════════
  //  دالة مساعدة: تحديث الحالة كلها دفعة وحدة
  //  هذا يضمن render واحد فقط — لا تسابق بين states
  // ══════════════════════════════════════════════════════════════
  const commitSession = useCallback((sessionUser, sessionExp, targetScreen = 'home') => {
    setUser(sessionUser);
    setInitialTokens(sessionUser?.tokens ?? (sessionUser?.isGuest ? 0 : 30));
    setExperience(sessionExp);
    setScreen(targetScreen);
    setAuthStatus(AUTH_STATUS.AUTHENTICATED);
  }, []);

  const commitLogout = useCallback(() => {
    setUser(null);
    setInitialTokens(30);
    setScreen('home');
    setAuthStatus(AUTH_STATUS.UNAUTHENTICATED);
  }, []);

  // ── تهيئة الأصوات ──
  useEffect(() => {
    initSoundService().then(() => playBgMusic());
  }, []);

  // ══════════════════════════════════════════════════════════════
  //  Boot — استعادة الجلسة (Offline-first)
  //
  //  المنطق:
  //  1. اقرأ cache فوراً من AsyncStorage (0ms)
  //  2. لو ضيف → ادخل فوراً بدون إنترنت
  //  3. لو مسجل → ابدأ Firebase Auth check
  //     - لو Firebase رجع قبل 2 ثانية → استخدم نتيجته
  //     - لو تأخر أكثر من 2 ثانية (offline) → ادخل من الـ cache
  //     - لو Firebase رجع null (token منتهي) → logout
  //  4. لو لا cache → شاشة تسجيل الدخول
  // ══════════════════════════════════════════════════════════════
  useEffect(() => {
    initServerTime().catch(() => {});

    const boot = async () => {
      try {
        // ── 1. قراءة الـ cache ──
        const [sessionRaw, expRaw, highScoreRaw] = await Promise.all([
          AsyncStorage.getItem(SESSION_KEY),
          AsyncStorage.getItem(EXPERIENCE_KEY),
          AsyncStorage.getItem(HIGHSCORE_KEY),
        ]);

        // highscore
        if (highScoreRaw) setHighScore(parseInt(highScoreRaw, 10));

        // experience
        const savedExp = (expRaw === EXPERIENCES.GLOBAL || expRaw === EXPERIENCES.ARABIC)
          ? expRaw
          : EXPERIENCES.ARABIC; // افتراضي

        // لا جلسة محفوظة → شاشة تسجيل الدخول
        if (!sessionRaw) {
          setAuthStatus(AUTH_STATUS.UNAUTHENTICATED);
          return;
        }

        const session = JSON.parse(sessionRaw);

        // ── 2. ضيف → ادخل فوراً ──
        if (session.isGuest) {
          commitSession(session, savedExp);
          return;
        }

        // ── 3. مستخدم مسجل → Firebase Auth check مع timeout ──
        let resolved = false; // منع التنفيذ المزدوج

        // Timeout: بعد 2 ثانية بدون رد من Firebase → ادخل من الـ cache
        authTimeoutRef.current = setTimeout(() => {
          if (resolved) return;
          resolved = true;
          // أوقف الاستماع لـ Firebase — لسنا بحاجته بعد الآن
          authUnsubRef.current?.();
          // ادخل بالبيانات المحفوظة (offline mode)
          commitSession(session, savedExp);
        }, 2000);

        // Firebase Auth check
        authUnsubRef.current = onAuthStateChanged(auth, async (firebaseUser) => {
          if (resolved) return;
          resolved = true;
          clearTimeout(authTimeoutRef.current);
          authUnsubRef.current?.();

          if (firebaseUser && firebaseUser.uid === session.uid) {
            // ✅ جلسة صالحة
            commitSession(session, savedExp);
          } else {
            // Firebase رجع null أو حساب مختلف.
            // قبل logout قسري: تحقق أن السبب ليس انقطاع شبكة لحظي.
            // لو لا اتصال → ثق بالـ cache المحفوظ (offline-tolerant)
            // لو متصل فعلاً → token منتهي حقاً → logout
            let online = false;
            try {
              const res = await fetch('https://www.google.com/generate_204', { method: 'HEAD', cache: 'no-store' });
              online = res.status === 204;
            } catch { online = false; }

            if (!online) {
              // offline — ادخل من الـ cache بدل logout مزعج
              commitSession(session, savedExp);
            } else {
              // online + Firebase رفض → token منتهي فعلاً → logout
              await AsyncStorage.removeItem(SESSION_KEY).catch(() => {});
              setAuthStatus(AUTH_STATUS.UNAUTHENTICATED);
            }
          }
        });

      } catch (e) {
        console.warn('[Boot] Error:', e?.message);
        // أي خطأ غير متوقع → شاشة تسجيل الدخول بدل crash
        setAuthStatus(AUTH_STATUS.UNAUTHENTICATED);
      }
    };

    boot();

    // cleanup: أوقف Firebase listener عند unmount
    return () => {
      clearTimeout(authTimeoutRef.current);
      authUnsubRef.current?.();
    };
  }, []);

  useEffect(() => {
    loadHearts().then(({ hearts: h, adsLeft: al }) => {
      setHearts(h);
      setAdsLeft(al);
    });
  }, []);

  useEffect(() => {
    getActiveTournament().then(tour => { activeTournamentRef.current = tour; });
    autoCreateNextTournament().catch(() => {});
  }, []);

  // ── تسجيل الدخول اليومي + splash ──
  useEffect(() => {
    if (!user) return;
    const uid     = user?.uid || user?.guestId;
    const isGuest = !!user?.isGuest;
    if (uid) recordDailyLogin(uid, isGuest).catch(() => {});
    playSound('splash');
  }, [user?.uid, user?.guestId]);

  // ══════════════════════════════════════════════
  //  handlers تسجيل الدخول — دفعة وحدة
  // ══════════════════════════════════════════════
  const handleLogin = useCallback(async (userData, exp) => {
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(userData)).catch(() => {});
    if (exp) await AsyncStorage.setItem(EXPERIENCE_KEY, exp).catch(() => {});
    commitSession(userData, exp ?? EXPERIENCES.ARABIC);
  }, [commitSession]);

  const handleGuest = useCallback(async (guestProfile, exp) => {
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(guestProfile)).catch(() => {});
    if (exp) await AsyncStorage.setItem(EXPERIENCE_KEY, exp).catch(() => {});
    commitSession(guestProfile, exp ?? EXPERIENCES.ARABIC);
  }, [commitSession]);

  const handleLogout = useCallback(async () => {
    await AsyncStorage.removeItem(SESSION_KEY).catch(() => {});
    commitLogout();
  }, [commitLogout]);

  // ══════════════════════════════════════════════
  //  tryStartGame
  // ══════════════════════════════════════════════
  const tryStartGame = useCallback(async (targetScreen, cost = 1, extraAction = null, deferred = false) => {
    if (isPro) {
      if (extraAction) extraAction();
      setScreen(targetScreen);
      return;
    }
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
  //  onOnlineGameEnd
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
      if (result?.levelReward > 0) setTokens(t => t + result.levelReward);
    } catch (e) {
      if (__DEV__) console.warn('[XP] onOnlineGameEnd:', e);
    }
  }, []);

  // ══════════════════════════════════════════════
  //  onSoloGameEnd
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
  //  onAdWatched
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
      if (authStatus !== AUTH_STATUS.AUTHENTICATED) return false;
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
  }, [screen, authStatus]);

  // ══════════════════════════════════════════════════════════════
  //  useLazyScreen — يجب قبل أي early return (Rules of Hooks)
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

  // ══════════════════════════════════════════════════════════════
  //  Render — State Machine
  // ══════════════════════════════════════════════════════════════

  // LOADING — شاشة التحميل
  if (authStatus === AUTH_STATUS.LOADING) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f0f1a' }}>
        <ActivityIndicator size="large" color="#f5c518" />
      </View>
    );
  }

  // UNAUTHENTICATED — شاشة تسجيل الدخول
  if (authStatus === AUTH_STATUS.UNAUTHENTICATED) {
    return (
      <LoginScreen
        onLogin={handleLogin}
        onGuest={handleGuest}
      />
    );
  }

  // AUTHENTICATED — التطبيق الكامل
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

  return (
    <TransitionRoot screen={screen} style={{ backgroundColor: theme.bg }}>

      <NetStatus />
      <XPNotification ref={xpNotify} />

      {/* ── الشاشات الرئيسية: KeepAlive ── */}
      <KeepAliveScreen active={screen === 'home'}>
        <HomeScreen {...sharedProps} />
        {commonModals}
      </KeepAliveScreen>

      <KeepAliveScreen active={screen === 'games'}>
        <GamesArenaScreen
          setScreen={setScreen}
          user={user}
          setGameMode={setGameMode}
          tryStartGame={(sc, cost, extra) => tryStartGame(sc, cost, extra,
            sc !== 'mafia' && sc !== 'actitout' && sc !== 'truthdare' &&
            sc !== 'rankfriends' && sc !== 'neverhaveiever' && sc !== 'manana' &&
            sc !== 'whoisspy' && sc !== 'guessimage'
          )}
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
              await AsyncStorage.setItem(EXPERIENCE_KEY, newExp).catch(() => {});
              setExperience(newExp);
            }}
            onLogout={handleLogout}
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
              categories={categories}
              experience={experience}
            />
          </GameScreenWrapper>
        </KeepAliveScreen>
      )}

      {showBoard && gameData && (
        <KeepAliveScreen active={screen === 'board'}>
          <GameScreenWrapper theme={theme}>
            <GameBoardScreen
              {...gameData}
              onBack={() => setScreen('knowledge')}
              onGameEnd={(scores) => { setFinalScores(scores); setScreen('results'); }}
            />
          </GameScreenWrapper>
        </KeepAliveScreen>
      )}

      {showResults && finalScores && (
        <KeepAliveScreen active={screen === 'results'}>
          <GameScreenWrapper theme={theme}>
            <ResultsScreen
              scores={finalScores}
              onBack={() => setScreen('knowledge')}
              onPlayAgain={() => setScreen('setup')}
              onTournamentScore={onTournamentScore}
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

      {/* ── ألعاب الميدان ── */}
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
