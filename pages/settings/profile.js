import { useEffect, useState } from "react";
import { useUser } from "../../context/UserContext";
import { getTokens } from "../../lib/tokens";
import { Button } from "../../components/ui";
import SettingsSubpage from "../../components/settings/SettingsSubpage";
import RegisterForm from "../../components/RegisterForm";

// Mismo texto que `RegisterForm` (la entrevista inicial) para los objetivos: son el valor que ya
// puede llevar guardado un perfil antiguo, así que cambiar la lista rompería su selección actual.
const GOAL_OPTIONS = ['Ganar masa muscular', 'Perder peso', 'Mejorar resistencia', 'Mantenimiento', 'Ganar fuerza'];

const KG_TO_LB = 2.20462;
const CM_TO_FT = 30.48;

/** Redondea a 1 decimal y devuelve número, no string — para no ir arrastrando "70.0000000004". */
function round1(n) {
  return Math.round(n * 10) / 10;
}

/**
 * Peso, altura y objetivo son tres de las preguntas de `RegisterForm` ("la entrevista inicial") que
 * se piden UNA vez, al completar el perfil, y que hasta ahora no había ningún sitio para volver a
 * tocar: ni el perfil (que sólo edita nombre/usuario/foto/sexo) ni Medidas (que sólo guarda la
 * *unidad* preferida, no estos valores).
 */
