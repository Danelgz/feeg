import { useEffect, useState } from "react";
import { getWorkoutTokens } from "../../lib/tokens";
import { Icon } from "../ui";

function formatDelta(n) {
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1).replace(".", ",");
}

function buildCopy(item, t) {
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

/**
 * Aviso flotante de récord personal. La cola y la temporización viven en useWorkoutSession —
 * este componente solo anima entrada/salida y hace un cross-fade breve cuando cambia el `item`
 * en cola (mismo patrón "el hook manda, el componente solo pinta" que FloatingRestTimer).
 */
export default function PRToast({ item, t }) {
  const tk = getWorkoutTokens();
  const translate = t || ((s) => s);
  const [rendered, setRendered] = useState(item);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!item) {
      setVisible(false);
      const timeout = setTimeout(() => setRendered(null), 260);
      return () => clearTimeout(timeout);
    }
    setVisible(false);
    setRendered(item);
    let raf2;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setVisible(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
  }, [item?.id]);

  if (!rendered) return null;

  const { title, detail } = buildCopy(rendered, translate);

  return (
    <div
      style={{
        position: "fixed",
        bottom: "170px",
        left: "50%",
        transform: `translateX(-50%) translateY(${visible ? "0" : "12px"})`,
        opacity: visible ? 1 : 0,
        transition: "opacity 320ms cubic-bezier(0.16,1,0.3,1), transform 320ms cubic-bezier(0.16,1,0.3,1)",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        maxWidth: "320px",
        padding: "14px 18px",
        backgroundColor: "rgba(17,17,17,0.92)", // tk.surface a ~92% para el efecto glass
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(46,230,197,0.3)",
        borderRadius: tk.radius.lg,
        boxShadow: "0 8px 32px rgba(0,0,0,0.4), 0 0 24px rgba(46,230,197,0.18)",
        zIndex: 1600,
        pointerEvents: "none",
      }}
    >
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
      <div style={{ minWidth: 0 }}>
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
    </div>
  );
}
