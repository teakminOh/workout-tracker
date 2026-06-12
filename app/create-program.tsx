import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppButton } from '@/components/ui/app-button';
import { createWorkoutProgram } from '@/features/workouts/workout-slice';
import { useAppDispatch } from '@/store/hooks';
import type {
  CreateWorkoutProgramDayInput,
  CreateWorkoutProgramExerciseInput,
  CreateWorkoutProgramInput,
  ExerciseTrackingMode,
  TrainingGoal,
  WeightUnit,
} from '@/types/workout';
import { parseWorkoutNumberInput } from '@/utils/workout-formatters';

type DraftExercise = {
  id: string;
  name: string;
  unit: WeightUnit;
  trainingGoal: TrainingGoal;
  trackingMode: ExerciseTrackingMode;
  targetSets: string;
  targetMin: string;
  targetMax: string;
  targetWeight: string;
};

type DraftDay = {
  id: string;
  name: string;
  exercises: DraftExercise[];
};

const inputClassName =
  'min-h-12 rounded-lg border border-[#D3DEE3] bg-white px-4 text-base text-[#11181C] dark:border-[#34413F] dark:bg-[#263331] dark:text-[#ECEDEE]';

const compactButtonClassName = 'min-h-10 flex-1 px-2 py-2';

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

const repsDefaultsByGoal: Record<TrainingGoal, { max: string; min: string; sets: string }> = {
  hypertrophy: { max: '12', min: '8', sets: '3' },
  power: { max: '3', min: '2', sets: '4' },
  strength: { max: '5', min: '3', sets: '3' },
};

const createDraftId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const createDraftExercise = (): DraftExercise => ({
  id: createDraftId('draft-exercise'),
  name: '',
  unit: 'kg',
  trainingGoal: 'strength',
  trackingMode: 'reps',
  targetSets: '3',
  targetMin: '3',
  targetMax: '5',
  targetWeight: '',
});

const createDraftDay = (index: number): DraftDay => ({
  id: createDraftId('draft-day'),
  name: `Day ${index + 1}`,
  exercises: [createDraftExercise()],
});

const parsePositiveNumber = (value: string) => {
  const parsedValue = parseWorkoutNumberInput(value);

  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : null;
};

const parseNonNegativeNumber = (value: string) => {
  if (value.trim().length === 0) {
    return 0;
  }

  const parsedValue = parseWorkoutNumberInput(value);

  return Number.isFinite(parsedValue) && parsedValue >= 0 ? parsedValue : null;
};

const isParsedExercise = (
  exercise: CreateWorkoutProgramExerciseInput | null
): exercise is CreateWorkoutProgramExerciseInput => exercise !== null;

const isParsedDay = (
  day: CreateWorkoutProgramDayInput | null
): day is CreateWorkoutProgramDayInput => day !== null;

const getUpdatedExerciseDefaults = (
  exercise: DraftExercise,
  updates: Partial<DraftExercise>
): DraftExercise => {
  const nextExercise = { ...exercise, ...updates };

  if (updates.trainingGoal && nextExercise.trackingMode === 'reps') {
    const defaults = repsDefaultsByGoal[updates.trainingGoal];

    return {
      ...nextExercise,
      targetSets: defaults.sets,
      targetMin: defaults.min,
      targetMax: defaults.max,
    };
  }

  if (updates.trackingMode === 'time') {
    return {
      ...nextExercise,
      targetSets: '3',
      targetMin: '30',
      targetMax: '60',
      targetWeight: nextExercise.targetWeight || '0',
    };
  }

  if (updates.trackingMode === 'reps') {
    const defaults = repsDefaultsByGoal[nextExercise.trainingGoal];

    return {
      ...nextExercise,
      targetSets: defaults.sets,
      targetMin: defaults.min,
      targetMax: defaults.max,
    };
  }

  return nextExercise;
};

