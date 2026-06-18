/**
 * KnowledgeArenaScreen.js — محدّث بالكامل
 * ════════════════════════════════════════════════
 *  ✅ بانر البطولة الجديد: أعمدة top3 + عداد + زر اشتراك/مشترك
 *  ✅ Popup البطولة: جوائز + صدارة 20 لاعب + الفائزون السابقون + القادمة
 *  ✅ أسماء الأوضاع الجديدة: تصنيف / ودية / كلاسيكي
 *  ✅ وضع التصنيف: عشوائي + مع صديق + فردي (كلها مصنّفة)
 *  ✅ وضع الودية: مباراة ودية + لعب حر
 *  ✅ نهاية البطولة: اللعب يستمر لكن السكورات لا تُحسب
 *  ✅ ربط TournamentService الكامل
 *  ✅ القلوب قابلة للضغط → HeartsModal
 *  ✅ التوكنز قابلة للضغط → TokenModal
 */

import { useRef, useEffect, useCallback, memo, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Pressable,
  Animated, StatusBar, Modal, ScrollView,
  TouchableWithoutFeedback, ActivityIndicator,
  BackHandler } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TokenModal from './TokenModal';
import { useTheme } from './ThemeContext';
import ExitButton from './ExitButton';
import LeaveModal from './LeaveModal';
import HeartIcon from './HeartIcon';
import { useT } from './I18n';
import { EXPERIENCE_KEY, EXPERIENCES } from './OnboardingScreen';
import { ThemedButton, ThemedCard, ThemedPill, ThemedModal, ThemedRow } from './ThemedComponents';
import {
  subscribeToActiveTournament,
  subscribeToLeaderboard,
  getUserTournamentScore,
  isUserInTournament,
  addTournamentScore,
  getPastWinners,
  getNextTournamentStartTime,
  formatCountdown,
  TOURNAMENT_PRIZES,
} from './TournamentService';

const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

// ══════════════════════════════════════════════
//  CountdownTimer
// ══════════════════════════════════════════════
const CountdownTimer = memo(({ targetMs, style }) => {
  const [label, setLabel] = useState('');
  useEffect(() => {
    const tick = () => setLabel(formatCountdown(targetMs - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetMs]);
  return <Text style={style}>{label}</Text>;
});

// ══════════════════════════════════════════════
//  TournamentBanner — البانر الرئيسي
// ══════════════════════════════════════════════
const TournamentBanner = memo(({
  tournament, top3, userRank, userScore,
  isJoined, onJoin, onOpenPopup, theme,
}) => {
  if (!tournament) return null;

  const isScoringClosed = tournament.isScoringClosed;

  return (
    <ThemedCard
      onPress={onOpenPopup}
      style={styles.banner}
      borderColor={isScoringClosed ? '#f8717155' : '#f59e0b55'}
    >
      {/* صف الأعلى: أيقونة + معلومات + عداد */}
      <View style={styles.bannerTop}>
        <View style={styles.bannerTrophyWrap}>
          <Text style={styles.bannerTrophyEmoji}>🏆</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.bannerTitle, { color: isScoringClosed ? '#f87171' : '#f59e0b' }]}>
            {isScoringClosed ? '🔴 البطولة على وشك الانتهاء' : `بطولة الأسبوع ${tournament.weekNumber ?? ''}`}
          </Text>
          <Text style={[styles.bannerTimerLabel, { color: theme.textSecondary }]}>
            {isScoringClosed ? '⏰ تنتهي بعد:' : '⏰ تنتهي البطولة الحالية بعد:'}
          </Text>
          <CountdownTimer
            targetMs={tournament.endsAt}
            style={[styles.bannerTimerVal, { color: isScoringClosed ? '#f87171' : '#f59e0b' }]}
          />
        </View>
        <View style={[styles.bannerTapHint, { backgroundColor: theme.bgElevated }]}>
          <Text style={[styles.bannerTapText, { color: theme.textMuted }]}>التفاصيل</Text>
        </View>
      </View>

      {/* أعمدة top3 */}
      {top3.length > 0 && (
        <View style={styles.bannerTop3Row}>
          {/* المركز الثاني */}
          {top3[1] && (
            <View style={styles.bannerPlayerCol}>
              <View style={[styles.bannerBar, { height: 22, backgroundColor: '#9ca3af55' }]} />
              <Text style={styles.bannerMedal}>🥈</Text>
              <Text style={[styles.bannerPlayerName, { color: theme.textSecondary }]} numberOfLines={1}>
                {top3[1].name}
              </Text>
              <Text style={styles.bannerPlayerScore}>{(top3[1].score ?? 0).toLocaleString()}</Text>
            </View>
          )}
          {/* المركز الأول */}
          {top3[0] && (
            <View style={[styles.bannerPlayerCol, { marginBottom: -4 }]}>
              <View style={[styles.bannerBar, { height: 32, backgroundColor: '#f59e0b88' }]} />
              <Text style={styles.bannerMedal}>👑</Text>
              <Text style={[styles.bannerPlayerName, { color: '#f59e0b', fontWeight: '800' }]} numberOfLines={1}>
                {top3[0].name}
              </Text>
              <Text style={[styles.bannerPlayerScore, { color: '#f59e0b' }]}>
                {(top3[0].score ?? 0).toLocaleString()}
              </Text>
            </View>
          )}
          {/* المركز الثالث */}
          {top3[2] && (
            <View style={styles.bannerPlayerCol}>
              <View style={[styles.bannerBar, { height: 16, backgroundColor: '#b4530955' }]} />
              <Text style={styles.bannerMedal}>🥉</Text>
              <Text style={[styles.bannerPlayerName, { color: theme.textSecondary }]} numberOfLines={1}>
                {top3[2].name}
              </Text>
              <Text style={styles.bannerPlayerScore}>{(top3[2].score ?? 0).toLocaleString()}</Text>
            </View>
          )}
        </View>
      )}

      {/* صف الاشتراك */}
      <View style={styles.bannerJoinRow}>
        {isJoined ? (
          <View style={[styles.bannerJoinedBtn, { backgroundColor: theme.bgElevated, borderColor: '#f59e0b33' }]}>
            <Text style={[styles.bannerJoinedText, { color: '#a06a20' }]}>
              ✅ أنت في البطولة {userRank ? `— مركزك: ${userRank}` : ''}
            </Text>
          </View>
        ) : (
          <ThemedButton onPress={onJoin} label='⚡ شارك في البطولة' variant='primary' size='small' style={styles.bannerJoinBtn} />
        )}
        <ThemedButton onPress={onOpenPopup} label='🏅' variant='ghost' size='small' style={styles.bannerLeaderBtn} />
      </View>
    </ThemedCard>
  );
});

