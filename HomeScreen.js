/**
 * HomeScreen.js — محدّث v2
 * ════════════════════════════════════════════════
 *  ✅ topBar موحد الارتفاع: قلوب + توكنز يمين، بروفايل+اسم يسار
 *  ✅ اسم الضيف: Guest#XXXXX | اسم المسجّل من Firebase
 *  ✅ بطاقات الميدان: أيقونة في المنتصف، عنوان في سطر واحد
 *  ✅ حذف badge (٣ أنماط / قريباً) من البطاقات
 *  ✅ BottomNav: مربع فقط بدون دائرة داخلية، أيقونات أكبر، نصوص متمركزة
 *  ✅ قسم "الأكثر استخداماً" أكبر وأوضح
 *  ✅ جميع الوظائف السابقة محفوظة
 */

import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, Animated } from 'react-native';
import { ThemedCard } from './ThemedComponents';
import TokenModal from './TokenModal';
import DailyRewardModal from './DailyRewardModal';
import { checkDailyReward, claimDailyReward } from './DailyRewardService';
import { useLanguage } from './I18n';
import { useTheme } from './ThemeContext';
import HeartIcon     from './HeartIcon';
import ChargingHeart from './ChargingHeart';
import { getRefillCountdown } from './HeartsService';

const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

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

// ── ويدجت القلوب ──
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

  const heartColor = hearts > 0 ? theme.accent : theme.textMuted;
  const bgColor    = hearts > 0 ? theme.accentSoft : theme.bgElevated;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      style={[styles.topBarChip, { backgroundColor: bgColor, borderColor: heartColor + '55' }]}
    >
      <Animated.View style={{ transform: [{ scale: pulseHeart }] }}>
        <HeartIcon size={20} filled={hearts > 0} hearts={hearts} pulseWhenZero glow={false} />
      </Animated.View>
      <Text style={[styles.chipText, { color: heartColor }]}>{hearts}</Text>
      {countdown && hearts === 0 && (
        <Text style={[styles.chipSub, { color: theme.textMuted }]}>{countdown}</Text>
      )}
    </TouchableOpacity>
  );
}

