/**
 * Single dark theme: warm charcoal surfaces, cream text, one orange accent.
 * Depth comes from progressively lighter background shades (bg -> surface -> raised),
 * not borders or shadows. Keep these values in sync with tailwind.config.js.
 */

import { Platform } from 'react-native';

export const Palette = {
  /** Page background — deep warm charcoal */
  bg: '#262421',
  /** Cards and grouped content */
  surface: '#302D29',
  /** Inputs, secondary buttons, elements nested inside cards */
  raised: '#3B3733',
  /** Rare hairlines */
  line: '#48433D',
  /** Primary text — off-white cream, softer than pure white */
  cream: '#EDE9E2',
  /** Secondary text and idle icons */
  muted: '#A8A199',
  /** Placeholders and disabled text */
  faint: '#736D64',
  /** The one vibrant orange — primary actions, active states, progress */
  accent: '#E8743B',
  accentPressed: '#C95E2C',
  /** Translucent orange tint for selected surfaces */
  accentSoft: 'rgba(232, 116, 59, 0.14)',
  /** Text/icons placed on solid accent backgrounds */
  onAccent: '#262421',
  danger: '#D9655B',
} as const;

const themeColors = {
  text: Palette.cream,
  background: Palette.bg,
  tint: Palette.accent,
  icon: Palette.muted,
  tabIconDefault: Palette.muted,
  tabIconSelected: Palette.accent,
};

// The app is dark-only by design: both schemes resolve to the same dark palette.
export const Colors = {
  light: themeColors,
  dark: themeColors,
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