// ══════════════════════════════════════════════
//  TournamentPopup — popup كامل
// ══════════════════════════════════════════════
const TournamentPopup = memo(({
  visible, tournament, leaderboard, pastWinners,
  nextTournamentStartsAt, userId, userRank, userScore,
  isJoined, onJoin, onClose, theme,
}) => {
  const [showPast, setShowPast] = useState(false);

  if (!visible) return null;

  const isScoringClosed = tournament?.isScoringClosed;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.popupOverlay}>
        <View style={[styles.popupBox, { backgroundColor: 'transparent', borderColor: theme.border }]}>

          {/* هيدر popup */}
          <View style={[styles.popupHeader, { borderBottomColor: theme.divider }]}>
            <Text style={styles.popupTrophy}>🏆</Text>
            <Text style={[styles.popupTitle, { color: '#f59e0b' }]}>
              {tournament ? `بطولة الأسبوع ${tournament.weekNumber ?? ''}` : 'البطولة'}
            </Text>
            {tournament && (
              <View style={styles.popupTimerBox}>
                <Text style={[styles.popupTimerLabel, { color: theme.textMuted }]}>
                  {isScoringClosed ? '⏰ تنتهي بعد:' : '⏰ ينتهي الحساب بعد:'}
                </Text>
                <CountdownTimer
                  targetMs={isScoringClosed ? tournament.endsAt : tournament.scoringEndsAt}
                  style={[styles.popupTimerVal, { color: isScoringClosed ? '#f87171' : '#f59e0b' }]}
                />
              </View>
            )}
            {isScoringClosed && (
              <View style={[styles.popupScoringNote, { backgroundColor: '#f8717118', borderColor: '#f8717144' }]}>
                <Text style={{ color: '#f87171', fontSize: 12, fontWeight: '700', textAlign: 'center' }}>
                  🔴 انتهى وقت الحساب — اللعب يستمر بدون تسجيل نقاط
                </Text>
              </View>
            )}
            <ExitButton onPress={onClose} />
          </View>

          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>

            {/* الجوائز */}
            <View style={styles.popupSection}>
              <Text style={[styles.popupSectionTitle, { color: theme.textMuted }]}>🎁 الجوائز</Text>
              {[
                { label: '🥇 المركز الأول',     detail: '2,500 توكن' },
                { label: '🥈 المركز الثاني',    detail: '1,500 توكن' },
                { label: '🥉 المركز الثالث',    detail: '1,000 توكن' },
                { label: '4️⃣ - 🔟 المراكز',   detail: '500 توكن' },
                { label: '11 - 20 المراكز',     detail: '250 توكن' },
              ].map((p, i) => (
                <View key={i} style={[styles.prizeRow, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                  <Text style={[styles.prizeLabel, { color: theme.textPrimary }]}>{p.label}</Text>
                  <Text style={[styles.prizeDetail, { color: '#f59e0b' }]}>{p.detail}</Text>
                </View>
              ))}
            </View>

            {/* الصدارة */}
            <View style={styles.popupSection}>
              <Text style={[styles.popupSectionTitle, { color: theme.textMuted }]}>🏅 الصدارة — أفضل 20</Text>
              {leaderboard.length === 0 && (
                <Text style={[styles.emptyText, { color: theme.textMuted }]}>لا يوجد لاعبون بعد</Text>
              )}
              {leaderboard.map((entry, i) => {
                const isMe = entry.userId === userId;
                return (
                  <View
                    key={entry.userId ?? i}
                    style={[
                      styles.lbRow,
                      { backgroundColor: theme.bgCard, borderColor: theme.border },
                      isMe && { backgroundColor: '#f59e0b15', borderColor: '#f59e0b44' },
                    ]}
                  >
                    <Text style={[styles.lbRank, { color: i === 0 ? '#f59e0b' : i === 1 ? '#9ca3af' : i === 2 ? '#b45309' : theme.textMuted }]}>
                      {i === 0 ? '👑' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                    </Text>
                    <Text style={[styles.lbName, { color: isMe ? '#f59e0b' : theme.textPrimary }]} numberOfLines={1}>
                      {entry.name}{isMe ? ' 🫵' : ''}
                    </Text>
                    <Text style={[styles.lbScore, { color: '#f59e0b' }]}>
                      {(entry.score ?? 0).toLocaleString()}
                    </Text>
                  </View>
                );
              })}
              {/* مركزك إذا لم تظهر في الـ20 */}
              {userRank && userRank > 20 && (
                <>
                  <Text style={[styles.lbDots, { color: theme.textMuted }]}>· · · · · ·</Text>
                  <View style={[styles.lbRow, { backgroundColor: '#f59e0b15', borderColor: '#f59e0b44' }]}>
                    <Text style={[styles.lbRank, { color: '#f5c518' }]}>{userRank}</Text>
                    <Text style={[styles.lbName, { color: '#f5c518' }]}>أنت 🫵</Text>
                    <Text style={[styles.lbScore, { color: '#f59e0b' }]}>
                      {(userScore ?? 0).toLocaleString()}
                    </Text>
                  </View>
                </>
              )}
            </View>

            {/* عداد البطولة القادمة */}
            {nextTournamentStartsAt && (
              <View style={[styles.nextTourBox, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                <Text style={[styles.nextTourLabel, { color: theme.textMuted }]}>⏳ البطولة القادمة تبدأ بعد</Text>
                <CountdownTimer
                  targetMs={nextTournamentStartsAt}
                  style={[styles.nextTourVal, { color: '#8b5cf6' }]}
                />
              </View>
            )}

            {/* زر الفائزون السابقون */}
            <ThemedCard onPress={() => setShowPast(true)} style={styles.pastBtn}>
              <Text style={{ fontSize: 20 }}>🏅</Text>
              <Text style={[styles.pastBtnText, { color: theme.textSecondary }]}>الفائزون السابقون</Text>
              <Text style={{ color: theme.textMuted, fontSize: 16 }}>←</Text>
            </ThemedCard>

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* زر الاشتراك داخل الـ popup */}
          <View style={[styles.popupFooter, { borderTopColor: theme.divider }]}>
            {isJoined ? (
              <View style={[styles.popupJoinedBtn, { backgroundColor: theme.bgCard, borderColor: '#f59e0b33' }]}>
                <Text style={{ color: '#a06a20', fontWeight: '700', fontSize: 13 }}>
                  ✅ أنت في البطولة {userRank ? `— مركزك: ${userRank}` : ''}
                </Text>
              </View>
            ) : (
              <ThemedButton onPress={() => { onJoin(); onClose(); }} label='⚡ شارك في البطولة' variant='primary' size='medium' style={styles.popupJoinBtn} />
            )}
          </View>
        </View>
      </View>

      {/* Sub-popup: الفائزون السابقون */}
      <Modal visible={showPast} transparent animationType="slide" onRequestClose={() => setShowPast(false)}>
        <View style={styles.popupOverlay}>
          <View style={[styles.popupBox, { backgroundColor: 'transparent', borderColor: theme.border }]}>
            <View style={[styles.pastHeader, { borderBottomColor: theme.divider }]}>
              <ExitButton onPress={() => setShowPast(false)} size={32} />
              <Text style={[styles.pastTitle, { color: theme.textPrimary }]}>🏅 الفائزون السابقون</Text>
              <View style={{ width: 32 }} />
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1, padding: 14 }}>
              {pastWinners.length === 0 && (
                <Text style={[styles.emptyText, { color: theme.textMuted }]}>لا توجد بطولات سابقة</Text>
              )}
              {pastWinners.map((pw) => (
                <View key={pw.id} style={{ marginBottom: 16 }}>
                  <View style={styles.pastWeekHeader}>
                    <Text style={[styles.pastWeekNum, { color: '#8b5cf6' }]}>
                      بطولة الأسبوع {pw.weekNumber}
                    </Text>
                    <Text style={[styles.pastWeekDate, { color: theme.textMuted }]}>
                      {pw.endsAt ? new Date(pw.endsAt).toLocaleDateString('ar-SA') : ''}
                    </Text>
                  </View>
                  {(pw.winners ?? []).map((w) => (
                    <View
                      key={w.userId ?? w.rank}
                      style={[styles.lbRow, { backgroundColor: theme.bgCard, borderColor: theme.border }]}
                    >
                      <Text style={styles.lbRank}>
                        {w.rank === 1 ? '🥇' : w.rank === 2 ? '🥈' : '🥉'}
                      </Text>
                      <Text style={[styles.lbName, { color: theme.textPrimary }]}>{w.name}</Text>
                      <Text style={[styles.lbScore, { color: '#f59e0b' }]}>
                        {(w.score ?? 0).toLocaleString()}
                      </Text>
                    </View>
                  ))}
                </View>
              ))}
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Modal>
  );
});

