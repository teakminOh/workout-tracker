import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppButton } from '@/components/ui/app-button';
import { WorkoutAnalyticsSummary } from '@/components/workout/analytics-summary';
import {
  selectActiveProgram,
  selectActiveProgramDays,
  selectActiveSessionDay,
  selectActiveSessionPlannedExercises,
  selectActiveSessionSets,
  selectActiveWorkoutSession,
  selectTotalSets,
  selectTotalVolume,
} from '@/features/workouts/workout-selectors';
import {
  addSet,
  clearCurrentWorkout,
  finishCurrentWorkout,
  startWorkoutSession,
} from '@/features/workouts/workout-slice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { formatDuration, parseWorkoutNumberInput } from '@/utils/workout-formatters';

const inputClassName =
  'min-h-12 rounded-lg border border-[#D3DEE3] bg-white px-4 text-base text-[#11181C] dark:border-[#34413F] dark:bg-[#263331] dark:text-[#ECEDEE]';

export default function StartWorkoutScreen() {
  const dispatch = useAppDispatch();
  const activeProgram = useAppSelector(selectActiveProgram);
  const activeSession = useAppSelector(selectActiveWorkoutSession);
  const activeDay = useAppSelector(selectActiveSessionDay);
  const plannedExercises = useAppSelector(selectActiveSessionPlannedExercises);
  const activeSets = useAppSelector(selectActiveSessionSets);
  const totalSets = useAppSelector(selectTotalSets);
  const totalVolume = useAppSelector(selectTotalVolume);
  const programDays = useAppSelector(selectActiveProgramDays);

  const [selectedProgramExerciseId, setSelectedProgramExerciseId] = useState<string | null>(null);
  const [reps, setReps] = useState('');
  const [weight, setWeight] = useState('');
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (
      plannedExercises.length > 0 &&
      !plannedExercises.some((plannedExercise) => plannedExercise.programExercise.id === selectedProgramExerciseId)
    ) {
      const firstExercise = plannedExercises[0];

      setSelectedProgramExerciseId(firstExercise.programExercise.id);
      setWeight(firstExercise.programExercise.targetWeight?.toString() ?? '');
    }
  }, [plannedExercises, selectedProgramExerciseId]);

  const selectedPlannedExercise =
    plannedExercises.find(
      (plannedExercise) => plannedExercise.programExercise.id === selectedProgramExerciseId
    ) ?? plannedExercises[0];
  const durationSeconds = useMemo(() => {
    if (!activeSession) {
      return 0;
    }

    return Math.max(0, Math.floor((now - new Date(activeSession.startedAt).getTime()) / 1000));
  }, [activeSession, now]);

  const parsedReps = parseWorkoutNumberInput(reps);
  const parsedWeight = parseWorkoutNumberInput(weight);
  const canAddSet =
    activeSession !== null &&
    selectedPlannedExercise !== undefined &&
    Number.isFinite(parsedReps) &&
    parsedReps > 0 &&
    Number.isFinite(parsedWeight) &&
    parsedWeight >= 0;

  const handleStartFirstProgramDay = () => {
    if (!activeProgram || programDays.length === 0) {
      return;
    }

    dispatch(
      startWorkoutSession({
        programId: activeProgram.id,
        workoutDayTemplateId: programDays[0].id,
      })
    );
  };

  const handleSelectExercise = (programExerciseId: string) => {
    const plannedExercise = plannedExercises.find(
      (exercise) => exercise.programExercise.id === programExerciseId
    );

    setSelectedProgramExerciseId(programExerciseId);
    setWeight(plannedExercise?.programExercise.targetWeight?.toString() ?? '');
    setReps('');
  };

  const handleAddSet = () => {
    if (!canAddSet || !selectedPlannedExercise) {
      return;
    }

    dispatch(
      addSet({
        exerciseId: selectedPlannedExercise.programExercise.exerciseId,
        programExerciseId: selectedPlannedExercise.programExercise.id,
        reps: parsedReps,
        weight: parsedWeight,
      })
    );
    setReps('');
  };

  if (!activeSession) {
    return (
      <ThemedView className="flex-1 px-6 py-10">
        <View className="flex-1 justify-center gap-6">
          <View className="gap-3">
            <ThemedText type="title">Start Workout</ThemedText>
            <ThemedText className="opacity-70">
              Start a day from your active program before logging sets.
            </ThemedText>
          </View>

          <AppButton title="Start Day 1" disabled={!activeProgram} onPress={handleStartFirstProgramDay} />
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
              {plannedExercises.map((plannedExercise) => {
                const isSelected =
                  plannedExercise.programExercise.id === selectedPlannedExercise?.programExercise.id;

                return (
                  <AppButton
                    key={plannedExercise.programExercise.id}
                    title={`${plannedExercise.exerciseName} - ${plannedExercise.programExercise.targetSets} x ${plannedExercise.programExercise.targetRepMin}-${plannedExercise.programExercise.targetRepMax}`}
                    variant={isSelected ? 'primary' : 'secondary'}
                    onPress={() => handleSelectExercise(plannedExercise.programExercise.id)}
                  />
                );
              })}
            </View>
          </ThemedView>

          <ThemedView lightColor="#F3FAF8" darkColor="#1D2826" className="gap-4 rounded-xl p-5">
            <View className="gap-1">
              <ThemedText type="subtitle">Add Set</ThemedText>
              <ThemedText className="opacity-70">
                {selectedPlannedExercise
                  ? `${selectedPlannedExercise.exerciseName}: ${selectedPlannedExercise.progressionSuggestion}`
                  : 'Choose a planned exercise first.'}
              </ThemedText>
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
                  placeholder={selectedPlannedExercise?.programExercise.targetWeight?.toString() ?? '0'}
                  placeholderTextColor="#8A9296"
                  value={weight}
                  onChangeText={setWeight}
                />
              </View>
            </View>

            <AppButton title="Add Set" disabled={!canAddSet} onPress={handleAddSet} />
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
                    className="flex-row items-center justify-between rounded-lg p-4">
                    <View className="gap-1">
                      <ThemedText type="defaultSemiBold">
                        Set {set.setNumber}: {plannedExercise?.exerciseName ?? 'Exercise'}
                      </ThemedText>
                      <ThemedText className="opacity-70">
                        {set.reps} reps x {set.weight} {set.unit}
                      </ThemedText>
                    </View>
                    <ThemedText type="defaultSemiBold">{set.reps * set.weight}</ThemedText>
                  </ThemedView>
                );
              })
            )}
          </View>

          <View className="gap-3">
            <AppButton title="Finish Workout" onPress={() => dispatch(finishCurrentWorkout())} />
            <AppButton
              title="Clear Workout"
              variant="secondary"
              onPress={() => dispatch(clearCurrentWorkout())}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}
