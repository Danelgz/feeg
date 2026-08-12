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
  | 'gem'
  | 'crystalShield'
  | 'flame'
  | 'starShield'
  | 'medal'
  | 'crown'
  | 'diamond'
  | 'helmet'
  | 'legendCrown';

export interface RankDefinition {
  /** Orden en la escalera, 0 = Principiante. */
  index: number;
  name: string;
  /**
   * Identificador sin acentos ni mayúsculas para nombrar los archivos de arte:
   * `public/ranks/<slug>-<escalón>.png`. Ver el README de esa carpeta.
   */
  slug: string;
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

// Los colores siguen la descripción del arte, no al revés: son los que tiñen el disco, el borde y
// el nombre del rango por toda la interfaz, así que tienen que reconocerse como el mismo rango que
// la insignia aunque aparezcan sin ella (en una fila de texto, en un gráfico).
//
// `rarityPercent` es cumulativo hacia arriba ("Atleta o más"), no el escalón exacto: es lo que se
// enseña en una escalera ("a partir de aquí sólo llega un X%"), no una foto de "cuánta gente está
// AHORA en Atleta". Calcular esto último de verdad requeriría trackear el histórico de rangos de
// cada usuario, que hoy no se guarda.
export const RANKS: RankDefinition[] = [
  // Gris neutro y no azulado a propósito: `restFill` en MuscleMap.tsx (el tono de "sin rango
  // todavía") es un gris CON tinte azul, así que un Principiante azulado se confundiría con un
  // músculo sin entrenar. Este es más frío y más claro; se leen como dos cosas distintas uno al
  // lado del otro.
  { index: 0, name: 'Principiante', slug: 'principiante', icon: 'plate', color: '#9b9b9b', accent: '#5f5f5f', minLevel: 1, rarityPercent: 100 },
  { index: 1, name: 'Novato', slug: 'novato', icon: 'gem', color: '#00f566', accent: '#008539', minLevel: 4, rarityPercent: 55 },
  { index: 2, name: 'Aprendiz', slug: 'aprendiz', icon: 'crystalShield', color: '#14a5ff', accent: '#0967ae', minLevel: 7, rarityPercent: 30 },
  { index: 3, name: 'Constante', slug: 'constante', icon: 'flame', color: '#00d9ff', accent: '#047690', minLevel: 10, rarityPercent: 16 },
  { index: 4, name: 'Disciplinado', slug: 'disciplinado', icon: 'starShield', color: '#a033ff', accent: '#620bda', minLevel: 13, rarityPercent: 8 },
  { index: 5, name: 'Atleta', slug: 'atleta', icon: 'medal', color: '#ff1420', accent: '#d5920b', minLevel: 16, rarityPercent: 4 },
  { index: 6, name: 'Avanzado', slug: 'avanzado', icon: 'crown', color: '#ff8205', accent: '#a35200', minLevel: 19, rarityPercent: 1.8 },
  // Élite y Leyenda comparten familia amarillo/dorada y diamante azul a propósito (Leyenda «se
  // parece a Élite pero más grande y luminoso»). Se separan por saturación: Élite es amarillo puro
  // y Leyenda un dorado pálido, casi blanco.
  { index: 7, name: 'Élite', slug: 'elite', icon: 'diamond', color: '#fffb00', accent: '#1aa3ff', minLevel: 22, rarityPercent: 0.7 },
  // Titán sigue siendo el más oscuro de la escalera, pero ya no es un marrón apagado: un granate
  // profundo tiene el mismo peso visual y encima combina con las luces rojas del contorno en vez
  // de competir con ellas.
  { index: 8, name: 'Titán', slug: 'titan', icon: 'helmet', color: '#601016', accent: '#ff3429', minLevel: 25, rarityPercent: 0.25 },
  { index: 9, name: 'Leyenda', slug: 'leyenda', icon: 'legendCrown', color: '#ffdb66', accent: '#14a5ff', minLevel: 28, rarityPercent: 0.08 },
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
