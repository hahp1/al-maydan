/**
 * App.js — نسخة احترافية + Lazy Loading للألعاب
 * ════════════════════════════════════════════════════════════
 *  ✅ State Machine واحدة بدل states متفرقة تتسابق
 *  ✅ Offline-first: جلسة محفوظة تعمل بدون إنترنت
 *  ✅ Firebase Auth: timeout ذكي + fallback فوري من cache
 *  ✅ لا race condition ممكن — كل تحديث دفعة وحدة
 *  ✅ ThemeBackground في ThemeContext — لا خلفيات في الشاشات
 *  ✅ شاشة واحدة نشطة — لا KeepAlive لا تراكم
 *  ✅ Lazy Loading: كل لعبة تُحمَّل عند فتحها فقط (أسرع + ذاكرة أقل)
 */

import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
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

// ── Themed Components ──
import { ThemedButton } from './ThemedComponents';

// ── موثوقية التطبيق ──
import ErrorBoundary from './ErrorBoundary';
import NetStatus     from './NetStatus';
import { useTokenSync }    from './useTokenSync';
import { XPNotification, useXPNotify } from './XPNotification';
import { useProStatus, usePurchasedThemes, isThemeUnlocked, syncPendingThemes } from './ProService';

// ── شاشات أساسية (تُحمَّل فوراً — تظهر عند البدء) ──
import OnboardingScreen, { EXPERIENCE_KEY, EXPERIENCES } from './OnboardingScreen';
import LoginScreen          from './LoginScreen';
import HomeScreen           from './HomeScreen';
import KnowledgeArenaScreen from './KnowledgeArenaScreen';
import GamesArenaScreen     from './GamesArenaScreen';
import FriendsScreen        from './FriendsScreen';
import ProfileScreen        from './ProfileScreen';
import SettingsScreen       from './SettingsScreen';

// ══════════════════════════════════════════════════════════════
//  Lazy Screens — تُحمَّل عند فتحها فقط (ذاكرة أقل + فتح أسرع)
// ══════════════════════════════════════════════════════════════
const GameSetupScreen   = lazy(() => import('./GameSetupScreen'));
const GameBoardScreen   = lazy(() => import('./GameBoardScreen'));
const ResultsScreen     = lazy(() => import('./ResultsScreen'));
const AdminScreen       = lazy(() => import('./AdminScreen'));
const SoloGameScreen    = lazy(() => import('./SoloGameScreen'));
const OnlineGameScreen  = lazy(() => import('./OnlineGameScreen'));
const XOGameScreen      = lazy(() => import('./XOGameScreen'));
const BullshitGameScreen= lazy(() => import('./BullshitGameScreen'));
const MafiaGameScreen   = lazy(() => import('./MafiaGameScreen'));
const CodenamesGameScreen= lazy(() => import('./CodenamesGameScreen'));
const KoutGameScreen    = lazy(() => import('./KoutGameScreen'));
const ManAnaScreen      = lazy(() => import('./ManAnaScreen'));
const ActItOutScreen    = lazy(() => import('./ActItOutScreen'));
const TruthDareScreen   = lazy(() => import('./TruthDareScreen'));
const DominoGameScreen  = lazy(() => import('./DominoGameScreen'));
const BilootGameScreen  = lazy(() => import('./BilootGameScreen'));
const RankFriendsScreen = lazy(() => import('./RankFriends'));
const NeverHaveIEver    = lazy(() => import('./NeverHaveIEverScreen'));
const DrawGuessScreen   = lazy(() => import('./DrawGuessGameScreen'));
const WordleGameScreen  = lazy(() => import('./WordleGameScreen'));
const WhoIsSpyScreen    = lazy(() => import('./WhoIsSpyScreen'));
const GuessImageScreen  = lazy(() => import('./GuessImageScreen'));

// ── القلوب ──
import { loadHearts, spendHeart } from './HeartsService';
import HeartsModal from './HeartsModal';
import TokenModal from './TokenModal';

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

const AUTH_STATUS = {
  LOADING:         'loading',
  UNAUTHENTICATED: 'unauthenticated',
  AUTHENTICATED:   'authenticated',
};

// ══════════════════════════════════════════════════════════════
//  ScreenLoader — شاشة تحميل أنيقة بالثيم (تظهر جزء من الثانية)
// ══════════════════════════════════════════════════════════════
function ScreenLoader() {
  const { theme } = useTheme();
  return (
    <View style={[loaderStyles.root, { backgroundColor: theme.bg }]}>
      <ActivityIndicator size="large" color={theme.accent} />
    </View>
  );
}

