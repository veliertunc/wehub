import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const authRouter = createTRPCRouter({
  /** The signed-in user, or null. */
  me: publicProcedure.query(({ ctx }) => ctx.user),
});
