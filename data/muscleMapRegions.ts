// Contrato de grupos musculares de la app.
//
// Esta lista es la fuente de verdad de los nombres: `data/exercises.js` los repite en el campo
// `muscle` de cada ejercicio y `data/translations.js` los usa como claves, así que un nombre
// cambiado aquí y no allí rompe el recuento por grupo en silencio.
//
// La geometría vivía también en este archivo, como rectángulos y elipses de un cuerpo esquemático.
// Ahora el mapa se dibuja con la silueta anatómica real y esos datos se han movido a
// `data/muscleMapPaths.ts`, vectorizado de `public/MUSCLE MAP REFERENCE.png`.
//
// Los doce grupos tienen región dibujable en el cuerpo. 'Cuello' no la tenía con la lámina anterior
// y sólo contaba en 'Series por grupo'; la actual sí lo dibuja, así que ya es clicable como el resto.

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
