/**
 * GuessImageScreen.js — تحدي تخمين الصورة
 * ════════════════════════════════════════════
 *  ✅ غرفة أونلاين 1v1 عبر Firestore
 *  ✅ 12 فئة — اختيار يدوي (1-5) أو عشوائي
 *  ✅ صور عبر روابط خارجية (Wikipedia / TMDB / Unsplash)
 *  ✅ كارت أزرق: يبدّل صورة جهازك بطلب شفهي من خصمك
 *  ✅ عداد 10 ثواني قبل ظهور الصورة
 *  ✅ زر "خمّنتها" يتفعّل فقط بعد ظهور الصورة
 *  ✅ ممنوع تكرار السؤال في دوره فقط (تنبيه مؤقت)
 *  ✅ أول من يصل 3 نقاط يفوز
 *  ✅ يتأثر بالثيم الحالي (24 ثيم)
 */

import React, {
  useState, useEffect, useRef, useCallback, useMemo,
} from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Image, Animated, StatusBar, Alert,
  ActivityIndicator, Platform,
} from 'react-native';
import { useTheme } from './ThemeContext';
import { useT } from './I18n';
import { playSound } from './SoundService';
import { ThemedButton, ThemedCard, ThemedModal } from './ThemedComponents';
import {
  collection, doc,
  setDoc, onSnapshot, updateDoc, deleteDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebaseConfig';




// ══════════════════════════════════════════════════════════════
//  بيانات الفئات والصور — مستوردة من GuessImageData.js
// ══════════════════════════════════════════════════════════════
import { GUESS_IMAGE_DATA as IMAGES, GUESS_CATEGORIES as CATEGORIES, pickRandomImage } from './GuessImageData';
// ══════════════════════════════════════════════════════════════
//  مساعد: كود غرفة عشوائي
// ══════════════════════════════════════════════════════════════
function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// pickRandomImage مستورد من GuessImageData.js

// ══════════════════════════════════════════════════════════════
//  InfoBox — صندوق المعلومات القابل للطي
//  يفتح/يخفى بنقرة على أي مكان في الشاشة خارج الأزرار
// ══════════════════════════════════════════════════════════════
function InfoBox({ image, visible, theme }) {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const BLUE = theme.blue || '#3b82f6';

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  if (!image?.info) return null;

  const info = image.info;
  const entries = Object.entries(info);

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [120, 0],
  });
  const opacity = slideAnim;

  return (
    <Animated.View style={[
      infoStyles.container,
      {
        backgroundColor: theme.bgCard,
        borderColor: BLUE,
        transform: [{ translateY }],
        opacity,
      },
    ]}>
      {/* عنوان الصندوق */}
      <View style={infoStyles.header}>
        <Text style={[infoStyles.headerIcon]}>💡</Text>
        <Text style={[infoStyles.headerText, { color: BLUE }]}>معلومات مساعدة</Text>
        <Text style={[infoStyles.headerHint, { color: theme.textMuted }]}>انقر للإخفاء</Text>
      </View>

      {/* اسم الشخصية/الفئة */}
      <View style={[infoStyles.answerRow, { backgroundColor: BLUE + '15' }]}>
        <Text style={[infoStyles.answerLabel, { color: theme.textMuted }]}>الصورة هي:</Text>
        <Text style={[infoStyles.answerValue, { color: BLUE }]}>{image.answer}</Text>
      </View>

      {/* صفوف المعلومات */}
      <View style={infoStyles.infoGrid}>
        {entries.slice(0, 8).map(([key, value], idx) => (
          <View key={idx} style={[
            infoStyles.infoRow,
            idx % 2 === 0 && { backgroundColor: theme.bgEl || theme.bg + '80' },
          ]}>
            <Text style={[infoStyles.infoKey, { color: theme.textMuted }]}>{key}</Text>
            <Text style={[infoStyles.infoVal, { color: theme.textPrimary }]} numberOfLines={2}>
              {String(value)}
            </Text>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

const infoStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 130,
    left: 12,
    right: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: 'hidden',
    zIndex: 50,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.3, shadowRadius: 8 },
      android: { elevation: 8 },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
  },
  headerIcon: { fontSize: 16 },
  headerText: { fontSize: 14, fontWeight: '800', flex: 1 },
  headerHint: { fontSize: 11 },
  answerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
  },
  answerLabel: { fontSize: 12, fontWeight: '600' },
  answerValue: { fontSize: 15, fontWeight: '900', flex: 1 },
  infoGrid: { paddingBottom: 8 },
  infoRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 8,
    alignItems: 'flex-start',
  },
  infoKey: { fontSize: 12, fontWeight: '700', width: 90, flexShrink: 0 },
  infoVal: { fontSize: 12, fontWeight: '500', flex: 1, textAlign: 'right' },
});



