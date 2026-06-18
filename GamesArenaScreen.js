/**
 * GamesArenaScreen.js — محدّث v2
 * ════════════════════════════════════════════════
 *  ✅ بطاقة اللعبة: صورة يسار + معلومات يمين (row layout)
 *  ✅ شارة القلوب: لون theme.accent بدلاً من الأحمر الثابت
 *  ✅ منطق القلوب: كل الألعاب deferred=true (يخصم عند onGameReady)
 *  ✅ الألعاب المحلية: لا تكلفة قلوب من هنا (تُضاف داخل اللعبة)
 */

import { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, StatusBar, FlatList,
} from 'react-native';
import { useTheme } from './ThemeContext';
import { useT, useLanguage } from './I18n';
import { playSound } from './SoundService';
import { ThemedButton, ThemedPill } from './ThemedComponents';

// ── بيانات الألعاب ───────────────────────────────────────────
const JALSA_META = [
  { id: 'mafia',          emoji: '🎭', color: '#a855f7', border: '#a855f740', bg: '#a855f712', ready: true,  mode: 'local' },
  { id: 'xo',             emoji: '✕○', color: '#f59e0b', border: '#f59e0b40', bg: '#f59e0b12', ready: true,  mode: 'local' },
  { id: 'bullshit',       emoji: '🃏', color: '#ef4444', border: '#ef444440', bg: '#ef444412', ready: true,  mode: 'local' },
  { id: 'codenames',      emoji: '🔐', color: '#10b981', border: '#10b98140', bg: '#10b98112', ready: true,  mode: 'local' },
  { id: 'manana',         emoji: '🤔', color: '#f97316', border: '#f9731640', bg: '#f9731612', ready: true,  mode: 'local' },
  { id: 'actitout',       emoji: '🕺', color: '#ec4899', border: '#ec489940', bg: '#ec489912', ready: true,  mode: 'local' },
  { id: 'truthdare',      emoji: '😈', color: '#f43f5e', border: '#f43f5e40', bg: '#f43f5e12', ready: true,  mode: 'local' },
  { id: 'rankfriends',    emoji: '🏆', color: '#f59e0b', border: '#f59e0b40', bg: '#f59e0b12', ready: true,  mode: 'local', isNew: true },
  { id: 'neverhaveiever', emoji: '☝️', color: '#10b981', border: '#10b98140', bg: '#10b98112', ready: true,  mode: 'local', isNew: true },
  { id: 'drawguess',      emoji: '🎨', color: '#3b82f6', border: '#3b82f640', bg: '#3b82f612', ready: true,  mode: 'local', isNew: true },
  { id: 'wordle',         emoji: '🔤', color: '#22c55e', border: '#22c55e40', bg: '#22c55e12', ready: true,  mode: 'local', isNew: true },
  { id: 'whoisspy',       emoji: '🕵️', color: '#f97316', border: '#f9731640', bg: '#f9731612', ready: true,  mode: 'local', isNew: true },
  { id: 'guessimage',     emoji: '🖼️', color: '#f5c518', border: '#f5c51840', bg: '#f5c51812', ready: true,  mode: 'local', isNew: true },
];

const ONLINE_META = [
  { id: 'xo',        emoji: '✕○', color: '#f59e0b', border: '#f59e0b40', bg: '#f59e0b12', ready: true,  mode: 'online' },
  { id: 'bullshit',  emoji: '🃏', color: '#ef4444', border: '#ef444440', bg: '#ef444412', ready: true,  mode: 'online' },
  { id: 'codenames', emoji: '🔐', color: '#10b981', border: '#10b98140', bg: '#10b98112', ready: true,  mode: 'online' },
  { id: 'drawguess', emoji: '🎨', color: '#3b82f6', border: '#3b82f640', bg: '#3b82f612', ready: true,  mode: 'online', isNew: true },
  { id: 'wordle',    emoji: '🔤', color: '#22c55e', border: '#22c55e40', bg: '#22c55e12', ready: true,  mode: 'online', isNew: true },
  { id: 'kout',      emoji: '🂡', color: '#8b5cf6', border: '#8b5cf640', bg: '#8b5cf612', ready: true,  mode: 'online' },
  { id: 'biloot',    emoji: '♠️', color: '#8b5cf6', border: '#8b5cf640', bg: '#8b5cf612', ready: true,  mode: 'online' },
  { id: 'dominoes',  emoji: '🁣', color: '#06b6d4', border: '#06b6d440', bg: '#06b6d412', ready: true,  mode: 'online' },
  { id: 'poker',     emoji: '♣️', color: '#f43f5e', border: '#f43f5e40', bg: '#f43f5e12', ready: false, mode: 'online' },
];

