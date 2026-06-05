/**
 * GameEngraving.js
 * ════════════════════════════════════════════════════════════
 * نقوشات SVG زخرفية لخلفية كل لعبة — تتأثر بالثيم
 *
 * إصلاحات react-native-svg:
 *  - opacity دائماً بين 0.0 و 1.0 (لا ضرب يتجاوز 1)
 *  - لا x="50%" — أرقام فقط
 *  - لا M متعددة في path واحد — مسارات منفصلة
 *  - strokeWidth رقم وليس string
 *  - fontSize رقم وليس string
 * ════════════════════════════════════════════════════════════
 */

import { StyleSheet, View, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  Path, Circle, Rect, Line, Polygon, Ellipse, G,
  Text as SvgText,
} from 'react-native-svg';

// ── helpers ──────────────────────────────────────────────────
const clamp = (v) => Math.min(1, Math.max(0, v));

export function getEngraveColor(theme) { return theme.accent; }
// ══════════════════════════════════════════════════════════════
//  🚫 Engravings معطّلة مؤقتاً — كل الألعاب تأخذ خلفية الثيم
//  لإعادة التفعيل: غيّر ENGRAVINGS_ENABLED إلى true
// ══════════════════════════════════════════════════════════════
const ENGRAVINGS_ENABLED = false;
export function getEngraveBg(theme)    { return theme.bg; }

function EngrWrap({ children }) {
  const { theme } = useTheme();
  return (
    <View style={s.wrap} pointerEvents="none">
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 390 844"
        preserveAspectRatio="xMidYMid slice"
      >
        {children}
      </Svg>
    </View>
  );
}

// ════════════════════════════════════════════════════════════
//  1. TRUTH OR DARE — لهب نار + علامات ?
// ════════════════════════════════════════════════════════════
export function TruthDareEngraving({theme }) {
  if (!ENGRAVINGS_ENABLED) return null;
  if (theme?.isCityTheme) return null;
  const ec = getEngraveColor(theme);
  const b  = theme.isLight ? 0.13 : 0.10;   // base opacity

  return (
    <EngrWrap>
      {/* ستارة لهب يسار */}
      <Path
        d="M0,844 C20,720 45,668 25,550 C55,630 80,580 65,462 C95,538 115,485 100,380 C130,455 145,400 130,295 C160,375 175,320 155,212 C185,295 200,240 180,62 C220,220 225,170 200,0 L0,0Z"
        fill={ec} opacity={clamp(b * 1.4)}
      />
      {/* ستارة لهب يمين */}
      <Path
        d="M390,844 C370,720 345,668 365,550 C335,630 310,580 325,462 C295,538 275,485 290,380 C260,455 245,400 260,295 C230,375 215,320 235,212 C205,295 190,240 210,62 C170,220 165,170 190,0 L390,0Z"
        fill={ec} opacity={clamp(b * 1.1)}
      />
      {/* لسان لهب أيسر */}
      <Path
        d="M180,0 C185,45 195,70 195,105 C195,70 205,45 210,0 C205,30 195,50 185,30Z"
        fill={ec} opacity={clamp(b * 2.8)}
      />
      {/* لسان لهب أيمن */}
      <Path
        d="M195,0 C198,30 204,50 204,75 C204,50 210,30 213,0 C210,20 204,35 198,20Z"
        fill={ec} opacity={clamp(b * 2.0)}
      />
      {/* علامات ? */}
      <SvgText x={25}  y={130} fontSize={52} fill={ec} fontWeight="900" opacity={clamp(b * 1.4)}>?</SvgText>
      <SvgText x={318} y={220} fontSize={42} fill={ec} fontWeight="900" opacity={clamp(b * 1.1)}>?</SvgText>
      <SvgText x={18}  y={390} fontSize={36} fill={ec} fontWeight="900" opacity={clamp(b * 0.9)}>?</SvgText>
      <SvgText x={338} y={500} fontSize={30} fill={ec} fontWeight="900" opacity={clamp(b * 0.7)}>?</SvgText>
      {/* خطوط دقيقة */}
      <Line x1={195} y1={140} x2={195} y2={800} stroke={ec} strokeWidth={1} opacity={clamp(b * 0.5)}/>
      <Line x1={0}   y1={422} x2={390} y2={422} stroke={ec} strokeWidth={1} opacity={clamp(b * 0.4)}/>
    </EngrWrap>
  );
}

