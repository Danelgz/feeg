import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { getTokens } from '../lib/tokens';
import {
  ANATOMY_VIEW_BOX,
  BACK_MUSCLES,
  BACK_SILHOUETTE,
  FRONT_MUSCLES,
  FRONT_SILHOUETTE,
  type MusclePath,
} from '../data/muscleMapPaths';
import type { BodyView, MuscleGroup } from '../data/muscleMapRegions';

export type IntensityLevel = 0 | 1 | 2 | 3 | 4;

export interface MuscleMapProps {
  /** Series entrenadas por grupo muscular (p. ej. en la última semana). */
  seriesByMuscle: Partial<Record<MuscleGroup, number>>;
  isDark?: boolean;
  /** Umbrales de series para pasar de un nivel a otro. Por defecto: [1, 4, 8, 12]. */
  thresholds?: [number, number, number, number];
  onMuscleClick?: (group: MuscleGroup) => void;
  labelForGroup?: (group: MuscleGroup) => string;
}

const DEFAULT_THRESHOLDS: [number, number, number, number] = [1, 4, 8, 12];

const LEVEL_LABELS: Record<Exclude<IntensityLevel, 0>, string> = {
  1: 'Bajo',
  2: 'Moderado',
  3: 'Alto',
  4: 'Muy alto',
};

const VIEWS: { view: BodyView; caption: string; silhouette: MusclePath[]; muscles: Record<string, MusclePath[]> }[] = [
  { view: 'front', caption: 'Frontal', silhouette: FRONT_SILHOUETTE, muscles: FRONT_MUSCLES },
  { view: 'back', caption: 'Posterior', silhouette: BACK_SILHOUETTE, muscles: BACK_MUSCLES },
];

function getIntensity(value: number, thresholds: [number, number, number, number]): IntensityLevel {
  if (value <= 0) return 0;
  const [t1, t2, t3, t4] = thresholds;
  if (value >= t4) return 4;
  if (value >= t3) return 3;
  if (value >= t2) return 2;
  if (value >= t1) return 1;
  return 0;
}

interface Active {
  group: MuscleGroup;
  value: number;
  level: IntensityLevel;
}

/**
 * Mapa muscular: silueta anatómica frontal y posterior con las regiones teñidas según cuánto se ha
 * entrenado cada grupo.
 *
 * Sustituye al cuerpo esquemático de rectángulos y elipses. La geometría vive en
 * `data/muscleMapPaths.ts` (generado desde `public/frontrear.html`), no aquí.
 *
 * Tres decisiones de UX que se apartan de la versión anterior:
 *
 * 1. **Las dos vistas se ven a la vez**, en vez de un conmutador frontal/posterior. El mapa
 *    responde a "¿qué me estoy dejando sin entrenar?", y con un conmutador la mitad de la respuesta
 *    siempre queda escondida detrás de un toque. Son dos figuras estrechas y altas: puestas en
 *    paralelo el conjunto queda casi cuadrado y cabe igual en móvil.
 * 2. **Sin tooltip flotante.** El anterior se posicionaba en las coordenadas del ratón con
 *    `position: fixed` y sin acotar al viewport, así que en los músculos del lado derecho se salía
 *    de pantalla; y dependía de `hover`, que en móvil no existe. Ahora hay una franja de lectura
 *    fija bajo las figuras que se rellena al pasar por encima, al enfocar con teclado o al tocar.
 * 3. **Navegable con teclado.** Cada grupo es un control enfocable con su etiqueta accesible; antes
 *    sólo respondía al ratón, así que el mapa era invisible para quien no usa uno.
 */
