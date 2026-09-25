import { useMemo, type CSSProperties } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { getTokens } from '../../lib/tokens';
import { getRankPosition } from '../../data/ranks';
import { getRankableGroups, type ExerciseRank, type GroupRank, type Sex } from '../../lib/rankEngine';
import { slugify } from '../../lib/slug';
import { ExerciseRankList, Icon, RankArt } from '../ui';

interface MuscleRankListProps {
  groupRanks: Record<string, GroupRank>;
  exerciseRanks: ExerciseRank[];
  bodyweightKg: number;
  sex: Sex;
  isDark: boolean;
  /** Grupo abierto ahora mismo, o null. Controlado desde fuera para que tocar el mapa abra su fila. */
  expandedGroup: string | null;
  onToggleGroup: (group: string) => void;
  translateGroup?: (group: string) => string;
  translateExercise?: (name: string) => string;
  /** Ver ExerciseRankList: si se pasa, cada ejercicio desplegado lleva a su historial (`/exercise-history`). */
  onExerciseClick?: (exercise: string) => void;
}

/**
 * Id del DOM de la fila de un grupo, para que quien la abra desde fuera pueda hacerle scroll.
 * Ver `slugify` para por qué el nombre no se usa tal cual.
 */
export function muscleRankRowId(group: string): string {
  return `rank-row-${slugify(group)}`;
}

/**
 * Rankings musculares: una fila por grupo, desplegable a sus ejercicios.
 *
 * Resuelve el agujero más grande que tenía la pantalla de rangos: hasta ahora la única forma de ver
 * el rango de un grupo era pasar el ratón por su región del mapa (en móvil, entrar y volver de una
 * pantalla de detalle) de uno en uno. Y había grupos con rango calculado que no se veían en NINGÚN
 * sitio, porque el asset anatómico no tiene región para ellos: Cuello no está dibujado y
 * Aductor/Abductor ni siquiera son parte del mapa.
 *
 * Se despliega en el sitio en vez de navegar a una pantalla aparte: la pregunta "¿por qué mi espalda
 * es Élite?" se contesta con los ejercicios que la sostienen, y para eso no hace falta perder de
 * vista el resto de la lista.
 *
 * El orden es por nivel descendente. Los grupos sin rango van al final y sólo aparecen si PUEDEN
 * tenerlo — un grupo cuyos ejercicios no se puntúan (Cuello) no es una tarea pendiente, y ponerlo
 * ahí en gris sería mandar al usuario a perseguir algo que no existe.
 */
