import express, { type Express } from "express";
import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function setupVite(server: Server, app: Express) {
  const viteLogger = createLogger();
  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: viteLogger,
    server: {
      middlewareMode: true,
      hmr: { server },
      allowedHosts: true,
    },
    appType: "custom",
  });

  // Use Vite's middleware
  app.use(vite.middlewares);

  // The Fallback Handler: Serves index.html for ANY unknown route
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    // Ignore API routes - let them 404 if not found
    if (url.startsWith("/api")) {
      return next();
    }

    try {
      // 1. Locate the file
      const templatePath = path.resolve(__dirname, "..", "client", "index.html");

      // 2. Read the file
      let template = fs.readFileSync(templatePath, "utf-8");

      // 3. Process it through Vite (Injects the React scripts)
      const appHtml = await vite.transformIndexHtml(url, template);

      // 4. Send it
      console.log(`[Vite] Serving index.html for ${url}`);
      res.status(200).set({ "Content-Type": "text/html" }).end(appHtml);
    } catch (e) {
      // If anything fails, log it clearly
      console.error(`[Vite Error] Could not serve ${url}:`, e);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "..", "dist", "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(`Could not find the build directory: ${distPath}`);
  }
  app.use(express.static(distPath));
  app.use("*", (req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
