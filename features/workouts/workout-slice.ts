import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { initialWorkoutState } from '@/features/workouts/seed-data';
import {
  createId,
  getProgramExerciseFields,
  getVisibleProgramDays,
  getVisibleProgramExercisesForDay,
  hasLoggedSetsForProgramExercise,
  isSameProgramExerciseInput,
} from '@/features/workouts/workout-domain';
import type {
  AddProgramExerciseInput,
  AddSetInput,
  AddWorkoutDayInput,
  ArchiveProgramExerciseInput,
  ArchiveWorkoutDayInput,
  CreateWorkoutProgramExerciseInput,
  CreateWorkoutProgramInput,
  DeleteSetInput,
  ReorderProgramExercisesInput,
  ReorderWorkoutDaysInput,
  StartWorkoutSessionInput,
  UpdateProgramExerciseInput,
  UpdateSetInput,
  UpdateWorkoutDayInput,
  UpdateWorkoutProgramInput,
  WorkoutState,
} from '@/types/workout';

const createProgramExercise = ({
  exerciseInput,
  now,
  order,
  state,
  workoutDayTemplateId,
}: {
  exerciseInput: CreateWorkoutProgramExerciseInput;
  now: string;
  order: number;
  state: WorkoutState;
  workoutDayTemplateId: string;
}) => {
  const day = state.workoutDayTemplates[workoutDayTemplateId];
  const exerciseId = createId('exercise');
  const programExerciseId = createId('program-exercise');

  state.exercises[exerciseId] = {
    id: exerciseId,
    name: exerciseInput.name.trim(),
    category: 'other',
    defaultUnit: exerciseInput.unit,
    createdAt: now,
    updatedAt: now,
  };
  state.programExercises[programExerciseId] = getProgramExerciseFields({
    exerciseId,
    exerciseInput,
    id: programExerciseId,
    order,
    workoutDayTemplateId,
  });
  day?.exerciseIds.push(exerciseId);

  return programExerciseId;
};

const renumberProgramExercises = (
  state: WorkoutState,
  workoutDayTemplateId: string,
  orderedProgramExerciseIds?: string[]
) => {
  const visibleExercises = getVisibleProgramExercisesForDay(state, workoutDayTemplateId);
  const orderedIds = orderedProgramExerciseIds ?? visibleExercises.map((exercise) => exercise.id);

  orderedIds.forEach((programExerciseId, index) => {
    const programExercise = state.programExercises[programExerciseId];

    if (
      programExercise &&
      programExercise.workoutDayTemplateId === workoutDayTemplateId &&
      !programExercise.isArchived
    ) {
      programExercise.order = index + 1;
    }
  });
};

