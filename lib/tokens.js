// Design tokens centralizados. Cada página sigue usando inline styles (patrón del repo),
// pero deriva sus valores de aquí en vez de repetir hex codes sueltos.

export const ACCENT = '#1dd1a1';
export const ACCENT_HOVER = '#19b088';
export const ON_ACCENT = '#000';
export const DANGER = '#ff4d4d';
export const DANGER_HOVER = '#e63e3e';

// Paleta "modo entrenamiento": create.js/empty.js/[id].js son intencionalmente siempre oscuros
// (like a focused workout session), pero hasta ahora cada archivo hardcodeaba su propio mint
// (#2EE6C5 en unos sitios, #1dd1a1 en otros, compitiendo dentro de la misma pantalla). Esta es
// la única fuente de verdad para esas tres pantallas.
const WORKOUT_MINT = '#2EE6C5';
const WORKOUT_MINT_HOVER = '#22c4a6';

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
    // Color exclusivo del momento de récord personal — deliberadamente distinto del acento de
    // marca (mint) para que "esto es un récord" se lea de un vistazo en cualquier pantalla.
    prAccent: '#FFD60A',
    prAccentSoft: 'rgba(255, 214, 10, 0.14)',
    radius: { sm: '8px', md: '12px', lg: '16px', pill: '20px', full: '50%' },
    shadow: {
      card: '0 2px 6px rgba(0,0,0,0.4)',
      float: '0 8px 25px rgba(0,0,0,0.6)',
      accent: '0 4px 14px rgba(46, 230, 197, 0.3)',
      pr: '0 4px 14px rgba(255, 214, 10, 0.35)',
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
    radius: { sm: '8px', md: '12px', lg: '16px', pill: '20px', full: '50%' },
    shadow: {
      card: isDark ? '0 2px 6px rgba(0,0,0,0.3)' : '0 2px 6px rgba(0,0,0,0.08)',
      float: isDark ? '0 8px 25px rgba(0,0,0,0.45)' : '0 8px 25px rgba(0,0,0,0.15)',
      accent: '0 4px 14px rgba(29, 209, 161, 0.3)',
    },
    transition: 'all 0.2s ease',
  };
}