export default function MuscleRankList({
  groupRanks,
  exerciseRanks,
  bodyweightKg,
  sex,
  isDark,
  expandedGroup,
  onToggleGroup,
  translateGroup,
  translateExercise,
  onExerciseClick,
}: MuscleRankListProps) {
  const tk = getTokens(isDark);
  const prefersReducedMotion = useReducedMotion();

  const rows = useMemo(() => {
    const ranked = Object.values(groupRanks).sort((a, b) => b.level - a.level);
    const rankedKeys = new Set(ranked.map((g) => g.group));
    const pending = getRankableGroups()
      .filter((group) => !rankedKeys.has(group))
      .sort((a, b) => a.localeCompare(b, 'es'));

    return { ranked, pending };
  }, [groupRanks]);

  const name = (group: string) => translateGroup?.(group) || group;

  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', borderBottom: `1px solid ${tk.hairline}` }}>
      {rows.ranked.map((groupRank) => {
        const position = getRankPosition(groupRank.level);
        const isOpen = expandedGroup === groupRank.group;
        const groupExercises = exerciseRanks.filter((r) => r.group === groupRank.group);

        return (
          <li
            key={groupRank.group}
            id={muscleRankRowId(groupRank.group)}
            style={{
              // Filas planas separadas por una línea: el color del rango se queda en la insignia y
              // en el nombre. Doce tarjetas con borde (una por grupo) eran un mosaico de recuadros.
              borderTop: `1px solid ${tk.hairline}`,
              scrollMarginTop: '80px',
            }}
          >
            <button
              type="button"
              onClick={() => onToggleGroup(groupRank.group)}
              aria-expanded={isOpen}
              className="feeg-press"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                width: '100%',
                padding: '10px 0',
                background: 'none',
                border: 'none',
                textAlign: 'left',
                cursor: 'pointer',
                color: 'inherit',
                '--feeg-press-scale': 0.985,
              } as CSSProperties}
            >
              <RankArt rank={position.rank} tier={position.tier} size={40} />

              <span style={{ minWidth: 0, flex: 1 }}>
                <span style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                  <span
                    style={{
                      color: tk.text,
                      fontSize: '0.95rem',
                      fontWeight: 700,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {name(groupRank.group)}
                  </span>
                  <span style={{ color: position.rank.color, fontSize: '0.78rem', fontWeight: 800, whiteSpace: 'nowrap' }}>{position.label}</span>
                </span>

                <span style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                  <span aria-hidden="true" style={{ flex: 1, height: 4, borderRadius: 99, backgroundColor: tk.hairline, overflow: 'hidden' }}>
                    <span
                      style={{
                        display: 'block',
                        height: '100%',
                        width: `${Math.round(position.progressToNext * 100)}%`,
                        borderRadius: 99,
                        backgroundColor: position.rank.color,
                        transition: `width ${tk.motion.css.slow}`,
                      }}
                    />
                  </span>
                  <span style={{ fontSize: '0.7rem', color: tk.textFaint, fontWeight: 600, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                    nv {position.level}
                  </span>
                </span>
              </span>

              <motion.span
                aria-hidden="true"
                animate={{ rotate: isOpen ? 90 : 0 }}
                transition={
                  prefersReducedMotion
                    ? { duration: 0 }
                    : { duration: tk.motion.duration.fast, ease: tk.motion.ease.standard }
                }
                style={{ display: 'flex', color: isOpen ? position.rank.color : tk.textFaint, flexShrink: 0 }}
              >
                <Icon name="chevronRight" size={16} />
              </motion.span>
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={prefersReducedMotion ? false : { height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={prefersReducedMotion ? undefined : { height: 0, opacity: 0 }}
                  transition={{ duration: tk.motion.duration.base, ease: tk.motion.ease.standard }}
                  style={{ overflow: 'hidden' }}
                >
                  <div style={{ padding: '0 0 12px 52px' }}>
                    <ExerciseRankList
                      layout="grid"
                      ranks={groupExercises}
                      bodyweightKg={bodyweightKg}
                      sex={sex}
                      isDark={isDark}
                      translateExercise={translateExercise}
                      onExerciseClick={onExerciseClick}
                    />
                    {groupRank.rankableExercises > 1 && (
                      <p style={{ margin: `${tk.space.md} 0 0`, fontSize: tk.fontSize.xs, color: tk.textFaint }}>
                        {groupRank.countedExercises >= 3
                          ? 'El rango del grupo es la media de tus 3 mejores ejercicios: entrenar más nunca te baja.'
                          : `El rango del grupo es la media de tus mejores ejercicios (hasta 3). Con sólo ${groupRank.countedExercises}, uno flojo todavía puede bajarla.`}
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </li>
        );
      })}

      {/* Los grupos sin rango van juntos como fichas en una sola fila, no como una tarjeta de
          ~60px cada uno: son una lista de tareas pendientes, no filas de datos. Cada ficha conserva
          su id para que tocar el grupo en el cuerpo haga scroll hasta ella. */}
      {rows.pending.length > 0 && (
        <li
          style={{
            padding: '12px 0',
            borderTop: `1px solid ${tk.hairline}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: tk.fontSize.xs, color: tk.textFaint, marginBottom: tk.space.sm }}>
            <Icon name="award" size={14} />
            Sin rango todavía · registra un ejercicio puntuable
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {rows.pending.map((group) => (
              <span
                key={group}
                id={muscleRankRowId(group)}
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  color: tk.textMuted,
                  padding: '4px 10px',
                  borderRadius: 99,
                  border: `1px dashed ${tk.borderStrong}`,
                  scrollMarginTop: '80px',
                }}
              >
                {name(group)}
              </span>
            ))}
          </div>
        </li>
      )}
    </ul>
  );
}
