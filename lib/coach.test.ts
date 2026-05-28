import { describe, it, expect } from 'vitest';
import { generateRecommendation, getReadinessEstimate } from './coach';
import type { Run, AthleteProfile } from './types';

function createRun(date: Date, distance: number, effort: number, durationMinutes: number = 0): Run {
  const pace = 7; // 7 min/km default
  const duration = durationMinutes > 0 ? durationMinutes * 60 : Math.round(distance * pace * 60);
  return {
    id: 'test-id',
    userId: 'test-user',
    date,
    distance,
    durationSeconds: duration,
    perceivedEffort: effort,
  };
}

function createProfile(min: number, max: number, fls: number | null = null): AthleteProfile {
  return {
    userId: 'test-user',
    distanceUnit: 'km',
    minRunDaysPerWeek: min,
    maxRunDaysPerWeek: max,
    currentFLS: fls,
  };
}

describe('generateRecommendation', () => {
  it('first recommendation with no FLS is an easy run', () => {
    const profile = createProfile(2, 4, null);
    const runs: Run[] = [];
    const recommendation = generateRecommendation(runs, profile, null);

    expect(recommendation).not.toBeNull();
    expect(recommendation?.type).toBe('easy');
    expect(recommendation?.distance).toBeGreaterThan(3);
  });

  it('returns null if already ran today', () => {
    const today = new Date();
    const profile = createProfile(2, 4, 30);
    const runs = [createRun(today, 5, 5)];
    const recommendation = generateRecommendation(runs, profile, 30, today);

    expect(recommendation).toBeNull();
  });

  it('returns null if weekly max reached', () => {
    const profile = createProfile(2, 2, 40);
    const monday = new Date();
    monday.setDate(monday.getDate() - monday.getDay() + 1);
    monday.setHours(0, 0, 0, 0);

    const runs = [
      createRun(new Date(monday.getTime() + 24 * 60 * 60 * 1000), 5, 5),
      createRun(new Date(monday.getTime() + 48 * 60 * 60 * 1000), 10, 6),
    ];

    const recommendation = generateRecommendation(runs, profile, 40);
    expect(recommendation).toBeNull();
  });

  it('min=2/max=4, no runs this week -> easy run', () => {
    const profile = createProfile(2, 4, 35);
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    const runs = [createRun(lastWeek, 8, 5)];

    const recommendation = generateRecommendation(runs, profile, 35);
    expect(recommendation?.type).toBe('easy');
  });

  it('min=2/max=4, one easy run this week -> long run', () => {
    const profile = createProfile(2, 4, 35);
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(monday.getDate() - monday.getDay() + 1);
    monday.setHours(0, 0, 0, 0);

    const runs = [createRun(monday, 6, 4)];

    const recommendation = generateRecommendation(runs, profile, 35, today);
    expect(recommendation?.type).toBe('long');
  });

  it('min=2/max=2, easy and long done -> no recommendation', () => {
    const profile = createProfile(2, 2, 40);
    const monday = new Date();
    monday.setDate(monday.getDate() - monday.getDay() + 1);

    const runs = [
      createRun(monday, 6, 4),
      createRun(new Date(monday.getTime() + 24 * 60 * 60 * 1000), 12, 6),
    ];

    const recommendation = generateRecommendation(runs, profile, 40);
    expect(recommendation).toBeNull();
  });

  it('recommends recovery after recent hard effort', () => {
    const profile = createProfile(3, 6, 50); // Higher FLS for clearer long run threshold
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const monday = new Date(today);
    monday.setDate(monday.getDate() - monday.getDay() + 1);
    monday.setHours(0, 0, 0, 0);

    // FLS 50: comfortable ~10.5km, long target ~17km
    // min=3 met, had hard effort yesterday (9/10), long run done
    const runs = [
      createRun(monday, 8, 4), // Easy run
      createRun(new Date(monday.getTime() + 24 * 60 * 60 * 1000), 18, 5), // Long run (18 > 17*0.7)
      createRun(yesterday, 10, 9), // Hard effort yesterday
    ];

    const recommendation = generateRecommendation(runs, profile, 50, today);
    // With min met, long done, and recent hard effort -> recovery
    expect(recommendation?.type).toBe('recovery');
  });

  it('recommends steady/easy run when structure satisfied and no fatigue', () => {
    const profile = createProfile(3, 5, 50);
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(monday.getDate() - monday.getDay() + 1);

    const runs = [
      createRun(monday, 8, 4),
      createRun(new Date(monday.getTime() + 24 * 60 * 60 * 1000), 15, 6),
    ];

    const recommendation = generateRecommendation(runs, profile, 50, today);
    // With structure met and no recent hard efforts, should get a progression run
    expect(['easy', 'steady']).toContain(recommendation?.type);
  });

  it('higher FLS = longer recommended distance', () => {
    const profileLow = createProfile(2, 4, 25);
    const profileHigh = createProfile(2, 4, 60);
    const runs: Run[] = [];

    const recLow = generateRecommendation(runs, profileLow, 25);
    const recHigh = generateRecommendation(runs, profileHigh, 60);

    expect(recHigh!.distance).toBeGreaterThan(recLow!.distance);
  });
});

describe('getReadinessEstimate', () => {
  it('returns readiness levels for null FLS', () => {
    const readiness = getReadinessEstimate(null);

    expect(readiness.currentFLS).toBeNull();
    expect(readiness.levels.length).toBe(4);
  });

  it('higher FLS = fewer weeks needed', () => {
    const readinessLow = getReadinessEstimate(30);
    const readinessHigh = getReadinessEstimate(70);

    const comfortLow = readinessLow.levels.find(l => l.effort === 7)!;
    const comfortHigh = readinessHigh.levels.find(l => l.effort === 7)!;

    expect(comfortHigh.estimatedWeeks).toBeLessThan(comfortLow.estimatedWeeks);
  });

  it('high FLS shows ready now', () => {
    const readiness = getReadinessEstimate(85);

    const comfortLevel = readiness.levels.find(l => l.effort === 7)!;
    expect(comfortLevel.estimatedWeeks).toBe(0);
  });
});