// ════════════════════════════════════════════════════════════
//  2. RANK FRIENDS — كأس + نجوم + منصة تتويج
// ════════════════════════════════════════════════════════════
export function RankFriendsEngraving({theme }) {
  if (!ENGRAVINGS_ENABLED) return null;
  if (theme?.isCityTheme) return null;
  const ec = getEngraveColor(theme);
  const b  = theme.isLight ? 0.12 : 0.09;

  return (
    <EngrWrap>
      {/* جسم الكأس */}
      <Path
        d="M130,45 L140,105 L160,78 L195,118 L230,78 L250,105 L260,45 L250,138 L130,138Z"
        fill={ec} opacity={clamp(b * 2.2)}
      />
      <Circle cx={195} cy={28} r={14} fill={ec} opacity={clamp(b * 2.2)}/>
      {/* مقابض */}
      <Path d="M130,60 Q90,75 96,112 Q100,138 130,138"  stroke={ec} strokeWidth={5} fill="none" opacity={clamp(b * 1.6)}/>
      <Path d="M260,60 Q300,75 294,112 Q290,138 260,138" stroke={ec} strokeWidth={5} fill="none" opacity={clamp(b * 1.6)}/>
      {/* عمود وقاعدة */}
      <Rect x={188} y={138} width={14} height={35} rx={3} fill={ec} opacity={clamp(b * 1.8)}/>
      <Rect x={165} y={173} width={60} height={12} rx={4} fill={ec} opacity={clamp(b * 1.8)}/>
      {/* نجوم */}
      <Polygon points="50,215 53,228 67,228 56,237 60,250 50,242 40,250 44,237 33,228 47,228" fill={ec} opacity={clamp(b * 1.8)}/>
      <Polygon points="195,320 198,332 212,332 201,341 205,353 195,345 185,353 189,341 178,332 192,332" fill={ec} opacity={clamp(b * 1.5)}/>
      <Polygon points="335,195 337,203 347,203 339,209 342,217 335,212 328,217 331,209 323,203 333,203" fill={ec} opacity={clamp(b * 1.2)}/>
      {/* منصة التتويج */}
      <Rect x={100} y={720} width={55}  height={95}  rx={4} fill={ec} opacity={clamp(b * 1.6)}/>
      <Rect x={165} y={690} width={55}  height={125} rx={4} fill={ec} opacity={clamp(b * 1.9)}/>
      <Rect x={235} y={738} width={55}  height={77}  rx={4} fill={ec} opacity={clamp(b * 1.4)}/>
      {/* أرقام المنصة */}
      <SvgText x={122} y={716} fontSize={22} fill={ec} fontWeight="900" opacity={clamp(b * 2.5)}>2</SvgText>
      <SvgText x={185} y={686} fontSize={24} fill={ec} fontWeight="900" opacity={clamp(b * 2.5)}>1</SvgText>
      <SvgText x={252} y={734} fontSize={20} fill={ec} fontWeight="900" opacity={clamp(b * 2.2)}>3</SvgText>
    </EngrWrap>
  );
}

// ════════════════════════════════════════════════════════════
//  3. ACT IT OUT — أقنعة مسرح + حزم ضوء
// ════════════════════════════════════════════════════════════
export function ActItOutEngraving({theme }) {
  if (!ENGRAVINGS_ENABLED) return null;
  const ec  = getEngraveColor(theme);
  const ebg = getEngraveBg(theme);
  const b   = theme.isLight ? 0.11 : 0.08;
  const eye = clamp(b * 0.5);   // عيون الأقنعة — داكنة بشكل مستقل

  return (
    <EngrWrap>
      {/* حزم ضوء */}
      <Path d="M62,0 L5,844 L138,844Z"   fill={ec} opacity={clamp(b * 0.8)}/>
      <Path d="M195,0 L128,844 L262,844Z" fill={ec} opacity={clamp(b * 1.0)}/>
      <Path d="M328,0 L255,844 L390,844Z" fill={ec} opacity={clamp(b * 0.7)}/>
      {/* ستائر مسرح */}
      <Path d="M0,0 Q50,75 25,150 Q12,225 38,300"    stroke={ec} strokeWidth={3} fill="none" opacity={clamp(b * 1.6)}/>
      <Path d="M390,0 Q340,75 365,150 Q378,225 352,300" stroke={ec} strokeWidth={3} fill="none" opacity={clamp(b * 1.6)}/>

      {/* قناع الكوميديا (سعيد) */}
      <Ellipse cx={120} cy={530} rx={42} ry={48} fill={ec}  opacity={clamp(b * 1.9)}/>
      <Ellipse cx={120} cy={530} rx={34} ry={40} fill={ebg} opacity={0.90}/>
      <Circle  cx={107} cy={518} r={6}   fill={ec} opacity={eye}/>
      <Circle  cx={133} cy={518} r={6}   fill={ec} opacity={eye}/>
      <Path d="M107,540 Q120,558 133,540" stroke={ec} strokeWidth={4} fill="none" opacity={eye}/>

      {/* قناع المأساة (حزين) */}
      <Ellipse cx={272} cy={595} rx={38} ry={44} fill={ec}  opacity={clamp(b * 1.5)}/>
      <Ellipse cx={272} cy={595} rx={30} ry={36} fill={ebg} opacity={0.90}/>
      <Circle  cx={260} cy={584} r={5}   fill={ec} opacity={eye}/>
      <Circle  cx={284} cy={584} r={5}   fill={ec} opacity={eye}/>
      <Path d="M260,610 Q272,598 284,610" stroke={ec} strokeWidth={3.5} fill="none" opacity={eye}/>
    </EngrWrap>
  );
}

