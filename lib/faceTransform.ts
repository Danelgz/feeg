export interface HeadBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FaceViewBox {
  width: number;
  height: number;
}

/**
 * Ajuste óptico de los rasgos dentro de la cabeza real de cada cuerpo. La cabeza femenina tiene
 * una proporción más ancha y, con la misma caja normalizada, los rasgos necesitan bajar un poco
 * para quedar centrados en la cara y no pegados a la frente. El valor está en unidades de la caja
 * de la cara, antes de aplicar la escala del cuerpo.
 */
export const FACE_VERTICAL_OFFSET_BY_BODY = {
  male: 0,
  female: 20,
} as const;

/**
 * Transform SVG para encajar una cara (dibujada en su propia caja normalizada, ver
 * `data/faceStyles.tsx`) dentro de la caja real de una cabeza (ver `HEAD_BOX` en
 * `components/MuscleMap.tsx`), con escala UNIFORME y centrada — nunca estirada por separado en
 * cada eje.
 *
 * Antes se escalaba x e y de forma independiente para llenar el rectángulo exacto del `HEAD_BOX`
 * (`scale(w/100, h/168)`). Como las dos cabezas reales tienen proporciones bastante distintas entre
 * sí (la masculina bastante más alta que ancha, la femenina casi cuadrada), esa escala
 * independiente estiraba la cara de forma distinta en cada cuerpo — ligeramente en la masculina,
 * muy visiblemente ancha y aplastada en la femenina, donde la diferencia entre el factor horizontal
 * y el vertical llegaba a ser de más del 60%.
 *
 * La escala uniforme (el menor de los dos factores) deja algo de aire a los lados o arriba/abajo
 * según el cuerpo, pero la cara conserva siempre sus proporciones — nunca se ve estirada.
 *
 * El aire sobrante NO se reparte igual en los cuatro lados: en horizontal sí se centra (una cara
 * es simétrica, no hay motivo para colgarla a un lado), pero en vertical se apoya por ABAJO — la
 * barbilla coincide con el borde inferior del `HEAD_BOX` (que sí está bien anclado: es donde el
 * cuello se estrecha) y todo el margen sobrante sube a la coronilla, que es zona de pelo/cráneo
 * donde un poco más o menos de aire no se nota. Centrar en vertical (como hacía la primera
 * versión) subía la cara más de la cuenta en la cabeza masculina — su HEAD_BOX es bastante más
 * alto que ancho, así que ahí sobra bastante alto — y la dejaba floja sobre la frente en vez de
 * asentada donde va la cara de verdad.
 */
export function getFaceTransform(headBox: HeadBox, faceViewBox: FaceViewBox, verticalOffset = 0): string {
  const scale = Math.min(headBox.w / faceViewBox.width, headBox.h / faceViewBox.height);
  const drawnWidth = faceViewBox.width * scale;
  const drawnHeight = faceViewBox.height * scale;
  const offsetX = headBox.x + (headBox.w - drawnWidth) / 2;
  const offsetY = headBox.y + (headBox.h - drawnHeight) + verticalOffset * scale;
  return `translate(${offsetX} ${offsetY}) scale(${scale})`;
}
