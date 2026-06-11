/**
 * WebRoomService.js
 * ═══════════════════════════════════════════════════════
 * نظام عرض اللعبة على شاشة كبيرة عبر playarnex.com
 *
 * الكود: W + 6 عناصر عشوائية  →  مثال: W·K7MX3P
 * الهاتف يتحكم — الموقع يعرض فقط (شاشة كبيرة)
 *
 * يحتوي:
 *  ✅ WebScreenButton  — زر 🌐 (شاشة كبيرة)
 *  ✅ GameInfoButton   — زر ⓘ (شرح كيف اللعب والفوز)
 * ═══════════════════════════════════════════════════════
 */

import { ref, set, update, remove, onDisconnect } from 'firebase/database';
import { rtdb } from './firebaseConfig';
import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import {
  TouchableOpacity, Text, View, Modal, ScrollView,
  StyleSheet, Pressable, Platform,
} from 'react-native';

// ══════════════════════════════════════════════════════════
// توليد الكود:  W  +  6 عناصر عشوائية
// ══════════════════════════════════════════════════════════
function genWebCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 6; i++) suffix += chars[Math.floor(Math.random() * chars.length)];
  return 'W' + suffix; // دائماً يبدأ بـ W
}

// ── أنواع الألعاب ───────────────────────────────────────
export const GAME_TYPES = {
  CLASSIC:       'classic',
  SOLO:          'solo',
  ONLINE_TRIVIA: 'online_trivia',
  MAN_ANA:       'man_ana',
  ACT_IT_OUT:    'act_it_out',
  TRUTH_DARE:    'truth_dare',
  NEVER_HAVE:    'never_have',
  XO:            'xo',
  BULLSHIT:      'bullshit',
  CODENAMES:     'codenames',
  MAFIA:         'mafia',
  DRAW_GUESS:    'draw_guess',
  DOMINO:        'domino',
  KOUT:          'kout',
  BILOOT:        'biloot',
  RANK_FRIENDS:  'rank_friends',
  WORDLE:        'wordle',
  WHO_LYING:     'who_spy',
};

export const GAME_INFO = {
  classic:       { name: 'ميدان المعلومات', emoji: '🧠' },
  solo:          { name: 'الوضع الفردي',     emoji: '🎯' },
  online_trivia: { name: 'أونلاين',          emoji: '📡' },
  man_ana:       { name: 'من أنا؟',          emoji: '🤔' },
  act_it_out:    { name: 'مثّل وخمّن',       emoji: '🎬' },
  truth_dare:    { name: 'حقيقة أو تحدي',   emoji: '🍀' },
  never_have:    { name: 'ما فعلتها أبداً', emoji: '🙅' },
  xo:            { name: 'إكس أو',           emoji: '✕○' },
  bullshit:      { name: 'بولشيت',           emoji: '😂' },
  codenames:     { name: 'كودنيمز',          emoji: '🔍' },
  mafia:         { name: 'المافيا',           emoji: '🎭' },
  draw_guess:    { name: 'ارسم وخمّن',       emoji: '🖊️' },
  domino:        { name: 'دومينو',            emoji: '🁣'  },
  kout:          { name: 'كوت بو 6',         emoji: '🎴' },
  biloot:        { name: 'بيلوت',            emoji: '🃏' },
  rank_friends:  { name: 'رتّب أصدقاءك',    emoji: '🏆' },
  wordle:        { name: 'وردل',             emoji: '🔡' },
  who_spy:     { name: 'من الجاسوس؟',       emoji: '🕵️' },
};

