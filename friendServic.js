import { db } from './firebaseConfig';
import {
  doc, collection, addDoc, updateDoc, getDoc, getDocs,
  query, where, orderBy, onSnapshot, serverTimestamp, arrayUnion
} from 'firebase/firestore';

// ── طلبات الصداقة ──

export const sendFriendRequest = async (fromUid, toUid) => {
  // منع الطلب المكرر
  const q = query(
    collection(db, 'friendRequests'),
    where('from', '==', fromUid),
    where('to', '==', toUid),
    where('status', '==', 'pending')
  );
  const existing = await getDocs(q);
  if (!existing.empty) return { error: 'طلب مرسل مسبقاً' };

  await addDoc(collection(db, 'friendRequests'), {
    from: fromUid,
    to: toUid,
    status: 'pending',
    createdAt: serverTimestamp(),
  });
  return { success: true };
};

export const acceptFriendRequest = async (requestId, fromUid, toUid) => {
  // تحديث الطلب
  await updateDoc(doc(db, 'friendRequests', requestId), { status: 'accepted' });

  // إضافة كل منهما لقائمة الآخر
  await updateDoc(doc(db, 'users', fromUid), { friends: arrayUnion(toUid) });
  await updateDoc(doc(db, 'users', toUid), { friends: arrayUnion(fromUid) });

  // إنشاء محادثة DM بينهما
  const convRef = await addDoc(collection(db, 'conversations'), {
    type: 'dm',
    members: [fromUid, toUid],
    createdAt: serverTimestamp(),
    lastMessage: '',
    lastMessageAt: serverTimestamp(),
  });
  return convRef.id;
};

export const declineFriendRequest = async (requestId) => {
  await updateDoc(doc(db, 'friendRequests', requestId), { status: 'declined' });
};

// مراقبة الطلبات الواردة
export const listenIncomingRequests = (uid, callback) => {
  const q = query(
    collection(db, 'friendRequests'),
    where('to', '==', uid),
    where('status', '==', 'pending')
  );
  return onSnapshot(q, snapshot => {
    const requests = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(requests);
  });
};

// ── المحادثات ──

export const listenConversations = (uid, callback) => {
  const q = query(
    collection(db, 'conversations'),
    where('members', 'array-contains', uid),
    orderBy('lastMessageAt', 'desc')
  );
  return onSnapshot(q, snapshot => {
    const convs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(convs);
  });
};

export const listenMessages = (conversationId, callback) => {
  const q = query(
    collection(db, 'conversations', conversationId, 'messages'),
    orderBy('createdAt', 'asc')
  );
  return onSnapshot(q, snapshot => {
    const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(msgs);
  });
};

export const sendMessage = async (conversationId, uid, name, text) => {
  await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
    uid,
    name,
    text,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, 'conversations', conversationId), {
    lastMessage: text,
    lastMessageAt: serverTimestamp(),
  });
};

// ── المجموعات ──

export const createGroup = async (creatorUid, groupName, memberUids) => {
  const all = [...new Set([creatorUid, ...memberUids])];
  const ref = await addDoc(collection(db, 'conversations'), {
    type: 'group',
    name: groupName,
    members: all,
    admin: creatorUid,
    createdAt: serverTimestamp(),
    lastMessage: '',
    lastMessageAt: serverTimestamp(),
  });
  return ref.id;
};
