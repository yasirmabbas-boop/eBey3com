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

  // Middleware to skip static file serving for API routes and object storage routes
  // This ensures express.static doesn't interfere with API routes or /objects/ routes
  app.use((req, res, next) => {
    // Skip static file serving for API routes and object storage routes
    if (req.path.startsWith('/api/') || req.path.startsWith('/objects/')) {
      return next();
    }
    next();
  });

  // Serve static files with long-term caching for assets (images, CSS, JS)
  // Cache-Control: max-age=31536000 (1 year) for better performance
  // express.static will automatically call next() if file not found, allowing SPA routes to work
  app.use(express.static(distPath, {
    maxAge: 31536000, // 1 year in milliseconds
    setHeaders: (res, filePath) => {
      // Only set cache headers for static assets (images, fonts, CSS, JS)
      const ext = path.extname(filePath).toLowerCase();
      if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico', '.css', '.js', '.woff', '.woff2', '.ttf', '.eot'].includes(ext)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    }
  }));

  // Catch-all route: Serve index.html for all non-API routes
  // This allows client-side routing (wouter) to handle /product/:id, /onboarding, /signin, etc.
  // API routes (starting with /api) and object storage routes (/objects/) are handled before this middleware
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
