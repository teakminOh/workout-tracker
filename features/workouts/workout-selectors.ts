import { createSelector } from '@reduxjs/toolkit';

import {
  formatWeight,
  formatWorkoutSet,
  formatWorkoutSetsSummary,
  getBestSet,
  getDateLabel,
  getDateRangeLabel,
  getEstimatedOneRepMax,
  getProgramForWeekCalculations,
  getSessionSets,
  getSessionStartedAtTime,
  getSessionSummary,
  getSetVolume,
  getSetWorkAmount,
  getSetWorkLabel,
  getTargetMax,
  getTargetMin,
  getTargetRangeLabel,
  getTrackingMode,
} from '@/features/workouts/workout-selector-helpers';
import {
  classifyLift,
  STANDARD_LIFT_LABELS,
  STRENGTH_BAND_LABELS,
  STRENGTH_BAND_ORDER,
  type StrengthBand,
} from '@/features/workouts/strength-standards';
import { ACHIEVEMENTS, type AchievementStats } from '@/features/workouts/achievements';
import type { IconName } from '@/components/ui/icon';
import type { RootState } from '@/store';
import type {
  ExerciseTrackingMode,
  MuscleGroup,
  ProgramExercise,
  StandardLiftKey,
  TrainingGoal,
  UserProfile,
  WeightUnit,
  WorkoutDayTemplate,
  WorkoutProgram,
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
  /** True when this row is an ad-hoc exercise in a freestyle session (no real ProgramExercise). */
  isFreestyle?: boolean;
};

export type ProgramSummary = {
  id: string;
  name: string;
  dayCount: number;
  exerciseCount: number;
};

export type ProgramEditorExercise = {
  programExercise: ProgramExercise;
  exerciseName: string;
  unit: WeightUnit;
};

export type ProgramEditorDay = {
  day: WorkoutDayTemplate;
  exercises: ProgramEditorExercise[];
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
  reps?: number;
  durationSeconds?: number;
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

export type WorkoutActivityDay = {
  dateKey: string;
  count: number;
  isFuture: boolean;
};

export type WorkoutActivity = {
  currentStreak: number;
  longestStreak: number;
  totalWorkouts: number;
  /** Trailing weeks of daily activity, oldest first, aligned to whole weeks (Sun start). */
  days: WorkoutActivityDay[];
};

export type ExerciseLibraryItem = {
  id: string;
  name: string;
  muscleGroups?: MuscleGroup[];
  defaultUnit: WeightUnit;
  trainingGoal: TrainingGoal;
  trackingMode: ExerciseTrackingMode;
};

export type PersonalRecordKind = 'weight' | 'e1RM' | 'volume' | 'reps';

export type PersonalRecordEntry = {
  kind: PersonalRecordKind;
  value: number;
  dateLabel: string;
};

export type ExercisePersonalRecords = {
  exerciseId: string;
  exerciseName: string;
  unit: WeightUnit;
  category: TrainingGoal;
  records: PersonalRecordEntry[];
  lastRecordTime: number;
};

export type ExerciseHistoryOption = {
  exerciseId: string;
  exerciseName: string;
  sessionCount: number;
  category: TrainingGoal;
};

export type ExerciseTrendPoint = {
  dateKey: string;
  dateLabel: string;
  e1RM: number;
  volume: number;
  maxWeight: number;
  maxReps: number;
};

export type SessionPersonalRecord = {
  exerciseId: string;
  exerciseName: string;
  type: PersonalRecordKind;
  value: number;
  unit: WeightUnit;
};

const emptyProgramDays: WorkoutDayTemplate[] = [];
const emptyWorkoutSets: WorkoutSet[] = [];
const emptyPlannedExercises: PlannedExercise[] = [];
const emptyProgramEditorDays: ProgramEditorDay[] = [];
const emptyCompletedSessions: WorkoutSession[] = [];
const emptyEarnedAchievementIds: string[] = [];
const emptyCompletedWorkouts: CompletedWorkoutSummary[] = [];
const emptyProgressionSuggestions: ProgressionSuggestionSummary[] = [];
const emptyLastExerciseReferences: LastExerciseReference[] = [];
const emptyPersonalRecords: ExercisePersonalRecords[] = [];
const emptyExerciseHistoryOptions: ExerciseHistoryOption[] = [];
const emptyExerciseTrend: ExerciseTrendPoint[] = [];
const emptySessionPersonalRecords: SessionPersonalRecord[] = [];
const emptyExerciseLibrary: ExerciseLibraryItem[] = [];

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

export const selectAllCompletedSessions = createSelector([selectWorkoutSessions], (workoutSessions) => {
  const completed = Object.values(workoutSessions)
    .filter((session) => session.status === 'completed')
    .sort((a, b) => getSessionStartedAtTime(a) - getSessionStartedAtTime(b));

  return completed.length > 0 ? completed : emptyCompletedSessions;
});
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
      (day): day is WorkoutDayTemplate =>
        Boolean(day) && day.programId === program.id && !day.isArchived
    )
    .sort((a, b) => a.order - b.order);

