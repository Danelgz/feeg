import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, deleteDoc, updateDoc, collection, addDoc, query, getDocs, where, orderBy, onSnapshot, arrayUnion, arrayRemove, limit } from 'firebase/firestore';
import { getStorage, ref, uploadString, getDownloadURL } from 'firebase/storage';

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
export const storage = app ? getStorage(app) : null;
export const googleProvider = new GoogleAuthProvider();

let isAuthActionInProgress = false;

export const signInWithGoogle = async () => {
  if (!auth) {
    const errorMsg = 'Firebase Auth no está configurado. Verifica las variables de entorno.';
    console.error(errorMsg);
    return { error: { message: errorMsg, code: 'auth/not-configured' } };
  }

  if (isAuthActionInProgress) return null;
  isAuthActionInProgress = true;

  try {
    const res = await signInWithPopup(auth, googleProvider);
    return res.user;
  } catch (error) {
    // Liberar el estado inmediatamente para permitir reintentos
    isAuthActionInProgress = false;

    // Ignorar error si el usuario simplemente cerró la ventana o canceló el popup
    const isCancelled = error.code === 'auth/popup-closed-by-user' || 
                        error.code === 'auth/cancelled-popup-request' ||
                        error.message?.includes('cancelled-popup-request') ||
                        error.message?.includes('popup-closed-by-user');

    if (isCancelled) {
      console.log('Autenticación cancelada por el usuario');
      return 'cancelled';
    }
    
    console.error('Error al iniciar sesión con Google:', error);
    return { error };
  } finally {
    isAuthActionInProgress = false;
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
  if (!db) throw new Error("No hay conexión a la base de datos");
  
  // Timeout de 10 segundos para Firestore
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error("Error de conexión con la base de datos")), 10000)
  );

  try {
    console.log(`[Firestore] Guardando en: ${path}...`);
    const docRef = doc(db, path);
    const savePromise = setDoc(docRef, data, { merge: true });
    
    await Promise.race([savePromise, timeoutPromise]);
    console.log(`[Firestore] Guardado con éxito en: ${path}`);
  } catch (e) {
    console.error(`[Firestore] Error al guardar en ${path}:`, e.message);
    // No relanzamos el error de timeout para no bloquear la UI permanentemente,
    // pero lo registramos.
    if (e.message?.includes("Error de conexión")) {
      console.warn("[Firestore] El guardado continuará en segundo plano (reintentos de Firebase)");
    } else {
      throw e;
    }
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

export const uploadProfilePhoto = async (uid, dataUrl) => {
  if (!storage || !uid || !dataUrl) {
    console.warn("[Storage] Faltan parámetros para subir foto:", { uid, dataUrl: !!dataUrl });
    return null;
  }
  
  // Timeout de 15 segundos para la subida
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error("Timeout: La operación tardó demasiado")), 15000)
  );

  try {
    const path = `profilePhotos/${uid}/${Date.now()}`;
    console.log(`[Storage] Subiendo imagen a: ${path}...`);
    const storageRef = ref(storage, path);
    
    const uploadTask = uploadString(storageRef, dataUrl, 'data_url');
    
    await Promise.race([uploadTask, timeoutPromise]);
    
    console.log("[Storage] Imagen subida, obteniendo URL...");
    const url = await getDownloadURL(storageRef);
    console.log("[Storage] URL obtenida:", url);
    return url;
  } catch (e) {
    console.error('[Storage] Error al subir foto de perfil:', e.message);
    // Si falla por CORS o Timeout, devolvemos null para que el perfil no se rompa
    return null;
  }
};

export const getPosts = (callback) => {
  if (!db) return () => {};
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(50));
  return onSnapshot(q, (snapshot) => {
    const posts = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    callback(posts);
  });
};

export const likePost = async (postId, userId) => {
  if (!db || !postId) return;
  const postRef = doc(db, "posts", String(postId));
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
  if (!db || !postId) return;
  const postRef = doc(db, "posts", String(postId));
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
  const followerRef = doc(db, "usersPublic", followerId);
  await updateDoc(followerRef, { following: arrayUnion(followedId) });
};

export const unfollowUser = async (followerId, followedId) => {
  if (!db) return;
  const followerRef = doc(db, "usersPublic", followerId);
  await updateDoc(followerRef, { following: arrayRemove(followedId) });
};

export const getFollowersCount = async (userId) => {
  if (!db) return 0;
  const q = query(collection(db, "usersPublic"), where("following", "array-contains", userId));
  const snap = await getDocs(q);
  return snap.size;
};

export const getFollowersList = async (userId) => {
  if (!db) return [];
  const q = query(collection(db, "usersPublic"), where("following", "array-contains", userId));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getFollowingList = async (userId) => {
  if (!db) return [];
  const userDoc = await getDoc(doc(db, "usersPublic", userId));
  if (userDoc.exists()) {
    const followingIds = userDoc.data().following || [];
    if (followingIds.length === 0) return [];
    
    // Fetch user details for each following ID
    const users = [];
    for (const id of followingIds) {
      const uDoc = await getDoc(doc(db, "usersPublic", id));
      if (uDoc.exists()) users.push({ id: uDoc.id, ...uDoc.data() });
    }
    return users;
  }
  return [];
};

export const searchUsers = async (searchTerm) => {
  if (!db) return [];
  try {
    if (!searchTerm || !searchTerm.trim()) {
      // Usar getDocs simple para evitar problemas de índices en carga inicial
      const q = query(collection(db, "usersPublic"), limit(15));
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    }
    
    const searchLower = searchTerm.toLowerCase();
    // Búsqueda aproximada usando prefijo
    const q = query(
      collection(db, "usersPublic"),
      where("usernameLowercase", ">=", searchLower),
      where("usernameLowercase", "<=", searchLower + "\uf8ff"),
      limit(10)
    );
    const snap = await getDocs(q);
    
    if (snap.empty) {
      // Fallback: buscar en todos (si son pocos) o simplemente devolver vacio
      // Según el usuario, prefiere getDocs directo si falla
      const allSnap = await getDocs(collection(db, "usersPublic"));
      return allSnap.docs
        .map(doc => ({ ...doc.data(), id: doc.id }))
        .filter(u => u.usernameLowercase?.includes(searchLower))
        .slice(0, 10);
    }
    
    return snap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  } catch (e) {
    console.error("Error searching users:", e);
    try {
      // Último recurso: getDocs sin filtros (compatible con las nuevas reglas)
      const allSnap = await getDocs(collection(db, "usersPublic"));
      return allSnap.docs.map(doc => ({ ...doc.data(), id: doc.id })).slice(0, 10);
    } catch (err) {
      return [];
    }
  }
};

export const getAllPublicUsers = async () => {
  if (!db) return [];
  const q = query(collection(db, "usersPublic"), limit(20));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
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
  return snap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
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
  return snap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
};

export const likeWorkout = async (workoutId, userId) => {
  if (!db || !workoutId) return;
  const ref = doc(db, "workouts", String(workoutId));
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
  if (!db || !workoutId) return;
  const ref = doc(db, "workouts", String(workoutId));
  await updateDoc(ref, {
    commentsList: arrayUnion({
      ...comment,
      createdAt: comment.createdAt || Date.now()
    })
  });
};