// ══════════════════════════════════════════════════════════════
//  SCREEN: اختيار الفئات (منشئ الغرفة)
// ══════════════════════════════════════════════════════════════
function SetupScreen({ onCreateRoom, theme, t }) {
  const [mode, setMode] = useState('custom'); // 'random' | 'custom'
  const [selected, setSelected] = useState([]);

  const toggleCat = (id) => {
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 5) return prev;
      return [...prev, id];
    });
  };

  const canStart = mode === 'random' || selected.length >= 1;

  const handleCreate = () => {
    const cats = mode === 'random'
      ? [...CATEGORIES].sort(() => Math.random() - 0.5).slice(0, 3).map(c => c.id)
      : selected;
    onCreateRoom(cats);
  };

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: 'transparent' }]}
      contentContainerStyle={styles.setupContent}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.statusBg} />

      {/* بطل اللعبة */}
      <ThemedCard radius={20} padding={24} style={{ alignItems: 'center', marginBottom: 20 }}>
        <Text style={styles.heroEmoji}>🖼️</Text>
        <Text style={[styles.heroName, { color: theme.accent }]}>تحدي تخمين الصورة</Text>
        <Text style={[styles.heroTag, { color: theme.textMuted }]}>صورة أمامك — خصمك يسأل، أنت تجيب</Text>
      </ThemedCard>

      {/* نوع الفئات */}
      <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>نوع الفئات</Text>
      <View style={styles.modeRow}>
        {[
          { id: 'random', label: '🎲 عشوائي' },
          { id: 'custom', label: '🎯 اختار بنفسي' },
        ].map(m => (
          <ThemedCard
            key={m.id}
            onPress={() => { playSound('tap'); setMode(m.id); }}
            radius={14} padding={14}
            variant={mode === m.id ? 'accent' : 'default'}
            style={{ flex: 1, alignItems: 'center' }}
          >
            <Text style={[styles.modeBtnText, { color: mode === m.id ? theme.accent : theme.textMuted }]}>
              {m.label}
            </Text>
          </ThemedCard>
        ))}
      </View>

      {/* شبكة الفئات */}
      {mode === 'custom' && (
        <>
          <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>
            اختر الفئات{' '}
            <Text style={{ color: theme.accent }}>{selected.length}/5</Text>
          </Text>
          <View style={styles.catsGrid}>
            {CATEGORIES.map(cat => {
              const isSelected = selected.includes(cat.id);
              const isDisabled = !isSelected && selected.length >= 5;
              return (
                <ThemedCard
                  key={cat.id}
                  onPress={() => { if (!isDisabled) { playSound('tap'); toggleCat(cat.id); } }}
                  style={[styles.catCard, { opacity: isDisabled ? 0.4 : 1 }]}
                  variant={isSelected ? 'accent' : 'default'}
                  disabled={isDisabled}
                >
                  {isSelected && (
                    <View style={[styles.catCheck, { backgroundColor: theme.accent }]}>
                      <Text style={[styles.catCheckText, { color: theme.bg }]}>✓</Text>
                    </View>
                  )}
                  <Text style={styles.catEmoji}>{cat.emoji}</Text>
                  <Text style={[styles.catName, { color: theme.textPrimary }]} numberOfLines={2}>
                    {cat.nameAr}
                  </Text>
                </ThemedCard>
              );
            })}
          </View>
          <Text style={[styles.catsHint, { color: theme.textMuted }]}>
            اختر من <Text style={{ color: theme.accent }}>1</Text> إلى <Text style={{ color: theme.accent }}>5</Text> فئات
          </Text>
        </>
      )}

      <ThemedButton
        onPress={handleCreate}
        label="🔗 إنشاء الغرفة"
        variant="primary"
        size="large"
        disabled={!canStart}
      />
    </ScrollView>
  );
}

// ══════════════════════════════════════════════════════════════
//  SCREEN: الانضمام لغرفة
// ══════════════════════════════════════════════════════════════
function JoinScreen({ onJoin, onBack, theme, t }) {
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);

  const handleJoin = async () => {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length < 4) return;
    setJoining(true);
    try {
      await onJoin(trimmed);
    } catch {
      Alert.alert('خطأ', 'الغرفة غير موجودة أو امتلأت');
    }
    setJoining(false);
  };

  return (
    <View style={[styles.flex, styles.center, { backgroundColor: 'transparent', padding: 24 }]}>
      <Text style={[styles.heroEmoji, { marginBottom: 16 }]}>🔍</Text>
      <Text style={[styles.heroName, { color: theme.accent, marginBottom: 8 }]}>انضم لغرفة</Text>
      <Text style={[styles.heroTag, { color: theme.textMuted, marginBottom: 32, textAlign: 'center' }]}>
        أدخل كود الغرفة الذي أرسله لك صديقك
      </Text>

      {/* حقل الكود */}
      <View style={[styles.codeInput, { backgroundColor: theme.bgCard, borderColor: theme.accent }]}>
        <Text style={[styles.codeInputText, { color: code ? theme.textPrimary : theme.textMuted }]}>
          {code || 'XXXXX'}
        </Text>
      </View>

      {/* كيبورد بسيط */}
      <View style={styles.keypad}>
        {'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('').filter((_, i) => i < 36).reduce((rows, char, i) => {
          const row = Math.floor(i / 9);
          if (!rows[row]) rows[row] = [];
          rows[row].push(char);
          return rows;
        }, []).map((row, ri) => (
          <View key={ri} style={styles.keyRow}>
            {row.map(char => (
              <ThemedCard key={char} onPress={() => setCode(prev => prev.length < 5 ? prev + char : prev)} style={styles.key}>
              <Text style={[styles.keyText, { color: theme.textPrimary }]}>{char}</Text>
            </ThemedCard>
            ))}
          </View>
        ))}
        <View style={styles.keyRow}>
          <ThemedCard onPress={() => setCode(prev => prev.slice(0, -1))} style={[styles.key, { flex: 2 }]}>
            <Text style={[styles.keyText, { color: theme.error }]}>⌫</Text>
          </ThemedCard>
          <ThemedCard onPress={() => setCode('')} style={styles.key}>
            <Text style={[styles.keyText, { color: theme.textMuted }]}>✕</Text>
          </ThemedCard>
        </View>
      </View>

      <ThemedButton
        onPress={handleJoin}
        label={joining ? '...' : '🚀 انضم'}
        variant="primary"
        size="large"
        disabled={code.length < 4 || joining}
        style={{ marginTop: 16, width: '100%', maxWidth: 320 }}
      />
      <ThemedButton
        onPress={onBack}
        label="← رجوع"
        variant="secondary"
        size="medium"
        style={{ marginTop: 8, width: '100%', maxWidth: 320 }}
      />
    </View>
  );
}

