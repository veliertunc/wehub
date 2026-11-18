import Link from "next/link";

import { Avatar } from "~/app/_components/avatar";
import {
  formatDuration,
  formatViews,
  thumbnailUrl,
  timeAgo,
} from "~/lib/format";

export type VideoCardData = {
  id: string;
  title: string;
  duration: number;
  views: number;
  hasThumbnail: boolean;
  createdAt: Date;
  author: { id: string; username: string };
};

export function Thumbnail({
  video,
  className = "",
}: {
  video: Pick<VideoCardData, "id" | "hasThumbnail" | "duration">;
  className?: string;
}) {
  return (
    <div
      className={`relative aspect-video overflow-hidden rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 ${className}`}
    >
      {video.hasThumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbnailUrl(video.id)}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
        />
      ) : (
        <div className="grid h-full place-items-center text-3xl text-zinc-600">
          ▶
        </div>
      )}
      {video.duration > 0 && (
        <span className="absolute right-1.5 bottom-1.5 rounded bg-black/80 px-1.5 py-0.5 text-xs font-medium">
          {formatDuration(video.duration)}
        </span>
      )}
    </div>
  );
}

export function VideoCard({
  video,
  href,
}: {
  video: VideoCardData;
  href?: string;
}) {
  const link = href ?? `/watch/${video.id}`;
  return (
    <div className="group flex flex-col gap-3">
      <Link href={link}>
        <Thumbnail video={video} />
      </Link>
      <div className="flex gap-3">
        <Link href={`/u/${video.author.username}`} className="pt-0.5">
          <Avatar name={video.author.username} size={36} />
        </Link>
        <div className="min-w-0">
          <Link href={link}>
            <h3
              className="line-clamp-2 leading-snug font-medium"
              title={video.title}
            >
              {video.title}
            </h3>
          </Link>
          <Link
            href={`/u/${video.author.username}`}
            className="mt-1 block text-sm text-zinc-400 hover:text-zinc-200"
          >
            {video.author.username}
          </Link>
          <p className="text-sm text-zinc-400">
            {formatViews(video.views)} · {timeAgo(video.createdAt)}
          </p>
        </div>
      </div>
    </div>
  );
}

export function CompactVideoCard({
  video,
  href,
  active,
  index,
}: {
  video: VideoCardData;
  href?: string;
  active?: boolean;
  index?: number;
}) {
  return (
    <Link
      href={href ?? `/watch/${video.id}`}
      className={`group flex gap-2 rounded-lg p-1 transition ${active ? "bg-zinc-800" : "hover:bg-zinc-900"}`}
    >
      {index !== undefined && (
        <span className="w-5 shrink-0 self-center text-center text-xs text-zinc-500">
          {active ? "▶" : index + 1}
        </span>
      )}
      <Thumbnail video={video} className="w-40 shrink-0 rounded-lg" />
      <div className="min-w-0 py-0.5">
        <h4 className="line-clamp-2 text-sm leading-snug font-medium">
          {video.title}
        </h4>
        <p className="mt-1 text-xs text-zinc-400">{video.author.username}</p>
        <p className="text-xs text-zinc-400">
          {formatViews(video.views)} · {timeAgo(video.createdAt)}
        </p>
      </div>
    </Link>
  );
}

export function VideoGrid({
  videos,
  empty,
}: {
  videos: VideoCardData[];
  empty?: React.ReactNode;
}) {
  if (!videos.length)
    return (
      <div className="rounded-2xl border border-dashed border-zinc-800 p-12 text-center text-zinc-400">
        {empty ?? "No videos yet."}
      </div>
    );
  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {videos.map((v) => (
        <VideoCard key={v.id} video={v} />
      ))}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
