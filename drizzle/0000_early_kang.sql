CREATE TABLE IF NOT EXISTS `training_plans` (
	`user_id` text PRIMARY KEY NOT NULL,
	`plan_json` text NOT NULL,
	`race_date` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `workout_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`planned_session_id` text,
	`date` text NOT NULL,
	`type` text NOT NULL,
	`distance_km` real,
	`duration_min` real,
	`perceived_effort` integer,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `workout_logs_user_date_idx` ON `workout_logs` (`user_id`,`date`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `workout_logs_user_planned_idx` ON `workout_logs` (`user_id`,`planned_session_id`);
