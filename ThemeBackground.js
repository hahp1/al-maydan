/**
 * ThemeBackground.js
 * ══════════════════════════════════════════════════════════
 * خلفية واحدة ثابتة للتطبيق كله — تُرسم مرة واحدة في ThemeContext
 *
 * - Dark / Light  → View بسيط (لا WebView)
 * - City          → LinearGradient + Skyline (React Native مباشرة)
 * - Mist          → WebView Canvas (حلقات موجية)
 * - Crystal       → WebView Canvas (أشعة بلورية)
 *
 * WebView: HTML مدمج كـ string → يعمل 100% أوف لاين
 * تغيير الثيم → injectJavaScript فوري بدون reload
 */

import { useRef, useEffect, useState, useCallback, memo } from 'react';
import { View, StyleSheet, ImageBackground, Animated, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CRASH_COUNT_KEY = 'arena_theme_crash_count';

// ══════════════════════════════════════════════════════════
//  بيانات الثيمات للـ WebView
// ══════════════════════════════════════════════════════════
const MIST_DATA = {
  truemist:   { pos:0.80, dark:'#141820', mid:'#222c38', accent:'#7888a0', secondary:'#505e70', light:'#a8b8c8' },
  bluemist:   { pos:0.65, dark:'#060a12', mid:'#0e1c2e', accent:'#4a6890', secondary:'#2e4860', light:'#7a9ab8' },
  blackmist:  { pos:0.50, dark:'#040506', mid:'#0e1014', accent:'#5a6870', secondary:'#3a4850', light:'#7a8a95' },
  greenmist:  { pos:0.35, dark:'#030808', mid:'#0a1810', accent:'#3a6848', secondary:'#284838', light:'#608870' },
  orangemist: { pos:0.20, dark:'#080400', mid:'#1c0e04', accent:'#b85820', secondary:'#7a3810', light:'#d88040' },
};

const CRYSTAL_DATA = {
  crystal_diamond:  { bg:'#05070f', c0:'#1a2240', c1:'#0c1428', accent:'#94a3b8', light:'#ffffff',  glow:'#88aaee', prism:['#ff7777','#ffdd44','#77ee88','#66aaff','#dd88ff'] },
  crystal_ruby:     { bg:'#06010a', c0:'#3a0010', c1:'#1e0008', accent:'#eb3c5a', light:'#ffccdd', glow:'#ff1133', prism:['#ff6688','#ffcc44','#ff44aa','#ff2244','#ffaa66'] },
  crystal_emerald:  { bg:'#010904', c0:'#003818', c1:'#001e0c', accent:'#0aaa73', light:'#aaffd4', glow:'#00cc66', prism:['#00ffaa','#aaff44','#00ffcc','#66ff88','#ccffaa'] },
  crystal_sapphire: { bg:'#01020e', c0:'#001440', c1:'#000a28', accent:'#3273e6', light:'#aaccff', glow:'#2255ff', prism:['#77ccff','#aaddff','#ffffff','#5588ff','#bb99ff'] },
  crystal_amethyst: { bg:'#030108', c0:'#200038', c1:'#100020', accent:'#804beb', light:'#eeccff', glow:'#9922ee', prism:['#ff88ff','#cc44ff','#8833ff','#ff55bb','#ddaaff'] },
  crystal_topaz:    { bg:'#060501', c0:'#2a1800', c1:'#160c00', accent:'#d4b800', light:'#ffeeaa', glow:'#ffcc00', prism:['#ffff55','#ffcc00','#ff8800','#ffee77','#ffffff']  },
};

function getWebViewTheme(theme) {
  if (theme.isMist) {
    const d = MIST_DATA[theme.id];
    if (!d) return null;
    return { type:'mist', id:theme.id, mistData:d };
  }
  if (theme.isCrystal) {
    const d = CRYSTAL_DATA[theme.id];
    if (!d) return null;
    return { type:'crystal', id:theme.id, crystalData:d };
  }
  return null;
}

// ══════════════════════════════════════════════════════════
//  HTML / Canvas للـ WebView
// ══════════════════════════════════════════════════════════
const WEBVIEW_HTML = `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<style>*{margin:0;padding:0;box-sizing:border-box}html,body{width:100%;height:100%;overflow:hidden;background:#000}canvas{position:absolute;top:0;left:0;width:100%;height:100%;display:block}</style>
</head><body>
<canvas id="c"></canvas>
<script>
const canvas=document.getElementById('c');
const ctx=canvas.getContext('2d');
let W,H,theme=null,raf=null,frame=0;

function resize(){W=canvas.width=window.innerWidth;H=canvas.height=window.innerHeight;}
window.addEventListener('resize',resize);
resize();

window.addEventListener('message',e=>{try{setTheme(JSON.parse(e.data));}catch(_){}});
document.addEventListener('message',e=>{try{setTheme(JSON.parse(e.data));}catch(_){}});

function setTheme(t){
  theme=t;frame=0;
  if(raf){cancelAnimationFrame(raf);raf=null;}
  if(t.type==='mist'||t.type==='crystal') loop();
}

// ── Mist ──
function drawMist(t,fr){
  const{pos,dark,mid,accent,secondary,light}=t.mistData;
  const cx=W*pos,cy=H*0.44;
  ctx.clearRect(0,0,W,H);
  const sky=ctx.createLinearGradient(0,0,0,H);
  sky.addColorStop(0,dark);sky.addColorStop(0.30,mid);
  sky.addColorStop(0.65,accent+'55');sky.addColorStop(1,dark);
  ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
  if(t.id==='bluemist'){
    for(let i=0;i<30;i++){
      ctx.globalAlpha=0.10+(i%4)*0.05;ctx.fillStyle='#ffffff';
      ctx.beginPath();ctx.arc((i*1377)%W,(i*983)%(H*.30),(0.4+(i%3)*.3)*(H/800),0,Math.PI*2);ctx.fill();
    }ctx.globalAlpha=1;
  }
  const isBig=(t.id==='truemist'||t.id==='blackmist');
  const rings=isBig?[{r:.13,a:.18},{r:.28,a:.11},{r:.45,a:.07},{r:.63,a:.04}]
                   :[{r:.09,a:.40},{r:.20,a:.28},{r:.33,a:.17},{r:.48,a:.10},{r:.65,a:.06}];
  rings.forEach(ring=>{
    const r=ring.r*W;
    const g=ctx.createRadialGradient(cx,cy,r*0.82,cx,cy,r);
    const hex=v=>Math.round(Math.min(Math.max(v,0),1)*255).toString(16).padStart(2,'0');
    g.addColorStop(0,'transparent');g.addColorStop(0.35,accent+hex(ring.a));
    g.addColorStop(0.65,secondary+hex(Math.round(ring.a*0.5)));g.addColorStop(1,'transparent');
    ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  });
  const pulse=0.85+0.15*Math.sin(fr*0.015);
  const core=ctx.createRadialGradient(cx,cy,0,cx,cy,W*0.055*pulse);
  core.addColorStop(0,light+'ee');core.addColorStop(0.35,accent+'88');core.addColorStop(1,'transparent');
  ctx.fillStyle=core;ctx.fillRect(0,0,W,H);
  const mg=ctx.createLinearGradient(0,H*0.25,0,H*0.85);
  mg.addColorStop(0,'transparent');mg.addColorStop(0.35,'#ffffff12');mg.addColorStop(0.65,'#ffffff14');mg.addColorStop(1,'transparent');
  ctx.fillStyle=mg;ctx.fillRect(0,H*0.25,W,H*0.6);
  const topFog=ctx.createLinearGradient(0,0,0,H*0.3);
  topFog.addColorStop(0,dark+'ee');topFog.addColorStop(1,'transparent');
  ctx.fillStyle=topFog;ctx.fillRect(0,0,W,H*0.3);
  const vig=ctx.createRadialGradient(cx,cy,H*0.2,cx,cy,W*0.68);
  vig.addColorStop(0,'transparent');vig.addColorStop(0.7,'transparent');vig.addColorStop(1,dark+'aa');
  ctx.fillStyle=vig;ctx.fillRect(0,0,W,H);
}

// ── Crystal ──
function hexToRgb(h){const s=h.replace('#','');return[parseInt(s.slice(0,2),16),parseInt(s.slice(2,4),16),parseInt(s.slice(4,6),16)];}

function drawCrystal(t,fr){
  const{c0,c1,accent,light,glow,prism}=t.crystalData;
  const cx=W/2+Math.sin(fr*0.003)*W*0.025;
  const cy=H/2+Math.cos(fr*0.0025)*H*0.018;
  const[ar,ag,ab]=hexToRgb(accent);
  const[lr,lg,lb]=hexToRgb(light);
  const[gr,gg,gb]=hexToRgb(glow);
  const b1=(Math.sin(fr*0.0028)+1)*0.5;
  const b3=(Math.sin(fr*0.0019+2.7)+1)*0.5;
  ctx.clearRect(0,0,W,H);ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);
  const bg=ctx.createRadialGradient(cx*0.85,cy*0.65,0,cx,cy*1.1,W*1.1);
  bg.addColorStop(0,c0);bg.addColorStop(0.55,c1);bg.addColorStop(1,'#000000');
  ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
  const ls=-Math.PI*0.25+fr*0.0008;
  for(let f=0;f<6;f++){
    const a1=(f/6)*Math.PI*2-Math.PI/6,a2=((f+1)/6)*Math.PI*2-Math.PI/6;
    const FAR=Math.hypot(W,H)*1.4;
    const fx1=cx+Math.cos(a1)*FAR,fy1=cy+Math.sin(a1)*FAR;
    const fx2=cx+Math.cos(a2)*FAR,fy2=cy+Math.sin(a2)*FAR;
    const fm=(a1+a2)/2,lh=(Math.cos(fm-ls)+1)*0.5;
    const wl=Math.pow(lh,1.6),pulse=wl*(0.55+0.45*Math.sin(fr*0.0035+f*1.05));
    ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(fx1,fy1);ctx.lineTo(fx2,fy2);ctx.closePath();
    const wg=ctx.createRadialGradient(cx,cy,0,cx,cy,FAR*0.88);
    wg.addColorStop(0,\`rgba(\${ar},\${ag},\${ab},0)\`);
    wg.addColorStop(0.10,\`rgba(\${ar},\${ag},\${ab},\${0.05+wl*0.10})\`);
    wg.addColorStop(0.42,\`rgba(\${gr},\${gg},\${gb},\${0.07+wl*0.14})\`);
    wg.addColorStop(1,\`rgba(\${lr},\${lg},\${lb},\${0.08+wl*0.24})\`);
    ctx.fillStyle=wg;ctx.fill();
    [[14,0.06],[7,0.14],[3,0.28],[1.2,0.50]].forEach(([lw,ba])=>{
      const a=ba*pulse;if(a<0.003)return;
      const eg=ctx.createLinearGradient(cx,cy,fx1,fy1);
      eg.addColorStop(0,'transparent');eg.addColorStop(0.04,\`rgba(\${lr},\${lg},\${lb},\${a*0.3})\`);
      eg.addColorStop(0.30,\`rgba(255,255,255,\${a})\`);eg.addColorStop(0.65,\`rgba(\${lr},\${lg},\${lb},\${a*0.8})\`);
      eg.addColorStop(1,\`rgba(\${ar},\${ag},\${ab},\${a*0.4})\`);
      ctx.strokeStyle=eg;ctx.lineWidth=lw;ctx.lineCap='round';
      ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(fx1,fy1);ctx.stroke();
    });
  }
  prism.forEach((col,i)=>{
    const[pr,pg,pb]=hexToRgb(col);
    const ph=(i/5)*Math.PI*2,sp=0.0012+i*0.00016;
    const ang=ph+fr*sp,dist=0.45+0.28*Math.sin(ph+fr*sp*0.5);
    const ox=cx+Math.cos(ang)*W*dist,oy=cy+Math.sin(ang)*H*dist*0.9;
    const r=W*(0.24+0.10*Math.sin(ph*1.3+fr*0.0014));
    const al=0.022+0.018*Math.sin(ph*1.8+fr*0.002);
    const g=ctx.createRadialGradient(ox,oy,0,ox,oy,r);
    g.addColorStop(0,\`rgba(\${pr},\${pg},\${pb},\${al*1.4})\`);
    g.addColorStop(0.5,\`rgba(\${pr},\${pg},\${pb},\${al*0.5})\`);
    g.addColorStop(1,'transparent');
    ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  });
  const cg=ctx.createRadialGradient(cx,cy,0,cx,cy,W*(0.06+b1*0.025));
  cg.addColorStop(0,\`rgba(255,255,255,\${0.55+b1*0.25})\`);
  cg.addColorStop(0.35,\`rgba(\${lr},\${lg},\${lb},\${0.22+b1*0.09})\`);
  cg.addColorStop(1,'transparent');
  ctx.fillStyle=cg;ctx.fillRect(0,0,W,H);
  const cs=0.4+0.6*b3;
  [8,4].forEach((rays,ri)=>{
    for(let i=0;i<rays;i++){
      const a=(i/rays)*Math.PI*2+ri*(Math.PI/(rays*2));
      const len=W*(ri===0?0.10:0.045)*cs;
      const sg=ctx.createLinearGradient(cx,cy,cx+Math.cos(a)*len,cy+Math.sin(a)*len);
      sg.addColorStop(0,\`rgba(255,255,255,\${cs*0.70})\`);
      sg.addColorStop(0.25,\`rgba(\${lr},\${lg},\${lb},\${cs*0.28})\`);
      sg.addColorStop(1,'transparent');
      ctx.strokeStyle=sg;ctx.lineWidth=ri===0?1.1:0.6;
      ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.cos(a)*len,cy+Math.sin(a)*len);ctx.stroke();
    }
  });
  const vg=ctx.createRadialGradient(cx,cy,H*0.08,cx,cy,W*0.88);
  vg.addColorStop(0,'transparent');vg.addColorStop(0.38,'transparent');
  vg.addColorStop(0.65,'rgba(0,0,0,0.12)');vg.addColorStop(0.82,'rgba(0,0,0,0.52)');
  vg.addColorStop(1,'rgba(0,0,0,0.95)');
  ctx.fillStyle=vg;ctx.fillRect(0,0,W,H);
}

function loop(){
  if(!theme)return;
  frame++;
  if(theme.type==='mist') drawMist(theme,frame);
  else if(theme.type==='crystal') drawCrystal(theme,frame);
  raf=requestAnimationFrame(loop);
}
</script></body></html>`;

// ══════════════════════════════════════════════════════════
//  City stars cache — positions as percentages (orientation-safe)
// ══════════════════════════════════════════════════════════
const STARS_CACHE = {};
function getCityStars(theme, count) {
  if (!STARS_CACHE[theme.id]) {
    STARS_CACHE[theme.id] = [...Array(count)].map((_,i) => ({
      key: i,
      top:  `${(i*43+7)  % 62}%`,
      left: `${(i*67+13) % 96}%`,
      size: i%5===0 ? 2.5 : i%3===0 ? 1.8 : 1.2,
      opacity: 0.25 + (i%4)*0.15,
    }));
  }
  return STARS_CACHE[theme.id];
}

// ══════════════════════════════════════════════════════════
//  ThemeBackground
// ══════════════════════════════════════════════════════════
const ThemeBackground = memo(({ theme }) => {
  const { width: W, height: H } = useWindowDimensions();
  const isLandscape = W > H;

  const webviewRef = useRef(null);
  const fadeAnim   = useRef(new Animated.Value(0)).current;
  const wvTheme    = getWebViewTheme(theme);

  const [wvReady, setWvReady] = useState(false);

  const sendTheme = useCallback(() => {
    if (!wvTheme || !webviewRef.current) return;
    try {
      webviewRef.current.injectJavaScript(
        `try { setTheme(${JSON.stringify(wvTheme)}); } catch(_) {} true;`
      );
    } catch (_) {}
  }, [wvTheme]);

  const handleLoad = useCallback(() => {
    setWvReady(true);
    AsyncStorage.setItem(CRASH_COUNT_KEY, '0').catch(() => {});
    setTimeout(() => {
      sendTheme();
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 400, useNativeDriver: true,
      }).start();
    }, 150);
  }, [sendTheme]);

  useEffect(() => {
    if (!wvReady) return;
    const timer = setTimeout(sendTheme, 120);
    return () => clearTimeout(timer);
  }, [theme.id, wvReady]);

  // ── تصفير عدّاد الانهيار للثيمات التي لا تستخدم WebView ──
  // (City / Dark / Light). WebView يُصفّره في handleLoad؛ لكن ثيمات
  // City لا تمرّ عبر WebView فكان العدّاد يبقى مرتفعاً ويسبب حلقة انهيار
  // (الثيم المجاني الوحيد city_paris كان يعلق هكذا). نصفّره بعد أن يثبت
  // أن الرندر مرّ بسلام نصف ثانية دون انهيار.
  useEffect(() => {
    if (theme.isMist || theme.isCrystal) return; // هذه يتكفّل بها handleLoad
    const t = setTimeout(() => {
      AsyncStorage.setItem(CRASH_COUNT_KEY, '0').catch(() => {});
    }, 500);
    return () => clearTimeout(t);
  }, [theme.id, theme.isMist, theme.isCrystal]);

  // ── Dark / Light ──
  if (!theme.isMist && !theme.isCrystal && !theme.isCityTheme) {
    return null;
  }

  // ── Mist / Crystal → WebView ──
  if (theme.isMist || theme.isCrystal) {
    return (
      <View style={s.fill} pointerEvents="none">
        <Animated.View style={[s.fill, { opacity: fadeAnim }]}>
          <WebView
            ref={webviewRef}
            style={s.fill}
            source={{ html: WEBVIEW_HTML }}
            scrollEnabled={false}
            bounces={false}
            overScrollMode="never"
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
            originWhitelist={['*']}
            javaScriptEnabled={true}
            domStorageEnabled={false}
            allowsInlineMediaPlayback={false}
            mediaPlaybackRequiresUserAction={true}
            androidLayerType="software"
            onLoad={handleLoad}
            onError={() => {}}
            onHttpError={() => {}}
            onRenderProcessGone={() => {}}
          />
        </Animated.View>
      </View>
    );
  }

  // ── City ──
  const stars = theme.starCount ? getCityStars(theme, theme.starCount) : [];

  const skyColors = (theme.skyGradient && theme.skyGradient.length >= 2)
    ? theme.skyGradient
    : [theme.bg || '#05070f', theme.bg || '#05070f'];

  const fadeColors = theme.skyBottom
    ? [theme.skyBottom, theme.skyBottom + '00']
    : ['#07091a', '#07091a00'];

  // ارتفاع السكاي لاين: نسبة من الارتفاع الفعلي للشاشة
  // portrait: 26% | landscape: 38% — شريط رفيع يحافظ على هوية المدينة بدون طغيان
  const skylineHeight = isLandscape ? H * 0.38 : H * 0.26;
  // fade أسفل: نصف الارتفاع في landscape لإذابة أنعم، ثلث في portrait
  const skylineFadeH  = isLandscape ? skylineHeight * 0.55 : skylineHeight * 0.36;

  return (
    <View style={s.fill} pointerEvents="none">
      {/* ── السماء: gradient كامل من أعلى لأسفل ── */}
      <LinearGradient
        colors={skyColors}
        style={s.fill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      {/* ── النجوم: تظهر في الثلثين العلويين فقط ── */}
      {stars.map(st => (
        <View key={st.key} style={{
          position: 'absolute',
          top: st.top,
          left: st.left,
          width: st.size,
          height: st.size,
          borderRadius: 99,
          backgroundColor: (theme.accent || '#ffffff') + 'cc',
          opacity: st.opacity,
        }} />
      ))}

      {/* ── السكاي لاين: ارتفاع نسبي يتكيف مع الاتجاه ── */}
      {theme.skylineAsset ? (
        <View style={[s.skylineWrap, { height: skylineHeight }]}>
          <ImageBackground
            source={theme.skylineAsset}
            style={s.skylineImg}
            resizeMode={isLandscape ? 'cover' : 'cover'}
            onError={() => {}}
          />
          {/* تدرج يُدمج السكاي لاين مع السماء من الأسفل */}
          <LinearGradient
            colors={fadeColors}
            style={[s.skylineFade, { height: skylineFadeH }]}
            start={{ x: 0, y: 1 }}
            end={{ x: 0, y: 0 }}
          />
          {/* تدرج علوي يُدمج السكاي لاين مع السماء من الأعلى */}
          <LinearGradient
            colors={[skyColors[0] + '00', skyColors[0]]}
            style={[s.skylineTopFade, { height: skylineHeight * (isLandscape ? 0.35 : 0.22) }]}
            start={{ x: 0, y: 1 }}
            end={{ x: 0, y: 0 }}
          />
        </View>
      ) : null}
    </View>
  );
});

export default ThemeBackground;

const s = StyleSheet.create({
  fill:           { ...StyleSheet.absoluteFillObject },
  skylineWrap:    { position: 'absolute', bottom: 0, left: 0, right: 0 },
  skylineImg:     { width: '100%', height: '100%' },
  skylineFade:    { position: 'absolute', bottom: 0, left: 0, right: 0 },
  skylineTopFade: { position: 'absolute', top: 0,    left: 0, right: 0 },
});
