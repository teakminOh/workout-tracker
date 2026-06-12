import { Stack, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  View,
  type TextStyle,
} from 'react-native';
import Animated, { FadeInDown, FadeOut, LinearTransition, ZoomIn } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppButton } from '@/components/ui/app-button';
import { useAppDialog } from '@/components/ui/app-dialog';
import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { PressableScale } from '@/components/ui/pressable-scale';
import { ProgressBar } from '@/components/ui/progress-bar';
import { WorkoutAnalyticsSummary } from '@/components/workout/analytics-summary';
import { Palette } from '@/constants/theme';
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
import type { PowerQuality, ProgramExercise, WeightUnit, WorkoutSet } from '@/types/workout';
import { formatDuration, parseWorkoutNumberInput } from '@/utils/workout-formatters';

const inputClassName =
  'min-h-14 flex-1 rounded-10 bg-raised px-4 text-center text-cream';

const inputTextStyle: TextStyle = {
  borderCurve: 'continuous',
  fontSize: 22,
  fontWeight: '600',
  fontVariant: ['tabular-nums'],
};

const cardStyle = { borderCurve: 'continuous' } as const;

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

const formatSetWeight = (weight: number, unit: WeightUnit) =>
  unit === 'bodyweight' ? 'BW' : `${weight} ${unit}`;

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
  const showDialog = useAppDialog();
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

  const lastLoggedSet = activeSets.length > 0 ? activeSets[activeSets.length - 1] : null;
  const restSeconds = lastLoggedSet
    ? Math.max(0, Math.floor((now - new Date(lastLoggedSet.completedAt).getTime()) / 1000))
    : null;
  const plannedTotalSets = plannedExercises.reduce(
    (total, plannedExercise) => total + Math.max(0, plannedExercise.programExercise.targetSets),
    0
  );
  const sessionProgress = plannedTotalSets > 0 ? totalSets / plannedTotalSets : 0;

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

  const logCardLabel = isEditingSet
    ? `Edit set ${editingSet.setNumber}`
    : selectedPlannedExercise
      ? selectedLoggedSetCount < selectedPlannedExercise.programExercise.targetSets
        ? `Set ${selectedLoggedSetCount + 1} of ${selectedPlannedExercise.programExercise.targetSets}`
        : `Set ${selectedLoggedSetCount + 1}`
      : 'Log set';
  const logCardTitle = isEditingSet
    ? exercisesById[editingSet.exerciseId]?.name ?? 'Exercise'
    : selectedPlannedExercise?.exerciseName ?? 'No exercise selected';
  const logCardCaption = isEditingSet
    ? shouldShowPowerQualityPicker
      ? 'Update target, weight, or quality.'
      : 'Update target or weight.'
    : selectedPlannedExercise
      ? selectedPlannedExercise.progressionSuggestion
      : 'Choose an exercise above to start logging.';

  const weightLabel = (() => {
    const unit = isEditingSet
      ? editingSet.unit
      : (selectedPlannedExercise?.unit as WeightUnit | undefined);

    if (!unit) {
      return 'Weight';
    }

    return unit === 'bodyweight' ? 'Weight (BW)' : `Weight (${unit})`;
  })();

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
    showDialog({
      title: 'Delete set?',
      message: 'This removes the logged set from this workout.',
      buttons: [
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
      ],
    });
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

    const currentProgramExerciseId = selectedPlannedExercise.programExercise.id;
    const nextLoggedSetCount = selectedLoggedSetCount + 1;

    dispatch(
      addSet({
        exerciseId: selectedPlannedExercise.programExercise.exerciseId,
        programExerciseId: currentProgramExerciseId,
        ...(isTimeBasedExercise
          ? { durationSeconds: Math.round(parsedWorkAmount) }
          : { reps: Math.round(parsedWorkAmount) }),
        weight: parsedWeight,
        powerQuality: shouldShowPowerQualityPicker ? powerQuality ?? undefined : undefined,
      })
    );

    // Flow shortcut: once an exercise hits its target sets, jump to the next
    // unfinished exercise with its suggested values prefilled.
    if (nextLoggedSetCount >= selectedPlannedExercise.programExercise.targetSets) {
      const currentIndex = plannedExercises.findIndex(
        (plannedExercise) => plannedExercise.programExercise.id === currentProgramExerciseId
      );
      const candidates = [
        ...plannedExercises.slice(currentIndex + 1),
        ...plannedExercises.slice(0, Math.max(0, currentIndex)),
      ];
      const nextExercise = candidates.find(
        (plannedExercise) =>
          getLoggedSetCountForPlannedExercise(
            plannedExercise.programExercise.id,
            plannedExercise.programExercise.exerciseId
          ) < plannedExercise.programExercise.targetSets
      );

      if (nextExercise) {
        setSelectedProgramExerciseId(nextExercise.programExercise.id);
        setDraftSetValues(nextExercise.programExercise.id);
        setPowerQuality(null);
        return;
      }
    }

    setDraftSetValues(currentProgramExerciseId, nextLoggedSetCount);
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
      <ThemedView className="flex-1">
        <Stack.Screen options={{ title: completedSummary.name }} />
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerClassName="flex-grow justify-center gap-7 px-5 py-8">
          <Animated.View entering={ZoomIn.springify().damping(14)}>
            <View className="items-center gap-5">
              <View
                className="h-20 w-20 items-center justify-center rounded-full"
                style={{ backgroundColor: Palette.accentSoft }}>
                <Icon name="check" size={36} color={Palette.accent} />
              </View>
              <View className="items-center gap-1">
                <ThemedText type="title">Workout Complete</ThemedText>
                <ThemedText className="opacity-60">
                  {completedSummary.dayName
                    ? `${completedSummary.programName} · ${completedSummary.dayName}`
                    : completedSummary.name}
                </ThemedText>
              </View>
            </View>
          </Animated.View>

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
        </ScrollView>
      </ThemedView>
    );
  }

  if (!activeSession) {
    return (
      <ThemedView className="flex-1">
        <Stack.Screen options={{ title: 'Workout' }} />
        <View className="flex-1 justify-center gap-6 px-5 py-10">
          <View className="gap-2">
            <ThemedText type="title">No Active Workout</ThemedText>
            <ThemedText className="opacity-60">
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
      <Stack.Screen options={{ title: activeSession.name }} />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.select({ ios: 'padding', default: undefined })}>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerClassName="gap-7 px-5 pb-12 pt-4"
          keyboardShouldPersistTaps="handled">
          <ThemedText className="opacity-60">
            {activeDay
              ? `${activeProgram?.name ?? 'Program'} · ${activeDay.name}`
              : 'Log your planned exercises.'}
          </ThemedText>

          <WorkoutAnalyticsSummary
            metrics={[
              { label: 'Sets', value: totalSets },
              { label: 'Volume', value: totalVolume },
              { label: 'Time', value: formatDuration(durationSeconds) },
              { label: 'Rest', value: restSeconds !== null ? formatDuration(restSeconds) : '—' },
            ]}>
            {plannedTotalSets > 0 ? (
              <View className="gap-2">
                <ProgressBar progress={sessionProgress} />
                <ThemedText type="label" style={{ alignSelf: 'flex-end' }}>
                  {totalSets}/{plannedTotalSets} target sets
                </ThemedText>
              </View>
            ) : null}
          </WorkoutAnalyticsSummary>

          <View className="gap-3">
            <ThemedText type="label">Exercises</ThemedText>
            {plannedExercises.length === 0 ? (
              <View style={cardStyle} className="rounded-10 bg-surface p-4">
                <ThemedText className="opacity-60">No planned exercises yet.</ThemedText>
              </View>
            ) : (
              plannedExercises.map((plannedExercise) => {
                const isSelected =
                  plannedExercise.programExercise.id ===
                  selectedPlannedExercise?.programExercise.id;
                const loggedCount = getLoggedSetCountForPlannedExercise(
                  plannedExercise.programExercise.id,
                  plannedExercise.programExercise.exerciseId
                );
                const targetCount = plannedExercise.programExercise.targetSets;
                const isComplete = targetCount > 0 && loggedCount >= targetCount;

                return (
                  <PressableScale
                    key={plannedExercise.programExercise.id}
                    accessibilityRole="button"
                    disabled={isEditingSet}
                    style={cardStyle}
                    className={[
                      'rounded-10 p-4',
                      isSelected ? 'bg-accent-soft' : 'bg-surface',
                      isEditingSet ? 'opacity-50' : undefined,
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onPress={() => handleSelectExercise(plannedExercise.programExercise.id)}>
                    <View className="flex-row items-center justify-between gap-3">
                      <View className="flex-1 gap-0.5">
                        <ThemedText
                          type="defaultSemiBold"
                          style={isSelected ? { color: Palette.accent } : undefined}>
                          {plannedExercise.exerciseName}
                        </ThemedText>
                        <ThemedText className="text-[13px] leading-5 opacity-60">
                          {getPlannedExerciseTargetText(plannedExercise.programExercise)}
                        </ThemedText>
                      </View>
                      <View className="flex-row items-center gap-2">
                        <ThemedText
                          type="defaultSemiBold"
                          style={{
                            fontVariant: ['tabular-nums'],
                            color: isComplete ? Palette.accent : Palette.muted,
                          }}>
                          {loggedCount}/{targetCount}
                        </ThemedText>
                        {isComplete ? (
                          <Icon name="check-circle" size={18} color={Palette.accent} />
                        ) : null}
                      </View>
                    </View>
                  </PressableScale>
                );
              })
            )}
          </View>

          <View style={cardStyle} className="gap-4 rounded-10 bg-surface p-5">
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1 gap-1">
                <ThemedText type="label">{logCardLabel}</ThemedText>
                <ThemedText type="subtitle">{logCardTitle}</ThemedText>
                <ThemedText className="text-[13px] leading-5 opacity-60">
                  {logCardCaption}
                </ThemedText>
              </View>
              {isEditingSet ? (
                <IconButton
                  name="x"
                  accessibilityLabel="Cancel edit"
                  onPress={handleCancelEdit}
                />
              ) : null}
            </View>

            {!isEditingSet && selectedLastExerciseReference ? (
              <View style={cardStyle} className="gap-1 rounded-10 bg-raised p-3">
                <ThemedText className="text-[13px] leading-5 opacity-60">
                  Last ({selectedLastExerciseReference.dateLabel}):{' '}
                  {selectedLastExerciseReference.setsLabel}
                </ThemedText>
                <ThemedText className="text-[13px] leading-5 opacity-60">
                  Best set: {selectedLastExerciseReference.bestSetLabel}
                </ThemedText>
                <ThemedText
                  className="text-[13px] leading-5"
                  style={{ color: Palette.accent }}>
                  {selectedLastExerciseReference.suggestion}
                </ThemedText>
              </View>
            ) : null}

            <View className="gap-2">
              <View className="flex-row items-center justify-between">
                <ThemedText type="label">{isTimeBasedExercise ? 'Seconds' : 'Reps'}</ThemedText>
                <ThemedText type="label">{isTimeBasedExercise ? '± 5' : '± 1'}</ThemedText>
              </View>
              <View className="flex-row items-center gap-2">
                <IconButton
                  name="minus"
                  accessibilityLabel={isTimeBasedExercise ? 'Decrease seconds' : 'Decrease reps'}
                  className="bg-raised"
                  color={Palette.cream}
                  onPress={() => handleAdjustReps(isTimeBasedExercise ? -5 : -1)}
                />
                <TextInput
                  className={inputClassName}
                  style={inputTextStyle}
                  keyboardType="numeric"
                  keyboardAppearance="dark"
                  selectionColor={Palette.accent}
                  placeholder={isTimeBasedExercise ? '30' : '10'}
                  placeholderTextColor={Palette.faint}
                  value={reps}
                  onChangeText={setReps}
                />
                <IconButton
                  name="plus"
                  accessibilityLabel={isTimeBasedExercise ? 'Increase seconds' : 'Increase reps'}
                  className="bg-raised"
                  color={Palette.cream}
                  onPress={() => handleAdjustReps(isTimeBasedExercise ? 5 : 1)}
                />
              </View>
            </View>

            <View className="gap-2">
              <View className="flex-row items-center justify-between">
                <ThemedText type="label">{weightLabel}</ThemedText>
                <ThemedText type="label">± {weightStep}</ThemedText>
              </View>
              <View className="flex-row items-center gap-2">
                <IconButton
                  name="minus"
                  accessibilityLabel="Decrease weight"
                  className="bg-raised"
                  color={Palette.cream}
                  onPress={() => handleAdjustWeight(-weightStep)}
                />
                <TextInput
                  className={inputClassName}
                  style={inputTextStyle}
                  keyboardType="decimal-pad"
                  keyboardAppearance="dark"
                  selectionColor={Palette.accent}
                  placeholder={
                    selectedPlannedExercise?.programExercise.targetWeight?.toString() ?? '0'
                  }
                  placeholderTextColor={Palette.faint}
                  value={weight}
                  onChangeText={setWeight}
                />
                <IconButton
                  name="plus"
                  accessibilityLabel="Increase weight"
                  className="bg-raised"
                  color={Palette.cream}
                  onPress={() => handleAdjustWeight(weightStep)}
                />
              </View>
            </View>

            {shouldShowPowerQualityPicker ? (
              <View className="gap-2">
                <ThemedText type="label">Power Quality</ThemedText>
                <View className="flex-row flex-wrap gap-2">
                  {powerQualityOptions.map((option) => {
                    const isSelected = powerQuality === option.value;

                    return (
                      <PressableScale
                        key={option.value}
                        accessibilityRole="button"
                        scaleTo={0.92}
                        className={`rounded-full px-4 py-2 ${isSelected ? 'bg-accent' : 'bg-raised'}`}
                        onPress={() => setPowerQuality(option.value)}>
                        <ThemedText
                          type="defaultSemiBold"
                          style={{
                            fontSize: 14,
                            lineHeight: 20,
                            color: isSelected ? Palette.onAccent : Palette.muted,
                          }}>
                          {option.label}
                        </ThemedText>
                      </PressableScale>
                    );
                  })}
                </View>
              </View>
            ) : null}

            <AppButton
              title={isEditingSet ? 'Save Changes' : 'Log Set'}
              icon="check"
              disabled={!canSubmitSet}
              onPress={handleSubmitSet}
            />
          </View>

          <View className="gap-3">
            <ThemedText type="label">Logged Sets</ThemedText>
            {activeSets.length === 0 ? (
              <View style={cardStyle} className="rounded-10 bg-surface p-4">
                <ThemedText className="opacity-60">No sets yet.</ThemedText>
              </View>
            ) : (
              activeSets.map((set) => {
                const plannedExercise = plannedExercises.find(
                  (exercise) => exercise.programExercise.id === set.programExerciseId
                );
                const exerciseName =
                  plannedExercise?.exerciseName ?? exercisesById[set.exerciseId]?.name ?? 'Exercise';
                const qualitySuffix = set.powerQuality
                  ? ` · ${powerQualityLabels[set.powerQuality]}`
                  : '';

                return (
                  <Animated.View
                    key={set.id}
                    entering={FadeInDown.duration(240)}
                    exiting={FadeOut.duration(150)}
                    layout={LinearTransition.duration(200)}>
                    <View
                      style={cardStyle}
                      className="flex-row items-center gap-1 rounded-10 bg-surface p-4">
                      <View className="flex-1 gap-0.5">
                        <ThemedText type="defaultSemiBold">
                          Set {set.setNumber} · {exerciseName}
                        </ThemedText>
                        <ThemedText className="text-[13px] leading-5 opacity-60">
                          {getSetWorkLabel(set)} × {formatSetWeight(set.weight, set.unit)}
                          {qualitySuffix}
                        </ThemedText>
                      </View>
                      <ThemedText
                        type="defaultSemiBold"
                        style={{ fontVariant: ['tabular-nums'], color: Palette.muted }}>
                        {getSetTotalLabel(set)}
                      </ThemedText>
                      <IconButton
                        name="edit-2"
                        size={16}
                        accessibilityLabel={`Edit set ${set.setNumber} of ${exerciseName}`}
                        onPress={() => handleEditSet(set.id)}
                      />
                      <IconButton
                        name="trash-2"
                        size={16}
                        accessibilityLabel={`Delete set ${set.setNumber} of ${exerciseName}`}
                        onPress={() => handleDeleteSet(set.id)}
                      />
                    </View>
                  </Animated.View>
                );
              })
            )}
          </View>

          <View className="gap-3">
            <AppButton
              title="Finish Workout"
              icon="check-circle"
              disabled={isEditingSet}
              onPress={handleFinishWorkout}
            />
            <AppButton
              title="Clear Workout"
              icon="trash-2"
              variant="ghost"
              onPress={handleClearWorkout}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}
