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
 */
export function getFaceTransform(headBox: HeadBox, faceViewBox: FaceViewBox): string {
  const scale = Math.min(headBox.w / faceViewBox.width, headBox.h / faceViewBox.height);
  const drawnWidth = faceViewBox.width * scale;
  const drawnHeight = faceViewBox.height * scale;
  const offsetX = headBox.x + (headBox.w - drawnWidth) / 2;
  const offsetY = headBox.y + (headBox.h - drawnHeight) / 2;
  return `translate(${offsetX} ${offsetY}) scale(${scale})`;
}
