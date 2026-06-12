# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm start          # start Expo dev server (interactive: press a/i/w for Android/iOS/Web)
npm run android    # start on Android
npm run ios        # start on iOS
npm run web        # start on web
npm run lint       # run ESLint via expo lint
```

There is no test suite. TypeScript type checking can be run via the IDE or `npx tsc --noEmit`.

## Architecture

**Expo Router + Redux Toolkit + NativeWind (Tailwind v3)**

### State management

All app state lives in a single Redux slice at `features/workouts/workout-slice.ts`. The `WorkoutState` type (in `types/workout.ts`) is a normalized store of plain records keyed by ID:

- `exercises` — exercise definitions (name, unit, muscle group)
- `programs` — workout programs
- `workoutDayTemplates` — days within a program
- `programExercises` — exercises within a day (with progression targets)
- `workoutSessions` — live and completed workout sessions
- `workoutSets` — individual logged sets
- `progressionRules` — double-progression rules referenced by `programExercises`
- `activeWorkoutSessionId` — the one session currently in progress (or null)

State is persisted to `AsyncStorage` keyed `workout-tracker:workout-state:v1`. On app launch, `_layout.tsx` calls `hydrateWorkoutStore()` before rendering. The root layout blocks rendering until hydration completes.

**Seed data** in `features/workouts/seed-data.ts` provides the initial state (pre-loaded exercises and a default program).

### Selectors

`features/workouts/workout-selectors.ts` exports all `createSelector` memoized selectors. This file is large; computed view-model types (`PlannedExercise`, `LastExerciseReference`, `ProgramEditorDay`, etc.) are also defined here. Helper functions used inside selectors live in `features/workouts/workout-selector-helpers.ts`.

Progression suggestion logic (double-progression text generation for strength/hypertrophy/power) lives in the selectors file.

### Domain helpers

`features/workouts/workout-domain.ts` — pure functions used inside slice reducers:
- `createId(prefix)` — generates IDs
- `getVisibleProgramDays` / `getVisibleProgramExercisesForDay` — filter out archived records
- `getProgramExerciseFields` — maps form input to a `ProgramExercise` entity
- `isSameProgramExerciseInput` — detects no-op edits to avoid creating a new entity with history

`features/workouts/workout-form-helpers.ts` — form-specific helpers for building exercise input objects.

### Routes

| Route | Purpose |
|---|---|
| `app/index.tsx` | Home: active program day, set suggestions, week summary, recent workouts |
| `app/start-workout.tsx` | Active workout screen: log sets, view exercise references |
| `app/create-program.tsx` | Multi-step form to create a new program with days and exercises |
| `app/program/[programId].tsx` | Program detail: choose which day to start |
| `app/program/[programId]/edit.tsx` | Edit program: rename days, add/edit/archive exercises |

### Styling

NativeWind with Tailwind v3 (`tailwind.config.js`). `global.css` imports Tailwind. Platform-aware color scheme hooks are in `hooks/`. `ThemedText` and `ThemedView` in `components/` wrap platform colors.

### Key patterns

- **Archived instead of deleted**: workout days and program exercises are soft-deleted with `isArchived: true`. Selectors and domain helpers always filter archived records before use.
- **updateProgramExercise with history**: when a `programExercise` has logged sets, editing it archives the old record and creates a new one (preserving history linkage). Without history, it mutates in place.
- **Typed hooks**: use `useAppDispatch` and `useAppSelector` from `store/hooks.ts` instead of the raw Redux hooks.
