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
      tokens: 50,
      friends: [],
      createdAt: serverTimestamp(),
      // ── نظام XP ──
      xp:    0,
      level: 1,
      stats: {
        onlineGamesPlayed: 0,
        onlineWins:        0,
        soloGamesPlayed:   0,
        soloWins:          0,
        totalGamesPlayed:  0,
        gameTypesPlayed:   [],
        streakDays:        0,
        lastPlayedDate:    '',
        gameWins:          {},
      },
    });
    return { uid, name, email, photo, username, tokens: 50, xp: 0, level: 1 };
  } else {
    // تحديث الاسم والصورة فقط إذا كانت القيم غير null/undefined
    const updates = {};
    if (name)  updates.name  = name;
    if (photo) updates.photo = photo;
    if (Object.keys(updates).length > 0) {
      await updateDoc(ref, updates);
    }
    return { uid, ...snap.data(), ...updates };
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
