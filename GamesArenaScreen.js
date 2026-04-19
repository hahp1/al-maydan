import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, StatusBar, ScrollView
} from 'react-native';

// ── قوائم الألعاب ──────────────────────────────────────────
const JALSA_GAMES = [
  {
    id: 'mafia',
    emoji: '🎭',
    title: 'المافيا',
    desc: 'ادعِ البراءة أو اكشف المجرم — جهاز واحد',
    color: '#a855f7',
    border: '#a855f740',
    bg: '#a855f712',
    ready: true,
    players: '4–12 لاعبين',
    mode: 'local',
  },
  {
    id: 'xo',
    emoji: '✕○',
    title: 'إكس أو',
    desc: 'من يكمل الصف أولاً؟ — جهاز واحد',
    color: '#f59e0b',
    border: '#f59e0b40',
    bg: '#f59e0b12',
    ready: true,
    players: '2 لاعبين',
    mode: 'local',
  },
  {
    id: 'bullshit',
    emoji: '🃏',
    title: 'بوليشيت',
    desc: 'كذّب منافسيك — كل بجهازه بنفس الغرفة',
    color: '#ef4444',
    border: '#ef444440',
    bg: '#ef444412',
    ready: true,
    players: '3–6 لاعبين',
    mode: 'local',
  },
  {
    id: 'codenames',
    emoji: '🔤',
    title: 'كلمات سرية',
    desc: 'أوصل فريقك للكلمات — كل بجهازه',
    color: '#10b981',
    border: '#10b98140',
    bg: '#10b98112',
    ready: true,
    players: '4–8 لاعبين',
    mode: 'local',
  },
  {
    id: 'manana',
    emoji: '🤔',
    title: 'من أنا؟',
    desc: 'ارفع الهاتف على جبهتك وخمّن الشخصية',
    color: '#f97316',
    border: '#f9731640',
    bg: '#f9731612',
    ready: true,
    players: '2–8 لاعبين',
    mode: 'local',
  },
  {
    id: 'actitout',
    emoji: '🕺',
    title: 'بدون كلام',
    desc: 'مثّل الكلمة وفريقك يخمّن قبل انتهاء الوقت',
    color: '#ec4899',
    border: '#ec489940',
    bg: '#ec489912',
    ready: true,
    players: '4–12 لاعبين',
    mode: 'local',
  },
  {
    id: 'truthdare',
    emoji: '😈',
    title: 'صراحة أو تحدي',
    desc: 'عجلة تختار من يسأل ومن يُسأل',
    color: '#f43f5e',
    border: '#f43f5e40',
    bg: '#f43f5e12',
    ready: true,
    players: '2+ لاعبين',
    mode: 'local',
  },
  {
    id: 'rankfriends',
    emoji: '🏆',
    title: 'رتّب أصدقاءك',
    desc: 'من الأكثر كذباً؟ من سيتزوج أول؟ اكتشف!',
    color: '#f59e0b',
    border: '#f59e0b40',
    bg: '#f59e0b12',
    ready: true,
    players: '3–10 لاعبين',
    mode: 'local',
    isNew: true,
  },
  {
    id: 'neverhaveiever',
    emoji: '☝️',
    title: 'أنا لم أفعل',
    desc: 'اعترف أو خسر إصبعاً — من الأنقى؟',
    color: '#10b981',
    border: '#10b98140',
    bg: '#10b98112',
    ready: true,
    players: '2–8 لاعبين',
    mode: 'local',
    isNew: true,
  },
  {
    id: 'drawguess',
    emoji: '🎨',
    title: 'رسم وتخمين',
    desc: 'ارسم والآخرون يخمّنون — الأسرع يفوز!',
    color: '#3b82f6',
    border: '#3b82f640',
    bg: '#3b82f612',
    ready: true,
    players: '2–8 لاعبين',
    mode: 'local',
    isNew: true,
  },
];

