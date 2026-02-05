import type { Express } from "express";
import { validateCsrfToken } from "../../middleware/csrf";
import { statsRouter } from "./stats";
import { usersRouter } from "./users";
import { listingsRouter } from "./listings";
import { reportsRouter } from "./reports";
import { payoutsRouter } from "./payouts";
import { financialRouter } from "./financial";
import { messagesRouter } from "./messages";
import { searchRouter } from "./search";
import { returnsRouter } from "./returns";
import { templatesRouter } from "./templates";
import { rulesRouter } from "./rules";
import { analyticsRouter } from "./analytics";

export function registerAdminRoutes(app: Express): void {
  // Apply CSRF validation to all admin routes except GET requests
  app.use("/api/admin", validateCsrfToken);

  // Register all feature routers
  app.use("/api/admin", statsRouter);
  app.use("/api/admin", usersRouter);
  app.use("/api/admin", listingsRouter);
  app.use("/api/admin", reportsRouter);
  app.use("/api/admin", payoutsRouter);
  app.use("/api/admin", financialRouter);
  app.use("/api/admin", messagesRouter);
  app.use("/api/admin", searchRouter);
  app.use("/api/admin", returnsRouter);
  app.use("/api/admin", templatesRouter);
  app.use("/api/admin", rulesRouter);
  app.use("/api/admin", analyticsRouter);
}
