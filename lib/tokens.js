// Design tokens centralizados. Cada página sigue usando inline styles (patrón del repo),
// pero deriva sus valores de aquí en vez de repetir hex codes sueltos.

export const ACCENT = '#1dd1a1';
export const ACCENT_HOVER = '#19b088';
export const ON_ACCENT = '#000';
export const DANGER = '#ff4d4d';
export const DANGER_HOVER = '#e63e3e';
// Mismo tono que getWorkoutTokens().warning — para hitos que merecen destacar más que el accent
// normal (p.ej. un récord "historic" en components/statistics/RecordsSection.jsx) sin inventar
// un hex nuevo sobre la marcha.
export const WARNING = '#ff9f43';

// Paleta "modo entrenamiento": create.js/empty.js/[id].js son intencionalmente siempre oscuros
// (like a focused workout session), pero hasta ahora cada archivo hardcodeaba su propio mint
// (#2EE6C5 en unos sitios, #1dd1a1 en otros, compitiendo dentro de la misma pantalla). Esta es
// la única fuente de verdad para esas tres pantallas.
const WORKOUT_MINT = '#2EE6C5';
const WORKOUT_MINT_HOVER = '#22c4a6';

// Escalas compartidas por los dos temas (no dependen de claro/oscuro). Estaban duplicadas o, en el
// caso de espaciado y tipografía, simplemente no existían: cada pantalla escribía '8px', '15px',
// '25px', '0.85rem' a mano. Es la misma deriva que los hex sueltos que este archivo vino a
// resolver, un nivel más arriba — dos secciones "iguales" acababan con 15px y 16px de padding sin
// que nadie lo hubiera decidido.
const RADIUS = { sm: '8px', md: '12px', lg: '16px', pill: '20px', full: '50%' };

// Base 4. Preferir el escalón más cercano antes que inventar un valor intermedio. Incluye 20 y 24
// a propósito: son dos de los paddings más usados ya en la app, y sin ellos "migrar a la escala"
// obligaría a mover un 20px a 24px, cambiando el diseño de pantallas que nadie pidió tocar.
const SPACE = { xs: '4px', sm: '8px', md: '12px', lg: '16px', xl: '20px', xxl: '24px', huge: '32px' };

// En rem para que respete el tamaño de fuente del sistema. `display` es para el número
// protagonista de una pantalla (p.ej. el volumen en estadísticas), no para títulos normales.
// OJO con el nombre: la clave `text` de los tokens ya es el COLOR de texto y se usa como
// `color: tk.text` por toda la app. Esta escala tiene que llamarse distinto — si se añade como
// `text`, sobreescribe el color (misma clave, gana la última) y rompe cada pantalla a la vez.
// `hero` está por encima de `display` para el caso concreto de un elemento que ES la pantalla: hoy
// solo el nombre del rango en Estadísticas → Rangos, donde el titular tiene que competir con una
// insignia de 96px al lado. A 2rem se leía como un subtítulo suyo en vez de como el protagonista.
const FONT_SIZE = { xs: '0.75rem', sm: '0.85rem', md: '0.95rem', lg: '1.1rem', xl: '1.4rem', display: '2rem', hero: '2.6rem' };

const WEIGHT = { body: 500, medium: 600, bold: 700, heavy: 800 };

// Rampa de intensidad del mapa muscular, de menos a más trabajado. Vive aquí y no dentro de
// MuscleMap.tsx porque es la única escala de la app que codifica un DATO con color: si alguien
// cambia el accent en este archivo y la rampa se queda atrás, el mapa deja de pertenecer al resto
// de la interfaz.
//
// La rampa va de claro a OSCURO, no al revés, porque el cuerpo del mapa es blanco. Sobre blanco un
// mint claro no se ve: la primera versión iba de '#c4f5e7' a ACCENT y funcionaba sólo mientras la
// silueta era casi negra. Con el cuerpo blanco, la intensidad tiene que crecer oscureciendo.
// ACCENT sigue dentro de la rampa (escalón 3) para que el mapa siga siendo reconociblemente FEEG;
// el escalón 4 es el mismo verde llevado a una sombra más profunda.
//
// Los cuatro escalones están repartidos por claridad (L* ≈ 84 / 74 / 54 / 34) y no por saturación:
// puestos uno al lado del otro en la leyenda, dos mints igual de claros y distinta saturación no se
// ordenan solos, y la escala deja de leerse de un vistazo.
//
// El escalón 1 estuvo en '#a8eeda' y se perdía: sobre el cuerpo blanco del mapa nuevo era casi el
// mismo tono que los huecos entre músculos, así que un grupo con dos series parecía sin tocar. Lo
// que separa "poco entrenado" de "sin entrenar" no es la claridad — el reposo es gris neutro — sino
// que haya color; pero ese color tiene que verse.
const HEAT = ['#7fe3c8', ACCENT, '#11957a', '#075c48'];

