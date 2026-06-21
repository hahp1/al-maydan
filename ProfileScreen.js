/**
 * ProfileScreen.js
 * ════════════════════════════════════════════════════════════
 *  ✅ صورة اللاعب + البادج + اسمه + username
 *  ✅ شريط XP متحرك + المستوى الحالي
 *  ✅ إحصائيات: ألعاب ملعوبة / انتصارات / نسبة الفوز / streak
 *  ✅ المهام اليومية الـ3 مع زر "استلام" + toast طائر
 *  ✅ الإنجازات الدائمة مع شريط تقدم
 *  ✅ banner للضيف يحثه على التسجيل
 *  ✅ يدعم كل الثيمات عبر semantic theme properties
 */

import { useState, useEffect, useRef, useCallback, memo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  StatusBar, Animated, Image, ActivityIndicator, Alert,
} from 'react-native';
import { useTheme } from './ThemeContext';
import { useLanguage } from './I18n';
import { ThemedButton, ThemedCard, ThemedPill, ThemedModal, ThemedRow } from './ThemedComponents';
import {
  getProfileSummary,
  getDailyMissions,
  claimMissionReward,
  ACHIEVEMENTS,
  LEVELS,
} from './XPService';

// ══════════════════════════════════════════════════════════════
//  Toast طائر
// ══════════════════════════════════════════════════════════════
function XPToast({ message, visible, onHide }) {
  const y     = useRef(new Animated.Value(0)).current;
  const alpha = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    y.setValue(0);
    alpha.setValue(0);
    Animated.sequence([
      Animated.parallel([
        Animated.timing(alpha, { toValue: 1,   duration: 200, useNativeDriver: true }),
        Animated.timing(y,     { toValue: -60, duration: 500, useNativeDriver: true }),
      ]),
      Animated.delay(900),
      Animated.timing(alpha, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => onHide());
  }, [visible]);

  if (!visible) return null;
  return (
    <Animated.View style={[toastStyles.toast, { opacity: alpha, transform: [{ translateY: y }] }]}>
      <Text style={toastStyles.text}>{message}</Text>
    </Animated.View>
  );
}
const toastStyles = StyleSheet.create({
  toast: {
    position: 'absolute', alignSelf: 'center', bottom: 100,
    backgroundColor: '#22c55e', borderRadius: 20,
    paddingHorizontal: 20, paddingVertical: 10, zIndex: 999,
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, elevation: 10,
  },
  text: { color: '#fff', fontWeight: '800', fontSize: 15 },
});

// ══════════════════════════════════════════════════════════════
//  شريط XP متحرك
// ══════════════════════════════════════════════════════════════
const XPBar = memo(({ progress, levelInfo, theme, lang }) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: Math.min(progress, 1),
      duration: 900,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const width = anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={xpStyles.wrap}>
      <View style={[xpStyles.track, { backgroundColor: theme.bgElevated }]}>
        <Animated.View style={[xpStyles.fill, { width, backgroundColor: theme.accent }]} />
      </View>
      <View style={xpStyles.labels}>
        <Text style={[xpStyles.cur, { color: theme.textMuted }]}>
          {levelInfo.xpInLevel.toLocaleString()} / {levelInfo.xpNeeded.toLocaleString()} XP
        </Text>
        {!levelInfo.isMax && (
          <Text style={[xpStyles.next, { color: theme.textMuted }]}>
            {lang === 'ar' ? 'المستوى التالي' : 'Next level'}
          </Text>
        )}
      </View>
    </View>
  );
});
const xpStyles = StyleSheet.create({
  wrap:   { gap: 6 },
  track:  { height: 10, borderRadius: 6, overflow: 'hidden' },
  fill:   { height: '100%', borderRadius: 6 },
  labels: { flexDirection: 'row', justifyContent: 'space-between' },
  cur:    { fontSize: 11 },
  next:   { fontSize: 11 },
});

