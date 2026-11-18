import Link from "next/link";

import { PageHeader, VideoGrid } from "~/app/_components/video-card";
import { plural } from "~/lib/format";
import { api } from "~/trpc/server";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const query = q?.trim() ?? "";
  const { items, hasMore } = await api.video.list({
    q: query || undefined,
    page,
  });

  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return s ? `/?${s}` : "/";
  };

  return (
    <div>
      {query && (
        <PageHeader
          title={`Results for “${query}”`}
          subtitle={hasMore ? `${items.length}+ videos` : plural(items.length, "video")}
        />
      )}
      <VideoGrid
        videos={items}
        empty={
          query ? (
            "No videos match your search."
          ) : (
            <>
              No videos yet.{" "}
              <Link href="/upload" className="text-accent hover:underline">
                Upload the first one
              </Link>
              .
            </>
          )
        }
      />
      {(page > 1 || hasMore) && (
        <div className="mt-10 flex justify-center gap-3">
          {page > 1 && (
            <Link href={pageHref(page - 1)} className="btn btn-secondary">
              ← Newer
            </Link>
          )}
          {hasMore && (
            <Link href={pageHref(page + 1)} className="btn btn-secondary">
              Older →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
