/**
 * Database Cleanup Script: Merge Duplicate Phone Number Accounts
 * 
 * This script identifies and merges user accounts that share the same phone number.
 * Priority: Keep Facebook-linked accounts > Recent activity > Oldest account
 */

import { db } from "../db";
import { users, transactions, listings, watchlist, bids } from "../../shared/schema";
import { eq, sql, and, isNotNull } from "drizzle-orm";

interface DuplicateGroup {
  phone: string;
  accounts: Array<{
    id: string;
    displayName: string;
    phone: string;
    phoneVerified: boolean;
    facebookId: string | null;
    authProvider: string | null;
    createdAt: Date | null;
    lastActive: Date | null;
    transactionCount: number;
    listingCount: number;
    bidCount: number;
    watchlistCount: number;
  }>;
}

/**
 * Analyze database for duplicate phone numbers
 */
async function analyzeDuplicates(): Promise<DuplicateGroup[]> {
  console.log("🔍 Analyzing database for duplicate phone numbers...\n");

  // Find all phone numbers that appear more than once
  const duplicatePhones = await db
    .select({
      phone: users.phone,
      count: sql<number>`count(*)::int`,
    })
    .from(users)
    .where(isNotNull(users.phone))
    .groupBy(users.phone)
    .having(sql`count(*) > 1`);

  console.log(`Found ${duplicatePhones.length} phone numbers with multiple accounts\n`);

  const duplicateGroups: DuplicateGroup[] = [];

  for (const { phone } of duplicatePhones) {
    if (!phone) continue;

    // Get all accounts with this phone
    const accounts = await db.select().from(users).where(eq(users.phone, phone));

    // Get activity counts for each account
    const accountsWithCounts = await Promise.all(
      accounts.map(async (account) => {
        const [txCount] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(transactions)
          .where(eq(transactions.buyerId, account.id));

        const [listCount] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(listings)
          .where(eq(listings.sellerId, account.id));

        const [bidCount] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(bids)
          .where(eq(bids.userId, account.id));

        const [watchCount] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(watchlist)
          .where(eq(watchlist.userId, account.id));

        return {
          id: account.id,
          displayName: account.displayName,
          phone: account.phone || "",
          phoneVerified: account.phoneVerified || false,
          facebookId: account.facebookId,
          authProvider: account.authProvider,
          createdAt: account.createdAt,
          lastActive: account.lastActive,
          transactionCount: txCount?.count || 0,
          listingCount: listCount?.count || 0,
          bidCount: bidCount?.count || 0,
          watchlistCount: watchCount?.count || 0,
        };
      })
    );

    duplicateGroups.push({
      phone,
      accounts: accountsWithCounts,
    });
  }

  return duplicateGroups;
}

/**
 * Determine which account to keep (primary account)
 */
function selectPrimaryAccount(accounts: DuplicateGroup["accounts"]) {
  // Priority 1: Facebook-linked account
  const facebookAccount = accounts.find((a) => a.facebookId);
  if (facebookAccount) return facebookAccount;

  // Priority 2: Account with most activity
  const accountsByActivity = [...accounts].sort((a, b) => {
    const activityA = a.transactionCount + a.listingCount + a.bidCount;
    const activityB = b.transactionCount + b.listingCount + b.bidCount;
    return activityB - activityA;
  });

  if (accountsByActivity[0].transactionCount + accountsByActivity[0].listingCount + accountsByActivity[0].bidCount > 0) {
    return accountsByActivity[0];
  }

  // Priority 3: Most recently active
  const accountsByRecent = [...accounts].sort((a, b) => {
    const dateA = a.lastActive || a.createdAt || new Date(0);
    const dateB = b.lastActive || b.createdAt || new Date(0);
    return dateB.getTime() - dateA.getTime();
  });

  return accountsByRecent[0];
}

/**
 * Print analysis report
 */