// ════════════════════════════════════════════════════════════
//  4. WHO AM I — ظل شخصية + بطاقة اسم + ?
// ════════════════════════════════════════════════════════════
export function WhoAmIEngraving({theme }) {
  if (!ENGRAVINGS_ENABLED) return null;
  if (theme?.isCityTheme) return null;
  const ec = getEngraveColor(theme);
  const b  = theme.isLight ? 0.11 : 0.08;

  return (
    <EngrWrap>
      {/* علامة ? ضخمة — x رقم وليس % */}
      <SvgText x={195} y={500} fontSize={380} fill={ec} fontWeight="900"
        opacity={clamp(b * 0.8)} textAnchor="middle">?</SvgText>
      {/* علامات صغيرة */}
      <SvgText x={20}  y={155} fontSize={58} fill={ec} fontWeight="800" opacity={clamp(b * 1.6)}>?</SvgText>
      <SvgText x={315} y={268} fontSize={46} fill={ec} fontWeight="800" opacity={clamp(b * 1.3)}>?</SvgText>
      <SvgText x={50}  y={700} fontSize={36} fill={ec} fontWeight="800" opacity={clamp(b * 0.9)}>?</SvgText>
      <SvgText x={338} y={600} fontSize={30} fill={ec} fontWeight="800" opacity={clamp(b * 0.7)}>?</SvgText>
      {/* ظل رأس وكتفين */}
      <Circle cx={195} cy={275} r={48} fill={ec} opacity={clamp(b * 1.4)}/>
      <Path
        d="M118,388 C118,338 150,320 195,320 C240,320 272,338 272,388 L272,415 L118,415Z"
        fill={ec} opacity={clamp(b * 1.2)}
      />
      {/* بطاقة اسم */}
      <Rect x={100} y={488} width={190} height={125} rx={12}
        fill="none" stroke={ec} strokeWidth={2.5} opacity={clamp(b * 1.8)}/>
      <Line x1={100} y1={522} x2={290} y2={522} stroke={ec} strokeWidth={1.5} opacity={clamp(b * 1.2)}/>
      <SvgText x={195} y={560} fontSize={22} fill={ec} textAnchor="middle" opacity={clamp(b * 1.1)}>
        {"● ● ●"}
      </SvgText>
    </EngrWrap>
  );
}

// ════════════════════════════════════════════════════════════
//  5. NEVER HAVE I EVER — قمر + نجوم + يد مرفوعة
// ════════════════════════════════════════════════════════════
export function NeverHaveIEverEngraving({theme }) {
  if (!ENGRAVINGS_ENABLED) return null;
  const ec  = getEngraveColor(theme);
  const ebg = getEngraveBg(theme);
  const b   = theme.isLight ? 0.11 : 0.08;

  return (
    <EngrWrap>
      {/* القمر الهلالي */}
      <Circle cx={318} cy={108} r={58}  fill={ec}  opacity={clamp(b * 1.9)}/>
      <Circle cx={338} cy={92}  r={48}  fill={ebg} opacity={0.93}/>
      {/* نجوم */}
      <Circle cx={38}  cy={50}  r={5}   fill={ec}  opacity={clamp(b * 2.2)}/>
      <Circle cx={118} cy={26}  r={6.5} fill={ec}  opacity={clamp(b * 2.0)}/>
      <Circle cx={212} cy={66}  r={4}   fill={ec}  opacity={clamp(b * 1.8)}/>
      <Circle cx={68}  cy={138} r={3.5} fill={ec}  opacity={clamp(b * 1.5)}/>
      <Circle cx={168} cy={108} r={3}   fill={ec}  opacity={clamp(b * 1.4)}/>
      <Circle cx={268} cy={38}  r={4.5} fill={ec}  opacity={clamp(b * 1.7)}/>
      <Circle cx={368} cy={200} r={4}   fill={ec}  opacity={clamp(b * 1.3)}/>
      {/* نجمة بريق */}
      <Polygon
        points="92,238 96,255 114,255 100,265 106,282 92,272 78,282 84,265 70,255 88,255"
        fill={ec} opacity={clamp(b * 1.6)}
      />
      {/* أصابع اليد المرفوعة */}
      <Rect x={142} y={505} width={25}  height={88}  rx={12} fill={ec} opacity={clamp(b * 1.8)}/>
      <Rect x={172} y={490} width={22}  height={105} rx={11} fill={ec} opacity={clamp(b * 2.0)}/>
      <Rect x={200} y={496} width={22}  height={98}  rx={11} fill={ec} opacity={clamp(b * 1.8)}/>
      {/* راحة اليد */}
      <Rect x={142} y={593} width={80}  height={88}  rx={16} fill={ec} opacity={clamp(b * 1.5)}/>
      {/* موجة أفق */}
      <Path d="M0,798 Q98,782 195,798 Q292,814 390,798"  stroke={ec} strokeWidth={2}   fill="none" opacity={clamp(b * 1.0)}/>
      <Path d="M0,820 Q98,806 195,820 Q292,834 390,820"  stroke={ec} strokeWidth={1.2} fill="none" opacity={clamp(b * 0.6)}/>
    </EngrWrap>
  );
}

