import { useState, useEffect, useRef } from 'react';
import { db } from './firebaseConfig';
import { doc, setDoc, updateDoc, onSnapshot, getDoc } from 'firebase/firestore';
import { serverManager } from './ServerManager';

export const useOnlineGame = (gameType, currentUser) => {
  const [roomId, setRoomId] = useState(null);
  const [serverId, setServerId] = useState(null);
  const [isPlayer1, setIsPlayer1] = useState(false);
  const [roomData, setRoomData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const unsubRef = useRef(null);
  const botTimeoutRef = useRef(null);

  const myUid = currentUser?.uid || `guest_${Math.random().toString(36).slice(2, 10)}`;
  const myName = currentUser?.name || 'لاعب';

  const findOrCreateRoom = async () => {
    try {
      setLoading(true);
      setError(null);

      // احصل على الـ server المناسب
      const assignedServerId = await serverManager.getServerForGame(gameType);
      setServerId(assignedServerId);

      // ابحث محليّاً (سريع!)
      const waitingRoom = serverManager.findWaitingRoomLocally(
        assignedServerId,
        gameType,
        currentUser?.lang || 'ar'
      );

      if (waitingRoom) {
        console.log(`✅ Found waiting room: ${waitingRoom.id}`);
        setRoomId(waitingRoom.id);
        setIsPlayer1(false);
        listenToRoom(waitingRoom.id);
        setLoading(false);
        return;
      }

      // أنشئ room جديدة
      const newRoomId = `${assignedServerId}_${gameType}_${Date.now()}_${myUid.slice(0, 8)}`;
      const newRoom = {
        id: newRoomId,
        serverId: assignedServerId,
        gameType: gameType,
        lang: currentUser?.lang || 'ar',
        status: 'waiting',
        player1: {
          uid: myUid,
          name: myName,
          score: 0,
          ready: false
        },
        player2: {
          uid: null,
          name: null,
          score: 0,
          ready: false
        },
        createdAt: Date.now(),
        lastUpdate: Date.now()
      };

      await setDoc(doc(db, 'rooms', newRoomId), newRoom);
      serverManager.addRoomToCache(assignedServerId, newRoom);

      setRoomId(newRoomId);
      setIsPlayer1(true);
      setLoading(false);

      // Bot بعد 60 ثانية
      botTimeoutRef.current = setTimeout(async () => {
        try {
          const room = await getDoc(doc(db, 'rooms', newRoomId));
          if (room.exists() && room.data().status === 'waiting' && room.data().player2.uid === null) {
            await updateDoc(doc(db, 'rooms', newRoomId), {
              'player2.uid': 'bot',
              'player2.name': '🤖 Bot',
              'player2.ready': true,
              status: 'started'
            });
          }
        } catch (e) {
          console.error('Bot setup error:', e);
        }
      }, 60000);

      listenToRoom(newRoomId);

    } catch (e) {
      console.error('findOrCreateRoom error:', e);
      setError(e.message || 'حدث خطأ في البحث عن غرفة');
      setLoading(false);
    }
  };

  const listenToRoom = (rId) => {
    try {
      unsubRef.current = onSnapshot(doc(db, 'rooms', rId), (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setRoomData(data);
          
          // إذا انضم اللاعب الثاني
          if (data.player2.uid && data.status === 'started') {
            clearTimeout(botTimeoutRef.current);
          }
        }
      }, (error) => {
        console.error('Listen error:', error);
        setError(error.message);
      });
    } catch (e) {
      console.error('listenToRoom error:', e);
      setError(e.message);
    }
  };

  const updateRoom = async (updates) => {
    if (!roomId) {
      setError('لا توجد غرفة');
      return;
    }
    try {
      await updateDoc(doc(db, 'rooms', roomId), {
        ...updates,
        lastUpdate: Date.now()
      });
    } catch (e) {
      console.error('updateRoom error:', e);
      setError(e.message);
    }
  };

  const joinAsPlayer2 = async () => {
    if (!roomId) {
      setError('لا توجد غرفة');
      return;
    }
    try {
      clearTimeout(botTimeoutRef.current);
      
      await updateDoc(doc(db, 'rooms', roomId), {
        'player2.uid': myUid,
        'player2.name': myName,
        'player2.ready': true,
        status: 'started'
      });
    } catch (e) {
      console.error('joinAsPlayer2 error:', e);
      setError(e.message);
    }
  };

  const endGame = async (scores = {}) => {
    if (!roomId || !serverId) return;
    try {
      await updateDoc(doc(db, 'rooms', roomId), {
        status: 'finished',
        'player1.finalScore': scores.player1 || 0,
        'player2.finalScore': scores.player2 || 0,
        finishedAt: Date.now()
      });

      serverManager.removeRoomFromCache(serverId, roomId);
    } catch (e) {
      console.error('endGame error:', e);
    }
  };

  const leaveRoom = async () => {
    if (!roomId || !serverId) return;
    try {
      await updateDoc(doc(db, 'rooms', roomId), {
        status: 'abandoned',
        abandonedAt: Date.now()
      });

      serverManager.removeRoomFromCache(serverId, roomId);
    } catch (e) {
      console.error('leaveRoom error:', e);
    }
  };

  useEffect(() => {
    findOrCreateRoom();

    return () => {
      unsubRef.current?.();
      clearTimeout(botTimeoutRef.current);
    };
  }, [gameType]);

  return {
    roomId,
    serverId,
    isPlayer1,
    roomData,
    loading,
    error,
    updateRoom,
    joinAsPlayer2,
    endGame,
    leaveRoom
  };
};
