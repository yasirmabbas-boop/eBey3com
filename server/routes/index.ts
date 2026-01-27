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
import { registerObjectStorageRoutes } from "../replit_integrations/object_storage";

export async function registerRoutes(server: Server, app: Express): Promise<void> {
  registerObjectStorageRoutes(app);
  registerAccountRoutes(app);
  registerOffersRoutes(app);
  registerProductRoutes(app);
  registerUsersRoutes(app);
  registerNotificationRoutes(app);
  registerAdminRoutes(app);
  registerTransactionsRoutes(app);
  registerCartRoutes(app);
}
