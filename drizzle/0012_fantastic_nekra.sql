CREATE TABLE `product_supplier_prices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`supplierId` int NOT NULL,
	`purchasePrice` decimal(12,4),
	`currency` varchar(10) DEFAULT 'CNY',
	`moq` int DEFAULT 1,
	`leadTimeDays` int,
	`isDefault` tinyint DEFAULT 0,
	`validFrom` date,
	`validTo` date,
	`remark` text,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `product_supplier_prices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `production_orders` ADD `orderType` enum('finished','semi_finished','rework') DEFAULT 'finished' NOT NULL;--> statement-breakpoint
ALTER TABLE `production_records` ADD `recordType` enum('general','temperature_humidity','material_usage','clean_room','first_piece') DEFAULT 'general' NOT NULL;--> statement-breakpoint
ALTER TABLE `production_records` ADD `temperature` decimal(6,2);--> statement-breakpoint
ALTER TABLE `production_records` ADD `humidity` decimal(6,2);--> statement-breakpoint
ALTER TABLE `production_records` ADD `temperatureLimit` varchar(50);--> statement-breakpoint
ALTER TABLE `production_records` ADD `humidityLimit` varchar(50);--> statement-breakpoint
ALTER TABLE `production_records` ADD `materialCode` varchar(50);--> statement-breakpoint
ALTER TABLE `production_records` ADD `materialName` varchar(200);--> statement-breakpoint
ALTER TABLE `production_records` ADD `materialSpec` varchar(200);--> statement-breakpoint
ALTER TABLE `production_records` ADD `usedQty` decimal(12,4);--> statement-breakpoint
ALTER TABLE `production_records` ADD `usedUnit` varchar(20);--> statement-breakpoint
ALTER TABLE `production_records` ADD `materialBatchNo` varchar(50);--> statement-breakpoint
ALTER TABLE `production_records` ADD `cleanedBy` varchar(50);--> statement-breakpoint
ALTER TABLE `production_records` ADD `checkedBy` varchar(50);--> statement-breakpoint
ALTER TABLE `production_records` ADD `cleanResult` enum('pass','fail');--> statement-breakpoint
ALTER TABLE `production_records` ADD `firstPieceResult` enum('qualified','unqualified');--> statement-breakpoint
ALTER TABLE `production_records` ADD `firstPieceInspector` varchar(50);