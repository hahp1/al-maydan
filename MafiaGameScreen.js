/**
 * MafiaGameScreen.js
 * لعبة المافيا — أونلاين بكود دعوة
 *
 * الأدوار: مافيا 🔴 | محقق 🔵 | طبيب 💚 | مواطن ⚪
 *
 * مراحل اللعبة:
 * lobby      → انتظار اللاعبين (المنشئ يرى كود الغرفة ويبدأ)
 * role_reveal→ كل لاعب يرى دوره سرًا (10 ثوانٍ)
 * day        → نقاش + تصويت لطرد مشتبه به
 * voting     → إظهار نتيجة التصويت + الطرد
 * night      → المافيا تختار ضحية / الطبيب ينقذ / المحقق يحقق
 * night_result→ إعلان نتيجة الليل
 * finished   → إعلان الفائز
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  StatusBar, ScrollView, Alert, Animated, Modal, TextInput,
,
  useWindowDimensions} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useMemo, db } from './firebaseConfig';
import {
  doc, setDoc, updateDoc, onSnapshot, getDoc, collection,
  query, where, getDocs, deleteDoc
} from 'firebase/firestore';
import { useTheme } from './ThemeContext';
import ExitButton from './ExitButton';
import { useLanguage } from './I18n';
import LeaveModal from './LeaveModal';
import { WebScreenButton, GameInfoButton } from './WebRoomService';
import { ThemedButton, ThemedCard, ThemedPill, ThemedModal, ThemedRow } from './ThemedComponents';


// ═══════════════════════════════════════════
//  ثوابت اللعبة
// ═══════════════════════════════════════════
const MIN_PLAYERS = 4;
const MAX_PLAYERS = 10;
const DAY_DURATION = 90;   // ثوانٍ للنقاش النهاري
const NIGHT_DURATION = 30; // ثوانٍ لأفعال الليل
const REVEAL_DURATION = 12; // ثوانٍ لعرض الدور

// توزيع الأدوار حسب عدد اللاعبين
function getRoleDistribution(count) {
  if (count === 4)  return { mafia: 1, detective: 1, doctor: 0, citizen: 2 };
  if (count === 5)  return { mafia: 1, detective: 1, doctor: 1, citizen: 2 };
  if (count === 6)  return { mafia: 2, detective: 1, doctor: 1, citizen: 2 };
  if (count === 7)  return { mafia: 2, detective: 1, doctor: 1, citizen: 3 };
  if (count === 8)  return { mafia: 2, detective: 1, doctor: 1, citizen: 4 };
  if (count === 9)  return { mafia: 3, detective: 1, doctor: 1, citizen: 4 };
  if (count === 10) return { mafia: 3, detective: 1, doctor: 1, citizen: 5 };
  return { mafia: 1, detective: 1, doctor: 0, citizen: count - 2 };
}

function assignRoles(players) {
  const dist = getRoleDistribution(players.length);
  const roles = [];
  for (let i = 0; i < dist.mafia; i++)     roles.push('mafia');
  for (let i = 0; i < dist.detective; i++) roles.push('detective');
  for (let i = 0; i < dist.doctor; i++)    roles.push('doctor');
  for (let i = 0; i < dist.citizen; i++)   roles.push('citizen');
  // خلط عشوائي
  for (let i = roles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [roles[i], roles[j]] = [roles[j], roles[i]];
  }
  const result = {};
  players.forEach((p, idx) => { result[p.uid] = roles[idx]; });
  return result;
}

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// ═══════════════════════════════════════════
//  بيانات الأدوار (اللغة العربية)
// ═══════════════════════════════════════════
const ROLE_INFO = {
  mafia:      { label: 'مافيا',   emoji: '🕴️', color: '#ef4444', desc: 'أقصِ المواطنين ليلاً وتجنّب الكشف نهاراً' },
  detective:  { label: 'محقق',   emoji: '🕵️', color: '#3b82f6', desc: 'كشف هوية أي لاعب ليلاً للتأكد من دوره' },
  doctor:     { label: 'طبيب',   emoji: '🧑‍⚕️', color: '#22c55e', desc: 'أنقذ لاعبًا من الاغتيال الليلي' },
  citizen:    { label: 'مواطن',  emoji: '🙋', color: '#94a3b8', desc: 'صوّت بحكمة لكشف المافيا نهاراً' },
};

// ═══════════════════════════════════════════
//  مكوّن Avatar اللاعب
// ═══════════════════════════════════════════
function PlayerAvatar({ name, isEliminated, isSelected, role, showRole, theme, size = 48, onPress, disabled }) {
  const initials = name?.slice(0, 2) || '؟';
  const roleData = role ? ROLE_INFO[role] : null;

  return (
    <ThemedCard
      onPress={onPress}
      disabled={disabled || !onPress}
      style={[avatarS.wrap, { width: size + 16, alignItems: 'center', opacity: isEliminated ? 0.4 : 1 }]}
    >
      <View style={[
        avatarS.circle,
        {
          width: size, height: size, borderRadius: size / 2,
          backgroundColor: isEliminated
            ? theme.bgElevated
            : isSelected
            ? (roleData?.color || theme.accent) + '30'
            : theme.bgElevated,
          borderWidth: isSelected ? 2.5 : 1.5,
          borderColor: isSelected
            ? (roleData?.color || theme.accent)
            : theme.borderCard,
        }
      ]}>
        {isEliminated ? (
          <Text style={{ fontSize: size * 0.45 }}>💀</Text>
        ) : showRole && roleData ? (
          <Text style={{ fontSize: size * 0.45 }}>{roleData.emoji}</Text>
        ) : (
          <Text style={[avatarS.initials, { color: theme.textPrimary, fontSize: size * 0.32 }]}>
            {initials}
          </Text>
        )}
      </View>
      <Text style={[avatarS.name, { color: isEliminated ? theme.textMuted : theme.textSecondary, fontSize: 11 }]}
        numberOfLines={1}
      >
        {isEliminated ? 'مُقصى' : name}
      </Text>
      {isSelected && !isEliminated && (
        <View style={[avatarS.badge, { backgroundColor: roleData?.color || theme.accent }]}>
          <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>✓</Text>
        </View>
      )}
    </ThemedCard>
  );
}

const avatarS = StyleSheet.create({
  wrap: { position: 'relative' },
  circle: { alignItems: 'center', justifyContent: 'center' },
  initials: { fontWeight: '700' },
  name: { marginTop: 4, textAlign: 'center', maxWidth: 60 },
  badge: {
    position: 'absolute', top: 0, right: 0,
    width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
});

// ═══════════════════════════════════════════
//  Timer مؤقت دائري
// ═══════════════════════════════════════════
function CircleTimer({ total, remaining, color, theme }) {
  const r = 28, cx = 34, cy = 34;
  const circumference = 2 * Math.PI * r;
  const progress = remaining / total;
  const strokeDashoffset = circumference * (1 - progress);
  const urgent = remaining <= 10;

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: 68, height: 68 }}>
      <View style={StyleSheet.absoluteFill}>
        {/* SVG-like via border */}
      </View>
      <View style={{
        width: 68, height: 68, borderRadius: 34,
        borderWidth: 3,
        borderColor: urgent ? '#ef4444' : color,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: urgent ? '#ef444415' : color + '15',
      }}>
        <Text style={{ color: urgent ? '#ef4444' : color, fontSize: 22, fontWeight: '800' }}>
          {remaining}
        </Text>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════
