import { index, jsonb, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";
import { users } from "../schema";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// Re-export user types from main schema
export type User = typeof users.$inferSelect;
export type UpsertUser = typeof users.$inferInsert;

// Export users for compatibility
export { users };
