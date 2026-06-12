import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppButton } from '@/components/ui/app-button';
import {
  type ProgramEditorDay,
  type ProgramEditorExercise,
  selectProgramById,
  selectProgramEditorDaysByProgramId,
} from '@/features/workouts/workout-selectors';
import {
  addProgramExercise,
  addWorkoutDay,
  archiveProgramExercise,
  archiveWorkoutDay,
  reorderProgramExercises,
  reorderWorkoutDays,
  updateProgramExercise,
  updateWorkoutDay,
  updateWorkoutProgram,
} from '@/features/workouts/workout-slice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import type {
  CreateWorkoutProgramExerciseInput,
  ExerciseTrackingMode,
  TrainingGoal,
  WeightUnit,
} from '@/types/workout';
import { parseWorkoutNumberInput } from '@/utils/workout-formatters';

type ExerciseDraft = {
  name: string;
  unit: WeightUnit;
  trainingGoal: TrainingGoal;
  trackingMode: ExerciseTrackingMode;
  targetSets: string;
  targetMin: string;
  targetMax: string;
  targetWeight: string;
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

const defaultExerciseInput: CreateWorkoutProgramExerciseInput = {
  name: 'New Exercise',
  unit: 'kg',
  trainingGoal: 'strength',
  trackingMode: 'reps',
  targetSets: 3,
  targetRepMin: 3,
  targetRepMax: 5,
  targetWeight: 0,
};

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

const getExerciseDraft = ({ exerciseName, programExercise, unit }: ProgramEditorExercise) => ({
  name: exerciseName,
  unit,
  trainingGoal: programExercise.trainingGoal ?? 'strength',
  trackingMode: programExercise.trackingMode ?? 'reps',
  targetSets: programExercise.targetSets.toString(),
  targetMin:
    programExercise.trackingMode === 'time'
      ? (programExercise.targetSecondsMin ?? 30).toString()
      : (programExercise.targetRepMin ?? 1).toString(),
  targetMax:
    programExercise.trackingMode === 'time'
      ? (programExercise.targetSecondsMax ?? 60).toString()
      : (programExercise.targetRepMax ?? programExercise.targetRepMin ?? 1).toString(),
  targetWeight: programExercise.targetWeight?.toString() ?? '',
});

const getUpdatedExerciseDraft = (
  draft: ExerciseDraft,
  updates: Partial<ExerciseDraft>
): ExerciseDraft => {
  const nextDraft = { ...draft, ...updates };

  if (updates.trainingGoal && nextDraft.trackingMode === 'reps') {
    const defaults = repsDefaultsByGoal[updates.trainingGoal];

    return {
      ...nextDraft,
      targetSets: defaults.sets,
      targetMin: defaults.min,
      targetMax: defaults.max,
    };
  }

  if (updates.trackingMode === 'time') {
    return {
      ...nextDraft,
      targetSets: '3',
      targetMin: '30',
      targetMax: '60',
      targetWeight: nextDraft.targetWeight || '0',
    };
  }

  if (updates.trackingMode === 'reps') {
    const defaults = repsDefaultsByGoal[nextDraft.trainingGoal];

    return {
      ...nextDraft,
      targetSets: defaults.sets,
      targetMin: defaults.min,
      targetMax: defaults.max,
    };
  }

  return nextDraft;
};

const parseExerciseDraft = (draft: ExerciseDraft): CreateWorkoutProgramExerciseInput | null => {
  const targetSets = parsePositiveNumber(draft.targetSets);
  const targetMin = parsePositiveNumber(draft.targetMin);
  const targetMax = parsePositiveNumber(draft.targetMax);
  const targetWeight = parseNonNegativeNumber(draft.targetWeight);

  if (
    !draft.name.trim() ||
    targetSets === null ||
    targetMin === null ||
    targetMax === null ||
    targetWeight === null ||
    targetMax < targetMin
  ) {
    return null;
  }

  return {
    name: draft.name.trim(),
    unit: draft.unit,
    trainingGoal: draft.trainingGoal,
    trackingMode: draft.trackingMode,
    targetSets: Math.round(targetSets),
    targetWeight,
    ...(draft.trackingMode === 'time'
      ? {
          targetSecondsMin: Math.round(targetMin),
          targetSecondsMax: Math.round(targetMax),
        }
      : {
          targetRepMin: Math.round(targetMin),
          targetRepMax: Math.round(targetMax),
        }),
  };
};

function InsertExerciseButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel="Insert exercise"
      accessibilityRole="button"
      className="self-center rounded-full border border-[#0A7EA4] bg-white p-2 dark:bg-[#263331]"
      onPress={onPress}>
      <MaterialIcons name="add" size={18} color="#0A7EA4" />
    </Pressable>
  );
}

