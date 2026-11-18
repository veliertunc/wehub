import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, getTableName, sql } from "drizzle-orm";
import { z } from "zod";

import { videoCardColumns } from "~/server/api/routers/video";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { type db as Db } from "~/server/db";
import { playlists, playlistVideos, users, videos } from "~/server/db/schema";

const playlistId = z.string().uuid();
const videoId = z.string().min(1).max(32);

/**
 * Fully-qualified reference to the outer playlist id for correlated subqueries.
 * Drizzle omits table qualifiers in single-table selects, which would make
 * `id` resolve to an inner table instead.
 */
const outerPlaylistId = sql.raw(`"${getTableName(playlists)}"."id"`);

const playlistSummaryColumns = {
  id: playlists.id,
  name: playlists.name,
  description: playlists.description,
  isPublic: playlists.isPublic,
  createdAt: playlists.createdAt,
  videoCount: sql<number>`(select count(*) from ${playlistVideos} inner join ${videos} on ${videos.id} = ${playlistVideos.videoId} where ${playlistVideos.playlistId} = ${outerPlaylistId} and ${videos.status} = 'ready')`,
  /** First video with a thumbnail, used as the playlist cover. */
  coverVideoId: sql<
    string | null
  >`(select ${playlistVideos.videoId} from ${playlistVideos} inner join ${videos} on ${videos.id} = ${playlistVideos.videoId} where ${playlistVideos.playlistId} = ${outerPlaylistId} and ${videos.hasThumbnail} = 1 order by ${playlistVideos.position} limit 1)`,
};

async function getOwnedPlaylist(db: typeof Db, id: string, userId: string) {
  const playlist = await db.query.playlists.findFirst({
    where: eq(playlists.id, id),
  });
  if (!playlist)
    throw new TRPCError({ code: "NOT_FOUND", message: "Playlist not found" });
  if (playlist.userId !== userId) throw new TRPCError({ code: "FORBIDDEN" });
  return playlist;
}

const playlistFields = {
  name: z.string().trim().min(1, "Name is required").max(100),
  description: z.string().trim().max(1000),
  isPublic: z.boolean(),
};

