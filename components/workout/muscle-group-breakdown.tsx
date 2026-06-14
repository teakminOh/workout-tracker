import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ProgressBar } from '@/components/ui/progress-bar';
import type { MuscleGroupBreakdownItem } from '@/features/workouts/workout-selectors';

const cardStyle = { borderCurve: 'continuous' } as const;

type MuscleGroupBreakdownProps = {
  muscleGroups: MuscleGroupBreakdownItem[];
};

/**
 * Lists the muscle groups trained in a session by working-set count, with a bar
 * scaled to the most-trained group.
 */
export function MuscleGroupBreakdown({ muscleGroups }: MuscleGroupBreakdownProps) {
  if (muscleGroups.length === 0) {
    return null;
  }

  const maxSets = Math.max(...muscleGroups.map((item) => item.sets));

  return (
    <View className="gap-3">
      <ThemedText type="label">Muscles trained</ThemedText>
      <View style={cardStyle} className="gap-3 rounded-10 bg-surface p-5">
        {muscleGroups.map((item) => (
          <View key={item.muscleGroup} className="gap-1.5">
            <View className="flex-row items-center justify-between">
              <ThemedText type="defaultSemiBold">{item.label}</ThemedText>
              <ThemedText
                className="opacity-60"
                style={{ fontVariant: ['tabular-nums'] }}>
                {item.sets} {item.sets === 1 ? 'set' : 'sets'}
              </ThemedText>
            </View>
            <ProgressBar progress={maxSets > 0 ? item.sets / maxSets : 0} />
          </View>
        ))}
      </View>
    </View>
  );
}
