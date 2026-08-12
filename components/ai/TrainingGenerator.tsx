import { useState, useRef, useEffect, type ReactNode } from "react";
import { getAuth } from "firebase/auth";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { getTokens } from "../../lib/tokens";
import { Icon, Button } from "../ui";

/**
 * Generador de rutinas: antes era un único formulario de 11 campos servido de golpe (edad, sexo,
 * altura, peso, objetivo, nivel, días, material, lesiones... todo en una pantalla). Nadie rellena
 * eso con gusto — se parece a un trámite, no a hablar con un entrenador. Aquí se pregunta lo mismo
 * pero de una en una, como lo haría un coach de verdad en la primera sesión: una decisión por
 * pantalla, con confirmación visual inmediata y avance automático en las preguntas de elección
 * única, para que construir el plan se sienta como una conversación corta y no como papeleo.
 *
 * La IA devuelve DOS planes distintos (ver pages/api/generate-routine.js) en vez de uno solo: un
 * único plan generado es una imposición ("esto es lo que hay"), mientras que elegir entre dos
 * enfoques válidos —tras poder explorar ambos a fondo— es lo que hace un entrenador real cuando
 * hay más de un camino razonable hacia el mismo objetivo.
 */

interface TrainingAnswers {
  goal: string;
  level: string;
  days: string;
  time: string;
  material: string[];
  age: string;
  sex: string;
  height: string;
  weight: string;
  preferences: string;
}

const EMPTY_ANSWERS: TrainingAnswers = {
  goal: "", level: "", days: "", time: "", material: [],
  age: "", sex: "", height: "", weight: "", preferences: "",
};

interface GeneratedDay {
  name: string;
  exercises: { name: string; sets: string; reps: string; rest: string; note: string }[];
}
interface GeneratedPlan {
  title: string;
  tagline: string;
  summary: string;
  days: GeneratedDay[];
  advice: string;
}

// Forma mínima que espera saveRoutine (UserContext) — no existe un tipo Routine compartido en el
// repo todavía, así que se tipa aquí solo lo que este componente realmente construye.
interface NewRoutinePayload {
  id: number;
  name: string;
  exercises: {
    name: string;
    group: string;
    type: string;
    rest: number;
    series: { reps: number; weight: number; type: string }[];
  }[];
}

const GOALS = [
  { value: "perder grasa", label: "Perder grasa", desc: "Déficit calórico, más densidad de trabajo.", icon: "flame" },
  { value: "ganar músculo", label: "Ganar músculo", desc: "Volumen alto centrado en hipertrofia.", icon: "dumbbell" },
  { value: "fuerza", label: "Fuerza", desc: "Cargas pesadas, pocas repeticiones.", icon: "barbell" },
  { value: "mantenimiento", label: "Mantenimiento", desc: "Sostener tu nivel actual con eficiencia.", icon: "heart" },
];

const LEVELS = [
  { value: "principiante", label: "Principiante", desc: "Menos de 6 meses entrenando con regularidad.", bars: 1 },
  { value: "intermedio", label: "Intermedio", desc: "Entre 6 meses y 2-3 años de entrenamiento.", bars: 2 },
  { value: "avanzado", label: "Avanzado", desc: "Más de 3 años y dominas la técnica de base.", bars: 3 },
];

const DAY_CHOICES = ["1", "2", "3", "4", "5", "6", "7"];

const TIME_CHOICES = [
  { value: "30", label: "30 min" },
  { value: "45", label: "45 min" },
  { value: "60", label: "60 min" },
  { value: "90", label: "90+ min" },
];

const MATERIAL_OPTIONS = [
  { value: "gimnasio completo", label: "Gimnasio completo", icon: "barbell" },
  { value: "mancuernas", label: "Mancuernas", icon: "dumbbell" },
  { value: "máquinas", label: "Máquinas guiadas", icon: "machine" },
  { value: "bandas elásticas", label: "Bandas elásticas", icon: "cable" },
  { value: "solo peso corporal", label: "Solo mi cuerpo (casa)", icon: "bodyweight" },
];

