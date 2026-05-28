import { describe, it, expect } from 'vitest';
import {
  calculateInitialFLS,
  updateFLS,
  getParametersFromFLS,
  getExpectedSpeed,
  getExpectedDistance,
  recalculateFLSFromHistory,
  calculateMarathonWeeks,
  speedToPace,
  paceToSpeed,
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
    // 5km in 30 min (10 km/h) with effort 5
    const fls = calculateInitialFLS(5, 30 * 60, 5);

    expect(fls).toBeGreaterThan(15);
    expect(fls).toBeLessThan(35);
  });

  it('faster speed = higher FLS', () => {
    const flsSlow = calculateInitialFLS(5, 35 * 60, 5); // ~8.6 km/h
    const flsFast = calculateInitialFLS(5, 25 * 60, 5); // 12 km/h

    expect(flsFast).toBeGreaterThan(flsSlow);
  });

  it('lower effort = higher FLS', () => {
    const flsHard = calculateInitialFLS(5, 30 * 60, 8);
    const flsEasy = calculateInitialFLS(5, 30 * 60, 3);

    expect(flsEasy).toBeGreaterThan(flsHard);
  });

  it('longer distance at same speed/effort = higher FLS', () => {
    const flsShort = calculateInitialFLS(3, 18 * 60, 5); // 3km at 10 km/h
    const flsLong = calculateInitialFLS(10, 60 * 60, 5); // 10km at 10 km/h

    expect(flsLong).toBeGreaterThan(flsShort);
  });
});

describe('updateFLS', () => {
  it('exceeding targets increases FLS', () => {
    const currentFLS = 30;
    // Run significantly exceeds expectations: 10km instead of 6km, at 12 km/h
    // with low effort (4/10) - this should boost FLS
    const run = createRun(new Date(), 10, 50, 4); // 10km at 12 km/h

    // Expected for FLS 30: ~7.5km comfortable, ~10.45 km/h speed
    const expectedDistance = 7.5;
    const expectedSpeed = 8.5 + 30 * 0.065; // ~10.45 km/h

    const result = updateFLS(currentFLS, run, expectedDistance, expectedSpeed);

    // Exceeded distance target (10 > 7.5), faster speed (12 > 10.45), easy effort -> positive delta
    expect(result.newFLS).toBeGreaterThan(currentFLS);
  });

  it('underperforming decreases FLS', () => {
    const currentFLS = 40;
    const run = createRun(new Date(), 5, 50, 9); // 6 km/h - slower than expected

    const expectedDistance = 8; // Expected more
    const expectedSpeed = 8.5 + 40 * 0.065; // ~11.1 km/h

    const result = updateFLS(currentFLS, run, expectedDistance, expectedSpeed);

    // Underperformed on distance and speed, high effort -> negative delta
    expect(result.newFLS).toBeLessThan(currentFLS);
  });

  it('meeting targets with moderate effort maintains FLS', () => {
    const currentFLS = 35;
    // Expected values for FLS 35
    const expectedDistance = 3 + 35 * 0.15; // ~8.25km
    const expectedSpeed = 8.5 + 35 * 0.065; // ~10.775 km/h
    const expectedDurationMinutes = expectedDistance / expectedSpeed * 60;

    const run = createRun(new Date(), expectedDistance, expectedDurationMinutes, 5);

    const result = updateFLS(currentFLS, run, expectedDistance, expectedSpeed);

    // Should be close to current (small change due to effort factor)
    expect(Math.abs(result.newFLS - currentFLS)).toBeLessThan(2);
  });

  it('easy effort allows larger FLS increase', () => {
    const currentFLS = 30;
    const runEasy = createRun(new Date(), 10, 50, 3); // Easy effort
    const runHard = createRun(new Date(), 10, 50, 8); // Same performance, hard effort

    const expectedDistance = 7;
    const expectedSpeed = 8.5 + 30 * 0.065; // ~10.45 km/h

    const resultEasy = updateFLS(currentFLS, runEasy, expectedDistance, expectedSpeed);
    const resultHard = updateFLS(currentFLS, runHard, expectedDistance, expectedSpeed);

    // Easy effort should have higher learning rate
    expect(resultEasy.learningRate).toBeGreaterThan(resultHard.learningRate);
  });
});

describe('getParametersFromFLS', () => {
  it('higher FLS = faster base speed', () => {
    const paramsLow = getParametersFromFLS(20);
    const paramsHigh = getParametersFromFLS(70);

    expect(paramsHigh.baseSpeedKmh).toBeGreaterThan(paramsLow.baseSpeedKmh);
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

describe('getExpectedSpeed', () => {
  it('recovery speed is slower than easy', () => {
    const recovery = getExpectedSpeed(40, 'recovery');
    const easy = getExpectedSpeed(40, 'easy');

    expect(recovery).toBeLessThan(easy);
  });

  it('steady speed is faster than easy', () => {
    const easy = getExpectedSpeed(40, 'easy');
    const steady = getExpectedSpeed(40, 'steady');

    expect(steady).toBeGreaterThan(easy);
  });

  it('moderate speed is faster than steady', () => {
    const steady = getExpectedSpeed(40, 'steady');
    const moderate = getExpectedSpeed(40, 'moderate');

    expect(moderate).toBeGreaterThan(steady);
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

describe('speedToPace and paceToSpeed', () => {
  it('converts speed to pace correctly', () => {
    // 10 km/h = 6:00/km = 360 seconds
    expect(speedToPace(10)).toBe(360);
    // 12 km/h = 5:00/km = 300 seconds
    expect(speedToPace(12)).toBe(300);
  });

  it('converts pace to speed correctly', () => {
    // 6:00/km = 360 seconds = 10 km/h
    expect(paceToSpeed(360)).toBe(10);
    // 5:00/km = 300 seconds = 12 km/h
    expect(paceToSpeed(300)).toBe(12);
  });

  it('round-trip conversion is accurate', () => {
    const originalSpeed = 11.5;
    const pace = speedToPace(originalSpeed);
    const convertedSpeed = paceToSpeed(pace);
    expect(convertedSpeed).toBeCloseTo(originalSpeed, 1);
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
