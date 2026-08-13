import { useCallback, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useReducedMotion } from 'motion/react';
import MuscleMap from '../MuscleMap';
import StatSection from './StatSection';
import RankHeroCard from './RankHeroCard';
import RankLadderSection from './RankLadderSection';
import MuscleRankList, { muscleRankRowId } from './MuscleRankList';
import { EmptyState, RankArt } from '../ui';
import { getTokens } from '../../lib/tokens';
import { useRanks } from '../../hooks/useRanks';
import { useUser } from '../../context/UserContext';
import { RANKS, getRankPosition } from '../../data/ranks';
import { translateExerciseName } from '../../lib/exerciseTranslation';
import type { MuscleGroup } from '../../data/muscleMapRegions';

interface RankMapSectionProps {
  isDark: boolean;
  isMobile?: boolean;
  t: (key: string) => string;
  language?: string;
}

// La escalera como una sola tira continua, en vez de diez pastillas sueltas. Diez muestras de color
// no son una leyenda: obligan a buscar cada tono en una lista para traducir lo que ves en el cuerpo,
// que es justo el trabajo que una leyenda debería ahorrar. La tira dice lo único que hace falta
// saber para leer el mapa — hacia dónde va la escala — y ocupa una línea.
const RANK_SCALE = `linear-gradient(90deg, ${RANKS.map((r) => r.color).join(', ')})`;

/**
 * Pestaña de Rangos: el rango global, el cuerpo teñido por rango y el ranking por grupo.
 *
 * La versión anterior era una insignia pequeña, el mapa y una leyenda de diez colores; para ver el
 * rango de un grupo había que salir a una pantalla de detalle y volver. Ahora el mapa y la lista son
 * la misma vista: tocar un músculo abre su fila abajo en vez de navegar a otro sitio.
 */
