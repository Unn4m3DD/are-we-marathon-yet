'use server';

import { db } from '@/db';
import { users, athleteProfiles, runs } from '@/db/schema';
import { eq, and, gte, lte, desc, lt } from 'drizzle-orm';
import type { Run, AthleteProfile } from '@/lib/types';
import { calculateFLSAfterRun } from '@/lib/coach';
import { recalculateFLSFromHistory } from '@/lib/fls';

function getWeekBounds(date: Date = new Date()) {
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

export async function getUserProfile(userId: string): Promise<AthleteProfile | null> {
  const profile = await db.query.athleteProfiles.findFirst({
    where: eq(athleteProfiles.userId, userId),
  });

  if (!profile) return null;

  return {
    userId: profile.userId,
    distanceUnit: profile.distanceUnit as 'km' | 'mi',
    minRunDaysPerWeek: profile.minRunDaysPerWeek,
    maxRunDaysPerWeek: profile.maxRunDaysPerWeek,
    currentFLS: profile.currentFLS ?? null,
  };
}

export async function getRuns(userId: string): Promise<Run[]> {
  const logs = await db.query.runs.findMany({
    where: eq(runs.userId, userId),
    orderBy: desc(runs.date),
  });

  return logs.map(log => ({
    id: log.id,
    userId: log.userId,
    date: new Date(log.date),
    distance: log.distance,
    durationSeconds: log.durationSeconds,
    perceivedEffort: log.perceivedEffort,
    flsAfterRun: log.flsAfterRun ?? undefined,
  }));
}

export async function getWeeklyRuns(userId: string): Promise<Run[]> {
  const { start, end } = getWeekBounds();

  const logs = await db.query.runs.findMany({
    where: and(
      eq(runs.userId, userId),
      gte(runs.date, start),
      lte(runs.date, end)
    ),
    orderBy: desc(runs.date),
  });

  return logs.map(log => ({
    id: log.id,
    userId: log.userId,
    date: new Date(log.date),
    distance: log.distance,
    durationSeconds: log.durationSeconds,
    perceivedEffort: log.perceivedEffort,
    flsAfterRun: log.flsAfterRun ?? undefined,
  }));
}

export async function hasRunToday(userId: string): Promise<boolean> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const log = await db.query.runs.findFirst({
    where: and(
      eq(runs.userId, userId),
      gte(runs.date, today),
      lt(runs.date, tomorrow)
    ),
  });

  return !!log;
}

export async function logRun(
  userId: string,
  data: {
    distance: number;
    durationSeconds: number;
    perceivedEffort: number;
    date: Date;
  }
): Promise<{ runId: string; newFLS: number }> {
  const runId = crypto.randomUUID();

  // Get current FLS
  const profile = await getUserProfile(userId);
  const currentFLS = profile?.currentFLS ?? null;

  // Get all runs for FLS calculation
  const allRuns = await getRuns(userId);

  // Create the run object
  const newRun: Run = {
    id: runId,
    userId,
    date: data.date,
    distance: data.distance,
    durationSeconds: data.durationSeconds,
    perceivedEffort: data.perceivedEffort,
  };

  // Calculate new FLS
  const { newFLS } = calculateFLSAfterRun(currentFLS, newRun, allRuns);

  // Insert run with FLS
  await db.insert(runs).values({
    id: runId,
    userId,
    date: data.date,
    distance: data.distance,
    durationSeconds: data.durationSeconds,
    perceivedEffort: data.perceivedEffort,
    flsAfterRun: newFLS,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Update profile with new FLS
  await db.update(athleteProfiles)
    .set({ currentFLS: newFLS, updatedAt: new Date() })
    .where(eq(athleteProfiles.userId, userId));

  return { runId, newFLS };
}

export async function deleteRun(userId: string, runId: string): Promise<void> {
  await db.delete(runs)
    .where(and(eq(runs.id, runId), eq(runs.userId, userId)));

  // Recalculate FLS from remaining runs
  const remainingRuns = await getRuns(userId);
  const recalculatedFLS = recalculateFLSFromHistory(remainingRuns);

  // Update profile
  await db.update(athleteProfiles)
    .set({
      currentFLS: recalculatedFLS,
      updatedAt: new Date(),
    })
    .where(eq(athleteProfiles.userId, userId));
}

export async function updateProfile(
  userId: string,
  data: {
    minRunDaysPerWeek: number;
    maxRunDaysPerWeek: number;
    distanceUnit: 'km' | 'mi';
  }
): Promise<void> {
  await db.update(athleteProfiles)
    .set({
      minRunDaysPerWeek: data.minRunDaysPerWeek,
      maxRunDaysPerWeek: data.maxRunDaysPerWeek,
      distanceUnit: data.distanceUnit,
      updatedAt: new Date(),
    })
    .where(eq(athleteProfiles.userId, userId));
}

