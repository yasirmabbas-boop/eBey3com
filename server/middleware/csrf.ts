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

  // Skip CSRF validation for Bearer token authenticated requests
  // Bearer tokens stored in localStorage are not sent automatically by browsers,
  // so they already provide CSRF protection (attacker can't access the token)
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return next();
  }

  const sessionId = (req.session as any)?.id || req.sessionID;
  
  // If no session exists, skip CSRF validation (might be unauthenticated request)
  // This allows endpoints that don't require auth to work
  if (!sessionId) {
    return next();
  }

  const token = req.headers['x-csrf-token'] as string;
  const sessionToken = tokens.get(sessionId);

  // If session exists but no token provided, require CSRF token
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