export default function CreateProgramScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [programName, setProgramName] = useState('');
  const [days, setDays] = useState<DraftDay[]>(() => [createDraftDay(0)]);

  const parsedProgram = useMemo<CreateWorkoutProgramInput | null>(() => {
    const trimmedProgramName = programName.trim();

    if (!trimmedProgramName || days.length === 0) {
      return null;
    }

    const parsedDays: (CreateWorkoutProgramDayInput | null)[] = days.map((day, dayIndex) => {
      const parsedExercises: (CreateWorkoutProgramExerciseInput | null)[] = day.exercises.map(
        (exercise) => {
          const targetSets = parsePositiveNumber(exercise.targetSets);
          const targetMin = parsePositiveNumber(exercise.targetMin);
          const targetMax = parsePositiveNumber(exercise.targetMax);
          const targetWeight = parseNonNegativeNumber(exercise.targetWeight);

          if (
            !exercise.name.trim() ||
            targetSets === null ||
            targetMin === null ||
            targetMax === null ||
            targetWeight === null ||
            targetMax < targetMin
          ) {
            return null;
          }

          return {
            name: exercise.name.trim(),
            unit: exercise.unit,
            trainingGoal: exercise.trainingGoal,
            trackingMode: exercise.trackingMode,
            targetSets: Math.round(targetSets),
            targetWeight,
            ...(exercise.trackingMode === 'time'
              ? {
                  targetSecondsMin: Math.round(targetMin),
                  targetSecondsMax: Math.round(targetMax),
                }
              : {
                  targetRepMin: Math.round(targetMin),
                  targetRepMax: Math.round(targetMax),
                }),
          };
        }
      );

      const validExercises = parsedExercises.filter(isParsedExercise);

      if (validExercises.length !== parsedExercises.length) {
        return null;
      }

      return {
        name: day.name.trim() || `Day ${dayIndex + 1}`,
        exercises: validExercises,
      };
    });
    const validDays = parsedDays.filter(isParsedDay);

    if (
      validDays.length !== parsedDays.length ||
      validDays.some((day) => day.exercises.length === 0) ||
      validDays.length === 0
    ) {
      return null;
    }

    return {
      name: trimmedProgramName,
      days: validDays,
    };
  }, [days, programName]);

  const updateDay = (dayId: string, updates: Partial<DraftDay>) => {
    setDays((currentDays) =>
      currentDays.map((day) => (day.id === dayId ? { ...day, ...updates } : day))
    );
  };

  const updateExercise = (
    dayId: string,
    exerciseId: string,
    updates: Partial<DraftExercise>
  ) => {
    setDays((currentDays) =>
      currentDays.map((day) =>
        day.id === dayId
          ? {
              ...day,
              exercises: day.exercises.map((exercise) =>
                exercise.id === exerciseId
                  ? getUpdatedExerciseDefaults(exercise, updates)
                  : exercise
              ),
            }
          : day
      )
    );
  };

  const addDay = () => {
    setDays((currentDays) => [...currentDays, createDraftDay(currentDays.length)]);
  };

  const removeDay = (dayId: string) => {
    setDays((currentDays) => currentDays.filter((day) => day.id !== dayId));
  };

  const addExercise = (dayId: string) => {
    setDays((currentDays) =>
      currentDays.map((day) =>
        day.id === dayId
          ? { ...day, exercises: [...day.exercises, createDraftExercise()] }
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
          contentContainerClassName="gap-6 px-6 py-8"
          keyboardShouldPersistTaps="handled">
          <View className="gap-2">
            <ThemedText type="title">Create Program</ThemedText>
            <TextInput
              className={inputClassName}
              placeholder="Program name"
              placeholderTextColor="#8A9296"
              value={programName}
              onChangeText={setProgramName}
            />
          </View>

          <View className="gap-4">
            {days.map((day, dayIndex) => (
              <ThemedView
                key={day.id}
                lightColor="#F3FAF8"
                darkColor="#1D2826"
                className="gap-4 rounded-xl p-5">
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
                  <TextInput
                    className={inputClassName}
                    placeholder="Day name"
                    placeholderTextColor="#8A9296"
                    value={day.name}
                    onChangeText={(name) => updateDay(day.id, { name })}
                  />
                </View>

                <View className="gap-4">
                  {day.exercises.map((exercise, exerciseIndex) => (
                    <View
                      key={exercise.id}
                      className="gap-3 rounded-lg border border-[#D3DEE3] p-4 dark:border-[#34413F]">
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

                      <TextInput
                        className={inputClassName}
                        placeholder="Exercise name"
                        placeholderTextColor="#8A9296"
                        value={exercise.name}
                        onChangeText={(name) => updateExercise(day.id, exercise.id, { name })}
                      />

                      <View className="gap-2">
                        <ThemedText type="defaultSemiBold">Goal</ThemedText>
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
                        <ThemedText type="defaultSemiBold">Target</ThemedText>
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
                        <ThemedText type="defaultSemiBold">Unit</ThemedText>
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
                          <TextInput
                            className={inputClassName}
                            keyboardType="numeric"
                            placeholder="3"
                            placeholderTextColor="#8A9296"
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
                          <TextInput
                            className={inputClassName}
                            keyboardType="numeric"
                            placeholder={exercise.trackingMode === 'time' ? '30' : '3'}
                            placeholderTextColor="#8A9296"
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
                          <TextInput
                            className={inputClassName}
                            keyboardType="numeric"
                            placeholder={exercise.trackingMode === 'time' ? '60' : '5'}
                            placeholderTextColor="#8A9296"
                            value={exercise.targetMax}
                            onChangeText={(targetMax) =>
                              updateExercise(day.id, exercise.id, { targetMax })
                            }
                          />
                        </View>
                        <View className="flex-1 gap-2">
                          <ThemedText type="defaultSemiBold">Weight</ThemedText>
                          <TextInput
                            className={inputClassName}
                            keyboardType="decimal-pad"
                            placeholder="0"
                            placeholderTextColor="#8A9296"
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
              </ThemedView>
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
