export type WorkoutSet = {
  id: string;
  exerciseName: string;
  reps: number;
  weight: number;
  createdAt: string;
};

export type ActiveWorkout = {
  id: string;
  name: string;
  startedAt: string;
  sets: WorkoutSet[];
};

export type WorkoutState = {
  currentWorkout: ActiveWorkout | null;
};

export type StartWorkoutInput = {
  name?: string;
};

export type AddSetInput = {
  exerciseName: string;
  reps: number;
  weight: number;
};
