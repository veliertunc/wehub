"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { SearchIcon } from "~/app/_components/icons";

export function SearchBox() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = pathname === "/" ? (params.get("q") ?? "") : "";
  const [q, setQ] = useState(current);

  useEffect(() => setQ(current), [current]);

  return (
    <form
      role="search"
      className="flex w-full max-w-xl"
      onSubmit={(e) => {
        e.preventDefault();
        const value = q.trim();
        router.push(value ? `/?q=${encodeURIComponent(value)}` : "/");
      }}
    >
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search videos"
        aria-label="Search videos"
        className="focus:border-accent min-w-0 flex-1 rounded-l-full border border-zinc-700 bg-zinc-900 px-4 py-1.5 text-sm outline-none"
      />
      <button
        type="submit"
        aria-label="Search"
        className="rounded-r-full border border-l-0 border-zinc-700 bg-zinc-800 px-4 hover:bg-zinc-700"
      >
        <SearchIcon />
      </button>
    </form>
  );
}
