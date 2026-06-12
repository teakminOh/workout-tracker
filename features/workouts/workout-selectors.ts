import { createSelector } from '@reduxjs/toolkit';

import type { RootState } from '@/store';
import type {
  MuscleGroup,
  ProgramExercise,
  TrainingGoal,
  WorkoutProgram,
  WorkoutDayTemplate,
  WorkoutSession,
  WorkoutSet,
  WorkoutState,
} from '@/types/workout';
import { getCurrentProgramWeekIndex, getProgramWeekBounds } from '@/utils/program-week';

export type PlannedExercise = {
  programExercise: ProgramExercise;
  exerciseName: string;
  unit: string;
  progressionSuggestion: string;
};

export type ProgramWeekSummary = {
  weekNumber: number;
  dateRangeLabel: string;
  completedWorkouts: number;
  plannedWorkouts: number;
  totalSets: number;
  totalVolume: number;
  totalDurationSeconds: number;
};

export type CompletedWorkoutSummary = {
  id: string;
  name: string;
  dateLabel: string;
  sets: number;
  volume: number;
  durationSeconds: number;
};

export type ProgressionSuggestionSummary = {
  id: string;
  exerciseName: string;
  suggestion: string;
};

export type GoalInsightSummary = {
  id: string;
  title: string;
  detail: string;
};

export type SuggestedWorkoutSet = {
  reps: number;
  weight: number;
  unit: WorkoutSet['unit'];
};

export type LastExerciseReference = {
  programExerciseId: string;
  exerciseId: string;
  dateLabel: string;
  setsLabel: string;
  bestSetLabel: string;
  suggestion: string;
  suggestedSets: SuggestedWorkoutSet[];
};

type WorkoutSetSummaryItem = Pick<WorkoutSet, 'reps' | 'unit' | 'weight'>;

const emptyProgramDays: WorkoutDayTemplate[] = [];
const emptyWorkoutSets: WorkoutSet[] = [];
const emptyPlannedExercises: PlannedExercise[] = [];
const emptyCompletedSessions: WorkoutSession[] = [];
const emptyCompletedWorkouts: CompletedWorkoutSummary[] = [];
const emptyProgressionSuggestions: ProgressionSuggestionSummary[] = [];
const emptyLastExerciseReferences: LastExerciseReference[] = [];

const minimumWeeklyWorkingSets = 10;
const maximumWeeklyWorkingSets = 20;

const muscleGroupLabels: Record<MuscleGroup, string> = {
  back: 'Back',
  biceps: 'Biceps',
  chest: 'Chest',
  core: 'Core',
  full_body: 'Full body',
  glutes: 'Glutes',
  hamstrings: 'Hamstrings',
  quads: 'Quads',
  shoulders: 'Shoulders',
  triceps: 'Triceps',
};

const selectExercises = (state: RootState) => state.workout.exercises;
const selectPrograms = (state: RootState) => state.workout.programs;
const selectWorkoutDayTemplates = (state: RootState) => state.workout.workoutDayTemplates;
const selectProgramExercises = (state: RootState) => state.workout.programExercises;
const selectWorkoutSessions = (state: RootState) => state.workout.workoutSessions;
const selectWorkoutSetsById = (state: RootState) => state.workout.workoutSets;
const selectProgressionRules = (state: RootState) => state.workout.progressionRules;
const selectActiveWorkoutSessionId = (state: RootState) => state.workout.activeWorkoutSessionId;
const toLocalDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const getDateFromLocalKey = (dateKey: string) => {
  const [year, month, day] = dateKey.split('-').map(Number);

  return new Date(year, month - 1, day);
};

const selectTodayKey = () => toLocalDateKey(new Date());

const getProgramDays = (
  workoutDayTemplates: WorkoutState['workoutDayTemplates'],
  program: WorkoutProgram
) =>
  program.dayIds
    .map((dayId) => workoutDayTemplates[dayId])
    .filter(
      (day): day is WorkoutDayTemplate => Boolean(day) && day.programId === program.id
    );

const getProgramExercisesForDay = (
  programExercises: WorkoutState['programExercises'],
  workoutDayTemplateId: string
) =>
  Object.values(programExercises)
    .filter((programExercise) => programExercise.workoutDayTemplateId === workoutDayTemplateId)
    .sort((a, b) => a.order - b.order);

const getSessionStartedAtTime = (session: WorkoutSession) => new Date(session.startedAt).getTime();