// ══════════════════════════════════════════════════════════
// دليل شرح اللعبة لكل gameType — كيف تلعب + كيف تفوز
// ══════════════════════════════════════════════════════════
export const GAME_HOW_TO = {
  classic: {
    ar: {
      how: 'فريقان يتنافسان. تختار كل جولة سؤالاً من فئة وصعوبة معينة. الفريق يناقش ويختار الإجابة الصحيحة من 4 خيارات.',
      win: 'الفريق الذي يجمع أعلى نقاط بنهاية كل الأسئلة يفوز. كل إجابة صحيحة تعطي نقاطاً حسب صعوبتها.',
    },
    en: {
      how: 'Two teams compete. Each round, pick a question by category and difficulty. The team discusses and chooses from 4 options.',
      win: 'Team with the highest points after all questions wins. Each correct answer scores points based on difficulty.',
    },
  },
  solo: {
    ar: {
      how: 'تجاوب على أسئلة متتالية بمفردك. عندك مؤقت لكل سؤال ووسائل مساعدة (تلميح، تجميد، إلغاء، تبديل).',
      win: 'كلما جاوبت أكثر بنقاطك ترتفع. حقّق أعلى نتيجة لتدخل لوحة المتصدرين وتفوز في البطولة الأسبوعية!',
    },
    en: {
      how: 'Answer consecutive questions solo. You have a timer for each and lifelines (hint, freeze, eliminate, swap).',
      win: 'The more you answer, the higher your score. Get the top result to enter the leaderboard and win the weekly tournament!',
    },
  },
  online_trivia: {
    ar: {
      how: 'تتنافس مع لاعب آخر أونلاين على نفس الأسئلة في الوقت نفسه. السرعة والدقة كلاهما مهم.',
      win: 'اللاعب الذي يجمع نقاطاً أكثر بنهاية كل الأسئلة يفوز ويأخذ مكافأة!',
    },
    en: {
      how: 'Compete against another player online on the same questions simultaneously. Both speed and accuracy matter.',
      win: 'The player with the most points at the end wins and gets a reward!',
    },
  },
  man_ana: {
    ar: {
      how: 'ارفع الهاتف على جبهتك حتى لا ترى الشخصية. الآخرون يعطونك تلميحات وأنت تسأل لتخمينها قبل انتهاء الوقت.',
      win: 'تُحسب نقطة لكل شخصية تخمّنها صح. اللاعب الحاصل على أعلى نقاط في النهاية يفوز!',
    },
    en: {
      how: 'Hold the phone on your forehead so you can\'t see the character. Others give clues while you ask questions to guess before time runs out.',
      win: 'Score one point per correct guess. Player with the most points at the end wins!',
    },
  },
  act_it_out: {
    ar: {
      how: 'فريقان يتناوبان. لاعب من الفريق يمثّل كلمة أو مشهد بدون كلام، وفريقه يحاول تخمينها قبل انتهاء الوقت.',
      win: 'الفريق الحاصل على أعلى نقاط من الكلمات المخمّنة الصحيحة يفوز في النهاية.',
    },
    en: {
      how: 'Two teams alternate. A player acts out a word or scene without speaking, and their team tries to guess before time runs out.',
      win: 'The team with the most correct guesses at the end wins.',
    },
  },
  truth_dare: {
    ar: {
      how: 'تُدار العجلة لتختار لاعباً عشوائياً. اللاعب المختار يختار "صراحة" (يجاوب سؤالاً صادقاً) أو "تحدي" (يُنفّذ مهمة جريئة).',
      win: 'لعبة اجتماعية بدون فائز محدد — المتعة هي الهدف! اللاعب الذي يرفض يخسر نقطة.',
    },
    en: {
      how: 'Spin the wheel to pick a random player. They choose "Truth" (answer honestly) or "Dare" (complete a bold challenge).',
      win: 'A social game with no single winner — fun is the goal! Players who refuse lose a point.',
    },
  },
  never_have: {
    ar: {
      how: 'تُقرأ جملة مثل "ما سويت... قفز من الشجرة". من سبق وفعلها يخسر إصبعاً. كل لاعب يبدأ بـ 5 أصابع.',
      win: 'أول لاعب يخسر جميع أصابعه الخمسة يخسر اللعبة. آخر من يبقى له أصابع يفوز!',
    },
    en: {
      how: 'A statement like "Never have I ever jumped from a tree" is read. Anyone who has done it loses a finger. Everyone starts with 5 fingers.',
      win: 'First player to lose all five fingers loses. Last one with fingers remaining wins!',
    },
  },
  xo: {
    ar: {
      how: 'بالتناوب ضع رمزك (X أو O) في خانة فارغة على شبكة 3×3. يمكنك اللعب ضد الذكاء الاصطناعي أو ضد صديق.',
      win: 'أول من يكمل ثلاثة رموز متتالية أفقياً أو رأسياً أو قطرياً يفوز!',
    },
    en: {
      how: 'Take turns placing your mark (X or O) in an empty cell on a 3×3 grid. Play vs AI or a friend.',
      win: 'First to complete three in a row — horizontally, vertically, or diagonally — wins!',
    },
  },
  bullshit: {
    ar: {
      how: 'تُوزَّع الأوراق على الجميع. بالترتيب يضع كل لاعب أوراقاً على الكومة ويعلن رقمها — يمكنك الكذب! أي لاعب يشك يقول "بولشيت".',
      win: 'إذا كشفت الكذب: الجاسوس يأخذ الكومة كلها. إذا شككت بالغلط: أنت تأخذ الكومة. أول من يتخلص من كل أوراقه يفوز.',
    },
    en: {
      how: 'Cards are dealt to all. On your turn, place cards face-down and declare their rank — you can lie! Any player can call "Bullshit".',
      win: 'Catch a spy: they take the pile. Call wrongly: you take it. First to get rid of all cards wins!',
    },
  },
  codenames: {
    ar: {
      how: 'فريقان. قائد كل فريق يعطي كلمة تلميح واحدة ورقم (عدد الكلمات المقصودة). الفريق يخمّن الكلمات الصحيحة على اللوح.',
      win: 'أول فريق يكشف جميع عملائه يفوز. إذا لمستم العميل القاتل — تخسرون فوراً!',
    },
    en: {
      how: 'Two teams. Each spymaster gives a one-word clue and a number. Their team guesses the matching words on the board.',
      win: 'First team to reveal all their agents wins. Touch the Assassin card — instant loss!',
    },
  },
  mafia: {
    ar: {
      how: 'يأخذ كل لاعب دوراً سرياً (مافيا، محقق، دكتور، مواطن). في الليل تختار المافيا ضحيتها، في النهار يصوّت الجميع لإقصاء مشتبه به.',
      win: 'المواطنون يفوزون بكشف جميع أفراد المافيا. المافيا تفوز عندما تساوي أو تتجاوز عدد المواطنين.',
    },
    en: {
      how: 'Each player gets a secret role (Mafia, Detective, Doctor, Citizen). At night, Mafia picks a victim. By day, everyone votes to eliminate a suspect.',
      win: 'Citizens win by eliminating all Mafia. Mafia wins when they equal or outnumber the citizens.',
    },
  },
  draw_guess: {
    ar: {
      how: 'لاعب يرسم كلمة سرية بدون حروف أو أرقام والآخرون يتسابقون لتخمينها. كل جولة يتناوب الرسم.',
      win: 'الرسام يكسب نقاطاً إذا خمّن أحدهم الإجابة. المخمّن الأسرع يكسب أكثر. أعلى مجموع يفوز!',
    },
    en: {
      how: 'A player draws a secret word without letters or numbers. Others race to guess it. Drawing rotates each round.',
      win: 'The drawer earns points if someone guesses correctly. The faster guesser earns more. Highest total wins!',
    },
  },
  domino: {
    ar: {
      how: 'تُوزَّع قطع الدومينو. بالدور يضع كل لاعب قطعة تطابق أحد طرفي السلسلة. إذا لم تجد قطعة مناسبة اسحب من المكتبة.',
      win: 'أول من يتخلص من جميع قطعه يفوز! إن توقفت اللعبة، يفوز أقل الجميع نقاطاً.',
    },
    en: {
      how: 'Dominoes are distributed. Take turns placing a tile that matches one end of the chain. If you can\'t play, draw from the pile.',
      win: 'First to get rid of all tiles wins! If blocked, lowest remaining score wins.',
    },
  },
  kout: {
    ar: {
      how: 'لعبة ورق خليجية — فريقان من لاعبَين. الهدف أخذ أكبر عدد من الأوراق ذات القيمة. اللعب بالدور مع احترام الأتراك.',
      win: 'الفريق الذي يجمع 62 نقطة أو أكثر يفوز الجولة. من يصل لـ 152 نقطة أولاً يفوز اللعبة.',
    },
    en: {
      how: 'Gulf card game — two teams of two. Collect the highest value cards. Play in turns respecting trump suits.',
      win: 'Team with 62+ points wins the round. First to 152 points wins the game.',
    },
  },
  biloot: {
    ar: {
      how: 'البلوت الكلاسيكي — فريقان من لاعبَين. تُوزَّع الأوراق ويتم المزايدة على الحكم (الأتو). الفريق الفائز بالمزاد يجب أن يحقق عدده.',
      win: 'الفريق الذي يحقق عدده في المزاد يكسب النقاط. إن فشل يصبح "مسفولاً". أول من يصل 51 نقطة يفوز.',
    },
    en: {
      how: 'Classic Baloot — two teams of two. Cards are dealt and teams bid for the trump suit. The winning bidder must achieve their declared score.',
      win: 'The bidding team scores if they meet their bid, otherwise they go "underground". First to 51 points wins.',
    },
  },
  rank_friends: {
    ar: {
      how: 'يُطرح سؤال مثل "من الأكثر كذباً؟". كل لاعب يختار شخصاً سراً، ثم تُكشف الإجابات. اللاعب الذي يتطابق مع أغلب الآراء يكسب نقطة.',
      win: 'اللاعب الحاصل على أعلى نقاط في نهاية جميع الأسئلة يفوز!',
    },
    en: {
      how: 'A question like "Who lies most?" is asked. Each player secretly picks someone, then answers are revealed. Match the majority opinion to score.',
      win: 'Player with the most points after all questions wins!',
    },
  },
  wordle: {
    ar: {
      how: 'خمّن الكلمة السرية في 6 محاولات. بعد كل محاولة: 🟩 حرف صح في مكانه الصح، 🟨 حرف صح في مكان غلط، ⬛ حرف مو موجود.',
      win: 'تخمين الكلمة كاملة بالترتيب الصحيح قبل انتهاء المحاولات الست يعني الفوز!',
    },
    en: {
      how: 'Guess the secret word in 6 tries. After each: 🟩 correct letter right spot, 🟨 correct letter wrong spot, ⬛ letter not in word.',
      win: 'Guess the full word in the correct order before using all 6 attempts to win!',
    },
  },
  who_spy: {
    ar: {
      how: 'كل لاعب يرى كلمة مشتركة — إلا شخص واحد يرى كلمة قريبة مختلفة. بعد النقاش والتحقيق يصوّت الجميع على من يعتقدون أنه الجاسوس.',
      win: 'التصويت الصح على الجاسوس = نقطتان. الجاسوس لا يُكتشف = 3 نقاط. الجاسوس يخمّن الكلمة بعد الكشف = نقطة إضافية.',
    },
    en: {
      how: 'Everyone sees a shared word — except one spy who sees a similar but different word. After discussion and investigation, everyone votes on who they think is lying.',
      win: 'Correct vote = 2 pts. Spy not caught = 3 pts. Spy guesses the word correctly = +1 bonus point.',
    },
  },
};

