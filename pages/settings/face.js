import { useId } from "react";
import { useUser } from "../../context/UserContext";
import { getTokens } from "../../lib/tokens";
import { FACE_STYLES, DEFAULT_FACE_STYLE_ID, FACE_VIEW_BOX } from "../../data/faceStyles";
import { HEAD_BOX } from "../../components/MuscleMap";
import * as MALE_BODY from "../../data/muscleMapPaths";
import * as FEMALE_BODY from "../../data/muscleMapPathsFemale";
import SettingsSubpage from "../../components/settings/SettingsSubpage";

// Aire alrededor de la cabeza recortada: HEAD_BOX es el bbox exacto de la cabeza, y recortar justo
// en su borde deja las orejas y la línea de la mandíbula pegadas al marco de la miniatura. Abajo NO
// se aplica: el borde inferior de HEAD_BOX ya es la barbilla, y bajar de ahí mete el cuello/hombros
// en una miniatura que sólo debería mostrar la cara.
const HEAD_CROP_PADDING_RATIO = 0.14;

/**
 * Miniatura de un FaceStyle recortada sobre la cabeza REAL del cuerpo del usuario (mismo path,
 * mismo `HEAD_BOX`, mismo translate+scale que pinta `MuscleMap` de verdad), no una silueta
 * genérica: así el selector responde a "¿cómo se va a ver?" en vez de a una aproximación que luego
 * no coincide con el mapa muscular ni con Rangos.
 *
 * El recorte es una ELIPSE inscrita en el rectángulo de `HEAD_BOX` (+ aire), no el rectángulo en
 * sí: un rectángulo deja ver las esquinas de abajo, que en la lámina real son ya cuello/hombros —
 * la elipse toca el borde por el centro (donde está la cara de verdad) y se va cerrando hacia las
 * esquinas, así que corta justo lo que no es cara sin recortar nada de la cabeza.
 */
function FaceThumbnail({ style, isDark, sex, size = 56 }) {
  const clipId = `feeg-face-thumb-${useId().replace(/:/g, '')}`;
  const bodySex = sex === "female" ? "female" : "male";
  const body = bodySex === "female" ? FEMALE_BODY : MALE_BODY;
  const headBox = HEAD_BOX[bodySex];
  const pad = headBox.w * HEAD_CROP_PADDING_RATIO;
  const vbX = headBox.x - pad;
  const vbY = headBox.y - pad;
  const vbW = headBox.w + pad * 2;
  const vbH = headBox.h + pad;
  const faceTransform = `translate(${headBox.x} ${headBox.y}) scale(${headBox.w / FACE_VIEW_BOX.width} ${headBox.h / FACE_VIEW_BOX.height})`;
  const silhouetteFill = isDark ? "#ffffff" : "#f6f8fa";
  const silhouetteStroke = isDark ? null : "#d2dae2";

  return (
    <svg
      width={size}
      height={size * (vbH / vbW)}
      viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
      style={{ display: "block" }}
    >
      <defs>
        <clipPath id={clipId}>
          <ellipse cx={vbX + vbW / 2} cy={vbY + vbH / 2} rx={vbW / 2} ry={vbH / 2} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        {body.FRONT_SILHOUETTE.map((p, i) => (
          <path
            key={i}
            d={p.d}
            fill={p.fill === "none" ? "none" : silhouetteFill}
            stroke={silhouetteStroke ?? undefined}
            strokeWidth={silhouetteStroke ? 1.4 : undefined}
          />
        ))}
        <g transform={faceTransform}>{style.front()}</g>
      </g>
    </svg>
  );
}

export default function SettingsFace() {
  const { theme, isMobile, user, saveUser } = useUser();
  const isDark = theme === 'dark';
  const tk = getTokens(isDark);
  const sex = user?.sex;

  return (
    <SettingsSubpage
      isDark={isDark}
      isMobile={isMobile}
      title="Cara del modelo"
      subtitle="Cómo se ve tu cuerpo en el mapa muscular y en Rangos."
    >
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: "10px" }}>
        {FACE_STYLES.map((style) => {
          const active = (user?.faceStyle || DEFAULT_FACE_STYLE_ID) === style.id;
          return (
            <button
              key={style.id}
              type="button"
              onClick={() => saveUser({ ...(user || {}), faceStyle: style.id })}
              aria-pressed={active}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "6px",
                padding: "10px 6px",
                borderRadius: tk.radius.md,
                border: `1.5px solid ${active ? tk.accent : tk.border}`,
                backgroundColor: active ? tk.accentSoft : tk.surfaceAlt,
                cursor: "pointer",
                transition: tk.transition,
              }}
            >
              <FaceThumbnail style={style} isDark={isDark} sex={sex} />
              <span style={{ color: active ? tk.accent : tk.textMuted, fontWeight: active ? 700 : 500, fontSize: "0.78rem" }}>
                {style.name}
              </span>
            </button>
          );
        })}
      </div>
    </SettingsSubpage>
  );
}
