import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// In-memory token storage (can be migrated to Redis for distributed systems)
const tokens = new Map<string, string>();

export function generateCsrfToken(req: Request, res: Response): string {
  const sessionId = (req.session as any)?.id || req.sessionID;
  if (!sessionId) {
    throw new Error('Session ID required for CSRF token generation');
  }
  const token = crypto.randomBytes(32).toString('hex');
  tokens.set(sessionId, token);
  return token;
}

export function validateCsrfToken(req: Request, res: Response, next: NextFunction) {
  // Skip CSRF validation for GET, HEAD, OPTIONS requests
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }

  const sessionId = (req.session as any)?.id || req.sessionID;
  if (!sessionId) {
    return res.status(403).json({ error: 'Session required for this request' });
  }

  const token = req.headers['x-csrf-token'] as string;
  const sessionToken = tokens.get(sessionId);

  if (!token || !sessionToken || token !== sessionToken) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }

  next();
}

// Clean up tokens periodically (optional, for memory management)
setInterval(() => {
  // In production, consider using Redis with TTL instead
  if (tokens.size > 10000) {
    tokens.clear();
  }
}, 60 * 60 * 1000); // Clear every hour if too many tokens
