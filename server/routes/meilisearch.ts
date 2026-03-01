/**
 * Meilisearch proxy route.
 * Forwards /api/meilisearch/* to Meilisearch so the master key stays server-side.
 */

import type { Express } from "express";

const MEILISEARCH_HOST = (process.env.MEILISEARCH_HOST || "http://localhost:7700").replace(/\/$/, "");
const MEILISEARCH_MASTER_KEY = process.env.MEILISEARCH_MASTER_KEY || "";

export function registerMeilisearchRoutes(app: Express): void {
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

      const response = await fetch(url, init);
      const text = await response.text();
      res.status(response.status);
      res.set("Content-Type", response.headers.get("Content-Type") || "application/json");
      res.send(text);
    } catch (err) {
      console.error("[Meilisearch proxy] Error:", (err as Error).message);
      res.status(502).json({ error: "Meilisearch proxy error" });
    }
  });
}
