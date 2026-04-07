import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDIQ21c2LL4n-rJCKXqPNChv02QK1CIvBM",
  authDomain: "al-maydan-53953.firebaseapp.com",
  projectId: "al-maydan-53953",
  storageBucket: "al-maydan-53953.firebasestorage.app",
  messagingSenderId: "961744403836",
  appId: "1:961744403836:web:81b65856b0c0c6a143f8f9"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);