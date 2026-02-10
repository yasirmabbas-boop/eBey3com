import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const isProduction = process.env.NODE_ENV === 'production';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction ? { rejectUnauthorized: false } : undefined,
});

pool.query('CREATE EXTENSION IF NOT EXISTS pg_trgm').catch((err: Error) => {
  console.warn('[DB] Could not create pg_trgm extension:', err.message);
});

export const db = drizzle(pool, { schema });
