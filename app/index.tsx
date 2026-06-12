import { ScrollView, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppButton } from '@/components/ui/app-button';
import { WorkoutAnalyticsSummary } from '@/components/workout/analytics-summary';
import {
  selectActiveProgram,
  selectActiveSessionDay,
  selectActiveWorkoutSession,
  selectCurrentProgramWeekSummary,
  selectHomePlannedExercises,
  selectHypertrophyFocusInsight,
  selectLastCompletedWorkouts,
  selectNextProgramDay,
  selectPowerFocusInsight,
  selectStrengthFocusInsight,
  selectTopProgressionSuggestions,
  selectTotalSets,
  selectTotalVolume,
} from '@/features/workouts/workout-selectors';
import { startWorkoutSession } from '@/features/workouts/workout-slice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { formatDuration } from '@/utils/workout-formatters';

const formatVolume = (volume: number) => `${volume.toLocaleString()} kg`;

export default function HomeScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const activeProgram = useAppSelector(selectActiveProgram);
  const activeSession = useAppSelector(selectActiveWorkoutSession);
  const activeDay = useAppSelector(selectActiveSessionDay);
  const nextProgramDay = useAppSelector(selectNextProgramDay);
  const plannedExercises = useAppSelector(selectHomePlannedExercises);
  const programWeekSummary = useAppSelector(selectCurrentProgramWeekSummary);
  const progressionSuggestions = useAppSelector(selectTopProgressionSuggestions);
  const strengthFocusInsight = useAppSelector(selectStrengthFocusInsight);
  const hypertrophyFocusInsight = useAppSelector(selectHypertrophyFocusInsight);
  const powerFocusInsight = useAppSelector(selectPowerFocusInsight);
  const recentWorkouts = useAppSelector(selectLastCompletedWorkouts);
  const activeWorkoutSets = useAppSelector(selectTotalSets);
  const activeWorkoutVolume = useAppSelector(selectTotalVolume);
  const hasActiveWorkout = activeSession !== null;
  const primaryActionTitle = hasActiveWorkout ? 'Continue Workout' : 'Start Next Workout';
  const goalFocusInsights = [
    { label: 'Strength', insight: strengthFocusInsight },
    { label: 'Hypertrophy', insight: hypertrophyFocusInsight },
    { label: 'Power', insight: powerFocusInsight },
  ];

  const startedAtLabel = activeSession
    ? new Date(activeSession.startedAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  const handleStartWorkout = () => {
    if (!activeProgram || !nextProgramDay) {
      return;
    }

    dispatch(
      startWorkoutSession({
        programId: activeProgram.id,
        workoutDayTemplateId: nextProgramDay.id,
      })
    );
    router.push('/start-workout' as Href);
  };

  return (
    <ThemedView className="flex-1">
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-6 px-6 py-8"
        showsVerticalScrollIndicator={false}>
        <View className="gap-2">
          <ThemedText type="title">Workout Tracker</ThemedText>
          <ThemedText className="opacity-70">
            {activeProgram?.name ?? 'No active program yet'}
          </ThemedText>
        </View>

        <ThemedView lightColor="#F3FAF8" darkColor="#1D2826" className="gap-4 rounded-xl p-5">
          <View className="gap-1">
            <ThemedText className="text-sm uppercase opacity-60">
              {hasActiveWorkout ? 'Workout in progress' : 'Ready to train'}
            </ThemedText>
            <ThemedText type="subtitle">
              {hasActiveWorkout
                ? activeDay?.name ?? activeSession.name
                : nextProgramDay?.name ?? 'No workout planned'}
            </ThemedText>
            <ThemedText className="opacity-70">
              {hasActiveWorkout && startedAtLabel
                ? `Started at ${startedAtLabel}`
                : activeProgram
                ? 'One tap starts the next program day.'
                : 'Create a program to start tracking workouts.'}
            </ThemedText>
          </View>

          <AppButton
            title={primaryActionTitle}
            className="min-h-16"
            disabled={!hasActiveWorkout && (!activeProgram || !nextProgramDay)}
            onPress={
              hasActiveWorkout
                ? () => router.push('/start-workout' as Href)
                : handleStartWorkout
            }
          />
        </ThemedView>

        <ThemedView lightColor="#F3FAF8" darkColor="#1D2826" className="gap-4 rounded-xl p-5">
          <View className="gap-1">
            <ThemedText type="subtitle">{hasActiveWorkout ? 'Current Workout' : 'Up Next'}</ThemedText>
            <ThemedText className="opacity-70">
              {hasActiveWorkout
                ? activeDay?.name ?? activeSession.name
                : nextProgramDay?.name ?? 'Next program day'}
            </ThemedText>
          </View>

          {hasActiveWorkout ? (
            <WorkoutAnalyticsSummary
              metrics={[
                { label: 'Sets', value: activeWorkoutSets },
                { label: 'Volume', value: formatVolume(activeWorkoutVolume) },
              ]}
            />
          ) : null}

          <View className="gap-3">
            {plannedExercises.length === 0 ? (
              <ThemedText className="opacity-70">No planned exercises yet.</ThemedText>
            ) : (
              plannedExercises.map((plannedExercise) => (
                <View
                  key={plannedExercise.programExercise.id}
                  className="flex-row justify-between gap-3">
                  <ThemedText className="flex-1">{plannedExercise.exerciseName}</ThemedText>
                  <ThemedText className="opacity-70">
                    {plannedExercise.programExercise.targetSets} x{' '}
                    {plannedExercise.programExercise.targetRepMin}-
                    {plannedExercise.programExercise.targetRepMax}
                  </ThemedText>
                </View>
              ))
            )}
          </View>
        </ThemedView>

        <ThemedView lightColor="#F3FAF8" darkColor="#1D2826" className="gap-4 rounded-xl p-5">
          <View className="gap-1">
            <ThemedText type="subtitle">Program Week Progress</ThemedText>
            <ThemedText className="opacity-70">
              Program Week {programWeekSummary.weekNumber} - {programWeekSummary.dateRangeLabel}
            </ThemedText>
          </View>

          <ThemedText type="defaultSemiBold">
            {programWeekSummary.completedWorkouts} / {programWeekSummary.plannedWorkouts} workouts
          </ThemedText>

          <WorkoutAnalyticsSummary
            metrics={[
              { label: 'Sets', value: programWeekSummary.totalSets },
              { label: 'Volume', value: formatVolume(programWeekSummary.totalVolume) },
            ]}
          />
          <WorkoutAnalyticsSummary
            metrics={[
              {
                label: 'Training Time',
                value: formatDuration(programWeekSummary.totalDurationSeconds),
              },
              { label: 'Planned Days', value: programWeekSummary.plannedWorkouts },
            ]}
          />
        </ThemedView>

        <ThemedView lightColor="#F3FAF8" darkColor="#1D2826" className="gap-4 rounded-xl p-5">
          <ThemedText type="subtitle">Goal-Aware Insight</ThemedText>
          <View className="gap-3">
            {progressionSuggestions.length === 0 ? (
              <ThemedText className="opacity-70">Log workouts to unlock suggestions.</ThemedText>
            ) : (
              progressionSuggestions.slice(0, 2).map((suggestion) => (
                <View key={suggestion.id} className="gap-1">
                  <ThemedText type="defaultSemiBold">{suggestion.exerciseName}</ThemedText>
                  <ThemedText className="opacity-70">{suggestion.suggestion}</ThemedText>
                </View>
              ))
            )}

            {goalFocusInsights.map(({ label, insight }) =>
              insight ? (
                <View key={label} className="gap-1">
                  <ThemedText type="defaultSemiBold">{label}</ThemedText>
                  <ThemedText className="opacity-70">
                    {insight.title}: {insight.detail}
                  </ThemedText>
                </View>
              ) : null
            )}
          </View>
        </ThemedView>

        <ThemedView lightColor="#F3FAF8" darkColor="#1D2826" className="gap-4 rounded-xl p-5">
          <ThemedText type="subtitle">Recent Workouts</ThemedText>
          {recentWorkouts.length === 0 ? (
            <ThemedText className="opacity-70">Completed workouts will appear here.</ThemedText>
          ) : (
            <View className="gap-3">
              {recentWorkouts.map((workout) => (
                <View key={workout.id} className="gap-2 rounded-lg bg-white p-4 dark:bg-[#263331]">
                  <View className="flex-row justify-between gap-3">
                    <ThemedText type="defaultSemiBold" className="flex-1">
                      {workout.name}
                    </ThemedText>
                    <ThemedText className="opacity-70">{workout.dateLabel}</ThemedText>
                  </View>
                  <ThemedText className="opacity-70">
                    {workout.sets} sets - {formatVolume(workout.volume)} -{' '}
                    {formatDuration(workout.durationSeconds)}
                  </ThemedText>
                </View>
              ))}
            </View>
          )}
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}
