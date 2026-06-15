import { useRouter, type Href } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { AppTextInput } from '@/components/ui/app-text-input';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Palette } from '@/constants/theme';
import {
  selectExerciseLibrary,
  selectLastCreatedExerciseId,
} from '@/features/workouts/workout-selectors';
import { clearLastCreatedExercise } from '@/features/workouts/workout-slice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import type { MuscleGroup, TrainingGoal } from '@/types/workout';

const cardStyle = { borderCurve: 'continuous' } as const;
const backdropStyle = { backgroundColor: 'rgba(0, 0, 0, 0.6)' } as const;

export const categoryLabels: Record<TrainingGoal, string> = {
  strength: 'Strength',
  hypertrophy: 'Hypertrophy',
  power: 'Power',
  untracked: 'Untracked',
};

export const muscleLabels: Record<MuscleGroup, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  core: 'Core',
  full_body: 'Full Body',
};

type ExercisePickerProps = {
  visible: boolean;
  onSelect: (exerciseId: string) => void;
  onClose: () => void;
};

export function ExercisePicker({ visible, onSelect, onClose }: ExercisePickerProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const library = useAppSelector(selectExerciseLibrary);
  const lastCreatedExerciseId = useAppSelector(selectLastCreatedExerciseId);
  const [query, setQuery] = useState('');
  const expectingCreateRef = useRef(false);

  const filtered = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    return trimmed
      ? library.filter((exercise) => exercise.name.toLowerCase().includes(trimmed))
      : library;
  }, [library, query]);

  // Auto-select an exercise that was just created from this picker.
  useEffect(() => {
    if (expectingCreateRef.current && lastCreatedExerciseId) {
      expectingCreateRef.current = false;
      dispatch(clearLastCreatedExercise());
      onSelect(lastCreatedExerciseId);
    }
  }, [dispatch, lastCreatedExerciseId, onSelect]);

  const handleCreateNew = () => {
    dispatch(clearLastCreatedExercise());
    expectingCreateRef.current = true;
    router.push('/create-exercise' as Href);
  };

  return (
    <Modal
      transparent
      statusBarTranslucent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end" style={backdropStyle} onPress={onClose}>
        <Pressable
          style={cardStyle}
          className="max-h-[80%] gap-4 rounded-t-10 bg-surface p-5"
          onPress={(event) => event.stopPropagation()}>
          <View className="flex-row items-center justify-between gap-3">
            <ThemedText type="subtitle">Choose exercise</ThemedText>
            <PressableScale accessibilityLabel="Close" hitSlop={8} onPress={onClose}>
              <Icon name="x" size={20} color={Palette.muted} />
            </PressableScale>
          </View>

          <AppTextInput placeholder="Search exercises…" value={query} onChangeText={setQuery} />

          <ScrollView keyboardShouldPersistTaps="handled" className="grow-0">
            <View className="gap-2">
              {filtered.map((exercise) => (
                <PressableScale
                  key={exercise.id}
                  style={cardStyle}
                  className="gap-1 rounded-10 bg-raised p-4"
                  onPress={() => onSelect(exercise.id)}>
                  <ThemedText type="defaultSemiBold">{exercise.name}</ThemedText>
                  <ThemedText className="text-[13px] leading-5 opacity-60">
                    {exercise.muscleGroups && exercise.muscleGroups.length > 0
                      ? `${exercise.muscleGroups.map((group) => muscleLabels[group]).join(', ')} · `
                      : ''}
                    {categoryLabels[exercise.trainingGoal]}
                  </ThemedText>
                </PressableScale>
              ))}
              {filtered.length === 0 ? (
                <ThemedText className="opacity-60">No exercises match “{query}”.</ThemedText>
              ) : null}
            </View>
          </ScrollView>

          <PressableScale
            style={cardStyle}
            className="flex-row items-center justify-center gap-2 rounded-10 bg-raised p-4"
            onPress={handleCreateNew}>
            <Icon name="plus" size={18} color={Palette.accent} />
            <ThemedText type="defaultSemiBold" style={{ color: Palette.accent }}>
              Create new exercise
            </ThemedText>
          </PressableScale>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
