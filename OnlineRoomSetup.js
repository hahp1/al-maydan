/**
 * useOnlineGame.js — نسخة محدّثة
 * ════════════════════════════════════════════════
 *  ✅ يدعم 3 أوضاع: random | create | join
 *  ✅ friendCode: كود الغرفة للمشاركة (6 حروف عشوائية)
 *  ✅ joinCode: الانضمام بكود صديق
 *  ✅ onGameReady: يُستدعى مرة واحدة عند انضمام اللاعب الثاني
 *  ✅ يبدأ تلقائياً فقط عند mode !== null
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { db } from './firebaseConfig';
import {
  doc, setDoc, updateDoc, onSnapshot, getDoc,
  collection, query, where, getDocs, limit,
} from 'firebase/firestore';

// ── توليد كود غرفة صديق ──────────────────────────────────────
function genFriendCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // بدون O,0,I,1
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * useOnlineGame
 * @param {string}   gameType      — نوع اللعبة ('xo', 'wordle', ...)
 * @param {object}   currentUser   — { uid, name, lang }
 * @param {function} onGameReady   — يُستدعى عند بدء المباراة فعلياً
 * @param {string|null} mode       — null | 'random' | 'create' | 'join'
 * @param {string|null} joinCode   — كود الغرفة عند mode==='join'
 */