// ══════════════════════════════════════════════════════════
// WebRoomService — الخدمة الأساسية
// ══════════════════════════════════════════════════════════
class WebRoomService {
  constructor() {
    this._rooms = {}; // playerUid → { code, ref }
  }

  /**
   * ينشئ كود W+6 لهذا اللاعب في هذه اللعبة
   * البيانات تُحفظ في RTDB تحت: webScreens/{code}
   */
  async createScreenRoom({
    gameType, gameRoomId = '', playerUid, playerName,
    publicData = {}, theme = 'dark',
  }) {
    // احذف الكود القديم لو موجود
    if (this._rooms[playerUid]) {
      try { await remove(this._rooms[playerUid].ref); } catch (_) {}
    }

    const code    = genWebCode();
    const roomRef = ref(rtdb, `webScreens/${code}`);

    await set(roomRef, {
      code,
      gameType,
      gameRoomId,
      playerUid,
      playerName,
      theme,           // اسم الثيم — الموقع يطبّق CSS منه
      public: publicData,
      createdAt: Date.now(),
      lastUpdate: Date.now(),
      status: 'active',
    });

    // تنظيف تلقائي إذا انقطع الاتصال أو أُغلق التطبيق فجأة
    await onDisconnect(roomRef).remove();

    this._rooms[playerUid] = { code, ref: roomRef };
    return code;
  }

