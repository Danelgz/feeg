import { describe, expect, it } from 'vitest';

import { FACE_VERTICAL_OFFSET_BY_BODY, getFaceTransform } from './faceTransform';

const MALE_HEAD_BOX = { x: 172, y: 11, w: 86, h: 134 };
const FEMALE_HEAD_BOX = { x: 150, y: 45, w: 105, h: 108 };
const FACE_VIEW_BOX = { width: 100, height: 126 };

describe('getFaceTransform', () => {
  it('mantiene la cara masculina sin desplazamiento vertical adicional', () => {
    expect(getFaceTransform(MALE_HEAD_BOX, FACE_VIEW_BOX, FACE_VERTICAL_OFFSET_BY_BODY.male)).toBe(
      'translate(172 36.64) scale(0.86)',
    );
  });

  it('baja los rasgos de la cara femenina dentro de la cabeza', () => {
    expect(getFaceTransform(FEMALE_HEAD_BOX, FACE_VIEW_BOX, FACE_VERTICAL_OFFSET_BY_BODY.female)).toBe(
      'translate(159.64285714285714 62.14285714285714) scale(0.8571428571428571)',
    );
  });
});