export const useOnlineGame = (gameType, currentUser, onGameReady, mode, joinCode) => {
  const [roomId,     setRoomId]     = useState(null);
  const [isPlayer1,  setIsPlayer1]  = useState(false);
  const [roomData,   setRoomData]   = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);
  const [friendCode, setFriendCode] = useState(null);

  const unsubRef       = useRef(null);
  const botTimeoutRef  = useRef(null);
  const gameReadyFired = useRef(false);

  const myUid  = currentUser?.uid  || `guest_${Math.random().toString(36).slice(2, 10)}`;
  const myName = currentUser?.name || 'لاعب';
  const myLang = currentUser?.lang || 'ar';

  // ── مراقبة الغرفة ───────────────────────────────────────────
  const listenToRoom = useCallback((rId) => {
    unsubRef.current?.();
    unsubRef.current = onSnapshot(doc(db, 'rooms', rId), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      setRoomData(data);

      // onGameReady: عند انضمام اللاعب الثاني (مرة واحدة فقط)
      const bothJoined = data.player2?.uid && data.status === 'started';
      if (bothJoined && !gameReadyFired.current) {
        gameReadyFired.current = true;
        clearTimeout(botTimeoutRef.current);
        onGameReady?.();
      }
    }, (err) => {
      setError(err.message);
    });
  }, [onGameReady]);

  // ── وضع عشوائي ──────────────────────────────────────────────
  const startRandom = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      gameReadyFired.current = false;

      // ابحث عن غرفة منتظرة
      const q = query(
        collection(db, 'rooms'),
        where('gameType', '==', gameType),
        where('status',   '==', 'waiting'),
        where('lang',     '==', myLang),
        where('isFriend', '==', false),
        limit(1)
      );
      const snap = await getDocs(q);

      if (!snap.empty) {
        const existingRoom = snap.docs[0];
        const rId = existingRoom.id;
        await updateDoc(doc(db, 'rooms', rId), {
          'player2.uid':   myUid,
          'player2.name':  myName,
          'player2.ready': true,
          status:          'started',
          startedAt:       Date.now(),
        });
        setRoomId(rId);
        setIsPlayer1(false);
        listenToRoom(rId);
      } else {
        // أنشئ غرفة جديدة
        const rId    = `${gameType}_${Date.now()}_${myUid.slice(0, 6)}`;
        const newRoom = {
          gameType, status: 'waiting', isFriend: false, lang: myLang,
          player1: { uid: myUid, name: myName, score: 0, ready: true },
          player2: { uid: null,  name: null,   score: 0, ready: false },
          createdAt: Date.now(), lastUpdate: Date.now(),
        };
        await setDoc(doc(db, 'rooms', rId), newRoom);
        setRoomId(rId);
        setIsPlayer1(true);
        listenToRoom(rId);

        // بوت بعد 60 ثانية
        botTimeoutRef.current = setTimeout(async () => {
          try {
            const room = await getDoc(doc(db, 'rooms', rId));
            if (room.exists() && room.data().status === 'waiting') {
              await updateDoc(doc(db, 'rooms', rId), {
                'player2.uid':   'bot',
                'player2.name':  '🤖 Bot',
                'player2.ready': true,
                status:          'started',
                startedAt:       Date.now(),
              });
            }
          } catch (_) {}
        }, 60000);
      }
      setLoading(false);
    } catch (e) {
      setError(e.message || 'خطأ في البحث');
      setLoading(false);
    }
  }, [gameType, myUid, myName, myLang, listenToRoom]);

  // ── إنشاء غرفة صديق ─────────────────────────────────────────
  const startCreate = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      gameReadyFired.current = false;

      const code = genFriendCode();
      const rId  = `friend_${gameType}_${code}`;
      const newRoom = {
        gameType, status: 'waiting', isFriend: true, friendCode: code, lang: myLang,
        player1: { uid: myUid, name: myName, score: 0, ready: true },
        player2: { uid: null,  name: null,   score: 0, ready: false },
        createdAt: Date.now(), lastUpdate: Date.now(),
      };
      await setDoc(doc(db, 'rooms', rId), newRoom);
      setFriendCode(code);
      setRoomId(rId);
      setIsPlayer1(true);
      listenToRoom(rId);
      setLoading(false);
    } catch (e) {
      setError(e.message || 'خطأ في إنشاء الغرفة');
      setLoading(false);
    }
  }, [gameType, myUid, myName, myLang, listenToRoom]);

  // ── الانضمام بكود ────────────────────────────────────────────
  const startJoin = useCallback(async (code) => {
    try {
      setLoading(true);
      setError(null);
      gameReadyFired.current = false;

      const rId  = `friend_${gameType}_${code.trim().toUpperCase()}`;
      const snap = await getDoc(doc(db, 'rooms', rId));
      const roomSnap = snap.exists() ? snap.data() : null;

      if (!roomSnap || roomSnap.status !== 'waiting') {
        setError('الغرفة غير موجودة أو امتلأت');
        setLoading(false);
        return;
      }
      // التحقق من نوع اللعبة
      if (roomSnap.gameType && roomSnap.gameType !== gameType) {
        setError('هذا الكود لنوع لعبة مختلف');
        setLoading(false);
        return;
      }

      await updateDoc(doc(db, 'rooms', rId), {
        'player2.uid':   myUid,
        'player2.name':  myName,
        'player2.ready': true,
        status:          'started',
        startedAt:       Date.now(),
      });
      setRoomId(rId);
      setIsPlayer1(false);
      listenToRoom(rId);
      setLoading(false);
    } catch (e) {
      setError(e.message || 'خطأ في الانضمام');
      setLoading(false);
    }
  }, [gameType, myUid, myName, listenToRoom]);

  // ── تشغيل تلقائي عند تغيير mode ─────────────────────────────
  useEffect(() => {
    if (!mode) return; // انتظر حتى يختار اللاعب الوضع
    if (mode === 'random') startRandom();
    if (mode === 'create') startCreate();
    if (mode === 'join' && joinCode) startJoin(joinCode);
    return () => {
      unsubRef.current?.();
      clearTimeout(botTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, joinCode, startRandom, startCreate, startJoin]);

  // ── تحديث الغرفة ────────────────────────────────────────────
  const updateRoom = useCallback(async (updates) => {
    if (!roomId) return;
    try {
      await updateDoc(doc(db, 'rooms', roomId), {
        ...updates, lastUpdate: Date.now(),
      });
    } catch (e) { setError(e.message); }
  }, [roomId]);

  // ── إنهاء اللعبة ────────────────────────────────────────────
  const endGame = useCallback(async (scores = {}) => {
    if (!roomId) return;
    try {
      await updateDoc(doc(db, 'rooms', roomId), {
        status: 'finished',
        'player1.finalScore': scores.player1 || 0,
        'player2.finalScore': scores.player2 || 0,
        finishedAt: Date.now(),
      });
    } catch (_) {}
    unsubRef.current?.();
  }, [roomId]);

  // ── مغادرة الغرفة ───────────────────────────────────────────
  const leaveRoom = useCallback(async () => {
    if (!roomId) return;
    try {
      await updateDoc(doc(db, 'rooms', roomId), {
        status: 'abandoned', abandonedAt: Date.now(),
      });
    } catch (_) {}
    unsubRef.current?.();
    clearTimeout(botTimeoutRef.current);
  }, [roomId]);

  return {
    roomId, isPlayer1, roomData, loading, error, friendCode,
    updateRoom, endGame, leaveRoom,
  };
};