// Escala de motion. Es la misma deriva que resolvieron los hex y el espaciado, un nivel más arriba:
// cada componente escribía su propia duración y su propia curva ('all 0.2s ease' en las tarjetas,
// 'width 0.4s ease' en las barras de estadísticas, '0.3s ease' en el cambio de tema), así que dos
// elementos que entran juntos en pantalla se movían a ritmos distintos y la interfaz se leía
// descoordinada. Duraciones en SEGUNDOS porque es la unidad nativa de Motion; para `transition:` en
// inline styles está `css` ya formateado, para que ningún componente convierta a ms a mano.
//
// El rango sale de la guía de 150-300ms: por debajo de ~120ms el movimiento no se llega a leer y
// parece un salto, por encima de ~320ms se percibe lento. `slow` es para entradas y transiciones de
// layout, no para hovers.
const MOTION = {
  duration: { fast: 0.18, base: 0.24, slow: 0.32 },
  // Puntos de control cubic-bezier: válidos tal cual como `ease` en Motion.
  // `standard` para cambios de estado; `out` (arranca rápido, frena al final) para cosas que
  // "aterrizan" en pantalla, que es lo que hace que una entrada se sienta física y no lineal.
  // Las anotaciones de tipo no son decorativas: sin ellas TypeScript infiere `number[]` desde este
  // archivo .js y Motion rechaza el valor, porque su prop `ease` exige una tupla de exactamente
  // cuatro puntos de control. Anotarlo aquí lo arregla para todos los consumidores a la vez.
  ease: {
    /** @type {[number, number, number, number]} */
    standard: [0.4, 0, 0.2, 1],
    /** @type {[number, number, number, number]} */
    out: [0.16, 1, 0.3, 1],
  },
  // Retardo entre elementos de una lista que entra escalonada. 40ms es suficiente para que se lea
  // la secuencia; más alto y la última fila de una lista de 8 tarda medio segundo en aparecer.
  stagger: 0.04,
  css: {
    fast: '180ms cubic-bezier(0.4, 0, 0.2, 1)',
    base: '240ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '320ms cubic-bezier(0.16, 1, 0.3, 1)',
  },
};

export function getWorkoutTokens() {
  return {
    isDark: true,
    bg: '#000000',
    surface: '#111111',
    surfaceAlt: '#1a1a1a',
    surfaceHover: '#242424',
    border: '#2a2a2a',
    borderStrong: '#3a3a3a',
    text: '#ffffff',
    textMuted: '#999999',
    textFaint: '#666666',
    accent: WORKOUT_MINT,
    accentHover: WORKOUT_MINT_HOVER,
    accentSoft: 'rgba(46, 230, 197, 0.12)',
    onAccent: '#000000',
    danger: '#ff4d4d',
    dangerHover: '#e63e3e',
    dangerSoft: 'rgba(255, 77, 77, 0.12)',
    warning: '#ff9f43',
    warningSoft: 'rgba(255, 159, 67, 0.12)',
    radius: RADIUS,
    space: SPACE,
    fontSize: FONT_SIZE,
    weight: WEIGHT,
    motion: MOTION,
    heat: HEAT,
    // Ver la nota sobre sombras tintadas en getTokens. Modo entreno es siempre negro, así que el
    // tinte va hacia el mint de esta paleta.
    shadow: {
      card: '0 2px 8px rgba(0, 16, 13, 0.5)',
      float: '0 12px 32px rgba(0, 18, 15, 0.7)',
      accent: '0 4px 14px rgba(46, 230, 197, 0.3)',
    },
    transition: 'all 0.2s ease',
  };
}

export function getTokens(isDark) {
  return {
    isDark,
    // Negro puro, no un gris muy oscuro: es lo que pinta html/body y el fondo de página en
    // components/Layout.jsx, así que cualquier gris aquí se notaba como un "casi negro" por toda
    // la app. surfaceAlt se queda en el tono anterior a propósito — ahora es lo que da la ligera
    // elevación de un panel inset sobre el negro del fondo, en vez de ser indistinguible de él.
    bg: isDark ? '#000000' : '#f0f2f5',
    surface: isDark ? '#1a1a1a' : '#ffffff',
    surfaceAlt: isDark ? '#0f0f0f' : '#f9f9f9',
    surfaceHover: isDark ? '#2a2a2a' : '#f5f5f5',
    border: isDark ? '#333' : '#e0e0e0',
    borderStrong: isDark ? '#444' : '#ddd',
    text: isDark ? '#fff' : '#333',
    textMuted: isDark ? '#888' : '#666',
    textFaint: isDark ? '#666' : '#999',
    accent: ACCENT,
    accentHover: ACCENT_HOVER,
    accentSoft: 'rgba(29, 209, 161, 0.1)',
    onAccent: ON_ACCENT,
    danger: DANGER,
    dangerHover: DANGER_HOVER,
    dangerSoft: 'rgba(255, 77, 77, 0.1)',
    warning: WARNING,
    warningSoft: 'rgba(255, 159, 67, 0.12)',
    radius: RADIUS,
    space: SPACE,
    fontSize: FONT_SIZE,
    weight: WEIGHT,
    motion: MOTION,
    heat: HEAT,
    // Sombras tintadas, no negro puro: una sombra negra sobre un fondo con color se lee como un
    // parche gris pegado encima. Tintadas hacia el verde del accent en oscuro y hacia el azul frío
    // del fondo en claro, se integran como si hubiera una sola fuente de luz.
    shadow: {
      card: isDark ? '0 2px 8px rgba(0, 12, 9, 0.45)' : '0 2px 8px rgba(24, 32, 44, 0.07)',
      float: isDark ? '0 12px 32px rgba(0, 14, 11, 0.6)' : '0 12px 32px rgba(24, 32, 44, 0.14)',
      accent: '0 4px 14px rgba(29, 209, 161, 0.3)',
    },
    transition: 'all 0.2s ease',
  };
}
