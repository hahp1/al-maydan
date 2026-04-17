import { db } from './firebaseConfig';
import {
  doc, getDoc, setDoc, updateDoc, deleteDoc,
  collection, query, where, getDocs,
  onSnapshot, orderBy, limit,
  serverTimestamp, arrayUnion, arrayRemove,
} from 'firebase/firestore';
import { searchUsers as searchUsersFromService } from './UserService';

// ── إعادة تصدير searchUsers من UserService ──
export { searchUsersFromService as searchUsers };

// ══════════════════════════════
// طلبات الصداقة
// ══════════════════════════════

// إرسال طلب صداقة
export const sendFriendRequest = async (fromUid, toUid) => {
  try {
    if (!fromUid || !toUid || fromUid === toUid) return { error: 'invalid' };

    // تحقق من أنهم ليسوا أصدقاء بالفعل
    const toRef = doc(db, 'users', toUid);
    const toSnap = await getDoc(toRef);
    if (!toSnap.exists()) return { error: 'user_not_found' };

    const toData = toSnap.data();
    if (toData.friends?.includes(fromUid)) return { error: 'already_friends' };

    // إنشاء طلب الصداقة
    const reqId = `${fromUid}_${toUid}`;
    await setDoc(doc(db, 'friendRequests', reqId), {
      from: fromUid,
      to: toUid,
      status: 'pending',
      createdAt: serverTimestamp(),
    });

    return { success: true };
  } catch (e) {
    console.error('sendFriendRequest error:', e);
    return { error: e.message };
  }
};

// الاستماع لطلبات الصداقة الواردة
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

// قبول طلب صداقة
export const acceptFriendRequest = async (requestId, fromUid, toUid) => {
  try {
    // إضافة كل منهما لقائمة أصدقاء الآخر
    await updateDoc(doc(db, 'users', toUid), { friends: arrayUnion(fromUid) });
    await updateDoc(doc(db, 'users', fromUid), { friends: arrayUnion(toUid) });

    // إنشاء محادثة DM
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

    // حذف طلب الصداقة
    await deleteDoc(doc(db, 'friendRequests', requestId));

    return { success: true };
  } catch (e) {
    console.error('acceptFriendRequest error:', e);
    return { error: e.message };
  }
};

// رفض طلب صداقة
export const declineFriendRequest = async (requestId) => {
  try {
    await deleteDoc(doc(db, 'friendRequests', requestId));
    return { success: true };
  } catch (e) {
    console.error('declineFriendRequest error:', e);
    return { error: e.message };
  }
};

// ══════════════════════════════
// المحادثات
// ══════════════════════════════

// الاستماع لمحادثات المستخدم
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

// الاستماع لرسائل محادثة
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

// إرسال رسالة
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

    // تحديث آخر رسالة
    await updateDoc(doc(db, 'conversations', convId), {
      lastMessage: text.trim(),
      lastMessageAt: serverTimestamp(),
    });

    return { success: true };
  } catch (e) {
    console.error('sendMessage error:', e);
    return { error: e.message };
  }
};

// ══════════════════════════════
// المجموعات
// ══════════════════════════════

// إنشاء مجموعة
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
    console.error('createGroup error:', e);
    return { error: e.message };
  }
};
