// Datos geométricos del mapa muscular (silueta esquemática, sin dependencias externas).
// Añadir un músculo nuevo = añadir una entrada aquí; MuscleMap.tsx no necesita tocarse.

export const MUSCLE_GROUPS = [
  'Cuello',
  'Hombros',
  'Pecho',
  'Espalda',
  'Abdomen',
  'Bíceps',
  'Tríceps',
  'Antebrazo',
  'Cuádriceps',
  'Femoral',
  'Glúteos',
  'Gemelos',
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export type BodyView = 'front' | 'back';

interface RectShape {
  kind: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
  rx: number;
}

interface EllipseShape {
  kind: 'ellipse';
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

export type RegionShape = RectShape | EllipseShape;

export interface MuscleRegion {
  id: string;
  group: MuscleGroup;
  view: BodyView;
  shape: RegionShape;
}

export interface DecorativeShape {
  id: string;
  view: BodyView;
  shape: RegionShape;
}

export const VIEW_BOX = '0 0 200 400';

// Formas neutras (cabeza, pelvis, pies) que dan continuidad visual pero no representan
// ningún grupo muscular entrenable, por lo que nunca se colorean por intensidad.
export const DECORATIVE_SHAPES: DecorativeShape[] = [
  { id: 'head-front', view: 'front', shape: { kind: 'ellipse', cx: 100, cy: 32, rx: 17, ry: 19 } },
  { id: 'head-back', view: 'back', shape: { kind: 'ellipse', cx: 100, cy: 32, rx: 17, ry: 19 } },
  { id: 'pelvis-front', view: 'front', shape: { kind: 'rect', x: 78, y: 162, width: 44, height: 26, rx: 14 } },
  { id: 'pelvis-back', view: 'back', shape: { kind: 'rect', x: 78, y: 160, width: 44, height: 12, rx: 6 } },
  { id: 'foot-l-front', view: 'front', shape: { kind: 'ellipse', cx: 85, cy: 362, rx: 14, ry: 8 } },
  { id: 'foot-r-front', view: 'front', shape: { kind: 'ellipse', cx: 115, cy: 362, rx: 14, ry: 8 } },
  { id: 'foot-l-back', view: 'back', shape: { kind: 'ellipse', cx: 85, cy: 362, rx: 14, ry: 8 } },
  { id: 'foot-r-back', view: 'back', shape: { kind: 'ellipse', cx: 115, cy: 362, rx: 14, ry: 8 } },
];

export const MUSCLE_REGIONS: MuscleRegion[] = [
  // --- Cuello ---
  { id: 'neck-front', group: 'Cuello', view: 'front', shape: { kind: 'rect', x: 91, y: 48, width: 18, height: 12, rx: 5 } },
  { id: 'neck-back', group: 'Cuello', view: 'back', shape: { kind: 'rect', x: 91, y: 48, width: 18, height: 12, rx: 5 } },

  // --- Hombros (deltoides, visibles en ambas vistas) ---
  { id: 'shoulder-l-front', group: 'Hombros', view: 'front', shape: { kind: 'ellipse', cx: 62, cy: 76, rx: 17, ry: 15 } },
  { id: 'shoulder-r-front', group: 'Hombros', view: 'front', shape: { kind: 'ellipse', cx: 138, cy: 76, rx: 17, ry: 15 } },
  { id: 'shoulder-l-back', group: 'Hombros', view: 'back', shape: { kind: 'ellipse', cx: 62, cy: 76, rx: 17, ry: 15 } },
  { id: 'shoulder-r-back', group: 'Hombros', view: 'back', shape: { kind: 'ellipse', cx: 138, cy: 76, rx: 17, ry: 15 } },

  // --- Pecho (solo frontal) ---
  { id: 'chest', group: 'Pecho', view: 'front', shape: { kind: 'rect', x: 72, y: 68, width: 56, height: 48, rx: 16 } },

  // --- Espalda (solo posterior) ---
  { id: 'back', group: 'Espalda', view: 'back', shape: { kind: 'rect', x: 72, y: 68, width: 56, height: 70, rx: 16 } },

  // --- Abdomen (solo frontal) ---
  { id: 'abs', group: 'Abdomen', view: 'front', shape: { kind: 'rect', x: 80, y: 114, width: 40, height: 54, rx: 14 } },

  // --- Bíceps (solo frontal) ---
  { id: 'bicep-l', group: 'Bíceps', view: 'front', shape: { kind: 'rect', x: 40, y: 82, width: 20, height: 62, rx: 10 } },
  { id: 'bicep-r', group: 'Bíceps', view: 'front', shape: { kind: 'rect', x: 140, y: 82, width: 20, height: 62, rx: 10 } },

  // --- Tríceps (solo posterior) ---
  { id: 'tricep-l', group: 'Tríceps', view: 'back', shape: { kind: 'rect', x: 40, y: 82, width: 20, height: 62, rx: 10 } },
  { id: 'tricep-r', group: 'Tríceps', view: 'back', shape: { kind: 'rect', x: 140, y: 82, width: 20, height: 62, rx: 10 } },

  // --- Antebrazo (visible en ambas vistas) ---
  { id: 'forearm-l-front', group: 'Antebrazo', view: 'front', shape: { kind: 'rect', x: 38, y: 142, width: 18, height: 56, rx: 9 } },
  { id: 'forearm-r-front', group: 'Antebrazo', view: 'front', shape: { kind: 'rect', x: 144, y: 142, width: 18, height: 56, rx: 9 } },
  { id: 'forearm-l-back', group: 'Antebrazo', view: 'back', shape: { kind: 'rect', x: 38, y: 142, width: 18, height: 56, rx: 9 } },
  { id: 'forearm-r-back', group: 'Antebrazo', view: 'back', shape: { kind: 'rect', x: 144, y: 142, width: 18, height: 56, rx: 9 } },

  // --- Cuádriceps (solo frontal) ---
  { id: 'quad-l', group: 'Cuádriceps', view: 'front', shape: { kind: 'rect', x: 72, y: 190, width: 25, height: 90, rx: 13 } },
  { id: 'quad-r', group: 'Cuádriceps', view: 'front', shape: { kind: 'rect', x: 103, y: 190, width: 25, height: 90, rx: 13 } },

  // --- Glúteos (solo posterior) ---
  { id: 'glutes', group: 'Glúteos', view: 'back', shape: { kind: 'rect', x: 76, y: 168, width: 48, height: 40, rx: 18 } },

  // --- Femoral / isquiotibiales (solo posterior) ---
  { id: 'hamstring-l', group: 'Femoral', view: 'back', shape: { kind: 'rect', x: 72, y: 206, width: 25, height: 76, rx: 13 } },
  { id: 'hamstring-r', group: 'Femoral', view: 'back', shape: { kind: 'rect', x: 103, y: 206, width: 25, height: 76, rx: 13 } },

  // --- Gemelos (visibles en ambas vistas) ---
  { id: 'calf-l-front', group: 'Gemelos', view: 'front', shape: { kind: 'rect', x: 74, y: 282, width: 22, height: 70, rx: 11 } },
  { id: 'calf-r-front', group: 'Gemelos', view: 'front', shape: { kind: 'rect', x: 104, y: 282, width: 22, height: 70, rx: 11 } },
  { id: 'calf-l-back', group: 'Gemelos', view: 'back', shape: { kind: 'rect', x: 74, y: 282, width: 22, height: 70, rx: 11 } },
  { id: 'calf-r-back', group: 'Gemelos', view: 'back', shape: { kind: 'rect', x: 104, y: 282, width: 22, height: 70, rx: 11 } },
];
