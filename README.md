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

- Home screen with the active 3-day split
- Start Workout screen
- Planned program days for Push, Pull, and Legs
- Planned exercises with target sets, reps, and weights
- Add set form for reps and actual weight
- Live workout analytics for sets, volume, and duration
- Progressive overload suggestions using double progression
- Redux Toolkit state for programs, templates, sessions, and sets

## Project Structure

- `app/`: Expo Router routes
- `components/`: reusable UI and workout display components
- `features/workouts/`: workout Redux slice and selectors
- `store/`: Redux store setup and typed hooks
- `types/`: shared TypeScript data types
- `utils/`: small pure helper functions