// ══════════════════════════════════════════════════════════════
//  بطاقة إحصائية صغيرة
// ══════════════════════════════════════════════════════════════
const StatCard = memo(({ icon, value, label, theme }) => (
  <View style={[statStyles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
    <Text style={statStyles.icon}>{icon}</Text>
    <Text style={[statStyles.value, { color: theme.textPrimary }]}>{value}</Text>
    <Text style={[statStyles.label, { color: theme.textMuted }]}>{label}</Text>
  </View>
));
const statStyles = StyleSheet.create({
  card:  {
    flex: 1, alignItems: 'center', borderRadius: 16, paddingVertical: 14,
    borderWidth: 1, gap: 2,
  },
  icon:  { fontSize: 22 },
  value: { fontSize: 18, fontWeight: '900' },
  label: { fontSize: 11, textAlign: 'center' },
});

// ══════════════════════════════════════════════════════════════
//  بطاقة مهمة يومية
// ══════════════════════════════════════════════════════════════
const MissionCard = memo(({ mission, progress, completed, onClaim, theme, lang }) => {
  const cur       = progress || 0;
  const pct       = Math.min(cur / mission.target, 1);
  const isDone    = pct >= 1;
  const isClaimed = completed;
  const label     = lang === 'ar' ? mission.ar : mission.en;

  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleClaim = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.92, duration: 80,  useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1,    duration: 120, useNativeDriver: true }),
    ]).start(() => onClaim(mission.id));
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <View style={[
        missionStyles.card,
        {
          backgroundColor: isClaimed ? theme.bgCard + '88' : theme.bgCard,
          borderColor: isClaimed ? theme.border : isDone ? theme.accent : theme.border,
          borderWidth: isDone && !isClaimed ? 1.5 : 1,
          opacity: isClaimed ? 0.6 : 1,
        },
      ]}>
        {/* زر استلام — يظهر فوق البطاقة عند الإكمال */}
        {isDone && !isClaimed && (
          <ThemedButton onPress={handleClaim} label={lang === 'ar' ? `استلام +${mission.xp} XP` : `Claim +${mission.xp} XP`} variant='primary' size='small' style={missionStyles.claimBtn} />
        )}

        <View style={missionStyles.row}>
          <View style={missionStyles.info}>
            <Text style={[missionStyles.label, { color: isClaimed ? theme.textMuted : theme.textPrimary }]}>
              {isClaimed ? '✅ ' : ''}{label}
            </Text>
            <Text style={[missionStyles.count, { color: theme.textMuted }]}>
              {cur}/{mission.target}
              {'  ·  '}
              <Text style={{ color: theme.accent, fontWeight: '700' }}>+{mission.xp} XP</Text>
            </Text>
          </View>
        </View>

        {/* شريط تقدم المهمة */}
        <View style={[missionStyles.track, { backgroundColor: theme.bgElevated }]}>
          <View style={[
            missionStyles.fill,
            {
              width: `${pct * 100}%`,
              backgroundColor: isClaimed ? theme.textMuted : isDone ? theme.accent : theme.purple,
            },
          ]} />
        </View>
      </View>
    </Animated.View>
  );
});
const missionStyles = StyleSheet.create({
  card: {
    borderRadius: 16, padding: 14, gap: 10,
    marginBottom: 10, overflow: 'visible',
  },
  row:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  info:      { flex: 1, gap: 3 },
  label:     { fontSize: 14, fontWeight: '700', lineHeight: 20 },
  count:     { fontSize: 12 },
  track:     { height: 6, borderRadius: 4, overflow: 'hidden' },
  fill:      { height: '100%', borderRadius: 4 },
  claimBtn:  {
    borderRadius: 10, paddingVertical: 8, paddingHorizontal: 16,
    alignItems: 'center', marginBottom: 4,
  },
  claimText: { fontSize: 13, fontWeight: '900' },
});

