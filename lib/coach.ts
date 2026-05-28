import type { Run, AthleteProfile, Recommendation, WeeklyProgress, ReadinessEstimate } from './types';
import {
  getParametersFromFLS,
  getExpectedDistance,
  getExpectedSpeed,
  getReadinessLevels,
  calculateInitialFLS,
  updateFLS,
} from './fls';

const MAX_LONG_RUN_KM = 34;

interface TrainingContext {
  runs: Run[];
  runsThisWeek: Run[];
  todayRun: Run | null;
  lastRun: Run | null;
  recentEfforts: number[]; // last 7 effort ratings
}

function getWeekBounds(date: Date = new Date()): { start: Date; end: Date } {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(d.setDate(diff));
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function buildContext(allRuns: Run[], today: Date = new Date()): TrainingContext {
  const weekBounds = getWeekBounds(today);
  const dayMs = 24 * 60 * 60 * 1000;

  const runs = allRuns.filter(r => {
    const daysDiff = today.getTime() - r.date.getTime();
    return daysDiff <= 90 * dayMs && daysDiff >= 0; // Keep 90 days
  });

  const runsThisWeek = allRuns.filter(r =>
    r.date >= weekBounds.start && r.date <= weekBounds.end
  );

  const todayRun = allRuns.find(r => isSameDay(r.date, today)) || null;

  const sortedRuns = [...allRuns].sort((a, b) => b.date.getTime() - a.date.getTime());
  const lastRun = sortedRuns[0] ?? null;

  const recentEfforts = sortedRuns
    .filter(r => r.perceivedEffort !== null)
    .slice(0, 7)
    .map(r => r.perceivedEffort);

  return { runs, runsThisWeek, todayRun, lastRun, recentEfforts };
}

function getWeeklyProgress(
  context: TrainingContext,
  profile: AthleteProfile,
  fls: number | null
): WeeklyProgress {
  const weeklyDistance = context.runsThisWeek.reduce((s, r) => s + r.distance, 0);

  // Long run detection based on FLS-derived comfortable distance
  const longThreshold = fls === null
    ? 5 // Default before first run
    : getParametersFromFLS(fls).longRunTarget * 0.7;

  const longRunDone = context.runsThisWeek.some(r => r.distance >= longThreshold);

  return {
    runsThisWeek: context.runsThisWeek.length,
    weeklyDistance,
    longRunDone,
    minRequired: profile.minRunDaysPerWeek,
    maxAllowed: profile.maxRunDaysPerWeek,
  };
}

function getEffortStats(recentEfforts: number[]): {
  avg: number;
  max: number;
  count8plus: number;
  count9plus: number;
} {
  if (recentEfforts.length === 0) {
    return { avg: 0, max: 0, count8plus: 0, count9plus: 0 };
  }
  return {
    avg: recentEfforts.reduce((a, b) => a + b, 0) / recentEfforts.length,
    max: Math.max(...recentEfforts),
    count8plus: recentEfforts.filter(e => e >= 8).length,
    count9plus: recentEfforts.filter(e => e >= 9).length,
  };
}

function getEffortMultiplier(stats: ReturnType<typeof getEffortStats>): number {
  // Sustained very high effort
  if (stats.count9plus >= 3) return 0.6;
  if (stats.count8plus >= 4) return 0.7;
  if (stats.avg >= 8) return 0.75;
  if (stats.max >= 10) return 0.8;
  if (stats.max >= 9) return 0.85;
  if (stats.max >= 8) return 0.9;
  if (stats.avg >= 7) return 0.95;
  return 1.0;
}

function needsRecovery(context: TrainingContext): boolean {
  if (!context.lastRun) return false;

  const stats = getEffortStats(context.recentEfforts);
  const hoursSinceLastRun = (new Date().getTime() - context.lastRun.date.getTime()) / (1000 * 60 * 60);

  // Sustained high effort patterns
  if (stats.count9plus >= 3) return true;
  if (stats.count8plus >= 4) return true;
  if (stats.avg >= 8) return true;

  // Recent hard single effort
  const lastEffort = context.recentEfforts[0] ?? 0;
  if (lastEffort >= 9 && hoursSinceLastRun <= 48) return true;

  // Two hard runs close together
  const hardRuns = context.runs
    .filter(r => r.perceivedEffort >= 8)
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 2);
  if (hardRuns.length >= 2) {
    const diff = hardRuns[0].date.getTime() - hardRuns[1].date.getTime();
    if (diff < 3 * 24 * 60 * 60 * 1000) return true;
  }

  return false;
}

// Calculate FLS update after logging a run
export function calculateFLSAfterRun(
  currentFLS: number | null,
  run: Run,
  previousRuns: Run[]
): { newFLS: number; calculation: ReturnType<typeof updateFLS> | null } {
  if (currentFLS === null) {
    // First run - calculate initial FLS
    const fls = calculateInitialFLS(run.distance, run.durationSeconds, run.perceivedEffort);
    return { newFLS: fls, calculation: null };
  }

  // Get expected values based on current FLS
  const { comfortableDistance } = getParametersFromFLS(currentFLS);

  // Determine run type based on distance ratio
  const distanceRatio = run.distance / comfortableDistance;
  let type: 'easy' | 'steady' | 'moderate' | 'recovery' | 'long';
  let expectedDistance: number;

  if (distanceRatio < 0.5) {
    type = 'recovery';
    expectedDistance = comfortableDistance * 0.4;
  } else if (distanceRatio > 1.3) {
    type = 'long';
    expectedDistance = getParametersFromFLS(currentFLS).longRunTarget;
  } else if (distanceRatio < 0.8) {
    type = 'easy';
    expectedDistance = comfortableDistance * 0.7;
  } else {
    type = 'steady';
    expectedDistance = comfortableDistance;
  }

  const expectedSpeed = getExpectedSpeed(currentFLS, type === 'long' ? 'steady' : type);
  const calculation = updateFLS(currentFLS, run, expectedDistance, expectedSpeed);

  return { newFLS: calculation.newFLS, calculation };
}

