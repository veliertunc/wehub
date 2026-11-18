CREATE TABLE `wehub_favorite` (
	`userId` text(36) NOT NULL,
	`videoId` text(16) NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	PRIMARY KEY(`userId`, `videoId`),
	FOREIGN KEY (`userId`) REFERENCES `wehub_user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`videoId`) REFERENCES `wehub_video`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `favorite_video_idx` ON `wehub_favorite` (`videoId`);--> statement-breakpoint
CREATE TABLE `wehub_playlist_video` (
	`playlistId` text(36) NOT NULL,
	`videoId` text(16) NOT NULL,
	`position` integer NOT NULL,
	`addedAt` integer DEFAULT (unixepoch()) NOT NULL,
	PRIMARY KEY(`playlistId`, `videoId`),
	FOREIGN KEY (`playlistId`) REFERENCES `wehub_playlist`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`videoId`) REFERENCES `wehub_video`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `playlist_video_video_idx` ON `wehub_playlist_video` (`videoId`);--> statement-breakpoint
CREATE TABLE `wehub_playlist` (
	`id` text(36) PRIMARY KEY NOT NULL,
	`userId` text(36) NOT NULL,
	`name` text(100) NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`isPublic` integer DEFAULT false NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer,
	FOREIGN KEY (`userId`) REFERENCES `wehub_user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `playlist_user_idx` ON `wehub_playlist` (`userId`);--> statement-breakpoint
CREATE TABLE `wehub_session` (
	`id` text(64) PRIMARY KEY NOT NULL,
	`userId` text(36) NOT NULL,
	`expiresAt` integer NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `wehub_user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `session_user_idx` ON `wehub_session` (`userId`);--> statement-breakpoint
CREATE TABLE `wehub_user` (
	`id` text(36) PRIMARY KEY NOT NULL,
	`username` text(32) NOT NULL,
	`email` text(255) NOT NULL,
	`passwordHash` text NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_username_idx` ON `wehub_user` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_idx` ON `wehub_user` (`email`);--> statement-breakpoint
CREATE TABLE `wehub_video_reaction` (
	`userId` text(36) NOT NULL,
	`videoId` text(16) NOT NULL,
	`value` integer NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	PRIMARY KEY(`userId`, `videoId`),
	FOREIGN KEY (`userId`) REFERENCES `wehub_user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`videoId`) REFERENCES `wehub_video`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `reaction_video_idx` ON `wehub_video_reaction` (`videoId`);--> statement-breakpoint
CREATE TABLE `wehub_video` (
	`id` text(16) PRIMARY KEY NOT NULL,
	`userId` text(36) NOT NULL,
	`title` text(120) NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`fileName` text,
	`originalName` text NOT NULL,
	`mimeType` text NOT NULL,
	`size` integer DEFAULT 0 NOT NULL,
	`duration` real DEFAULT 0 NOT NULL,
	`hasThumbnail` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`views` integer DEFAULT 0 NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `wehub_user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `video_user_idx` ON `wehub_video` (`userId`);--> statement-breakpoint
CREATE INDEX `video_status_created_idx` ON `wehub_video` (`status`,`createdAt`);