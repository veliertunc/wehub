"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  loginAction,
  registerAction,
  type AuthFormState,
} from "~/server/auth/actions";

type Field = {
  name: string;
  label: string;
  type: string;
  autoComplete: string;
};

const fields: Record<"login" | "register", Field[]> = {
  login: [
    {
      name: "identifier",
      label: "Username or email",
      type: "text",
      autoComplete: "username",
    },
    {
      name: "password",
      label: "Password",
      type: "password",
      autoComplete: "current-password",
    },
  ],
  register: [
    {
      name: "username",
      label: "Username",
      type: "text",
      autoComplete: "username",
    },
    { name: "email", label: "Email", type: "email", autoComplete: "email" },
    {
      name: "password",
      label: "Password",
      type: "password",
      autoComplete: "new-password",
    },
    {
      name: "confirmPassword",
      label: "Confirm password",
      type: "password",
      autoComplete: "new-password",
    },
  ],
};

export function AuthForm({
  mode,
  next,
}: {
  mode: "login" | "register";
  next?: string;
}) {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    mode === "login" ? loginAction : registerAction,
    {},
  );
  const nextQuery = next ? `?next=${encodeURIComponent(next)}` : "";

  return (
    <div className="mx-auto mt-8 w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 shadow-xl">
      <h1 className="text-2xl font-bold tracking-tight">
        {mode === "login" ? "Welcome back" : "Create your account"}
      </h1>
      <p className="mt-1 text-sm text-zinc-400">
        {mode === "login"
          ? "Sign in to like, favorite and build playlists."
          : "Join WeHub to upload and collect videos."}
      </p>

      <form action={formAction} className="mt-6 flex flex-col gap-4" noValidate>
        {next && <input type="hidden" name="next" value={next} />}
        {fields[mode].map((f) => {
          const error = state.fieldErrors?.[f.name]?.[0];
          return (
            <label key={f.name} className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-zinc-300">{f.label}</span>
              <input
                name={f.name}
                type={f.type}
                autoComplete={f.autoComplete}
                defaultValue={
                  f.type === "password" ? undefined : state.values?.[f.name]
                }
                aria-invalid={!!error}
                className={`input ${error ? "border-red-500" : ""}`}
                required
              />
              {error && <span className="text-xs text-red-400">{error}</span>}
            </label>
          );
        })}

        {state.error && (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="btn btn-primary mt-2 py-2.5"
        >
          {pending
            ? "Please wait…"
            : mode === "login"
              ? "Sign in"
              : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-400">
        {mode === "login" ? (
          <>
            New here?{" "}
            <Link
              href={`/register${nextQuery}`}
              className="text-accent hover:underline"
            >
              Create an account
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link
              href={`/login${nextQuery}`}
              className="text-accent hover:underline"
            >
              Sign in
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
