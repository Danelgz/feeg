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
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: tk.space.sm }}>
      {rows.ranked.map((groupRank) => {
        const position = getRankPosition(groupRank.level);
        const isOpen = expandedGroup === groupRank.group;
        const groupExercises = exerciseRanks.filter((r) => r.group === groupRank.group);

        return (
          <li
            key={groupRank.group}
            id={muscleRankRowId(groupRank.group)}
            className="feeg-surface"
            style={{
              borderRadius: tk.radius.md,
              overflow: 'hidden',
              // El color del rango se queda en la insignia y en el nombre. Teñir las doce tarjetas
              // convertiría la lista en un mosaico: diez rangos con colores tan dispares como el
              // gris de Principiante y el oro de Élite no forman una escala, forman ruido.
              '--feeg-bg': isOpen ? tk.surfaceHover : tk.surfaceAlt,
              '--feeg-border': isOpen ? `${position.rank.color}59` : tk.border,
              scrollMarginTop: '80px',
            } as CSSProperties}
          >
            <button
              type="button"
              onClick={() => onToggleGroup(groupRank.group)}
              aria-expanded={isOpen}
              className="feeg-press feeg-hover"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: tk.space.md,
                width: '100%',
                padding: tk.space.md,
                background: 'none',
                border: 'none',
                textAlign: 'left',
                cursor: 'pointer',
                color: 'inherit',
                '--feeg-press-scale': 0.985,
                '--feeg-hover-bg': tk.surfaceHover,
              } as CSSProperties}
            >
              <span
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: tk.radius.md,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  backgroundColor: `${position.rank.color}1f`,
                  border: `1px solid ${position.rank.color}52`,
                }}
              >
                <RankArt rank={position.rank} tier={position.tier} size={30} animated={false} />
              </span>

              <span style={{ minWidth: 0, flex: 1 }}>
                <span
                  style={{
                    display: 'block',
                    color: tk.text,
                    fontSize: tk.fontSize.md,
                    fontWeight: tk.weight.bold,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {name(groupRank.group)}
                </span>
                <span style={{ display: 'block', fontSize: tk.fontSize.xs, marginTop: '2px' }}>
                  <span
                    style={{
                      color: position.rank.color,
                      fontWeight: tk.weight.bold,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {position.label}
                  </span>
                  <span style={{ color: tk.textFaint }}> · nivel {position.level}</span>
                </span>

                <span
                  aria-hidden="true"
                  style={{
                    display: 'block',
                    height: '3px',
                    marginTop: tk.space.sm,
                    borderRadius: tk.radius.pill,
                    backgroundColor: tk.border,
                    overflow: 'hidden',
                  }}
                >
                  <span
                    style={{
                      display: 'block',
                      height: '100%',
                      width: `${Math.round(position.progressToNext * 100)}%`,
                      borderRadius: tk.radius.pill,
                      backgroundColor: position.rank.color,
                      transition: `width ${tk.motion.css.slow}`,
                    }}
                  />
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
                <Icon name="chevronRight" size={18} />
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
                  <div style={{ padding: `0 ${tk.space.md} ${tk.space.md}` }}>
                    <ExerciseRankList
                      ranks={groupExercises}
                      bodyweightKg={bodyweightKg}
                      sex={sex}
                      isDark={isDark}
                      translateExercise={translateExercise}
                    />
                    {groupRank.rankableExercises > 1 && (
                      <p style={{ margin: `${tk.space.md} 0 0`, fontSize: tk.fontSize.xs, color: tk.textFaint }}>
                        El rango del grupo es el de su mejor ejercicio, así que añadir otros nunca te
                        baja.
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </li>
        );
      })}

      {rows.pending.map((group) => (
        <li
          key={group}
          id={muscleRankRowId(group)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: tk.space.md,
            padding: tk.space.md,
            borderRadius: tk.radius.md,
            // Borde discontinuo: es un hueco por rellenar, no una tarjeta apagada. Se distingue de
            // un rango real sin necesidad de leer el texto.
            border: `1px dashed ${tk.border}`,
            scrollMarginTop: '80px',
          }}
        >
          <span
            style={{
              width: '46px',
              height: '46px',
              borderRadius: tk.radius.md,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              color: tk.textFaint,
              border: `1px dashed ${tk.border}`,
            }}
          >
            <Icon name="award" size={20} />
          </span>
          <span style={{ minWidth: 0 }}>
            <span style={{ display: 'block', color: tk.textMuted, fontSize: tk.fontSize.md, fontWeight: tk.weight.medium }}>
              {name(group)}
            </span>
            <span style={{ display: 'block', fontSize: tk.fontSize.xs, color: tk.textFaint, marginTop: '2px' }}>
              Sin rango todavía · registra un ejercicio puntuable
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
