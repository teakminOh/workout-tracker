import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppButton } from '@/components/ui/app-button';
import { WorkoutAnalyticsSummary } from '@/components/workout/analytics-summary';
import {
  selectCurrentWorkout,
  selectTotalSets,
  selectTotalVolume,
} from '@/features/workouts/workout-selectors';
import { addSet, clearCurrentWorkout, startWorkout } from '@/features/workouts/workout-slice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { formatDuration, parseWorkoutNumberInput } from '@/utils/workout-formatters';

const inputClassName =
  'min-h-12 rounded-lg border border-[#D3DEE3] bg-white px-4 text-base text-[#11181C] dark:border-[#34413F] dark:bg-[#263331] dark:text-[#ECEDEE]';

export default function StartWorkoutScreen() {
  const dispatch = useAppDispatch();
  const currentWorkout = useAppSelector(selectCurrentWorkout);
  const totalSets = useAppSelector(selectTotalSets);
  const totalVolume = useAppSelector(selectTotalVolume);

  const [exerciseName, setExerciseName] = useState('');
  const [reps, setReps] = useState('');
  const [weight, setWeight] = useState('');
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const durationSeconds = useMemo(() => {
    if (!currentWorkout) {
      return 0;
    }

    return Math.max(0, Math.floor((now - new Date(currentWorkout.startedAt).getTime()) / 1000));
  }, [currentWorkout, now]);

  const parsedReps = parseWorkoutNumberInput(reps);
  const parsedWeight = parseWorkoutNumberInput(weight);
  const canAddSet =
    currentWorkout !== null &&
    exerciseName.trim().length > 0 &&
    Number.isFinite(parsedReps) &&
    parsedReps > 0 &&
    Number.isFinite(parsedWeight) &&
    parsedWeight >= 0;

  const handleAddSet = () => {
    if (!canAddSet) {
      return;
    }

    dispatch(
      addSet({
        exerciseName,
        reps: parsedReps,
        weight: parsedWeight,
      })
    );
    setReps('');
    setWeight('');
  };

  if (!currentWorkout) {
    return (
      <ThemedView className="flex-1 px-6 py-10">
        <View className="flex-1 justify-center gap-6">
          <View className="gap-3">
            <ThemedText type="title">Start Workout</ThemedText>
            <ThemedText className="opacity-70">
              Create an active workout before adding exercises and sets.
            </ThemedText>
          </View>

          <AppButton
            title="Start Workout"
            onPress={() => dispatch(startWorkout({ name: "Today's Workout" }))}
          />
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView className="flex-1">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.select({ ios: 'padding', default: undefined })}>
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-6 px-6 py-8"
          keyboardShouldPersistTaps="handled">
          <View className="gap-2">
            <ThemedText type="title">{currentWorkout.name}</ThemedText>
            <ThemedText className="opacity-70">Track sets as you train.</ThemedText>
          </View>

          <WorkoutAnalyticsSummary
            metrics={[
              { label: 'Sets', value: totalSets },
              { label: 'Volume', value: totalVolume },
              { label: 'Time', value: formatDuration(durationSeconds) },
            ]}
          />

          <ThemedView lightColor="#F3FAF8" darkColor="#1D2826" className="gap-4 rounded-xl p-5">
            <ThemedText type="subtitle">Add Set</ThemedText>

            <View className="gap-2">
              <ThemedText type="defaultSemiBold">Exercise</ThemedText>
              <TextInput
                className={inputClassName}
                placeholder="Bench Press"
                placeholderTextColor="#8A9296"
                value={exerciseName}
                onChangeText={setExerciseName}
              />
            </View>

            <View className="flex-row gap-3">
              <View className="flex-1 gap-2">
                <ThemedText type="defaultSemiBold">Reps</ThemedText>
                <TextInput
                  className={inputClassName}
                  keyboardType="numeric"
                  placeholder="10"
                  placeholderTextColor="#8A9296"
                  value={reps}
                  onChangeText={setReps}
                />
              </View>

              <View className="flex-1 gap-2">
                <ThemedText type="defaultSemiBold">Weight</ThemedText>
                <TextInput
                  className={inputClassName}
                  keyboardType="decimal-pad"
                  placeholder="60"
                  placeholderTextColor="#8A9296"
                  value={weight}
                  onChangeText={setWeight}
                />
              </View>
            </View>

            <AppButton title="Add Set" disabled={!canAddSet} onPress={handleAddSet} />
          </ThemedView>

          <View className="gap-3">
            <ThemedText type="subtitle">Sets</ThemedText>
            {currentWorkout.sets.length === 0 ? (
              <ThemedView lightColor="#F3FAF8" darkColor="#1D2826" className="rounded-lg p-4">
                <ThemedText className="opacity-70">No sets yet.</ThemedText>
              </ThemedView>
            ) : (
              currentWorkout.sets.map((set, index) => (
                <ThemedView
                  key={set.id}
                  lightColor="#F3FAF8"
                  darkColor="#1D2826"
                  className="flex-row items-center justify-between rounded-lg p-4">
                  <View className="gap-1">
                    <ThemedText type="defaultSemiBold">
                      Set {index + 1}: {set.exerciseName}
                    </ThemedText>
                    <ThemedText className="opacity-70">
                      {set.reps} reps x {set.weight} kg
                    </ThemedText>
                  </View>
                  <ThemedText type="defaultSemiBold">{set.reps * set.weight}</ThemedText>
                </ThemedView>
              ))
            )}
          </View>

          <AppButton
            title="Clear Workout"
            variant="secondary"
            onPress={() => dispatch(clearCurrentWorkout())}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}
