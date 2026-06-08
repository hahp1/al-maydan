/**
 * ExitButton.js
 * ═══════════════════════════════════════════════════
 * زر خروج دائري أنيق — مستوحى من Apple / Spotify
 * TouchableOpacity مباشر بدون ThemedCard
 * لمنع تمدد الزر ليملأ عرض الشاشة
 * ═══════════════════════════════════════════════════
 */

import { memo } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { useTheme } from './ThemeContext';

const HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

function ExitButton({ onPress, size = 36, style }) {
  const { theme } = useTheme();

  // لون الـ X حسب الثيم
  const lineColor = theme.textMuted || 'rgba(160,160,200,0.7)';
  // خلفية الزر
  const bgColor   = theme.bgElevated || theme.bgCard;
  const border    = theme.borderCard || 'rgba(160,160,200,0.2)';
  const pad       = size * 0.28;
  const radius    = size * 0.32; // مربع بحواف مستديرة — ليس دائرة كاملة

  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={HIT_SLOP}
      activeOpacity={0.70}
      style={[
        styles.btn,
        {
          width:        size,
          height:       size,
          borderRadius: radius,
          backgroundColor: bgColor,
          borderColor:  border,
        },
        style,
      ]}
    >
      <Svg
        width={size * 0.55}
        height={size * 0.55}
        viewBox={`0 0 ${size} ${size}`}
      >
        <Line
          x1={pad}      y1={pad}
          x2={size-pad} y2={size-pad}
          stroke={lineColor}
          strokeWidth={2.2}
          strokeLinecap="round"
        />
        <Line
          x1={size-pad} y1={pad}
          x2={pad}      y2={size-pad}
          stroke={lineColor}
          strokeWidth={2.2}
          strokeLinecap="round"
        />
      </Svg>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderWidth:    1,
    alignItems:     'center',
    justifyContent: 'center',
    // لا flex، لا alignSelf — الحجم ثابت تماماً
  },
});

export default memo(ExitButton);
