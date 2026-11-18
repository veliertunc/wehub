import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto mt-24 max-w-md text-center">
      <p className="text-accent text-6xl font-bold">404</p>
      <h1 className="mt-4 text-2xl font-semibold">
        This page isn&apos;t available
      </h1>
      <p className="mt-2 text-zinc-400">
        The video or playlist may have been removed, made private, or never
        existed.
      </p>
      <Link href="/" className="btn btn-primary mt-6">
        Back to home
      </Link>
    </div>
  );
}
