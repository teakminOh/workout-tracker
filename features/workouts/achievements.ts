import type { IconName } from '@/components/ui/icon';

/**
 * Achievements are derived (never stored): each definition is a pure predicate
 * over a snapshot of already-computed stats, so they recompute from history.
 */

export type AchievementStats = {
  totalWorkouts: number;
  longestStreak: number;
  personalRecordCount: number;
  bestSessionVolume: number;
  distinctMuscleGroups: number;
  reachedAdvanced: boolean;
  reachedElite: boolean;
  hasFreestyleWorkout: boolean;
};

export type AchievementDefinition = {
  id: string;
  title: string;
  description: string;
  icon: IconName;
  isEarned: (stats: AchievementStats) => boolean;
  /** Optional 0..1 progress toward earning, for count-based achievements. */
  progress?: (stats: AchievementStats) => number;
};

const ratio = (value: number, target: number) => Math.min(1, target > 0 ? value / target : 0);

export const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: 'first-workout',
    title: 'First Rep',
    description: 'Complete your first workout',
    icon: 'play',
    isEarned: (stats) => stats.totalWorkouts >= 1,
    progress: (stats) => ratio(stats.totalWorkouts, 1),
  },
  {
    id: 'freestyle',
    title: 'Off Script',
    description: 'Finish a freestyle workout',
    icon: 'zap',
    isEarned: (stats) => stats.hasFreestyleWorkout,
  },
  {
    id: 'streak-3',
    title: 'On a Roll',
    description: 'Reach a 3-day streak',
    icon: 'trending-up',
    isEarned: (stats) => stats.longestStreak >= 3,
    progress: (stats) => ratio(stats.longestStreak, 3),
  },
  {
    id: 'streak-7',
    title: 'Week Warrior',
    description: 'Reach a 7-day streak',
    icon: 'calendar',
    isEarned: (stats) => stats.longestStreak >= 7,
    progress: (stats) => ratio(stats.longestStreak, 7),
  },
  {
    id: 'workouts-10',
    title: 'Committed',
    description: 'Complete 10 workouts',
    icon: 'check-circle',
    isEarned: (stats) => stats.totalWorkouts >= 10,
    progress: (stats) => ratio(stats.totalWorkouts, 10),
  },
  {
    id: 'workouts-50',
    title: 'Iron Habit',
    description: 'Complete 50 workouts',
    icon: 'award',
    isEarned: (stats) => stats.totalWorkouts >= 50,
    progress: (stats) => ratio(stats.totalWorkouts, 50),
  },
  {
    id: 'pr-1',
    title: 'Record Breaker',
    description: 'Set your first personal record',
    icon: 'star',
    isEarned: (stats) => stats.personalRecordCount >= 1,
    progress: (stats) => ratio(stats.personalRecordCount, 1),
  },
  {
    id: 'pr-10',
    title: 'PR Machine',
    description: 'Hold 10 personal records',
    icon: 'target',
    isEarned: (stats) => stats.personalRecordCount >= 10,
    progress: (stats) => ratio(stats.personalRecordCount, 10),
  },
  {
    id: 'big-volume',
    title: 'Heavy Day',
    description: 'Log 5,000 volume in one workout',
    icon: 'bar-chart-2',
    isEarned: (stats) => stats.bestSessionVolume >= 5000,
    progress: (stats) => ratio(stats.bestSessionVolume, 5000),
  },
  {
    id: 'full-body',
    title: 'Well Rounded',
    description: 'Train 5 different muscle groups',
    icon: 'grid',
    isEarned: (stats) => stats.distinctMuscleGroups >= 5,
    progress: (stats) => ratio(stats.distinctMuscleGroups, 5),
  },
  {
    id: 'advanced',
    title: 'Top 10%',
    description: 'Reach Advanced on a main lift',
    icon: 'trending-up',
    isEarned: (stats) => stats.reachedAdvanced,
  },
  {
    id: 'elite',
    title: 'Elite',
    description: 'Reach Elite on a main lift',
    icon: 'award',
    isEarned: (stats) => stats.reachedElite,
  },
];
