import type {
    CreateWorkoutProgramDayInput,
    CreateWorkoutProgramExerciseInput,
    CreateWorkoutProgramInput,
    Exercise,
    ExerciseTrackingMode,
    ProgramExercise,
    TrainingGoal,
    WeightUnit,
} from '@/types/workout';
import { parseWorkoutNumberInput } from '@/utils/workout-formatters';

export type WorkoutProgramExerciseDraft = {
  id: string;
  /** Empty until an exercise is picked from the library. */
  exerciseId: string;
  exerciseName: string;
  unit: WeightUnit;
  trainingGoal: TrainingGoal;
  trackingMode: ExerciseTrackingMode;
  targetSets: string;
  targetMin: string;
  targetMax: string;
  targetWeight: string;
};

export type WorkoutProgramDayDraft = {
  id: string;
  name: string;
  exercises: WorkoutProgramExerciseDraft[];
};

const repsDefaultsByGoal: Record<TrainingGoal, { max: string; min: string; sets: string }> = {
  hypertrophy: { max: '12', min: '8', sets: '3' },
  power: { max: '3', min: '2', sets: '4' },
  strength: { max: '5', min: '3', sets: '3' },
  untracked: { max: '12', min: '8', sets: '3' },
};

const createWorkoutProgramDraftId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const parsePositiveNumber = (value: string) => {
  const parsedValue = parseWorkoutNumberInput(value);

  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : null;
};

const parseNonNegativeNumber = (value: string) => {
  if (value.trim().length === 0) {
    return 0;
  }

  const parsedValue = parseWorkoutNumberInput(value);

  return Number.isFinite(parsedValue) && parsedValue >= 0 ? parsedValue : null;
};

export const createWorkoutProgramDraftExercise = (): WorkoutProgramExerciseDraft => ({
  id: createWorkoutProgramDraftId('draft-exercise'),
  exerciseId: '',
  exerciseName: '',
  unit: 'kg',
  trainingGoal: 'strength',
  trackingMode: 'reps',
  targetSets: '3',
  targetMin: '3',
  targetMax: '5',
  targetWeight: '',
});

/** Apply a picked library exercise to a draft: copy its context + seed target defaults. */
export const applyExerciseToDraft = (
  draft: WorkoutProgramExerciseDraft,
  exercise: Exercise
): WorkoutProgramExerciseDraft => {
  const trainingGoal = exercise.trainingGoal ?? 'strength';
  const trackingMode = exercise.trackingMode ?? 'reps';
  const base: WorkoutProgramExerciseDraft = {
    ...draft,
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    unit: exercise.defaultUnit,
    trainingGoal,
    trackingMode,
  };

  if (trackingMode === 'time') {
    return {
      ...base,
      targetSets: '3',
      targetMin: '30',
      targetMax: '60',
      targetWeight: base.targetWeight || '0',
    };
  }

  const defaults = repsDefaultsByGoal[trainingGoal];

  return { ...base, targetSets: defaults.sets, targetMin: defaults.min, targetMax: defaults.max };
};

export const createWorkoutProgramDraftDay = (index: number): WorkoutProgramDayDraft => ({
  id: createWorkoutProgramDraftId('draft-day'),
  name: `Day ${index + 1}`,
  exercises: [createWorkoutProgramDraftExercise()],
});

export const getUpdatedWorkoutProgramExerciseDraft = (
  draft: WorkoutProgramExerciseDraft,
  updates: Partial<WorkoutProgramExerciseDraft>
): WorkoutProgramExerciseDraft => ({ ...draft, ...updates });

export const getWorkoutProgramExerciseDraft = ({
  exerciseName,
  programExercise,
  unit,
}: {
  exerciseName: string;
  programExercise: ProgramExercise;
  unit: WeightUnit;
}): WorkoutProgramExerciseDraft => ({
  id: createWorkoutProgramDraftId('program-exercise-draft'),
  exerciseId: programExercise.exerciseId,
  exerciseName,
  unit,
  trainingGoal: programExercise.trainingGoal ?? 'strength',
  trackingMode: programExercise.trackingMode ?? 'reps',
  targetSets: programExercise.targetSets.toString(),
  targetMin:
    programExercise.trackingMode === 'time'
      ? (programExercise.targetSecondsMin ?? 30).toString()
      : (programExercise.targetRepMin ?? 1).toString(),
  targetMax:
    programExercise.trackingMode === 'time'
      ? (programExercise.targetSecondsMax ?? 60).toString()
      : (programExercise.targetRepMax ?? programExercise.targetRepMin ?? 1).toString(),
  targetWeight: programExercise.targetWeight?.toString() ?? '',
});

export const parseWorkoutProgramExerciseDraft = (
  draft: WorkoutProgramExerciseDraft
): CreateWorkoutProgramExerciseInput | null => {
  const targetSets = parsePositiveNumber(draft.targetSets);
  const targetMin = parsePositiveNumber(draft.targetMin);
  const targetMax = parsePositiveNumber(draft.targetMax);
  const targetWeight = parseNonNegativeNumber(draft.targetWeight);

  if (
    !draft.exerciseId ||
    targetSets === null ||
    targetMin === null ||
    targetMax === null ||
    targetWeight === null ||
    targetMax < targetMin
  ) {
    return null;
  }

  return {
    exerciseId: draft.exerciseId,
    targetSets: Math.round(targetSets),
    targetWeight,
    ...(draft.trackingMode === 'time'
      ? {
          targetSecondsMin: Math.round(targetMin),
          targetSecondsMax: Math.round(targetMax),
        }
      : {
          targetRepMin: Math.round(targetMin),
          targetRepMax: Math.round(targetMax),
        }),
  };
};

export const parseWorkoutProgramDraft = (
  programName: string,
  days: WorkoutProgramDayDraft[]
): CreateWorkoutProgramInput | null => {
  const trimmedProgramName = programName.trim();

  if (!trimmedProgramName || days.length === 0) {
    return null;
  }

  const parsedDays: (CreateWorkoutProgramDayInput | null)[] = days.map((day, dayIndex) => {
    const parsedExercises: (CreateWorkoutProgramExerciseInput | null)[] = day.exercises.map(
      (exercise) => parseWorkoutProgramExerciseDraft(exercise)
    );
    const validExercises = parsedExercises.filter(
      (exercise): exercise is CreateWorkoutProgramExerciseInput => exercise !== null
    );

    if (validExercises.length !== parsedExercises.length) {
      return null;
    }

    return {
      name: day.name.trim() || `Day ${dayIndex + 1}`,
      exercises: validExercises,
    };
  });

  const validDays = parsedDays.filter(
    (day): day is CreateWorkoutProgramDayInput => day !== null
  );

  if (
    validDays.length !== parsedDays.length ||
    validDays.some((day) => day.exercises.length === 0) ||
    validDays.length === 0
  ) {
    return null;
  }

  return {
    name: trimmedProgramName,
    days: validDays,
  };
};