import { describe, it, expect } from 'vitest';
import {
  calculateInitialFLS,
  updateFLS,
  getParametersFromFLS,
  getExpectedPace,
  getExpectedDistance,
  recalculateFLSFromHistory,
  calculateMarathonWeeks,
} from './fls';
import type { Run } from './types';

function createRun(
  date: Date,
  distance: number,
  durationMinutes: number,
  effort: number
): Run {
  return {
    id: 'test-id',
    userId: 'test-user',
    date,
    distance,
    durationSeconds: durationMinutes * 60,
    perceivedEffort: effort,
  };
}

describe('calculateInitialFLS', () => {
  it('calculates FLS from first run data', () => {
    // 5km in 30 min (6:00/km) with effort 5
    const fls = calculateInitialFLS(5, 30 * 60, 5);

    // Should be roughly: 25 * 1.0 * (7/6) * (6/8) ≈ 22
    expect(fls).toBeGreaterThan(15);
    expect(fls).toBeLessThan(35);
  });

  it('faster pace = higher FLS', () => {
    const flsSlow = calculateInitialFLS(5, 35 * 60, 5); // 7:00/km
    const flsFast = calculateInitialFLS(5, 25 * 60, 5); // 5:00/km

    expect(flsFast).toBeGreaterThan(flsSlow);
  });

  it('lower effort = higher FLS', () => {
    const flsHard = calculateInitialFLS(5, 30 * 60, 8);
    const flsEasy = calculateInitialFLS(5, 30 * 60, 3);

    expect(flsEasy).toBeGreaterThan(flsHard);
  });

  it('longer distance at same pace/effort = higher FLS', () => {
    const flsShort = calculateInitialFLS(3, 18 * 60, 5); // 3km at 6:00
    const flsLong = calculateInitialFLS(10, 60 * 60, 5); // 10km at 6:00

    expect(flsLong).toBeGreaterThan(flsShort);
  });
});

describe('updateFLS', () => {
  it('exceeding targets increases FLS', () => {
    const currentFLS = 30;
    // Run significantly exceeds expectations: 10km instead of 6km, at 5:00/km pace
    // with low effort (4/10) - this should boost FLS
    const run = createRun(new Date(), 10, 50, 4); // 10km at 5:00/km

    // Expected for FLS 30: ~7.5km comfortable
    const expectedDistance = 7.5;
    const expectedPace = 7 * 60 - 30 * 1.8; // ~366s (6:06/km)

    const result = updateFLS(currentFLS, run, expectedDistance, expectedPace);

    // Exceeded distance target (10 > 7.5), faster pace (300s < 366s), easy effort -> positive delta
    expect(result.newFLS).toBeGreaterThan(currentFLS);
  });

  it('underperforming decreases FLS', () => {
    const currentFLS = 40;
    const run = createRun(new Date(), 5, 50, 9); // Slower than expected, hard effort

    const expectedDistance = 8; // Expected more
    const expectedPace = 6 * 60; // Expected faster

    const result = updateFLS(currentFLS, run, expectedDistance, expectedPace);

    // Underperformed on distance and pace, high effort -> negative delta
    expect(result.newFLS).toBeLessThan(currentFLS);
  });

  it('meeting targets with moderate effort maintains FLS', () => {
    const currentFLS = 35;
    // Create a run that exactly matches expected values
    const expectedDistance = 3 + 35 * 0.15; // ~8.25km
    const expectedPace = 420 - 35 * 1.8; // ~357s (5:57/km)

    const run = createRun(new Date(), expectedDistance, expectedDistance * expectedPace / 60, 5);

    const result = updateFLS(currentFLS, run, expectedDistance, expectedPace);

    // Should be close to current (small change due to effort factor)
    expect(Math.abs(result.newFLS - currentFLS)).toBeLessThan(2);
  });

  it('easy effort allows larger FLS increase', () => {
    const currentFLS = 30;
    const runEasy = createRun(new Date(), 10, 50, 3); // Easy effort
    const runHard = createRun(new Date(), 10, 50, 8); // Same performance, hard effort

    const expectedDistance = 7;
    const expectedPace = 380;

    const resultEasy = updateFLS(currentFLS, runEasy, expectedDistance, expectedPace);
    const resultHard = updateFLS(currentFLS, runHard, expectedDistance, expectedPace);

    // Easy effort should have higher learning rate
    expect(resultEasy.learningRate).toBeGreaterThan(resultHard.learningRate);
  });
});

