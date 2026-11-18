import Link from "next/link";
import { notFound } from "next/navigation";

import { Avatar } from "~/app/_components/avatar";
import { PlaylistCard } from "~/app/_components/playlist-card";
import { VideoGrid } from "~/app/_components/video-card";
import { getCurrentUser } from "~/server/auth";
import { plural } from "~/lib/format";
import { api } from "~/trpc/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  return { title: decodeURIComponent((await params).username) };
}

export default async function UserPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const username = decodeURIComponent((await params).username);
  const [data, me] = await Promise.all([
    api.video.byUser({ username }),
    getCurrentUser(),
  ]);
  if (!data) notFound();
  const playlists = await api.playlist.publicByUser({ userId: data.user.id });
  const isMe = me?.id === data.user.id;
  const totalViews = data.videos.reduce((sum, v) => sum + v.views, 0);

  return (
    <div>
      <div className="mb-8 flex items-center gap-5">
        <Avatar name={data.user.username} size={80} />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {data.user.username}
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            {plural(data.videos.length, "video")} ·{" "}
            {plural(totalViews, "total view")} · joined{" "}
            {data.user.createdAt.toLocaleDateString(undefined, {
              month: "long",
              year: "numeric",
            })}
          </p>
          {isMe && (
            <Link href="/upload" className="btn btn-secondary mt-3">
              Upload a video
            </Link>
          )}
        </div>
      </div>

      <h2 className="mb-4 text-lg font-semibold">Videos</h2>
      <VideoGrid
        videos={data.videos}
        empty={isMe ? "You haven't uploaded any videos yet." : "No videos yet."}
      />

      {playlists.length > 0 && (
        <>
          <h2 className="mt-12 mb-4 text-lg font-semibold">Public playlists</h2>
          <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {playlists.map((p) => (
              <PlaylistCard key={p.id} playlist={p} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
