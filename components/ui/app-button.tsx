import type { PressableProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';

import { Icon, type IconName } from './icon';
import { PressableScale } from './pressable-scale';

type AppButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

type AppButtonProps = Omit<PressableProps, 'style'> & {
  title: string;
  variant?: AppButtonVariant;
  icon?: IconName;
  className?: string;
};

const buttonClassNames: Record<AppButtonVariant, string> = {
  primary: 'bg-accent',
  secondary: 'bg-raised',
  ghost: 'bg-transparent',
  danger: 'bg-danger',
};

const textColors: Record<AppButtonVariant, string> = {
  primary: Palette.onAccent,
  secondary: Palette.cream,
  ghost: Palette.muted,
  danger: Palette.cream,
};

export function AppButton({
  title,
  variant = 'primary',
  icon,
  disabled = false,
  className,
  ...pressableProps
}: AppButtonProps) {
  const textColor = textColors[variant];

  return (
    <PressableScale
      accessibilityRole="button"
      disabled={disabled}
      style={{ borderCurve: 'continuous' }}
      className={[
        'min-h-12 flex-row items-center justify-center gap-2 rounded-10 px-4 py-3',
        buttonClassNames[variant],
        disabled ? 'opacity-40' : undefined,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...pressableProps}>
      {icon ? <Icon name={icon} size={18} color={textColor} /> : null}
      <ThemedText type="defaultSemiBold" style={{ color: textColor }}>
        {title}
      </ThemedText>
    </PressableScale>
  );
}
