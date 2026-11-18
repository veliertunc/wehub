import { PageHeader, VideoGrid } from "~/app/_components/video-card";
import { plural } from "~/lib/format";
import { requireUser } from "~/server/auth";
import { api } from "~/trpc/server";

export const metadata = { title: "Favorites" };

export default async function FavoritesPage() {
  await requireUser("/favorites");
  const videos = await api.video.favorites();
  return (
    <div>
      <PageHeader title="Favorites" subtitle={plural(videos.length, "video")} />
      <VideoGrid
        videos={videos}
        empty="Tap the heart on a video to add it to your favorites."
      />
    </div>
  );
}
