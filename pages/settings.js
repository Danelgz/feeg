import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { useUser } from "../context/UserContext";
import { getTokens } from "../lib/tokens";
import { Icon, Button, Card, PageHeader, Switch } from "../components/ui";
import { FACE_STYLES, DEFAULT_FACE_STYLE_ID, FACE_VIEW_BOX } from "../data/faceStyles";
import { HEAD_BOX } from "../components/MuscleMap";
import * as MALE_BODY from "../data/muscleMapPaths";
import * as FEMALE_BODY from "../data/muscleMapPathsFemale";

// Aire alrededor de la cabeza recortada: HEAD_BOX es el bbox exacto de la cabeza, y recortar justo
// en su borde deja las orejas y la línea de la mandíbula pegadas al marco de la miniatura.
const HEAD_CROP_PADDING_RATIO = 0.14;

/**
 * Miniatura de un FaceStyle recortada sobre la cabeza REAL del cuerpo del usuario (mismo path,
 * mismo `HEAD_BOX`, mismo translate+scale que pinta `MuscleMap` de verdad), no una silueta
 * genérica: así el selector responde a "¿cómo se va a ver?" en vez de a una aproximación que luego
 * no coincide con el mapa muscular ni con Rangos.
 */
function FaceThumbnail({ style, isDark, sex, size = 56 }) {
  const bodySex = sex === "female" ? "female" : "male";
  const body = bodySex === "female" ? FEMALE_BODY : MALE_BODY;
  const headBox = HEAD_BOX[bodySex];
  const pad = headBox.w * HEAD_CROP_PADDING_RATIO;
  const viewBox = `${headBox.x - pad} ${headBox.y - pad} ${headBox.w + pad * 2} ${headBox.h + pad * 2}`;
  const faceTransform = `translate(${headBox.x} ${headBox.y}) scale(${headBox.w / FACE_VIEW_BOX.width} ${headBox.h / FACE_VIEW_BOX.height})`;
  const silhouetteFill = isDark ? "#ffffff" : "#f6f8fa";
  const silhouetteStroke = isDark ? null : "#d2dae2";

  return (
    <svg
      width={size}
      height={size * ((headBox.h + pad * 2) / (headBox.w + pad * 2))}
      viewBox={viewBox}
      style={{ display: "block" }}
    >
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
    </svg>
  );
}

/**
 * Un par de opciones excluyentes con una línea de ejemplo cada una, en vez de un simple switch:
 * "peso de una o de las dos" no se entiende con un booleano sin nombre, y la línea de ejemplo es lo
 * que de verdad responde "¿y esto qué significa para mí" sin mandar a nadie a leer una nota aparte.
 */