// ════════════════════════════════════════════════════════════
//  6. CODENAMES — شبكة تجسس + تقاطع + أقواس أركان
// ════════════════════════════════════════════════════════════
export function CodenamesEngraving({theme }) {
  if (!ENGRAVINGS_ENABLED) return null;
  if (theme?.isCityTheme) return null;
  const ec = getEngraveColor(theme);
  const b  = theme.isLight ? 0.10 : 0.07;

  return (
    <EngrWrap>
      {/* شبكة */}
      <G stroke={ec} strokeWidth={1} opacity={clamp(b * 1.4)}>
        <Line x1={0}   y1={168} x2={390} y2={168}/>
        <Line x1={0}   y1={338} x2={390} y2={338}/>
        <Line x1={0}   y1={506} x2={390} y2={506}/>
        <Line x1={0}   y1={674} x2={390} y2={674}/>
        <Line x1={78}  y1={0}   x2={78}  y2={844}/>
        <Line x1={156} y1={0}   x2={156} y2={844}/>
        <Line x1={234} y1={0}   x2={234} y2={844}/>
        <Line x1={312} y1={0}   x2={312} y2={844}/>
      </G>
      {/* دوائر التقاطع */}
      <Circle cx={195} cy={422} r={104} fill="none" stroke={ec} strokeWidth={3}   opacity={clamp(b * 2.0)}/>
      <Circle cx={195} cy={422} r={58}  fill="none" stroke={ec} strokeWidth={1.8} opacity={clamp(b * 1.5)}/>
      <Circle cx={195} cy={422} r={16}  fill="none" stroke={ec} strokeWidth={2.5} opacity={clamp(b * 1.8)}/>
      <Circle cx={195} cy={422} r={5}   fill={ec}               opacity={clamp(b * 3.0)}/>
      {/* أذرع التقاطع */}
      <Line x1={55}  y1={422} x2={155} y2={422} stroke={ec} strokeWidth={3} opacity={clamp(b * 1.8)}/>
      <Line x1={235} y1={422} x2={335} y2={422} stroke={ec} strokeWidth={3} opacity={clamp(b * 1.8)}/>
      <Line x1={195} y1={280} x2={195} y2={380} stroke={ec} strokeWidth={3} opacity={clamp(b * 1.8)}/>
      <Line x1={195} y1={462} x2={195} y2={562} stroke={ec} strokeWidth={3} opacity={clamp(b * 1.8)}/>
      {/* أقواس أركان — كل قوس مسار منفصل */}
      <Path d="M24,24 L24,58"  stroke={ec} strokeWidth={3} fill="none" opacity={clamp(b * 1.6)}/>
      <Path d="M24,24 L58,24"  stroke={ec} strokeWidth={3} fill="none" opacity={clamp(b * 1.6)}/>
      <Path d="M366,24 L366,58"  stroke={ec} strokeWidth={3} fill="none" opacity={clamp(b * 1.6)}/>
      <Path d="M366,24 L332,24"  stroke={ec} strokeWidth={3} fill="none" opacity={clamp(b * 1.6)}/>
      <Path d="M24,820 L24,786"  stroke={ec} strokeWidth={3} fill="none" opacity={clamp(b * 1.6)}/>
      <Path d="M24,820 L58,820"  stroke={ec} strokeWidth={3} fill="none" opacity={clamp(b * 1.6)}/>
      <Path d="M366,820 L366,786"  stroke={ec} strokeWidth={3} fill="none" opacity={clamp(b * 1.6)}/>
      <Path d="M366,820 L332,820"  stroke={ec} strokeWidth={3} fill="none" opacity={
  const { theme } = useTheme();clamp(b * 1.6)}/>
    </EngrWrap>
  );
}

