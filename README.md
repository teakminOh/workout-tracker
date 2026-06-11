# Workout Tracker

An Expo React Native workout tracker built with Expo Router, Redux Toolkit, TypeScript, and NativeWind.

## Run The App

```bash
npm install
npm run start
```

You can also use:

```bash
npm run android
npm run ios
npm run web
```

## Current Features

- Home screen with active workout status
- Start Workout screen
- Add set form with exercise, reps, and weight
- Live workout analytics for sets, volume, and duration
- Redux Toolkit state for the active workout

## Project Structure

- `app/`: Expo Router routes
- `components/`: reusable UI and workout display components
- `features/workouts/`: workout Redux slice and selectors
- `store/`: Redux store setup and typed hooks
- `types/`: shared TypeScript data types
- `utils/`: small pure helper functions
