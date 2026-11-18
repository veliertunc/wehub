import { redirect } from "next/navigation";

import { AuthForm } from "~/app/_components/auth-form";
import { getCurrentUser } from "~/server/auth";

export const metadata = { title: "Create account" };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  if (await getCurrentUser()) redirect(next?.startsWith("/") ? next : "/");
  return <AuthForm mode="register" next={next} />;
}