// ════════════════════════════════════════════════════════════
//  7. XO — عروق رخام + لوحة XO + تاج
// ════════════════════════════════════════════════════════════
export function XOEngraving({ theme }) {
  if (!ENGRAVINGS_ENABLED) return null;
  if (theme?.isCityTheme) return null;
  const ec = getEngraveColor(theme);
  const b  = theme.isLight ? 0.20 : 0.15;

  return (
    <EngrWrap>
      {/* عروق رخام */}
      <Path d="M-10,168 Q98,145 195,178 Q292,210 400,182" stroke={ec} strokeWidth={6.5} fill="none" opacity={clamp(b * 1.8)}/>
      <Path d="M-10,168 Q98,145 195,178 Q292,210 400,182" stroke={ec} strokeWidth={13}  fill="none" opacity={clamp(b * 0.6)}/>
      <Path d="M-10,455 Q75,440 158,472 Q268,506 400,480" stroke={ec} strokeWidth={4.5} fill="none" opacity={clamp(b * 1.4)}/>
      <Path d="M48,0 Q85,148 68,295 Q54,440 78,640 Q92,740 74,844"  stroke={ec} strokeWidth={2} fill="none" opacity={clamp(b * 0.5)}/>
      <Path d="M314,0 Q285,195 298,380 Q312,545 292,844"            stroke={ec} strokeWidth={2} fill="none" opacity={clamp(b * 0.4)}/>
      <Path d="M-10,636 Q110,618 195,648 Q288,678 400,660"          stroke={ec} strokeWidth={3} fill="none" opacity={clamp(b * 0.9)}/>
      {/* شبكة لوحة XO */}
      <Line x1={136} y1={265} x2={136} y2={560} stroke={ec} strokeWidth={3.5} opacity={clamp(b * 1.6)}/>
      <Line x1={254} y1={265} x2={254} y2={560} stroke={ec} strokeWidth={3.5} opacity={clamp(b * 1.6)}/>
      <Line x1={34}  y1={363} x2={356} y2={363} stroke={ec} strokeWidth={3.5} opacity={clamp(b * 1.6)}/>
      <Line x1={34}  y1={462} x2={356} y2={462} stroke={ec} strokeWidth={3.5} opacity={clamp(b * 1.6)}/>
      {/* X علوي-أيسر */}
      <Line x1={158} y1={278} x2={222} y2={345} stroke={ec} strokeWidth={5} opacity={clamp(b * 1.4)}/>
      <Line x1={222} y1={278} x2={158} y2={345} stroke={ec} strokeWidth={5} opacity={clamp(b * 1.4)}/>
      {/* X سفلي-أيمن */}
      <Line x1={275} y1={470} x2={338} y2={548} stroke={ec} strokeWidth={5} opacity={clamp(b * 1.4)}/>
      <Line x1={338} y1={470} x2={275} y2={548} stroke={ec} strokeWidth={5} opacity={clamp(b * 1.4)}/>
      {/* O وسط */}
      <Circle cx={195} cy={412} r={34} fill="none" stroke={ec} strokeWidth={5}   opacity={clamp(b * 1.5)}/>
      {/* O سفلي-أيسر */}
      <Circle cx={82}  cy={510} r={30} fill="none" stroke={ec} strokeWidth={4.5} opacity={clamp(b * 1.4)}/>
      {/* تاج */}
      <Path
        d="M140,74 L154,108 L175,94 L195,125 L215,94 L236,108 L250,74 L240,142 L150,142Z"
        fill={
  const { theme } = useTheme();ec} opacity={clamp(b * 1.5)}
      />
    </EngrWrap>
  );
}

// ════════════════════════════════════════════════════════════
//  8. WORDLE — سداسي + شقوق مشعة + مربعات حروف
// ════════════════════════════════════════════════════════════
export function WordleEngraving({ theme }) {
  if (!ENGRAVINGS_ENABLED) return null;
  const ec  = getEngraveColor(theme);
  const b   = theme.isLight ? 0.18 : 0.13;

  const HX = 195, HY = 290, HR = 95;
  const verts = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 180) * (60 * i - 30);
    return { x: HX + HR * Math.cos(a), y: HY + HR * Math.sin(a) };
  });
  const hexPoints = verts.map(v => `${v.x.toFixed(1)},${v.y.toFixed(1)}`).join(' ');

  const farPts  = [
    { x: 55,  y: 88  }, { x: 340, y: 78  }, { x: 392, y: 264 },
    { x: 310, y: 500 }, { x: 88,  y: 500 }, { x: 0,   y: 264 },
  ];
  const farPts2 = [
    { x: 20,  y: 30  }, { x: 368, y: 20  }, { x: 392, y: 128 },
    { x: 392, y: 396 }, { x: 30,  y: 630 }, { x: 24,  y: 100 },
  ];

  const tileStates = [
    ['ok','mis','no','no','no'],
    ['ok','ok', 'mis','no','no'],
    ['_', '_',  '_',  '_', '_'],
  ];
  const stateBg = { ok: '#00825a', mis: '#8c6400' };
  const TW = 52, TH = 52, TG = 8;
  const TX0 = (390 - (5 * TW + 4 * TG)) / 2;
  const TY0 = 530;

  return (
    <EngrWrap>
      {/* السداسي */}
      <Polygon
        points={hexPoints}
        fill={ec}
        opacity={clamp(b * 0.6)}
        stroke={ec}
        strokeWidth={3}
      />
      <Circle cx={HX} cy={HY} r={10} fill={ec} opacity={clamp(b * 2.8)}/>
      <Circle cx={HX} cy={HY} r={22} fill="none" stroke={ec} strokeWidth={2} opacity={clamp(b * 1.5)}/>

      {/* شقوق مشعة */}
      {verts.map((v, i) => (
        <G key={`crack-${i}`}>
          <Line
            x1={v.x} y1={v.y}
            x2={farPts[i].x} y2={farPts[i].y}
            stroke={ec} strokeWidth={2.2} opacity={clamp(b * 1.6)}
          />
          <Line
            x1={farPts[i].x}  y1={farPts[i].y}
            x2={farPts2[i].x} y2={farPts2[i].y}
            stroke={ec} strokeWidth={1.4} opacity={clamp(b * 1.0)}
          />
          <Circle cx={v.x} cy={v.y} r={5} fill={ec} opacity={clamp(b * 2.5)}/>
        </G>
      ))}

      {/* مربعات الحروف */}
      {tileStates.map((row, ri) =>
        row.map((state, ci) => {
          const tx = TX0 + ci * (TW + TG);
          const ty = TY0 + ri * (TH + TG);
          const bg = stateBg[state] || null;
          const bordOp = bg ? clamp(b * 2.5) : clamp(b * 1.6);
          return (
            <G key={`tile-${ri}-${ci}`}>
              {bg && (
                <Rect x={tx} y={ty} width={TW} height={TH} rx={6}
                  fill={bg} opacity={clamp(b * 3.0)}/>
              )}
              <Rect x={tx} y={ty} width={TW} height={TH} rx={6}
                fill="none" stroke={ec} strokeWidth={
  const { theme } = useTheme();2} opacity={bordOp}/>
            </G>
          );
        })
      )}
    </EngrWrap>
  );
}

