import type { ProgramExercise, WorkoutProgram, WorkoutSession, WorkoutSet, WorkoutState } from '@/types/workout';

export type WorkoutSetSummaryItem = Pick<WorkoutSet, 'durationSeconds' | 'reps' | 'unit' | 'weight'>;

export const getSessionStartedAtTime = (session: WorkoutSession) => new Date(session.startedAt).getTime();

export const getSessionDurationSeconds = (session: WorkoutSession) => {
  if (!session.endedAt) {
    return 0;
  }

  return Math.max(
    0,
    Math.floor((new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 1000)
  );
};

export const getSessionSets = (session: WorkoutSession, workoutSets: WorkoutState['workoutSets']) =>
  session.setIds
    .map((setId) => workoutSets[setId])
    .filter((set): set is WorkoutSet => Boolean(set));

export const getSessionSummary = (
  session: WorkoutSession,
  workoutSets: WorkoutState['workoutSets']
) => {
  const sets = getSessionSets(session, workoutSets);

  return {
    durationSeconds: getSessionDurationSeconds(session),
    sets: sets.length,
    volume: sets.reduce((total, set) => total + getSetVolume(set), 0),
  };
};

export const getDateLabel = (date: Date) =>
  date.toLocaleDateString([], {
    day: 'numeric',
    month: 'short',
    weekday: 'short',
  });

export const getDateRangeLabel = (startDate: Date, endDate: Date) =>
  `${getDateLabel(startDate)} - ${getDateLabel(endDate)}`;

export const formatWeight = (weight: number, unit: WorkoutSet['unit']) =>
  unit === 'bodyweight' ? 'BW' : `${weight}${unit}`;

export const getTrackingMode = (programExercise: ProgramExercise) =>
  programExercise.trackingMode ?? 'reps';

export const getTargetMin = (programExercise: ProgramExercise) =>
  getTrackingMode(programExercise) === 'time'
    ? programExercise.targetSecondsMin ?? 30
    : programExercise.targetRepMin ?? 1;

export const getTargetMax = (programExercise: ProgramExercise) =>
  getTrackingMode(programExercise) === 'time'
    ? programExercise.targetSecondsMax ?? getTargetMin(programExercise)
    : programExercise.targetRepMax ?? getTargetMin(programExercise);

export const getTargetUnitLabel = (programExercise: ProgramExercise) =>
  getTrackingMode(programExercise) === 'time' ? 'sec' : 'reps';

export const getTargetRangeLabel = (programExercise: ProgramExercise) =>
  `${programExercise.targetSets} x ${getTargetMin(programExercise)}-${getTargetMax(
    programExercise
  )} ${getTargetUnitLabel(programExercise)}`;

export const getSetWorkAmount = (set: WorkoutSetSummaryItem) => set.reps ?? set.durationSeconds ?? 0;

export const getSetWorkLabel = (set: WorkoutSetSummaryItem) =>
  set.durationSeconds !== undefined ? `${set.durationSeconds}s` : `${set.reps ?? 0} reps`;

export const getSetVolume = (set: WorkoutSetSummaryItem) => (set.reps ?? 0) * set.weight;

/** Epley estimated one-rep max from a logged set: weight x (1 + reps/30). */
export const getEstimatedOneRepMax = (set: WorkoutSetSummaryItem) =>
  set.weight * (1 + (set.reps ?? 0) / 30);

export const formatWorkoutSet = (set: WorkoutSetSummaryItem) =>
  `${formatWeight(set.weight, set.unit)} x ${getSetWorkLabel(set)}`;

export const formatWorkoutSetsSummary = (sets: WorkoutSetSummaryItem[]) => {
  if (sets.length === 0) {
    return '';
  }

  const firstSet = sets[0];
  const sameWeightAndUnit = sets.every(
    (set) => set.weight === firstSet.weight && set.unit === firstSet.unit
  );

  if (sameWeightAndUnit) {
    return `${formatWeight(firstSet.weight, firstSet.unit)} x ${sets
      .map(getSetWorkLabel)
      .join(', ')}`;
  }

  return sets.map(formatWorkoutSet).join(', ');
};

export const getBestSet = (sets: WorkoutSet[]) =>
  [...sets].sort(
    (a, b) =>
      getSetVolume(b) - getSetVolume(a) ||
      b.weight - a.weight ||
      getSetWorkAmount(b) - getSetWorkAmount(a)
  )[0];

export const getProgramForWeekCalculations = (
  activeProgram: WorkoutProgram | null,
  completedSessions: WorkoutSession[],
  today: Date
) => {
  if (!activeProgram) {
    return null;
  }

  return {
    ...activeProgram,
    startDate: activeProgram.startDate ?? completedSessions[0]?.startedAt ?? today.toISOString(),
  };
};
