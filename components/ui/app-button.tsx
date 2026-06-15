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
  /** Side of the title the icon sits on. Defaults to 'left'. */
  iconPosition?: 'left' | 'right';
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
  iconPosition = 'left',
  disabled = false,
  className,
  ...pressableProps
}: AppButtonProps) {
  const textColor = textColors[variant];
  const iconNode = icon ? <Icon name={icon} size={18} color={textColor} /> : null;

  return (
    <PressableScale
      accessibilityRole="button"
      disabled={disabled}
      style={{
        borderCurve: 'continuous',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
      }}
      className={[
        'min-h-12 rounded-10 px-4 py-3',
        buttonClassNames[variant],
        disabled ? 'opacity-40' : undefined,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...pressableProps}>
      {iconPosition === 'left' ? iconNode : null}
      <ThemedText type="defaultSemiBold" style={{ color: textColor }}>
        {title}
      </ThemedText>
      {iconPosition === 'right' ? iconNode : null}
    </PressableScale>
  );
}
