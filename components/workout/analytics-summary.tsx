import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

type AnalyticsMetric = {
  label: string;
  value: number | string;
};

type WorkoutAnalyticsSummaryProps = {
  metrics: AnalyticsMetric[];
  className?: string;
};

export function WorkoutAnalyticsSummary({ metrics, className }: WorkoutAnalyticsSummaryProps) {
  return (
    <View className={['flex-row gap-3', className].filter(Boolean).join(' ')}>
      {metrics.map((metric) => (
        <ThemedView
          key={metric.label}
          lightColor="#FFFFFF"
          darkColor="#263331"
          className="flex-1 gap-1 rounded-lg p-4">
          <ThemedText type="defaultSemiBold">{metric.value}</ThemedText>
          <ThemedText className="text-sm opacity-70">{metric.label}</ThemedText>
        </ThemedView>
      ))}
    </View>
  );
}
