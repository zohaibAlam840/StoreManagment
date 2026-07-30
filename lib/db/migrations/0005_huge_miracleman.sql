CREATE TABLE `sales_return_lines` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sales_return_id` integer NOT NULL,
	`product_id` integer NOT NULL,
	`qty` real NOT NULL,
	`rate` real NOT NULL,
	`cost_at_sale` real NOT NULL,
	FOREIGN KEY (`sales_return_id`) REFERENCES `sales_returns`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sales_returns` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`number` integer NOT NULL,
	`invoice_id` integer NOT NULL,
	`customer_id` integer NOT NULL,
	`date` integer DEFAULT (unixepoch()) NOT NULL,
	`reason` text,
	`subtotal` real NOT NULL,
	`total` real NOT NULL,
	`created_by` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sales_returns_number_unique` ON `sales_returns` (`number`);--> statement-breakpoint
DROP INDEX "customer_rates_customer_product_idx";--> statement-breakpoint
DROP INDEX "invoices_number_unique";--> statement-breakpoint
DROP INDEX "products_sku_unique";--> statement-breakpoint
DROP INDEX "purchase_orders_number_unique";--> statement-breakpoint
DROP INDEX "purchases_number_unique";--> statement-breakpoint
DROP INDEX "sales_returns_number_unique";--> statement-breakpoint
DROP INDEX "users_username_unique";--> statement-breakpoint
ALTER TABLE `invoices` ALTER COLUMN "number" TO "number" integer;--> statement-breakpoint
CREATE UNIQUE INDEX `customer_rates_customer_product_idx` ON `customer_rates` (`customer_id`,`product_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `invoices_number_unique` ON `invoices` (`number`);--> statement-breakpoint
CREATE UNIQUE INDEX `products_sku_unique` ON `products` (`sku`);--> statement-breakpoint
CREATE UNIQUE INDEX `purchase_orders_number_unique` ON `purchase_orders` (`number`);--> statement-breakpoint
CREATE UNIQUE INDEX `purchases_number_unique` ON `purchases` (`number`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
ALTER TABLE `payments` ADD `invoice_id` integer REFERENCES invoices(id);