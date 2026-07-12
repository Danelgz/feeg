// lib/exerciseTranslation.js
//
// Traduce el NOMBRE de un ejercicio, separado a propósito del diccionario general de
// data/translations.js (que usa t()). Antes, varias pantallas hacían t(exercise.name)
// directamente: como t() cae al propio string si no encuentra la key, un ejercicio
// personalizado creado por el usuario (p.ej. llamado "Series" o "Volumen") podía coincidir
// por accidente con una key genérica de la UI y mostrarse traducido/incorrecto. Aquí solo se
// traduce si el nombre pertenece al catálogo predefinido — los ejercicios personalizados
// siempre se devuelven tal cual.
import { exercisesList } from "../data/exercises";
import { exerciseNameTranslations } from "../data/exerciseTranslations";

const PREDEFINED_EXERCISE_NAMES = new Set(
  Object.values(exercisesList).flatMap((list) => list.map((e) => e.name))
);

export function translateExerciseName(name, language) {
  if (!name || !PREDEFINED_EXERCISE_NAMES.has(name)) return name;
  return exerciseNameTranslations[language]?.[name] || name;
}