// ══════════════════════════════════════════════
//  GameIntroOverlay — شاشة تمهيدية موحّدة لكل نمط
//  تعرض: أيقونة + عنوان + شرح مختصر + زر ابدأ.
//  الخصم يحدث عند ضغط "ابدأ" (يُمرَّر عبر onStart).
// ══════════════════════════════════════════════
const GameIntroOverlay = memo(({ visible, emoji, title, desc, heartCost = 1, accent, onStart, onClose, theme, t }) => {
  if (!visible) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={introStyles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[introStyles.card, { backgroundColor: theme.bgCard, borderColor: accent || theme.accentBorder }]}>
          <View style={introStyles.closeRow}>
            <ExitButton onPress={onClose} size={32} />
          </View>
          <Text style={introStyles.emoji}>{emoji}</Text>
          <Text style={[introStyles.title, { color: accent || theme.accent }]}>{title}</Text>
          <Text style={[introStyles.desc, { color: theme.textSecondary || theme.textMuted }]}>{desc}</Text>
          <View style={[introStyles.costPill, { backgroundColor: (accent || theme.accent) + '1a', borderColor: (accent || theme.accent) + '55' }]}>
            <Text style={[introStyles.costText, { color: accent || theme.accent }]}>
              {t('intro.heartCost', { n: heartCost })}
            </Text>
          </View>
          <ThemedButton
            onPress={onStart}
            label={t('intro.startGame')}
            variant="primary"
            size="large"
            style={{ width: '100%', marginTop: 18 }}
          />
        </View>
      </View>
    </Modal>
  );
});

const introStyles = StyleSheet.create({
  overlay:  { flex: 1, backgroundColor: '#000000d0', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card:     { width: '100%', maxWidth: 460, borderRadius: 28, borderWidth: 1.5, padding: 26, alignItems: 'center' },
  closeRow: { width: '100%', alignItems: 'flex-end', marginBottom: 4 },
  emoji:    { fontSize: 54, marginBottom: 8 },
  title:    { fontSize: 24, fontWeight: '800', textAlign: 'center', marginBottom: 12 },
  desc:     { fontSize: 15, lineHeight: 23, textAlign: 'center', marginBottom: 18 },
  costPill: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 14, borderWidth: 1 },
  costText: { fontSize: 14, fontWeight: '700' },
});

