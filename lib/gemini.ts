// Cliente común para la API de Gemini de todas las rutas de IA (chat, técnica, rutinas, análisis
// corporal).
//
// Antes cada ruta hacía su propio `fetch` sin reintentos, así que cualquier fallo pasajero de
// Google (503 "model overloaded", 429 por ráfaga de peticiones, un corte de red) llegaba al usuario
// como "la IA no funciona". Esos errores son normales en Gemini y se resuelven solos en uno o dos
// segundos: aquí se reintentan con espera creciente, y si el modelo configurado no existe o no está
// disponible para la clave, se prueba un modelo de respaldo en vez de fallar siempre.

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-3.6-flash";
// Alias que Google mantiene apuntando al Flash estable más reciente: sirve de red de seguridad si
// el modelo principal se retira o la clave no tiene acceso a él.
const DEFAULT_FALLBACK_MODEL = "gemini-flash-latest";
const RETRYABLE = new Set([408, 429, 500, 502, 503, 504]);
const BACKOFF_MS = [700, 1800];
const REQUEST_TIMEOUT_MS = 28000;

export class GeminiError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}

export function geminiModels(): string[] {
  const primary = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const fallback = process.env.GEMINI_FALLBACK_MODEL || DEFAULT_FALLBACK_MODEL;
  return primary === fallback ? [primary] : [primary, fallback];
}

/** Mensaje para el usuario según el fallo; el detalle técnico se queda en los logs. */
export function friendlyGeminiMessage(status: number, raw?: string): string {
  if (status === 429) return "El Coach está recibiendo muchas peticiones ahora mismo. Vuelve a intentarlo en unos segundos.";
  if (status === 503 || status === 502 || status === 504 || status === 500) return "El servicio de IA está saturado en este momento. Vuelve a intentarlo en unos segundos.";
  if (status === 408) return "La IA ha tardado demasiado en responder. Vuelve a intentarlo.";
  if (status === 401 || status === 403) return "La IA no está bien configurada en el servidor (clave de Gemini no válida).";
  if (raw && /API key/i.test(raw)) return "La IA no está bien configurada en el servidor (clave de Gemini no válida).";
  return "No se pudo contactar con la IA. Vuelve a intentarlo.";
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type GeminiResponse = any;

/**
 * POST `generateContent` con reintentos y modelo de respaldo. Devuelve el JSON de Gemini.
 * `fetchImpl` y `wait` son inyectables para los tests.
 */
export async function generateContent(
  body: Record<string, unknown>,
  opts: { fetchImpl?: typeof fetch; wait?: (ms: number) => Promise<void>; timeoutMs?: number } = {}
): Promise<GeminiResponse> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new GeminiError("Falta configurar GEMINI_API_KEY en el servidor.", 500);
  const doFetch = opts.fetchImpl || fetch;
  const wait = opts.wait || sleep;
  let lastStatus = 500;
  let lastRaw = "";

  for (const model of geminiModels()) {
    for (let attempt = 0; attempt <= BACKOFF_MS.length; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? REQUEST_TIMEOUT_MS);
      let status = 0;
      let data: GeminiResponse = null;
      try {
        const res = await doFetch(`${API_BASE}/${model}:generateContent?key=${key}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        status = res.status;
        data = await res.json().catch(() => ({}));
        if (res.ok) return data;
      } catch (e) {
        // Red caída o tiempo agotado: se trata como un 503/408 reintentable.
        status = e instanceof Error && e.name === "AbortError" ? 408 : 503;
      } finally {
        clearTimeout(timer);
      }

      lastStatus = status;
      lastRaw = data?.error?.message || "";
      console.error(`[gemini] ${model} intento ${attempt + 1}: ${status} ${lastRaw}`);

      // Modelo inexistente o no disponible para esta clave: pasar directamente al de respaldo.
      if (status === 404 || (status === 400 && /model|not found|not supported/i.test(lastRaw))) break;
      if (!RETRYABLE.has(status)) throw new GeminiError(friendlyGeminiMessage(status, lastRaw), status);
      if (attempt < BACKOFF_MS.length) await wait(BACKOFF_MS[attempt]);
    }
  }
  throw new GeminiError(friendlyGeminiMessage(lastStatus, lastRaw), lastStatus);
}

/** Texto de la primera respuesta, sin las partes de "pensamiento" de los modelos que razonan. */
export function responseText(data: GeminiResponse): string {
  const candidate = data?.candidates?.[0];
  if (!candidate) {
    if (data?.promptFeedback?.blockReason) throw new GeminiError("La IA no ha podido responder a esa petición. Prueba a formularla de otra forma.", 400);
    throw new GeminiError("La IA no devolvió ninguna respuesta. Vuelve a intentarlo.", 502);
  }
  const text = (candidate.content?.parts || [])
    .filter((p: { thought?: boolean }) => !p.thought)
    .map((p: { text?: string }) => p.text || "")
    .join("")
    .trim();
  if (!text && candidate.finishReason === "SAFETY") throw new GeminiError("La IA no ha podido responder a esa petición. Prueba a formularla de otra forma.", 400);
  return text;
}

/** JSON tolerante: quita ```json … ``` y, si hay texto alrededor, se queda con el primer objeto. */
export function parseJsonLoose<T = unknown>(text: string): T {
  const clean = String(text || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(clean) as T;
  } catch {
    const start = clean.indexOf("{");
    const end = clean.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(clean.slice(start, end + 1)) as T;
    throw new GeminiError("La IA devolvió una respuesta con formato inesperado. Vuelve a intentarlo.", 502);
  }
}

/**
 * Historial para Gemini: la conversación debe empezar por el usuario y alternar turnos. Si una
 * petición anterior falló, en Firestore quedan dos mensajes seguidos del usuario; y el recorte a los
 * últimos 10 puede dejar un mensaje del modelo al principio. Ambos casos hacían fallar la petición
 * con INVALID_ARGUMENT — la causa de muchos "a veces no funciona".
 */
export function normalizeHistory(messages: { role: string; content: string }[]): { role: "user" | "model"; parts: { text: string }[] }[] {
  const out: { role: "user" | "model"; parts: { text: string }[] }[] = [];
  for (const m of messages || []) {
    if (!m || (m.role !== "user" && m.role !== "assistant") || !m.content) continue;
    const role = m.role === "assistant" ? "model" : "user";
    const text = String(m.content).slice(0, 8000);
    const last = out[out.length - 1];
    if (last && last.role === role) last.parts[0].text += `\n\n${text}`;
    else out.push({ role, parts: [{ text }] });
  }
  while (out.length && out[0].role !== "user") out.shift();
  return out;
}
