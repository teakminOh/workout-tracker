import { View } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppButton } from '@/components/ui/app-button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { WorkoutAnalyticsSummary } from '@/components/workout/analytics-summary';
import {
  selectActiveProgram,
  selectActiveProgramDays,
  selectActiveWorkoutSession,
  selectTotalSets,
  selectTotalVolume,
} from '@/features/workouts/workout-selectors';
import { clearCurrentWorkout, startWorkoutSession } from '@/features/workouts/workout-slice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';

export default function HomeScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const activeProgram = useAppSelector(selectActiveProgram);
  const activeSession = useAppSelector(selectActiveWorkoutSession);
  const totalSets = useAppSelector(selectTotalSets);
  const totalVolume = useAppSelector(selectTotalVolume);
  const programDays = useAppSelector(selectActiveProgramDays);
  const hasActiveWorkout = activeSession !== null;

  const startedAtLabel = activeSession
    ? new Date(activeSession.startedAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  const handleStartDay = (workoutDayTemplateId: string) => {
    if (!activeProgram) {
      return;
    }

    if (!hasActiveWorkout) {
      dispatch(startWorkoutSession({ programId: activeProgram.id, workoutDayTemplateId }));
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
            {activeProgram
              ? `${activeProgram.name}: choose a program day.`
              : 'Create a program to get started.'}
          </ThemedText>
        </ThemedView>

        <ThemedView lightColor="#F3FAF8" darkColor="#1D2826" className="gap-4 rounded-xl p-5">
          <ThemedText type="subtitle">
            {hasActiveWorkout ? activeSession.name : activeProgram?.name ?? 'No active program'}
          </ThemedText>
          <ThemedText className="opacity-70">
            {startedAtLabel
              ? `Started at ${startedAtLabel}`
              : 'Start a day from your program to begin logging sets.'}
          </ThemedText>

          <WorkoutAnalyticsSummary
            metrics={[
              { label: 'Sets', value: totalSets },
              { label: 'Volume', value: totalVolume },
            ]}
          />

          <View className="gap-3">
            {hasActiveWorkout ? (
              <AppButton
                title={`Continue ${activeSession.name}`}
                onPress={() => router.push('/start-workout' as Href)}
              />
            ) : (
              programDays.map((day) => (
                <AppButton
                  key={day.id}
                  title={`Start ${day.name}`}
                  onPress={() => handleStartDay(day.id)}
                />
              ))
            )}

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
