// Persistencia local pura de la sesión de entrenamiento en curso. Sin React.
// Clave separada de la antigua "workoutTimerState" a propósito: durante la migración por fases,
// las pantallas ya migradas y las que aún no lo están no deben pisarse el snapshot mutuamente.

import type { WorkoutSessionState } from "../hooks/workoutSessionReducer";

const STORAGE_KEY = "workoutSessionSnapshot";

interface StoredSnapshot extends WorkoutSessionState {
  savedAt: number;
}

export function saveSnapshot(state: WorkoutSessionState): void {
  if (typeof window === "undefined") return;
  try {
    const snapshot: StoredSnapshot = { ...state, savedAt: Date.now() };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch (_) {
    // localStorage lleno/inaccesible (modo privado, cuota) — no interrumpe el entreno
  }
}

/** Devuelve el snapshot guardado solo si corresponde al mismo workoutId, si no null. */
export function loadSnapshot(workoutId: string): WorkoutSessionState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: StoredSnapshot = JSON.parse(raw);
    if (!parsed || parsed.workoutId !== workoutId) return null;
    const { savedAt, ...state } = parsed;
    return state;
  } catch (_) {
    return null;
  }
}

export function clearSnapshot(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (_) {
    // no-op
  }
}

/**
 * Lee el snapshot crudo (de cualquier workoutId) para mostrar el cronómetro en vivo
 * en la pestaña flotante de "rutina activa" (components/Layout.jsx). Solo lectura,
 * no valida workoutId porque Layout no sabe cuál es "el" workout activo de antemano.
 */
export function readLiveElapsedFromSnapshot(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: StoredSnapshot = JSON.parse(raw);
    if (!parsed || parsed.status !== "ongoing" || !parsed.startedAt) return null;
    return Math.max(0, Math.floor((Date.now() - parsed.startedAt) / 1000));
  } catch (_) {
    return null;
  }
}
