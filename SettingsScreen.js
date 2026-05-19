/**
 * SettingsScreen.js
 * ════════════════════════════════════════════════════════════
 *  ✅ ثلاث مجموعات ثيمات: Standard / Mist / Crystal
 *  ✅ كل ثيم: صورة preview عند الضغط على الإيموجي
 *  ✅ تخطيط صف: صورة ← اسم ← مؤشر اختيار (RTL)
 *  ✅ كل باقي الإعدادات محفوظة كما هي
 */

import { useState, useEffect, useCallback, memo } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  StatusBar, ScrollView, Switch, Alert, Linking,
  Modal, Image, Dimensions,
} from 'react-native';
import {
  getMusicEnabled, getSoundsEnabled,
  setMusicEnabled, setSoundsEnabled,
} from './SoundService';
import { useLanguage } from './I18n';
import { useTheme, THEME_GROUPS } from './ThemeContext';
import { EXPERIENCES } from './OnboardingScreen';
import { purchaseTheme, isThemeUnlocked } from './ProService';

const PACKAGES = [
  { amount: 200,  price: '0.99$' },
  { amount: 500,  price: '1.99$' },
  { amount: 1200, price: '3.99$' },
];

const { width: SW, height: SH } = Dimensions.get('window');

// ══════════════════════════════════════════════════════════════
//  مكوّنات مساعدة
// ══════════════════════════════════════════════════════════════

const PackCard = memo(({ amount, price, onPress, theme }) => (
  <TouchableOpacity
    style={[styles.packCard, { backgroundColor: theme.bgInput, borderColor: theme.accentBorder }]}
    onPress={onPress} activeOpacity={0.8}
  >
    <Text style={[styles.packAmount, { color: theme.accent }]}>{amount}</Text>
    <Text style={styles.packCoin}>🪙</Text>
    <Text style={[styles.packPrice, { color: theme.textSecondary }]}>{price}</Text>
  </TouchableOpacity>
));

const SettingRow = memo(({ label, sub, value, onChange, theme }) => (
  <View style={styles.row}>
    <View style={{ flex: 1 }}>
      <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>{label}</Text>
      {sub ? <Text style={[styles.rowSub, { color: theme.textSecondary }]}>{sub}</Text> : null}
    </View>
    <Switch
      value={value}
      onValueChange={onChange}
      trackColor={{ false: theme.borderCard, true: theme.accent }}
      thumbColor={value ? theme.textOnAccent : theme.textPrimary}
    />
  </View>
));

const Section = memo(({ title, children, theme }) => (
  <View style={styles.section}>
    <Text style={[styles.sectionTitle, { color: theme.accent }]}>{title}</Text>
    <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard }]}>
      {children}
    </View>
  </View>
));

const Div = memo(({ theme }) => (
  <View style={[styles.divider, { backgroundColor: theme.divider }]} />
));

const LangOption = memo(({ flag, name, sub, active, onPress, theme }) => (
  <TouchableOpacity
    style={[styles.langRow, active && { backgroundColor: theme.accentSoft }]}
    onPress={onPress} activeOpacity={0.8}
  >
    <View style={styles.langLeft}>
      <Text style={styles.langFlag}>{flag}</Text>
      <View>
        <Text style={[styles.langName, { color: active ? theme.textPrimary : theme.textSecondary }]}>{name}</Text>
        <Text style={[styles.langSub, { color: theme.textMuted }]}>{sub}</Text>
      </View>
    </View>
    <View style={[styles.radio, { borderColor: active ? theme.accent : theme.borderCard }]}>
      {active && <View style={[styles.radioFill, { backgroundColor: theme.accent }]} />}
    </View>
  </TouchableOpacity>
));

const ExperienceRow = memo(({ label, sub, current, onPress, theme }) => (
  <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.8}>
    <View style={{ flex: 1 }}>
      <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>{label}</Text>
      {sub ? <Text style={[styles.rowSub, { color: theme.textSecondary }]}>{sub}</Text> : null}
    </View>
    <View style={styles.rowRight}>
      <Text style={[styles.rowValue, { color: theme.accent, fontWeight: '700' }]}>{current}</Text>
      <Text style={[styles.arrow, { color: theme.textMuted }]}>‹</Text>
    </View>
  </TouchableOpacity>
));

