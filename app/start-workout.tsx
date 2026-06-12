import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppButton } from '@/components/ui/app-button';
import { WorkoutAnalyticsSummary } from '@/components/workout/analytics-summary';
import {
  selectActiveProgram,
  selectActiveSessionDay,
  selectActiveSessionExerciseReferences,
  selectActiveSessionPlannedExercises,
  selectActiveSessionSets,
  selectActiveWorkoutSession,
  selectTotalSets,
  selectTotalVolume,
} from '@/features/workouts/workout-selectors';
import {
  addSet,
  clearCurrentWorkout,
  deleteSet,
  finishCurrentWorkout,
  updateSet,
} from '@/features/workouts/workout-slice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import type { PowerQuality, ProgramExercise, WorkoutSet } from '@/types/workout';
import { formatDuration, parseWorkoutNumberInput } from '@/utils/workout-formatters';

const inputClassName =
  'min-h-12 rounded-lg border border-[#D3DEE3] bg-white px-4 text-base text-[#11181C] dark:border-[#34413F] dark:bg-[#263331] dark:text-[#ECEDEE]';

const compactButtonClassName = 'min-h-10 flex-1 px-2 py-2';
const weightStep = 2.5;

const powerQualityOptions: { label: string; value: PowerQuality }[] = [
  { label: 'Fast', value: 'fast' },
  { label: 'Good', value: 'good' },
  { label: 'Slow', value: 'slow' },
  { label: 'Failed', value: 'failed' },
];

const powerQualityLabels: Record<PowerQuality, string> = {
  failed: 'Failed',
  fast: 'Fast',
  good: 'Good',
  slow: 'Slow',
};

const getPlannedExerciseTargetText = (programExercise: ProgramExercise) => {
  if (programExercise.trackingMode === 'time') {
    return `${programExercise.targetSets} x ${programExercise.targetSecondsMin ?? 30}-${
      programExercise.targetSecondsMax ?? 60
    }s`;
  }

  return `${programExercise.targetSets} x ${programExercise.targetRepMin ?? 1}-${
    programExercise.targetRepMax ?? programExercise.targetRepMin ?? 1
  }`;
};

const getSetWorkLabel = (set: WorkoutSet) =>
  set.durationSeconds !== undefined ? `${set.durationSeconds}s` : `${set.reps ?? 0} reps`;

const getSetTotalLabel = (set: WorkoutSet) =>
  set.durationSeconds !== undefined ? `${set.durationSeconds}s` : `${(set.reps ?? 0) * set.weight}`;

type CompletedWorkoutSummary = {
  name: string;
  programName: string;
  dayName?: string;
  totalSets: number;
  totalVolume: number;
  durationSeconds: number;
};

const formatNumberInputValue = (value: number) =>
  Number.isInteger(value) ? value.toString() : Number(value.toFixed(2)).toString();

const getAdjustedNumberInput = ({
  delta,
  minimum,
  round,
  value,
}: {
  delta: number;
  minimum: number;
  round?: boolean;
  value: string;
}) => {
  const parsedValue = parseWorkoutNumberInput(value);
  const currentValue = Number.isFinite(parsedValue) ? parsedValue : minimum;
  const nextValue = Math.max(minimum, currentValue + delta);

  return formatNumberInputValue(round ? Math.round(nextValue) : nextValue);
};

