import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  StatusBar, ScrollView, Alert, Image,
} from 'react-native';
import { useOnlineGame } from './useOnlineGame';
import { useTheme } from './ThemeContext';
import { WordleEngraving } from './GameEngraving';
import { WebScreenButton, GameInfoButton } from './WebRoomService';
import { playSound } from './SoundService';

// ── ثوابت ────────────────────────────────────────────────────
const MAX_ATTEMPTS  = 7;
const WORD_SET_TIME = 60;

// ── لوحات المفاتيح ────────────────────────────────────────────
const KB_AR = [
  ['ض','ص','ث','ق','ف','غ','ع','ه','خ','ح','ج'],
  ['ش','س','ي','ب','ل','ا','ت','ن','م','ك','ط'],
  ['ئ','ء','ؤ','ر','لا','ى','ة','و','ز','ظ','ذ','د'],
];
const KB_EN = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['Z','X','C','V','B','N','M'],
];

// ── قاموس بسيط للتحقق ─────────────────────────────────────────
const VALID_AR = new Set([
  'نجمة','زهرة','قمرك','جبلك','صديق','سحاب','مطرك','صخرة','ليلك','فجرك',
  'نهرك','درجة','شرفة','رحلة','كتاب','مكتب','غيمة','خيرك','فرحك','حلمك',
  'بيتك','عدلك','ثمرة','طريق','أسرة','حديث','جمال','كمال','وصول','فكرة',
  'هدية','مساء','صباح','قهوة','شايك','بلدك','جدتي','حضنك','أملاً','شعلة',
]);
const VALID_EN = new Set([
  'apple','beach','cloud','dance','eagle','flame','grace','house','ivory','joker',
  'kneel','light','music','night','ocean','peace','queen','river','storm','tiger',
  'umbra','vivid','water','xenon','yacht','zebra','brain','chess','dream','elbow',
  'faith','giant','honor','image','jewel','karma','learn','money','nerve','often',
  'power','quest','rapid','solar','table','under','value','world','extra','youth',
]);
function isValidWord(w, lang) {
  return lang === 'ar' ? VALID_AR.has(w.trim()) : VALID_EN.has(w.trim().toLowerCase());
}

