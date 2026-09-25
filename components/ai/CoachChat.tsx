import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { getTokens } from "../../lib/tokens";
import { BOTTOM_NAV_HEIGHT } from "../BottomNavigation";
import { Icon } from "../ui";
import CoachMarkdown from "./CoachMarkdown";
import type { SmartPrompt } from "../../lib/aiContext";

export interface CoachMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
}

export interface PendingAction {
  type: string;
  payload: Record<string, unknown>;
}

interface ActionPayload {
  name?: string;
  routineName?: string;
  exercises?: { name: string; sets?: number; reps?: number }[];
  oldExerciseName?: string;
  newExerciseName?: string;
  exerciseName?: string;
  reps?: number;
  weight?: number;
}

export interface ReplyMeta {
  suggestions: string[];
  toolsUsed: string[];
}

interface CoachChatProps {
  isDark: boolean;
  isMobile: boolean;
  signedIn: boolean;
  onLogin?: () => void;
  userName?: string;
  /** Cifras de lo que el coach "ve" del usuario, para la bienvenida ("48 entrenos", "Atleta I"...). */
  contextChips: { icon: string; label: string }[];
  prompts: SmartPrompt[];
  messages: CoachMessage[];
  isLoading: boolean;
  /** Meta de la última respuesta: sugerencias de seguimiento y herramientas consultadas. */
  lastMeta: ReplyMeta | null;
  pendingAction: PendingAction | null;
  isApplyingAction: boolean;
  onConfirmAction: () => void;
  onDismissAction: () => void;
  onSend: (text: string) => void;
  onRetry?: () => void;
  placeholder: string;
  voice: {
    isListening: boolean;
    isSpeaking: boolean;
    onMic: () => void;
    onSpeak: (text: string) => void;
    onStopSpeaking: () => void;
  };
}

const ACTION_META: Record<string, { title: string; icon: string; confirm: string }> = {
  propose_create_routine: { title: "Nueva rutina", icon: "list", confirm: "Guardar rutina" },
  propose_quick_workout: { title: "Sesión rápida", icon: "zap", confirm: "Crear sesión" },
  propose_modify_routine: { title: "Cambio en tu rutina", icon: "edit", confirm: "Aplicar cambio" },
  propose_substitute_exercise: { title: "Sustituir ejercicio", icon: "layers", confirm: "Sustituir" },
  propose_log_set: { title: "Registrar serie", icon: "check", confirm: "Registrar" },
};

/**
 * El chat del Coach IA. Sólo presentación: los datos, Firestore y la API viven en pages/ia.js.
 *
 * Decisiones de espacio (móvil de 360px):
 * - Las respuestas del coach NO van en burbuja: ocupan todo el ancho como texto de lectura. Una
 *   burbuja al 88% con 16px de padding dejaba ~270px para una respuesta con listas y cifras.
 * - Sin panel con borde alrededor: los mensajes fluyen en la página y el cuadro de texto se queda
 *   pegado encima de la barra de navegación.
 * - El cuadro de texto crece con lo que escribes (hasta 5 líneas) en vez de ser un input de una.
 */
