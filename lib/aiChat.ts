// Persistencia de las conversaciones del Coach IA: users/{uid}/aiConversations/{id}/messages.
// Sustituye a la antigua colección plana users/{uid}/messages (un único hilo infinito, sin forma
// de empezar de cero ni de borrar) por conversaciones independientes, listables y borrables.
import {
  Firestore,
  collection,
  addDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  getDocs,
  writeBatch,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";

// lib/firebase.js tipa `db` como `Firestore | null` porque la app se degrada sin romper si
// faltan las env vars de Firebase (ver su cabecera). Cada función de aquí ya solo se llama desde
// pantallas que exigen authUser, así que en la práctica siempre hay `db` — este guard solo
// satisface a TypeScript sin repetir el check en cada función.
function requireDb(): Firestore {
  if (!db) throw new Error("Firebase no está configurado.");
  return db;
}

export interface AiConversationMeta {
  id: string;
  title: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface AiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: any;
}

export function subscribeAiConversations(
  uid: string,
  cb: (list: AiConversationMeta[]) => void,
  onError?: (e: any) => void
): Unsubscribe {
  const q = query(collection(requireDb(), "users", uid, "aiConversations"), orderBy("updatedAt", "desc"));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))),
    onError
  );
}

export function subscribeAiMessages(
  uid: string,
  conversationId: string,
  cb: (list: AiMessage[]) => void,
  onError?: (e: any) => void
): Unsubscribe {
  const q = query(
    collection(requireDb(), "users", uid, "aiConversations", conversationId, "messages"),
    orderBy("createdAt", "asc")
  );
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))),
    onError
  );
}

export async function createAiConversation(uid: string, title: string): Promise<string> {
  const ref = await addDoc(collection(requireDb(), "users", uid, "aiConversations"), {
    title,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function renameAiConversation(uid: string, conversationId: string, title: string): Promise<void> {
  await updateDoc(doc(requireDb(), "users", uid, "aiConversations", conversationId), { title });
}

async function touchAiConversation(uid: string, conversationId: string): Promise<void> {
  await updateDoc(doc(requireDb(), "users", uid, "aiConversations", conversationId), { updatedAt: serverTimestamp() });
}

export async function addAiMessage(
  uid: string,
  conversationId: string,
  role: "user" | "assistant",
  content: string
): Promise<void> {
  await addDoc(collection(requireDb(), "users", uid, "aiConversations", conversationId, "messages"), {
    role,
    content,
    createdAt: serverTimestamp(),
  });
  await touchAiConversation(uid, conversationId);
}

/** Borra una conversación entera: primero sus mensajes (subcolección) y luego el documento
 * contenedor, en el mismo batch — Firestore no borra subcolecciones en cascada solo. */
export async function deleteAiConversation(uid: string, conversationId: string): Promise<void> {
  const messagesSnap = await getDocs(collection(requireDb(), "users", uid, "aiConversations", conversationId, "messages"));
  const batch = writeBatch(requireDb());
  messagesSnap.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(doc(requireDb(), "users", uid, "aiConversations", conversationId));
  await batch.commit();
}

/** Título corto autogenerado a partir del primer mensaje del usuario, para no forzarle a
 * nombrar cada conversación a mano. */
export function titleFromMessage(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return "Nueva conversación";
  return trimmed.length > 42 ? trimmed.slice(0, 42) + "…" : trimmed;
}