const getSessionDurationSeconds = (session: WorkoutSession) => {
  if (!session.endedAt) {
    return 0;
  }

  return Math.max(
    0,
    Math.floor((new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 1000)
  );
};

const getSessionSets = (session: WorkoutSession, workoutSets: WorkoutState['workoutSets']) =>
  session.setIds
    .map((setId) => workoutSets[setId])
    .filter((set): set is WorkoutSet => Boolean(set));

const getSessionSummary = (session: WorkoutSession, workoutSets: WorkoutState['workoutSets']) => {
  const sets = getSessionSets(session, workoutSets);

  return {
    durationSeconds: getSessionDurationSeconds(session),
    sets: sets.length,
    volume: sets.reduce((total, set) => total + set.reps * set.weight, 0),
  };
};

const getDateLabel = (date: Date) =>
  date.toLocaleDateString([], {
    day: 'numeric',
    month: 'short',
    weekday: 'short',
  });

const getDateRangeLabel = (startDate: Date, endDate: Date) =>
  `${getDateLabel(startDate)} - ${getDateLabel(endDate)}`;

const formatWeight = (weight: number, unit: WorkoutSet['unit']) =>
  unit === 'bodyweight' ? 'BW' : `${weight}${unit}`;

const formatWorkoutSet = (set: WorkoutSetSummaryItem) =>
  `${formatWeight(set.weight, set.unit)} x ${set.reps}`;

const formatWorkoutSetsSummary = (sets: WorkoutSetSummaryItem[]) => {
  if (sets.length === 0) {
    return '';
  }

  const firstSet = sets[0];
  const sameWeightAndUnit = sets.every(
    (set) => set.weight === firstSet.weight && set.unit === firstSet.unit
  );

  if (sameWeightAndUnit) {
    return `${formatWeight(firstSet.weight, firstSet.unit)} x ${sets
      .map((set) => set.reps)
      .join(', ')}`;
  }

  return sets.map(formatWorkoutSet).join(', ');
};

const getBestSet = (sets: WorkoutSet[]) =>
  [...sets].sort(
    (a, b) =>
      b.weight * b.reps - a.weight * a.reps || b.weight - a.weight || b.reps - a.reps
  )[0];

const getProgramForWeekCalculations = (
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

const getPlannedExercisesForDay = ({
  activeSession,
  completedSessions,
  day,
  exercises,
  programExercises,
  progressionRules,
  workoutSets,
}: {
  activeSession: WorkoutSession | null;
  completedSessions: WorkoutSession[];
  day: WorkoutDayTemplate | null;
  exercises: WorkoutState['exercises'];
  programExercises: WorkoutState['programExercises'];
  progressionRules: WorkoutState['progressionRules'];
  workoutSets: WorkoutState['workoutSets'];
}) => {
  if (!day) {
    return emptyPlannedExercises;
  }

  const plannedExercises = getProgramExercisesForDay(programExercises, day.id);

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
        completedSessions,
        programExercise,
        progressionRules,
        workoutSets,
      }),
    };
  });
};

export const selectActiveProgram = createSelector([selectPrograms], (programs) =>
  Object.values(programs).find((program) => program.isActive) ?? null
);

