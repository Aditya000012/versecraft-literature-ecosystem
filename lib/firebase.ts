import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAC80ccKIH-uzaswI8XifUzuQVdCQWRTHM",
  authDomain: "versecraft-efeaa.firebaseapp.com",
  projectId: "versecraft-efeaa",
  storageBucket: "versecraft-efeaa.firebasestorage.app",
  messagingSenderId: "161938560647",
  appId: "1:161938560647:web:668ae5b9a429958b708a22"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
