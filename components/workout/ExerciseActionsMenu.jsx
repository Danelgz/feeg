import { useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { getWorkoutTokens } from "../../lib/tokens";
import { Icon } from "../ui";

/**
 * Menú "⋮" de un ejercicio. Solo expone onSubstitute/onDelete — construido así a propósito
 * para que el bug de producción de [id].js (llamaba a setters que no existían) sea imposible
 * de reintroducir por diseño: no hay ningún otro sitio donde "inventarse" una acción nueva.
 *
 * Se cierra al tocar fuera o con Escape (antes sólo se cerraba volviendo a pulsar el "⋮").
 */
export default function ExerciseActionsMenu({ open, onToggle, onSubstitute, onDelete, t }) {
  const tk = getWorkoutTokens();
  const reduceMotion = useReducedMotion();
  const translate = t || ((s) => s);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) onToggle();
    };
    const onKey = (e) => {
      if (e.key === "Escape") onToggle();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onToggle]);

  const item = (danger) => ({
    width: "100%",
    padding: "13px 14px",
    background: "none",
    border: "none",
    color: danger ? tk.danger : tk.text,
    textAlign: "left",
    cursor: "pointer",
    fontSize: "0.92rem",
    fontWeight: 700,
    fontFamily: "inherit",
    display: "flex",
    alignItems: "center",
    gap: 10,
  });

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={onToggle}
        aria-label="Opciones del ejercicio"
        aria-haspopup="menu"
        aria-expanded={open}
        className="feeg-press"
        style={{ width: 38, height: 38, borderRadius: 12, border: "none", background: open ? tk.surfaceAlt : "none", color: tk.text, cursor: "pointer", display: "grid", placeItems: "center" }}
      >
        <Icon name="moreVertical" size={20} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={reduceMotion ? false : { opacity: 0, scale: 0.94, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, scale: 0.96, y: -4 }}
            transition={{ duration: 0.14 }}
            style={{
              position: "absolute",
              top: 42,
              right: 0,
              transformOrigin: "top right",
              backgroundColor: tk.surfaceAlt,
              borderRadius: 14,
              boxShadow: tk.shadow.float,
              zIndex: 100,
              width: 210,
              overflow: "hidden",
            }}
          >
            <button type="button" role="menuitem" onClick={onSubstitute} style={item(false)}>
              <Icon name="rotate" size={16} />
              {translate("substitute_exercise_action")}
            </button>
            <div style={{ height: 1, background: tk.hairline, margin: "0 14px" }} />
            <button type="button" role="menuitem" onClick={onDelete} style={item(true)}>
              <Icon name="trash" size={16} />
              {translate("delete_exercise_action")}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
