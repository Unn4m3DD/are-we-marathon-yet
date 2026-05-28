import type { Run, FLSCalculation } from './types';

// FLS (Fitness Level Score) Engine
// Core formula: FLS tracks aerobic fitness 0-100, calculated from distance, pace, and effort

const REFERENCE_PACE_SECONDS = 7 * 60; // 7:00 min/km baseline
const INITIAL_FLS_BASE = 25; // Starting scale factor

// Calculate initial FLS from first run
export function calculateInitialFLS(
  distanceKm: number,
  durationSeconds: number,
  effort: number
): number {
  const actualPaceSeconds = durationSeconds / distanceKm;
  const distanceFactor = distanceKm / 5; // normalized to 5km
  const paceFactor = REFERENCE_PACE_SECONDS / actualPaceSeconds;
  const effortFactor = (11 - effort) / 8; // effort 3 = 1.0, effort 9 = 0.25

  const fls = INITIAL_FLS_BASE * distanceFactor * paceFactor * effortFactor;
  return Math.max(5, Math.min(50, fls)); // Clamp: 5 min, 50 max for first run
}

// Calculate FLS update after a run
export function updateFLS(
  currentFLS: number,
  run: Run,
  expectedDistance: number,
  expectedPaceSeconds: number
): FLSCalculation {
  const actualPaceSeconds = run.durationSeconds / run.distance;

  // Performance factors: how did actual compare to expected?
  const distanceFactor = run.distance / expectedDistance;
  const paceFactor = expectedPaceSeconds / actualPaceSeconds;
  const effortFactor = (11 - run.perceivedEffort) / 10;

  // Combined performance delta (1.0 = met expectations)
  const performanceDelta = distanceFactor * paceFactor * effortFactor - 1;

  // Learning rate based on effort (high effort = noisy signal, low alpha)
  const learningRate = getLearningRate(run.perceivedEffort);

  // Calculate new FLS
  const delta = learningRate * performanceDelta;
  const newFLS = Math.max(5, Math.min(95, currentFLS + delta));

  return {
    distanceFactor,
    paceFactor,
    effortFactor,
    learningRate,
    delta,
    newFLS,
  };
}

function getLearningRate(effort: number): number {
  if (effort <= 4) return 2.0; // Easy: high confidence, fast learning
  if (effort <= 6) return 1.0; // Moderate: normal learning
  if (effort <= 8) return 0.5; // Hard: noisy signal, slow learning
  return 0.2; // Max effort: very noisy, minimal update
}

// Derive training parameters from FLS
export function getParametersFromFLS(fls: number) {
  // Base easy pace: 7:00 at FLS 0, ~4:00 at FLS 100 (2.5s reduction per FLS point)
  const basePaceSeconds = Math.max(240, 420 - fls * 1.8);

  // Comfortable distance: 3km at FLS 0, ~18km at FLS 100
  const comfortableDistance = 3 + fls * 0.15;

  // Long run target: 1.5x at low FLS, up to 2.0x at high FLS
  const longRunMultiplier = 1.5 + fls / 200;
  const longRunTarget = Math.min(34, comfortableDistance * longRunMultiplier);

  return {
    basePaceSeconds,
    comfortableDistance,
    longRunTarget,
  };
}

// Calculate expected pace for a given FLS and run type
export function getExpectedPace(fls: number, type: 'easy' | 'steady' | 'moderate' | 'recovery'): number {
  const { basePaceSeconds } = getParametersFromFLS(fls);

  switch (type) {
    case 'recovery':
      return basePaceSeconds + 30; // +30s per km
    case 'easy':
      return basePaceSeconds;
    case 'steady':
      return basePaceSeconds - 15; // ~15s faster
    case 'moderate':
      return basePaceSeconds - 30; // ~30s faster
    default:
      return basePaceSeconds;
  }
}

// Calculate expected distance for recommendation
export function getExpectedDistance(
  fls: number,
  type: 'easy' | 'steady' | 'moderate' | 'recovery' | 'long',
  effortMultiplier: number = 1.0
): number {
  const { comfortableDistance, longRunTarget } = getParametersFromFLS(fls);

  let baseDistance: number;
  switch (type) {
    case 'recovery':
      baseDistance = Math.max(3, comfortableDistance * 0.4);
      break;
    case 'easy':
      baseDistance = comfortableDistance * 0.7;
      break;
    case 'steady':
    case 'moderate':
      baseDistance = comfortableDistance;
      break;
    case 'long':
      baseDistance = longRunTarget;
      break;
    default:
      baseDistance = comfortableDistance;
  }

  return Math.round(baseDistance * effortMultiplier * 10) / 10;
}

// Calculate marathon timeline from current FLS
export function calculateMarathonWeeks(currentFLS: number): number {
  if (currentFLS >= 80) return 2; // Already ready with taper
  if (currentFLS >= 70) return 4;
  if (currentFLS >= 60) return 6;
  if (currentFLS >= 50) return 8;
  if (currentFLS >= 40) return 10;
  if (currentFLS >= 30) return 12;
  if (currentFLS >= 20) return 14;
  return 16; // Maximum
}

// Get readiness levels based on FLS
export function getReadinessLevels(currentFLS: number | null) {
  const levels = [
    { effort: 10, label: 'Finish (struggle)', requiredFLS: 50 },
    { effort: 9, label: 'Hard finish', requiredFLS: 60 },
    { effort: 8, label: 'Strong finish', requiredFLS: 70 },
    { effort: 7, label: 'Comfortable', requiredFLS: 80 },
  ];

  return levels.map(level => ({
    ...level,
    estimatedWeeks: currentFLS === null
      ? 16
      : Math.max(0, calculateWeeksToFLS(currentFLS, level.requiredFLS)),
  }));
}

function calculateWeeksToFLS(currentFLS: number, targetFLS: number): number {
  if (currentFLS >= targetFLS) return 0;

  // Estimate FLS growth: ~0.5-2.0 per week depending on consistency
  const avgWeeklyGain = 1.0;
  const weeksNeeded = Math.ceil((targetFLS - currentFLS) / avgWeeklyGain);

  return weeksNeeded;
}

// Rebuild FLS from scratch (for recalculation after run deletion)
export function recalculateFLSFromHistory(runs: Run[]): number | null {
  if (runs.length === 0) return null;

  // Sort by date ascending
  const sortedRuns = [...runs].sort((a, b) => a.date.getTime() - b.date.getTime());

  // Calculate initial FLS from first run
  const firstRun = sortedRuns[0];
  let fls = calculateInitialFLS(
    firstRun.distance,
    firstRun.durationSeconds,
    firstRun.perceivedEffort
  );

  // Update through each subsequent run
  for (let i = 1; i < sortedRuns.length; i++) {
    const run = sortedRuns[i];
    const { comfortableDistance, basePaceSeconds } = getParametersFromFLS(fls);

    // Determine what type of run this likely was based on distance ratio
    const distanceRatio = run.distance / comfortableDistance;
    let expectedDistance = comfortableDistance;
    let type: 'easy' | 'steady' | 'moderate' | 'recovery' | 'long' = 'easy';

    if (distanceRatio < 0.5) {
      type = 'recovery';
      expectedDistance = comfortableDistance * 0.4;
    } else if (distanceRatio > 1.3) {
      type = 'long';
      expectedDistance = comfortableDistance * 1.5;
    }

    const expectedPace = getExpectedPace(fls, type === 'long' ? 'steady' : type);
    const update = updateFLS(fls, run, expectedDistance, expectedPace);
    fls = update.newFLS;
  }

  return fls;
}
