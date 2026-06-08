import { index, real, sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const trainingPlans = sqliteTable("training_plans", {
  userId: text("user_id").primaryKey(),
  planJson: text("plan_json").notNull(),
  raceDate: text("race_date").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const workoutLogs = sqliteTable(
  "workout_logs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    plannedSessionId: text("planned_session_id"),
    date: text("date").notNull(),
    type: text("type").notNull(),
    distanceKm: real("distance_km"),
    durationMin: real("duration_min"),
    perceivedEffort: integer("perceived_effort"),
    notes: text("notes"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("workout_logs_user_date_idx").on(table.userId, table.date),
    index("workout_logs_user_planned_idx").on(table.userId, table.plannedSessionId),
  ],
);
