import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion, type PanInfo } from "motion/react";
import { getTokens } from "../../lib/tokens";
import { tapFeedback } from "../../lib/haptics";
import Icon from "./Icon";

export interface ActionSheetItem {
  key: string;
  label: string;
  icon: string;
  onSelect: () => void;
  danger?: boolean;
}

interface ActionSheetProps {
  open: boolean;
  onClose: () => void;
  isDark: boolean;
  title?: string;
  items: ActionSheetItem[];
  cancelLabel: string;
}

/**
 * Hoja de acciones inferior (estilo iOS) para las acciones secundarias de un elemento: editar,
 * duplicar, eliminar...
 *
 * Existe para sacar esas acciones de la tarjeta. Antes cada rutina llevaba tres botones visibles
 * (Iniciar / Editar / Eliminar, este último en rojo sólido): un tercio de la pantalla en botones,
 * y la acción destructiva con el mismo peso visual que la principal, a un dedo de distancia.
 */
export default function ActionSheet({ open, onClose, isDark, title, items, cancelLabel }: ActionSheetProps) {
  const tk = getTokens(isDark);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 70 || info.velocity.y > 500) onClose();
  };

  const surface = isDark ? "rgba(30, 30, 30, 0.97)" : "rgba(255, 255, 255, 0.98)";

  return (
    <AnimatePresence>
      {open && (
        <div style={{ position: "fixed", inset: 0, zIndex: 2000 }}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)" }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={reduceMotion ? { opacity: 0 } : { y: "110%" }}
            animate={reduceMotion ? { opacity: 1 } : { y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { y: "110%" }}
            transition={{ type: "spring", stiffness: 460, damping: 40 }}
            drag={reduceMotion ? false : "y"}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.04, bottom: 0.6 }}
            onDragEnd={onDragEnd}
            style={{
              position: "absolute",
              left: 10,
              right: 10,
              bottom: "calc(10px + env(safe-area-inset-bottom))",
              maxWidth: 520,
              margin: "0 auto",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div style={{ borderRadius: 20, overflow: "hidden", background: surface, boxShadow: tk.shadow.float }}>
              {title && (
                <div
                  style={{
                    padding: "14px 16px 12px",
                    textAlign: "center",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    color: tk.textMuted,
                    borderBottom: `1px solid ${tk.border}`,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {title}
                </div>
              )}
              {items.map((item, i) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    tapFeedback(item.danger ? "warning" : "tap");
                    onClose();
                    item.onSelect();
                  }}
                  className="feeg-press feeg-surface feeg-hover"
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "15px 18px",
                    border: "none",
                    borderTop: i === 0 ? "none" : `1px solid ${tk.border}`,
                    fontSize: "1rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    textAlign: "left",
                    "--feeg-bg": "transparent",
                    "--feeg-fg": item.danger ? tk.danger : tk.text,
                    "--feeg-hover-bg": tk.surfaceHover,
                    "--feeg-border-width": "0px",
                    "--feeg-press-scale": 0.98,
                  } as React.CSSProperties}
                >
                  <Icon name={item.icon} size={20} />
                  {item.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="feeg-press"
              style={{
                padding: "15px",
                borderRadius: 20,
                border: "none",
                background: surface,
                color: tk.accent,
                fontSize: "1rem",
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: tk.shadow.float,
              }}
            >
              {cancelLabel}
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