// ══════════════════════════════════════════════
//  ModeCard
// ══════════════════════════════════════════════
const ModeCard = memo(({ emoji, title, subtitle, heartCost = 1, costColor, costBg, borderColor,
                          disabled, onPress, cardBg, badge, theme }) => (
  <TouchableOpacity
    onPress={disabled ? undefined : onPress}
    activeOpacity={disabled ? 1 : 0.75}
    style={[
      styles.modeCard,
      { backgroundColor: cardBg || 'transparent', borderColor: borderColor || costColor + '40' },
      disabled && styles.modeDisabled,
    ]}
  >
    {/* أيقونة يمين */}
    <Text style={styles.modeEmoji}>{emoji}</Text>

    {/* نص وسط */}
    <View style={styles.modeTextBlock}>
      <View style={styles.modeTitleRow}>
        <Text style={[styles.modeTitle, { color: costColor }]}>{title}</Text>
        {badge ? (
          <View style={[styles.modeBadge, { backgroundColor: costColor + '33' }]}>
            <Text style={[styles.modeBadgeText, { color: costColor }]}>{badge}</Text>
          </View>
        ) : null}
      </View>
      <Text style={[styles.modeSubtitle, { color: '#6a6a90' }]} numberOfLines={2}>{subtitle}</Text>
    </View>

    {/* شارة القلوب يسار */}
    <View style={[styles.modeCostBadge, { backgroundColor: costBg }]}>
      <Text style={[styles.modeCost, { color: costColor }]}>{heartCost}</Text>
      <HeartIcon size={14} filled glow={false} />
    </View>
  </TouchableOpacity>
));

// ══════════════════════════════════════════════
//  SubOption
// ══════════════════════════════════════════════
const SubOption = memo(({ emoji, title, heartCost, ranked, disabled, onPress, onInfo, theme }) => (
  <TouchableOpacity
    onPress={disabled ? undefined : onPress}
    activeOpacity={disabled ? 1 : 0.75}
    style={[
      styles.subOption,
      { backgroundColor: theme.bgCard, borderColor: theme.borderCard },
      disabled && { opacity: 0.4 },
    ]}
  >
    {/* أيقونة */}
    <Text style={styles.subEmoji}>{emoji}</Text>

    {/* معلومات */}
    <View style={styles.subTextBlock}>
      <View style={styles.subTitleRow}>
        <Text style={[styles.subTitle, { color: theme.accent }]}>{title}</Text>
        {ranked && (
          <View style={[styles.rankedBadge, { backgroundColor: '#f59e0b33' }]}>
            <Text style={[styles.rankedText, { color: '#f59e0b' }]}>🏆 بطولة</Text>
          </View>
        )}
      </View>
      {/* شارة القلوب */}
      <View style={[styles.subCostBadge, { backgroundColor: theme.accentSoft, borderColor: theme.accentBorder }]}>
        <Text style={[styles.subCostText, { color: theme.accent }]}>{heartCost}</Text>
        <HeartIcon size={13} filled glow={false} />
      </View>
    </View>

    {/* زر معلومات صغير */}
    <TouchableOpacity onPress={onInfo} hitSlop={HIT_SLOP} style={styles.infoBtn}>
      <Text style={[styles.infoBtnText, { color: theme.textMuted }]}>ⓘ</Text>
    </TouchableOpacity>
  </TouchableOpacity>
));

// ══════════════════════════════════════════════
//  BottomSheet
// ══════════════════════════════════════════════
const BottomSheet = memo(({ visible, title, hearts, children, onClose, theme }) => {
  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, friction: 9, tension: 80, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 300, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.sheetOverlay, { opacity: fadeAnim }]} />
      </TouchableWithoutFeedback>
      <Animated.View style={[styles.sheet, { backgroundColor: theme.bgCard, transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.sheetHandle} />
        <Text style={[styles.sheetTitle, { color: theme.textPrimary }]}>{title}</Text>
        <Text style={[styles.sheetTokens, { color: theme.textMuted }]}>قلوبك: {hearts} ❤️</Text>
        <View style={styles.sheetOptions}>{children}</View>
        <ThemedButton onPress={onClose} label='إلغاء' variant='ghost' size='medium' style={styles.sheetCancel} />
      </Animated.View>
    </Modal>
  );
});

// ══════════════════════════════════════════════
//  InfoTooltip
// ══════════════════════════════════════════════
const MODE_INFO = {
  ranked_random: {
    emoji: '🎲', title: 'عشوائي',
    desc: 'يبحث عن خصم متاح تلقائياً. فئات عشوائية لكلا اللاعبين.',
    ranked: true,
  },
  ranked_friend: {
    emoji: '👥', title: 'مع صديق',
    desc: 'أنشئ غرفة وشارك الكود مع صديقك. الفئات عشوائية.',
    ranked: true,
  },
  ranked_solo: {
    emoji: '⚡', title: 'فردي مصنّف',
    desc: 'فئات عشوائية تُختار تلقائياً. نقاطك تُسجّل في الترتيب.',
    ranked: true,
  },
  friendly_match: {
    emoji: '🤝', title: 'مباراة ودية',
    desc: 'أنشئ غرفة وشارك الكود مع صديقك. المضيف يختار الفئات. لعبة ودية — لا تُحتسب.',
    ranked: false,
  },
  friendly_solo: {
    emoji: '🎮', title: 'لعب حر',
    desc: 'اختر فئاتك بحرية وتدرّب بدون ضغط. لا يُحتسب في أي ترتيب.',
    ranked: false,
  },
};

const InfoTooltip = memo(({ visible, info, onClose, theme }) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <TouchableWithoutFeedback onPress={onClose}>
      <View style={styles.tooltipOverlay}>
        <TouchableWithoutFeedback>
          <View style={[styles.tooltipBox, { backgroundColor: theme.bgCard, borderColor: theme.borderCard }]}>
            <Text style={styles.tooltipEmoji}>{info?.emoji}</Text>
            <Text style={[styles.tooltipTitle, { color: theme.accent }]}>{info?.title}</Text>
            <Text style={[styles.tooltipDesc, { color: theme.textSecondary }]}>{info?.desc}</Text>
            {info?.ranked === true && (
              <View style={[styles.tooltipRanked, { backgroundColor: '#f59e0b22', borderColor: '#f59e0b44' }]}>
                <Text style={{ color: '#f59e0b', fontSize: 13, fontWeight: '700' }}>🏆 يُحتسب في البطولة</Text>
              </View>
            )}
            {info?.ranked === false && (
              <View style={[styles.tooltipRanked, { backgroundColor: '#6a6a9022', borderColor: '#6a6a9044' }]}>
                <Text style={{ color: '#6a6a90', fontSize: 13, fontWeight: '700' }}>لا يُحتسب في البطولة</Text>
              </View>
            )}
            <ThemedButton onPress={onClose} label='فهمت' variant='primary' size='medium' style={styles.tooltipClose} />
          </View>
        </TouchableWithoutFeedback>
      </View>
    </TouchableWithoutFeedback>
  </Modal>
));

