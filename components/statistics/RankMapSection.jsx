import Link from "next/link";
import MuscleMap from "../MuscleMap";
import StatSection from "./StatSection";
import { EmptyState, RankBadge, RankIcon } from "../ui";
import { getTokens } from "../../lib/tokens";
import { useRanks } from "../../hooks/useRanks";
import { RANKS, getRankPosition } from "../../data/ranks";

export default function RankMapSection({ isDark, isMobile, t, onSelectMuscle }) {
  const tk = getTokens(isDark);
  const { available, groupRanks, overallLevel, prestigeLevels, rankedExerciseCount, sex } = useRanks();

  // Sin peso corporal no hay nada que calcular: los baremos son múltiplos del peso del usuario.
  // Se manda a Medidas en vez de pedirlo aquí para no acabar con dos sitios donde se registra.
  if (!available) {
    return (
      <StatSection title="Rangos por grupo" isDark={isDark} isMobile={isMobile}>
        <EmptyState
          isDark={isDark}
          icon="award"
          title="Falta tu peso corporal"
          description="Tus rangos comparan lo que levantas con tu propio peso. Registra una medida y aparecerán aquí."
          action={
            <Link
              href="/measures"
              style={{
                display: "inline-block",
                padding: `${tk.space.md} ${tk.space.xl}`,
                borderRadius: tk.radius.md,
                backgroundColor: tk.accent,
                color: tk.onAccent,
                fontWeight: tk.weight.bold,
                fontSize: tk.fontSize.sm,
                textDecoration: "none",
              }}
            >
              Registrar peso
            </Link>
          }
        />
      </StatSection>
    );
  }

  const rankedGroups = Object.keys(groupRanks).length;

  if (rankedGroups === 0) {
    return (
      <StatSection title="Rangos por grupo" isDark={isDark} isMobile={isMobile}>
        <EmptyState
          isDark={isDark}
          icon="award"
          title="Aún no hay ejercicios puntuables"
          description="Los rangos salen de levantamientos con barra, mancuerna o lastre. Registra uno y tendrás tu primer rango."
        />
      </StatSection>
    );
  }

  const colorForGroup = (group) => {
    const rank = groupRanks[group];
    return rank ? getRankPosition(rank.level).rank.color : null;
  };

  const describeGroup = (group) => {
    const rank = groupRanks[group];
    if (!rank) return null;
    return { position: getRankPosition(rank.level), rank };
  };

  return (
    <StatSection
      title="Rangos por grupo"
      meta={`${rankedExerciseCount} ejercicios puntuables`}
      isDark={isDark}
      isMobile={isMobile}
    >
      <div style={{ marginBottom: tk.space.xl }}>
        <RankBadge
          level={overallLevel}
          prestigeLevels={prestigeLevels}
          isDark={isDark}
          size="lg"
          caption={`Nivel global · ${rankedGroups} ${rankedGroups === 1 ? "grupo" : "grupos"} puntuados`}
          showProgress
        />
      </div>

      <MuscleMap
        seriesByMuscle={{}}
        isDark={isDark}
        labelForGroup={(group) => t(group) || group}
        colorForGroup={colorForGroup}
        onMuscleClick={onSelectMuscle}
        hint="Toca un músculo para ver el rango de cada uno de sus ejercicios."
        ariaLabelForGroup={(group) => {
          const info = describeGroup(group);
          const label = t(group) || group;
          return info ? `${label}: ${info.position.label}` : `${label}: sin rango todavía`;
        }}
        readoutForGroup={(group) => {
          const info = describeGroup(group);
          const label = t(group) || group;
          if (!info) {
            return (
              <span style={{ fontSize: tk.fontSize.sm, color: tk.textFaint }}>
                {label} · sin ejercicios puntuables
              </span>
            );
          }
          const { position, rank } = info;
          return (
            <span style={{ display: "inline-flex", alignItems: "center", gap: tk.space.sm, flexWrap: "wrap", justifyContent: "center" }}>
              <RankIcon icon={position.rank.icon} color={position.rank.color} accent={position.rank.accent} size={18} />
              <span style={{ fontSize: tk.fontSize.md, color: tk.text, fontWeight: tk.weight.medium }}>{label}</span>
              <span style={{ color: tk.textMuted }}>·</span>
              <span style={{ fontSize: tk.fontSize.md, color: position.rank.color, fontWeight: tk.weight.bold }}>
                {position.label}
              </span>
              <span style={{ fontSize: tk.fontSize.xs, color: tk.textFaint }}>
                {rank.rankableExercises} {rank.rankableExercises === 1 ? "ejercicio" : "ejercicios"}
              </span>
            </span>
          );
        }}
        legend={RANKS.map((rank) => (
          <div key={rank.name} style={{ display: "flex", alignItems: "center", gap: tk.space.xs }}>
            <span
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "3px",
                backgroundColor: rank.color,
                display: "inline-block",
                // Titán es casi negro: sin borde desaparece contra el fondo de la tarjeta.
                border: `1px solid ${rank.accent}`,
              }}
            />
            <span style={{ fontSize: tk.fontSize.xs, color: tk.textMuted }}>{rank.name}</span>
          </div>
        ))}
      />

      {sex === null && (
        <p style={{ textAlign: "center", color: tk.textFaint, fontSize: tk.fontSize.xs, marginTop: tk.space.lg, marginBottom: 0 }}>
          Los baremos de fuerza cambian según el sexo. Indícalo en tu perfil para afinar tus rangos.
        </p>
      )}
    </StatSection>
  );
}