// ── بطاقة الملف الشخصي — اسم + معرف ──
function ProfileChip({ user, theme, onPress }) {
  const isGuest = !!user?.isGuest;
  // الضيف: Guest#XXXXX حيث XXXXX = أول 5 أرقام من uid أو معرف عشوائي
  const guestId = user?.uid
    ? 'Guest#' + user.uid.replace(/\D/g, '').slice(0, 5).padEnd(5, '0')
    : 'Guest#00000';
  const displayName = isGuest ? guestId : (user?.name || user?.email?.split('@')[0] || 'Player');

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={[
      styles.profileChip,
      { backgroundColor: theme.bgElevated, borderColor: theme.borderCard },
    ]}>
      <Text style={[styles.profileChipIcon, { color: theme.accent }]}>
        {isGuest ? '👤' : '⚡'}
      </Text>
      <Text
        style={[styles.profileChipName, { color: theme.textPrimary }]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {displayName}
      </Text>
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
  const { t, lang } = useLanguage();
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

  const openTokenModal  = useCallback(() => setShowTokenModal(true),  [setShowTokenModal]);
  const closeTokenModal = useCallback(() => setShowTokenModal(false), [setShowTokenModal]);
  const addTokens       = useCallback((a) => setTokens(tk => tk + a), [setTokens]);
  const openProfile     = useCallback(() => setScreen('profile'), [setScreen]);

  const isCityTheme = !!theme.isCityTheme;

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
            const letters = ['A','r','e','n','a'];
            return letters.map((l, i) => {
              let color = theme.accent;
              if (theme.isMist) {
                color = [0,2,4].includes(i) ? theme.logoVowel : theme.logoCons;
              } else if (theme.isCrystal) {
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

      {/* ─── Top Bar موحد الارتفاع ─── */}
      {/* يسار RTL = البروفايل | يمين RTL = القلوب+التوكنز */}
      <Animated.View style={[styles.topBar, { opacity: fadeAnim }]}>
        {/* يسار (في RTL = الطرف الأيمن فعلياً في LTR، لكن نضعه على اليمين في RTL = أول عنصر) */}
        {/* في العربي: البروفايل يظهر على اليسار (بداية الصف في RTL) */}
        <ProfileChip user={user} theme={theme} onPress={openProfile} />

        {/* يمين: القلوب + التوكنز */}
        <View style={styles.topRight}>
          <HeartsWidget hearts={hearts ?? 0} countdown={countdown} onPress={onOpenHeartsModal} theme={theme} />
          <TouchableOpacity
            onPress={openTokenModal}
            activeOpacity={0.75}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            style={[styles.topBarChip, {
              borderColor: theme.accentBorder,
              backgroundColor: theme.accentSoft,
            }]}
          >
            <Text style={[styles.chipText, { color: theme.accent }]}>🪙</Text>
            <Text style={[styles.chipText, { color: theme.accent }]}>{tokens}</Text>
          </TouchableOpacity>
        </View>
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
        {/* ميدان المعلومات */}
        <Animated.View style={{ transform: [{ translateY: slide1 }], opacity: fadeAnim, flex: 1 }}>
          <TouchableOpacity
            onPress={() => setScreen('knowledge')}
            activeOpacity={0.8}
            style={[styles.arenaCard, {
              backgroundColor: theme.accent + (theme.isLight ? '14' : '10'),
              borderColor: theme.accent + (theme.isLight ? '50' : '38'),
            }]}
          >
            <View style={[styles.arenaIconWrap, { backgroundColor: theme.accentSoft, borderColor: theme.accentBorder }]}>
              <Text style={styles.arenaEmoji}>🧠</Text>
            </View>
            <Text style={[styles.arenaTitle, { color: theme.accent }]}>
              {lang === 'en' ? 'Knowledge Arena' : 'ميدان المعلومات'}
            </Text>
            <Text style={[styles.arenaDesc, { color: theme.textMuted }]}>
              {t('home.knowledgeDesc')}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* ميدان الألعاب */}
        <Animated.View style={{ transform: [{ translateY: slide2 }], opacity: fadeAnim, flex: 1 }}>
          <TouchableOpacity
            onPress={() => setScreen('games')}
            activeOpacity={0.8}
            style={[styles.arenaCard, {
              backgroundColor: ( theme.purple || theme.accent ) + (theme.isLight ? '14' : '10'),
              borderColor: ( theme.purple || theme.accent ) + (theme.isLight ? '50' : '38'),
            }]}
          >
            <View style={[styles.arenaIconWrap, { backgroundColor: theme.purpleSoft, borderColor: theme.purpleBorder }]}>
              <Text style={styles.arenaEmoji}>🎲</Text>
            </View>
            <Text style={[styles.arenaTitle, { color: theme.purple }]}>
              {lang === 'en' ? 'Games Arena' : 'ميدان الألعاب'}
            </Text>
            <Text style={[styles.arenaDesc, { color: theme.textMuted }]}>
              {t('home.gamesDesc')}
            </Text>
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
              onPress={() => setScreen(item.screen)}
              activeOpacity={0.75}
              style={[styles.quickItem, {
                backgroundColor: theme.accent + (theme.isLight ? '18' : '14'),
                borderColor: theme.accent + (theme.isLight ? '55' : '40'),
              }]}
            >
              <Text style={styles.quickEmoji}>{item.emoji}</Text>
              <Text style={[styles.quickName, { color: theme.textPrimary }]} numberOfLines={1}>
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
            onPress={() => setScreen('knowledge')}
            activeOpacity={0.75}
            style={[styles.tournamentBtn, {
              backgroundColor: '#f59e0b0e',
              borderColor: '#f59e0b55',
            }]}
          >
            <Text style={{ fontSize: 18 }}>🏆</Text>
            <Text style={[styles.tournamentText, { color: '#f59e0b' }]}>{t('home.tournament') || 'البطولة الأسبوعية'}</Text>
          </TouchableOpacity>
        )}

        {/* ── BottomNav — مربعات بدون دائرة داخلية ── */}
        <View style={[styles.bottomNav, {
          backgroundColor: isCityTheme ? theme.accent + '08' : theme.bgCard,
          borderColor: theme.borderCard,
        }]}>
          {(lang === 'en' ? [
            { emoji: '⚙️', label: 'Settings', active: false, onPress: () => setScreen('settings') },
            { emoji: '👥', label: 'Friends',  active: false, onPress: () => setScreen('friends') },
            { emoji: '⚔️', label: 'Arena',    active: true,  onPress: () => {}                },
          ] : [
            { emoji: '⚙️', label: 'إعدادات', active: false, onPress: () => setScreen('settings') },
            { emoji: '👥', label: 'أصدقاء',  active: false, onPress: () => setScreen('friends')  },
            { emoji: '⚔️', label: 'الميدان', active: true,  onPress: () => {}                    },
          ]).map((item, i) => (
            <TouchableOpacity
              key={i}
              onPress={item.onPress}
              activeOpacity={0.7}
              style={[styles.navItem, {
                backgroundColor: item.active
                  ? (isCityTheme ? theme.accent + '22' : theme.accentSoft)
                  : 'transparent',
                borderColor: item.active ? theme.accent + '66' : 'transparent',
              }]}
            >
              <Text style={[styles.navEmoji, item.active && { fontSize: 28 }]}>
                {item.emoji}
              </Text>
              <Text style={[styles.navLabel, {
                color: item.active ? theme.accent : theme.textMuted,
                fontWeight: item.active ? '800' : '600',
              }]}>
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

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      {screenContent}
    </View>
  );
}


const TOP_BAR_H = 50; // ارتفاع موحد لكل عناصر الـ topBar

const styles = StyleSheet.create({
  container:       { flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 52, paddingHorizontal: 20 },
  star:            { position: 'absolute', borderRadius: 99 },
  // City Skyline
  skylineWrap:     { position: 'absolute', bottom: 0, left: 0, right: 0, height: 190, zIndex: 5 },
  skylineImg:      { width: '100%', height: '100%' },
  skylineFade:     { position: 'absolute', bottom: 0, left: 0, right: 0, height: 65 },

  // ── Header / Title ──
  header:          { alignItems: 'center', marginTop: 10 },
  titleRow:        { flexDirection: 'row', alignItems: 'baseline' },
  titleLetter:     { fontSize: 68, fontWeight: '900', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 24, letterSpacing: 2 },
  subtitle:        { fontSize: 16, marginTop: 6, letterSpacing: 1 },

  // ── Top Bar ──
  topBar:          {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 4,
    height: TOP_BAR_H,
  },
  topRight:        { flexDirection: 'row', alignItems: 'center', gap: 8, height: TOP_BAR_H },

  // Chip مشترك للقلوب والتوكنز
  topBarChip:      {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 0,
    borderRadius: 14,
    borderWidth: 1,
    height: TOP_BAR_H,
  },
  chipText:        { fontSize: 15, fontWeight: '800' },
  chipSub:         { fontSize: 9, marginLeft: 2 },

  // Profile Chip — يسار
  profileChip:     {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 0,
    borderRadius: 14,
    borderWidth: 1,
    height: TOP_BAR_H,
    maxWidth: 150,
  },
  profileChipIcon: { fontSize: 16 },
  profileChipName: { fontSize: 13, fontWeight: '700', flexShrink: 1 },

  // ── High Score ──
  highScoreBar:    { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 14, borderWidth: 1, width: '100%', alignItems: 'center' },
  highScoreText:   { fontSize: 14, fontWeight: '700' },

  // ── Arena Cards ──
  arenaRow:        { flexDirection: 'row', gap: 14, width: '100%' },
  arenaCard:       {
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 20,
    alignItems: 'center',
    gap: 10,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 6,
  },
  arenaIconWrap:   {
    width: 76,
    height: 76,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    // مركز أفقياً داخل البطاقة
    alignSelf: 'center',
  },
  arenaEmoji:      { fontSize: 38 },
  arenaTitle:      {
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
    // سطر واحد — إذا احتاج يضغط الخط
    lineHeight: 22,
    flexShrink: 1,
  },
  arenaDesc:       { fontSize: 11, textAlign: 'center', lineHeight: 17 },

  // ── Quick Games (الأكثر استخداماً) ──
  quickSection:   { gap: 8, width: '100%' },
  quickLabel:     { fontSize: 12, textAlign: 'center', fontWeight: '600', letterSpacing: 0.5 },
  quickRow:       { flexDirection: 'row', gap: 8, width: '100%' },
  quickItem:      {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minWidth: 0,
  },
  quickEmoji:     { fontSize: 24 },
  quickName:      { fontSize: 12, fontWeight: '700', textAlign: 'center', flexShrink: 1 },

  // ── BottomNav ──
  friendsWrap:     { width: '100%' },
  tournamentBtn:   {
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  tournamentText:  { fontSize: 17, fontWeight: '800' },

  bottomNav:      {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'stretch',
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  navItem:        {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    gap: 4,
    borderWidth: 0,
    borderRadius: 0,
  },
  navEmoji:       { fontSize: 24, textAlign: 'center' },
  navLabel:       {
    fontSize: 11,
    textAlign: 'center',
    // يضمن أن النص في المنتصف دائماً
    width: '100%',
  },
});