const getMovedIds = (ids: string[], fromIndex: number, toIndex: number) => {
  const nextIds = [...ids];
  const [movedId] = nextIds.splice(fromIndex, 1);

  nextIds.splice(toIndex, 0, movedId);

  return nextIds;
};

export default function EditProgramScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const params = useLocalSearchParams<{ programId?: string | string[] }>();
  const programId = Array.isArray(params.programId) ? params.programId[0] : params.programId;
  const program = useAppSelector((state) =>
    programId ? selectProgramById(state, programId) : null
  );
  const editorDays = useAppSelector((state) =>
    programId ? selectProgramEditorDaysByProgramId(state, programId) : []
  );
  const [loadedProgramId, setLoadedProgramId] = useState<string | null>(null);
  const [programName, setProgramName] = useState('');
  const [dayNameDrafts, setDayNameDrafts] = useState<Record<string, string>>({});
  const [exerciseDrafts, setExerciseDrafts] = useState<Record<string, ExerciseDraft>>({});

  useEffect(() => {
    if (program && program.id !== loadedProgramId) {
      setLoadedProgramId(program.id);
      setProgramName(program.name);
    }
  }, [loadedProgramId, program]);

  useEffect(() => {
    setDayNameDrafts((currentDrafts) => {
      const nextDrafts: Record<string, string> = {};

      editorDays.forEach(({ day }) => {
        nextDrafts[day.id] = currentDrafts[day.id] ?? day.name;
      });

      return nextDrafts;
    });

    setExerciseDrafts((currentDrafts) => {
      const nextDrafts: Record<string, ExerciseDraft> = {};

      editorDays.forEach(({ exercises }) => {
        exercises.forEach((exercise) => {
          nextDrafts[exercise.programExercise.id] =
            currentDrafts[exercise.programExercise.id] ?? getExerciseDraft(exercise);
        });
      });

      return nextDrafts;
    });
  }, [editorDays]);

  const canSaveProgramName = Boolean(program && programName.trim());

  const updateExerciseDraft = (
    programExerciseId: string,
    updates: Partial<ExerciseDraft>
  ) => {
    setExerciseDrafts((currentDrafts) => {
      const currentDraft = currentDrafts[programExerciseId];

      if (!currentDraft) {
        return currentDrafts;
      }

      return {
        ...currentDrafts,
        [programExerciseId]: getUpdatedExerciseDraft(currentDraft, updates),
      };
    });
  };

  const saveProgramName = () => {
    if (!program || !programName.trim()) {
      return;
    }

    dispatch(updateWorkoutProgram({ programId: program.id, name: programName }));
  };

  const saveDayName = (dayId: string) => {
    const name = dayNameDrafts[dayId]?.trim();

    if (!name) {
      return;
    }

    dispatch(updateWorkoutDay({ workoutDayTemplateId: dayId, name }));
  };

  const saveExercise = (programExerciseId: string) => {
    const draft = exerciseDrafts[programExerciseId];
    const exercise = draft ? parseExerciseDraft(draft) : null;

    if (!exercise) {
      return;
    }

    dispatch(updateProgramExercise({ programExerciseId, exercise }));
  };

  const insertExercise = (
    dayId: string,
    insertAfterProgramExerciseId?: string | null
  ) => {
    dispatch(
      addProgramExercise({
        workoutDayTemplateId: dayId,
        insertAfterProgramExerciseId,
        exercise: defaultExerciseInput,
      })
    );
  };

  const archiveDay = (dayId: string) => {
    Alert.alert('Archive day?', 'This removes the day from future workouts.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Archive',
        style: 'destructive',
        onPress: () => dispatch(archiveWorkoutDay({ workoutDayTemplateId: dayId })),
      },
    ]);
  };

  const archiveExercise = (programExerciseId: string) => {
    Alert.alert('Archive exercise?', 'This removes the exercise from future workouts.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Archive',
        style: 'destructive',
        onPress: () => dispatch(archiveProgramExercise({ programExerciseId })),
      },
    ]);
  };

  const moveDay = (fromIndex: number, toIndex: number) => {
    if (!program || toIndex < 0 || toIndex >= editorDays.length) {
      return;
    }

    dispatch(
      reorderWorkoutDays({
        programId: program.id,
        workoutDayTemplateIds: getMovedIds(
          editorDays.map(({ day }) => day.id),
          fromIndex,
          toIndex
        ),
      })
    );
  };

  const moveExercise = (day: ProgramEditorDay, fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= day.exercises.length) {
      return;
    }

    dispatch(
      reorderProgramExercises({
        workoutDayTemplateId: day.day.id,
        programExerciseIds: getMovedIds(
          day.exercises.map(({ programExercise }) => programExercise.id),
          fromIndex,
          toIndex
        ),
      })
    );
  };

  const renderedDays = useMemo(() => editorDays, [editorDays]);

  if (!program) {
    return (
      <ThemedView className="flex-1 px-6 py-10">
        <View className="flex-1 justify-center gap-6">
          <View className="gap-3">
            <ThemedText type="title">Program not found</ThemedText>
            <ThemedText className="opacity-70">Choose a saved program from Home.</ThemedText>
          </View>
          <AppButton title="Back Home" onPress={() => router.replace('/' as Href)} />
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
          <View className="gap-3">
            <ThemedText type="title">Edit Program</ThemedText>
            <TextInput
              className={inputClassName}
              placeholder="Program name"
              placeholderTextColor="#8A9296"
              value={programName}
              onChangeText={setProgramName}
            />
            <AppButton
              title="Save Program Name"
              disabled={!canSaveProgramName}
              onPress={saveProgramName}
            />
          </View>

          <View className="gap-4">
            {renderedDays.map((day, dayIndex) => (
              <ThemedView
                key={day.day.id}
                lightColor="#F3FAF8"
                darkColor="#1D2826"
                className="gap-4 rounded-xl p-5">
                <View className="gap-3">
                  <View className="flex-row items-center justify-between gap-3">
                    <ThemedText type="subtitle">Day {dayIndex + 1}</ThemedText>
                    <View className="flex-row gap-2">
                      <AppButton
                        title="Up"
                        variant="secondary"
                        className="min-h-10 px-3 py-2"
                        disabled={dayIndex === 0}
                        onPress={() => moveDay(dayIndex, dayIndex - 1)}
                      />
                      <AppButton
                        title="Down"
                        variant="secondary"
                        className="min-h-10 px-3 py-2"
                        disabled={dayIndex === renderedDays.length - 1}
                        onPress={() => moveDay(dayIndex, dayIndex + 1)}
                      />
                    </View>
                  </View>

                  <TextInput
                    className={inputClassName}
                    placeholder="Day name"
                    placeholderTextColor="#8A9296"
                    value={dayNameDrafts[day.day.id] ?? day.day.name}
                    onChangeText={(name) =>
                      setDayNameDrafts((currentDrafts) => ({
                        ...currentDrafts,
                        [day.day.id]: name,
                      }))
                    }
                  />
                  <View className="flex-row gap-3">
                    <AppButton
                      title="Save Day"
                      className="flex-1"
                      disabled={!dayNameDrafts[day.day.id]?.trim()}
                      onPress={() => saveDayName(day.day.id)}
                    />
                    <AppButton
                      title="Archive Day"
                      variant="secondary"
                      className="flex-1"
                      onPress={() => archiveDay(day.day.id)}
                    />
                  </View>
                </View>

                <View className="gap-3">
                  <InsertExerciseButton onPress={() => insertExercise(day.day.id, null)} />
                  {day.exercises.map((exercise, exerciseIndex) => {
                    const draft = exerciseDrafts[exercise.programExercise.id];
                    const parsedExercise = draft ? parseExerciseDraft(draft) : null;

                    return (
                      <View key={exercise.programExercise.id} className="gap-3">
                        <View className="gap-3 rounded-lg border border-[#D3DEE3] p-4 dark:border-[#34413F]">
                          <View className="flex-row items-center justify-between gap-3">
                            <ThemedText type="defaultSemiBold">
                              Exercise {exerciseIndex + 1}
                            </ThemedText>
                            <View className="flex-row gap-2">
                              <AppButton
                                title="Up"
                                variant="secondary"
                                className="min-h-10 px-3 py-2"
                                disabled={exerciseIndex === 0}
                                onPress={() => moveExercise(day, exerciseIndex, exerciseIndex - 1)}
                              />
                              <AppButton
                                title="Down"
                                variant="secondary"
                                className="min-h-10 px-3 py-2"
                                disabled={exerciseIndex === day.exercises.length - 1}
                                onPress={() => moveExercise(day, exerciseIndex, exerciseIndex + 1)}
                              />
                            </View>
                          </View>

                          <TextInput
                            className={inputClassName}
                            placeholder="Exercise name"
                            placeholderTextColor="#8A9296"
                            value={draft?.name ?? exercise.exerciseName}
                            onChangeText={(name) =>
                              updateExerciseDraft(exercise.programExercise.id, { name })
                            }
                          />

                          <View className="gap-2">
                            <ThemedText type="defaultSemiBold">Goal</ThemedText>
                            <View className="flex-row flex-wrap gap-2">
                              {goalOptions.map((option) => (
                                <AppButton
                                  key={option.value}
                                  title={option.label}
                                  variant={
                                    draft?.trainingGoal === option.value ? 'primary' : 'secondary'
                                  }
                                  className="min-h-10 min-w-[30%] flex-1 py-2"
                                  onPress={() =>
                                    updateExerciseDraft(exercise.programExercise.id, {
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
                                    draft?.trackingMode === option.value ? 'primary' : 'secondary'
                                  }
                                  className={compactButtonClassName}
                                  onPress={() =>
                                    updateExerciseDraft(exercise.programExercise.id, {
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
                                  variant={draft?.unit === option.value ? 'primary' : 'secondary'}
                                  className={compactButtonClassName}
                                  onPress={() =>
                                    updateExerciseDraft(exercise.programExercise.id, {
                                      unit: option.value,
                                      targetWeight:
                                        option.value === 'bodyweight'
                                          ? '0'
                                          : draft?.targetWeight ?? '',
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
                                value={draft?.targetSets ?? ''}
                                onChangeText={(targetSets) =>
                                  updateExerciseDraft(exercise.programExercise.id, { targetSets })
                                }
                              />
                            </View>
                            <View className="flex-1 gap-2">
                              <ThemedText type="defaultSemiBold">
                                {draft?.trackingMode === 'time' ? 'Seconds min' : 'Reps min'}
                              </ThemedText>
                              <TextInput
                                className={inputClassName}
                                keyboardType="numeric"
                                placeholder={draft?.trackingMode === 'time' ? '30' : '3'}
                                placeholderTextColor="#8A9296"
                                value={draft?.targetMin ?? ''}
                                onChangeText={(targetMin) =>
                                  updateExerciseDraft(exercise.programExercise.id, { targetMin })
                                }
                              />
                            </View>
                          </View>

                          <View className="flex-row gap-3">
                            <View className="flex-1 gap-2">
                              <ThemedText type="defaultSemiBold">
                                {draft?.trackingMode === 'time' ? 'Seconds max' : 'Reps max'}
                              </ThemedText>
                              <TextInput
                                className={inputClassName}
                                keyboardType="numeric"
                                placeholder={draft?.trackingMode === 'time' ? '60' : '5'}
                                placeholderTextColor="#8A9296"
                                value={draft?.targetMax ?? ''}
                                onChangeText={(targetMax) =>
                                  updateExerciseDraft(exercise.programExercise.id, { targetMax })
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
                                value={draft?.targetWeight ?? ''}
                                onChangeText={(targetWeight) =>
                                  updateExerciseDraft(exercise.programExercise.id, {
                                    targetWeight,
                                  })
                                }
                              />
                            </View>
                          </View>

                          <View className="flex-row gap-3">
                            <AppButton
                              title="Save Exercise"
                              className="flex-1"
                              disabled={!parsedExercise}
                              onPress={() => saveExercise(exercise.programExercise.id)}
                            />
                            <AppButton
                              title="Archive"
                              variant="secondary"
                              className="flex-1"
                              onPress={() => archiveExercise(exercise.programExercise.id)}
                            />
                          </View>
                        </View>

                        <InsertExerciseButton
                          onPress={() =>
                            insertExercise(day.day.id, exercise.programExercise.id)
                          }
                        />
                      </View>
                    );
                  })}
                </View>
              </ThemedView>
            ))}
          </View>

          <View className="gap-3 pb-8">
            <AppButton
              title="Add Day"
              variant="secondary"
              onPress={() =>
                dispatch(
                  addWorkoutDay({
                    programId: program.id,
                    name: `Day ${renderedDays.length + 1}`,
                  })
                )
              }
            />
            <AppButton
              title="Done"
              onPress={() =>
                router.replace({
                  pathname: '/program/[programId]',
                  params: { programId: program.id },
                } as Href)
              }
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}
