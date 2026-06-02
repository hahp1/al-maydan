/**
 * HomeScreen.js — محدّث
 * ════════════════════════════════════════════════
 *  ✅ أيقونة القلوب ❤️ طافية بجانب التوكنز 🪙 في userBar
 *  ✅ نبض تحذيري عند صفر قلوب
 *  ✅ عداد تنازلي للتجديد التلقائي
 *  ✅ زر الملف الشخصي 👤 — يفتح ProfileScreen
 *  ✅ اسم المستخدم قابل للنقر →ملف شخصي
 *  ✅ جميع الوظائف السابقة محفوظة
 */

import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, Animated, ImageBackground } from 'react-native';
import TokenModal from './TokenModal';
import DailyRewardModal from './DailyRewardModal';
import { checkDailyReward, claimDailyReward } from './DailyRewardService';
import { useLanguage } from './I18n';
import { useTheme } from './ThemeContext';
import HeartIcon     from './HeartIcon';
import ChargingHeart from './ChargingHeart';
import { getRefillCountdown } from './HeartsService';
import { LinearGradient } from 'expo-linear-gradient';

const STARS = [...Array(18)].map((_, i) => ({
  key: i, top: `${Math.floor((i * 37 + 11) % 90)}%`, left: `${Math.floor((i * 53 + 7) % 92)}%`,
  size: i % 3 === 0 ? 3 : 2, opacity: 0.2 + (i % 4) * 0.1,
}));

const StarLayer = memo(({ theme }) => {
  if (theme.isCityTheme) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {STARS.map(s => (
        <View key={s.key} style={[
          styles.star,
          {
            top: s.top, left: s.left, width: s.size, height: s.size,
            opacity: theme.isLight ? s.opacity * 0.3 : s.opacity,
            backgroundColor: theme.isLight ? theme.purple : theme.accent + 'cc',
          }
        ]} />
      ))}
    </View>
  );
});

const CITY_STARS_CACHE = {};
function getCityStars(themeId, count) {
  if (!CITY_STARS_CACHE[themeId]) {
    CITY_STARS_CACHE[themeId] = [...Array(count)].map((_, i) => ({
      key: i,
      top:  `${(i * 43 + 7)  % 65}%`,
      left: `${(i * 67 + 13) % 96}%`,
      size: i % 5 === 0 ? 2.5 : i % 3 === 0 ? 1.8 : 1.2,
      opacity: 0.25 + (i % 4) * 0.15,
    }));
  }
  return CITY_STARS_CACHE[themeId];
}

const CityStarLayer = memo(({ theme }) => {
  if (!theme.isCityTheme || !theme.starCount) return null;
  const stars = getCityStars(theme.id, theme.starCount);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {stars.map(s => (
        <View key={s.key} style={[
          styles.star,
          { top: s.top, left: s.left, width: s.size, height: s.size,
            opacity: s.opacity, backgroundColor: theme.accent + 'dd' }
        ]} />
      ))}
    </View>
  );
});

function HeartsWidget({ hearts, countdown, onPress, theme }) {
  const pulseHeart = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (hearts === 0) {
      const loop = Animated.loop(Animated.sequence([
        Animated.timing(pulseHeart, { toValue: 1.2, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseHeart, { toValue: 1,   duration: 500, useNativeDriver: true }),
      ]));
      loop.start();
      return () => loop.stop();
    } else {
      pulseHeart.setValue(1);
    }
  }, [hearts]);

  const heartColor = hearts > 0 ? theme.error : theme.textMuted;
  const bgColor    = hearts > 0 ? theme.error + '20' : theme.bgElevated;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.heartsBtn, { backgroundColor: bgColor, borderColor: heartColor + '55' }]}
      hitSlop={HIT_SLOP}
      activeOpacity={0.75}
    >
      <Animated.View style={{ transform: [{ scale: pulseHeart }] }}>
        <HeartIcon size={22} filled={hearts > 0} hearts={hearts} pulseWhenZero glow={false} />
      </Animated.View>
      <Text style={[styles.heartsCount, { color: heartColor }]}>{hearts}</Text>
      {countdown && hearts === 0 && (
        <Text style={[styles.heartsCountdown, { color: theme.textMuted }]}>{countdown}</Text>
      )}
    </TouchableOpacity>
  );
}