// ════════════════════════════════════════════════════════════
//  9. MAN ANA — هالة + أشعة + ظل شخصية + بطاقة
// ════════════════════════════════════════════════════════════
export function ManAnaEngraving({ theme }) {
  if (!ENGRAVINGS_ENABLED) return null;
  if (theme?.isCityTheme) return null;
  const ec = getEngraveColor(theme);
  const b  = theme.isLight ? 0.11 : 0.08;

  const rays = Array.from({ length: 12 }, (_, i) => {
    const a = (Math.PI / 180) * (30 * i);
    return {
      x1: 195 + 85  * Math.cos(a),
      y1: 300 + 85  * Math.sin(a),
      x2: 195 + 155 * Math.cos(a),
      y2: 300 + 155 * Math.sin(a),
    };
  });

  return (
    <EngrWrap>
      {/* دوائر هالة */}
      <Circle cx={195} cy={300} r={160} fill="none" stroke={ec} strokeWidth={1.5} opacity={clamp(b * 1.2)}/>
      <Circle cx={195} cy={300} r={120} fill="none" stroke={ec} strokeWidth={1}   opacity={clamp(b * 0.9)}/>
      <Circle cx={195} cy={300} r={80}  fill="none" stroke={ec} strokeWidth={1}   opacity={clamp(b * 0.7)}/>
      {/* أشعة */}
      {rays.map((r, i) => (
        <Line key={`ray-${i}`}
          x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2}
          stroke={ec} strokeWidth={1.5} opacity={clamp(b * 1.0)}
        />
      ))}
      {/* ظل رأس */}
      <Circle cx={195} cy={230} r={44} fill={ec} opacity={clamp(b * 1.3)}/>
      {/* ظل كتفين */}
      <Path
        d="M118,355 C118,308 150,292 195,292 C240,292 272,308 272,355 L272,378 L118,378Z"
        fill={ec} opacity={clamp(b * 1.1)}
      />
      {/* بطاقة اسم */}
      <Rect x={105} y={468} width={180} height={115} rx={10}
        fill="none" stroke={ec} strokeWidth={2.5} opacity={clamp(b * 1.8)}/>
      <Line x1={105} y1={500} x2={285} y2={500} stroke={ec} strokeWidth={1.5} opacity={clamp(b * 1.2)}/>
      <SvgText x={195} y={540} fontSize={
  const { theme } = useTheme();20} fill={ec} textAnchor="middle" opacity={clamp(b * 1.1)}>
        {"● ● ●"}
      </SvgText>
    </EngrWrap>
  );
}

