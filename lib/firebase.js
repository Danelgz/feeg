import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, deleteDoc, updateDoc, collection, addDoc, query, getDocs, where, orderBy, onSnapshot, arrayUnion, arrayRemove, limit, startAfter, writeBatch } from 'firebase/firestore';
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
// initializeAuth con persistencia explícita se probó para mejorar la fiabilidad del redirect
// en Safari/iOS, pero se revirtió: Next.js ejecuta este módulo también en el servidor (SSR),
// donde no existe indexedDB/window, y eso dejaba el auth en un estado inválido que rompía
// CUALQUIER llamada real (signInWithPopup, getRedirectResult) con "auth/argument-error" en
// producción. getAuth() simple es seguro tanto en servidor como en cliente.
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
export const storage = app ? getStorage(app) : null;
export const googleProvider = new GoogleAuthProvider();
// Sin esto, si el navegador/dispositivo ya tiene una única sesión de Google activa, Firebase
// la reutiliza directamente sin preguntar — el usuario puede terminar logueado con una cuenta
// que no quería. Forzamos el selector de cuenta siempre.
googleProvider.setCustomParameters({ prompt: 'select_account' });

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
    try {
      // Preferimos popup siempre: a diferencia de signInWithRedirect, no depende de un
      // traspaso de almacenamiento entre vuestro dominio y *.firebaseapp.com, que es justo lo
      // que la protección anti-tracking de Safari/iOS suele romper (el login se completa en
      // Google pero el resultado nunca vuelve a la app). Solo caemos a redirect si el propio
      // navegador bloquea el popup o no lo soporta.
      const res = await signInWithPopup(auth, googleProvider);
      return res.user;
    } catch (popupError) {
      // Ignorar error si el usuario simplemente cerró la ventana o canceló el popup
      const isCancelled = popupError.code === 'auth/popup-closed-by-user' ||
                          popupError.code === 'auth/cancelled-popup-request' ||
                          popupError.message?.includes('cancelled-popup-request') ||
                          popupError.message?.includes('popup-closed-by-user');
      if (isCancelled) {
        console.log('Autenticación cancelada por el usuario');
        return 'cancelled';
      }

      const shouldFallbackToRedirect =
        popupError.code === 'auth/popup-blocked' ||
        popupError.code === 'auth/operation-not-supported-in-this-environment';

      if (shouldFallbackToRedirect) {
        await signInWithRedirect(auth, googleProvider);
        return 'redirecting';
      }

      throw popupError;
    }
  } catch (error) {
    console.error('Error al iniciar sesión con Google:', error);
    return { error };
  } finally {
    isAuthActionInProgress = false;
  }
};

// Recoge el resultado de signInWithRedirect al volver de Google (móvil). Debe llamarse una
// vez al arrancar la app para poder mostrar un error si el login por redirect falla; si no
// hubo redirect pendiente, devuelve null sin más.
export const getGoogleRedirectResult = async () => {
  if (!auth) return null;
  try {
    const res = await getRedirectResult(auth);
    return res ? res.user : null;
  } catch (error) {
    console.error('Error al procesar el resultado del redirect de Google:', error);
    return { error };
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

// Margen bajo el límite real de 500 operaciones por batch de Firestore.
const BATCH_CHUNK_SIZE = 450;

const chunkArray = (arr, size) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
};

/**
 * El id local de un entrenamiento (Date.now() al terminarlo, o Date.parse(fecha)+índice al
 * importarlo de Hevy) NO incluye nada del usuario. Si dos cuentas distintas importan el mismo
 * CSV (fechas de entrenamiento idénticas), generan exactamente los mismos ids — y como el
 * documento público vivía en `workouts/{id}` a secas, la segunda cuenta intentaba escribir o
 * borrar un documento cuyo dueño real era la otra cuenta. Las reglas de Firestore lo deniegan,
 * y como esas escrituras van en un batch (todo o nada), UN solo id en conflicto tiraba abajo
 * el lote entero sin avisar. Prefijar con el uid hace que la colisión sea imposible.
 */
export const getPublicWorkoutDocId = (uid, localId) => `${uid}_${localId}`;

/**
 * Publica un lote de entrenamientos importados en el feed público (`workouts/{uid}_{id}`) y
 * guarda el historial completo en el perfil (`users/{uid}`) usando batches atómicos de
 * Firestore en vez de un setDoc individual por documento — disparar cientos de escrituras
 * concurrentes es poco fiable (compiten por conexión, se cortan si el usuario navega justo
 * tras "importación completada"). Un batch es una sola petición de red por hasta ~450
 * documentos. Si aun así Firestore rechaza el lote entero (p.ej. por una regla de seguridad
 * violada en un solo documento), reintentamos cada entrenamiento del lote por separado para
 * no perder los que sí eran válidos.
 */
export const bulkSaveWorkoutsToCloud = async (uid, workouts, { userName, userPhoto }, fullCompletedWorkouts) => {
  if (!db) throw new Error("No hay conexión a la base de datos");

  const buildDocData = (workout) => ({
    ...workout,
    userId: uid,
    userName,
    userPhoto,
    likes: [],
    commentsList: [],
    isPublic: true,
  });

  const chunks = chunkArray(workouts, BATCH_CHUNK_SIZE);
  if (chunks.length === 0) chunks.push([]);

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const batch = writeBatch(db);
    chunk.forEach((workout) => {
      batch.set(doc(db, "workouts", getPublicWorkoutDocId(uid, workout.id)), buildDocData(workout), { merge: true });
    });
    // El perfil se guarda en el primer batch, junto con el primer lote de entrenos.
    if (i === 0) {
      batch.set(doc(db, "users", uid), { completedWorkouts: fullCompletedWorkouts }, { merge: true });
    }

    try {
      await batch.commit();
    } catch (error) {
      console.error(`[bulkSaveWorkoutsToCloud] Batch ${i} rechazado, reintentando uno a uno:`, error);
      if (i === 0) {
        await saveToCloud(`users/${uid}`, { completedWorkouts: fullCompletedWorkouts });
      }
      const results = await Promise.allSettled(
        chunk.map((workout) =>
          setDoc(doc(db, "workouts", getPublicWorkoutDocId(uid, workout.id)), buildDocData(workout), { merge: true })
        )
      );
      results.forEach((r, idx) => {
        if (r.status === 'rejected') {
          console.error(`[bulkSaveWorkoutsToCloud] No se pudo guardar el entrenamiento ${chunk[idx].id}:`, r.reason);
        }
      });
    }
  }
};