function buildGames(metaList, t) {
  return metaList.map(g => ({
    ...g,
    title:   t(`games.${g.id}_title`)   || g.id,
    desc:    t(`games.${g.id}_desc`)    || '',
    players: t(`games.${g.id}_players`) || '',
  }));
}

// ── بطاقة اللعبة — row layout ───────────────────────────────
const GameCard = memo(({ game, onPress, theme, t, lang }) => {
  const textColor = theme.textPrimary || theme.accent;
  const mutedColor = theme.textMuted;
  const isRTL = lang === 'ar';

  return (
    <TouchableOpacity
      onPress={game.ready ? () => onPress(game) : undefined}
      activeOpacity={game.ready ? 0.75 : 1}
      style={[
        styles.gameCard,
        {
          backgroundColor: theme.bgCard,
          borderColor: game.border,
          opacity: game.ready ? 1 : 0.75,
        },
      ]}
    >
      {/* أيقونة اللعبة */}
      <View style={[styles.gameIconWrap, { backgroundColor: game.bg, borderColor: game.border }]}>
        <Text style={styles.gameEmoji}>{game.emoji}</Text>
      </View>

      {/* معلومات اللعبة */}
      <View style={styles.gameInfo}>
        {/* اسم + شارات */}
        <View style={styles.gameTitleRow}>
          <Text style={[styles.gameTitle, { color: game.color }]} numberOfLines={1}>
            {game.title}
          </Text>
          {!game.ready && (
            <ThemedPill variant="secondary" small style={{ paddingHorizontal: 8 }}>
              {t('games.soon')}
            </ThemedPill>
          )}
          {game.isNew && game.ready && (
            <ThemedPill variant="warning" small style={{ paddingHorizontal: 8 }}>
              {t('games.newBadge')}
            </ThemedPill>
          )}
        </View>

        <Text style={[styles.gameDesc, { color: mutedColor, textAlign: isRTL ? 'right' : 'left' }]}
          numberOfLines={2}>
          {game.desc}
        </Text>

        <View style={styles.gameFooter}>
          <Text style={[styles.gamePlayers, { color: mutedColor }]}>👤 {game.players}</Text>
          {/* شارة القلوب — بلون الثيم */}
          {game.ready && game.mode === 'online' && (
            <View style={[styles.costBadge, { backgroundColor: theme.accentSoft, borderColor: theme.accentBorder }]}>
              <Text style={[styles.costText, { color: theme.accent }]}>❤️ 1</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
});

const SEPARATOR = <View style={{ height: 12 }} />;

export default function GamesArenaScreen({ setScreen, user, setGameMode, tryStartGame }) {
  const { theme } = useTheme();
  const { t, lang } = useLanguage();
  const [activeTab, setActiveTab] = useState('jalsa');

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const tabScaleJ = useRef(new Animated.Value(1)).current;
  const tabScaleO = useRef(new Animated.Value(0.92)).current;

  const jalsaGames  = useMemo(() => buildGames(JALSA_META,  t), [t, lang]);
  const onlineGames = useMemo(() => buildGames(ONLINE_META, t), [t, lang]);
  const games = activeTab === 'jalsa' ? jalsaGames : onlineGames;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    const isJalsa = activeTab === 'jalsa';
    Animated.parallel([
      Animated.spring(tabScaleJ, { toValue: isJalsa ? 1 : 0.93, friction: 8, useNativeDriver: true }),
      Animated.spring(tabScaleO, { toValue: isJalsa ? 0.93 : 1, friction: 8, useNativeDriver: true }),
    ]).start();
  }, [activeTab]);

  const handleGamePress = useCallback((game) => {
    if (!game.ready) return;
    playSound('tap');
    if (setGameMode) setGameMode(game.mode);

    if (tryStartGame) {
      // ألعاب أونلاين: deferred=true دائماً (القلب يُخصم عند onGameReady)
      // ألعاب محلية: deferred=true أيضاً (لا تكلفة قلوب من هنا — مجانية)
      tryStartGame(game.id, 1, null, true);
    } else {
      setScreen(game.id);
    }
  }, [setScreen, setGameMode, tryStartGame]);

  const switchJalsa  = useCallback(() => setActiveTab('jalsa'),  []);
  const switchOnline = useCallback(() => setActiveTab('online'), []);
  const keyExtractor = useCallback((item) => item.id + item.mode, []);

  const renderItem = useCallback(({ item }) => (
    <GameCard game={item} onPress={handleGamePress} theme={theme} t={t} lang={lang} />
  ), [handleGamePress, theme, t, lang]);

  // ListFooter extracted outside render for FlatList stability
  const listFooterData = { borderColor: theme.borderCard, bgCard: theme.bgCard, textMuted: theme.textMuted };
  const ListFooterComponent = (
    <View style={[styles.footerCard, { borderColor: theme.borderCard, backgroundColor: theme.bgCard }]}>
      <Text style={styles.footerEmoji}>✨</Text>
      <Text style={[styles.footerText, { color: theme.textMuted }]}>{t('games.comingSoon')}</Text>
    </View>
  );

  const textColor = theme.textPrimary || theme.accent;

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.statusBg} />

      {/* هيدر */}
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <ThemedButton onPress={() => setScreen('home')} label='←' variant='ghost' size='small' style={styles.backBtn} />
        <View style={styles.headerCenter}>
          <Text style={styles.headerEmoji}>🎲</Text>
          <Text style={[styles.headerTitle, { color: theme.purple }]}>{t('games.title')}</Text>
        </View>
        <View style={{ width: 40 }} />
      </Animated.View>

      {/* تابين */}
      <Animated.View style={[styles.tabsWrap, { opacity: fadeAnim }]}>
        <View style={[styles.tabsContainer, { backgroundColor: theme.bgCard, borderColor: theme.purpleBorder }]}>
          <Animated.View style={[styles.tabBtn, { transform: [{ scale: tabScaleJ }] }]}>
            <TouchableOpacity
              onPress={switchJalsa}
              activeOpacity={0.75}
              style={[
                styles.tabInner,
                activeTab === 'jalsa' && { backgroundColor: theme.purpleSoft },
              ]}
            >
              <Text style={styles.tabEmoji}>🏠</Text>
              <Text style={[styles.tabText, { color: activeTab === 'jalsa' ? theme.purple : theme.textMuted }]}>
                {t('games.jalsa')}
              </Text>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={[styles.tabBtn, { transform: [{ scale: tabScaleO }] }]}>
            <TouchableOpacity
              onPress={switchOnline}
              activeOpacity={0.75}
              style={[
                styles.tabInner,
                activeTab === 'online' && { backgroundColor: theme.purpleSoft },
              ]}
            >
              <Text style={styles.tabEmoji}>📡</Text>
              <Text style={[styles.tabText, { color: activeTab === 'online' ? theme.purple : theme.textMuted }]}>
                {t('games.online')}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        <Text style={[styles.tabDesc, { color: theme.textMuted }]}>
          {activeTab === 'jalsa' ? t('games.jalsaDesc') : t('games.onlineDesc')}
        </Text>
      </Animated.View>

      <FlatList
        data={games}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ItemSeparatorComponent={() => SEPARATOR}
        ListFooterComponent={() => ListFooterComponent}
        ListFooterComponentStyle={{ marginTop: 12 }}
        contentContainerStyle={styles.listContent}
        style={styles.list}
        showsVerticalScrollIndicator={false}
        extraData={activeTab}
        removeClippedSubviews
        initialNumToRender={6}
        maxToRenderPerBatch={4}
        windowSize={5}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, paddingTop: 56 },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 16 },
  backBtn:      { width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { alignItems: 'center', gap: 4 },
  headerEmoji:  { fontSize: 26 },
  headerTitle:  { fontSize: 20, fontWeight: '900' },

  // تابين
  tabsWrap:      { paddingHorizontal: 20, marginBottom: 12, gap: 8 },
  tabsContainer: { flexDirection: 'row', borderRadius: 16, borderWidth: 1.5, padding: 4, gap: 4, height: 52, alignItems: 'center' },
  tabBtn:        { flex: 1, borderRadius: 12, overflow: 'hidden' },
  tabInner:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12 },
  tabEmoji:      { fontSize: 16 },
  tabText:       { fontSize: 15, fontWeight: '700' },
  tabDesc:       { fontSize: 12, textAlign: 'center' },

  // قائمة
  list:        { flex: 1 },
  listContent: { paddingHorizontal: 20, paddingBottom: 40 },

  // بطاقة اللعبة
  gameCard: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 14,
    gap: 14,
  },
  gameIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  gameEmoji:    { fontSize: 28 },
  gameInfo:     { flex: 1, gap: 4, minWidth: 0 },
  gameTitleRow: { alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  gameTitle:    { fontSize: 17, fontWeight: '900', flexShrink: 1 },
  gameDesc:     { fontSize: 12, lineHeight: 17 },
  gameFooter:   { alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 2 },
  gamePlayers:  { fontSize: 11 },

  // شارة القلوب
  costBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  costText: { fontSize: 11, fontWeight: '700' },

  // فوتر
  footerCard:  { borderRadius: 18, borderWidth: 1.5, borderStyle: 'dashed', padding: 20, alignItems: 'center', gap: 8 },
  footerEmoji: { fontSize: 24 },
  footerText:  { fontSize: 14, fontWeight: '600' },
});
