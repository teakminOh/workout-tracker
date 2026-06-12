import type {
    CreateWorkoutProgramExerciseInput,
    ProgramExercise,
    WorkoutState,
} from '@/types/workout';

export const createId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const getVisibleProgramExercisesForDay = (
  state: WorkoutState,
  workoutDayTemplateId: string
) =>
  Object.values(state.programExercises)
    .filter(
      (programExercise) =>
        programExercise.workoutDayTemplateId === workoutDayTemplateId &&
        !programExercise.isArchived
    )
    .sort((a, b) => a.order - b.order);

export const getVisibleProgramDays = (state: WorkoutState, programId: string) =>
  Object.values(state.workoutDayTemplates)
    .filter((day) => day.programId === programId && !day.isArchived)
    .sort((a, b) => a.order - b.order);

export const hasLoggedSetsForProgramExercise = (
  state: WorkoutState,
  programExerciseId: string
) => Object.values(state.workoutSets).some((set) => set.programExerciseId === programExerciseId);

export const getProgramExerciseFields = ({
  exerciseId,
  exerciseInput,
  id,
  order,
  workoutDayTemplateId,
}: {
  exerciseId: string;
  exerciseInput: CreateWorkoutProgramExerciseInput;
  id: string;
  order: number;
  workoutDayTemplateId: string;
}): ProgramExercise => {
  const trackingMode = exerciseInput.trackingMode ?? 'reps';

  return {
    id,
    workoutDayTemplateId,
    exerciseId,
    order,
    targetSets: exerciseInput.targetSets,
    trackingMode,
    targetRepMin: trackingMode === 'reps' ? exerciseInput.targetRepMin : undefined,
    targetRepMax: trackingMode === 'reps' ? exerciseInput.targetRepMax : undefined,
    targetSecondsMin: trackingMode === 'time' ? exerciseInput.targetSecondsMin : undefined,
    targetSecondsMax: trackingMode === 'time' ? exerciseInput.targetSecondsMax : undefined,
    trainingGoal: exerciseInput.trainingGoal,
    targetWeight: exerciseInput.targetWeight,
  };
};

export const isSameProgramExerciseInput = (
  state: WorkoutState,
  programExercise: ProgramExercise,
  exerciseInput: CreateWorkoutProgramExerciseInput
) => {
  const exercise = state.exercises[programExercise.exerciseId];
  const trackingMode = exerciseInput.trackingMode ?? 'reps';

  return (
    exercise?.name === exerciseInput.name.trim() &&
    exercise?.defaultUnit === exerciseInput.unit &&
    programExercise.trainingGoal === exerciseInput.trainingGoal &&
    (programExercise.trackingMode ?? 'reps') === trackingMode &&
    programExercise.targetSets === exerciseInput.targetSets &&
    programExercise.targetWeight === exerciseInput.targetWeight &&
    programExercise.targetRepMin ===
      (trackingMode === 'reps' ? exerciseInput.targetRepMin : undefined) &&
    programExercise.targetRepMax ===
      (trackingMode === 'reps' ? exerciseInput.targetRepMax : undefined) &&
    programExercise.targetSecondsMin ===
      (trackingMode === 'time' ? exerciseInput.targetSecondsMin : undefined) &&
    programExercise.targetSecondsMax ===
      (trackingMode === 'time' ? exerciseInput.targetSecondsMax : undefined)
  );
};