"use server";

import { eq, or, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  clearSessionCookie,
  createSession,
  deleteSession,
  getTokenFromHeaders,
  hashPassword,
  setSessionCookie,
  verifyPassword,
} from "~/server/auth";
import { db } from "~/server/db";
import { users } from "~/server/db/schema";
import { headers } from "next/headers";

import { createHash } from "node:crypto";

function sha256Sync(message: string): string {
  return createHash("sha256").update(message).digest("hex");
}

export type AuthFormState = {
  error?: string;
  fieldErrors?: Partial<Record<string, string[]>>;
  values?: Record<string, string>;
};

const registerSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3, "Username must be at least 3 characters")
      .max(32, "Username must be at most 32 characters")
      .regex(
        /^[a-zA-Z0-9_]+$/,
        "Only letters, numbers and underscores are allowed",
      ),
    email: z.string().trim().toLowerCase().email("Enter a valid email"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password is too long"),
    confirmPassword: z.string(),
  })
  .refine((v) => sha256Sync(v.password) === sha256Sync(v.confirmPassword), {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Enter your username or email"),
  password: z.string().min(1, "Enter your password"),
});

/** Only allow same-site relative redirects. */
function safeNext(value: FormDataEntryValue | null) {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export async function registerAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const raw = Object.fromEntries(formData) as Record<string, string>;
  const values = { username: raw.username ?? "", email: raw.email ?? "" };
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors, values };
  }
  const { username, email, password } = parsed.data;

  const existing = await db
    .select({ username: users.username, email: users.email })
    .from(users)
    .where(
      or(
        eq(sql`lower(${users.username})`, username.toLowerCase()),
        eq(users.email, email),
      ),
    )
    .all();
  const fieldErrors: Record<string, string[]> = {};
  if (existing.some((u) => u.username.toLowerCase() === username.toLowerCase()))
    fieldErrors.username = ["Username is already taken"];
  if (existing.some((u) => u.email === email))
    fieldErrors.email = ["An account with this email already exists"];
  if (Object.keys(fieldErrors).length) return { fieldErrors, values };

  const [user] = await db
    .insert(users)
    .values({ username, email, passwordHash: await hashPassword(password) })
    .returning({ id: users.id });
  if (!user) return { error: "Could not create account", values };

  const session = await createSession(user.id);
  await setSessionCookie(session.token, session.expiresAt);
  redirect(safeNext(formData.get("next")));
}

export async function loginAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const raw = Object.fromEntries(formData) as Record<string, string>;
  const values = { identifier: raw.identifier ?? "" };
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors, values };
  }
  const identifier = parsed.data.identifier.toLowerCase();

  const user = await db
    .select({ id: users.id, passwordHash: users.passwordHash })
    .from(users)
    .where(
      or(
        eq(sql`lower(${users.username})`, identifier),
        eq(users.email, identifier),
      ),
    )
    .get();

  if (
    !user ||
    !(await verifyPassword(parsed.data.password, user.passwordHash))
  ) {
    return { error: "Invalid username/email or password", values };
  }

  const session = await createSession(user.id);
  await setSessionCookie(session.token, session.expiresAt);
  redirect(safeNext(formData.get("next")));
}

export async function logoutAction() {
  const token = getTokenFromHeaders(await headers());
  if (token) await deleteSession(token);
  await clearSessionCookie();
  redirect("/");
}
