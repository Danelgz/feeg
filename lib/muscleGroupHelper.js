import { exercisesList } from '../data/exercises';

export const createExerciseToMuscleMap = () => {
  const map = {};
  for (const [muscleGroup, exercises] of Object.entries(exercisesList)) {
    exercises.forEach(exercise => {
      map[exercise.id] = muscleGroup;
    });
  }
  return map;
};

export const calculateMuscleGroupPercentages = (routine) => {
  if (!routine || !routine.exercises || routine.exercises.length === 0) {
    return {};
  }

  const exerciseMap = createExerciseToMuscleMap();
  const muscleGroupCount = {};

  routine.exercises.forEach(ex => {
    const muscleGroup = exerciseMap[ex.id] || 'Otro';
    muscleGroupCount[muscleGroup] = (muscleGroupCount[muscleGroup] || 0) + 1;
  });

  const total = routine.exercises.length;
  const percentages = {};

  for (const [group, count] of Object.entries(muscleGroupCount)) {
    percentages[group] = Math.round((count / total) * 100);
  }

  return percentages;
};

export const getMuscleGroupsForWorkout = (workout) => {
  if (!workout || !workout.exerciseDetails || workout.exerciseDetails.length === 0) {
    return {};
  }

  const exerciseMap = createExerciseToMuscleMap();
  const muscleGroupCount = {};

  workout.exerciseDetails.forEach(ex => {
    const exerciseId = ex.id;
    const muscleGroup = exerciseMap[exerciseId] || 'Otro';
    muscleGroupCount[muscleGroup] = (muscleGroupCount[muscleGroup] || 0) + 1;
  });

  const total = workout.exerciseDetails.length;
  const percentages = {};

  for (const [group, count] of Object.entries(muscleGroupCount)) {
    percentages[group] = Math.round((count / total) * 100);
  }

  return percentages;
};

export const getMuscleGroupColor = (muscleGroup) => {
  const colors = {
    'Pecho': '#FF6B6B',
    'Espalda': '#4ECDC4',
    'Hombros': '#45B7D1',
    'Bíceps': '#FFA07A',
    'Tríceps': '#98D8C8',
    'Cuádriceps': '#F7DC6F',
    'Femoral': '#BB8FCE',
    'Glúteos': '#F8B88B',
    'Gemelos': '#85C1E2',
    'Abdomen': '#F5A962',
    'Cuello': '#A3D5A3',
    'Antebrazos': '#E8A87C',
    'Aductor': '#C2E59C',
    'Abductor': '#DCEDC8',
    'Antebrazo': '#FFCC80',
    'Cardio': '#EF5350',
    'Cuerpo Completo': '#9575CD',
    'Otro': '#BDBDBD'
  };
  return colors[muscleGroup] || '#BDBDBD';
};