// ══════════════════════════════════════════════════════════════
//  SCREEN: الانتظار (منشئ الغرفة)
// ══════════════════════════════════════════════════════════════
function WaitScreen({ roomCode, playerName, theme }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={[styles.flex, styles.center, { backgroundColor: 'transparent', gap: 24, padding: 24 }]}>
      <Animated.View style={[
        styles.waitIcon,
        { backgroundColor: theme.bgCard, borderColor: theme.border, transform: [{ scale: pulseAnim }] },
      ]}>
        <Text style={{ fontSize: 48 }}>🖼️</Text>
      </Animated.View>

      <Text style={[styles.heroName, { color: theme.textPrimary }]}>انتظار الخصم...</Text>

      <View style={[styles.codeBox, { backgroundColor: theme.bgCard, borderColor: theme.accent }]}>
        <Text style={[styles.codeLabel, { color: theme.textMuted }]}>كود الغرفة</Text>
        <Text style={[styles.codeValue, { color: theme.accent }]}>{roomCode}</Text>
      </View>

      <Text style={[styles.heroTag, { color: theme.textMuted, textAlign: 'center' }]}>
        شارك الكود مع خصمك حتى ينضم
      </Text>

      <View style={[styles.playersRow]}>
        <View style={[styles.playerSlot, { backgroundColor: theme.bgCard, borderColor: theme.success }]}>
          <Text style={styles.playerAvatar}>🧑</Text>
          <Text style={[styles.playerName, { color: theme.textPrimary }]}>{playerName || 'أنت'}</Text>
          <Text style={[styles.playerStatus, { color: theme.success }]}>✓ جاهز</Text>
        </View>
        <Text style={[styles.vsBadge, { color: theme.textMuted }]}>VS</Text>
        <View style={[styles.playerSlot, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
          <Text style={styles.playerAvatar}>⏳</Text>
          <Text style={[styles.playerName, { color: theme.textMuted }]}>انتظار...</Text>
          <Text style={[styles.playerStatus, { color: theme.textMuted }]}>لم ينضم بعد</Text>
        </View>
      </View>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════
//  SCREEN: التعليمات
// ══════════════════════════════════════════════════════════════
function RulesScreen({ onStart, theme }) {
  const RULES = [
    { n: 1, text: 'ضع هاتفك أمامك دون أن ترى الصورة على الشاشة' },
    { n: 2, text: 'اسأل خصمك أسئلة جوابها نعم أو لا فقط' },
    { n: 3, text: 'ممنوع تكرار السؤال في دورك — من يكرر يضيع دوره' },
    { n: 4, text: 'عندما تعرف الإجابة اضغط "خمّنتها ✓" لتحصل على النقطة' },
    { n: 5, text: 'أول لاعب يصل إلى 3 نقاط يفوز' },
  ];

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: 'transparent' }]}
      contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.rulesHero}>
        <Text style={{ fontSize: 60, textAlign: 'center' }}>📋</Text>
        <Text style={[styles.heroName, { color: theme.accent, textAlign: 'center', marginTop: 10 }]}>
          كيف تلعب؟
        </Text>
        <Text style={[styles.heroTag, { color: theme.textMuted, textAlign: 'center' }]}>
          اقرأ التعليمات قبل البداية
        </Text>
      </View>

      {RULES.map(r => (
        <View key={r.n} style={[styles.ruleItem, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
          <View style={[styles.ruleNum, { backgroundColor: theme.accentSoft, borderColor: theme.accent }]}>
            <Text style={[styles.ruleNumText, { color: theme.accent }]}>{r.n}</Text>
          </View>
          <Text style={[styles.ruleText, { color: theme.textPrimary }]}>{r.text}</Text>
        </View>
      ))}

      {/* شرح الكارت الأزرق */}
      <View style={[styles.blueCardInfo, { backgroundColor: theme.bgCard, borderColor: theme.blue || '#3b82f6' }]}>
        <View style={[styles.blueCardIcon, {
          backgroundColor: (theme.blue || '#3b82f6') + '20',
          borderColor: theme.blue || '#3b82f6',
        }]}>
          <Text style={{ fontSize: 20 }}>🔵</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.blueCardTitle, { color: theme.blue || '#3b82f6' }]}>الكارت الأزرق</Text>
          <Text style={[styles.blueCardDesc, { color: theme.textMuted }]}>
            مرة واحدة في اللعبة — عندما يطلب منك خصمك استخدام الكارت الأزرق، اضغطه لتبديل صورتك بأخرى تظهر بعد 10 ثواني
          </Text>
        </View>
      </View>

      <ThemedButton
        onPress={() => { playSound('tap'); onStart(); }}
        label="🎮 ابدأ اللعبة"
        variant="primary"
        size="large"
        style={{ marginTop: 24 }}
      />
    </ScrollView>
  );
}

