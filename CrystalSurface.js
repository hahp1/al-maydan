/**
 * CrystalSurface.js — سطح كريستالي ثابت عالي الدقة (SVG)
 * ════════════════════════════════════════════════════════════
 *  ترجمة أمينة لدالة drawSurface (canvas) إلى SVG ثابت.
 *
 *  ★ إصلاح الاحتراق (v2):
 *    أُعيد ضبط ميزانية الإضاءة لتطابق drawSurface في العرض الأولي:
 *      1) النواة (core) صُغّرت من r=0.5 (نصف السطح) إلى نواة صغيرة
 *         r≈0.30 وخُفّضت شفافيتها — كانت تغمر السطح بضباب أبيض.
 *      2) ذروة الأوجه خُفّضت: 0.05+wl*0.20 → 0.04+wl*0.13 (مثل canvas
 *         بعد ضرب pulse الذي يُبقي أغلب الأوجه خافتة).
 *      3) الـ vignette قُوّي (0.55→0.66) ويُطبّق الآن على mini أيضاً
 *         ليحتضن الأطراف ويمنع الانفجار الضوئي.
 *      4) الانعكاس (refl) خُفّف 0.18→0.12 لتقليل البريق الأبيض العلوي.
 *      5) الحدود تُرسم أخيراً فوق كل الطبقات (كما في canvas).
 *
 *  نسختان عبر prop "tier":
 *   • tier="full" (افتراضي) — السطح الكامل بالأوجه الست + الحواف
 *       + التوهّج + الانعكاس + الحافة. للأزرار/البطاقات/المودالات الكبيرة.
 *   • tier="mini" — تدرّج زجاجي + توهّج خفيف + حافة لامعة + vignette فقط
 *       (بلا أوجه). للـ pills والصفوف والحقول الصغيرة.
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

// ── هندسة الأوجه الست — محسوبة مرة واحدة على مستوى الموديول ──
// ملاحظة الإصلاح #2: في canvas كانت شدّة كل وجه = base * pulse، و pulse
// متذبذب يُبقي أغلب الأوجه خافتة. في النسخة الثابتة نأخذ متوسطاً معتدلاً
// (0.04 + wl*0.13) بدل الذروة (0.05 + wl*0.20) لتفادي إضاءة كل الأوجه دفعة.
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
      fillOp: +(0.04 + wl * 0.13).toFixed(3),
    });
  }
  return out;
})();

const EDGE_PATH = FACETS.map(f => `M${CX},${CY}L${f.ex},${f.ey}`).join('');

function CrystalSurface({ theme, radius = 16, tier = 'full', style }) {
  // ⚠️ الـ hooks يجب أن تُستدعى دائماً قبل أي return مشروط (قاعدة الـ Hooks)
  const uid = useMemo(() => 'cs' + Math.random().toString(36).slice(2, 8), []);

  if (!theme?.isCrystal) return null;

  const accent = theme.accent      || '#94a3b8';
  const cLight = theme.crystalLight || '#e2e8f0';
  const glow   = theme.crystalGlow  || cLight;
  const c0     = theme.crystalC0    || '#1a2240';
  const c1     = theme.crystalC1    || '#0c1428';
  const light  = cLight;

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

        {/* الإصلاح #1: النواة صغيرة (r=0.30) وخافتة بدل r=0.5 الغامرة.
            في canvas كانت النواة بنصف قطر ≈ 0.06W فقط — هنا نُبقيها مركزية
            صغيرة حتى لا تتحول إلى ضباب أبيض يغطي السطح. */}
        <RadialGradient id={`core_${uid}`} cx="0.5" cy="0.5" r="0.30">
          <Stop offset="0"   stopColor="#ffffff" stopOpacity={isMini ? '0.10' : '0.14'} />
          <Stop offset="0.4" stopColor={rgba(light, 0.06)} />
          <Stop offset="1"   stopColor="#ffffff" stopOpacity="0" />
        </RadialGradient>

        <LinearGradient id={`bord_${uid}`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0"   stopColor="#ffffff" stopOpacity="0.45" />
          <Stop offset="0.4" stopColor={rgba(light, 0.24)} />
          <Stop offset="1"   stopColor="#000000" stopOpacity="0.28" />
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
            <Stop offset="0"    stopColor="#ffffff" stopOpacity="0.12" />
            <Stop offset="0.28" stopColor="#ffffff" stopOpacity="0.03" />
            <Stop offset="1"    stopColor="#ffffff" stopOpacity="0" />
          </LinearGradient>
        )}

        {/* الإصلاح #3: الـ vignette أقوى (0.66) ومتاح لكل الأحجام (mini أيضاً)
            ليحتضن الأطراف. هذا ما يمنع الانفجار الضوئي في canvas. */}
        <RadialGradient id={`vig_${uid}`} cx="0.5" cy="0.5" r="0.78">
          <Stop offset="0"    stopColor="#000000" stopOpacity="0" />
          <Stop offset="0.50" stopColor="#000000" stopOpacity="0" />
          <Stop offset="0.82" stopColor="#000000" stopOpacity="0.30" />
          <Stop offset="1"    stopColor="#000000" stopOpacity="0.66" />
        </RadialGradient>
      </Defs>

      {/* 1) خلفية غامقة */}
      <Rect x="0" y="0" width="100" height="100" rx={radius} ry={radius} fill={`url(#bg_${uid})`} />

      {/* 2) الأوجه الست (full فقط) */}
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
          strokeOpacity="0.20"
          strokeWidth="0.6"
          strokeLinecap="round"
          fill="none"
          clipPath={`url(#clip_${uid})`}
        />
      )}

      {/* 3) النواة الصغيرة */}
      <Rect x="0" y="0" width="100" height="100" rx={radius} ry={radius} fill={`url(#core_${uid})`} />

      {/* 4) الانعكاس العلوي الخفيف (full فقط) */}
      {!isMini && (
        <Rect x="0" y="0" width="100" height="100" rx={radius} ry={radius} fill={`url(#refl_${uid})`} />
      )}

      {/* 5) الـ vignette — يحتضن الأطراف (كل الأحجام) */}
      <Rect x="0" y="0" width="100" height="100" rx={radius} ry={radius} fill={`url(#vig_${uid})`} />

      {/* 6) الحدود اللامعة — أخيراً فوق كل شيء (كما في canvas) */}
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
