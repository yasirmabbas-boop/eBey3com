/**
 * Meilisearch proxy route.
 * Forwards /api/meilisearch/* to Meilisearch so the master key stays server-side.
 */

import type { Express } from "express";
import { checkMeilisearchHealth } from "../services/meilisearch";

const MEILISEARCH_HOST = (process.env.MEILISEARCH_HOST || "http://localhost:7700").replace(/\/$/, "");
const MEILISEARCH_MASTER_KEY = process.env.MEILISEARCH_MASTER_KEY || "";

export function registerMeilisearchRoutes(app: Express): void {
  // Health check is always registered (even without master key — that IS useful diagnostic info)
  app.get("/api/meilisearch/health", async (_req, res) => {
    try {
      const health = await checkMeilisearchHealth();
      const httpStatus = health.status === "ok" ? 200 : health.status === "degraded" ? 200 : 503;
      res.status(httpStatus).json(health);
    } catch (err) {
      res.status(500).json({ status: "down", error: (err as Error).message });
    }
  });

  if (!MEILISEARCH_MASTER_KEY) {
    return;
  }

  app.use("/api/meilisearch", async (req, res) => {
    const path = req.path === "/" ? "" : req.path;
    const search = req.url?.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
    const url = `${MEILISEARCH_HOST}${path}${search}`;

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MEILISEARCH_MASTER_KEY}`,
      };
      const init: RequestInit = {
        method: req.method,
        headers,
      };
      if (req.method !== "GET" && req.method !== "HEAD" && req.body) {
        init.body = JSON.stringify(req.body);
      }

      // Temporary debug logging — remove after diagnosing facet issue
      if (req.method === "POST" && path.includes("multi-search")) {
        const bodyStr = init.body as string;
        const parsed = JSON.parse(bodyStr);
        const facetsSummary = (parsed.queries || []).map((q: any) => ({
          indexUid: q.indexUid,
          facets: q.facets,
          filter: q.filter,
          limit: q.limit,
        }));
        console.log("[Meilisearch proxy] multi-search request:", JSON.stringify(facetsSummary));
      }

      const response = await fetch(url, init);
      const text = await response.text();

      // Temporary debug logging
      if (req.method === "POST" && path.includes("multi-search")) {
        const parsed = JSON.parse(text);
        const resultsSummary = (parsed.results || []).map((r: any) => ({
          indexUid: r.indexUid,
          hits: r.hits?.length ?? 0,
          facetKeys: r.facetDistribution ? Object.keys(r.facetDistribution) : [],
          estimatedTotalHits: r.estimatedTotalHits,
        }));
        console.log("[Meilisearch proxy] multi-search response:", JSON.stringify(resultsSummary));
      }

      res.status(response.status);
      res.set("Content-Type", response.headers.get("Content-Type") || "application/json");
      res.send(text);
    } catch (err) {
      console.error("[Meilisearch proxy] Error:", (err as Error).message);
      res.status(502).json({ error: "Meilisearch proxy error" });
    }
  });
}
