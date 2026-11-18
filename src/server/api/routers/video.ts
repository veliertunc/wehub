import { randomBytes } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, ne, sql } from "drizzle-orm";
import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { type db as Db } from "~/server/db";
import { favorites, users, videoReactions, videos } from "~/server/db/schema";
import {
  ALLOWED_VIDEO_TYPES,
  MAX_UPLOAD_BYTES,
  deleteVideoFiles,
} from "~/server/storage";

/** Columns needed to render a video card. */
export const videoCardColumns = {
  id: videos.id,
  title: videos.title,
  duration: videos.duration,
  views: videos.views,
  hasThumbnail: videos.hasThumbnail,
  createdAt: videos.createdAt,
  author: { id: users.id, username: users.username },
};

export const PAGE_SIZE = 24;

const videoId = z.string().min(1).max(32);

async function getOwnedVideo(db: typeof Db, id: string, userId: string) {
  const video = await db.query.videos.findFirst({
    where: eq(videos.id, id),
  });
  if (!video)
    throw new TRPCError({ code: "NOT_FOUND", message: "Video not found" });
  if (video.userId !== userId) throw new TRPCError({ code: "FORBIDDEN" });
  return video;
}

async function getReadyVideo(db: typeof Db, id: string) {
  const video = await db
    .select({ id: videos.id })
    .from(videos)
    .where(and(eq(videos.id, id), eq(videos.status, "ready")))
    .get();
  if (!video)
    throw new TRPCError({ code: "NOT_FOUND", message: "Video not found" });
  return video;
}

