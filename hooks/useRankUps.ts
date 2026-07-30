import { useEffect, useRef, useState } from 'react';
import { useRanks } from './useRanks';
import { diffRanks, readRankSnapshot, writeRankSnapshot, type RankUp } from '../lib/rankStorage';
import { LEVELS_PER_RANK, getRankPosition } from '../data/ranks';

/**
 * Subidas de rango provocadas por el entrenamiento recién terminado.
 *
 * Se llama desde la pantalla de resumen, no desde las páginas de entreno: para cuando el resumen se
 * monta, el entreno ya está guardado en el contexto, así que `useRanks()` devuelve los niveles NUEVOS
 * y la foto guardada en localStorage tiene los ANTERIORES. Comparar ambos es todo lo que hace falta,
 * y así no hay que duplicar esta lógica en empty.js y en [id].js.
 *
 * La foto se lee una sola vez al montar y se guarda la nueva inmediatamente después. Si se leyera en
 * cada render, el propio guardado borraría la referencia y las subidas desaparecerían de la pantalla
 * en el primer re-render.
 */
export function useRankUps(): RankUp[] {
  const { available, groupRanks, overallLevel, prestigeLevels } = useRanks();
  const [rankUps, setRankUps] = useState<RankUp[]>([]);
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current || !available) return;
    hasRun.current = true;

    const previous = readRankSnapshot();
    const current = {
      overall: overallLevel,
      groups: Object.fromEntries(Object.entries(groupRanks).map(([group, rank]) => [group, rank.level])),
      prestigeLevels,
    };

    setRankUps(diffRanks(previous, current, (level) => getRankPosition(level).rank.index));
    writeRankSnapshot(current);
  }, [available, groupRanks, overallLevel, prestigeLevels]);

  return rankUps;
}

/** Escalones que faltan para el siguiente rango completo, para mensajes del tipo "te faltan 2". */
export function levelsToNextRank(level: number): number {
  const whole = Math.floor(level);
  return LEVELS_PER_RANK - ((whole - 1) % LEVELS_PER_RANK) - 1;
}