// ══════════════════════════════════════════════════════════════
//  PreviewModal — نافذة معاينة الثيم
// ══════════════════════════════════════════════════════════════

const PreviewModal = memo(({ item, visible, onClose, onSelect, onBuy, isActive, isLocked = false, isPro = false, lang }) => {
  if (!item) return null;
  const isRtl = lang === 'ar';
  const t = item.theme;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.previewOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity activeOpacity={1} style={styles.previewContainer}>

          {/* محاكاة شاشة الهاتف */}
          <View style={[styles.previewPhone, { backgroundColor: t.bg, borderColor: t.borderCard }]}>

            {/* Status bar */}
            <View style={[styles.previewStatus, { borderBottomColor: t.divider }]}>
              <Text style={[styles.previewStatusText, { color: t.textMuted }]}>📶</Text>
              <Text style={[styles.previewStatusText, { color: t.textMuted }]}>9:41</Text>
            </View>

            {/* Header */}
            <View style={[styles.previewHeader, { backgroundColor: t.bgCard, borderColor: t.accentBorder }]}>
              <Text style={[styles.previewLogo, { color: t.accent }]}>Arena</Text>
              <View style={[styles.previewTokenBadge, { backgroundColor: t.bgInput, borderColor: t.accentBorder }]}>
                <Text style={[styles.previewTokenText, { color: t.accent }]}>🪙 120</Text>
              </View>
            </View>

            {/* Cards row */}
            <View style={styles.previewCardsRow}>
              <View style={[styles.previewCard, { backgroundColor: t.bgCard, borderColor: t.accentBorder }]}>
                <Text style={styles.previewCardEmoji}>🧠</Text>
                <Text style={[styles.previewCardTitle, { color: t.accent }]} numberOfLines={2}>
                  {isRtl ? 'ميدان\nالمعلومات' : 'Knowledge\nArena'}
                </Text>
              </View>
              <View style={[styles.previewCard, { backgroundColor: t.bgCard, borderColor: t.purpleBorder }]}>
                <Text style={styles.previewCardEmoji}>🎮</Text>
                <Text style={[styles.previewCardTitle, { color: t.purple }]} numberOfLines={2}>
                  {isRtl ? 'ميدان\nالألعاب' : 'Games\nArena'}
                </Text>
              </View>
            </View>

            {/* Quick play strip */}
            <View style={styles.previewQpRow}>
              {['🎭','🕵️','🃏','❌'].map((e, i) => (
                <View key={i} style={[styles.previewQpItem, { backgroundColor: t.bgElevated, borderColor: t.border }]}>
                  <Text style={styles.previewQpEmoji}>{e}</Text>
                </View>
              ))}
            </View>

            {/* Crystal badge */}
            {item.isCrystal && (
              <View style={styles.previewCrystalBadge}>
                <Text style={[styles.previewCrystalText, { color: t.accent }]}>💎 Crystal</Text>
              </View>
            )}
          </View>

          {/* اسم الثيم */}
          <View style={styles.previewNameRow}>
            <Text style={styles.previewNameEmoji}>{item.emoji}</Text>
            <Text style={styles.previewNameText}>
              {isRtl ? item.labelAr : item.label}
            </Text>
            {isLocked && (
              <View style={styles.proBadge}>
                <Text style={styles.proBadgeText}>Pro</Text>
              </View>
            )}
          </View>

          {/* إشعار Pro مجاناً أو سعر الشراء */}
          {item.price > 0 && isPro && (
            <View style={[styles.proNotice, { backgroundColor: '#16a34a22' }]}>
              <Text style={[styles.proNoticeText, { color: '#16a34a' }]}>
                {isRtl ? '⭐ مفتوح مجاناً بـ Pro' : '⭐ Free with Pro'}
              </Text>
            </View>
          )}
          {isLocked && (
            <View style={styles.proNotice}>
              <Text style={styles.proNoticeText}>
                {isRtl ? `🪙 السعر: ${item.price} توكن` : `🪙 Price: ${item.price} tokens`}
              </Text>
            </View>
          )}

          {/* زرّا الإجراء */}
          <View style={styles.previewActions}>
            <TouchableOpacity style={[styles.previewBtn, styles.previewBtnCancel]} onPress={onClose}>
              <Text style={styles.previewBtnCancelText}>{isRtl ? 'إغلاق' : 'Close'}</Text>
            </TouchableOpacity>
            {isLocked ? (
              // زر الشراء
              <TouchableOpacity
                style={[styles.previewBtn, styles.previewBtnSelect, { backgroundColor: item.previewAccent }]}
                onPress={() => { onBuy(item); onClose(); }}
              >
                <Text style={styles.previewBtnSelectText}>
                  {isRtl ? `🪙 شراء بـ ${item.price}` : `🪙 Buy for ${item.price}`}
                </Text>
              </TouchableOpacity>
            ) : (
              // زر الاختيار
              <TouchableOpacity
                style={[
                  styles.previewBtn, styles.previewBtnSelect,
                  { backgroundColor: item.previewAccent },
                  isActive && { opacity: 0.5 },
                ]}
                onPress={() => { onSelect(item.id); onClose(); }}
                disabled={isActive}
              >
                <Text style={styles.previewBtnSelectText}>
                  {isActive ? (isRtl ? '✓ مختار' : '✓ Selected') : (isRtl ? 'اختر هذا الثيم' : 'Apply Theme')}
                </Text>
              </TouchableOpacity>
            )}
          </View>

        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
});

