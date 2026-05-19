/**
 * HeartBar.js — صفّ القلوب الاحترافي
 * ════════════════════════════════════════════════════════════════
 *  ✅ 3 خانات ثابتة (السقف)
 *  ✅ الخانة الأولى الفارغة تعرض القلب الذي يشحن مع wave animation
 *  ✅ الخانات الفارغة الباقية تعرض outline رمادي راقٍ
 *  ✅ إذا hearts > 3 (شراء): شارة ذهبية "+N" بجانب الصف
 *  ✅ Pro: ∞ بدلاً من الصف
 *  ✅ كل التصميم يتكيف مع الثيم تلقائياً (Standard/Mist/Crystal/City)
 *
 *  Props:
 *    - hearts: number (current count)
 *    - chargeProgress: number 0-1 (نسبة شحن القلب القادم)
 *    - isPro: boolean
 *    - size: number (default 28)
 *    - showExtra: boolean (إظهار شارة +N، default true)
 *    - style: object
 *
 *  Usage:
 *    <HeartBar hearts={2} chargeProgress={0.6} size={32} />
 *    <HeartBar hearts={8} isPro={false} />   // shows 3 + "+5" badge
 *    <HeartBar hearts={0} isPro={true} />    // shows ∞
 */

import { useMemo, memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import HeartIcon from './HeartIcon';
import ChargingHeart from './ChargingHeart';
import { useTheme } from './ThemeContext';
import { HEARTS_CONFIG } from './HeartsService';

const MAX = HEARTS_CONFIG.maxFreeDaily; // 3

function HeartBar({
  hearts = 0,
  chargeProgress = 0,
  isPro = false,
  size = 28,
  showExtra = true,
  style,
}) {
  const { theme } = useTheme();

  // ─── Pro mode: ∞ ──
  if (isPro) {
    return (
      <View style={[styles.row, style]}>
        <HeartIcon size={size} filled pro />
        <Text style={[styles.infinitySymbol, { color: theme.accent, fontSize: size * 0.75 }]}>
          ∞
        </Text>
      </View>
    );
  }

  // ─── حساب slots: filled / charging / empty ──
  const slots = useMemo(() => {
    const baseSlots = MAX; // 3
    const arr = [];

    // 1. القلوب الممتلئة (حتى MAX كحد أقصى في الصف الرئيسي)
    const visibleFilled = Math.min(hearts, MAX);

    for (let i = 0; i < baseSlots; i++) {
      if (i < visibleFilled) {
        arr.push({ type: 'filled', key: `f${i}` });
      } else if (i === visibleFilled && hearts < MAX) {
        // الخانة الأولى الفارغة → القلب الذي يشحن
        arr.push({ type: 'charging', key: `c${i}` });
      } else {
        arr.push({ type: 'empty', key: `e${i}` });
      }
    }

    return arr;
  }, [hearts]);

  // ─── إضافيات فوق السقف (شراء) ──
  const extra = Math.max(0, hearts - MAX);

  return (
    <View style={[styles.row, style]}>
      {slots.map((slot, idx) => {
        if (slot.type === 'filled') {
          return <HeartIcon key={slot.key} size={size} filled />;
        }
        if (slot.type === 'charging') {
          return (
            <ChargingHeart
              key={slot.key}
              size={size}
              progress={chargeProgress}
            />
          );
        }
        // empty
        return <HeartIcon key={slot.key} size={size} filled={false} glow={false} />;
      })}

      {/* ─── شارة +N للقلوب الإضافية (من الشراء) ─── */}
      {showExtra && extra > 0 && (
        <View
          style={[
            styles.extraBadge,
            {
              backgroundColor: theme.accent,
              borderColor: theme.accentBorder,
              marginLeft: size * 0.25,
              paddingHorizontal: size * 0.32,
              paddingVertical: size * 0.12,
              borderRadius: size * 0.5,
            },
          ]}
        >
          <Text
            style={[
              styles.extraText,
              {
                color: theme.textOnAccent || '#fff',
                fontSize: size * 0.42,
              },
            ]}
          >
            +{extra}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infinitySymbol: {
    fontWeight: '900',
    marginLeft: 4,
  },
  extraBadge: {
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  extraText: {
    fontWeight: '900',
    letterSpacing: 0.3,
  },
});

export default memo(HeartBar);