// ════════════════════════════════════════════════════════════
//  WHO IS LYING — عيون تراقب + علامات استفهام + خطوط تحقيق
// ════════════════════════════════════════════════════════════
export function WhoIsSpyEngraving({ theme }) {
  if (!ENGRAVINGS_ENABLED) return null;
  if (theme?.isCityTheme) return null;
  const ec = getEngraveColor(theme);
  const b  = theme.isLight ? 0.12 : 0.09;

  // أشعة من المركز (عين تحقيق)
  const rayCount = 16;
  const cx = 195, cy = 310;
  const rays = Array.from({ length: rayCount }, (_, i) => {
    const a = (Math.PI * 2 / rayCount) * i;
    return {
      x1: cx + 72  * Math.cos(a),
      y1: cy + 72  * Math.sin(a),
      x2: cx + 138 * Math.cos(a),
      y2: cy + 138 * Math.sin(a),
    };
  });

  return (
    <EngrWrap>
      {/* ── أشعة التحقيق ── */}
      {rays.map((r, i) => (
        <Line key={i}
          x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2}
          stroke={ec} strokeWidth={1.2} opacity={clamp(b * 0.9)}
        />
      ))}

      {/* ── العين الكبيرة في المنتصف ── */}
      {/* بياض العين */}
      <Ellipse cx={cx} cy={cy} rx={62} ry={36} fill={ec} opacity={clamp(b * 1.6)}/>
      {/* حدقة */}
      <Circle  cx={cx} cy={cy} r={22} fill={ec} opacity={clamp(b * 2.2)}/>
      {/* بؤبؤ */}
      <Circle  cx={cx} cy={cy} r={10} fill={ec} opacity={clamp(b * 3.0)}/>
      {/* لمعة */}
      <Circle  cx={cx + 8} cy={cy - 8} r={4} fill={ec} opacity={clamp(b * 1.0)}/>
      {/* دائرة هالة حول العين */}
      <Ellipse cx={cx} cy={cy} rx={80} ry={52}
        fill="none" stroke={ec} strokeWidth={2} opacity={clamp(b * 1.4)}/>

      {/* ── علامات استفهام متناثرة ── */}
      {/* يسار أعلى */}
      <SvgText x={44}  y={148} fontSize={52} fill={ec} textAnchor="middle" opacity={clamp(b * 1.6)}>{"?"}</SvgText>
      {/* يمين أعلى */}
      <SvgText x={346} y={172} fontSize={40} fill={ec} textAnchor="middle" opacity={clamp(b * 1.3)}>{"?"}</SvgText>
      {/* يسار وسط */}
      <SvgText x={28}  y={440} fontSize={34} fill={ec} textAnchor="middle" opacity={clamp(b * 1.1)}>{"?"}</SvgText>
      {/* يمين وسط */}
      <SvgText x={362} y={420} fontSize={44} fill={ec} textAnchor="middle" opacity={clamp(b * 1.2)}>{"?"}</SvgText>
      {/* أسفل يسار */}
      <SvgText x={58}  y={680} fontSize={28} fill={ec} textAnchor="middle" opacity={clamp(b * 0.9)}>{"?"}</SvgText>
      {/* أسفل يمين */}
      <SvgText x={332} y={700} fontSize={36} fill={ec} textAnchor="middle" opacity={clamp(b * 1.0)}>{"?"}</SvgText>

      {/* ── خطوط تحقيق أفقية (كسطور تقرير) ── */}
      <Line x1={32}  y1={568} x2={168} y2={568} stroke={ec} strokeWidth={2.5} opacity={clamp(b * 1.4)}/>
      <Line x1={32}  y1={590} x2={140} y2={590} stroke={ec} strokeWidth={1.5} opacity={clamp(b * 0.9)}/>
      <Line x1={32}  y1={610} x2={158} y2={610} stroke={ec} strokeWidth={1.5} opacity={clamp(b * 0.8)}/>
      <Line x1={222} y1={568} x2={358} y2={568} stroke={ec} strokeWidth={2.5} opacity={clamp(b * 1.4)}/>
      <Line x1={250} y1={590} x2={358} y2={590} stroke={ec} strokeWidth={1.5} opacity={clamp(b * 0.9)}/>
      <Line x1={232} y1={610} x2={348} y2={610} stroke={ec} strokeWidth={1.5} opacity={clamp(b * 0.8)}/>

      {/* ── نقطة هدف (تقاطع) أعلى اليسار ── */}
      <Circle cx={68}  cy={220} r={22} fill="none" stroke={ec} strokeWidth={2}   opacity={clamp(b * 1.2)}/>
      <Circle cx={68}  cy={220} r={8}  fill="none" stroke={ec} strokeWidth={1.5} opacity={clamp(b * 1.0)}/>
      <Circle cx={68}  cy={220} r={2}  fill={ec}               opacity={clamp(b * 1.8)}/>
      <Line x1={44} y1={220} x2={56} y2={220} stroke={ec} strokeWidth={1.5} opacity={clamp(b * 1.0)}/>
      <Line x1={80} y1={220} x2={92} y2={220} stroke={ec} strokeWidth={1.5} opacity={clamp(b * 1.0)}/>
      <Line x1={68} y1={196} x2={68} y2={208} stroke={ec} strokeWidth={1.5} opacity={clamp(b * 1.0)}/>
      <Line x1={68} y1={232} x2={68} y2={244} stroke={ec} strokeWidth={1.5} opacity={clamp(b * 1.0)}/>

      {/* ── نقطة هدف أسفل اليمين ── */}
      <Circle cx={322} cy={730} r={26} fill="none" stroke={ec} strokeWidth={2}   opacity={clamp(b * 1.1)}/>
      <Circle cx={322} cy={730} r={10} fill="none" stroke={ec} strokeWidth={1.5} opacity={clamp(b * 0.9)}/>
      <Circle cx={322} cy={730} r={3}  fill={ec}               opacity={clamp(b * 1.6)}/>
      <Line x1={293} y1={730} x2={308} y2={730} stroke={ec} strokeWidth={1.5} opacity={clamp(b * 0.9)}/>
      <Line x1={336} y1={730} x2={351} y2={730} stroke={ec} strokeWidth={1.5} opacity={clamp(b * 0.9)}/>
      <Line x1={322} y1={700} x2={322} y2={715} stroke={ec} strokeWidth={1.5} opacity={clamp(b * 0.9)}/>
      <Line x1={322} y1={745} x2={322} y2={760} stroke={ec} strokeWidth={1.5} opacity={clamp(b * 0.9)}/>

      {/* ── موجة قاع ── */}
      <Path d="M0,800 Q98,786 195,800 Q292,814 390,800"
        stroke={ec} strokeWidth={1.8} fill="none" opacity={clamp(b * 0.8)}/>
      <Path d="M0,820 Q98,808 195,820 Q292,832 390,820"
        stroke={ec} strokeWidth={1}   fill="none" opacity={clamp(b * 0.5)}/>
    </EngrWrap>
  );
}

