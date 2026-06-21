/**
 * CrystalSurface.js — سطح كريستالي ثابت عالي الدقة (SVG)
 * ════════════════════════════════════════════════════════════
 *  ترجمة أمينة لدالة drawSurface (canvas) إلى SVG ثابت.
 *
 *  نسختان عبر prop "tier":
 *   • tier="full" (افتراضي) — السطح الكامل بالأوجه الست + الحواف
 *       + التوهّج + الانعكاس + الحافة. للأزرار/البطاقات/المودالات الكبيرة.
 *   • tier="mini" — تدرّج زجاجي + توهّج خفيف + حافة لامعة فقط (بلا أوجه).
 *       للـ pills والصفوف والحقول الصغيرة حيث الأوجه لا تُرى ويزيد الحمل.
 *
 *  مبادئ الأداء:
 *   ✅ ثابت 100% — لا animation/canvas/WebView/rAF. يُحسب مرة واحدة.
 *   ✅ هندسة الأوجه + مسار الحواف محسوبة على مستوى الموديول.
 *   ✅ الحواف الست مدموجة في عنصر <Path> واحد (بدل 6 <Line>).
 *   ✅ بلا AnimatedG / transform-in-style (تفادي كراش react-native-svg).
 *   ✅ يظهر فقط للكريستال → null لأي ثيم آخر.
 *   ✅ preserveAspectRatio="none" → أي حجم + دوران تلقائي بلا مزامنة.
 */

