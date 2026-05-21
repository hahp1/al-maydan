/**
 * useOnlineGame.js — مُصلَح
 * ════════════════════════════════════════════════
 *  ✅ بدون ServerManager — Firestore مباشرة
 *  ✅ البحث عن غرفة waiting من Firestore
 *  ✅ Bot بعد 60 ثانية
 *  ✅ onSnapshot للمزامنة الفورية
 */

import { useState, useEffect, useRef } from 'react';
import { db } from './firebaseConfig';
import {
  doc, setDoc, updateDoc, onSnapshot, getDoc,
  collection, query, where, limit, getDocs,
} from 'firebase/firestore';

export const useOnlineGame = (gameType, currentUser, onGameReady) => {
  const [roomId,    setRoomId]    = useState(null);
  const [isPlayer1, setIsPlayer1] = useState(false);
  const [roomData,  setRoomData]  = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);

  const unsubRef        = useRef(null);
  const botTimeoutRef   = useRef(null);
  const gameReadyCalled = useRef(false);
  const roomIdRef     = useRef(null); // مرجع ثابت للـ roomId

  const myUid  = currentUser?.uid  || `guest_${Math.random().toString(36).slice(2, 10)}`;
  const myName = currentUser?.name || 'لاعب';

  // ── البحث عن غرفة أو إنشاء واحدة ──────────────────────────
  const findOrCreateRoom = async () => {
    try {
      setLoading(true);
      setError(null);

      // ابحث عن غرفة waiting لنفس نوع اللعبة
      const q = query(
        collection(db, 'rooms'),
        where('gameType', '==', gameType),
        where('status',   '==', 'waiting'),
        limit(1)
      );
      const snap = await getDocs(q);

      if (!snap.empty) {
        // انضم كـ Player2
        const roomDoc = snap.docs[0];
        const rId     = roomDoc.id;

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
        setLoading(false);

      } else {
        // أنشئ غرفة جديدة كـ Player1
        const rId = `${gameType}_${Date.now()}_${myUid.slice(0, 8)}`;

        const newRoom = {
          id:        rId,
          gameType:  gameType,
          status:    'waiting',
          player1: { uid: myUid, name: myName, score: 0, ready: true },
          player2: { uid: null,  name: null,   score: 0, ready: false },
          createdAt:  Date.now(),
          lastUpdate: Date.now(),
        };

        await setDoc(doc(db, 'rooms', rId), newRoom);

        roomIdRef.current = rId;
        setRoomId(rId);
        setIsPlayer1(true);
        listenToRoom(rId);
        setLoading(false);

        // Bot بعد 60 ثانية إذا لم يأتِ لاعب
        botTimeoutRef.current = setTimeout(async () => {
          try {
            const roomSnap = await getDoc(doc(db, 'rooms', rId));
            if (
              roomSnap.exists() &&
              roomSnap.data().status === 'waiting' &&
              !roomSnap.data().player2?.uid
            ) {
              await updateDoc(doc(db, 'rooms', rId), {
                'player2.uid':   'bot',
                'player2.name':  '🤖 Bot',
                'player2.ready': true,
                status:          'started',
                lastUpdate:      Date.now(),
              });
            }
          } catch (e) {
            console.error('Bot setup error:', e);
          }
        }, 60000);
      }

    } catch (e) {
      console.error('findOrCreateRoom error:', e);
      setError(e.message || 'حدث خطأ في البحث عن غرفة');
      setLoading(false);
    }
  };

  // ── الاستماع للغرفة ──────────────────────────────────────
  const listenToRoom = (rId) => {
    unsubRef.current?.(); // إلغاء أي listener سابق
    unsubRef.current = onSnapshot(
      doc(db, 'rooms', rId),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setRoomData(data);
          // إذا انضم لاعب حقيقي → ألغِ Bot timeout
          if (data.player2?.uid && data.player2.uid !== 'bot') {
            clearTimeout(botTimeoutRef.current);
          }
          // اقتطع القلب عند بدء اللعبة الفعلي (لاعب أو بوت جاهز)
          if (data.status === 'started' && !gameReadyCalled.current) {
            gameReadyCalled.current = true;
            onGameReady?.();
          }
        }
      },
      (err) => {
        console.error('Listen error:', err);
        setError(err.message);
      }
    );
  };

  // ── تحديث الغرفة ─────────────────────────────────────────
  const updateRoom = async (updates) => {
    const rId = roomIdRef.current;
    if (!rId) {
      setError('لا توجد غرفة');
      return;
    }
    try {
      await updateDoc(doc(db, 'rooms', rId), {
        ...updates,
        lastUpdate: Date.now(),
      });
    } catch (e) {
      console.error('updateRoom error:', e);
      setError(e.message);
    }
  };

  // ── إنهاء اللعبة ──────────────────────────────────────────
  const endGame = async (scores = {}) => {
    const rId = roomIdRef.current;
    if (!rId) return;
    try {
      await updateDoc(doc(db, 'rooms', rId), {
        status:                'finished',
        'player1.finalScore':  scores.player1 || 0,
        'player2.finalScore':  scores.player2 || 0,
        ...(scores.extra || {}),
        finishedAt:            Date.now(),
        lastUpdate:            Date.now(),
      });
    } catch (e) {
      console.error('endGame error:', e);
    }
  };

  // ── مغادرة الغرفة ────────────────────────────────────────
  const leaveRoom = async () => {
    const rId = roomIdRef.current;
    if (!rId) return;
    try {
      await updateDoc(doc(db, 'rooms', rId), {
        status:      'abandoned',
        abandonedAt: Date.now(),
        lastUpdate:  Date.now(),
      });
    } catch (e) {
      console.error('leaveRoom error:', e);
    }
  };

  // ── joinAsPlayer2 (للاستخدام اليدوي إذا احتجت) ───────────
  const joinAsPlayer2 = async () => {
    const rId = roomIdRef.current;
    if (!rId) { setError('لا توجد غرفة'); return; }
    try {
      clearTimeout(botTimeoutRef.current);
      await updateDoc(doc(db, 'rooms', rId), {
        'player2.uid':   myUid,
        'player2.name':  myName,
        'player2.ready': true,
        status:          'started',
        lastUpdate:      Date.now(),
      });
    } catch (e) {
      console.error('joinAsPlayer2 error:', e);
      setError(e.message);
    }
  };

  // ── Mount / Unmount ────────────────────────────────────────
  useEffect(() => {
    findOrCreateRoom();
    return () => {
      unsubRef.current?.();
      clearTimeout(botTimeoutRef.current);
    };
  }, [gameType]);

  return {
    roomId,
    isPlayer1,
    roomData,
    loading,
    error,
    updateRoom,
    joinAsPlayer2,
    endGame,
    leaveRoom,
  };
};