// ══════════════════════════════════════════════
//  الشاشة الرئيسية
// ══════════════════════════════════════════════
export default function KnowledgeArenaScreen({
  tokens, setTokens, setScreen,
  showTokenModal, setShowTokenModal, highScore,
  hearts = 0, tryStartGame,
  setOnlineRoomMode,
  currentUser,
  onOpenHeartsModal,
}) {
  const { theme } = useTheme();
  const t = useT();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slide1   = useRef(new Animated.Value(50)).current;
  const slide2   = useRef(new Animated.Value(50)).current;
  const slide3   = useRef(new Animated.Value(50)).current;

  // ── حالة الشاشات ──
  const [leaveVisible, setLeaveVisible] = useState(false);
  const [showRankedSheet,   setShowRankedSheet]   = useState(false);
  const [showFriendlySheet, setShowFriendlySheet] = useState(false);
  const [tooltip,           setTooltip]           = useState(null);
  const [showPopup,         setShowPopup]         = useState(false);
  // الشاشة التمهيدية: { emoji, title, desc, heartCost, accent, target, cost, extraAction }
  const [introMode,         setIntroMode]         = useState(null);

  // ── حالة البطولة ──
  const [tournament,          setTournament]          = useState(null);
  const [leaderboard,         setLeaderboard]         = useState([]);
  const [pastWinners,         setPastWinners]         = useState([]);
  const [nextTournamentMs,    setNextTournamentMs]    = useState(null);
  const [top3,                setTop3]                = useState([]);
  const [isJoined,            setIsJoined]            = useState(false);
  const [userRank,            setUserRank]            = useState(null);
  const [userScore,           setUserScore]           = useState(0);
  const [tournamentLoading,   setTournamentLoading]   = useState(true);

  const userId   = currentUser?.uid ?? currentUser?.id ?? null;
  const userName = currentUser?.name ?? 'لاعب';

  // ── تحميل البطولة ──
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setLeaveVisible(true);
      return true;
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const unsub = subscribeToActiveTournament((tour) => {
      setTournament(tour);
      setTournamentLoading(false);
    });
    return () => unsub();
  }, []);

  // ── تحميل الصدارة عند وجود بطولة ──
  useEffect(() => {
    if (!tournament?.id) { setLeaderboard([]); setTop3([]); return; }

    const unsub = subscribeToLeaderboard(tournament.id, (scores) => {
      setLeaderboard(scores);
      setTop3(scores.slice(0, 3));
    });

    // هل اللاعب مشترك؟
    if (userId) {
      isUserInTournament(tournament.id, userId).then(setIsJoined);
      getUserTournamentScore(tournament.id, userId).then(({ rank, score }) => {
        setUserRank(rank);
        setUserScore(score);
      });
    }

    return () => unsub();
  }, [tournament?.id, userId]);

  // ── تحميل popup data عند فتحه ──
  useEffect(() => {
    if (!showPopup) return;
    getPastWinners(10).then(setPastWinners);
    getNextTournamentStartTime().then((res) => {
      if (res?.startsAt) setNextTournamentMs(res.startsAt);
    });
  }, [showPopup]);

  // ── الانيميشن ──
  useEffect(() => {
    Animated.stagger(70, [
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.spring(slide1, { toValue: 0, friction: 8, tension: 70, useNativeDriver: true }),
      ]),
      Animated.spring(slide2, { toValue: 0, friction: 8, tension: 70, useNativeDriver: true }),
      Animated.spring(slide3, { toValue: 0, friction: 8, tension: 70, useNativeDriver: true }),
    ]).start();
  }, []);

  const getLang = useCallback(async () => {
    const exp = await AsyncStorage.getItem(EXPERIENCE_KEY);
    return exp === EXPERIENCES.ARABIC ? 'ar' : 'en';
  }, []);

  // ── الاشتراك في البطولة ──
  // يشترك اللاعب عند لعبه أول مرة في وضع مصنَّف
  const joinTournamentIfNeeded = useCallback(async (scoreToAdd = 0) => {
    if (!tournament?.id || !tournament.isActive || !userId) return;
    if (scoreToAdd > 0) {
      const result = await addTournamentScore(tournament.id, userId, userName, scoreToAdd);
      if (result.success) {
        setIsJoined(true);
        setUserScore(result.newScore);
      }
    }
  }, [tournament, userId, userName]);

  // ── كلاسيك — قلبان — الخصم بعد إنشاء اللعبة (لا قبل) ──
  const handleTeams = useCallback(() => {
    if (tryStartGame) tryStartGame('setup', 2, null, true); // deferred: الخصم في setup
    else setScreen('setup');
  }, [tryStartGame, setScreen]);

  // ── تصنيف: عشوائي → شاشة تمهيدية، الخصم عند بدء اللعبة فعلاً ──
  const handleRankedRandom = useCallback(async () => {
    setShowRankedSheet(false);
    const lang = await getLang();
    setIntroMode({
      emoji: '🎲',
      title: t('intro.randomTitle'),
      desc:  t('intro.randomDesc'),
      heartCost: 1,
      accent: '#34d399',
      target: 'online',
      cost: 1,
      deferred: true, // online يخصم عبر onGameReady عند إيجاد خصم
      onlineMode: 'random',
      params: { roomType: 'public', lang, ranked: true },
    });
  }, [getLang, t]);

  // ── تصنيف: مع صديق ── (شاشة اختيار/كود، الخصم عند بدء اللعبة لكل لاعب)
  const handleRankedFriend = useCallback(async () => {
    setShowRankedSheet(false);
    if (setOnlineRoomMode) setOnlineRoomMode('select');
    if (tryStartGame) tryStartGame('online', 1, null, true);
    else setScreen('online');
  }, [tryStartGame, setScreen, setOnlineRoomMode]);

  // ── تصنيف: فردي مصنّف → شاشة تمهيدية ثم بدء ──
  const handleRankedSolo = useCallback(() => {
    setShowRankedSheet(false);
    setIntroMode({
      emoji: '⚡',
      title: t('intro.soloRankedTitle'),
      desc:  t('intro.soloRankedDesc'),
      heartCost: 1,
      accent: '#34d399',
      target: 'soloTournament',
      cost: 1,
    });
  }, [t]);

  // ── ودية: مباراة ودية ── (شاشة اختيار/كود، الخصم عند بدء اللعبة لكل لاعب)
  const handleFriendlyMatch = useCallback(async () => {
    setShowFriendlySheet(false);
    if (setOnlineRoomMode) setOnlineRoomMode('select');
    if (tryStartGame) tryStartGame('online', 1, null, true);
    else setScreen('online');
  }, [tryStartGame, setScreen, setOnlineRoomMode]);

  // ── ودية: لعب حر → شاشة تمهيدية ثم بدء ──
  const handleFriendlySolo = useCallback(() => {
    setShowFriendlySheet(false);
    setIntroMode({
      emoji: '🎮',
      title: t('intro.freeTitle'),
      desc:  t('intro.freeDesc'),
      heartCost: 1,
      accent: '#93c5fd',
      target: 'solo',
      cost: 1,
    });
  }, [t]);

  const showInfo = useCallback((key) => setTooltip(key), []);
  const hideInfo = useCallback(() => setTooltip(null), []);

  // بدء اللعبة من الشاشة التمهيدية.
  //  • deferred=false → الخصم هنا (الأنماط الفردية: solo/soloTournament).
  //  • deferred=true  → بلا خصم الآن؛ online يخصم لكل لاعب عند بدء اللعبة فعلاً.
  const handleIntroStart = useCallback(() => {
    if (!introMode) return;
    const { target, cost, deferred, onlineMode } = introMode;
    setIntroMode(null);
    if (onlineMode && setOnlineRoomMode) setOnlineRoomMode(onlineMode);
    if (tryStartGame) tryStartGame(target, cost, null, !!deferred);
    else setScreen(target);
  }, [introMode, tryStartGame, setScreen, setOnlineRoomMode]);

  // انتهى وقت الحساب: التصنيف يستمر بدون نقاط (نُبقي الأزرار نشطة)
  const rankingDisabled = false; // دائماً مفعّل

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.statusBg} />

      {/* هيدر */}
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <ThemedButton onPress={() => setScreen('home')} label={t('common.backArrow')} variant='ghost' size='small' style={styles.backBtn} />
        <View style={styles.headerCenter}>
          <Text style={styles.headerEmoji}>🧠</Text>
          <Text style={[styles.headerTitle, { color: theme.accent }]}>{t('knowledge.title')}</Text>
        </View>
        <View style={{ width: 40 }} />
      </Animated.View>

      {/* بانر البطولة */}
      {!tournamentLoading && tournament && (
        <Animated.View style={{ opacity: fadeAnim }}>
          <TournamentBanner
            tournament={tournament}
            top3={top3}
            userRank={userRank}
            userScore={userScore}
            isJoined={isJoined}
            onJoin={() => setShowRankedSheet(true)}
            onOpenPopup={() => setShowPopup(true)}
            theme={theme}
          />
        </Animated.View>
      )}

      <Animated.Text style={[styles.desc, { opacity: fadeAnim, color: theme.textMuted }]}>
        {t('knowledge.chooseMode')}
      </Animated.Text>

      {/* الكروت الثلاثة */}
      <View style={styles.modes}>

        {/* تصنيف */}
        <Animated.View style={{ transform: [{ translateY: slide1 }], opacity: fadeAnim }}>
          <ModeCard
            emoji="🎯"
            title={t('knowledge.rankedTitle')}
            subtitle={t('knowledge.rankedDesc')}
            heartCost={1}
            costColor="#34d399"
            costBg="#10b98122"
            borderColor="#10b98140"
            cardBg={theme.bgCard}
            badge={t('knowledge.rankedBadge')}
            onPress={() => setShowRankedSheet(true)}
            theme={theme}
          />
        </Animated.View>

        {/* ودية */}
        <Animated.View style={{ transform: [{ translateY: slide2 }], opacity: fadeAnim }}>
          <ModeCard
            emoji="🤝"
            title={t('knowledge.friendlyTitle')}
            subtitle={t('knowledge.friendlyDesc')}
            heartCost={1}
            costColor="#93c5fd"
            costBg="#3b82f622"
            borderColor="#3b82f640"
            cardBg={theme.bgCard}
            badge={t('knowledge.friendlyBadge')}
            onPress={() => setShowFriendlySheet(true)}
            theme={theme}
          />
        </Animated.View>

        {/* كلاسيكي */}
        <Animated.View style={{ transform: [{ translateY: slide3 }], opacity: fadeAnim }}>
          <ModeCard
            emoji="⚔️"
            title={t('knowledge.teamsTitle')}
            subtitle={t('knowledge.teamsDesc')}
            heartCost={2}
            costColor={theme.accent}
            costBg={theme.accentSoft}
            borderColor={theme.accentBorder}
            cardBg={theme.bgCard}
            onPress={handleTeams}
            theme={theme}
          />
        </Animated.View>
      </View>

      {/* رقم قياسي */}
      {highScore > 0 && (
        <Animated.View style={[styles.highScoreBar, { opacity: fadeAnim, backgroundColor: theme.bgCard, borderColor: theme.accentBorder }]}>
          <Text style={[styles.highScoreText, { color: theme.accent }]}>
            {t('knowledge.highScore', { n: highScore })}
          </Text>
        </Animated.View>
      )}

      {/* شريط القلوب والتوكنز */}
      <Animated.View style={[styles.tokenBar, { opacity: fadeAnim }]}>
        {/* القلوب */}
        <ThemedCard onPress={onOpenHeartsModal} style={styles.tokenHalf}>
          <Text style={[styles.tokenText, { color: theme.accent }]}>❤️ {hearts}</Text>
          <Text style={[styles.tokenAdd, { color: theme.accent }]}>+</Text>
        </ThemedCard>
        {/* التوكنز */}
        <ThemedCard onPress={() => setShowTokenModal(true)} style={styles.tokenHalf}>
          <Text style={[styles.tokenText, { color: theme.accent }]}>🪙 {tokens}</Text>
          <Text style={[styles.tokenAdd, { color: theme.accent }]}>{t('knowledge.addCoins')}</Text>
        </ThemedCard>
      </Animated.View>

      {/* Bottom Sheet: تصنيف */}
      <BottomSheet
        visible={showRankedSheet}
        title="🎯 اختر وضع التصنيف"
        hearts={hearts}
        onClose={() => setShowRankedSheet(false)}
        theme={theme}
      >
        <SubOption
          emoji="🎲" title="عشوائي" heartCost={1}
          ranked={true}
          disabled={hearts < 1}
          onPress={handleRankedRandom}
          onInfo={() => showInfo('ranked_random')}
          theme={theme}
        />
        <SubOption
          emoji="👥" title="مع صديق" heartCost={1}
          ranked={true}
          disabled={hearts < 1}
          onPress={handleRankedFriend}
          onInfo={() => showInfo('ranked_friend')}
          theme={theme}
        />
        <SubOption
          emoji="⚡" title="فردي" heartCost={1}
          ranked={true}
          disabled={hearts < 1}
          onPress={handleRankedSolo}
          onInfo={() => showInfo('ranked_solo')}
          theme={theme}
        />
      </BottomSheet>

      {/* Bottom Sheet: ودية */}
      <BottomSheet
        visible={showFriendlySheet}
        title="🤝 اختر وضع الودية"
        hearts={hearts}
        onClose={() => setShowFriendlySheet(false)}
        theme={theme}
      >
        <SubOption
          emoji="🤝" title="مباراة ودية" heartCost={1}
          ranked={false}
          disabled={hearts < 1}
          onPress={handleFriendlyMatch}
          onInfo={() => showInfo('friendly_match')}
          theme={theme}
        />
        <SubOption
          emoji="🎮" title="لعب حر" heartCost={1}
          ranked={false}
          disabled={hearts < 1}
          onPress={handleFriendlySolo}
          onInfo={() => showInfo('friendly_solo')}
          theme={theme}
        />
      </BottomSheet>

      {/* Tooltip */}
      <InfoTooltip
        visible={!!tooltip}
        info={tooltip ? MODE_INFO[tooltip] : null}
        onClose={hideInfo}
        theme={theme}
      />

      {/* Popup البطولة */}
      <TournamentPopup
        visible={showPopup}
        tournament={tournament}
        leaderboard={leaderboard}
        pastWinners={pastWinners}
        nextTournamentStartsAt={nextTournamentMs}
        userId={userId}
        userRank={userRank}
        userScore={userScore}
        isJoined={isJoined}
        onJoin={() => setShowRankedSheet(true)}
        onClose={() => setShowPopup(false)}
        theme={theme}
      />

      {/* TokenModal */}
      <TokenModal
        visible={showTokenModal}
        onClose={() => setShowTokenModal(false)}
        tokens={tokens}
        onAddTokens={(amount) => setTokens(prev => prev + amount)}
      />
      <LeaveModal
        visible={leaveVisible}
        onCancel={() => setLeaveVisible(false)}
        onConfirm={() => { setLeaveVisible(false); setScreen('home'); }}
      />

      {/* الشاشة التمهيدية الموحّدة للأنماط الفردية */}
      <GameIntroOverlay
        visible={!!introMode}
        emoji={introMode?.emoji}
        title={introMode?.title}
        desc={introMode?.desc}
        heartCost={introMode?.heartCost ?? 1}
        accent={introMode?.accent}
        onStart={handleIntroStart}
        onClose={() => setIntroMode(null)}
        theme={theme}
        t={t}
      />
    </View>
  );
}

