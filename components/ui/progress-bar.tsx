import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Palette } from '@/constants/theme';

type ProgressBarProps = {
  /** 0..1 — values outside the range are clamped. */
  progress: number;
  className?: string;
};

/**
 * Thin accent progress bar that animates smoothly between values.
 */
export function ProgressBar({ progress, className }: ProgressBarProps) {
  const clamped = Math.min(1, Math.max(0, progress));
  const width = useSharedValue(clamped);

  useEffect(() => {
    width.value = withTiming(clamped, {
      duration: 350,
      easing: Easing.out(Easing.cubic),
    });
  }, [clamped, width]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${width.value * 100}%`,
  }));

  return (
    <View
      accessibilityRole="progressbar"
      className={['h-1.5 overflow-hidden rounded-full bg-raised', className]
        .filter(Boolean)
        .join(' ')}>
      <Animated.View
        style={[{ backgroundColor: Palette.accent, borderRadius: 999, height: '100%' }, fillStyle]}
      />
    </View>
  );
}
