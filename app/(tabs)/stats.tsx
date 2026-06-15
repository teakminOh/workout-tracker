import { useRouter, type Href } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, useWindowDimensions, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { LineChart } from 'react-native-gifted-charts';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppButton } from '@/components/ui/app-button';
import { useAppDialog } from '@/components/ui/app-dialog';
import { Icon } from '@/components/ui/icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { AchievementBadge } from '@/components/workout/achievement-badge';
import { WorkoutAnalyticsSummary } from '@/components/workout/analytics-summary';
import { Palette } from '@/constants/theme';
import {
  selectAchievements,
  selectExerciseTrend,
  selectExercisesWithHistory,
  selectPersonalRecords,
  selectStrengthProfile,
  selectWorkoutActivity,
  type ExercisePersonalRecords,
  type ExerciseTrendPoint,
  type PersonalRecordKind,
} from '@/features/workouts/workout-selectors';
import { markAchievementsEarned, resetAnalytics } from '@/features/workouts/workout-slice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import type { TrainingGoal, WeightUnit } from '@/types/workout';

const cardStyle = { borderCurve: 'continuous' } as const;
const SQUARE = 13;
const SQUARE_GAP = 3;
const EMPTY_TREND: ExerciseTrendPoint[] = [];

const recordKindLabels: Record<PersonalRecordKind, string> = {
  weight: 'Heaviest',
  e1RM: 'Best e1RM',
  volume: 'Best set',
  reps: 'Most reps',
};

const formatRecordValue = (kind: PersonalRecordKind, value: number, unit: WeightUnit) =>
  kind === 'volume' || kind === 'reps' || unit === 'bodyweight' ? `${value}` : `${value}${unit}`;

/** Which trend metric a category plots. */
const trendByCategory: Record<
  TrainingGoal,
  { title: string; select: (point: ExerciseTrendPoint) => number } | null
> = {
  strength: { title: 'Estimated 1-rep max', select: (point) => point.e1RM },
  hypertrophy: { title: 'Volume', select: (point) => point.volume },
  power: { title: 'Max weight', select: (point) => point.maxWeight },
  untracked: null,
};

function chunkWeeks<T>(items: T[]): T[][] {
  const weeks: T[][] = [];
  for (let i = 0; i < items.length; i += 7) {
    weeks.push(items.slice(i, i + 7));
  }
  return weeks;
}

function chunkPairs<T>(items: T[]): T[][] {
  const pairs: T[][] = [];
  for (let i = 0; i < items.length; i += 2) {
    pairs.push(items.slice(i, i + 2));
  }
  return pairs;
}

function squareColor(count: number, isFuture: boolean) {
  if (isFuture || count <= 0) {
    return { backgroundColor: Palette.raised, opacity: isFuture ? 0.4 : 1 };
  }
  const opacity = count >= 3 ? 1 : count === 2 ? 0.7 : 0.45;
  return { backgroundColor: Palette.accent, opacity };
}