function EquipmentChoiceGroup({ isDark, isMobile, tk, label, desc, value, onChange, options }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <div>
        <div style={{ color: tk.text, fontSize: "0.95rem", fontWeight: 600 }}>{label}</div>
        <div style={{ color: tk.textMuted, fontSize: "0.82rem", marginTop: "2px" }}>{desc}</div>
      </div>
      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: "10px" }}>
        {options.map((opt) => {
          const active = value === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => onChange(opt.key)}
              aria-pressed={active}
              style={{
                flex: "1 1 0",
                textAlign: "left",
                padding: "12px 14px",
                borderRadius: tk.radius.md,
                border: `1.5px solid ${active ? tk.accent : tk.border}`,
                backgroundColor: active ? tk.accentSoft : tk.surfaceAlt,
                cursor: "pointer",
                transition: tk.transition,
              }}
            >
              <div style={{ color: active ? tk.accent : tk.text, fontWeight: active ? 700 : 500, fontSize: "0.9rem" }}>
                {opt.label}
              </div>
              <div style={{ color: tk.textMuted, fontSize: "0.78rem", marginTop: "3px" }}>{opt.example}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Selector de cara del mapa muscular. Cada opción enseña su miniatura real (no un nombre suelto):
 * es una elección puramente visual, así que la respuesta a "¿cómo se ve esto?" tiene que estar en
 * el propio botón, no obligar a elegir y volver al mapa para comprobarlo.
 */
function FaceStylePicker({ isDark, isMobile, tk, value, onChange, sex }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div>
        <div style={{ color: tk.text, fontSize: "1.1rem", fontWeight: 600 }}>Cara del modelo</div>
        <div style={{ color: tk.textMuted, fontSize: "0.85rem", marginTop: "2px" }}>
          Cómo se ve tu cuerpo en el mapa muscular y en Rangos.
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: "10px" }}>
        {FACE_STYLES.map((style) => {
          const active = (value || DEFAULT_FACE_STYLE_ID) === style.id;
          return (
            <button
              key={style.id}
              type="button"
              onClick={() => onChange(style.id)}
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
  );
}

export default function Settings() {
  const {
    theme, themePreference, setThemeMode, isMobile, language, updateLanguage,
    soundEnabled, setSoundEnabled,
    aiVoiceEnabled, setAiVoiceEnabled, aiVoiceURI, setAiVoiceURI, aiVoiceRate, setAiVoiceRate, aiVoicePitch, setAiVoicePitch,
    t, authUser, loginWithGoogle, refreshData,
    user, saveUser,
  } = useUser();

  // Las voces de SpeechSynthesis solo están disponibles en cliente y a veces llegan async
  // (evento voiceschanged) — sin ese evento, en algunos navegadores getVoices() devuelve [] la
  // primera vez que se llama.
  const [availableVoices, setAvailableVoices] = useState([]);
  const ttsSupported = typeof window !== "undefined" && !!window.speechSynthesis;

  useEffect(() => {
    if (!ttsSupported) return;
    const loadVoices = () => setAvailableVoices(window.speechSynthesis.getVoices());
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, [ttsSupported]);

  // Forzar refresco de datos al entrar a ajustes
  useEffect(() => {
    if (authUser) {
      refreshData();
    }
  }, [authUser]);

  const isDark = theme === 'dark';
  const tk = getTokens(isDark);

  const languages = [
    { code: 'es', name: 'Español' },
    { code: 'eu', name: 'Euskera' }
  ];

  const themeOptions = [
    { key: 'light', label: t("light_mode"), icon: 'sun' },
    { key: 'dark', label: t("dark_mode"), icon: 'moon' },
    { key: 'system', label: 'Sistema', icon: 'monitor' }
  ];

  const handleSwitchAccount = async () => {
    // Ojo: signInWithPopup tiene que lanzarse de forma síncrona dentro del gesto del click
    // para que el navegador no lo bloquee — sobre todo en móvil, mucho más estricto que
    // escritorio con esto. Antes había un `await logout()` justo delante, que rompía esa
    // cadena síncrona y hacía que el selector de cuenta nunca se abriera en el móvil (aunque
    // en PC sí colaba). No hace falta cerrar sesión antes: signInWithPopup con
    // prompt: 'select_account' ya fuerza el selector y sustituye la cuenta activa al elegir
    // una distinta.
    await loginWithGoogle();
  };

  return (
    <Layout>
      <PageHeader isDark={isDark} isMobile={isMobile} title={t("settings")} />

      <Card isDark={isDark} padding={isMobile ? "sm" : "lg"} style={{ display: "flex", flexDirection: "column", gap: "25px" }}>
        {/* Apartado de Cuenta */}
        <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          <span style={{ color: tk.accent, fontSize: "1.1rem", fontWeight: "bold", display: "flex", alignItems: "center", gap: "8px" }}>
            <Icon name="user" size={18} />
            {t("google_account")}
          </span>

          {authUser ? (
            <div style={{
              display: "flex",
              flexDirection: isMobile ? "column" : "row",
              justifyContent: "space-between",
              alignItems: isMobile ? "flex-start" : "center",
              gap: "15px",
              backgroundColor: tk.surfaceAlt,
              padding: "15px",
              borderRadius: tk.radius.md,
              border: `1px solid ${tk.border}`
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "45px", height: "45px", borderRadius: tk.radius.full, overflow: "hidden", border: `2px solid ${tk.accent}`, backgroundColor: tk.surfaceHover }}>
                  {authUser.photoURL ? (
                    <img src={authUser.photoURL} alt="pfp" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: tk.textMuted, fontSize: "0.7rem" }}>
                      {t("no_pfp")}
                    </div>
                  )}
                </div>
                <div>
                  <div style={{ color: tk.text, fontWeight: "600" }}>{authUser.displayName || "Usuario"}</div>
                  <div style={{ color: tk.textMuted, fontSize: "0.85rem" }}>{authUser.email}</div>
                </div>
              </div>
              <Button isDark={isDark} variant="secondary" size="sm" fullWidth={isMobile} onClick={handleSwitchAccount}>
                {t("change_account")}
              </Button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: "12px" }}>
              <Button isDark={isDark} fullWidth onClick={loginWithGoogle}>
                {t("login_google")}
              </Button>
              <Button isDark={isDark} variant="secondary" fullWidth onClick={loginWithGoogle}>
                {t("register")}
              </Button>
            </div>
          )}
        </div>

        <div style={{ height: "1px", backgroundColor: tk.border }} />

        {/* Apartado de Tema */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <span style={{ color: tk.text, fontSize: "1.1rem", fontWeight: 600 }}>
            Apariencia
          </span>
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

        {/* Apartado de Idioma */}
        <div style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          justifyContent: "space-between",
          alignItems: isMobile ? "flex-start" : "center",
          gap: isMobile ? "15px" : "0"
        }}>
          <span style={{ color: tk.text, fontSize: "1.1rem" }}>
            {t("language")}
          </span>
          <select
            value={language}
            onChange={(e) => updateLanguage(e.target.value)}
            style={{
              padding: "10px 16px",
              backgroundColor: tk.surfaceAlt,
              color: tk.text,
              border: `1.5px solid ${tk.border}`,
              borderRadius: tk.radius.sm,
              cursor: "pointer",
              fontSize: "1rem",
              width: isMobile ? "100%" : "200px",
              outline: "none",
              transition: tk.transition
            }}
            onFocus={(e) => e.target.style.borderColor = tk.accent}
            onBlur={(e) => e.target.style.borderColor = tk.border}
          >
            {languages.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ height: "1px", backgroundColor: tk.border }} />

        {/* Apartado de la cara del modelo del mapa muscular. */}
        <FaceStylePicker
          isDark={isDark}
          isMobile={isMobile}
          tk={tk}
          value={user?.faceStyle}
          onChange={(faceStyle) => saveUser({ ...(user || {}), faceStyle })}
          sex={user?.sex}
        />

        <div style={{ height: "1px", backgroundColor: tk.border }} />

        {/* Apartado de cómo registra el usuario sus pesos: afecta a 1RM estimado y a los rangos. */}
        <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          <div>
            <span style={{ color: tk.text, fontSize: "1.1rem", fontWeight: 600 }}>
              {t("equipment_settings_title")}
            </span>
            <div style={{ color: tk.textMuted, fontSize: "0.85rem", marginTop: "2px" }}>
              {t("equipment_settings_desc")}
            </div>
          </div>

          <EquipmentChoiceGroup
            isDark={isDark}
            isMobile={isMobile}
            tk={tk}
            label={t("dumbbell_mode_label")}
            desc={t("dumbbell_mode_desc")}
            value={user?.dumbbellMode === "combined" ? "combined" : "perHand"}
            onChange={(dumbbellMode) => saveUser({ ...(user || {}), dumbbellMode })}
            options={[
              { key: "perHand", label: t("dumbbell_mode_perhand"), example: t("dumbbell_mode_perhand_example") },
              { key: "combined", label: t("dumbbell_mode_combined"), example: t("dumbbell_mode_combined_example") },
            ]}
          />

          <EquipmentChoiceGroup
            isDark={isDark}
            isMobile={isMobile}
            tk={tk}
            label={t("pulley_mode_label")}
            desc={t("pulley_mode_desc")}
            value={user?.pulleyMode === "assisted" ? "assisted" : "asShown"}
            onChange={(pulleyMode) => saveUser({ ...(user || {}), pulleyMode })}
            options={[
              { key: "asShown", label: t("pulley_mode_asshown"), example: t("pulley_mode_asshown_example") },
              { key: "assisted", label: t("pulley_mode_assisted"), example: t("pulley_mode_assisted_example") },
            ]}
          />
        </div>

        <div style={{ height: "1px", backgroundColor: tk.border }} />

        {/* Apartado de Sonido */}
        <div style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          justifyContent: "space-between",
          alignItems: isMobile ? "flex-start" : "center",
          gap: isMobile ? "12px" : "0"
        }}>
          <div>
            <div style={{ color: tk.text, fontSize: "1.1rem" }}>{t("sound_pr_label")}</div>
            <div style={{ color: tk.textMuted, fontSize: "0.85rem", marginTop: "2px" }}>{t("sound_pr_desc")}</div>
          </div>
          <Switch isDark={isDark} checked={soundEnabled} onChange={setSoundEnabled} />
        </div>

        <div style={{ height: "1px", backgroundColor: tk.border }} />

        {/* Apartado de Voz del Coach IA */}
        <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          <span style={{ color: tk.text, fontSize: "1.1rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px" }}>
            <Icon name="volume2" size={18} />
            {t("ai_voice_section_title")}
          </span>

          <div style={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            justifyContent: "space-between",
            alignItems: isMobile ? "flex-start" : "center",
            gap: isMobile ? "12px" : "0",
          }}>
            <div>
              <div style={{ color: tk.text, fontSize: "1.1rem" }}>{t("ai_voice_enable_label")}</div>
              <div style={{ color: tk.textMuted, fontSize: "0.85rem", marginTop: "2px" }}>{t("ai_voice_enable_desc")}</div>
            </div>
            <Switch isDark={isDark} checked={aiVoiceEnabled} onChange={setAiVoiceEnabled} disabled={!ttsSupported} />
          </div>

          {!ttsSupported && (
            <div style={{ color: tk.textMuted, fontSize: "0.85rem" }}>{t("ai_voice_unsupported")}</div>
          )}

          {ttsSupported && aiVoiceEnabled && (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px", backgroundColor: tk.surfaceAlt, borderRadius: tk.radius.md, padding: "15px", border: `1px solid ${tk.border}` }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <span style={{ color: tk.textMuted, fontSize: "0.85rem" }}>{t("ai_voice_select_label")}</span>
                <select
                  value={aiVoiceURI || ""}
                  onChange={(e) => setAiVoiceURI(e.target.value || null)}
                  style={{
                    padding: "10px 14px",
                    backgroundColor: tk.surface,
                    color: tk.text,
                    border: `1.5px solid ${tk.border}`,
                    borderRadius: tk.radius.sm,
                    cursor: "pointer",
                    fontSize: "0.95rem",
                    outline: "none",
                  }}
                >
                  <option value="">{t("ai_voice_default_option")}</option>
                  {availableVoices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <span style={{ color: tk.textMuted, fontSize: "0.85rem" }}>{t("ai_voice_rate_label")}: {aiVoiceRate.toFixed(1)}x</span>
                <input type="range" min="0.5" max="2" step="0.1" value={aiVoiceRate} onChange={(e) => setAiVoiceRate(parseFloat(e.target.value))} style={{ accentColor: tk.accent }} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <span style={{ color: tk.textMuted, fontSize: "0.85rem" }}>{t("ai_voice_pitch_label")}: {aiVoicePitch.toFixed(1)}</span>
                <input type="range" min="0.5" max="2" step="0.1" value={aiVoicePitch} onChange={(e) => setAiVoicePitch(parseFloat(e.target.value))} style={{ accentColor: tk.accent }} />
              </div>
            </div>
          )}
        </div>
      </Card>
    </Layout>
  );
}
