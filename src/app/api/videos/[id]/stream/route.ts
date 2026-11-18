import { getReadyVideoFile, serveFile } from "~/server/video-file";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/** Streams the video with Range support (used by the <video> player). */
async function handler(req: Request, { params }: Ctx) {
  const video = await getReadyVideoFile((await params).id);
  if (!video) return new Response("Not found", { status: 404 });
  return serveFile(req, { path: video.path, contentType: video.mimeType });
}

export { handler as GET, handler as HEAD };
