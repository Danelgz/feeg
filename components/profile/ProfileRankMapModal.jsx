import { getTokens } from "../../lib/tokens";
import { RANKS, MAX_LEVEL, getRankPosition } from "../../data/ranks";
import { RankArt, Icon, EmptyState } from "../ui";
import MuscleMap from "../MuscleMap";

const RANK_SCALE = `linear-gradient(90deg, ${RANKS.map((r) => r.color).join(", ")})`;

/**
 * "Cuerpo de rangos" en una ventana modal, reutilizable desde el perfil propio y el ajeno.
 *
 * Solo pinta a nivel de GRUPO muscular (groupRanks: { [group]: { level, rankableExercises } }),
 * nunca ejercicio a ejercicio: es el único dato que existe para un perfil ajeno (sus medidas y
 * PRs son privados — ver el comentario de sincronización en pages/profile.js), así que se usa la
 * misma forma de datos para los dos casos en vez de mantener una vista "completa" para ti mismo y
 * otra "reducida" para los demás. El desglose ejercicio a ejercicio de siempre sigue en
 * Estadísticas → Rangos, que sólo tiene sentido para tus propios datos.
 *
 * fontWeight: 500 en el contenedor es la base — Manrope a 400 (el normal del navegador) se lee
 * fino sobre el fondo oscuro a estos tamaños pequeños; el texto propio de aquí ya pide 600+ donde
 * importa, pero el "hint" que dibuja MuscleMap internamente no fija su propio peso, así que hereda
 * de aquí.
 */