const loaderStyles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

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
          <ThemedButton onPress={() => { onClose(); onOpenHearts(); }} label='احصل على قلوب ❤️' variant='primary' size='large' style={nhStyles.btn} />
          <ThemedButton onPress={onClose} label='إلغاء' variant='ghost' size='medium' style={nhStyles.cancelBtn} />
        </View>
      </View>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════
//  ExitAppModal — مودال الخروج المُصمَّم بالثيم
// ══════════════════════════════════════════════════════════════
function ExitAppModal({ visible, onCancel, onConfirm }) {
  const { theme } = useTheme();
  if (!visible) return null;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={exitStyles.overlay}>
        <View style={[exitStyles.box, { backgroundColor: theme.bgCard, borderColor: theme.borderCard }]}>
          <Text style={[exitStyles.title, { color: theme.accent }]}>{tStatic('common.exit')}</Text>
          <Text style={[exitStyles.msg, { color: theme.textMuted }]}>
            {tStatic('common.exitConfirm') || 'هل تريد الخروج من التطبيق؟'}
          </Text>
          <View style={exitStyles.btns}>
            <ThemedButton
              onPress={onCancel}
              label={tStatic('common.cancel')}
              variant="ghost"
              size="medium"
              style={exitStyles.btn}
            />
            <ThemedButton
              onPress={onConfirm}
              label={tStatic('common.exit')}
              variant="danger"
              size="medium"
              style={exitStyles.btn}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const exitStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  box:     { width: '100%', maxWidth: 340, borderRadius: 24, padding: 28, alignItems: 'center', gap: 10, borderWidth: 1 },
  emoji:   { fontSize: 40 },
  title:   { fontSize: 20, fontWeight: '900' },
  msg:     { fontSize: 14, textAlign: 'center', lineHeight: 22 },
  btns:    { flexDirection: 'row', gap: 12, marginTop: 8, width: '100%' },
  btn:     { flex: 1 },
});

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

