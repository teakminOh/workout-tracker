import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { Palette } from '@/constants/theme';
import type { AchievementView } from '@/features/workouts/workout-selectors';

const cardStyle = { borderCurve: 'continuous' } as const;

type AchievementBadgeProps = {
  achievement: AchievementView;
};

/** A single achievement tile — accent-tinted when earned, muted when locked. */
export function AchievementBadge({ achievement }: AchievementBadgeProps) {
  const { isEarned, progress } = achievement;

  return (
    <View
      style={[cardStyle, isEarned ? { backgroundColor: Palette.accentSoft } : undefined]}
      className={['flex-1 gap-2 rounded-10 p-4', isEarned ? '' : 'bg-surface']
        .filter(Boolean)
        .join(' ')}>
      <Icon
        name={achievement.icon}
        size={22}
        color={isEarned ? Palette.accent : Palette.faint}
      />
      <View className="gap-0.5">
        <ThemedText
          type="defaultSemiBold"
          style={isEarned ? { color: Palette.accent } : { color: Palette.muted }}>
          {achievement.title}
        </ThemedText>
        <ThemedText className="text-[12px] leading-4 opacity-60">
          {achievement.description}
        </ThemedText>
      </View>
      {!isEarned && progress > 0 ? (
        <ThemedText type="label">{Math.round(progress * 100)}%</ThemedText>
      ) : null}
    </View>
  );
}
