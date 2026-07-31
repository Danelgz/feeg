import { useState } from 'react';
import type { RankDefinition } from '../../data/ranks';
import RankIcon from './RankIcon';

interface RankArtProps {
  rank: RankDefinition;
  /** Escalón dentro del rango: 1, 2 o 3. */
  tier: number;
  size?: number;
  /** Desactiva el brillo animado del respaldo SVG de Leyenda. */
  animated?: boolean;
}

/**
 * Insignia de rango: usa el arte de `public/ranks/` y cae al dibujo SVG si ese archivo no existe.
 *
 * El respaldo no es una red de seguridad teórica, es el modo de funcionamiento normal mientras el
 * arte va llegando: son 30 imágenes (10 rangos × 3 escalones) y entran por tandas. Con este
 * componente, cada archivo que se suelta en la carpeta aparece solo, sin tocar código ni mantener
 * una lista de "cuáles ya están"; y los que faltan siguen enseñando su marca en vez de un hueco.
 *
 * El nombre del archivo se deriva de `slug` y del escalón — ver `public/ranks/README.md`.
 *
 * Detalle: un archivo que falta provoca un 404 en la consola del navegador. Es ruido de desarrollo,
 * no un error: Next sirve el 404 estático y `onError` hace su trabajo. Desaparece según se completa
 * el set.
 */
export default function RankArt({ rank, tier, size = 24, animated = true }: RankArtProps) {
  const [failed, setFailed] = useState(false);
  const src = `/ranks/${rank.slug}-${tier}.png`;

  if (failed) {
    return <RankIcon icon={rank.icon} color={rank.color} accent={rank.accent} tier={tier} size={size} animated={animated} />;
  }

  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      style={{ display: 'block', width: size, height: size, objectFit: 'contain', flexShrink: 0 }}
    />
  );
}
