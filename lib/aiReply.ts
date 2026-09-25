// Utilidades puras para la respuesta del Coach IA, compartidas por pages/api/ai-chat.js (servidor)
// y la pantalla de chat (cliente).

/** Etiqueta legible de cada herramienta, para enseñar "consultó tus récords" bajo la respuesta:
 * que el usuario vea que la cifra sale de SUS datos y no de una invención del modelo. */
export const AI_TOOL_LABELS: Record<string, string> = {
  get_workout_history: "historial",
  analyze_last_session: "último entreno",
  detect_plateau: "estancamiento",
  suggest_progression: "progresión",
  compare_periods: "comparativa",
  analyze_volume_by_group: "volumen por grupo",
  detect_undertrained_muscles: "grupos flojos",
  weekly_summary: "resumen semanal",
  get_routines: "rutinas",
  list_exercises: "catálogo",
  get_personal_records: "récords",
  get_strength_ranks: "rangos",
  get_training_status: "estado actual",
  get_body_metrics: "medidas",
};

export function toolLabels(names: string[]): string[] {
  const out: string[] = [];
  for (const n of names) {
    const label = AI_TOOL_LABELS[n];
    if (label && !out.includes(label)) out.push(label);
  }
  return out;
}

const SUGGESTIONS_RE = /\[\[\s*sugerencias\s*:([\s\S]*?)\]\]\s*$/i;

/**
 * Separa la línea final `[[sugerencias: a | b | c]]` que el modelo añade con preguntas de
 * seguimiento. Devuelve el texto limpio (lo único que se guarda y se enseña) y hasta 3 sugerencias.
 * Si el modelo no la incluye, o la formatea mal, no pasa nada: texto intacto y sin sugerencias.
 */
export function splitSuggestions(reply: string): { text: string; suggestions: string[] } {
  const raw = String(reply || "");
  const match = raw.match(SUGGESTIONS_RE);
  if (!match) return { text: raw.trim(), suggestions: [] };
  const suggestions = match[1]
    .split("|")
    .map((s) => s.trim().replace(/^["'“”]+|["'“”]+$/g, ""))
    .filter((s) => s.length > 2 && s.length <= 90)
    .slice(0, 3);
  return { text: raw.slice(0, match.index).trim(), suggestions };
}
