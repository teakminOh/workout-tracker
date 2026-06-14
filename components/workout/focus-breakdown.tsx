import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ProgressBar } from '@/components/ui/progress-bar';
import type { TrainingFocusBreakdown } from '@/features/workouts/workout-selectors';

const cardStyle = { borderCurve: 'continuous' } as const;

type FocusBreakdownProps = {
  focus: TrainingFocusBreakdown;
};

/**
 * Shows how a session split across strength / hypertrophy / power, with a
 * one-line verdict and a share bar per tracked focus.
 */
export function FocusBreakdown({ focus }: FocusBreakdownProps) {
  if (focus.items.length === 0) {
    return null;
  }

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between gap-3">
        <ThemedText type="label">Training focus</ThemedText>
        <ThemedText type="label">{focus.verdict}</ThemedText>
      </View>
      <View style={cardStyle} className="gap-3 rounded-10 bg-surface p-5">
        {focus.items.map((item) => (
          <View key={item.goal} className="gap-1.5">
            <View className="flex-row items-center justify-between">
              <ThemedText type="defaultSemiBold">{item.label}</ThemedText>
              <ThemedText
                className="opacity-60"
                style={{ fontVariant: ['tabular-nums'] }}>
                {Math.round(item.share * 100)}% · {item.sets}{' '}
                {item.sets === 1 ? 'set' : 'sets'}
              </ThemedText>
            </View>
            <ProgressBar progress={item.share} />
          </View>
        ))}
      </View>
    </View>
  );
}
