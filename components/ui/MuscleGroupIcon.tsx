import { getTokens } from "../../lib/tokens";
import * as MALE_BODY from "../../data/muscleMapPaths";
import { MUSCLE_GROUPS } from "../../data/muscleMapRegions";
import Icon from "./Icon";

// Grupos del catálogo (data/exercises.js) que no son un músculo dibujable en el cuerpo — no tienen
// región propia en data/muscleMapRegions.ts (ver el comentario de ese archivo: "doce grupos tienen
// región dibujable"). Para estos tres no hay más remedio que caer a un icono genérico en vez de un
// cuerpo silueteado — no hay ninguna zona anatómica razonable que resalten.
const FALLBACK_ICON: Record<string, string> = {
  Cardio: "flame",
  "Cuerpo Completo": "users",
  Movilidad: "zap",
};

// Aductor y Abductor SÍ tienen una zona identificable en la propia lámina de origen
// (public/Referencia2.png) — el muslo interno y el muslo externo, respectivamente — pero el
// pipeline de trazado (scripts/trace-muscle-map.mjs → data/muscle-map-groups.json →
// data/muscleMapPaths.ts) los agrupó dentro de "Cuádriceps" en vez de asignarles su propio grupo,
// así que no tienen una entrada propia en FRONT_MUSCLES. Re-trazar la lámina entera y separar esos
// blobs en el pipeline oficial tocaría el mapa muscular grande (estadísticas, rangos) — un cambio
// mucho más amplio que un icono del catálogo. Esto reutiliza los mismos cuatro blobs de esa misma
// traza (interno/externo de cada pierna, extraídos directamente de la lámina) SOLO para este icono:
// una aproximación razonable, no una separación anatómica oficial. Si algún día se decide separar
// Aductor/Abductor de verdad en el mapa grande, esto se puede borrar y volver a `hasRegion`.
const EXTRA_MUSCLE_PATHS: Record<string, { d: string }[]> = {
  Aductor: [
    { d: "M150.7,446.1C155.2,450.5 172.6,465.7 180.6,475.7C188.7,485.7 199.7,506.2 204.3,512.6C208.8,518.9 210.4,516.7 211.1,518C211.8,519.3 209.7,521.1 208.9,521.5C208.2,521.9 207.5,512.2 206.2,520.9C204.9,529.7 203,564.2 200.3,580C197.6,595.8 190.7,619.7 188.4,626.3C186,633 185,627.5 184.6,624.1C184.2,620.6 186,610.6 185.6,603.3C185.2,595.9 186.2,593 181.7,574.8C177.1,556.7 160.2,500.8 155.2,482C150.2,463.2 149.1,455 148.4,449.7C147.7,444.3 150.2,446.7 150.5,446.2C150.9,445.6 146.2,441.7 150.7,446.1Z" },
    { d: "M278.1,446.1C278.6,446.6 282.1,444.3 281.6,449.7C281.1,455 279.8,463.2 274.8,482C269.8,500.8 252.9,556.7 248.3,574.8C243.8,593 244.8,595.9 244.4,603.3C244,610.6 245.6,620.6 245.4,624.1C245.2,627.5 244.3,626.8 243.2,626.3C242.2,625.9 240.5,628.1 238.5,621.1C236.5,614.2 231.9,595 229.7,580C227.5,565 225.1,529.7 223.8,520.9C222.5,512.2 221.8,521.9 221.1,521.5C220.3,521.1 218.2,519.3 218.9,518C219.6,516.7 221.2,518.9 225.7,512.6C230.3,506.2 241.5,485.6 249.4,475.7C257.2,465.7 273.6,450.6 277.9,446.2C282.2,441.7 277.5,445.6 278.1,446.1Z" },
  ],
  Abductor: [
    { d: "M138,440.2C138.7,441 138.6,430 142.5,445.5C146.4,461 162.4,523.2 164,543.7C165.7,564.2 157.3,570 153.2,582.1C149.1,594.2 139.8,618.8 136.4,624.4C133.1,630 132.7,624.3 130.8,619.4C128.9,614.5 125.6,601.8 123.9,591.7C122.1,581.7 119.7,564.2 119,552.5C118.2,540.9 118.1,525.3 119,514.1C119.8,502.9 122,488.9 124.8,477.8C127.7,466.8 135.8,445.9 137.8,440.3C139.7,434.6 137.2,439.4 138,440.2Z" },
    { d: "M290.8,440.2C291.4,440.5 293,440 294.3,442.4C295.6,444.8 296.6,445.8 299.3,456.3C301.9,466.7 310.7,493.7 312,512.1C313.3,530.5 309.7,563.8 308.1,579C306.5,594.2 303.2,606.5 301.2,613.3C299.3,620.1 296.8,623.3 295.2,624.4C293.6,625.4 292.4,624.2 290.5,620.3C288.6,616.5 286.4,610.3 282.7,598.8C279,587.3 267.1,558.8 266,543.7C264.8,528.7 271.1,513.9 274.8,498.4C278.5,482.9 288.2,449 290.6,440.3C293,431.6 290.3,439.9 290.8,440.2Z" },
  ],
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
 * Mismos paths que el mapa muscular grande (data/muscleMapPaths.ts) a tamaño de icono para los doce
 * grupos oficiales, más Aductor/Abductor vía EXTRA_MUSCLE_PATHS (ver su comentario) — el resto cae
 * a un icono genérico en una tarjeta de color.
 *
 * Cuando el grupo aparece en las dos vistas (delante y detrás, p.ej. Hombros) se usa la de delante:
 * es la que se reconoce más rápido de un vistazo pequeño.
 */
export default function MuscleGroupIcon({ group, isDark = true, size = 56 }: MuscleGroupIconProps) {
  const tk = getTokens(isDark);
  const hasOfficialRegion = (MUSCLE_GROUPS as readonly string[]).includes(group);
  const extraPaths = EXTRA_MUSCLE_PATHS[group];

  if (!hasOfficialRegion && !extraPaths) {
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

  // Aductor/Abductor son siempre vista frontal (así es como se extrajeron los blobs) — para los
  // doce grupos oficiales, delante si están ahí dibujados, si no detrás.
  const view = extraPaths || MALE_BODY.FRONT_MUSCLES[group] ? "front" : "back";
  const silhouette = view === "front" ? MALE_BODY.FRONT_SILHOUETTE : MALE_BODY.BACK_SILHOUETTE;
  const musclePaths = extraPaths || (view === "front" ? MALE_BODY.FRONT_MUSCLES : MALE_BODY.BACK_MUSCLES)[group] || [];
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
