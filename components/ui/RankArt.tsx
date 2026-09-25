import type { RankDefinition } from '../../data/ranks';
import RankEmblem from './RankEmblem';

interface RankArtProps {
  rank: RankDefinition;
  /** Escalón dentro del rango: 1, 2 o 3. */
  tier: number;
  size?: number;
  /** Barrido de brillo sobre la insignia; sólo para el titular, nunca en listas. */
  animated?: boolean;
  /** Rango todavía no alcanzado (escalera). */
  locked?: boolean;
}

/**
 * Insignia de un rango. Punto de entrada único para toda la app: el dibujo vive en `RankEmblem`,
 * aquí sólo se traduce la definición del rango a sus props.
 *
 * Antes cargaba 30 PNG de `public/ranks/` (3,5 MB, uno de ellos sin entregar nunca) y caía a un
 * SVG distinto si faltaba alguno, así que un mismo rango podía verse con dos estilos. Ahora es un
 * único sistema vectorial: nítido a cualquier tamaño y sin peticiones de red.
 */
export default function RankArt({ rank, tier, size = 24, animated = false, locked = false }: RankArtProps) {
  return <RankEmblem rankIndex={rank.index} tier={tier} size={size} animated={animated} locked={locked} />;
}