//  الشاشة الرئيسية
// ═══════════════════════════════════════════
export default function MafiaGameScreen({ onBack, currentUser, onGameEnd, onGameReady }) {
  const { width: W } = useWindowDimensions();
  const gs = useMemo(() => makeStyles(W), [W]);
  const { theme, themeId } = useTheme();
  const { lang } = useLanguage();

  // ── حالة الغرفة ──
  const [screen, setScreen] = useState('setup'); // setup | lobby | game
  const [roomCode, setRoomCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [roomId, setRoomId] = useState(null);
  const [roomData, setRoomData] = useState(null);
  const [isCreator, setIsCreator] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ── حالة اللعبة (محلية) ──
  const [myAction, setMyAction] = useState(null);       // uid اللاعب المستهدف
  const [myVote, setMyVote] = useState(null);           // uid المصوّت ضده
  const [actionSubmitted, setActionSubmitted] = useState(false);
  const [voteSubmitted, setVoteSubmitted] = useState(false);
  const [timerVal, setTimerVal] = useState(0);
  const [showLeave, setShowLeave] = useState(false);
  const [roleRevealed, setRoleRevealed] = useState(false);

  const unsubRef = useRef(null);
  const timerRef = useRef(null);
  const phaseStartRef = useRef(null);
  const gameEndCalledRef = useRef(false);

  const myUid = currentUser?.uid || `guest_${Math.random().toString(36).slice(2, 10)}`;
  const myName = currentUser?.name || 'لاعب';

  // ── اشتراك Firebase ──
  useEffect(() => {
    if (!roomId) return;
    unsubRef.current = onSnapshot(doc(db, 'mafia_rooms', roomId), snap => {
      if (snap.exists()) setRoomData(snap.data());
    });
    return () => unsubRef.current?.();
  }, [roomId]);

  // ── مؤقت المرحلة ──
  useEffect(() => {
    if (!roomData) return;
    const phase = roomData.gamePhase;
    clearInterval(timerRef.current);

    if (phase === 'role_reveal') {
      setTimerVal(REVEAL_DURATION);
      timerRef.current = setInterval(() => {
        setTimerVal(v => {
          if (v <= 1) { clearInterval(timerRef.current); return 0; }
          return v - 1;
        });
      }, 1000);
    } else if (phase === 'day') {
      setTimerVal(DAY_DURATION);
      timerRef.current = setInterval(() => {
        setTimerVal(v => {
          if (v <= 1) {
            clearInterval(timerRef.current);
            // الوقت انتهى → انتقال للتصويت (المنشئ فقط يُحدّث)
            if (isCreator) _advanceFromDay();
            return 0;
          }
          return v - 1;
        });
      }, 1000);
    } else if (phase === 'night') {
      setTimerVal(NIGHT_DURATION);
      setMyAction(null);
      setActionSubmitted(false);
      timerRef.current = setInterval(() => {
        setTimerVal(v => {
          if (v <= 1) {
            clearInterval(timerRef.current);
            if (isCreator) _resolveNight();
            return 0;
          }
          return v - 1;
        });
      }, 1000);
    }

    return () => clearInterval(timerRef.current);
  }, [roomData?.gamePhase, roomData?.round]);

  // ── استدعاء onGameEnd مرة واحدة عند انتهاء اللعبة ──
  useEffect(() => {
    if (roomData?.gamePhase !== 'finished' || gameEndCalledRef.current) return;
    const winner    = roomData.winner;
    const myRole    = roomData.roles?.[myUid];
    const isMafiaWin = winner === 'mafia';
    const myTeamWon  = (isMafiaWin && myRole === 'mafia') || (!isMafiaWin && myRole !== 'mafia');
    gameEndCalledRef.current = true;
    if (onGameEnd) onGameEnd(myTeamWon);
  }, [roomData?.gamePhase]);

  // ── reset vote/action عند مرحلة جديدة ──
  useEffect(() => {
    setMyVote(null);
    setVoteSubmitted(false);
    setActionSubmitted(false);
    setMyAction(null);
  }, [roomData?.gamePhase, roomData?.round]);

  // ─────────────────────────────────────────
  //  Helper: جلب بيانات الغرفة
  // ─────────────────────────────────────────
  const getRoom = async (rid) => {
    const snap = await getDoc(doc(db, 'mafia_rooms', rid));
    return snap.exists() ? snap.data() : null;
  };

  const updateRoom = async (updates) => {
    await updateDoc(doc(db, 'mafia_rooms', roomId), { ...updates, lastUpdate: Date.now() });
  };

  // ─────────────────────────────────────────
  //  إنشاء غرفة
  // ─────────────────────────────────────────
  const handleCreate = async () => {
    setLoading(true); setError('');
    const code = generateRoomCode();
    const rid = `mafia_${code}`;
    const newRoom = {
      id: rid, code,
      creatorUid: myUid,
      gamePhase: 'lobby',
      round: 0,
      players: [{ uid: myUid, name: myName, alive: true }],
      roles: {},
      votes: {},
      nightActions: {},
      eliminated: [],
      nightResult: null,
      winner: null,
      createdAt: Date.now(),
      lastUpdate: Date.now(),
    };
    try {
      await setDoc(doc(db, 'mafia_rooms', rid), newRoom);
      setRoomCode(code);
      setRoomId(rid);
      setIsCreator(true);
      setScreen('lobby');
    } catch (e) { setError('حدث خطأ، حاول مرة أخرى'); }
    setLoading(false);
  };

  // ─────────────────────────────────────────
  //  الانضمام بكود
  // ─────────────────────────────────────────
  const handleJoin = async () => {
    if (joinCode.trim().length !== 6) { setError('أدخل الكود المكوّن من 6 أحرف'); return; }
    setLoading(true); setError('');
    const rid = `mafia_${joinCode.trim().toUpperCase()}`;
    try {
      const data = await getRoom(rid);
      if (!data) { setError('الغرفة غير موجودة'); setLoading(false); return; }
      if (data.gamePhase !== 'lobby') { setError('اللعبة بدأت بالفعل'); setLoading(false); return; }
      if (data.players.length >= MAX_PLAYERS) { setError('الغرفة ممتلئة'); setLoading(false); return; }
      if (data.players.find(p => p.uid === myUid)) {
        // أنت موجود أصلاً
        setRoomId(rid); setRoomCode(data.code); setIsCreator(data.creatorUid === myUid);
        setScreen('lobby'); setLoading(false); return;
      }
      const updatedPlayers = [...data.players, { uid: myUid, name: myName, alive: true }];
      await updateDoc(doc(db, 'mafia_rooms', rid), { players: updatedPlayers, lastUpdate: Date.now() });
      setRoomId(rid); setRoomCode(data.code); setIsCreator(false);
      setScreen('lobby');
    } catch (e) { setError('فشل الانضمام، تأكد من الكود'); }
    setLoading(false);
  };

  // ─────────────────────────────────────────
  //  بدء اللعبة (المنشئ فقط)
  // ─────────────────────────────────────────
  const handleStart = async () => {
    const data = await getRoom(roomId);
    if (!data) return;
    if (data.players.length < MIN_PLAYERS) {
      Alert.alert('لاعبون غير كافيون', `يحتاج على الأقل ${MIN_PLAYERS} لاعبين لبدء اللعبة`);
      return;
    }
    const roles = assignRoles(data.players);
    await updateDoc(doc(db, 'mafia_rooms', roomId), {
      roles, gamePhase: 'role_reveal', round: 1,
      votes: {}, nightActions: {}, nightResult: null, winner: null,
      lastUpdate: Date.now(),
    });
    setScreen('game');
    onGameReady?.();
  };

  // ─────────────────────────────────────────
  //  انتقال من النهار → تصويت
  // ─────────────────────────────────────────
  const _advanceFromDay = async () => {
    const data = await getRoom(roomId);
    if (!data || data.gamePhase !== 'day') return;
    // إذا لا يوجد تصويت، لا أحد يُطرد
    await updateDoc(doc(db, 'mafia_rooms', roomId), {
      gamePhase: 'voting', lastUpdate: Date.now()
    });
    // بعد 3 ثوانٍ، احسب الأصوات
    setTimeout(() => _resolveVoting(), 3000);
  };

  // ─────────────────────────────────────────
  //  حساب التصويت وطرد اللاعب
  // ─────────────────────────────────────────
  const _resolveVoting = async () => {
    const data = await getRoom(roomId);
    if (!data || data.gamePhase !== 'voting') return;

    const tally = {};
    Object.values(data.votes || {}).forEach(uid => {
      tally[uid] = (tally[uid] || 0) + 1;
    });

    let maxVotes = 0, eliminated = null;
    Object.entries(tally).forEach(([uid, count]) => {
      if (count > maxVotes) { maxVotes = count; eliminated = uid; }
    });

    const alivePlayers = data.players.filter(p => p.alive);
    let newPlayers = data.players.map(p =>
      p.uid === eliminated ? { ...p, alive: false } : p
    );
    let newEliminated = [...(data.eliminated || [])];
    if (eliminated) newEliminated.push(eliminated);

    // فحص الفوز
    const winner = checkWinner(newPlayers, data.roles);
    if (winner) {
      await updateDoc(doc(db, 'mafia_rooms', roomId), {
        players: newPlayers, eliminated: newEliminated,
        gamePhase: 'finished', winner, lastUpdate: Date.now(),
      });
      return;
    }

    await updateDoc(doc(db, 'mafia_rooms', roomId), {
      players: newPlayers, eliminated: newEliminated,
      dayEliminated: eliminated || null,
      gamePhase: 'night', votes: {}, lastUpdate: Date.now(),
    });
  };

  // ─────────────────────────────────────────
  //  حل أحداث الليل
  // ─────────────────────────────────────────
  const _resolveNight = async () => {
    const data = await getRoom(roomId);
    if (!data || data.gamePhase !== 'night') return;

    const actions = data.nightActions || {};
    // أفعال الليل: { uid: { type: 'kill'|'save'|'investigate', target: uid } }

    let mafiaTarget = null;
    let doctorSave = null;
    let detectiveResult = null;
    let detectiveUid = null;

    Object.entries(actions).forEach(([actorUid, action]) => {
      const role = data.roles[actorUid];
      if (role === 'mafia' && action.type === 'kill') mafiaTarget = action.target;
      if (role === 'doctor' && action.type === 'save') doctorSave = action.target;
      if (role === 'detective' && action.type === 'investigate') {
        detectiveResult = data.roles[action.target] || 'citizen';
        detectiveUid = actorUid;
      }
    });

    const actualKill = mafiaTarget && mafiaTarget !== doctorSave ? mafiaTarget : null;

    let newPlayers = data.players.map(p =>
      p.uid === actualKill ? { ...p, alive: false } : p
    );
    let newEliminated = [...(data.eliminated || [])];
    if (actualKill) newEliminated.push(actualKill);

    const nightResultMsg = actualKill
      ? `تم اغتيال ${data.players.find(p => p.uid === actualKill)?.name}`
      : mafiaTarget && mafiaTarget === doctorSave
      ? 'الطبيب أنقذ الضحية الليلة!'
      : 'مرّت الليلة بسلام';

    const winner = checkWinner(newPlayers, data.roles);
    if (winner) {
      await updateDoc(doc(db, 'mafia_rooms', roomId), {
        players: newPlayers, eliminated: newEliminated,
        nightResult: nightResultMsg, gamePhase: 'finished', winner,
        lastUpdate: Date.now(),
      });
      return;
    }

    await updateDoc(doc(db, 'mafia_rooms', roomId), {
      players: newPlayers, eliminated: newEliminated,
      nightResult: nightResultMsg,
      detectiveReveal: detectiveUid ? {
        uid: detectiveUid,
        targetRole: detectiveResult,
        targetUid: Object.values(data.nightActions || {}).find((a, i) =>
          Object.keys(data.nightActions || {})[i] === detectiveUid
        )?.target || null,
      } : null,
      gamePhase: 'night_result',
      lastUpdate: Date.now(),
    });
    // بعد 4 ثوانٍ → نهار جديد
    setTimeout(async () => {
      const d = await getRoom(roomId);
      if (!d || d.gamePhase !== 'night_result') return;
      await updateDoc(doc(db, 'mafia_rooms', roomId), {
        gamePhase: 'day', round: (d.round || 1) + 1,
        votes: {}, nightActions: {}, dayEliminated: null,
        nightResult: null, detectiveReveal: null,
        lastUpdate: Date.now(),
      });
    }, 4500);
  };

  // ─────────────────────────────────────────
  //  فحص الفائز
  // ─────────────────────────────────────────
  function checkWinner(players, roles) {
    const alive = players.filter(p => p.alive);
    const mafiaAlive = alive.filter(p => roles[p.uid] === 'mafia').length;
    const othersAlive = alive.filter(p => roles[p.uid] !== 'mafia').length;
    if (mafiaAlive === 0) return 'citizens';
    if (mafiaAlive >= othersAlive) return 'mafia';
    return null;
  }

  // ─────────────────────────────────────────
  //  تصويت اللاعب (نهار)
  // ─────────────────────────────────────────
  const handleVote = async (targetUidOrPostpone) => {
    if (voteSubmitted) return;
    const data = await getRoom(roomId);
    if (!data || data.gamePhase !== 'day') return;
    const myPlayer = data.players.find(p => p.uid === myUid);
    if (!myPlayer?.alive) return;

    // 'postpone' يُسجَّل كـ null حتى لا يُحسب ضد أحد
    const voteValue = targetUidOrPostpone === 'postpone' ? null : targetUidOrPostpone;
    setMyVote(targetUidOrPostpone);
    setVoteSubmitted(true);

    const newVotes = { ...(data.votes || {}) };
    if (voteValue) newVotes[myUid] = voteValue;
    // التأجيل: نسجل المشاركة دون تصويت
    const newPostpones = { ...(data.postpones || {}) };
    if (!voteValue) newPostpones[myUid] = true;

    await updateRoom({ votes: newVotes, postpones: newPostpones });

    // إذا صوّت الكل (بما فيهم المؤجِّلون) → انتقال للتصويت
    if (isCreator) {
      const alivePlayers = data.players.filter(p => p.alive);
      const totalResponded = Object.keys(newVotes).length + Object.keys(newPostpones).length;
      if (totalResponded >= alivePlayers.length) {
        await _advanceFromDay();
      }
    }
  };

  // ─────────────────────────────────────────
  //  فعل الليل
  // ─────────────────────────────────────────
  const handleNightAction = async (targetUid) => {
    if (actionSubmitted || !roomData) return;
    const myRole = roomData.roles[myUid];
    if (!myRole || myRole === 'citizen') return;
    const myPlayer = roomData.players.find(p => p.uid === myUid);
    if (!myPlayer?.alive) return;

    let type = '';
    if (myRole === 'mafia')      type = 'kill';
    if (myRole === 'doctor')     type = 'save';
    if (myRole === 'detective')  type = 'investigate';

    setMyAction(targetUid);
    setActionSubmitted(true);
    const newActions = {
      ...(roomData.nightActions || {}),
      [myUid]: { type, target: targetUid }
    };
    await updateRoom({ nightActions: newActions });

    // إذا كل الأدوار الفعّالة أكملت → حلّ مبكر
    if (isCreator) {
      const alive = roomData.players.filter(p => p.alive);
      const activeRoles = alive.filter(p => ['mafia', 'doctor', 'detective'].includes(roomData.roles[p.uid]));
      const submitted = Object.keys(newActions).length;
      if (submitted >= activeRoles.length) {
        clearInterval(timerRef.current);
        await _resolveNight();
      }
    }
  };

  // ─────────────────────────────────────────
  //  مغادرة الغرفة
  // ─────────────────────────────────────────
  const handleLeave = async () => {
    setShowLeave(false);
    if (roomId) {
      try {
        if (isCreator && roomData?.gamePhase === 'lobby') {
          await deleteDoc(doc(db, 'mafia_rooms', roomId));
        } else {
          const data = await getRoom(roomId);
          if (data) {
            const newPlayers = data.players.filter(p => p.uid !== myUid);
            await updateDoc(doc(db, 'mafia_rooms', roomId), {
              players: newPlayers, lastUpdate: Date.now()
            });
          }
        }
      } catch (e) {}
    }
    unsubRef.current?.();
    onBack();
  };

  // ═══════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════

  if (screen === 'setup') return (
    <SetupScreen
      theme={theme}
      joinCode={joinCode}
      setJoinCode={setJoinCode}
      loading={loading}
      error={error}
      onBack={onBack}
      onCreate={handleCreate}
      onJoin={handleJoin}
    />
  );

  if (screen === 'lobby') return (
    <LobbyScreen
      theme={theme}
      roomCode={roomCode}
      roomData={roomData}
      isCreator={isCreator}
      myUid={myUid}
      myName={myName}
      minPlayers={MIN_PLAYERS}
      maxPlayers={MAX_PLAYERS}
      onStart={handleStart}
      onLeave={() => setShowLeave(true)}
      showLeave={showLeave}
      onCancelLeave={() => setShowLeave(false)}
      onConfirmLeave={handleLeave}
      onBack={onBack}
      lang={lang}
      roomId={roomId}
      themeId={themeId}
    />
  );

  // Game screen
  if (!roomData) return (
    <View style={[gs.container, { backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator size="large" color={theme.accent} />
    </View>
  );

  const phase = roomData.gamePhase;
  const myRole = roomData.roles?.[myUid];
  const myPlayer = roomData.players?.find(p => p.uid === myUid);
  const alivePlayers = (roomData.players || []).filter(p => p.alive);

  return (
    <View style={[gs.container, { backgroundColor: 'transparent' }]}>
      <StatusBar barStyle={theme.statusBar} />

      {/* زر الخروج + شاشة كبيرة */}
      <View style={gs.exitBtnRow}>
        <ExitButton onPress={() => setShowLeave(true)} />
        <GameInfoButton gameType="mafia" lang={lang} />
        <WebScreenButton
          playerUid={myUid}
          playerName={myName}
          gameType="mafia"
          gameRoomId={roomId || ''}
          getPublicData={() => ({ phase, playersCount: roomData?.players?.length || 0 })}
          themeName={themeId || 'dark'}
        />
      </View>

      {/* ── role_reveal ── */}
      {phase === 'role_reveal' && (
        <RoleRevealPhase
          theme={theme}
          myRole={myRole}
          timerVal={timerVal}
          total={REVEAL_DURATION}
          onReady={() => { if (isCreator && timerVal <= 0) {/* auto-advances */} }}
        />
      )}

      {/* ── day ── */}
      {phase === 'day' && (
        <DayPhase
          theme={theme}
          roomData={roomData}
          myUid={myUid}
          myRole={myRole}
          myPlayer={myPlayer}
          myVote={myVote}
          voteSubmitted={voteSubmitted}
          timerVal={timerVal}
          total={DAY_DURATION}
          onVote={handleVote}
          isCreator={isCreator}
          onForceAdvance={_advanceFromDay}
        />
      )}

      {/* ── voting ── */}
      {phase === 'voting' && (
        <VotingResultPhase theme={theme} roomData={roomData} myUid={myUid} />
      )}

      {/* ── night ── */}
      {phase === 'night' && (
        <NightPhase
          theme={theme}
          roomData={roomData}
          myUid={myUid}
          myRole={myRole}
          myPlayer={myPlayer}
          myAction={myAction}
          actionSubmitted={actionSubmitted}
          timerVal={timerVal}
          total={NIGHT_DURATION}
          onAction={handleNightAction}
          isCreator={isCreator}
          onForceResolve={_resolveNight}
        />
      )}

      {/* ── night_result ── */}
      {phase === 'night_result' && (
        <NightResultPhase theme={theme} roomData={roomData} myUid={myUid} />
      )}

      {/* ── finished ── */}
      {phase === 'finished' && (() => {
        const myRole = roomData.roles?.[myUid];
        return (
          <FinishedPhase
            theme={theme}
            roomData={roomData}
            myUid={myUid}
            myRole={myRole}
            onLeave={() => setShowLeave(true)}
          />
        );
      })()}

      <LeaveModal
        visible={showLeave}
        onCancel={() => setShowLeave(false)}
        onConfirm={handleLeave}
        message="هل تريد مغادرة الغرفة؟"
      />
    </View>
  );
}

// ═══════════════════════════════════════════
//  شاشة الإعداد (إنشاء / انضمام)
// ═══════════════════════════════════════════
function SetupScreen({ theme, joinCode, setJoinCode, loading, error, onBack, onCreate, onJoin }) {
  return (
    <View style={[gs.container, { backgroundColor: 'transparent' }]}>
      <StatusBar barStyle={theme.statusBar} />

      {/* زر الرجوع أعلى يسار */}
      <ExitButton onPress={onBack} />

      <ScrollView contentContainerStyle={gs.setupScroll} showsVerticalScrollIndicator={false}>
        {/* العنوان */}
        <View style={gs.titleWrap}>
          <Text style={gs.titleEmoji}>🕵️</Text>
          <Text style={[gs.titleText, { color: theme.textPrimary }]}>المافيا</Text>
          <Text style={[gs.titleSub, { color: theme.textSecondary }]}>لعبة الاستراتيجية والخداع</Text>
        </View>

        {/* البطاقات الأدوار */}
        <View style={gs.rolesRow}>
          {Object.entries(ROLE_INFO).map(([key, info]) => (
            <View key={key} style={[gs.roleChip, { backgroundColor: info.color + '18', borderColor: info.color + '50' }]}>
              <Text style={{ fontSize: 20 }}>{info.emoji}</Text>
              <Text style={{ color: info.color, fontSize: 11, fontWeight: '700', marginTop: 2 }}>{info.label}</Text>
            </View>
          ))}
        </View>

        {/* إنشاء غرفة */}
        <View style={[gs.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard }]}>
          <Text style={[gs.cardTitle, { color: theme.textPrimary }]}>إنشاء غرفة جديدة</Text>
          <Text style={[gs.cardSub, { color: theme.textSecondary }]}>
            شارك كود الغرفة مع أصدقائك ({MIN_PLAYERS}–{MAX_PLAYERS} لاعبين)
          </Text>
          <ThemedButton onPress={onCreate} disabled={loading} label={loading ? '...' : 'إنشاء غرفة ✦'} variant='primary' size='large' style={gs.btnPrimary} />
        </View>

        {/* انضمام بكود */}
        <View style={[gs.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard }]}>
          <Text style={[gs.cardTitle, { color: theme.textPrimary }]}>الانضمام بكود</Text>
          <TextInput
            style={[gs.codeInput, { backgroundColor: theme.bgInput, color: theme.textPrimary, borderColor: theme.borderCard }]}
            placeholder="أدخل كود الغرفة"
            placeholderTextColor={theme.textMuted}
            value={joinCode}
            onChangeText={t => setJoinCode(t.toUpperCase())}
            maxLength={6}
            autoCapitalize="characters"
            textAlign="center"
          />
          <ThemedButton onPress={onJoin} disabled={loading} label='انضمام' variant='secondary' size='large' style={gs.btnSecondary} />
        </View>

        {error ? <Text style={gs.errorText}>{error}</Text> : null}
      </ScrollView>
    </View>
  );
}

// ═══════════════════════════════════════════
//  شاشة اللوبي
// ═══════════════════════════════════════════
function LobbyScreen({ theme, roomCode, roomData, isCreator, myUid, myName, minPlayers, maxPlayers,
  onStart, onLeave, showLeave, onCancelLeave, onConfirmLeave,
  onBack, lang, roomId, themeId }) {
  const players = roomData?.players || [];
  const canStart = players.length >= minPlayers;

  const copyCode = () => {
    Clipboard.setStringAsync(roomCode);
  };

  return (
    <View style={[gs.container, { backgroundColor: 'transparent' }]}>
      <StatusBar barStyle={theme.statusBar} />

      <View style={gs.exitBtnRow}>
        <ExitButton onPress={onBack} />
        <GameInfoButton gameType="mafia" lang={lang} />
        <WebScreenButton
          playerUid={myUid}
          playerName={myName}
          gameType="mafia"
          gameRoomId={roomId || ''}
          getPublicData={() => ({ phase: 'lobby', playersCount: roomData?.players?.length || 0 })}
          themeName={themeId || 'dark'}
        />
      </View>

      <ScrollView contentContainerStyle={gs.lobbyScroll} showsVerticalScrollIndicator={false}>

        <Text style={[gs.lobbyTitle, { color: theme.textPrimary }]}>صالة الانتظار</Text>
        <Text style={[gs.lobbyGame, { color: theme.textSecondary }]}>🕵️ المافيا</Text>

        {/* كود الغرفة */}
        <ThemedCard onPress={copyCode} style={gs.codeBox}>
          <Text style={[gs.codeLabel, { color: theme.textSecondary }]}>كود الغرفة</Text>
          <Text style={[gs.codeValue, { color: theme.accent }]}>{roomCode}</Text>
          <Text style={[gs.codeCopy, { color: theme.textMuted }]}>اضغط للنسخ 📋</Text>
        </ThemedCard>

        {/* قائمة اللاعبين */}
        <View style={[gs.playerListCard, { backgroundColor: theme.bgCard, borderColor: theme.borderCard }]}>
          <Text style={[gs.sectionTitle, { color: theme.textSecondary }]}>
            اللاعبون ({players.length}/{maxPlayers})
          </Text>
          {players.map((p, i) => (
            <View key={p.uid} style={[gs.lobbyPlayerRow, { borderBottomColor: theme.divider }]}>
              <View style={[gs.lobbyAvatar, { backgroundColor: theme.bgElevated }]}>
                <Text style={{ color: theme.accent, fontWeight: '700', fontSize: 15 }}>
                  {p.name?.slice(0, 2)}
                </Text>
              </View>
              <Text style={[gs.lobbyPlayerName, { color: theme.textPrimary }]}>{p.name}</Text>
              {p.uid === myUid && (
                <View style={[gs.youBadge, { backgroundColor: theme.accentSoft, borderColor: theme.accentBorder }]}>
                  <Text style={{ color: theme.accent, fontSize: 10, fontWeight: '700' }}>أنت</Text>
                </View>
              )}
              {roomData?.creatorUid === p.uid && (
                <View style={[gs.creatorBadge, { backgroundColor: '#f5c51820', borderColor: '#f5c51840' }]}>
                  <Text style={{ color: theme.accent, fontSize: 10, fontWeight: '700' }}>👑 منشئ</Text>
                </View>
              )}
            </View>
          ))}
          {players.length < minPlayers && (
            <Text style={[gs.waitingText, { color: theme.textMuted }]}>
              في انتظار {minPlayers - players.length} لاعبين على الأقل...
            </Text>
          )}
        </View>

        {isCreator && (
          <ThemedButton
            onPress={onStart}
            disabled={!canStart}
            variant={canStart ? 'primary' : 'secondary'}
            size='large'
            style={[gs.btnPrimary, { marginTop: 8 }]}
            label={canStart ? 'بدء اللعبة ▶' : `يحتاج ${minPlayers} لاعبين على الأقل`}
          />
        )}

        {!isCreator && (
          <Text style={[gs.waitingText, { color: theme.textMuted, marginTop: 16, textAlign: 'center' }]}>
            في انتظار المنشئ لبدء اللعبة...
          </Text>
        )}
      </ScrollView>

      <LeaveModal visible={showLeave} onCancel={onCancelLeave} onConfirm={onConfirmLeave}
        message="هل تريد مغادرة الغرفة؟" />
    </View>
  );
}

// ═══════════════════════════════════════════
//  الكشف عن الدور
// ═══════════════════════════════════════════
function RoleRevealPhase({ theme, myRole, timerVal, total }) {
  const info = myRole ? ROLE_INFO[myRole] : ROLE_INFO.citizen;
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, { toValue: 1, tension: 80, friction: 8, useNativeDriver: true }).start();
  }, []);

  return (
    <View style={[gs.phaseContainer, { justifyContent: 'center', alignItems: 'center' }]}>
      <Text style={[gs.phaseLabel, { color: theme.textSecondary }]}>دورك هذه الجولة</Text>
      <Text style={{ color: theme.textMuted, fontSize: 12, marginBottom: 24 }}>
        لا تُظهر هاتفك لأي شخص!
      </Text>
      <Animated.View style={[
        gs.roleRevealCard,
        {
          backgroundColor: info.color + '15',
          borderColor: info.color + '60',
          transform: [{ scale: scaleAnim }]
        }
      ]}>
        <Text style={gs.roleRevealEmoji}>{info.emoji}</Text>
        <Text style={[gs.roleRevealName, { color: info.color }]}>{info.label}</Text>
        <Text style={[gs.roleRevealDesc, { color: theme.textSecondary }]}>{info.desc}</Text>
      </Animated.View>
      <View style={{ marginTop: 32 }}>
        <CircleTimer total={total} remaining={timerVal} color={info.color} theme={theme} />
        <Text style={[gs.timerLabel, { color: theme.textMuted }]}>تبقى حتى انتهاء العرض</Text>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════
//  مرحلة النهار
// ═══════════════════════════════════════════
function DayPhase({ theme, roomData, myUid, myRole, myPlayer, myVote, voteSubmitted,
  timerVal, total, onVote, isCreator, onForceAdvance }) {
  const info = myRole ? ROLE_INFO[myRole] : ROLE_INFO.citizen;
  const alivePlayers = (roomData.players || []).filter(p => p.alive);
  const votesCount = Object.keys(roomData.votes || {}).length;

  // الاختيار المؤقت قبل التأكيد
  const [pendingVote, setPendingVote] = useState(null); // uid | 'postpone'

  const handleSelect = (uid) => {
    if (voteSubmitted) return;
    setPendingVote(uid);
  };

  const handleConfirm = () => {
    if (!pendingVote || voteSubmitted) return;
    onVote(pendingVote); // 'postpone' أو uid
  };

  const pendingPlayer = pendingVote && pendingVote !== 'postpone'
    ? roomData.players?.find(p => p.uid === pendingVote)
    : null;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={gs.phaseScroll} showsVerticalScrollIndicator={false}>
      {/* هيدر */}
      <View style={gs.dayHeader}>
        <View style={[gs.roundBadge, { backgroundColor: theme.accentSoft, borderColor: theme.accentBorder }]}>
          <Text style={{ color: theme.accent, fontWeight: '700' }}>الجولة {roomData.round}</Text>
        </View>
        <CircleTimer total={total} remaining={timerVal} color="#f59e0b" theme={theme} />
      </View>

      <Text style={[gs.phaseLabel, { color: '#f59e0b' }]}>☀️ النهار — وقت النقاش</Text>
      <Text style={[gs.phaseSub, { color: theme.textSecondary }]}>
        من الذي تختار لطرده من المدينة؟ ({votesCount}/{alivePlayers.length} صوّتوا)
      </Text>

      {/* دوري */}
      <View style={[gs.myRoleStrip, { backgroundColor: info.color + '12', borderColor: info.color + '40' }]}>
        <Text style={{ fontSize: 16 }}>{info.emoji}</Text>
        <Text style={[gs.myRoleText, { color: info.color }]}>أنت: {info.label}</Text>
      </View>

      {!myPlayer?.alive && (
        <View style={[gs.deadBanner, { backgroundColor: '#ef444420', borderColor: '#ef444450' }]}>
          <Text style={{ color: '#ef4444', fontWeight: '700' }}>💀 أنت مقصى — يمكنك المشاهدة فقط</Text>
        </View>
      )}

      {myPlayer?.alive && !voteSubmitted && (
        <>
          {/* اللاعبون */}
          <Text style={[gs.sectionTitle, { color: theme.textSecondary, marginTop: 16 }]}>اختر اللاعب</Text>
          <View style={gs.playersGrid}>
            {(roomData.players || []).map(p => {
              const isMe = p.uid === myUid;
              if (!p.alive || isMe) return null;
              return (
                <PlayerAvatar
                  key={p.uid}
                  name={p.name}
                  isEliminated={false}
                  isSelected={pendingVote === p.uid}
                  theme={theme}
                  size={52}
                  onPress={() => handleSelect(p.uid)}
                />
              );
            })}
          </View>

          {/* خيار التأجيل */}
          <ThemedCard
            onPress={() => handleSelect('postpone')}
            style={gs.postponeBtn}
            variant={pendingVote === 'postpone' ? 'accent' : 'default'}
          >
            <Text style={{ fontSize: 20 }}>🕊️</Text>
            <Text style={[gs.postponeText, { color: pendingVote === 'postpone' ? theme.accent : theme.textSecondary }]}>
              تأجيل التصويت للغد
            </Text>
          </ThemedCard>

          {/* زر التأكيد */}
          {pendingVote && (
            <ThemedButton
              onPress={handleConfirm}
              label={pendingVote === 'postpone' ? '✓ تأكيد التأجيل' : `✓ طرد ${pendingPlayer?.name}`}
              variant='primary' size='large'
              style={gs.confirmVoteBtn}
            />
          )}
        </>
      )}

      {/* لاعبون مقصيون — للعرض فقط */}
      {(roomData.players || []).filter(p => !p.alive).length > 0 && (
        <View style={gs.eliminatedRow}>
          {(roomData.players || []).filter(p => !p.alive).map(p => (
            <PlayerAvatar
              key={p.uid}
              name={p.name}
              isEliminated
              theme={theme}
              size={40}
            />
          ))}
        </View>
      )}

      {voteSubmitted && (
        <Text style={[gs.submittedText, { color: theme.success }]}>
          ✓ تم تسجيل صوتك
        </Text>
      )}

      {isCreator && (
        <ThemedButton onPress={onForceAdvance} label='⏩ إنهاء التصويت مبكرًا' variant='ghost' size='small' style={[gs.btnSecondary, { marginTop: 8 }]} />
      )}
    </ScrollView>
  );
}