  // ── تحديث حالة اللعبة (الهاتف يكتب → الموقع يقرأ) ──
  async updatePublic(playerUid, data) {
    const room = this._rooms[playerUid];
    if (!room) return;
    try {
      await update(room.ref, { public: data, lastUpdate: Date.now() });
    } catch (_) {}
  }

  async updateField(playerUid, field, value) {
    const room = this._rooms[playerUid];
    if (!room) return;
    try {
      await update(room.ref, { [field]: value, lastUpdate: Date.now() });
    } catch (_) {}
  }

  async endRoom(playerUid) {
    const room = this._rooms[playerUid];
    if (!room) return;
    try {
      await update(room.ref, { status: 'finished', lastUpdate: Date.now() });
    } catch (_) {}
  }

  async deleteRoom(playerUid) {
    const room = this._rooms[playerUid];
    if (!room) return;
    try {
      await remove(room.ref);
    } catch (_) {}
    delete this._rooms[playerUid];
  }

  getCode(playerUid) {
    return this._rooms[playerUid]?.code || null;
  }

  async copyCode(playerUid) {
    const code = this.getCode(playerUid);
    if (!code) return;
    try {
      await Clipboard.setStringAsync(code);
    } catch (_) {
      // fallback
    }
  }
}

export const webRoom = new WebRoomService();

