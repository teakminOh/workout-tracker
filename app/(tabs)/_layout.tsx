import { Tabs } from 'expo-router';

import { BottomTabBar } from '@/components/ui/bottom-tab-bar';
import { Palette } from '@/constants/theme';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <BottomTabBar {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: Palette.bg },
        headerTintColor: Palette.cream,
        headerTitleStyle: { color: Palette.cream, fontWeight: '600' },
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: Palette.bg },
      }}>
      <Tabs.Screen name="index" options={{ headerShown: false }} />
      <Tabs.Screen name="history" options={{ title: 'History' }} />
      <Tabs.Screen name="exercises" options={{ title: 'Exercises' }} />
      <Tabs.Screen name="stats" options={{ title: 'Stats' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
