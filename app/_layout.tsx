import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import { Provider } from 'react-redux';
import '../global.css';

import { hydrateWorkoutStore, store } from '@/store';

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
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="create-program" options={{ title: 'Create Program' }} />
        <Stack.Screen name="program/[programId]" options={{ title: 'Choose Workout' }} />
        <Stack.Screen name="program/[programId]/edit" options={{ title: 'Edit Program' }} />
        <Stack.Screen name="start-workout" options={{ title: 'Start Workout' }} />
      </Stack>
      <StatusBar style="auto" />
    </Provider>
  );
}
