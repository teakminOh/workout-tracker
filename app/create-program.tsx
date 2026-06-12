import { useRouter, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppButton } from '@/components/ui/app-button';
import { AppTextInput } from '@/components/ui/app-text-input';
import {
    createWorkoutProgramDraftDay,
    createWorkoutProgramDraftExercise,
    getUpdatedWorkoutProgramExerciseDraft,
    parseWorkoutProgramDraft,
    type WorkoutProgramDayDraft,
    type WorkoutProgramExerciseDraft,
} from '@/features/workouts/workout-form-helpers';
import { createWorkoutProgram } from '@/features/workouts/workout-slice';
import { useAppDispatch } from '@/store/hooks';
import type {
    CreateWorkoutProgramInput,
    ExerciseTrackingMode,
    TrainingGoal,
    WeightUnit,
} from '@/types/workout';

const compactButtonClassName = 'min-h-10 flex-1 px-2 py-2';

const cardStyle = { borderCurve: 'continuous' } as const;

const goalOptions: { label: string; value: TrainingGoal }[] = [
  { label: 'Strength', value: 'strength' },
  { label: 'Hypertrophy', value: 'hypertrophy' },
  { label: 'Power', value: 'power' },
];

const trackingOptions: { label: string; value: ExerciseTrackingMode }[] = [
  { label: 'Reps', value: 'reps' },
  { label: 'Time', value: 'time' },
];

const unitOptions: { label: string; value: WeightUnit }[] = [
  { label: 'kg', value: 'kg' },
  { label: 'lb', value: 'lb' },
  { label: 'BW', value: 'bodyweight' },
];


export default function CreateProgramScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [programName, setProgramName] = useState('');
  const [days, setDays] = useState<WorkoutProgramDayDraft[]>(() => [
    createWorkoutProgramDraftDay(0),
  ]);

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
    exerciseId: string,
    updates: Partial<WorkoutProgramExerciseDraft>
  ) => {
    setDays((currentDays) =>
      currentDays.map((day) =>
        day.id === dayId
          ? {
              ...day,
              exercises: day.exercises.map((exercise) =>
                exercise.id === exerciseId
                  ? getUpdatedWorkoutProgramExerciseDraft(exercise, updates)
                  : exercise
              ),
            }
          : day
      )
    );
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
          ? {
              ...day,
              exercises: [...day.exercises, createWorkoutProgramDraftExercise()],
            }
          : day
      )
    );
  };

  const removeExercise = (dayId: string, exerciseId: string) => {
    setDays((currentDays) =>
      currentDays.map((day) =>
        day.id === dayId
          ? {
              ...day,
              exercises: day.exercises.filter((exercise) => exercise.id !== exerciseId),
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
                    <View
                      key={exercise.id}
                      className="gap-3 rounded-10 bg-raised p-4">
                      <View className="flex-row items-center justify-between gap-3">
                        <ThemedText type="defaultSemiBold">
                          Exercise {exerciseIndex + 1}
                        </ThemedText>
                        <AppButton
                          title="Remove"
                          variant="secondary"
                          className="min-h-10 px-3 py-2"
                          disabled={day.exercises.length === 1}
                          onPress={() => removeExercise(day.id, exercise.id)}
                        />
                      </View>

                      <AppTextInput
                        placeholder="Exercise name"
                        value={exercise.name}
                        onChangeText={(name) => updateExercise(day.id, exercise.id, { name })}
                      />

                      <View className="gap-2">
                        <ThemedText type="label">Goal</ThemedText>
                        <View className="flex-row flex-wrap gap-2">
                          {goalOptions.map((option) => (
                            <AppButton
                              key={option.value}
                              title={option.label}
                              variant={
                                exercise.trainingGoal === option.value ? 'primary' : 'secondary'
                              }
                              className="min-h-10 min-w-[30%] flex-1 py-2"
                              onPress={() =>
                                updateExercise(day.id, exercise.id, {
                                  trainingGoal: option.value,
                                })
                              }
                            />
                          ))}
                        </View>
                      </View>

                      <View className="gap-2">
                        <ThemedText type="label">Target</ThemedText>
                        <View className="flex-row gap-2">
                          {trackingOptions.map((option) => (
                            <AppButton
                              key={option.value}
                              title={option.label}
                              variant={
                                exercise.trackingMode === option.value ? 'primary' : 'secondary'
                              }
                              className={compactButtonClassName}
                              onPress={() =>
                                updateExercise(day.id, exercise.id, {
                                  trackingMode: option.value,
                                })
                              }
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
                              variant={exercise.unit === option.value ? 'primary' : 'secondary'}
                              className={compactButtonClassName}
                              onPress={() =>
                                updateExercise(day.id, exercise.id, {
                                  unit: option.value,
                                  targetWeight:
                                    option.value === 'bodyweight' ? '0' : exercise.targetWeight,
                                })
                              }
                            />
                          ))}
                        </View>
                      </View>

                      <View className="flex-row gap-3">
                        <View className="flex-1 gap-2">
                          <ThemedText type="defaultSemiBold">Sets</ThemedText>
                          <AppTextInput
                            keyboardType="numeric"
                            placeholder="3"
                            value={exercise.targetSets}
                            onChangeText={(targetSets) =>
                              updateExercise(day.id, exercise.id, { targetSets })
                            }
                          />
                        </View>
                        <View className="flex-1 gap-2">
                          <ThemedText type="defaultSemiBold">
                            {exercise.trackingMode === 'time' ? 'Seconds min' : 'Reps min'}
                          </ThemedText>
                          <AppTextInput
                            keyboardType="numeric"
                            placeholder={exercise.trackingMode === 'time' ? '30' : '3'}
                            value={exercise.targetMin}
                            onChangeText={(targetMin) =>
                              updateExercise(day.id, exercise.id, { targetMin })
                            }
                          />
                        </View>
                      </View>

                      <View className="flex-row gap-3">
                        <View className="flex-1 gap-2">
                          <ThemedText type="defaultSemiBold">
                            {exercise.trackingMode === 'time' ? 'Seconds max' : 'Reps max'}
                          </ThemedText>
                          <AppTextInput
                            keyboardType="numeric"
                            placeholder={exercise.trackingMode === 'time' ? '60' : '5'}
                            value={exercise.targetMax}
                            onChangeText={(targetMax) =>
                              updateExercise(day.id, exercise.id, { targetMax })
                            }
                          />
                        </View>
                        <View className="flex-1 gap-2">
                          <ThemedText type="defaultSemiBold">Weight</ThemedText>
                          <AppTextInput
                            keyboardType="decimal-pad"
                            placeholder="0"
                            value={exercise.targetWeight}
                            onChangeText={(targetWeight) =>
                              updateExercise(day.id, exercise.id, { targetWeight })
                            }
                          />
                        </View>
                      </View>
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
            <AppButton
              title="Save Program"
              disabled={!parsedProgram}
              onPress={handleSaveProgram}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}
