import type { BiologicalSex, StandardLiftKey } from '@/types/workout';

/**
 * Strength standards as bodyweight-ratio thresholds per lift and sex.
 *
 * These are an APPROXIMATION modelled on commonly published standards
 * (StrengthLevel / Kilgore-style). A lifter's estimated 1RM is divided by their
 * bodyweight; the resulting ratio is compared against the thresholds below to
 * place them in a band. Bands map to rough population percentiles — they are a
 * motivational estimate, not a precise ranking against all lifters.
 */

export type StrengthBand = 'beginner' | 'novice' | 'intermediate' | 'advanced' | 'elite';

export const STRENGTH_BAND_ORDER: StrengthBand[] = [
  'beginner',
  'novice',
  'intermediate',
  'advanced',
  'elite',
];

export const STRENGTH_BAND_LABELS: Record<StrengthBand, string> = {
  beginner: 'Beginner',
  novice: 'Novice',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  elite: 'Elite',
};

/** Rough "stronger than" framing for each band. Deliberately approximate. */
export const STRENGTH_BAND_PERCENTILE: Record<StrengthBand, string> = {
  beginner: 'Building your base',
  novice: '≈ Top 50% of lifters',
  intermediate: '≈ Top 35% of lifters',
  advanced: '≈ Top 10% of lifters',
  elite: '≈ Top 3% of lifters',
};

export const STANDARD_LIFT_LABELS: Record<StandardLiftKey, string> = {
  bench: 'Bench Press',
  squat: 'Squat',
  deadlift: 'Deadlift',
  overhead_press: 'Overhead Press',
  barbell_row: 'Barbell Row',
};

// Thresholds are e1RM-to-bodyweight ratios. Reaching a threshold earns that band;
// below `novice` is `beginner`.
type LiftThresholds = {
  novice: number;
  intermediate: number;
  advanced: number;
  elite: number;
};

const STANDARDS: Record<BiologicalSex, Record<StandardLiftKey, LiftThresholds>> = {
  male: {
    bench: { novice: 0.75, intermediate: 1.0, advanced: 1.5, elite: 2.0 },
    squat: { novice: 1.0, intermediate: 1.5, advanced: 2.0, elite: 2.5 },
    deadlift: { novice: 1.25, intermediate: 1.75, advanced: 2.5, elite: 3.0 },
    overhead_press: { novice: 0.5, intermediate: 0.7, advanced: 1.0, elite: 1.3 },
    barbell_row: { novice: 0.7, intermediate: 1.0, advanced: 1.3, elite: 1.6 },
  },
  female: {
    bench: { novice: 0.5, intermediate: 0.7, advanced: 1.0, elite: 1.4 },
    squat: { novice: 0.7, intermediate: 1.1, advanced: 1.5, elite: 2.0 },
    deadlift: { novice: 0.9, intermediate: 1.3, advanced: 1.9, elite: 2.4 },
    overhead_press: { novice: 0.35, intermediate: 0.5, advanced: 0.75, elite: 1.0 },
    barbell_row: { novice: 0.5, intermediate: 0.7, advanced: 1.0, elite: 1.3 },
  },
};

export type LiftClassification = {
  band: StrengthBand;
  bandLabel: string;
  percentileLabel: string;
  ratio: number;
};

export const classifyLift = ({
  e1RM,
  bodyweightKg,
  sex,
  lift,
}: {
  e1RM: number;
  bodyweightKg: number;
  sex: BiologicalSex;
  lift: StandardLiftKey;
}): LiftClassification => {
  const thresholds = STANDARDS[sex][lift];
  const ratio = bodyweightKg > 0 ? e1RM / bodyweightKg : 0;

  let band: StrengthBand = 'beginner';

  (['novice', 'intermediate', 'advanced', 'elite'] as const).forEach((candidate) => {
    if (ratio >= thresholds[candidate]) {
      band = candidate;
    }
  });

  return {
    band,
    bandLabel: STRENGTH_BAND_LABELS[band],
    percentileLabel: STRENGTH_BAND_PERCENTILE[band],
    ratio,
  };
};
