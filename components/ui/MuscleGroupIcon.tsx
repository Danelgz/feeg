import { getTokens } from "../../lib/tokens";
import * as MALE_BODY from "../../data/muscleMapPaths";
import { MUSCLE_GROUPS } from "../../data/muscleMapRegions";
import Icon from "./Icon";

// Grupos del catálogo (data/exercises.js) que no son un músculo dibujable en el cuerpo — no tienen
// región propia en data/muscleMapRegions.ts (ver el comentario de ese archivo: "doce grupos tienen
// región dibujable"). Para estos cinco se cae a un icono genérico en vez de un cuerpo silueteado.
const FALLBACK_ICON: Record<string, string> = {
  Cardio: "flame",
  Aductor: "dumbbell",
  Abductor: "dumbbell",
  "Cuerpo Completo": "users",
  Movilidad: "zap",
};

interface MuscleGroupIconProps {
  group: string;
  isDark?: boolean;
  size?: number;
}

/**
 * Icono de un grupo muscular del catálogo: el cuerpo (siempre la anatomía masculina — es un icono
 * de referencia genérico del catálogo, no una estadística de un usuario concreto, así que no
 * depende de `user.sex`) con solo ESE grupo coloreado, el resto en la silueta neutra de siempre.
 * Mismos paths que el mapa muscular grande (data/muscleMapPaths.ts) a tamaño de icono — nada de
 * arte nuevo que mantener.
 *
 * Cuando el grupo aparece en las dos vistas (delante y detrás, p.ej. Hombros) se usa la de delante:
 * es la que se reconoce más rápido de un vistazo pequeño.
 */
export default function MuscleGroupIcon({ group, isDark = true, size = 56 }: MuscleGroupIconProps) {
  const tk = getTokens(isDark);
  const hasRegion = (MUSCLE_GROUPS as readonly string[]).includes(group);

  if (!hasRegion) {
    const iconName = FALLBACK_ICON[group] || "dumbbell";
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "16px",
          backgroundColor: tk.accentSoft,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon name={iconName} size={Math.round(size * 0.42)} color={tk.accent} />
      </div>
    );
  }

  const view = MALE_BODY.FRONT_MUSCLES[group] ? "front" : "back";
  const silhouette = view === "front" ? MALE_BODY.FRONT_SILHOUETTE : MALE_BODY.BACK_SILHOUETTE;
  const musclePaths = (view === "front" ? MALE_BODY.FRONT_MUSCLES : MALE_BODY.BACK_MUSCLES)[group] || [];
  const silhouetteFill = isDark ? "#ffffff26" : "#a7b3c1";

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "16px",
        backgroundColor: tk.surfaceAlt,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      <svg viewBox={MALE_BODY.ANATOMY_VIEW_BOX} style={{ width: "82%", height: "82%", display: "block" }} aria-hidden="true">
        {silhouette.map((p, i) => (
          <path key={`sil-${i}`} d={p.d} fill={p.fill === "none" ? "none" : silhouetteFill} />
        ))}
        {musclePaths.map((p, i) => (
          <path key={`m-${i}`} d={p.d} fill={tk.accent} />
        ))}
      </svg>
    </div>
  );
}
