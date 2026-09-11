CREATE TABLE `history` (
	`id` text PRIMARY KEY NOT NULL,
	`line_id` text NOT NULL,
	`version` integer NOT NULL,
	`data` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `lines` (
	`id` text PRIMARY KEY NOT NULL,
	`number` text NOT NULL,
	`device_id` text,
	`slot` text,
	`data` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_lines_number` ON `lines` (`number`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_lines_device_slot` ON `lines` (`device_id`,`slot`);--> statement-breakpoint
CREATE TABLE `settings` (
	`id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL
);
