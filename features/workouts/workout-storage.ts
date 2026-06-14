import AsyncStorage from '@react-native-async-storage/async-storage';

import type { MuscleGroup, WorkoutState } from '@/types/workout';

const workoutStorageKey = 'workout-tracker:workout-state:v1';

// Older persisted exercises stored a single `muscleGroup`; the model now uses
// `muscleGroups: MuscleGroup[]`. Convert on load so existing installs keep working.
function migrateWorkoutState(state: WorkoutState): WorkoutState {
  const exercises = state.exercises ?? {};

  Object.values(exercises).forEach((exercise) => {
    const legacy = exercise as { muscleGroup?: MuscleGroup; muscleGroups?: MuscleGroup[] };

    if (!legacy.muscleGroups && legacy.muscleGroup) {
      legacy.muscleGroups = [legacy.muscleGroup];
    }

    delete legacy.muscleGroup;
  });

  return state;
}

export async function loadWorkoutState() {
  try {
    const rawState = await AsyncStorage.getItem(workoutStorageKey);

    return rawState ? migrateWorkoutState(JSON.parse(rawState) as WorkoutState) : null;
  } catch {
    return null;
  }
}

export async function saveWorkoutState(workoutState: WorkoutState) {
  try {
    await AsyncStorage.setItem(workoutStorageKey, JSON.stringify(workoutState));
  } catch {
    // Storage failures should not block a workout in progress.
  }
}
