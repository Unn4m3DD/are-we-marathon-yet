import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { computeMetrics, findCurrentWeek, findNextSession, raceCountdown, weekSessionsLeft } from "@/lib/plan-utils";
import { editWorkoutLogInputSchema, logWorkoutInputSchema, trainingPlanSchema } from "@/lib/training-schema";
import {
  deleteWorkoutLog,
  getExistingTrainingPlan,
  listWorkoutLogs,
  saveDefaultTrainingPlan,
  saveTrainingPlan,
  saveWorkoutLog,
  updateWorkoutLog,
} from "@/server/db";
import { protectedProcedure, router } from "@/server/trpc";

export const appRouter = router({
  plan: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return getExistingTrainingPlan(ctx.userId);
    }),
    useDefault: protectedProcedure.mutation(async ({ ctx }) => {
      return saveDefaultTrainingPlan(ctx.userId);
    }),
    save: protectedProcedure
      .input(
        z.object({
          plan: trainingPlanSchema,
        }),
      )
      .mutation(async ({ ctx, input }) => {
        return saveTrainingPlan(ctx.userId, input.plan);
    }),
  }),
  workout: router({
    logs: protectedProcedure.query(async ({ ctx }) => {
      return listWorkoutLogs(ctx.userId);
    }),
    create: protectedProcedure.input(logWorkoutInputSchema).mutation(async ({ ctx, input }) => {
      return saveWorkoutLog(ctx.userId, input);
    }),
    update: protectedProcedure.input(editWorkoutLogInputSchema).mutation(async ({ ctx, input }) => {
      const updated = await updateWorkoutLog(ctx.userId, input);

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workout log not found.",
        });
      }

      return updated;
    }),
    delete: protectedProcedure
      .input(
        z.object({
          id: z.string().min(1),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const deleted = await deleteWorkoutLog(ctx.userId, input.id);

        if (!deleted) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Workout log not found.",
          });
        }

        return { success: true };
      }),
  }),
  dashboard: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const plan = await getExistingTrainingPlan(ctx.userId);
      const logs = await listWorkoutLogs(ctx.userId);

      if (!plan) {
        return {
          plan,
          logs,
          currentWeek: null,
          workoutsLeft: [],
          nextSession: null,
          countdownDays: null,
          metrics: null,
        };
      }

      const currentWeek = findCurrentWeek(plan);

      return {
        plan,
        logs,
        currentWeek,
        workoutsLeft: weekSessionsLeft(plan, logs),
        nextSession: findNextSession(plan, logs),
        countdownDays: raceCountdown(plan),
        metrics: computeMetrics(plan, logs),
      };
    }),
  }),
  metrics: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const plan = await getExistingTrainingPlan(ctx.userId);
      const logs = await listWorkoutLogs(ctx.userId);

      if (!plan) {
        return {
          plan,
          logs,
          metrics: null,
        };
      }

      return {
        plan,
        logs,
        metrics: computeMetrics(plan, logs),
      };
    }),
  }),
});

export type AppRouter = typeof appRouter;
