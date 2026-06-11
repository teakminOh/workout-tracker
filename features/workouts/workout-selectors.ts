import { createSelector } from '@reduxjs/toolkit';

import type { RootState } from '@/store';
import type {
  ProgramExercise,
  WorkoutDayTemplate,
  WorkoutSession,
  WorkoutSet,
  WorkoutState,
} from '@/types/workout';

export type PlannedExercise = {
  programExercise: ProgramExercise;
  exerciseName: string;
  unit: string;
  progressionSuggestion: string;
};

const emptyProgramDays: WorkoutDayTemplate[] = [];
const emptyWorkoutSets: WorkoutSet[] = [];
const emptyPlannedExercises: PlannedExercise[] = [];

const selectExercises = (state: RootState) => state.workout.exercises;
const selectPrograms = (state: RootState) => state.workout.programs;
const selectWorkoutDayTemplates = (state: RootState) => state.workout.workoutDayTemplates;
const selectProgramExercises = (state: RootState) => state.workout.programExercises;
const selectWorkoutSessions = (state: RootState) => state.workout.workoutSessions;
const selectWorkoutSetsById = (state: RootState) => state.workout.workoutSets;
const selectProgressionRules = (state: RootState) => state.workout.progressionRules;
const selectActiveWorkoutSessionId = (state: RootState) => state.workout.activeWorkoutSessionId;

const getProgramDays = (
  workoutDayTemplates: WorkoutState['workoutDayTemplates'],
  programId: string
) =>
  Object.values(workoutDayTemplates)
    .filter((day) => day.programId === programId)
    .sort((a, b) => a.order - b.order);

const getProgramExercisesForDay = (
  programExercises: WorkoutState['programExercises'],
  workoutDayTemplateId: string
) =>
  Object.values(programExercises)
    .filter((programExercise) => programExercise.workoutDayTemplateId === workoutDayTemplateId)
    .sort((a, b) => a.order - b.order);

export const selectActiveProgram = createSelector([selectPrograms], (programs) =>
  Object.values(programs).find((program) => program.isActive) ?? null
);

export const selectActiveProgramDays = createSelector(
  [selectActiveProgram, selectWorkoutDayTemplates],
  (activeProgram, workoutDayTemplates) => {
    if (!activeProgram) {
      return emptyProgramDays;
    }

    return getProgramDays(workoutDayTemplates, activeProgram.id);
  }
);

export const selectActiveWorkoutSession = createSelector(
  [selectActiveWorkoutSessionId, selectWorkoutSessions],
  (activeWorkoutSessionId, workoutSessions) =>
    activeWorkoutSessionId ? workoutSessions[activeWorkoutSessionId] ?? null : null
);

export const selectActiveSessionSets = createSelector(
  [selectActiveWorkoutSession, selectWorkoutSetsById],
  (activeSession, workoutSets) => {
    if (!activeSession) {
      return emptyWorkoutSets;
    }

    return activeSession.setIds
      .map((setId) => workoutSets[setId])
      .filter((set): set is WorkoutSet => Boolean(set));
  }
);

export const selectActiveSessionDay = createSelector(
  [selectActiveWorkoutSession, selectWorkoutDayTemplates],
  (activeSession, workoutDayTemplates) =>
    activeSession?.workoutDayTemplateId
      ? workoutDayTemplates[activeSession.workoutDayTemplateId] ?? null
      : null
);

