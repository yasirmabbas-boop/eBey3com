import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  // Vite build output goes to dist/public (see vite.config.ts)
  const distPath = path.resolve(__dirname, "..", "dist", "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // Catch-all route: Serve index.html for all non-API routes
  // This allows React Router to handle client-side routing (e.g., /onboarding, /signin, etc.)
  // API routes (starting with /api) are handled before this middleware
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