export default function ProfileRankMapModal({
  isDark = true,
  overallLevel,
  prestigeLevels = 0,
  groupRanks,
  sex,
  faceStyleId,
  displayName,
  t,
  onClose,
}) {
  const tk = getTokens(isDark);
  const groups = groupRanks || {};
  const hasAnyRank = typeof overallLevel === "number" && Object.keys(groups).length > 0;
  const overallPosition = typeof overallLevel === "number" ? getRankPosition(overallLevel, prestigeLevels) : null;

  const describeGroup = (group) => {
    const g = groups[group];
    return g ? { position: getRankPosition(g.level), rankableExercises: g.rankableExercises } : null;
  };

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 4000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        backgroundColor: "rgba(4, 8, 8, 0.72)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
      }}
    >
      <style>{`
        @import url("https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&display=swap");
        @keyframes profileRankMapIn { from { opacity: 0; transform: scale(0.96) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @media (prefers-reduced-motion: reduce) { .profile-rankmap-dialog { animation: none; } }
      `}</style>

      <div
        role="dialog"
        aria-modal="true"
        className="profile-rankmap-dialog"
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "440px",
          maxHeight: "min(760px, calc(100dvh - 40px))",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          borderRadius: "24px",
          backgroundColor: tk.surface,
          border: `1px solid ${tk.border}`,
          boxShadow: "0 28px 90px rgba(0,0,0,0.42)",
          animation: "profileRankMapIn 220ms cubic-bezier(0.16, 1, 0.3, 1)",
          fontFamily: "'Manrope', -apple-system, 'Segoe UI', sans-serif",
          fontWeight: 500,
        }}
      >
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            padding: "20px 22px 18px",
            borderBottom: `1px solid ${tk.border}`,
            background: overallPosition
              ? `radial-gradient(120% 140% at 90% -10%, ${overallPosition.rank.color}26 0%, ${overallPosition.rank.color}0a 45%, transparent 75%)`
              : "none",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "14px" }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: tk.accent, fontSize: "0.68rem", fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase" }}>
                FEEG · Rangos
              </div>
              <div style={{ fontSize: "1.2rem", fontWeight: 800, color: tk.text, marginTop: "4px", letterSpacing: "-0.02em" }}>
                Cuerpo de rangos
              </div>
              {displayName && (
                <div style={{ fontSize: "0.82rem", fontWeight: 600, color: tk.textMuted, marginTop: "3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {displayName}
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="feeg-press feeg-hover"
              style={{
                flexShrink: 0,
                width: "34px",
                height: "34px",
                display: "grid",
                placeItems: "center",
                border: `1px solid ${tk.border}`,
                borderRadius: "12px",
                background: "transparent",
                color: tk.textMuted,
                cursor: "pointer",
                "--feeg-hover-bg": tk.surfaceHover,
                "--feeg-hover-fg": tk.text,
                "--feeg-press-scale": 0.92,
              }}
            >
              <Icon name="close" size={16} />
            </button>
          </div>

          {overallPosition && (
            <div style={{ display: "flex", alignItems: "center", gap: "14px", marginTop: "18px" }}>
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "18px",
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                  backgroundColor: `${overallPosition.rank.color}1f`,
                  border: `1px solid ${overallPosition.rank.color}59`,
                }}
              >
                <RankArt rank={overallPosition.rank} tier={overallPosition.tier} size={32} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: "1.3rem", fontWeight: 800, color: overallPosition.rank.color, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
                  {overallPosition.label}
                </div>
                <div style={{ fontSize: "0.78rem", fontWeight: 700, color: tk.textMuted, marginTop: "3px" }}>
                  {overallPosition.prestige ? `Nivel ${MAX_LEVEL} · el tope de la escalera` : `Nivel ${overallPosition.level} de ${MAX_LEVEL}`}
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "18px 22px 24px" }}>
          {!hasAnyRank ? (
            <EmptyState
              isDark={isDark}
              icon="award"
              title="Todavía no hay rangos"
              description="En cuanto haya ejercicios puntuables con marca registrada, el cuerpo se irá coloreando por grupo."
            />
          ) : (
            <MuscleMap
              seriesByMuscle={{}}
              isDark={isDark}
              sex={sex}
              faceStyleId={faceStyleId}
              labelForGroup={(group) => (t ? t(group) || group : group)}
              colorForGroup={(group) => describeGroup(group)?.position.rank.color ?? null}
              hint="Toca un músculo para ver su rango."
              ariaLabelForGroup={(group) => {
                const info = describeGroup(group);
                const label = t ? t(group) || group : group;
                return info ? `${label}: ${info.position.label}` : `${label}: sin rango todavía`;
              }}
              readoutForGroup={(group) => {
                const info = describeGroup(group);
                const label = t ? t(group) || group : group;
                if (!info) {
                  return (
                    <span style={{ fontSize: "0.85rem", fontWeight: 600, color: tk.textFaint }}>
                      {label} · sin ejercicios puntuables
                    </span>
                  );
                }
                const { position, rankableExercises } = info;
                return (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", flexWrap: "wrap", justifyContent: "center" }}>
                    <RankArt rank={position.rank} tier={position.tier} size={16} />
                    <span style={{ fontSize: "0.9rem", color: tk.text, fontWeight: 700 }}>{label}</span>
                    <span style={{ color: tk.textMuted, fontWeight: 600 }}>·</span>
                    <span style={{ fontSize: "0.9rem", color: position.rank.color, fontWeight: 800 }}>{position.label}</span>
                    {typeof rankableExercises === "number" && (
                      <span style={{ fontSize: "0.72rem", fontWeight: 700, color: tk.textFaint }}>
                        {rankableExercises} {rankableExercises === 1 ? "ejercicio" : "ejercicios"}
                      </span>
                    )}
                  </span>
                );
              }}
              legend={
                <div style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", maxWidth: "340px" }}>
                  <span style={{ fontSize: "0.68rem", fontWeight: 700, color: tk.textFaint, flexShrink: 0 }}>{RANKS[0].name}</span>
                  <span aria-hidden="true" style={{ flex: 1, height: "6px", borderRadius: "999px", background: RANK_SCALE, border: `1px solid ${tk.border}` }} />
                  <span style={{ fontSize: "0.68rem", fontWeight: 700, color: tk.textFaint, flexShrink: 0 }}>{RANKS[RANKS.length - 1].name}</span>
                </div>
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}
