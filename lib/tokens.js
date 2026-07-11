// Design tokens centralizados. Cada página sigue usando inline styles (patrón del repo),
// pero deriva sus valores de aquí en vez de repetir hex codes sueltos.

export const ACCENT = '#1dd1a1';
export const ACCENT_HOVER = '#19b088';
export const ON_ACCENT = '#000';
export const DANGER = '#ff4d4d';
export const DANGER_HOVER = '#e63e3e';

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