describe('getParametersFromFLS', () => {
  it('higher FLS = faster base pace', () => {
    const paramsLow = getParametersFromFLS(20);
    const paramsHigh = getParametersFromFLS(70);

    expect(paramsHigh.basePaceSeconds).toBeLessThan(paramsLow.basePaceSeconds);
  });

  it('higher FLS = longer comfortable distance', () => {
    const paramsLow = getParametersFromFLS(20);
    const paramsHigh = getParametersFromFLS(70);

    expect(paramsHigh.comfortableDistance).toBeGreaterThan(paramsLow.comfortableDistance);
  });

  it('long run target scales with FLS', () => {
    const paramsLow = getParametersFromFLS(20);
    const paramsHigh = getParametersFromFLS(80);

    expect(paramsHigh.longRunTarget).toBeGreaterThan(paramsLow.longRunTarget);
  });

  it('long run capped at 34km', () => {
    const params = getParametersFromFLS(95);

    expect(params.longRunTarget).toBe(34);
  });
});

describe('getExpectedPace', () => {
  it('recovery pace is slower than easy', () => {
    const recovery = getExpectedPace(40, 'recovery');
    const easy = getExpectedPace(40, 'easy');

    expect(recovery).toBeGreaterThan(easy);
  });

  it('steady pace is faster than easy', () => {
    const easy = getExpectedPace(40, 'easy');
    const steady = getExpectedPace(40, 'steady');

    expect(steady).toBeLessThan(easy);
  });

  it('moderate pace is faster than steady', () => {
    const steady = getExpectedPace(40, 'steady');
    const moderate = getExpectedPace(40, 'moderate');

    expect(moderate).toBeLessThan(steady);
  });
});

describe('getExpectedDistance', () => {
  it('recovery distance is shorter than easy', () => {
    const recovery = getExpectedDistance(40, 'recovery');
    const easy = getExpectedDistance(40, 'easy');

    expect(recovery).toBeLessThan(easy);
  });

  it('long distance is longer than easy', () => {
    const easy = getExpectedDistance(40, 'easy');
    const long_ = getExpectedDistance(40, 'long');

    expect(long_).toBeGreaterThan(easy);
  });

  it('effort multiplier reduces distance', () => {
    const normal = getExpectedDistance(40, 'easy', 1.0);
    const reduced = getExpectedDistance(40, 'easy', 0.7);

    expect(reduced).toBeLessThan(normal);
  });
});

describe('recalculateFLSFromHistory', () => {
  it('returns null for empty history', () => {
    const fls = recalculateFLSFromHistory([]);
    expect(fls).toBeNull();
  });

  it('recalculates FLS from single run', () => {
    const runs = [createRun(new Date(), 5, 30, 5)];
    const fls = recalculateFLSFromHistory(runs);

    expect(fls).toBeGreaterThan(0);
    expect(fls).toBeLessThan(50);
  });

  it('positive progression increases FLS', () => {
    const today = new Date();
    const runs = [
      createRun(new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000), 5, 30, 5),
      createRun(new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000), 6, 36, 4),
      createRun(new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000), 7, 42, 4),
      createRun(today, 8, 48, 3),
    ];

    const fls = recalculateFLSFromHistory(runs);
    expect(fls).toBeGreaterThan(20);
  });
});

describe('calculateMarathonWeeks', () => {
  it('low FLS = many weeks', () => {
    const weeks = calculateMarathonWeeks(20);
    expect(weeks).toBeGreaterThan(10);
  });

  it('high FLS = few weeks', () => {
    const weeks = calculateMarathonWeeks(80);
    expect(weeks).toBeLessThanOrEqual(4);
  });

  it('FLS 70+ is nearly ready', () => {
    const weeks = calculateMarathonWeeks(75);
    expect(weeks).toBeLessThanOrEqual(6);
  });
});
