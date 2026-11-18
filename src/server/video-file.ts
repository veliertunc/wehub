import "server-only";

import { createReadStream, createWriteStream } from "node:fs";
import { rename, rm, stat } from "node:fs/promises";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { type ReadableStream as NodeWebReadableStream } from "node:stream/web";
import { and, eq } from "drizzle-orm";

import { db } from "~/server/db";
import { videos } from "~/server/db/schema";
import { videoPath } from "~/server/storage";

export class TooLargeError extends Error {}

/** Streams a request body to `dest`, aborting if it exceeds `maxBytes`. */
export async function writeBodyToFile(
  body: ReadableStream<Uint8Array>,
  dest: string,
  maxBytes: number,
) {
  const tmp = `${dest}.part`;
  let bytes = 0;
  const limiter = new Transform({
    transform(chunk: Buffer, _enc, cb) {
      bytes += chunk.length;
      if (bytes > maxBytes) cb(new TooLargeError("File is too large"));
      else cb(null, chunk);
    },
  });
  try {
    await pipeline(
      Readable.fromWeb(body as NodeWebReadableStream<Uint8Array>),
      limiter,
      createWriteStream(tmp),
    );
    await rename(tmp, dest);
    return bytes;
  } catch (err) {
    await rm(tmp, { force: true });
    throw err;
  }
}

export async function getReadyVideoFile(id: string) {
  const video = await db
    .select({
      id: videos.id,
      title: videos.title,
      fileName: videos.fileName,
      mimeType: videos.mimeType,
    })
    .from(videos)
    .where(and(eq(videos.id, id), eq(videos.status, "ready")))
    .get();
  if (!video?.fileName) return null;
  return {
    ...video,
    fileName: video.fileName,
    path: videoPath(video.fileName),
  };
}

function contentDisposition(type: "inline" | "attachment", filename: string) {
  const ascii = filename.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return `${type}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

const toWeb = (stream: Readable) =>
  Readable.toWeb(stream) as unknown as ReadableStream<Uint8Array>;

/**
 * Serves a file with HTTP Range support so the browser can seek, and an
 * optional `Content-Disposition: attachment` for downloads.
 */
export async function serveFile(
  req: Request,
  opts: {
    path: string;
    contentType: string;
    download?: string;
    cacheControl?: string;
  },
) {
  let size: number;
  try {
    size = (await stat(opts.path)).size;
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const headers = new Headers({
    "Content-Type": opts.contentType,
    "Accept-Ranges": "bytes",
    "Cache-Control": opts.cacheControl ?? "private, max-age=3600",
    "X-Content-Type-Options": "nosniff",
  });
  if (opts.download) {
    headers.set(
      "Content-Disposition",
      contentDisposition("attachment", opts.download),
    );
  }

  const range = req.headers.get("range");
  const match = range ? /^bytes=(\d*)-(\d*)$/.exec(range.trim()) : null;
  if (range && match) {
    let start: number;
    let end: number;
    if (match[1] === "" && match[2] !== "") {
      // Suffix range: last N bytes.
      start = Math.max(size - Number(match[2]), 0);
      end = size - 1;
    } else {
      start = Number(match[1]);
      end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
    }
    if (Number.isNaN(start) || start >= size || start > end) {
      headers.set("Content-Range", `bytes */${size}`);
      return new Response(null, { status: 416, headers });
    }
    headers.set("Content-Range", `bytes ${start}-${end}/${size}`);
    headers.set("Content-Length", String(end - start + 1));
    if (req.method === "HEAD")
      return new Response(null, { status: 206, headers });
    return new Response(toWeb(createReadStream(opts.path, { start, end })), {
      status: 206,
      headers,
    });
  }

  headers.set("Content-Length", String(size));
  if (req.method === "HEAD")
    return new Response(null, { status: 200, headers });
  return new Response(toWeb(createReadStream(opts.path)), {
    status: 200,
    headers,
  });
}