// ══════════════════════════════════════════════════════════════
//  ThemeRow — صف ثيم واحد
//  RTL: [صورة] [اسم + وصف]   ← مسافة →   [مؤشر]
//  LTR: [مؤشر]   ← مسافة →   [اسم + وصف] [صورة]
// ══════════════════════════════════════════════════════════════

const ThemeRow = memo(({ item, isActive, unlocked = true, isPro = false, onSelect, onPreview, onBuy, theme, lang }) => {
  const isRtl = lang === 'ar';
  // حالة القفل: مدفوع وليس Pro وغير مشترى
  const isLocked = item.price > 0 && !unlocked;

  return (
    <TouchableOpacity
      style={[
        styles.themeRow,
        { backgroundColor: isActive ? item.previewAccent + '18' : theme.bgElevated },
        { borderColor: isActive ? item.previewAccent : theme.border },
      ]}
      onPress={() => unlocked ? onSelect(item.id) : onBuy(item)}
      activeOpacity={0.82}
    >
      {/* صورة الثيم */}
      <TouchableOpacity
        style={[styles.themeThumb, { backgroundColor: item.previewBg }]}
        onPress={() => onPreview(item)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        activeOpacity={0.75}
      >
        <View style={styles.thumbDots}>
          <View style={[styles.thumbDot, { backgroundColor: item.previewAccent }]} />
          <View style={[styles.thumbDot, { backgroundColor: item.previewAccent, opacity: 0.5, width: 5, height: 5 }]} />
        </View>
        <Text style={styles.thumbEmoji}>{item.emoji}</Text>
        <View style={styles.thumbPreviewHint}>
          <Text style={styles.thumbPreviewIcon}>{isLocked ? '🔒' : '👁'}</Text>
        </View>
      </TouchableOpacity>

      {/* اسم الثيم */}
      <View style={{ flex: 1, marginHorizontal: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={[styles.themeRowName, { color: isActive ? item.previewAccent : theme.textPrimary }]}>
            {isRtl ? item.labelAr : item.label}
          </Text>
          {/* Badge: Pro مجاناً */}
          {item.price > 0 && isPro && (
            <View style={styles.proBadge}>
              <Text style={styles.proBadgeText}>Pro ✓</Text>
            </View>
          )}
        </View>
        {item.isCrystal && <Text style={[styles.themeRowSub, { color: theme.textMuted }]}>{isRtl ? '💎 كرستال' : '💎 Crystal'}</Text>}
        {item.isMist    && <Text style={[styles.themeRowSub, { color: theme.textMuted }]}>{isRtl ? '🌫️ ضباب'   : '🌫️ Mist'}</Text>}
        {item.isCityTheme && (
          <Text style={[styles.themeRowSub, { color: theme.textMuted }]}>
            {item.timeOfDay === 'dawn' ? (isRtl ? '🌅 فجر' : '🌅 Dawn') :
             item.timeOfDay === 'dusk' ? (isRtl ? '🌇 غروب' : '🌇 Dusk') :
                                         (isRtl ? '🌕 ليل' : '🌕 Night')}
          </Text>
        )}
      </View>

      {/* الجانب الأيمن: اختيار / زر شراء / مفتوح */}
      {isLocked ? (
        // زر الشراء
        <TouchableOpacity
          style={[styles.buyBtn, { backgroundColor: item.previewAccent + '22', borderColor: item.previewAccent }]}
          onPress={() => onBuy(item)}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Text style={[styles.buyBtnPrice, { color: item.previewAccent }]}>
            🪙 {item.price}
          </Text>
        </TouchableOpacity>
      ) : (
        // مؤشر الاختيار
        <View style={[styles.themeRadio, { borderColor: isActive ? item.previewAccent : theme.border }]}>
          {isActive && <View style={[styles.themeRadioFill, { backgroundColor: item.previewAccent }]} />}
        </View>
      )}
    </TouchableOpacity>
  );
});

// ══════════════════════════════════════════════════════════════
//  ThemeGroup — مجموعة ثيمات بعنوان
// ══════════════════════════════════════════════════════════════

const TimeOfDayDivider = memo(({ timeOfDay, theme, lang }) => {
  const isRtl = lang === 'ar';
  const config = {
    night: { emoji: '🌕', ar: 'ليل', en: 'Night' },
    dusk:  { emoji: '🌇', ar: 'غروب', en: 'Dusk' },
    dawn:  { emoji: '🌅', ar: 'فجر', en: 'Dawn' },
  }[timeOfDay];
  if (!config) return null;
  return (
    <View style={[styles.timeOfDayDivider, { borderTopColor: theme.divider }]}>
      <Text style={[styles.timeOfDayLabel, { color: theme.textMuted }]}>
        {config.emoji}  {isRtl ? config.ar : config.en}
      </Text>
      <View style={[styles.timeOfDayLine, { backgroundColor: theme.divider }]} />
    </View>
  );
});

const ThemeGroup = memo(({ group, themeId, onSelect, onPreview, onBuy, theme, lang, isPro = false, purchased = new Set() }) => {
  const isRtl = lang === 'ar';
  const label = isRtl ? group.groupLabelAr : group.groupLabel;
  const isCities = group.groupId === 'cities';
  let lastTimeOfDay = null;

  return (
    <View style={styles.themeGroup}>
      <View style={styles.groupHeader}>
        <Text style={styles.groupEmoji}>{group.groupEmoji}</Text>
        <Text style={[styles.groupLabel, { color: theme.textSecondary }]}>{label}</Text>
        <View style={[styles.groupLine, { backgroundColor: theme.divider }]} />
      </View>
      <View style={[styles.groupCard, { backgroundColor: theme.bgCard, borderColor: theme.borderCard }]}>
        {group.themes.map((item, idx) => {
          const showTimeDivider = isCities && item.timeOfDay !== lastTimeOfDay;
          if (isCities) lastTimeOfDay = item.timeOfDay;
          const unlocked = isThemeUnlocked(item, isPro, purchased);
          return (
            <View key={item.id}>
              {showTimeDivider
                ? <TimeOfDayDivider timeOfDay={item.timeOfDay} theme={theme} lang={lang} />
                : idx > 0 && <Div theme={theme} />
              }
              <ThemeRow
                item={item}
                isActive={themeId === item.id}
                unlocked={unlocked}
                isPro={isPro}
                onSelect={onSelect}
                onPreview={onPreview}
                onBuy={onBuy}
                theme={theme}
                lang={lang}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
});

const HIT = { top: 8, bottom: 8, left: 8, right: 8 };

// ══════════════════════════════════════════════════════════════
//  الشاشة الرئيسية
// ══════════════════════════════════════════════════════════════

export default function SettingsScreen({
  onBack,
  user,
  tokens,
  setTokens,
  isPro = false,
  purchased = new Set(),
  onLogout,
  experience,
  onChangeExperience,
}) {
  const { t, lang, setLang } = useLanguage();
  const { isDark, theme, themeId, setThemeId, setDark } = useTheme();

  const [notifications, setNotifications] = useState(true);
  const [musicOn,       setMusicOn]       = useState(true);
  const [soundsOn,      setSoundsOn]      = useState(true);

  // Preview state
  const [previewItem,    setPreviewItem]    = useState(null);
  const [previewVisible, setPreviewVisible] = useState(false);

  useEffect(() => {
    setMusicOn(getMusicEnabled());
    setSoundsOn(getSoundsEnabled());
  }, []);

  const handleToggleMusic  = useCallback(async (v) => { setMusicOn(v);  await setMusicEnabled(v);  }, []);
  const handleToggleSounds = useCallback(async (v) => { setSoundsOn(v); await setSoundsEnabled(v); }, []);
  const handleToggleDark   = useCallback((v) => { setDark(v); }, [setDark]);
  const handleSelectTheme = useCallback((id) => {
    const item = THEME_GROUPS.flatMap(g => g.themes).find(t => t.id === id);
    if (!isThemeUnlocked(item, isPro, purchased)) return;
    setThemeId(id);
  }, [setThemeId, isPro, purchased]);

  const handleBuyTheme = useCallback(async (item) => {
    if (!user?.uid) return;
    if (tokens < item.price) {
      Alert.alert(
        lang === 'ar' ? 'رصيد غير كافٍ' : 'Not enough tokens',
        lang === 'ar'
          ? `تحتاج ${item.price} توكن. رصيدك الحالي ${tokens} توكن.`
          : `You need ${item.price} tokens. Your balance: ${tokens}.`
      );
      return;
    }
    Alert.alert(
      lang === 'ar' ? 'شراء الثيم' : 'Buy Theme',
      lang === 'ar'
        ? `شراء "${item.labelAr}" مقابل ${item.price} 🪙 ؟`
        : `Buy "${item.label}" for ${item.price} 🪙?`,
      [
        { text: lang === 'ar' ? 'إلغاء' : 'Cancel', style: 'cancel' },
        { text: lang === 'ar' ? 'شراء' : 'Buy', onPress: async () => {
          const result = await purchaseTheme(user.uid, item.id, item.price, tokens);
          if (result.success) {
            setTokens?.(result.newTokens);
            setThemeId(item.id);
          } else {
            Alert.alert('❌', result.error || (lang === 'ar' ? 'حدث خطأ' : 'Error'));
          }
        }},
      ]
    );
  }, [user?.uid, tokens, setTokens, setThemeId, lang]);

  const handlePreview = useCallback((item) => {
    setPreviewItem(item);
    setPreviewVisible(true);
  }, []);
  const handleClosePreview = useCallback(() => setPreviewVisible(false), []);

  const handleBuyTokens = useCallback(() =>
    Alert.alert(t('settings.buyCoins'), t('settings.buyCoinsMsg'), [{ text: t('common.ok') }]), [t]);

  const handleLogout = useCallback(() =>
    Alert.alert(t('settings.logoutTitle'), t('settings.logoutMsg'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('settings.logoutConfirm'), style: 'destructive', onPress: onLogout },
    ]), [t, onLogout]);

  const handleRate = useCallback(() =>
    Alert.alert(t('settings.rateTitle'), t('settings.rateMsg'), [
      { text: t('settings.rateLater'), style: 'cancel' },
      { text: t('settings.rateNow'), onPress: () =>
          Linking.openURL('https://play.google.com/store').catch(() =>
            Alert.alert('', t('settings.rateSoon'), [{ text: t('common.ok') }])) },
    ]), [t]);

  const handleChangeExperience = useCallback(() =>
    Alert.alert(
      t('settings.experience'),
      t('settings.experienceConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('settings.experienceChange'), onPress: onChangeExperience },
      ]
    ), [t, onChangeExperience]);

  const handleTerms   = useCallback(() => Alert.alert(t('settings.terms'),      t('settings.termsMsg'),   [{ text: t('common.ok') }]), [t]);
  const handleContact = useCallback(() => Alert.alert(t('settings.contact'),    t('settings.contactMsg'), [{ text: t('common.ok') }]), [t]);
  const handleAbout   = useCallback(() => Alert.alert(t('settings.aboutTitle'), t('settings.aboutMsg'),   [{ text: t('common.ok') }]), [t]);

  const switchToAr = useCallback(() => setLang('ar'), [setLang]);
  const switchToEn = useCallback(() => setLang('en'), [setLang]);

  const avatarText  = user?.type === 'guest' ? '👤' : 'G';
  const accountName = user?.type === 'guest' ? t('common.guest').replace('👤 ', '') : user?.name || '';
  const accountType = user?.type === 'guest'  ? t('settings.guestAccount')
    : user?.type === 'google' ? t('settings.googleAccount') : t('settings.appleAccount');

  const experienceLabel = experience === EXPERIENCES.GLOBAL
    ? t('settings.experienceGlobal')
    : t('settings.experienceArabic');

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.statusBg} />

      {/* ─── هيدر ─── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={HIT}>
          <Text style={[styles.backText, { color: theme.accent }]}>{t('common.backArrow')}</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.accent }]}>{t('settings.title')}</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* ─── بطاقة الحساب ─── */}
      <View style={[styles.accountCard, { backgroundColor: theme.bgCard, borderColor: theme.accentBorder }]}>
        <View style={[styles.avatarCircle, { backgroundColor: theme.accent }]}>
          <Text style={[styles.avatarText, { color: theme.textOnAccent }]}>{avatarText}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.accountName, { color: theme.textPrimary }]}>{accountName}</Text>
          <Text style={[styles.accountType, { color: theme.textSecondary }]}>{accountType}</Text>
        </View>
        <View style={[styles.tokenBadge, { backgroundColor: theme.bgInput, borderColor: theme.accentBorder }]}>
          <Text style={[styles.tokenNum, { color: theme.accent }]}>{tokens}</Text>
          <Text style={styles.tokenLabel}>🪙</Text>
        </View>
      </View>

      {/* ─── النقاط ─── */}
      <Section title={t('settings.tokensSection')} theme={theme}>
        <View style={styles.row}>
          <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>{t('settings.balance')}</Text>
          <Text style={[styles.rowValue, { color: theme.textSecondary }]}>
            {t('settings.balanceVal', { n: tokens })}
          </Text>
        </View>
        <Div theme={theme} />
        <View style={styles.packagesRow}>
          {PACKAGES.map(p => (
            <PackCard key={p.amount} amount={p.amount} price={p.price} onPress={handleBuyTokens} theme={theme} />
          ))}
        </View>
      </Section>

      {/* ─── التجربة ─── */}
      {experience && onChangeExperience && (
        <Section title={t('settings.experienceSection')} theme={theme}>
          <ExperienceRow
            label={t('settings.experience')}
            sub={t('settings.experienceSub')}
            current={experienceLabel}
            onPress={handleChangeExperience}
            theme={theme}
          />
        </Section>
      )}

      {/* ─── الصوت ─── */}
      <Section title={t('settings.soundSection')} theme={theme}>
        <SettingRow label={t('settings.music')}  sub={t('settings.musicSub')}  value={musicOn}  onChange={handleToggleMusic}  theme={theme} />
        <Div theme={theme} />
        <SettingRow label={t('settings.sounds')} sub={t('settings.soundsSub')} value={soundsOn} onChange={handleToggleSounds} theme={theme} />
      </Section>

      {/* ─── المظهر — الثيمات بالمجموعات الثلاث ─── */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.accent }]}>
          {t('settings.themeSection')}
        </Text>

        {THEME_GROUPS.map(group => (
          <ThemeGroup
            key={group.groupId}
            group={group}
            themeId={themeId}
            onSelect={handleSelectTheme}
            onPreview={handlePreview}
            onBuy={handleBuyTheme}
            theme={theme}
            lang={lang}
            isPro={isPro}
            purchased={purchased}
          />
        ))}

        {/* Dark/Light toggle — للتوافق */}
        <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, marginTop: 8 }]}>
          <SettingRow
            label={t('settings.darkMode')}
            sub={isDark ? t('settings.darkModeOn') : t('settings.darkModeOff')}
            value={isDark}
            onChange={handleToggleDark}
            theme={theme}
          />
        </View>
      </View>

      {/* ─── الإشعارات ─── */}
      <Section title={t('settings.notiSection')} theme={theme}>
        <SettingRow
          label={t('settings.notifications')}
          sub={t('settings.notiSub')}
          value={notifications}
          onChange={setNotifications}
          theme={theme}
        />
      </Section>

      {/* ─── اللغة ─── */}
      <Section title={t('settings.langSection')} theme={theme}>
        <LangOption flag="🇬🇧" name="English" sub="الإنجليزية" active={lang === 'en'} onPress={switchToEn} theme={theme} />
        <Div theme={theme} />
        <LangOption flag="🇸🇦" name="العربية" sub="Arabic" active={lang === 'ar'} onPress={switchToAr} theme={theme} />
      </Section>

      {/* ─── عن التطبيق ─── */}
      <Section title={t('settings.aboutSection')} theme={theme}>
        <TouchableOpacity style={styles.row} onPress={handleAbout}>
          <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>{t('settings.appInfo')}</Text>
          <View style={styles.rowRight}>
            <Text style={[styles.rowValue, { color: theme.textSecondary }]}>{t('settings.version')}</Text>
            <Text style={[styles.arrow, { color: theme.textMuted }]}>‹</Text>
          </View>
        </TouchableOpacity>
        <Div theme={theme} />
        <TouchableOpacity style={styles.row} onPress={handleRate}>
          <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>{t('settings.rate')}</Text>
          <Text style={[styles.arrow, { color: theme.textMuted }]}>‹</Text>
        </TouchableOpacity>
        <Div theme={theme} />
        <TouchableOpacity style={styles.row} onPress={handleTerms}>
          <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>{t('settings.terms')}</Text>
          <Text style={[styles.arrow, { color: theme.textMuted }]}>‹</Text>
        </TouchableOpacity>
        <Div theme={theme} />
        <TouchableOpacity style={styles.row} onPress={handleContact}>
          <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>{t('settings.contact')}</Text>
          <Text style={[styles.arrow, { color: theme.textMuted }]}>‹</Text>
        </TouchableOpacity>
      </Section>

      {/* ─── تسجيل الخروج ─── */}
      <TouchableOpacity
        style={[styles.logoutBtn, {
          backgroundColor: theme.error + '18',
          borderColor: theme.error + '44',
        }]}
        onPress={handleLogout}
        activeOpacity={0.85}
      >
        <Text style={[styles.logoutText, { color: theme.error }]}>{t('settings.logout')}</Text>
      </TouchableOpacity>

      <Text style={[styles.version, { color: theme.textMuted }]}>
        {t('settings.copyright')}
      </Text>

      {/* ─── Preview Modal ─── */}
      <PreviewModal
        item={previewItem}
        visible={previewVisible}
        onClose={handleClosePreview}
        onSelect={handleSelectTheme}
        onBuy={handleBuyTheme}
        isActive={previewItem ? themeId === previewItem.id : false}
        isLocked={previewItem ? !isThemeUnlocked(previewItem, isPro, purchased) : false}
        isPro={isPro}
        lang={lang}
      />
    </ScrollView>
  );
}