export const workoutSlice = createSlice({
  name: 'workout',
  initialState: initialWorkoutState,
  reducers: {
    hydrateWorkoutState(_state, action: PayloadAction<WorkoutState>) {
      return {
        ...initialWorkoutState,
        ...action.payload,
        exercises: {
          ...initialWorkoutState.exercises,
          ...action.payload.exercises,
        },
        progressionRules: {
          ...initialWorkoutState.progressionRules,
          ...action.payload.progressionRules,
        },
        activeWorkoutSessionId: action.payload.activeWorkoutSessionId ?? null,
      };
    },
    createWorkoutProgram(state, action: PayloadAction<CreateWorkoutProgramInput>) {
      const now = new Date().toISOString();
      const programId = createId('program');
      const dayIds: string[] = [];

      state.programs[programId] = {
        id: programId,
        name: action.payload.name.trim(),
        dayIds,
        isActive: false,
        startDate: now,
        createdAt: now,
        updatedAt: now,
      };

      action.payload.days.forEach((dayInput, dayIndex) => {
        const dayId = createId('day');
        const exerciseIds: string[] = [];

        dayIds.push(dayId);
        state.workoutDayTemplates[dayId] = {
          id: dayId,
          programId,
          name: dayInput.name.trim() || `Day ${dayIndex + 1}`,
          order: dayIndex + 1,
          exerciseIds,
          createdAt: now,
          updatedAt: now,
        };

        dayInput.exercises.forEach((exerciseInput, exerciseIndex) => {
          createProgramExercise({
            exerciseInput,
            now,
            order: exerciseIndex + 1,
            state,
            workoutDayTemplateId: dayId,
          });
        });
      });
    },
    updateWorkoutProgram(state, action: PayloadAction<UpdateWorkoutProgramInput>) {
      const program = state.programs[action.payload.programId];

      if (!program) {
        return;
      }

      program.name = action.payload.name.trim();
      program.updatedAt = new Date().toISOString();
    },
    addWorkoutDay(state, action: PayloadAction<AddWorkoutDayInput>) {
      const program = state.programs[action.payload.programId];

      if (!program) {
        return;
      }

      const now = new Date().toISOString();
      const dayId = createId('day');
      const visibleDays = getVisibleProgramDays(state, program.id);
      const insertAfterIndex =
        action.payload.insertAfterWorkoutDayTemplateId === null ||
        action.payload.insertAfterWorkoutDayTemplateId === undefined
          ? -1
          : visibleDays.findIndex(
              (day) => day.id === action.payload.insertAfterWorkoutDayTemplateId
            );
      const insertIndex = Math.max(0, insertAfterIndex + 1);

      program.dayIds.push(dayId);
      program.updatedAt = now;
      state.workoutDayTemplates[dayId] = {
        id: dayId,
        programId: program.id,
        name: action.payload.name?.trim() || `Day ${visibleDays.length + 1}`,
        order: insertIndex + 1,
        exerciseIds: [],
        createdAt: now,
        updatedAt: now,
      };

      // Splice the new day into position and resequence every visible day's order.
      const orderedDayIds = visibleDays.map((day) => day.id);
      orderedDayIds.splice(insertIndex, 0, dayId);
      orderedDayIds.forEach((id, index) => {
        const day = state.workoutDayTemplates[id];

        if (day) {
          day.order = index + 1;
        }
      });
    },
    updateWorkoutDay(state, action: PayloadAction<UpdateWorkoutDayInput>) {
      const day = state.workoutDayTemplates[action.payload.workoutDayTemplateId];

      if (!day) {
        return;
      }

      const now = new Date().toISOString();
      day.name = action.payload.name.trim();
      day.updatedAt = now;
      state.programs[day.programId].updatedAt = now;
    },
    archiveWorkoutDay(state, action: PayloadAction<ArchiveWorkoutDayInput>) {
      const day = state.workoutDayTemplates[action.payload.workoutDayTemplateId];

      if (!day || day.isArchived) {
        return;
      }

      const now = new Date().toISOString();
      day.isArchived = true;
      day.archivedAt = now;
      day.updatedAt = now;
      state.programs[day.programId].updatedAt = now;

      getVisibleProgramDays(state, day.programId).forEach((programDay, index) => {
        programDay.order = index + 1;
      });
    },
    reorderWorkoutDays(state, action: PayloadAction<ReorderWorkoutDaysInput>) {
      const program = state.programs[action.payload.programId];

      if (!program) {
        return;
      }

      const visibleIds = getVisibleProgramDays(state, program.id).map((day) => day.id);
      const requestedIds = action.payload.workoutDayTemplateIds.filter((dayId) =>
        visibleIds.includes(dayId)
      );

      if (requestedIds.length !== visibleIds.length) {
        return;
      }

      const archivedIds = program.dayIds.filter((dayId) => !requestedIds.includes(dayId));
      program.dayIds = [...requestedIds, ...archivedIds];
      program.updatedAt = new Date().toISOString();
      requestedIds.forEach((dayId, index) => {
        const day = state.workoutDayTemplates[dayId];

        if (day) {
          day.order = index + 1;
        }
      });
    },
    addProgramExercise(state, action: PayloadAction<AddProgramExerciseInput>) {
      const day = state.workoutDayTemplates[action.payload.workoutDayTemplateId];

      if (!day || day.isArchived) {
        return;
      }

      const now = new Date().toISOString();
      const visibleExercises = getVisibleProgramExercisesForDay(state, day.id);
      const insertAfterIndex =
        action.payload.insertAfterProgramExerciseId === null ||
        action.payload.insertAfterProgramExerciseId === undefined
          ? -1
          : visibleExercises.findIndex(
              (exercise) => exercise.id === action.payload.insertAfterProgramExerciseId
            );
      const insertIndex = Math.max(0, insertAfterIndex + 1);
      const programExerciseId = createProgramExercise({
        exerciseInput: action.payload.exercise,
        now,
        order: insertIndex + 1,
        state,
        workoutDayTemplateId: day.id,
      });
      const orderedIds = visibleExercises.map((exercise) => exercise.id);

      orderedIds.splice(insertIndex, 0, programExerciseId);
      renumberProgramExercises(state, day.id, orderedIds);
      day.updatedAt = now;
      state.programs[day.programId].updatedAt = now;
    },
    updateProgramExercise(state, action: PayloadAction<UpdateProgramExerciseInput>) {
      const programExercise = state.programExercises[action.payload.programExerciseId];

      if (!programExercise || programExercise.isArchived) {
        return;
      }

      if (isSameProgramExerciseInput(state, programExercise, action.payload.exercise)) {
        return;
      }

      const now = new Date().toISOString();
      const day = state.workoutDayTemplates[programExercise.workoutDayTemplateId];
      const hasHistory = hasLoggedSetsForProgramExercise(state, programExercise.id);

      if (hasHistory) {
        const visibleExerciseIds = getVisibleProgramExercisesForDay(
          state,
          programExercise.workoutDayTemplateId
        ).map((exercise) => exercise.id);
        const newIndex = Math.max(0, visibleExerciseIds.indexOf(programExercise.id));

        programExercise.isArchived = true;
        programExercise.archivedAt = now;
        const newProgramExerciseId = createProgramExercise({
          exerciseInput: action.payload.exercise,
          now,
          order: programExercise.order,
          state,
          workoutDayTemplateId: programExercise.workoutDayTemplateId,
        });
        const nextOrder = visibleExerciseIds.map((exerciseId) =>
          exerciseId === programExercise.id ? newProgramExerciseId : exerciseId
        );

        if (!nextOrder.includes(newProgramExerciseId)) {
          nextOrder.splice(newIndex, 0, newProgramExerciseId);
        }

        renumberProgramExercises(state, programExercise.workoutDayTemplateId, nextOrder);
      } else {
        const exercise = state.exercises[programExercise.exerciseId];

        if (exercise) {
          exercise.name = action.payload.exercise.name.trim();
          exercise.defaultUnit = action.payload.exercise.unit;
          exercise.updatedAt = now;
        }

        state.programExercises[programExercise.id] = {
          ...getProgramExerciseFields({
            exerciseId: programExercise.exerciseId,
            exerciseInput: action.payload.exercise,
            id: programExercise.id,
            order: programExercise.order,
            workoutDayTemplateId: programExercise.workoutDayTemplateId,
          }),
          archivedAt: programExercise.archivedAt,
          isArchived: programExercise.isArchived,
        };
      }

      if (day) {
        day.updatedAt = now;
        state.programs[day.programId].updatedAt = now;
      }
    },
    archiveProgramExercise(state, action: PayloadAction<ArchiveProgramExerciseInput>) {
      const programExercise = state.programExercises[action.payload.programExerciseId];

      if (!programExercise || programExercise.isArchived) {
        return;
      }

      const now = new Date().toISOString();
      const day = state.workoutDayTemplates[programExercise.workoutDayTemplateId];

      programExercise.isArchived = true;
      programExercise.archivedAt = now;
      renumberProgramExercises(state, programExercise.workoutDayTemplateId);

      if (day) {
        day.updatedAt = now;
        state.programs[day.programId].updatedAt = now;
      }
    },
    reorderProgramExercises(state, action: PayloadAction<ReorderProgramExercisesInput>) {
      const visibleExerciseIds = getVisibleProgramExercisesForDay(
        state,
        action.payload.workoutDayTemplateId
      ).map((exercise) => exercise.id);
      const requestedIds = action.payload.programExerciseIds.filter((programExerciseId) =>
        visibleExerciseIds.includes(programExerciseId)
      );

      if (requestedIds.length !== visibleExerciseIds.length) {
        return;
      }

      renumberProgramExercises(state, action.payload.workoutDayTemplateId, requestedIds);
      const day = state.workoutDayTemplates[action.payload.workoutDayTemplateId];

      if (day) {
        const now = new Date().toISOString();

        day.updatedAt = now;
        state.programs[day.programId].updatedAt = now;
      }
    },
    startWorkoutSession(state, action: PayloadAction<StartWorkoutSessionInput>) {
      const currentActiveSession = state.activeWorkoutSessionId
        ? state.workoutSessions[state.activeWorkoutSessionId]
        : null;
      const program = state.programs[action.payload.programId];
      const workoutDayTemplate = state.workoutDayTemplates[action.payload.workoutDayTemplateId];

      if (currentActiveSession?.status === 'active' || !program || !workoutDayTemplate) {
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
        weight: action.payload.weight,
        unit: exercise.defaultUnit,
        powerQuality: action.payload.powerQuality,
        completedAt: new Date().toISOString(),
        notes: action.payload.notes,
      };
      if (action.payload.durationSeconds !== undefined) {
        state.workoutSets[setId].durationSeconds = action.payload.durationSeconds;
      } else {
        state.workoutSets[setId].reps = action.payload.reps;
      }
      activeSession.setIds.push(setId);
    },
    updateSet(state, action: PayloadAction<UpdateSetInput>) {
      const activeSession = state.activeWorkoutSessionId
        ? state.workoutSessions[state.activeWorkoutSessionId]
        : null;

      if (!activeSession || !activeSession.setIds.includes(action.payload.setId)) {
        return;
      }

      const set = state.workoutSets[action.payload.setId];

      if (!set) {
        return;
      }

      if (action.payload.durationSeconds !== undefined) {
        set.durationSeconds = action.payload.durationSeconds;
        delete set.reps;
      } else {
        set.reps = action.payload.reps;
        delete set.durationSeconds;
      }
      set.weight = action.payload.weight;
      set.powerQuality = action.payload.powerQuality;
    },
    deleteSet(state, action: PayloadAction<DeleteSetInput>) {
      const activeSession = state.activeWorkoutSessionId
        ? state.workoutSessions[state.activeWorkoutSessionId]
        : null;

      if (!activeSession || !activeSession.setIds.includes(action.payload.setId)) {
        return;
      }

      delete state.workoutSets[action.payload.setId];
      activeSession.setIds = activeSession.setIds.filter((setId) => setId !== action.payload.setId);

      const setCounts: Record<string, number> = {};

      activeSession.setIds.forEach((setId) => {
        const set = state.workoutSets[setId];

        if (!set) {
          return;
        }

        const setGroupId = set.programExerciseId ?? set.exerciseId;

        setCounts[setGroupId] = (setCounts[setGroupId] ?? 0) + 1;
        set.setNumber = setCounts[setGroupId];
      });
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
    restoreWorkoutState(_state, action: PayloadAction<WorkoutState>) {
      // Replace the whole slice with a previously captured snapshot. Used to
      // discard in-editor changes back to how the program was when opened.
      return action.payload;
    },
  },
});

export const {
  addProgramExercise,
  addSet,
  addWorkoutDay,
  archiveProgramExercise,
  archiveWorkoutDay,
  clearCurrentWorkout,
  createWorkoutProgram,
  deleteSet,
  finishCurrentWorkout,
  hydrateWorkoutState,
  reorderProgramExercises,
  reorderWorkoutDays,
  restoreWorkoutState,
  startWorkoutSession,
  updateProgramExercise,
  updateSet,
  updateWorkoutDay,
  updateWorkoutProgram,
} =
  workoutSlice.actions;

export default workoutSlice.reducer;
