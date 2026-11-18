import { CreatePlaylistButton } from "~/app/_components/playlist-dialogs";
import { PlaylistCard } from "~/app/_components/playlist-card";
import { PageHeader } from "~/app/_components/video-card";
import { plural } from "~/lib/format";
import { requireUser } from "~/server/auth";
import { api } from "~/trpc/server";

export const metadata = { title: "Playlists" };

export default async function PlaylistsPage() {
  await requireUser("/playlists");
  const playlists = await api.playlist.mine();
  return (
    <div>
      <PageHeader
        title="Your playlists"
        subtitle={plural(playlists.length, "playlist")}
        action={<CreatePlaylistButton />}
      />
      {playlists.length ? (
        <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {playlists.map((p) => (
            <PlaylistCard key={p.id} playlist={p} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-zinc-800 p-12 text-center text-zinc-400">
          No playlists yet. Create one here, or use “Save” on any video.
        </div>
      )}
    </div>
  );
}
