CREATE TABLE `booking_enquiries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`email` varchar(254) NOT NULL,
	`phone` varchar(32) NOT NULL,
	`eventType` varchar(40) NOT NULL,
	`eventDate` varchar(10) NOT NULL,
	`eventLocation` varchar(180) NOT NULL,
	`services` text NOT NULL,
	`message` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `booking_enquiries_id` PRIMARY KEY(`id`)
);
