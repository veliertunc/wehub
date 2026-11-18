"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Avatar } from "~/app/_components/avatar";
import {
  CheckIcon,
  DownloadIcon,
  EditIcon,
  GlobeIcon,
  HeartIcon,
  LockIcon,
  PlaylistAddIcon,
  PlusIcon,
  ThumbDownIcon,
  ThumbUpIcon,
  TrashIcon,
} from "~/app/_components/icons";
import { Modal } from "~/app/_components/modal";
import { PlaylistForm } from "~/app/_components/playlist-dialogs";
import { downloadUrl, formatCount } from "~/lib/format";
import { api, type RouterOutputs } from "~/trpc/react";

type Video = NonNullable<RouterOutputs["video"]["byId"]>;

function useRequireLogin(signedIn: boolean) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return (fn: () => void) => () => {
    if (signedIn) return fn();
    const qs = params.toString();
    router.push(
      `/login?next=${encodeURIComponent(pathname + (qs ? `?${qs}` : ""))}`,
    );
  };
}

export function VideoActions({
  id,
  signedIn,
}: {
  id: string;
  signedIn: boolean;
}) {
  const utils = api.useUtils();
  const [video] = api.video.byId.useSuspenseQuery({ id });
  const requireLogin = useRequireLogin(signedIn);
  const [saveOpen, setSaveOpen] = useState(false);

  /** Optimistically patch the cached video, rolling back on error. */
  const optimistic = <V,>(patch: (v: Video, vars: V) => Video) => ({
    onMutate: async (vars: V) => {
      await utils.video.byId.cancel({ id });
      const prev = utils.video.byId.getData({ id });
      utils.video.byId.setData({ id }, (v) => (v ? patch(v, vars) : v));
      return { prev };
    },
    onError: (_e: unknown, _v: V, ctx?: { prev?: Video | null }) => {
      if (ctx?.prev !== undefined) utils.video.byId.setData({ id }, ctx.prev);
    },
    onSettled: () => utils.video.byId.invalidate({ id }),
  });

  const react = api.video.react.useMutation(
    optimistic<{ value: -1 | 0 | 1 }>((v, { value }) => ({
      ...v,
      likes: v.likes - (v.myReaction === 1 ? 1 : 0) + (value === 1 ? 1 : 0),
      dislikes:
        v.dislikes - (v.myReaction === -1 ? 1 : 0) + (value === -1 ? 1 : 0),
      myReaction: value,
    })),
  );
  const setFavorite = api.video.setFavorite.useMutation(
    optimistic<{ favorite: boolean }>((v, { favorite }) => ({
      ...v,
      isFavorite: favorite,
    })),
  );

  if (!video) return null;

  const doReact = (value: 1 | -1) =>
    requireLogin(() =>
      react.mutate({ id, value: video.myReaction === value ? 0 : value }),
    );

  const pill = "btn btn-secondary";

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
      <Link
        href={`/u/${video.author.username}`}
        className="flex items-center gap-3"
      >
        <Avatar name={video.author.username} size={40} />
        <span className="font-semibold">{video.author.username}</span>
      </Link>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex overflow-hidden rounded-full bg-zinc-800">
          <button
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium hover:bg-zinc-700"
            onClick={doReact(1)}
            aria-pressed={video.myReaction === 1}
            title="I like this"
          >
            <ThumbUpIcon filled={video.myReaction === 1} className="text-lg" />
            {formatCount(video.likes)}
          </button>
          <span className="my-2 w-px bg-zinc-600" />
          <button
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium hover:bg-zinc-700"
            onClick={doReact(-1)}
            aria-pressed={video.myReaction === -1}
            title="I dislike this"
          >
            <ThumbDownIcon
              filled={video.myReaction === -1}
              className="text-lg"
            />
            {formatCount(video.dislikes)}
          </button>
        </div>

        <button
          className={`${pill} ${video.isFavorite ? "text-accent" : ""}`}
          onClick={requireLogin(() =>
            setFavorite.mutate({ id, favorite: !video.isFavorite }),
          )}
          aria-pressed={video.isFavorite}
        >
          <HeartIcon filled={video.isFavorite} className="text-lg" />
          {video.isFavorite ? "Favorited" : "Favorite"}
        </button>

        <div className="relative">
          <button
            className={pill}
            onClick={requireLogin(() => setSaveOpen((o) => !o))}
          >
            <PlaylistAddIcon className="text-lg" /> Save
          </button>
          {saveOpen && (
            <SaveToPlaylist videoId={id} onClose={() => setSaveOpen(false)} />
          )}
        </div>

        <a className={pill} href={downloadUrl(id)} download>
          <DownloadIcon className="text-lg" /> Download
        </a>

        {video.isOwner && <OwnerActions video={video} />}
      </div>
    </div>
  );
}

