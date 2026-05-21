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
  StyleSheet, Text, View, TouchableOpacity, Pressable,
  StatusBar, ScrollView, Switch, Linking,
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
      <View style={styles.previewOverlay}>
        <View style={styles.previewContainer}>

          {/* زر الإغلاق */}
          <TouchableOpacity style={styles.previewCloseBtn} onPress={onClose}>
            <ExitButton onPress={onClose} size={36} />
          </TouchableOpacity>

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

        </View>
      </View>
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
        {/* يسار: الاسم الإنجليزي الرسمي */}
        <Text style={[styles.groupLabelEn, { color: theme.textMuted }]}>{group.groupLabel}</Text>
        {/* خط فاصل */}
        <View style={[styles.groupLine, { backgroundColor: theme.divider }]} />
        {/* يمين: الاسم الشاعري العربي + إيموجي */}
        <Text style={[styles.groupLabel, { color: theme.textSecondary }]}>{label}</Text>
        <Text style={styles.groupEmoji}>{group.groupEmoji}</Text>
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
//  ThemedAlert — مودال تأكيد بالثيم بدلاً من Alert.alert الأبيض
// ══════════════════════════════════════════════════════════════
const ThemedAlert = memo(({ visible, title, message, buttons, onClose, theme }) => {
  if (!visible) return null;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={taStyles.overlay} onPress={onClose}>
        <Pressable style={[taStyles.box, { backgroundColor: theme.bgCard, borderColor: theme.accentBorder }]}>
          {title ? <Text style={[taStyles.title, { color: theme.textPrimary }]}>{title}</Text> : null}
          {message ? <Text style={[taStyles.msg, { color: theme.textSecondary }]}>{message}</Text> : null}
          <View style={taStyles.btns}>
            {(buttons || []).map((btn, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  taStyles.btn,
                  { backgroundColor: btn.style === 'destructive' ? theme.error + '18' : theme.accentSoft,
                    borderColor:     btn.style === 'destructive' ? theme.error + '55' : theme.accentBorder,
                    borderWidth: 1.5 },
                ]}
                onPress={() => { onClose(); btn.onPress?.(); }}
                activeOpacity={0.8}
              >
                <Text style={[
                  taStyles.btnTxt,
                  { color: btn.style === 'destructive' ? theme.error
                         : btn.style === 'cancel'      ? theme.textMuted
                         : theme.accent }
                ]}>
                  {btn.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
});

const taStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', alignItems: 'center', justifyContent: 'center', padding: 32 },
  box:     { width: '100%', borderRadius: 22, borderWidth: 1.5, padding: 24, gap: 10 },
  title:   { fontSize: 18, fontWeight: '900', textAlign: 'center' },
  msg:     { fontSize: 14, lineHeight: 22, textAlign: 'center' },
  btns:    { flexDirection: 'row', gap: 10, marginTop: 6 },
  btn:     { flex: 1, paddingVertical: 13, borderRadius: 14, alignItems: 'center' },
  btnTxt:  { fontSize: 15, fontWeight: '800' },
});

