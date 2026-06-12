import { Stack, useLocalSearchParams, useNavigation, useRouter, type Href } from 'expo-router';
import { Fragment, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppButton } from '@/components/ui/app-button';
import { useAppDialog } from '@/components/ui/app-dialog';
import { AppTextInput } from '@/components/ui/app-text-input';
import { IconButton } from '@/components/ui/icon-button';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Palette } from '@/constants/theme';
import {
    getUpdatedWorkoutProgramExerciseDraft,
    getWorkoutProgramExerciseDraft,
    parseWorkoutProgramExerciseDraft,
    type WorkoutProgramExerciseDraft,
} from '@/features/workouts/workout-form-helpers';
import {
    selectProgramById,
    selectProgramEditorDaysByProgramId,
    type ProgramEditorDay,
} from '@/features/workouts/workout-selectors';
import {
    addProgramExercise,
    addWorkoutDay,
    archiveProgramExercise,
    archiveWorkoutDay,
    reorderProgramExercises,
    reorderWorkoutDays,
    restoreWorkoutState,
    updateProgramExercise,
    updateWorkoutDay,
    updateWorkoutProgram,
} from '@/features/workouts/workout-slice';
import { useAppDispatch, useAppSelector, useAppStore } from '@/store/hooks';
import type {
    CreateWorkoutProgramExerciseInput,
    ExerciseTrackingMode,
    TrainingGoal,
    WeightUnit,
    WorkoutState,
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

function InsertExerciseButton({ onPress }: { onPress: () => void }) {
  return (
    <IconButton
      name="plus"
      accessibilityLabel="Insert exercise"
      className="self-center bg-raised"
      color={Palette.accent}
      onPress={onPress}
    />
  );
}

function InsertDayButton({ onPress }: { onPress: () => void }) {
  return (
    <IconButton
      name="plus"
      accessibilityLabel="Insert day"
      className="self-center bg-surface"
      color={Palette.accent}
      onPress={onPress}
    />
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
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const showDialog = useAppDialog();
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
  const [exerciseDrafts, setExerciseDrafts] = useState<Record<string, WorkoutProgramExerciseDraft>>({});

  // Snapshot the whole workout slice when the editor opens so "Discard" can
  // fully revert — including adds/removes/reorders, which persist immediately.
  const snapshotRef = useRef<WorkoutState | null>(null);
  if (snapshotRef.current === null) {
    snapshotRef.current = JSON.parse(JSON.stringify(store.getState().workout)) as WorkoutState;
  }

  // `dirty` drives the leave guard; the ref mirrors it for the stable listener,
  // and `bypassRef` lets an intentional save/discard skip the prompt.
  const [dirty, setDirty] = useState(false);
  const isDirtyRef = useRef(false);
  isDirtyRef.current = dirty;
  const bypassRef = useRef(false);
  const markDirty = () => setDirty(true);

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
      const nextDrafts: Record<string, WorkoutProgramExerciseDraft> = {};

      editorDays.forEach(({ exercises }) => {
        exercises.forEach((exercise) => {
          nextDrafts[exercise.programExercise.id] =
            currentDrafts[exercise.programExercise.id] ?? getWorkoutProgramExerciseDraft(exercise);
        });
      });

      return nextDrafts;
    });
  }, [editorDays]);

  const updateExerciseDraft = (
    programExerciseId: string,
    updates: Partial<WorkoutProgramExerciseDraft>
  ) => {
    markDirty();
    setExerciseDrafts((currentDrafts) => {
      const currentDraft = currentDrafts[programExerciseId];

      if (!currentDraft) {
        return currentDrafts;
      }

      return {
        ...currentDrafts,
        [programExerciseId]: getUpdatedWorkoutProgramExerciseDraft(currentDraft, updates),
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
    const exercise = draft ? parseWorkoutProgramExerciseDraft(draft) : null;

    if (!exercise) {
      return;
    }

    dispatch(updateProgramExercise({ programExerciseId, exercise }));
  };

  // Flush every pending edit at once. Each helper already validates and skips
  // no-op/invalid drafts, so calling them unconditionally is safe.
  const commitAllDrafts = () => {
    saveProgramName();
    editorDays.forEach((day) => {
      saveDayName(day.day.id);
      day.exercises.forEach((exercise) => saveExercise(exercise.programExercise.id));
    });
  };

  // Keep the latest commit closure reachable from the once-subscribed leave guard.
  const commitRef = useRef(commitAllDrafts);
  commitRef.current = commitAllDrafts;

  const handleSave = () => {
    if (!program) {
      return;
    }

    bypassRef.current = true;
    commitAllDrafts();
    router.replace({
      pathname: '/program/[programId]',
      params: { programId: program.id },
    } as Href);
  };

  // Intercept back / gesture / hardware-back while there are unsaved changes.
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      if (bypassRef.current || !isDirtyRef.current) {
        return;
      }

      event.preventDefault();
      showDialog({
        title: 'Unsaved changes',
        message: 'Save your changes before leaving?',
        buttons: [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              bypassRef.current = true;
              if (snapshotRef.current) {
                dispatch(restoreWorkoutState(snapshotRef.current));
              }
              navigation.dispatch(event.data.action);
            },
          },
          {
            text: 'Save',
            onPress: () => {
              bypassRef.current = true;
              commitRef.current();
              navigation.dispatch(event.data.action);
            },
          },
        ],
      });
    });

    return unsubscribe;
  }, [dispatch, navigation, showDialog]);

  const insertExercise = (
    dayId: string,
    insertAfterProgramExerciseId?: string | null
  ) => {
    markDirty();
    dispatch(
      addProgramExercise({
        workoutDayTemplateId: dayId,
        insertAfterProgramExerciseId,
        exercise: defaultExerciseInput,
      })
    );
  };

  const insertDay = (insertAfterWorkoutDayTemplateId: string | null) => {
    if (!program) {
      return;
    }

    markDirty();
    dispatch(
      addWorkoutDay({
        programId: program.id,
        insertAfterWorkoutDayTemplateId,
      })
    );
  };

  const archiveDay = (dayId: string) => {
    showDialog({
      title: 'Archive day?',
      message: 'This removes the day from future workouts.',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: () => {
            markDirty();
            dispatch(archiveWorkoutDay({ workoutDayTemplateId: dayId }));
          },
        },
      ],
    });
  };

  const archiveExercise = (programExerciseId: string) => {
    showDialog({
      title: 'Archive exercise?',
      message: 'This removes the exercise from future workouts.',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: () => {
            markDirty();
            dispatch(archiveProgramExercise({ programExerciseId }));
          },
        },
      ],
    });
  };

  const moveDay = (fromIndex: number, toIndex: number) => {
    if (!program || toIndex < 0 || toIndex >= editorDays.length) {
      return;
    }

    markDirty();
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

    markDirty();
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

  if (!program) {
    return (
      <ThemedView className="flex-1 px-5 py-10">
        <View className="flex-1 justify-center gap-6">
          <View className="gap-3">
            <ThemedText type="title">Program not found</ThemedText>
            <ThemedText className="opacity-60">Choose a saved program from Home.</ThemedText>
          </View>
          <AppButton title="Back Home" onPress={() => router.replace('/' as Href)} />
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView className="flex-1">
      <Stack.Screen
        options={{
          headerRight: () => (
            <PressableScale
              accessibilityLabel="Save program"
              accessibilityRole="button"
              hitSlop={8}
              className="pl-4"
              onPress={handleSave}>
              <ThemedText type="defaultSemiBold" style={{ color: Palette.accent }}>
                Save
              </ThemedText>
            </PressableScale>
          ),
        }}
      />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.select({ ios: 'padding', default: undefined })}>
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-7 px-5 py-8"
          keyboardShouldPersistTaps="handled">
          <View className="gap-3">
            <ThemedText type="title">Edit Program</ThemedText>
            <AppTextInput
              placeholder="Program name"
              value={programName}
              onChangeText={(name) => {
                markDirty();
                setProgramName(name);
              }}
            />
          </View>

          <View className="gap-4">
            <InsertDayButton onPress={() => insertDay(null)} />
            {editorDays.map((day, dayIndex) => (
              <Fragment key={day.day.id}>
              <View style={cardStyle} className="gap-4 rounded-10 bg-surface p-5">
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
                        disabled={dayIndex === editorDays.length - 1}
                        onPress={() => moveDay(dayIndex, dayIndex + 1)}
                      />
                    </View>
                  </View>

                  <AppTextInput
                    placeholder="Day name"
                    value={dayNameDrafts[day.day.id] ?? day.day.name}
                    onChangeText={(name) => {
                      markDirty();
                      setDayNameDrafts((currentDrafts) => ({
                        ...currentDrafts,
                        [day.day.id]: name,
                      }));
                    }}
                  />
                  <AppButton
                    title="Archive Day"
                    variant="secondary"
                    onPress={() => archiveDay(day.day.id)}
                  />
                </View>

                <View className="gap-3">
                  <InsertExerciseButton onPress={() => insertExercise(day.day.id, null)} />
                  {day.exercises.map((exercise, exerciseIndex) => {
                    const draft = exerciseDrafts[exercise.programExercise.id];

                    return (
                      <View key={exercise.programExercise.id} className="gap-3">
                        <View className="gap-3 rounded-10 bg-raised p-4">
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

                          <AppTextInput
                            placeholder="Exercise name"
                            value={draft?.name ?? exercise.exerciseName}
                            onChangeText={(name) =>
                              updateExerciseDraft(exercise.programExercise.id, { name })
                            }
                          />

                          <View className="gap-2">
                            <ThemedText type="label">Goal</ThemedText>
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
                            <ThemedText type="label">Target</ThemedText>
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
                            <ThemedText type="label">Unit</ThemedText>
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
                              <AppTextInput
                                keyboardType="numeric"
                                placeholder="3"
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
                              <AppTextInput
                                keyboardType="numeric"
                                placeholder={draft?.trackingMode === 'time' ? '30' : '3'}
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
                              <AppTextInput
                                keyboardType="numeric"
                                placeholder={draft?.trackingMode === 'time' ? '60' : '5'}
                                value={draft?.targetMax ?? ''}
                                onChangeText={(targetMax) =>
                                  updateExerciseDraft(exercise.programExercise.id, { targetMax })
                                }
                              />
                            </View>
                            <View className="flex-1 gap-2">
                              <ThemedText type="defaultSemiBold">Weight</ThemedText>
                              <AppTextInput
                                keyboardType="decimal-pad"
                                placeholder="0"
                                value={draft?.targetWeight ?? ''}
                                onChangeText={(targetWeight) =>
                                  updateExerciseDraft(exercise.programExercise.id, {
                                    targetWeight,
                                  })
                                }
                              />
                            </View>
                          </View>

                          <AppButton
                            title="Archive"
                            variant="secondary"
                            onPress={() => archiveExercise(exercise.programExercise.id)}
                          />
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
              </View>
              <InsertDayButton onPress={() => insertDay(day.day.id)} />
              </Fragment>
            ))}
          </View>

          <View className="gap-3 pb-8">
            <AppButton title="Save" onPress={handleSave} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}
