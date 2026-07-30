// Foto de los niveles de rango ya vistos por el usuario.
//
// Es lo ÚNICO que se persiste del sistema de rangos. Los rangos en sí se derivan del historial cada
// vez (ver hooks/useRanks.ts) precisamente para no tener una segunda copia que se desincronice; pero
// para poder decir "has subido a Atleta II" al terminar un entreno hace falta saber en qué nivel
// estaba antes, y eso no se puede recalcular a posteriori.
//
// Vive en su propia clave de localStorage, aparte de `workoutSessionSnapshot`: aquella se borra al
// terminar la sesión y ésta tiene que sobrevivir a todos los entrenos.

const STORAGE_KEY = 'rankLevelsSnapshot';

export interface RankSnapshot {
  /** Nivel global en el momento de la foto. */
  overall: number;
  /** Nivel por grupo muscular. */
  groups: Record<string, number>;
  /** Peldaños de prestigio ya conseguidos. */
  prestigeLevels: number;
}

export interface RankUp {
  /** `null` en la subida del nivel global. */
  group: string | null;
  previousLevel: number;
  currentLevel: number;
  /** La subida cruza a un rango nuevo, no sólo a un escalón nuevo dentro del mismo. */
  isNewRank: boolean;
}

export function readRankSnapshot(): RankSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.overall !== 'number') return null;
    return { overall: parsed.overall, groups: parsed.groups || {}, prestigeLevels: parsed.prestigeLevels || 0 };
  } catch {
    return null;
  }
}

export function writeRankSnapshot(snapshot: RankSnapshot): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Cuota llena o almacenamiento bloqueado: perder la foto sólo significa no anunciar una subida,
    // así que no merece romper el final del entrenamiento.
  }
}

/**
 * Subidas entre dos fotos.
 *
 * Compara por nivel ENTERO, no por el valor continuo: el nivel de un grupo es un número con
 * decimales y casi cualquier serie nueva lo mueve un poco. Anunciar eso sería ruido constante; lo
 * que el usuario entiende como "he subido" es cruzar un escalón.
 *
 * Sin foto previa (primer entreno tras estrenar la función, o tras limpiar el navegador) no se
 * anuncia nada: el usuario no ha subido de rango, es que aún no lo teníamos medido. Anunciar todo su
 * historial de golpe convertiría un logro en una lista.
 */
export function diffRanks(
  previous: RankSnapshot | null,
  current: RankSnapshot,
  rankOfLevel: (level: number) => number
): RankUp[] {
  if (!previous) return [];

  const ups: RankUp[] = [];

  const consider = (group: string | null, before: number | undefined, after: number) => {
    if (before === undefined) return;
    if (Math.floor(after) <= Math.floor(before)) return;
    ups.push({
      group,
      previousLevel: before,
      currentLevel: after,
      isNewRank: rankOfLevel(after) > rankOfLevel(before),
    });
  };

  consider(null, previous.overall, current.overall);
  for (const [group, level] of Object.entries(current.groups)) {
    consider(group, previous.groups[group], level);
  }

  // Los rangos nuevos primero, y dentro de ellos el salto más grande: si hay varias subidas, la
  // pantalla de resumen enseña las primeras.
  return ups.sort((a, b) => {
    if (a.isNewRank !== b.isNewRank) return a.isNewRank ? -1 : 1;
    return b.currentLevel - b.previousLevel - (a.currentLevel - a.previousLevel);
  });
}
