import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { migrate } from "drizzle-orm/libsql/migrator";
import { appRouter } from "@/server/routers/app";
import { getClient, getDb, saveTrainingPlan, saveWorkoutLog } from "@/server/db";
import { getDefaultTrainingPlan } from "@/lib/training-plan";
import { computeMetrics } from "@/lib/plan-utils";

async function main() {
  const directory = await mkdtemp(join(tmpdir(), "marathon-sharing-"));
  process.env.TURSO_DATABASE_URL = `file:${join(directory, "test.db")}`;
  delete process.env.TURSO_AUTH_TOKEN;
  try {
    await migrate(getDb(), { migrationsFolder: "./drizzle" });
    const userId = randomUUID();
    const plan = getDefaultTrainingPlan();
    await saveTrainingPlan(userId, plan);
    const log = await saveWorkoutLog(userId, {
      plannedSessionId: plan.weeks[0].sessions[0].id,
      date: plan.weeks[0].startsOn, type: "easy", distanceKm: 7.25,
      durationMin: 45, perceivedEffort: 3, notes: `Private key: ${userId}`,
    });
    const owner = appRouter.createCaller({ userId });
    const anonymous = appRouter.createCaller({ userId: null });
    const share = await owner.share.create();
    assert.notEqual(share.publicId, userId);
    assert.deepEqual(await owner.share.create(), share);
    const data = await anonymous.share.get({ publicId: share.publicId });
    assert.equal(data.logs.length, 1);
    assert.equal(data.logs[0].distanceKm, 7.25);
    assert.equal("userId" in data.logs[0], false);
    assert(!JSON.stringify(data).includes(userId));
    assert.deepEqual(data.metrics, computeMetrics(plan, [log]));
    await assert.rejects(anonymous.share.get({ publicId: userId }), { code: "NOT_FOUND" });
    await assert.rejects(anonymous.workout.delete({ id: log.id }), { code: "UNAUTHORIZED" });
    await assert.rejects(anonymous.workout.update({ id: log.id, date: log.date, type: log.type, distanceKm: 1, durationMin: 1, perceivedEffort: 1, notes: null }), { code: "UNAUTHORIZED" });
    await assert.rejects(anonymous.plan.save({ plan }), { code: "UNAUTHORIZED" });
    await assert.rejects(anonymous.share.create(), { code: "UNAUTHORIZED" });
    const publicKeyCaller = appRouter.createCaller({ userId: share.publicId });
    await assert.rejects(publicKeyCaller.workout.delete({ id: log.id }), { code: "NOT_FOUND" });
    console.log("Sharing checks passed: separate IDs, private-key redaction, matching metrics, unknown links rejected, private data cannot be changed using public key.");
  } finally {
    getClient().close();
    await rm(directory, { recursive: true, force: true });
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
