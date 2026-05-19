import { initializeApp } from 'firebase/app';
import { getFirestore, getDocs, collection } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDIQ21c2LL4n-rJCKXqPNChv02QK1CIvBM",
  authDomain: "al-maydan-53953.firebaseapp.com",
  projectId: "al-maydan-53953",
  storageBucket: "al-maydan-53953.firebasestorage.app",
  messagingSenderId: "961744403836",
  appId: "1:961744403836:web:81b65856b0c0c6a143f8f9"
};

const app = initializeApp(firebaseConfig);

export const db      = getFirestore(app);
export const auth    = getAuth(app);
export const storage = getStorage(app);

/**
 * يجلب أسئلة فئة واحدة من Firestore
 * @param {string} categoryId
 * @returns {Promise<Array>} questions[]
 */
export async function fetchCategoryQuestions(categoryId) {
  const snap = await getDocs(collection(db, 'categories', categoryId, 'questions'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * يجلب أسئلة مجموعة فئات بالتوازي
 * @param {string[]} categoryIds
 * @returns {Promise<Object>} { [categoryId]: questions[] }
 */
export async function fetchQuestionsForCategories(categoryIds) {
  const results = await Promise.all(
    categoryIds.map(async (id) => {
      const questions = await fetchCategoryQuestions(id);
      return [id, questions];
    })
  );
  return Object.fromEntries(results);
}
