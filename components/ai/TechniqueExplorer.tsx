import { useEffect, useMemo, useRef, useState } from "react";
import { getAuth } from "firebase/auth";
import { motion, useReducedMotion } from "motion/react";
import { getTokens } from "../../lib/tokens";
import { exercisesList } from "../../data/exercises";
import { ALL_MUSCLE_GROUPS } from "../../lib/exerciseStats";
import { Icon, ChipNav, Skeleton } from "../ui";

/**
 * Explorador de técnica: antes era una caja de búsqueda sola. Si no sabías el nombre exacto del
 * ejercicio te quedabas mirando un input vacío — no había ni una pista de qué se puede buscar. Aquí
 * el catálogo real de la app (data/exercises.js) hace de índice: se puede escribir y recibir
 * sugerencias mientras se teclea, o navegar por grupo muscular y tocar un ejercicio directamente sin
 * escribir nada. Las últimas búsquedas quedan a mano para no repetir el mismo tecleo dos veces.
 */

const RECENTS_KEY = "techniqueRecentSearches";
const RECENTS_MAX = 6;

interface TechniqueResult {
  name: string;
  recognized: boolean;
  muscleGroup: string;
  position: string;
  commonMistakes: string;
  musclesInvolved: string;
  repRange: string;
  restAdvice: string;
  tip: string;
}

// Un par de ejercicios representativos por grupo mayor, derivados del catálogo real (no una lista
// a mano que se desincroniza) — así siempre existen en la app y sirven de arranque cuando el
// usuario aún no ha buscado nada.
const POPULAR_GROUPS = ["Pecho", "Espalda", "Cuádriceps", "Hombros", "Femoral", "Glúteos", "Bíceps", "Tríceps"];
const POPULAR_EXERCISES = POPULAR_GROUPS
  .map((g) => (exercisesList as Record<string, { name: string }[]>)[g]?.[0]?.name)
  .filter(Boolean) as string[];

const GROUP_CHIPS = [{ key: "__all", label: "Todos" }, ...ALL_MUSCLE_GROUPS.map((g) => ({ key: g, label: g }))];

function loadRecents(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.slice(0, RECENTS_MAX) : [];
  } catch { return []; }
}

function saveRecent(name: string) {
  if (typeof window === "undefined") return;
  try {
    const prev = loadRecents().filter((n) => n.toLowerCase() !== name.toLowerCase());
    window.localStorage.setItem(RECENTS_KEY, JSON.stringify([name, ...prev].slice(0, RECENTS_MAX)));
  } catch { /* localStorage no disponible — no es crítico */ }
}

