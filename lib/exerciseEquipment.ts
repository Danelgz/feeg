// lib/exerciseEquipment.ts
//
// Resuelve el `equipment` de un ejercicio predefinido a partir de su nombre (mismo patrón de
// lookup por nombre que lib/exerciseTranslation.js). No se persiste en rutinas/historial —
// se recalcula en cada render, así que sigue funcionando aunque cambie el catálogo o el usuario
// esté viendo un entreno completado antiguo. Los ejercicios personalizados no tienen `equipment`
// y devuelven undefined — ExerciseThumb simplemente no muestra el badge en ese caso.
import { exercisesList } from "../data/exercises";

const EQUIPMENT_BY_NAME: Record<string, string> = {};
Object.values(exercisesList).forEach((list) => {
  list.forEach((ex) => {
    if (ex.equipment) EQUIPMENT_BY_NAME[ex.name] = ex.equipment;
  });
});

export function equipmentForExercise(name?: string): string | undefined {
  if (!name) return undefined;
  return EQUIPMENT_BY_NAME[name];
}