function RecordCard({ record }: { record: ExercisePersonalRecords }) {
  return (
    <View style={cardStyle} className="gap-3 rounded-10 bg-surface p-5">
      <View className="flex-row items-center gap-2">
        <Icon name="award" size={18} color={Palette.accent} />
        <ThemedText type="subtitle">{record.exerciseName}</ThemedText>
      </View>
      <View className="gap-2">
        {record.records.map((entry) => (
          <View key={entry.kind} className="flex-row items-baseline justify-between gap-3">
            <ThemedText type="label">{recordKindLabels[entry.kind]}</ThemedText>
            <View className="flex-row items-baseline gap-2">
              <ThemedText type="defaultSemiBold" style={{ fontVariant: ['tabular-nums'] }}>
                {formatRecordValue(entry.kind, entry.value, record.unit)}
              </ThemedText>
              <ThemedText className="opacity-50">{entry.dateLabel}</ThemedText>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function TrendChart({
  title,
  points,
  selector,
  width,
  suffix,
}: {
  title: string;
  points: ExerciseTrendPoint[];
  selector: (point: ExerciseTrendPoint) => number;
  width: number;
  suffix?: string;
}) {
  const data = points.map((point) => ({ value: selector(point), label: point.dateLabel }));
  const labelEvery = Math.ceil(points.length / 4);
  const thinnedData = data.map((item, index) => ({
    ...item,
    label: index % labelEvery === 0 ? item.label : '',
  }));

  const yAxisLabelWidth = 44;

  return (
    <View className="gap-3 overflow-hidden">
      <ThemedText type="label">{title}</ThemedText>
      <LineChart
        data={thinnedData}
        width={width - yAxisLabelWidth}
        yAxisLabelWidth={yAxisLabelWidth}
        adjustToWidth
        initialSpacing={10}
        endSpacing={10}
        thickness={2}
        curved
        color={Palette.accent}
        dataPointsColor={Palette.accent}
        textColor={Palette.muted}
        hideRules={false}
        rulesColor={Palette.line}
        rulesType="solid"
        yAxisColor={Palette.line}
        xAxisColor={Palette.line}
        yAxisTextStyle={{ color: Palette.muted, fontSize: 10 }}
        xAxisLabelTextStyle={{ color: Palette.muted, fontSize: 9 }}
        yAxisLabelSuffix={suffix}
        noOfSections={3}
      />
    </View>
  );
}

export default function StatsScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const showDialog = useAppDialog();
  const activity = useAppSelector(selectWorkoutActivity);
  const records = useAppSelector(selectPersonalRecords);
  const exerciseOptions = useAppSelector(selectExercisesWithHistory);
  const strength = useAppSelector(selectStrengthProfile);
  const achievements = useAppSelector(selectAchievements);
  const earnedAchievementIds = useAppSelector((state) => state.workout.earnedAchievementIds);
  const { width } = useWindowDimensions();

  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedExerciseId && exerciseOptions.length > 0) {
      setSelectedExerciseId(exerciseOptions[0].exerciseId);
    }
  }, [exerciseOptions, selectedExerciseId]);

  // Persist newly-earned badges so they stick even if the underlying data is
  // later deleted (sticky achievements).
  useEffect(() => {
    const persisted = new Set(earnedAchievementIds ?? []);
    const newlyEarned = achievements
      .filter((achievement) => achievement.isEarned && !persisted.has(achievement.id))
      .map((achievement) => achievement.id);

    if (newlyEarned.length > 0) {
      dispatch(markAchievementsEarned(newlyEarned));
    }
  }, [achievements, earnedAchievementIds, dispatch]);

  const handleResetAnalytics = () => {
    showDialog({
      title: 'Reset analytics?',
      message:
        'This permanently clears all logged workouts, the stats derived from them, and your earned badges. Your programs, exercises, and profile (sex/weight) are kept. This can’t be undone.',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => dispatch(resetAnalytics()),
        },
      ],
    });
  };

  const trend = useAppSelector((state) =>
    selectedExerciseId ? selectExerciseTrend(state, selectedExerciseId) : EMPTY_TREND
  );

  const selectedOption = exerciseOptions.find(
    (option) => option.exerciseId === selectedExerciseId
  );
  const trendConfig = selectedOption ? trendByCategory[selectedOption.category] : null;

  const weeks = useMemo(() => chunkWeeks(activity.days), [activity.days]);
  const chartWidth = width - 80; // page px-5 (20*2) + card p-5 (20*2)

  if (activity.totalWorkouts === 0) {
    return (
      <ThemedView className="flex-1 px-5 py-10">
        <View className="flex-1 justify-center gap-6">
          <View className="gap-3">
            <ThemedText type="title">No stats yet</ThemedText>
            <ThemedText className="opacity-60">
              Finish a workout and your streak, records, and trends will show up here.
            </ThemedText>
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
        {/* Streak hero */}
        <View style={cardStyle} className="items-center gap-3 rounded-10 bg-surface p-5">
          <Icon name="zap" size={28} color={Palette.accent} />
          <Animated.View entering={ZoomIn.springify().damping(14)} className="items-center">
            <ThemedText type="title" style={{ fontSize: 56, lineHeight: 60, color: Palette.accent }}>
              {activity.currentStreak}
            </ThemedText>
          </Animated.View>
          <ThemedText type="label">day streak</ThemedText>
        </View>

        <WorkoutAnalyticsSummary
          metrics={[
            { label: 'Current', value: activity.currentStreak },
            { label: 'Longest', value: activity.longestStreak },
            { label: 'Workouts', value: activity.totalWorkouts },
          ]}
        />

        {/* Strength level */}
        <View className="gap-3">
          <View className="flex-row items-center justify-between gap-3">
            <ThemedText type="label">Strength level</ThemedText>
            {strength.title ? (
              <ThemedText type="defaultSemiBold" style={{ color: Palette.accent }}>
                {strength.title}
              </ThemedText>
            ) : null}
          </View>
          {!strength.isComplete ? (
            <View style={cardStyle} className="gap-3 rounded-10 bg-surface p-5">
              <ThemedText className="opacity-60">
                Add your bodyweight and sex to see how your main lifts rank against
                population strength standards.
              </ThemedText>
              <AppButton
                title="Set Up Profile"
                icon="user"
                onPress={() => router.push('/profile' as Href)}
              />
            </View>
          ) : strength.levels.length === 0 ? (
            <View style={cardStyle} className="rounded-10 bg-surface p-5">
              <ThemedText className="opacity-60">
                Log a main barbell lift (bench, squat, deadlift, overhead press, or row)
                to see your level.
              </ThemedText>
            </View>
          ) : (
            strength.levels.map((level) => (
              <View
                key={level.exerciseId}
                style={cardStyle}
                className="flex-row items-center justify-between gap-3 rounded-10 bg-surface p-5">
                <View className="flex-1 gap-1">
                  <ThemedText type="defaultSemiBold">{level.exerciseName}</ThemedText>
                  <ThemedText className="opacity-60">{level.percentileLabel}</ThemedText>
                </View>
                <View className="items-end gap-1">
                  <ThemedText type="subtitle" style={{ color: Palette.accent }}>
                    {level.bandLabel}
                  </ThemedText>
                  <ThemedText
                    className="opacity-60"
                    style={{ fontVariant: ['tabular-nums'] }}>
                    e1RM {level.e1RM}
                    {level.unit === 'bodyweight' ? '' : level.unit}
                  </ThemedText>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Consistency calendar */}
        <View className="gap-3">
          <ThemedText type="label">Consistency</ThemedText>
          <View style={cardStyle} className="rounded-10 bg-surface p-5">
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row" style={{ gap: SQUARE_GAP }}>
                {weeks.map((week, weekIndex) => (
                  <View key={weekIndex} style={{ gap: SQUARE_GAP }}>
                    {week.map((day) => (
                      <View
                        key={day.dateKey}
                        style={{
                          width: SQUARE,
                          height: SQUARE,
                          borderRadius: 3,
                          ...squareColor(day.count, day.isFuture),
                        }}
                      />
                    ))}
                  </View>
                ))}
              </View>
            </ScrollView>
            <ThemedText className="mt-3 opacity-50">Don&apos;t break the chain.</ThemedText>
          </View>
        </View>

        {/* Records */}
        {records.length > 0 ? (
          <View className="gap-3">
            <ThemedText type="label">Records</ThemedText>
            {records.map((record) => (
              <RecordCard key={record.exerciseId} record={record} />
            ))}
          </View>
        ) : null}

        {/* Trends */}
        {exerciseOptions.length > 0 ? (
          <View className="gap-3">
            <ThemedText type="label">Trends</ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                {exerciseOptions.map((option) => {
                  const isSelected = option.exerciseId === selectedExerciseId;
                  return (
                    <PressableScale
                      key={option.exerciseId}
                      className={`rounded-full px-4 py-2 ${isSelected ? 'bg-accent' : 'bg-raised'}`}
                      onPress={() => setSelectedExerciseId(option.exerciseId)}>
                      <ThemedText
                        type="defaultSemiBold"
                        style={{ color: isSelected ? Palette.onAccent : Palette.cream }}>
                        {option.exerciseName}
                      </ThemedText>
                    </PressableScale>
                  );
                })}
              </View>
            </ScrollView>

            <View style={cardStyle} className="gap-6 rounded-10 bg-surface p-5">
              {trend.length >= 2 && trendConfig ? (
                <TrendChart
                  title={trendConfig.title}
                  points={trend}
                  selector={trendConfig.select}
                  width={chartWidth}
                />
              ) : (
                <ThemedText className="opacity-60">
                  Log this exercise in at least two workouts to see a trend.
                </ThemedText>
              )}
            </View>
          </View>
        ) : null}

        {/* Achievements */}
        <View className="gap-3">
          <ThemedText type="label">Achievements</ThemedText>
          <View className="gap-2">
            {chunkPairs(achievements).map((pair, index) => (
              <View key={index} className="flex-row gap-2">
                {pair.map((achievement) => (
                  <AchievementBadge key={achievement.id} achievement={achievement} />
                ))}
                {pair.length === 1 ? <View className="flex-1" /> : null}
              </View>
            ))}
          </View>
        </View>

        {/* Danger zone */}
        <View className="gap-2 pt-2">
          <AppButton title="Reset Analytics" variant="danger" onPress={handleResetAnalytics} />
          <ThemedText className="text-center text-[12px] leading-4 opacity-50">
            Clears all logged workouts. Keeps your profile and earned badges.
          </ThemedText>
        </View>
      </ScrollView>
    </ThemedView>
  );
}
