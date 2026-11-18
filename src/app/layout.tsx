import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";

import { Navbar } from "~/app/_components/navbar";
import { Sidebar } from "~/app/_components/sidebar";
import { getCurrentUser } from "~/server/auth";
import { TRPCReactProvider } from "~/trpc/react";

export const metadata: Metadata = {
  title: { default: "WeHub", template: "%s · WeHub" },
  description: "Watch, share and collect videos.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();
  return (
    <html lang="en" className={`${geist.variable}`}>
      <body>
        <TRPCReactProvider>
          <Navbar user={user} />
          <div className="flex">
            <Sidebar user={user} />
            <main className="min-w-0 flex-1 px-4 py-6 sm:px-6">{children}</main>
          </div>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
