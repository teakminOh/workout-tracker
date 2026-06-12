import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { selectProgramSummaries } from '@/features/workouts/workout-selectors';
import { useAppSelector } from '@/store/hooks';

export default function HomeScreen() {
  const router = useRouter();
  const programs = useAppSelector(selectProgramSummaries);

  return (
    <ThemedView className="flex-1">
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-6 px-6 pb-28 pt-8"
        showsVerticalScrollIndicator={false}>
        <View className="gap-2">
          <ThemedText type="title">Workout Tracker</ThemedText>
        </View>

        {programs.length > 0 ? (
          <View className="gap-3">
            {programs.map((program) => (
              <Pressable
                key={program.id}
                accessibilityRole="button"
                className="gap-3 rounded-xl bg-[#F3FAF8] p-5 dark:bg-[#1D2826]"
                onPress={() =>
                  router.push({
                    pathname: '/program/[programId]',
                    params: { programId: program.id },
                  } as Href)
                }>
                <View className="flex-row items-center justify-between gap-3">
                  <View className="flex-1 gap-1">
                    <ThemedText type="subtitle">{program.name}</ThemedText>
                    <ThemedText className="opacity-70">
                      {program.dayCount} {program.dayCount === 1 ? 'day' : 'days'} -{' '}
                      {program.exerciseCount}{' '}
                      {program.exerciseCount === 1 ? 'exercise' : 'exercises'}
                    </ThemedText>
                  </View>
                  <MaterialIcons name="chevron-right" size={28} color="#0A7EA4" />
                </View>
              </Pressable>
            ))}
          </View>
        ) : null}
      </ScrollView>

      <Pressable
        accessibilityLabel="Create workout program"
        accessibilityRole="button"
        className="absolute bottom-8 self-center rounded-full bg-[#0A7EA4] p-5 shadow-lg"
        onPress={() => router.push('/create-program' as Href)}>
        <MaterialIcons name="add" size={32} color="#FFFFFF" />
      </Pressable>
    </ThemedView>
  );
}
