"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { UploadIcon } from "~/app/_components/icons";
import { formatBytes, formatDuration } from "~/lib/format";
import { api } from "~/trpc/react";

type Meta = { duration: number; thumbnail: Blob | null; previewUrl: string };

/** Loads the file in an off-screen <video> to read its duration and grab a frame. */
function extractMeta(file: File): Promise<Meta> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.src = url;

    let duration = 0;
    const done = (thumbnail: Blob | null) =>
      resolve({ duration, thumbnail, previewUrl: url });

    video.onerror = () =>
      reject(new Error("This video format can't be read by your browser."));
    video.onloadedmetadata = () => {
      duration = Number.isFinite(video.duration) ? video.duration : 0;
      // Seek a little into the video to avoid black first frames.
      video.currentTime = Math.min(duration * 0.2, 3) || 0.1;
    };
    video.onseeked = () => {
      try {
        const w = Math.min(video.videoWidth, 1280);
        const h = Math.round((video.videoHeight / video.videoWidth) * w);
        if (!w || !h) return done(null);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d")?.drawImage(video, 0, 0, w, h);
        canvas.toBlob((blob) => done(blob), "image/jpeg", 0.85);
      } catch {
        done(null);
      }
    };
  });
}

/** PUT with upload progress (fetch has no upload progress events). */
function putWithProgress(
  url: string,
  body: Blob,
  contentType: string,
  onProgress?: (fraction: number) => void,
) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      let message = `Upload failed (${xhr.status})`;
      try {
        message =
          (JSON.parse(xhr.responseText) as { error?: string }).error ?? message;
      } catch {}
      reject(new Error(message));
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(body);
  });
}

export function UploadForm({
  accept,
  maxBytes,
}: {
  accept: string[];
  maxBytes: number;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const create = api.video.create.useMutation();

  useEffect(
    () => () => {
      if (meta) URL.revokeObjectURL(meta.previewUrl);
    },
    [meta],
  );

  async function pick(f: File | undefined) {
    if (!f) return;
    setError(null);
    if (!accept.includes(f.type)) {
      setError(
        `Unsupported format${f.type ? ` (${f.type})` : ""}. Use MP4, WebM, MOV, MKV…`,
      );
      return;
    }
    if (f.size > maxBytes) {
      setError(`File is too large. Maximum is ${formatBytes(maxBytes)}.`);
      return;
    }
    setFile(f);
    setTitle((t) => t || f.name.replace(/\.[^.]+$/, "").slice(0, 120));
    try {
      setMeta(await extractMeta(f));
    } catch {
      // Browser can't decode it (e.g. some MKV/AVI) — still allow upload.
      setMeta({
        duration: 0,
        thumbnail: null,
        previewUrl: URL.createObjectURL(f),
      });
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || progress !== null) return;
    setError(null);
    setProgress(0);
    try {
      const { id } = await create.mutateAsync({
        title,
        description,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        duration: meta?.duration ?? 0,
      });
      if (meta?.thumbnail) {
        await putWithProgress(
          `/api/videos/${id}/thumbnail`,
          meta.thumbnail,
          "image/jpeg",
        ).catch(
          () => undefined, // thumbnail is optional
        );
      }
      await putWithProgress(
        `/api/videos/${id}/upload`,
        file,
        file.type,
        setProgress,
      );
      router.push(`/watch/${id}`);
      router.refresh();
    } catch (err) {
      setProgress(null);
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  }

  const uploading = progress !== null;

  if (!file) {
    return (
      <div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void pick(e.dataTransfer.files[0]);
          }}
          className={`flex w-full flex-col items-center gap-4 rounded-2xl border-2 border-dashed p-16 text-center transition ${
            dragging
              ? "border-accent bg-accent/5"
              : "border-zinc-700 hover:border-zinc-500"
          }`}
        >
          <span className="grid h-20 w-20 place-items-center rounded-full bg-zinc-800 text-4xl text-zinc-300">
            <UploadIcon />
          </span>
          <span className="text-lg font-medium">
            Drag and drop a video file
          </span>
          <span className="text-sm text-zinc-400">
            or click to browse · up to {formatBytes(maxBytes)}
          </span>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={accept.join(",")}
          className="hidden"
          onChange={(e) => void pick(e.target.files?.[0])}
        />
        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-6 md:grid-cols-[1fr_280px]">
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-zinc-300">Title</span>
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            required
            disabled={uploading}
          />
          <span className="self-end text-xs text-zinc-500">
            {title.length}/120
          </span>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-zinc-300">Description</span>
          <textarea
            className="input min-h-40"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={5000}
            placeholder="Tell viewers about your video"
            disabled={uploading}
          />
        </label>

        {error && <p className="text-sm text-red-400">{error}</p>}

        {uploading && (
          <div>
            <div className="mb-1 flex justify-between text-xs text-zinc-400">
              <span>{progress < 1 ? "Uploading…" : "Processing…"}</span>
              <span>{Math.round(progress * 100)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="bg-accent h-full transition-[width]"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={uploading || !title.trim()}
          >
            <UploadIcon /> {uploading ? "Uploading…" : "Publish"}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={uploading}
            onClick={() => {
              setFile(null);
              setMeta(null);
              setError(null);
            }}
          >
            Choose another file
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="overflow-hidden rounded-xl bg-black">
          {meta && (
            <video
              src={meta.previewUrl}
              controls
              muted
              className="aspect-video w-full"
            />
          )}
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs text-zinc-400">
          <dt>File</dt>
          <dd className="truncate text-zinc-200" title={file.name}>
            {file.name}
          </dd>
          <dt>Size</dt>
          <dd className="text-zinc-200">{formatBytes(file.size)}</dd>
          <dt>Duration</dt>
          <dd className="text-zinc-200">
            {meta ? formatDuration(meta.duration) : "…"}
          </dd>
          <dt>Thumbnail</dt>
          <dd className="text-zinc-200">
            {meta ? (meta.thumbnail ? "Generated from video" : "None") : "…"}
          </dd>
        </dl>
      </div>
    </form>
  );
}
