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
const FONT_SIZE = { xs: '0.75rem', sm: '0.85rem', md: '0.95rem', lg: '1.1rem', xl: '1.4rem', display: '2rem' };

const WEIGHT = { body: 500, medium: 600, bold: 700, heavy: 800 };

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
    bg: isDark ? '#0f0f0f' : '#f0f2f5',
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