// ══════════════════════════════════════════════════════════
// WebScreenButton — الزر 🌐 يُضاف بجانب زر الخروج ✕
//
// الاستخدام في أي لعبة:
//
//   import { WebScreenButton, GameInfoButton } from './WebRoomService';
//
//   <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
//     <TouchableOpacity onPress={handleExit} style={exitBtnStyle}>
//       <Text>✕</Text>
//     </TouchableOpacity>
//
//     <GameInfoButton gameType="man_ana" lang={lang} />
//
//     <WebScreenButton
//       playerUid={user.uid}
//       playerName={user.name}
//       gameType="man_ana"
//       gameRoomId={roomId}
//       getPublicData={() => ({ ... })}
//       themeName={theme.name}
//     />
//   </View>
// ══════════════════════════════════════════════════════════
export function WebScreenButton({
  playerUid, playerName, gameType, gameRoomId = '',
  getPublicData, themeName = 'dark', style,
}) {
  const [code,    setCode]    = useState(null);
  const [modal,   setModal]   = useState(false);
  const [loading, setLoading] = useState(false);

  const handlePress = () => setModal(true);

  const handleGetCode = async () => {
    if (code) return; // الكود موجود مسبقاً
    setLoading(true);
    try {
      const c = await webRoom.createScreenRoom({
        gameType, gameRoomId, playerUid, playerName,
        publicData: getPublicData ? getPublicData() : {},
        theme: themeName,
      });
      setCode(c);
    } catch (e) {
      
    }
    setLoading(false);
  };

  return (
    <>
      {/* ── الزر الصغير في الهيدر ── */}
      <TouchableOpacity
        style={[wb.btn, code && wb.btnActive, style]}
        onPress={handlePress}
        hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
        activeOpacity={0.75}
      >
        <Text style={wb.icon}>🌐</Text>
      </TouchableOpacity>

      {/* ── المودال ── */}
      <WebScreenModal
        visible={modal}
        code={code}
        loading={loading}
        gameType={gameType}
        playerUid={playerUid}
        onGetCode={handleGetCode}
        onClose={() => setModal(false)}
      />
    </>
  );
}

// ══════════════════════════════════════════════════════════
// GameInfoButton — زر ⓘ شرح كيف اللعب والفوز
//
// الاستخدام:
//   <GameInfoButton gameType="man_ana" lang={lang} />
//
//   lang اختياري — يقبل 'ar' أو 'en'. الافتراضي 'ar'.
// ══════════════════════════════════════════════════════════
export function GameInfoButton({ gameType, lang = 'ar', style }) {
  const [modal, setModal] = useState(false);

  return (
    <>
      <TouchableOpacity
        style={[wb.btn, style]}
        onPress={() => setModal(true)}
        hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
        activeOpacity={0.75}
      >
        <Text style={wb.icon}>ⓘ</Text>
      </TouchableOpacity>

      <GameInfoModal
        visible={modal}
        gameType={gameType}
        lang={lang}
        onClose={() => setModal(false)}
      />
    </>
  );
}