function PhysicalProfileFields({ isMobile, tk, user, saveUser }) {
  const weightUnit = user?.weightUnit === 'lb' ? 'lb' : 'kg';
  const heightUnit = user?.heightUnit === 'ft' ? 'ft' : 'cm';

  // Estado local de los inputs: sin él, cada pulsación de tecla dispararía un guardado (local Y en
  // la nube, ver `saveUser` en UserContext) — aquí sólo se confirma al salir del campo.
  const [weightDraft, setWeightDraft] = useState(user?.weight ?? '');
  const [heightDraft, setHeightDraft] = useState(user?.height ?? '');

  useEffect(() => { setWeightDraft(user?.weight ?? ''); }, [user?.weight]);
  useEffect(() => { setHeightDraft(user?.height ?? ''); }, [user?.height]);

  const commitWeight = () => {
    const num = parseFloat(weightDraft);
    if (!Number.isFinite(num)) { setWeightDraft(user?.weight ?? ''); return; }
    if (num === user?.weight) return;
    saveUser({ ...(user || {}), weight: num, weightUnit });
  };

  const commitHeight = () => {
    const num = parseFloat(heightDraft);
    if (!Number.isFinite(num)) { setHeightDraft(user?.height ?? ''); return; }
    if (num === user?.height) return;
    saveUser({ ...(user || {}), height: num, heightUnit });
  };

  const changeWeightUnit = (unit) => {
    if (unit === weightUnit) return;
    const num = parseFloat(weightDraft);
    const converted = Number.isFinite(num) ? round1(unit === 'lb' ? num * KG_TO_LB : num / KG_TO_LB) : weightDraft;
    setWeightDraft(converted);
    saveUser({ ...(user || {}), weight: Number.isFinite(num) ? converted : user?.weight, weightUnit: unit });
  };

  const changeHeightUnit = (unit) => {
    if (unit === heightUnit) return;
    const num = parseFloat(heightDraft);
    const converted = Number.isFinite(num) ? round1(unit === 'ft' ? num / CM_TO_FT : num * CM_TO_FT) : heightDraft;
    setHeightDraft(converted);
    saveUser({ ...(user || {}), height: Number.isFinite(num) ? converted : user?.height, heightUnit: unit });
  };

  const inputStyle = {
    width: '100%',
    padding: '12px 14px',
    backgroundColor: tk.surfaceAlt,
    border: `1.5px solid ${tk.border}`,
    borderRadius: tk.radius.sm,
    color: tk.text,
    fontSize: '1rem',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const unitToggle = (options, value, onChange) => (
    <div style={{ display: 'flex', gap: '6px' }}>
      {options.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            style={{
              padding: '8px 14px',
              borderRadius: tk.radius.sm,
              border: `1.5px solid ${active ? tk.accent : tk.border}`,
              backgroundColor: active ? tk.accentSoft : 'transparent',
              color: active ? tk.accent : tk.textMuted,
              fontWeight: active ? 700 : 500,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: tk.transition,
            }}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '15px' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ color: tk.textMuted, fontSize: '0.85rem' }}>Peso</span>
          {unitToggle(['kg', 'lb'], weightUnit, changeWeightUnit)}
          <input
            type="number"
            step="0.1"
            inputMode="decimal"
            value={weightDraft}
            onChange={(e) => setWeightDraft(e.target.value)}
            onBlur={commitWeight}
            placeholder="0.0"
            style={inputStyle}
          />
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ color: tk.textMuted, fontSize: '0.85rem' }}>Altura</span>
          {unitToggle(['cm', 'ft'], heightUnit, changeHeightUnit)}
          <input
            type="number"
            step="0.1"
            inputMode="decimal"
            value={heightDraft}
            onChange={(e) => setHeightDraft(e.target.value)}
            onBlur={commitHeight}
            placeholder="0.0"
            style={inputStyle}
          />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <span style={{ color: tk.textMuted, fontSize: '0.85rem' }}>Objetivo</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {GOAL_OPTIONS.map((goal) => {
            const active = user?.goal === goal;
            return (
              <button
                key={goal}
                type="button"
                onClick={() => saveUser({ ...(user || {}), goal })}
                style={{
                  padding: '10px 16px',
                  borderRadius: tk.radius.sm,
                  border: `1.5px solid ${active ? tk.accent : tk.border}`,
                  backgroundColor: active ? tk.accentSoft : 'transparent',
                  color: active ? tk.accent : tk.text,
                  fontWeight: active ? 700 : 500,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: tk.transition,
                }}
              >
                {goal}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function SettingsProfile() {
  const { theme, isMobile, user, saveUser, authUser, showNotification } = useUser();
  const isDark = theme === 'dark';
  const tk = getTokens(isDark);
  const [showInterview, setShowInterview] = useState(false);

  // Repetir la entrevista fusiona sus respuestas SOBRE el perfil actual, no lo reemplaza: `RegisterForm`
  // sólo conoce nombre/apellidos/usuario/peso/altura/objetivo, y machacar el resto (sexo, cara del
  // mapa muscular, modo de mancuernas/polea...) sería borrar ajustes que no tienen nada que ver con
  // lo que se acaba de contestar. `registeredAt` tampoco se toca: es la fecha del alta real, no de
  // esta edición.
  const handleRedoInterview = (data) => {
    const { registeredAt: _ignored, ...answers } = data;
    saveUser({
      ...(user || {}),
      ...answers,
      email: authUser?.email || user?.email || null,
      uid: authUser?.uid || user?.uid,
      photoURL: user?.photoURL || authUser?.photoURL || null,
    });
    setShowInterview(false);
    showNotification("Perfil actualizado", "success");
  };

  if (showInterview) {
    return (
      <SettingsSubpage isDark={isDark} isMobile={isMobile} title="Repetir la entrevista">
        <RegisterForm
          title="Repite la entrevista"
          submitLabel="Guardar cambios"
          onCancel={() => setShowInterview(false)}
          onRegister={handleRedoInterview}
          initialData={{
            firstName: user?.firstName || '',
            lastName: user?.lastName || '',
            username: user?.username || '',
            weightValue: user?.weight ?? 70,
            weightUnit: user?.weightUnit || 'kg',
            heightValue: user?.height ?? 170,
            heightUnit: user?.heightUnit || 'cm',
            goal: user?.goal || '',
          }}
        />
      </SettingsSubpage>
    );
  }

  return (
    <SettingsSubpage
      isDark={isDark}
      isMobile={isMobile}
      title="Perfil y objetivo"
      subtitle="Lo que respondiste al completar tu perfil. Puedes cambiarlo cuando quieras."
    >
      <PhysicalProfileFields isMobile={isMobile} tk={tk} user={user} saveUser={saveUser} />

      <div style={{ height: "1px", backgroundColor: tk.border }} />

      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", gap: "12px" }}>
        <div>
          <div style={{ color: tk.text, fontSize: "0.95rem", fontWeight: 600 }}>¿Te confundiste en algo?</div>
          <div style={{ color: tk.textMuted, fontSize: "0.82rem", marginTop: "2px" }}>
            Repite la entrevista completa (nombre, usuario, peso, altura y objetivo) desde el principio.
          </div>
        </div>
        <Button isDark={isDark} variant="secondary" size="sm" fullWidth={isMobile} onClick={() => setShowInterview(true)}>
          Repetir entrevista
        </Button>
      </div>
    </SettingsSubpage>
  );
}