// ══════════════════════════════════════════════════════════════
//  ExperiencePickerModal — اختيار التجربة مع الثيم
// ══════════════════════════════════════════════════════════════
const ExperiencePickerModal = memo(({ visible, current, onSelect, onClose, theme, lang }) => {
  const options = [
    {
      value: EXPERIENCES.ARABIC,
      emoji: '🕌',
      label: lang === 'ar' ? 'التجربة العربية' : 'Arabic Experience',
      desc:  lang === 'ar'
        ? 'جلسة وألعاب وأسئلة — كل شيء بالعربي'
        : 'Games, party & trivia — everything in Arabic',
      tag:   lang === 'ar' ? '🇸🇦 عربي كامل' : '🇸🇦 Full Arabic',
    },
    {
      value: EXPERIENCES.GLOBAL,
      emoji: '🌍',
      label: 'Global Games',
      desc:  'Same games & party — trivia questions in English',
      tag:   '🌐 English Trivia',
    },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[expStyles.overlay]} onPress={onClose}>
        <Pressable style={[expStyles.box, { backgroundColor: theme.bgCard, borderColor: theme.accentBorder }]}>
          <View style={expStyles.header}>
            <Text style={[expStyles.title, { color: theme.accent }]}>
              {lang === 'ar' ? '🌐 نوع التجربة' : '🌐 Experience'}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={[expStyles.closeBtn, { backgroundColor: theme.bgElevated }]}
            >
              <ExitButton onPress={onClose} size={30} />
            </TouchableOpacity>
          </View>

          <View style={expStyles.options}>
            {options.map(opt => {
              const isActive = current === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    expStyles.option,
                    { backgroundColor: isActive ? theme.accentSoft : theme.bgElevated,
                      borderColor: isActive ? theme.accent : theme.borderCard },
                  ]}
                  onPress={() => { onSelect(opt.value); onClose(); }}
                  activeOpacity={0.82}
                >
                  <Text style={expStyles.optionEmoji}>{opt.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <View style={expStyles.labelRow}>
                      <Text style={[expStyles.optionLabel, { color: isActive ? theme.accent : theme.textPrimary }]}>
                        {opt.label}
                      </Text>
                      <View style={[expStyles.tag, { backgroundColor: isActive ? theme.accent + '22' : theme.bgElevated, borderColor: isActive ? theme.accent + '66' : theme.borderCard }]}>
                        <Text style={[expStyles.tagTxt, { color: isActive ? theme.accent : theme.textMuted }]}>{opt.tag}</Text>
                      </View>
                    </View>
                    <Text style={[expStyles.optionDesc, { color: theme.textSecondary }]}>{opt.desc}</Text>
                  </View>
                  {isActive && (
                    <View style={[expStyles.check, { backgroundColor: theme.accent }]}>
                      <Text style={expStyles.checkTxt}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
});

const expStyles = StyleSheet.create({
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  box:         { width: '100%', borderRadius: 24, borderWidth: 1.5, overflow: 'hidden' },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingBottom: 14 },
  title:       { fontSize: 18, fontWeight: '900' },
  closeBtn:    { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  closeTxt:    { fontSize: 16, fontWeight: '700' },
  options:     { gap: 10, paddingHorizontal: 16, paddingBottom: 20 },
  option:      { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 16, borderWidth: 1.5 },
  optionEmoji: { fontSize: 28 },
  optionLabel: { fontSize: 16, fontWeight: '800' },
  labelRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  tag:         { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, borderWidth: 1 },
  tagTxt:      { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  optionDesc:  { fontSize: 13, lineHeight: 19, marginBottom: 4 },
  optionExtra: { fontSize: 11, lineHeight: 16 },
  check:       { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  checkTxt:    { color: '#fff', fontSize: 13, fontWeight: '900' },
});

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
  const { theme, themeId, setThemeId } = useTheme();

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
  const handleSelectTheme = useCallback((id) => {
    const item = THEME_GROUPS.flatMap(g => g.themes).find(t => t.id === id);
    if (!isThemeUnlocked(item, isPro, purchased)) return;
    setThemeId(id);
  }, [setThemeId, isPro, purchased]);

  const handleBuyTheme = useCallback(async (item) => {
    if (!user?.uid) return;
    if (tokens < item.price) {
      showAlert(
        lang === 'ar' ? 'رصيد غير كافٍ' : 'Not enough tokens',
        lang === 'ar'
          ? `تحتاج ${item.price} توكن. رصيدك الحالي ${tokens} توكن.`
          : `You need ${item.price} tokens. Your balance: ${tokens}.`
      );
      return;
    }
    showAlert(
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
            showAlert('❌', result.error || (lang === 'ar' ? 'حدث خطأ' : 'Error'), [{ text: lang === 'ar' ? 'حسناً' : 'OK' }]);
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
    showAlert(t('settings.buyCoins'), t('settings.buyCoinsMsg'), [{ text: t('common.ok') }]), [t, showAlert]);

  const handleLogout = useCallback(() =>
    showAlert(t('settings.logoutTitle'), t('settings.logoutMsg'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('settings.logoutConfirm'), style: 'destructive', onPress: onLogout },
    ]), [t, onLogout, showAlert]);

  const handleRate = useCallback(() =>
    showAlert(t('settings.rateTitle'), t('settings.rateMsg'), [
      { text: t('settings.rateLater'), style: 'cancel' },
      { text: t('settings.rateNow'), onPress: () =>
          Linking.openURL('https://play.google.com/store').catch(() =>
            showAlert('', t('settings.rateSoon'), [{ text: t('common.ok') }])) },
    ]), [t, showAlert]);

  const [expModalVisible,   setExpModalVisible]   = useState(false);
  const [alertConfig,       setAlertConfig]       = useState(null);
  const showAlert = useCallback((title, message, buttons) => {
    setAlertConfig({ title, message, buttons });
  }, []);
  const handleChangeExperience = useCallback(() => setExpModalVisible(true), []);

  const handleTerms   = useCallback(() => showAlert(t('settings.terms'),      t('settings.termsMsg'),   [{ text: t('common.ok') }]), [t, showAlert]);
  const handleContact = useCallback(() => showAlert(t('settings.contact'),    t('settings.contactMsg'), [{ text: t('common.ok') }]), [t, showAlert]);
  const handleAbout   = useCallback(() => showAlert(t('settings.aboutTitle'), t('settings.aboutMsg'),   [{ text: t('common.ok') }]), [t, showAlert]);

  const switchToAr = useCallback(() => setLang('ar'), [setLang]);
  const switchToEn = useCallback(() => setLang('en'), [setLang]);

  const avatarText  = user?.type === 'guest' ? '👤' : 'G';
  const accountName = user?.type === 'guest' ? t('common.guest').replace('👤 ', '') : user?.name || '';
  const isGuestUser = user?.isGuest || user?.uid?.startsWith('#guest');
  const accountType = isGuestUser
    ? t('settings.guestAccount')
    : user?.type === 'apple' || user?.providerId === 'apple.com'
      ? t('settings.appleAccount')
      : t('settings.googleAccount');

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

      {/* ─── بريميوم ─── */}
      <Section title={lang === 'ar' ? '👑 بريميوم' : '👑 Premium'} theme={theme}>
        <View style={styles.premiumRow}>
          {[
            { id: 'monthly',   icon: '🚀', nameAr: 'حزمة البداية',      nameEn: 'Starter',      subAr: 'شهر',       subEn: '1 mo',  price: '$2.99',  color: '#6366f1' },
            { id: 'sixmonths', icon: '⭐', nameAr: 'الأكثر اختياراً',   nameEn: 'Most Popular', subAr: '٦ أشهر',    subEn: '6 mo',  price: '$9.99',  color: '#f59e0b', badge: true },
            { id: 'yearly',    icon: '🏆', nameAr: 'الأوفر',             nameEn: 'Best Value',   subAr: 'سنة',       subEn: '1 yr',  price: '$15.99', color: '#22c55e' },
          ].map(plan => (
            <TouchableOpacity
              key={plan.id}
              style={[styles.premiumCard, { backgroundColor: theme.bgElevated, borderColor: plan.color + '66' }]}
              onPress={() => showAlert(
                lang === 'ar' ? `👑 ${plan.nameAr}` : `👑 ${plan.nameEn}`,
                lang === 'ar'
                  ? `${plan.price} — ${plan.subAr}

قلوب لا محدودة · كل الثيمات · بدون إعلانات

سيكون متاحاً عند الإطلاق الرسمي.`
                  : `${plan.price} — ${plan.subEn}

Unlimited hearts · All themes · No ads

Available at official launch.`,
                [{ text: lang === 'ar' ? 'حسناً' : 'OK' }]
              )}
              activeOpacity={0.85}
            >
              {plan.badge && (
                <View style={[styles.premiumBadge, { backgroundColor: plan.color }]}>
                  <Text style={styles.premiumBadgeText}>⭐</Text>
                </View>
              )}
              <Text style={styles.premiumIcon}>{plan.icon}</Text>
              <Text style={[styles.premiumName, { color: plan.color }]}>
                {lang === 'ar' ? plan.nameAr : plan.nameEn}
              </Text>
              <Text style={[styles.premiumSub, { color: theme.textMuted }]}>
                {lang === 'ar' ? plan.subAr : plan.subEn}
              </Text>
              <Text style={[styles.premiumPrice, { color: theme.textPrimary }]}>{plan.price}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Section>

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

      <ExperiencePickerModal
        visible={expModalVisible}
        current={experience}
        onSelect={onChangeExperience}
        onClose={() => setExpModalVisible(false)}
        theme={theme}
        lang={lang}
      />

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

      {/* ─── ThemedAlert ─── */}
      <ThemedAlert
        visible={!!alertConfig}
        title={alertConfig?.title}
        message={alertConfig?.message}
        buttons={alertConfig?.buttons}
        onClose={() => setAlertConfig(null)}
        theme={theme}
      />

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
  groupLabelEn: { fontSize: 11, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase', opacity: 0.55 },
  premiumRow:      { flexDirection: 'row', gap: 8 },
  premiumCard:     { flex: 1, borderRadius: 16, borderWidth: 1.5, padding: 12, alignItems: 'center', gap: 4, position: 'relative' },
  premiumBadge:    { position: 'absolute', top: -8, right: -8, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  premiumBadgeText:{ fontSize: 10, color: '#000' },
  premiumIcon:     { fontSize: 24 },
  premiumName:     { fontSize: 11, fontWeight: '800', textAlign: 'center' },
  premiumSub:      { fontSize: 10, textAlign: 'center' },
  premiumPrice:    { fontSize: 13, fontWeight: '900', marginTop: 2 },
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
  previewOverlay:    { flex: 1, backgroundColor: '#000000cc', alignItems: 'center', justifyContent: 'center' },
  previewContainer:  { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', padding: 20 },
  previewCloseBtn:   { position: 'absolute', top: 60, right: 24, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  previewCloseTxt:   { color: '#fff', fontSize: 18, fontWeight: '700' },
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