const ADMIN_UIDS = ['Haho1'];

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

  const [authStatus,  setAuthStatus]  = useState(AUTH_STATUS.LOADING);
  const [user,        setUser]        = useState(null);
  const [experience,  setExperience]  = useState(null);
  const [screen,      setScreen]      = useState('home');

  const [initialTokens,     setInitialTokens]     = useState(30);
  const [tokens, setTokens] = useTokenSync(user, initialTokens);
  const [gameData,          setGameData]          = useState(null);
  const [finalScores,       setFinalScores]       = useState(null);
  const { categories } = useCachedCategories();

  const { isPro }     = useProStatus(user);
  const { purchased, loaded: purchasedLoaded } = usePurchasedThemes(user);

  // لا نُسقط ثيماً مقفلاً إلى dark إلا بعد اكتمال تحميل قائمة المشتريات
  // (وإلا فثيم مُشترى يُعاد قسراً لـ dark عند الإقلاع قبل وصول القراءة).
  useEffect(() => {
    if (!purchasedLoaded) return;
    const current = ALL_THEMES.find(t => t.id === themeId);
    if (current && !isThemeUnlocked(current, isPro, purchased)) {
      setThemeId('dark');
    }
  }, [isPro, purchasedLoaded, purchased, themeId]);

  // مزامنة المشتريات المعلّقة (أوفلاين سابقاً) عند دخول مستخدم مسجّل
  useEffect(() => {
    if (!user?.uid || user?.isGuest) return;
    syncPendingThemes({ uid: user.uid, isGuest: user.isGuest, tokens }).catch(() => {});
  }, [user?.uid]);

  const [showTokenModal,    setShowTokenModal]    = useState(false);
  const [highScore,         setHighScore]         = useState(0);
  const [gameMode,          setGameMode]          = useState('local');
  const [onlineRoomMode,    setOnlineRoomMode]    = useState('random'); // 'random' | 'select'
  const [friendsInitialTab, setFriendsInitialTab] = useState('friends');

  const [hearts,          setHearts]          = useState(3);
  const [adsLeft,         setAdsLeft]         = useState(5);
  const [showHeartsModal, setShowHeartsModal] = useState(false);
  const [noHeartsVisible, setNoHeartsVisible] = useState(false);
  const [noHeartsCost,    setNoHeartsCost]    = useState(1);
  const [exitVisible,     setExitVisible]     = useState(false);

  const activeTournamentRef = useRef(null);
  const userRef             = useRef(null);
  const xpNotify            = useXPNotify();
  const authUnsubRef        = useRef(null);
  const authTimeoutRef      = useRef(null);

  useEffect(() => { userRef.current = user; }, [user]);

  // أغلق المودالات المشتركة عند الانتقال بين الشاشات حتى لا تبقى عالقة
  // (مثل مودل التوكنز الذي كان يظهر عالقاً في الكلاسيك بعد فتحه من شاشة سابقة)
  useEffect(() => {
    setShowTokenModal(false);
    setShowHeartsModal(false);
  }, [screen]);

  const commitSession = useCallback((sessionUser, sessionExp, targetScreen = 'home') => {
    setUser(sessionUser);
    setInitialTokens(sessionUser?.tokens ?? (sessionUser?.isGuest ? 0 : 30));
    setExperience(sessionExp);
    setScreen(targetScreen);
    setAuthStatus(AUTH_STATUS.AUTHENTICATED);
    // تهيئة القلوب دائماً (حتى بدون إنترنت) لتجنّب race condition مع spendHeart
    loadHearts().then(h => { setHearts(h.hearts); setAdsLeft(h.adsLeft); }).catch(() => {});
  }, []);

  const commitLogout = useCallback(() => {
    setUser(null);
    setInitialTokens(30);
    setScreen('home');
    setAuthStatus(AUTH_STATUS.UNAUTHENTICATED);
  }, []);

  useEffect(() => {
    initSoundService().then(() => playBgMusic());
  }, []);

  useEffect(() => {
    initServerTime().catch(() => {});

    const boot = async () => {
      try {
        const [sessionRaw, expRaw, highScoreRaw] = await Promise.all([
          AsyncStorage.getItem(SESSION_KEY),
          AsyncStorage.getItem(EXPERIENCE_KEY),
          AsyncStorage.getItem(HIGHSCORE_KEY),
        ]);

        if (highScoreRaw) setHighScore(parseInt(highScoreRaw, 10));

        const savedExp = (expRaw === EXPERIENCES.GLOBAL || expRaw === EXPERIENCES.ARABIC)
          ? expRaw
          : EXPERIENCES.ARABIC;

        if (!sessionRaw) {
          setAuthStatus(AUTH_STATUS.UNAUTHENTICATED);
          return;
        }

        const session = JSON.parse(sessionRaw);

        if (session?.isGuest) {
          commitSession(session, savedExp);
          return;
        }

        // ── مستخدم مسجّل: الجلسة المحلية هي المرجع ──
        // نُثبّتها فوراً (بلا انتظار، بلا طرد). جلسة Firebase Auth صارت
        // محفوظة عبر AsyncStorage (FirebaseConfig)، لكن حتى لو رجعت فارغة
        // مؤقتاً (تأخّر تهيئة / شبكة) لا نطرد المستخدم — الطرد يكون فقط عند
        // تسجيل خروج صريح. onAuthStateChanged هنا يُحدّث uid/email لا أكثر.
        commitSession(session, savedExp);

        authUnsubRef.current = onAuthStateChanged(auth, async (firebaseUser) => {
          if (!firebaseUser) return; // لا تطرد — أبقِ الجلسة المحلية

          const merged = { ...session, uid: firebaseUser.uid, email: firebaseUser.email };
          await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(merged)).catch(() => {});
          commitSession(merged, savedExp);

          // load hearts
          try {
            const h = await loadHearts();
            setHearts(h.hearts);
            setAdsLeft(h.adsLeft);
          } catch (_) {}

          // daily login XP
          try {
            const r = await recordDailyLogin(firebaseUser.uid);
            if (r?.isNew) xpNotify.current?.show(r);
          } catch (_) {}

          // tournament
          try {
            const tour = await getActiveTournament();
            activeTournamentRef.current = tour;
            await autoCreateNextTournament();
          } catch (_) {}
        });
      } catch (e) {
        setAuthStatus(AUTH_STATUS.UNAUTHENTICATED);
      }
    };

    boot();

    return () => {
      clearTimeout(authTimeoutRef.current);
      authUnsubRef.current?.();
    };
  }, []);

  const handleLogin = useCallback(async (userData) => {
    const expRaw = await AsyncStorage.getItem(EXPERIENCE_KEY).catch(() => null);
    const exp = (expRaw === EXPERIENCES.GLOBAL || expRaw === EXPERIENCES.ARABIC)
      ? expRaw : EXPERIENCES.ARABIC;
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(userData)).catch(() => {});
    commitSession(userData, exp);
    try { const h = await loadHearts(); setHearts(h.hearts); setAdsLeft(h.adsLeft); } catch (_) {}
    try {
      const r = await recordDailyLogin(userData.uid);
      if (r?.isNew) xpNotify.current?.show(r);
    } catch (_) {}
    try {
      const tour = await getActiveTournament();
      activeTournamentRef.current = tour;
      await autoCreateNextTournament();
    } catch (_) {}
  }, [commitSession]);

  const handleGuest = useCallback(async (guestData) => {
    const expRaw = await AsyncStorage.getItem(EXPERIENCE_KEY).catch(() => null);
    const exp = (expRaw === EXPERIENCES.GLOBAL || expRaw === EXPERIENCES.ARABIC)
      ? expRaw : EXPERIENCES.ARABIC;
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(guestData)).catch(() => {});
    commitSession(guestData, exp);
  }, [commitSession]);

  const handleLogout = useCallback(async () => {
    clearTimeout(authTimeoutRef.current);
    authUnsubRef.current?.();
    try { await auth.signOut(); } catch (_) {}
    await AsyncStorage.removeItem(SESSION_KEY).catch(() => {});
    commitLogout();
  }, [commitLogout]);

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

  const onTournamentScore = useCallback(async (scoreToAdd) => {
    if (!scoreToAdd || scoreToAdd <= 0) return;
    const tournament = activeTournamentRef.current;
    if (!tournament?.id || !tournament.isActive) return;
    const u = userRef.current;
    const userId = u?.uid ?? u?.id;
    const name = u?.name ?? 'لاعب';
    if (!userId) return;
    await addTournamentScore(tournament.id, userId, name, scoreToAdd).catch(() => {});
  }, []);

  const onOnlineGameEnd = useCallback(async (gameName, won) => {
    const u = userRef.current;
    const uid = u?.uid || u?.guestId;
    const isGuest = !!u?.isGuest;
    playSound(won ? 'win' : 'lose');
    if (!uid) return;
    try {
      const result = await recordOnlineGameEnd(uid, gameName, won, isGuest);
      xpNotify.current?.show(result);
      if (result?.levelReward > 0) setTokens(t => t + result.levelReward);
    } catch (_) {}
  }, []);

  const onSoloGameEnd = useCallback(async (won) => {
    const u = userRef.current;
    const uid = u?.uid || u?.guestId;
    const isGuest = !!u?.isGuest;
    playSound(won ? 'win' : 'lose');
    if (!uid) return;
    try {
      const result = await recordSoloGameEnd(uid, won, isGuest);
      xpNotify.current?.show(result);
      if (result?.levelReward > 0) setTokens(t => t + result.levelReward);
    } catch (_) {}
  }, []);

  const onAdWatched = useCallback(async () => {
    const u = userRef.current;
    const uid = u?.uid || u?.guestId;
    if (!uid) return;
    try { await recordAdWatched(uid, !!u?.isGuest); } catch (_) {}
  }, []);

  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (authStatus !== AUTH_STATUS.AUTHENTICATED) return false;
      if (GAME_SCREENS.includes(screen)) {
        Alert.alert(tStatic('common.leave'), tStatic('leave.message'), [
          { text: tStatic('common.cancel'), style: 'cancel' },
          { text: tStatic('common.leave'), style: 'destructive', onPress: () => setScreen('games') },
        ]);
        return true;
      }
      if (['games','knowledge','friends','settings','profile'].includes(screen)) {
        setScreen('home'); return true;
      }
      if (screen === 'home') {
        setExitVisible(true);
        return true;
      }
      return false;
    });
    return () => handler.remove();
  }, [screen, authStatus]);

  // ── LOADING ──
  if (authStatus === AUTH_STATUS.LOADING) {
    return (
      <View style={{ flex:1, justifyContent:'center', alignItems:'center', backgroundColor:'#0f0f1a' }}>
        <ActivityIndicator size="large" color="#f5c518" />
      </View>
    );
  }

  // ── UNAUTHENTICATED ──
  if (authStatus === AUTH_STATUS.UNAUTHENTICATED) {
    return <LoginScreen onLogin={handleLogin} onGuest={handleGuest} />;
  }

  // ── AUTHENTICATED ──
  const isGlobal = experience === EXPERIENCES.GLOBAL;
  // فلترة البنكين (مطابقة لمنطق AdminScreen):
  //  • العالمي: حصراً lang === 'en'
  //  • العربي : lang === 'ar' أو الفئات القديمة بلا حقل lang (افتراضها عربي)
  // هكذا لا تتسرّب فئة بنك إلى التجربة الأخرى.
  const cats = isGlobal
    ? categories.filter(c => c.lang === 'en')
    : categories.filter(c => !c.lang || c.lang === 'ar');

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
      {/* مودال تأكيد الخروج — مُصمَّم بالثيم */}
      <ExitAppModal
        visible={exitVisible}
        onCancel={() => setExitVisible(false)}
        onConfirm={() => { setExitVisible(false); BackHandler.exitApp(); }}
      />
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
      <TokenModal
        visible={showTokenModal}
        onClose={() => setShowTokenModal(false)}
        tokens={tokens}
        onAddTokens={(n) => setTokens(t => t + n)}
      />
    </>
  );

  // ── renderScreen: شاشة واحدة نشطة فقط ──
  function renderScreen() {
    switch (screen) {
      case 'home':
        return <HomeScreen {...sharedProps} />;

      case 'games':
        return (
          <GamesArenaScreen
            setScreen={setScreen}
            user={user}
            setGameMode={setGameMode}
            tryStartGame={(sc, cost, extra) => tryStartGame(sc, cost, extra, true)}
          />
        );

      case 'knowledge':
        return (
          <KnowledgeArenaScreen
            {...sharedProps}
            tryStartGame={tryStartGame}
            setOnlineRoomMode={setOnlineRoomMode}
            currentUser={user}
            categories={cats}
          />
        );

      case 'friends':
        return <FriendsScreen user={user} setScreen={setScreen} initialTab={friendsInitialTab} />;

      case 'profile':
        return <ProfileScreen user={user} setScreen={setScreen} onLogout={handleLogout} />;

      case 'settings':
        return (
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
        );

      case 'admin':
        return ADMIN_UIDS.includes(user?.uid)
          ? <AdminScreen onBack={() => setScreen('home')} />
          : null;

      case 'setup':
        return (
          <GameSetupScreen
            onStart={async ({ team1, team2, categories: catCount, selected }) => {
              // الخصم يحدث الآن — عند إنشاء اللعبة فعلاً (قلبان للكلاسيك)
              const ok = await spendHeartNow(2);
              if (!ok) return; // لا قلوب كافية — يظهر مودال القلوب، لا ننتقل
              const selectedCats = cats.filter(c => selected.includes(c.id));
              setGameData({ team1, team2, categories: catCount, selectedCategories: selectedCats });
              setScreen('board');
            }}
            onBack={() => setScreen('knowledge')}
            categories={cats}
            experience={experience}
            tokens={tokens}
            setTokens={setTokens}
            onOpenTokenModal={() => setShowTokenModal(true)}
          />
        );

      case 'board':
        return gameData ? (
          <GameBoardScreen
            {...gameData}
            onBack={() => setScreen('knowledge')}
            onGameEnd={(scores) => { setFinalScores(scores); setScreen('results'); }}
            tokens={tokens}
            setTokens={setTokens}
            currentUser={user}
          />
        ) : null;

      case 'results':
        return finalScores ? (
          <ResultsScreen
            scores={finalScores}
            onBack={() => setScreen('knowledge')}
            onPlayAgain={() => setScreen('setup')}
            onTournamentScore={onTournamentScore}
          />
        ) : null;

      case 'solo':
        return (
          <SoloGameScreen
            categories={cats}
            onBack={() => setScreen('knowledge')}
            playerName={user?.name || 'لاعب'}
            onHighScoreUpdate={(s) => setHighScore(s)}
            onGameEnd={(won) => onSoloGameEnd(won)}
            tokens={tokens}
            setTokens={setTokens}
            currentUser={user}
            onAdWatched={onAdWatched}
          />
        );

      case 'soloTournament':
        return (
          <SoloGameScreen
            categories={cats}
            onBack={() => setScreen('knowledge')}
            playerName={user?.name || 'لاعب'}
            onHighScoreUpdate={(s) => setHighScore(s)}
            isTournament={true}
            currentUser={user}
            onTournamentScore={onTournamentScore}
            onGameEnd={(won) => onSoloGameEnd(won)}
            tokens={tokens}
            setTokens={setTokens}
            onAdWatched={onAdWatched}
          />
        );

      case 'online':
        return (
          <OnlineGameScreen
            categories={cats}
            roomMode={onlineRoomMode}
            onBack={() => setScreen('knowledge')}
            currentUser={user}
            onTournamentScore={onTournamentScore}
            onGameEnd={(won) => onOnlineGameEnd('trivia', won)}
            onGameReady={() => spendHeartNow(1)}
            tokens={tokens}
            setTokens={setTokens}
            onAdWatched={onAdWatched}
          />
        );

      case 'xo':
        return <XOGameScreen onBack={() => setScreen('games')} currentUser={user} onGameEnd={(won) => onOnlineGameEnd('xo', won)} onGameReady={() => spendHeartNow(1)} />;
      case 'bullshit':
        return <BullshitGameScreen onBack={() => setScreen('games')} currentUser={user} mode={gameMode} onGameEnd={(won) => onOnlineGameEnd('bullshit', won)} onGameReady={() => spendHeartNow(1)} />;
      case 'mafia':
        return <MafiaGameScreen onBack={() => setScreen('games')} currentUser={user} onGameEnd={(won) => onOnlineGameEnd('mafia', won)} onGameReady={() => spendHeartNow(1)} />;
      case 'codenames':
        return <CodenamesGameScreen onBack={() => setScreen('games')} currentUser={user} experience={experience} onGameEnd={(won) => onOnlineGameEnd('codenames', won)} onGameReady={() => spendHeartNow(1)} />;
      case 'kout':
        return <KoutGameScreen onBack={() => setScreen('games')} currentUser={user} onGameEnd={(won) => onOnlineGameEnd('kout', won)} onGameReady={() => spendHeartNow(1)} />;
      case 'dominoes':
        return <DominoGameScreen onBack={() => setScreen('games')} currentUser={user} onGameEnd={(won) => onOnlineGameEnd('domino', won)} onGameReady={() => spendHeartNow(1)} />;
      case 'biloot':
        return <BilootGameScreen onBack={() => setScreen('games')} currentUser={user} onGameEnd={(won) => onOnlineGameEnd('biloot', won)} onGameReady={() => spendHeartNow(1)} />;
      case 'drawguess':
        return <DrawGuessScreen onBack={() => setScreen('games')} currentUser={user} mode={gameMode} onGameEnd={(won) => onOnlineGameEnd('drawguess', won)} onGameReady={() => spendHeartNow(1)} />;
      case 'wordle':
        return <WordleGameScreen onBack={() => setScreen('games')} currentUser={user} experience={experience} onGameEnd={(won) => onOnlineGameEnd('wordle', won)} onGameReady={() => spendHeartNow(1)} />;
      case 'actitout':
        return <ActItOutScreen onBack={() => setScreen('games')} experience={experience} />;
      case 'manana':
        return !isGlobal ? <ManAnaScreen onBack={() => setScreen('games')} isGlobal={isGlobal} /> : null;
      case 'truthdare':
        return !isGlobal ? <TruthDareScreen onBack={() => setScreen('games')} /> : null;
      case 'rankfriends':
        return !isGlobal ? <RankFriendsScreen onBack={() => setScreen('games')} experience={experience} /> : null;
      case 'neverhaveiever':
        return <NeverHaveIEver onBack={() => setScreen('games')} experience={experience} />;
      case 'whoisspy':
        return !isGlobal ? <WhoIsSpyScreen onBack={() => setScreen('games')} currentUser={user} onHeartSpent={() => loadHearts().then(h => setHearts(h.hearts)).catch(() => {})} /> : null;
      case 'guessimage':
        return !isGlobal ? (
          <GuessImageScreen
            onBack={() => setScreen('games')}
            currentUser={user}
            onGameEnd={(won) => onOnlineGameEnd('guessimage', won)}
            onGameReady={() => spendHeartNow(1)}
          />
        ) : null;

      default:
        return null;
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <NetStatus />
      <XPNotification ref={xpNotify} />
      <View style={{ flex: 1 }}>
        <Suspense fallback={<ScreenLoader />}>
          {renderScreen()}
        </Suspense>
      </View>
      {commonModals}
    </View>
  );
}

// ══════════════════════════════════════════════════════════════
//  App — Providers
// ══════════════════════════════════════════════════════════════
export default function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <ThemeProvider>
          <LangSync />
          <MainApp />
        </ThemeProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}
