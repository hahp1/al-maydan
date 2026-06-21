/**
 * CrystalTable.js — نسخة نهائية (بلا canvas)
 * ════════════════════════════════════════════════════════════
 *  طاولة بلورية تتكيف مع كل ثيم — مبنية بـ LinearGradient + SVG
 *  (العنصر <canvas> HTML غير مدعوم في React Native وكان يسبب:
 *   "View config getter callback for component 'canvas'")
 *
 *  نفس الواجهة القديمة: <CrystalTable style={...}>{children}</CrystalTable>
 *  تُستخدم في: Kout · Biloot · Domino
 */

import { memo, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Stop, Rect, Ellipse } from 'react-native-svg';
import { useTheme } from './ThemeContext';

// ── تحويل الألوان ──────────────────────────────────────
function hexToRgba(hex, a = 1) {
  if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) return `rgba(128,128,128,${a})`;
  const h = hex.replace('#', '');
  const f = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const r = parseInt(f.slice(0, 2), 16) || 0;
  const g = parseInt(f.slice(2, 4), 16) || 0;
  const b = parseInt(f.slice(4, 6), 16) || 0;
  return `rgba(${r},${g},${b},${a})`;
}

// ── ألوان الطاولة حسب الثيم ──────────────────────────
function getTableColors(theme) {
  const accent = theme.accent || '#6366f1';

  if (theme.isCrystal) {
    return {
      bg0:   theme.crystalC0 || theme.bgElevated || '#0a0818',
      bg1:   theme.crystalC1 || theme.bg || '#050510',
      glow:  hexToRgba(theme.crystalGlow || accent, 0.28),
      edge:  hexToRgba(theme.crystalLight || accent, 0.30),
    };
  }
  if (theme.isMist) {
    return {
      bg0:   theme.bgCard || '#1a2340',
      bg1:   theme.bgElevated || '#0f1830',
      glow:  hexToRgba(accent, theme.isLight ? 0.10 : 0.16),
      edge:  hexToRgba(accent, 0.22),
    };
  }
  if (theme.isLight) {
    return {
      bg0:   '#f5f0ff',
      bg1:   '#ede8ff',
      glow:  hexToRgba(accent, 0.12),
      edge:  hexToRgba(accent, 0.25),
    };
  }
  if (theme.isCityTheme) {
    return {
      bg0:   theme.bgCard || '#12182a',
      bg1:   theme.bg || '#0a0e1a',
      glow:  hexToRgba(accent, 0.20),
      edge:  hexToRgba(accent, 0.28),
    };
  }
  // Dark / Neon
  return {
    bg0:   theme.bgCard || '#0a0818',
    bg1:   theme.bg || '#050510',
    glow:  hexToRgba(accent, 0.22),
    edge:  hexToRgba(accent, 0.30),
  };
}

// ══════════════════════════════════════════════════════
const CrystalTable = memo(function CrystalTable({ style, children }) {
  const { theme } = useTheme();
  const c = useMemo(() => getTableColors(theme), [theme]);

  return (
    <View style={[s.wrapper, style]}>
      {/* تدرّج الخلفية */}
      <LinearGradient
        colors={[c.bg0, c.bg1]}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* توهّج مركزي + حافّة بيضاوية عبر SVG */}
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <RadialGradient id="tableGlow" cx="50%" cy="42%" rx="65%" ry="55%">
            <Stop offset="0%"   stopColor={c.glow} stopOpacity="1" />
            <Stop offset="70%"  stopColor={c.glow} stopOpacity="0.25" />
            <Stop offset="100%" stopColor={c.glow} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#tableGlow)" />
        {/* حافّة بيضاوية خفيفة توحي بطاولة */}
        <Ellipse
          cx="50%" cy="50%" rx="46%" ry="40%"
          fill="none"
          stroke={c.edge}
          strokeWidth="1.5"
        />
      </Svg>

      {/* المحتوى فوق الطاولة (الأوراق، قطع الدومنو، إلخ) */}
      {children && (
        <View style={s.content} pointerEvents="box-none">
          {children}
        </View>
      )}
    </View>
  );
});

const s = StyleSheet.create({
  wrapper: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 20,
  },
  content: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 2,
  },
});

export default CrystalTable;