export const playlistRouter = createTRPCRouter({
  mine: protectedProcedure.query(({ ctx }) =>
    ctx.db
      .select(playlistSummaryColumns)
      .from(playlists)
      .where(eq(playlists.userId, ctx.user.id))
      .orderBy(
        desc(sql`coalesce(${playlists.updatedAt}, ${playlists.createdAt})`),
      ),
  ),

  publicByUser: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(({ ctx, input }) =>
      ctx.db
        .select(playlistSummaryColumns)
        .from(playlists)
        .where(
          and(eq(playlists.userId, input.userId), eq(playlists.isPublic, true)),
        )
        .orderBy(desc(playlists.createdAt)),
    ),

  /** The current user's playlists, flagged with whether they contain a video. */
  forVideo: protectedProcedure
    .input(z.object({ videoId }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select({
          id: playlists.id,
          name: playlists.name,
          isPublic: playlists.isPublic,
          hasVideo: sql<number>`exists(select 1 from ${playlistVideos} where ${playlistVideos.playlistId} = ${outerPlaylistId} and ${playlistVideos.videoId} = ${input.videoId})`,
        })
        .from(playlists)
        .where(eq(playlists.userId, ctx.user.id))
        .orderBy(asc(playlists.name));
      return rows.map((r) => ({ ...r, hasVideo: Boolean(r.hasVideo) }));
    }),

  byId: publicProcedure
    .input(z.object({ id: playlistId }))
    .query(async ({ ctx, input }) => {
      const playlist = await ctx.db
        .select({
          ...playlistSummaryColumns,
          owner: { id: users.id, username: users.username },
        })
        .from(playlists)
        .innerJoin(users, eq(users.id, playlists.userId))
        .where(eq(playlists.id, input.id))
        .get();
      const isOwner = !!playlist && playlist.owner.id === ctx.user?.id;
      if (!playlist || (!playlist.isPublic && !isOwner)) return null;

      const items = await ctx.db
        .select(videoCardColumns)
        .from(playlistVideos)
        .innerJoin(videos, eq(videos.id, playlistVideos.videoId))
        .innerJoin(users, eq(users.id, videos.userId))
        .where(
          and(
            eq(playlistVideos.playlistId, input.id),
            eq(videos.status, "ready"),
          ),
        )
        .orderBy(asc(playlistVideos.position));

      return { ...playlist, isOwner, videos: items };
    }),

  create: protectedProcedure
    .input(
      z.object({
        ...playlistFields,
        description: playlistFields.description.default(""),
        isPublic: playlistFields.isPublic.default(false),
        /** Optionally add a first video right away. */
        videoId: videoId.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [playlist] = await ctx.db
        .insert(playlists)
        .values({
          userId: ctx.user.id,
          name: input.name,
          description: input.description,
          isPublic: input.isPublic,
        })
        .returning({ id: playlists.id });
      if (!playlist) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      if (input.videoId) {
        await ctx.db.insert(playlistVideos).values({
          playlistId: playlist.id,
          videoId: input.videoId,
          position: 0,
        });
      }
      return playlist;
    }),

  update: protectedProcedure
    .input(z.object({ id: playlistId, ...playlistFields }))
    .mutation(async ({ ctx, input }) => {
      await getOwnedPlaylist(ctx.db, input.id, ctx.user.id);
      await ctx.db
        .update(playlists)
        .set({
          name: input.name,
          description: input.description,
          isPublic: input.isPublic,
        })
        .where(eq(playlists.id, input.id));
    }),

  delete: protectedProcedure
    .input(z.object({ id: playlistId }))
    .mutation(async ({ ctx, input }) => {
      await getOwnedPlaylist(ctx.db, input.id, ctx.user.id);
      await ctx.db.delete(playlists).where(eq(playlists.id, input.id));
    }),

  addVideo: protectedProcedure
    .input(z.object({ playlistId, videoId }))
    .mutation(async ({ ctx, input }) => {
      await getOwnedPlaylist(ctx.db, input.playlistId, ctx.user.id);
      const video = await ctx.db
        .select({ id: videos.id })
        .from(videos)
        .where(and(eq(videos.id, input.videoId), eq(videos.status, "ready")))
        .get();
      if (!video)
        throw new TRPCError({ code: "NOT_FOUND", message: "Video not found" });

      await ctx.db
        .insert(playlistVideos)
        .values({
          playlistId: input.playlistId,
          videoId: input.videoId,
          position: sql`(select coalesce(max(${playlistVideos.position}), -1) + 1 from ${playlistVideos} where ${playlistVideos.playlistId} = ${input.playlistId})`,
        })
        .onConflictDoNothing();
      await ctx.db
        .update(playlists)
        .set({ updatedAt: new Date() })
        .where(eq(playlists.id, input.playlistId));
    }),

  removeVideo: protectedProcedure
    .input(z.object({ playlistId, videoId }))
    .mutation(async ({ ctx, input }) => {
      await getOwnedPlaylist(ctx.db, input.playlistId, ctx.user.id);
      await ctx.db
        .delete(playlistVideos)
        .where(
          and(
            eq(playlistVideos.playlistId, input.playlistId),
            eq(playlistVideos.videoId, input.videoId),
          ),
        );
    }),

  /** Move a video one step up or down within a playlist. */
  move: protectedProcedure
    .input(z.object({ playlistId, videoId, direction: z.enum(["up", "down"]) }))
    .mutation(async ({ ctx, input }) => {
      await getOwnedPlaylist(ctx.db, input.playlistId, ctx.user.id);
      const items = await ctx.db
        .select({ videoId: playlistVideos.videoId })
        .from(playlistVideos)
        .where(eq(playlistVideos.playlistId, input.playlistId))
        .orderBy(asc(playlistVideos.position));
      const from = items.findIndex((i) => i.videoId === input.videoId);
      const to = input.direction === "up" ? from - 1 : from + 1;
      if (from < 0 || to < 0 || to >= items.length) return;
      const [moved] = items.splice(from, 1);
      items.splice(to, 0, moved!);
      await ctx.db.transaction(async (tx) => {
        for (const [position, item] of items.entries()) {
          await tx
            .update(playlistVideos)
            .set({ position })
            .where(
              and(
                eq(playlistVideos.playlistId, input.playlistId),
                eq(playlistVideos.videoId, item.videoId),
              ),
            );
        }
      });
    }),
});
