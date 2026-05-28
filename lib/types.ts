export interface Run {
  id: string;
  userId: string;
  date: Date;
  distance: number; // km
  durationSeconds: number;
  perceivedEffort: number; // 1-10
  flsAfterRun?: number; // FLS value after this run was logged
}

export interface AthleteProfile {
  userId: string;
  distanceUnit: 'km' | 'mi';
  minRunDaysPerWeek: number;
  maxRunDaysPerWeek: number;
  currentFLS: number | null; // null until first run
}

// Fitness Level Score - the core metric
export interface FLSState {
  currentValue: number; // 0-100
  lastUpdated: Date;
  isCalibrated: boolean; // false until first run
}

export interface WeeklyProgress {
  runsThisWeek: number;
  weeklyDistance: number;
  longRunDone: boolean;
  minRequired: number;
  maxAllowed: number;
}

export type RunType = 'easy' | 'steady' | 'moderate' | 'recovery' | 'long';

export interface Recommendation {
  type: RunType;
  distance: number; // km
  targetPaceSeconds: number; // seconds per km
  targetDurationSeconds: number;
  description: string;
  reason: string;
}

export interface ReadinessLevel {
  effort: number; // 7-10 scale
  label: string;
  requiredFLS: number;
  estimatedWeeks: number;
}

export interface ReadinessEstimate {
  currentFLS: number | null;
  levels: ReadinessLevel[];
}

// FLS calculation parameters
export interface FLSCalculation {
  distanceFactor: number;
  paceFactor: number;
  effortFactor: number;
  learningRate: number;
  delta: number;
  newFLS: number;
}
