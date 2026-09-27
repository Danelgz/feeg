import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { getWorkoutTokens } from "../../lib/tokens";
import { Icon } from "../ui";

const TYPE_KEYS = [
  { key: "N", labelKey: "series_type_normal", descKey: "series_type_normal_desc" },
  { key: "W", labelKey: "series_type_warmup", descKey: "series_type_warmup_desc" },
  { key: "D", labelKey: "series_type_dropset", descKey: "series_type_dropset_desc" },
];

/**
 * Selector de tipo de serie (N/W/D) + eliminar esta serie (con confirmación en el padre).
 *
 * Hoja inferior en vez de diálogo centrado: se usa entre series, con el móvil en una mano. Va en un
 * portal a <body> porque las páginas del paginador del entreno se animan con transform, y eso ata
 * cualquier `position: fixed` de dentro a la página en lugar de a la pantalla.
 */
export default function SeriesTypeModal({ open, currentType, onSelectType, onRequestDelete, onClose, t }) {
  const tk = getWorkoutTokens();
  const reduceMotion = useReducedMotion();
  const translate = t || ((s) => s);
  if (typeof document === "undefined") return null;

  const colorFor = (key) => (key === "W" ? tk.accent : key === "D" ? tk.warning : tk.text);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="series-type"
          onClick={onClose}
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduceMotion ? undefined : { opacity: 0 }}
          style={{ position: "fixed", inset: 0, zIndex: 4000, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={translate("series_type_title")}
            onClick={(e) => e.stopPropagation()}
            initial={reduceMotion ? false : { y: 40 }}
            animate={{ y: 0 }}
            exit={reduceMotion ? undefined : { y: 40 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            style={{ width: "100%", maxWidth: 520, background: tk.surface, borderRadius: "22px 22px 0 0", padding: "10px 18px calc(18px + env(safe-area-inset-bottom))", boxSizing: "border-box" }}
          >
            <div style={{ width: 38, height: 4, borderRadius: 4, background: tk.hairline, margin: "0 auto 14px" }} />
            <div style={{ color: tk.text, fontWeight: 800, fontSize: "1.05rem" }}>{translate("series_type_title")}</div>
            <div style={{ color: tk.textFaint, fontSize: "0.8rem", marginTop: 3, marginBottom: 10 }}>{translate("series_type_subtitle")}</div>

            {TYPE_KEYS.map(({ key, labelKey, descKey }, i) => {
              const isSelected = currentType === key;
              const color = colorFor(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onSelectType(key)}
                  aria-pressed={isSelected}
                  className="feeg-press"
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "12px 10px",
                    margin: "0 -10px",
                    boxSizing: "content-box",
                    border: "none",
                    borderTop: i ? `1px solid ${tk.hairline}` : "none",
                    borderRadius: 0,
                    background: "none",
                    textAlign: "left",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    "--feeg-press-scale": 0.98,
                  }}
                >
                  <span
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 12,
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
                      fontWeight: 900,
                      fontSize: "1rem",
                      color: key === "N" ? tk.text : color,
                      background: key === "N" ? tk.surfaceAlt : `${color}24`,
                    }}
                  >
                    {key}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontWeight: 800, fontSize: "0.96rem", color: tk.text }}>{translate(labelKey)}</span>
                    <span style={{ display: "block", color: tk.textFaint, fontSize: "0.78rem", marginTop: 2 }}>{translate(descKey)}</span>
                  </span>
                  <span
                    aria-hidden
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 99,
                      flexShrink: 0,
                      display: "grid",
                      placeItems: "center",
                      background: isSelected ? tk.accent : "transparent",
                      boxShadow: isSelected ? "none" : `inset 0 0 0 2px ${tk.hairline}`,
                      color: tk.onAccent,
                    }}
                  >
                    {isSelected && <Icon name="check" size={13} strokeWidth={3} />}
                  </span>
                </button>
              );
            })}

            {onRequestDelete && (
              <button
                type="button"
                onClick={onRequestDelete}
                className="feeg-press"
                style={{
                  width: "100%",
                  height: 48,
                  marginTop: 12,
                  background: tk.dangerSoft,
                  color: tk.danger,
                  border: "none",
                  borderRadius: 14,
                  fontWeight: 800,
                  fontFamily: "inherit",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <Icon name="trash" size={15} />
                {translate("delete_series")}
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
