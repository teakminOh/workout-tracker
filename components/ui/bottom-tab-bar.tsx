import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Icon, type IconName } from '@/components/ui/icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Palette } from '@/constants/theme';

const tabIcons: Record<string, IconName> = {
  index: 'home',
  history: 'clock',
  exercises: 'list',
  stats: 'bar-chart-2',
  profile: 'user',
};

const tabLabels: Record<string, string> = {
  index: 'Home',
  history: 'History',
  exercises: 'Exercises',
  stats: 'Stats',
  profile: 'Profile',
};

/**
 * Warm-charcoal bottom navigation. The active tab's icon sits in a soft-orange
 * chip with an accent label; inactive tabs are muted and label-less.
 */
export function BottomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        paddingBottom: Math.max(insets.bottom, 10),
        borderTopWidth: 1,
        borderTopColor: Palette.line,
        backgroundColor: Palette.surface,
      }}
      className="flex-row w-full px-2 pt-2">
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const icon = tabIcons[route.name] ?? 'circle';
        const label = tabLabels[route.name] ?? route.name;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <View key={route.key} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <PressableScale
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={label}
              scaleTo={0.9}
              onPress={onPress}>
              <View
                style={{ borderCurve: 'continuous' }}
                className={[
                  'h-9 w-16 items-center justify-center mb-1',
                ]
                  .filter(Boolean)
                  .join(' ')}>
                <Icon name={icon} size={20} color={isFocused ? Palette.accent : Palette.muted} />
              </View>
              <ThemedText
                style={{
                  fontSize: 11,
                  lineHeight: 14,
                  color: isFocused ? Palette.accent : Palette.faint,
                  fontWeight: isFocused ? '600' : '400',
                  textAlign: 'center',
                }}>
                {label}
              </ThemedText>
            </PressableScale>
          </View>
        );
      })}
    </View>
  );
}
