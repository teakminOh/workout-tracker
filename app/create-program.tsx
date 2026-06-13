import { useRouter, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppButton } from '@/components/ui/app-button';
import { AppTextInput } from '@/components/ui/app-text-input';
import { ExercisePicker } from '@/components/workout/exercise-picker';
import { ExercisePrescription } from '@/components/workout/exercise-prescription';
import {
    applyExerciseToDraft,
    createWorkoutProgramDraftDay,
    createWorkoutProgramDraftExercise,
    getUpdatedWorkoutProgramExerciseDraft,
    parseWorkoutProgramDraft,
    type WorkoutProgramDayDraft,
    type WorkoutProgramExerciseDraft,
} from '@/features/workouts/workout-form-helpers';
import { createWorkoutProgram } from '@/features/workouts/workout-slice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import type { CreateWorkoutProgramInput } from '@/types/workout';

const cardStyle = { borderCurve: 'continuous' } as const;

type PickerTarget = { dayId: string; draftId: string };

export default function CreateProgramScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const exercisesById = useAppSelector((state) => state.workout.exercises);
  const [programName, setProgramName] = useState('');
  const [days, setDays] = useState<WorkoutProgramDayDraft[]>(() => [
    createWorkoutProgramDraftDay(0),
  ]);
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);

  const parsedProgram = useMemo<CreateWorkoutProgramInput | null>(
    () => parseWorkoutProgramDraft(programName, days),
    [days, programName]
  );

  const updateDay = (dayId: string, updates: Partial<WorkoutProgramDayDraft>) => {
    setDays((currentDays) =>
      currentDays.map((day) => (day.id === dayId ? { ...day, ...updates } : day))
    );
  };

  const updateExercise = (
    dayId: string,
    exerciseDraftId: string,
    updates: Partial<WorkoutProgramExerciseDraft>
  ) => {
    setDays((currentDays) =>
      currentDays.map((day) =>
        day.id === dayId
          ? {
              ...day,
              exercises: day.exercises.map((exercise) =>
                exercise.id === exerciseDraftId
                  ? getUpdatedWorkoutProgramExerciseDraft(exercise, updates)
                  : exercise
              ),
            }
          : day
      )
    );
  };

  const handlePickedExercise = (exerciseId: string) => {
    const exercise = exercisesById[exerciseId];

    if (pickerTarget && exercise) {
      setDays((currentDays) =>
        currentDays.map((day) =>
          day.id === pickerTarget.dayId
            ? {
                ...day,
                exercises: day.exercises.map((draft) =>
                  draft.id === pickerTarget.draftId ? applyExerciseToDraft(draft, exercise) : draft
                ),
              }
            : day
        )
      );
    }

    setPickerTarget(null);
  };

  const addDay = () => {
    setDays((currentDays) => [...currentDays, createWorkoutProgramDraftDay(currentDays.length)]);
  };

  const removeDay = (dayId: string) => {
    setDays((currentDays) => currentDays.filter((day) => day.id !== dayId));
  };

  const addExercise = (dayId: string) => {
    setDays((currentDays) =>
      currentDays.map((day) =>
        day.id === dayId
          ? { ...day, exercises: [...day.exercises, createWorkoutProgramDraftExercise()] }
          : day
      )
    );
  };

  const removeExercise = (dayId: string, exerciseDraftId: string) => {
    setDays((currentDays) =>
      currentDays.map((day) =>
        day.id === dayId
          ? {
              ...day,
              exercises: day.exercises.filter((exercise) => exercise.id !== exerciseDraftId),
            }
          : day
      )
    );
  };

  const handleSaveProgram = () => {
    if (!parsedProgram) {
      return;
    }

    dispatch(createWorkoutProgram(parsedProgram));
    router.replace('/' as Href);
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
          <View className="gap-2">
            <ThemedText type="title">Create Program</ThemedText>
            <AppTextInput
              placeholder="Program name"
              value={programName}
              onChangeText={setProgramName}
            />
          </View>

          <View className="gap-4">
            {days.map((day, dayIndex) => (
              <View key={day.id} style={cardStyle} className="gap-4 rounded-10 bg-surface p-5">
                <View className="gap-3">
                  <View className="flex-row items-center justify-between gap-3">
                    <ThemedText type="subtitle">Day {dayIndex + 1}</ThemedText>
                    <AppButton
                      title="Remove"
                      variant="secondary"
                      className="min-h-10 px-3 py-2"
                      disabled={days.length === 1}
                      onPress={() => removeDay(day.id)}
                    />
                  </View>
                  <AppTextInput
                    placeholder="Day name"
                    value={day.name}
                    onChangeText={(name) => updateDay(day.id, { name })}
                  />
                </View>

                <View className="gap-4">
                  {day.exercises.map((exercise, exerciseIndex) => (
                    <View key={exercise.id} className="gap-3 rounded-10 bg-raised p-4">
                      <View className="flex-row items-center justify-between gap-3">
                        <ThemedText type="defaultSemiBold">Exercise {exerciseIndex + 1}</ThemedText>
                        <AppButton
                          title="Remove"
                          variant="secondary"
                          className="min-h-10 px-3 py-2"
                          disabled={day.exercises.length === 1}
                          onPress={() => removeExercise(day.id, exercise.id)}
                        />
                      </View>

                      <ExercisePrescription
                        draft={exercise}
                        onChange={(updates) => updateExercise(day.id, exercise.id, updates)}
                        onPickPress={() =>
                          setPickerTarget({ dayId: day.id, draftId: exercise.id })
                        }
                      />
                    </View>
                  ))}

                  <AppButton
                    title="Add Exercise"
                    variant="secondary"
                    onPress={() => addExercise(day.id)}
                  />
                </View>
              </View>
            ))}
          </View>

          <View className="gap-3 pb-8">
            <AppButton title="Add Day" variant="secondary" onPress={addDay} />
            <AppButton title="Save Program" disabled={!parsedProgram} onPress={handleSaveProgram} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <ExercisePicker
        visible={pickerTarget !== null}
        onSelect={handlePickedExercise}
        onClose={() => setPickerTarget(null)}
      />
    </ThemedView>
  );
}
