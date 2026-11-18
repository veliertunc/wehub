import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";

import { CompactVideoCard } from "~/app/_components/video-card";
import { VideoActions } from "~/app/watch/[id]/video-actions";
import { VideoDetails } from "~/app/watch/[id]/video-details";
import { VideoPlayer } from "~/app/watch/[id]/video-player";
import { getCurrentUser } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ list?: string }>;
};

export async function generateMetadata({ params }: Props) {
  const video = await api.video.byId({ id: (await params).id });
  return { title: video?.title ?? "Video not found" };
}

export default async function WatchPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { list } = await searchParams;

  const [video, related, playlist, user] = await Promise.all([
    api.video.byId({ id }),
    api.video.related({ id }),
    list && z.string().uuid().safeParse(list).success
      ? api.playlist.byId({ id: list })
      : Promise.resolve(null),
    getCurrentUser(),
  ]);
  if (!video) notFound();
  void api.video.byId.prefetch({ id });

  const index = playlist ? playlist.videos.findIndex((v) => v.id === id) : -1;
  const next = playlist && index >= 0 ? playlist.videos[index + 1] : undefined;
  const nextHref = next ? `/watch/${next.id}?list=${playlist!.id}` : undefined;

  return (
    <HydrateClient>
      <div className="mx-auto flex max-w-[1700px] flex-col gap-6 xl:flex-row">
        <div className="min-w-0 flex-1">
          <VideoPlayer
            key={video.id}
            videoId={video.id}
            hasThumbnail={video.hasThumbnail}
            nextHref={nextHref}
          />
          <h1 className="mt-4 text-xl font-bold break-words">{video.title}</h1>
          <Suspense>
            <VideoActions id={video.id} signedIn={!!user} />
          </Suspense>
          <VideoDetails id={video.id} />
        </div>

        <aside className="flex w-full flex-col gap-4 xl:w-[400px] xl:shrink-0">
          {playlist && (
            <section className="overflow-hidden rounded-xl border border-zinc-800">
              <header className="bg-zinc-900 px-4 py-3">
                <Link
                  href={`/playlists/${playlist.id}`}
                  className="font-semibold hover:underline"
                >
                  {playlist.name}
                </Link>
                <p className="text-xs text-zinc-400">
                  {playlist.owner.username} · {index + 1} /{" "}
                  {playlist.videos.length}
                </p>
              </header>
              <div className="flex max-h-[420px] flex-col gap-1 overflow-y-auto p-2">
                {playlist.videos.map((v, i) => (
                  <CompactVideoCard
                    key={v.id}
                    video={v}
                    index={i}
                    active={v.id === id}
                    href={`/watch/${v.id}?list=${playlist.id}`}
                  />
                ))}
              </div>
            </section>
          )}
          <section className="flex flex-col gap-2">
            <h2 className="px-1 text-sm font-semibold text-zinc-300">
              Up next
            </h2>
            {related.length === 0 && (
              <p className="px-1 text-sm text-zinc-500">No other videos yet.</p>
            )}
            {related.map((v) => (
              <CompactVideoCard key={v.id} video={v} />
            ))}
          </section>
        </aside>
      </div>
    </HydrateClient>
  );
}
