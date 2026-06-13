import { ScrollView, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Palette } from '@/constants/theme';
import { selectProgramSummaries } from '@/features/workouts/workout-selectors';
import { useAppSelector } from '@/store/hooks';

const cardStyle = { borderCurve: 'continuous' } as const;

export default function HomeScreen() {
  const router = useRouter();
  const programs = useAppSelector(selectProgramSummaries);

  return (
    <ThemedView className="flex-1">
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-7 px-5 pb-28 pt-8"
        showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center justify-between gap-3">
          <ThemedText type="title">Workout Tracker</ThemedText>
          <View className="flex-row gap-2">
            <IconButton
              name="list"
              accessibilityLabel="Exercise library"
              className="bg-surface"
              color={Palette.accent}
              onPress={() => router.push('/exercises' as Href)}
            />
            <IconButton
              name="bar-chart-2"
              accessibilityLabel="View stats"
              className="bg-surface"
              color={Palette.accent}
              onPress={() => router.push('/stats' as Href)}
            />
          </View>
        </View>

        <View className="gap-3">
          <ThemedText type="label">Programs</ThemedText>
          {programs.length > 0 ? (
            programs.map((program) => (
              <PressableScale
                key={program.id}
                accessibilityRole="button"
                style={cardStyle}
                className="gap-3 rounded-10 bg-surface p-5"
                onPress={() =>
                  router.push({
                    pathname: '/program/[programId]',
                    params: { programId: program.id },
                  } as Href)
                }>
                <View className="flex-row items-center justify-between gap-3">
                  <View className="flex-1 gap-1">
                    <ThemedText type="subtitle">{program.name}</ThemedText>
                    <ThemedText className="opacity-60">
                      {program.dayCount} {program.dayCount === 1 ? 'day' : 'days'} -{' '}
                      {program.exerciseCount}{' '}
                      {program.exerciseCount === 1 ? 'exercise' : 'exercises'}
                    </ThemedText>
                  </View>
                  <Icon name="chevron-right" size={24} color={Palette.muted} />
                </View>
              </PressableScale>
            ))
          ) : (
            <View style={cardStyle} className="rounded-10 bg-surface p-5">
              <ThemedText className="opacity-60">
                No programs yet. Tap + to create your first one.
              </ThemedText>
            </View>
          )}
        </View>
      </ScrollView>

      <PressableScale
        accessibilityLabel="Create workout program"
        accessibilityRole="button"
        className="absolute bottom-8 h-14 w-14 items-center justify-center self-center rounded-full bg-accent"
        onPress={() => router.push('/create-program' as Href)}>
        <Icon name="plus" size={28} color={Palette.onAccent} />
      </PressableScale>
    </ThemedView>
  );
}
