import { TextInput, type TextInputProps } from 'react-native';

import { Palette } from '@/constants/theme';

type AppTextInputProps = TextInputProps & {
  className?: string;
};

/**
 * Themed text input on the raised surface — left-aligned cream text,
 * faint placeholder. The form counterpart to the centered numeric inputs
 * on the Start Workout screen.
 */
export function AppTextInput({ className, ...props }: AppTextInputProps) {
  return (
    <TextInput
      placeholderTextColor={Palette.faint}
      style={{ borderCurve: 'continuous' }}
      className={['min-h-12 rounded-10 bg-raised px-4 text-base text-cream', className]
        .filter(Boolean)
        .join(' ')}
      {...props}
    />
  );
}