// ─────────────────────────────────────────────────────────────
export default function WordleGameScreen({ onBack, currentUser, onGameEnd }) {
  const { theme } = useTheme();
  const { roomId, isPlayer1, roomData, loading, error, updateRoom, endGame, leaveRoom } =
    useOnlineGame('wordle', currentUser);

  // المراحل: 'setting' | 'waiting' | 'playing' | 'finished'
  const [phase,        setPhase]        = useState('setting');
  const [wordInput,    setWordInput]    = useState('');
  const [wordLang,     setWordLang]     = useState('ar');
  const [wordError,    setWordError]    = useState('');
  const [timer,        setTimer]        = useState(WORD_SET_TIME);
  const timerRef = useRef(null);

  const [secretWord,   setSecretWord]   = useState('');
  const [activeLang,   setActiveLang]   = useState('ar');
  const [guesses,      setGuesses]      = useState([]);
  const [feedbackAll,  setFeedbackAll]  = useState([]);
  const [currentGuess, setCurrentGuess] = useState('');
  const [gameOver,     setGameOver]     = useState(false);
  const [gameResult,   setGameResult]   = useState(null);
  const [round,        setRound]        = useState(1);

  const myName        = currentUser?.name  || 'أنت';
  const opponentName  = roomData ? (isPlayer1 ? roomData.player2Name  : roomData.player1Name)  || 'خصم' : 'بانتظار...';
  const opponentPhoto = roomData ? (isPlayer1 ? roomData.player2Photo : roomData.player1Photo) : null;
  const isWaiting     = !roomData?.player2Name && !roomData?.player2Id;
  const isVsBot       = roomData?.isBot || false;

  // ── مزامنة Firebase ────────────────────────────────────────
  useEffect(() => {
    if (!roomData) return;
    if (roomData.round) setRound(roomData.round);
    if (roomData.phase) {
      setPhase(roomData.phase);
      if (roomData.phase === 'playing') {
        const mySecret = isPlayer1 ? roomData.wordForP1 : roomData.wordForP2;
        const myLang   = isPlayer1 ? roomData.langForP1 : roomData.langForP2;
        if (mySecret) { setSecretWord(mySecret); setActiveLang(myLang || 'ar'); }
      }
    }
    if (roomData.guesses)     setGuesses(roomData.guesses);
    if (roomData.feedbackAll) setFeedbackAll(roomData.feedbackAll);
    if (roomData.gameResult)  {
      setGameResult(roomData.gameResult);
      setGameOver(true);
      setPhase('finished');
      if (onGameEnd) onGameEnd(roomData.gameResult === 'won');
    }
  }, [roomData]);

  // ── تايمر مرحلة الاختيار ──────────────────────────────────
  useEffect(() => {
    if (phase !== 'setting') { clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(() => {
      setTimer(t => {
        if (t <= 1) { clearInterval(timerRef.current); handleAutoWord(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase]);

  // صوت countdown خارج setState
  useEffect(() => {
    if (timer > 0 && timer <= 5) playSound('countdown');
  }, [timer]);

  const handleAutoWord = async () => {
    const pool = wordLang === 'ar' ? [...VALID_AR] : [...VALID_EN];
    const fallback = pool[Math.floor(Math.random() * pool.length)];
    await commitWord(fallback, wordLang);
  };

  // ── تقديم الكلمة ──────────────────────────────────────────
  const commitWord = async (word, lang) => {
    clearInterval(timerRef.current);
    const myWordKey  = isPlayer1 ? 'wordForP2' : 'wordForP1';
    const myLangKey  = isPlayer1 ? 'langForP2' : 'langForP1';
    const myReadyKey = isPlayer1 ? 'p1Ready'   : 'p2Ready';
    const oppReady   = roomData?.[isPlayer1 ? 'p2Ready' : 'p1Ready'] === true;
    const update = { [myWordKey]: word, [myLangKey]: lang, [myReadyKey]: true };
    if (oppReady) update.phase = 'playing';
    await updateRoom(update);
    setPhase(oppReady ? 'playing' : 'waiting');
  };

  const handleSubmitWord = async () => {
    const word = wordInput.trim();
    if (!word) { setWordError('اكتب كلمة أولاً'); return; }
    if (!isValidWord(word, wordLang)) {
      setWordError(wordLang === 'ar' ? 'الكلمة غير موجودة في القاموس' : 'Word not found in dictionary');
      return;
    }
    setWordError(''); setWordInput('');
    await commitWord(word, wordLang);
  };

  // ── تلوين ─────────────────────────────────────────────────
  const getLetterColor = (letter, index, word) => {
    if (word[index] === letter) return '#10b981';
    if (word.includes(letter))  return '#f59e0b';
    return '#9ca3af';
  };
  const getKeyColor = (letter) => {
    let best = null;
    for (const row of feedbackAll) {
      for (const fb of row) {
        if (fb.letter === letter) {
          if (fb.color === '#10b981') { best = '#10b981'; break; }
          if (fb.color === '#f59e0b' && best !== '#10b981') best = '#f59e0b';
          if (!best) best = '#9ca3af';
        }
      }
      if (best === '#10b981') break;
    }
    return best;
  };

  // ── إدخال وإرسال تخمين ────────────────────────────────────
  const handleKey = (letter) => {
    if (gameOver) return;
    if (letter === '⌫') { setCurrentGuess(p => p.slice(0, -1)); return; }
    if (currentGuess.length < (secretWord.length || 5)) setCurrentGuess(p => p + letter);
  };

  const handleGuess = async () => {
    const wl = secretWord.length || 5;
    if (currentGuess.length !== wl) { Alert.alert('تنبيه', `الكلمة يجب أن تكون ${wl} أحرف`); return; }
    const newFb  = currentGuess.split('').map((l, i) => ({ letter: l, color: getLetterColor(l, i, secretWord) }));
    const newG   = [...guesses, currentGuess];
    const newFbA = [...feedbackAll, newFb];
    setGuesses(newG); setFeedbackAll(newFbA); setCurrentGuess('');
    const won = currentGuess === secretWord;
    const lost = !won && newG.length >= MAX_ATTEMPTS;
    if (won || lost) {
      const result = won ? 'won' : 'lost';
      setGameResult(result); setGameOver(true);
      await endGame({ player1: won?(isPlayer1?1:0):(isPlayer1?0:1), player2: won?(isPlayer1?0:1):(isPlayer1?1:0) });
      await updateRoom({ guesses: newG, feedbackAll: newFbA, gameResult: result });
      return;
    }
    await updateRoom({ guesses: newG, feedbackAll: newFbA });
  };

  const handleNewGame = async () => {
    const nr = round + 1;
    setRound(nr); setPhase('setting'); setTimer(WORD_SET_TIME);
    setWordInput(''); setWordError(''); setWordLang('ar');
    setGuesses([]); setFeedbackAll([]); setCurrentGuess('');
    setGameOver(false); setGameResult(null); setSecretWord('');
    await updateRoom({ phase:'setting', round:nr, p1Ready:false, p2Ready:false, wordForP1:null, wordForP2:null, langForP1:null, langForP2:null, guesses:[], feedbackAll:[], gameResult:null });
  };

  const handleQuit = () => Alert.alert('خروج','هل تريد مغادرة اللعبة؟',[
    { text:'إلغاء', style:'cancel' },
    { text:'خروج', style:'destructive', onPress: async()=>{ await leaveRoom(); onBack(); }},
  ]);

  // ── TopBar مشترك ───────────────────────────────────────────
  const TopBar = () => (
    <View style={s.topBar}>
      <TouchableOpacity onPress={handleQuit} style={[s.quitBtn,{backgroundColor:'rgba(239,68,68,0.12)',borderColor:'rgba(239,68,68,0.3)'}]}>
        <Text style={{color:'#ef4444',fontSize:16}}>✕</Text>
      </TouchableOpacity>
      <GameInfoButton gameType="wordle" lang="ar" />
      <WebScreenButton
        playerUid={currentUser?.uid}
        playerName={currentUser?.name}
        gameType="wordle"
        gameRoomId={roomId}
        getPublicData={() => ({ guesses, phase })}
        themeName={theme.name}
      />
      <View style={[s.opponentBar,{backgroundColor:theme.bgCard,borderColor:theme.border}]}>
        <View style={s.avatarWrap}>
          {opponentPhoto
            ? <Image source={{uri:opponentPhoto}} style={s.avatarImg}/>
            : <View style={[s.avatarFallback,{backgroundColor:theme.bgElevated}]}>
                <Text style={{fontSize:17}}>{isVsBot?'🤖':(isWaiting?'⏳':opponentName.charAt(0))}</Text>
              </View>}
          <View style={[s.onlineDot,{backgroundColor:isWaiting?theme.textMuted:theme.success}]}/>
        </View>
        <View style={{flex:1}}>
          <Text style={[s.opponentName,{color:theme.textPrimary}]} numberOfLines={1}>
            {isWaiting?'بانتظار خصم...':opponentName}
          </Text>
          <Text style={[s.opponentSub,{color:theme.textSecondary}]}>
            {isVsBot?'بوت':(isWaiting?'...':'متصل')}
          </Text>
        </View>
        <View style={[s.roundPill,{backgroundColor:theme.bgElevated}]}>
          <Text style={{color:theme.accent,fontSize:11,fontWeight:'700'}}>ج {round}</Text>
        </View>
      </View>
    </View>
  );

  // ── Loading / Error ─────────────────────────────────────────
  if (error) return (
    <View style={[s.container,{backgroundColor: theme.isCityTheme ? 'transparent' : theme.bg}]}>
      <WordleEngraving theme={theme}/><StatusBar barStyle={theme.statusBar}/>
      <View style={s.center}>
        <Text style={{color:'#ef4444'}}>❌ {error}</Text>
        <TouchableOpacity onPress={onBack} style={[s.smallBtn,{backgroundColor:theme.bgCard}]}>
          <Text style={{color:theme.accent}}>رجوع</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
  if (loading) return (
    <View style={[s.container,{backgroundColor: theme.isCityTheme ? 'transparent' : theme.bg}]}>
      <WordleEngraving theme={theme}/><StatusBar barStyle={theme.statusBar}/>
      <View style={s.center}>
        <ActivityIndicator size="large" color={theme.accent}/>
        <Text style={{color:theme.textPrimary,marginTop:12}}>جاري الاتصال...</Text>
      </View>
    </View>
  );

  // ════════════════════════════════════════════════════════════
  // SETTING — اختر كلمة للخصم
  // ════════════════════════════════════════════════════════════
  if (phase === 'setting') {
    const kbRows = wordLang === 'ar' ? KB_AR : KB_EN;
    const WLEN   = wordInput.trim().length;
    const timerColor = timer > 30 ? '#10b981' : timer > 10 ? '#f59e0b' : '#ef4444';

    return (
      <View style={[s.container,{backgroundColor: theme.isCityTheme ? 'transparent' : theme.bg}]}>
        <WordleEngraving theme={theme}/><StatusBar barStyle={theme.statusBar}/>
        <TopBar/>

        {/* عنوان المرحلة */}
        <View style={[s.settingHeader,{backgroundColor:theme.bgCard,borderColor:theme.border}]}>
          <View style={{flex:1}}>
            <Text style={[s.settingTitle,{color:theme.textPrimary}]}>ضع كلمة لخصمك 🔒</Text>
            <Text style={[s.settingDesc,{color:theme.textSecondary}]}>اختر كلمة صعبة — لن يراها إلا بعد البدء</Text>
          </View>
          <View style={[s.langBadge,{backgroundColor:wordLang==='ar'?theme.purple:theme.success}]}>
            <Text style={s.langBadgeText}>{wordLang==='ar'?'عربي':'English'}</Text>
          </View>
        </View>

        {/* تايمر */}
        <View style={[s.timerRow,{backgroundColor:theme.bgCard,borderColor:theme.border}]}>
          <Text style={{color:timerColor,fontWeight:'900',fontSize:18,minWidth:32}}>{timer}</Text>
          <View style={s.timerBarBg}>
            <View style={[s.timerBarFill,{width:`${(timer/WORD_SET_TIME)*100}%`,backgroundColor:timerColor}]}/>
          </View>
          <Text style={{color:theme.textMuted,fontSize:12}}>ث</Text>
        </View>

        {/* معاينة الكلمة */}
        <View style={s.previewRow}>
          {WLEN === 0
            ? <View style={[s.previewBox,{backgroundColor:theme.bgCard,borderColor:theme.border,borderWidth:1,opacity:0.4}]}/>
            : Array(WLEN).fill('').map((_,i)=>(
                <View key={i} style={[s.previewBox,{
                  backgroundColor: theme.bgElevated,
                  borderColor: theme.accent,
                  borderWidth: 1.5,
                }]}>
                  <Text style={{color:theme.textPrimary,fontSize:18,fontWeight:'800'}}>{wordInput[i]}</Text>
                </View>
              ))
          }
        </View>
        {!!wordError && <Text style={s.wordError}>{wordError}</Text>}

        {/* تبديل اللغة */}
        <View style={s.langToggleRow}>
          {['ar','en'].map(l=>(
            <TouchableOpacity key={l} onPress={()=>{setWordLang(l);setWordInput('');setWordError('');}}
              style={[s.langTab,{backgroundColor:wordLang===l?theme.accent:theme.bgCard,borderColor:wordLang===l?theme.accent:theme.border}]}>
              <Text style={{color:wordLang===l?(theme.textOnAccent||'#fff'):theme.textSecondary,fontWeight:'700',fontSize:13}}>
                {l==='ar'?'عربي 🇸🇦':'English 🇺🇸'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* لوحة المفاتيح */}
        <View style={s.keyboard}>
          {kbRows.map((row,ri)=>(
            <View key={ri} style={s.kbRow}>
              {row.map(letter=>(
                <TouchableOpacity key={letter}
                  onPress={()=>{ if(wordInput.length<12) setWordInput(p=>p+letter); }}
                  style={[s.key,{backgroundColor:theme.bgCard,borderColor:theme.border}]}>
                  <Text style={[s.keyText,{color:theme.textPrimary}]}>{letter}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
          <View style={s.kbRow}>
            <TouchableOpacity onPress={()=>setWordInput(p=>p.slice(0,-1))}
              style={[s.actionKey,{backgroundColor:'#ef444420',borderColor:'#ef444440'}]}>
              <Text style={{color:'#ef4444',fontSize:17}}>⌫</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSubmitWord}
              style={[s.submitKey,{backgroundColor:theme.accent,opacity:WLEN<3?0.45:1}]}
              disabled={WLEN<3}>
              <Text style={{color:theme.textOnAccent||'#fff',fontWeight:'800',fontSize:14}}>تأكيد الكلمة 🔒</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // ════════════════════════════════════════════════════════════
  // WAITING — انتظار الخصم
  // ════════════════════════════════════════════════════════════
  if (phase === 'waiting') return (
    <View style={[s.container,{backgroundColor: theme.isCityTheme ? 'transparent' : theme.bg}]}>
      <WordleEngraving theme={theme}/><StatusBar barStyle={theme.statusBar}/>
      <TopBar/>
      <View style={s.center}>
        <View style={[s.waitingIcon,{backgroundColor:theme.bgCard,borderColor:theme.border}]}>
          <Text style={{fontSize:44}}>⏳</Text>
        </View>
        <Text style={[s.waitingTitle,{color:theme.textPrimary}]}>وضعت كلمتك! ✅</Text>
        <Text style={[s.waitingDesc,{color:theme.textSecondary}]}>
          بانتظار {opponentName} ليختار كلمته...
        </Text>
        <View style={s.dotsAnim}>
          {[0.3,0.6,1].map((op,i)=>(
            <View key={i} style={[s.animDot,{backgroundColor:theme.accent,opacity:op}]}/>
          ))}
        </View>
        <View style={[s.reminderBox,{backgroundColor:theme.bgCard,borderColor:theme.border}]}>
          <Text style={{color:theme.textSecondary,fontSize:13,textAlign:'center'}}>
            {'اخترت كلمة '}
            <Text style={{color:theme.accent,fontWeight:'700'}}>
              {wordLang==='ar'?'عربية':'إنجليزية'}
            </Text>
            {' لخصمك 🎯'}
          </Text>
        </View>
      </View>
    </View>
  );

  // ════════════════════════════════════════════════════════════
  // PLAYING — التخمين
  // ════════════════════════════════════════════════════════════
  const wordLen = secretWord.length || 5;
  const kbRows  = activeLang === 'ar' ? KB_AR : KB_EN;

  return (
    <View style={[s.container,{backgroundColor: theme.isCityTheme ? 'transparent' : theme.bg}]}>
      <WordleEngraving theme={theme}/><StatusBar barStyle={theme.statusBar}/>
      <TopBar/>

      {/* شريط اللغة + المحاولات */}
      <View style={[s.attemptsBar,{backgroundColor:theme.bgCard,borderColor:theme.border}]}>
        <View style={[s.langBadge,{backgroundColor:activeLang==='ar'?theme.purple:theme.success}]}>
          <Text style={s.langBadgeText}>{activeLang==='ar'?'عربي':'English'}</Text>
        </View>
        <View style={s.dotsRow}>
          {Array(MAX_ATTEMPTS).fill(0).map((_,i)=>(
            <View key={i} style={[s.dot,{
              backgroundColor: i<guesses.length
                ?(gameResult==='won'&&i===guesses.length-1?'#10b981':theme.accent)
                :theme.bgElevated
            }]}/>
          ))}
        </View>
        <Text style={{color:theme.accent,fontWeight:'700',fontSize:14}}>{guesses.length}/{MAX_ATTEMPTS}</Text>
      </View>

      {/* الشبكة */}
      <ScrollView style={s.guessesScroll} contentContainerStyle={s.guessesContent} showsVerticalScrollIndicator={false}>
        {guesses.map((guess,gi)=>(
          <View key={gi} style={s.guessRow}>
            {guess.split('').map((letter,li)=>(
              <View key={li} style={[s.letterBox,{
                width:wordLen>5?50:62, height:wordLen>5?50:62,
                backgroundColor:feedbackAll[gi]?.[li]?.color||theme.bgCard, borderColor:'transparent'
              }]}>
                <Text style={[s.letterText,{fontSize:wordLen>5?16:20}]}>{letter}</Text>
              </View>
            ))}
          </View>
        ))}
        {!gameOver&&(
          <View style={s.guessRow}>
            {Array(wordLen).fill('').map((_,i)=>(
              <View key={i} style={[s.letterBox,{
                width:wordLen>5?50:62, height:wordLen>5?50:62,
                backgroundColor:currentGuess[i]?theme.bgElevated:theme.bgCard,
                borderColor:currentGuess[i]?theme.accent:theme.border, borderWidth:1.5,
              }]}>
                <Text style={[s.letterText,{color:theme.textPrimary,fontSize:wordLen>5?16:20}]}>{currentGuess[i]||''}</Text>
              </View>
            ))}
          </View>
        )}
        {!gameOver&&Array(Math.max(0,MAX_ATTEMPTS-guesses.length-1)).fill(0).map((_,i)=>(
          <View key={`e${i}`} style={s.guessRow}>
            {Array(wordLen).fill('').map((_,j)=>(
              <View key={j} style={[s.letterBox,{width:wordLen>5?50:62,height:wordLen>5?50:62,backgroundColor:theme.bgCard,borderColor:theme.border,borderWidth:1,opacity:0.3}]}/>
            ))}
          </View>
        ))}
      </ScrollView>

      {/* نتيجة */}
      {gameOver&&(
        <View style={[s.resultBox,{backgroundColor:gameResult==='won'?theme.success:theme.error}]}>
          <Text style={s.resultEmoji}>{gameResult==='won'?'🎉':'😢'}</Text>
          <Text style={s.resultText}>{gameResult==='won'?'أحسنت! فزت!':`خسرت! الكلمة: ${secretWord}`}</Text>
          <TouchableOpacity onPress={handleNewGame} style={[s.newGameBtn,{backgroundColor:'#fff'}]}>
            <Text style={{color:gameResult==='won'?'#10b981':'#ef4444',fontWeight:'800',fontSize:13}}>🎮 جولة جديدة</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* لوحة المفاتيح */}
      {!gameOver&&(
        <View style={s.keyboard}>
          {kbRows.map((row,ri)=>(
            <View key={ri} style={s.kbRow}>
              {row.map(letter=>{
                const kc=getKeyColor(letter);
                return(
                  <TouchableOpacity key={letter} onPress={()=>handleKey(letter)}
                    style={[s.key,{backgroundColor:kc||theme.bgCard,borderColor:kc?'transparent':theme.border}]}>
                    <Text style={[s.keyText,{color:kc?'#fff':theme.textPrimary}]}>{letter}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
          <View style={s.kbRow}>
            <TouchableOpacity onPress={()=>handleKey('⌫')} style={[s.actionKey,{backgroundColor:'#ef444420',borderColor:'#ef444440'}]}>
              <Text style={{color:'#ef4444',fontSize:17}}>⌫</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleGuess} style={[s.submitKey,{backgroundColor:theme.accent}]}>
              <Text style={{color:theme.textOnAccent||'#fff',fontWeight:'800',fontSize:14}}>تأكيد ✓</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container:      { flex:1, paddingTop:52 },
  center:         { flex:1, alignItems:'center', justifyContent:'center', gap:14, paddingHorizontal:24 },
  smallBtn:       { paddingVertical:10, paddingHorizontal:24, borderRadius:10, alignItems:'center', marginTop:12 },

  topBar:         { flexDirection:'row', alignItems:'center', gap:10, paddingHorizontal:14, marginBottom:10 },
  quitBtn:        { width:36, height:36, borderRadius:10, alignItems:'center', justifyContent:'center', borderWidth:1 },
  opponentBar:    { flex:1, flexDirection:'row', alignItems:'center', gap:10, paddingHorizontal:12, paddingVertical:8, borderRadius:14, borderWidth:1 },
  avatarWrap:     { position:'relative' },
  avatarFallback: { width:36, height:36, borderRadius:18, alignItems:'center', justifyContent:'center' },
  avatarImg:      { width:36, height:36, borderRadius:18 },
  onlineDot:      { position:'absolute', bottom:0, right:0, width:10, height:10, borderRadius:5, borderWidth:1.5, borderColor:'#fff' },
  opponentName:   { fontSize:14, fontWeight:'700' },
  opponentSub:    { fontSize:11 },
  roundPill:      { paddingHorizontal:8, paddingVertical:4, borderRadius:8 },

  settingHeader:  { marginHorizontal:14, padding:14, borderRadius:14, borderWidth:1, marginBottom:10, flexDirection:'row', alignItems:'center', gap:10 },
  settingTitle:   { fontSize:15, fontWeight:'800', marginBottom:2 },
  settingDesc:    { fontSize:12 },
  langBadge:      { paddingHorizontal:10, paddingVertical:5, borderRadius:10 },
  langBadgeText:  { color:'#fff', fontWeight:'800', fontSize:12 },
  timerRow:       { marginHorizontal:14, paddingHorizontal:14, paddingVertical:8, borderRadius:12, borderWidth:1, marginBottom:10, flexDirection:'row', alignItems:'center', gap:10 },
  timerBarBg:     { flex:1, height:6, borderRadius:3, backgroundColor:'#ffffff18', overflow:'hidden' },
  timerBarFill:   { height:'100%', borderRadius:3 },
  previewRow:     { flexDirection:'row', justifyContent:'center', gap:5, marginBottom:6, marginHorizontal:14 },
  previewBox:     { minWidth:32, width:52, maxWidth:56, height:52, borderRadius:10, alignItems:'center', justifyContent:'center', flex:1 },
  wordError:      { color:'#ef4444', fontSize:13, textAlign:'center', marginBottom:6 },
  langToggleRow:  { flexDirection:'row', gap:8, marginHorizontal:14, marginBottom:8 },
  langTab:        { flex:1, paddingVertical:8, borderRadius:10, alignItems:'center', borderWidth:1 },

  waitingIcon:    { width:88, height:88, borderRadius:44, alignItems:'center', justifyContent:'center', borderWidth:1, marginBottom:4 },
  waitingTitle:   { fontSize:20, fontWeight:'800', textAlign:'center' },
  waitingDesc:    { fontSize:14, textAlign:'center' },
  dotsAnim:       { flexDirection:'row', gap:8, marginTop:2 },
  animDot:        { width:10, height:10, borderRadius:5 },
  reminderBox:    { paddingHorizontal:20, paddingVertical:12, borderRadius:12, borderWidth:1 },

  attemptsBar:    { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginHorizontal:14, paddingHorizontal:14, paddingVertical:8, borderRadius:12, borderWidth:1, marginBottom:10 },
  dotsRow:        { flexDirection:'row', gap:5 },
  dot:            { width:10, height:10, borderRadius:5 },

  guessesScroll:  { flex:1, marginHorizontal:14 },
  guessesContent: { alignItems:'center', gap:6, paddingVertical:4 },
  guessRow:       { flexDirection:'row', gap:6 },
  letterBox:      { borderRadius:10, alignItems:'center', justifyContent:'center' },
  letterText:     { color:'#fff', fontWeight:'800' },

  resultBox:      { marginHorizontal:14, borderRadius:16, padding:14, alignItems:'center', marginBottom:8, flexDirection:'row', justifyContent:'space-between', gap:8 },
  resultEmoji:    { fontSize:26 },
  resultText:     { color:'#fff', fontSize:14, fontWeight:'700', flex:1, textAlign:'center' },
  newGameBtn:     { paddingVertical:8, paddingHorizontal:14, borderRadius:10 },

  keyboard:       { paddingHorizontal:6, paddingBottom:12, gap:5 },
  kbRow:          { flexDirection:'row', justifyContent:'center', gap:4, flexWrap:'wrap' },
  key:            { minWidth:28, height:37, borderRadius:7, alignItems:'center', justifyContent:'center', borderWidth:1, paddingHorizontal:4 },
  keyText:        { fontSize:13, fontWeight:'600' },
  actionKey:      { height:37, paddingHorizontal:14, borderRadius:9, alignItems:'center', justifyContent:'center', borderWidth:1 },
  submitKey:      { flex:1, maxWidth:150, height:37, borderRadius:9, alignItems:'center', justifyContent:'center', marginHorizontal:6 },
});
