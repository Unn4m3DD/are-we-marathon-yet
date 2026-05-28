import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const athleteProfiles = sqliteTable('athlete_profiles', {
  userId: text('user_id').primaryKey().references(() => users.id),
  distanceUnit: text('distance_unit').notNull().default('km'),
  minRunDaysPerWeek: integer('min_run_days_per_week').notNull().default(2),
  maxRunDaysPerWeek: integer('max_run_days_per_week').notNull().default(6),
  // FLS is calculated from runs, not set manually
  currentFLS: real('current_fls'), // null until first run logged
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const runs = sqliteTable('runs', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  date: integer('date', { mode: 'timestamp' }).notNull(),
  distance: real('distance').notNull(), // in km
  durationSeconds: integer('duration_seconds').notNull(),
  perceivedEffort: integer('perceived_effort').notNull(), // 1-10
  // FLS state after this run (for debugging/history)
  flsAfterRun: real('fls_after_run'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});