function printAnalysisReport(duplicateGroups: DuplicateGroup[]) {
  console.log("=" .repeat(80));
  console.log("📊 DUPLICATE PHONE NUMBER ANALYSIS REPORT");
  console.log("=".repeat(80));
  console.log();

  let totalDuplicates = 0;
  let totalAccountsToMerge = 0;

  duplicateGroups.forEach((group, index) => {
    totalDuplicates++;
    totalAccountsToMerge += group.accounts.length - 1;

    console.log(`${index + 1}. Phone: ${group.phone} (${group.accounts.length} accounts)`);
    console.log("-".repeat(80));

    const primary = selectPrimaryAccount(group.accounts);

    group.accounts.forEach((account) => {
      const isPrimary = account.id === primary.id;
      const marker = isPrimary ? "✓ KEEP" : "  → merge";
      const fbBadge = account.facebookId ? "[FB]" : "";
      const activity = `TX:${account.transactionCount} LST:${account.listingCount} BID:${account.bidCount}`;

      console.log(
        `  ${marker} ${account.id.slice(0, 8)}... ${fbBadge.padEnd(5)} ${account.displayName.padEnd(20)} | ${activity}`
      );
    });

    console.log();
  });

  console.log("=".repeat(80));
  console.log(`Total phone numbers with duplicates: ${totalDuplicates}`);
  console.log(`Total accounts that need merging: ${totalAccountsToMerge}`);
  console.log("=".repeat(80));
  console.log();
}

/**
 * Merge duplicate accounts
 */
async function mergeDuplicateAccounts(duplicateGroups: DuplicateGroup[], dryRun: boolean = true) {
  console.log(dryRun ? "🔍 DRY RUN MODE - No changes will be made\n" : "⚠️  LIVE MODE - Making actual changes\n");

  for (const group of duplicateGroups) {
    const primary = selectPrimaryAccount(group.accounts);
    const accountsToMerge = group.accounts.filter((a) => a.id !== primary.id);

    console.log(`\n📞 Processing phone: ${group.phone}`);
    console.log(`   Primary account: ${primary.id} (${primary.displayName})`);

    for (const oldAccount of accountsToMerge) {
      console.log(`   Merging ${oldAccount.id} into primary...`);

      if (!dryRun) {
        // Transfer transactions where user was buyer
        await db
          .update(transactions)
          .set({ buyerId: primary.id })
          .where(eq(transactions.buyerId, oldAccount.id));

        // Transfer listings (sales)
        await db
          .update(listings)
          .set({ sellerId: primary.id })
          .where(eq(listings.sellerId, oldAccount.id));

        // Transfer bids
        await db
          .update(bids)
          .set({ userId: primary.id })
          .where(eq(bids.userId, oldAccount.id));

        // Transfer watchlist
        await db
          .update(watchlist)
          .set({ userId: primary.id })
          .where(eq(watchlist.userId, oldAccount.id));

        // Mark old account as merged (we'll add a field for this)
        await db
          .update(users)
          .set({ 
            phone: null, // Remove phone to avoid conflicts
            phoneVerified: false,
            displayName: `[MERGED] ${oldAccount.displayName}`,
          })
          .where(eq(users.id, oldAccount.id));

        console.log(`   ✓ Merged ${oldAccount.id}`);
      } else {
        console.log(`   [DRY RUN] Would merge ${oldAccount.id}`);
      }
    }
  }

  console.log(dryRun ? "\n✓ Dry run complete. Run with --live to apply changes." : "\n✓ Merge complete!");
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes("--live");
  const analyzeOnly = args.includes("--analyze");

  try {
    const duplicateGroups = await analyzeDuplicates();

    if (duplicateGroups.length === 0) {
      console.log("✓ No duplicate phone numbers found! Database is clean.");
      process.exit(0);
    }

    printAnalysisReport(duplicateGroups);

    if (analyzeOnly) {
      console.log("Analysis complete. Use --live flag to apply changes.");
      process.exit(0);
    }

    // Prompt for confirmation if live mode
    if (!dryRun) {
      console.log("⚠️  WARNING: You are about to merge accounts in LIVE mode!");
      console.log("   This will modify the database permanently.");
      console.log("   Make sure you have a backup before proceeding.");
      console.log("\n   Press Ctrl+C to cancel, or wait 5 seconds to continue...\n");
      
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    await mergeDuplicateAccounts(duplicateGroups, dryRun);

  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().then(() => process.exit(0));
}

export { analyzeDuplicates, mergeDuplicateAccounts };
