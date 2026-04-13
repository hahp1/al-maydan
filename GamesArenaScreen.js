import { useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, StatusBar, ScrollView
} from 'react-native';

const GAMES = [
  {
    id: 'xo',
    emoji: '✕○',
    title: 'إكس أو',
    desc: 'الكلاسيكية — من يكمل الصف أولاً؟',
    color: '#f59e0b',
    border: '#f59e0b40',
    bg: '#f59e0b12',
    ready: true,
    players: '2 لاعبين',
  },
  {
    id: 'bullshit',
    emoji: '🃏',
    title: 'بوليشيت',
    desc: 'كذّب منافسيك وافتضح أكاذيبهم',
    color: '#ef4444',
    border: '#ef444440',
    bg: '#ef444412',
    ready: true,
    players: '3–6 لاعبين',
  },
  {
    id: 'kout',
    emoji: '🂡',
    title: 'كوت بو 6',
    desc: 'لعبة الورق الخليجية الشهيرة',
    color: '#8b5cf6',
    border: '#8b5cf640',
    bg: '#8b5cf612',
    ready: false,
    players: '4 لاعبين',
  },
  {
    id: 'dominoes',
    emoji: '🁣',
    title: 'دومينو',
    desc: 'الحجارة والتكتيك والمفاجآت',
    color: '#06b6d4',
    border: '#06b6d440',
    bg: '#06b6d412',
    ready: false,
    players: '2–4 لاعبين',
  },
  {
    id: 'codenames',
    emoji: '🔤',
    title: 'كلمات سرية',
    desc: 'أوصل فريقك للكلمات الصحيحة',
    color: '#10b981',
    border: '#10b98140',
    bg: '#10b98112',
    ready: false,
    players: '4–8 لاعبين',
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
  },
];

export default function GamesArenaScreen({ setScreen, user }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const cardAnims = GAMES.map(() => useRef(new Animated.Value(40)).current);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    Animated.stagger(60, cardAnims.map(a =>
      Animated.spring(a, { toValue: 0, friction: 8, useNativeDriver: true })
    )).start();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#06061a" />

      {/* هيدر */}
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <TouchableOpacity onPress={() => setScreen('home')} style={styles.backBtn}>
          <Text style={styles.backText}>→</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerEmoji}>🎲</Text>
          <Text style={styles.headerTitle}>ميدان الألعاب</Text>
        </View>
        <View style={{ width: 40 }} />
      </Animated.View>

      {/* شريط الأصدقاء السريع */}
      <Animated.View style={[styles.friendsQuick, { opacity: fadeAnim }]}>
        <TouchableOpacity style={styles.friendsQuickBtn} onPress={() => setScreen('friends')}>
          <Text style={styles.friendsQuickText}>👥  العب مع أصدقائك</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* الألعاب */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {GAMES.map((game, i) => (
          <Animated.View
            key={game.id}
            style={{ transform: [{ translateY: cardAnims[i] }], opacity: fadeAnim }}
          >
            <TouchableOpacity
              style={[styles.gameCard, { borderColor: game.border, backgroundColor: '#0f0f2e' }]}
              onPress={() => {
                if (game.ready) setScreen(game.id);
              }}
              activeOpacity={game.ready ? 0.8 : 0.95}
            >
              {/* أيقونة */}
              <View style={[styles.gameIconWrap, { backgroundColor: game.bg, borderColor: game.border }]}>
                <Text style={styles.gameEmoji}>{game.emoji}</Text>
              </View>

              {/* معلومات */}
              <View style={styles.gameInfo}>
                <View style={styles.gameTitleRow}>
                  <Text style={[styles.gameTitle, { color: game.color }]}>{game.title}</Text>
                  {!game.ready && (
                    <View style={styles.soonBadge}>
                      <Text style={styles.soonText}>قريباً</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.gameDesc}>{game.desc}</Text>
                <Text style={styles.gamePlayers}>👤 {game.players}</Text>
              </View>

              {/* سهم */}
              {game.ready && (
                <Text style={[styles.arrow, { color: game.color }]}>←</Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        ))}

        {/* بطاقة "ألعاب قادمة" */}
        <Animated.View style={{ opacity: fadeAnim }}>
          <View style={styles.comingSoonCard}>
            <Text style={styles.comingSoonEmoji}>✨</Text>
            <Text style={styles.comingSoonText}>المزيد قادم قريباً...</Text>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#06061a',
    paddingTop: 56,
  },

  // هيدر
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#0f0f2e',
    borderWidth: 1,
    borderColor: '#a78bfa30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { color: '#a78bfa', fontSize: 20, fontWeight: '700' },
  headerCenter: { alignItems: 'center', gap: 4 },
  headerEmoji: { fontSize: 26 },
  headerTitle: { color: '#a78bfa', fontSize: 20, fontWeight: '900' },

  // أصدقاء سريع
  friendsQuick: { paddingHorizontal: 20, marginBottom: 16 },
  friendsQuickBtn: {
    backgroundColor: '#0f0f2e',
    borderWidth: 1.5,
    borderColor: '#3b82f640',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  friendsQuickText: { color: '#60a5fa', fontSize: 15, fontWeight: '700' },

  // ألعاب
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40, gap: 12 },
  gameCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 14,
    gap: 12,
  },
  gameIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  gameEmoji: { fontSize: 26 },
  gameInfo: { flex: 1, gap: 3 },
  gameTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  gameTitle: { fontSize: 16, fontWeight: '800' },
  soonBadge: {
    backgroundColor: '#a78bfa22',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  soonText: { color: '#a78bfa', fontSize: 10, fontWeight: '700' },
  gameDesc: { color: '#5a5a80', fontSize: 12 },
  gamePlayers: { color: '#3a3a60', fontSize: 11, marginTop: 1 },
  arrow: { fontSize: 22, fontWeight: '700', marginRight: 4 },

  // قادم
  comingSoonCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#ffffff10',
    borderStyle: 'dashed',
    padding: 20,
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  comingSoonEmoji: { fontSize: 24 },
  comingSoonText: { color: '#3a3a60', fontSize: 14, fontWeight: '600' },
});
