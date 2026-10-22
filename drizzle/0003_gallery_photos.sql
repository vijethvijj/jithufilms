CREATE TABLE `gallery_photos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`src` varchar(500) NOT NULL,
	`alt` varchar(255) NOT NULL,
	`title` varchar(150) NOT NULL,
	`caption` varchar(500) NOT NULL,
	`category` varchar(100) NOT NULL,
	`storageKey` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `gallery_photos_id` PRIMARY KEY(`id`),
	CONSTRAINT `gallery_photos_src_unique` UNIQUE(`src`)
);
