import type { Request, Response, NextFunction } from "express";
import { getUserIdFromRequest } from "../shared";
import { storage } from "../../storage";

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) {
    return res.status(401).json({ error: "غير مسجل الدخول" });
  }
  
  const user = await storage.getUser(userId);
  if (!user || !user.isAdmin) {
    return res.status(403).json({ error: "غير مصرح لك بالوصول" });
  }
  
  (req as any).adminUser = user;
  next();
}
