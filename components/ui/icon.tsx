import Feather from '@expo/vector-icons/Feather';
import type { ComponentProps } from 'react';

import { Palette } from '@/constants/theme';

export type IconName = ComponentProps<typeof Feather>['name'];

type IconProps = {
  name: IconName;
  size?: number;
  color?: string;
};

/**
 * The app icon set: Feather (Lucide's upstream — same minimal line style).
 * Muted gray by default, accent orange when active or selected.
 */
export function Icon({ name, size = 18, color = Palette.muted }: IconProps) {
  return <Feather name={name} size={size} color={color} />;
}
