import { configureStore } from '@reduxjs/toolkit';

import workoutReducer, { hydrateWorkoutState } from '@/features/workouts/workout-slice';
import { loadWorkoutState, saveWorkoutState } from '@/features/workouts/workout-storage';

export const store = configureStore({
  reducer: {
    workout: workoutReducer,
  },
});

let hasHydratedWorkoutState = false;

export async function hydrateWorkoutStore() {
  const persistedWorkoutState = await loadWorkoutState();

  if (persistedWorkoutState) {
    store.dispatch(hydrateWorkoutState(persistedWorkoutState));
  }

  hasHydratedWorkoutState = true;
}

store.subscribe(() => {
  if (!hasHydratedWorkoutState) {
    return;
  }

  void saveWorkoutState(store.getState().workout);
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