export default function StartWorkoutScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const activeProgram = useAppSelector(selectActiveProgram);
  const activeSession = useAppSelector(selectActiveWorkoutSession);
  const activeDay = useAppSelector(selectActiveSessionDay);
  const plannedExercises = useAppSelector(selectActiveSessionPlannedExercises);
  const lastExerciseReferences = useAppSelector(selectActiveSessionExerciseReferences);
  const activeSets = useAppSelector(selectActiveSessionSets);
  const totalSets = useAppSelector(selectTotalSets);
  const totalVolume = useAppSelector(selectTotalVolume);
  const exercisesById = useAppSelector((state) => state.workout.exercises);

  const [selectedProgramExerciseId, setSelectedProgramExerciseId] = useState<string | null>(null);
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [completedSummary, setCompletedSummary] = useState<CompletedWorkoutSummary | null>(null);
  const [reps, setReps] = useState('');
  const [weight, setWeight] = useState('');
  const [powerQuality, setPowerQuality] = useState<PowerQuality | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const getLoggedSetCountForPlannedExercise = useCallback(
    (programExerciseId: string, exerciseId?: string) =>
      activeSets.filter((set) =>
        set.programExerciseId
          ? set.programExerciseId === programExerciseId
          : set.exerciseId === exerciseId
      ).length,
    [activeSets]
  );

  const getDraftSetValues = useCallback(
    (programExerciseId: string, loggedSetCountOverride?: number) => {
      const plannedExercise = plannedExercises.find(
        (exercise) => exercise.programExercise.id === programExerciseId
      );
      const lastExerciseReference = lastExerciseReferences.find(
        (reference) => reference.programExerciseId === programExerciseId
      );
      const loggedSetCount =
        loggedSetCountOverride ??
        getLoggedSetCountForPlannedExercise(
          programExerciseId,
          plannedExercise?.programExercise.exerciseId
        );
      const suggestedSet =
        lastExerciseReference && lastExerciseReference.suggestedSets.length > 0
          ? lastExerciseReference.suggestedSets[
              Math.min(loggedSetCount, lastExerciseReference.suggestedSets.length - 1)
            ]
          : null;

      const isTimeBasedExercise = plannedExercise?.programExercise.trackingMode === 'time';
      const fallbackWorkAmount = isTimeBasedExercise
        ? plannedExercise?.programExercise.targetSecondsMin
        : plannedExercise?.programExercise.targetRepMin;

      return {
        repsValue: suggestedSet
          ? formatNumberInputValue(
              isTimeBasedExercise
                ? suggestedSet.durationSeconds ?? fallbackWorkAmount ?? 30
                : suggestedSet.reps ?? fallbackWorkAmount ?? 1
            )
          : fallbackWorkAmount?.toString() ?? '',
        weightValue: suggestedSet
          ? formatNumberInputValue(suggestedSet.weight)
          : plannedExercise?.programExercise.targetWeight?.toString() ?? '',
      };
    },
    [getLoggedSetCountForPlannedExercise, lastExerciseReferences, plannedExercises]
  );

  const setDraftSetValues = useCallback(
    (programExerciseId: string, loggedSetCountOverride?: number) => {
      const { repsValue, weightValue } = getDraftSetValues(
        programExerciseId,
        loggedSetCountOverride
      );

      setReps(repsValue);
      setWeight(weightValue);
    },
    [getDraftSetValues]
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (activeSession) {
      setCompletedSummary(null);
    }
  }, [activeSession]);

  useEffect(() => {
    if (editingSetId) {
      return;
    }

    if (
      plannedExercises.length > 0 &&
      !plannedExercises.some((plannedExercise) => plannedExercise.programExercise.id === selectedProgramExerciseId)
    ) {
      const firstExercise = plannedExercises[0];

      setSelectedProgramExerciseId(firstExercise.programExercise.id);
      setDraftSetValues(firstExercise.programExercise.id);
      setPowerQuality(null);
    }
  }, [editingSetId, plannedExercises, selectedProgramExerciseId, setDraftSetValues]);

  const editingSet = editingSetId
    ? activeSets.find((set) => set.id === editingSetId) ?? null
    : null;
  const isEditingSet = editingSet !== null;
  const explicitlySelectedPlannedExercise = selectedProgramExerciseId
    ? plannedExercises.find(
        (plannedExercise) => plannedExercise.programExercise.id === selectedProgramExerciseId
      ) ?? null
    : null;
  const selectedPlannedExercise =
    explicitlySelectedPlannedExercise ??
    (!selectedProgramExerciseId && !isEditingSet ? plannedExercises[0] ?? null : null);
  const selectedLastExerciseReference = selectedPlannedExercise
    ? lastExerciseReferences.find(
        (reference) =>
          reference.programExerciseId === selectedPlannedExercise.programExercise.id
      ) ?? null
    : null;
  const selectedLoggedSetCount = selectedPlannedExercise
    ? getLoggedSetCountForPlannedExercise(
        selectedPlannedExercise.programExercise.id,
        selectedPlannedExercise.programExercise.exerciseId
      )
    : 0;
  const selectedTrackingMode =
    selectedPlannedExercise?.programExercise.trackingMode ??
    (editingSet?.durationSeconds !== undefined ? 'time' : 'reps');
  const isTimeBasedExercise = selectedTrackingMode === 'time';
  const shouldShowPowerQualityPicker =
    selectedPlannedExercise?.programExercise.trainingGoal === 'power';
  const durationSeconds = useMemo(() => {
    if (!activeSession) {
      return 0;
    }

    return Math.max(0, Math.floor((now - new Date(activeSession.startedAt).getTime()) / 1000));
  }, [activeSession, now]);

  const parsedWorkAmount = parseWorkoutNumberInput(reps);
  const parsedWeight = parseWorkoutNumberInput(weight);
  const canSubmitSet =
    activeSession !== null &&
    (isEditingSet || selectedPlannedExercise !== null) &&
    Number.isFinite(parsedWorkAmount) &&
    parsedWorkAmount > 0 &&
    Number.isFinite(parsedWeight) &&
    parsedWeight >= 0 &&
    (!shouldShowPowerQualityPicker || powerQuality !== null);
  const setFormDescription =
    isEditingSet
      ? selectedPlannedExercise
        ? shouldShowPowerQualityPicker
          ? `${selectedPlannedExercise.exerciseName}: update target, weight, or quality.`
          : `${selectedPlannedExercise.exerciseName}: update target or weight.`
        : 'Update target or weight.'
      : selectedPlannedExercise
      ? `${selectedPlannedExercise.exerciseName}: ${selectedPlannedExercise.progressionSuggestion}`
      : 'Choose a planned exercise first.';

  const handleAdjustReps = (delta: number) => {
    setReps((value) =>
      getAdjustedNumberInput({
        delta,
        minimum: 1,
        round: true,
        value,
      })
    );
  };

  const handleAdjustWeight = (delta: number) => {
    setWeight((value) =>
      getAdjustedNumberInput({
        delta,
        minimum: 0,
        value,
      })
    );
  };

  const handleSelectExercise = (programExerciseId: string) => {
    if (isEditingSet) {
      return;
    }

    setSelectedProgramExerciseId(programExerciseId);
    setDraftSetValues(programExerciseId);
    setPowerQuality(null);
  };

  const handleCancelEdit = () => {
    const programExerciseId = selectedProgramExerciseId;

    setEditingSetId(null);
    if (programExerciseId) {
      setDraftSetValues(programExerciseId);
    } else {
      setReps('');
      setWeight('');
    }
    setPowerQuality(null);
  };

  const handleEditSet = (setId: string) => {
    const set = activeSets.find((activeSet) => activeSet.id === setId);

    if (!set) {
      return;
    }

    const inferredPlannedExercises = set.programExerciseId
      ? plannedExercises.filter(
          (plannedExercise) => plannedExercise.programExercise.id === set.programExerciseId
        )
      : plannedExercises.filter(
          (plannedExercise) => plannedExercise.programExercise.exerciseId === set.exerciseId
        );
    const inferredPlannedExercise =
      inferredPlannedExercises.length === 1 ? inferredPlannedExercises[0] : null;

    setEditingSetId(set.id);
    setSelectedProgramExerciseId(inferredPlannedExercise?.programExercise.id ?? null);
    setReps((set.durationSeconds ?? set.reps ?? '').toString());
    setWeight(set.weight.toString());
    setPowerQuality(set.powerQuality ?? null);
  };

  const handleDeleteSet = (setId: string) => {
    Alert.alert('Delete set?', 'This removes the logged set from this workout.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          if (editingSetId === setId) {
            handleCancelEdit();
          }

          dispatch(deleteSet({ setId }));
        },
      },
    ]);
  };

  const handleSubmitSet = () => {
    if (!canSubmitSet) {
      return;
    }

    if (editingSet) {
      dispatch(
        updateSet({
          setId: editingSet.id,
          ...(isTimeBasedExercise
            ? { durationSeconds: Math.round(parsedWorkAmount) }
            : { reps: Math.round(parsedWorkAmount) }),
          weight: parsedWeight,
          powerQuality: shouldShowPowerQualityPicker ? powerQuality ?? undefined : undefined,
        })
      );
      setEditingSetId(null);
      if (selectedProgramExerciseId) {
        setDraftSetValues(selectedProgramExerciseId);
      } else {
        setReps('');
        setWeight('');
      }
      setPowerQuality(null);
      return;
    }

    if (!selectedPlannedExercise) {
      return;
    }

    dispatch(
      addSet({
        exerciseId: selectedPlannedExercise.programExercise.exerciseId,
        programExerciseId: selectedPlannedExercise.programExercise.id,
        ...(isTimeBasedExercise
          ? { durationSeconds: Math.round(parsedWorkAmount) }
          : { reps: Math.round(parsedWorkAmount) }),
        weight: parsedWeight,
        powerQuality: shouldShowPowerQualityPicker ? powerQuality ?? undefined : undefined,
      })
    );
    setDraftSetValues(selectedPlannedExercise.programExercise.id, selectedLoggedSetCount + 1);
    setPowerQuality(null);
  };

  const handleFinishWorkout = () => {
    if (!activeSession) {
      return;
    }

    setCompletedSummary({
      name: activeSession.name,
      programName: activeProgram?.name ?? 'Program',
      dayName: activeDay?.name,
      totalSets,
      totalVolume,
      durationSeconds,
    });
    setSelectedProgramExerciseId(null);
    setEditingSetId(null);
    setReps('');
    setWeight('');
    setPowerQuality(null);
    dispatch(finishCurrentWorkout());
  };

  const handleClearWorkout = () => {
    setSelectedProgramExerciseId(null);
    setEditingSetId(null);
    setCompletedSummary(null);
    setReps('');
    setWeight('');
    setPowerQuality(null);
    dispatch(clearCurrentWorkout());
  };

  if (completedSummary) {
    return (
      <ThemedView className="flex-1 px-6 py-10">
        <View className="flex-1 justify-center gap-6">
          <View className="gap-3">
            <ThemedText type="title">Workout Complete</ThemedText>
            <ThemedText className="opacity-70">
              {completedSummary.dayName
                ? `${completedSummary.programName} - ${completedSummary.dayName}`
                : completedSummary.name}
            </ThemedText>
          </View>

          <WorkoutAnalyticsSummary
            metrics={[
              { label: 'Sets', value: completedSummary.totalSets },
              { label: 'Volume', value: completedSummary.totalVolume },
              { label: 'Time', value: formatDuration(completedSummary.durationSeconds) },
            ]}
          />

          <AppButton
            title="Back Home"
            onPress={() => {
              setCompletedSummary(null);
              router.replace('/' as Href);
            }}
          />
        </View>
      </ThemedView>
    );
  }

  if (!activeSession) {
    return (
      <ThemedView className="flex-1 px-6 py-10">
        <View className="flex-1 justify-center gap-6">
          <View className="gap-3">
            <ThemedText type="title">Start Workout</ThemedText>
            <ThemedText className="opacity-70">
              Choose a workout from Home before logging sets.
            </ThemedText>
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
          <View className="gap-2">
            <ThemedText type="title">{activeSession.name}</ThemedText>
            <ThemedText className="opacity-70">
              {activeDay
                ? `${activeProgram?.name ?? 'Program'} - ${activeDay.name}`
                : 'Log your planned exercises.'}
            </ThemedText>
          </View>

          <WorkoutAnalyticsSummary
            metrics={[
              { label: 'Sets', value: totalSets },
              { label: 'Volume', value: totalVolume },
              { label: 'Time', value: formatDuration(durationSeconds) },
            ]}
          />

          <ThemedView lightColor="#F3FAF8" darkColor="#1D2826" className="gap-4 rounded-xl p-5">
            <ThemedText type="subtitle">Planned Exercises</ThemedText>
            <View className="gap-3">
              {plannedExercises.length === 0 ? (
                <ThemedText className="opacity-70">No planned exercises yet.</ThemedText>
              ) : (
                plannedExercises.map((plannedExercise) => {
                  const isSelected =
                    plannedExercise.programExercise.id ===
                    selectedPlannedExercise?.programExercise.id;
                  const targetText = getPlannedExerciseTargetText(
                    plannedExercise.programExercise
                  );

                  return (
                    <AppButton
                      key={plannedExercise.programExercise.id}
                      title={`${plannedExercise.exerciseName} - ${targetText}`}
                      variant={isSelected ? 'primary' : 'secondary'}
                      disabled={isEditingSet}
                      onPress={() => handleSelectExercise(plannedExercise.programExercise.id)}
                    />
                  );
                })
              )}
            </View>
          </ThemedView>

          <ThemedView lightColor="#F3FAF8" darkColor="#1D2826" className="gap-4 rounded-xl p-5">
            <View className="gap-1">
              <ThemedText type="subtitle">{isEditingSet ? 'Edit Set' : 'Add Set'}</ThemedText>
              <ThemedText className="opacity-70">{setFormDescription}</ThemedText>
            </View>

            {!isEditingSet && selectedLastExerciseReference ? (
              <View className="gap-1 border-l-2 border-[#0A7EA4] pl-3">
                <ThemedText className="opacity-70">
                  Last time ({selectedLastExerciseReference.dateLabel}):{' '}
                  {selectedLastExerciseReference.setsLabel}
                </ThemedText>
                <ThemedText className="opacity-70">
                  Best set: {selectedLastExerciseReference.bestSetLabel}
                </ThemedText>
                <ThemedText className="opacity-70">
                  Suggestion: {selectedLastExerciseReference.suggestion}
                </ThemedText>
              </View>
            ) : null}

            <View className="flex-row gap-3">
              <View className="flex-1 gap-2">
                <ThemedText type="defaultSemiBold">
                  {isTimeBasedExercise ? 'Seconds' : 'Reps'}
                </ThemedText>
                <TextInput
                  className={inputClassName}
                  keyboardType="numeric"
                  placeholder={isTimeBasedExercise ? '30' : '10'}
                  placeholderTextColor="#8A9296"
                  value={reps}
                  onChangeText={setReps}
                />
                <View className="flex-row gap-2">
                  <AppButton
                    title="-"
                    variant="secondary"
                    className={compactButtonClassName}
                    onPress={() => handleAdjustReps(isTimeBasedExercise ? -5 : -1)}
                  />
                  <AppButton
                    title="+"
                    variant="secondary"
                    className={compactButtonClassName}
                    onPress={() => handleAdjustReps(isTimeBasedExercise ? 5 : 1)}
                  />
                </View>
              </View>

              <View className="flex-1 gap-2">
                <ThemedText type="defaultSemiBold">Weight</ThemedText>
                <TextInput
                  className={inputClassName}
                  keyboardType="decimal-pad"
                  placeholder={
                    selectedPlannedExercise?.programExercise.targetWeight?.toString() ?? '0'
                  }
                  placeholderTextColor="#8A9296"
                  value={weight}
                  onChangeText={setWeight}
                />
                <View className="flex-row gap-2">
                  <AppButton
                    title={`-${weightStep}kg`}
                    variant="secondary"
                    className={compactButtonClassName}
                    onPress={() => handleAdjustWeight(-weightStep)}
                  />
                  <AppButton
                    title={`+${weightStep}kg`}
                    variant="secondary"
                    className={compactButtonClassName}
                    onPress={() => handleAdjustWeight(weightStep)}
                  />
                </View>
              </View>
            </View>

            {shouldShowPowerQualityPicker ? (
              <View className="gap-2">
                <ThemedText type="defaultSemiBold">Power Quality</ThemedText>
                <View className="flex-row flex-wrap gap-2">
                  {powerQualityOptions.map((option) => (
                    <AppButton
                      key={option.value}
                      title={option.label}
                      variant={powerQuality === option.value ? 'primary' : 'secondary'}
                      className="min-h-10 min-w-[46%] flex-1 py-2"
                      onPress={() => setPowerQuality(option.value)}
                    />
                  ))}
                </View>
              </View>
            ) : null}

            <AppButton
              title={isEditingSet ? 'Save Changes' : 'Add Set'}
              disabled={!canSubmitSet}
              onPress={handleSubmitSet}
            />
            {isEditingSet ? (
              <AppButton title="Cancel Edit" variant="secondary" onPress={handleCancelEdit} />
            ) : null}
          </ThemedView>

          <View className="gap-3">
            <ThemedText type="subtitle">Logged Sets</ThemedText>
            {activeSets.length === 0 ? (
              <ThemedView lightColor="#F3FAF8" darkColor="#1D2826" className="rounded-lg p-4">
                <ThemedText className="opacity-70">No sets yet.</ThemedText>
              </ThemedView>
            ) : (
              activeSets.map((set) => {
                const plannedExercise = plannedExercises.find(
                  (exercise) => exercise.programExercise.id === set.programExerciseId
                );

                return (
                  <ThemedView
                    key={set.id}
                    lightColor="#F3FAF8"
                    darkColor="#1D2826"
                    className="gap-3 rounded-lg p-4">
                    <View className="flex-row items-center justify-between gap-3">
                      <View className="flex-1 gap-1">
                        <ThemedText type="defaultSemiBold">
                          Set {set.setNumber}:{' '}
                          {plannedExercise?.exerciseName ??
                            exercisesById[set.exerciseId]?.name ??
                            'Exercise'}
                        </ThemedText>
                        <ThemedText className="opacity-70">
                          {getSetWorkLabel(set)} x {set.weight} {set.unit}
                        </ThemedText>
                        {set.powerQuality ? (
                          <ThemedText className="opacity-70">
                            Quality: {powerQualityLabels[set.powerQuality]}
                          </ThemedText>
                        ) : null}
                      </View>
                      <ThemedText type="defaultSemiBold">{getSetTotalLabel(set)}</ThemedText>
                    </View>
                    <View className="flex-row gap-3">
                      <AppButton
                        title="Edit"
                        variant="secondary"
                        className="min-h-10 flex-1 py-2"
                        onPress={() => handleEditSet(set.id)}
                      />
                      <AppButton
                        title="Delete"
                        variant="secondary"
                        className="min-h-10 flex-1 py-2"
                        onPress={() => handleDeleteSet(set.id)}
                      />
                    </View>
                  </ThemedView>
                );
              })
            )}
          </View>

          <View className="gap-3">
            <AppButton
              title="Finish Workout"
              disabled={isEditingSet}
              onPress={handleFinishWorkout}
            />
            <AppButton
              title="Clear Workout"
              variant="secondary"
              onPress={handleClearWorkout}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}
