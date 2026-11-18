import path from "node:path";

import { getReadyVideoFile, serveFile } from "~/server/video-file";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/** Downloads the original video file as an attachment named after its title. */
export async function GET(req: Request, { params }: Ctx) {
  const video = await getReadyVideoFile((await params).id);
  if (!video) return new Response("Not found", { status: 404 });
  const base =
    video.title.replace(/[<>:"/\|?*\x00-\x1f]/g, "").trim() || video.id;
  return serveFile(req, {
    path: video.path,
    contentType: video.mimeType,
    download: `${base}${path.extname(video.fileName)}`,
  });
}
