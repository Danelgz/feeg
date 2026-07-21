// Avatar por iniciales + gradiente determinista por nombre (ver lib/avatarColor.js para el porqué:
// sustituyó un <img> a una carpeta de fotos que nunca existió). El badge de equipamiento superpuesto
// añade identidad visual real sin depender de ningún activo externo — se resuelve por nombre vía
// lib/exerciseEquipment.js, así que también funciona sobre entrenos completados antiguos (que no
// persisten type/unit/equipment, solo el nombre). Ejercicios personalizados: sin badge (no hay
// equipment que resolver), degrada con gracia al mismo avatar de siempre.
import { gradientForString, getInitials } from "../../lib/avatarColor";
import { equipmentForExercise } from "../../lib/exerciseEquipment";
import { Icon } from "../ui";

const EQUIPMENT_ICON = {
  barra: "barbell",
  mancuerna: "dumbbell",
  maquina: "machine",
  polea: "cable",
  corporal: "bodyweight",
};

export default function ExerciseThumb({ name, size = 45 }) {
  const [from, to] = gradientForString(name);
  const iconName = EQUIPMENT_ICON[equipmentForExercise(name)];
  const badgeSize = Math.round(size * 0.46);

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: `linear-gradient(135deg, ${from}, ${to})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#000",
          fontWeight: 800,
          fontSize: size * 0.36,
          letterSpacing: "-0.02em",
        }}
      >
        {getInitials(name)}
      </div>

      {iconName && (
        <div
          style={{
            position: "absolute",
            bottom: -2,
            right: -2,
            width: badgeSize,
            height: badgeSize,
            borderRadius: "50%",
            backgroundColor: "#141414",
            border: "2px solid #fff",
            boxShadow: "0 1px 4px rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name={iconName} size={Math.round(badgeSize * 0.56)} color="#fff" strokeWidth={2.2} />
        </div>
      )}
    </div>
  );
}