export default function RankMapSection({ isDark, isMobile = false, t, language }: RankMapSectionProps) {
  const tk = getTokens(isDark);
  const prefersReducedMotion = useReducedMotion();
  const router = useRouter();
  // Mismo destino que "Ver historial" en un ejercicio durante un entreno (pages/routines/[id].js,
  // empty.js): esa pantalla ya sabe leer `?exercise=`, así que un ejercicio no tiene dos sitios
  // distintos donde consultar su historial según desde dónde se llegue a él.
  const goToExerciseHistory = useCallback(
    (exercise: string) => router.push(`/exercise-history?exercise=${encodeURIComponent(exercise)}`),
    [router]
  );
  const {
    available,
    groupRanks,
    exerciseRanks,
    overallLevel,
    prestigeLevels,
    rankedExerciseCount,
    bodyweightKg,
    milestone,
    sex,
  } = useRanks();
  const { user } = useUser();
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const toggleGroup = useCallback((group: string) => {
    setExpandedGroup((current) => (current === group ? null : group));
  }, []);

  // Desde el mapa siempre se abre (nunca se cierra): el usuario que toca un músculo quiere verlo, y
  // que un segundo toque en el cuerpo cerrara una tarjeta que está fuera de pantalla sería un efecto
  // invisible desde donde ha pulsado.
  const openFromMap = useCallback(
    (group: MuscleGroup) => {
      setExpandedGroup(group);
      // En el siguiente frame: la fila puede estar entrando en el DOM justo ahora.
      requestAnimationFrame(() => {
        document.getElementById(muscleRankRowId(group))?.scrollIntoView({
          behavior: prefersReducedMotion ? 'auto' : 'smooth',
          block: 'center',
        });
      });
    },
    [prefersReducedMotion]
  );

  // Sin peso corporal no hay nada que calcular: los baremos son múltiplos del peso del usuario.
  // Se manda a Medidas en vez de pedirlo aquí para no acabar con dos sitios donde se registra.
  if (!available) {
    return (
      <StatSection title="Rangos" isDark={isDark} isMobile={isMobile}>
        <EmptyState
          isDark={isDark}
          icon="award"
          title="Falta tu peso corporal"
          description="Tus rangos comparan lo que levantas con tu propio peso. Registra una medida y aparecerán aquí."
          action={
            <Link
              href="/measures"
              style={{
                display: 'inline-block',
                padding: `${tk.space.md} ${tk.space.xl}`,
                borderRadius: tk.radius.md,
                backgroundColor: tk.accent,
                color: tk.onAccent,
                fontWeight: tk.weight.bold,
                fontSize: tk.fontSize.sm,
                textDecoration: 'none',
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
      <StatSection title="Rangos" isDark={isDark} isMobile={isMobile}>
        <EmptyState
          isDark={isDark}
          icon="award"
          title="Aún no hay ejercicios puntuables"
          description="Los rangos salen de levantamientos con barra, mancuerna o lastre. Registra uno y tendrás tu primer rango."
        />
      </StatSection>
    );
  }

  const describeGroup = (group: string) => {
    const rank = groupRanks[group];
    return rank ? { position: getRankPosition(rank.level), rank } : null;
  };

  return (
    <>
      <RankHeroCard
        level={overallLevel}
        prestigeLevels={prestigeLevels}
        milestone={milestone}
        rankedGroups={rankedGroups}
        rankedExerciseCount={rankedExerciseCount}
        isDark={isDark}
        isMobile={isMobile}
        translateGroup={(group) => t(group) || group}
        translateExercise={(name) => translateExerciseName(name, language)}
      />

      <div style={{ display: 'grid', gap: tk.space.lg }}>
        <StatSection title="Tu cuerpo por rango" isDark={isDark} isMobile={isMobile}>
          <MuscleMap
            seriesByMuscle={{}}
            isDark={isDark}
            sex={sex}
            faceStyleId={user?.faceStyle}
            labelForGroup={(group) => t(group) || group}
            // Color plano y no degradado: el mismo `rank.color` que pinta el disco de la insignia en
            // cada perfil de rango, para que el cuerpo se lea como "este músculo es Atleta" de un
            // vistazo, sin que el volumen del degradado compita con el propio color del rango.
            colorForGroup={(group) => describeGroup(group)?.position.rank.color ?? null}
            onMuscleClick={openFromMap}
            hint="Toca un músculo para desplegar sus ejercicios abajo."
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
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: tk.space.sm,
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                  }}
                >
                  <RankArt rank={position.rank} tier={position.tier} size={18} />
                  <span style={{ fontSize: tk.fontSize.md, color: tk.text, fontWeight: tk.weight.medium }}>
                    {label}
                  </span>
                  <span style={{ color: tk.textMuted }}>·</span>
                  <span style={{ fontSize: tk.fontSize.md, color: position.rank.color, fontWeight: tk.weight.bold }}>
                    {position.label}
                  </span>
                  <span style={{ fontSize: tk.fontSize.xs, color: tk.textFaint }}>
                    {rank.rankableExercises} {rank.rankableExercises === 1 ? 'ejercicio' : 'ejercicios'}
                  </span>
                </span>
              );
            }}
            legend={
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: tk.space.sm,
                  width: '100%',
                  maxWidth: '380px',
                }}
              >
                <span style={{ fontSize: tk.fontSize.xs, color: tk.textFaint, flexShrink: 0 }}>
                  {RANKS[0].name}
                </span>
                <span
                  aria-hidden="true"
                  style={{
                    flex: 1,
                    height: '6px',
                    borderRadius: tk.radius.pill,
                    background: RANK_SCALE,
                    border: `1px solid ${tk.border}`,
                  }}
                />
                <span style={{ fontSize: tk.fontSize.xs, color: tk.textFaint, flexShrink: 0 }}>
                  {RANKS[RANKS.length - 1].name}
                </span>
              </div>
            }
          />
        </StatSection>

        <StatSection
          title="Rankings musculares"
          meta={`${rankedExerciseCount} ejercicios puntuables`}
          isDark={isDark}
          isMobile={isMobile}
        >
          <MuscleRankList
            groupRanks={groupRanks}
            exerciseRanks={exerciseRanks}
            bodyweightKg={bodyweightKg as number}
            sex={sex}
            isDark={isDark}
            expandedGroup={expandedGroup}
            onToggleGroup={toggleGroup}
            translateGroup={(group) => t(group) || group}
            translateExercise={(name) => translateExerciseName(name, language)}
            onExerciseClick={goToExerciseHistory}
          />

          {sex === null && (
            <p
              style={{
                textAlign: 'center',
                color: tk.textFaint,
                fontSize: tk.fontSize.xs,
                marginTop: tk.space.xl,
                marginBottom: 0,
              }}
            >
              Los baremos de fuerza cambian según el sexo. Indícalo en tu perfil para afinar tus rangos.
            </p>
          )}
        </StatSection>

        <RankLadderSection
          currentRank={getRankPosition(overallLevel, prestigeLevels).rank}
          isDark={isDark}
          isMobile={isMobile}
        />
      </div>
    </>
  );
}
