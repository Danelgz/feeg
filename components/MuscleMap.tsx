import { useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { getTokens } from '../lib/tokens';
import { slugify } from '../lib/slug';
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

/** Relleno con volumen: `from` es la luz y `to` la sombra del mismo color. */
export interface MuscleFill {
  from: string;
  to: string;
}

/** Id estable para el `<linearGradient>` de un grupo. Único por vista: hay dos SVG en la página y
 *  un id repetido haría que el segundo cuerpo tirase del degradado del primero. */
function gradientId(view: BodyView, group: string): string {
  return `feeg-muscle-${view}-${slugify(group)}`;
}

export interface MuscleMapProps {
  /** Series entrenadas por grupo muscular (p. ej. en la última semana). */
  seriesByMuscle: Partial<Record<MuscleGroup, number>>;
  isDark?: boolean;
  /** Umbrales de series para pasar de un nivel a otro. Por defecto: [1, 4, 8, 12]. */
  thresholds?: [number, number, number, number];
  onMuscleClick?: (group: MuscleGroup) => void;
  labelForGroup?: (group: MuscleGroup) => string;
  /**
   * Color por grupo que sustituye a la rampa de intensidad. Es lo que permite reutilizar este mismo
   * cuerpo para la vista de rangos sin duplicar el componente ni los 117 paths: la geometría y la
   * interacción son idénticas, sólo cambia qué significa el color. Devolver `null` deja el grupo en
   * el tono de "sin datos".
   *
   * Devolver un par `{ from, to }` en vez de un color plano tiñe el músculo con un degradado. No es
   * decoración: sobre un cuerpo blanco, un relleno plano de un solo tono se lee apagado por mucha
   * saturación que tenga, porque no hay ningún gradiente de luz que le dé volumen. Con dos tonos del
   * mismo color el músculo se lee como un cuerpo iluminado y el color gana fuerza sin cambiar de
   * paleta.
   */
  colorForGroup?: (group: MuscleGroup) => string | MuscleFill | null;
  /** Texto de la franja de lectura. Por defecto: series y nivel de intensidad. */
  readoutForGroup?: (group: MuscleGroup, value: number) => ReactNode;
  /** Leyenda inferior. Por defecto: la escala de intensidad de cuatro escalones. */
  legend?: ReactNode;
  /** Texto de la franja cuando no hay nada señalado. */
  hint?: string;
  /**
   * Etiqueta accesible de cada región. Tiene que ir junto a `readoutForGroup`: si se cambia lo que
   * el color significa pero no esto, un lector de pantalla sigue anunciando "12 series" sobre un
   * cuerpo que ya está mostrando rangos.
   */
  ariaLabelForGroup?: (group: MuscleGroup, value: number) => string;
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
  colorForGroup,
  readoutForGroup,
  legend,
  hint = 'Pasa por encima de un músculo, o tócalo para ver sus ejercicios.',
  ariaLabelForGroup,
}: MuscleMapProps) {
  const tk = getTokens(isDark);
  const prefersReducedMotion = useReducedMotion();
  const [active, setActive] = useState<Active | null>(null);

  const label = (group: MuscleGroup) => (labelForGroup ? labelForGroup(group) : group);

  // En este SVG la definición muscular NO la dibuja ningún trazo: cada músculo es un path relleno
  // independiente y las separaciones entre ellos son el cuerpo asomando por los huecos. Así que la
  // anatomía se ve, o no se ve, según cuánto se separen estos dos rellenos.
  //
  // La primera versión los puso a '#232323' (cuerpo) y '#2c2c2c' (músculo en reposo), doce puntos
  // de diferencia: las piernas entrenadas se leían porque el mint contrasta con todo, pero el tren
  // superior sin entrenar se fundía en una mancha uniforme y había que pasar el ratón para saber
  // dónde estaba cada grupo. El músculo en reposo va ahora claramente por encima del cuerpo, de modo
  // que la anatomía se lee en reposo y el color solo añade la intensidad.
  // Cuerpo blanco en los dos temas. En oscuro la figura recorta contra la tarjeta y es el elemento
  // más claro de la pantalla; en claro hay que bajarla un punto, porque un blanco puro sobre una
  // tarjeta blanca no sería una figura, sería nada.
  //
  // El relleno y el trazo no hacen el mismo trabajo, y por eso no se mueven juntos: el relleno
  // distingue el músculo de la masa del cuerpo, y el trazo es el que dibuja la línea anatómica. El
  // trazo está calibrado a 3.34:1 sobre la silueta, el mismo contraste que ya tiene `textFaint`
  // sobre el fondo de la app — un peso que aquí está demostrado que se lee sin gritar.
  const silhouetteFill = isDark ? '#f2f5f7' : '#e4e9ee';
  const silhouetteStroke = isDark ? '#c9d2da' : '#c2cad3';
  const restFill = isDark ? '#dde3ea' : '#cfd7e0';
  const restStroke = isDark ? '#7c8794' : '#727d8a';
  // Sobre los escalones claros de la rampa una línea clara no separaría nada, así que la
  // separación entre músculos entrenados va en negro translúcido: funciona igual sobre el mint
  // claro del nivel 1 que sobre el verde profundo del 4.
  const trainedStroke = 'rgba(0, 0, 0, 0.35)';

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
              <defs>
                {Object.keys(muscles).map((groupKey) => {
                  const fill = colorForGroup?.(groupKey as MuscleGroup);
                  if (!fill || typeof fill === 'string') return null;
                  return (
                    // Diagonal y no vertical: sigue la dirección en la que están dibujadas la
                    // mayoría de las fibras, así que la luz cae a lo largo del músculo en vez de
                    // cortarlo por la mitad.
                    <linearGradient key={groupKey} id={gradientId(view, groupKey)} x1="0" y1="0" x2="0.7" y2="1">
                      <stop offset="0%" stopColor={fill.from} />
                      <stop offset="100%" stopColor={fill.to} />
                    </linearGradient>
                  );
                })}
              </defs>

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
                const override = colorForGroup?.(group);
                const overrideColor =
                  override && typeof override !== 'string' ? `url(#${gradientId(view, group)})` : override;
                const groupFill = colorForGroup ? overrideColor ?? restFill : colorForLevel(level);
                // El trazo no puede tirar de `url(#...)`: sobre un degradado se dibujaría el mismo
                // degradado en el borde y la separación entre músculos desaparecería. Se usa el tono
                // de sombra del par, que es el que ya cierra la forma por abajo.
                const groupStroke =
                  override && typeof override !== 'string' ? override.to : groupFill;

                const show = () => setActive({ group, value, level });
                const clear = () => setActive(null);

                return (
                  <motion.g
                    key={groupKey}
                    role="button"
                    tabIndex={0}
                    aria-label={
                      ariaLabelForGroup?.(group, value) ?? `${label(group)}: ${value} series, ${describe}`
                    }
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
                        fill={groupFill}
                        stroke={
                          isActive
                            ? tk.text
                            : groupFill === restFill
                              ? restStroke
                              : groupStroke === groupFill
                                ? trainedStroke
                                : groupStroke
                        }
                        // Los paths musculares no traen `stroke-width` propio (en el original no
                        // llevaban trazo). En un viewBox de 660 de ancho que se pinta a ~250px,
                        // 2 unidades quedan en algo menos de un píxel: define el borde sin que la
                        // figura parezca contorneada.
                        strokeWidth={isActive ? 3 : 2}
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
          readoutForGroup ? (
            readoutForGroup(active.group, active.value)
          ) : (
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
          )
        ) : (
          <span style={{ fontSize: tk.fontSize.sm, color: tk.textFaint }}>{hint}</span>
        )}
      </div>

      <div style={{ display: 'flex', gap: tk.space.md, flexWrap: 'wrap', justifyContent: 'center' }}>
        {legend ?? ([1, 2, 3, 4] as const).map((level) => (
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