// ══════════════════════════════════════════════
//  Styles
// ══════════════════════════════════════════════
const styles = StyleSheet.create({
  container:        { flex: 1, paddingHorizontal: 20, paddingTop: 56, paddingBottom: 24 },
  header:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  backBtn:          { width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  backText:         { fontSize: 20, fontWeight: '700' },
  headerCenter:     { alignItems: 'center', gap: 4 },
  headerEmoji:      { fontSize: 28 },
  headerTitle:      { fontSize: 20, fontWeight: '900' },
  desc:             { fontSize: 14, textAlign: 'center', marginBottom: 8 },
  modes:            { gap: 12, flex: 1, justifyContent: 'center' },
  modeCard:         { flexDirection: 'row', alignItems: 'center', borderRadius: 20, borderWidth: 1.5, padding: 16, gap: 12 },
  modeDisabled:     { opacity: 0.45 },
  modeTextBlock:    { flex: 1, gap: 3 },
  modeTitleRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  modeEmoji:        { fontSize: 30, flexShrink: 0 },
  modeTitle:        { fontSize: 16, fontWeight: '800' },
  modeSubtitle:     { fontSize: 11 },
  modeCostBadge:    { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 10, flexShrink: 0 },
  modeCost:         { fontSize: 12, fontWeight: '700' },
  modeBadge:        { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  modeBadgeText:    { fontSize: 10, fontWeight: '800' },
  highScoreBar:     { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 14, borderWidth: 1, alignItems: 'center', marginBottom: 8 },
  highScoreText:    { fontSize: 13, fontWeight: '700' },

  // شريط القلوب + التوكنز
  tokenBar:         { flexDirection: 'row', gap: 8 },
  tokenHalf:        { flex: 1, borderWidth: 1, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tokenText:        { fontSize: 13, fontWeight: '700' },
  tokenAdd:         { fontSize: 13, fontWeight: '800' },

  // بانر البطولة
  banner:           { borderRadius: 18, borderWidth: 1.5, padding: 12, gap: 8, marginBottom: 8 },
  bannerTop:        { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  bannerTrophyWrap: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#f59e0b22', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#f59e0b44', flexShrink: 0 },
  bannerTrophyEmoji:{ fontSize: 24 },
  bannerTitle:      { fontSize: 13, fontWeight: '900' },
  bannerTimerLabel: { fontSize: 10, marginTop: 1 },
  bannerTimerVal:   { fontSize: 14, fontWeight: '900', letterSpacing: 0.5 },
  bannerTapHint:    { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  bannerTapText:    { fontSize: 10, fontWeight: '700' },

  bannerTop3Row:    { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: 8, paddingHorizontal: 8 },
  bannerPlayerCol:  { alignItems: 'center', gap: 2, flex: 1 },
  bannerBar:        { width: 32, borderRadius: 4 },
  bannerMedal:      { fontSize: 14 },
  bannerPlayerName: { fontSize: 9, fontWeight: '700', maxWidth: 60 },
  bannerPlayerScore:{ fontSize: 10, fontWeight: '900', color: '#f59e0b' },

  bannerJoinRow:    { flexDirection: 'row', gap: 8 },
  bannerJoinBtn:    { flex: 1, paddingVertical: 9, borderRadius: 12, alignItems: 'center' },
  bannerJoinText:   { fontSize: 13, fontWeight: '900', color: '#000' },
  bannerJoinedBtn:  { flex: 1, paddingVertical: 9, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
  bannerJoinedText: { fontSize: 12, fontWeight: '700' },
  bannerLeaderBtn:  { width: 44, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  bannerLeaderText: { fontSize: 18 },

  // Popup
  popupOverlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  popupBox:         { width: '100%', maxWidth: 440, maxHeight: '90%', borderRadius: 24, borderWidth: 1, overflow: 'hidden' },
  popupHeader:      { padding: 20, paddingBottom: 14, borderBottomWidth: 1, alignItems: 'center', gap: 4, position: 'relative' },
  popupTrophy:      { fontSize: 40 },
  popupTitle:       { fontSize: 18, fontWeight: '900' },
  popupTimerBox:    { alignItems: 'center', gap: 2 },
  popupTimerLabel:  { fontSize: 11 },
  popupTimerVal:    { fontSize: 20, fontWeight: '900', letterSpacing: 1 },
  popupScoringNote: { borderRadius: 10, borderWidth: 1, padding: 8, width: '100%' },
  popupCloseBtn:    { position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: 16, backgroundColor: '#ffffff18', alignItems: 'center', justifyContent: 'center' },
  popupCloseTxt:    { fontSize: 14, fontWeight: '700' },

  popupSection:     { padding: 14, paddingBottom: 8 },
  popupSectionTitle:{ fontSize: 11, fontWeight: '900', letterSpacing: 1, marginBottom: 8 },

  prizeRow:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 10, borderWidth: 1, padding: 10, marginBottom: 4 },
  prizeLabel:       { fontSize: 12, fontWeight: '700' },
  prizeDetail:      { fontSize: 12, fontWeight: '900' },

  lbRow:            { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, borderWidth: 1, padding: 8, marginBottom: 3 },
  lbRank:           { width: 24, fontSize: 12, fontWeight: '900', textAlign: 'center' },
  lbName:           { flex: 1, fontSize: 12, fontWeight: '700' },
  lbScore:          { fontSize: 12, fontWeight: '900' },
  lbDots:           { textAlign: 'center', paddingVertical: 4, fontSize: 12 },
  emptyText:        { textAlign: 'center', fontSize: 13, paddingVertical: 16 },

  nextTourBox:      { margin: 14, borderRadius: 12, borderWidth: 1, padding: 12, alignItems: 'center', gap: 4 },
  nextTourLabel:    { fontSize: 11 },
  nextTourVal:      { fontSize: 18, fontWeight: '900' },

  pastBtn:          { flexDirection: 'row', alignItems: 'center', gap: 10, margin: 14, marginTop: 0, borderRadius: 14, borderWidth: 1, padding: 14 },
  pastBtnText:      { flex: 1, fontSize: 13, fontWeight: '700' },

  popupFooter:      { borderTopWidth: 1, padding: 14 },
  popupJoinBtn:     { paddingVertical: 12, borderRadius: 14, alignItems: 'center' },
  popupJoinText:    { fontSize: 15, fontWeight: '900', color: '#000' },
  popupJoinedBtn:   { paddingVertical: 12, borderRadius: 14, alignItems: 'center', borderWidth: 1 },

  // Past winners
  pastHeader:       { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  pastBackText:     { fontSize: 20, fontWeight: '700' },
  pastTitle:        { flex: 1, fontSize: 16, fontWeight: '900', textAlign: 'center' },
  pastWeekHeader:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, paddingHorizontal: 2 },
  pastWeekNum:      { fontSize: 12, fontWeight: '900' },
  pastWeekDate:     { fontSize: 10 },

  // Bottom Sheet
  sheetOverlay:     { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet:            { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40, gap: 4 },
  sheetHandle:      { width: 40, height: 4, borderRadius: 2, backgroundColor: '#ffffff22', alignSelf: 'center', marginBottom: 12 },
  sheetTitle:       { fontSize: 18, fontWeight: '900', textAlign: 'center' },
  sheetTokens:      { fontSize: 13, textAlign: 'center', marginBottom: 8 },
  sheetOptions:     { gap: 10 },
  sheetCancel:      { alignItems: 'center', paddingVertical: 14, marginTop: 4 },
  sheetCancelText:  { fontSize: 15 },

  // SubOption
  subOption:        { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 16, gap: 12, borderWidth: 1 },
  subEmoji:         { fontSize: 26, flexShrink: 0 },
  subTextBlock:     { flex: 1, gap: 4 },
  subTitleRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  subTitle:         { fontSize: 16, fontWeight: '800' },
  subCostBadge:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, alignSelf: 'flex-start', borderWidth: 1 },
  subCostText:      { fontSize: 12, fontWeight: '700' },
  rankedBadge:      { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  rankedText:       { fontSize: 10, fontWeight: '800' },
  infoBtn:          { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  infoBtnText:      { fontSize: 16 },

  // Tooltip
  tooltipOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  tooltipBox:       { width: '100%', maxWidth: 360, borderRadius: 24, padding: 24, gap: 12, borderWidth: 1, alignItems: 'center' },
  tooltipEmoji:     { fontSize: 40 },
  tooltipTitle:     { fontSize: 20, fontWeight: '900' },
  tooltipDesc:      { fontSize: 14, textAlign: 'center', lineHeight: 22 },
  tooltipRanked:    { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
  tooltipClose:     { paddingVertical: 12, paddingHorizontal: 32, borderRadius: 14, marginTop: 4 },
});
