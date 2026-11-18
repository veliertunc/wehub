import { and, eq } from "drizzle-orm";

import { getUserFromHeaders } from "~/server/auth";
import { db } from "~/server/db";
import { videos } from "~/server/db/schema";
import {
  MAX_UPLOAD_BYTES,
  deleteVideoFiles,
  ensureUploadDirs,
  extensionFor,
  videoPath,
} from "~/server/storage";
import { TooLargeError, writeBodyToFile } from "~/server/video-file";

export const runtime = "nodejs";

/**
 * Step 2 of an upload: the raw video file is sent as the request body and
 * streamed to disk (no buffering in memory).
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getUserFromHeaders(req.headers);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const video = await db.query.videos.findFirst({
    where: and(eq(videos.id, id), eq(videos.userId, user.id)),
  });
  if (!video)
    return Response.json({ error: "Video not found" }, { status: 404 });
  if (video.status !== "pending")
    return Response.json({ error: "Video already uploaded" }, { status: 409 });
  if (!req.body)
    return Response.json({ error: "Missing body" }, { status: 400 });

  await ensureUploadDirs();
  const fileName = `${video.id}${extensionFor(video.mimeType, video.originalName)}`;
  try {
    const size = await writeBodyToFile(
      req.body,
      videoPath(fileName),
      Math.min(MAX_UPLOAD_BYTES, video.size),
    );
    await db
      .update(videos)
      .set({ fileName, size, status: "ready" })
      .where(eq(videos.id, video.id));
    return Response.json({ id: video.id });
  } catch (err) {
    // Remove the pending record so it doesn't linger.
    await db.delete(videos).where(eq(videos.id, video.id));
    await deleteVideoFiles(video.id, null);
    if (err instanceof TooLargeError)
      return Response.json({ error: err.message }, { status: 413 });
    console.error("Upload failed", err);
    return Response.json({ error: "Upload failed" }, { status: 500 });
  }
}
