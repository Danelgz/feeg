import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import MiniStat from "./MiniStat";
import StatSection from "./StatSection";
import { EmptyState, Icon, RankArt } from "../ui";
import { getTokens } from "../../lib/tokens";
import { computeExerciseIndex } from "../../lib/exerciseStats";
import { translateExerciseName } from "../../lib/exerciseTranslation";
import { useRanks } from "../../hooks/useRanks";
import { getRankPosition } from "../../data/ranks";

/** Cuántas filas se animan al entrar. Con listas de cientos de ejercicios, escalonarlas todas
 *  significa que la última aparece medio minuto después; a partir de aquí entran ya colocadas. */
const ANIMATED_ROWS = 12;

export default function ExerciseStatsSection({ isDark, isMobile, workouts, t, language }) {
  const tk = getTokens(isDark);
  const prefersReducedMotion = useReducedMotion();
  const [query, setQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // El índice recorre TODO el historial: recalcularlo en cada pulsación del buscador era un barrido
  // completo por tecla. Ahora sólo se rehace cuando cambian los entrenos.
  const index = useMemo(() => computeExerciseIndex(workouts), [workouts]);

  // Mismo motor y las mismas preferencias (peso corporal, sexo, mancuernas, poleas) que la pestaña
  // Rangos — un ejercicio no puede tener un rango aquí y otro distinto allí. Sólo llegan los
  // ejercicios puntuables con marca; el resto (series a peso corporal, tiempo...) no tiene entrada
  // y simplemente no enseña insignia.
  const { exerciseRanks } = useRanks();
  const rankByExercise = useMemo(
    () => Object.fromEntries(exerciseRanks.map((r) => [r.exercise, r])),
    [exerciseRanks]
  );

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return Object.values(index)
      .filter((entry) => !needle || translateExerciseName(entry.name, language).toLowerCase().includes(needle))
      .sort((a, b) => b.sessions - a.sessions);
  }, [index, query, language]);

  return (
    <StatSection
      title="Estadísticas por ejercicio"
      meta={`${results.length} ${results.length === 1 ? 'ejercicio' : 'ejercicios'}`}
      isDark={isDark}
      isMobile={isMobile}
    >
      <div style={{ position: 'relative', marginBottom: tk.space.xl }}>
        <div
          style={{
            position: 'absolute',
            left: tk.space.lg,
            top: '50%',
            transform: 'translateY(-50%)',
            color: isSearchFocused ? tk.accent : tk.textFaint,
            transition: `color ${tk.motion.css.fast}`,
            pointerEvents: 'none',
          }}
        >
          <Icon name="search" size={18} />
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => setIsSearchFocused(false)}
          placeholder="Buscar ejercicio..."
          aria-label="Buscar ejercicio"
          style={{
            width: '100%',
            // Hueco a la izquierda para el icono; a la derecha, el mismo aire visual.
            padding: `${tk.space.md} ${tk.space.lg} ${tk.space.md} 46px`,
            borderRadius: tk.radius.md,
            // El foco se lleva con estado de React en vez de mutando `e.target.style` a mano: así el
            // estilo sale del render como todo lo demás y no hay dos fuentes de verdad.
            border: `1px solid ${isSearchFocused ? tk.accent : tk.border}`,
            backgroundColor: tk.surfaceAlt,
            color: tk.text,
            outline: 'none',
            fontSize: tk.fontSize.md,
            transition: `border-color ${tk.motion.css.fast}`,
          }}
        />
      </div>

      {results.length === 0 ? (
        <EmptyState
          isDark={isDark}
          icon={query ? 'search' : 'barChart'}
          title={query ? t('no_exercises_found') : 'Aún no hay ejercicios registrados'}
          description={
            query
              ? `Ningún ejercicio coincide con «${query}».`
              : 'Completa un entrenamiento y aquí verás el desglose de cada ejercicio.'
          }
        />
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: tk.space.md }}>
          {results.map((entry, index) => (
            <motion.li
              key={entry.name}
              // Sin `cursor: pointer` ni desplazamiento al pasar por encima: la versión anterior los
              // tenía, pero estas tarjetas no llevan `onClick`. Parecían pulsables y no hacían nada,
              // que es peor que no insinuarlo — el borde se ilumina para dar respuesta táctil sin
              // prometer una navegación que no existe.
              className="feeg-surface feeg-hover"
              initial={prefersReducedMotion || index >= ANIMATED_ROWS ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: tk.motion.duration.base,
                ease: tk.motion.ease.out,
                delay: prefersReducedMotion ? 0 : Math.min(index, ANIMATED_ROWS) * tk.motion.stagger,
              }}
              style={{
                borderRadius: tk.radius.md,
                padding: tk.space.lg,
                '--feeg-bg': tk.surfaceAlt,
                '--feeg-border': tk.border,
                '--feeg-hover-border': tk.accent,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  gap: tk.space.md,
                  marginBottom: tk.space.md,
                }}
              >
                <strong
                  style={{
                    color: tk.text,
                    fontSize: tk.fontSize.md,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {translateExerciseName(entry.name, language)}
                </strong>
                <span
                  style={{
                    fontSize: tk.fontSize.xs,
                    color: tk.textFaint,
                    fontWeight: tk.weight.medium,
                    flexShrink: 0,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  #{index + 1}
                </span>
              </div>

              {rankByExercise[entry.name] && (() => {
                const rank = rankByExercise[entry.name];
                const position = getRankPosition(rank.level);
                return (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: tk.space.sm,
                      marginBottom: tk.space.md,
                      paddingBottom: tk.space.md,
                      borderBottom: `1px solid ${tk.border}`,
                    }}
                  >
                    <RankArt rank={position.rank} tier={position.tier} size={20} animated={false} />
                    <span style={{ fontSize: tk.fontSize.sm, fontWeight: tk.weight.bold, color: position.rank.color }}>
                      {position.label}
                    </span>
                    <span style={{ fontSize: tk.fontSize.xs, color: tk.textFaint }}>
                      · {rank.ratio.toFixed(2)}× tu peso
                    </span>
                  </div>
                );
              })()}

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
                  gap: tk.space.md,
                }}
              >
                <MiniStat label="Sesiones" value={entry.sessions} isDark={isDark} />
                <MiniStat label="Series" value={entry.series} isDark={isDark} />
                <MiniStat label="Reps" value={entry.reps} isDark={isDark} />
                <MiniStat label="Volumen" value={`${Math.round(entry.volume).toLocaleString('es-ES')} kg`} isDark={isDark} />
              </div>
            </motion.li>
          ))}
        </ul>
      )}
    </StatSection>
  );
}