export const selectActiveProgramDays = createSelector(
  [selectActiveProgram, selectWorkoutDayTemplates],
  (activeProgram, workoutDayTemplates) => {
    if (!activeProgram) {
      return emptyProgramDays;
    }

    return getProgramDays(workoutDayTemplates, activeProgram);
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

export const selectCompletedSessionsForActiveProgram = createSelector(
  [selectActiveProgram, selectWorkoutSessions],
  (activeProgram, workoutSessions) => {
    if (!activeProgram) {
      return emptyCompletedSessions;
    }

    const completedSessions = Object.values(workoutSessions)
      .filter(
        (session) => session.status === 'completed' && session.programId === activeProgram.id
      )
      .sort((a, b) => getSessionStartedAtTime(a) - getSessionStartedAtTime(b));

    return completedSessions.length > 0 ? completedSessions : emptyCompletedSessions;
  }
);

export const selectNextProgramDay = createSelector(
  [selectActiveProgramDays, selectCompletedSessionsForActiveProgram],
  (programDays, completedSessions) => {
    if (programDays.length === 0) {
      return null;
    }

    const latestCompletedSession = completedSessions[completedSessions.length - 1];

    if (!latestCompletedSession?.workoutDayTemplateId) {
      return programDays[0];
    }

    const latestDayIndex = programDays.findIndex(
      (day) => day.id === latestCompletedSession.workoutDayTemplateId
    );

    return programDays[latestDayIndex === -1 ? 0 : (latestDayIndex + 1) % programDays.length];
  }
);

const selectHomeWorkoutDay = createSelector(
  [selectActiveSessionDay, selectNextProgramDay],
  (activeSessionDay, nextProgramDay) => activeSessionDay ?? nextProgramDay
);

export const selectHomePlannedExercises = createSelector(
  [
    selectHomeWorkoutDay,
    selectProgramExercises,
    selectExercises,
    selectWorkoutSetsById,
    selectCompletedSessionsForActiveProgram,
    selectActiveWorkoutSession,
    selectProgressionRules,
  ],
  (
    activeDay,
    programExercises,
    exercises,
    workoutSets,
    completedSessions,
    activeSession,
    progressionRules
  ): PlannedExercise[] => {
    return getPlannedExercisesForDay({
      activeSession,
      completedSessions,
      day: activeDay,
      exercises,
      programExercises,
      progressionRules,
      workoutSets,
    });
  }
);

export const selectActiveSessionPlannedExercises = createSelector(
  [
    selectActiveSessionDay,
    selectProgramExercises,
    selectExercises,
    selectWorkoutSetsById,
    selectCompletedSessionsForActiveProgram,
    selectActiveWorkoutSession,
    selectProgressionRules,
  ],
  (
    activeDay,
    programExercises,
    exercises,
    workoutSets,
    completedSessions,
    activeSession,
    progressionRules
  ): PlannedExercise[] => {
    return getPlannedExercisesForDay({
      activeSession,
      completedSessions,
      day: activeDay,
      exercises,
      programExercises,
      progressionRules,
      workoutSets,
    });
  }
);

export const selectActiveSessionExerciseReferences = createSelector(
  [
    selectActiveSessionDay,
    selectProgramExercises,
    selectWorkoutSetsById,
    selectCompletedSessionsForActiveProgram,
    selectProgressionRules,
  ],
  (
    activeDay,
    programExercises,
    workoutSets,
    completedSessions,
    progressionRules
  ): LastExerciseReference[] => {
    if (!activeDay) {
      return emptyLastExerciseReferences;
    }

    const plannedExercises = getProgramExercisesForDay(programExercises, activeDay.id);

    if (plannedExercises.length === 0 || completedSessions.length === 0) {
      return emptyLastExerciseReferences;
    }

    const references = plannedExercises
      .map((programExercise) => {
        const lastPerformance = getMostRecentCompletedSetsForExercise({
          completedSessions,
          exerciseId: programExercise.exerciseId,
          workoutSets,
        });

        if (!lastPerformance) {
          return null;
        }

        const suggestedSets = getSuggestedSetsForProgramExercise({
          programExercise,
          progressionRules,
          sets: lastPerformance.sets,
        });

        return {
          programExerciseId: programExercise.id,
          exerciseId: programExercise.exerciseId,
          dateLabel: getDateLabel(new Date(lastPerformance.session.startedAt)),
          setsLabel: formatWorkoutSetsSummary(lastPerformance.sets),
          bestSetLabel: formatWorkoutSet(getBestSet(lastPerformance.sets)),
          suggestion: getSuggestedSetText(lastPerformance.sets, suggestedSets),
          suggestedSets,
        };
      })
      .filter((reference): reference is LastExerciseReference => reference !== null);

    return references.length > 0 ? references : emptyLastExerciseReferences;
  }
);

export const selectTotalSets = createSelector(
  [selectActiveSessionSets],
  (activeSessionSets) => activeSessionSets.length
);

export const selectTotalVolume = createSelector([selectActiveSessionSets], (activeSessionSets) =>
  activeSessionSets.reduce((total, set) => total + set.reps * set.weight, 0)
);

export const selectCurrentProgramWeekSummary = createSelector(
  [
    selectActiveProgram,
    selectCompletedSessionsForActiveProgram,
    selectActiveProgramDays,
    selectWorkoutSetsById,
    selectTodayKey,
  ],
  (activeProgram, completedSessions, activeProgramDays, workoutSets, todayKey): ProgramWeekSummary => {
    const today = getDateFromLocalKey(todayKey);
    const programForWeek = getProgramForWeekCalculations(activeProgram, completedSessions, today);
    const { weekEnd, weekIndex, weekStart } = programForWeek
      ? getProgramWeekBounds(programForWeek, today)
      : { weekEnd: today, weekIndex: 0, weekStart: today };
    const completedSessionsThisWeek = completedSessions.filter((session) => {
      const startedAtTime = getSessionStartedAtTime(session);

      return startedAtTime >= weekStart.getTime() && startedAtTime <= weekEnd.getTime();
    });
    const weekTotals = completedSessionsThisWeek.reduce(
      (totals, session) => {
        const sessionSummary = getSessionSummary(session, workoutSets);

        return {
          totalDurationSeconds: totals.totalDurationSeconds + sessionSummary.durationSeconds,
          totalSets: totals.totalSets + sessionSummary.sets,
          totalVolume: totals.totalVolume + sessionSummary.volume,
        };
      },
      { totalDurationSeconds: 0, totalSets: 0, totalVolume: 0 }
    );

    return {
      weekNumber: weekIndex + 1,
      dateRangeLabel: getDateRangeLabel(weekStart, weekEnd),
      completedWorkouts: completedSessionsThisWeek.length,
      plannedWorkouts: activeProgramDays.length,
      totalSets: weekTotals.totalSets,
      totalVolume: weekTotals.totalVolume,
      totalDurationSeconds: weekTotals.totalDurationSeconds,
    };
  }
);

export const selectTopProgressionSuggestions = createSelector(
  [selectHomePlannedExercises],
  (plannedExercises) => {
    if (plannedExercises.length === 0) {
      return emptyProgressionSuggestions;
    }

    return plannedExercises.slice(0, 3).map((plannedExercise) => ({
      id: plannedExercise.programExercise.id,
      exerciseName: plannedExercise.exerciseName,
      suggestion: plannedExercise.progressionSuggestion,
    }));
  }
);

export const selectLastCompletedWorkouts = createSelector(
  [selectCompletedSessionsForActiveProgram, selectWorkoutSetsById],
  (completedSessions, workoutSets) => {
    if (completedSessions.length === 0) {
      return emptyCompletedWorkouts;
    }

    return [...completedSessions]
      .sort((a, b) => getSessionStartedAtTime(b) - getSessionStartedAtTime(a))
      .slice(0, 3)
      .map((session) => {
        const sessionSummary = getSessionSummary(session, workoutSets);

        return {
          id: session.id,
          name: session.name,
          dateLabel: getDateLabel(new Date(session.startedAt)),
          sets: sessionSummary.sets,
          volume: sessionSummary.volume,
          durationSeconds: sessionSummary.durationSeconds,
        };
      });
  }
);

export const selectStrengthFocusInsight = createSelector(
  [
    selectHomePlannedExercises,
    selectActiveWorkoutSession,
    selectCompletedSessionsForActiveProgram,
    selectWorkoutSetsById,
  ],
  (plannedExercises, activeSession, completedSessions, workoutSets): GoalInsightSummary | null => {
    const plannedExercise = getFirstPlannedExerciseByGoal(plannedExercises, 'strength');

    if (!plannedExercise) {
      return null;
    }

    const { programExercise } = plannedExercise;
    const relevantSets = getMostRecentSetsForProgramExercise({
      activeSession,
      completedSessions,
      programExerciseId: programExercise.id,
      workoutSets,
    });

    if (relevantSets.length === 0) {
      return {
        id: programExercise.id,
        title: plannedExercise.exerciseName,
        detail: `${programExercise.targetSets} sets of ${programExercise.targetRepMin}-${programExercise.targetRepMax} reps planned.`,
      };
    }

    const topSet = getTopStrengthSet(relevantSets);
    const estimatedOneRepMax = getEstimatedOneRepMax(topSet);
    const heavySetCount = relevantSets.filter(
      (set) => set.weight >= estimatedOneRepMax * 0.8
    ).length;
    const targetStatus = getTargetCompletionText(programExercise, relevantSets);
    const needsDeload = hasConsecutiveFailedSessions({
      completedSessions,
      programExercise,
      workoutSets,
    });

    return {
      id: programExercise.id,
      title: plannedExercise.exerciseName,
      detail: needsDeload
        ? `Two sessions missed target reps. Consider a deload before rebuilding.`
        : `Top set ${topSet.weight}kg x ${topSet.reps}, e1RM ${estimatedOneRepMax.toFixed(
            1
          )}kg. ${heavySetCount} heavy sets. ${targetStatus}`,
    };
  }
);

export const selectHypertrophyFocusInsight = createSelector(
  [
    selectHomePlannedExercises,
    selectActiveProgram,
    selectCompletedSessionsForActiveProgram,
    selectActiveWorkoutSession,
    selectWorkoutSetsById,
    selectExercises,
    selectProgramExercises,
    selectTodayKey,
  ],
  (
    plannedExercises,
    activeProgram,
    completedSessions,
    activeSession,
    workoutSets,
    exercises,
    programExercises,
    todayKey
  ): GoalInsightSummary | null => {
    const plannedExercise = getFirstPlannedExerciseByGoal(plannedExercises, 'hypertrophy');

    if (!plannedExercise || !activeProgram) {
      return null;
    }

    const muscleGroup = exercises[plannedExercise.programExercise.exerciseId]?.muscleGroup;

    if (!muscleGroup) {
      return null;
    }

    const today = getDateFromLocalKey(todayKey);
    const programForWeek = getProgramForWeekCalculations(activeProgram, completedSessions, today);

    if (!programForWeek) {
      return null;
    }

    const weekIndex = getCurrentProgramWeekIndex(programForWeek, today);
    const completedSessionsThisWeek = completedSessions.filter(
      (session) =>
        getCurrentProgramWeekIndex(programForWeek, new Date(session.startedAt)) === weekIndex
    );
    const weeklyWorkingSets = countSetsForMuscleGroup(
      completedSessionsThisWeek,
      workoutSets,
      exercises,
      programExercises,
      muscleGroup
    );
    const activeSessionWorkingSets = activeSession
      ? countSetsForMuscleGroup([activeSession], workoutSets, exercises, programExercises, muscleGroup)
      : 0;
    const muscleLabel = muscleGroupLabels[muscleGroup];
    const rangeText = `${minimumWeeklyWorkingSets}-${maximumWeeklyWorkingSets}`;

    if (weeklyWorkingSets < minimumWeeklyWorkingSets) {
      const remainingSets = minimumWeeklyWorkingSets - weeklyWorkingSets;

      return {
        id: muscleGroup,
        title: muscleLabel,
        detail: `${weeklyWorkingSets} weekly sets. Add ${remainingSets} more to reach the ${rangeText} working-set range. ${activeSessionWorkingSets} logged this session.`,
      };
    }

    if (weeklyWorkingSets > maximumWeeklyWorkingSets) {
      return {
        id: muscleGroup,
        title: muscleLabel,
        detail: `${weeklyWorkingSets} weekly sets. That is above the ${rangeText} target, so keep recovery in mind.`,
      };
    }

    return {
      id: muscleGroup,
      title: muscleLabel,
      detail: `${weeklyWorkingSets} weekly sets, inside the ${rangeText} target range. Add reps before weight on planned hypertrophy lifts.`,
    };
  }
);

export const selectPowerFocusInsight = createSelector(
  [
    selectHomePlannedExercises,
    selectActiveWorkoutSession,
    selectCompletedSessionsForActiveProgram,
    selectWorkoutSetsById,
  ],
  (plannedExercises, activeSession, completedSessions, workoutSets): GoalInsightSummary | null => {
    const plannedExercise = getFirstPlannedExerciseByGoal(plannedExercises, 'power');

    if (!plannedExercise) {
      return null;
    }

    const { programExercise } = plannedExercise;
    const relevantSets = getMostRecentSetsForProgramExercise({
      activeSession,
      completedSessions,
      programExerciseId: programExercise.id,
      workoutSets,
    });

    if (relevantSets.length === 0 || relevantSets.every((set) => !set.powerQuality)) {
      return {
        id: programExercise.id,
        title: plannedExercise.exerciseName,
        detail: 'Log set quality to track power progress.',
      };
    }

    const fastOrGoodSets = relevantSets.filter(
      (set) => set.powerQuality === 'fast' || set.powerQuality === 'good'
    ).length;
    const hasQualityDrop = relevantSets.some(
      (set) => set.powerQuality === 'slow' || set.powerQuality === 'failed'
    );

    return {
      id: programExercise.id,
      title: plannedExercise.exerciseName,
      detail: hasQualityDrop
        ? `${fastOrGoodSets}/${relevantSets.length} sets stayed fast or good. Stop chasing volume once speed drops.`
        : `${fastOrGoodSets}/${relevantSets.length} sets stayed fast or good. Keep speed high before adding load.`,
    };
  }
);

const getFirstPlannedExerciseByGoal = (
  plannedExercises: PlannedExercise[],
  trainingGoal: TrainingGoal
) =>
  plannedExercises.find(
    (plannedExercise) => plannedExercise.programExercise.trainingGoal === trainingGoal
  ) ?? null;

const getEstimatedOneRepMax = (set: WorkoutSet) => set.weight * (1 + set.reps / 30);

const getTopStrengthSet = (sets: WorkoutSet[]) =>
  [...sets].sort((a, b) => getEstimatedOneRepMax(b) - getEstimatedOneRepMax(a))[0];

const getTargetCompletionText = (
  programExercise: ProgramExercise,
  relevantSets: WorkoutSet[]
) => {
  const completedTargetSets = relevantSets.slice(-programExercise.targetSets);

  if (completedTargetSets.length < programExercise.targetSets) {
    return `${completedTargetSets.length}/${programExercise.targetSets} target sets logged.`;
  }

  if (completedTargetSets.every((set) => set.reps >= programExercise.targetRepMax)) {
    return 'All target sets reached the top rep target.';
  }

  if (completedTargetSets.every((set) => set.reps >= programExercise.targetRepMin)) {
    return 'Target range completed.';
  }

  return 'Repeat the load until target reps are consistent.';
};

const countSetsForMuscleGroup = (
  sessions: WorkoutSession[],
  workoutSets: WorkoutState['workoutSets'],
  exercises: WorkoutState['exercises'],
  programExercises: WorkoutState['programExercises'],
  muscleGroup: MuscleGroup
) =>
  sessions.reduce(
    (total, session) =>
      total +
      getSessionSets(session, workoutSets).filter(
        (set) =>
          exercises[set.exerciseId]?.muscleGroup === muscleGroup &&
          (set.programExerciseId
            ? programExercises[set.programExerciseId]?.trainingGoal === 'hypertrophy'
            : false)
      ).length,
    0
  );

type ProgressionSuggestionInput = {
  activeSession: WorkoutSession | null;
  completedSessions: WorkoutSession[];
  programExercise: ProgramExercise;
  progressionRules: WorkoutState['progressionRules'];
  workoutSets: WorkoutState['workoutSets'];
};

const getProgressionSuggestion = ({
  activeSession,
  completedSessions,
  programExercise,
  progressionRules,
  workoutSets,
}: ProgressionSuggestionInput) => {
  const rule = programExercise.progressionRuleId
    ? progressionRules[programExercise.progressionRuleId]
    : null;
  const relevantSets = getMostRecentSetsForProgramExercise({
    activeSession,
    completedSessions,
    programExerciseId: programExercise.id,
    workoutSets,
  });
  const baselineWeight = relevantSets[relevantSets.length - 1]?.weight ?? programExercise.targetWeight;

  if (programExercise.trainingGoal === 'power') {
    return getPowerProgressionSuggestion(programExercise, relevantSets);
  }

  if (programExercise.trainingGoal === 'hypertrophy') {
    return getHypertrophyProgressionSuggestion(programExercise, relevantSets, rule?.weightIncrement);
  }

  if (programExercise.trainingGoal === 'strength') {
    if (
      hasConsecutiveFailedSessions({
        completedSessions,
        programExercise,
        workoutSets,
      }) &&
      baselineWeight !== undefined
    ) {
      return `Deload: repeat lighter than ${baselineWeight}kg`;
    }

    return getStrengthProgressionSuggestion(programExercise, relevantSets, rule);
  }

  if (programExercise.trainingGoal === 'endurance') {
    return getEnduranceProgressionSuggestion(programExercise, relevantSets);
  }

  if (!rule || baselineWeight === undefined) {
    return baselineWeight === undefined ? 'No target yet' : `Repeat ${baselineWeight}kg`;
  }

  return getStrengthProgressionSuggestion(programExercise, relevantSets, rule);
};

type MostRecentSetsInput = {
  activeSession: WorkoutSession | null;
  completedSessions: WorkoutSession[];
  programExerciseId: string;
  workoutSets: WorkoutState['workoutSets'];
};

type CompletedSessionSetsInput = {
  completedSessions: WorkoutSession[];
  isMatchingSet: (set: WorkoutSet) => boolean;
  workoutSets: WorkoutState['workoutSets'];
};

const getMostRecentCompletedSessionSets = ({
  completedSessions,
  isMatchingSet,
  workoutSets,
}: CompletedSessionSetsInput) => {
  const latestCompletedSession = [...completedSessions]
    .sort((a, b) => getSessionStartedAtTime(b) - getSessionStartedAtTime(a))
    .find((session) => getSessionSets(session, workoutSets).some(isMatchingSet));

  if (!latestCompletedSession) {
    return null;
  }

  const sets = getSessionSets(latestCompletedSession, workoutSets).filter(isMatchingSet);

  return sets.length > 0 ? { session: latestCompletedSession, sets } : null;
};

const getMostRecentSetsForProgramExercise = ({
  activeSession,
  completedSessions,
  programExerciseId,
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

  const completedSetGroup = getMostRecentCompletedSessionSets({
    completedSessions,
    isMatchingSet: (set) => set.programExerciseId === programExerciseId,
    workoutSets,
  });

  return completedSetGroup?.sets ?? [];
};

const getMostRecentCompletedSetsForExercise = ({
  completedSessions,
  exerciseId,
  workoutSets,
}: {
  completedSessions: WorkoutSession[];
  exerciseId: string;
  workoutSets: WorkoutState['workoutSets'];
}) => {
  return getMostRecentCompletedSessionSets({
    completedSessions,
    isMatchingSet: (set) => set.exerciseId === exerciseId,
    workoutSets,
  });
};

const getSuggestedSetsForProgramExercise = ({
  programExercise,
  progressionRules,
  sets,
}: {
  programExercise: ProgramExercise;
  progressionRules: WorkoutState['progressionRules'];
  sets: WorkoutSet[];
}): SuggestedWorkoutSet[] => {
  const rule = programExercise.progressionRuleId
    ? progressionRules[programExercise.progressionRuleId]
    : null;
  const targetSetCount = Math.max(1, programExercise.targetSets);
  const previousTargetSets = sets.slice(0, targetSetCount);
  const lastSet = previousTargetSets[previousTargetSets.length - 1] ?? sets[sets.length - 1];
  const fallbackWeight = lastSet?.weight ?? programExercise.targetWeight ?? 0;
  const fallbackUnit = lastSet?.unit ?? 'kg';
  const normalizedSets = Array.from({ length: targetSetCount }, (_, index) => {
    const previousSet =
      previousTargetSets[index] ??
      previousTargetSets[previousTargetSets.length - 1] ??
      lastSet;

    return {
      reps: normalizeSuggestedReps(
        previousSet?.reps ?? programExercise.targetRepMin,
        programExercise
      ),
      weight: previousSet?.weight ?? fallbackWeight,
      unit: previousSet?.unit ?? fallbackUnit,
    };
  });

  if (programExercise.trainingGoal === 'strength') {
    return getStrengthSuggestedSets(programExercise, normalizedSets, sets, rule);
  }

  if (programExercise.trainingGoal === 'hypertrophy') {
    return getRepsFirstSuggestedSets(programExercise, normalizedSets, previousTargetSets);
  }

  if (programExercise.trainingGoal === 'power') {
    return getPowerSuggestedSets(programExercise, normalizedSets, sets, rule);
  }

  return getRepsFirstSuggestedSets(programExercise, normalizedSets, previousTargetSets);
};

const normalizeSuggestedReps = (reps: number, programExercise: ProgramExercise) =>
  Math.min(programExercise.targetRepMax, Math.max(programExercise.targetRepMin, Math.round(reps)));

const getStrengthSuggestedSets = (
  programExercise: ProgramExercise,
  normalizedSets: SuggestedWorkoutSet[],
  sets: WorkoutSet[],
  rule: WorkoutState['progressionRules'][string] | null
) => {
  if (!rule || !didHitTopRepTarget(programExercise, sets, rule.repMax)) {
    return normalizedSets;
  }

  const baselineWeight = sets[sets.length - 1]?.weight ?? programExercise.targetWeight ?? 0;
  const unit = sets[sets.length - 1]?.unit ?? normalizedSets[0]?.unit ?? 'kg';

  return normalizedSets.map(() => ({
    reps: programExercise.targetRepMin,
    weight: baselineWeight + rule.weightIncrement,
    unit,
  }));
};

const getRepsFirstSuggestedSets = (
  programExercise: ProgramExercise,
  normalizedSets: SuggestedWorkoutSet[],
  previousTargetSets: WorkoutSet[]
) => {
  const hadBelowMinimum =
    previousTargetSets.length < programExercise.targetSets ||
    previousTargetSets.some((set) => set.reps < programExercise.targetRepMin);

  if (hadBelowMinimum) {
    return normalizedSets;
  }

  const lowestReps = Math.min(...normalizedSets.map((set) => set.reps));
  const setIndexToProgress = normalizedSets.findIndex(
    (set) => set.reps === lowestReps && set.reps < programExercise.targetRepMax
  );

  if (setIndexToProgress === -1) {
    return normalizedSets;
  }

  return normalizedSets.map((set, index) =>
    index === setIndexToProgress
      ? { ...set, reps: Math.min(programExercise.targetRepMax, set.reps + 1) }
      : set
  );
};

const getPowerSuggestedSets = (
  programExercise: ProgramExercise,
  normalizedSets: SuggestedWorkoutSet[],
  sets: WorkoutSet[],
  rule: WorkoutState['progressionRules'][string] | null
) => {
  const targetSets = sets.slice(-programExercise.targetSets);
  const canIncrease =
    targetSets.length >= programExercise.targetSets &&
    targetSets.every((set) => set.powerQuality === 'fast' || set.powerQuality === 'good');

  if (!canIncrease) {
    return normalizedSets;
  }

  const baselineWeight = sets[sets.length - 1]?.weight ?? programExercise.targetWeight ?? 0;

  if (baselineWeight <= 0) {
    return normalizedSets;
  }

  const increment = rule?.weightIncrement ?? 2.5;
  const unit = sets[sets.length - 1]?.unit ?? normalizedSets[0]?.unit ?? 'kg';

  return normalizedSets.map(() => ({
    reps: programExercise.targetRepMin,
    weight: baselineWeight + increment,
    unit,
  }));
};

const getSuggestedSetText = (
  lastSets: WorkoutSet[],
  suggestedSets: SuggestedWorkoutSet[]
) => {
  if (suggestedSets.length === 0) {
    return 'Repeat last time';
  }

  const firstSuggestedSet = suggestedSets[0];
  const sameSuggestedWeight = suggestedSets.every(
    (set) => set.weight === firstSuggestedSet.weight && set.unit === firstSuggestedSet.unit
  );
  const sameSuggestedReps = suggestedSets.every((set) => set.reps === firstSuggestedSet.reps);
  const sameWeightAsLastTime =
    sameSuggestedWeight &&
    lastSets.length > 0 &&
    lastSets.every(
      (set) => set.weight === firstSuggestedSet.weight && set.unit === firstSuggestedSet.unit
    );

  if (sameSuggestedWeight && sameSuggestedReps && sameWeightAsLastTime) {
    return `Try ${firstSuggestedSet.reps} reps on all sets`;
  }

  if (sameSuggestedWeight && sameSuggestedReps) {
    return `Try ${formatWeight(firstSuggestedSet.weight, firstSuggestedSet.unit)} x ${firstSuggestedSet.reps} on all sets`;
  }

  return `Try ${formatWorkoutSetsSummary(suggestedSets)}`;
};

const getStrengthProgressionSuggestion = (
  programExercise: ProgramExercise,
  relevantSets: WorkoutSet[],
  rule: WorkoutState['progressionRules'][string] | null
) => {
  const baselineWeight = relevantSets[relevantSets.length - 1]?.weight ?? programExercise.targetWeight;

  if (!rule || baselineWeight === undefined) {
    return baselineWeight === undefined ? 'No target yet' : `Repeat ${baselineWeight}kg`;
  }

  const hitTopReps = didHitTopRepTarget(programExercise, relevantSets, rule.repMax);
  const nextWeight = hitTopReps ? baselineWeight + rule.weightIncrement : baselineWeight;

  return hitTopReps ? `Next: ${nextWeight}${rule.unit}` : `Repeat ${nextWeight}${rule.unit}`;
};

const getHypertrophyProgressionSuggestion = (
  programExercise: ProgramExercise,
  relevantSets: WorkoutSet[],
  weightIncrement = 2.5
) => {
  const baselineWeight = relevantSets[relevantSets.length - 1]?.weight ?? programExercise.targetWeight;

  if (baselineWeight === undefined) {
    return 'Add reps before adding weight';
  }

  if (didHitTopRepTarget(programExercise, relevantSets, programExercise.targetRepMax)) {
    return `Next: ${baselineWeight + weightIncrement}kg after all target reps`;
  }

  return `Add reps before weight at ${baselineWeight}kg`;
};

const getPowerProgressionSuggestion = (
  programExercise: ProgramExercise,
  relevantSets: WorkoutSet[]
) => {
  if (relevantSets.length === 0 || relevantSets.every((set) => !set.powerQuality)) {
    return 'Log set quality to track power progress';
  }

  if (relevantSets.some((set) => set.powerQuality === 'failed' || set.powerQuality === 'slow')) {
    const baselineWeight = relevantSets[relevantSets.length - 1]?.weight ?? programExercise.targetWeight;

    return baselineWeight === undefined
      ? 'Repeat until every rep is fast'
      : `Repeat ${baselineWeight}kg until quality stays high`;
  }

  return 'Quality looks good - keep speed the priority';
};

const getEnduranceProgressionSuggestion = (
  programExercise: ProgramExercise,
  relevantSets: WorkoutSet[]
) => {
  const baselineWeight = relevantSets[relevantSets.length - 1]?.weight ?? programExercise.targetWeight;

  if (relevantSets.length === 0) {
    return `Build toward ${programExercise.targetRepMin}-${programExercise.targetRepMax} reps`;
  }

  if (didHitTopRepTarget(programExercise, relevantSets, programExercise.targetRepMax)) {
    return 'Add reps or duration before adding load';
  }

  return baselineWeight === undefined
    ? 'Repeat and add reps'
    : `Repeat ${baselineWeight}kg and add reps`;
};

const didHitTopRepTarget = (
  programExercise: ProgramExercise,
  relevantSets: WorkoutSet[],
  repMax: number
) => {
  const completedTargetSets = relevantSets.slice(-programExercise.targetSets);

  return (
    completedTargetSets.length >= programExercise.targetSets &&
    completedTargetSets.every((set) => set.reps >= repMax)
  );
};

const didMissBottomRepTarget = (
  programExercise: ProgramExercise,
  relevantSets: WorkoutSet[]
) => {
  const completedTargetSets = relevantSets.slice(-programExercise.targetSets);

  return (
    completedTargetSets.length >= programExercise.targetSets &&
    completedTargetSets.some((set) => set.reps < programExercise.targetRepMin)
  );
};

const getCompletedSessionSetsForProgramExercise = (
  completedSessions: WorkoutSession[],
  workoutSets: WorkoutState['workoutSets'],
  programExerciseId: string
) =>
  completedSessions
    .map((session) =>
      getSessionSets(session, workoutSets).filter(
        (set) => set.programExerciseId === programExerciseId
      )
    )
    .filter((sets) => sets.length > 0);

const hasConsecutiveFailedSessions = ({
  completedSessions,
  programExercise,
  workoutSets,
}: {
  completedSessions: WorkoutSession[];
  programExercise: ProgramExercise;
  workoutSets: WorkoutState['workoutSets'];
}) => {
  const recentSessionSets = getCompletedSessionSetsForProgramExercise(
    [...completedSessions].sort((a, b) => getSessionStartedAtTime(b) - getSessionStartedAtTime(a)),
    workoutSets,
    programExercise.id
  ).slice(0, 2);

  return (
    recentSessionSets.length >= 2 &&
    recentSessionSets.every((sets) => didMissBottomRepTarget(programExercise, sets))
  );
};