function SaveToPlaylist({
  videoId,
  onClose,
}: {
  videoId: string;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const utils = api.useUtils();
  const { data: playlists, isLoading } = api.playlist.forVideo.useQuery({
    videoId,
  });
  const [creating, setCreating] = useState(false);

  const invalidate = () => utils.playlist.forVideo.invalidate({ videoId });
  const add = api.playlist.addVideo.useMutation({ onSettled: invalidate });
  const remove = api.playlist.removeVideo.useMutation({
    onSettled: invalidate,
  });
  const create = api.playlist.create.useMutation({
    onSuccess: async () => {
      await invalidate();
      setCreating(false);
    },
  });

  useEffect(() => {
    if (creating) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [onClose, creating]);

  const toggle = (playlistId: string, hasVideo: boolean) => {
    // Optimistic checkbox.
    utils.playlist.forVideo.setData({ videoId }, (old) =>
      old?.map((p) =>
        p.id === playlistId ? { ...p, hasVideo: !hasVideo } : p,
      ),
    );
    (hasVideo ? remove : add).mutate({ playlistId, videoId });
  };

  return (
    <div
      ref={ref}
      className="absolute right-0 z-30 mt-2 w-64 rounded-xl border border-zinc-800 bg-zinc-900 p-2 shadow-2xl"
    >
      <p className="px-2 pt-1 pb-2 text-sm font-semibold">Save to…</p>
      <div className="max-h-64 overflow-y-auto">
        {isLoading && (
          <p className="px-2 py-1 text-sm text-zinc-400">Loading…</p>
        )}
        {playlists?.length === 0 && (
          <p className="px-2 py-1 text-sm text-zinc-400">No playlists yet.</p>
        )}
        {playlists?.map((p) => (
          <button
            key={p.id}
            onClick={() => toggle(p.id, p.hasVideo)}
            className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm hover:bg-zinc-800"
          >
            <span
              className={`grid h-4 w-4 shrink-0 place-items-center rounded border ${
                p.hasVideo
                  ? "border-accent bg-accent text-white"
                  : "border-zinc-500"
              }`}
            >
              {p.hasVideo && <CheckIcon className="text-xs" />}
            </span>
            <span className="flex-1 truncate">{p.name}</span>
            {p.isPublic ? (
              <GlobeIcon className="text-zinc-500" />
            ) : (
              <LockIcon className="text-zinc-500" />
            )}
          </button>
        ))}
      </div>
      <button
        className="mt-1 flex w-full items-center gap-3 rounded-lg border-t border-zinc-800 px-2 pt-3 pb-2 text-sm hover:bg-zinc-800"
        onClick={() => setCreating(true)}
      >
        <PlusIcon /> Create new playlist
      </button>
      {creating && (
        <Modal title="New playlist" onClose={() => setCreating(false)}>
          <PlaylistForm
            submitLabel="Create & save"
            pending={create.isPending}
            error={create.error?.message}
            onSubmit={(v) => create.mutate({ ...v, videoId })}
            onCancel={() => setCreating(false)}
          />
        </Modal>
      )}
    </div>
  );
}

function OwnerActions({ video }: { video: Video }) {
  const router = useRouter();
  const utils = api.useUtils();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(video.title);
  const [description, setDescription] = useState(video.description);

  const update = api.video.update.useMutation({
    onSuccess: async () => {
      await utils.video.byId.invalidate({ id: video.id });
      setEditing(false);
      router.refresh();
    },
  });
  const del = api.video.delete.useMutation({
    onSuccess: () => {
      router.push(`/u/${video.author.username}`);
      router.refresh();
    },
  });

  return (
    <>
      <button
        className="btn btn-secondary"
        onClick={() => setEditing(true)}
        title="Edit"
      >
        <EditIcon className="text-lg" />
      </button>
      <button
        className="btn btn-secondary hover:bg-red-600/80"
        title="Delete video"
        disabled={del.isPending}
        onClick={() => {
          if (confirm("Delete this video permanently? This cannot be undone."))
            del.mutate({ id: video.id });
        }}
      >
        <TrashIcon className="text-lg" />
      </button>
      {editing && (
        <Modal title="Edit video" onClose={() => setEditing(false)}>
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              update.mutate({ id: video.id, title, description });
            }}
          >
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-zinc-300">Title</span>
              <input
                className="input"
                value={title}
                maxLength={120}
                required
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-zinc-300">Description</span>
              <textarea
                className="input min-h-32"
                value={description}
                maxLength={5000}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
            {update.error && (
              <p className="text-sm text-red-400">{update.error.message}</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setEditing(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={update.isPending || !title.trim()}
              >
                {update.isPending ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
