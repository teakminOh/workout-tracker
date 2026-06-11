import { Pressable, type PressableProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';

type AppButtonVariant = 'primary' | 'secondary';

type AppButtonProps = PressableProps & {
  title: string;
  variant?: AppButtonVariant;
  className?: string;
};

const buttonClassNames: Record<AppButtonVariant, string> = {
  primary: 'bg-[#0A7EA4]',
  secondary: 'border border-[#0A7EA4] bg-transparent',
};

const disabledClassNames: Record<AppButtonVariant, string> = {
  primary: 'opacity-60',
  secondary: 'border-[#A8B1B6] opacity-70',
};

export function AppButton({
  title,
  variant = 'primary',
  disabled = false,
  className,
  ...pressableProps
}: AppButtonProps) {
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      className={[
        'min-h-12 items-center justify-center rounded-lg px-4 py-3',
        buttonClassNames[variant],
        disabled ? disabledClassNames[variant] : undefined,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...pressableProps}>
      <ThemedText
        lightColor={isPrimary ? '#FFFFFF' : disabled ? '#8A9296' : '#0A7EA4'}
        darkColor={isPrimary ? '#FFFFFF' : disabled ? '#7A8589' : '#8AD7F8'}
        type="defaultSemiBold">
        {title}
      </ThemedText>
    </Pressable>
  );
}
