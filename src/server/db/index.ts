import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import { env } from "~/env";
import * as schema from "./schema";

/**
 * Cache the database connection in development. This avoids creating a new connection on every HMR
 * update.
 */
const globalForDb = globalThis as unknown as {
  client: Client | undefined;
};

function createDbClient() {
  const c = createClient({ url: env.DATABASE_URL });
  // SQLite has foreign key enforcement off by default; turn it on so that
  // ON DELETE CASCADE works (e.g. deleting a video removes its likes).
  void c.execute("PRAGMA foreign_keys = ON");
  return c;
}

export const client = globalForDb.client ?? createDbClient();
if (env.NODE_ENV !== "production") globalForDb.client = client;

export const db = drizzle(client, { schema });
