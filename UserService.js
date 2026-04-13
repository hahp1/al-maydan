import { db } from './firebaseConfig';
import {
  doc, getDoc, setDoc, updateDoc,
  collection, query, where, getDocs, serverTimestamp
} from 'firebase/firestore';

// توليد username من الاسم
const generateUsername = (name) => {
  const base = name
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_\u0600-\u06FF]/g, '')
    .slice(0, 16);
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `${base}${suffix}`;
};

// حفظ أو تحديث المستخدم عند الدخول
export const saveUserToFirestore = async ({ uid, name, email, photo }) => {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    const username = generateUsername(name || 'user');
    await setDoc(ref, {
      uid,
      name: name || 'مستخدم',
      email: email || '',
      photo: photo || '',
      username,
      tokens: 30,
      friends: [],
      createdAt: serverTimestamp(),
    });
    return { uid, name, email, photo, username, tokens: 30 };
  } else {
    // تحديث الاسم والصورة فقط
    await updateDoc(ref, { name, photo });
    return { uid, ...snap.data(), name, photo };
  }
};

// جلب مستخدم بالـ uid
export const getUserById = async (uid) => {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
};

// البحث عن مستخدمين بالاسم أو username
export const searchUsers = async (query_text, currentUid) => {
  const results = [];
  const lower = query_text.toLowerCase();

  const usernameQ = query(
    collection(db, 'users'),
    where('username', '>=', lower),
    where('username', '<=', lower + '\uf8ff')
  );
  const snap = await getDocs(usernameQ);
  snap.forEach(d => {
    if (d.id !== currentUid) results.push(d.data());
  });

  return results;
};

// تحديث رصيد التوكن
export const updateTokens = async (uid, tokens) => {
  await updateDoc(doc(db, 'users', uid), { tokens });
};
