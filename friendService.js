import { db } from './firebaseConfig';
import {
  doc, getDoc, setDoc, updateDoc, deleteDoc,
  collection, query, where, getDocs,
  onSnapshot, orderBy, limit,
  serverTimestamp, arrayUnion,
} from 'firebase/firestore';

// ══════════════════════════════
// البحث عن مستخدمين
// ══════════════════════════════
export const searchUsers = async (query_text, currentUid) => {
  const results = [];
  const lower = query_text.toLowerCase();
  const q = query(
    collection(db, 'users'),
    where('username', '>=', lower),
    where('username', '<=', lower + '\uf8ff')
  );
  const snap = await getDocs(q);
  snap.forEach(d => {
    if (d.id !== currentUid) results.push(d.data());
  });
  return results;
};

// ══════════════════════════════
// طلبات الصداقة
// ══════════════════════════════
export const sendFriendRequest = async (fromUid, toUid) => {
  try {
    if (!fromUid || !toUid || fromUid === toUid) return { error: 'invalid' };
    const toSnap = await getDoc(doc(db, 'users', toUid));
    if (!toSnap.exists()) return { error: 'user_not_found' };
    const toData = toSnap.data();
    if (toData.friends?.includes(fromUid)) return { error: 'already_friends' };
    const reqId = `${fromUid}_${toUid}`;
    await setDoc(doc(db, 'friendRequests', reqId), {
      from: fromUid,
      to: toUid,
      status: 'pending',
      createdAt: serverTimestamp(),
    });
    return { success: true };
  } catch (e) {
    return { error: e.message };
  }
};

export const listenIncomingRequests = (uid, callback) => {
  if (!uid) return () => {};
  const q = query(
    collection(db, 'friendRequests'),
    where('to', '==', uid),
    where('status', '==', 'pending')
  );
  return onSnapshot(q, async (snap) => {
    const requests = await Promise.all(
      snap.docs.map(async (d) => {
        const data = d.data();
        const fromSnap = await getDoc(doc(db, 'users', data.from));
        return {
          id: d.id,
          ...data,
          fromUser: fromSnap.exists() ? fromSnap.data() : { name: 'مستخدم', uid: data.from },
        };
      })
    );
    callback(requests);
  });
};

export const acceptFriendRequest = async (requestId, fromUid, toUid) => {
  try {
    await updateDoc(doc(db, 'users', toUid), { friends: arrayUnion(fromUid) });
    await updateDoc(doc(db, 'users', fromUid), { friends: arrayUnion(toUid) });
    const convId = [fromUid, toUid].sort().join('_');
    const convRef = doc(db, 'conversations', convId);
    const convSnap = await getDoc(convRef);
    if (!convSnap.exists()) {
      await setDoc(convRef, {
        type: 'dm',
        members: [fromUid, toUid],
        createdAt: serverTimestamp(),
        lastMessage: '',
        lastMessageAt: serverTimestamp(),
      });
    }
    await deleteDoc(doc(db, 'friendRequests', requestId));
    return { success: true };
  } catch (e) {
    return { error: e.message };
  }
};

export const declineFriendRequest = async (requestId) => {
  try {
    await deleteDoc(doc(db, 'friendRequests', requestId));
    return { success: true };
  } catch (e) {
    return { error: e.message };
  }
};

// ══════════════════════════════
// المحادثات
// ══════════════════════════════
export const listenConversations = (uid, callback) => {
  if (!uid) return () => {};
  const q = query(
    collection(db, 'conversations'),
    where('members', 'array-contains', uid),
    orderBy('lastMessageAt', 'desc')
  );
  return onSnapshot(q, (snap) => {
    const convs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(convs);
  });
};

export const listenMessages = (convId, callback) => {
  if (!convId) return () => {};
  const q = query(
    collection(db, 'conversations', convId, 'messages'),
    orderBy('createdAt', 'asc'),
    limit(100)
  );
  return onSnapshot(q, (snap) => {
    const msgs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(msgs);
  });
};

export const sendMessage = async (convId, senderUid, senderName, text) => {
  try {
    if (!text?.trim()) return;
    const msgRef = doc(collection(db, 'conversations', convId, 'messages'));
    await setDoc(msgRef, {
      text: text.trim(),
      sender: senderUid,
      senderName,
      createdAt: serverTimestamp(),
    });
    await updateDoc(doc(db, 'conversations', convId), {
      lastMessage: text.trim(),
      lastMessageAt: serverTimestamp(),
    });
    return { success: true };
  } catch (e) {
    return { error: e.message };
  }
};

// ══════════════════════════════
// المجموعات
// ══════════════════════════════
export const createGroup = async (creatorUid, groupName, memberUids) => {
  try {
    const allMembers = [creatorUid, ...memberUids.filter(u => u !== creatorUid)];
    const convRef = doc(collection(db, 'conversations'));
    await setDoc(convRef, {
      type: 'group',
      name: groupName,
      members: allMembers,
      createdBy: creatorUid,
      createdAt: serverTimestamp(),
      lastMessage: '',
      lastMessageAt: serverTimestamp(),
    });
    return { success: true, convId: convRef.id };
  } catch (e) {
    return { error: e.message };
  }
};
