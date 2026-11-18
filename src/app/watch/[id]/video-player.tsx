"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { streamUrl, thumbnailUrl } from "~/lib/format";
import { api } from "~/trpc/react";

export function VideoPlayer({
  videoId,
  hasThumbnail,
  nextHref,
}: {
  videoId: string;
  hasThumbnail: boolean;
  nextHref?: string;
}) {
  const router = useRouter();
  const counted = useRef(false);
  const addView = api.video.addView.useMutation();

  // Count a view once per page load, after playback actually starts.
  const onPlay = () => {
    if (counted.current) return;
    counted.current = true;
    addView.mutate({ id: videoId });
  };

  useEffect(() => {
    if (nextHref) router.prefetch(nextHref);
  }, [nextHref, router]);

  return (
    <div className="overflow-hidden rounded-xl bg-black">
      <video
        src={streamUrl(videoId)}
        poster={hasThumbnail ? thumbnailUrl(videoId) : undefined}
        controls
        autoPlay
        playsInline
        preload="metadata"
        onPlay={onPlay}
        onEnded={() => {
          if (nextHref) router.push(nextHref);
        }}
        className="aspect-video max-h-[75vh] w-full bg-black"
      />
    </div>
  );
}
