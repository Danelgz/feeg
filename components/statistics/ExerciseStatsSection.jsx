import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import StatSection from "./StatSection";
import { EmptyState, Icon, RankArt, Sparkline } from "../ui";
import { exerciseTrend, trendDelta } from "../../lib/statsSeries";
import ExerciseThumb from "../workout/ExerciseThumb";

const SORTS = [
  { key: "sessions", label: "Frecuencia" },
  { key: "volume", label: "Volumen" },
  { key: "progress", label: "Progreso" },
];
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
  const [sortBy, setSortBy] = useState('sessions');

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

  // Tendencia del 1RM estimado por ejercicio (últimas 12 sesiones) y su variación: alimenta la
  // mini-gráfica de cada fila y el orden "Progreso".
  const trends = useMemo(() => {
    const out = {};
    for (const name of Object.keys(index)) {
      const pts = exerciseTrend(workouts, name).slice(-12);
      out[name] = { values: pts.map((p) => p.value), delta: trendDelta(pts) };
    }
    return out;
  }, [index, workouts]);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const score = (e) => (sortBy === 'volume' ? e.volume : sortBy === 'progress' ? (trends[e.name]?.delta ?? -Infinity) : e.sessions);
    return Object.values(index)
      .filter((entry) => !needle || translateExerciseName(entry.name, language).toLowerCase().includes(needle))
      .sort((a, b) => score(b) - score(a) || b.sessions - a.sessions);
  }, [index, query, language, sortBy, trends]);

  const line = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';

  return (
    <StatSection
      title="Estadísticas por ejercicio"
      meta={`${results.length} ${results.length === 1 ? 'ejercicio' : 'ejercicios'}`}
      isDark={isDark}
      isMobile={isMobile}
    >
      <div style={{ position: 'relative', marginBottom: tk.space.md }}>
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
            boxSizing: 'border-box',
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

      <div role="group" aria-label="Ordenar por" style={{ display: 'flex', gap: 6, marginBottom: tk.space.md }}>
        {SORTS.map((o) => {
          const on = sortBy === o.key;
          return (
            <button
              key={o.key}
              type="button"
              aria-pressed={on}
              onClick={() => setSortBy(o.key)}
              style={{
                padding: '6px 12px',
                borderRadius: 99,
                border: `1px solid ${on ? tk.accent : tk.border}`,
                background: on ? tk.accentSoft : 'transparent',
                color: on ? tk.accent : tk.textMuted,
                fontSize: '0.76rem',
                fontWeight: on ? 800 : 600,
                cursor: 'pointer',
              }}
            >
              {o.label}
            </button>
          );
        })}
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
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, borderRadius: 20, border: `1px solid ${tk.border}`, background: tk.surface, overflow: 'hidden' }}>
          {results.map((entry, index) => {
            const rank = rankByExercise[entry.name];
            const position = rank ? getRankPosition(rank.level) : null;
            const trend = trends[entry.name] || { values: [], delta: null };
            return (
              <motion.li
                key={entry.name}
                initial={prefersReducedMotion || index >= ANIMATED_ROWS ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: tk.motion.duration.base, delay: prefersReducedMotion ? 0 : Math.min(index, ANIMATED_ROWS) * 0.03 }}
                style={{ borderTop: index ? `1px solid ${line}` : 'none' }}
              >
                <Link
                  href={`/exercise-history?exercise=${encodeURIComponent(entry.name)}`}
                  className="feeg-press feeg-surface feeg-hover"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '11px 14px 11px 12px',
                    textDecoration: 'none',
                    '--feeg-bg': 'transparent',
                    '--feeg-fg': tk.text,
                    '--feeg-hover-bg': tk.surfaceHover,
                    '--feeg-border-width': '0px',
                    '--feeg-press-scale': 0.99,
                  }}
                >
                  <ExerciseThumb name={entry.name} size={36} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {translateExerciseName(entry.name, language)}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: tk.textMuted, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {entry.sessions} ses. · {entry.series} series
                      {entry.volume > 0 ? ` · ${entry.volume >= 10000 ? `${(entry.volume / 1000).toLocaleString('es-ES', { maximumFractionDigits: 1 })} t` : `${Math.round(entry.volume).toLocaleString('es-ES')} kg`}` : ''}
                    </div>
                    {/* Mismo motor que la pestaña Rangos: un ejercicio no puede tener un rango aquí y
                        otro distinto allí. Sólo los puntuables con marca llevan insignia. */}
                    {position && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
                        <RankArt rank={position.rank} tier={position.tier} size={15} animated={false} />
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: tk.text }}>{position.label}</span>
                        <span style={{ fontSize: '0.68rem', color: tk.textFaint }}>· {rank.ratio.toFixed(2)}× tu peso</span>
                      </div>
                    )}
                  </div>
                  <Sparkline values={trend.values} width={52} height={24} color={tk.accent} surface={tk.surface} />
                  <div style={{ minWidth: 44, textAlign: 'right' }}>
                    {trend.delta !== null ? (
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: trend.delta >= 0 ? tk.accent : tk.textMuted }}>
                        {trend.delta >= 0 ? '+' : '−'}
                        {Math.abs(Math.round(trend.delta))}%
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.72rem', color: tk.textFaint }}>—</span>
                    )}
                    <div style={{ fontSize: '0.62rem', color: tk.textFaint }}>1RM</div>
                  </div>
                </Link>
              </motion.li>
            );
          })}
        </ul>
      )}
    </StatSection>
  );
}
