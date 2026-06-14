import { useRouter, type Href } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppButton } from '@/components/ui/app-button';
import { useAppDialog } from '@/components/ui/app-dialog';
import { IconButton } from '@/components/ui/icon-button';
import { PressableScale } from '@/components/ui/pressable-scale';
import { categoryLabels, muscleLabels } from '@/components/workout/exercise-picker';
import { Palette } from '@/constants/theme';
import { selectExerciseLibrary } from '@/features/workouts/workout-selectors';
import { deleteExercise } from '@/features/workouts/workout-slice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';

const cardStyle = { borderCurve: 'continuous' } as const;

export default function ExercisesScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const showDialog = useAppDialog();
  const library = useAppSelector(selectExerciseLibrary);

  const confirmDelete = (exerciseId: string, name: string) => {
    showDialog({
      title: `Delete ${name}?`,
      message:
        'This permanently removes it from your library, any programs using it, and all logged history and analytics. This can’t be undone.',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => dispatch(deleteExercise({ exerciseId })),
        },
      ],
    });
  };

  return (
    <ThemedView className="flex-1">
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-7 px-5 py-8"
        showsVerticalScrollIndicator={false}>
        <View className="gap-3">
          <ThemedText type="label">Exercises</ThemedText>
          {library.length > 0 ? (
            library.map((exercise) => (
              <View
                key={exercise.id}
                style={cardStyle}
                className="flex-row items-center gap-3 rounded-10 bg-surface p-4">
                <PressableScale
                  className="flex-1 gap-1"
                  onPress={() =>
                    router.push({
                      pathname: '/create-exercise',
                      params: { exerciseId: exercise.id },
                    } as Href)
                  }>
                  <ThemedText type="defaultSemiBold">{exercise.name}</ThemedText>
                  <ThemedText className="opacity-60">
                    {exercise.muscleGroups && exercise.muscleGroups.length > 0
                      ? `${exercise.muscleGroups.map((group) => muscleLabels[group]).join(', ')} · `
                      : ''}
                    {categoryLabels[exercise.trainingGoal]}
                  </ThemedText>
                </PressableScale>
                <IconButton
                  name="edit-2"
                  accessibilityLabel={`Edit ${exercise.name}`}
                  size={16}
                  onPress={() =>
                    router.push({
                      pathname: '/create-exercise',
                      params: { exerciseId: exercise.id },
                    } as Href)
                  }
                />
                <IconButton
                  name="trash-2"
                  accessibilityLabel={`Delete ${exercise.name}`}
                  size={16}
                  color={Palette.danger}
                  onPress={() => confirmDelete(exercise.id, exercise.name)}
                />
              </View>
            ))
          ) : (
            <View style={cardStyle} className="rounded-10 bg-surface p-5">
              <ThemedText className="opacity-60">
                No exercises yet. Create your first one below.
              </ThemedText>
            </View>
          )}
        </View>

        <AppButton
          title="Create new exercise"
          icon="plus"
          onPress={() => router.push('/create-exercise' as Href)}
        />
      </ScrollView>
    </ThemedView>
  );
}
