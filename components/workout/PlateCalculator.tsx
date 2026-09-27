import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { getWorkoutTokens } from "../../lib/tokens";
import { BAR_OPTIONS, plateColor, platesFor } from "../../lib/plates";
import { Icon } from "../ui";

interface PlateCalculatorProps {
  open: boolean;
  onClose: () => void;
  /** Peso de partida: el de la serie en curso o el de la última registrada. */
  initialWeight: number;
}

const BAR_KEY = "feeg.plateBar";

/**
 * Hoja inferior con la barra dibujada: qué discos van a cada lado para el peso de la serie. Ahorra
 * hacer cuentas entre series ("100 kg son 40 por lado: 25 + 15").
 */
export default function PlateCalculator({ open, onClose, initialWeight }: PlateCalculatorProps) {
  const tk = getWorkoutTokens();
  const reduceMotion = useReducedMotion();
  const [weight, setWeight] = useState(String(initialWeight || 60));
  const [bar, setBar] = useState(20);

  useEffect(() => {
    if (!open) return;
    setWeight(String(initialWeight || 60));
    try {
      const saved = Number(localStorage.getItem(BAR_KEY));
      if (BAR_OPTIONS.includes(saved)) setBar(saved);
    } catch {
      /* sin almacenamiento: barra de 20 */
    }
  }, [open, initialWeight]);

  const chooseBar = (b: number) => {
    setBar(b);
    try {
      localStorage.setItem(BAR_KEY, String(b));
    } catch {
      /* sin almacenamiento */
    }
  };

  const target = Number(String(weight).replace(",", "."));
  const result = platesFor(target, bar);
  const step = (delta: number) => setWeight((w) => String(Math.max(bar, Math.round((Number(String(w).replace(",", ".")) || bar) + delta) * 100) / 100 || bar));

  if (typeof document === "undefined") return null;
  // Portal a <body>: dentro del paginador, cuyas páginas se animan con transform, un
  // `position: fixed` queda atado a la página y no a la pantalla.
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="plates"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduceMotion ? undefined : { opacity: 0 }}
          onClick={onClose}
          style={{ position: "fixed", inset: 0, zIndex: 4000, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Calculadora de discos"
            onClick={(e) => e.stopPropagation()}
            initial={reduceMotion ? false : { y: 40 }}
            animate={{ y: 0 }}
            exit={reduceMotion ? undefined : { y: 40 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            style={{ width: "100%", maxWidth: 520, background: tk.surface, borderRadius: "22px 22px 0 0", padding: "10px 18px calc(22px + env(safe-area-inset-bottom))", boxSizing: "border-box" }}
          >
            <div style={{ width: 38, height: 4, borderRadius: 4, background: tk.hairline, margin: "0 auto 14px" }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <span style={{ color: tk.text, fontWeight: 800, fontSize: "1.05rem" }}>Discos por lado</span>
              <button type="button" onClick={onClose} aria-label="Cerrar" style={{ width: 32, height: 32, borderRadius: 10, border: "none", background: tk.surfaceAlt, color: tk.text, display: "grid", placeItems: "center", cursor: "pointer" }}>
                <Icon name="close" size={16} />
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button type="button" onClick={() => step(-2.5)} className="feeg-press" style={stepBtn(tk)}>−2,5</button>
              <div style={{ flex: 1, display: "flex", alignItems: "baseline", justifyContent: "center", gap: 6, background: tk.surfaceAlt, borderRadius: 14, padding: "6px 10px" }}>
                <input
                  aria-label="Peso total"
                  inputMode="decimal"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  style={{ width: "100%", maxWidth: 120, background: "none", border: "none", outline: "none", color: tk.text, fontSize: "2rem", fontWeight: 900, textAlign: "center", fontVariantNumeric: "tabular-nums" }}
                />
                <span style={{ color: tk.textMuted, fontWeight: 700 }}>kg</span>
              </div>
              <button type="button" onClick={() => step(2.5)} className="feeg-press" style={stepBtn(tk)}>+2,5</button>
            </div>

            <div role="radiogroup" aria-label="Barra" style={{ display: "flex", gap: 6, marginTop: 12 }}>
              {BAR_OPTIONS.map((b) => (
                <button
                  key={b}
                  type="button"
                  role="radio"
                  aria-checked={bar === b}
                  onClick={() => chooseBar(b)}
                  style={{ flex: 1, height: 34, borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 800, fontSize: "0.8rem", background: bar === b ? tk.accentSoft : tk.surfaceAlt, color: bar === b ? tk.accent : tk.textMuted }}
                >
                  Barra {b} kg
                </button>
              ))}
            </div>

            {/* La barra dibujada: un lado, de dentro hacia fuera, con altura según el peso del disco. */}
            <div aria-hidden style={{ display: "flex", alignItems: "center", height: 118, marginTop: 18, padding: "0 6px" }}>
              <div style={{ width: 54, height: 10, borderRadius: "5px 0 0 5px", background: "#8b8f96" }} />
              <div style={{ width: 10, height: 34, borderRadius: 3, background: "#6b6f76" }} />
              {result.perSide.map((p, i) => (
                <motion.div
                  key={`${p}-${i}-${bar}`}
                  initial={reduceMotion ? false : { opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  style={{
                    width: p >= 10 ? 16 : 12,
                    height: Math.max(38, Math.min(112, 40 + p * 2.9)),
                    marginLeft: 3,
                    borderRadius: 4,
                    background: plateColor(p),
                    boxShadow: "inset -3px 0 0 rgba(0,0,0,0.25)",
                  }}
                />
              ))}
              <div style={{ flex: 1, height: 10, borderRadius: "0 5px 5px 0", background: "#8b8f96", marginLeft: 3, minWidth: 20 }} />
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8, minHeight: 30 }}>
              {result.perSide.length === 0 ? (
                <span style={{ color: tk.textMuted, fontSize: "0.86rem" }}>Sólo la barra ({bar} kg).</span>
              ) : (
                Object.entries(
                  result.perSide.reduce<Record<string, number>>((acc, p) => ({ ...acc, [p]: (acc[p] || 0) + 1 }), {})
                ).sort((a, b) => Number(b[0]) - Number(a[0])).map(([p, n]) => (
                  <span key={p} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 99, background: tk.surfaceAlt, color: tk.text, fontWeight: 800, fontSize: "0.82rem" }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: plateColor(Number(p)) }} />
                    {n} × {String(p).replace(".", ",")} kg
                  </span>
                ))
              )}
            </div>
            {result.remainder > 0 && (
              <div style={{ marginTop: 8, color: tk.warning, fontSize: "0.8rem", fontWeight: 700 }}>
                Con estos discos llegas a {String(result.achieved).replace(".", ",")} kg (faltan {String(result.remainder).replace(".", ",")} kg).
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

function stepBtn(tk: ReturnType<typeof getWorkoutTokens>): React.CSSProperties {
  return { width: 58, height: 52, borderRadius: 14, border: "none", background: tk.surfaceAlt, color: tk.text, fontWeight: 800, fontSize: "0.9rem", cursor: "pointer", flexShrink: 0 };
}
