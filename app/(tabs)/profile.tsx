import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppButton } from '@/components/ui/app-button';
import { AppTextInput } from '@/components/ui/app-text-input';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Palette } from '@/constants/theme';
import { selectStrengthProfile } from '@/features/workouts/workout-selectors';
import { updateProfile } from '@/features/workouts/workout-slice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import type { BiologicalSex } from '@/types/workout';
import { parseWorkoutNumberInput } from '@/utils/workout-formatters';

const sexOptions: { label: string; value: BiologicalSex }[] = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
];

export default function ProfileScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { profile } = useAppSelector(selectStrengthProfile);

  const [bodyweight, setBodyweight] = useState(
    profile?.bodyweightKg ? `${profile.bodyweightKg}` : ''
  );
  const [sex, setSex] = useState<BiologicalSex | null>(profile?.sex ?? null);

  const parsedBodyweight = parseWorkoutNumberInput(bodyweight);
  const canSave = Number.isFinite(parsedBodyweight) && parsedBodyweight > 0 && sex !== null;

  const handleSave = () => {
    if (!canSave || sex === null) {
      return;
    }

    dispatch(updateProfile({ bodyweightKg: parsedBodyweight, sex }));
    router.back();
  };

  return (
    <ThemedView className="flex-1">
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-7 px-5 py-8"
        keyboardShouldPersistTaps="handled">
        <View className="gap-2">
          <ThemedText type="title">Your Profile</ThemedText>
          <ThemedText className="opacity-60">
            Bodyweight and sex let us score your lifts against population strength
            standards. These are approximate, motivational estimates.
          </ThemedText>
        </View>

        <View className="gap-2">
          <ThemedText type="label">Bodyweight (kg)</ThemedText>
          <AppTextInput
            placeholder="80"
            keyboardType="decimal-pad"
            keyboardAppearance="dark"
            value={bodyweight}
            onChangeText={setBodyweight}
          />
        </View>

        <View className="gap-2">
          <ThemedText type="label">Sex</ThemedText>
          <View className="flex-row gap-2">
            {sexOptions.map((option) => {
              const isSelected = sex === option.value;

              return (
                <PressableScale
                  key={option.value}
                  accessibilityRole="button"
                  scaleTo={0.96}
                  className={`flex-1 items-center rounded-10 px-4 py-3 ${
                    isSelected ? 'bg-accent' : 'bg-raised'
                  }`}
                  onPress={() => setSex(option.value)}>
                  <ThemedText
                    type="defaultSemiBold"
                    style={{ color: isSelected ? Palette.onAccent : Palette.muted }}>
                    {option.label}
                  </ThemedText>
                </PressableScale>
              );
            })}
          </View>
        </View>

        <AppButton title="Save Profile" disabled={!canSave} onPress={handleSave} />
        <AppButton
          title="View Strength Level"
          variant="ghost"
          onPress={() => router.replace('/stats' as Href)}
        />
      </ScrollView>
    </ThemedView>
  );
}
