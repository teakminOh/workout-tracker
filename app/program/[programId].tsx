import { ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppButton } from '@/components/ui/app-button';
import {
  selectProgramById,
  selectProgramEditorDaysByProgramId,
} from '@/features/workouts/workout-selectors';
import { startWorkoutSession } from '@/features/workouts/workout-slice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';

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

  const handleStartDay = (workoutDayTemplateId: string) => {
    if (!program) {
      return;
    }

    dispatch(startWorkoutSession({ programId: program.id, workoutDayTemplateId }));
    router.push('/start-workout' as Href);
  };

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
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-6 px-6 py-8"
        showsVerticalScrollIndicator={false}>
        <View className="gap-2">
          <ThemedText type="title">{program.name}</ThemedText>
          <ThemedText className="opacity-70">
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
          {editorDays.map(({ day, exercises }) => (
            <ThemedView
              key={day.id}
              lightColor="#F3FAF8"
              darkColor="#1D2826"
              className="gap-4 rounded-xl p-5">
              <View className="gap-1">
                <ThemedText type="subtitle">{day.name}</ThemedText>
                <ThemedText className="opacity-70">
                  {exercises.length} {exercises.length === 1 ? 'exercise' : 'exercises'}
                </ThemedText>
              </View>
              <AppButton title="Start Workout" onPress={() => handleStartDay(day.id)} />
            </ThemedView>
          ))}
        </View>
      </ScrollView>
    </ThemedView>
  );
}
