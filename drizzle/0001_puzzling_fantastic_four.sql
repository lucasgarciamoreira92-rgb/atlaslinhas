CREATE TABLE `members` (
	`email` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`is_owner` integer DEFAULT 0 NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_members_user` ON `members` (`user_id`);--> statement-breakpoint
ALTER TABLE `history` ADD `detail` text;--> statement-breakpoint
CREATE INDEX `idx_history_line_date` ON `history` (`line_id`,`created_at`,`id`);