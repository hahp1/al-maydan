/**
 * GamesArenaScreen.js — محدّث
 * ════════════════════════════════════════════════
 *  ✅ كل الألعاب تخصم قلباً واحداً عند البدء
 *  ✅ tryStartGame من App.js تتحقق من القلوب
 *  ✅ باقي الوظائف والتصميم كما هو
 */

import { useState, useRef, useEffect, useCallback, memo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, StatusBar, FlatList,
} from 'react-native';
import { useTheme } from './ThemeContext';
import { useT } from './I18n';
import { playSound } from './SoundService';

// ── بنية اللعبة ──
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
  { id: 'whoisspy',     emoji: '🕵️', color: '#f97316', border: '#f9731640', bg: '#f9731612', ready: true,  mode: 'local', isNew: true },
];

const ONLINE_META = [
  { id: 'bullshit',  emoji: '🃏', color: '#ef4444', border: '#ef444440', bg: '#ef444412', ready: true,  mode: 'online' },
  { id: 'codenames', emoji: '🔐', color: '#10b981', border: '#10b98140', bg: '#10b98112', ready: true,  mode: 'online' },
  { id: 'mafia',     emoji: '🎭', color: '#a855f7', border: '#a855f740', bg: '#a855f712', ready: true,  mode: 'online' },
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

// ── بطاقة اللعبة ──
const GameCard = memo(({ game, onPress, cardBg, theme, t }) => (
  <TouchableOpacity
    style={[styles.gameCard, { backgroundColor: cardBg, borderColor: game.border }]}
    onPress={() => onPress(game)}
    activeOpacity={game.ready ? 0.8 : 0.95}
  >
    <View style={[styles.gameIconWrap, { backgroundColor: game.bg, borderColor: game.border }]}>
      <Text style={styles.gameEmoji}>{game.emoji}</Text>
    </View>
    <View style={styles.gameInfo}>
      <View style={styles.gameTitleRow}>
        <Text style={[styles.gameTitle, { color: game.color }]}>{game.title}</Text>
        {!game.ready && (
          <View style={styles.soonBadge}>
            <Text style={styles.soonText}>{t('games.soon')}</Text>
          </View>
        )}
        {game.isNew && game.ready && (
          <View style={[styles.soonBadge, styles.newBadge]}>
            <Text style={[styles.soonText, styles.newText]}>{t('games.newBadge')}</Text>
          </View>
        )}
      </View>
      <Text style={[styles.gameDesc,    { color: theme.textMuted }]}>{game.desc}</Text>
      <Text style={[styles.gamePlayers, { color: theme.textMuted }]}>👤 {game.players}</Text>
    </View>
    {/* شارة التكلفة */}
    {game.ready && (
      <View style={styles.costBadge}>
        <Text style={styles.costText}>❤️ 1</Text>
      </View>
    )}
  </TouchableOpacity>
));

const SEPARATOR = <View style={{ height: 12 }} />;

export default function GamesArenaScreen({ setScreen, user, setGameMode, tryStartGame }) {
  const { theme, isDark } = useTheme();
  const t = useT();
  const [activeTab, setActiveTab] = useState('jalsa');

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const tabScaleJ = useRef(new Animated.Value(1)).current;
  const tabScaleO = useRef(new Animated.Value(0.92)).current;

  const jalsaGames  = buildGames(JALSA_META,  t);
  const onlineGames = buildGames(ONLINE_META, t);
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
      tryStartGame(game.id, 1);
    } else {
      setScreen(game.id);
    }
  }, [setScreen, setGameMode, tryStartGame]);

  const switchJalsa  = useCallback(() => setActiveTab('jalsa'),  []);
  const switchOnline = useCallback(() => setActiveTab('online'), []);
  const keyExtractor = useCallback((item) => item.id + item.mode, []);
  const renderItem   = useCallback(({ item }) => (
    <GameCard game={item} onPress={handleGamePress} cardBg={theme.bgCard} theme={theme} t={t} />
  ), [handleGamePress, theme.bgCard, t]);

  const ListFooter = useCallback(() => (
    <View style={[styles.comingSoonCard, { borderColor: theme.border }]}>
      <Text style={styles.comingSoonEmoji}>✨</Text>
      <Text style={[styles.comingSoonText, { color: theme.textMuted }]}>{t('games.comingSoon')}</Text>
    </View>
  ), [theme, t]);

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.statusBg} />

      {/* هيدر */}
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <TouchableOpacity
          onPress={() => setScreen('home')}
          style={[styles.backBtn, { backgroundColor: theme.bgCard, borderColor: theme.purpleBorder }]}
          hitSlop={HIT_SLOP}
        >
          <Text style={[styles.backText, { color: theme.purple }]}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerEmoji}>🎲</Text>
          <Text style={[styles.headerTitle, { color: theme.purple }]}>{t('games.title')}</Text>
        </View>
        <View style={{ width: 40 }} />
      </Animated.View>

      {/* تابين */}
      <Animated.View style={[styles.tabsWrap, { opacity: fadeAnim }]}>
        <View style={[styles.tabsContainer, { backgroundColor: theme.bgCard, borderColor: theme.purpleBorder }]}>
          <Animated.View style={[
            styles.tabBtn,
            activeTab === 'jalsa' && [styles.tabBtnActive, { backgroundColor: theme.bgElevated, borderColor: theme.purpleBorder }],
            { transform: [{ scale: tabScaleJ }] },
          ]}>
            <TouchableOpacity style={styles.tabInner} onPress={switchJalsa} activeOpacity={0.8}>
              <Text style={styles.tabEmoji}>🏠</Text>
              <Text style={[styles.tabText, { color: activeTab === 'jalsa' ? theme.purple : theme.textMuted }]}>
                {t('games.jalsa')}
              </Text>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={[
            styles.tabBtn,
            activeTab === 'online' && [styles.tabBtnActive, { backgroundColor: theme.bgElevated, borderColor: theme.purpleBorder }],
            { transform: [{ scale: tabScaleO }] },
          ]}>
            <TouchableOpacity style={styles.tabInner} onPress={switchOnline} activeOpacity={0.8}>
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
        ListFooterComponent={ListFooter}
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

