import { useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { getTokens } from '../lib/tokens';
import { slugify } from '../lib/slug';
import type { MusclePath } from '../data/muscleMapPaths';
import * as MALE_BODY from '../data/muscleMapPaths';
import * as FEMALE_BODY from '../data/muscleMapPathsFemale';
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
  /**
   * Cuerpo que se dibuja. Sale del perfil, que ya guarda el sexo para los baremos de fuerza — no se
   * pregunta dos veces. Sin indicar, se dibuja el masculino: hay que elegir uno, y es el que ya
   * estaba. Sólo cambia el dibujo; los grupos, los colores y la interacción son los mismos.
   */
  sex?: BodySex | null;
  /** Umbrales de series para pasar de un nivel a otro. Por defecto: [1, 4, 8, 12]. */
  thresholds?: [number, number, number, number];
  onMuscleClick?: (group: MuscleGroup) => void;
  labelForGroup?: (group: MuscleGroup) => string;
  /**
   * Color por grupo que sustituye a la rampa de intensidad. Es lo que permite reutilizar este mismo
   * cuerpo para la vista de rangos sin duplicar el componente ni los 65 paths: la geometría y la
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

/** Sexo del cuerpo que se dibuja. `null` (sin indicar en el perfil) cae en el masculino. */
export type BodySex = 'male' | 'female';

interface BodyView_ {
  view: BodyView;
  caption: string;
  silhouette: MusclePath[];
  muscles: Record<string, MusclePath[]>;
}

/**
 * Los dos cuerpos. Son dos láminas dibujadas por separado, no una escalada desde la otra: cada una
 * trae su propio viewBox porque forzarlas a una caja común deformaría a una de las dos.
 *
 * Las dos exportan los mismos nombres (las genera el mismo script), así que intercambiarlas es
 * elegir módulo y nada más.
 */
const ANATOMY: Record<BodySex, { viewBox: string; views: BodyView_[] }> = {
  male: {
    viewBox: MALE_BODY.ANATOMY_VIEW_BOX,
    views: [
      { view: 'front', caption: 'Frontal', silhouette: MALE_BODY.FRONT_SILHOUETTE, muscles: MALE_BODY.FRONT_MUSCLES },
      { view: 'back', caption: 'Posterior', silhouette: MALE_BODY.BACK_SILHOUETTE, muscles: MALE_BODY.BACK_MUSCLES },
    ],
  },
  female: {
    viewBox: FEMALE_BODY.ANATOMY_VIEW_BOX,
    views: [
      {
        view: 'front',
        caption: 'Frontal',
        silhouette: FEMALE_BODY.FRONT_SILHOUETTE,
        muscles: FEMALE_BODY.FRONT_MUSCLES,
      },
      { view: 'back', caption: 'Posterior', silhouette: FEMALE_BODY.BACK_SILHOUETTE, muscles: FEMALE_BODY.BACK_MUSCLES },
    ],
  },
};

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
 * `data/muscleMapPaths.ts` (vectorizado de `public/Referencia2.png`), no aquí.
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
  sex = null,
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
  const anatomy = ANATOMY[sex === 'female' ? 'female' : 'male'];

  const label = (group: MuscleGroup) => (labelForGroup ? labelForGroup(group) : group);

  // En este SVG la definición muscular NO la dibuja ningún trazo: cada músculo es un path relleno
  // independiente y las separaciones entre ellos son el cuerpo asomando por los huecos. Así que la
  // anatomía se ve, o no se ve, según cuánto se separen estos dos rellenos — y la lámina de la que
  // sale la geometría los separa mucho: cuerpo blanco, músculo gris medio.
  //
  // La versión anterior los tenía casi pegados ('#f2f5f7' contra '#dde3ea') y compensaba con un
  // trazo por músculo. Con esta anatomía sobra: cada vientre es una forma grande y limpia, y un
  // trazo sobre sesenta y cinco paths convertía la figura en un dibujo de líneas. El contraste lo
  // lleva ahora el relleno, que es como está pintada la lámina.
  //
  // En oscuro la silueta va blanca y recorta contra la tarjeta. En claro hay que bajarla, porque un
  // blanco puro sobre una tarjeta blanca no sería una figura, sería nada; y ahí sí hace falta un
  // trazo, pero en el contorno del cuerpo, no en cada músculo.
  const silhouetteFill = isDark ? '#ffffff' : '#f6f8fa';
  const silhouetteStroke = isDark ? null : '#d2dae2';
  const restFill = isDark ? '#9aa3ad' : '#98a3b0';
  // Los músculos no llevan trazo en ningún estado, tampoco al señalarlos: quien señala un músculo ya
  // tiene la respuesta en la franja de lectura de abajo, que además dice CUÁL es y en qué nivel está
  // — un contorno sólo dice "este". Y con el teclado el anillo de foco lo pone
  // components/ui/InteractionStyles.tsx, así que quitarlo no deja a nadie sin saber dónde está.

  const colorForLevel = (level: IntensityLevel) => (level === 0 ? restFill : tk.heat[level - 1]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: tk.space.lg, width: '100%' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: tk.space.md,
          width: '100%',
          // Estrechado desde 520px al cambiar de anatomía: la figura nueva es bastante más esbelta
          // (viewBox 432x1000 frente a 660x1206), así que a 520px de ancho las dos vistas medían
          // ~600px de alto y la tarjeta ya no cabía de un vistazo en móvil.
          maxWidth: '440px',
        }}
      >
        {anatomy.views.map(({ view, caption, silhouette, muscles }, viewIndex) => (
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
            <svg viewBox={anatomy.viewBox} style={{ width: '100%', height: 'auto', display: 'block' }}>
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
                  stroke={silhouetteStroke ?? undefined}
                  strokeWidth={silhouetteStroke ? 1.4 : undefined}
                />
              ))}

              {Object.entries(muscles).map(([groupKey, paths], groupIndex) => {
                const group = groupKey as MuscleGroup;
                const value = seriesByMuscle[group] || 0;
                const level = getIntensity(value, thresholds);
                const describe = level === 0 ? 'sin entrenar' : LEVEL_LABELS[level];
                const override = colorForGroup?.(group);
                const overrideColor =
                  override && typeof override !== 'string' ? `url(#${gradientId(view, group)})` : override;
                const groupFill = colorForGroup ? overrideColor ?? restFill : colorForLevel(level);

                const show = () => setActive({ group, value, level });
                const clear = () => setActive(null);

                return (
                  <motion.g
                    key={groupKey}
                    role="button"
                    tabIndex={0}
                    // La vista se añade aquí y no en `ariaLabelForGroup`: la mayoría de los grupos se
                    // dibuja en las dos figuras, así que sin ella el lector de pantalla anuncia dos
                    // controles con exactamente el mismo nombre y no hay forma de saber cuál es cuál.
                    aria-label={`${
                      ariaLabelForGroup?.(group, value) ?? `${label(group)}: ${value} series, ${describe}`
                    } · ${caption}`}
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
                        // Sin trazo en ningún estado: los huecos de la propia anatomía ya separan un
                        // vientre del siguiente, y el hueco es más limpio que una línea porque no
                        // engorda la silueta ni compite con el color del grupo.
                        stroke="none"
                        style={{ transition: `fill ${tk.motion.css.base}` }}
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