export const videoRouter = createTRPCRouter({
  /** Home feed with optional title search. */
  list: publicProcedure
    .input(
      z.object({
        q: z.string().trim().max(100).optional(),
        page: z.number().int().min(1).default(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where = and(
        eq(videos.status, "ready"),
        input.q
          ? sql`${videos.title} like ${`%${input.q.replace(/[\\%_]/g, "\\$&")}%`} escape '\\'`
          : undefined,
      );
      const rows = await ctx.db
        .select(videoCardColumns)
        .from(videos)
        .innerJoin(users, eq(users.id, videos.userId))
        .where(where)
        .orderBy(desc(videos.createdAt), desc(videos.id))
        .limit(PAGE_SIZE + 1)
        .offset((input.page - 1) * PAGE_SIZE);
      return {
        items: rows.slice(0, PAGE_SIZE),
        hasMore: rows.length > PAGE_SIZE,
      };
    }),

  /** Full details for the watch page. */
  byId: publicProcedure
    .input(z.object({ id: videoId }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user?.id ?? "";
      const row = await ctx.db
        .select({
          id: videos.id,
          title: videos.title,
          description: videos.description,
          mimeType: videos.mimeType,
          size: videos.size,
          duration: videos.duration,
          views: videos.views,
          hasThumbnail: videos.hasThumbnail,
          createdAt: videos.createdAt,
          author: { id: users.id, username: users.username },
          likes: sql<number>`(select count(*) from ${videoReactions} where ${videoReactions.videoId} = ${videos.id} and ${videoReactions.value} = 1)`,
          dislikes: sql<number>`(select count(*) from ${videoReactions} where ${videoReactions.videoId} = ${videos.id} and ${videoReactions.value} = -1)`,
          myReaction: sql<number>`coalesce((select ${videoReactions.value} from ${videoReactions} where ${videoReactions.videoId} = ${videos.id} and ${videoReactions.userId} = ${userId}), 0)`,
          isFavorite: sql<number>`exists(select 1 from ${favorites} where ${favorites.videoId} = ${videos.id} and ${favorites.userId} = ${userId})`,
        })
        .from(videos)
        .innerJoin(users, eq(users.id, videos.userId))
        .where(and(eq(videos.id, input.id), eq(videos.status, "ready")))
        .get();
      if (!row) return null;
      return {
        ...row,
        myReaction: row.myReaction as -1 | 0 | 1,
        isFavorite: Boolean(row.isFavorite),
        isOwner: row.author.id === userId,
      };
    }),

  /** "Up next" suggestions. */
  related: publicProcedure
    .input(z.object({ id: videoId }))
    .query(({ ctx, input }) =>
      ctx.db
        .select(videoCardColumns)
        .from(videos)
        .innerJoin(users, eq(users.id, videos.userId))
        .where(and(eq(videos.status, "ready"), ne(videos.id, input.id)))
        .orderBy(desc(videos.views), desc(videos.createdAt))
        .limit(15),
    ),

  byUser: publicProcedure
    .input(z.object({ username: z.string().min(1).max(32) }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db
        .select({
          id: users.id,
          username: users.username,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(sql`lower(${users.username})`, input.username.toLowerCase()))
        .get();
      if (!user) return null;
      const items = await ctx.db
        .select(videoCardColumns)
        .from(videos)
        .innerJoin(users, eq(users.id, videos.userId))
        .where(and(eq(videos.userId, user.id), eq(videos.status, "ready")))
        .orderBy(desc(videos.createdAt));
      return { user, videos: items };
    }),

  favorites: protectedProcedure.query(({ ctx }) =>
    ctx.db
      .select(videoCardColumns)
      .from(favorites)
      .innerJoin(videos, eq(videos.id, favorites.videoId))
      .innerJoin(users, eq(users.id, videos.userId))
      .where(and(eq(favorites.userId, ctx.user.id), eq(videos.status, "ready")))
      .orderBy(desc(favorites.createdAt)),
  ),

  liked: protectedProcedure.query(({ ctx }) =>
    ctx.db
      .select(videoCardColumns)
      .from(videoReactions)
      .innerJoin(videos, eq(videos.id, videoReactions.videoId))
      .innerJoin(users, eq(users.id, videos.userId))
      .where(
        and(
          eq(videoReactions.userId, ctx.user.id),
          eq(videoReactions.value, 1),
          eq(videos.status, "ready"),
        ),
      )
      .orderBy(desc(videoReactions.createdAt)),
  ),

  /**
   * Step 1 of an upload: create a pending video record. The client then PUTs
   * the file to /api/videos/:id/upload (and optionally a thumbnail).
   */
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().trim().min(1, "Title is required").max(120),
        description: z.string().trim().max(5000).default(""),
        originalName: z.string().max(255),
        mimeType: z
          .string()
          .refine(
            (t) => ALLOWED_VIDEO_TYPES.includes(t),
            "Unsupported video format",
          ),
        size: z
          .number()
          .int()
          .positive()
          .max(MAX_UPLOAD_BYTES, "File is too large"),
        duration: z
          .number()
          .min(0)
          .max(60 * 60 * 24)
          .default(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const id = randomBytes(8).toString("base64url");
      await ctx.db.insert(videos).values({
        id,
        userId: ctx.user.id,
        title: input.title,
        description: input.description,
        originalName: input.originalName,
        mimeType: input.mimeType,
        size: input.size,
        duration: input.duration,
      });
      return { id };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: videoId,
        title: z.string().trim().min(1).max(120),
        description: z.string().trim().max(5000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await getOwnedVideo(ctx.db, input.id, ctx.user.id);
      await ctx.db
        .update(videos)
        .set({ title: input.title, description: input.description })
        .where(eq(videos.id, input.id));
    }),

  delete: protectedProcedure
    .input(z.object({ id: videoId }))
    .mutation(async ({ ctx, input }) => {
      const video = await getOwnedVideo(ctx.db, input.id, ctx.user.id);
      await ctx.db.delete(videos).where(eq(videos.id, video.id));
      await deleteVideoFiles(video.id, video.fileName);
    }),

  addView: publicProcedure
    .input(z.object({ id: videoId }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(videos)
        .set({ views: sql`${videos.views} + 1` })
        .where(and(eq(videos.id, input.id), eq(videos.status, "ready")));
    }),

  /** value: 1 = like, -1 = dislike, 0 = remove reaction. */
  react: protectedProcedure
    .input(
      z.object({
        id: videoId,
        value: z.union([z.literal(-1), z.literal(0), z.literal(1)]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await getReadyVideo(ctx.db, input.id);
      if (input.value === 0) {
        await ctx.db
          .delete(videoReactions)
          .where(
            and(
              eq(videoReactions.userId, ctx.user.id),
              eq(videoReactions.videoId, input.id),
            ),
          );
        return;
      }
      await ctx.db
        .insert(videoReactions)
        .values({ userId: ctx.user.id, videoId: input.id, value: input.value })
        .onConflictDoUpdate({
          target: [videoReactions.userId, videoReactions.videoId],
          set: { value: input.value, createdAt: new Date() },
        });
    }),

  setFavorite: protectedProcedure
    .input(z.object({ id: videoId, favorite: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await getReadyVideo(ctx.db, input.id);
      if (input.favorite) {
        await ctx.db
          .insert(favorites)
          .values({ userId: ctx.user.id, videoId: input.id })
          .onConflictDoNothing();
      } else {
        await ctx.db
          .delete(favorites)
          .where(
            and(
              eq(favorites.userId, ctx.user.id),
              eq(favorites.videoId, input.id),
            ),
          );
      }
    }),
});