// ════════════════════════════════════════════════════════════
//  CityBackground — خلفية ثيم المدينة لشاشات الألعاب
//
//  الاستخدام:
//    <CityBackground theme={theme}>
//      {/* محتوى الشاشة */}
//    </CityBackground>
//
//  السلوك:
//   - isCityTheme → LinearGradient سماء + صورة Skyline + نجوم
//   - غير ذلك    → View عادي بـ theme.bg (الـ Engraving يُعرض بالخارج)
// ════════════════════════════════════════════════════════════

const CITY_STARS_CACHE_GB = {};
function getCityStarsGB(themeId, count) {
  if (!CITY_STARS_CACHE_GB[themeId]) {
  const { theme } = useTheme();
    CITY_STARS_CACHE_GB[themeId] = [...Array(count)].map((_, i) => ({
      key:     i,
      top:     `${(i * 43 + 7)  % 65}%`,
      left:    `${(i * 67 + 13) % 96}%`,
      size:    i % 5 === 0 ? 2.5 : i % 3 === 0 ? 1.8 : 1.2,
      opacity: 0.25 + (i % 4) * 0.15,
    }));
  }
  return CITY_STARS_CACHE_GB[themeId];
}

export function CityBackground({ theme, children, style }) {
  // ── Mist: gradient من mistGradient ──────────────────────────
  if (theme?.isMist) {
    const colors = theme.mistGradient || [theme.bg, theme.bg];
    return (
      <LinearGradient
        colors={colors}
        style={[{ flex: 1 }, style]}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
      >
        {/* orb accent خفيف في الزاوية */}
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <View style={{
            position: 'absolute', top: -80, right: -80,
            width: 280, height: 280, borderRadius: 140,
            backgroundColor: theme.accent,
            opacity: 0.07,
          }} />
          <View style={{
            position: 'absolute', bottom: -60, left: -60,
            width: 220, height: 220, borderRadius: 110,
            backgroundColor: theme.accent,
            opacity: 0.05,
          }} />
        </View>
        {children}
      </LinearGradient>
    );
  }

  // ── Crystal: gradient داكن + orbs ملوّنة ───────────────────
  if (theme?.isCrystal) {
    const [orb1, orb2, orb3] = theme.orbColors || [theme.bg, theme.bg, theme.bg];
    return (
      <View style={[{ flex: 1, backgroundColor: theme.bg }, style]}>
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {/* orb كبير أعلى يمين */}
          <View style={{
            position: 'absolute', top: -100, right: -100,
            width: 340, height: 340, borderRadius: 170,
            backgroundColor: orb1,
            opacity: 0.28,
          }} />
          {/* orb وسط يسار */}
          <View style={{
            position: 'absolute', top: '35%', left: -80,
            width: 240, height: 240, borderRadius: 120,
            backgroundColor: orb3,
            opacity: 0.18,
          }} />
          {/* orb أسفل يمين */}
          <View style={{
            position: 'absolute', bottom: -80, right: -60,
            width: 260, height: 260, borderRadius: 130,
            backgroundColor: orb2,
            opacity: 0.20,
          }} />
        </View>
        {children}
      </View>
    );
  }

  // ── Standard (Dark/Light): لون صلب ─────────────────────────
  if (!theme?.isCityTheme) {
    return (
      <View style={[{ flex: 1, backgroundColor: theme?.bg || '#07071f' }, style]}>
        {children}
      </View>
    );
  }

  // نجوم المدينة
  const stars = theme.starCount ? getCityStarsGB(theme.id, theme.starCount) : [];

  return (
    <LinearGradient
      colors={theme.skyGradient}
      style={[{ flex: 1 }, style]}
      start={{ x: 0.5, y: 1 }}
      end={{ x: 0.5, y: 0 }}
    >
      {/* نجوم */}
      {stars.length > 0 && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {stars.map(s => (
            <View key={s.key} style={{
              position: 'absolute',
              top: s.top, left: s.left,
              width: s.size, height: s.size,
              borderRadius: 99,
              opacity: s.opacity,
              backgroundColor: theme.accent + 'dd',
            }} />
          ))}
        </View>
      )}

      {/* المحتوى */}
      {children}

      {/* Skyline في الأسفل */}
      <View style={gb.skylineWrap} pointerEvents="none">
        <ImageBackground
          source={theme.skylineAsset}
          style={gb.skylineImg}
          resizeMode="cover"
          imageStyle={{ objectPosition: 'bottom' }}
        />
        <LinearGradient
          colors={[theme.skyBottom, theme.skyBottom + '00']}
          style={gb.skylineFade}
          start={{ x: 0, y: 1 }}
          end={{ x: 0, y: 0 }}
        />
      </View>
    </LinearGradient>
  );
}

const gb = StyleSheet.create({
  skylineWrap:  { position: 'absolute', bottom: 0, left: 0, right: 0, height: 190, zIndex: 5 },
  skylineImg:   { width: '100%', height: '100%' },
  skylineFade:  { position: 'absolute', bottom: 0, left: 0, right: 0, height: 65 },
});

// ════════════════════════════════════════════════════════════
//  Styles
// ════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    overflow: 'hidden',
  },
});
