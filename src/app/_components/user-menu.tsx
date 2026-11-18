"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Avatar } from "~/app/_components/avatar";
import {
  HeartIcon,
  LogoutIcon,
  PlaylistIcon,
  ThumbUpIcon,
  VideoIcon,
} from "~/app/_components/icons";
import { type SessionUser } from "~/server/auth";
import { logoutAction } from "~/server/auth/actions";

export function UserMenu({ user }: { user: SessionUser }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const item =
    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
        aria-expanded={open}
        className="rounded-full focus-visible:ring-2 focus-visible:ring-zinc-400"
      >
        <Avatar name={user.username} />
      </button>
      {open && (
        <div
          className="absolute right-0 mt-2 w-60 rounded-xl border border-zinc-800 bg-zinc-900 p-1.5 shadow-2xl"
        >
          <div className="flex items-center gap-3 border-b border-zinc-800 px-3 pt-2 pb-3">
            <Avatar name={user.username} size={36} />
            <div className="min-w-0">
              <p className="truncate font-medium">{user.username}</p>
              <p className="truncate text-xs text-zinc-400">{user.email}</p>
            </div>
          </div>
          <div className="py-1" onClick={() => setOpen(false)}>
            <Link href={`/u/${user.username}`} className={item}>
              <VideoIcon /> Your videos
            </Link>
            <Link href="/favorites" className={item}>
              <HeartIcon /> Favorites
            </Link>
            <Link href="/liked" className={item}>
              <ThumbUpIcon /> Liked videos
            </Link>
            <Link href="/playlists" className={item}>
              <PlaylistIcon /> Playlists
            </Link>
          </div>
          <form action={logoutAction} className="border-t border-zinc-800 pt-1">
            <button type="submit" className={item}>
              <LogoutIcon /> Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
