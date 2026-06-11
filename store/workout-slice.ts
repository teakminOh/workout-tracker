import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type {
  ActiveWorkout,
  AddSetInput,
  StartWorkoutInput,
  WorkoutSet,
  WorkoutState,
} from '@/types/workout';

const createId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const initialState: WorkoutState = {
  currentWorkout: null,
};

export const workoutSlice = createSlice({
  name: 'workout',
  initialState,
  reducers: {
    startWorkout: {
      reducer(state, action: PayloadAction<ActiveWorkout>) {
        state.currentWorkout = action.payload;
      },
      prepare(input?: StartWorkoutInput) {
        const startedAt = new Date().toISOString();

        return {
          payload: {
            id: createId('workout'),
            name: input?.name?.trim() || 'Workout',
            startedAt,
            sets: [],
          },
        };
      },
    },
    addSet: {
      reducer(state, action: PayloadAction<WorkoutSet>) {
        state.currentWorkout?.sets.push(action.payload);
      },
      prepare(input: AddSetInput) {
        return {
          payload: {
            id: createId('set'),
            exerciseName: input.exerciseName.trim() || 'Exercise',
            reps: input.reps,
            weight: input.weight,
            createdAt: new Date().toISOString(),
          },
        };
      },
    },
    clearCurrentWorkout(state) {
      state.currentWorkout = null;
    },
  },
});

export const { addSet, clearCurrentWorkout, startWorkout } = workoutSlice.actions;

export default workoutSlice.reducer;