// ═══════════════════════════════════════════
//  نتيجة التصويت
// ═══════════════════════════════════════════
function VotingResultPhase({ theme, roomData, myUid }) {
  const tally = {};
  Object.values(roomData.votes || {}).forEach(uid => {
    tally[uid] = (tally[uid] || 0) + 1;
  });
  let maxVotes = 0, eliminated = null;
  Object.entries(tally).forEach(([uid, count]) => {
    if (count > maxVotes) { maxVotes = count; eliminated = uid; }
  });
  const eliminatedPlayer = roomData.players?.find(p => p.uid === eliminated);

  return (
    <View style={[gs.phaseContainer, { justifyContent: 'center', alignItems: 'center' }]}>
      <Text style={[gs.phaseLabel, { color: theme.textPrimary }]}>نتيجة التصويت</Text>
      {eliminatedPlayer ? (
        <>
          <Text style={{ fontSize: 64, marginVertical: 16 }}>💀</Text>
          <Text style={[gs.resultName, { color: '#ef4444' }]}>{eliminatedPlayer.name}</Text>
          <Text style={[gs.resultSub, { color: theme.textSecondary }]}>تم طرده بـ {maxVotes} أصوات</Text>
        </>
      ) : (
        <>
          <Text style={{ fontSize: 64, marginVertical: 16 }}>🤷</Text>
          <Text style={[gs.resultSub, { color: theme.textSecondary }]}>لم يحصل أحد على أغلبية الأصوات</Text>
        </>
      )}
      <ActivityIndicator color={theme.accent} style={{ marginTop: 24 }} />
      <Text style={[gs.timerLabel, { color: theme.textMuted }]}>جاري الانتقال للليل...</Text>
    </View>
  );
}

