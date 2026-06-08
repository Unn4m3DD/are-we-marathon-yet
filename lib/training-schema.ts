import { z } from "zod";
import { ISO_DATE_PATTERN } from "@/lib/dates";

export const uuidV4Schema = z
  .string()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    "Enter a valid UUIDv4.",
  )
  .transform((value) => value.toLowerCase());

export const isoDateSchema = z
  .string()
  .regex(ISO_DATE_PATTERN, "Use a YYYY-MM-DD date.");

export const workoutTypeSchema = z.enum([
  "easy",
  "threshold",
  "interval",
  "repetition",
]);

export type WorkoutType = z.infer<typeof workoutTypeSchema>;

export const workoutTypeLabels: Record<WorkoutType, string> = {
  easy: "Easy",
  threshold: "Threshold",
  interval: "Interval",
  repetition: "Repetition",
};

export const dayOfWeekSchema = z.enum(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);

export const trainingSessionSchema = z
  .object({
    id: z.string().min(1),
    day: dayOfWeekSchema,
    type: workoutTypeSchema,
    optional: z.boolean(),
    distanceKm: z.number().positive().optional(),
    targetRpe: z.number().int().min(1).max(10).optional(),
    description: z.string().min(1).optional(),
  })
  .superRefine((session, ctx) => {
    if (!session.distanceKm) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Running sessions need distanceKm.",
        path: ["distanceKm"],
      });
    }

    if (!session.targetRpe) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Running sessions need targetRpe.",
        path: ["targetRpe"],
      });
    }

    if (session.type !== "easy" && !session.description) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Quality sessions need a description.",
        path: ["description"],
      });
    }
  });

export type TrainingSession = z.infer<typeof trainingSessionSchema>;

export const trainingWeekSchema = z
  .object({
    weekNumber: z.number().int().min(1),
    startsOn: isoDateSchema,
    targetDistanceKm: z.number().nonnegative(),
    notes: z.string().min(1).optional(),
    sessions: z.array(trainingSessionSchema).min(4).max(6),
  })
  .superRefine((week, ctx) => {
    const optionalCount = week.sessions.filter((session) => session.optional).length;

    if (optionalCount !== 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Each week must have exactly 2 optional sessions.",
        path: ["sessions"],
      });
    }
  });

export type TrainingWeek = z.infer<typeof trainingWeekSchema>;

export const trainingPlanSchema = z.object({
  schemaVersion: z.literal(3),
  planId: z.string().min(1),
  name: z.string().min(1),
  race: z.object({
    date: isoDateSchema,
    distanceKm: z.number().positive(),
  }),
  athleteBaseline: z.object({
    date: isoDateSchema,
    distanceKm: z.number().positive(),
    durationMin: z.number().positive(),
  }),
  units: z.object({
    distance: z.literal("km"),
    duration: z.literal("min"),
    effort: z.literal("rpe_1_10"),
  }),
  progression: z.object({
    basis: z.literal("baseline"),
    longRunStartKm: z.number().positive(),
    longRunPeakKm: z.number().positive(),
    weeklyDistanceStartKm: z.number().positive(),
    weeklyDistancePeakKm: z.number().positive(),
  }),
  weeks: z.array(trainingWeekSchema).min(1),
});

export type TrainingPlan = z.infer<typeof trainingPlanSchema>;

export const workoutLogSchema = z.object({
  id: z.string().uuid(),
  userId: uuidV4Schema,
  plannedSessionId: z.string().nullable(),
  date: isoDateSchema,
  type: workoutTypeSchema,
  distanceKm: z.number().nonnegative().nullable(),
  durationMin: z.number().nonnegative().nullable(),
  perceivedEffort: z.number().int().min(1).max(10).nullable(),
  notes: z.string().nullable(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export type WorkoutLog = z.infer<typeof workoutLogSchema>;

export const logWorkoutInputSchema = z.object({
  plannedSessionId: z.string().min(1).nullable(),
  date: isoDateSchema,
  type: workoutTypeSchema,
  distanceKm: z.number().nonnegative().nullable(),
  durationMin: z.number().nonnegative().nullable(),
  perceivedEffort: z.number().int().min(1).max(10).nullable(),
  notes: z.string().max(4000).nullable(),
});

export type LogWorkoutInput = z.infer<typeof logWorkoutInputSchema>;

export const editWorkoutLogInputSchema = z.object({
  id: z.string().uuid(),
  date: isoDateSchema,
  type: workoutTypeSchema,
  distanceKm: z.number().nonnegative().nullable(),
  durationMin: z.number().nonnegative().nullable(),
  perceivedEffort: z.number().int().min(1).max(10).nullable(),
  notes: z.string().max(4000).nullable(),
});

export type EditWorkoutLogInput = z.infer<typeof editWorkoutLogInputSchema>;