/**
 * Borra TODOS los documentos públicos de `workouts` que pertenecen a este usuario, buscándolos
 * en Firestore por el campo `userId` en vez de reconstruir sus ids desde el estado local. A lo
 * largo de varias correcciones (import en batch, luego prefijo de uid en el id) pueden haber
 * quedado documentos con esquemas de id antiguos que el estado local ya no conoce — borrar por
 * id reconstruido nunca puede garantizar que se limpia todo; preguntarle a Firestore qué existe
 * de verdad sí lo garantiza, sea cual sea el esquema con el que se creó cada documento.
 */
export const deleteAllPublicWorkoutsForUser = async (uid) => {
  if (!db || !uid) return;
  const snap = await getDocs(query(collection(db, "workouts"), where("userId", "==", uid), limit(5000)));
  if (snap.empty) return;

  const chunks = chunkArray(snap.docs, BATCH_CHUNK_SIZE);
  for (const chunk of chunks) {
    const batch = writeBatch(db);
    chunk.forEach((d) => batch.delete(d.ref));
    try {
      await batch.commit();
    } catch (error) {
      console.error('[deleteAllPublicWorkoutsForUser] Batch rechazado, reintentando uno a uno:', error);
      const results = await Promise.allSettled(chunk.map((d) => deleteDoc(d.ref)));
      results.forEach((r, idx) => {
        if (r.status === 'rejected') {
          console.error(`[deleteAllPublicWorkoutsForUser] No se pudo borrar ${chunk[idx].id}:`, r.reason);
        }
      });
    }
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

/**
 * Feed paginado por cursor. `cursor` es el QueryDocumentSnapshot devuelto como
 * `cursor` en la página anterior (null para la primera página).
 * Devuelve `hasMore` para saber si mostrar "cargar más" sin necesitar un count aparte.
 */
export const getWorkoutsFeed = async (userIds, { pageSize = 15, cursor = null } = {}) => {
  if (!db || !userIds || userIds.length === 0) return { workouts: [], cursor: null, hasMore: false };
  const constraints = [
    collection(db, "workouts"),
    where("userId", "in", userIds.slice(0, 10)), // Firestore limit
    orderBy("completedAt", "desc"),
  ];
  if (cursor) constraints.push(startAfter(cursor));
  constraints.push(limit(pageSize + 1)); // +1 para saber si hay siguiente página sin otra query

  const q = query(...constraints);
  const snap = await getDocs(q);
  const hasMore = snap.docs.length > pageSize;
  const pageDocs = hasMore ? snap.docs.slice(0, pageSize) : snap.docs;

  return {
    workouts: pageDocs.map(d => ({ ...d.data(), id: d.id })),
    cursor: pageDocs.length > 0 ? pageDocs[pageDocs.length - 1] : null,
    hasMore,
  };
};

/** Feed paginado por cursor, misma forma de retorno que getWorkoutsFeed. */
export const getUserWorkouts = async (userId, { pageSize = 20, cursor = null } = {}) => {
  if (!db || !userId) return { workouts: [], cursor: null, hasMore: false };
  const constraints = [
    collection(db, "workouts"),
    where("userId", "==", userId),
    orderBy("completedAt", "desc"),
  ];
  if (cursor) constraints.push(startAfter(cursor));
  constraints.push(limit(pageSize + 1));

  const q = query(...constraints);
  const snap = await getDocs(q);
  const hasMore = snap.docs.length > pageSize;
  const pageDocs = hasMore ? snap.docs.slice(0, pageSize) : snap.docs;

  return {
    workouts: pageDocs.map(d => ({ ...d.data(), id: d.id })),
    cursor: pageDocs.length > 0 ? pageDocs[pageDocs.length - 1] : null,
    hasMore,
  };
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
