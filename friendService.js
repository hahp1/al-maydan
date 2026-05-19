/**
 * friendService.js
 * ════════════════════════════════════════════════════════════
 * خدمة الأصدقاء والمحادثات
 *
 * Firestore collections:
 *  users/{uid}                          — بيانات المستخدم
 *  friendRequests/{reqId}               — { from, to, status, createdAt }
 *  conversations/{convId}               — { type, members[], name, lastMessage, lastAt }
 *  conversations/{convId}/messages/{id} — { uid, name, text, createdAt }
 */

import { db } from './firebaseConfig';
import {
  collection, doc, setDoc, getDoc, updateDoc, deleteDoc,
  query, where, onSnapshot, addDoc, orderBy,
  serverTimestamp, getDocs, limit,
} from 'firebase/firestore';

// ── مساعد لتوليد ID للمحادثة الثنائية ──
function dmId(uid1, uid2) {
  return [uid1, uid2].sort().join('_');
}

// ════════════════════════════════════════════════════════════
//  البحث عن مستخدمين
// ════════════════════════════════════════════════════════════

/**
 * يبحث في users بالـ username أو الاسم
 * @param {string} queryText
 * @param {string} currentUid — يُستثنى من النتائج
 * @returns {Promise<Array>}
 */
export async function searchUsers(queryText, currentUid) {
  if (!queryText?.trim()) return [];
  const lower = queryText.toLowerCase().trim();
  const results = [];
  const seen = new Set();

  try {
    // بحث بـ username
    const uSnap = await getDocs(query(
      collection(db, 'users'),
      where('username', '>=', lower),
      where('username', '<=', lower + '\uf8ff'),
      limit(15),
    ));
    uSnap.forEach(d => {
      if (d.id !== currentUid && !seen.has(d.id)) {
        seen.add(d.id);
        results.push({ uid: d.id, ...d.data() });
      }
    });

    // بحث بالاسم (إذا لم تمتلئ النتائج)
    if (results.length < 5) {
      const nSnap = await getDocs(query(
        collection(db, 'users'),
        where('name', '>=', queryText),
        where('name', '<=', queryText + '\uf8ff'),
        limit(10),
      ));
      nSnap.forEach(d => {
        if (d.id !== currentUid && !seen.has(d.id)) {
          seen.add(d.id);
          results.push({ uid: d.id, ...d.data() });
        }
      });
    }
  } catch (e) {
    console.warn('[friendService] searchUsers:', e);
  }

  return results;
}

// ════════════════════════════════════════════════════════════
//  طلبات الصداقة
// ════════════════════════════════════════════════════════════

/**
 * إرسال طلب صداقة
 * @param {string} fromUid
 * @param {string} toUid
 * @returns {Promise<{success?: boolean, error?: string}>}
 */
export async function sendFriendRequest(fromUid, toUid) {
  if (!fromUid || !toUid) return { error: 'بيانات ناقصة' };
  try {
    const reqId = `${fromUid}_${toUid}`;
    await setDoc(doc(db, 'friendRequests', reqId), {
      from:      fromUid,
      to:        toUid,
      status:    'pending',
      createdAt: serverTimestamp(),
    });
    return { success: true };
  } catch (e) {
    console.warn('[friendService] sendFriendRequest:', e);
    return { error: e.message };
  }
}

/**
 * الاستماع لطلبات الصداقة الواردة
 * @param {string} uid
 * @param {Function} onData — callback(requests[])
 * @returns {Function} unsubscribe
 */
export function listenIncomingRequests(uid, onData) {
  if (!uid) return () => {};
  const q = query(
    collection(db, 'friendRequests'),
    where('to', '==', uid),
    where('status', '==', 'pending'),
  );
  return onSnapshot(q, (snap) => {
    const reqs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    onData(reqs);
  }, (e) => console.warn('[friendService] listenIncomingRequests:', e));
}

/**
 * قبول طلب صداقة — ينشئ محادثة DM تلقائياً
 * @param {string} reqId
 * @param {string} fromUid
 * @param {string} toUid
 */
