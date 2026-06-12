export type ExerciseCategory =
  | 'chest'
  | 'back'
  | 'legs'
  | 'shoulders'
  | 'arms'
  | 'core'
  | 'other';

export type WeightUnit = 'kg' | 'lb' | 'bodyweight';

export type TrainingGoal = 'strength' | 'hypertrophy' | 'power' | 'endurance';

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
  notes?: string;
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
  createdAt: string;
  updatedAt: string;
};

export type ProgramExercise = {
  id: string;
  workoutDayTemplateId: string;
  exerciseId: string;
  order: number;
  targetSets: number;
  targetRepMin: number;
  targetRepMax: number;
  trainingGoal?: TrainingGoal;
  targetWeight?: number;
  restSeconds?: number;
  progressionRuleId?: string;
  notes?: string;
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
  reps: number;
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
};

export type StartWorkoutSessionInput = {
  programId: string;
  workoutDayTemplateId: string;
};

export type AddSetInput = {
  exerciseId: string;
  programExerciseId?: string;
  reps: number;
  weight: number;
  powerQuality?: PowerQuality;
  notes?: string;
};

export type UpdateSetInput = {
  setId: string;
  reps: number;
  weight: number;
  powerQuality?: PowerQuality;
};

export type DeleteSetInput = {
  setId: string;
};
