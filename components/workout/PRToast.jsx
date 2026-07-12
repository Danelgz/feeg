import { useEffect, useRef, useState } from "react";
import { getWorkoutTokens } from "../../lib/tokens";
import { pickPrimaryPRType } from "../../lib/exerciseStats";
import { Icon } from "../ui";

const HOLD_MS = 3200;
const TYPE_LABEL_KEYS = {
  weight: "pr_type_weight",
  reps: "pr_type_reps",
  oneRM: "pr_type_onerm",
  setVolume: "pr_type_set_volume",
};

function formatDelta(n) {
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1).replace(".", ",");
}

function formatTypeValue(type, value, weightUnit) {
  if (type === "reps") return String(Math.round(value));
  return `${formatDelta(value)}${weightUnit}`;
}

function formatTypeDeltaShort(primary, item, t) {
  switch (primary.type) {
    case "weight":
      return t("pr_toast_weight_delta")
        .replace("{delta}", formatDelta(primary.deltaAbsolute))
        .replace("{unit}", item.weightUnit)
        .replace("{reps}", String(item.reps));
    case "reps":
      return t("pr_toast_reps_delta")
        .replace("{delta}", String(Math.round(primary.deltaAbsolute)))
        .replace("{weight}", formatDelta(item.weight))
        .replace("{unit}", item.weightUnit);
    case "oneRM":
      return t("pr_toast_percent_delta").replace("{pct}", String(Math.round(primary.deltaPercent ?? 0)));
    case "setVolume":
      return t("pr_toast_volume_delta").replace("{delta}", formatDelta(primary.deltaAbsolute)).replace("{unit}", item.weightUnit);
    default:
      return "";
  }
}

function buildSummary(item, t) {
  if (item.isFirstEver) {
    return {
      title: t("pr_toast_first_title"),
      detail: t("pr_toast_first_detail").replace("{name}", item.exerciseName),
    };
  }

  const title = t("pr_toast_title");

  if (item.tier === "historic") {
    const oneRMType = item.types.find((x) => x.type === "oneRM");
    if (oneRMType && oneRMType.deltaPercent != null) {
      return {
        title,
        detail: `${item.exerciseName} — ${t("pr_toast_historic_detail").replace(
          "{pct}",
          String(Math.round(oneRMType.deltaPercent))
        )}`,
      };
    }
  }

  const primary = pickPrimaryPRType(item.types);
  const deltaText = primary ? formatTypeDeltaShort(primary, item, t) : "";
  let detail = deltaText ? `${item.exerciseName} — ${deltaText}` : item.exerciseName;
  if (item.tier === "major") detail += t("pr_toast_major_suffix");

  return { title, detail };
}

/**
 * Aviso de récord personal — arriba de la pantalla, para que se lea sin competir con los
 * controles inferiores. La cola vive en useWorkoutSession (qué toca mostrar); el temporizador de
 * cuánto se mantiene visible vive aquí, porque ahora es interactivo: un tap expande el detalle
 * (qué tipos de récord se han conseguido, antes/ahora de cada uno, y el 1RM estimado) y pausa la
 * desaparición automática mientras se lee.
 */
export default function PRToast({ item, t, onDismiss }) {
  const tk = getWorkoutTokens();
  const translate = t || ((s) => s);
  const [rendered, setRendered] = useState(item);
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const dismissTimeoutRef = useRef(null);

  const clearDismissTimer = () => {
    if (dismissTimeoutRef.current) {
      clearTimeout(dismissTimeoutRef.current);
      dismissTimeoutRef.current = null;
    }
  };

  const scheduleDismiss = () => {
    clearDismissTimer();
    dismissTimeoutRef.current = setTimeout(() => onDismiss?.(), HOLD_MS);
  };

  useEffect(() => {
    if (!item) {
      setVisible(false);
      setExpanded(false);
      clearDismissTimer();
      const timeout = setTimeout(() => setRendered(null), 260);
      return () => clearTimeout(timeout);
    }
    setVisible(false);
    setExpanded(false);
    setRendered(item);
    let raf2;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setVisible(true));
    });
    scheduleDismiss();
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
      clearDismissTimer();
    };
  }, [item?.id]);

  if (!rendered) return null;

  const canExpand = !rendered.isFirstEver;
  const { title, detail } = buildSummary(rendered, translate);
  const showStandaloneOneRM = canExpand && rendered.estimatedOneRM > 0 && !rendered.types.some((tr) => tr.type === "oneRM");

  const handleClick = () => {
    if (!canExpand) return;
    setExpanded((prev) => {
      const next = !prev;
      if (next) {
        clearDismissTimer(); // con el detalle abierto no desaparece solo, hasta que se vuelva a tocar
      } else {
        scheduleDismiss();
      }
      return next;
    });
  };

  return (
    <div
      onClick={handleClick}
      style={{
        position: "fixed",
        top: "62px",
        left: "16px",
        right: "16px",
        maxWidth: "420px",
        margin: "0 auto",
        transform: `translateY(${visible ? "0" : "-10px"})`,
        opacity: visible ? 1 : 0,
        transition: "opacity 320ms cubic-bezier(0.16,1,0.3,1), transform 320ms cubic-bezier(0.16,1,0.3,1)",
        backgroundColor: "rgba(17,17,17,0.94)", // tk.surface a ~94% para el efecto glass
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: `1px solid ${tk.accent}55`,
        borderRadius: tk.radius.lg,
        boxShadow: "0 8px 32px rgba(0,0,0,0.45), 0 0 24px rgba(46,230,197,0.16)",
        zIndex: 2000,
        cursor: canExpand ? "pointer" : "default",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px" }}>
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: tk.radius.full,
            backgroundColor: tk.accentSoft,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon name="trendUp" size={18} color={tk.accent} />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ color: tk.text, fontSize: "0.9rem", fontWeight: 700, lineHeight: 1.3 }}>{title}</div>
          <div
            style={{
              color: tk.textMuted,
              fontSize: "0.78rem",
              lineHeight: 1.3,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {detail}
          </div>
        </div>
        {canExpand && (
          <Icon
            name="chevronRight"
            size={16}
            color={tk.textFaint}
            style={{
              flexShrink: 0,
              transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
              transition: "transform 250ms ease",
            }}
          />
        )}
      </div>

      {canExpand && (
        <div style={{ maxHeight: expanded ? "220px" : "0px", overflow: "hidden", transition: "max-height 280ms ease" }}>
          <div style={{ padding: "0 16px 14px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ paddingTop: "10px" }}>
              {rendered.types.map((tr) => (
                <div
                  key={tr.type}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0" }}
                >
                  <span style={{ color: tk.textMuted, fontSize: "0.8rem" }}>{translate(TYPE_LABEL_KEYS[tr.type])}</span>
                  <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>
                    <span style={{ color: tk.textFaint }}>{formatTypeValue(tr.type, tr.previousValue, rendered.weightUnit)}</span>
                    <span style={{ color: tk.textFaint, margin: "0 6px" }}>→</span>
                    <span style={{ color: tk.accent }}>{formatTypeValue(tr.type, tr.newValue, rendered.weightUnit)}</span>
                  </span>
                </div>
              ))}
              {showStandaloneOneRM && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "6px 0",
                    marginTop: "2px",
                    borderTop: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <span style={{ color: tk.textFaint, fontSize: "0.78rem" }}>{translate("pr_toast_current_1rm")}</span>
                  <span style={{ color: tk.textMuted, fontSize: "0.78rem", fontWeight: 600 }}>
                    {formatDelta(rendered.estimatedOneRM)}
                    {rendered.weightUnit}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
