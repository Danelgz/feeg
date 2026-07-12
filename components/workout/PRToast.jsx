import { useEffect, useRef, useState } from "react";
import { getWorkoutTokens } from "../../lib/tokens";
import { Icon } from "../ui";

const HOLD_MS = 3200;

function formatDelta(n) {
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1).replace(".", ",");
}

function buildSummary(item, t) {
  if (item.isFirstEver) {
    return {
      title: t("pr_toast_first_title"),
      detail: t("pr_toast_first_detail").replace("{name}", item.exerciseName),
    };
  }

  const title = t("pr_toast_title");

  if (item.tier === "historic" && item.deltaOneRMPercent != null) {
    return {
      title,
      detail: `${item.exerciseName} — ${t("pr_toast_historic_detail").replace(
        "{pct}",
        String(Math.round(item.deltaOneRMPercent))
      )}`,
    };
  }

  let deltaText = "";
  if (item.deltaWeight != null && item.deltaWeight > 0) {
    deltaText = t("pr_toast_weight_delta")
      .replace("{delta}", formatDelta(item.deltaWeight))
      .replace("{unit}", item.weightUnit)
      .replace("{reps}", String(item.reps));
  } else if (item.deltaOneRMPercent != null && item.deltaOneRMPercent > 0) {
    deltaText = t("pr_toast_percent_delta").replace("{pct}", String(Math.round(item.deltaOneRMPercent)));
  }

  let detail = deltaText ? `${item.exerciseName} — ${deltaText}` : item.exerciseName;
  if (item.tier === "major") detail += t("pr_toast_major_suffix");

  return { title, detail };
}

function buildReason(item, t) {
  if (item.isRepPR && item.isOneRMPR) return t("pr_toast_reason_both");
  if (item.isRepPR) return t("pr_toast_reason_weight_only");
  if (item.isOneRMPR) return t("pr_toast_reason_strength_only");
  return null;
}

/**
 * Aviso de récord personal — arriba de la pantalla, para que se lea sin competir con los
 * controles inferiores. La cola vive en useWorkoutSession (qué toca mostrar); el temporizador de
 * cuánto se mantiene visible vive aquí, porque ahora es interactivo: un tap expande el detalle
 * ("por qué" es récord + cuánto se ha mejorado) y pausa la desaparición automática mientras se lee.
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
  const reason = canExpand ? buildReason(rendered, translate) : null;

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
        border: `1px solid ${tk.prAccent}55`,
        borderRadius: tk.radius.lg,
        boxShadow: "0 8px 32px rgba(0,0,0,0.45), 0 0 24px rgba(255,214,10,0.16)",
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
            backgroundColor: tk.prAccentSoft,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon name="trendUp" size={18} color={tk.prAccent} />
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
        <div style={{ maxHeight: expanded ? "160px" : "0px", overflow: "hidden", transition: "max-height 280ms ease" }}>
          <div style={{ padding: "0 16px 16px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ display: "flex", gap: "20px", paddingTop: "12px", flexWrap: "wrap" }}>
              <div>
                <div style={{ color: tk.textFaint, fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {translate("pr_toast_before_label")}
                </div>
                <div style={{ color: tk.textMuted, fontSize: "0.85rem", fontWeight: 600, marginTop: "2px" }}>
                  {rendered.previousWeight != null
                    ? `${formatDelta(rendered.previousWeight)}${rendered.weightUnit} × ${rendered.reps}`
                    : "—"}
                </div>
              </div>
              <div>
                <div style={{ color: tk.prAccent, fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {translate("pr_toast_after_label")}
                </div>
                <div style={{ color: tk.text, fontSize: "0.85rem", fontWeight: 700, marginTop: "2px" }}>
                  {formatDelta(rendered.weight)}
                  {rendered.weightUnit} × {rendered.reps}
                </div>
              </div>
              {rendered.deltaOneRMPercent != null && (
                <div>
                  <div style={{ color: tk.textFaint, fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {translate("pr_toast_estimated_1rm")}
                  </div>
                  <div style={{ color: tk.prAccent, fontSize: "0.85rem", fontWeight: 700, marginTop: "2px" }}>
                    +{Math.round(rendered.deltaOneRMPercent)}%
                  </div>
                </div>
              )}
            </div>
            {reason && <div style={{ color: tk.textMuted, fontSize: "0.78rem", marginTop: "10px", lineHeight: 1.4 }}>{reason}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
