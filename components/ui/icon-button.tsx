import { Palette } from '@/constants/theme';

import { Icon, type IconName } from './icon';
import { PressableScale } from './pressable-scale';

type IconButtonProps = {
  name: IconName;
  accessibilityLabel: string;
  onPress: () => void;
  size?: number;
  color?: string;
  disabled?: boolean;
  className?: string;
};

/**
 * Round 40pt icon target with spring press feedback.
 * Pass className="bg-raised" for a tinted variant (e.g. steppers).
 */
export function IconButton({
  name,
  accessibilityLabel,
  onPress,
  size = 18,
  color = Palette.muted,
  disabled = false,
  className,
}: IconButtonProps) {
  return (
    <PressableScale
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      scaleTo={0.85}
      disabled={disabled}
      className={[
        'h-10 w-10 items-center justify-center rounded-full',
        disabled ? 'opacity-40' : undefined,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      onPress={onPress}>
      <Icon name={name} size={size} color={color} />
    </PressableScale>
  );
}
