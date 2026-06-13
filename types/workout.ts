export type ExerciseCategory =
  | 'chest'
  | 'back'
  | 'legs'
  | 'shoulders'
  | 'arms'
  | 'core'
  | 'other';

export type WeightUnit = 'kg' | 'lb' | 'bodyweight';

export type TrainingGoal = 'strength' | 'hypertrophy' | 'power' | 'untracked';

export type ExerciseTrackingMode = 'reps' | 'time';

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'core'
  | 'full_body';

export type PowerQuality = 'fast' | 'good' | 'slow' | 'failed';

export type ProgramPhase = 'hypertrophy' | 'strength' | 'power' | 'deload';

export type Exercise = {
  id: string;
  name: string;
  category?: ExerciseCategory;
  muscleGroup?: MuscleGroup;
  defaultUnit: WeightUnit;
  /** Analytics category — what the Stats screen tracks for this exercise. */
  trainingGoal?: TrainingGoal;
  /** Whether the exercise is logged in reps or time. */
  trackingMode?: ExerciseTrackingMode;
  notes?: string;
  isArchived?: boolean;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type WorkoutProgram = {
  id: string;
  name: string;
  description?: string;
  dayIds: string[];
  isActive: boolean;
  phase?: ProgramPhase;
  startDate?: string;
  createdAt: string;
  updatedAt: string;
};

export type WorkoutDayTemplate = {
  id: string;
  programId: string;
  name: string;
  order: number;
  exerciseIds: string[];
  isArchived?: boolean;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type ProgramExercise = {
  id: string;
  workoutDayTemplateId: string;
  exerciseId: string;
  order: number;
  targetSets: number;
  trackingMode?: ExerciseTrackingMode;
  targetRepMin?: number;
  targetRepMax?: number;
  targetSecondsMin?: number;
  targetSecondsMax?: number;
  trainingGoal?: TrainingGoal;
  targetWeight?: number;
  restSeconds?: number;
  progressionRuleId?: string;
  notes?: string;
  isArchived?: boolean;
  archivedAt?: string;
};

export type WorkoutSessionStatus = 'active' | 'completed' | 'discarded';

export type WorkoutSession = {
  id: string;
  programId?: string;
  workoutDayTemplateId?: string;
  name: string;
  startedAt: string;
  endedAt?: string;
  setIds: string[];
  status: WorkoutSessionStatus;
};

export type WorkoutSet = {
  id: string;
  workoutSessionId: string;
  exerciseId: string;
  programExerciseId?: string;
  setNumber: number;
  reps?: number;
  durationSeconds?: number;
  weight: number;
  unit: WeightUnit;
  powerQuality?: PowerQuality;
  completedAt: string;
  notes?: string;
};

export type ProgressionRule = {
  id: string;
  name: string;
  type: 'doubleProgression';
  repMin: number;
  repMax: number;
  weightIncrement: number;
  unit: 'kg' | 'lb';
};

export type WorkoutState = {
  exercises: Record<string, Exercise>;
  programs: Record<string, WorkoutProgram>;
  workoutDayTemplates: Record<string, WorkoutDayTemplate>;
  programExercises: Record<string, ProgramExercise>;
  workoutSessions: Record<string, WorkoutSession>;
  workoutSets: Record<string, WorkoutSet>;
  progressionRules: Record<string, ProgressionRule>;
  activeWorkoutSessionId: string | null;
  /** Set after creating a library exercise so the picker can auto-select it. */
  lastCreatedExerciseId?: string | null;
};

export type CreateExerciseInput = {
  name: string;
  muscleGroup?: MuscleGroup;
  defaultUnit: WeightUnit;
  trainingGoal: TrainingGoal;
  trackingMode: ExerciseTrackingMode;
};

export type UpdateExerciseInput = CreateExerciseInput & {
  exerciseId: string;
};

export type DeleteExerciseInput = {
  exerciseId: string;
};

export type StartWorkoutSessionInput = {
  programId: string;
  workoutDayTemplateId: string;
};

export type CreateWorkoutProgramExerciseInput = {
  /** References an existing library exercise (goal/unit/mode come from it). */
  exerciseId: string;
  targetSets: number;
  targetRepMin?: number;
  targetRepMax?: number;
  targetSecondsMin?: number;
  targetSecondsMax?: number;
  targetWeight?: number;
};

export type CreateWorkoutProgramDayInput = {
  name: string;
  exercises: CreateWorkoutProgramExerciseInput[];
};

export type CreateWorkoutProgramInput = {
  name: string;
  days: CreateWorkoutProgramDayInput[];
};

export type UpdateWorkoutProgramInput = {
  programId: string;
  name: string;
};

export type AddWorkoutDayInput = {
  programId: string;
  name?: string;
  insertAfterWorkoutDayTemplateId?: string | null;
};

export type UpdateWorkoutDayInput = {
  workoutDayTemplateId: string;
  name: string;
};

export type ArchiveWorkoutDayInput = {
  workoutDayTemplateId: string;
};

export type ReorderWorkoutDaysInput = {
  programId: string;
  workoutDayTemplateIds: string[];
};

export type AddProgramExerciseInput = {
  workoutDayTemplateId: string;
  insertAfterProgramExerciseId?: string | null;
  exercise: CreateWorkoutProgramExerciseInput;
};

export type UpdateProgramExerciseInput = {
  programExerciseId: string;
  exercise: CreateWorkoutProgramExerciseInput;
};

export type ArchiveProgramExerciseInput = {
  programExerciseId: string;
};

export type ReorderProgramExercisesInput = {
  workoutDayTemplateId: string;
  programExerciseIds: string[];
};

export type AddSetInput = {
  exerciseId: string;
  programExerciseId?: string;
  reps?: number;
  durationSeconds?: number;
  weight: number;
  powerQuality?: PowerQuality;
  notes?: string;
};

export type UpdateSetInput = {
  setId: string;
  reps?: number;
  durationSeconds?: number;
  weight: number;
  powerQuality?: PowerQuality;
};

export type DeleteSetInput = {
  setId: string;
};
