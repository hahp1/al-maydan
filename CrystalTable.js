/**
 * CrystalTable.js
 * ════════════════════════════════════════════════════════
 * طاولة canvas بلورية تتكيف مع كل ثيم
 * تُستخدم في: BilootGameScreen, KoutGameScreen, DominoGameScreen
 *
 * الاستخدام:
 *   <CrystalTable style={styles.tableArea} />
 *
 * تقرأ الثيم تلقائياً من ThemeContext
 */

import { useRef, useEffect, memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from './ThemeContext';

// ── تحويل الألوان ──────────────────────────────────────
function hexToRgb(hex) {
  if (!hex || typeof hex !== 'string' || !hex.startsWith('#'))
    return [128, 128, 128];
  const h = hex.replace('#', '');
  const f = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  return [
    parseInt(f.slice(0, 2), 16) || 0,
    parseInt(f.slice(2, 4), 16) || 0,
    parseInt(f.slice(4, 6), 16) || 0,
  ];
}

function parseColor(c) {
  if (!c) return [128, 128, 128];
  if (typeof c === 'string' && c.startsWith('#')) return hexToRgb(c);
  const m = c.match?.(/[\d.]+/g);
  return m ? [+m[0], +m[1], +m[2]] : [128, 128, 128];
}

// ── جلب tokens الطاولة من الثيم ──────────────────────
function getTableTokens(theme) {
  if (theme.isCrystal) {
    return {
      lightRgb:  parseColor(theme.crystalLight  || theme.accent),
      colorRgb:  parseColor(theme.crystalColor  || theme.accent),
      glowRgb:   parseColor(theme.crystalGlow   || theme.accent),
      prism:     theme.crystalPrism || [],
      bgC0:      theme.crystalC0 || theme.bg,
      bgC1:      theme.crystalC1 || theme.bg,
      type:      'crystal',
    };
  }
  if (theme.isMist) {
    const isLight = theme.isLight;
    return {
      lightRgb:  isLight ? [255,255,255] : parseColor(theme.accent),
      colorRgb:  parseColor(theme.accent),
      glowRgb:   parseColor(theme.accent),
      prism:     [],
      bgC0:      isLight ? 'rgba(240,244,248,0.55)' : theme.bgCard,
      bgC1:      isLight ? 'rgba(200,210,220,0.35)' : theme.bgElevated,
      type:      'mist',
    };
  }
  if (theme.isLight) {
    return {
      lightRgb:  parseColor(theme.accent),
      colorRgb:  parseColor(theme.purple || theme.accent),
      glowRgb:   parseColor(theme.accent),
      prism:     [],
      bgC0:      '#f5f0ff',
      bgC1:      '#ede8ff',
      type:      'light',
    };
  }
  // Dark / Neon
  return {
    lightRgb:  parseColor(theme.accent),
    colorRgb:  parseColor(theme.accent),
    glowRgb:   parseColor(theme.accent),
    prism:     [],
    bgC0:      '#0a0818',
    bgC1:      '#050510',
    type:      'dark',
  };
}

// ══════════════════════════════════════════════════════
//  رسم الطاولة
// ══════════════════════════════════════════════════════
function drawTable(canvas, tokens, frame) {
  const W = canvas.width;
  const H = canvas.height;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, W, H);

  const { lightRgb: [lr, lg, lb], colorRgb: [cr, cg, cb], glowRgb: [gr, gg, gb],
          prism, bgC0, bgC1, type } = tokens;

  const EDGE = Math.round(H * 0.11); // ارتفاع الحافة الأمامية
  const RAD  = 20;                   // انحناء الزوايا

  const b1 = (Math.sin(frame * 0.0025) + 1) * 0.5;
  const b2 = (Math.sin(frame * 0.0038 + 1.4) + 1) * 0.5;
  const b3 = (Math.sin(frame * 0.0018 + 2.7) + 1) * 0.5;

  // ════════════════════
  //  حافة العمق السفلية
  // ════════════════════
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(RAD, H - EDGE);
  ctx.lineTo(W - RAD, H - EDGE);
  ctx.quadraticCurveTo(W - RAD / 2, H - EDGE / 2, W - RAD / 3, H);
  ctx.lineTo(RAD / 3, H);
  ctx.quadraticCurveTo(RAD / 2, H - EDGE / 2, RAD, H - EDGE);
  ctx.closePath();

  const edgeGrad = ctx.createLinearGradient(0, H - EDGE, 0, H);
  edgeGrad.addColorStop(0, `rgba(${lr},${lg},${lb},0.30)`);
  edgeGrad.addColorStop(0.25, `rgba(${cr},${cg},${cb},0.18)`);
  edgeGrad.addColorStop(1, 'rgba(0,0,0,0.85)');
  ctx.fillStyle = edgeGrad;
  ctx.fill();
  ctx.restore();

  // ════════════════════
  //  خط rim اللامع (حافة الطاولة)
  // ════════════════════
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(RAD + 4, H - EDGE);
  ctx.lineTo(W - RAD - 4, H - EDGE);
  const rimHoriz = ctx.createLinearGradient(0, 0, W, 0);
  rimHoriz.addColorStop(0, 'transparent');
  rimHoriz.addColorStop(0.12, `rgba(${lr},${lg},${lb},${0.50 + b1 * 0.25})`);
  rimHoriz.addColorStop(0.5, `rgba(255,255,255,${0.75 + b1 * 0.18})`);
  rimHoriz.addColorStop(0.88, `rgba(${lr},${lg},${lb},${0.50 + b1 * 0.25})`);
  rimHoriz.addColorStop(1, 'transparent');
  ctx.strokeStyle = rimHoriz;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // ════════════════════
  //  سطح الطاولة
  // ════════════════════
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(0, 0, W, H - EDGE, RAD);
  ctx.clip();

  // ── الخلفية الأساسية ──
  const bgGrad = ctx.createLinearGradient(W * 0.3, 0, W * 0.7, H - EDGE);
  if (type === 'crystal') {
    bgGrad.addColorStop(0, bgC0);
    bgGrad.addColorStop(0.55, bgC1);
    bgGrad.addColorStop(1, '#000000');
  } else if (type === 'mist') {
    const isL = bgC0.includes('240,244');
    bgGrad.addColorStop(0, isL ? 'rgba(235,240,248,0.50)' : `rgba(${cr},${cg},${cb},0.18)`);
    bgGrad.addColorStop(1, isL ? 'rgba(195,205,218,0.32)' : `rgba(${cr},${cg},${cb},0.08)`);
  } else if (type === 'light') {
    bgGrad.addColorStop(0, '#f0eaff');
    bgGrad.addColorStop(1, '#e8dfff');
  } else {
    bgGrad.addColorStop(0, 'rgba(8,6,20,0.97)');
    bgGrad.addColorStop(1, 'rgba(3,2,12,0.99)');
  }
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // ── أشعة Crystal ──
  if (type === 'crystal') {
    const cx = W * 0.5 + Math.sin(frame * 0.003) * W * 0.025;
    const cy = (H - EDGE) * 0.5 + Math.cos(frame * 0.0025) * (H - EDGE) * 0.018;
    const ls = -Math.PI * 0.25 + frame * 0.0007;

    for (let f = 0; f < 6; f++) {
      const a1 = (f / 6) * Math.PI * 2 - Math.PI / 6;
      const a2 = ((f + 1) / 6) * Math.PI * 2 - Math.PI / 6;
      const FAR = Math.hypot(W, H) * 1.5;
      const fx1 = cx + Math.cos(a1) * FAR, fy1 = cy + Math.sin(a1) * FAR;
      const fx2 = cx + Math.cos(a2) * FAR, fy2 = cy + Math.sin(a2) * FAR;
      const fm = (a1 + a2) / 2;
      const lh = (Math.cos(fm - ls) + 1) * 0.5;
      const wl = Math.pow(lh, 1.6);
      const pulse = wl * (0.5 + 0.5 * Math.sin(frame * 0.004 + f));

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(fx1, fy1);
      ctx.lineTo(fx2, fy2);
      ctx.closePath();
      const wg = ctx.createRadialGradient(cx, cy, 0, cx, cy, FAR * 0.85);
      wg.addColorStop(0, `rgba(${lr},${lg},${lb},0)`);
      wg.addColorStop(0.10, `rgba(${lr},${lg},${lb},${0.05 + wl * 0.10})`);
      wg.addColorStop(0.45, `rgba(${gr},${gg},${gb},${0.07 + wl * 0.14})`);
      wg.addColorStop(1, `rgba(${lr},${lg},${lb},${0.08 + wl * 0.20})`);
      ctx.fillStyle = wg;
      ctx.fill();

      [[10, 0.06],[5, 0.14],[2, 0.30],[0.8, 0.52]].forEach(([lw, ba]) => {
        const a = ba * pulse;
        if (a < 0.004) return;
        const eg = ctx.createLinearGradient(cx, cy, fx1, fy1);
        eg.addColorStop(0, 'transparent');
        eg.addColorStop(0.04, `rgba(${lr},${lg},${lb},${a * 0.3})`);
        eg.addColorStop(0.30, `rgba(255,255,255,${a})`);
        eg.addColorStop(0.65, `rgba(${lr},${lg},${lb},${a * 0.7})`);
        eg.addColorStop(1, `rgba(${gr},${gg},${gb},${a * 0.4})`);
        ctx.strokeStyle = eg;
        ctx.lineWidth = lw;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(fx1, fy1);
        ctx.stroke();
      });
    }

    // Prism dispersion
    if (prism?.length) {
      prism.forEach((col, i) => {
        const [pr, pg, pb] = hexToRgb(col);
        const ph = (i / 6) * Math.PI * 2;
        const sp = 0.0010 + i * 0.00015;
        const ang = ph + frame * sp;
        const dist = 0.42 + 0.22 * Math.sin(ph + frame * sp * 0.5);
        const ox = cx + Math.cos(ang) * W * dist;
        const oy = cy + Math.sin(ang) * (H - EDGE) * dist * 0.85;
        const r = W * (0.18 + 0.08 * Math.sin(ph * 1.3 + frame * 0.0012));
        const al = 0.018 + 0.014 * Math.sin(ph * 1.8 + frame * 0.002);
        const g = ctx.createRadialGradient(ox, oy, 0, ox, oy, r);
        g.addColorStop(0, `rgba(${pr},${pg},${pb},${al * 1.4})`);
        g.addColorStop(0.5, `rgba(${pr},${pg},${pb},${al * 0.5})`);
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      });
    }

    // starburst
    const starScale = 0.38 + 0.62 * b3;
    [[8, 0.085],[4, 0.042]].forEach(([rays, len]) => {
      for (let i = 0; i < rays; i++) {
        const ang = (i / rays) * Math.PI * 2;
        const starLen = W * len * starScale;
        const sg = ctx.createLinearGradient(cx, cy, cx + Math.cos(ang) * starLen, cy + Math.sin(ang) * starLen);
        sg.addColorStop(0, `rgba(255,255,255,${starScale * 0.65})`);
        sg.addColorStop(0.28, `rgba(${lr},${lg},${lb},${starScale * 0.25})`);
        sg.addColorStop(1, 'transparent');
        ctx.strokeStyle = sg;
        ctx.lineWidth = rays === 8 ? 1.0 : 0.55;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(ang) * starLen, cy + Math.sin(ang) * starLen);
        ctx.stroke();
      }
    });
  }

  // ── Mist ripple ──
  if (type === 'mist') {
    const cx = W * 0.5, cy = (H - EDGE) * 0.45;
    const maxR = W * 0.82;
    [0, 0.33, 0.66].forEach((offset, i) => {
      const prog = ((frame * 0.00035 + offset) % 1);
      const scale = 0.02 + prog * 0.98;
      const opacity = prog < 0.08 ? prog * 6 : prog < 0.55 ? 0.40 - (prog - 0.08) * 0.55 : 0;
      if (opacity < 0.004) return;
      ctx.beginPath();
      ctx.ellipse(cx, cy, maxR * scale, maxR * scale * 0.55, 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${lr},${lg},${lb},${opacity})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    });
    const mfg = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.30);
    mfg.addColorStop(0, `rgba(${lr},${lg},${lb},0.14)`);
    mfg.addColorStop(1, 'transparent');
    ctx.fillStyle = mfg;
    ctx.fillRect(0, 0, W, H);
  }

  // ── glow مركزي ──
  const cxG = W * 0.5, cyG = (H - EDGE) * 0.5;
  const cg2 = ctx.createRadialGradient(cxG, cyG, 0, cxG, cyG, W * (0.28 + b1 * 0.08));
  cg2.addColorStop(0, `rgba(255,255,255,${0.11 + b1 * 0.07})`);
  cg2.addColorStop(0.35, `rgba(${lr},${lg},${lb},${0.05 + b1 * 0.04})`);
  cg2.addColorStop(1, 'transparent');
  ctx.fillStyle = cg2;
  ctx.fillRect(0, 0, W, H);

  // ── sheen ──
  const sheen = ctx.createLinearGradient(0, 0, W * 0.55, (H - EDGE) * 0.38);
  sheen.addColorStop(0, `rgba(255,255,255,${0.13 + b2 * 0.06})`);
  sheen.addColorStop(0.28, `rgba(255,255,255,0.04)`);
  sheen.addColorStop(1, 'transparent');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, W, H);

  // ── vignette ──
  const vg = ctx.createRadialGradient(cxG, cyG, (H - EDGE) * 0.12, cxG, cyG, W * 0.88);
  vg.addColorStop(0, 'transparent');
  vg.addColorStop(0.5, 'transparent');
  vg.addColorStop(0.78, 'rgba(0,0,0,0.15)');
  vg.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);

  // ── border rim ──
  ctx.beginPath();
  ctx.roundRect(0.8, 0.8, W - 1.6, H - EDGE - 0.8, RAD);
  const rimBorder = ctx.createLinearGradient(0, 0, W, H - EDGE);
  rimBorder.addColorStop(0, `rgba(255,255,255,${0.42 + b1 * 0.15})`);
  rimBorder.addColorStop(0.35, `rgba(${lr},${lg},${lb},${0.30 + b1 * 0.10})`);
  rimBorder.addColorStop(0.7, `rgba(${lr},${lg},${lb},${0.14 + b2 * 0.08})`);
  rimBorder.addColorStop(1, 'rgba(0,0,0,0.22)');
  ctx.strokeStyle = rimBorder;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.restore();
}

// ══════════════════════════════════════════════════════
//  المكوّن
// ══════════════════════════════════════════════════════
const CrystalTable = memo(function CrystalTable({ style, children }) {
  const { theme } = useTheme();
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);
  const frameRef  = useRef(0);
  const tokensRef = useRef(null);

  useEffect(() => {
    tokensRef.current = getTableTokens(theme);
  }, [theme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    tokensRef.current = getTableTokens(theme);

    function loop() {
      frameRef.current++;
      if (canvas && tokensRef.current)
        drawTable(canvas, tokensRef.current, frameRef.current);
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [theme]);

  return (
    <View style={[s.wrapper, style]}>
      {/* طبقة canvas الطاولة */}
      <canvas
        ref={canvasRef}
        style={s.canvas}
      />
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
  canvas: {
    position: 'absolute',
    top: 0, left: 0,
    width: '100%',
    height: '100%',
  },
  content: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 2,
  },
});

export default CrystalTable;
