import { useId } from "react";
import { useUser } from "../../context/UserContext";
import { getTokens } from "../../lib/tokens";
import { Icon } from "../../components/ui";
import { FACE_STYLES, DEFAULT_FACE_STYLE_ID, FACE_VIEW_BOX, renderFace } from "../../data/faceStyles";
import { HEAD_BOX } from "../../components/MuscleMap";
import * as MALE_BODY from "../../data/muscleMapPaths";
import * as FEMALE_BODY from "../../data/muscleMapPathsFemale";
import { FACE_VERTICAL_OFFSET_BY_BODY, getFaceTransform } from "../../lib/faceTransform";
import SettingsSubpage from "../../components/settings/SettingsSubpage";

const LANGUAGES = [
  { code: 'es', name: 'Español' },
  { code: 'eu', name: 'Euskera' }
];

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
  const faceTransform = getFaceTransform(headBox, FACE_VIEW_BOX, FACE_VERTICAL_OFFSET_BY_BODY[bodySex]);
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
        <g transform={faceTransform}>{renderFace(style, bodySex)}</g>
      </g>
    </svg>
  );
}

/**
 * Apariencia, idioma y cara del modelo comparten página: las tres son "cómo se ve la app", ninguna
 * necesita más de un puñado de opciones, y obligar a entrar y salir tres veces del menú por esto
 * era justo el tipo de fricción que "comprimir Ajustes" quería evitar.
 */
export default function SettingsPreferences() {
  const { theme, themePreference, setThemeMode, isMobile, language, updateLanguage, t, user, saveUser } = useUser();
  const isDark = theme === 'dark';
  const tk = getTokens(isDark);
  const sex = user?.sex;

  const themeOptions = [
    { key: 'light', label: t("light_mode"), icon: 'sun' },
    { key: 'dark', label: t("dark_mode"), icon: 'moon' },
    { key: 'system', label: 'Sistema', icon: 'monitor' }
  ];

  return (
    <SettingsSubpage isDark={isDark} isMobile={isMobile} title="Preferencias">
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <span style={{ color: tk.text, fontSize: "1.1rem", fontWeight: 600 }}>Apariencia</span>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {themeOptions.map((opt) => {
            const active = themePreference === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => setThemeMode(opt.key)}
                style={{
                  flex: isMobile ? "1 1 auto" : "0 0 auto",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "12px 18px",
                  borderRadius: tk.radius.md,
                  border: `1.5px solid ${active ? tk.accent : tk.border}`,
                  backgroundColor: active ? tk.accentSoft : "transparent",
                  color: active ? tk.accent : tk.text,
                  fontWeight: active ? 700 : 500,
                  cursor: "pointer",
                  transition: tk.transition,
                  minWidth: isMobile ? undefined : "120px"
                }}
              >
                <Icon name={opt.icon} size={17} />
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ height: "1px", backgroundColor: tk.border }} />

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <span style={{ color: tk.text, fontSize: "1.1rem", fontWeight: 600 }}>{t("language")}</span>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {LANGUAGES.map((lang) => {
            const active = language === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => updateLanguage(lang.code)}
                aria-pressed={active}
                style={{
                  flex: isMobile ? "1 1 auto" : "0 0 auto",
                  padding: "12px 18px",
                  borderRadius: tk.radius.md,
                  border: `1.5px solid ${active ? tk.accent : tk.border}`,
                  backgroundColor: active ? tk.accentSoft : "transparent",
                  color: active ? tk.accent : tk.text,
                  fontWeight: active ? 700 : 500,
                  fontSize: "1rem",
                  cursor: "pointer",
                  transition: tk.transition,
                  minWidth: isMobile ? undefined : "120px"
                }}
              >
                {lang.name}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ height: "1px", backgroundColor: tk.border }} />

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <div>
          <span style={{ color: tk.text, fontSize: "1.1rem", fontWeight: 600 }}>Cara del modelo</span>
          <div style={{ color: tk.textMuted, fontSize: "0.85rem", marginTop: "2px" }}>
            Cómo se ve tu cuerpo en el mapa muscular y en Rangos.
          </div>
        </div>
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
      </div>
    </SettingsSubpage>
  );
}
