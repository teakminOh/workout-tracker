import { useState } from 'react';
import {
  Pressable,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

type PressableScaleProps = Omit<PressableProps, 'style'> & {
  className?: string;
  style?: StyleProp<ViewStyle>;
  /** Scale while pressed. Buttons read well at 0.97, small icon targets at ~0.85. */
  scaleTo?: number;
};

/**
 * Pressable with a quick scale feedback. The base interactive element for
 * buttons, cards, and chips.
 *
 * Implemented as a plain `Pressable` (not a Reanimated/cssInterop component) so
 * that NativeWind `className` styling applies reliably on native — a Reanimated
 * animated component fights NativeWind for the `style` prop and drops the styles
 * on native.
 */
export function PressableScale({
  scaleTo = 0.97,
  onPressIn,
  onPressOut,
  style,
  ...pressableProps
}: PressableScaleProps) {
  const [pressed, setPressed] = useState(false);

  return (
    <Pressable
      style={[{ transform: [{ scale: pressed ? scaleTo : 1 }] }, style]}
      onPressIn={(event: GestureResponderEvent) => {
        setPressed(true);
        onPressIn?.(event);
      }}
      onPressOut={(event: GestureResponderEvent) => {
        setPressed(false);
        onPressOut?.(event);
      }}
      {...pressableProps}
    />
  );
}