export default function TechniqueExplorer({
  isDark, isMobile, showNotification,
}: {
  isDark: boolean;
  isMobile: boolean;
  showNotification: (msg: string, type?: string) => void;
}) {
  const tk = getTokens(isDark);
  const prefersReducedMotion = useReducedMotion();

  const [query, setQuery] = useState("");
  const [activeGroup, setActiveGroup] = useState("__all");
  const [result, setResult] = useState<TechniqueResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recents, setRecents] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setRecents(loadRecents()); }, []);

  const allExerciseNames = useMemo(
    () => Object.values(exercisesList as Record<string, { name: string }[]>).flatMap((list) => list.map((e) => e.name)),
    []
  );

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return allExerciseNames.filter((n) => n.toLowerCase().includes(q)).slice(0, 6);
  }, [query, allExerciseNames]);

  const browseList = useMemo(() => {
    if (activeGroup === "__all") return POPULAR_EXERCISES;
    return ((exercisesList as Record<string, { name: string }[]>)[activeGroup] || []).map((e) => e.name);
  }, [activeGroup]);

  const runSearch = async (name: string) => {
    const exerciseName = name.trim();
    if (!exerciseName || isSearching) return;

    setShowSuggestions(false);
    setQuery(exerciseName);
    setIsSearching(true);
    setResult(null);

    try {
      const auth = getAuth();
      const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : "";
      const response = await fetch("/api/ai-technique", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ exerciseName }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Error consultando la técnica");

      setResult(data.result);
      saveRecent(data.result?.name || exerciseName);
      setRecents(loadRecents());
    } catch (error) {
      console.error("Error buscando técnica:", error);
      showNotification("No se pudo consultar la técnica de ese ejercicio. Inténtalo de nuevo.", "error");
    } finally {
      setIsSearching(false);
    }
  };

  const fieldStyle: React.CSSProperties = {
    width: "100%", padding: "13px 44px 13px 44px", borderRadius: tk.radius.md,
    border: `1.5px solid ${tk.border}`, backgroundColor: tk.surfaceAlt, color: tk.text,
    fontSize: tk.fontSize.sm, outline: "none", boxSizing: "border-box", transition: tk.transition, fontFamily: "inherit",
  };

  // Ejercicios del mismo grupo que el resultado actual, para seguir explorando sin volver a
  // escribir — el "siguiente paso" más probable tras leer la técnica de un ejercicio.
  const relatedToResult = useMemo(() => {
    if (!result?.muscleGroup) return [];
    const list = (exercisesList as Record<string, { name: string }[]>)[result.muscleGroup];
    if (!list) return [];
    return list.map((e) => e.name).filter((n) => n.toLowerCase() !== result.name.toLowerCase()).slice(0, 4);
  }, [result]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? "16px" : "20px" }}>
      {/* Buscador con sugerencias en vivo */}
      <div style={{ position: "relative" }}>
        <div style={{ position: "relative" }}>
          <Icon name="search" size={16} style={{ position: "absolute", left: "15px", top: "50%", transform: "translateY(-50%)", color: tk.textFaint, pointerEvents: "none" }} />
          <input
            ref={inputRef}
            placeholder="Busca un ejercicio: Sentadilla, Press Banca..."
            style={fieldStyle}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            onKeyDown={(e) => e.key === "Enter" && runSearch(query)}
            disabled={isSearching}
          />
          {query && (
            <button
              onClick={() => { setQuery(""); setResult(null); inputRef.current?.focus(); }}
              aria-label="Borrar búsqueda"
              style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: tk.textFaint, cursor: "pointer", padding: "6px", display: "flex" }}
            >
              <Icon name="close" size={15} />
            </button>
          )}
        </div>

        {showSuggestions && suggestions.length > 0 && (
          <div
            className="feeg-surface"
            style={{
              position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 20,
              borderRadius: tk.radius.md, overflow: "hidden", "--feeg-bg": tk.surface, "--feeg-border": tk.border,
              "--feeg-shadow": tk.shadow.float, "--feeg-border-width": "1px",
            } as React.CSSProperties}
          >
            {suggestions.map((name) => (
              <button
                key={name}
                onMouseDown={() => runSearch(name)}
                className="feeg-press feeg-hover"
                style={{
                  display: "block", width: "100%", textAlign: "left", padding: "11px 14px",
                  background: "none", border: "none", color: tk.text, fontSize: tk.fontSize.sm, cursor: "pointer",
                  "--feeg-hover-bg": tk.surfaceAlt, "--feeg-press-scale": 1,
                } as React.CSSProperties}
              >
                {name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Recientes */}
      {!result && recents.length > 0 && (
        <div>
          <div style={{ color: tk.textMuted, fontSize: tk.fontSize.xs, fontWeight: tk.weight.medium, marginBottom: "8px" }}>Buscados recientemente</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {recents.map((name) => (
              <button key={name} onClick={() => runSearch(name)} className="feeg-surface feeg-press feeg-hover" style={{
                padding: "7px 14px", borderRadius: tk.radius.pill, fontSize: tk.fontSize.xs, cursor: "pointer",
                display: "flex", alignItems: "center", gap: "6px",
                "--feeg-bg": tk.surface, "--feeg-fg": tk.textMuted, "--feeg-border": tk.border,
                "--feeg-hover-fg": tk.accent, "--feeg-hover-border": tk.accent, "--feeg-border-width": "1px", "--feeg-press-scale": 0.95,
              } as React.CSSProperties}>
                <Icon name="clock" size={12} /> {name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Explorar por grupo muscular */}
      {!result && (
        <div>
          <div style={{ color: tk.textMuted, fontSize: tk.fontSize.xs, fontWeight: tk.weight.medium, marginBottom: "8px" }}>Explorar por grupo muscular</div>
          <ChipNav items={GROUP_CHIPS} activeKey={activeGroup} onChange={setActiveGroup} isDark={isDark} size="sm" ariaLabel="Grupos musculares" />
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3, 1fr)", gap: "8px", marginTop: "10px" }}>
            {browseList.map((name) => (
              <button key={name} onClick={() => runSearch(name)} className="feeg-surface feeg-press feeg-hover" style={{
                padding: "12px 14px", borderRadius: tk.radius.md, cursor: "pointer", textAlign: "left",
                fontSize: tk.fontSize.sm, color: tk.text, fontWeight: tk.weight.medium,
                "--feeg-bg": tk.surfaceAlt, "--feeg-border": tk.border, "--feeg-hover-border": tk.accent,
                "--feeg-border-width": "1px", "--feeg-press-scale": 0.97,
              } as React.CSSProperties}>
                {name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Estado de carga */}
      {isSearching && (
        <div className="feeg-surface" style={{ borderRadius: tk.radius.lg, padding: isMobile ? "16px" : "24px", "--feeg-bg": tk.surface, "--feeg-border": tk.border, "--feeg-shadow": tk.shadow.card } as React.CSSProperties}>
          <Skeleton isDark={isDark} width="55%" height={24} />
          <Skeleton isDark={isDark} width="90%" height={14} style={{ marginTop: "16px" }} />
          <Skeleton isDark={isDark} width="80%" height={14} style={{ marginTop: "8px" }} />
          <Skeleton isDark={isDark} width="70%" height={14} style={{ marginTop: "8px" }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "18px" }}>
            <Skeleton isDark={isDark} height={48} radius={tk.radius.md} />
            <Skeleton isDark={isDark} height={48} radius={tk.radius.md} />
          </div>
        </div>
      )}

      {/* Resultado */}
      {result && !isSearching && (
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: tk.motion.duration.base, ease: tk.motion.ease.out }}
          className="feeg-surface"
          style={{ borderRadius: tk.radius.lg, padding: isMobile ? "16px" : "26px", "--feeg-bg": tk.surface, "--feeg-border": tk.border, "--feeg-shadow": tk.shadow.card } as React.CSSProperties}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px", marginBottom: "6px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <h2 style={{ color: tk.text, margin: 0, fontSize: tk.fontSize.lg }}>{result.name}</h2>
              {result.muscleGroup && (
                <span style={{
                  fontSize: tk.fontSize.xs, fontWeight: tk.weight.medium, color: tk.accent,
                  backgroundColor: tk.accentSoft, borderRadius: tk.radius.pill, padding: "3px 10px",
                }}>
                  {result.muscleGroup}
                </span>
              )}
            </div>
            <button
              onClick={() => { setResult(null); setQuery(""); }}
              aria-label="Cerrar resultado"
              className="feeg-surface feeg-press feeg-hover"
              style={{
                width: "30px", height: "30px", borderRadius: tk.radius.full, flexShrink: 0, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                "--feeg-bg": "transparent", "--feeg-fg": tk.textMuted, "--feeg-hover-fg": tk.accent, "--feeg-press-scale": 0.9,
              } as React.CSSProperties}
            >
              <Icon name="close" size={15} />
            </button>
          </div>

          {result.recognized === false && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", color: tk.danger, fontSize: tk.fontSize.xs, fontWeight: tk.weight.medium }}>
              <Icon name="alertCircle" size={14} />
              No he reconocido este ejercicio con seguridad — tómalo con cautela.
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <strong style={{ display: "block", color: tk.accent, fontSize: tk.fontSize.sm, marginBottom: "4px" }}>📍 Posición y ejecución</strong>
              <span style={{ color: tk.text, fontSize: tk.fontSize.sm, lineHeight: 1.55 }}>{result.position}</span>
            </div>
            <div>
              <strong style={{ display: "block", color: tk.danger, fontSize: tk.fontSize.sm, marginBottom: "4px" }}>❌ Errores comunes</strong>
              <span style={{ color: tk.text, fontSize: tk.fontSize.sm, lineHeight: 1.55 }}>{result.commonMistakes}</span>
            </div>
            <div>
              <strong style={{ display: "block", color: tk.accent, fontSize: tk.fontSize.sm, marginBottom: "4px" }}>💪 Músculos implicados</strong>
              <span style={{ color: tk.text, fontSize: tk.fontSize.sm, lineHeight: 1.55 }}>{result.musclesInvolved}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div style={{ backgroundColor: tk.surfaceAlt, border: `1px solid ${tk.border}`, borderRadius: tk.radius.md, padding: "10px 12px" }}>
                <div style={{ color: tk.textMuted, fontSize: tk.fontSize.xs, marginBottom: "2px" }}>Repeticiones</div>
                <div style={{ color: tk.text, fontSize: tk.fontSize.sm, fontWeight: tk.weight.medium }}>{result.repRange}</div>
              </div>
              <div style={{ backgroundColor: tk.surfaceAlt, border: `1px solid ${tk.border}`, borderRadius: tk.radius.md, padding: "10px 12px" }}>
                <div style={{ color: tk.textMuted, fontSize: tk.fontSize.xs, marginBottom: "2px" }}>Descanso</div>
                <div style={{ color: tk.text, fontSize: tk.fontSize.sm, fontWeight: tk.weight.medium }}>{result.restAdvice}</div>
              </div>
            </div>
            <div style={{ backgroundColor: tk.accentSoft, padding: "12px", borderRadius: tk.radius.sm, border: `1px dashed ${tk.accent}`, fontSize: tk.fontSize.sm, color: tk.text }}>
              <strong>💡 Tip:</strong> {result.tip}
            </div>
          </div>

          {relatedToResult.length > 0 && (
            <div style={{ marginTop: "18px", paddingTop: "16px", borderTop: `1px solid ${tk.border}` }}>
              <div style={{ color: tk.textMuted, fontSize: tk.fontSize.xs, fontWeight: tk.weight.medium, marginBottom: "8px" }}>Sigue explorando {result.muscleGroup}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {relatedToResult.map((name) => (
                  <button key={name} onClick={() => runSearch(name)} className="feeg-surface feeg-press feeg-hover" style={{
                    padding: "7px 14px", borderRadius: tk.radius.pill, fontSize: tk.fontSize.xs, cursor: "pointer",
                    "--feeg-bg": tk.surfaceAlt, "--feeg-fg": tk.text, "--feeg-border": tk.border,
                    "--feeg-hover-fg": tk.accent, "--feeg-hover-border": tk.accent, "--feeg-border-width": "1px", "--feeg-press-scale": 0.95,
                  } as React.CSSProperties}>
                    {name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
