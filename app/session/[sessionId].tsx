import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppButton } from '@/components/ui/app-button';
import { useAppDialog } from '@/components/ui/app-dialog';
import { Icon } from '@/components/ui/icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { WorkoutAnalyticsSummary } from '@/components/workout/analytics-summary';
import { FocusBreakdown } from '@/components/workout/focus-breakdown';
import { MuscleGroupBreakdown } from '@/components/workout/muscle-group-breakdown';
import { Palette } from '@/constants/theme';
import {
  selectActiveWorkoutSession,
  selectSessionDetailById,
} from '@/features/workouts/workout-selectors';
import {
  excludeExerciseFromAnalytics,
  repeatWorkoutSession,
  restoreExerciseToAnalytics,
} from '@/features/workouts/workout-slice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { formatDuration } from '@/utils/workout-formatters';

const cardStyle = { borderCurve: 'continuous' } as const;

export default function SessionDetailScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const showDialog = useAppDialog();
  const params = useLocalSearchParams<{ sessionId?: string | string[] }>();
  const sessionId = Array.isArray(params.sessionId) ? params.sessionId[0] : params.sessionId;
  const session = useAppSelector((state) =>
    sessionId ? selectSessionDetailById(state, sessionId) : null
  );
  const activeSession = useAppSelector(selectActiveWorkoutSession);

  if (!session) {
    return (
      <ThemedView className="flex-1">
        <Stack.Screen options={{ title: 'Workout' }} />
        <View className="flex-1 justify-center gap-6 px-5 py-10">
          <View className="gap-2">
            <ThemedText type="title">Workout not found</ThemedText>
            <ThemedText className="opacity-60">It may have been removed.</ThemedText>
          </View>
          <AppButton title="Back to History" onPress={() => router.replace('/history' as Href)} />
        </View>
      </ThemedView>
    );
  }

  const handleRepeat = () => {
    if (activeSession) {
      showDialog({
        title: 'Finish current workout first',
        message: 'You already have a workout in progress. Finish or clear it before repeating one.',
        buttons: [{ text: 'OK', style: 'cancel' }],
      });
      return;
    }

    dispatch(repeatWorkoutSession({ sessionId: session.id }));
    router.replace('/start-workout' as Href);
  };

  const handleExcludeExercise = (exerciseId: string, exerciseName: string) => {
    showDialog({
      title: 'Remove from analytics?',
      message: `"${exerciseName}" in this workout will stop counting toward your stats, PRs, and badges. You can restore it anytime.`,
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () =>
            dispatch(excludeExerciseFromAnalytics({ sessionId: session.id, exerciseId })),
        },
      ],
    });
  };

  const handleRestoreExercise = (exerciseId: string) => {
    dispatch(restoreExerciseToAnalytics({ sessionId: session.id, exerciseId }));
  };

  return (
    <ThemedView className="flex-1">
      <Stack.Screen options={{ title: session.name }} />
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-7 px-5 py-8"
        showsVerticalScrollIndicator={false}>
        <View className="gap-1">
          <ThemedText type="title">{session.name}</ThemedText>
          <ThemedText className="opacity-60">
            {session.dateLabel}
            {session.isFreestyle ? ' · Freestyle' : ''}
          </ThemedText>
        </View>

        <WorkoutAnalyticsSummary
          metrics={[
            { label: 'Sets', value: session.totalSets },
            { label: 'Volume', value: session.totalVolume },
            { label: 'Time', value: formatDuration(session.durationSeconds) },
          ]}
        />

        <FocusBreakdown focus={session.focus} />
        <MuscleGroupBreakdown muscleGroups={session.muscleGroups} />

        <View className="gap-3">
          <ThemedText type="label">Exercises</ThemedText>
          {session.exercises.length > 0 ? (
            session.exercises.map((exercise) => (
              <View
                key={exercise.exerciseId}
                style={cardStyle}
                className={`gap-2 rounded-10 bg-surface p-5 ${
                  exercise.excludedFromAnalytics ? 'opacity-50' : ''
                }`}>
                <View className="flex-row items-center justify-between gap-3">
                  <ThemedText type="defaultSemiBold">{exercise.exerciseName}</ThemedText>
                  <ThemedText
                    className="opacity-60"
                    style={{ fontVariant: ['tabular-nums'] }}>
                    {exercise.setCount} {exercise.setCount === 1 ? 'set' : 'sets'}
                  </ThemedText>
                </View>
                <ThemedText className="text-[13px] leading-5 opacity-60">
                  {exercise.setsLabel}
                </ThemedText>
                {exercise.excludedFromAnalytics ? (
                  <PressableScale
                    accessibilityRole="button"
                    accessibilityLabel={`Restore ${exercise.exerciseName} to analytics`}
                    className="flex-row items-center gap-1.5 self-start pt-1"
                    onPress={() => handleRestoreExercise(exercise.exerciseId)}>
                    <Icon name="rotate-ccw" size={14} color={Palette.muted} />
                    <ThemedText className="text-[13px]" style={{ color: Palette.muted }}>
                      Excluded from analytics · Restore
                    </ThemedText>
                  </PressableScale>
                ) : (
                  <PressableScale
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${exercise.exerciseName} from analytics`}
                    className="flex-row items-center gap-1.5 self-start pt-1"
                    onPress={() => handleExcludeExercise(exercise.exerciseId, exercise.exerciseName)}>
                    <Icon name="slash" size={14} color={Palette.danger} />
                    <ThemedText className="text-[13px]" style={{ color: Palette.danger }}>
                      Remove from analytics
                    </ThemedText>
                  </PressableScale>
                )}
              </View>
            ))
          ) : (
            <View style={cardStyle} className="rounded-10 bg-surface p-5">
              <ThemedText className="opacity-60">No sets were logged.</ThemedText>
            </View>
          )}
        </View>

        <AppButton title="Repeat Workout" icon="repeat" onPress={handleRepeat} />
      </ScrollView>
    </ThemedView>
  );
}
