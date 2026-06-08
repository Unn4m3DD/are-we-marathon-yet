import { createClient, type Client } from "@libsql/client";
import { randomUUID } from "crypto";
import { and, desc, eq } from "drizzle-orm";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { getDefaultTrainingPlan } from "@/lib/training-plan";
import {
  type EditWorkoutLogInput,
  type LogWorkoutInput,
  type TrainingPlan,
  type WorkoutLog,
  trainingPlanSchema,
  workoutLogSchema,
} from "@/lib/training-schema";
import { trainingPlans, workoutLogs } from "@/server/schema";

type DbGlobal = typeof globalThis & {
  marathonDbClient?: Client;
  marathonDrizzleDb?: LibSQLDatabase;
};

const globalForDb = globalThis as DbGlobal;

function createDbClient() {
  const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || "file:local.db";
  const authToken = process.env.TURSO_AUTH_TOKEN;

  return createClient({
    url,
    authToken,
  });
}

export function getClient() {
  if (!globalForDb.marathonDbClient) {
    globalForDb.marathonDbClient = createDbClient();
  }

  return globalForDb.marathonDbClient;
}

function getDrizzleClient() {
  if (!globalForDb.marathonDrizzleDb) {
    globalForDb.marathonDrizzleDb = drizzle(getClient());
  }

  return globalForDb.marathonDrizzleDb;
}

export function getDb() {
  return getDrizzleClient();
}

function nowIso() {
  return new Date().toISOString();
}

function parsePlanJson(planJson: unknown): TrainingPlan {
  return trainingPlanSchema.parse(JSON.parse(String(planJson)));
}

export async function getExistingTrainingPlan(userId: string) {
  const db = getDb();
  const existing = await db
    .select({ planJson: trainingPlans.planJson })
    .from(trainingPlans)
    .where(eq(trainingPlans.userId, userId))
    .limit(1);

  if (existing[0]?.planJson) {
    try {
      return parsePlanJson(existing[0].planJson);
    } catch {
      const replacementPlan = getDefaultTrainingPlan();
      await saveTrainingPlan(userId, replacementPlan);
      return replacementPlan;
    }
  }

  return null;
}

export async function getTrainingPlan(userId: string) {
  const existingPlan = await getExistingTrainingPlan(userId);

  if (existingPlan) {
    return existingPlan;
  }

  const plan = getDefaultTrainingPlan();
  await saveTrainingPlan(userId, plan);
  return plan;
}

export async function saveDefaultTrainingPlan(userId: string) {
  return saveTrainingPlan(userId, getDefaultTrainingPlan());
}

export async function saveTrainingPlan(userId: string, plan: TrainingPlan) {
  const db = getDb();
  const parsedPlan = trainingPlanSchema.parse(plan);
  const timestamp = nowIso();
  const planJson = JSON.stringify(parsedPlan);

  await db
    .insert(trainingPlans)
    .values({
      userId,
      planJson,
      raceDate: parsedPlan.race.date,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .onConflictDoUpdate({
      target: trainingPlans.userId,
      set: {
        planJson,
        raceDate: parsedPlan.race.date,
        updatedAt: timestamp,
      },
    });

  return parsedPlan;
}

function parseNullableNumber(value: unknown) {
  if (value == null) {
    return null;
  }

  return Number(value);
}

function normalizeWorkoutType(value: unknown) {
  const type = String(value);
  const legacyTypes: Record<string, string> = {
    recovery: "easy",
    long: "easy",
    race: "easy",
    tempo: "threshold",
    intervals: "interval",
    marathonPace: "threshold",
    "marathon-pace": "threshold",
    hills: "repetition",
  };

  return legacyTypes[type] ?? type;
}

type WorkoutLogRow = typeof workoutLogs.$inferSelect;

function rowToWorkoutLog(row: WorkoutLogRow): WorkoutLog {
  return workoutLogSchema.parse({
    id: row.id,
    userId: row.userId,
    plannedSessionId: row.plannedSessionId ?? null,
    date: row.date,
    type: normalizeWorkoutType(row.type),
    distanceKm: parseNullableNumber(row.distanceKm),
    durationMin: parseNullableNumber(row.durationMin),
    perceivedEffort: parseNullableNumber(row.perceivedEffort),
    notes: row.notes ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

export async function listWorkoutLogs(userId: string) {
  const db = getDb();
  const result = await db
    .select()
    .from(workoutLogs)
    .where(eq(workoutLogs.userId, userId))
    .orderBy(desc(workoutLogs.date), desc(workoutLogs.createdAt));

  return result.map(rowToWorkoutLog);
}

export async function saveWorkoutLog(userId: string, input: LogWorkoutInput) {
  const db = getDb();
  const timestamp = nowIso();
  const existing =
    input.plannedSessionId == null
      ? null
      : await db
          .select({ id: workoutLogs.id, createdAt: workoutLogs.createdAt })
          .from(workoutLogs)
          .where(
            and(
              eq(workoutLogs.userId, userId),
              eq(workoutLogs.plannedSessionId, input.plannedSessionId),
            ),
          )
          .limit(1);
  const existingRow = existing?.[0];
  const id = existingRow?.id ?? randomUUID();
  const createdAt = existingRow?.createdAt ?? timestamp;

  if (existingRow) {
    await db
      .update(workoutLogs)
      .set({
        date: input.date,
        type: input.type,
        distanceKm: input.distanceKm,
        durationMin: input.durationMin,
        perceivedEffort: input.perceivedEffort,
        notes: input.notes,
        updatedAt: timestamp,
      })
      .where(and(eq(workoutLogs.id, id), eq(workoutLogs.userId, userId)));
  } else {
    await db.insert(workoutLogs).values({
      id,
      userId,
      plannedSessionId: input.plannedSessionId,
      date: input.date,
      type: input.type,
      distanceKm: input.distanceKm,
      durationMin: input.durationMin,
      perceivedEffort: input.perceivedEffort,
      notes: input.notes,
      createdAt,
      updatedAt: timestamp,
    });
  }

  const result = await db
    .select()
    .from(workoutLogs)
    .where(and(eq(workoutLogs.id, id), eq(workoutLogs.userId, userId)))
    .limit(1);

  return rowToWorkoutLog(result[0]);
}

export async function updateWorkoutLog(userId: string, input: EditWorkoutLogInput) {
  const db = getDb();
  const timestamp = nowIso();

  await db
    .update(workoutLogs)
    .set({
      date: input.date,
      type: input.type,
      distanceKm: input.distanceKm,
      durationMin: input.durationMin,
      perceivedEffort: input.perceivedEffort,
      notes: input.notes,
      updatedAt: timestamp,
    })
    .where(and(eq(workoutLogs.id, input.id), eq(workoutLogs.userId, userId)));

  const result = await db
    .select()
    .from(workoutLogs)
    .where(and(eq(workoutLogs.id, input.id), eq(workoutLogs.userId, userId)))
    .limit(1);

  const row = result[0];

  return row ? rowToWorkoutLog(row) : null;
}

export async function deleteWorkoutLog(userId: string, id: string) {
  const db = getDb();

  const result = await db
    .delete(workoutLogs)
    .where(and(eq(workoutLogs.id, id), eq(workoutLogs.userId, userId)))
    .returning({ id: workoutLogs.id });

  return result.length > 0;
}
