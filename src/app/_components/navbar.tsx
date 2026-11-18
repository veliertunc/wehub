import Link from "next/link";
import { Suspense } from "react";

import { UploadIcon } from "~/app/_components/icons";
import { SearchBox } from "~/app/_components/search-box";
import { UserMenu } from "~/app/_components/user-menu";
import { type SessionUser } from "~/server/auth";

export function Navbar({ user }: { user: SessionUser | null }) {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-zinc-800/80 bg-zinc-950/90 px-4 backdrop-blur sm:px-6">
      <Link
        href="/"
        className="flex shrink-0 items-center gap-2 font-bold tracking-tight"
      >
        <span className="bg-accent grid h-7 w-9 place-items-center rounded-lg text-xs text-white">
          ▶
        </span>
        <span className="hidden text-lg sm:inline">WeHub</span>
      </Link>

      <div className="flex flex-1 justify-center">
        <Suspense>
          <SearchBox />
        </Suspense>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {user ? (
          <>
            <Link
              href="/upload"
              className="btn btn-secondary"
              title="Upload video"
            >
              <UploadIcon className="text-lg" />
              <span className="hidden md:inline">Upload</span>
            </Link>
            <UserMenu user={user} />
          </>
        ) : (
          <>
            <Link href="/login" className="btn btn-ghost">
              Sign in
            </Link>
            <Link
              href="/register"
              className="btn btn-primary hidden sm:inline-flex"
            >
              Sign up
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
