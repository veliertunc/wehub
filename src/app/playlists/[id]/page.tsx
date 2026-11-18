import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { GlobeIcon, LockIcon, PlayIcon } from "~/app/_components/icons";
import {
  PlaylistItemControls,
  PlaylistOwnerActions,
} from "~/app/_components/playlist-dialogs";
import { Thumbnail } from "~/app/_components/video-card";
import { formatViews, plural, thumbnailUrl, timeAgo } from "~/lib/format";
import { api } from "~/trpc/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return {};
  const playlist = await api.playlist.byId({ id });
  return { title: playlist?.name ?? "Playlist not found" };
}

export default async function PlaylistPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const playlist = await api.playlist.byId({ id });
  if (!playlist) notFound();
  const first = playlist.videos[0];

  return (
    <div className="flex flex-col gap-8 xl:flex-row xl:items-start">
      <aside className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 p-6 xl:sticky xl:top-20 xl:w-80 xl:shrink-0">
        {playlist.coverVideoId && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnailUrl(playlist.coverVideoId)}
            alt=""
            className="absolute inset-0 -z-0 h-full w-full scale-125 object-cover opacity-25 blur-2xl"
          />
        )}
        <div className="relative">
          {first ? (
            <Link href={`/watch/${first.id}?list=${playlist.id}`}>
              <Thumbnail video={first} />
            </Link>
          ) : (
            <div className="aspect-video rounded-xl bg-zinc-800" />
          )}
          <h1 className="mt-4 text-2xl font-bold break-words">
            {playlist.name}
          </h1>
          <p className="mt-2 text-sm">
            by{" "}
            <Link
              href={`/u/${playlist.owner.username}`}
              className="font-medium hover:underline"
            >
              {playlist.owner.username}
            </Link>
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-zinc-300">
            {playlist.isPublic ? <GlobeIcon /> : <LockIcon />}
            {playlist.isPublic ? "Public" : "Private"} ·{" "}
            {plural(playlist.videoCount, "video")}
          </p>
          {playlist.description && (
            <p className="mt-3 text-sm whitespace-pre-wrap text-zinc-300">
              {playlist.description}
            </p>
          )}
          <div className="mt-5 flex flex-wrap gap-2">
            {first && (
              <Link
                href={`/watch/${first.id}?list=${playlist.id}`}
                className="btn bg-white text-zinc-900 hover:bg-zinc-200"
              >
                <PlayIcon /> Play all
              </Link>
            )}
            {playlist.isOwner && (
              <PlaylistOwnerActions
                playlist={{
                  id: playlist.id,
                  name: playlist.name,
                  description: playlist.description,
                  isPublic: playlist.isPublic,
                }}
              />
            )}
          </div>
        </div>
      </aside>

      <ol className="flex min-w-0 flex-1 flex-col gap-1">
        {playlist.videos.length === 0 && (
          <li className="rounded-2xl border border-dashed border-zinc-800 p-12 text-center text-zinc-400">
            This playlist is empty. Use “Save” on a video to add it here.
          </li>
        )}
        {playlist.videos.map((v, i) => (
          <li
            key={v.id}
            className="group flex items-center gap-3 rounded-xl p-2 hover:bg-zinc-900"
          >
            <span className="w-6 text-center text-sm text-zinc-500">
              {i + 1}
            </span>
            <Link
              href={`/watch/${v.id}?list=${playlist.id}`}
              className="flex min-w-0 flex-1 items-center gap-3"
            >
              <Thumbnail
                video={v}
                className="w-32 shrink-0 rounded-lg sm:w-40"
              />
              <div className="min-w-0">
                <h3 className="line-clamp-2 font-medium">{v.title}</h3>
                <p className="mt-1 text-sm text-zinc-400">
                  {v.author.username} · {formatViews(v.views)} ·{" "}
                  {timeAgo(v.createdAt)}
                </p>
              </div>
            </Link>
            {playlist.isOwner && (
              <PlaylistItemControls
                playlistId={playlist.id}
                videoId={v.id}
                isFirst={i === 0}
                isLast={i === playlist.videos.length - 1}
              />
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