export const selectActiveSessionPlannedExercises = createSelector(
  [
    selectActiveSessionDay,
    selectProgramExercises,
    selectExercises,
    selectWorkoutSetsById,
    selectWorkoutSessions,
    selectActiveWorkoutSession,
    selectProgressionRules,
  ],
  (
    activeDay,
    programExercises,
    exercises,
    workoutSets,
    workoutSessions,
    activeSession,
    progressionRules
  ): PlannedExercise[] => {
    if (!activeDay) {
      return emptyPlannedExercises;
    }

    const plannedExercises = getProgramExercisesForDay(programExercises, activeDay.id);

    if (plannedExercises.length === 0) {
      return emptyPlannedExercises;
    }

    return plannedExercises.map((programExercise) => {
      const exercise = exercises[programExercise.exerciseId];

      return {
        programExercise,
        exerciseName: exercise?.name ?? 'Exercise',
        unit: exercise?.defaultUnit ?? 'kg',
        progressionSuggestion: getProgressionSuggestion({
          activeSession,
          programExercise,
          progressionRules,
          workoutSessions,
          workoutSets,
        }),
      };
    });
  }
);

export const selectTotalSets = createSelector(
  [selectActiveSessionSets],
  (activeSessionSets) => activeSessionSets.length
);

export const selectTotalVolume = createSelector([selectActiveSessionSets], (activeSessionSets) =>
  activeSessionSets.reduce((total, set) => total + set.reps * set.weight, 0)
);

type ProgressionSuggestionInput = {
  activeSession: WorkoutSession | null;
  programExercise: ProgramExercise;
  progressionRules: WorkoutState['progressionRules'];
  workoutSessions: WorkoutState['workoutSessions'];
  workoutSets: WorkoutState['workoutSets'];
};

const getProgressionSuggestion = ({
  activeSession,
  programExercise,
  progressionRules,
  workoutSessions,
  workoutSets,
}: ProgressionSuggestionInput) => {
  const rule = programExercise.progressionRuleId
    ? progressionRules[programExercise.progressionRuleId]
    : null;
  const relevantSets = getMostRecentSetsForProgramExercise({
    activeSession,
    programExerciseId: programExercise.id,
    workoutSessions,
    workoutSets,
  });
  const baselineWeight = relevantSets[relevantSets.length - 1]?.weight ?? programExercise.targetWeight;

  if (!rule || baselineWeight === undefined) {
    return baselineWeight === undefined ? 'No target yet' : `Repeat ${baselineWeight}kg`;
  }

  const completedTargetSets = relevantSets.slice(-programExercise.targetSets);
  const hitTopReps =
    completedTargetSets.length >= programExercise.targetSets &&
    completedTargetSets.every((set) => set.reps >= rule.repMax);
  const nextWeight = hitTopReps ? baselineWeight + rule.weightIncrement : baselineWeight;

  return hitTopReps ? `Next: ${nextWeight}${rule.unit}` : `Repeat ${nextWeight}${rule.unit}`;
};

type MostRecentSetsInput = {
  activeSession: WorkoutSession | null;
  programExerciseId: string;
  workoutSessions: WorkoutState['workoutSessions'];
  workoutSets: WorkoutState['workoutSets'];
};

const getMostRecentSetsForProgramExercise = ({
  activeSession,
  programExerciseId,
  workoutSessions,
  workoutSets,
}: MostRecentSetsInput) => {
  const activeSets = activeSession
    ? activeSession.setIds
        .map((setId) => workoutSets[setId])
        .filter((set): set is WorkoutSet => set?.programExerciseId === programExerciseId)
    : [];

  if (activeSets.length > 0) {
    return activeSets;
  }

  const latestCompletedSession = Object.values(workoutSessions)
    .filter((session) => session.status === 'completed')
    .sort((a, b) => {
      const aTime = new Date(a.endedAt ?? a.startedAt).getTime();
      const bTime = new Date(b.endedAt ?? b.startedAt).getTime();

      return bTime - aTime;
    })
    .find((session) =>
      session.setIds.some(
        (setId) => workoutSets[setId]?.programExerciseId === programExerciseId
      )
    );

  if (!latestCompletedSession) {
    return [];
  }

  return latestCompletedSession.setIds
    .map((setId) => workoutSets[setId])
    .filter((set): set is WorkoutSet => set?.programExerciseId === programExerciseId);
};
