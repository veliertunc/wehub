import { authRouter } from "~/server/api/routers/auth";
import { playlistRouter } from "~/server/api/routers/playlist";
import { videoRouter } from "~/server/api/routers/video";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  auth: authRouter,
  video: videoRouter,
  playlist: playlistRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.video.list({});
 *       ^? { items, hasMore }
 */
export const createCaller = createCallerFactory(appRouter);
