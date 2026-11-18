// Drizzle schema for the WeHub video platform.
// https://orm.drizzle.team/docs/sql-schema-declaration

import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  sqliteTableCreator,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

/**
 * Multi-project schema: every table is prefixed with `wehub_`.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = sqliteTableCreator((name) => `wehub_${name}`);

const createdAt = () =>
  integer({ mode: "timestamp" })
    .default(sql`(unixepoch())`)
    .notNull();

/* -------------------------------------------------------------------------- */
/*                                    Auth                                    */
/* -------------------------------------------------------------------------- */

export const users = createTable(
  "user",
  (d) => ({
    id: d
      .text({ length: 36 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    username: d.text({ length: 32 }).notNull(),
    email: d.text({ length: 255 }).notNull(),
    passwordHash: d.text().notNull(),
    createdAt: createdAt(),
  }),
  (t) => [
    uniqueIndex("user_username_idx").on(t.username),
    uniqueIndex("user_email_idx").on(t.email),
  ],
);

export const sessions = createTable(
  "session",
  (d) => ({
    /** SHA-256 hash of the session token stored in the browser cookie. */
    id: d.text({ length: 64 }).primaryKey(),
    userId: d
      .text({ length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: d.integer({ mode: "timestamp" }).notNull(),
    createdAt: createdAt(),
  }),
  (t) => [index("session_user_idx").on(t.userId)],
);

/* -------------------------------------------------------------------------- */
/*                                   Videos                                   */
/* -------------------------------------------------------------------------- */

export const videos = createTable(
  "video",
  (d) => ({
    id: d.text({ length: 16 }).primaryKey(),
    userId: d
      .text({ length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: d.text({ length: 120 }).notNull(),
    description: d.text().notNull().default(""),
    /** File name inside UPLOAD_DIR, set once the upload finished. */
    fileName: d.text(),
    originalName: d.text().notNull(),
    mimeType: d.text().notNull(),
    size: d.integer().notNull().default(0),
    /** Duration in seconds. */
    duration: d.real().notNull().default(0),
    hasThumbnail: d.integer({ mode: "boolean" }).notNull().default(false),
    status: d
      .text({ enum: ["pending", "ready"] })
      .notNull()
      .default("pending"),
    views: d.integer().notNull().default(0),
    createdAt: createdAt(),
  }),
  (t) => [
    index("video_user_idx").on(t.userId),
    index("video_status_created_idx").on(t.status, t.createdAt),
  ],
);

export const videoReactions = createTable(
  "video_reaction",
  (d) => ({
    userId: d
      .text({ length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    videoId: d
      .text({ length: 16 })
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),
    /** 1 = like, -1 = dislike */
    value: d.integer().notNull(),
    createdAt: createdAt(),
  }),
  (t) => [
    primaryKey({ columns: [t.userId, t.videoId] }),
    index("reaction_video_idx").on(t.videoId),
  ],
);

export const favorites = createTable(
  "favorite",
  (d) => ({
    userId: d
      .text({ length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    videoId: d
      .text({ length: 16 })
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  }),
  (t) => [
    primaryKey({ columns: [t.userId, t.videoId] }),
    index("favorite_video_idx").on(t.videoId),
  ],
);

/* -------------------------------------------------------------------------- */
/*                                  Playlists                                 */
/* -------------------------------------------------------------------------- */

export const playlists = createTable(
  "playlist",
  (d) => ({
    id: d
      .text({ length: 36 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: d
      .text({ length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: d.text({ length: 100 }).notNull(),
    description: d.text().notNull().default(""),
    isPublic: d.integer({ mode: "boolean" }).notNull().default(false),
    createdAt: createdAt(),
    updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
  }),
  (t) => [index("playlist_user_idx").on(t.userId)],
);

export const playlistVideos = createTable(
  "playlist_video",
  (d) => ({
    playlistId: d
      .text({ length: 36 })
      .notNull()
      .references(() => playlists.id, { onDelete: "cascade" }),
    videoId: d
      .text({ length: 16 })
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),
    position: d.integer().notNull(),
    addedAt: createdAt(),
  }),
  (t) => [
    primaryKey({ columns: [t.playlistId, t.videoId] }),
    index("playlist_video_video_idx").on(t.videoId),
  ],
);

export type User = typeof users.$inferSelect;
export type Video = typeof videos.$inferSelect;