const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

const styles = StyleSheet.create({
  container:       { flex: 1, paddingTop: 56 },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 16 },
  backBtn:         { width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  backText:        { fontSize: 20, fontWeight: '700' },
  headerCenter:    { alignItems: 'center', gap: 4 },
  headerEmoji:     { fontSize: 26 },
  headerTitle:     { fontSize: 20, fontWeight: '900' },
  tabsWrap:        { paddingHorizontal: 20, marginBottom: 12, gap: 8 },
  tabsContainer:   { flexDirection: 'row', borderRadius: 16, borderWidth: 1.5, padding: 4, gap: 4, height: 52, alignItems: 'center' },
  tabBtn:          { flex: 1, borderRadius: 12, overflow: 'hidden' },
  tabBtnActive:    { borderWidth: 1.5 },
  tabInner:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 },
  tabEmoji:        { fontSize: 16 },
  tabText:         { fontSize: 15, fontWeight: '700' },
  tabDesc:         { fontSize: 12, textAlign: 'center' },
  list:            { flex: 1 },
  listContent:     { paddingHorizontal: 20, paddingBottom: 40 },
  gameCard:        { flexDirection: 'row', alignItems: 'center', borderRadius: 18, borderWidth: 1.5, padding: 14, gap: 12 },
  gameIconWrap:    { width: 60, height: 60, borderRadius: 16, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  gameEmoji:       { fontSize: 26 },
  gameInfo:        { flex: 1, gap: 3 },
  gameTitleRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  gameTitle:       { fontSize: 16, fontWeight: '800' },
  soonBadge:       { backgroundColor: '#a78bfa22', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  soonText:        { color: '#a78bfa', fontSize: 10, fontWeight: '700' },
  newBadge:        { backgroundColor: '#f59e0b22' },
  newText:         { color: '#f59e0b' },
  gameDesc:        { fontSize: 12 },
  gamePlayers:     { fontSize: 11, marginTop: 1 },
  // شارة التكلفة بالقلوب
  costBadge:       { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, backgroundColor: '#ef444418', borderWidth: 1, borderColor: '#ef444433' },
  costText:        { fontSize: 11, fontWeight: '700', color: '#ef4444' },
  comingSoonCard:  { borderRadius: 18, borderWidth: 1.5, borderStyle: 'dashed', padding: 20, alignItems: 'center', gap: 8 },
  comingSoonEmoji: { fontSize: 24 },
  comingSoonText:  { fontSize: 14, fontWeight: '600' },
});