/** Barras de nivel — tres muescas rellenas según la dificultad, en vez de reciclar un icono
 * genérico que no cuenta nada por sí solo (una mancuerna no dice si es difícil o fácil). */
function LevelBars({ filled, color, mutedColor }: { filled: number; color: string; mutedColor: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: "3px", height: "18px" }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: "6px",
            height: `${8 + i * 5}px`,
            borderRadius: "2px",
            backgroundColor: i < filled ? color : mutedColor,
            transition: "background-color 0.2s ease",
          }}
        />
      ))}
    </div>
  );
}

function ProgressBar({ tk, progress }: { tk: ReturnType<typeof getTokens>; progress: number }) {
  return (
    <div style={{ height: "4px", borderRadius: tk.radius.pill, backgroundColor: tk.surfaceAlt, overflow: "hidden" }}>
      <div
        style={{
          height: "100%",
          width: `${Math.max(6, progress * 100)}%`,
          background: `linear-gradient(90deg, ${tk.accent}, ${tk.accentHover})`,
          borderRadius: tk.radius.pill,
          transition: "width 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      />
    </div>
  );
}

interface OptionCardProps {
  tk: ReturnType<typeof getTokens>;
  selected: boolean;
  onClick: () => void;
  icon?: ReactNode;
  label: string;
  desc?: string;
  layout?: "grid" | "row";
}

function OptionCard({ tk, selected, onClick, icon, label, desc, layout = "grid" }: OptionCardProps) {
  const isRow = layout === "row";
  return (
    <button
      onClick={onClick}
      className={`feeg-surface feeg-press ${selected ? "" : "feeg-hover"}`}
      style={{
        display: "flex",
        flexDirection: isRow ? "row" : "column",
        alignItems: isRow ? "center" : "flex-start",
        gap: isRow ? "14px" : "10px",
        textAlign: "left",
        padding: isRow ? "16px" : "18px 16px",
        borderRadius: tk.radius.lg,
        cursor: "pointer",
        position: "relative",
        width: "100%",
        "--feeg-press-scale": 0.97,
        ...(selected
          ? { backgroundColor: tk.accentSoft, border: `1.5px solid ${tk.accent}` }
          : {
              "--feeg-bg": tk.surface,
              "--feeg-border": tk.border,
              "--feeg-hover-border": tk.accent,
              "--feeg-border-width": "1.5px",
            }),
      } as unknown as React.CSSProperties}
    >
      {icon && (
        <div
          style={{
            width: isRow ? "40px" : "38px",
            height: isRow ? "40px" : "38px",
            borderRadius: tk.radius.md,
            backgroundColor: selected ? tk.accent : tk.surfaceAlt,
            color: selected ? tk.onAccent : tk.textMuted,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            transition: tk.transition,
          }}
        >
          {icon}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: tk.text, fontWeight: tk.weight.bold, fontSize: tk.fontSize.sm }}>{label}</div>
        {desc && <div style={{ color: tk.textMuted, fontSize: tk.fontSize.xs, marginTop: "3px", lineHeight: 1.4 }}>{desc}</div>}
      </div>
      {selected && (
        <div style={{
          position: isRow ? "static" : "absolute", top: "12px", right: "12px",
          width: "20px", height: "20px", borderRadius: tk.radius.full, flexShrink: 0,
          backgroundColor: tk.accent, color: tk.onAccent,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon name="check" size={13} strokeWidth={3} />
        </div>
      )}
    </button>
  );
}

interface StepShellProps {
  tk: ReturnType<typeof getTokens>;
  isMobile: boolean;
  eyebrow: string;
  title: string;
  subtitle?: string;
  onBack: () => void;
  progress: number;
  children: ReactNode;
  footer?: ReactNode;
}

function StepShell({ tk, isMobile, eyebrow, title, subtitle, onBack, progress, children, footer }: StepShellProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? "18px" : "22px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <button
          onClick={onBack}
          aria-label="Atrás"
          className="feeg-surface feeg-press feeg-hover"
          style={{
            width: "32px", height: "32px", borderRadius: tk.radius.full, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
            "--feeg-bg": tk.surface, "--feeg-fg": tk.textMuted, "--feeg-border": tk.border,
            "--feeg-hover-fg": tk.accent, "--feeg-hover-border": tk.accent, "--feeg-border-width": "1px",
            "--feeg-press-scale": 0.9,
          } as React.CSSProperties}
        >
          <Icon name="chevronLeft" size={16} />
        </button>
        <div style={{ flex: 1 }}>
          <ProgressBar tk={tk} progress={progress} />
        </div>
      </div>

      <div>
        <div style={{ color: tk.accent, fontSize: tk.fontSize.xs, fontWeight: tk.weight.bold, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>
          {eyebrow}
        </div>
        <h3 style={{ margin: 0, color: tk.text, fontSize: isMobile ? "1.3rem" : "1.5rem", fontWeight: 800, letterSpacing: "-0.01em" }}>{title}</h3>
        {subtitle && <p style={{ margin: "6px 0 0", color: tk.textMuted, fontSize: tk.fontSize.sm }}>{subtitle}</p>}
      </div>

      <div>{children}</div>
      {footer}
    </div>
  );
}

/** Bloque de días/ejercicios de un plan — se reutiliza tal cual dentro de la tarjeta expandida de
 * "Elegir" y en la pantalla final, para no mantener dos veces el mismo layout. */
function PlanDays({ tk, plan }: { tk: ReturnType<typeof getTokens>; plan: GeneratedPlan }) {
  return (
    <div>
      {plan.days.map((day, idx) => (
        <div key={idx} style={{ marginBottom: "14px", padding: "14px", backgroundColor: tk.surfaceAlt, borderRadius: tk.radius.md, border: `1px solid ${tk.border}` }}>
          <h4 style={{ margin: "0 0 10px 0", color: tk.accent, fontSize: tk.fontSize.sm }}>{day.name}</h4>
          {day.exercises.map((ex, i) => (
            <div key={i} style={{ padding: "8px 0", borderBottom: i === day.exercises.length - 1 ? "none" : `1px solid ${tk.border}` }}>
              <div style={{ fontWeight: tk.weight.bold, color: tk.text, fontSize: tk.fontSize.sm }}>{ex.name}</div>
              <div style={{ fontSize: tk.fontSize.xs, color: tk.textMuted }}>{ex.sets} series x {ex.reps} • Descanso: {ex.rest}</div>
              <div style={{ fontSize: tk.fontSize.xs, fontStyle: "italic", marginTop: "4px", color: tk.textMuted }}>💡 {ex.note}</div>
            </div>
          ))}
        </div>
      ))}
      <div style={{ backgroundColor: tk.accentSoft, padding: "14px", borderRadius: tk.radius.md, borderLeft: `3px solid ${tk.accent}`, fontSize: tk.fontSize.sm, color: tk.text }}>
        <strong>Consejo IA:</strong> {plan.advice}
      </div>
    </div>
  );
}

interface PlanCardProps {
  tk: ReturnType<typeof getTokens>;
  isMobile: boolean;
  plan: GeneratedPlan;
  optionLabel: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onChoose: () => void;
}

function PlanCard({ tk, isMobile, plan, optionLabel, isExpanded, onToggleExpand, onChoose }: PlanCardProps) {
  const totalExercises = plan.days.reduce((sum, d) => sum + d.exercises.length, 0);
  return (
    <div
      className="feeg-surface"
      style={{
        borderRadius: tk.radius.lg, padding: isMobile ? "16px" : "22px", display: "flex", flexDirection: "column", gap: "12px",
        "--feeg-bg": tk.surface, "--feeg-border": isExpanded ? tk.accent : tk.border, "--feeg-border-width": isExpanded ? "1.5px" : "1px",
        "--feeg-shadow": tk.shadow.card,
      } as React.CSSProperties}
    >
      <div>
        <span style={{
          display: "inline-block", fontSize: tk.fontSize.xs, fontWeight: tk.weight.bold, color: tk.accent,
          backgroundColor: tk.accentSoft, borderRadius: tk.radius.pill, padding: "3px 10px", marginBottom: "10px",
        }}>
          {optionLabel}
        </span>
        <h3 style={{ margin: 0, color: tk.text, fontSize: tk.fontSize.lg }}>{plan.title}</h3>
        <p style={{ margin: "4px 0 0", color: tk.accent, fontSize: tk.fontSize.xs, fontWeight: tk.weight.medium }}>{plan.tagline}</p>
        <p style={{ margin: "8px 0 0", color: tk.textMuted, fontSize: tk.fontSize.sm, lineHeight: 1.5 }}>{plan.summary}</p>
      </div>

      <div style={{ display: "flex", gap: "8px" }}>
        <div style={{ flex: 1, backgroundColor: tk.surfaceAlt, borderRadius: tk.radius.sm, padding: "8px 10px", textAlign: "center" }}>
          <div style={{ color: tk.text, fontWeight: tk.weight.bold, fontSize: tk.fontSize.sm }}>{plan.days.length}</div>
          <div style={{ color: tk.textMuted, fontSize: tk.fontSize.xs }}>días</div>
        </div>
        <div style={{ flex: 1, backgroundColor: tk.surfaceAlt, borderRadius: tk.radius.sm, padding: "8px 10px", textAlign: "center" }}>
          <div style={{ color: tk.text, fontWeight: tk.weight.bold, fontSize: tk.fontSize.sm }}>{totalExercises}</div>
          <div style={{ color: tk.textMuted, fontSize: tk.fontSize.xs }}>ejercicios</div>
        </div>
      </div>

      <button
        onClick={onToggleExpand}
        className="feeg-press feeg-hover"
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
          background: "none", border: "none", color: tk.textMuted, fontSize: tk.fontSize.xs, fontWeight: tk.weight.medium,
          cursor: "pointer", padding: "6px",
        }}
      >
        {isExpanded ? "Ocultar detalle" : "Ver plan completo"}
        <Icon name="chevronRight" size={13} style={{ transform: isExpanded ? "rotate(-90deg)" : "rotate(90deg)", transition: "transform 0.2s ease" }} />
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: tk.motion.duration.base, ease: tk.motion.ease.standard }}
            style={{ overflow: "hidden" }}
          >
            <PlanDays tk={tk} plan={plan} />
          </motion.div>
        )}
      </AnimatePresence>

      <Button isDark={tk.isDark} fullWidth onClick={onChoose} style={{ marginTop: "auto" }}>
        Elegir este plan
      </Button>
    </div>
  );
}