import { memo, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Svg, {
  Defs,
  RadialGradient,
  LinearGradient,
  Stop,
  Rect,
  Polygon,
  Path,
  ClipPath,
} from 'react-native-svg';

function hexToRgb(hex) {
  if (!hex || typeof hex !== 'string') return '148,163,184';
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const r = parseInt(c.slice(0, 2), 16) || 0;
  const g = parseInt(c.slice(2, 4), 16) || 0;
  const b = parseInt(c.slice(4, 6), 16) || 0;
  return `${r},${g},${b}`;
}
function rgba(hex, a) {
  return `rgba(${hexToRgb(hex)},${a})`;
}

const CX = 50, CY = 50, FAR = 170;
const LIGHT_DIR = -Math.PI * 0.25;

const FACETS = (() => {
  const out = [];
  for (let f = 0; f < 6; f++) {
    const a1 = (f / 6) * Math.PI * 2 - Math.PI / 6;
    const a2 = ((f + 1) / 6) * Math.PI * 2 - Math.PI / 6;
    const x1 = CX + Math.cos(a1) * FAR;
    const y1 = CY + Math.sin(a1) * FAR;
    const x2 = CX + Math.cos(a2) * FAR;
    const y2 = CY + Math.sin(a2) * FAR;
    const fm = (a1 + a2) / 2;
    const lh = (Math.cos(fm - LIGHT_DIR) + 1) * 0.5;
    const wl = Math.pow(lh, 1.6);
    out.push({
      key: f,
      points: `${CX},${CY} ${x1.toFixed(1)},${y1.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`,
      ex: x1.toFixed(1),
      ey: y1.toFixed(1),
      fillOp: +(0.05 + wl * 0.20).toFixed(3),
    });
  }
  return out;
})();

const EDGE_PATH = FACETS.map(f => `M${CX},${CY}L${f.ex},${f.ey}`).join('');

function CrystalSurface({ theme, radius = 16, tier = 'full', style }) {
  if (!theme?.isCrystal) return null;

  const accent = theme.accent      || '#94a3b8';
  const cLight = theme.crystalLight || '#e2e8f0';
  const glow   = theme.crystalGlow  || cLight;
  const c0     = theme.crystalC0    || '#1a2240';
  const c1     = theme.crystalC1    || '#0c1428';
  const light  = cLight;

  const uid = useMemo(() => 'cs' + Math.random().toString(36).slice(2, 8), []);
  const isMini = tier === 'mini';

  return (
    <Svg
      style={[StyleSheet.absoluteFill, style]}
      width="100%"
      height="100%"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      pointerEvents="none"
    >
      <Defs>
        <ClipPath id={`clip_${uid}`}>
          <Rect x="0" y="0" width="100" height="100" rx={radius} ry={radius} />
        </ClipPath>

        <RadialGradient id={`bg_${uid}`} cx="0.38" cy="0.32" r="0.9">
          <Stop offset="0"   stopColor={c0} />
          <Stop offset="0.6" stopColor={c1} />
          <Stop offset="1"   stopColor="#000000" />
        </RadialGradient>

        <RadialGradient id={`core_${uid}`} cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0"   stopColor="#ffffff" stopOpacity={isMini ? '0.18' : '0.25'} />
          <Stop offset="0.3" stopColor={rgba(light, 0.10)} />
          <Stop offset="1"   stopColor="#ffffff" stopOpacity="0" />
        </RadialGradient>

        <LinearGradient id={`bord_${uid}`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0"   stopColor="#ffffff" stopOpacity="0.5" />
          <Stop offset="0.4" stopColor={rgba(light, 0.28)} />
          <Stop offset="1"   stopColor="#000000" stopOpacity="0.25" />
        </LinearGradient>

        {!isMini && (
          <RadialGradient id={`fac_${uid}`} cx="0.5" cy="0.5" r="0.75">
            <Stop offset="0"   stopColor={accent} />
            <Stop offset="0.5" stopColor={glow} />
            <Stop offset="1"   stopColor={light} />
          </RadialGradient>
        )}
        {!isMini && (
          <LinearGradient id={`edge_${uid}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0"   stopColor={light} stopOpacity="0.2" />
            <Stop offset="0.4" stopColor="#ffffff" />
            <Stop offset="1"   stopColor={accent} stopOpacity="0.4" />
          </LinearGradient>
        )}
        {!isMini && (
          <LinearGradient id={`refl_${uid}`} x1="0" y1="0" x2="0.55" y2="0.42">
            <Stop offset="0"    stopColor="#ffffff" stopOpacity="0.18" />
            <Stop offset="0.28" stopColor="#ffffff" stopOpacity="0.04" />
            <Stop offset="1"    stopColor="#ffffff" stopOpacity="0" />
          </LinearGradient>
        )}
        {!isMini && (
          <RadialGradient id={`vig_${uid}`} cx="0.5" cy="0.5" r="0.75">
            <Stop offset="0"    stopColor="#000000" stopOpacity="0" />
            <Stop offset="0.55" stopColor="#000000" stopOpacity="0" />
            <Stop offset="0.85" stopColor="#000000" stopOpacity="0.28" />
            <Stop offset="1"    stopColor="#000000" stopOpacity="0.55" />
          </RadialGradient>
        )}
      </Defs>

      <Rect x="0" y="0" width="100" height="100" rx={radius} ry={radius} fill={`url(#bg_${uid})`} />

      {!isMini && FACETS.map(f => (
        <Polygon
          key={'f' + f.key}
          points={f.points}
          fill={`url(#fac_${uid})`}
          fillOpacity={f.fillOp}
          clipPath={`url(#clip_${uid})`}
        />
      ))}
      {!isMini && (
        <Path
          d={EDGE_PATH}
          stroke={`url(#edge_${uid})`}
          strokeOpacity="0.22"
          strokeWidth="0.6"
          strokeLinecap="round"
          fill="none"
          clipPath={`url(#clip_${uid})`}
        />
      )}

      <Rect x="0" y="0" width="100" height="100" rx={radius} ry={radius} fill={`url(#core_${uid})`} />

      {!isMini && (
        <Rect x="0" y="0" width="100" height="100" rx={radius} ry={radius} fill={`url(#refl_${uid})`} />
      )}
      {!isMini && (
        <Rect x="0" y="0" width="100" height="100" rx={radius} ry={radius} fill={`url(#vig_${uid})`} />
      )}

      <Rect
        x="0.8" y="0.8" width="98.4" height="98.4"
        rx={radius} ry={radius}
        fill="none"
        stroke={`url(#bord_${uid})`}
        strokeWidth="1.5"
      />
    </Svg>
  );
}

export default memo(CrystalSurface);