const getProgramExercisesForDay = (
  programExercises: WorkoutState['programExercises'],
  workoutDayTemplateId: string
) =>
  Object.values(programExercises)
    .filter(
      (programExercise) =>
        programExercise.workoutDayTemplateId === workoutDayTemplateId &&
        !programExercise.isArchived
    )
    .sort((a, b) => a.order - b.order);

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
  if (!day || day.isArchived) {
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


export const selectActiveWorkoutSession = createSelector(
  [selectActiveWorkoutSessionId, selectWorkoutSessions],
  (activeWorkoutSessionId, workoutSessions) =>
    activeWorkoutSessionId ? workoutSessions[activeWorkoutSessionId] ?? null : null
);

export const selectActiveProgram = createSelector(
  [selectActiveWorkoutSession, selectPrograms],
  (activeSession, programs) =>
    activeSession?.programId ? programs[activeSession.programId] ?? null : null
);

export const selectProgramSummaries = createSelector(
  [selectPrograms, selectWorkoutDayTemplates, selectProgramExercises],
  (programs, workoutDayTemplates, programExercises): ProgramSummary[] =>
    Object.values(programs)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map((program) => {
        const days = getProgramDays(workoutDayTemplates, program);

        return {
          id: program.id,
          name: program.name,
          dayCount: days.length,
          exerciseCount: days.reduce(
            (total, day) => total + getProgramExercisesForDay(programExercises, day.id).length,
            0
          ),
        };
      })
);

export const selectProgramById = (state: RootState, programId: string) =>
  state.workout.programs[programId] ?? null;

const selectProgramIdParam = (_state: RootState, programId: string) => programId;

export const selectProgramDaysByProgramId = createSelector(
  [selectPrograms, selectWorkoutDayTemplates, selectProgramIdParam],
  (programs, workoutDayTemplates, programId) => {
    const program = programs[programId];

    if (!program) {
      return emptyProgramDays;
    }

    return getProgramDays(workoutDayTemplates, program);
  }
);

export const selectProgramEditorDaysByProgramId = createSelector(
  [selectPrograms, selectWorkoutDayTemplates, selectProgramExercises, selectExercises, selectProgramIdParam],
  (programs, workoutDayTemplates, programExercises, exercises, programId): ProgramEditorDay[] => {
    const program = programs[programId];

    if (!program) {
      return emptyProgramEditorDays;
    }

    const days = getProgramDays(workoutDayTemplates, program);

    if (days.length === 0) {
      return emptyProgramEditorDays;
    }

    return days.map((day) => ({
      day,
      exercises: getProgramExercisesForDay(programExercises, day.id).map((programExercise) => {
        const exercise = exercises[programExercise.exerciseId];

        return {
          programExercise,
          exerciseName: exercise?.name ?? 'Exercise',
          unit: exercise?.defaultUnit ?? 'kg',
        };
      }),
    }));
  }
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
    selectAllCompletedSessions,
    selectActiveWorkoutSession,
    selectProgressionRules,
  ],
  (
    activeDay,
    programExercises,
    exercises,
    workoutSets,
    completedSessions,
    allCompletedSessions,
    activeSession,
    progressionRules
  ): PlannedExercise[] => {
    if (isFreestyleSession(activeSession)) {
      const freestyle = getFreestyleExerciseData({
        session: activeSession,
        exercises,
        completedSessions: allCompletedSessions,
        workoutSets,
      }).map(
        ({ exercise, programExercise, lastPerformance }): PlannedExercise => ({
          programExercise,
          exerciseName: exercise.name,
          unit: exercise.defaultUnit,
          progressionSuggestion: lastPerformance
            ? `Last time: ${formatWorkoutSetsSummary(lastPerformance.sets)}`
            : 'Log your sets to start tracking.',
          isFreestyle: true,
        })
      );

      return freestyle.length > 0 ? freestyle : emptyPlannedExercises;
    }

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
    selectAllCompletedSessions,
    selectActiveWorkoutSession,
    selectExercises,
    selectProgressionRules,
  ],
  (
    activeDay,
    programExercises,
    workoutSets,
    completedSessions,
    allCompletedSessions,
    activeSession,
    exercises,
    progressionRules
  ): LastExerciseReference[] => {
    if (isFreestyleSession(activeSession)) {
      const references = getFreestyleExerciseData({
        session: activeSession,
        exercises,
        completedSessions: allCompletedSessions,
        workoutSets,
      })
        .map(({ programExercise, lastPerformance }): LastExerciseReference | null => {
          if (!lastPerformance) {
            return null;
          }

          const suggestedSets = getFreestyleSuggestedSets(lastPerformance.sets);

          return {
            programExerciseId: programExercise.id,
            exerciseId: programExercise.exerciseId,
            dateLabel: getDateLabel(new Date(lastPerformance.session.startedAt)),
            setsLabel: formatWorkoutSetsSummary(lastPerformance.sets),
            bestSetLabel: formatWorkoutSet(getBestSet(lastPerformance.sets)),
            suggestion: `Prefilled from ${getDateLabel(
              new Date(lastPerformance.session.startedAt)
            )}`,
            suggestedSets,
          };
        })
        .filter((reference): reference is LastExerciseReference => reference !== null);

      return references.length > 0 ? references : emptyLastExerciseReferences;
    }

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
  activeSessionSets.reduce((total, set) => total + getSetVolume(set), 0)
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
        detail: `${getTargetRangeLabel(programExercise)} planned.`,
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
        : `Top set ${formatWorkoutSet(topSet)}, e1RM ${estimatedOneRepMax.toFixed(
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

    const muscleGroup = exercises[plannedExercise.programExercise.exerciseId]?.muscleGroups?.[0];

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

  if (completedTargetSets.every((set) => getSetWorkAmount(set) >= getTargetMax(programExercise))) {
    return getTrackingMode(programExercise) === 'time'
      ? 'All target sets reached the top time target.'
      : 'All target sets reached the top rep target.';
  }

  if (completedTargetSets.every((set) => getSetWorkAmount(set) >= getTargetMin(programExercise))) {
    return 'Target range completed.';
  }

  return getTrackingMode(programExercise) === 'time'
    ? 'Repeat until target time is consistent.'
    : 'Repeat the load until target reps are consistent.';
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
          Boolean(exercises[set.exerciseId]?.muscleGroups?.includes(muscleGroup)) &&
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

// --- Freestyle (program-less) session support -------------------------------
// Freestyle sessions have no ProgramExercise rows. We synthesise lightweight
// ProgramExercise objects (id `freestyle:<exerciseId>`) so the existing logging
// screen and selectors can treat them uniformly. Their sets are logged with no
// `programExerciseId`, so history matches by `exerciseId` instead.

const FREESTYLE_PROGRAM_EXERCISE_PREFIX = 'freestyle:';

export const isFreestyleSession = (session: WorkoutSession | null) =>
  Boolean(session && !session.workoutDayTemplateId);

// Freestyle is make-your-own-rules: no predetermined set count or rep target.
// `targetSets: 0` makes the screen show "Set N" (no "of M"), hide the progress
// bar, and skip auto-advance. Prefill still flows from the references selector.
const createFreestyleProgramExercise = (
  exercise: WorkoutState['exercises'][string],
  index: number
): ProgramExercise => ({
  id: `${FREESTYLE_PROGRAM_EXERCISE_PREFIX}${exercise.id}`,
  workoutDayTemplateId: '',
  exerciseId: exercise.id,
  order: index,
  targetSets: 0,
  trackingMode: exercise.trackingMode ?? 'reps',
  trainingGoal: exercise.trainingGoal,
});

// Prefill straight from the last performance (no progression transform) so a
// repeated/ad-hoc exercise shows exactly what was lifted last time.
const getFreestyleSuggestedSets = (sets: WorkoutSet[]): SuggestedWorkoutSet[] =>
  sets.map((set) => ({
    weight: set.weight,
    unit: set.unit,
    ...(set.durationSeconds !== undefined
      ? { durationSeconds: set.durationSeconds }
      : { reps: set.reps ?? 0 }),
  }));

type FreestyleExerciseData = {
  exercise: WorkoutState['exercises'][string];
  programExercise: ProgramExercise;
  lastPerformance: { session: WorkoutSession; sets: WorkoutSet[] } | null;
};

const getFreestyleExerciseData = ({
  session,
  exercises,
  completedSessions,
  workoutSets,
}: {
  session: WorkoutSession | null;
  exercises: WorkoutState['exercises'];
  completedSessions: WorkoutSession[];
  workoutSets: WorkoutState['workoutSets'];
}): FreestyleExerciseData[] =>
  (session?.exerciseIds ?? [])
    .map((exerciseId, index) => {
      const exercise = exercises[exerciseId];

      if (!exercise) {
        return null;
      }

      const lastPerformance = getMostRecentCompletedSetsForExercise({
        completedSessions,
        exerciseId,
        workoutSets,
      });

      return {
        exercise,
        programExercise: createFreestyleProgramExercise(exercise, index),
        lastPerformance,
      };
    })
    .filter((data): data is FreestyleExerciseData => data !== null);

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
  const previousTargetSets = sets.slice(-targetSetCount);
  const lastSet = previousTargetSets[previousTargetSets.length - 1] ?? sets[sets.length - 1];
  const fallbackWeight = lastSet?.weight ?? programExercise.targetWeight ?? 0;
  const fallbackUnit = lastSet?.unit ?? 'kg';
  const trackingMode = getTrackingMode(programExercise);
  const normalizedSets = Array.from({ length: targetSetCount }, (_, index) => {
    const previousSet =
      previousTargetSets[index] ??
      previousTargetSets[previousTargetSets.length - 1] ??
      lastSet;

    const suggestedSet: SuggestedWorkoutSet = {
      weight: previousSet?.weight ?? fallbackWeight,
      unit: previousSet?.unit ?? fallbackUnit,
    };

    if (trackingMode === 'time') {
      suggestedSet.durationSeconds = normalizeSuggestedDuration(
        previousSet?.durationSeconds ?? programExercise.targetSecondsMin ?? 30,
        programExercise
      );
    } else {
      suggestedSet.reps = normalizeSuggestedReps(
        previousSet?.reps ?? programExercise.targetRepMin ?? 1,
        programExercise
      );
    }

    return suggestedSet;
  });

  if (trackingMode === 'time') {
    return getTimeSuggestedSets(programExercise, normalizedSets, previousTargetSets);
  }

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
  Math.min(getTargetMax(programExercise), Math.max(getTargetMin(programExercise), Math.round(reps)));

const normalizeSuggestedDuration = (durationSeconds: number, programExercise: ProgramExercise) =>
  Math.min(
    getTargetMax(programExercise),
    Math.max(getTargetMin(programExercise), Math.round(durationSeconds))
  );

const getTimeSuggestedSets = (
  programExercise: ProgramExercise,
  normalizedSets: SuggestedWorkoutSet[],
  previousTargetSets: WorkoutSet[]
) => {
  const hadBelowMinimum =
    previousTargetSets.length < programExercise.targetSets ||
    previousTargetSets.some((set) => getSetWorkAmount(set) < getTargetMin(programExercise));

  if (hadBelowMinimum) {
    return normalizedSets;
  }

  const lowestDuration = Math.min(
    ...normalizedSets.map((set) => set.durationSeconds ?? getTargetMin(programExercise))
  );
  const setIndexToProgress = normalizedSets.findIndex(
    (set) =>
      (set.durationSeconds ?? getTargetMin(programExercise)) === lowestDuration &&
      lowestDuration < getTargetMax(programExercise)
  );

  if (setIndexToProgress === -1) {
    return normalizedSets;
  }

  return normalizedSets.map((set, index) =>
    index === setIndexToProgress
      ? {
          ...set,
          durationSeconds: Math.min(getTargetMax(programExercise), lowestDuration + 5),
        }
      : set
  );
};

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
    reps: getTargetMin(programExercise),
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
    previousTargetSets.some((set) => getSetWorkAmount(set) < getTargetMin(programExercise));

  if (hadBelowMinimum) {
    return normalizedSets;
  }

  const lowestReps = Math.min(...normalizedSets.map((set) => set.reps ?? getTargetMin(programExercise)));
  const setIndexToProgress = normalizedSets.findIndex(
    (set) =>
      (set.reps ?? getTargetMin(programExercise)) === lowestReps &&
      lowestReps < getTargetMax(programExercise)
  );

  if (setIndexToProgress === -1) {
    return normalizedSets;
  }

  return normalizedSets.map((set, index) =>
    index === setIndexToProgress
      ? { ...set, reps: Math.min(getTargetMax(programExercise), lowestReps + 1) }
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
    reps: getTargetMin(programExercise),
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
  const sameSuggestedWork = suggestedSets.every(
    (set) => getSetWorkLabel(set) === getSetWorkLabel(firstSuggestedSet)
  );
  const sameWeightAsLastTime =
    sameSuggestedWeight &&
    lastSets.length > 0 &&
    lastSets.every(
      (set) => set.weight === firstSuggestedSet.weight && set.unit === firstSuggestedSet.unit
    );

  if (sameSuggestedWeight && sameSuggestedWork && sameWeightAsLastTime) {
    return `Try ${getSetWorkLabel(firstSuggestedSet)} on all sets`;
  }

  if (sameSuggestedWeight && sameSuggestedWork) {
    return `Try ${formatWeight(firstSuggestedSet.weight, firstSuggestedSet.unit)} x ${getSetWorkLabel(
      firstSuggestedSet
    )} on all sets`;
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

  if (didHitTopRepTarget(programExercise, relevantSets, getTargetMax(programExercise))) {
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

const didHitTopRepTarget = (
  programExercise: ProgramExercise,
  relevantSets: WorkoutSet[],
  repMax: number
) => {
  const completedTargetSets = relevantSets.slice(-programExercise.targetSets);

  return (
    completedTargetSets.length >= programExercise.targetSets &&
    completedTargetSets.every((set) => getSetWorkAmount(set) >= repMax)
  );
};

const didMissBottomRepTarget = (
  programExercise: ProgramExercise,
  relevantSets: WorkoutSet[]
) => {
  const completedTargetSets = relevantSets.slice(-programExercise.targetSets);

  return (
    completedTargetSets.length >= programExercise.targetSets &&
    completedTargetSets.some((set) => getSetWorkAmount(set) < getTargetMin(programExercise))
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

// ---------------------------------------------------------------------------
// Progressive-overload analytics (Stats screen)
// ---------------------------------------------------------------------------

const ACTIVITY_WEEKS = 17;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const selectExerciseIdParam = (_state: RootState, exerciseId: string) => exerciseId;

/** All completed sessions across every program, oldest first. */
const countConsecutiveDaysBack = (start: Date, workoutDayKeys: Set<string>) => {
  let streak = 0;
  const cursor = new Date(start);

  while (workoutDayKeys.has(toLocalDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
};

export const selectWorkoutActivity = createSelector(
  [selectAllCompletedSessions],
  (sessions): WorkoutActivity => {
    const dayCounts = new Map<string, number>();

    sessions.forEach((session) => {
      const key = toLocalDateKey(new Date(session.startedAt));
      dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1);
    });

    const workoutDayKeys = new Set(dayCounts.keys());

    // Current streak: count back from today, or from yesterday if today is a rest day.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const currentStreak = workoutDayKeys.has(toLocalDateKey(today))
      ? countConsecutiveDaysBack(today, workoutDayKeys)
      : countConsecutiveDaysBack(yesterday, workoutDayKeys);

    // Longest streak across all worked days.
    const sortedDayTimes = [...workoutDayKeys]
      .map((key) => getDateFromLocalKey(key).getTime())
      .sort((a, b) => a - b);
    let longestStreak = 0;
    let run = 0;
    let previousTime: number | null = null;
    sortedDayTimes.forEach((time) => {
      run = previousTime !== null && Math.round((time - previousTime) / MS_PER_DAY) === 1 ? run + 1 : 1;
      longestStreak = Math.max(longestStreak, run);
      previousTime = time;
    });

    // Calendar grid: whole weeks (Sun start) ending with the current week's Saturday.
    const endOfWeek = new Date(today);
    endOfWeek.setDate(endOfWeek.getDate() + (6 - endOfWeek.getDay()));
    const gridStart = new Date(endOfWeek);
    gridStart.setDate(gridStart.getDate() - (ACTIVITY_WEEKS * 7 - 1));

    const days: WorkoutActivityDay[] = [];
    const cursor = new Date(gridStart);
    while (cursor <= endOfWeek) {
      const dateKey = toLocalDateKey(cursor);
      days.push({
        dateKey,
        count: dayCounts.get(dateKey) ?? 0,
        isFuture: cursor.getTime() > today.getTime(),
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    return {
      currentStreak,
      longestStreak,
      totalWorkouts: sessions.length,
      days,
    };
  }
);

/** Which PR kinds each analytics category surfaces. Untracked shows none. */
const recordKindsByCategory: Record<TrainingGoal, PersonalRecordKind[]> = {
  strength: ['weight', 'e1RM'],
  hypertrophy: ['volume', 'reps'],
  power: ['weight'],
  untracked: [],
};

type MetricBests = Record<PersonalRecordKind, { value: number; time: number }>;
type RecordAccumulator = { exerciseId: string; unit: WeightUnit; bests: MetricBests };

const getSetMetrics = (set: WorkoutSet): Record<PersonalRecordKind, number> => ({
  weight: set.weight,
  e1RM: getEstimatedOneRepMax(set),
  volume: getSetVolume(set),
  reps: set.reps ?? 0,
});

const recordKinds: PersonalRecordKind[] = ['weight', 'e1RM', 'volume', 'reps'];

export const selectExerciseLibrary = createSelector([selectExercises], (exercises) => {
  const items = Object.values(exercises)
    .filter((exercise) => !exercise.isArchived)
    .map(
      (exercise): ExerciseLibraryItem => ({
        id: exercise.id,
        name: exercise.name,
        muscleGroups: exercise.muscleGroups,
        defaultUnit: exercise.defaultUnit,
        trainingGoal: exercise.trainingGoal ?? 'strength',
        trackingMode: exercise.trackingMode ?? 'reps',
      })
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  return items.length > 0 ? items : emptyExerciseLibrary;
});

export const selectExerciseById = (state: RootState, exerciseId: string) =>
  state.workout.exercises[exerciseId] ?? null;

export const selectLastCreatedExerciseId = (state: RootState) =>
  state.workout.lastCreatedExerciseId ?? null;

export const selectPersonalRecords = createSelector(
  [selectAllCompletedSessions, selectWorkoutSetsById, selectExercises],
  (sessions, workoutSets, exercises): ExercisePersonalRecords[] => {
    const byExercise = new Map<string, RecordAccumulator>();

    sessions.forEach((session) => {
      const time = getSessionStartedAtTime(session);

      getSessionSets(session, workoutSets).forEach((set) => {
        const metrics = getSetMetrics(set);
        const current = byExercise.get(set.exerciseId);

        if (!current) {
          byExercise.set(set.exerciseId, {
            exerciseId: set.exerciseId,
            unit: set.unit,
            bests: {
              weight: { value: metrics.weight, time },
              e1RM: { value: metrics.e1RM, time },
              volume: { value: metrics.volume, time },
              reps: { value: metrics.reps, time },
            },
          });
          return;
        }

        recordKinds.forEach((kind) => {
          if (metrics[kind] > current.bests[kind].value) {
            current.bests[kind] = { value: metrics[kind], time };
            if (kind === 'weight') {
              current.unit = set.unit;
            }
          }
        });
      });
    });

    const result: ExercisePersonalRecords[] = [];
    byExercise.forEach((acc) => {
      const category = exercises[acc.exerciseId]?.trainingGoal ?? 'strength';
      const kinds = recordKindsByCategory[category];

      if (kinds.length === 0) {
        return; // untracked — no analytics
      }

      result.push({
        exerciseId: acc.exerciseId,
        exerciseName: exercises[acc.exerciseId]?.name ?? 'Exercise',
        unit: acc.unit,
        category,
        records: kinds.map((kind) => ({
          kind,
          value: Math.round(acc.bests[kind].value),
          dateLabel: getDateLabel(new Date(acc.bests[kind].time)),
        })),
        lastRecordTime: Math.max(...kinds.map((kind) => acc.bests[kind].time)),
      });
    });

    return result.length > 0
      ? result.sort((a, b) => b.lastRecordTime - a.lastRecordTime)
      : emptyPersonalRecords;
  }
);

export const selectExercisesWithHistory = createSelector(
  [selectAllCompletedSessions, selectWorkoutSetsById, selectExercises],
  (sessions, workoutSets, exercises): ExerciseHistoryOption[] => {
    const sessionCounts = new Map<string, number>();

    sessions.forEach((session) => {
      const exerciseIds = new Set(
        getSessionSets(session, workoutSets).map((set) => set.exerciseId)
      );
      exerciseIds.forEach((exerciseId) => {
        sessionCounts.set(exerciseId, (sessionCounts.get(exerciseId) ?? 0) + 1);
      });
    });

    const options = [...sessionCounts.entries()]
      .map(([exerciseId, sessionCount]) => ({
        exerciseId,
        exerciseName: exercises[exerciseId]?.name ?? 'Exercise',
        sessionCount,
        category: exercises[exerciseId]?.trainingGoal ?? 'strength',
      }))
      .filter((option) => option.category !== 'untracked')
      .sort((a, b) => b.sessionCount - a.sessionCount);

    return options.length > 0 ? options : emptyExerciseHistoryOptions;
  }
);

export const selectExerciseTrend = createSelector(
  [selectAllCompletedSessions, selectWorkoutSetsById, selectExerciseIdParam],
  (sessions, workoutSets, exerciseId): ExerciseTrendPoint[] => {
    const points: ExerciseTrendPoint[] = [];

    sessions.forEach((session) => {
      const sets = getSessionSets(session, workoutSets).filter(
        (set) => set.exerciseId === exerciseId
      );

      if (sets.length === 0) {
        return;
      }

      const date = new Date(session.startedAt);
      points.push({
        dateKey: toLocalDateKey(date),
        dateLabel: getDateLabel(date),
        e1RM: Math.round(Math.max(...sets.map(getEstimatedOneRepMax))),
        volume: sets.reduce((total, set) => total + getSetVolume(set), 0),
        maxWeight: Math.max(...sets.map((set) => set.weight)),
        maxReps: Math.max(...sets.map((set) => set.reps ?? 0)),
      });
    });

    return points.length > 0 ? points : emptyExerciseTrend;
  }
);

export const selectActiveSessionPersonalRecords = createSelector(
  [selectActiveWorkoutSession, selectWorkoutSessions, selectWorkoutSetsById, selectExercises],
  (activeSession, workoutSessions, workoutSets, exercises): SessionPersonalRecord[] => {
    if (!activeSession) {
      return emptySessionPersonalRecords;
    }

    const activeSets = getSessionSets(activeSession, workoutSets);

    if (activeSets.length === 0) {
      return emptySessionPersonalRecords;
    }

    const emptyBests = (): Record<PersonalRecordKind, number> => ({
      weight: 0,
      e1RM: 0,
      volume: 0,
      reps: 0,
    });

    // Prior bests per exercise from all OTHER completed sessions.
    const priorBests = new Map<string, Record<PersonalRecordKind, number>>();
    Object.values(workoutSessions)
      .filter((session) => session.status === 'completed' && session.id !== activeSession.id)
      .forEach((session) => {
        getSessionSets(session, workoutSets).forEach((set) => {
          const metrics = getSetMetrics(set);
          const prior = priorBests.get(set.exerciseId) ?? emptyBests();
          recordKinds.forEach((kind) => {
            prior[kind] = Math.max(prior[kind], metrics[kind]);
          });
          priorBests.set(set.exerciseId, prior);
        });
      });

    // Best of this session per exercise.
    const activeBests = new Map<string, Record<PersonalRecordKind, number> & { unit: WeightUnit }>();
    activeSets.forEach((set) => {
      const metrics = getSetMetrics(set);
      const current = activeBests.get(set.exerciseId) ?? { ...emptyBests(), unit: set.unit };
      recordKinds.forEach((kind) => {
        current[kind] = Math.max(current[kind], metrics[kind]);
      });
      current.unit = set.unit;
      activeBests.set(set.exerciseId, current);
    });

    const records: SessionPersonalRecord[] = [];
    activeBests.forEach((best, exerciseId) => {
      const prior = priorBests.get(exerciseId);

      // Require prior history so the first time an exercise is logged isn't all-PRs.
      if (!prior) {
        return;
      }

      const category = exercises[exerciseId]?.trainingGoal ?? 'strength';
      const exerciseName = exercises[exerciseId]?.name ?? 'Exercise';

      recordKindsByCategory[category].forEach((kind) => {
        if (best[kind] > prior[kind]) {
          records.push({
            exerciseId,
            exerciseName,
            type: kind,
            value: Math.round(best[kind]),
            unit: best.unit,
          });
        }
      });
    });

    return records.length > 0 ? records : emptySessionPersonalRecords;
  }
);

// --- Workout history, session detail & training analytics -------------------

export type WorkoutHistoryItem = CompletedWorkoutSummary & {
  isFreestyle: boolean;
};

export type SessionExerciseGroup = {
  exerciseId: string;
  exerciseName: string;
  muscleGroups?: MuscleGroup[];
  unit: WeightUnit;
  setsLabel: string;
  bestSetLabel: string;
  setCount: number;
  volume: number;
};

export type MuscleGroupBreakdownItem = {
  muscleGroup: MuscleGroup;
  label: string;
  sets: number;
  volume: number;
};

export type TrainingFocusKind = 'strength' | 'hypertrophy' | 'power';

export type TrainingFocusItem = {
  goal: TrainingFocusKind;
  label: string;
  sets: number;
  share: number;
};

export type TrainingFocusBreakdown = {
  items: TrainingFocusItem[];
  dominant: TrainingFocusItem | null;
  verdict: string;
};

export type SessionDetail = {
  id: string;
  name: string;
  dateLabel: string;
  totalSets: number;
  totalVolume: number;
  durationSeconds: number;
  isFreestyle: boolean;
  exercises: SessionExerciseGroup[];
  muscleGroups: MuscleGroupBreakdownItem[];
  focus: TrainingFocusBreakdown;
};

const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  core: 'Core',
  full_body: 'Full body',
};

const TRAINING_FOCUS_LABELS: Record<TrainingFocusKind, string> = {
  strength: 'Strength',
  hypertrophy: 'Hypertrophy',
  power: 'Power',
};

const emptyMuscleGroupBreakdown: MuscleGroupBreakdownItem[] = [];
const emptyTrainingFocus: TrainingFocusBreakdown = { items: [], dominant: null, verdict: '' };
const emptyWorkoutHistory: WorkoutHistoryItem[] = [];
const emptySessionExerciseGroups: SessionExerciseGroup[] = [];

// A set's training goal comes from its ProgramExercise when logged in a program,
// otherwise from the exercise definition (the freestyle / library default).
const getSetTrainingGoal = (
  set: WorkoutSet,
  exercises: WorkoutState['exercises'],
  programExercises: WorkoutState['programExercises']
): TrainingGoal | undefined =>
  (set.programExerciseId ? programExercises[set.programExerciseId]?.trainingGoal : undefined) ??
  exercises[set.exerciseId]?.trainingGoal;

const getMuscleGroupBreakdown = (
  sets: WorkoutSet[],
  exercises: WorkoutState['exercises']
): MuscleGroupBreakdownItem[] => {
  const totals = new Map<MuscleGroup, { sets: number; volume: number }>();

  sets.forEach((set) => {
    const setMuscleGroups = exercises[set.exerciseId]?.muscleGroups;

    if (!setMuscleGroups || setMuscleGroups.length === 0) {
      return;
    }

    // Credit the set to every muscle group the exercise targets.
    setMuscleGroups.forEach((muscleGroup) => {
      const entry = totals.get(muscleGroup) ?? { sets: 0, volume: 0 };

      entry.sets += 1;
      entry.volume += getSetVolume(set);
      totals.set(muscleGroup, entry);
    });
  });

  const items = [...totals.entries()]
    .map(([muscleGroup, entry]) => ({
      muscleGroup,
      label: MUSCLE_GROUP_LABELS[muscleGroup],
      sets: entry.sets,
      volume: Math.round(entry.volume),
    }))
    .sort((a, b) => b.sets - a.sets || b.volume - a.volume);

  return items.length > 0 ? items : emptyMuscleGroupBreakdown;
};

const getTrainingFocusBreakdown = (
  sets: WorkoutSet[],
  exercises: WorkoutState['exercises'],
  programExercises: WorkoutState['programExercises']
): TrainingFocusBreakdown => {
  const counts: Record<TrainingFocusKind, number> = { strength: 0, hypertrophy: 0, power: 0 };
  let classified = 0;

  sets.forEach((set) => {
    const goal = getSetTrainingGoal(set, exercises, programExercises);

    if (goal === 'strength' || goal === 'hypertrophy' || goal === 'power') {
      counts[goal] += 1;
      classified += 1;
    }
  });

  if (classified === 0) {
    return emptyTrainingFocus;
  }

  const items = (Object.keys(counts) as TrainingFocusKind[])
    .map((goal) => ({
      goal,
      label: TRAINING_FOCUS_LABELS[goal],
      sets: counts[goal],
      share: counts[goal] / classified,
    }))
    .filter((item) => item.sets > 0)
    .sort((a, b) => b.sets - a.sets);

  const dominant = items[0] ?? null;

  return {
    items,
    dominant,
    verdict: dominant ? `${Math.round(dominant.share * 100)}% ${dominant.label.toLowerCase()} focus` : '',
  };
};

const getSessionExerciseGroups = (
  sets: WorkoutSet[],
  exercises: WorkoutState['exercises']
): SessionExerciseGroup[] => {
  const order: string[] = [];
  const groups = new Map<string, WorkoutSet[]>();

  sets.forEach((set) => {
    const group = groups.get(set.exerciseId);

    if (group) {
      group.push(set);
    } else {
      groups.set(set.exerciseId, [set]);
      order.push(set.exerciseId);
    }
  });

  if (order.length === 0) {
    return emptySessionExerciseGroups;
  }

  return order.map((exerciseId) => {
    const exercise = exercises[exerciseId];
    const groupSets = groups.get(exerciseId) ?? [];

    return {
      exerciseId,
      exerciseName: exercise?.name ?? 'Exercise',
      muscleGroups: exercise?.muscleGroups,
      unit: exercise?.defaultUnit ?? 'kg',
      setsLabel: formatWorkoutSetsSummary(groupSets),
      bestSetLabel: groupSets.length > 0 ? formatWorkoutSet(getBestSet(groupSets)) : '',
      setCount: groupSets.length,
      volume: Math.round(groupSets.reduce((total, set) => total + getSetVolume(set), 0)),
    };
  });
};

export const selectWorkoutHistory = createSelector(
  [selectAllCompletedSessions, selectWorkoutSetsById],
  (completedSessions, workoutSets): WorkoutHistoryItem[] => {
    if (completedSessions.length === 0) {
      return emptyWorkoutHistory;
    }

    return [...completedSessions]
      .sort((a, b) => getSessionStartedAtTime(b) - getSessionStartedAtTime(a))
      .map((session) => {
        const summary = getSessionSummary(session, workoutSets);

        return {
          id: session.id,
          name: session.name,
          dateLabel: getDateLabel(new Date(session.startedAt)),
          sets: summary.sets,
          volume: summary.volume,
          durationSeconds: summary.durationSeconds,
          isFreestyle: !session.workoutDayTemplateId,
        };
      });
  }
);

const selectSessionIdParam = (_state: RootState, sessionId: string) => sessionId;

export const selectSessionDetailById = createSelector(
  [
    selectWorkoutSessions,
    selectWorkoutSetsById,
    selectExercises,
    selectProgramExercises,
    selectSessionIdParam,
  ],
  (workoutSessions, workoutSets, exercises, programExercises, sessionId): SessionDetail | null => {
    const session = workoutSessions[sessionId];

    if (!session) {
      return null;
    }

    const sets = getSessionSets(session, workoutSets);
    const summary = getSessionSummary(session, workoutSets);

    return {
      id: session.id,
      name: session.name,
      dateLabel: getDateLabel(new Date(session.startedAt)),
      totalSets: summary.sets,
      totalVolume: summary.volume,
      durationSeconds: summary.durationSeconds,
      isFreestyle: !session.workoutDayTemplateId,
      exercises: getSessionExerciseGroups(sets, exercises),
      muscleGroups: getMuscleGroupBreakdown(sets, exercises),
      focus: getTrainingFocusBreakdown(sets, exercises, programExercises),
    };
  }
);

export const selectActiveSessionMuscleGroups = createSelector(
  [selectActiveSessionSets, selectExercises],
  (sets, exercises): MuscleGroupBreakdownItem[] => getMuscleGroupBreakdown(sets, exercises)
);

export const selectActiveSessionFocus = createSelector(
  [selectActiveSessionSets, selectExercises, selectProgramExercises],
  (sets, exercises, programExercises): TrainingFocusBreakdown =>
    getTrainingFocusBreakdown(sets, exercises, programExercises)
);

// --- Strength level (profile + standards) -----------------------------------

export type StrengthLevel = {
  exerciseId: string;
  exerciseName: string;
  lift: StandardLiftKey;
  e1RM: number;
  unit: WeightUnit;
  band: StrengthBand;
  bandLabel: string;
  percentileLabel: string;
};

export type StrengthProfileState = {
  profile: UserProfile | null;
  isComplete: boolean;
  levels: StrengthLevel[];
  /** Highest band the lifter has reached across their standard lifts. */
  topBand: StrengthBand | null;
  /** Overall account title, e.g. "Intermediate Lifter". */
  title: string | null;
};

const emptyStrengthLevels: StrengthLevel[] = [];

const selectProfileState = (state: RootState): UserProfile | null => state.workout.profile ?? null;

export const selectStrengthProfile = createSelector(
  [selectProfileState, selectExercises, selectAllCompletedSessions, selectWorkoutSetsById],
  (profile, exercises, sessions, workoutSets): StrengthProfileState => {
    const isComplete = Boolean(profile?.bodyweightKg && profile.sex);

    if (!isComplete || !profile?.bodyweightKg || !profile.sex) {
      return { profile, isComplete: false, levels: emptyStrengthLevels, topBand: null, title: null };
    }

    // Best e1RM per standard-lift exercise across all completed sessions.
    const bestById = new Map<string, number>();

    sessions.forEach((session) => {
      getSessionSets(session, workoutSets).forEach((set) => {
        if (!exercises[set.exerciseId]?.standardLift) {
          return;
        }

        const e1RM = getEstimatedOneRepMax(set);

        bestById.set(set.exerciseId, Math.max(bestById.get(set.exerciseId) ?? 0, e1RM));
      });
    });

    const levels: StrengthLevel[] = [...bestById.entries()]
      .map(([exerciseId, e1RM]) => {
        const exercise = exercises[exerciseId];
        const lift = exercise?.standardLift;

        if (!exercise || !lift) {
          return null;
        }

        const classification = classifyLift({
          e1RM,
          bodyweightKg: profile.bodyweightKg as number,
          sex: profile.sex as NonNullable<UserProfile['sex']>,
          lift,
        });

        return {
          exerciseId,
          exerciseName: STANDARD_LIFT_LABELS[lift] ?? exercise.name,
          lift,
          e1RM: Math.round(e1RM),
          unit: exercise.defaultUnit,
          band: classification.band,
          bandLabel: classification.bandLabel,
          percentileLabel: classification.percentileLabel,
        };
      })
      .filter((level): level is StrengthLevel => level !== null)
      .sort(
        (a, b) =>
          STRENGTH_BAND_ORDER.indexOf(b.band) - STRENGTH_BAND_ORDER.indexOf(a.band) ||
          b.e1RM - a.e1RM
      );

    const topBand =
      levels.length > 0
        ? levels.reduce<StrengthBand>(
            (best, level) =>
              STRENGTH_BAND_ORDER.indexOf(level.band) > STRENGTH_BAND_ORDER.indexOf(best)
                ? level.band
                : best,
            levels[0].band
          )
        : null;

    return {
      profile,
      isComplete: true,
      levels: levels.length > 0 ? levels : emptyStrengthLevels,
      topBand,
      title: topBand ? `${STRENGTH_BAND_LABELS[topBand]} Lifter` : null,
    };
  }
);

// --- Gamification: achievements ---------------------------------------------

export type AchievementView = {
  id: string;
  title: string;
  description: string;
  icon: IconName;
  isEarned: boolean;
  progress: number;
};

const selectEarnedAchievementIds = (state: RootState) =>
  state.workout.earnedAchievementIds ?? emptyEarnedAchievementIds;

export const selectAchievements = createSelector(
  [
    selectWorkoutActivity,
    selectPersonalRecords,
    selectAllCompletedSessions,
    selectWorkoutSetsById,
    selectExercises,
    selectStrengthProfile,
    selectEarnedAchievementIds,
  ],
  (activity, records, sessions, workoutSets, exercises, strength, earnedIds): AchievementView[] => {
    const earnedSet = new Set(earnedIds);
    const muscleGroups = new Set<MuscleGroup>();
    let bestSessionVolume = 0;
    let hasFreestyleWorkout = false;

    sessions.forEach((session) => {
      if (!session.workoutDayTemplateId) {
        hasFreestyleWorkout = true;
      }

      const sessionSets = getSessionSets(session, workoutSets);
      const volume = sessionSets.reduce((total, set) => total + getSetVolume(set), 0);

      bestSessionVolume = Math.max(bestSessionVolume, volume);
      sessionSets.forEach((set) => {
        exercises[set.exerciseId]?.muscleGroups?.forEach((muscleGroup) => {
          muscleGroups.add(muscleGroup);
        });
      });
    });

    const topBandIndex = strength.topBand ? STRENGTH_BAND_ORDER.indexOf(strength.topBand) : -1;

    const stats: AchievementStats = {
      totalWorkouts: activity.totalWorkouts,
      longestStreak: activity.longestStreak,
      personalRecordCount: records.reduce((total, record) => total + record.records.length, 0),
      bestSessionVolume,
      distinctMuscleGroups: muscleGroups.size,
      reachedAdvanced: topBandIndex >= STRENGTH_BAND_ORDER.indexOf('advanced'),
      reachedElite: topBandIndex >= STRENGTH_BAND_ORDER.indexOf('elite'),
      hasFreestyleWorkout,
    };

    return ACHIEVEMENTS.map((achievement) => {
      // Sticky: a badge stays earned once unlocked, even if the data behind it
      // is later deleted.
      const isEarned = earnedSet.has(achievement.id) || achievement.isEarned(stats);

      return {
        id: achievement.id,
        title: achievement.title,
        description: achievement.description,
        icon: achievement.icon,
        isEarned,
        progress: isEarned ? 1 : achievement.progress?.(stats) ?? 0,
      };
    });
  }
);
