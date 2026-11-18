import Link from "next/link";

import { GlobeIcon, LockIcon, PlaylistIcon } from "~/app/_components/icons";
import { plural, thumbnailUrl } from "~/lib/format";

export type PlaylistCardData = {
  id: string;
  name: string;
  isPublic: boolean;
  videoCount: number;
  coverVideoId: string | null;
};

export function PlaylistCard({ playlist }: { playlist: PlaylistCardData }) {
  return (
    <Link
      href={`/playlists/${playlist.id}`}
      className="group flex flex-col gap-3"
    >
      <div className="relative aspect-video overflow-hidden rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900">
        {/* stacked-cards effect */}
        <div className="absolute inset-x-3 -top-0 h-2 rounded-t-lg bg-zinc-700/60" />
        {playlist.coverVideoId ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnailUrl(playlist.coverVideoId)}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="grid h-full place-items-center text-4xl text-zinc-600">
            <PlaylistIcon />
          </div>
        )}
        <span className="absolute right-1.5 bottom-1.5 flex items-center gap-1 rounded bg-black/80 px-1.5 py-0.5 text-xs font-medium">
          <PlaylistIcon /> {plural(playlist.videoCount, "video")}
        </span>
      </div>
      <div>
        <h3 className="line-clamp-2 font-medium">{playlist.name}</h3>
        <p className="mt-1 flex items-center gap-1 text-sm text-zinc-400">
          {playlist.isPublic ? <GlobeIcon /> : <LockIcon />}
          {playlist.isPublic ? "Public" : "Private"}
        </p>
      </div>
    </Link>
  );
}
