import type { Express } from "express";
import type { Server } from "http";
import { registerAccountRoutes } from "./account";
import { registerOffersRoutes } from "./offers";
import { registerProductRoutes } from "./products";
import { registerUsersRoutes } from "./users";
import { registerNotificationRoutes } from "./notifications";
import { registerAdminRoutes } from "./admin";
import { registerTransactionsRoutes } from "./transactions";
import { registerCartRoutes } from "./cart";
import { registerMessageRoutes } from "./messages";
import { registerWalletRoutes } from "./wallet";
import { registerReportsRoutes } from "./reports";
import { registerObjectStorageRoutes } from "../replit_integrations/object_storage";
import { registerPushRoutes } from "./push";
import { registerAnalyticsRoutes } from "./analytics";
import { registerLogisticsRoutes } from "./logistics-api";

export async function registerRoutes(server: Server, app: Express): Promise<void> {
  registerObjectStorageRoutes(app);
  registerAccountRoutes(app);
  registerOffersRoutes(app);
  registerProductRoutes(app);
  registerUsersRoutes(app);
  registerNotificationRoutes(app);
  registerPushRoutes(app);
  registerAdminRoutes(app);
  registerTransactionsRoutes(app);
  registerCartRoutes(app);
  registerMessageRoutes(app);
  registerWalletRoutes(app);
  registerReportsRoutes(app);
  registerAnalyticsRoutes(app);
  registerLogisticsRoutes(app); // PHASE 4: Logistics API for delivery partner
}