// ═══════════════════════════════════════════
//  مرحلة الليل
// ═══════════════════════════════════════════
function NightPhase({ theme, roomData, myUid, myRole, myPlayer, myAction, actionSubmitted,
  timerVal, total, onAction, isCreator, onForceResolve }) {
  const info = myRole ? ROLE_INFO[myRole] : ROLE_INFO.citizen;
  const isCitizen = myRole === 'citizen' || !myRole;
  const alivePlayers = (roomData.players || []).filter(p => p.alive);

  // الاختيار المؤقت قبل التأكيد
  const [pendingAction, setPendingAction] = useState(null);

  const pendingPlayer = pendingAction
    ? alivePlayers.find(p => p.uid === pendingAction)
    : null;

  const nightPrompt = {
    mafia:      'من تختار لإزالته هذه الليلة؟ 🔪',
    detective:  'من تريد التحقيق معه الليلة؟ 🔍',
    doctor:     'من تريد حمايته من غدر المافيا؟ 💉',
    citizen:    '',
  };

  // رسالة التأكيد المخصصة
  const confirmMessage = () => {
    if (!pendingPlayer) return '';
    if (myRole === 'mafia')
      return `لقد اخترت الذهاب إلى ${pendingPlayer.name} لقتله هذه الليلة 🔪`;
    if (myRole === 'doctor')
      return `لقد اخترت حماية ${pendingPlayer.name} من غدر المافيا 💚`;
    if (myRole === 'detective')
      return `لقد اخترت التحقيق مع ${pendingPlayer.name} 🔍`;
    return '';
  };

  // رسالة بعد التأكيد (actionSubmitted)
  const submittedMessage = () => {
    if (!myAction) return '';
    const target = alivePlayers.find(p => p.uid === myAction)
      || roomData.players?.find(p => p.uid === myAction);
    if (!target) return '';
    if (myRole === 'mafia')
      return `أرسلت المافيا إلى ${target.name}... انتظر نتيجة الليلة 🌑`;
    if (myRole === 'doctor')
      return `ستحرس ${target.name} طوال الليل 💚`;
    if (myRole === 'detective')
      return `جارٍ التحقيق مع ${target.name}... ستعرف النتيجة عند الفجر 🔍`;
    return '';
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={gs.phaseScroll} showsVerticalScrollIndicator={false}>
      <View style={gs.dayHeader}>
        <View style={[gs.roundBadge, { backgroundColor: '#3b82f620', borderColor: '#3b82f640' }]}>
          <Text style={{ color: theme.textPrimary, fontWeight: '700' }}>الجولة {roomData.round}</Text>
        </View>
        <CircleTimer total={total} remaining={timerVal} color="#6366f1" theme={theme} />
      </View>

      <Text style={[gs.phaseLabel, { color: theme.accent }]}>🌙 الليل — الجميع ينام</Text>

      {/* دور الشخص — إيموجي كبير وسط الشاشة */}
      <View style={[gs.nightRoleCard, { backgroundColor: info.color + '10', borderColor: info.color + '40' }]}>
        <Text style={gs.nightRoleEmoji}>{info.emoji}</Text>
        <Text style={[gs.nightRoleLabel, { color: info.color }]}>{info.label}</Text>
      </View>

      {!myPlayer?.alive ? (
        <View style={[gs.deadBanner, { backgroundColor: '#ef444420', borderColor: '#ef444450' }]}>
          <Text style={{ color: '#ef4444', fontWeight: '700' }}>💀 أنت مقصى — في انتظار انتهاء الليل</Text>
        </View>
      ) : isCitizen ? (
        <View style={[gs.citizenNightBanner, { backgroundColor: '#6366f110', borderColor: '#6366f130' }]}>
          <Text style={{ fontSize: 36, textAlign: 'center' }}>😴</Text>
          <Text style={{ color: theme.textSecondary, textAlign: 'center', fontWeight: '600', marginTop: 8, fontSize: 14 }}>
            المواطنون ينامون هذه الليلة...{'\n'}انتظر حتى يحلّ الصباح
          </Text>
        </View>
      ) : actionSubmitted ? (
        /* رسالة بعد التأكيد */
        <View style={[gs.submittedBanner, { backgroundColor: info.color + '12', borderColor: info.color + '40' }]}>
          <Text style={{ color: info.color, fontWeight: '700', fontSize: 14, textAlign: 'center', lineHeight: 22 }}>
            {submittedMessage()}
          </Text>
        </View>
      ) : (
        <>
          <Text style={[gs.phaseSub, { color: theme.textSecondary, marginTop: 4 }]}>
            {nightPrompt[myRole]}
          </Text>

          {/* شبكة اللاعبين بإيموجي مكبّر */}
          <View style={gs.nightPlayersGrid}>
            {alivePlayers
              .filter(p => {
                if (myRole === 'mafia')     return p.uid !== myUid;
                if (myRole === 'detective') return p.uid !== myUid;
                if (myRole === 'doctor')   return true;
                return false;
              })
              .map(p => {
                const isSelected = pendingAction === p.uid;
                return (
                  <ThemedCard
                    key={p.uid}
                    onPress={() => setPendingAction(p.uid)}
                    style={gs.nightPlayerTile}
                    variant={isSelected ? 'accent' : 'default'}
                  >
                    <Text style={gs.nightPlayerEmoji}>🎭</Text>
                    <Text style={[gs.nightPlayerName, { color: theme.textPrimary }]}>{p.name}</Text>
                    {isSelected && (
                      <View style={[gs.nightSelectCheck, { backgroundColor: info.color }]}>
                        <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>✓</Text>
                      </View>
                    )}
                  </ThemedCard>
                );
              })
            }
          </View>

          {/* رسالة التأكيد المعلّقة */}
          {pendingAction && (
            <View style={[gs.pendingConfirmBox, { backgroundColor: info.color + '10', borderColor: info.color + '30' }]}>
              <Text style={[gs.pendingConfirmText, { color: info.color }]}>
                {confirmMessage()}
              </Text>
              <ThemedButton onPress={() => { onAction(pendingAction); }} label='تأكيد الاختيار ✓' variant='primary' size='large' style={gs.confirmNightBtn} />
            </View>
          )}
        </>
      )}

      {isCreator && (
        <ThemedButton onPress={onForceResolve} label='⏩ إنهاء الليل مبكرًا' variant='ghost' size='small' style={[gs.btnSecondary, { marginTop: 12 }]} />
      )}
    </ScrollView>
  );
}