const ONLINE_GAMES = [
  {
    id: 'bullshit',
    emoji: '🃏',
    title: 'بوليشيت',
    desc: 'العب مع أصدقائك أو عشوائي عبر الإنترنت',
    color: '#ef4444',
    border: '#ef444440',
    bg: '#ef444412',
    ready: true,
    players: '3–6 لاعبين',
    mode: 'online',
  },
  {
    id: 'codenames',
    emoji: '🔤',
    title: 'كلمات سرية',
    desc: 'تحدَّ لاعبين من أي مكان',
    color: '#10b981',
    border: '#10b98140',
    bg: '#10b98112',
    ready: true,
    players: '4–8 لاعبين',
    mode: 'online',
  },
  {
    id: 'mafia',
    emoji: '🎭',
    title: 'المافيا',
    desc: 'العب مع الأصدقاء عن بُعد',
    color: '#a855f7',
    border: '#a855f740',
    bg: '#a855f712',
    ready: true,
    players: '4–12 لاعبين',
    mode: 'online',
  },
  {
    id: 'drawguess',
    emoji: '🎨',
    title: 'رسم وتخمين',
    desc: 'أنشئ غرفة وادعُ أصدقاءك للتخمين',
    color: '#a855f7',
    border: '#a855f740',
    bg: '#a855f712',
    ready: true,
    players: '2–8 لاعبين',
    mode: 'online',
    isNew: true,
  },
  {
    id: 'kout',
    emoji: '🂡',
    title: 'كوت بو 6',
    desc: 'لعبة الورق الخليجية الشهيرة',
    color: '#8b5cf6',
    border: '#8b5cf640',
    bg: '#8b5cf612',
    ready: true,
    players: '4–6 لاعبين',
    mode: 'online',
  },
  {
    id: 'biloot',
    emoji: '🃏',
    title: 'بلوت',
    desc: 'مزايدة وأتو وفريقان | الفوز بـ 152',
    color: '#8b5cf6',
    border: '#8b5cf640',
    bg: '#8b5cf612',
    ready: true,
    players: '4 لاعبين',
    mode: 'online',
  },
  {
    id: 'dominoes',
    emoji: '🁣',
    title: 'دومينو',
    desc: 'فريقان | الفوز بـ 151 نقطة',
    color: '#06b6d4',
    border: '#06b6d440',
    bg: '#06b6d412',
    ready: true,
    players: '4 لاعبين',
    mode: 'online',
  },
  {
    id: 'poker',
    emoji: '♠️',
    title: 'بوكر',
    desc: 'الخداع والمراهنات والبلوف',
    color: '#f43f5e',
    border: '#f43f5e40',
    bg: '#f43f5e12',
    ready: false,
    players: '2–6 لاعبين',
    mode: 'online',
  },
];

