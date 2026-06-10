// هذا الملف تنشئه جديد في مشروعك
// import { serverManager } from './ServerManager.js';

import { db } from './firebaseConfig';
import { collection, doc, setDoc, updateDoc, getDocs, query, where } from 'firebase/firestore';

class ServerManager {
  constructor() {
    this.servers = {};
    this.gameDistribution = {};
    this.localRoomCache = {};
    this.initializeServers();
  }

  // ────────────────────────────────────────
  // 1. تهيئة الـ Servers في Firestore
  // ────────────────────────────────────────
  async initializeServers() {
    // أنشئ 5 servers في Firestore
    const serverConfigs = [
      { id: 'server_1', status: 'active', capacity: 5000, currentLoad: 0 },
      { id: 'server_2', status: 'dormant', capacity: 5000, currentLoad: 0 },
      { id: 'server_3', status: 'dormant', capacity: 5000, currentLoad: 0 },
      { id: 'server_4', status: 'dormant', capacity: 5000, currentLoad: 0 },
      { id: 'server_5', status: 'dormant', capacity: 5000, currentLoad: 0 }
    ];

    for (const config of serverConfigs) {
      await setDoc(doc(db, 'gameServers', config.id), {
        ...config,
        games: config.id === 'server_1' ? 
          ['trivia', 'xo', 'mafia', 'codenames', 'kout', 'biloot', 'domino', 'wordle', 'drawguess', 'manana', 'truthdare', 'neverhaveiever', 'rankfriends', 'actitout'] : 
          [], // باقي الـ servers فارغة
        createdAt: new Date(),
        lastSync: new Date()
      });

      // أنشئ local cache لكل server
      this.localRoomCache[config.id] = new Map();
    }

  }

  // ────────────────────────────────────────
  // 2. البحث المحلي (في الذاكرة)
  // ────────────────────────────────────────
  findWaitingRoomLocally(serverId, gameType, lang) {
    const cache = this.localRoomCache[serverId];
    if (!cache) return null;

    let bestRoom = null;
    let minWaitTime = Infinity;

    for (const room of cache.values()) {
      if (
        room.status === 'waiting' &&
        room.gameType === gameType &&
        room.lang === lang &&
        room.player2 === null
      ) {
        const waitTime = Date.now() - room.createdAt;
        if (waitTime < minWaitTime) {
          minWaitTime = waitTime;
          bestRoom = room;
        }
      }
    }

    return bestRoom; // من الذاكرة = 1-5ms فقط!
  }

  // ────────────────────────────────────────
  // 3. توزيع اللعبة على الـ Server المناسب
  // ────────────────────────────────────────
  async assignGameToServer(gameType) {
    // إذا اللعبة موجودة بالفعل في server
    for (const [serverId, games] of Object.entries(this.gameDistribution)) {
      if (games.includes(gameType)) {
        return serverId;
      }
    }

    // إبحث عن أقل server بحمل
    const servers = await getDocs(collection(db, 'gameServers'));
    let leastLoadedServer = null;
    let minLoad = Infinity;

    servers.forEach(doc => {
      const server = doc.data();
      if (server.status === 'active' && server.currentLoad < minLoad) {
        minLoad = server.currentLoad;
        leastLoadedServer = doc.id;
      }
    });

    if (!leastLoadedServer) {
      // لو كل الـ servers ممتلئة، نشّط server جديد
      await this.activateNextStandbyServer();
      return this.assignGameToServer(gameType); // retry
    }

    // أضيف اللعبة للـ server
    if (!this.gameDistribution[leastLoadedServer]) {
      this.gameDistribution[leastLoadedServer] = [];
    }
    this.gameDistribution[leastLoadedServer].push(gameType);

    // حدّث في Firestore
    await updateDoc(doc(db, 'gameServers', leastLoadedServer), {
      games: this.gameDistribution[leastLoadedServer]
    });

    return leastLoadedServer;
  }

  // ────────────────────────────────────────
  // 4. تنشيط Server احتياطي تلقائياً
  // ────────────────────────────────────────
  async activateNextStandbyServer() {
    const servers = await getDocs(collection(db, 'gameServers'));
    
    for (const doc of servers.docs) {
      if (doc.data().status === 'dormant') {
        const serverId = doc.id;
        
        // غيّر الـ status
        await updateDoc(doc.ref, { status: 'active' });
        
        // ابدأ الـ local cache
        this.localRoomCache[serverId] = new Map();

        return serverId;
      }
    }

    console.error('❌ No dormant servers available!');
    return null;
  }