// ═══════════════════════════════════════════
//  نتيجة الليل
// ═══════════════════════════════════════════
function NightResultPhase({ theme, roomData, myUid }) {
  const msg = roomData.nightResult || 'مرّت الليلة بسلام';
  const wasKilled = msg.includes('اغتيال');
  const myRole = roomData.roles?.[myUid];
  const detectiveReveal = roomData.detectiveReveal;
  const isMyDetectiveReveal = detectiveReveal && detectiveReveal.uid === myUid;

  const targetPlayer = isMyDetectiveReveal
    ? roomData.players?.find(p => {
        // نحتاج uid الهدف — نحفظه في detectiveReveal
        return p.uid === detectiveReveal.targetUid;
      })
    : null;
  const isGuilty = detectiveReveal?.targetRole === 'mafia';

  return (
    <View style={[gs.phaseContainer, { justifyContent: 'center', alignItems: 'center' }]}>
      <Text style={[gs.phaseLabel, { color: theme.textPrimary }]}>انتهت الليلة</Text>
      <Text style={{ fontSize: 64, marginVertical: 16 }}>{wasKilled ? '🔪' : '🌅'}</Text>
      <Text style={[gs.resultName, { color: wasKilled ? '#ef4444' : theme.success }]}>{msg}</Text>

      {isMyDetectiveReveal && (
        <View style={[gs.detectiveBanner, { backgroundColor: '#3b82f620', borderColor: '#3b82f650' }]}>
          <Text style={{ color: theme.textPrimary, fontSize: 14, fontWeight: '800', marginBottom: 8 }}>
            🔵 نتيجة التحقيق
          </Text>
          {isGuilty ? (
            <Text style={{ color: theme.textSecondary, fontSize: 15, fontWeight: '700', textAlign: 'center', lineHeight: 24 }}>
              {targetPlayer?.name || 'الهدف'} هو القاتل 🔴
            </Text>
          ) : (
            <Text style={{ color: theme.success, fontSize: 15, fontWeight: '700', textAlign: 'center', lineHeight: 24 }}>
              {targetPlayer?.name || 'الهدف'} ليس قاتلاً ✅
            </Text>
          )}
        </View>
      )}

      <ActivityIndicator color={theme.accent} style={{ marginTop: 24 }} />
      <Text style={[gs.timerLabel, { color: theme.textMuted }]}>جاري الانتقال للنهار...</Text>
    </View>
  );
}