// ══════════════════════════════════════════════════════════════
//  SCREEN: اللعب الرئيسي
// ══════════════════════════════════════════════════════════════
function PlayScreen({
  myScore, oppScore, round, totalRounds,
  currentImage, imageVisible, countdown,
  blueUsed, blueCardCountdown, blueCardActive,
  onGuess, onBlueCard,
  opponentName, categoryEmoji, categoryName,
  theme, infoVisible, onToggleInfo,
}) {
  const guessAnim = useRef(new Animated.Value(1)).current;

  const handleGuess = () => {
    Animated.sequence([
      Animated.timing(guessAnim, { toValue: 0.93, duration: 80, useNativeDriver: true }),
      Animated.timing(guessAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();
    playSound('correct');
    onGuess();
  };

  const BLUE = theme.blue || '#3b82f6';
  const BLUE_SOFT = (theme.blue || '#3b82f6') + '20';

  return (
    <TouchableOpacity
      style={styles.flex}
      activeOpacity={1}
      onPress={currentImage?.info ? onToggleInfo : undefined}
    >
    <View style={[styles.flex, { backgroundColor: 'transparent' }]}>
      {/* صندوق المعلومات */}
      <InfoBox image={currentImage} visible={infoVisible} theme={theme} />

      {/* هيدر النقاط */}
      <View style={[styles.playTop, { borderColor: theme.border }]}>
        {/* نقاط خصمك (يسار) */}
        <View style={styles.scoreBox}>
          <Text style={[styles.scoreName, { color: theme.textMuted }]}>خصمك</Text>
          <View style={styles.scoreDots}>
            {[1, 2, 3].map(i => (
              <View key={i} style={[
                styles.scoreDot,
                { borderColor: theme.purple || theme.accent },
                oppScore >= i && { backgroundColor: theme.purple || theme.accent },
              ]} />
            ))}
          </View>
        </View>

        {/* الجولة + الكارت الأزرق */}
        <View style={styles.playTopCenter}>
          <View style={[styles.roundBadge, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
            <Text style={[styles.roundText, { color: theme.textMuted }]}>الجولة {round}</Text>
          </View>

          {/* زر الكارت الأزرق — دائري صغير أعلى اليمين */}
          <ThemedButton
            onPress={blueUsed ? null : onBlueCard}
            disabled={blueUsed}
            label='🔵'
            variant={blueUsed ? 'ghost' : 'secondary'}
            size='small'
            style={[styles.blueCardSmall, { opacity: blueUsed ? 0.4 : 1 }]}
          />
        </View>

        {/* نقاطك (يمين) */}
        <View style={styles.scoreBox}>
          <Text style={[styles.scoreName, { color: theme.textMuted }]}>أنت</Text>
          <View style={styles.scoreDots}>
            {[1, 2, 3].map(i => (
              <View key={i} style={[
                styles.scoreDot,
                { borderColor: theme.accent },
                myScore >= i && { backgroundColor: theme.accent },
              ]} />
            ))}
          </View>
        </View>
      </View>

      {/* منطقة الصورة */}
      <View style={styles.playMain}>
        <View style={[styles.imageFrame, { borderColor: imageVisible ? theme.accent : theme.border }]}>
          {/* عداد قبل الصورة */}
          {!imageVisible && !blueCardActive && (
            <View style={[styles.countdownOverlay, { backgroundColor: theme.bgCard }]}>
              <Text style={[styles.countdownNum, { color: theme.accent }]}>{countdown}</Text>
              <Text style={[styles.countdownLabel, { color: theme.textMuted }]}>الصورة تظهر بعد...</Text>
            </View>
          )}

          {/* عداد كارت أزرق */}
          {blueCardActive && (
            <View style={[styles.countdownOverlay, { backgroundColor: theme.bgCard }]}>
              <Text style={[styles.countdownNum, { color: BLUE }]}>{blueCardCountdown}</Text>
              <Text style={[styles.countdownLabel, { color: theme.textMuted }]}>صورة جديدة قادمة...</Text>
            </View>
          )}

          {/* الصورة */}
          {imageVisible && !blueCardActive && currentImage?.url ? (
            <Image
              source={{ uri: currentImage.url }}
              style={styles.mainImage}
              resizeMode="cover"
            />
          ) : null}
        </View>

        {/* معلومات الخصم والفئة */}
        <View style={[styles.oppInfo, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
          <Text style={{ fontSize: 24 }}>👤</Text>
          <View style={{ flex: 1, marginHorizontal: 10 }}>
            <Text style={[styles.oppName, { color: theme.textPrimary }]}>{opponentName || 'خصمك'}</Text>
            <Text style={[styles.oppSub, { color: theme.textMuted }]}>يسألك الآن...</Text>
          </View>
          <Text style={[styles.catBadge, { color: theme.textMuted }]}>{categoryEmoji} {categoryName}</Text>
        </View>
      </View>

      {/* زر خمّنتها */}
      <View style={styles.actionArea}>
        <Animated.View style={{ transform: [{ scale: guessAnim }], width: '100%' }}>
          <ThemedButton
            onPress={handleGuess}
            label="✓ خمّنتها!"
            variant="success"
            size="large"
            disabled={!imageVisible || blueCardActive}
          />
        </Animated.View>
      </View>
    </View>
    </TouchableOpacity>
  );
}

// ══════════════════════════════════════════════════════════════
//  SCREEN: شاشة بينية
// ══════════════════════════════════════════════════════════════
function BetweenScreen({ myScore, oppScore, round, answer, iWon, onNext, theme }) {
  return (
    <View style={[styles.flex, styles.center, { backgroundColor: 'transparent', padding: 24, gap: 20 }]}>
      <Text style={{ fontSize: 64 }}>{iWon ? '🎉' : '😔'}</Text>
      <Text style={[styles.heroName, { color: iWon ? theme.accent : theme.error }]}>
        {iWon ? 'أحسنت! نقطة لك 🎯' : 'خصمك حصل على النقطة'}
      </Text>
      <Text style={[styles.heroTag, { color: theme.textMuted }]}>الجولة {round} انتهت</Text>

      {/* كشف الإجابة */}
      <ThemedCard radius={18} padding={20} variant="accent" style={{ alignItems: 'center' }}>
        <Text style={[styles.answerLabel, { color: theme.textMuted }]}>الصورة كانت</Text>
        <Text style={[styles.answerText, { color: theme.accent }]}>{answer}</Text>
      </ThemedCard>

      {/* النقاط */}
      <View style={styles.scoreRow}>
        {[
          { label: 'أنت', score: myScore, win: myScore >= oppScore },
          { label: 'خصمك', score: oppScore, win: oppScore > myScore },
        ].map(p => (
          <ThemedCard
            key={p.label}
            radius={16} padding={16}
            variant={p.win ? 'accent' : 'default'}
            style={{ flex: 1, alignItems: 'center' }}
          >
            <Text style={[styles.scoreCardName, { color: theme.textMuted }]}>{p.label}</Text>
            <Text style={[styles.scoreCardVal, { color: p.win ? theme.accent : theme.textPrimary }]}>
              {p.score}
            </Text>
          </ThemedCard>
        ))}
      </View>

      <ThemedButton
        onPress={() => { playSound('tap'); onNext(); }}
        label="الجولة التالية ←"
        variant="primary"
        size="large"
        style={{ width: '100%', maxWidth: 320 }}
      />
    </View>
  );
}

// ══════════════════════════════════════════════════════════════
//  SCREEN: النتائج النهائية
// ══════════════════════════════════════════════════════════════
function ResultScreen({ myScore, oppScore, opponentName, onRematch, onBack, theme }) {
  const iWon = myScore > oppScore;
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    playSound(iWon ? 'win' : 'lose');
    Animated.spring(bounceAnim, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }).start();
  }, []);

  return (
    <View style={[styles.flex, styles.center, { backgroundColor: 'transparent', padding: 24, gap: 20 }]}>
      <Animated.Text style={[{ fontSize: 80 }, { transform: [{ scale: bounceAnim }] }]}>
        {iWon ? '🏆' : '🥈'}
      </Animated.Text>
      <Text style={[styles.heroName, { color: theme.accent, fontSize: 26 }]}>انتهت اللعبة!</Text>
      <Text style={[styles.heroName, { color: iWon ? theme.success : theme.textMuted }]}>
        {iWon ? '🎉 أنت الفائز!' : `🏅 ${opponentName || 'خصمك'} فاز`}
      </Text>
      <Text style={[styles.heroTag, { color: theme.textMuted }]}>
        {iWon ? 'وصلت للثلاث نقاط أولاً' : 'المباراة القادمة ستكون لك'}
      </Text>

      <View style={styles.scoreRow}>
        {[
          { label: 'أنت', score: myScore, win: iWon },
          { label: opponentName || 'خصمك', score: oppScore, win: !iWon },
        ].map((p, i) => (
          <ThemedCard
            key={i}
            radius={18} padding={20}
            variant={p.win ? 'accent' : 'default'}
            style={{ flex: 1, alignItems: 'center', position: 'relative' }}
          >
            {p.win && <Text style={styles.crownAbove}>👑</Text>}
            <Text style={[styles.scoreCardName, { color: theme.textMuted }]}>{p.label}</Text>
            <Text style={[styles.scoreCardVal, { color: p.win ? theme.accent : theme.textPrimary, fontSize: 36 }]}>
              {p.score}
            </Text>
          </ThemedCard>
        ))}
      </View>

      <ThemedButton
        onPress={() => { playSound('tap'); onRematch(); }}
        label="🔄 تحدي مجدداً"
        variant="primary"
        size="large"
        style={{ width: '100%', maxWidth: 320 }}
      />
      <ThemedButton
        onPress={() => { playSound('tap'); onBack(); }}
        label="← الرئيسية"
        variant="secondary"
        size="medium"
        style={{ width: '100%', maxWidth: 320 }}
      />
    </View>
  );
}

// ══════════════════════════════════════════════════════════════
//  الشاشة الرئيسية — منطق اللعبة
// ══════════════════════════════════════════════════════════════
export default function GuessImageScreen({ onBack, currentUser, onGameEnd, onGameReady }) {
  const { theme } = useTheme();
  const t = useT();

  // ── حالة التدفق ──
  const [flow, setFlow] = useState('lobby'); // 'lobby' | 'wait' | 'join' | 'rules' | 'play' | 'between' | 'result'

  // ── بيانات الغرفة ──
  const [roomId, setRoomId]       = useState(null);
  const [roomCode, setRoomCode]   = useState('');
  const [isHost, setIsHost]       = useState(false);
  const [roomData, setRoomData]   = useState(null);

  // ── حالة اللعبة ──
  const [myScore, setMyScore]       = useState(0);
  const [oppScore, setOppScore]     = useState(0);
  const [round, setRound]           = useState(1);
  const [imageVisible, setImageVisible] = useState(false);
  const [countdown, setCountdown]   = useState(10);
  const [blueUsed, setBlueUsed]     = useState(false);
  const [blueCardActive, setBlueCardActive] = useState(false);
  const [blueCardCountdown, setBlueCardCountdown] = useState(10);
  const [currentImage, setCurrentImage] = useState(null);
  const [usedImageIds, setUsedImageIds] = useState([]);
  const [infoVisible, setInfoVisible] = useState(false);
  const [betweenData, setBetweenData] = useState(null);
  const [selectedCats, setSelectedCats] = useState([]);
  const [roundCatIdx, setRoundCatIdx] = useState(0);

  const countdownRef   = useRef(null);
  const blueTimerRef   = useRef(null);
  const unsubscribeRef = useRef(null);

  const myUid  = currentUser?.uid || 'player1';
  const myName = currentUser?.name || 'لاعب';

  // ── تنظيف عند الخروج ──
  useEffect(() => {
    return () => {
      clearInterval(countdownRef.current);
      clearInterval(blueTimerRef.current);
      if (unsubscribeRef.current) unsubscribeRef.current();
    };
  }, []);

  // ── الاستماع لتغييرات الغرفة ──
  const listenRoom = useCallback((rid) => {
    const ref = doc(db, 'guessImageRooms', rid);
    const unsub = onSnapshot(ref, snap => {
      if (!snap.exists()) { onBack(); return; }
      const data = snap.data();
      setRoomData(data);

      // خصم انضم → انتقل للتعليمات
      if (data.status === 'ready' && flow === 'wait') {
        if (onGameReady) onGameReady();
        setFlow('rules');
      }
    });
    unsubscribeRef.current = unsub;
  }, [flow]);

  // ── إنشاء غرفة ──
  const createRoom = useCallback(async (cats) => {
    const code = genCode();
    const rid  = `gi_${code}`;
    setSelectedCats(cats);
    setRoomId(rid);
    setRoomCode(code);
    setIsHost(true);

    await setDoc(doc(db, 'guessImageRooms', rid), {
      code,
      host:   { uid: myUid, name: myName, score: 0 },
      guest:  null,
      status: 'waiting',
      cats,
      round:  1,
      createdAt: serverTimestamp(),
    });

    listenRoom(rid);
    setFlow('wait');
    // القلب يُخصم عند انضمام الخصم في listenRoom
  }, [myUid, myName, listenRoom]);

  // ── الانضمام لغرفة ──
  const joinRoom = useCallback(async (code) => {
    const rid = `gi_${code}`;
    const ref = doc(db, 'guessImageRooms', rid);
    // نقرأ بيانات الغرفة أولاً
    await updateDoc(ref, {
      guest:  { uid: myUid, name: myName, score: 0 },
      status: 'ready',
    });
    setRoomId(rid);
    setRoomCode(code);
    setIsHost(false);
    listenRoom(rid);
    setFlow('rules');
    if (onGameReady) onGameReady();
  }, [myUid, myName, listenRoom]);

  // ── بدء الجولة ──
  const startRound = useCallback((roundNum, cats, usedIds = []) => {
    clearInterval(countdownRef.current);
    setImageVisible(false);
    setBlueCardActive(false);
    setInfoVisible(false);

    // اختيار الفئة للجولة
    const catIdx = (roundNum - 1) % (cats.length || 1);
    const catId  = cats[catIdx] || cats[0];
    const img    = pickRandomImage(catId, usedIds);
    setCurrentImage(img);
    setUsedImageIds(prev => [...prev, img.id]);

    // بدء العداد
    let n = 10;
    setCountdown(n);
    countdownRef.current = setInterval(() => {
      n--;
      setCountdown(n);
      if (n <= 0) {
        clearInterval(countdownRef.current);
        setImageVisible(true);
      }
    }, 1000);
  }, []);

  // ── ضغط "ابدأ اللعبة" من شاشة التعليمات ──
  const handleStartGame = useCallback(() => {
    const cats = roomData?.cats || selectedCats;
    setFlow('play');
    setRound(1);
    setMyScore(0);
    setOppScore(0);
    setUsedImageIds([]);
    startRound(1, cats, []);
  }, [roomData, selectedCats, startRound]);

  // ── خمّنتها ──
  const handleGuess = useCallback(() => {
    clearInterval(countdownRef.current);
    const newMyScore = myScore + 1;
    setMyScore(newMyScore);

    setBetweenData({
      round,
      answer: currentImage?.answer || '?',
      iWon: true,
    });

    if (newMyScore >= 3) {
      setTimeout(() => setFlow('result'), 300);
    } else {
      setFlow('between');
    }
  }, [myScore, round, currentImage]);

  // ── الكارت الأزرق ──
  const handleBlueCard = useCallback(() => {
    if (blueUsed) return;
    setBlueUsed(true);
    clearInterval(countdownRef.current);
    setImageVisible(false);
    setBlueCardActive(true);
    playSound('tap');

    // اختيار صورة جديدة
    const cats = roomData?.cats || selectedCats;
    const catIdx = (round - 1) % (cats.length || 1);
    const catId  = cats[catIdx] || cats[0];
    const newImg = pickRandomImage(catId, usedImageIds);
    setCurrentImage(newImg);
    setUsedImageIds(prev => [...prev, newImg.id]);

    let n = 10;
    setBlueCardCountdown(n);
    blueTimerRef.current = setInterval(() => {
      n--;
      setBlueCardCountdown(n);
      if (n <= 0) {
        clearInterval(blueTimerRef.current);
        setBlueCardActive(false);
        setImageVisible(true);
      }
    }, 1000);
  }, [blueUsed, round, roomData, selectedCats, usedImageIds]);

  // ── الجولة التالية ──
  const handleNextRound = useCallback(() => {
    const nextRound = round + 1;
    const cats = roomData?.cats || selectedCats;
    setRound(nextRound);
    setBlueCardActive(false);
    setFlow('play');
    startRound(nextRound, cats, usedImageIds);
  }, [round, roomData, selectedCats, usedImageIds, startRound]);

  // ── بيانات الفئة الحالية ──
  const currentCat = useMemo(() => {
    const cats = roomData?.cats || selectedCats;
    const catId = cats[(round - 1) % (cats.length || 1)];
    return CATEGORIES.find(c => c.id === catId) || CATEGORIES[0];
  }, [round, roomData, selectedCats]);

  const opponentName = isHost
    ? (roomData?.guest?.name || 'خصمك')
    : (roomData?.host?.name  || 'خصمك');

  // ══════════════════════════════════════════════════════════════
  //  Render
  // ══════════════════════════════════════════════════════════════

  // اختيار الشاشة الأولى
  if (flow === 'lobby') {
    return (
      <View style={styles.flex}>
        <View style={[styles.lobbyHeader, { backgroundColor: 'transparent', borderColor: theme.border }]}>
          <ThemedButton onPress={onBack} label='←' variant='ghost' size='small' style={styles.backBtn} />
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>تحدي تخمين الصورة</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={[styles.flex, styles.center, { padding: 24, gap: 16 }]}>
          <Text style={{ fontSize: 64 }}>🖼️</Text>
          <Text style={[styles.heroName, { color: theme.accent }]}>تحدي تخمين الصورة</Text>
          <Text style={[styles.heroTag, { color: theme.textMuted, textAlign: 'center', marginBottom: 16 }]}>
            صورة أمام وجهك — خصمك يسأل، أنت تجيب
          </Text>

          <ThemedButton
            onPress={() => { playSound('tap'); setFlow('setup'); }}
            label="➕ إنشاء غرفة"
            variant="primary"
            size="large"
            style={{ width: '100%', maxWidth: 320 }}
          />
          <ThemedButton
            onPress={() => { playSound('tap'); setFlow('join'); }}
            label="🔑 انضم لغرفة"
            variant="secondary"
            size="large"
            style={{ width: '100%', maxWidth: 320 }}
          />
        </View>
      </View>
    );
  }

  if (flow === 'setup') {
    return (
      <View style={styles.flex}>
        <View style={[styles.lobbyHeader, { backgroundColor: 'transparent', borderColor: theme.border }]}>
          <ThemedButton onPress={() => setFlow('lobby')} label='←' variant='ghost' size='small' style={styles.backBtn} />
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>إنشاء غرفة</Text>
          <View style={{ width: 40 }} />
        </View>
        <SetupScreen onCreateRoom={createRoom} theme={theme} t={t} />
      </View>
    );
  }

  if (flow === 'join') {
    return (
      <View style={styles.flex}>
        <View style={[styles.lobbyHeader, { backgroundColor: 'transparent', borderColor: theme.border }]}>
          <ThemedButton onPress={() => setFlow('lobby')} label='←' variant='ghost' size='small' style={styles.backBtn} />
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>انضم لغرفة</Text>
          <View style={{ width: 40 }} />
        </View>
        <JoinScreen onJoin={joinRoom} onBack={() => setFlow('lobby')} theme={theme} t={t} />
      </View>
    );
  }

  if (flow === 'wait') {
    return (
      <View style={styles.flex}>
        <View style={[styles.lobbyHeader, { backgroundColor: 'transparent', borderColor: theme.border }]}>
          <ThemedButton onPress={onBack} label='←' variant='ghost' size='small' style={styles.backBtn} />
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>انتظار الخصم</Text>
          <View style={{ width: 40 }} />
        </View>
        <WaitScreen roomCode={roomCode} playerName={myName} theme={theme} />
      </View>
    );
  }

  if (flow === 'rules') {
    return (
      <View style={styles.flex}>
        <View style={[styles.lobbyHeader, { backgroundColor: 'transparent', borderColor: theme.border }]}>
          <View style={{ width: 40 }} />
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>كيف تلعب؟</Text>
          <View style={{ width: 40 }} />
        </View>
        <RulesScreen onStart={handleStartGame} theme={theme} />
      </View>
    );
  }

  if (flow === 'play') {
    return (
      <PlayScreen
        myScore={myScore}
        oppScore={oppScore}
        round={round}
        currentImage={currentImage}
        imageVisible={imageVisible}
        countdown={countdown}
        blueUsed={blueUsed}
        blueCardActive={blueCardActive}
        blueCardCountdown={blueCardCountdown}
        onGuess={handleGuess}
        onBlueCard={handleBlueCard}
        opponentName={opponentName}
        categoryEmoji={currentCat?.emoji}
        categoryName={currentCat?.nameAr}
        theme={theme}
        infoVisible={infoVisible}
        onToggleInfo={() => setInfoVisible(v => !v)}
      />
    );
  }

  if (flow === 'between' && betweenData) {
    return (
      <BetweenScreen
        myScore={myScore}
        oppScore={oppScore}
        round={betweenData.round}
        answer={betweenData.answer}
        iWon={betweenData.iWon}
        onNext={handleNextRound}
        theme={theme}
      />
    );
  }

  if (flow === 'result') {
    return (
      <ResultScreen
        myScore={myScore}
        oppScore={oppScore}
        opponentName={opponentName}
        onRematch={() => {
          setMyScore(0);
          setOppScore(0);
          setRound(1);
          setBlueUsed(false);
          setUsedImageIds([]);
          const cats = roomData?.cats || selectedCats;
          setFlow('play');
          startRound(1, cats, []);
        }}
        onBack={() => { onBack(); if (onGameEnd) onGameEnd(myScore > oppScore); }}
        theme={theme}
      />
    );
  }

  return null;
}

// ══════════════════════════════════════════════════════════════
//  الأنماط
// ══════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  flex:     { flex: 1 },
  center:   { alignItems: 'center', justifyContent: 'center' },

  // هيدر
  lobbyHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 52 : 16, paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn:     { width: 38, height: 38, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  backText:    { fontSize: 18, fontWeight: '700' },
  headerTitle: { fontSize: 17, fontWeight: '800' },

  // إعداد
  setupContent: { padding: 20, paddingBottom: 40 },
  gameHero:     { borderRadius: 20, borderWidth: 1, padding: 24, alignItems: 'center', marginBottom: 24 },
  heroEmoji:    { fontSize: 52, textAlign: 'center' },
  heroName:     { fontSize: 20, fontWeight: '900', marginBottom: 4 },
  heroTag:      { fontSize: 14, lineHeight: 20 },

  sectionLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 10, textTransform: 'uppercase' },
  modeRow:      { flexDirection: 'row', gap: 10, marginBottom: 20 },
  modeBtn:      { flex: 1, padding: 14, borderRadius: 14, borderWidth: 1.5, alignItems: 'center' },
  modeBtnText:  { fontSize: 14, fontWeight: '700' },

  catsGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  catCard:   { width: '30%', borderRadius: 14, borderWidth: 1.5, padding: 12, alignItems: 'center', position: 'relative' },
  catCheck:  { position: 'absolute', top: 6, left: 6, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  catCheckText: { fontSize: 10, fontWeight: '900' },
  catEmoji:  { fontSize: 26, marginBottom: 5 },
  catName:   { fontSize: 11, fontWeight: '700', textAlign: 'center' },
  catsHint:  { fontSize: 13, textAlign: 'center', marginBottom: 20 },

  mainBtn:     { paddingVertical: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  mainBtnText: { fontSize: 17, fontWeight: '900' },
  linkText:    { fontSize: 14 },

  // انتظار
  waitIcon:  { width: 100, height: 100, borderRadius: 28, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  codeBox:   { borderWidth: 2, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 40, alignItems: 'center', borderStyle: 'dashed' },
  codeLabel: { fontSize: 13, marginBottom: 6 },
  codeValue: { fontSize: 34, fontWeight: '900', letterSpacing: 6 },
  playersRow: { flexDirection: 'row', gap: 20, alignItems: 'center' },
  playerSlot: { borderRadius: 14, borderWidth: 1.5, padding: 16, alignItems: 'center', minWidth: 110 },
  playerAvatar: { fontSize: 32, marginBottom: 6 },
  playerName:   { fontSize: 13, fontWeight: '700' },
  playerStatus: { fontSize: 11, marginTop: 3 },
  vsBadge:      { fontSize: 20, fontWeight: '900' },

  // تعليمات
  rulesHero: { paddingVertical: 24, marginBottom: 16 },
  ruleItem:  { flexDirection: 'row', gap: 12, alignItems: 'flex-start', borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10 },
  ruleNum:   { width: 30, height: 30, borderRadius: 9, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  ruleNumText: { fontSize: 13, fontWeight: '900' },
  ruleText:  { fontSize: 14, lineHeight: 22, fontWeight: '500', flex: 1, textAlign: 'right' },

  blueCardInfo:  { flexDirection: 'row', gap: 12, alignItems: 'flex-start', borderRadius: 14, borderWidth: 1.5, padding: 14, marginTop: 8 },
  blueCardIcon:  { width: 44, height: 44, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  blueCardTitle: { fontSize: 14, fontWeight: '800', marginBottom: 4 },
  blueCardDesc:  { fontSize: 13, lineHeight: 20 },

  // لعب
  playTop: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 52 : 16,
    paddingBottom: 10, borderBottomWidth: 1,
  },
  scoreBox:      { alignItems: 'center' },
  scoreName:     { fontSize: 11, marginBottom: 5 },
  scoreDots:     { flexDirection: 'row', gap: 5 },
  scoreDot:      { width: 13, height: 13, borderRadius: 7, borderWidth: 1.5 },
  playTopCenter: { alignItems: 'center', gap: 6 },
  roundBadge:    { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 5 },
  roundText:     { fontSize: 13, fontWeight: '700' },

  blueCardSmall: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 1.5, alignItems: 'center', justifyContent: 'center',
  },

  playMain:  { flex: 1, alignItems: 'center', padding: 20, gap: 14 },
  imageFrame: {
    width: '100%', maxWidth: 340, aspectRatio: 1,
    borderRadius: 22, borderWidth: 2, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
  },
  mainImage: { width: '100%', height: '100%' },

  countdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 20,
  },
  countdownNum:   { fontSize: 80, fontWeight: '900', lineHeight: 90 },
  countdownLabel: { fontSize: 14, marginTop: 4 },

  oppInfo:   { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, padding: 12, width: '100%', maxWidth: 340 },
  oppName:   { fontSize: 14, fontWeight: '700' },
  oppSub:    { fontSize: 12, marginTop: 2 },
  catBadge:  { fontSize: 12 },

  actionArea: { paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 24, gap: 10 },
  guessBtn:   { paddingVertical: 18, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  guessBtnText: { fontSize: 18, fontWeight: '900' },

  // بين الجولات
  answerBox:  { borderRadius: 18, borderWidth: 1.5, paddingVertical: 18, paddingHorizontal: 32, alignItems: 'center' },
  answerLabel: { fontSize: 13, marginBottom: 6 },
  answerText:  { fontSize: 22, fontWeight: '900' },
  scoreRow:    { flexDirection: 'row', gap: 14, width: '100%', maxWidth: 320 },
  scoreCard:   { flex: 1, borderRadius: 16, borderWidth: 1, padding: 16, alignItems: 'center', position: 'relative' },
  scoreCardName: { fontSize: 12, marginBottom: 6 },
  scoreCardVal:  { fontSize: 32, fontWeight: '900' },
  crownAbove:    { position: 'absolute', top: -14, fontSize: 24 },

  // كيبورد
  codeInput: { borderRadius: 16, borderWidth: 2, paddingVertical: 16, paddingHorizontal: 40, marginBottom: 20, minWidth: 200, alignItems: 'center' },
  codeInputText: { fontSize: 32, fontWeight: '900', letterSpacing: 6 },
  keypad:    { gap: 6 },
  keyRow:    { flexDirection: 'row', gap: 5 },
  key:       { flex: 1, borderRadius: 8, borderWidth: 1, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', minWidth: 32 },
  keyText:   { fontSize: 13, fontWeight: '700' },
});
