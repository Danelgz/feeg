import { useMemo } from "react";
import { motion, useReducedMotion } from "motion/react";
import MiniStat from "./MiniStat";
import StatSection from "./StatSection";
import { EmptyState } from "../ui";
import { getTokens } from "../../lib/tokens";

const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function formatMonth(monthStr) {
  const [year, month] = monthStr.split('-');
  return `${MONTH_NAMES[parseInt(month, 10) - 1]} ${year}`;
}

export default function MonthlyReportSection({ isDark, isMobile, workouts, t }) {
  const tk = getTokens(isDark);
  const prefersReducedMotion = useReducedMotion();

  const entries = useMemo(() => {
    const byMonth = {};
    (workouts || []).forEach((w) => {
      if (!w.completedAt) return;
      const d = new Date(w.completedAt);
      const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      if (!byMonth[key]) byMonth[key] = { sessions: 0, series: 0, reps: 0, volume: 0, timeMin: 0 };
      byMonth[key].sessions += 1;
      byMonth[key].series += Number(w.series || 0);
      byMonth[key].reps += Number(w.totalReps || 0);
      byMonth[key].volume += Number(w.totalVolume || 0);
      byMonth[key].timeMin += w.elapsedTime !== undefined
        ? Math.round(Number(w.elapsedTime || 0) / 60)
        : Number(w.totalTime || 0);
    });
    return Object.entries(byMonth).sort((a, b) => b[0].localeCompare(a[0]));
  }, [workouts]);

  return (
    <StatSection
      title="Informe mensual"
      meta={entries.length > 0 ? `${entries.length} ${entries.length === 1 ? 'mes' : 'meses'}` : undefined}
      isDark={isDark}
      isMobile={isMobile}
    >
      {entries.length === 0 ? (
        <EmptyState
          isDark={isDark}
          icon="clock"
          title={t('stats_no_data')}
          description="Cuando acumules entrenamientos verás aquí el resumen de cada mes."
        />
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: tk.space.md }}>
          {entries.map(([month, v], index) => (
            <motion.li
              key={month}
              // Sin `cursor: pointer`: estas tarjetas no navegan a ningún sitio. La versión anterior
              // lo tenía junto a un desplazamiento al pasar por encima, prometiendo un clic que no
              // existía.
              className="feeg-surface feeg-hover"
              initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: tk.motion.duration.base,
                ease: tk.motion.ease.out,
                delay: prefersReducedMotion ? 0 : Math.min(index, 10) * tk.motion.stagger,
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
                {/* Un mes no necesita número de orden: su nombre ya es su identidad. La versión
                    anterior le ponía un círculo con la posición en la lista, que no aportaba nada
                    salvo ruido junto al nombre. */}
                <strong style={{ color: tk.text, fontSize: tk.fontSize.lg, letterSpacing: '-0.01em' }}>
                  {formatMonth(month)}
                </strong>
                <span
                  style={{
                    fontSize: tk.fontSize.xs,
                    color: tk.accent,
                    fontWeight: tk.weight.medium,
                    flexShrink: 0,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {v.sessions} {v.sessions === 1 ? 'entreno' : 'entrenos'}
                </span>
              </div>
              <div
                style={{
                  display: 'grid',
                  // Cinco columnas a 375px dejan menos de 60px por dato: los números se parten y las
                  // etiquetas se recortan. En móvil van de dos en dos.
                  gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
                  gap: tk.space.md,
                }}
              >
                <MiniStat label="Series" value={v.series.toLocaleString('es-ES')} isDark={isDark} />
                <MiniStat label="Reps" value={v.reps.toLocaleString('es-ES')} isDark={isDark} />
                <MiniStat label="Volumen" value={`${Math.round(v.volume).toLocaleString('es-ES')} kg`} isDark={isDark} />
                {/* La versión anterior imprimía el número a secas: «312» sin decir de qué. */}
                <MiniStat label="Tiempo" value={`${v.timeMin.toLocaleString('es-ES')} min`} isDark={isDark} />
              </div>
            </motion.li>
          ))}
        </ul>
      )}
    </StatSection>
  );
}