// ═══════════════════════════════════════════
//  شاشة انتهاء اللعبة
// ═══════════════════════════════════════════
function FinishedPhase({ theme, roomData, myUid, myRole, onLeave }) {
  const winner = roomData.winner;
  const isMafiaWin = winner === 'mafia';
  const myRoleInfo = myRole ? ROLE_INFO[myRole] : ROLE_INFO.citizen;
  const myTeamWon = (isMafiaWin && myRole === 'mafia') || (!isMafiaWin && myRole !== 'mafia');

  const allPlayers = roomData.players || [];
  const roles = roomData.roles || {};

  return (
    <ScrollView contentContainerStyle={[gs.phaseScroll, { alignItems: 'center' }]} showsVerticalScrollIndicator={false}>
      {/* النتيجة الرئيسية */}
      <Text style={{ fontSize: 72, marginTop: 32 }}>{myTeamWon ? '🏆' : '😞'}</Text>
      <Text style={[gs.phaseLabel, { color: myTeamWon ? theme.accent : '#ef4444', fontSize: 26 }]}>
        {myTeamWon ? 'فزت!' : 'خسرت!'}
      </Text>
      <View style={[gs.winnerBanner, {
        backgroundColor: isMafiaWin ? '#ef444418' : '#22c55e18',
        borderColor: isMafiaWin ? '#ef444450' : '#22c55e50',
      }]}>
        <Text style={{ fontSize: 32 }}>{isMafiaWin ? '🔴' : '⚪'}</Text>
        <Text style={[gs.winnerText, { color: isMafiaWin ? '#ef4444' : '#22c55e' }]}>
          {isMafiaWin ? 'المافيا انتصرت!' : 'المواطنون انتصروا!'}
        </Text>
      </View>

      {/* كشف أدوار الجميع */}
      <Text style={[gs.sectionTitle, { color: theme.textSecondary, marginTop: 24 }]}>كشف الأدوار</Text>
      <View style={gs.rolesRevealGrid}>
        {allPlayers.map(p => {
          const role = roles[p.uid];
          const info = role ? ROLE_INFO[role] : ROLE_INFO.citizen;
          return (
            <View key={p.uid} style={[
              gs.rolesRevealCard,
              {
                backgroundColor: info.color + '12',
                borderColor: info.color + '40',
              }
            ]}>
              <Text style={{ fontSize: 24 }}>{info.emoji}</Text>
              <Text style={[gs.rolesRevealName, { color: theme.textPrimary }]}>{p.name}</Text>
              <Text style={[gs.rolesRevealRole, { color: info.color }]}>{info.label}</Text>
              {!p.alive && <Text style={{ color: '#ef4444', fontSize: 11 }}>💀 مقصى</Text>}
              {p.uid === myUid && <Text style={{ color: theme.accent, fontSize: 10, fontWeight: '700' }}>أنت</Text>}
            </View>
          );
        })}
      </View>

      <ThemedButton onPress={onLeave} label='العودة للقائمة' variant='primary' size='large' style={[gs.btnPrimary, { marginTop: 24, marginBottom: 40 }]} />
    </ScrollView>
  );
}

