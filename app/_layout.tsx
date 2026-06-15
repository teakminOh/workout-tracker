import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colorScheme } from 'nativewind';
import { useEffect, useState } from 'react';
import { Appearance } from 'react-native';
import 'react-native-reanimated';
import { Provider } from 'react-redux';
import '../global.css';

import { AppDialogProvider } from '@/components/ui/app-dialog';
import { Palette } from '@/constants/theme';
import { hydrateWorkoutStore, store } from '@/store';

// The app is dark-only: lock both NativeWind variants and the RN appearance.
colorScheme.set('dark');
if (process.env.EXPO_OS !== 'web') {
  Appearance.setColorScheme('dark');
}

export default function RootLayout() {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    hydrateWorkoutStore().finally(() => {
      if (isMounted) {
        setIsHydrated(true);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  if (!isHydrated) {
    return null;
  }

  return (
    <Provider store={store}>
      <AppDialogProvider>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: Palette.bg },
            headerTintColor: Palette.cream,
            headerTitleStyle: { color: Palette.cream, fontWeight: '600' },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: Palette.bg },
            animation: 'slide_from_right',
          }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="create-program" options={{ title: 'Create Program' }} />
          <Stack.Screen name="program/[programId]" options={{ title: 'Choose Workout' }} />
          <Stack.Screen name="program/[programId]/edit" options={{ title: 'Edit Program' }} />
          <Stack.Screen name="start-workout" options={{ title: 'Workout' }} />
          <Stack.Screen name="create-exercise" options={{ title: 'Exercise' }} />
          <Stack.Screen name="session/[sessionId]" options={{ title: 'Workout' }} />
        </Stack>
        <StatusBar style="light" />
      </AppDialogProvider>
    </Provider>
  );
}
