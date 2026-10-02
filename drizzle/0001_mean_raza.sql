CREATE TABLE `training_shares` (
	`public_id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `training_shares_user_id_unique` ON `training_shares` (`user_id`);