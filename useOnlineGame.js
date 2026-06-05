/**
 * useOnlineGame.js
 * ════════════════════════════════════════════════
 *  ✅ ثلاثة أوضاع:
 *     mode: 'random'        → يبحث عن لاعب تلقائياً (بوت بعد 60 ثانية)
 *     mode: 'create'        → ينشئ غرفة بكود 6 أحرف وينتظر صديق (لا بوت)
 *     mode: 'join', code    → ينضم إلى غرفة صديق بالكود
 *
 *  ✅ يُعاد تشغيله عند تغيير mode (لا يبدأ تلقائياً إذا mode === null)
 *  ✅ friendCode متاح للعرض في الـ UI عند وضع create
 *  ✅ onGameReady يُستدعى مرة واحدة فقط عند بدء اللعبة الفعلي
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { db } from './firebaseConfig';
import {
  doc, setDoc, updateDoc, onSnapshot, getDoc,
  collection, query, where, limit, getDocs,
} from 'firebase/firestore';

function genFriendCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export const useOnlineGame = (gameType, currentUser, onGameReady, mode = 'random', joinCode = null) => {
  const [roomId,     setRoomId]     = useState(null);
  const [isPlayer1,  setIsPlayer1]  = useState(false);
  const [roomData,   setRoomData]   = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);
  const [friendCode, setFriendCode] = useState(null); // يُعرض للمنشئ

  const unsubRef        = useRef(null);
  const botTimeoutRef   = useRef(null);
  const gameReadyCalled = useRef(false);
  const roomIdRef       = useRef(null);
  const modeRef         = useRef(mode);

  const myUid  = currentUser?.uid  || `guest_${Math.random().toString(36).slice(2, 10)}`;
  const myName = currentUser?.name || 'لاعب';

  // ── الاستماع للغرفة ──────────────────────────────────────────
  const listenToRoom = useCallback((rId) => {
    unsubRef.current?.();
    unsubRef.current = onSnapshot(
      doc(db, 'rooms', rId),
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        setRoomData(data);

        // إلغاء Bot timeout إذا انضم لاعب حقيقي
        if (data.player2?.uid && data.player2.uid !== 'bot') {
          clearTimeout(botTimeoutRef.current);
        }

        // استدعاء onGameReady مرة واحدة فقط
        if (data.status === 'started' && !gameReadyCalled.current) {
          gameReadyCalled.current = true;
          onGameReady?.();
        }
      },
      (err) => {
        console.error('useOnlineGame listen error:', err);
        setError(err.message);
      }
    );
  }, [onGameReady]);

  // ── وضع عشوائي ───────────────────────────────────────────────
  const startRandom = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const q = query(
        collection(db, 'rooms'),
        where('gameType', '==', gameType),
        where('status',   '==', 'waiting'),
        where('mode',     '==', 'random'),
        limit(1)
      );
      const snap = await getDocs(q);

      if (!snap.empty) {
        // انضم كـ Player2
        const rId = snap.docs[0].id;
        await updateDoc(doc(db, 'rooms', rId), {
          'player2.uid':   myUid,
          'player2.name':  myName,
          'player2.ready': true,
          status:          'started',
          lastUpdate:      Date.now(),
        });
        roomIdRef.current = rId;
        setRoomId(rId);
        setIsPlayer1(false);
        listenToRoom(rId);
      } else {
        // أنشئ غرفة جديدة
        const rId = `${gameType}_rnd_${Date.now()}_${myUid.slice(0, 8)}`;
        await setDoc(doc(db, 'rooms', rId), {
          id:        rId,
          gameType,
          mode:      'random',
          status:    'waiting',
          player1:   { uid: myUid, name: myName, score: 0, ready: true },
          player2:   { uid: null,  name: null,   score: 0, ready: false },
          createdAt:  Date.now(),
          lastUpdate: Date.now(),
        });
        roomIdRef.current = rId;
        setRoomId(rId);
        setIsPlayer1(true);
        listenToRoom(rId);

        // بوت بعد 60 ثانية
        botTimeoutRef.current = setTimeout(async () => {
          try {
            const s = await getDoc(doc(db, 'rooms', rId));
            if (s.exists() && s.data().status === 'waiting' && !s.data().player2?.uid) {
              await updateDoc(doc(db, 'rooms', rId), {
                'player2.uid':   'bot',
                'player2.name':  '🤖 Bot',
                'player2.ready': true,
                status:          'started',
                lastUpdate:      Date.now(),
              });
            }
          } catch (e) { console.error('bot error:', e); }
        }, 60000);
      }
    } catch (e) {
      console.error('startRandom error:', e);
      setError(e.message || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  }, [gameType, myUid, myName, listenToRoom]);

  // ── إنشاء غرفة بكود ──────────────────────────────────────────
  const startCreate = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const code = genFriendCode();
      const rId  = `${gameType}_fr_${code}`;

      await setDoc(doc(db, 'rooms', rId), {
        id:         rId,
        gameType,
        mode:       'friend',
        friendCode: code,
        status:     'waiting',
        player1:    { uid: myUid, name: myName, score: 0, ready: true },
        player2:    { uid: null,  name: null,   score: 0, ready: false },
        createdAt:  Date.now(),
        lastUpdate: Date.now(),
      });

      roomIdRef.current = rId;
      setRoomId(rId);
      setIsPlayer1(true);
      setFriendCode(code);
      listenToRoom(rId);
      // لا بوت في وضع الصديق
    } catch (e) {
      console.error('startCreate error:', e);
      setError(e.message || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  }, [gameType, myUid, myName, listenToRoom]);

  // ── الانضمام بكود ────────────────────────────────────────────
  const startJoin = useCallback(async (code) => {
    try {
      setLoading(true);
      setError(null);

      const normalCode = (code || '').trim().toUpperCase();
      if (normalCode.length < 4) {
        setError('كود غير صحيح');
        setLoading(false);
        return;
      }

      // ابحث بالكود
      const q = query(
        collection(db, 'rooms'),
        where('friendCode', '==', normalCode),
        where('status',     '==', 'waiting'),
        limit(1)
      );
      const snap = await getDocs(q);

      if (snap.empty) {
        setError('لم يتم العثور على الغرفة — تأكد من الكود');
        setLoading(false);
        return;
      }

      const rId = snap.docs[0].id;
      const data = snap.docs[0].data();

      // منع انضمام نفس اللاعب مرتين
      if (data.player1?.uid === myUid) {
        setError('أنت منشئ هذه الغرفة');
        setLoading(false);
        return;
      }

      await updateDoc(doc(db, 'rooms', rId), {
        'player2.uid':   myUid,
        'player2.name':  myName,
        'player2.ready': true,
        status:          'started',
        lastUpdate:      Date.now(),
      });

      roomIdRef.current = rId;
      setRoomId(rId);
      setIsPlayer1(false);
      listenToRoom(rId);
    } catch (e) {
      console.error('startJoin error:', e);
      setError(e.message || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  }, [gameType, myUid, myName, listenToRoom]);

  // ── تشغيل حسب الوضع ─────────────────────────────────────────
  useEffect(() => {
    if (!mode) return; // لا تبدأ حتى يختار المستخدم
    modeRef.current = mode;
    gameReadyCalled.current = false;

    if (mode === 'random')  startRandom();
    if (mode === 'create')  startCreate();
    if (mode === 'join')    startJoin(joinCode);

    return () => {
      unsubRef.current?.();
      clearTimeout(botTimeoutRef.current);
    };
  }, [mode, joinCode]);

  // ── تحديث الغرفة ─────────────────────────────────────────────
  const updateRoom = useCallback(async (updates) => {
    const rId = roomIdRef.current;
    if (!rId) { setError('لا توجد غرفة'); return; }
    try {
      await updateDoc(doc(db, 'rooms', rId), { ...updates, lastUpdate: Date.now() });
    } catch (e) {
      console.error('updateRoom error:', e);
      setError(e.message);
    }
  }, []);

  // ── إنهاء اللعبة ──────────────────────────────────────────────
  const endGame = useCallback(async (scores = {}) => {
    const rId = roomIdRef.current;
    if (!rId) return;
    try {
      await updateDoc(doc(db, 'rooms', rId), {
        status:                'finished',
        'player1.finalScore':  scores.player1 || 0,
        'player2.finalScore':  scores.player2 || 0,
        ...(scores.extra || {}),
        finishedAt:  Date.now(),
        lastUpdate:  Date.now(),
      });
    } catch (e) { console.error('endGame error:', e); }
  }, []);

  // ── مغادرة الغرفة ────────────────────────────────────────────
  const leaveRoom = useCallback(async () => {
    const rId = roomIdRef.current;
    if (!rId) return;
    try {
      await updateDoc(doc(db, 'rooms', rId), {
        status:      'abandoned',
        abandonedAt: Date.now(),
        lastUpdate:  Date.now(),
      });
    } catch (e) { console.error('leaveRoom error:', e); }
  }, []);

  // للتوافق مع الاستخدام القديم (joinAsPlayer2)
  const joinAsPlayer2 = useCallback(async () => {
    const rId = roomIdRef.current;
    if (!rId) return;
    try {
      await updateDoc(doc(db, 'rooms', rId), {
        'player2.uid':   myUid,
        'player2.name':  myName,
        'player2.ready': true,
        status:          'started',
        lastUpdate:      Date.now(),
      });
    } catch (e) { console.error('joinAsPlayer2 error:', e); }
  }, [myUid, myName]);

  return {
    roomId,
    isPlayer1,
    roomData,
    loading,
    error,
    friendCode,   // ← الكود المُنشأ (يُعرض للمنشئ)
    updateRoom,
    joinAsPlayer2,
    endGame,
    leaveRoom,
  };
};
