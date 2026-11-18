"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  HeartIcon,
  HomeIcon,
  PlaylistIcon,
  ThumbUpIcon,
  UploadIcon,
  VideoIcon,
} from "~/app/_components/icons";
import { type SessionUser } from "~/server/auth";

export function Sidebar({ user }: { user: SessionUser | null }) {
  const pathname = usePathname();
  if (pathname.startsWith("/watch")) return null; // full-width player

  const links = [
    { href: "/", label: "Home", icon: HomeIcon },
    ...(user
      ? [
          { href: "/favorites", label: "Favorites", icon: HeartIcon },
          { href: "/liked", label: "Liked videos", icon: ThumbUpIcon },
          { href: "/playlists", label: "Playlists", icon: PlaylistIcon },
          {
            href: `/u/${user.username}`,
            label: "Your videos",
            icon: VideoIcon,
          },
          { href: "/upload", label: "Upload", icon: UploadIcon },
        ]
      : []),
  ];

  return (
    <nav className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-56 shrink-0 flex-col gap-1 overflow-y-auto border-r border-zinc-800/60 p-3 lg:flex">
      {links.map(({ href, label, icon: Icon }) => {
        const active =
          href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-4 rounded-lg px-3 py-2 text-sm transition ${
              active
                ? "bg-zinc-800 font-medium text-white"
                : "text-zinc-300 hover:bg-zinc-900 hover:text-white"
            }`}
          >
            <Icon className="text-lg" />
            {label}
          </Link>
        );
      })}
      {!user && (
        <div className="mt-4 rounded-xl border border-zinc-800 p-3 text-sm text-zinc-400">
          Sign in to like videos, save favorites and build playlists.
          <Link href="/login" className="btn btn-secondary mt-3 w-full">
            Sign in
          </Link>
        </div>
      )}
    </nav>
  );
}
