// Escalera de rangos de FEEG.
//
// 30 niveles agrupados en 10 rangos de 3 escalones cada uno (Principiante I, II, III → Novato I...),
// y por encima del nivel 30 un sistema de prestigio de 4 peldaños.
//
// Este archivo es SOLO la escalera: nombres, escalones, color e identidad visual. Cómo se llega a
// un nivel (1RM estimado contra peso corporal) es problema de lib/rankEngine, y a propósito no vive
// aquí: la escalera es estable y la fórmula se va a afinar con datos reales de uso.

export type RankIconKey =
  | 'plate'
  | 'dumbbell'
  | 'arm'
  | 'flame'
  | 'shield'
  | 'medal'
  | 'crown'
  | 'diamond'
  | 'helmet'
  | 'legendCrown';

export interface RankDefinition {
  /** Orden en la escalera, 0 = Principiante. */
  index: number;
  name: string;
  icon: RankIconKey;
  /** Color protagonista de la insignia y del perfil en ese rango. */
  color: string;
  /**
   * Segundo color. En la mayoría es un tono más profundo del principal para dar volumen al degradado;
   * en Titán es el rojo de los detalles sobre negro, y en Leyenda cierra el barrido del brillo.
   */
  accent: string;
  /** Nivel más bajo (1-30) que pertenece a este rango. */
  minLevel: number;
}

export const LEVELS_PER_RANK = 3;
export const MAX_LEVEL = 30;

export const RANKS: RankDefinition[] = [
  { index: 0, name: 'Principiante', icon: 'plate', color: '#8b939c', accent: '#5f676f', minLevel: 1 },
  { index: 1, name: 'Novato', icon: 'dumbbell', color: '#3fbf6f', accent: '#248a4b', minLevel: 4 },
  { index: 2, name: 'Aprendiz', icon: 'arm', color: '#4cc3e8', accent: '#2b8fb0', minLevel: 7 },
  { index: 3, name: 'Constante', icon: 'flame', color: '#3b7dee', accent: '#1f4bb0', minLevel: 10 },
  { index: 4, name: 'Disciplinado', icon: 'shield', color: '#9366f5', accent: '#6435c7', minLevel: 13 },
  { index: 5, name: 'Atleta', icon: 'medal', color: '#e5484d', accent: '#a81f24', minLevel: 16 },
  { index: 6, name: 'Avanzado', icon: 'crown', color: '#f5871f', accent: '#b85a05', minLevel: 19 },
  { index: 7, name: 'Élite', icon: 'diamond', color: '#e8bd3a', accent: '#a37c0c', minLevel: 22 },
  // Titán es el único cuyo color base es más oscuro que el fondo de la tarjeta: la insignia se
  // define por el contorno y los detalles rojos, no por la masa de color.
  { index: 8, name: 'Titán', icon: 'helmet', color: '#1e1e1e', accent: '#e5484d', minLevel: 25 },
  { index: 9, name: 'Leyenda', icon: 'legendCrown', color: '#f2d16b', accent: '#7de8c8', minLevel: 28 },
];

/** Escalones de prestigio, una vez superado el nivel 30. */
export const PRESTIGE_TIERS = ['Leyenda ★', 'Leyenda ★★', 'Leyenda ★★★', 'Leyenda Suprema'] as const;
export type PrestigeTier = (typeof PRESTIGE_TIERS)[number];

const ROMAN = ['I', 'II', 'III'];

export interface RankPosition {
  rank: RankDefinition;
  /** 1, 2 o 3 dentro del rango. */
  tier: number;
  /** Nivel absoluto ya acotado a [1, MAX_LEVEL]. */
  level: number;
  /** "Principiante II", o "Leyenda ★★" si hay prestigio. */
  label: string;
  /** Escalón de prestigio, o null mientras no se supere el nivel 30. */
  prestige: PrestigeTier | null;
  /** Progreso [0, 1] hacia el siguiente nivel; 1 cuando ya no queda escalera por encima. */
  progressToNext: number;
}

/**
 * Traduce un nivel absoluto a su posición en la escalera.
 *
 * `level` puede venir fraccionado (un grupo muscular es la media de sus ejercicios, y esa media casi
 * nunca cae en un entero) — la parte decimal alimenta `progressToNext` en vez de perderse, que es lo
 * que permite dibujar una barra de progreso sin recalcular nada.
 *
 * Por encima de 30 se entra en prestigio: `prestigeLevels` es cuántos peldaños de prestigio se han
 * ganado ya, y satura en el último en vez de desbordar.
 */
export function getRankPosition(level: number, prestigeLevels = 0): RankPosition {
  const safeLevel = Number.isFinite(level) ? Math.max(1, Math.min(MAX_LEVEL, level)) : 1;
  const whole = Math.floor(safeLevel);
  const rank = RANKS[Math.min(RANKS.length - 1, Math.floor((whole - 1) / LEVELS_PER_RANK))];
  const tier = ((whole - 1) % LEVELS_PER_RANK) + 1;

  const prestige =
    prestigeLevels > 0
      ? PRESTIGE_TIERS[Math.min(PRESTIGE_TIERS.length - 1, prestigeLevels - 1)]
      : null;

  return {
    rank,
    tier,
    level: whole,
    label: prestige ?? `${rank.name} ${ROMAN[tier - 1]}`,
    prestige,
    // En el nivel máximo sin prestigio la barra se queda llena: no hay "siguiente" que insinuar.
    progressToNext: whole >= MAX_LEVEL ? 1 : safeLevel - whole,
  };
}

/** Nivel mínimo, para inicializar a alguien que aún no tiene ningún ejercicio puntuable. */
export const UNRANKED_LEVEL = 1;
