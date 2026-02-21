import { db } from "../server/db";
import { users, type User } from "../shared/schema";
import { like, asc } from "drizzle-orm";
import { authStorage } from "../server/integrations/auth/storage";

type AuditFlags = {
  emailMissing: boolean;
  displayNameDefault: boolean;
  authTokenMissing: boolean;
  lastLoginStale: boolean;
};

function isBlank(value: unknown): boolean {
  return typeof value !== "string" || value.trim().length === 0;
}

function getAuditFlags(user: User, cutoffMs: number): AuditFlags {
  const emailMissing = isBlank(user.email ?? "");
  const displayNameDefault = (user.displayName ?? "").trim() === "مستخدم";
  const authTokenMissing = isBlank(user.authToken ?? "");
  const lastLoginAtMs = user.lastLoginAt ? new Date(user.lastLoginAt as any).getTime() : 0;
  const lastLoginStale = !lastLoginAtMs || lastLoginAtMs < cutoffMs;

  return {
    emailMissing,
    displayNameDefault,
    authTokenMissing,
    lastLoginStale,
  };
}

function isGhost(flags: AuditFlags): boolean {
  return (
    flags.emailMissing ||
    flags.displayNameDefault ||
    flags.authTokenMissing ||
    flags.lastLoginStale
  );
}

async function auditFacebookUsers(): Promise<{
  fbUsers: User[];
  ghostUsers: Array<{ user: User; flags: AuditFlags }>;
  cutoffMs: number;
}> {
  const now = Date.now();
  const cutoffMs = now - 24 * 60 * 60 * 1000;

  const fbUsers = await db
    .select()
    .from(users)
    .where(like(users.id, "fb\\_%"))
    .orderBy(asc(users.id));

  const ghostUsers = fbUsers
    .map((user) => ({ user, flags: getAuditFlags(user, cutoffMs) }))
    .filter(({ flags }) => isGhost(flags));

  return { fbUsers, ghostUsers, cutoffMs };
}

/**
 * Dry-run by default.
 * Repair = clear authToken for users whose `lastLoginAt` is stale (older than 24h or null),
 * so they are forced to re-auth cleanly.
 */
export async function repairGhostUsers(
  ghostUsers: Array<{ user: User; flags: AuditFlags }>,
  options?: { dryRun?: boolean },
): Promise<{ wouldClear: string[]; cleared: string[] }> {
  const dryRun = options?.dryRun ?? true;

  const wouldClear: string[] = [];
  const cleared: string[] = [];

  for (const { user, flags } of ghostUsers) {
    // Only clear tokens that exist AND are attached to stale-login users
    if (!flags.lastLoginStale) continue;
    if (isBlank(user.authToken ?? "")) continue;

    wouldClear.push(user.id);

    if (!dryRun) {
      await authStorage.updateUser(user.id, { authToken: null } as any);
      cleared.push(user.id);
    }
  }

  return { wouldClear, cleared };
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const doRepair = args.has("--repair");
  const dryRun = !doRepair || args.has("--dry-run");

  const { fbUsers, ghostUsers, cutoffMs } = await auditFacebookUsers();

  const counts = {
    emailMissing: 0,
    displayNameDefault: 0,
    authTokenMissing: 0,
    lastLoginStale: 0,
  };

  for (const g of ghostUsers) {
    if (g.flags.emailMissing) counts.emailMissing += 1;
    if (g.flags.displayNameDefault) counts.displayNameDefault += 1;
    if (g.flags.authTokenMissing) counts.authTokenMissing += 1;
    if (g.flags.lastLoginStale) counts.lastLoginStale += 1;
  }

  console.log("=== Facebook Users Audit ===");
  console.log("Total fb_* users:", fbUsers.length);
  console.log("Ghost users:", ghostUsers.length);
  console.log("Criteria counts (ghost users may match multiple):", counts);
  console.log("Stale lastLoginAt cutoff:", new Date(cutoffMs).toISOString());

  if (ghostUsers.length > 0) {
    console.log("\nGhost user IDs:");
    for (const { user, flags } of ghostUsers) {
      const reasons = Object.entries(flags)
        .filter(([, v]) => v)
        .map(([k]) => k)
        .join(",");
      console.log(`- ${user.id} (${reasons})`);
    }
  }

  const { wouldClear, cleared } = await repairGhostUsers(ghostUsers, { dryRun });
  console.log("\n=== Repair (clear stale authToken) ===");
  console.log("Mode:", dryRun ? "DRY RUN" : "APPLY");
  console.log("Would clear authToken for:", wouldClear.length);
  if (wouldClear.length) {
    for (const id of wouldClear) console.log(`- ${id}`);
  }
  if (!dryRun) {
    console.log("Cleared authToken for:", cleared.length);
  } else {
    console.log("No changes applied. Re-run with --repair to apply.");
  }
}

main().catch((err) => {
  console.error("[audit-users] Failed:", err);
  process.exit(1);
});

