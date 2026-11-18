"use client";

import { useState } from "react";

import { formatBytes, timeAgo } from "~/lib/format";
import { api } from "~/trpc/react";

export function VideoDetails({ id }: { id: string }) {
  const [video] = api.video.byId.useSuspenseQuery({ id });
  const [expanded, setExpanded] = useState(false);
  if (!video) return null;

  const long =
    video.description.length > 280 || video.description.split("\n").length > 4;

  return (
    <div className="mt-4 rounded-xl bg-zinc-900 p-4 text-sm">
      <p className="font-medium">
        {video.views.toLocaleString()} {video.views === 1 ? "view" : "views"} ·{" "}
        <span title={video.createdAt.toISOString()} suppressHydrationWarning>
          {timeAgo(video.createdAt)}
        </span>
        <span className="text-zinc-400"> · {formatBytes(video.size)}</span>
      </p>
      {video.description ? (
        <>
          <p
            className={`mt-2 break-words whitespace-pre-wrap text-zinc-200 ${
              !expanded && long ? "line-clamp-4" : ""
            }`}
          >
            {video.description}
          </p>
          {long && (
            <button
              className="mt-2 font-medium text-zinc-300 hover:text-white"
              onClick={() => setExpanded((e) => !e)}
            >
              {expanded ? "Show less" : "Show more"}
            </button>
          )}
        </>
      ) : (
        <p className="mt-2 text-zinc-500 italic">No description.</p>
      )}
    </div>
  );
}