// ══════════════════════════════════════════════════════════════
//  بطاقة إنجاز دائم
// ══════════════════════════════════════════════════════════════
const AchievementCard = memo(({ ach, achData, stats, theme, lang }) => {
  // احسب القيمة الحالية
  let value = 0;
  if (ach.isCounted) {
    value = (stats.gameTypesPlayed || []).length;
  } else if (ach.stat.includes('.')) {
    const [p, c] = ach.stat.split('.');
    value = (stats[p] || {})[c] || 0;
  } else {
    value = stats[ach.stat] || 0;
  }

  const milestoneIndex = achData?.milestoneIndex ?? -1;
  const nextIdx        = milestoneIndex + 1;
  const isMaxed        = nextIdx >= ach.milestones.length;
  const nextTarget     = isMaxed ? ach.milestones[ach.milestones.length - 1] : ach.milestones[nextIdx];
  const prevTarget     = milestoneIndex >= 0 ? ach.milestones[milestoneIndex] : 0;
  const pct            = isMaxed ? 1 : Math.min((value - prevTarget) / (nextTarget - prevTarget), 1);
  const nextXP         = isMaxed ? null : ach.xpPerMilestone[nextIdx];

  return (
    <View style={[achStyles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
      <View style={achStyles.header}>
        <Text style={achStyles.icon}>{ach.icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[achStyles.name, { color: theme.textPrimary }]}>
            {lang === 'ar' ? ach.ar : ach.en}
          </Text>
          {!!(ach.descAr || ach.descEn) && (
            <Text style={[achStyles.desc, { color: theme.textSecondary }]}>
              {lang === 'ar' ? ach.descAr : ach.descEn}
            </Text>
          )}
          <Text style={[achStyles.sub, { color: theme.textMuted }]}>
            {isMaxed
              ? (lang === 'ar' ? '✅ مكتمل' : '✅ Completed')
              : `${value.toLocaleString()} / ${nextTarget.toLocaleString()}${nextXP ? `  ·  +${nextXP} XP` : ''}`
            }
          </Text>
        </View>
        {milestoneIndex >= 0 && (
          <View style={[achStyles.badge, { backgroundColor: theme.accentSoft, borderColor: theme.accentBorder }]}>
            <Text style={[achStyles.badgeText, { color: theme.accent }]}>
              {milestoneIndex + 1}/{ach.milestones.length}
            </Text>
          </View>
        )}
      </View>
      <View style={[achStyles.track, { backgroundColor: theme.bgElevated }]}>
        <View style={[
          achStyles.fill,
          { width: `${pct * 100}%`, backgroundColor: isMaxed ? theme.success : theme.purple },
        ]} />
      </View>
    </View>
  );
});
const achStyles = StyleSheet.create({
  card:      { borderRadius: 16, padding: 14, gap: 10, marginBottom: 10, borderWidth: 1 },
  header:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon:      { fontSize: 24 },
  name:      { fontSize: 14, fontWeight: '700' },
  desc:      { fontSize: 11.5, marginTop: 2, lineHeight: 15 },
  sub:       { fontSize: 11, marginTop: 2 },
  track:     { height: 6, borderRadius: 4, overflow: 'hidden' },
  fill:      { height: '100%', borderRadius: 4 },
  badge:     { borderRadius: 10, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '800' },
});

// ══════════════════════════════════════════════════════════════
//  الشاشة الرئيسية
// ══════════════════════════════════════════════════════════════
export default function ProfileScreen({ user, setScreen, onLogin, onLogout }) {
  const { theme } = useTheme();
  const { lang }  = useLanguage();
  const isGuest   = !user?.uid || user?.isGuest;

  const [profile,      setProfile]      = useState(null);
  const [dailyData,    setDailyData]    = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [tab,          setTab]          = useState('missions'); // 'missions' | 'achievements'
  const [toast,        setToast]        = useState({ visible: false, message: '' });
  const [levelUpModal, setLevelUpModal] = useState(null);

  const uid = user?.uid || user?.guestId || 'guest';

  // ── جلب البيانات ──
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [prof, daily] = await Promise.all([
        getProfileSummary(uid, isGuest),
        getDailyMissions(uid, isGuest),
      ]);
      setProfile(prof);
      setDailyData(daily);
    } catch (e) {
      console.error('ProfileScreen load error:', e);
    } finally {
      setLoading(false);
    }
  }, [uid, isGuest]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── استلام مهمة ──
  const handleClaim = useCallback(async (missionId) => {
    const result = await claimMissionReward(uid, missionId, isGuest);
    if (!result || result.xpGained === 0) return;

    // تحديث daily locally
    setDailyData(prev => ({
      ...prev,
      completedIds: [...(prev.completedIds || []), missionId],
    }));

    // تحديث XP في profile
    setProfile(prev => {
      if (!prev) return prev;
      const newXP = (prev.xp || 0) + result.xpGained;
      return { ...prev, xp: newXP, levelInfo: result };
    });

    // toast
    showToast(`+${result.xpGained} XP ✨`);

    // ترقية مستوى؟
    if (result.leveledUp) {
      setTimeout(() => setLevelUpModal(result), 600);
    }
  }, [uid, isGuest]);

  const showToast = (message) => {
    setToast({ visible: true, message });
  };
  const hideToast = () => setToast({ visible: false, message: '' });

  // ── حساب الإحصائيات ──
  const stats    = profile?.stats || {};
  const levelInfo = profile?.levelInfo || { level: 1, label: 'مبتدئ III', xpInLevel: 0, xpNeeded: 300, progress: 0, isMax: false };
  const totalXP   = profile?.xp || 0;
  const wins      = stats.onlineWins || 0;
  const played    = stats.totalGamesPlayed || 0;
  const winRate   = played > 0 ? Math.round((wins / played) * 100) : 0;
  const streak    = stats.streakDays || 0;

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar barStyle={theme.statusBar} backgroundColor={theme.statusBg} />
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.statusBg} />

      {/* ── Header ── */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <ThemedButton onPress={() => setScreen('home')} label={lang === 'ar' ? '→' : '←'} variant='ghost' size='small' fullWidth={false} style={styles.backBtn} />
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
          {lang === 'ar' ? 'الملف الشخصي' : 'Profile'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Banner الضيف ── */}
        {isGuest && (
          <ThemedCard onPress={() => onLogout?.()} style={styles.guestBanner}>
            <Text style={styles.guestBannerIcon}>⚠️</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.guestBannerTitle, { color: theme.purple }]}>
                {lang === 'ar' ? 'أنت تلعب كضيف' : 'Playing as Guest'}
              </Text>
              <Text style={[styles.guestBannerSub, { color: theme.textMuted }]}>
                {lang === 'ar'
                  ? 'سجّل دخولك لحفظ تقدمك بشكل دائم'
                  : 'Sign in to save your progress permanently'}
              </Text>
            </View>
            <Text style={[styles.guestBannerArrow, { color: theme.purple }]}>
              {lang === 'ar' ? '←' : '→'}
            </Text>
          </ThemedCard>
        )}

        {/* ── بطاقة المستخدم ── */}
        <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
          {/* صورة + اسم */}
          <View style={styles.userRow}>
            <View style={[styles.avatarWrap, { borderColor: theme.accent }]}>
              {user?.photo ? (
                <Image source={{ uri: user.photo }} style={styles.avatar} onError={(e) => e.target.setNativeProps({ src: [] })} />
              ) : (
                <View style={[styles.avatarFallback, { backgroundColor: theme.accentSoft }]}>
                  <Text style={[styles.avatarLetter, { color: theme.accent }]}>
                    {(user?.name || '?')[0]?.toUpperCase()}
                  </Text>
                </View>
              )}
              {/* بادج المستوى */}
              <View style={[styles.levelBadge, { backgroundColor: theme.accent }]}>
                <Text style={[styles.levelBadgeText, { color: theme.textOnAccent }]}>
                  {levelInfo.level}
                </Text>
              </View>
            </View>

            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[styles.userName, { color: theme.textPrimary }]} numberOfLines={1}>
                {isGuest ? (lang === 'ar' ? '👤 ضيف' : '👤 Guest') : user?.name}
              </Text>
              {!isGuest && user?.username && (
                <Text style={[styles.username, { color: theme.textMuted }]}>@{user.username}</Text>
              )}
              <View style={[styles.levelPill, { backgroundColor: theme.accentSoft, borderColor: theme.accentBorder }]}>
                <Text style={[styles.levelLabel, { color: theme.accent }]}>
                  {levelInfo.label}
                </Text>
              </View>
            </View>

            {/* إجمالي XP */}
            <View style={styles.xpTotal}>
              <Text style={[styles.xpNum, { color: theme.accent }]}>
                {totalXP.toLocaleString()}
              </Text>
              <Text style={[styles.xpLbl, { color: theme.textMuted }]}>XP</Text>
            </View>
          </View>

          {/* شريط XP */}
          <XPBar
            progress={levelInfo.progress}
            levelInfo={levelInfo}
            theme={theme}
            lang={lang}
          />
        </View>

        {/* ── الإحصائيات ── */}
        <View style={styles.statsRow}>
          <StatCard icon="🎮" value={played} label={lang === 'ar' ? 'لعبة' : 'Games'} theme={theme} />
          <StatCard icon="🏆" value={wins}   label={lang === 'ar' ? 'فوز' : 'Wins'}  theme={theme} />
          <StatCard icon="📊" value={`${winRate}%`} label={lang === 'ar' ? 'نسبة فوز' : 'Win Rate'} theme={theme} />
          <StatCard icon="🔥" value={streak} label={lang === 'ar' ? 'يوم متتالي' : 'Day Streak'} theme={theme} />
        </View>

        {/* ── التبويبات ── */}
        <View style={[styles.tabBar, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
          {['missions', 'achievements'].map(t => (
            <ThemedCard
              key={t}
              onPress={() => setTab(t)}
              style={[styles.tabBtn, tab === t && { borderBottomColor: theme.accent, borderBottomWidth: 2 }]}
            >
              <Text style={[styles.tabText, { color: tab === t ? theme.accent : theme.textMuted }]}>
                {t === 'missions'
                  ? (lang === 'ar' ? '📅 مهام اليوم' : '📅 Daily Missions')
                  : (lang === 'ar' ? '🏅 إنجازات' : '🏅 Achievements')}
              </Text>
            </ThemedCard>
          ))}
        </View>

        {/* ── المهام اليومية ── */}
        {tab === 'missions' && dailyData && (
          <View style={styles.section}>
            {/* عداد تنازلي للتجديد */}
            <MidnightCountdown theme={theme} lang={lang} />

            {(dailyData.missions || []).map((mission) => (
              <MissionCard
                key={mission.id}
                mission={mission}
                progress={(dailyData.progress || {})[mission.id] || 0}
                completed={(dailyData.completedIds || []).includes(mission.id)}
                onClaim={handleClaim}
                theme={theme}
                lang={lang}
              />
            ))}
          </View>
        )}

        {/* ── الإنجازات الدائمة ── */}
        {tab === 'achievements' && (
          <View style={styles.section}>
            {ACHIEVEMENTS.map(ach => (
              <AchievementCard
                key={ach.id}
                ach={ach}
                achData={(profile?.achievements || {})[ach.id]}
                stats={stats}
                theme={theme}
                lang={lang}
              />
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Toast ── */}
      <XPToast message={toast.message} visible={toast.visible} onHide={hideToast} />

      {/* ── Level Up Modal ── */}
      {levelUpModal && (
        <LevelUpModal info={levelUpModal} theme={theme} lang={lang} onClose={() => setLevelUpModal(null)} />
      )}
    </View>
  );
}

// ══════════════════════════════════════════════════════════════
//  عداد تنازلي لمنتصف الليل
// ══════════════════════════════════════════════════════════════
function MidnightCountdown({ theme, lang }) {
  const [remaining, setRemaining] = useState('');

  useEffect(() => {
    const tick = () => {
      const now  = new Date();
      const next = new Date();
      next.setHours(24, 0, 0, 0);
      const diff = next - now;
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <View style={[countStyles.row, { backgroundColor: theme.bgElevated, borderColor: theme.border }]}>
      <Text style={{ fontSize: 14 }}>🕐</Text>
      <Text style={[countStyles.text, { color: theme.textMuted }]}>
        {lang === 'ar' ? `تتجدد المهام بعد ${remaining}` : `Missions refresh in ${remaining}`}
      </Text>
    </View>
  );
}
const countStyles = StyleSheet.create({
  row:  {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8,
    marginBottom: 14, borderWidth: 1,
  },
  text: { fontSize: 13 },
});

// ══════════════════════════════════════════════════════════════
//  Level Up Modal
// ══════════════════════════════════════════════════════════════
function LevelUpModal({ info, theme, lang, onClose }) {
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const alphaAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true }),
      Animated.timing(alphaAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[luStyles.overlay, { opacity: alphaAnim }]}>
      <Animated.View style={[
        luStyles.box,
        { backgroundColor: theme.bgCard, borderColor: theme.accent, transform: [{ scale: scaleAnim }] },
      ]}>
        <Text style={luStyles.crown}>👑</Text>
        <Text style={[luStyles.title, { color: theme.accent }]}>
          {lang === 'ar' ? 'ارتقيت مستوى!' : 'Level Up!'}
        </Text>
        <Text style={[luStyles.level, { color: theme.textPrimary }]}>
          {lang === 'ar' ? `المستوى ${info.level}` : `Level ${info.level}`}
        </Text>
        <Text style={[luStyles.label, { color: theme.textMuted }]}>{info.label}</Text>
        {info.levelReward > 0 && (
          <View style={[luStyles.reward, { backgroundColor: theme.accentSoft, borderColor: theme.accentBorder }]}>
            <Text style={[luStyles.rewardText, { color: theme.accent }]}>
              🪙 +{info.levelReward} {lang === 'ar' ? 'توكن' : 'Tokens'}
            </Text>
          </View>
        )}
        <ThemedButton onPress={onClose} label={lang === 'ar' ? 'رائع! 🎉' : 'Awesome! 🎉'} variant='primary' size='large' style={luStyles.btn} />
      </Animated.View>
    </Animated.View>
  );
}
const luStyles = StyleSheet.create({
  overlay:    {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center', alignItems: 'center', zIndex: 100,
  },
  box:        {
    width: '80%', borderRadius: 28, padding: 32, alignItems: 'center',
    gap: 10, borderWidth: 2,
  },
  crown:      { fontSize: 56 },
  title:      { fontSize: 22, fontWeight: '900' },
  level:      { fontSize: 40, fontWeight: '900' },
  label:      { fontSize: 16, fontWeight: '700' },
  reward:     { borderRadius: 14, borderWidth: 1, paddingHorizontal: 20, paddingVertical: 8, marginTop: 4 },
  rewardText: { fontSize: 16, fontWeight: '800' },
  btn:        { borderRadius: 16, paddingVertical: 14, paddingHorizontal: 32, marginTop: 8 },
  btnText:    { fontSize: 16, fontWeight: '900' },
});

// ══════════════════════════════════════════════════════════════
//  Styles
// ══════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container:    { flex: 1 },
  header:       {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backBtn:      { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  backIcon:     { fontSize: 22, fontWeight: '700' },
  headerTitle:  { fontSize: 18, fontWeight: '900' },
  scroll:       { padding: 16, gap: 14 },

  // Guest Banner
  guestBanner:  {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 16, borderWidth: 1.5, padding: 14,
  },
  guestBannerIcon:  { fontSize: 20 },
  guestBannerTitle: { fontSize: 14, fontWeight: '800' },
  guestBannerSub:   { fontSize: 12, marginTop: 2 },
  guestBannerArrow: { fontSize: 18, fontWeight: '700' },

  // User Card
  card:         { borderRadius: 20, padding: 18, gap: 14, borderWidth: 1 },
  userRow:      { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatarWrap:   { position: 'relative', borderWidth: 2.5, borderRadius: 36, padding: 2 },
  avatar:       { width: 64, height: 64, borderRadius: 32 },
  avatarFallback: {
    width: 64, height: 64, borderRadius: 32,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarLetter: { fontSize: 26, fontWeight: '900' },
  levelBadge:   {
    position: 'absolute', bottom: -4, right: -4,
    minWidth: 22, height: 22, borderRadius: 11,
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 4,
  },
  levelBadgeText: { fontSize: 11, fontWeight: '900' },
  userName:     { fontSize: 17, fontWeight: '900' },
  username:     { fontSize: 12 },
  levelPill:    {
    alignSelf: 'flex-start', borderRadius: 10, borderWidth: 1,
    paddingHorizontal: 10, paddingVertical: 3, marginTop: 2,
  },
  levelLabel:   { fontSize: 12, fontWeight: '700' },
  xpTotal:      { alignItems: 'center', gap: 1 },
  xpNum:        { fontSize: 20, fontWeight: '900' },
  xpLbl:        { fontSize: 10, fontWeight: '600' },

  // Stats
  statsRow:     { flexDirection: 'row', gap: 8 },

  // Tabs
  tabBar:       {
    flexDirection: 'row', borderRadius: 16, borderWidth: 1,
    overflow: 'hidden',
  },
  tabBtn:       { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabText:      { fontSize: 13, fontWeight: '700' },

  // Section
  section:      { gap: 0 },
});