const STEP_COUNT = 8; // 7 preguntas + resumen final

export default function TrainingGenerator({
  isDark, isMobile, onSaveRoutine, showNotification,
}: {
  isDark: boolean;
  isMobile: boolean;
  onSaveRoutine: (routine: NewRoutinePayload) => Promise<void>;
  showNotification: (msg: string, type?: string) => void;
}) {
  const tk = getTokens(isDark);
  const prefersReducedMotion = useReducedMotion();

  const [phase, setPhase] = useState<"intro" | "wizard" | "choose" | "result">("intro");
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [answers, setAnswers] = useState<TrainingAnswers>(EMPTY_ANSWERS);
  const [isGenerating, setIsGenerating] = useState(false);
  const [plans, setPlans] = useState<GeneratedPlan[] | null>(null);
  const [expandedPlanIndex, setExpandedPlanIndex] = useState<number | null>(null);
  const [chosenPlanIndex, setChosenPlanIndex] = useState<number | null>(null);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (advanceTimer.current) clearTimeout(advanceTimer.current); }, []);

  const goToStep = (i: number) => {
    setDirection(i >= step ? 1 : -1);
    setStep(Math.max(0, Math.min(STEP_COUNT - 1, i)));
  };
  const next = () => goToStep(step + 1);
  const back = () => {
    if (step === 0) { setPhase("intro"); return; }
    goToStep(step - 1);
  };

  /** Selección única: marca la respuesta, deja ver el check un instante y avanza sola — así elegir
   * "Fuerza" no exige encontrar y pulsar un botón "Continuar" aparte. */
  const selectAndAdvance = (patch: Partial<TrainingAnswers>) => {
    setAnswers((a) => ({ ...a, ...patch }));
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(next, prefersReducedMotion ? 80 : 280);
  };

  const toggleMaterial = (value: string) => {
    setAnswers((a) => ({
      ...a,
      material: a.material.includes(value) ? a.material.filter((m) => m !== value) : [...a.material, value],
    }));
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const auth = getAuth();
      const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : "";
      const response = await fetch("/api/generate-routine", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({
          trainingData: { ...answers, material: answers.material.join(", ") },
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Error generando la rutina");
      if (!Array.isArray(data.plans) || data.plans.length < 2) throw new Error("Respuesta incompleta del generador");

      setPlans(data.plans);
      setExpandedPlanIndex(null);
      setChosenPlanIndex(null);
      setPhase("choose");
    } catch (error) {
      console.error("Error al generar rutina:", error);
      showNotification("Hubo un error al generar tu rutina. Inténtalo de nuevo.", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const chosenPlan = chosenPlanIndex !== null && plans ? plans[chosenPlanIndex] : null;

  const handleSave = async () => {
    if (!chosenPlan) return;
    try {
      await onSaveRoutine({
        id: Date.now(),
        name: chosenPlan.title,
        exercises: chosenPlan.days.flatMap((day) =>
          day.exercises.map((ex) => ({
            name: ex.name,
            group: "Generado por IA",
            type: "weight_reps",
            rest: parseInt(ex.rest) || 90,
            series: Array.from({ length: parseInt(ex.sets) || 3 }).map(() => ({ reps: parseInt(ex.reps) || 10, weight: 0, type: "N" })),
          }))
        ),
      });
      showNotification("¡Rutina guardada correctamente!", "success");
    } catch (err) {
      console.error("Error guardando rutina", err);
      showNotification("Error al guardar rutina", "error");
    }
  };

  const restart = () => {
    setAnswers(EMPTY_ANSWERS);
    setPlans(null);
    setChosenPlanIndex(null);
    setExpandedPlanIndex(null);
    setStep(0);
    setPhase("intro");
  };

  const fieldStyle: React.CSSProperties = {
    width: "100%", padding: "13px 14px", borderRadius: tk.radius.md,
    border: `1.5px solid ${tk.border}`, backgroundColor: tk.surfaceAlt, color: tk.text,
    fontSize: tk.fontSize.sm, outline: "none", boxSizing: "border-box", transition: tk.transition, fontFamily: "inherit",
  };

  const gridCols = isMobile ? "1fr 1fr" : "1fr 1fr";

  // ---- Intro ----
  if (phase === "intro") {
    return (
      <div
        className="feeg-surface"
        style={{
          borderRadius: tk.radius.lg, padding: isMobile ? "28px 20px" : "44px 40px", textAlign: "center",
          "--feeg-bg": tk.surface, "--feeg-border": tk.border, "--feeg-shadow": tk.shadow.card,
        } as React.CSSProperties}
      >
        <div style={{
          width: "56px", height: "56px", borderRadius: tk.radius.full, margin: "0 auto 18px",
          backgroundColor: tk.accentSoft, color: tk.accent, display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon name="zap" size={26} />
        </div>
        <h3 style={{ margin: "0 0 8px", color: tk.text, fontSize: isMobile ? "1.25rem" : "1.5rem" }}>¿Necesitas un plan a tu medida?</h3>
        <p style={{ color: tk.textMuted, fontSize: tk.fontSize.sm, margin: "0 auto 24px", maxWidth: "420px" }}>
          Siete preguntas rápidas y tu Coach IA te propone dos planes distintos para que elijas el que más te convenza.
        </p>
        <Button isDark={isDark} size="lg" onClick={() => setPhase("wizard")} style={{ margin: "0 auto" }}>
          Empezar
        </Button>
      </div>
    );
  }

  // ---- Elegir entre los dos planes generados ----
  if (phase === "choose" && plans) {
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "18px" }}>
          <button
            onClick={() => setPhase("wizard")}
            aria-label="Atrás"
            className="feeg-surface feeg-press feeg-hover"
            style={{
              width: "32px", height: "32px", borderRadius: tk.radius.full, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
              "--feeg-bg": tk.surface, "--feeg-fg": tk.textMuted, "--feeg-border": tk.border,
              "--feeg-hover-fg": tk.accent, "--feeg-hover-border": tk.accent, "--feeg-border-width": "1px",
              "--feeg-press-scale": 0.9,
            } as React.CSSProperties}
          >
            <Icon name="chevronLeft" size={16} />
          </button>
          <div>
            <div style={{ color: tk.accent, fontSize: tk.fontSize.xs, fontWeight: tk.weight.bold, textTransform: "uppercase", letterSpacing: "0.06em" }}>Tus dos opciones</div>
            <h3 style={{ margin: "2px 0 0", color: tk.text, fontSize: isMobile ? "1.2rem" : "1.4rem", fontWeight: 800 }}>Elige el plan que más te convenza</h3>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "14px", alignItems: "start" }}>
          {plans.map((plan, i) => (
            <PlanCard
              key={i}
              tk={tk}
              isMobile={isMobile}
              plan={plan}
              optionLabel={`Opción ${i + 1}`}
              isExpanded={expandedPlanIndex === i}
              onToggleExpand={() => setExpandedPlanIndex(expandedPlanIndex === i ? null : i)}
              onChoose={() => { setChosenPlanIndex(i); setPhase("result"); }}
            />
          ))}
        </div>
      </div>
    );
  }

  // ---- Resultado ----
  if (phase === "result" && chosenPlan) {
    return (
      <div
        className="feeg-surface"
        style={{ borderRadius: tk.radius.lg, padding: isMobile ? "16px" : "28px", "--feeg-bg": tk.surface, "--feeg-border": tk.border, "--feeg-shadow": tk.shadow.card } as React.CSSProperties}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px", marginBottom: "8px" }}>
          <div>
            <button
              onClick={() => setPhase("choose")}
              className="feeg-press"
              style={{
                display: "flex", alignItems: "center", gap: "4px", background: "none", border: "none", cursor: "pointer",
                color: tk.textMuted, fontSize: tk.fontSize.xs, fontWeight: tk.weight.medium, padding: 0, marginBottom: "6px",
              }}
            >
              <Icon name="chevronLeft" size={12} /> Ver la otra opción
            </button>
            <h2 style={{ color: tk.text, margin: 0, fontSize: tk.fontSize.lg }}>{chosenPlan.title}</h2>
          </div>
          <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
            <Button isDark={isDark} size="sm" icon="check" onClick={handleSave}>Guardar</Button>
            <Button isDark={isDark} variant="ghost" size="sm" onClick={restart}>Rehacer</Button>
          </div>
        </div>
        <p style={{ color: tk.textMuted, fontSize: tk.fontSize.sm, margin: "0 0 16px" }}>{chosenPlan.summary}</p>

        <PlanDays tk={tk} plan={chosenPlan} />
      </div>
    );
  }

  // ---- Preguntas del asistente ----
  const progress = step / (STEP_COUNT - 1);
  const slideVariants = {
    enter: (dir: number) => (prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: dir > 0 ? 32 : -32 }),
    center: { opacity: 1, x: 0 },
    exit: (dir: number) => (prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: dir > 0 ? -32 : 32 }),
  };

  const continueFooter = (onClick: () => void, label = "Continuar", disabled = false) => (
    <Button isDark={isDark} fullWidth size="lg" onClick={onClick} disabled={disabled}>{label}</Button>
  );

  let content: ReactNode = null;

  if (step === 0) {
    content = (
      <StepShell tk={tk} isMobile={isMobile} eyebrow="Pregunta 1 de 7" title="¿Cuál es tu objetivo principal?" onBack={back} progress={progress}>
        <div style={{ display: "grid", gridTemplateColumns: gridCols, gap: "12px" }}>
          {GOALS.map((g) => (
            <OptionCard key={g.value} tk={tk} selected={answers.goal === g.value} onClick={() => selectAndAdvance({ goal: g.value })} icon={<Icon name={g.icon} size={18} />} label={g.label} desc={g.desc} />
          ))}
        </div>
      </StepShell>
    );
  } else if (step === 1) {
    content = (
      <StepShell tk={tk} isMobile={isMobile} eyebrow="Pregunta 2 de 7" title="¿Cuál es tu nivel de experiencia?" onBack={back} progress={progress}>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {LEVELS.map((l) => (
            <OptionCard key={l.value} tk={tk} layout="row" selected={answers.level === l.value} onClick={() => selectAndAdvance({ level: l.value })}
              icon={<LevelBars filled={l.bars} color={answers.level === l.value ? tk.onAccent : tk.accent} mutedColor={answers.level === l.value ? "rgba(0,0,0,0.25)" : tk.border} />}
              label={l.label} desc={l.desc} />
          ))}
        </div>
      </StepShell>
    );
  } else if (step === 2) {
    content = (
      <StepShell tk={tk} isMobile={isMobile} eyebrow="Pregunta 3 de 7" title="¿Cuántos días a la semana puedes entrenar?" onBack={back} progress={progress}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
          {DAY_CHOICES.map((d) => {
            const selected = answers.days === d;
            return (
              <button
                key={d}
                onClick={() => selectAndAdvance({ days: d })}
                className={`feeg-surface feeg-press ${selected ? "" : "feeg-hover"}`}
                style={{
                  width: "56px", height: "56px", borderRadius: tk.radius.full, cursor: "pointer",
                  fontSize: tk.fontSize.md, fontWeight: tk.weight.bold, "--feeg-press-scale": 0.92,
                  ...(selected
                    ? { backgroundColor: tk.accent, color: tk.onAccent, border: `1.5px solid ${tk.accent}` }
                    : { "--feeg-bg": tk.surface, "--feeg-fg": tk.text, "--feeg-border": tk.border, "--feeg-hover-border": tk.accent, "--feeg-border-width": "1.5px" }),
                } as unknown as React.CSSProperties}
              >
                {d}
              </button>
            );
          })}
        </div>
      </StepShell>
    );
  } else if (step === 3) {
    content = (
      <StepShell tk={tk} isMobile={isMobile} eyebrow="Pregunta 4 de 7" title="¿Cuánto tiempo tienes por sesión?" onBack={back} progress={progress}>
        <div style={{ display: "grid", gridTemplateColumns: gridCols, gap: "12px" }}>
          {TIME_CHOICES.map((t) => (
            <OptionCard key={t.value} tk={tk} selected={answers.time === t.value} onClick={() => selectAndAdvance({ time: t.value })} icon={<Icon name="clock" size={16} />} label={t.label} />
          ))}
        </div>
      </StepShell>
    );
  } else if (step === 4) {
    content = (
      <StepShell
        tk={tk} isMobile={isMobile} eyebrow="Pregunta 5 de 7" title="¿Qué material tienes disponible?"
        subtitle="Puedes elegir varios." onBack={back} progress={progress}
        footer={continueFooter(next, "Continuar", answers.material.length === 0)}
      >
        <div style={{ display: "grid", gridTemplateColumns: gridCols, gap: "12px" }}>
          {MATERIAL_OPTIONS.map((m) => (
            <OptionCard key={m.value} tk={tk} selected={answers.material.includes(m.value)} onClick={() => toggleMaterial(m.value)} icon={<Icon name={m.icon} size={18} />} label={m.label} />
          ))}
        </div>
      </StepShell>
    );
  } else if (step === 5) {
    content = (
      <StepShell
        tk={tk} isMobile={isMobile} eyebrow="Pregunta 6 de 7" title="Cuéntame un poco sobre ti"
        subtitle="Opcional, pero ayuda a ajustar cargas y volumen." onBack={back} progress={progress}
        footer={continueFooter(next)}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <input placeholder="Edad" type="number" style={fieldStyle} value={answers.age} onChange={(e) => setAnswers({ ...answers, age: e.target.value })} />
            <select style={fieldStyle} value={answers.sex} onChange={(e) => setAnswers({ ...answers, sex: e.target.value })}>
              <option value="">Sexo</option>
              <option value="hombre">Hombre</option>
              <option value="mujer">Mujer</option>
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <input placeholder="Altura (cm)" type="number" style={fieldStyle} value={answers.height} onChange={(e) => setAnswers({ ...answers, height: e.target.value })} />
            <input placeholder="Peso (kg)" type="number" style={fieldStyle} value={answers.weight} onChange={(e) => setAnswers({ ...answers, weight: e.target.value })} />
          </div>
        </div>
      </StepShell>
    );
  } else if (step === 6) {
    content = (
      <StepShell
        tk={tk} isMobile={isMobile} eyebrow="Pregunta 7 de 7" title="¿Alguna lesión o preferencia?"
        subtitle="Opcional — ej. 'molestia en el hombro', 'no me gusta correr'." onBack={back} progress={progress}
        footer={continueFooter(next)}
      >
        <textarea
          placeholder="Escribe aquí si hay algo que deba tener en cuenta..."
          style={{ ...fieldStyle, minHeight: "110px", resize: "vertical" }}
          value={answers.preferences}
          onChange={(e) => setAnswers({ ...answers, preferences: e.target.value })}
        />
      </StepShell>
    );
  } else {
    // Resumen
    const aboutYou = [
      answers.age && `${answers.age} años`,
      answers.sex && (answers.sex === "hombre" ? "Hombre" : "Mujer"),
      answers.height && `${answers.height} cm`,
      answers.weight && `${answers.weight} kg`,
    ].filter(Boolean).join(" · ") || "Sin especificar";

    const rows: { label: string; value: string; step: number }[] = [
      { label: "Objetivo", value: GOALS.find((g) => g.value === answers.goal)?.label || "—", step: 0 },
      { label: "Nivel", value: LEVELS.find((l) => l.value === answers.level)?.label || "—", step: 1 },
      { label: "Días por semana", value: answers.days ? `${answers.days} días` : "—", step: 2 },
      { label: "Duración por sesión", value: TIME_CHOICES.find((t) => t.value === answers.time)?.label || "—", step: 3 },
      { label: "Material", value: answers.material.length ? answers.material.map((v) => MATERIAL_OPTIONS.find((m) => m.value === v)?.label || v).join(", ") : "—", step: 4 },
      { label: "Sobre ti", value: aboutYou, step: 5 },
      { label: "Lesiones / preferencias", value: answers.preferences || "Ninguna", step: 6 },
    ];

    content = (
      <StepShell tk={tk} isMobile={isMobile} eyebrow="Último paso" title="Revisa tus respuestas" onBack={back} progress={1}>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {rows.map((row) => (
            <div key={row.label} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px",
              padding: "12px 14px", backgroundColor: tk.surfaceAlt, border: `1px solid ${tk.border}`, borderRadius: tk.radius.md,
            }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: tk.textMuted, fontSize: tk.fontSize.xs }}>{row.label}</div>
                <div style={{ color: tk.text, fontSize: tk.fontSize.sm, fontWeight: tk.weight.medium, marginTop: "2px" }}>{row.value}</div>
              </div>
              <button
                onClick={() => goToStep(row.step)}
                aria-label={`Editar ${row.label}`}
                className="feeg-surface feeg-press feeg-hover"
                style={{
                  width: "30px", height: "30px", borderRadius: tk.radius.full, flexShrink: 0, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  "--feeg-bg": "transparent", "--feeg-fg": tk.textMuted, "--feeg-hover-fg": tk.accent, "--feeg-press-scale": 0.9,
                } as React.CSSProperties}
              >
                <Icon name="edit" size={14} />
              </button>
            </div>
          ))}
        </div>

        <div style={{ marginTop: "18px" }}>
          <Button isDark={isDark} fullWidth size="lg" icon="zap" onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? "Generando tus dos planes..." : "Generar mis planes"}
          </Button>
        </div>
      </StepShell>
    );
  }

  return (
    <div style={{ maxWidth: "640px", margin: "0 auto" }}>
      <AnimatePresence mode="wait" custom={direction} initial={false}>
        <motion.div
          key={step}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: tk.motion.duration.base, ease: tk.motion.ease.standard }}
        >
          {content}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