// ══════════════════════════════════════════════════════════════
//  الستايلات
// ══════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container:    { flexGrow: 1, paddingHorizontal: 20, paddingVertical: 50, gap: 24 },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn:      { padding: 8 },
  backText:     { fontSize: 18, fontWeight: '700' },
  title:        { fontSize: 22, fontWeight: '900' },

  accountCard:  { borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16, borderWidth: 1 },
  avatarCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  avatarText:   { fontSize: 24, fontWeight: '900' },
  accountName:  { fontSize: 18, fontWeight: '800' },
  accountType:  { fontSize: 13, marginTop: 2 },
  tokenBadge:   { alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 1 },
  tokenNum:     { fontSize: 20, fontWeight: '900' },
  tokenLabel:   { fontSize: 14 },

  section:      { gap: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '800' },
  card:         { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  row:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  rowLabel:     { fontSize: 15, fontWeight: '600' },
  rowSub:       { fontSize: 12, marginTop: 2 },
  rowValue:     { fontSize: 14 },
  rowRight:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  arrow:        { fontSize: 22, fontWeight: '300' },
  divider:      { height: 1, marginHorizontal: 16 },
  packagesRow:  { flexDirection: 'row', gap: 10, padding: 16, paddingTop: 12 },
  packCard:     { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center', gap: 4, borderWidth: 1 },
  packAmount:   { fontSize: 20, fontWeight: '900' },
  packCoin:     { fontSize: 16 },
  packPrice:    { fontSize: 12, fontWeight: '700' },

  langRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  langLeft:     { flexDirection: 'row', alignItems: 'center', gap: 14 },
  langFlag:     { fontSize: 30 },
  langName:     { fontSize: 16, fontWeight: '700' },
  langSub:      { fontSize: 12, marginTop: 2 },
  radio:        { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioFill:    { width: 11, height: 11, borderRadius: 6 },

  logoutBtn:    { paddingVertical: 16, borderRadius: 16, alignItems: 'center', borderWidth: 1 },
  logoutText:   { fontSize: 16, fontWeight: '700' },
  version:      { fontSize: 12, textAlign: 'center', paddingBottom: 10 },

  // ── Theme Groups ──
  themeGroup:   { gap: 8 },
  groupHeader:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  groupEmoji:   { fontSize: 16 },
  groupLabel:   { fontSize: 13, fontWeight: '700', letterSpacing: 1 },
  groupLine:    { flex: 1, height: 1 },
  groupCard:    { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },

  // ── Theme Row ──
  themeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 0,
    borderWidth: 1,
    borderRadius: 0,        // داخل groupCard المحيطة
  },

  // صورة مصغّرة للثيم
  themeThumb: {
    width: 58,
    height: 52,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  thumbDots:       { flexDirection: 'row', gap: 3, marginBottom: 3 },
  thumbDot:        { width: 7, height: 7, borderRadius: 4 },
  thumbEmoji:      { fontSize: 18 },
  thumbPreviewHint: {
    position: 'absolute',
    bottom: 2, right: 2,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 6,
    padding: 2,
  },
  thumbPreviewIcon: { fontSize: 9 },

  themeRowName:  { fontSize: 14, fontWeight: '700' },
  themeRowSub:   { fontSize: 11, marginTop: 2 },

  // ── Time of Day Divider (inside cities group) ──
  timeOfDayDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 4,
    borderTopWidth: 1,
  },
  timeOfDayLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginRight: 8 },
  timeOfDayLine:  { flex: 1, height: 1, opacity: 0.5 },

  themeRadio: {
    width: 22, height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
    marginLeft: 8,
  },
  themeRadioFill: { width: 11, height: 11, borderRadius: 6 },

  // شراء الثيم
  buyBtn:        { borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center' },
  buyBtnPrice:   { fontSize: 12, fontWeight: '900' },

  // Pro badge وإشعارات
  proBadge:      { backgroundColor: '#f5c518', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  proBadgeText:  { fontSize: 10, fontWeight: '900', color: '#07071f' },
  lockIcon:      { fontSize: 16, opacity: 0.7 },
  proNotice:     { backgroundColor: '#f5c51822', borderRadius: 10, padding: 10, alignItems: 'center' },
  proNoticeText: { fontSize: 13, fontWeight: '700', color: '#f5c518' },

  // ── Preview Modal ──
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewContainer: {
    width: SW * 0.85,
    maxWidth: 360,
    alignItems: 'center',
    gap: 14,
  },
  previewPhone: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    paddingBottom: 12,
  },
  previewStatus: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  previewStatusText: { fontSize: 10 },

  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  previewLogo:      { fontSize: 22, fontWeight: '900' },
  previewTokenBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  previewTokenText:  { fontSize: 12, fontWeight: '700' },

  previewCardsRow: { flexDirection: 'row', gap: 8, padding: 12, paddingBottom: 8 },
  previewCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    gap: 6,
  },
  previewCardEmoji: { fontSize: 22 },
  previewCardTitle: { fontSize: 11, fontWeight: '700', textAlign: 'center', lineHeight: 16 },

  previewQpRow:  { flexDirection: 'row', gap: 6, paddingHorizontal: 12 },
  previewQpItem: { flex: 1, borderRadius: 8, borderWidth: 1, paddingVertical: 8, alignItems: 'center' },
  previewQpEmoji: { fontSize: 16 },

  previewCrystalBadge: { alignSelf: 'center', marginTop: 8 },
  previewCrystalText:  { fontSize: 12, fontWeight: '700', letterSpacing: 1 },

  previewNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  previewNameEmoji: { fontSize: 22 },
  previewNameText:  { fontSize: 18, fontWeight: '900', color: '#fff' },

  previewActions: { flexDirection: 'row', gap: 10, width: '100%' },
  previewBtn:     { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  previewBtnCancel:      { backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  previewBtnCancelText:  { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '700' },
  previewBtnSelect:      {},
  previewBtnSelectText:  { color: '#000', fontSize: 14, fontWeight: '900' },
});
