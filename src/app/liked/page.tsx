import { PageHeader, VideoGrid } from "~/app/_components/video-card";
import { plural } from "~/lib/format";
import { requireUser } from "~/server/auth";
import { api } from "~/trpc/server";

export const metadata = { title: "Liked videos" };

export default async function LikedPage() {
  await requireUser("/liked");
  const videos = await api.video.liked();
  return (
    <div>
      <PageHeader title="Liked videos" subtitle={plural(videos.length, "video")} />
      <VideoGrid videos={videos} empty="Videos you like will show up here." />
    </div>
  );
}
