import type { Run, FLSCalculation } from './types';

// FLS (Fitness Level Score) Engine
// Core formula: FLS tracks aerobic fitness 0-100, calculated from distance, speed, and effort

const REFERENCE_SPEED_KMH = 8.5; // ~7:00 min/km baseline = 8.5 km/h
const INITIAL_FLS_BASE = 25; // Starting scale factor

// Convert speed (km/h) to pace (seconds per km)
export function speedToPace(speedKmh: number): number {
  if (speedKmh <= 0) return 600; // Default to 10:00/km for invalid
  return 3600 / speedKmh;
}

// Convert pace (seconds per km) to speed (km/h)
export function paceToSpeed(paceSeconds: number): number {
  if (paceSeconds <= 0) return 0;
  return 3600 / paceSeconds;
}

// Calculate initial FLS from first run
export function calculateInitialFLS(
  distanceKm: number,
  durationSeconds: number,
  effort: number
): number {
  const actualSpeedKmh = (distanceKm / durationSeconds) * 3600;
  const distanceFactor = distanceKm / 5; // normalized to 5km
  const speedFactor = actualSpeedKmh / REFERENCE_SPEED_KMH;
  const effortFactor = (11 - effort) / 8; // effort 3 = 1.0, effort 9 = 0.25

  const fls = INITIAL_FLS_BASE * distanceFactor * speedFactor * effortFactor;
  return Math.max(5, Math.min(50, fls)); // Clamp: 5 min, 50 max for first run
}

// Calculate FLS update after a run
export function updateFLS(
  currentFLS: number,
  run: Run,
  expectedDistance: number,
  expectedSpeedKmh: number
): FLSCalculation {
  const actualSpeedKmh = (run.distance / run.durationSeconds) * 3600;

  // Performance factors: how did actual compare to expected?
  const distanceFactor = run.distance / expectedDistance;
  const speedFactor = actualSpeedKmh / expectedSpeedKmh;
  const effortFactor = (11 - run.perceivedEffort) / 10;

  // Combined performance delta (1.0 = met expectations)
  const performanceDelta = distanceFactor * speedFactor * effortFactor - 1;

  // Learning rate based on effort (high effort = noisy signal, low alpha)
  const learningRate = getLearningRate(run.perceivedEffort);

  // Calculate new FLS
  const delta = learningRate * performanceDelta;
  const newFLS = Math.max(5, Math.min(95, currentFLS + delta));

  return {
    distanceFactor,
    speedFactor,
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
  // Base easy speed: 8.5 km/h at FLS 0, ~15 km/h at FLS 100
  // Speed increases by ~0.065 km/h per FLS point
  const baseSpeedKmh = Math.min(16, 8.5 + fls * 0.065);

  // Comfortable distance: 3km at FLS 0, ~18km at FLS 100
  const comfortableDistance = 3 + fls * 0.15;

  // Long run target: 1.5x at low FLS, up to 2.0x at high FLS
  const longRunMultiplier = 1.5 + fls / 200;
  const longRunTarget = Math.min(34, comfortableDistance * longRunMultiplier);

  return {
    baseSpeedKmh,
    comfortableDistance,
    longRunTarget,
  };
}

// Calculate expected speed for a given FLS and run type (returns km/h)
export function getExpectedSpeed(fls: number, type: 'easy' | 'steady' | 'moderate' | 'recovery'): number {
  const { baseSpeedKmh } = getParametersFromFLS(fls);

  switch (type) {
    case 'recovery':
      return baseSpeedKmh * 0.9; // 10% slower
    case 'easy':
      return baseSpeedKmh;
    case 'steady':
      return baseSpeedKmh * 1.05; // 5% faster
    case 'moderate':
      return baseSpeedKmh * 1.1; // 10% faster
    default:
      return baseSpeedKmh;
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
    const { comfortableDistance } = getParametersFromFLS(fls);

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

    const expectedSpeed = getExpectedSpeed(fls, type === 'long' ? 'steady' : type);
    const update = updateFLS(fls, run, expectedDistance, expectedSpeed);
    fls = update.newFLS;
  }

  return fls;
}
