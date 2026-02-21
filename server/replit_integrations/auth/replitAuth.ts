import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { authStorage } from "./storage";

export function getSession() {
  const sessionTtl = 30 * 24 * 60 * 60 * 1000;
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "none" as const,
      maxAge: sessionTtl,
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));
}

export const isAuthenticated: RequestHandler = async (req: any, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    try {
      const user = await authStorage.getUserByAuthToken(token);
      if (user) {
        req.user = user;
        return next();
      }
    } catch (error) {
      console.error("[isAuthenticated] Error looking up token:", error);
    }
  }

  const sessionUserId = (req.session as any)?.userId;
  if (sessionUserId) {
    try {
      const user = await authStorage.getUser(sessionUserId);
      if (user) {
        req.user = user;
        return next();
      }
    } catch (error) {
      console.error("[isAuthenticated] Error looking up session user:", error);
    }
  }

  return res.status(401).json({ message: "Unauthorized" });
};

export const isAuthenticatedUnified: RequestHandler = isAuthenticated;
