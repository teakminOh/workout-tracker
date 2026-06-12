import type { ReactNode } from 'react';
import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

type AnalyticsMetric = {
  label: string;
  value: number | string;
};

type WorkoutAnalyticsSummaryProps = {
  metrics: AnalyticsMetric[];
  children?: ReactNode;
  className?: string;
};

export function WorkoutAnalyticsSummary({
  metrics,
  children,
  className,
}: WorkoutAnalyticsSummaryProps) {
  return (
    <View
      style={{ borderCurve: 'continuous' }}
      className={['gap-4 rounded-10 bg-surface p-5', className].filter(Boolean).join(' ')}>
      <View className="flex-row gap-2">
        {metrics.map((metric) => (
          <View key={metric.label} className="flex-1 gap-1">
            <ThemedText
              type="subtitle"
              numberOfLines={1}
              style={{ fontVariant: ['tabular-nums'] }}>
              {metric.value}
            </ThemedText>
            <ThemedText type="label">{metric.label}</ThemedText>
          </View>
        ))}
      </View>
      {children}
    </View>
  );
}