export default function MuscleMap({
  seriesByMuscle,
  isDark = false,
  thresholds = DEFAULT_THRESHOLDS,
  onMuscleClick,
  labelForGroup,
}: MuscleMapProps) {
  const tk = getTokens(isDark);
  const prefersReducedMotion = useReducedMotion();
  const [active, setActive] = useState<Active | null>(null);

  const label = (group: MuscleGroup) => (labelForGroup ? labelForGroup(group) : group);

  // La silueta va un punto por encima del fondo de la tarjeta para que el cuerpo se lea como una
  // figura y no como un recorte; los músculos sin trabajar quedan aún más apagados, de modo que
  // "no entrenado" se perciba como hueco y no como un color más de la escala.
  const silhouetteFill = isDark ? '#232323' : '#e8ebee';
  const silhouetteStroke = isDark ? '#2f2f2f' : '#d2d7dc';
  const restFill = isDark ? '#2c2c2c' : '#dbe0e5';

  const colorForLevel = (level: IntensityLevel) => (level === 0 ? restFill : tk.heat[level - 1]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: tk.space.lg, width: '100%' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: tk.space.md,
          width: '100%',
          maxWidth: '520px',
        }}
      >
        {VIEWS.map(({ view, caption, silhouette, muscles }, viewIndex) => (
          <motion.figure
            key={view}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: tk.motion.duration.slow,
              ease: tk.motion.ease.out,
              delay: prefersReducedMotion ? 0 : viewIndex * 0.08,
            }}
            style={{ margin: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: tk.space.sm }}
          >
            <svg viewBox={ANATOMY_VIEW_BOX} style={{ width: '100%', height: 'auto', display: 'block' }}>
              {silhouette.map((p, i) => (
                <path
                  key={`sil-${i}`}
                  d={p.d}
                  fill={p.fill === 'none' ? 'none' : silhouetteFill}
                  stroke={p.stroke ? silhouetteStroke : undefined}
                  strokeWidth={p.strokeWidth}
                />
              ))}

              {Object.entries(muscles).map(([groupKey, paths], groupIndex) => {
                const group = groupKey as MuscleGroup;
                const value = seriesByMuscle[group] || 0;
                const level = getIntensity(value, thresholds);
                const isActive = active?.group === group;
                const describe = level === 0 ? 'sin entrenar' : LEVEL_LABELS[level];

                const show = () => setActive({ group, value, level });
                const clear = () => setActive(null);

                return (
                  <motion.g
                    key={groupKey}
                    role="button"
                    tabIndex={0}
                    aria-label={`${label(group)}: ${value} series, ${describe}`}
                    initial={prefersReducedMotion ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{
                      duration: tk.motion.duration.base,
                      ease: tk.motion.ease.out,
                      delay: prefersReducedMotion ? 0 : 0.12 + groupIndex * tk.motion.stagger,
                    }}
                    onMouseEnter={show}
                    onMouseLeave={clear}
                    onFocus={show}
                    onBlur={clear}
                    onClick={() => onMuscleClick?.(group)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onMuscleClick?.(group);
                      }
                    }}
                    style={{ cursor: onMuscleClick ? 'pointer' : 'default' }}
                  >
                    {paths.map((p, i) => (
                      <path
                        key={i}
                        d={p.d}
                        fill={colorForLevel(level)}
                        stroke={isActive ? tk.text : silhouetteStroke}
                        strokeWidth={isActive ? 2.5 : p.strokeWidth}
                        style={{
                          transition: `fill ${tk.motion.css.base}, stroke ${tk.motion.css.fast}`,
                        }}
                      />
                    ))}
                  </motion.g>
                );
              })}
            </svg>
            <figcaption style={{ fontSize: tk.fontSize.xs, color: tk.textMuted, fontWeight: tk.weight.medium }}>
              {caption}
            </figcaption>
          </motion.figure>
        ))}
      </div>

      {/* Franja de lectura. Reserva su alto siempre para que rellenarla al pasar por encima no
          empuje la leyenda ni cambie la altura de la tarjeta. */}
      <div
        aria-live="polite"
        style={{
          minHeight: '44px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: `0 ${tk.space.md}`,
        }}
      >
        {active ? (
          <span style={{ fontSize: tk.fontSize.md, color: tk.text, fontWeight: tk.weight.medium }}>
            {label(active.group)}
            <span style={{ color: tk.textMuted, fontWeight: tk.weight.body }}> · </span>
            <span style={{ color: active.level === 0 ? tk.textMuted : tk.accent, fontVariantNumeric: 'tabular-nums' }}>
              {active.value} {active.value === 1 ? 'serie' : 'series'}
            </span>
            <span style={{ color: tk.textFaint, fontWeight: tk.weight.body, fontSize: tk.fontSize.sm }}>
              {' '}· {active.level === 0 ? 'Sin entrenar' : LEVEL_LABELS[active.level]}
            </span>
          </span>
        ) : (
          <span style={{ fontSize: tk.fontSize.sm, color: tk.textFaint }}>
            Pasa por encima de un músculo, o tócalo para ver sus ejercicios.
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: tk.space.md, flexWrap: 'wrap', justifyContent: 'center' }}>
        {([1, 2, 3, 4] as const).map((level) => (
          <div key={level} style={{ display: 'flex', alignItems: 'center', gap: tk.space.xs }}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '3px',
                backgroundColor: tk.heat[level - 1],
                display: 'inline-block',
              }}
            />
            <span style={{ fontSize: tk.fontSize.xs, color: tk.textMuted }}>{LEVEL_LABELS[level]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
