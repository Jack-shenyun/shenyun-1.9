CREATE TABLE `audits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`auditNo` varchar(50) NOT NULL,
	`title` varchar(200) NOT NULL,
	`type` enum('internal','external','supplier','process') NOT NULL,
	`departmentId` int,
	`auditorId` int,
	`auditDate` date,
	`findings` text,
	`correctiveActions` text,
	`status` enum('planned','in_progress','completed','closed') NOT NULL DEFAULT 'planned',
	`result` enum('pass','conditional','fail'),
	`remark` text,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `audits_id` PRIMARY KEY(`id`),
	CONSTRAINT `audits_auditNo_unique` UNIQUE(`auditNo`)
);
--> statement-breakpoint
CREATE TABLE `bank_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accountName` varchar(200) NOT NULL,
	`bankName` varchar(200) NOT NULL,
	`accountNo` varchar(100) NOT NULL,
	`currency` varchar(10) NOT NULL DEFAULT 'CNY',
	`swiftCode` varchar(20),
	`accountType` enum('basic','general','special') NOT NULL DEFAULT 'basic',
	`isDefault` boolean DEFAULT false,
	`balance` decimal(14,2) DEFAULT '0',
	`status` enum('active','frozen','closed') NOT NULL DEFAULT 'active',
	`remark` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bank_accounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `code_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`module` varchar(50) NOT NULL,
	`prefix` varchar(20) NOT NULL,
	`dateFormat` varchar(20),
	`seqLength` int DEFAULT 4,
	`currentSeq` int DEFAULT 0,
	`example` varchar(50),
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `code_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `company_info` (
	`id` int AUTO_INCREMENT NOT NULL,
	`logoUrl` varchar(500),
	`companyNameCn` varchar(200),
	`companyNameEn` varchar(200),
	`addressCn` text,
	`addressEn` text,
	`website` varchar(200),
	`email` varchar(120),
	`contactNameCn` varchar(100),
	`contactNameEn` varchar(100),
	`phone` varchar(50),
	`whatsapp` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `company_info_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customs_declarations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`declarationNo` varchar(50) NOT NULL,
	`salesOrderId` int NOT NULL,
	`customerId` int NOT NULL,
	`productName` varchar(200),
	`quantity` decimal(12,4),
	`unit` varchar(20),
	`currency` varchar(10) DEFAULT 'USD',
	`amount` decimal(14,2),
	`destination` varchar(100),
	`portOfLoading` varchar(100),
	`portOfDischarge` varchar(100),
	`shippingMethod` enum('sea','air','land','express') DEFAULT 'sea',
	`hsCode` varchar(20),
	`status` enum('preparing','submitted','cleared','shipped') NOT NULL DEFAULT 'preparing',
	`declarationDate` date,
	`clearanceDate` date,
	`shippingDate` date,
	`trackingNo` varchar(100),
	`remark` text,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customs_declarations_id` PRIMARY KEY(`id`),
	CONSTRAINT `customs_declarations_declarationNo_unique` UNIQUE(`declarationNo`)
);
--> statement-breakpoint
CREATE TABLE `departments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(50) NOT NULL,
	`name` varchar(100) NOT NULL,
	`parentId` int,
	`managerId` int,
	`phone` varchar(50),
	`description` text,
	`sortOrder` int DEFAULT 0,
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `departments_id` PRIMARY KEY(`id`),
	CONSTRAINT `departments_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `exchange_rates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fromCurrency` varchar(10) NOT NULL,
	`toCurrency` varchar(10) NOT NULL DEFAULT 'CNY',
	`rate` decimal(10,6) NOT NULL,
	`effectiveDate` date NOT NULL,
	`source` varchar(50),
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `exchange_rates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `expense_reimbursements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reimbursementNo` varchar(50) NOT NULL,
	`applicantId` int NOT NULL,
	`department` varchar(64) NOT NULL,
	`applyDate` date NOT NULL,
	`totalAmount` decimal(14,2) NOT NULL,
	`currency` varchar(10) DEFAULT 'CNY',
	`category` enum('travel','office','entertainment','transport','communication','other') NOT NULL,
	`description` text,
	`status` enum('draft','pending_approval','approved','rejected','paid','cancelled') NOT NULL DEFAULT 'draft',
	`approvedBy` int,
	`approvedAt` timestamp,
	`paidAt` timestamp,
	`bankAccountId` int,
	`remark` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `expense_reimbursements_id` PRIMARY KEY(`id`),
	CONSTRAINT `expense_reimbursements_reimbursementNo_unique` UNIQUE(`reimbursementNo`)
);
--> statement-breakpoint
CREATE TABLE `lab_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recordNo` varchar(50) NOT NULL,
	`sampleId` int,
	`testType` varchar(100) NOT NULL,
	`testMethod` varchar(200),
	`specification` text,
	`result` text,
	`conclusion` enum('pass','fail','pending') DEFAULT 'pending',
	`equipmentId` int,
	`testerId` int,
	`testDate` date,
	`reviewerId` int,
	`reviewDate` date,
	`status` enum('pending','testing','completed','reviewed') NOT NULL DEFAULT 'pending',
	`remark` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `lab_records_id` PRIMARY KEY(`id`),
	CONSTRAINT `lab_records_recordNo_unique` UNIQUE(`recordNo`)
);
--> statement-breakpoint
CREATE TABLE `leave_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestNo` varchar(50) NOT NULL,
	`applicantId` int NOT NULL,
	`applicantName` varchar(64) NOT NULL,
	`department` varchar(64) NOT NULL,
	`leaveType` enum('annual','sick','personal','maternity','paternity','marriage','bereavement','other') NOT NULL DEFAULT 'annual',
	`startDate` date NOT NULL,
	`endDate` date NOT NULL,
	`days` decimal(5,1) NOT NULL,
	`reason` text NOT NULL,
	`status` enum('draft','pending','approved','rejected','cancelled') NOT NULL DEFAULT 'draft',
	`approvedBy` int,
	`approvedAt` timestamp,
	`remark` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leave_requests_id` PRIMARY KEY(`id`),
	CONSTRAINT `leave_requests_requestNo_unique` UNIQUE(`requestNo`)
);
--> statement-breakpoint
CREATE TABLE `material_request_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int NOT NULL,
	`productId` int,
	`materialName` varchar(200) NOT NULL,
	`specification` varchar(200),
	`quantity` decimal(12,4) NOT NULL,
	`unit` varchar(20),
	`estimatedPrice` decimal(12,4),
	`remark` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `material_request_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `material_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestNo` varchar(50) NOT NULL,
	`department` varchar(64) NOT NULL,
	`requesterId` int NOT NULL,
	`requestDate` date NOT NULL,
	`urgency` enum('normal','urgent','critical') NOT NULL DEFAULT 'normal',
	`reason` text,
	`totalAmount` decimal(14,2),
	`status` enum('draft','pending_approval','approved','rejected','purchasing','completed','cancelled') NOT NULL DEFAULT 'draft',
	`approvedBy` int,
	`approvedAt` timestamp,
	`remark` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `material_requests_id` PRIMARY KEY(`id`),
	CONSTRAINT `material_requests_requestNo_unique` UNIQUE(`requestNo`)
);
--> statement-breakpoint
CREATE TABLE `material_requisition_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requisitionNo` varchar(50) NOT NULL,
	`productionOrderId` int,
	`productionOrderNo` varchar(50),
	`warehouseId` int,
	`applicantId` int,
	`applicationDate` date,
	`status` enum('draft','pending','approved','issued','rejected') NOT NULL DEFAULT 'draft',
	`remark` text,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `material_requisition_orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `material_requisition_orders_requisitionNo_unique` UNIQUE(`requisitionNo`)
);
--> statement-breakpoint
CREATE TABLE `outing_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestNo` varchar(50) NOT NULL,
	`applicantId` int NOT NULL,
	`applicantName` varchar(64) NOT NULL,
	`department` varchar(64) NOT NULL,
	`outingDate` date NOT NULL,
	`startTime` varchar(10) NOT NULL,
	`endTime` varchar(10) NOT NULL,
	`destination` varchar(200) NOT NULL,
	`purpose` text NOT NULL,
	`contactPhone` varchar(20),
	`status` enum('draft','pending','approved','rejected','cancelled') NOT NULL DEFAULT 'draft',
	`approvedBy` int,
	`approvedAt` timestamp,
	`remark` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `outing_requests_id` PRIMARY KEY(`id`),
	CONSTRAINT `outing_requests_requestNo_unique` UNIQUE(`requestNo`)
);
--> statement-breakpoint
CREATE TABLE `overtime_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestNo` varchar(50) NOT NULL,
	`applicantId` int NOT NULL,
	`applicantName` varchar(64) NOT NULL,
	`department` varchar(64) NOT NULL,
	`overtimeDate` date NOT NULL,
	`startTime` varchar(10) NOT NULL,
	`endTime` varchar(10) NOT NULL,
	`hours` decimal(5,1) NOT NULL,
	`overtimeType` enum('weekday','weekend','holiday') NOT NULL DEFAULT 'weekday',
	`reason` text NOT NULL,
	`status` enum('draft','pending','approved','rejected','cancelled') NOT NULL DEFAULT 'draft',
	`approvedBy` int,
	`approvedAt` timestamp,
	`remark` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `overtime_requests_id` PRIMARY KEY(`id`),
	CONSTRAINT `overtime_requests_requestNo_unique` UNIQUE(`requestNo`)
);
--> statement-breakpoint
CREATE TABLE `payment_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recordNo` varchar(50) NOT NULL,
	`type` enum('receipt','payment') NOT NULL,
	`relatedType` enum('sales_order','purchase_order','expense','other') NOT NULL,
	`relatedId` int,
	`relatedNo` varchar(50),
	`customerId` int,
	`supplierId` int,
	`amount` decimal(14,2) NOT NULL,
	`currency` varchar(10) DEFAULT 'CNY',
	`amountBase` decimal(14,2),
	`exchangeRate` decimal(10,6) DEFAULT '1',
	`bankAccountId` int NOT NULL,
	`paymentDate` date NOT NULL,
	`paymentMethod` varchar(50),
	`remark` text,
	`operatorId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `payment_records_id` PRIMARY KEY(`id`),
	CONSTRAINT `payment_records_recordNo_unique` UNIQUE(`recordNo`)
);
--> statement-breakpoint
CREATE TABLE `payment_terms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`type` enum('cash','deposit','monthly','quarterly') NOT NULL,
	`depositPercent` decimal(5,2),
	`creditDays` int DEFAULT 0,
	`description` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payment_terms_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `personnel` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeNo` varchar(50) NOT NULL,
	`name` varchar(100) NOT NULL,
	`gender` enum('male','female'),
	`idCard` varchar(20),
	`phone` varchar(20),
	`email` varchar(100),
	`departmentId` int,
	`position` varchar(64),
	`entryDate` date,
	`contractExpiry` date,
	`education` varchar(50),
	`major` varchar(100),
	`emergencyContact` varchar(50),
	`emergencyPhone` varchar(20),
	`status` enum('active','probation','resigned','terminated') NOT NULL DEFAULT 'active',
	`userId` int,
	`remark` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `personnel_id` PRIMARY KEY(`id`),
	CONSTRAINT `personnel_employeeNo_unique` UNIQUE(`employeeNo`)
);
--> statement-breakpoint
CREATE TABLE `production_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`planNo` varchar(50) NOT NULL,
	`planType` enum('sales_driven','internal') NOT NULL DEFAULT 'sales_driven',
	`salesOrderId` int,
	`salesOrderNo` varchar(50),
	`productId` int NOT NULL,
	`productName` varchar(200),
	`plannedQty` decimal(12,4) NOT NULL,
	`unit` varchar(20),
	`batchNo` varchar(50),
	`plannedStartDate` date,
	`plannedEndDate` date,
	`priority` enum('low','normal','high','urgent') DEFAULT 'normal',
	`status` enum('pending','scheduled','in_progress','completed','cancelled') NOT NULL DEFAULT 'pending',
	`productionOrderId` int,
	`remark` text,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `production_plans_id` PRIMARY KEY(`id`),
	CONSTRAINT `production_plans_planNo_unique` UNIQUE(`planNo`)
);
--> statement-breakpoint
CREATE TABLE `production_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recordNo` varchar(50) NOT NULL,
	`productionOrderId` int,
	`productionOrderNo` varchar(50),
	`productId` int,
	`productName` varchar(200),
	`batchNo` varchar(50),
	`workstationId` int,
	`workstationName` varchar(100),
	`operatorId` int,
	`recordDate` date,
	`plannedQty` decimal(12,4),
	`actualQty` decimal(12,4),
	`scrapQty` decimal(12,4) DEFAULT '0',
	`status` enum('in_progress','completed','abnormal') NOT NULL DEFAULT 'in_progress',
	`remark` text,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `production_records_id` PRIMARY KEY(`id`),
	CONSTRAINT `production_records_recordNo_unique` UNIQUE(`recordNo`)
);
--> statement-breakpoint
CREATE TABLE `production_routing_cards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cardNo` varchar(50) NOT NULL,
	`productionOrderId` int,
	`productionOrderNo` varchar(50),
	`productId` int,
	`productName` varchar(200),
	`batchNo` varchar(50),
	`quantity` decimal(12,4),
	`unit` varchar(20),
	`currentProcess` varchar(100),
	`nextProcess` varchar(100),
	`needsSterilization` boolean DEFAULT false,
	`status` enum('in_process','pending_sterilization','sterilizing','completed') NOT NULL DEFAULT 'in_process',
	`remark` text,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `production_routing_cards_id` PRIMARY KEY(`id`),
	CONSTRAINT `production_routing_cards_cardNo_unique` UNIQUE(`cardNo`)
);
--> statement-breakpoint
CREATE TABLE `production_warehouse_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entryNo` varchar(50) NOT NULL,
	`productionOrderId` int,
	`productionOrderNo` varchar(50),
	`sterilizationOrderId` int,
	`sterilizationOrderNo` varchar(50),
	`productId` int,
	`productName` varchar(200),
	`batchNo` varchar(50),
	`quantity` decimal(12,4),
	`unit` varchar(20),
	`targetWarehouseId` int,
	`applicantId` int,
	`applicationDate` date,
	`status` enum('draft','pending','approved','completed','rejected') NOT NULL DEFAULT 'draft',
	`remark` text,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `production_warehouse_entries_id` PRIMARY KEY(`id`),
	CONSTRAINT `production_warehouse_entries_entryNo_unique` UNIQUE(`entryNo`)
);
--> statement-breakpoint
CREATE TABLE `quality_incidents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`incidentNo` varchar(50) NOT NULL,
	`title` varchar(200) NOT NULL,
	`type` enum('complaint','nonconformance','capa','recall','deviation') NOT NULL,
	`severity` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
	`productId` int,
	`batchNo` varchar(50),
	`description` text,
	`rootCause` text,
	`correctiveAction` text,
	`preventiveAction` text,
	`reporterId` int,
	`assigneeId` int,
	`reportDate` date,
	`closeDate` date,
	`status` enum('open','investigating','correcting','verifying','closed') NOT NULL DEFAULT 'open',
	`remark` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `quality_incidents_id` PRIMARY KEY(`id`),
	CONSTRAINT `quality_incidents_incidentNo_unique` UNIQUE(`incidentNo`)
);
--> statement-breakpoint
CREATE TABLE `rd_projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectNo` varchar(50) NOT NULL,
	`name` varchar(200) NOT NULL,
	`type` enum('new_product','improvement','customization','research') NOT NULL,
	`productId` int,
	`leaderId` int,
	`startDate` date,
	`endDate` date,
	`budget` decimal(14,2),
	`progress` int DEFAULT 0,
	`status` enum('planning','in_progress','testing','completed','suspended','cancelled') NOT NULL DEFAULT 'planning',
	`description` text,
	`remark` text,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rd_projects_id` PRIMARY KEY(`id`),
	CONSTRAINT `rd_projects_projectNo_unique` UNIQUE(`projectNo`)
);
--> statement-breakpoint
CREATE TABLE `samples` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sampleNo` varchar(50) NOT NULL,
	`productId` int,
	`batchNo` varchar(50),
	`sampleType` enum('raw_material','semi_finished','finished','stability','retention') NOT NULL,
	`quantity` decimal(12,4),
	`unit` varchar(20),
	`storageLocation` varchar(100),
	`storageCondition` varchar(100),
	`samplingDate` date,
	`expiryDate` date,
	`samplerId` int,
	`status` enum('stored','testing','used','expired','destroyed') NOT NULL DEFAULT 'stored',
	`remark` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `samples_id` PRIMARY KEY(`id`),
	CONSTRAINT `samples_sampleNo_unique` UNIQUE(`sampleNo`)
);
--> statement-breakpoint
CREATE TABLE `sterilization_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderNo` varchar(50) NOT NULL,
	`routingCardId` int,
	`routingCardNo` varchar(50),
	`productionOrderId` int,
	`productionOrderNo` varchar(50),
	`productId` int,
	`productName` varchar(200),
	`batchNo` varchar(50),
	`quantity` decimal(12,4),
	`unit` varchar(20),
	`sterilizationMethod` varchar(100),
	`supplierId` int,
	`supplierName` varchar(200),
	`sendDate` date,
	`expectedReturnDate` date,
	`actualReturnDate` date,
	`status` enum('draft','sent','processing','returned','qualified','unqualified') NOT NULL DEFAULT 'draft',
	`remark` text,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sterilization_orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `sterilization_orders_orderNo_unique` UNIQUE(`orderNo`)
);
--> statement-breakpoint
CREATE TABLE `stocktakes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`stocktakeNo` varchar(50) NOT NULL,
	`warehouseId` int NOT NULL,
	`type` enum('full','partial','spot') NOT NULL,
	`stocktakeDate` date NOT NULL,
	`operatorId` int,
	`systemQty` decimal(12,4),
	`actualQty` decimal(12,4),
	`diffQty` decimal(12,4),
	`status` enum('planned','in_progress','completed','approved') NOT NULL DEFAULT 'planned',
	`remark` text,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `stocktakes_id` PRIMARY KEY(`id`),
	CONSTRAINT `stocktakes_stocktakeNo_unique` UNIQUE(`stocktakeNo`)
);
--> statement-breakpoint
CREATE TABLE `trainings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(200) NOT NULL,
	`type` enum('onboarding','skill','compliance','safety','other') NOT NULL,
	`trainerId` int,
	`departmentId` int,
	`startDate` date,
	`endDate` date,
	`location` varchar(100),
	`participants` int,
	`content` text,
	`status` enum('planned','in_progress','completed','cancelled') NOT NULL DEFAULT 'planned',
	`remark` text,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `trainings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workflow_form_catalog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`module` varchar(64) NOT NULL,
	`formType` varchar(100) NOT NULL,
	`formName` varchar(100) NOT NULL,
	`path` varchar(200),
	`sortOrder` int NOT NULL DEFAULT 0,
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`approvalEnabled` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workflow_form_catalog_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workflow_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(64) NOT NULL,
	`name` varchar(100) NOT NULL,
	`module` varchar(64) NOT NULL,
	`formType` varchar(100) NOT NULL,
	`initiators` text,
	`approvalSteps` text,
	`handlers` text,
	`ccRecipients` text,
	`description` text,
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`createdBy` int,
	`updatedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workflow_templates_id` PRIMARY KEY(`id`),
	CONSTRAINT `workflow_templates_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
ALTER TABLE `sales_orders` MODIFY COLUMN `status` enum('draft','pending_review','approved','pending_payment','confirmed','in_production','ready_to_ship','shipped','completed','cancelled') NOT NULL DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE `accounts_payable` ADD `amountBase` decimal(14,2);--> statement-breakpoint
ALTER TABLE `accounts_payable` ADD `exchangeRate` decimal(10,6) DEFAULT '1';--> statement-breakpoint
ALTER TABLE `accounts_payable` ADD `bankAccountId` int;--> statement-breakpoint
ALTER TABLE `accounts_payable` ADD `paymentMethod` varchar(50);--> statement-breakpoint
ALTER TABLE `accounts_payable` ADD `paymentDate` date;--> statement-breakpoint
ALTER TABLE `accounts_payable` ADD `createdBy` int;--> statement-breakpoint
ALTER TABLE `accounts_receivable` ADD `amountBase` decimal(14,2);--> statement-breakpoint
ALTER TABLE `accounts_receivable` ADD `exchangeRate` decimal(10,6) DEFAULT '1';--> statement-breakpoint
ALTER TABLE `accounts_receivable` ADD `bankAccountId` int;--> statement-breakpoint
ALTER TABLE `accounts_receivable` ADD `paymentMethod` varchar(50);--> statement-breakpoint
ALTER TABLE `accounts_receivable` ADD `receiptDate` date;--> statement-breakpoint
ALTER TABLE `accounts_receivable` ADD `createdBy` int;--> statement-breakpoint
ALTER TABLE `inventory_transactions` ADD `productId` int;--> statement-breakpoint
ALTER TABLE `inventory_transactions` ADD `sterilizationBatchNo` varchar(50);--> statement-breakpoint
ALTER TABLE `products` ADD `isSterilized` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `purchase_order_items` ADD `productId` int;--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD `totalAmountBase` decimal(14,2);--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD `exchangeRate` decimal(10,6) DEFAULT '1';--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD `materialRequestId` int;--> statement-breakpoint
ALTER TABLE `sales_orders` ADD `totalAmountBase` decimal(14,2);--> statement-breakpoint
ALTER TABLE `sales_orders` ADD `exchangeRate` decimal(10,6) DEFAULT '1';--> statement-breakpoint
ALTER TABLE `sales_orders` ADD `paymentTermId` int;--> statement-breakpoint
ALTER TABLE `sales_orders` ADD `depositRate` decimal(5,2);--> statement-breakpoint
ALTER TABLE `sales_orders` ADD `depositAmount` decimal(14,2);--> statement-breakpoint
ALTER TABLE `sales_orders` ADD `depositPaid` decimal(14,2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `sales_orders` ADD `needsShipping` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `sales_orders` ADD `shippingFee` decimal(14,2);--> statement-breakpoint
ALTER TABLE `users` ADD `visibleApps` text;