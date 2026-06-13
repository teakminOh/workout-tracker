import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppTextInput } from '@/components/ui/app-text-input';
import { Icon } from '@/components/ui/icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Palette } from '@/constants/theme';
import type { WorkoutProgramExerciseDraft } from '@/features/workouts/workout-form-helpers';

const cardStyle = { borderCurve: 'continuous' } as const;

type ExercisePrescriptionProps = {
  draft: WorkoutProgramExerciseDraft;
  onChange: (updates: Partial<WorkoutProgramExerciseDraft>) => void;
  onPickPress: () => void;
};

/** The per-slot exercise prescription: pick an exercise, then sets / range / weight. */
export function ExercisePrescription({ draft, onChange, onPickPress }: ExercisePrescriptionProps) {
  const isTime = draft.trackingMode === 'time';
  const weightLabel = draft.unit === 'bodyweight' ? 'Weight' : `Weight (${draft.unit})`;

  return (
    <>
      <PressableScale
        accessibilityRole="button"
        style={cardStyle}
        className="flex-row items-center justify-between gap-3 rounded-10 bg-bg p-4"
        onPress={onPickPress}>
        <ThemedText
          type="defaultSemiBold"
          style={draft.exerciseId ? undefined : { color: Palette.faint }}>
          {draft.exerciseName || 'Select exercise'}
        </ThemedText>
        <Icon name="chevron-right" size={18} color={Palette.muted} />
      </PressableScale>

      {draft.exerciseId ? (
        <>
          <View className="flex-row gap-3">
            <View className="flex-1 gap-2">
              <ThemedText type="defaultSemiBold">Sets</ThemedText>
              <AppTextInput
                keyboardType="numeric"
                placeholder="3"
                value={draft.targetSets}
                onChangeText={(targetSets) => onChange({ targetSets })}
              />
            </View>
            <View className="flex-1 gap-2">
              <ThemedText type="defaultSemiBold">{isTime ? 'Seconds min' : 'Reps min'}</ThemedText>
              <AppTextInput
                keyboardType="numeric"
                placeholder={isTime ? '30' : '3'}
                value={draft.targetMin}
                onChangeText={(targetMin) => onChange({ targetMin })}
              />
            </View>
          </View>

          <View className="flex-row gap-3">
            <View className="flex-1 gap-2">
              <ThemedText type="defaultSemiBold">{isTime ? 'Seconds max' : 'Reps max'}</ThemedText>
              <AppTextInput
                keyboardType="numeric"
                placeholder={isTime ? '60' : '5'}
                value={draft.targetMax}
                onChangeText={(targetMax) => onChange({ targetMax })}
              />
            </View>
            <View className="flex-1 gap-2">
              <ThemedText type="defaultSemiBold">{weightLabel}</ThemedText>
              <AppTextInput
                keyboardType="decimal-pad"
                placeholder="0"
                value={draft.targetWeight}
                onChangeText={(targetWeight) => onChange({ targetWeight })}
              />
            </View>
          </View>
        </>
      ) : null}
    </>
  );
}
