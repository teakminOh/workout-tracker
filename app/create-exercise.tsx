import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppButton } from '@/components/ui/app-button';
import { AppTextInput } from '@/components/ui/app-text-input';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Palette } from '@/constants/theme';
import { createExercise, updateExercise } from '@/features/workouts/workout-slice';
import { selectExerciseById } from '@/features/workouts/workout-selectors';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import type {
  ExerciseTrackingMode,
  MuscleGroup,
  TrainingGoal,
  WeightUnit,
} from '@/types/workout';

const cardStyle = { borderCurve: 'continuous' } as const;

const muscleOptions: { label: string; value: MuscleGroup }[] = [
  { label: 'Chest', value: 'chest' },
  { label: 'Back', value: 'back' },
  { label: 'Shoulders', value: 'shoulders' },
  { label: 'Biceps', value: 'biceps' },
  { label: 'Triceps', value: 'triceps' },
  { label: 'Quads', value: 'quads' },
  { label: 'Hamstrings', value: 'hamstrings' },
  { label: 'Glutes', value: 'glutes' },
  { label: 'Core', value: 'core' },
  { label: 'Full Body', value: 'full_body' },
];

const unitOptions: { label: string; value: WeightUnit }[] = [
  { label: 'kg', value: 'kg' },
  { label: 'lb', value: 'lb' },
  { label: 'BW', value: 'bodyweight' },
];

const trackingOptions: { label: string; value: ExerciseTrackingMode }[] = [
  { label: 'Reps', value: 'reps' },
  { label: 'Time', value: 'time' },
];

const categoryOptions: { label: string; value: TrainingGoal; description: string }[] = [
  {
    label: 'Strength',
    value: 'strength',
    description: 'Tracks estimated 1-rep max and max weight. Heavy lifts — bench, squat.',
  },
  {
    label: 'Hypertrophy',
    value: 'hypertrophy',
    description: 'Tracks total volume and max reps in a set. Building size — curls, leg press.',
  },
  {
    label: 'Power',
    value: 'power',
    description: 'Tracks max weight only. Explosive moves — cleans, kettlebell swings.',
  },
  {
    label: 'Do not track',
    value: 'untracked',
    description: 'No analytics — just check it off. Warm-ups, jumps, stretching.',
  },
];

export default function CreateExerciseScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const params = useLocalSearchParams<{ exerciseId?: string | string[] }>();
  const exerciseId = Array.isArray(params.exerciseId) ? params.exerciseId[0] : params.exerciseId;
  const existing = useAppSelector((state) =>
    exerciseId ? selectExerciseById(state, exerciseId) : null
  );

  const [name, setName] = useState(existing?.name ?? '');
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup | undefined>(existing?.muscleGroup);
  const [unit, setUnit] = useState<WeightUnit>(existing?.defaultUnit ?? 'kg');
  const [trackingMode, setTrackingMode] = useState<ExerciseTrackingMode>(
    existing?.trackingMode ?? 'reps'
  );
  const [trainingGoal, setTrainingGoal] = useState<TrainingGoal>(
    existing?.trainingGoal ?? 'strength'
  );

  const canSave = name.trim().length > 0;

  const handleSave = () => {
    if (!canSave) {
      return;
    }

    const payload = { name, muscleGroup, defaultUnit: unit, trainingGoal, trackingMode };

    if (existing) {
      dispatch(updateExercise({ exerciseId: existing.id, ...payload }));
    } else {
      dispatch(createExercise(payload));
    }

    router.back();
  };

  return (
    <ThemedView className="flex-1">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.select({ ios: 'padding', default: undefined })}>
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-7 px-5 py-8"
          keyboardShouldPersistTaps="handled">
          <View className="gap-3">
            <ThemedText type="title">{existing ? 'Edit Exercise' : 'New Exercise'}</ThemedText>
            <AppTextInput placeholder="Exercise name" value={name} onChangeText={setName} />
          </View>

          <View className="gap-2">
            <ThemedText type="label">Muscle group</ThemedText>
            <View className="flex-row flex-wrap gap-2">
              {muscleOptions.map((option) => (
                <AppButton
                  key={option.value}
                  title={option.label}
                  variant={muscleGroup === option.value ? 'primary' : 'secondary'}
                  className="min-h-10 px-3 py-2"
                  onPress={() => setMuscleGroup(option.value)}
                />
              ))}
            </View>
          </View>

          <View className="gap-2">
            <ThemedText type="label">Unit</ThemedText>
            <View className="flex-row gap-2">
              {unitOptions.map((option) => (
                <AppButton
                  key={option.value}
                  title={option.label}
                  variant={unit === option.value ? 'primary' : 'secondary'}
                  className="min-h-10 flex-1 px-2 py-2"
                  onPress={() => setUnit(option.value)}
                />
              ))}
            </View>
          </View>

          <View className="gap-2">
            <ThemedText type="label">Logged in</ThemedText>
            <View className="flex-row gap-2">
              {trackingOptions.map((option) => (
                <AppButton
                  key={option.value}
                  title={option.label}
                  variant={trackingMode === option.value ? 'primary' : 'secondary'}
                  className="min-h-10 flex-1 px-2 py-2"
                  onPress={() => setTrackingMode(option.value)}
                />
              ))}
            </View>
          </View>

          <View className="gap-3">
            <ThemedText type="label">Analytics</ThemedText>
            {categoryOptions.map((option) => {
              const isSelected = trainingGoal === option.value;
              return (
                <PressableScale
                  key={option.value}
                  style={[cardStyle, isSelected ? { backgroundColor: Palette.accentSoft } : null]}
                  className={`gap-1 rounded-10 p-4 ${isSelected ? '' : 'bg-surface'}`}
                  onPress={() => setTrainingGoal(option.value)}>
                  <ThemedText
                    type="defaultSemiBold"
                    style={{ color: isSelected ? Palette.accent : Palette.cream }}>
                    {option.label}
                  </ThemedText>
                  <ThemedText className="opacity-60">{option.description}</ThemedText>
                </PressableScale>
              );
            })}
          </View>

          <AppButton
            title={existing ? 'Save Exercise' : 'Create Exercise'}
            disabled={!canSave}
            onPress={handleSave}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}
