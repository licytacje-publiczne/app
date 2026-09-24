import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { Auction, ScrapeResult, ScrapeError } from "../../shared/types.js";
import { IAS_CONFIGS, SCRAPE_CONCURRENCY } from "./config.js";
import { scrapeGovpl } from "./platforms/govpl.js";
import { scrapeBip } from "./platforms/bip.js";
import { log } from "./utils.js";
import { mergeAuctions } from "./merge.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Load existing auctions.json if it exists.
 * Returns an empty array if the file doesn't exist or is invalid.
 */
function loadExistingAuctions(outputPath: string): Auction[] {
  if (!existsSync(outputPath)) {
    log("No existing auctions.json found — starting fresh");
    return [];
  }

  try {
    const raw = readFileSync(outputPath, "utf-8");
    const data: ScrapeResult = JSON.parse(raw);
    log(`Loaded ${data.auctions.length} existing auctions from auctions.json`);
    return data.auctions;
  } catch (err) {
    log(`Warning: Failed to parse existing auctions.json — starting fresh: ${err}`);
    return [];
  }
}

async function main() {
  const args = process.argv.slice(2);
  const platformFilter = args.includes("--platform") ? args[args.indexOf("--platform") + 1] : null;
  const iasFilter = args.includes("--ias") ? args[args.indexOf("--ias") + 1] : null;
  const noMerge = args.includes("--no-merge");

  log("=== Licytacje Publiczne Scraper ===");

  const configs = IAS_CONFIGS.filter((c) => {
    if (platformFilter === "govpl" && c.platform !== "govpl") return false;
    if (platformFilter === "bip" && c.platform !== "bip") return false;
    if (
      iasFilter &&
      !c.id.includes(iasFilter) &&
      !c.city.toLowerCase().includes(iasFilter.toLowerCase())
    )
      return false;
    return true;
  });

  const scrapedIasIdentifiers = new Set<string>();
  for (const c of configs) {
    scrapedIasIdentifiers.add(c.id);
    scrapedIasIdentifiers.add(c.city);
  }
  const isPartialScrape = configs.length < IAS_CONFIGS.length;

  log(`Scraping ${configs.length} IAS offices (concurrency: ${SCRAPE_CONCURRENCY})`);
  if (isPartialScrape) {
    log(`Partial scrape — only: ${configs.map((c) => c.id).join(", ")}`);
  }
  if (noMerge) {
    log("--no-merge: will overwrite existing data completely");
  }

  const freshAuctions: Auction[] = [];
  const allErrors: ScrapeError[] = [];

  // Process in batches with concurrency limit
  for (let i = 0; i < configs.length; i += SCRAPE_CONCURRENCY) {
    const batch = configs.slice(i, i + SCRAPE_CONCURRENCY);

    const results = await Promise.allSettled(
      batch.map((config) =>
        config.platform === "govpl" ? scrapeGovpl(config) : scrapeBip(config),
      ),
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        freshAuctions.push(...result.value.auctions);
        allErrors.push(...result.value.errors);
      } else {
        log(`Fatal error: ${result.reason}`);
      }
    }
  }

  // Output path
  const outputDir = resolve(__dirname, "../../data");
  mkdirSync(outputDir, { recursive: true });
  const outputPath = resolve(outputDir, "auctions.json");

  // Merge or overwrite
  let finalAuctions: Auction[];

  if (noMerge) {
    finalAuctions = freshAuctions;
    log(`\n--no-merge: using ${freshAuctions.length} freshly scraped auctions only`);
  } else {
    const existingAuctions = loadExistingAuctions(outputPath);

    if (existingAuctions.length === 0) {
      finalAuctions = freshAuctions;
      log(`\nNo existing data to merge — using ${freshAuctions.length} freshly scraped auctions`);
    } else {
      log(
        `\nMerging ${freshAuctions.length} fresh auctions with ${existingAuctions.length} existing...`,
      );
      finalAuctions = mergeAuctions(existingAuctions, freshAuctions, scrapedIasIdentifiers);

      const archivedCount = finalAuctions.filter((a) => a.archived).length;
      const activeCount = finalAuctions.length - archivedCount;
      log(
        `  Result: ${finalAuctions.length} total (${activeCount} active, ${archivedCount} archived)`,
      );
    }
  }

  // Sort by auction date (soonest first for active, then archived), nulls at end
  finalAuctions.sort((a, b) => {
    // Archived auctions go to the end
    if (a.archived && !b.archived) return 1;
    if (!a.archived && b.archived) return -1;

    if (!a.auctionDate && !b.auctionDate) return 0;
    if (!a.auctionDate) return 1;
    if (!b.auctionDate) return -1;
    return b.auctionDate.localeCompare(a.auctionDate);
  });

  const result: ScrapeResult = {
    auctions: finalAuctions,
    scrapedAt: new Date().toISOString(),
    errors: allErrors,
  };

  writeFileSync(outputPath, JSON.stringify(result, null, 2), "utf-8");

  log(`\n=== Summary ===`);
  log(`Freshly scraped: ${freshAuctions.length}`);
  log(`Total in output: ${finalAuctions.length}`);
  const archivedTotal = finalAuctions.filter((a) => a.archived).length;
  if (archivedTotal > 0) {
    log(`Archived: ${archivedTotal}`);
  }
  log(`Errors: ${allErrors.length}`);
  log(`Output: ${outputPath}`);

  if (allErrors.length > 0) {
    log(`\nErrors:`);
    for (const err of allErrors.slice(0, 20)) {
      log(`  [${err.ias}] ${err.phase}: ${err.message} (${err.url})`);
    }
    if (allErrors.length > 20) {
      log(`  ... and ${allErrors.length - 20} more`);
    }
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
