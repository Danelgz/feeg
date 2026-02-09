import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, deleteDoc, updateDoc, collection, addDoc, query, getDocs, where, orderBy, onSnapshot, arrayUnion, arrayRemove, limit } from 'firebase/firestore';
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

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

// 🔐 App Check
if (app && typeof window !== "undefined") {
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(
      process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "6LcGBWUsAAAAAAaenbguA_miuR_KuoRw5JD48LKH"
    ),
    isTokenAutoRefreshEnabled: true,
  });
}

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

export const updateCloud = async (path, data) => {
  if (!db) return;
  try {
    const docRef = doc(db, path);
    await updateDoc(docRef, data);
  } catch (e) {
    console.error("Error updating cloud:", e);
  }
};

export const deleteFromCloud = async (path) => {
  if (!db) return;
  try {
    await deleteDoc(doc(db, path));
  } catch (e) {
    console.error("Error deleting from cloud:", e);
  }
};

export const addToCollection = async (colPath, data) => {
  if (!db) return null;
  try {
    const docRef = await addDoc(collection(db, colPath), {
      ...data,
      createdAt: new Date().toISOString()
    });
    return docRef.id;
  } catch (e) {
    console.error("Error adding to collection:", e);
    return null;
  }
};

export const getPosts = (callback) => {
  if (!db) return () => {};
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(50));
  return onSnapshot(q, (snapshot) => {
    const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(posts);
  });
};

export const likePost = async (postId, userId) => {
  if (!db) return;
  const postRef = doc(db, "posts", postId);
  const postSnap = await getDoc(postRef);
  if (postSnap.exists()) {
    const postData = postSnap.data();
    const likes = postData.likes || [];
    if (likes.includes(userId)) {
      await updateDoc(postRef, { likes: arrayRemove(userId) });
    } else {
      await updateDoc(postRef, { likes: arrayUnion(userId) });
    }
  }
};

export const addComment = async (postId, comment) => {
  if (!db) return;
  const postRef = doc(db, "posts", postId);
  await updateDoc(postRef, {
    comments: arrayUnion({
      ...comment,
      createdAt: new Date().toISOString()
    })
  });
};

// 👥 Sistema de Seguidores
export const followUser = async (followerId, followedId) => {
  if (!db) return;
  const followerRef = doc(db, "users", followerId);
  const followedRef = doc(db, "users", followedId);
  
  await updateDoc(followerRef, { following: arrayUnion(followedId) });
  await updateDoc(followedRef, { followers: arrayUnion(followerId) });
};

export const unfollowUser = async (followerId, followedId) => {
  if (!db) return;
  const followerRef = doc(db, "users", followerId);
  const followedRef = doc(db, "users", followedId);
  
  await updateDoc(followerRef, { following: arrayRemove(followedId) });
  await updateDoc(followedRef, { followers: arrayRemove(followerId) });
};

export const searchUsers = async (searchTerm) => {
  if (!db || !searchTerm) return [];
  const q = query(
    collection(db, "users"),
    where("profile.username", ">=", searchTerm),
    where("profile.username", "<=", searchTerm + "\uf8ff"),
    limit(10)
  );
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getWorkoutsFeed = async (userIds) => {
  if (!db || !userIds || userIds.length === 0) return [];
  const q = query(
    collection(db, "workouts"),
    where("userId", "in", userIds.slice(0, 10)), // Firestore limit
    orderBy("completedAt", "desc"),
    limit(20)
  );
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getUserWorkouts = async (userId) => {
  if (!db || !userId) return [];
  const q = query(
    collection(db, "workouts"),
    where("userId", "==", userId),
    orderBy("completedAt", "desc"),
    limit(50)
  );
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const likeWorkout = async (workoutId, userId) => {
  if (!db) return;
  const ref = doc(db, "workouts", workoutId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const data = snap.data();
    const likes = data.likes || [];
    if (likes.includes(userId)) {
      await updateDoc(ref, { likes: arrayRemove(userId) });
    } else {
      await updateDoc(ref, { likes: arrayUnion(userId) });
    }
  }
};

export const addWorkoutComment = async (workoutId, comment) => {
  if (!db) return;
  const ref = doc(db, "workouts", workoutId);
  await updateDoc(ref, {
    commentsList: arrayUnion({
      ...comment,
      createdAt: new Date().toISOString()
    })
  });
};
