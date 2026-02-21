import 'dotenv/config';

// Fail fast with clear message if Cloud Run required env vars are missing
if (process.env.NODE_ENV === 'production') {
  const required = ['DATABASE_URL', 'SESSION_SECRET'] as const;
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error(
      `[ebey3] FATAL: Cloud Run requires these environment variables: ${missing.join(', ')}. ` +
        'Set them in: Cloud Run > ebey3-backend > Edit & Deploy > Variables & Secrets'
    );
    process.exit(1);
  }
}

import './firebase';
import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import path from "path";
import { registerRoutes } from "./routes/index";
import { serveStatic } from "./static";
import { createServer } from "http";
import { setupAuth, registerAuthRoutes } from "./integrations/auth";
import { setupFacebookAuth } from "./auth-facebook";
import { setupWebSocket } from "./websocket";
import { startAuctionProcessor } from "./auction-processor";
import { socialMetaMiddleware } from "./social-meta";
import { initDb } from "./db";
import { registerOtpRoutes } from "./otp-routes";
import { startOtpCleanupCron } from "./otp-cron";
import { startOfferExpirationCron } from "./offer-cron";
import { startNotificationCleanupCron } from "./notification-cron";
import { startPayoutPermissionCrons } from "./payout-permission-cron";
import * as Sentry from "@sentry/node";

// Initialize Sentry for error tracking
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1, // 10% of transactions for performance monitoring
    integrations: [
      Sentry.httpIntegration(),
      Sentry.expressIntegration(),
    ],
  });
  console.log('✅ Sentry error tracking initialized');
} else {
  console.warn('⚠️ SENTRY_DSN not configured - error tracking disabled');
}

// Environment checks
if (!process.env.VERIFYWAY_TOKEN) {
  console.warn('WARNING: VERIFYWAY_TOKEN is missing - WhatsApp OTP will not work');
}

const app = express();
app.set('trust proxy', 1);
const httpServer = createServer(app);

setupWebSocket(httpServer);

// Enable compression for all responses (should be early in middleware chain)
app.use(compression());

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
  
  // Start offer expiration cron job
  startOfferExpirationCron();
  
  // Start notification cleanup cron job
  startNotificationCleanupCron();
  
  // PHASE 5: Start payout permission cron jobs
  startPayoutPermissionCrons();

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
  if (process.env.NODE_ENV === "development") {
    // In Dev: Vite handles the index.html fallback internally
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  } else {
    // In Prod: We serve static files, then fallback to index.html for SPA
    // Note: serveStatic() already includes the catch-all route, so no need for duplicate
    serveStatic(app);
  }

  // Cloud Run sets PORT; default 8080 for local/dev compatibility.
  const port = parseInt(process.env.PORT || "8080", 10);
  
  httpServer.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`ERROR: Port ${port} is already in use. Please stop the other process or use a different port.`);
      process.exit(1);
    } else {
      throw err;
    }
  });

  httpServer.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
    console.log(`[ebey3] Server is awake and listening on 0.0.0.0:${port}`);
    // DB connection is lazy—init only after server is up so slow Cloud SQL socket mount doesn't crash startup
    setImmediate(() => {
      initDb().catch((err) => console.error("[DB] Init failed:", err.message));
    });
    startAuctionProcessor();
  });
})();
