CREATE TABLE `cash_closings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` integer DEFAULT (unixepoch()) NOT NULL,
	`expected_cash` real NOT NULL,
	`counted_cash` real NOT NULL,
	`variance` real NOT NULL,
	`note` text,
	`created_by` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `cash_transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`direction` text NOT NULL,
	`mode` text DEFAULT 'cash' NOT NULL,
	`amount` real NOT NULL,
	`category` text NOT NULL,
	`note` text,
	`date` integer DEFAULT (unixepoch()) NOT NULL,
	`created_by` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