// ── المكوّن الرئيسي ─────────────────────────────────────────
export default function GamesArenaScreen({ setScreen, user, setGameMode }) {
  const [activeTab, setActiveTab] = useState('jalsa'); // 'jalsa' | 'online'
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const tabIndicator = useRef(new Animated.Value(0)).current;

  const games = activeTab === 'jalsa' ? JALSA_GAMES : ONLINE_GAMES;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    Animated.spring(tabIndicator, {
      toValue: activeTab === 'jalsa' ? 0 : 1,
      friction: 8,
      useNativeDriver: false,
    }).start();
  }, [activeTab]);

  function handleGamePress(game) {
    if (!game.ready) return;
    if (setGameMode) setGameMode(game.mode);
    setScreen(game.id);
  }

  const indicatorLeft = tabIndicator.interpolate({
    inputRange: [0, 1],
    outputRange: ['2%', '52%'],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#06061a" />

      {/* هيدر */}
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <TouchableOpacity onPress={() => setScreen('home')} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerEmoji}>🎲</Text>
          <Text style={styles.headerTitle}>ميدان الألعاب</Text>
        </View>
        <View style={{ width: 40 }} />
      </Animated.View>

      {/* تابين جلسة / أونلاين */}
      <Animated.View style={[styles.tabsWrap, { opacity: fadeAnim }]}>
        <View style={styles.tabsContainer}>
          <Animated.View style={[styles.tabIndicator, { left: indicatorLeft }]} />
          <TouchableOpacity style={styles.tabBtn} onPress={() => setActiveTab('jalsa')} activeOpacity={0.8}>
            <Text style={styles.tabEmoji}>🏠</Text>
            <Text style={[styles.tabText, activeTab === 'jalsa' && styles.tabTextActive]}>جلسة</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabBtn} onPress={() => setActiveTab('online')} activeOpacity={0.8}>
            <Text style={styles.tabEmoji}>📡</Text>
            <Text style={[styles.tabText, activeTab === 'online' && styles.tabTextActive]}>أونلاين</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.tabDesc}>
          {activeTab === 'jalsa'
            ? 'العب مع من حولك في نفس المكان'
            : 'تحدَّ أصدقاءك أو لاعبين عشوائيين'}
        </Text>
      </Animated.View>

      {/* قائمة الألعاب */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        key={activeTab}
      >
        {games.map((game) => (
          <Animated.View key={`${activeTab}-${game.id}`} style={{ opacity: fadeAnim }}>
            <TouchableOpacity
              style={[styles.gameCard, { borderColor: game.border, backgroundColor: '#0f0f2e' }]}
              onPress={() => handleGamePress(game)}
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
                      <Text style={styles.soonText}>قريباً</Text>
                    </View>
                  )}
                  {game.isNew && game.ready && (
                    <View style={[styles.soonBadge, styles.newBadge]}>
                      <Text style={[styles.soonText, styles.newText]}>جديد ✨</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.gameDesc}>{game.desc}</Text>
                <Text style={styles.gamePlayers}>👤 {game.players}</Text>
              </View>

              {game.ready && (
                <Text style={[styles.arrow, { color: game.color }]}>←</Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        ))}

        <View style={styles.comingSoonCard}>
          <Text style={styles.comingSoonEmoji}>✨</Text>
          <Text style={styles.comingSoonText}>المزيد قادم قريباً...</Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ── الستايلات ────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#06061a', paddingTop: 56 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20, marginBottom: 16,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#0f0f2e',
    borderWidth: 1, borderColor: '#a78bfa30',
    alignItems: 'center', justifyContent: 'center',
  },
  backText: { color: '#a78bfa', fontSize: 20, fontWeight: '700' },
  headerCenter: { alignItems: 'center', gap: 4 },
  headerEmoji: { fontSize: 26 },
  headerTitle: { color: '#a78bfa', fontSize: 20, fontWeight: '900' },

  tabsWrap: { paddingHorizontal: 20, marginBottom: 16, gap: 8 },
  tabsContainer: {
    flexDirection: 'row', backgroundColor: '#0f0f2e',
    borderRadius: 16, borderWidth: 1.5, borderColor: '#a78bfa20',
    padding: 4, position: 'relative', height: 52, alignItems: 'center',
  },
  tabIndicator: {
    position: 'absolute', width: '46%', height: 44,
    backgroundColor: '#1e1b4b', borderRadius: 12,
    borderWidth: 1.5, borderColor: '#a78bfa50',
  },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6, zIndex: 1,
  },
  tabEmoji: { fontSize: 16 },
  tabText: { color: '#5a5a80', fontSize: 15, fontWeight: '700' },
  tabTextActive: { color: '#a78bfa' },
  tabDesc: { color: '#3a3a60', fontSize: 12, textAlign: 'center' },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40, gap: 12 },
  gameCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 18, borderWidth: 1.5, padding: 14, gap: 12,
  },
  gameIconWrap: {
    width: 60, height: 60, borderRadius: 16, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  gameEmoji: { fontSize: 26 },
  gameInfo: { flex: 1, gap: 3 },
  gameTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  gameTitle: { fontSize: 16, fontWeight: '800' },
  soonBadge: {
    backgroundColor: '#a78bfa22', paddingHorizontal: 8,
    paddingVertical: 2, borderRadius: 8,
  },
  soonText: { color: '#a78bfa', fontSize: 10, fontWeight: '700' },
  newBadge: { backgroundColor: '#f59e0b22' },
  newText: { color: '#f59e0b' },
  gameDesc: { color: '#5a5a80', fontSize: 12 },
  gamePlayers: { color: '#3a3a60', fontSize: 11, marginTop: 1 },
  arrow: { fontSize: 22, fontWeight: '700', marginRight: 4 },
  comingSoonCard: {
    borderRadius: 18, borderWidth: 1.5, borderColor: '#ffffff10',
    borderStyle: 'dashed', padding: 20, alignItems: 'center', gap: 8, marginTop: 4,
  },
  comingSoonEmoji: { fontSize: 24 },
  comingSoonText: { color: '#3a3a60', fontSize: 14, fontWeight: '600' },
});