// ── بادج المستوى الصغير في الـ userBar ──
function LevelBadge({ user, theme, onPress }) {
  const level = user?.level || 1;
  const isGuest = !!user?.isGuest;
  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={HIT_SLOP}
      activeOpacity={0.75}
      style={[styles.profileBtn, { backgroundColor: theme.accentSoft, borderColor: theme.accentBorder }]}
    >
      <Text style={[styles.profileIcon, { color: theme.accent }]}>
        {isGuest ? '👤' : '⚡'}
      </Text>
      {!isGuest && (
        <Text style={[styles.profileLevel, { color: theme.accent }]}>{level}</Text>
      )}
    </TouchableOpacity>
  );
}

export default function HomeScreen({
  user, tokens, setTokens, setScreen,
  showTokenModal, setShowTokenModal,
  highScore,
  hearts, setHearts,
  onOpenHeartsModal,
  activeTournament,
}) {
  const { t }     = useLanguage();
  const { theme } = useTheme();

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slide1    = useRef(new Animated.Value(60)).current;
  const slide2    = useRef(new Animated.Value(60)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef(null);

  const [dailyVisible, setDailyVisible] = useState(false);
  const [dailyStreak,  setDailyStreak]  = useState(1);
  const [dailyReward,  setDailyReward]  = useState(15);
  const [countdown,    setCountdown]    = useState(null);

  useEffect(() => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.parallel([
        Animated.spring(slide1, { toValue: 0, friction: 7, tension: 60, useNativeDriver: true }),
        Animated.spring(slide2, { toValue: 0, friction: 7, tension: 60, delay: 100, useNativeDriver: true }),
      ]),
    ]).start();

    pulseLoop.current = Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.06, duration: 1800, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1,    duration: 1800, useNativeDriver: true }),
    ]));
    pulseLoop.current.start();

    // المكافأة اليومية
    const timer = setTimeout(async () => {
      const r = await checkDailyReward();
      if (r.shouldShow && !r.alreadyClaimed) {
        setDailyStreak(r.streak);
        setDailyReward(r.reward);
        setDailyVisible(true);
      }
    }, 1000);

    getRefillCountdown().then(setCountdown);
    const cdInterval = setInterval(() => {
      getRefillCountdown().then(setCountdown);
    }, 60000);

    return () => {
      clearTimeout(timer);
      clearInterval(cdInterval);
      pulseLoop.current?.stop();
    };
  }, []);

  const handleClaimDaily = useCallback(async () => {
    await claimDailyReward(dailyStreak);
    setTokens(tk => tk + dailyReward);
    setDailyVisible(false);
  }, [dailyStreak, dailyReward]);

  const openTokenModal  = useCallback(() => setShowTokenModal(true),  []);
  const closeTokenModal = useCallback(() => setShowTokenModal(false), []);
  const addTokens       = useCallback((a) => setTokens(tk => tk + a), []);
  const openProfile     = useCallback(() => setScreen('profile'), []);

  const isCityTheme = !!theme.isCityTheme;
  const isGuest     = !!user?.isGuest;
  const userName    = isGuest
    ? (t('home.guestUser') || '👤 ضيف')
    : `👤 ${user?.name || ''}`;

  // ── محتوى الشاشة ──
  const screenContent = (
    <>
      <StatusBar barStyle={theme.statusBar} backgroundColor="transparent" translucent />
      <StarLayer theme={theme} />
      <CityStarLayer theme={theme} />

      {/* ─── العنوان ─── */}
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <Animated.View style={[styles.titleRow, { transform: [{ scale: pulseAnim }] }]}>
          {/* A R E N A — تلوين الحروف حسب الثيم */}
          {(() => {
            // Mist: logoVowel للحروف المتحركة (A,E,A) — logoCons للصوامت (R,N)
            // Crystal: crystalLight للأوسط (R,E,N) — crystalColor للخارج (A,A)
            // Standard: accent لكل الحروف
            const letters = ['A','r','e','n','a'];
            return letters.map((l, i) => {
              let color = theme.accent;
              if (theme.isMist) {
                // vowels: A(0), e(2), a(4) — consonants: r(1), n(3)
                color = [0,2,4].includes(i) ? theme.logoVowel : theme.logoCons;
              } else if (theme.isCrystal) {
                // outer: A(0), a(4) — middle: r(1), e(2), n(3)
                color = [0,4].includes(i) ? theme.crystalColor : theme.crystalLight;
              }
              return (
                <Text key={i} style={[styles.titleLetter, {
                  color,
                  textShadowColor: color + '44',
                }]}>{l}</Text>
              );
            });
          })()}
        </Animated.View>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>
          {t('home.subtitle')}
        </Text>
      </Animated.View>

      {/* ─── Top Bar شفاف ─── */}
      <Animated.View style={[styles.topBar, { opacity: fadeAnim }]}>
        {/* يسار: قلوب + توكن */}
        <View style={styles.topLeft}>
          <HeartsWidget hearts={hearts ?? 0} countdown={countdown} onPress={onOpenHeartsModal} theme={theme} />
          <TouchableOpacity
            onPress={openTokenModal}
            style={styles.topTokenBtn}
            hitSlop={HIT_SLOP}
            activeOpacity={0.7}
          >
            <Text style={[styles.topTokenText, { color: theme.accent }]}>🪙 {tokens}</Text>
          </TouchableOpacity>
        </View>

        {/* يمين: الملف الشخصي */}
        <TouchableOpacity
          style={styles.topProfile}
          onPress={openProfile}
          hitSlop={HIT_SLOP}
          activeOpacity={0.7}
        >
          <LevelBadge user={user} theme={theme} onPress={openProfile} />
        </TouchableOpacity>
      </Animated.View>

      {/* ─── أعلى نتيجة ─── */}
      {highScore > 0 && (
        <Animated.View style={[
          styles.highScoreBar,
          { opacity: fadeAnim,
            backgroundColor: isCityTheme ? theme.accent + '0c' : theme.bgCard,
            borderColor: theme.accentBorder },
        ]}>
          <Text style={[styles.highScoreText, { color: theme.accent }]}>
            {t('home.highScore', { n: highScore })}
          </Text>
        </Animated.View>
      )}

      {/* ─── بطاقتا الميدانين ─── */}
      <View style={styles.arenaRow}>
        <Animated.View style={{ transform: [{ translateY: slide1 }], opacity: fadeAnim, flex: 1 }}>
          <TouchableOpacity
            style={[styles.arenaCard, {
              backgroundColor: isCityTheme ? theme.accent + '0c' : theme.bgCard,
              borderColor: theme.accentBorder,
              shadowColor: theme.accent,
            }]}
            onPress={() => setScreen('knowledge')}
            activeOpacity={0.82}
          >
            <View style={[styles.arenaIconWrap, { backgroundColor: theme.accentSoft, borderColor: theme.accentBorder }]}>
              <Text style={styles.arenaEmoji}>🧠</Text>
            </View>
            <Text style={[styles.arenaTitle, { color: theme.accent }]}>{t('home.knowledgeTitle')}</Text>
            <Text style={[styles.arenaDesc,  { color: theme.textMuted }]}>{t('home.knowledgeDesc')}</Text>
            <View style={[styles.arenaBadge, { backgroundColor: theme.accentSoft }]}>
              <Text style={[styles.arenaBadgeText, { color: theme.accent }]}>{t('home.knowledgeBadge')}</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View style={{ transform: [{ translateY: slide2 }], opacity: fadeAnim, flex: 1 }}>
          <TouchableOpacity
            style={[styles.arenaCard, {
              backgroundColor: isCityTheme ? theme.purple + '0c' : theme.bgCard,
              borderColor: theme.purpleBorder,
              shadowColor: theme.purple,
            }]}
            onPress={() => setScreen('games')}
            activeOpacity={0.82}
          >
            <View style={[styles.arenaIconWrap, { backgroundColor: theme.purpleSoft, borderColor: theme.purpleBorder }]}>
              <Text style={styles.arenaEmoji}>🎲</Text>
            </View>
            <Text style={[styles.arenaTitle, { color: theme.purple }]}>{t('home.gamesTitle')}</Text>
            <Text style={[styles.arenaDesc,  { color: theme.textMuted }]}>{t('home.gamesDesc')}</Text>
            <View style={[styles.arenaBadge, { backgroundColor: theme.purpleSoft }]}>
              <Text style={[styles.arenaBadgeText, { color: theme.purple }]}>{t('home.gamesBadge')}</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* ─── الأكثر استخداماً ─── */}
      <Animated.View style={[styles.quickSection, { opacity: fadeAnim }]}>
        <Text style={[styles.quickLabel, { color: theme.textMuted }]}>
          {lang === 'en' ? '— Most Played —' : '— الأكثر استخداماً —'}
        </Text>
        <View style={styles.quickRow}>
          {[
            { emoji: '✕○', nameAr: 'XO',       nameEn: 'XO',       screen: 'xo'       },
            { emoji: '🃏', nameAr: 'مكشوف',    nameEn: 'Busted',   screen: 'bullshit' },
            { emoji: '🎭', nameAr: 'مافيا',    nameEn: 'Mafia',    screen: 'mafia'    },
            { emoji: '🤔', nameAr: 'من أنا؟',  nameEn: 'Who Am I', screen: 'manana'   },
          ].map(item => (
            <TouchableOpacity
              key={item.screen}
              style={[styles.quickItem, {
                backgroundColor: isCityTheme ? theme.accent + '0c' : theme.bgCard,
                borderColor: theme.borderCard,
              }]}
              onPress={() => setScreen(item.screen)}
              activeOpacity={0.8}
            >
              <Text style={styles.quickEmoji}>{item.emoji}</Text>
              <Text style={[styles.quickName, { color: theme.textMuted }]}>
                {lang === 'en' ? item.nameEn : item.nameAr}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>

      {/* ─── أزرار الأسفل ─── */}
      <Animated.View style={[styles.friendsWrap, { opacity: fadeAnim, gap: 10 }]}>
        {/* زر البطولة — يظهر فقط إذا كانت بطولة نشطة */}
        {activeTournament?.isActive && (
          <TouchableOpacity
            style={[styles.friendsBtn, {
              backgroundColor: isCityTheme ? theme.accent + '0c' : theme.bgCard,
              borderColor: '#f59e0b66',
              flexDirection: 'row', gap: 8,
            }]}
            onPress={() => setScreen('knowledge')}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 18 }}>🏆</Text>
            <Text style={[styles.friendsBtnText, { color: '#f59e0b' }]}>
              {t('home.tournament') || 'البطولة الأسبوعية'}
            </Text>
          </TouchableOpacity>
        )}
        {/* ── BottomNav ── */}
        <View style={styles.bottomNav}>
          {(lang === 'en' ? [
            { emoji: '⚔️', label: 'Arena',    active: true,  onPress: () => {}                },
            { emoji: '👥', label: 'Friends',  active: false, onPress: () => setScreen('friends') },
            { emoji: '⚙️', label: 'Settings', active: false, onPress: () => setScreen('settings') },
          ] : [
            { emoji: '⚙️', label: 'إعدادات', active: false, onPress: () => setScreen('settings') },
            { emoji: '👥', label: 'أصدقاء',  active: false, onPress: () => setScreen('friends')  },
            { emoji: '⚔️', label: 'الميدان', active: true,  onPress: () => {}                    },
          ]).map((item, i) => (
            <TouchableOpacity key={i} style={styles.navItem} onPress={item.onPress} activeOpacity={0.8}>
              <View style={[styles.navCircle, {
                borderColor:     item.active ? theme.accent : theme.borderCard,
                backgroundColor: item.active ? theme.accentSoft : (isCityTheme ? theme.accent + '0c' : theme.bgCard),
              }]}>
                <Text style={styles.navEmoji}>{item.emoji}</Text>
              </View>
              <Text style={[styles.navLabel, { color: item.active ? theme.accent : theme.textMuted }]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>

      <TokenModal visible={showTokenModal} onClose={closeTokenModal} tokens={tokens} onAddTokens={addTokens} />
      <DailyRewardModal visible={dailyVisible} streak={dailyStreak} reward={dailyReward} onClaim={handleClaimDaily} />
    </>
  );

  // ── ثيم مدينة ──
  if (isCityTheme) {
    return (
      <LinearGradient
        colors={theme.skyGradient}
        style={styles.container}
        start={{ x: 0.5, y: 1 }}
        end={{ x: 0.5, y: 0 }}
      >
        {screenContent}
        <View style={styles.skylineWrap} pointerEvents="none">
          <ImageBackground
            source={theme.skylineAsset}
            style={styles.skylineImg}
            resizeMode="cover"
            imageStyle={{ objectPosition: 'bottom' }}
          />
          <LinearGradient
            colors={[theme.skyBottom, theme.skyBottom + '00']}
            style={styles.skylineFade}
            start={{ x: 0, y: 1 }}
            end={{ x: 0, y: 0 }}
          />
        </View>
      </LinearGradient>
    );
  }

  // ── ثيم عادي ──
  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {screenContent}
    </View>
  );
}

const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

const styles = StyleSheet.create({
  container:       { flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 52, paddingHorizontal: 20 },
  star:            { position: 'absolute', borderRadius: 99 },
  // City Skyline
  skylineWrap:     { position: 'absolute', bottom: 0, left: 0, right: 0, height: 190, zIndex: 5 },
  skylineImg:      { width: '100%', height: '100%' },
  skylineFade:     { position: 'absolute', bottom: 0, left: 0, right: 0, height: 65 },
  header:          { alignItems: 'center', marginTop: 10 },
  titleRow:        { flexDirection: 'row', alignItems: 'baseline' },
  titleLetter:     { fontSize: 68, fontWeight: '900', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 24, letterSpacing: 2 },
  subtitle:        { fontSize: 16, marginTop: 6, letterSpacing: 1 },
  // topBar (replaced userBar)
  settingsBtn:     { padding: 4 },
  settingsIcon:    { fontSize: 20 },
  currencyRow:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  // القلوب
  heartsBtn:       { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  heartIcon:       { fontSize: 13 },
  heartsCount:     { fontSize: 14, fontWeight: '800' },
  heartsCountdown: { fontSize: 10, marginLeft: 2 },
  // التوكنز
  tokenBtn:        { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  tokenText:       { fontSize: 14, fontWeight: '700' },
  // زر المستخدم/الملف الشخصي
  userInfoBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  profileBtn:      { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 7, paddingVertical: 5, borderRadius: 14, borderWidth: 1 },
  profileIcon:     { fontSize: 13 },
  profileLevel:    { fontSize: 11, fontWeight: '900' },
  userText:        { fontSize: 12, fontWeight: '600', maxWidth: 72 },
  // باقي العناصر
  // ── Quick Games ──
  quickSection:   { gap: 6, marginBottom: 10 },
  quickLabel:     { fontSize: 11, textAlign: 'center' },
  quickRow:       { flexDirection: 'row', gap: 8 },
  quickItem:      { flex: 1, borderRadius: 14, borderWidth: 1, paddingVertical: 10, alignItems: 'center', gap: 4 },
  quickEmoji:     { fontSize: 20 },
  quickName:      { fontSize: 9, fontWeight: '700' },
  // ── BottomNav ──
  bottomNav:      { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', width: '100%', paddingTop: 8 },
  navItem:        { alignItems: 'center', gap: 4 },
  navCircle:      { width: 46, height: 46, borderRadius: 23, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  navEmoji:       { fontSize: 20 },
  navLabel:       { fontSize: 9, fontWeight: '800' },
  highScoreBar:    { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 14, borderWidth: 1, width: '100%', alignItems: 'center' },
  highScoreText:   { fontSize: 14, fontWeight: '700' },
  arenaRow:        { flexDirection: 'row', gap: 14, width: '100%' },
  arenaCard:       { borderRadius: 24, borderWidth: 1.5, padding: 20, alignItems: 'center', gap: 10, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.14, shadowRadius: 12, elevation: 6 },
  arenaIconWrap:   { width: 72, height: 72, borderRadius: 20, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  arenaEmoji:      { fontSize: 36 },
  arenaTitle:      { fontSize: 18, fontWeight: '900', textAlign: 'center', lineHeight: 26 },
  arenaDesc:       { fontSize: 11, textAlign: 'center', lineHeight: 17 },
  arenaBadge:      { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginTop: 2 },
  arenaBadgeText:  { fontSize: 11, fontWeight: '700' },
  friendsWrap:     { width: '100%' },
  friendsBtn:      { borderWidth: 1.5, borderRadius: 16, paddingVertical: 14, alignItems: 'center', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 4 },
  friendsBtnText:  { fontSize: 17, fontWeight: '800' },
});
