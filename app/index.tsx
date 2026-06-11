import { View } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppButton } from '@/components/ui/app-button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { WorkoutAnalyticsSummary } from '@/components/workout/analytics-summary';
import {
  selectCurrentWorkout,
  selectTotalSets,
  selectTotalVolume,
} from '@/features/workouts/workout-selectors';
import { clearCurrentWorkout, startWorkout } from '@/features/workouts/workout-slice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';

export default function HomeScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const currentWorkout = useAppSelector(selectCurrentWorkout);
  const totalSets = useAppSelector(selectTotalSets);
  const totalVolume = useAppSelector(selectTotalVolume);
  const hasActiveWorkout = currentWorkout !== null;

  const startedAtLabel = currentWorkout
    ? new Date(currentWorkout.startedAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  const handleStartWorkout = () => {
    if (!hasActiveWorkout) {
      dispatch(startWorkout({ name: "Today's Workout" }));
    }

    router.push('/start-workout' as Href);
  };

  return (
    <ThemedView className="flex-1">
      <View className="h-48 overflow-hidden bg-[#D7F0EA] dark:bg-[#1E3632]">
        <View className="absolute -bottom-9 -right-7">
          <IconSymbol size={220} color="#5E8F84" name="house.fill" />
        </View>
      </View>

      <View className="gap-6 px-8 py-8">
        <ThemedView className="gap-2">
          <ThemedText type="title">Workout Tracker</ThemedText>
          <ThemedText className="opacity-70">
            {hasActiveWorkout ? 'You have a workout in progress.' : 'Start your first workout.'}
          </ThemedText>
        </ThemedView>

        <ThemedView lightColor="#F3FAF8" darkColor="#1D2826" className="gap-4 rounded-xl p-5">
          <ThemedText type="subtitle">
            {hasActiveWorkout ? currentWorkout.name : 'No active workout'}
          </ThemedText>
          <ThemedText className="opacity-70">
            {startedAtLabel ? `Started at ${startedAtLabel}` : 'Tap Start Workout to create one.'}
          </ThemedText>

          <WorkoutAnalyticsSummary
            metrics={[
              { label: 'Sets', value: totalSets },
              { label: 'Volume', value: totalVolume },
            ]}
          />

          <View className="gap-3">
            <AppButton
              title={hasActiveWorkout ? 'Continue Workout' : 'Start Workout'}
              onPress={handleStartWorkout}
            />

            <AppButton
              title="Clear Workout"
              variant="secondary"
              disabled={!hasActiveWorkout}
              onPress={() => dispatch(clearCurrentWorkout())}
            />
          </View>
        </ThemedView>
      </View>
    </ThemedView>
  );
}
