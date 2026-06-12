import { cssInterop } from 'nativewind';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

cssInterop(AnimatedPressable, { className: 'style' });

const pressSpring = { damping: 18, stiffness: 320 };

type PressableScaleProps = Omit<PressableProps, 'style'> & {
  className?: string;
  style?: StyleProp<ViewStyle>;
  /** Scale while pressed. Buttons read well at 0.97, small icon targets at ~0.85. */
  scaleTo?: number;
};

/**
 * Pressable with gentle spring scale feedback. The base interactive
 * element for buttons, cards, and chips.
 */
export function PressableScale({
  scaleTo = 0.97,
  onPressIn,
  onPressOut,
  style,
  ...pressableProps
}: PressableScaleProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      style={[animatedStyle, style]}
      onPressIn={(event) => {
        scale.value = withSpring(scaleTo, pressSpring);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        scale.value = withSpring(1, pressSpring);
        onPressOut?.(event);
      }}
      {...pressableProps}
    />
  );
}
