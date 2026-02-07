import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, query, getDocs, where } from 'firebase/firestore';

// TODO: Replace with your Firebase web config or set env vars
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase only if API key is present to avoid build-time errors
export const app = (firebaseConfig.apiKey && (getApps().length ? getApps()[0] : initializeApp(firebaseConfig))) || null;
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  if (!auth) {
    const errorMsg = 'Firebase Auth no está configurado. Verifica las variables de entorno.';
    console.error(errorMsg);
    if (typeof window !== 'undefined') {
      alert(errorMsg);
    }
    return null;
  }
  try {
    const res = await signInWithPopup(auth, googleProvider);
    return res.user; // FirebaseUser
  } catch (error) {
    console.error('Error al iniciar sesión con Google:', error);
    if (typeof window !== 'undefined') {
      alert(`Error de autenticación: ${error.message}`);
    }
    return null;
  }
};

export const signOutUser = async () => {
  if (auth) {
    await signOut(auth);
  }
};

export const onAuthChange = (cb) => {
  if (auth) {
    return onAuthStateChanged(auth, cb);
  }
  // Return a dummy unsubscribe function if auth is not available
  return () => {};
};

// Helpers de Firestore
export const saveToCloud = async (path, data) => {
  if (!db) return;
  try {
    const docRef = doc(db, path);
    await setDoc(docRef, data, { merge: true });
  } catch (e) {
    console.error("Error saving to cloud:", e);
  }
};

export const getFromCloud = async (path) => {
  if (!db) return null;
  try {
    const docRef = doc(db, path);
    const snap = await getDoc(docRef);
    return snap.exists() ? snap.data() : null;
  } catch (e) {
    console.error("Error fetching from cloud:", e);
    return null;
  }
};
