import { useRouter, type Href } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAppDialog } from '@/components/ui/app-dialog';
import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Palette } from '@/constants/theme';
import { selectWorkoutHistory } from '@/features/workouts/workout-selectors';
import { clearWorkoutHistory } from '@/features/workouts/workout-slice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { formatDuration } from '@/utils/workout-formatters';

const cardStyle = { borderCurve: 'continuous' } as const;

export default function HistoryScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const showDialog = useAppDialog();
  const history = useAppSelector(selectWorkoutHistory);

  const handleClearHistory = () => {
    showDialog({
      title: 'Clear all history?',
      message:
        'This permanently deletes every logged workout and resets your analytics. Your programs, exercises, profile, and earned badges are kept.',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => dispatch(clearWorkoutHistory()),
        },
      ],
    });
  };

  return (
    <ThemedView className="flex-1">
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-3 px-5 py-8"
        showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center justify-between">
          <ThemedText type="label">All workouts</ThemedText>
          {history.length > 0 ? (
            <IconButton
              name="trash-2"
              accessibilityLabel="Clear history"
              size={16}
              color={Palette.danger}
              onPress={handleClearHistory}
            />
          ) : null}
        </View>
        {history.length > 0 ? (
          history.map((workout) => (
            <PressableScale
              key={workout.id}
              accessibilityRole="button"
              style={cardStyle}
              className="gap-3 rounded-10 bg-surface p-5"
              onPress={() =>
                router.push({
                  pathname: '/session/[sessionId]',
                  params: { sessionId: workout.id },
                } as Href)
              }>
              <View className="flex-row items-center justify-between gap-3">
                <View className="flex-1 gap-1">
                  <ThemedText type="subtitle">{workout.name}</ThemedText>
                  <ThemedText className="opacity-60">
                    {workout.dateLabel}
                    {workout.isFreestyle ? ' · Freestyle' : ''}
                  </ThemedText>
                </View>
                <Icon name="chevron-right" size={24} color={Palette.muted} />
              </View>
              <View className="flex-row gap-2">
                {[
                  { label: 'Sets', value: `${workout.sets}` },
                  { label: 'Volume', value: `${workout.volume}` },
                  { label: 'Time', value: formatDuration(workout.durationSeconds) },
                ].map((metric) => (
                  <View key={metric.label} className="flex-1 gap-0.5">
                    <ThemedText
                      type="defaultSemiBold"
                      style={{ fontVariant: ['tabular-nums'] }}>
                      {metric.value}
                    </ThemedText>
                    <ThemedText type="label">{metric.label}</ThemedText>
                  </View>
                ))}
              </View>
            </PressableScale>
          ))
        ) : (
          <View style={cardStyle} className="rounded-10 bg-surface p-5">
            <ThemedText className="opacity-60">
              No completed workouts yet. Finish a workout to see it here.
            </ThemedText>
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}
