"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  ChevronDownIcon,
  ChevronUpIcon,
  EditIcon,
  PlusIcon,
  TrashIcon,
} from "~/app/_components/icons";
import { Modal } from "~/app/_components/modal";
import { api } from "~/trpc/react";

export type PlaylistFormValues = {
  name: string;
  description: string;
  isPublic: boolean;
};

export function PlaylistForm({
  initial,
  submitLabel,
  pending,
  error,
  onSubmit,
  onCancel,
}: {
  initial?: PlaylistFormValues;
  submitLabel: string;
  pending: boolean;
  error?: string;
  onSubmit: (values: PlaylistFormValues) => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<PlaylistFormValues>(
    initial ?? { name: "", description: "", isPublic: false },
  );
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(values);
      }}
    >
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-zinc-300">Name</span>
        <input
          className="input"
          value={values.name}
          maxLength={100}
          autoFocus
          required
          onChange={(e) => setValues({ ...values, name: e.target.value })}
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-zinc-300">Description</span>
        <textarea
          className="input min-h-20"
          value={values.description}
          maxLength={1000}
          onChange={(e) =>
            setValues({ ...values, description: e.target.value })
          }
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="accent-accent h-4 w-4"
          checked={values.isPublic}
          onChange={(e) => setValues({ ...values, isPublic: e.target.checked })}
        />
        Public (visible on your profile and shareable)
      </label>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="mt-2 flex justify-end gap-2">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={pending || !values.name.trim()}
        >
          {pending ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

export function CreatePlaylistButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const create = api.playlist.create.useMutation({
    onSuccess: ({ id }) => router.push(`/playlists/${id}`),
  });
  return (
    <>
      <button className="btn btn-primary" onClick={() => setOpen(true)}>
        <PlusIcon /> New playlist
      </button>
      {open && (
        <Modal title="New playlist" onClose={() => setOpen(false)}>
          <PlaylistForm
            submitLabel="Create"
            pending={create.isPending}
            error={create.error?.message}
            onSubmit={(v) => create.mutate(v)}
            onCancel={() => setOpen(false)}
          />
        </Modal>
      )}
    </>
  );
}

export function PlaylistOwnerActions({
  playlist,
}: {
  playlist: PlaylistFormValues & { id: string };
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const update = api.playlist.update.useMutation({
    onSuccess: () => {
      setEditing(false);
      router.refresh();
    },
  });
  const del = api.playlist.delete.useMutation({
    onSuccess: () => {
      router.push("/playlists");
      router.refresh();
    },
  });

  return (
    <div className="flex gap-2">
      <button className="btn btn-secondary" onClick={() => setEditing(true)}>
        <EditIcon /> Edit
      </button>
      <button
        className="btn btn-secondary hover:bg-red-600/80"
        disabled={del.isPending}
        onClick={() => {
          if (
            confirm(
              `Delete playlist “${playlist.name}”? Videos are not deleted.`,
            )
          )
            del.mutate({ id: playlist.id });
        }}
      >
        <TrashIcon /> Delete
      </button>
      {editing && (
        <Modal title="Edit playlist" onClose={() => setEditing(false)}>
          <PlaylistForm
            initial={playlist}
            submitLabel="Save"
            pending={update.isPending}
            error={update.error?.message}
            onSubmit={(v) => update.mutate({ id: playlist.id, ...v })}
            onCancel={() => setEditing(false)}
          />
        </Modal>
      )}
    </div>
  );
}

export function PlaylistItemControls({
  playlistId,
  videoId,
  isFirst,
  isLast,
}: {
  playlistId: string;
  videoId: string;
  isFirst: boolean;
  isLast: boolean;
}) {
  const router = useRouter();
  const opts = { onSuccess: () => router.refresh() };
  const move = api.playlist.move.useMutation(opts);
  const remove = api.playlist.removeVideo.useMutation(opts);
  const busy = move.isPending || remove.isPending;
  const btn =
    "grid h-8 w-8 place-items-center rounded-full text-zinc-400 hover:bg-zinc-800 hover:text-white disabled:opacity-30";

  return (
    <div className="flex shrink-0 items-center">
      <button
        className={btn}
        title="Move up"
        disabled={busy || isFirst}
        onClick={() => move.mutate({ playlistId, videoId, direction: "up" })}
      >
        <ChevronUpIcon />
      </button>
      <button
        className={btn}
        title="Move down"
        disabled={busy || isLast}
        onClick={() => move.mutate({ playlistId, videoId, direction: "down" })}
      >
        <ChevronDownIcon />
      </button>
      <button
        className={`${btn} hover:text-red-400`}
        title="Remove from playlist"
        disabled={busy}
        onClick={() => remove.mutate({ playlistId, videoId })}
      >
        <TrashIcon />
      </button>
    </div>
  );
}