// Generate workout recommendation
export function generateRecommendation(
  allRuns: Run[],
  profile: AthleteProfile,
  currentFLS: number | null,
  today: Date = new Date()
): Recommendation | null {
  const context = buildContext(allRuns, today);
  const progress = getWeeklyProgress(context, profile, currentFLS);
  const effortStats = getEffortStats(context.recentEfforts);
  const effortMultiplier = getEffortMultiplier(effortStats);

  // Already ran today
  if (context.todayRun) return null;

  // Max weekly runs reached
  if (progress.runsThisWeek >= profile.maxRunDaysPerWeek) return null;

  // Determine FLS-based parameters
  const fls = currentFLS ?? 15; // Use low default if no FLS yet
  const { comfortableDistance, longRunTarget, baseSpeedKmh } = getParametersFromFLS(fls);

  // Extreme fatigue check
  const extremeFatigue = effortStats.count9plus >= 3 || effortStats.avg >= 9;
  const highFatigue = effortStats.count8plus >= 4 || effortStats.avg >= 8;

  if (extremeFatigue) {
    // Force rest if structure complete or 3+ runs
    if ((progress.longRunDone && progress.runsThisWeek >= 2) || progress.runsThisWeek >= 3) {
      return null;
    }
    // Minimal run to complete structure if needed
    const distance = Math.max(3, comfortableDistance * 0.4 * effortMultiplier);
    const speed = baseSpeedKmh * 0.9; // Recovery speed
    return {
      type: 'recovery',
      distance: Math.round(distance * 10) / 10,
      targetSpeedKmh: Math.round(speed * 10) / 10,
      targetDurationSeconds: Math.round((distance / speed) * 3600),
      description: 'Very easy recovery. You have been pushing hard—take it slow.',
      reason: 'Fatigue management: restart after overreaching',
    };
  }

  // Weekly structure: prioritize min runs requirement
  if (progress.runsThisWeek < profile.minRunDaysPerWeek) {
    // First run of the week
    if (progress.runsThisWeek === 0) {
      const distance = getExpectedDistance(fls, 'easy', effortMultiplier);
      const speed = getExpectedSpeed(fls, 'easy');
      return {
        type: 'easy',
        distance,
        targetSpeedKmh: Math.round(speed * 10) / 10,
        targetDurationSeconds: Math.round((distance / speed) * 3600),
        description: 'Easy conversational pace. Establish your weekly rhythm.',
        reason: 'Weekly easy run',
      };
    }

    // Second run: long if not done yet
    if (!progress.longRunDone && progress.runsThisWeek === 1) {
      const distance = Math.min(MAX_LONG_RUN_KM, longRunTarget * effortMultiplier);
      const speed = getExpectedSpeed(fls, 'steady');
      return {
        type: 'long',
        distance: Math.round(distance * 10) / 10,
        targetSpeedKmh: Math.round(speed * 10) / 10,
        targetDurationSeconds: Math.round((distance / speed) * 3600),
        description: 'Weekly long run. Start easy, settle into a steady rhythm.',
        reason: 'Weekly long run',
      };
    }

    // Additional runs to meet minimum
    const distance = getExpectedDistance(fls, 'easy', effortMultiplier);
    const speed = getExpectedSpeed(fls, 'easy');
    return {
      type: 'easy',
      distance,
      targetSpeedKmh: Math.round(speed * 10) / 10,
      targetDurationSeconds: Math.round((distance / speed) * 3600),
      description: 'Easy run to build weekly consistency.',
      reason: 'Complete weekly minimum',
    };
  }

  // Recovery check: if structure complete and recent hard effort
  const shouldRecover = progress.longRunDone && needsRecovery(context);
  const minMetWithFatigue = progress.runsThisWeek >= profile.minRunDaysPerWeek && highFatigue;

  if (shouldRecover || minMetWithFatigue) {
    const distance = getExpectedDistance(fls, 'recovery', effortMultiplier);
    const speed = getExpectedSpeed(fls, 'recovery');
    return {
      type: 'recovery',
      distance,
      targetSpeedKmh: Math.round(speed * 10) / 10,
      targetDurationSeconds: Math.round((distance / speed) * 3600),
      description: 'Active recovery. Focus on relaxation and easy breathing.',
      reason: 'Recovery after hard efforts',
    };
  }

  // Progression run: add volume
  const type: 'easy' | 'steady' = effortStats.avg <= 5 ? 'steady' : 'easy';
  const distance = getExpectedDistance(fls, type, effortMultiplier);
  const speed = getExpectedSpeed(fls, type);
  return {
    type,
    distance,
    targetSpeedKmh: Math.round(speed * 10) / 10,
    targetDurationSeconds: Math.round((distance / speed) * 3600),
    description: type === 'steady'
      ? 'Steady controlled effort. Build aerobic capacity.'
      : 'Comfortable easy run. Maintain consistency.',
    reason: 'Progress within weekly structure',
  };
}

// Re-export for convenience
export { getReadinessLevels };

// Get marathon readiness estimate - convenience wrapper
export function getReadinessEstimate(currentFLS: number | null): ReadinessEstimate {
  return {
    currentFLS,
    levels: getReadinessLevels(currentFLS),
  };
}
