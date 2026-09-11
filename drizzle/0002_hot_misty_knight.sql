CREATE TABLE `backups` (
	`id` text PRIMARY KEY NOT NULL,
	`object_key` text NOT NULL,
	`kind` text NOT NULL,
	`created_at` text NOT NULL,
	`actor` text NOT NULL,
	`line_count` integer NOT NULL,
	`history_count` integer NOT NULL,
	`source_date` text NOT NULL,
	`revision` integer NOT NULL,
	CONSTRAINT "backup_revision_valid" CHECK("backups"."revision" >= 0)
);
--> statement-breakpoint
CREATE INDEX `idx_backups_date` ON `backups` (`created_at`,`id`);--> statement-breakpoint
CREATE TABLE `storage_revision` (
	`id` text PRIMARY KEY NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL
);

--> statement-breakpoint
CREATE TRIGGER revision_lines_insert AFTER INSERT ON lines BEGIN UPDATE storage_revision SET revision=revision+1 WHERE id='main'; END;

--> statement-breakpoint
CREATE TRIGGER revision_lines_update AFTER UPDATE ON lines BEGIN UPDATE storage_revision SET revision=revision+1 WHERE id='main'; END;

--> statement-breakpoint
CREATE TRIGGER revision_lines_delete AFTER DELETE ON lines BEGIN UPDATE storage_revision SET revision=revision+1 WHERE id='main'; END;

--> statement-breakpoint
CREATE TRIGGER revision_settings_insert AFTER INSERT ON settings BEGIN UPDATE storage_revision SET revision=revision+1 WHERE id='main'; END;

--> statement-breakpoint
CREATE TRIGGER revision_settings_update AFTER UPDATE ON settings BEGIN UPDATE storage_revision SET revision=revision+1 WHERE id='main'; END;

--> statement-breakpoint
CREATE TRIGGER revision_settings_delete AFTER DELETE ON settings BEGIN UPDATE storage_revision SET revision=revision+1 WHERE id='main'; END;

--> statement-breakpoint
CREATE TRIGGER revision_history_insert AFTER INSERT ON history BEGIN UPDATE storage_revision SET revision=revision+1 WHERE id='main'; END;

--> statement-breakpoint
CREATE TRIGGER revision_history_update AFTER UPDATE ON history BEGIN UPDATE storage_revision SET revision=revision+1 WHERE id='main'; END;

--> statement-breakpoint
CREATE TRIGGER revision_history_delete AFTER DELETE ON history BEGIN UPDATE storage_revision SET revision=revision+1 WHERE id='main'; END;
