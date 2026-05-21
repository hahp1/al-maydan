/**
 * ExitButton.js
 * ═══════════════════════════════════════════════════
 * زر خروج احترافي — مستوحى من تطبيقات مثل Duolingo
 * و Spotify و Apple — مربع بحواف مستديرة خفيفة
 * مع خط ✕ نظيف وأنيق
 * ═══════════════════════════════════════════════════
 */

import { memo } from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { useTheme } from './ThemeContext';

const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

function ExitButton({ onPress, size = 36, style }) {
  const { theme } = useTheme();
  const lineColor = theme.textMuted;
  const pad = size * 0.27;

  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={HIT_SLOP}
      activeOpacity={0.7}
      style={[
        styles.btn,
        {
          width:           size,
          height:          size,
          borderRadius:    size * 0.28,
          backgroundColor: theme.bgCard,
          borderColor:     theme.borderCard,
        },
        style,
      ]}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Line
          x1={pad}      y1={pad}
          x2={size-pad} y2={size-pad}
          stroke={lineColor}
          strokeWidth={2}
          strokeLinecap="round"
        />
        <Line
          x1={size-pad} y1={pad}
          x2={pad}      y2={size-pad}
          stroke={lineColor}
          strokeWidth={2}
          strokeLinecap="round"
        />
      </Svg>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderWidth:     1,
    alignItems:      'center',
    justifyContent:  'center',
    elevation:       2,
    shadowColor:     '#000',
    shadowOpacity:   0.12,
    shadowRadius:    4,
    shadowOffset:    { width: 0, height: 2 },
  },
});

export default memo(ExitButton);