export default function CoachChat(props: CoachChatProps) {
  const { isDark, isMobile, messages, isLoading, pendingAction, lastMeta } = props;
  const tk = getTokens(isDark);
  const reduceMotion = useReducedMotion();
  const endRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState("");
  const [copied, setCopied] = useState<number | null>(null);
  const empty = messages.length === 0 && !isLoading;

  useEffect(() => {
    if (messages.length === 0 && !isLoading) return;
    endRef.current?.scrollIntoView?.({ behavior: reduceMotion ? "auto" : "smooth", block: "end" });
  }, [messages.length, isLoading, pendingAction, reduceMotion]);

  const send = (text?: string) => {
    const value = (text ?? draft).trim();
    if (!value || isLoading) return;
    props.onSend(value);
    if (text === undefined) setDraft("");
  };

  const copy = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(index);
      setTimeout(() => setCopied(null), 1400);
    } catch {
      /* sin portapapeles (http, permisos): no hay nada útil que enseñar */
    }
  };

  const lastAssistant = [...messages].map((m, i) => ({ m, i })).reverse().find((x) => x.m.role === "assistant")?.i ?? -1;
  const lastIsUser = messages.length > 0 && messages[messages.length - 1].role === "user";

  if (!props.signedIn) {
    return (
      <div style={{ padding: "36px 4px 12px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
        <CoachOrb size={76} isDark={isDark} />
        <h2 style={{ margin: "18px 0 6px", fontSize: "1.35rem", fontWeight: 900, color: tk.text, letterSpacing: "-0.02em" }}>Tu entrenador personal, con tus datos</h2>
        <p style={{ margin: 0, maxWidth: 360, fontSize: "0.88rem", lineHeight: 1.55, color: tk.textMuted }}>
          El Coach analiza tu historial, tus récords y tus rangos para decirte qué entrenar, detectar estancamientos y montarte rutinas.
          Necesita una cuenta para funcionar.
        </p>
        <ul style={{ listStyle: "none", padding: 0, margin: "20px 0 22px", display: "grid", gap: 10, textAlign: "left", width: "100%", maxWidth: 360 }}>
          {[
            ["zap", "Qué te toca hoy según tu recuperación"],
            ["trendUp", "Estancamientos y el peso de tu próxima serie"],
            ["list", "Rutinas creadas y editadas por chat"],
          ].map(([icon, label]) => (
            <li key={label} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: "0.88rem", color: tk.text, fontWeight: 600 }}>
              <span style={{ width: 30, height: 30, borderRadius: 9, display: "grid", placeItems: "center", background: tk.accentSoft, color: tk.accent, flexShrink: 0 }}>
                <Icon name={icon} size={15} />
              </span>
              {label}
            </li>
          ))}
        </ul>
        {props.onLogin && (
          <button type="button" onClick={props.onLogin} className="feeg-press" style={primaryButton(tk)}>
            Iniciar sesión para usar el Coach
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: isMobile ? `calc(100dvh - ${BOTTOM_NAV_HEIGHT + 150}px)` : "min(760px, calc(100vh - 190px))" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 18, paddingBottom: 12 }}>
        {empty && (
          <motion.div initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} style={{ paddingTop: isMobile ? 10 : 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <CoachOrb size={52} isDark={isDark} />
              <div style={{ minWidth: 0 }}>
                <h2 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 900, color: tk.text, letterSpacing: "-0.02em" }}>
                  {props.userName ? `Hola, ${props.userName}` : "Hola"}
                </h2>
                <div style={{ fontSize: "0.84rem", color: tk.textMuted, marginTop: 2 }}>¿En qué te ayudo hoy?</div>
              </div>
            </div>

            {props.contextChips.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: "0.68rem", fontWeight: 700, color: tk.textFaint, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
                  Tu coach tiene en cuenta
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {props.contextChips.map((c) => (
                    <span key={c.label} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 99, background: tk.hairline, color: tk.text, fontSize: "0.76rem", fontWeight: 700 }}>
                      <span style={{ color: tk.accent, display: "flex" }}>
                        <Icon name={c.icon} size={13} />
                      </span>
                      {c.label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, minmax(0, 1fr))" : "repeat(3, minmax(0, 1fr))", gap: 8, marginTop: 20 }}>
              {props.prompts.map((p, i) => (
                <motion.button
                  key={p.key}
                  type="button"
                  onClick={() => send(p.prompt)}
                  initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: 0.05 + i * 0.04 }}
                  className="feeg-press"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: 10,
                    padding: "12px 12px 13px",
                    minHeight: 86,
                    borderRadius: 14,
                    border: "none",
                    textAlign: "left",
                    cursor: "pointer",
                    background: isDark ? "rgba(255,255,255,0.05)" : "#fff",
                    boxShadow: isDark ? "none" : "0 1px 2px rgba(0,0,0,0.05)",
                    color: tk.text,
                    "--feeg-press-scale": 0.97,
                  } as CSSProperties}
                >
                  <span style={{ color: tk.accent, display: "flex" }}>
                    <Icon name={p.icon} size={18} />
                  </span>
                  <span style={{ fontSize: "0.84rem", fontWeight: 700, lineHeight: 1.3 }}>{p.title}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {messages.map((msg, i) =>
          msg.role === "user" ? (
            <motion.div
              key={msg.id || i}
              initial={reduceMotion || i < messages.length - 1 ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ alignSelf: "flex-end", maxWidth: "84%" }}
            >
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: "18px 18px 6px 18px",
                  background: tk.accent,
                  color: tk.onAccent,
                  fontSize: "0.92rem",
                  fontWeight: 600,
                  lineHeight: 1.45,
                  whiteSpace: "pre-wrap",
                  overflowWrap: "anywhere",
                }}
              >
                {msg.content}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={msg.id || i}
              initial={reduceMotion || i < messages.length - 1 ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <CoachOrb size={22} isDark={isDark} />
                <span style={{ fontSize: "0.76rem", fontWeight: 800, color: tk.text }}>Coach</span>
                {i === lastAssistant && lastMeta && lastMeta.toolsUsed.length > 0 && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.7rem", color: tk.textFaint, minWidth: 0, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                    <Icon name="activity" size={11} /> consultó {lastMeta.toolsUsed.join(" · ")}
                  </span>
                )}
              </div>
              <CoachMarkdown content={msg.content} isDark={isDark} />
              <div style={{ display: "flex", gap: 2, marginTop: 4, marginLeft: -6 }}>
                <IconAction label={copied === i ? "Copiado" : "Copiar"} icon={copied === i ? "check" : "copy"} onClick={() => copy(msg.content, i)} tk={tk} />
                <IconAction label="Escuchar" icon="volume2" onClick={() => props.voice.onSpeak(msg.content)} tk={tk} />
              </div>
            </motion.div>
          )
        )}

        {isLoading && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }} aria-live="polite">
            <CoachOrb size={22} isDark={isDark} thinking />
            <span className="coach-shimmer" style={{ fontSize: "0.86rem", fontWeight: 700, color: tk.textMuted }}>
              Analizando tus datos…
            </span>
          </div>
        )}

        {!isLoading && lastIsUser && props.onRetry && (
          <button type="button" onClick={props.onRetry} className="feeg-press" style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 6, border: "none", background: tk.hairline, color: tk.text, fontWeight: 700, fontSize: "0.8rem", padding: "8px 12px", borderRadius: 99, cursor: "pointer" }}>
            <Icon name="history" size={14} /> No hubo respuesta · reintentar
          </button>
        )}

        <AnimatePresence>
          {pendingAction && (
            <motion.div
              key="action"
              initial={reduceMotion ? false : { opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: 6 }}
              style={{ borderRadius: 16, padding: 14, background: isDark ? "rgba(29,209,161,0.09)" : "rgba(29,209,161,0.1)" }}
            >
              <ActionPreview action={pendingAction} tk={tk} />
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button type="button" onClick={props.onConfirmAction} disabled={props.isApplyingAction} className="feeg-press" style={{ ...primaryButton(tk), flex: 1, opacity: props.isApplyingAction ? 0.6 : 1 }}>
                  {props.isApplyingAction ? "Aplicando…" : ACTION_META[pendingAction.type]?.confirm || "Confirmar"}
                </button>
                <button
                  type="button"
                  onClick={props.onDismissAction}
                  disabled={props.isApplyingAction}
                  className="feeg-press"
                  style={{ flex: "0 0 auto", padding: "0 16px", border: "none", borderRadius: 12, background: tk.hairline, color: tk.text, fontWeight: 700, fontSize: "0.86rem", cursor: "pointer" }}
                >
                  Descartar
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!isLoading && lastMeta && lastMeta.suggestions.length > 0 && !pendingAction && !lastIsUser && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {lastMeta.suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                className="feeg-press"
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 99, border: "none", background: tk.hairline, color: tk.text, fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", textAlign: "left" }}
              >
                <span style={{ color: tk.accent, display: "flex" }}>
                  <Icon name="arrowRight" size={13} />
                </span>
                {s}
              </button>
            ))}
          </div>
        )}
        <div ref={endRef} style={{ scrollMarginBottom: 140 }} />
      </div>

      <Composer
        tk={tk}
        isMobile={isMobile}
        value={draft}
        onChange={setDraft}
        onSend={() => send()}
        disabled={isLoading}
        placeholder={props.voice.isListening ? "Escuchando…" : props.placeholder}
        voice={props.voice}
      />

      <style jsx global>{`
        .coach-shimmer {
          background: linear-gradient(90deg, ${tk.textFaint} 0%, ${tk.text} 50%, ${tk.textFaint} 100%);
          background-size: 200% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent !important;
          animation: coach-shimmer 1.6s linear infinite;
        }
        @keyframes coach-shimmer {
          from { background-position: 200% 0; }
          to { background-position: -200% 0; }
        }
        @keyframes coach-orb {
          0%, 100% { transform: scale(1); filter: brightness(1); }
          50% { transform: scale(1.08); filter: brightness(1.2); }
        }
        @media (prefers-reduced-motion: reduce) {
          .coach-shimmer { animation: none; color: inherit !important; }
        }
      `}</style>
    </div>
  );
}