// ══════════════════════════════════════════════════════════
// GameInfoModal — مودال يعرض طريقة اللعب وكيفية الفوز
// ══════════════════════════════════════════════════════════
function GameInfoModal({ visible, gameType, lang, onClose }) {
  const info  = GAME_INFO[gameType]  || { name: gameType, emoji: '🎮' };
  const howTo = GAME_HOW_TO[gameType];
  const isAr  = lang === 'ar';
  const txt   = howTo ? (isAr ? howTo.ar : howTo.en) : null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={m.overlay} onPress={onClose}>
        <Pressable style={m.box} onPress={e => e.stopPropagation()}>

          {/* ── رأس المودال ── */}
          <View style={m.header}>
            <Text style={m.headerEmoji}>{info.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={m.headerTitle}>{isAr ? 'كيف تلعب؟' : 'How to Play?'}</Text>
              <Text style={m.headerSub}>{info.name}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={m.closeX} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={m.closeXText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={m.divider} />

          {/* ── المحتوى ── */}
          <ScrollView style={info_styles.body} showsVerticalScrollIndicator={false}>
            {txt ? (
              <>
                <View style={[info_styles.section, info_styles.sectionPlay]}>
                  <Text style={info_styles.sectionTitle}>
                    {isAr ? '🎮 طريقة اللعب' : '🎮 How to Play'}
                  </Text>
                  <Text style={info_styles.sectionText}>{txt.how}</Text>
                </View>

                <View style={[info_styles.section, info_styles.sectionWin]}>
                  <Text style={[info_styles.sectionTitle, info_styles.sectionTitleWin]}>
                    {isAr ? '🏆 كيف تفوز؟' : '🏆 How to Win?'}
                  </Text>
                  <Text style={info_styles.sectionText}>{txt.win}</Text>
                </View>
              </>
            ) : (
              <Text style={info_styles.empty}>
                {isAr ? 'الشرح غير متاح حالياً' : 'Info not available'}
              </Text>
            )}
          </ScrollView>

        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════
// WebScreenModal — المودال بحالتين: شرح → كود
// ══════════════════════════════════════════════════════════
function WebScreenModal({ visible, code, loading, gameType, playerUid, onGetCode, onClose }) {
  const info = GAME_INFO[gameType] || { name: gameType, emoji: '🎮' };
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await webRoom.copyCode(playerUid);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // تنسيق الكود للعرض: W·K7MX3P
  const displayCode = code
    ? code[0] + '·' + code.slice(1, 4) + '·' + code.slice(4)
    : null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={m.overlay} onPress={onClose}>
        <Pressable style={m.box} onPress={e => e.stopPropagation()}>

          {/* ── رأس المودال ── */}
          <View style={m.header}>
            <Text style={m.headerEmoji}>{info.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={m.headerTitle}>شاشة كبيرة</Text>
              <Text style={m.headerSub}>{info.name}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={m.closeX} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={m.closeXText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* ── خط فاصل ── */}
          <View style={m.divider} />

          {/* ── الشرح دائماً ظاهر ── */}
          <View style={m.stepsWrap}>
            <Step n="1" text="افتح playarnex.com على أي شاشة كبيرة" />
            <Step n="2" text="اضغط «عرض الشاشة» وأدخل الكود" />
            <Step n="3" text="اللعبة تظهر هناك — والتحكم يبقى بهاتفك" />
          </View>

          <View style={m.divider} />

          {/* ── حالة ما قبل الكود ── */}
          {!code && (
            <TouchableOpacity
              style={[m.getCodeBtn, loading && m.getCodeBtnLoading]}
              onPress={onGetCode}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <Text style={m.getCodeTxt}>⏳ جاري التوليد...</Text>
              ) : (
                <>
                  <Text style={m.getCodeIcon}>🔑</Text>
                  <Text style={m.getCodeTxt}>الحصول على كود</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* ── حالة ما بعد الكود ── */}
          {code && (
            <View style={m.codeSection}>
              {/* الكود القابل للنسخ */}
              <TouchableOpacity
                style={[m.codebox, copied && m.codeboxCopied]}
                onPress={handleCopy}
                activeOpacity={0.8}
              >
                <Text style={m.codeHint}>
                  {copied ? '✅ تم النسخ!' : 'اضغط للنسخ'}
                </Text>
                <Text style={m.codeText}>{displayCode}</Text>
                <Text style={m.codeUrl}>playarnex.com</Text>
              </TouchableOpacity>

              {/* تحذير */}
              <View style={m.warning}>
                <Text style={m.warningText}>
                  🔒 هذا الكود لهذه الجلسة فقط — لا تشاركه مع غيرك
                </Text>
              </View>
            </View>
          )}

        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── مكوّن خطوة صغير ──────────────────────────────────────
function Step({ n, text }) {
  return (
    <View style={st.row}>
      <View style={st.circle}>
        <Text style={st.num}>{n}</Text>
      </View>
      <Text style={st.text}>{text}</Text>
    </View>
  );
}

// ══════════════════════════════════════════════════════════
// Styles
// ══════════════════════════════════════════════════════════

// ── زر الهيدر ──
const wb = StyleSheet.create({
  btn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  btnActive: {
    backgroundColor: 'rgba(0,200,150,0.12)',
    borderColor: 'rgba(0,200,150,0.35)',
  },
  icon: {
    fontSize: 16,
    lineHeight: Platform.OS === 'android' ? 20 : 18,
  },
});

// ── المودال ──
const m = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  box: {
    backgroundColor: '#0f0f1e',
    borderRadius: 22,
    width: '100%',
    maxWidth: 370,
    borderWidth: 1,
    borderColor: 'rgba(100,100,200,0.25)',
    overflow: 'hidden',
  },

  // header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 18,
    paddingBottom: 14,
  },
  headerEmoji:  { fontSize: 28 },
  headerTitle:  { color: '#fff', fontSize: 16, fontWeight: '800' },
  headerSub:    { color: '#8888aa', fontSize: 12, marginTop: 1 },
  closeX: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeXText: { color: '#8888aa', fontSize: 13, fontWeight: '700' },

  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginHorizontal: 16 },

  // خطوات الشرح
  stepsWrap: { padding: 16, gap: 10 },

  // زر الحصول على الكود
  getCodeBtn: {
    margin: 16,
    backgroundColor: '#5b3ef5',
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  getCodeBtnLoading: { backgroundColor: '#2a2a50' },
  getCodeIcon: { fontSize: 18 },
  getCodeTxt:  { color: '#fff', fontSize: 15, fontWeight: '800' },

  // قسم الكود
  codeSection: { padding: 16, gap: 10 },
  codebox: {
    backgroundColor: '#0a1520',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(0,200,150,0.3)',
    gap: 4,
  },
  codeboxCopied: { borderColor: '#00c896', backgroundColor: '#041510' },
  codeHint: { color: '#8888aa', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' },
  codeText: {
    color: '#00e5b0',
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 6,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  codeUrl: { color: '#444466', fontSize: 10, marginTop: 2 },

  warning: {
    backgroundColor: 'rgba(255,200,0,0.06)',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,200,0,0.15)',
  },
  warningText: { color: '#c0a000', fontSize: 11, textAlign: 'center', lineHeight: 16 },
});

// ── خطوة الشرح ──
const st = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  circle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#5b3ef5',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  num:  { color: '#fff', fontSize: 11, fontWeight: '900' },
  text: { color: '#c0c0d8', fontSize: 13, flex: 1, lineHeight: 19 },
});

// ── ستايلات مودال شرح اللعبة ──
const info_styles = StyleSheet.create({
  body: {
    padding: 16,
    maxHeight: 420,
  },
  section: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    gap: 8,
  },
  sectionPlay: {
    backgroundColor: 'rgba(91,62,245,0.10)',
    borderColor: 'rgba(91,62,245,0.30)',
  },
  sectionWin: {
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderColor: 'rgba(245,158,11,0.30)',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#a08bff',
  },
  sectionTitleWin: {
    color: '#f59e0b',
  },
  sectionText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#d8d8ec',
  },
  empty: {
    fontSize: 14,
    color: '#8888aa',
    textAlign: 'center',
    paddingVertical: 30,
  },
});
