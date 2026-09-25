// Escalera de rangos de FEEG.
//
// 30 niveles agrupados en 10 rangos de 3 escalones cada uno (Principiante I, II, III → Novato I...),
// y por encima del nivel 30 un sistema de prestigio de 4 peldaños.
//
// Este archivo es SOLO la escalera: nombres, escalones, color e identidad visual. Cómo se llega a
// un nivel (1RM estimado contra peso corporal) es problema de lib/rankEngine, y a propósito no vive
// aquí: la escalera es estable y la fórmula se va a afinar con datos reales de uso.

export interface RankDefinition {
  /** Orden en la escalera, 0 = Principiante. */
  index: number;
  name: string;
  /** Identificador estable sin acentos ni mayúsculas (claves de React, ids del DOM). */
  slug: string;
  /** Color de identidad: nombre del rango, músculo en el mapa, barras de progreso. */
  color: string;
  /** Tono profundo del mismo rango, para el arranque de degradados (barra de progreso del titular). */
  accent: string;
  /** Nivel más bajo (1-30) que pertenece a este rango. */
  minLevel: number;
  /**
   * Estimación de qué porcentaje de la gente que entrena con pesas llega a este rango o más
   * arriba. NO sale de datos reales de usuarios de FEEG: no hay (ni conviene montar con la base
   * de usuarios actual, ver comentario más abajo) infraestructura para calcular eso. Es una curva
   * diseñada a mano, coherente con lo exigente que es cada tramo del baremo (rankEngine curva la
   * escalera con exponente 1.6 — la segunda mitad cuesta muchísimo más que la primera, y este
   * porcentaje sigue esa misma forma).
   */
  rarityPercent: number;
}

export const LEVELS_PER_RANK = 3;
export const MAX_LEVEL = 30;

// `rarityPercent` es cumulativo hacia arriba ("Atleta o más"), no el escalón exacto: es lo que se
// enseña en una escalera ("a partir de aquí sólo llega un X%"), no una foto de "cuánta gente está
// AHORA en Atleta". Calcular esto último de verdad requeriría trackear el histórico de rangos de
// cada usuario, que hoy no se guarda.
export const RANKS: RankDefinition[] = [
  // `color` es el tono medio del esmalte de cada insignia (components/ui/RankEmblem.tsx): el mismo
  // que tiñe el músculo en el mapa y el nombre del rango en texto, para que se reconozca como el
  // mismo rango aunque aparezca sin su insignia. Tonos de esmalte, no de neón: la versión anterior
  // (#00f566, #ff1420...) vibraba contra el fondo negro y competía con el acento de la app.
  //
  // Principiante es gris neutro a propósito: `restFill` en MuscleMap.tsx ("sin rango todavía") es
  // un gris CON tinte azul, y un Principiante azulado se confundiría con un músculo sin entrenar.
  { index: 0, name: 'Principiante', slug: 'principiante', color: '#a8a8a8', accent: '#5c5c5c', minLevel: 1, rarityPercent: 100 },
  { index: 1, name: 'Novato', slug: 'novato', color: '#3fcf86', accent: '#136b40', minLevel: 4, rarityPercent: 55 },
  { index: 2, name: 'Aprendiz', slug: 'aprendiz', color: '#4f97ee', accent: '#1a4d94', minLevel: 7, rarityPercent: 30 },
  { index: 3, name: 'Constante', slug: 'constante', color: '#2fc4dc', accent: '#0b5e6f', minLevel: 10, rarityPercent: 16 },
  { index: 4, name: 'Disciplinado', slug: 'disciplinado', color: '#a274f2', accent: '#48208c', minLevel: 13, rarityPercent: 8 },
  // Atleta es frambuesa y Titán rojo: los dos llevan rojo en la insignia y, con el mismo tono, en
  // el mapa muscular serían indistinguibles.
  { index: 5, name: 'Atleta', slug: 'atleta', color: '#ec4f86', accent: '#7a0c35', minLevel: 16, rarityPercent: 4 },
  { index: 6, name: 'Avanzado', slug: 'avanzado', color: '#f19a3e', accent: '#8a4309', minLevel: 19, rarityPercent: 1.8 },
  { index: 7, name: 'Élite', slug: 'elite', color: '#f4c645', accent: '#2160c0', minLevel: 22, rarityPercent: 0.7 },
  // La insignia de Titán es obsidiana, pero en texto y en el mapa un casi-negro desaparece sobre
  // el fondo; se identifica por el rojo de sus detalles.
  { index: 8, name: 'Titán', slug: 'titan', color: '#e5484d', accent: '#40444c', minLevel: 25, rarityPercent: 0.25 },
  { index: 9, name: 'Leyenda', slug: 'leyenda', color: '#f4df98', accent: '#3a2b92', minLevel: 28, rarityPercent: 0.08 },
];

/** Formatea `rarityPercent` para pantalla: "Top 4%", "Top 0.08%"... y el caso especial del 100%. */
export function formatRarity(rank: RankDefinition): string {
  if (rank.rarityPercent >= 100) return 'Todo el mundo empieza aquí';
  const value = rank.rarityPercent >= 1 ? rank.rarityPercent.toFixed(1).replace(/\.0$/, '') : rank.rarityPercent;
  return `Top ${value}%`;
}

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
