import { ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppButton } from '@/components/ui/app-button';
import { useAppDialog } from '@/components/ui/app-dialog';
import {
  selectActiveWorkoutSession,
  selectProgramById,
  selectProgramEditorDaysByProgramId,
} from '@/features/workouts/workout-selectors';
import { clearCurrentWorkout, startWorkoutSession } from '@/features/workouts/workout-slice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';

const cardStyle = { borderCurve: 'continuous' } as const;

export default function ProgramScreen() {
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
  const activeSession = useAppSelector(selectActiveWorkoutSession);
  const showDialog = useAppDialog();

  const handleStartDay = (workoutDayTemplateId: string) => {
    if (!program) {
      return;
    }

    const goToWorkout = () => router.push('/start-workout' as Href);

    const startFresh = () => {
      dispatch(startWorkoutSession({ programId: program.id, workoutDayTemplateId }));
      goToWorkout();
    };

    if (activeSession?.status === 'active') {
      // Already in this day's workout — resume it without discarding logged sets.
      if (activeSession.workoutDayTemplateId === workoutDayTemplateId) {
        goToWorkout();
        return;
      }

      showDialog({
        title: 'Workout in progress',
        message: 'Discard it and start this day?',
        buttons: [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Discard & Start',
            style: 'destructive',
            onPress: () => {
              dispatch(clearCurrentWorkout());
              startFresh();
            },
          },
        ],
      });
      return;
    }

    startFresh();
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
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-7 px-5 py-8"
        showsVerticalScrollIndicator={false}>
        <View className="gap-2">
          <ThemedText type="title">{program.name}</ThemedText>
          <ThemedText className="opacity-60">
            {editorDays.length} {editorDays.length === 1 ? 'day' : 'days'}
          </ThemedText>
        </View>

        <AppButton
          title="Edit Program"
          variant="secondary"
          onPress={() =>
            router.push({
              pathname: '/program/[programId]/edit',
              params: { programId: program.id },
            } as Href)
          }
        />

        <View className="gap-3">
          <ThemedText type="label">Days</ThemedText>
          {editorDays.map(({ day, exercises }) => (
            <View key={day.id} style={cardStyle} className="gap-4 rounded-10 bg-surface p-5">
              <View className="gap-1">
                <ThemedText type="subtitle">{day.name}</ThemedText>
                <ThemedText className="opacity-60">
                  {exercises.length} {exercises.length === 1 ? 'exercise' : 'exercises'}
                </ThemedText>
              </View>
              <AppButton title="Start Workout" onPress={() => handleStartDay(day.id)} />
            </View>
          ))}
        </View>
      </ScrollView>
    </ThemedView>
  );
}
