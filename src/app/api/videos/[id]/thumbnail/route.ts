import { and, eq } from "drizzle-orm";

import { getUserFromHeaders } from "~/server/auth";
import { db } from "~/server/db";
import { videos } from "~/server/db/schema";
import {
  MAX_THUMB_BYTES,
  ensureUploadDirs,
  thumbnailPath,
} from "~/server/storage";
import { TooLargeError, serveFile, writeBodyToFile } from "~/server/video-file";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx) {
  const { id } = await params;
  const video = await db
    .select({ hasThumbnail: videos.hasThumbnail })
    .from(videos)
    .where(eq(videos.id, id))
    .get();
  if (!video?.hasThumbnail) return new Response("Not found", { status: 404 });
  return serveFile(req, {
    path: thumbnailPath(id),
    contentType: "image/jpeg",
    cacheControl: "public, max-age=86400",
  });
}

/** Upload a JPEG thumbnail (generated client-side from a video frame). */
export async function PUT(req: Request, { params }: Ctx) {
  const { id } = await params;
  const user = await getUserFromHeaders(req.headers);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (req.headers.get("content-type") !== "image/jpeg")
    return Response.json(
      { error: "Thumbnail must be a JPEG" },
      { status: 415 },
    );

  const video = await db.query.videos.findFirst({
    where: and(eq(videos.id, id), eq(videos.userId, user.id)),
  });
  if (!video)
    return Response.json({ error: "Video not found" }, { status: 404 });
  if (!req.body)
    return Response.json({ error: "Missing body" }, { status: 400 });

  await ensureUploadDirs();
  try {
    await writeBodyToFile(req.body, thumbnailPath(video.id), MAX_THUMB_BYTES);
  } catch (err) {
    if (err instanceof TooLargeError)
      return Response.json({ error: err.message }, { status: 413 });
    throw err;
  }
  await db
    .update(videos)
    .set({ hasThumbnail: true })
    .where(eq(videos.id, video.id));
  return Response.json({ ok: true });
}
