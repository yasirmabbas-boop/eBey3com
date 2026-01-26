import express, { type Request, Response, NextFunction } from "express";
import path from "path";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { setupFacebookAuth } from "./auth-facebook";
import { setupWebSocket } from "./websocket";
import { startAuctionProcessor } from "./auction-processor";
import { socialMetaMiddleware } from "./social-meta";
import { registerOtpRoutes } from "./otp-routes";
import { startOtpCleanupCron } from "./otp-cron";

// Environment checks
if (!process.env.VERIFYWAY_TOKEN) {
  console.warn('WARNING: VERIFYWAY_TOKEN is missing - WhatsApp OTP will not work');
}

const app = express();
app.set('trust proxy', 1);
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
  
  // Register production OTP routes with security
  registerOtpRoutes(app);
  
  // Start hourly cleanup cron job
  startOtpCleanupCron();

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Social media meta tag middleware - serve dynamic OG tags for crawlers
  // This middleware only handles specific routes (product/seller pages) and calls next() for others
  app.use(socialMetaMiddleware);

  // IMPORTANT: Middleware order is critical
  // Setup static file serving or Vite dev server AFTER all API routes
  if (app.get("env") === "development") {
    // In Dev: Vite handles the index.html fallback internally
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  } else {
    // In Prod: We serve static files, then fallback to index.html for SPA
    serveStatic(app);
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(__dirname, "..", "dist", "public", "index.html"));
    });
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  
  httpServer.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`ERROR: Port ${port} is already in use. Please stop the other process or use a different port.`);
      process.exit(1);
    } else {
      throw err;
    }
  });

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