// ═══════════════════════════════════════════
//  الستايل العام
// ═══════════════════════════════════════════
function makeStyles(W) { return StyleSheet.create({
  container: { flex: 1, paddingTop: 52 },

  // زر الخروج
  exitBtn: {
    width: 40, height: 40, borderRadius: 12, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  exitBtnRow: {
    position: 'absolute', top: 52, left: 16, zIndex: 99,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },

  // Setup
  setupScroll: { paddingHorizontal: 20, paddingTop: 48, paddingBottom: 40 },
  titleWrap: { alignItems: 'center', marginBottom: 24 },
  titleEmoji: { fontSize: 56 },
  titleText: { fontSize: 32, fontWeight: '800', letterSpacing: 1, marginTop: 8 },
  titleSub: { fontSize: 14, marginTop: 4 },
  rolesRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 24, flexWrap: 'wrap' },
  roleChip: {
    alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1, minWidth: 70,
  },
  card: {
    borderRadius: 16, borderWidth: 1, padding: 20, marginBottom: 16,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  cardSub: { fontSize: 13, marginBottom: 16 },
  codeInput: {
    borderRadius: 12, borderWidth: 1, paddingVertical: 14,
    fontSize: 22, fontWeight: '800', letterSpacing: 6, marginBottom: 12,
  },
  btnPrimary: {
    paddingVertical: 15, borderRadius: 14, alignItems: 'center', marginTop: 4,
  },
  btnSecondary: {
    paddingVertical: 13, borderRadius: 14, alignItems: 'center', borderWidth: 1,
  },
  btnText: { fontSize: 16, fontWeight: '700' },
  errorText: { color: '#ef4444', textAlign: 'center', marginTop: 8, fontSize: 13 },

  // Lobby
  lobbyScroll: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 40 },
  lobbyTitle: { fontSize: 24, fontWeight: '800', textAlign: 'center', marginBottom: 4 },
  lobbyGame: { fontSize: 16, textAlign: 'center', marginBottom: 24 },
  codeBox: {
    borderRadius: 16, borderWidth: 2, padding: 20, alignItems: 'center', marginBottom: 20,
  },
  codeLabel: { fontSize: 13, marginBottom: 4 },
  codeValue: { fontSize: 36, fontWeight: '900', letterSpacing: 10 },
  codeCopy: { fontSize: 11, marginTop: 6 },
  playerListCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '600', marginBottom: 12 },
  lobbyPlayerRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
    borderBottomWidth: 1, gap: 10,
  },
  lobbyAvatar: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
  },
  lobbyPlayerName: { flex: 1, fontSize: 15, fontWeight: '600' },
  youBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1,
  },
  creatorBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1,
  },
  waitingText: { fontSize: 13, textAlign: 'center', paddingVertical: 12 },

  // Game phases
  phaseContainer: { flex: 1, padding: 20 },
  phaseScroll: { padding: 20, paddingTop: 64 },
  phaseLabel: { fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 6 },
  phaseSub: { fontSize: 14, textAlign: 'center', marginBottom: 16 },

  dayHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
  },
  roundBadge: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1,
  },
  myRoleStrip: {
    flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10,
    borderRadius: 12, borderWidth: 1, marginVertical: 8,
  },
  myRoleText: { fontSize: 14, fontWeight: '700' },
  deadBanner: {
    padding: 16, borderRadius: 12, borderWidth: 1, alignItems: 'center', marginVertical: 12,
  },
  submittedBanner: {
    padding: 16, borderRadius: 12, borderWidth: 1, alignItems: 'center', marginVertical: 12,
  },
  playersGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 12,
  },
  submittedText: { textAlign: 'center', marginTop: 12, fontSize: 14, fontWeight: '600' },

  // Role reveal
  roleRevealCard: {
    width: W - 80, borderRadius: 24, borderWidth: 2,
    padding: 32, alignItems: 'center',
  },
  roleRevealEmoji: { fontSize: 64 },
  roleRevealName: { fontSize: 28, fontWeight: '800', marginTop: 12 },
  roleRevealDesc: { fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 22 },

  // Results
  resultName: { fontSize: 20, fontWeight: '800', textAlign: 'center' },
  resultSub: { fontSize: 14, textAlign: 'center', marginTop: 8 },
  timerLabel: { fontSize: 12, textAlign: 'center', marginTop: 8 },
  detectiveBanner: {
    marginTop: 20, padding: 16, borderRadius: 12, borderWidth: 1, width: W - 60, alignItems: 'flex-start',
  },

  // Finished
  winnerBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, borderRadius: 16, borderWidth: 1, marginTop: 16,
  },
  winnerText: { fontSize: 18, fontWeight: '800' },
  rolesRevealGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center',
  },
  rolesRevealCard: {
    width: (W - 60) / 3, borderRadius: 12, borderWidth: 1,
    padding: 12, alignItems: 'center', gap: 2,
  },
  rolesRevealName: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
  rolesRevealRole: { fontSize: 11, fontWeight: '600' },

  // Night phase — إيموجي مكبّر للدور
  nightRoleCard: {
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 20, borderWidth: 1.5,
    paddingVertical: 20, marginBottom: 12,
  },
  nightRoleEmoji: { fontSize: 56 },
  nightRoleLabel: { fontSize: 16, fontWeight: '800', marginTop: 6 },

  nightPlayersGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
    justifyContent: 'center', marginTop: 12,
  },
  nightPlayerTile: {
    width: (W - 60) / 3,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    gap: 6,
  },
  nightPlayerEmoji: { fontSize: 42 },
  nightPlayerName: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
  nightSelectCheck: {
    position: 'absolute', top: 6, right: 6,
    width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },

  // رسالة التأكيد المعلّقة
  pendingConfirmBox: {
    borderRadius: 16, borderWidth: 1,
    padding: 16, marginTop: 14, gap: 12,
  },
  pendingConfirmText: {
    fontSize: 14, fontWeight: '600', lineHeight: 22, textAlign: 'center',
  },
  confirmNightBtn: {
    paddingVertical: 13, borderRadius: 13,
    alignItems: 'center',
  },

  citizenNightBanner: {
    borderRadius: 16, borderWidth: 1,
    padding: 24, marginTop: 12, alignItems: 'center',
  },

  // تصويت النهار
  postponeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 14, paddingHorizontal: 16,
    borderRadius: 14, marginTop: 8,
  },
  postponeText: { fontSize: 14, fontWeight: '600' },
  confirmVoteBtn: {
    paddingVertical: 15, borderRadius: 14,
    alignItems: 'center', marginTop: 12,
  },
  confirmVoteBtnText: { fontSize: 16, fontWeight: '800' },
  eliminatedRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 4,
    justifyContent: 'center', marginTop: 16,
    opacity: 0.6,
  },
});
}
