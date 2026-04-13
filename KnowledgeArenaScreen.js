import { useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, StatusBar
} from 'react-native';
import TokenModal from './TokenModal';

const SOLO_COST = 10;

export default function KnowledgeArenaScreen({ tokens, setTokens, setScreen, showTokenModal, setShowTokenModal, highScore }) {

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slide1 = useRef(new Animated.Value(50)).current;
  const slide2 = useRef(new Animated.Value(50)).current;
  const slide3 = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.stagger(80, [
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(slide1, { toValue: 0, friction: 8, useNativeDriver: true }),
      ]),
      Animated.spring(slide2, { toValue: 0, friction: 8, useNativeDriver: true }),
      Animated.spring(slide3, { toValue: 0, friction: 8, useNativeDriver: true }),
    ]).start();
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
          <Text style={styles.headerEmoji}>🧠</Text>
          <Text style={styles.headerTitle}>ميدان المعلومات</Text>
        </View>
        <View style={{ width: 40 }} />
      </Animated.View>

      {/* وصف */}
      <Animated.Text style={[styles.desc, { opacity: fadeAnim }]}>
        اختر نمط اللعب
      </Animated.Text>

      {/* أنماط اللعب */}
      <View style={styles.modes}>

        {/* فريقين */}
        <Animated.View style={{ transform: [{ translateY: slide1 }], opacity: fadeAnim }}>
          <TouchableOpacity
            style={[styles.modeCard, styles.modeTeams]}
            onPress={() => setScreen('setup')}
            activeOpacity={0.85}
          >
            <View style={styles.modeLeft}>
              <Text style={styles.modeEmoji}>⚔️</Text>
              <View>
                <Text style={styles.modeTitle}>فريقين</Text>
                <Text style={styles.modeSubtitle}>تنافس بين فريقين مباشرة</Text>
              </View>
            </View>
            <View style={[styles.modeCostBadge, { backgroundColor: '#f5c51822' }]}>
              <Text style={[styles.modeCost, { color: '#f5c518' }]}>🪙 20–30</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* فردي */}
        <Animated.View style={{ transform: [{ translateY: slide2 }], opacity: fadeAnim }}>
          <TouchableOpacity
            style={[styles.modeCard, styles.modeSolo, tokens < SOLO_COST && styles.modeDisabled]}
            onPress={() => {
              if (tokens < SOLO_COST) {
                setShowTokenModal(true);
              } else {
                setTokens(t => t - SOLO_COST);
                setScreen('solo');
              }
            }}
            activeOpacity={0.85}
          >
            <View style={styles.modeLeft}>
              <Text style={styles.modeEmoji}>🎮</Text>
              <View>
                <Text style={[styles.modeTitle, { color: '#93c5fd' }]}>فردي</Text>
                <Text style={styles.modeSubtitle}>
                  {tokens < SOLO_COST ? '❌ رصيد غير كافٍ' : 'العب منفرداً واكسر الأرقام'}
                </Text>
              </View>
            </View>
            <View style={[styles.modeCostBadge, { backgroundColor: '#3b82f622' }]}>
              <Text style={[styles.modeCost, { color: '#93c5fd' }]}>🪙 {SOLO_COST}</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* أونلاين */}
        <Animated.View style={{ transform: [{ translateY: slide3 }], opacity: fadeAnim }}>
          <TouchableOpacity
            style={[styles.modeCard, styles.modeOnline, tokens < 10 && styles.modeDisabled]}
            onPress={() => {
              if (tokens < 10) {
                setShowTokenModal(true);
              } else {
                setTokens(t => t - 10);
                setScreen('online');
              }
            }}
            activeOpacity={0.85}
          >
            <View style={styles.modeLeft}>
              <Text style={styles.modeEmoji}>🌐</Text>
              <View>
                <Text style={[styles.modeTitle, { color: '#34d399' }]}>تحدي عن بُعد</Text>
                <Text style={styles.modeSubtitle}>
                  {tokens < 10 ? '❌ رصيد غير كافٍ' : 'العب ضد لاعب عشوائي'}
                </Text>
              </View>
            </View>
            <View style={[styles.modeCostBadge, { backgroundColor: '#10b98122' }]}>
              <Text style={[styles.modeCost, { color: '#34d399' }]}>🪙 10</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

      </View>

      {/* رقم قياسي */}
      {highScore > 0 && (
        <Animated.View style={[styles.highScoreBar, { opacity: fadeAnim }]}>
          <Text style={styles.highScoreText}>🏆 رقمك القياسي: {highScore} نقطة</Text>
        </Animated.View>
      )}

      {/* رصيد */}
      <Animated.View style={[styles.tokenBar, { opacity: fadeAnim }]}>
        <TouchableOpacity onPress={() => setShowTokenModal(true)} style={styles.tokenInner}>
          <Text style={styles.tokenText}>🪙 رصيدك: {tokens} رمز</Text>
          <Text style={styles.tokenAdd}>+ إضافة</Text>
        </TouchableOpacity>
      </Animated.View>

      <TokenModal
        visible={showTokenModal}
        onClose={() => setShowTokenModal(false)}
        tokens={tokens}
        onAddTokens={(amount) => setTokens(t => t + amount)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#06061a',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 36,
    justifyContent: 'space-between',
  },

  // هيدر
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#0f0f2e',
    borderWidth: 1,
    borderColor: '#f5c51830',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { color: '#f5c518', fontSize: 20, fontWeight: '700' },
  headerCenter: { alignItems: 'center', gap: 4 },
  headerEmoji: { fontSize: 28 },
  headerTitle: { color: '#f5c518', fontSize: 20, fontWeight: '900' },

  desc: { color: '#5a5a80', fontSize: 15, textAlign: 'center', marginBottom: 8 },

  // الأنماط
  modes: { gap: 14, flex: 1, justifyContent: 'center' },
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 18,
    backgroundColor: '#0f0f2e',
  },
  modeTeams: { borderColor: '#f5c51840' },
  modeSolo: { borderColor: '#3b82f640' },
  modeOnline: { borderColor: '#10b98140' },
  modeDisabled: { opacity: 0.45 },
  modeLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  modeEmoji: { fontSize: 32 },
  modeTitle: { color: '#f5c518', fontSize: 17, fontWeight: '800' },
  modeSubtitle: { color: '#5a5a80', fontSize: 12, marginTop: 2 },
  modeCostBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  modeCost: { fontSize: 12, fontWeight: '700' },

  // رقم قياسي
  highScoreBar: {
    backgroundColor: '#0f0f2e',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#f5c51820',
    alignItems: 'center',
    marginBottom: 12,
  },
  highScoreText: { color: '#f5c518', fontSize: 14, fontWeight: '700' },

  // رصيد
  tokenBar: { width: '100%' },
  tokenInner: {
    backgroundColor: '#0f0f2e',
    borderWidth: 1,
    borderColor: '#f5c51820',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tokenText: { color: '#7a6a40', fontSize: 14 },
  tokenAdd: { color: '#f5c518', fontSize: 13, fontWeight: '700' },
});
