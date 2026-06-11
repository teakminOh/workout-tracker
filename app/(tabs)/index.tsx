import { Pressable, StyleSheet, View } from 'react-native';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  selectCurrentWorkout,
  selectTotalSets,
  selectTotalVolume,
} from '@/store/workout-selectors';
import { clearCurrentWorkout, startWorkout } from '@/store/workout-slice';

export default function HomeScreen() {
  const dispatch = useAppDispatch();
  const currentWorkout = useAppSelector(selectCurrentWorkout);
  const totalSets = useAppSelector(selectTotalSets);
  const totalVolume = useAppSelector(selectTotalVolume);
  const hasActiveWorkout = currentWorkout !== null;

  const startedAtLabel = currentWorkout
    ? new Date(currentWorkout.startedAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#D7F0EA', dark: '#1E3632' }}
      headerImage={
        <IconSymbol
          size={220}
          color="#5E8F84"
          name="house.fill"
          style={styles.headerIcon}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Workout Tracker</ThemedText>
        <ThemedText style={styles.subtitle}>
          {hasActiveWorkout ? 'You have a workout in progress.' : 'Start your first workout.'}
        </ThemedText>
      </ThemedView>

      <ThemedView lightColor="#F3FAF8" darkColor="#1D2826" style={styles.statusCard}>
        <ThemedText type="subtitle">
          {hasActiveWorkout ? currentWorkout.name : 'No active workout'}
        </ThemedText>
        <ThemedText style={styles.statusText}>
          {startedAtLabel ? `Started at ${startedAtLabel}` : 'Tap Start Workout to create one.'}
        </ThemedText>

        <View style={styles.statsRow}>
          <ThemedView lightColor="#FFFFFF" darkColor="#263331" style={styles.statBox}>
            <ThemedText type="defaultSemiBold">{totalSets}</ThemedText>
            <ThemedText style={styles.statLabel}>Sets</ThemedText>
          </ThemedView>
          <ThemedView lightColor="#FFFFFF" darkColor="#263331" style={styles.statBox}>
            <ThemedText type="defaultSemiBold">{totalVolume}</ThemedText>
            <ThemedText style={styles.statLabel}>Volume</ThemedText>
          </ThemedView>
        </View>

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            style={styles.primaryButton}
            onPress={() => dispatch(startWorkout({ name: "Today's Workout" }))}>
            <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" type="defaultSemiBold">
              Start Workout
            </ThemedText>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            disabled={!hasActiveWorkout}
            style={[styles.secondaryButton, !hasActiveWorkout && styles.disabledButton]}
            onPress={() => dispatch(clearCurrentWorkout())}>
            <ThemedText
              lightColor={hasActiveWorkout ? '#0A7EA4' : '#8A9296'}
              darkColor={hasActiveWorkout ? '#8AD7F8' : '#7A8589'}
              type="defaultSemiBold">
              Clear Workout
            </ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    gap: 8,
  },
  subtitle: {
    opacity: 0.72,
  },
  statusCard: {
    borderRadius: 12,
    gap: 16,
    padding: 20,
  },
  statusText: {
    opacity: 0.72,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statBox: {
    borderRadius: 8,
    flex: 1,
    gap: 8,
    padding: 16,
  },
  statLabel: {
    fontSize: 14,
    opacity: 0.72,
  },
  actions: {
    gap: 12,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#0A7EA4',
    borderRadius: 8,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: '#0A7EA4',
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  disabledButton: {
    borderColor: '#A8B1B6',
    opacity: 0.72,
  },
  headerIcon: {
    bottom: -36,
    right: -28,
    position: 'absolute',
  },
});
