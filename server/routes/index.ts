import type { Express } from "express";
import type { Server } from "http";
import { registerAccountRoutes } from "./account";
import { registerProductRoutes } from "./products";
import { registerUsersRoutes } from "./users";

export async function registerRoutes(server: Server, app: Express): Promise<void> {
  registerAccountRoutes(app);
  registerProductRoutes(app);
  registerUsersRoutes(app);
}