/** Avatar del Coach: una esfera de acento con destello, no un icono de chat genérico. */
export function CoachOrb({ size, isDark, thinking = false }: { size: number; isDark: boolean; thinking?: boolean }) {
  const tk = getTokens(isDark);
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        flexShrink: 0,
        display: "grid",
        placeItems: "center",
        color: "#04140f",
        background: `radial-gradient(circle at 32% 28%, #b8ffe9 0%, ${tk.accent} 45%, #0b7a5f 100%)`,
        boxShadow: `0 0 ${Math.round(size / 2.5)}px ${tk.accent}55`,
        animation: thinking ? "coach-orb 1.2s ease-in-out infinite" : undefined,
      }}
    >
      <Icon name="sparkles" size={Math.max(10, Math.round(size * 0.46))} />
    </span>
  );
}

function IconAction({ label, icon, onClick, tk }: { label: string; icon: string; onClick: () => void; tk: ReturnType<typeof getTokens> }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="feeg-press"
      style={{ display: "grid", placeItems: "center", width: 30, height: 30, border: "none", background: "none", color: tk.textFaint, cursor: "pointer", borderRadius: 8 }}
    >
      <Icon name={icon} size={15} />
    </button>
  );
}

function ActionPreview({ action, tk }: { action: PendingAction; tk: ReturnType<typeof getTokens> }) {
  const meta = ACTION_META[action.type] || { title: "Cambio propuesto", icon: "zap", confirm: "Confirmar" };
  const p = (action.payload || {}) as ActionPayload;
  const exercises = Array.isArray(p.exercises) ? p.exercises : [];
  let body: ReactNode = null;

  if (exercises.length > 0) {
    body = (
      <>
        <div style={{ fontSize: "1.02rem", fontWeight: 800, color: tk.text, marginTop: 2 }}>{p.name || p.routineName || "Tu rutina"}</div>
        <ol style={{ listStyle: "none", margin: "10px 0 0", padding: 0 }}>
          {exercises.slice(0, 10).map((e, i) => (
            <li key={`${e.name}-${i}`} style={{ display: "flex", alignItems: "baseline", gap: 10, padding: "7px 0", borderTop: `1px solid ${tk.hairline}`, fontSize: "0.86rem" }}>
              <span style={{ color: tk.textFaint, fontWeight: 700, width: 16, fontVariantNumeric: "tabular-nums" }}>{i + 1}</span>
              <span style={{ flex: 1, minWidth: 0, color: tk.text, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.name}</span>
              <span style={{ color: tk.textMuted, fontWeight: 700, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                {e.sets || 3}×{e.reps || 10}
              </span>
            </li>
          ))}
          {exercises.length > 10 && <li style={{ fontSize: "0.78rem", color: tk.textMuted, paddingTop: 6 }}>+{exercises.length - 10} ejercicios más</li>}
        </ol>
      </>
    );
  } else if (action.type === "propose_substitute_exercise") {
    body = (
      <div style={{ marginTop: 6, fontSize: "0.9rem", color: tk.text, lineHeight: 1.5 }}>
        <span style={{ textDecoration: "line-through", color: tk.textMuted }}>{p.oldExerciseName}</span>
        <span style={{ color: tk.accent, fontWeight: 800 }}> → </span>
        <strong>{p.newExerciseName}</strong>
        {p.routineName && <div style={{ fontSize: "0.78rem", color: tk.textMuted }}>en {p.routineName}</div>}
      </div>
    );
  } else if (action.type === "propose_log_set") {
    body = (
      <div style={{ marginTop: 6, fontSize: "0.95rem", color: tk.text }}>
        <strong>{p.exerciseName}</strong> · {p.reps} reps{p.weight ? ` × ${p.weight} kg` : ""}
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: tk.accent, fontSize: "0.72rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>
        <Icon name={meta.icon} size={14} />
        {meta.title} · pendiente de confirmar
      </div>
      {body}
    </div>
  );
}

function Composer({
  tk,
  isMobile,
  value,
  onChange,
  onSend,
  disabled,
  placeholder,
  voice,
}: {
  tk: ReturnType<typeof getTokens>;
  isMobile: boolean;
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  disabled: boolean;
  placeholder: string;
  voice: CoachChatProps["voice"];
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  // Autocrecimiento: se mide el contenido y se limita a ~5 líneas.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(124, el.scrollHeight)}px`;
  }, [value]);
  const canSend = value.trim().length > 0 && !disabled;

  return (
    <div
      style={{
        position: "sticky",
        bottom: isMobile ? `calc(${BOTTOM_NAV_HEIGHT + 10}px + env(safe-area-inset-bottom))` : 16,
        zIndex: 5,
        paddingTop: 10,
        // Degradado del fondo de la página por detrás: los mensajes se desvanecen al pasar bajo el
        // cuadro de texto en vez de cortarse en seco.
        background: `linear-gradient(to bottom, transparent, ${tk.bg} 14px)`,
      }}
    >
      {voice.isSpeaking && (
        <button
          type="button"
          onClick={voice.onStopSpeaking}
          className="feeg-press"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 8, padding: "6px 12px", borderRadius: 99, border: "none", background: tk.hairline, color: tk.text, fontSize: "0.76rem", fontWeight: 700, cursor: "pointer" }}
        >
          <Icon name="volumeX" size={14} /> Detener lectura
        </button>
      )}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 6,
          padding: 6,
          borderRadius: 24,
          background: tk.isDark ? "#161616" : "#fff",
          boxShadow: tk.isDark ? "0 8px 24px rgba(0,0,0,0.5)" : "0 6px 20px rgba(24,32,44,0.1)",
        }}
      >
        <button
          type="button"
          onClick={voice.onMic}
          aria-label={voice.isListening ? "Detener dictado" : "Dictar por voz"}
          className="feeg-press"
          style={{
            width: 38,
            height: 38,
            borderRadius: 99,
            border: "none",
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
            cursor: "pointer",
            background: voice.isListening ? tk.danger : "transparent",
            color: voice.isListening ? "#fff" : tk.textMuted,
          }}
        >
          <Icon name="mic" size={18} />
        </button>
        <textarea
          ref={ref}
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          placeholder={placeholder}
          aria-label="Mensaje para el Coach"
          style={{
            flex: 1,
            minWidth: 0,
            resize: "none",
            border: "none",
            outline: "none",
            background: "transparent",
            color: tk.text,
            font: "inherit",
            fontSize: "0.95rem",
            lineHeight: 1.4,
            padding: "9px 4px",
            boxSizing: "border-box",
            minHeight: 38,
            maxHeight: 124,
          }}
        />
        <button
          type="button"
          onClick={onSend}
          disabled={!canSend}
          aria-label="Enviar"
          className="feeg-press"
          style={{
            width: 38,
            height: 38,
            borderRadius: 99,
            border: "none",
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
            cursor: canSend ? "pointer" : "default",
            background: canSend ? tk.accent : tk.hairline,
            color: canSend ? tk.onAccent : tk.textFaint,
            transition: "background .2s ease, color .2s ease",
          }}
        >
          <Icon name="send" size={17} />
        </button>
      </div>
    </div>
  );
}

function primaryButton(tk: ReturnType<typeof getTokens>): CSSProperties {
  return {
    padding: "12px 18px",
    border: "none",
    borderRadius: 12,
    background: tk.accent,
    color: tk.onAccent,
    fontWeight: 800,
    fontSize: "0.9rem",
    cursor: "pointer",
  };
}
