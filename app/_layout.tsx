import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { Provider } from 'react-redux';
import '../global.css';

import { store } from '@/store';

export default function RootLayout() {
  return (
    <Provider store={store}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="start-workout" options={{ title: 'Start Workout' }} />
      </Stack>
      <StatusBar style="auto" />
    </Provider>
  );
}
