import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { initialWorkoutState } from '@/features/workouts/seed-data';
import type {
  AddSetInput,
  StartWorkoutSessionInput,
  WorkoutState,
} from '@/types/workout';

const createId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const workoutSlice = createSlice({
  name: 'workout',
  initialState: initialWorkoutState,
  reducers: {
    startWorkoutSession(state, action: PayloadAction<StartWorkoutSessionInput>) {
      const program = state.programs[action.payload.programId];
      const workoutDayTemplate = state.workoutDayTemplates[action.payload.workoutDayTemplateId];

      if (!program || !workoutDayTemplate) {
        return;
      }

      const sessionId = createId('session');

      state.workoutSessions[sessionId] = {
        id: sessionId,
        programId: program.id,
        workoutDayTemplateId: workoutDayTemplate.id,
        name: workoutDayTemplate.name,
        startedAt: new Date().toISOString(),
        setIds: [],
        status: 'active',
      };
      state.activeWorkoutSessionId = sessionId;
    },
    addSet(state, action: PayloadAction<AddSetInput>) {
      const activeSession = state.activeWorkoutSessionId
        ? state.workoutSessions[state.activeWorkoutSessionId]
        : null;
      const exercise = state.exercises[action.payload.exerciseId];

      if (!activeSession || !exercise) {
        return;
      }

      const matchingSetCount = activeSession.setIds.filter((setId) => {
        const set = state.workoutSets[setId];

        return action.payload.programExerciseId
          ? set?.programExerciseId === action.payload.programExerciseId
          : set?.exerciseId === action.payload.exerciseId;
      }).length;
      const setId = createId('set');

      state.workoutSets[setId] = {
        id: setId,
        workoutSessionId: activeSession.id,
        exerciseId: action.payload.exerciseId,
        programExerciseId: action.payload.programExerciseId,
        setNumber: matchingSetCount + 1,
        reps: action.payload.reps,
        weight: action.payload.weight,
        unit: exercise.defaultUnit,
        completedAt: new Date().toISOString(),
        notes: action.payload.notes,
      };
      activeSession.setIds.push(setId);
    },
    clearCurrentWorkout(state) {
      if (state.activeWorkoutSessionId) {
        const activeSession = state.workoutSessions[state.activeWorkoutSessionId];

        if (activeSession) {
          activeSession.status = 'discarded';
          activeSession.endedAt = new Date().toISOString();
        }
      }

      state.activeWorkoutSessionId = null;
    },
    finishCurrentWorkout(state) {
      if (!state.activeWorkoutSessionId) {
        return;
      }

      const activeSession = state.workoutSessions[state.activeWorkoutSessionId];

      if (!activeSession) {
        state.activeWorkoutSessionId = null;
        return;
      }

      activeSession.status = 'completed';
      activeSession.endedAt = new Date().toISOString();
      state.activeWorkoutSessionId = null;
    },
  },
});

export const { addSet, clearCurrentWorkout, finishCurrentWorkout, startWorkoutSession } =
  workoutSlice.actions;

export default workoutSlice.reducer;
