import type {
    CreateWorkoutProgramExerciseInput,
    ExerciseTrackingMode,
    ProgramExercise,
    TrainingGoal,
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
  exerciseInput,
  id,
  order,
  trackingMode,
  trainingGoal,
  workoutDayTemplateId,
}: {
  exerciseInput: CreateWorkoutProgramExerciseInput;
  id: string;
  order: number;
  trackingMode: ExerciseTrackingMode;
  trainingGoal: TrainingGoal;
  workoutDayTemplateId: string;
}): ProgramExercise => ({
  id,
  workoutDayTemplateId,
  exerciseId: exerciseInput.exerciseId,
  order,
  targetSets: exerciseInput.targetSets,
  trackingMode,
  targetRepMin: trackingMode === 'reps' ? exerciseInput.targetRepMin : undefined,
  targetRepMax: trackingMode === 'reps' ? exerciseInput.targetRepMax : undefined,
  targetSecondsMin: trackingMode === 'time' ? exerciseInput.targetSecondsMin : undefined,
  targetSecondsMax: trackingMode === 'time' ? exerciseInput.targetSecondsMax : undefined,
  trainingGoal,
  targetWeight: exerciseInput.targetWeight,
});

export const isSameProgramExerciseInput = (
  state: WorkoutState,
  programExercise: ProgramExercise,
  exerciseInput: CreateWorkoutProgramExerciseInput
) => {
  const exercise = state.exercises[exerciseInput.exerciseId];
  const trackingMode = exercise?.trackingMode ?? 'reps';

  return (
    programExercise.exerciseId === exerciseInput.exerciseId &&
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