  // ────────────────────────────────────────
  // 5. مراقبة الحمل وتنشيط servers
  // ────────────────────────────────────────
  async monitorServerLoad() {
    setInterval(async () => {
      const servers = await getDocs(collection(db, 'gameServers'));

      servers.forEach(async (doc) => {
        const serverId = doc.id;
        const server = doc.data();

        // احسب عدد الرومات في هذا السيرفر
        const roomCount = this.localRoomCache[serverId].size;

        // حدّث في Firestore
        await updateDoc(doc.ref, {
          currentLoad: roomCount,
          lastUpdate: new Date()
        });

        // إذا اقتربنا من الـ capacity (80%)
        if (roomCount > server.capacity * 0.8) {

          // نشّط server احتياطي
          await this.activateNextStandbyServer();
        }
      });
    }, 10000); // كل 10 ثواني
  }

  // ────────────────────────────────────────
  // 6. توزيع ذكي عند امتلاء اللعبة
  // ────────────────────────────────────────
  async redistributeGamesIfNeeded() {
    const servers = await getDocs(collection(db, 'gameServers'));
    const activeServers = [];

    servers.forEach(doc => {
      if (doc.data().status === 'active') {
        activeServers.push({
          id: doc.id,
          load: doc.data().currentLoad,
          capacity: doc.data().capacity,
          games: doc.data().games || []
        });
      }
    });

    // احسب المتوسط
    const avgLoad = activeServers.reduce((sum, s) => sum + s.load, 0) / activeServers.length;

    // إذا كان هناك server محمل أكثر من المتوسط بـ 20%
    for (const server of activeServers) {
      if (server.load > avgLoad * 1.2 && server.games.length > 1) {
        // ابحث عن أقل server بحمل
        const leastLoaded = activeServers.sort((a, b) => a.load - b.load)[0];

        if (leastLoaded && leastLoaded.id !== server.id) {
          // ابحث عن لعبة قليلة الحمل
          const gameToMove = server.games[0];
          
          // انقل اللعبة
          server.games = server.games.filter(g => g !== gameToMove);
          leastLoaded.games.push(gameToMove);

          // حدّث في Firestore
          await updateDoc(doc(db, 'gameServers', server.id), {
            games: server.games
          });
          await updateDoc(doc(db, 'gameServers', leastLoaded.id), {
            games: leastLoaded.games
          });

        }
      }
    }
  }

  // ────────────────────────────────────────
  // 7. إضافة room للـ local cache
  // ────────────────────────────────────────
  addRoomToCache(serverId, roomData) {
    if (!this.localRoomCache[serverId]) {
      this.localRoomCache[serverId] = new Map();
    }
    
    this.localRoomCache[serverId].set(roomData.id, {
      id: roomData.id,
      gameType: roomData.gameType,
      lang: roomData.lang,
      player1: roomData.player1,
      player2: roomData.player2 || null,
      status: roomData.status,
      createdAt: Date.now()
    });

  }

  // ────────────────────────────────────────
  // 8. حذف room من الـ local cache
  // ────────────────────────────────────────
  removeRoomFromCache(serverId, roomId) {
    if (this.localRoomCache[serverId]) {
      this.localRoomCache[serverId].delete(roomId);
    }
  }

  // ────────────────────────────────────────
  // 9. الحصول على الـ Server المناسب
  // ────────────────────────────────────────
  async getServerForGame(gameType) {
    // إذا اللعبة موجودة بالفعل
    for (const [serverId, games] of Object.entries(this.gameDistribution)) {
      if (games.includes(gameType)) {
        return serverId;
      }
    }

    // إذا لا، وزّعها على server
    return await this.assignGameToServer(gameType);
  }

  // ────────────────────────────────────────
  // 10. Sync مع Firestore (كل 5 ثواني)
  // ────────────────────────────────────────
  async syncWithFirestore() {
    setInterval(async () => {
      const servers = await getDocs(collection(db, 'gameServers'));

      for (const serverDoc of servers.docs) {
        const serverId = serverDoc.id;
        
        // احصل على الرومات من Firestore
        const roomsSnapshot = await getDocs(
          query(
            collection(db, 'rooms'),
            where('serverId', '==', serverId),
            where('status', '==', 'waiting')
          )
        );

        // حدّث الـ local cache
        this.localRoomCache[serverId].clear();
        roomsSnapshot.forEach(doc => {
          this.localRoomCache[serverId].set(doc.id, doc.data());
        });
      }
    }, 5000); // كل 5 ثواني
  }
}

export const serverManager = new ServerManager();
