import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL environment variable is not set. " +
    "For Cloud Run + Cloud SQL, use: postgresql://USER:PASSWORD@/DATABASE?host=/cloudsql/ebey3-67950:us-central1:ebey3-main-db"
  );
}

const isProduction = process.env.NODE_ENV === "production";
const connString = process.env.DATABASE_URL;
const isCloudSqlSocket = connString.includes("/cloudsql/");

// Cloud SQL Unix socket: no SSL. TCP (dev/prod): SSL in production.
const ssl =
  isCloudSqlSocket ? false : isProduction ? { rejectUnauthorized: false } : undefined;

// Lazy pool: no connection attempt at startup. Connects only on first query or when initDb() is called.
const pool = new pg.Pool({
  connectionString: connString,
  ssl,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 60000,
});

// Prevent pool errors from crashing the process
pool.on("error", (err: Error) => {
  console.error("[DB] Pool error (connection lost or idle client error):", err.message);
});

/** Call after server is listening. Ensures extensions exist. Non-blocking; logs errors instead of crashing. */
export async function initDb(): Promise<void> {
  await pool.query("CREATE EXTENSION IF NOT EXISTS pg_trgm").catch((err: Error) => {
    console.warn("[DB] Could not create pg_trgm extension:", err.message);
  });
}

export const db = drizzle(pool, { schema });
