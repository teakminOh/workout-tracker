import type { RootState } from '@/store';

export const selectCurrentWorkout = (state: RootState) => state.workout.currentWorkout;

export const selectTotalSets = (state: RootState) =>
  selectCurrentWorkout(state)?.sets.length ?? 0;

export const selectTotalVolume = (state: RootState) =>
  selectCurrentWorkout(state)?.sets.reduce((total, set) => total + set.reps * set.weight, 0) ?? 0;