export async function acceptFriendRequest(reqId, fromUid, toUid) {
  if (!reqId || !fromUid || !toUid) return;
  try {
    // تحديث الطلب
    await updateDoc(doc(db, 'friendRequests', reqId), { status: 'accepted' });

    // إنشاء محادثة DM إذا لم تكن موجودة
    const convId = dmId(fromUid, toUid);
    const convRef = doc(db, 'conversations', convId);
    const existing = await getDoc(convRef);
    if (!existing.exists()) {
      await setDoc(convRef, {
        type:        'dm',
        members:     [fromUid, toUid],
        lastMessage: '',
        lastAt:      serverTimestamp(),
        createdAt:   serverTimestamp(),
      });
    }
  } catch (e) {
    console.warn('[friendService] acceptFriendRequest:', e);
  }
}

/**
 * رفض / حذف طلب صداقة
 * @param {string} reqId
 */
export async function declineFriendRequest(reqId) {
  if (!reqId) return;
  try {
    await deleteDoc(doc(db, 'friendRequests', reqId));
  } catch (e) {
    console.warn('[friendService] declineFriendRequest:', e);
  }
}

// ════════════════════════════════════════════════════════════
//  المحادثات
// ════════════════════════════════════════════════════════════

/**
 * الاستماع لمحادثات المستخدم
 * @param {string} uid
 * @param {Function} onData — callback(conversations[])
 * @returns {Function} unsubscribe
 */
export function listenConversations(uid, onData) {
  if (!uid) return () => {};
  const q = query(
    collection(db, 'conversations'),
    where('members', 'array-contains', uid),
    orderBy('lastAt', 'desc'),
  );
  return onSnapshot(q, (snap) => {
    const convs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    onData(convs);
  }, (e) => console.warn('[friendService] listenConversations:', e));
}

/**
 * الاستماع لرسائل محادثة
 * @param {string} convId
 * @param {Function} onData — callback(messages[])
 * @returns {Function} unsubscribe
 */
export function listenMessages(convId, onData) {
  if (!convId) return () => {};
  const q = query(
    collection(db, 'conversations', convId, 'messages'),
    orderBy('createdAt', 'asc'),
  );
  return onSnapshot(q, (snap) => {
    const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    onData(msgs);
  }, (e) => console.warn('[friendService] listenMessages:', e));
}

/**
 * إرسال رسالة
 * @param {string} convId
 * @param {string} uid
 * @param {string} name
 * @param {string} text
 */
export async function sendMessage(convId, uid, name, text) {
  if (!convId || !uid || !text?.trim()) return;
  try {
    const msgRef = collection(db, 'conversations', convId, 'messages');
    await addDoc(msgRef, {
      uid,
      name,
      text:      text.trim(),
      createdAt: serverTimestamp(),
    });
    // تحديث آخر رسالة في المحادثة
    await updateDoc(doc(db, 'conversations', convId), {
      lastMessage: text.trim().slice(0, 60),
      lastAt:      serverTimestamp(),
    });
  } catch (e) {
    console.warn('[friendService] sendMessage:', e);
  }
}

// ════════════════════════════════════════════════════════════
//  المجموعات
// ════════════════════════════════════════════════════════════

/**
 * إنشاء محادثة جماعية
 * @param {string} creatorUid
 * @param {string} groupName
 * @param {string[]} memberUids — بدون المنشئ (يُضاف تلقائياً)
 * @returns {Promise<string>} convId
 */
export async function createGroup(creatorUid, groupName, memberUids) {
  if (!creatorUid || !groupName?.trim()) return null;
  try {
    const members = [...new Set([creatorUid, ...memberUids])];
    const convRef = await addDoc(collection(db, 'conversations'), {
      type:        'group',
      name:        groupName.trim(),
      members,
      createdBy:   creatorUid,
      lastMessage: '',
      lastAt:      serverTimestamp(),
      createdAt:   serverTimestamp(),
    });
    return convRef.id;
  } catch (e) {
    console.warn('[friendService] createGroup:', e);
    return null;
  }
}
