import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { setupFacebookAuth } from "./auth-facebook";
import { setupWebSocket } from "./websocket";
import { startAuctionProcessor } from "./auction-processor";
import { socialMetaMiddleware } from "./social-meta";

const app = express();
const httpServer = createServer(app);

setupWebSocket(httpServer);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    limit: '50mb',
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: '50mb' }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        const responseStr = JSON.stringify(capturedJsonResponse);
        if (responseStr.length > 500) {
          logLine += ` :: [Response: ${responseStr.length} bytes]`;
        } else {
          logLine += ` :: ${responseStr}`;
        }
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await setupAuth(app);
  setupFacebookAuth(app);
  registerAuthRoutes(app);
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Social media meta tag middleware - serve dynamic OG tags for crawlers
  // This middleware only handles specific routes (product/seller pages) and calls next() for others
  app.use(socialMetaMiddleware);

  // IMPORTANT: Setup static file serving or Vite dev server AFTER all API routes
  // This ensures that:
  // 1. API routes (like /api/onboarding) are handled first
  // 2. Client-side routes (like /onboarding) fall through to the catch-all route
  // 3. The catch-all route serves index.html so React Router can handle the route
  if (process.env.NODE_ENV === "production") {
    // Production: Serve static files with catch-all route for SPA routing
    serveStatic(app);
  } else {
    // Development: Use Vite dev server with catch-all route for SPA routing
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // Explicit wildcard route handler as final fallback for client-side routing (production only)
  // In development, Vite's catch-all handler handles all client-side routes
  // This ensures that requests to /onboarding or any other client route return the React app
  if (process.env.NODE_ENV === "production") {
    app.use("*", (req, res) => {
      // Skip API routes - they should have been handled already
      if (req.path.startsWith("/api")) {
        return res.status(404).json({ message: "Not Found" });
      }

      // Production: Serve index.html from dist/public (Vite build output)
      console.log(`[Wildcard Handler] Production: Serving index.html for ${req.path}`);
      const distPath = path.resolve(__dirname, "..", "dist", "public");
      const indexPath = path.resolve(distPath, "index.html");
      
      if (fs.existsSync(indexPath)) {
        return res.sendFile(indexPath);
      } else {
        console.error(`[Wildcard Handler] Production: index.html not found at ${indexPath}`);
        return res.status(404).send("Not Found: index.html not found");
      }
    });
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
      startAuctionProcessor();
    },
  );
})();
