import AsyncStorage from '@react-native-async-storage/async-storage';

import type { WorkoutState } from '@/types/workout';

const workoutStorageKey = 'workout-tracker:workout-state:v1';

export async function loadWorkoutState() {
  try {
    const rawState = await AsyncStorage.getItem(workoutStorageKey);

    return rawState ? (JSON.parse(rawState) as WorkoutState) : null;
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
