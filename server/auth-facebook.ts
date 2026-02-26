import passport from "passport";
import { Strategy as FacebookStrategy } from "passport-facebook";
import type { Express } from "express";
import axios from "axios";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import { authStorage } from "./integrations/auth/storage";
import type { User } from "@shared/schema";

// Facebook OAuth - optional for local development (phone/password login still works)
const FB_APP_ID = process.env.FB_APP_ID || "";
const FB_APP_SECRET = process.env.FB_APP_SECRET || "";

if (!FB_APP_ID || !FB_APP_SECRET) {
  console.warn(
    "[Facebook Auth] FB_APP_ID/FB_APP_SECRET not set - Facebook login disabled. Phone/password login still works."
  );
}
// CRITICAL: Use hardcoded production URL - DO NOT change to env var (breaks production)
const FB_CALLBACK_URL = "https://ebey3.com/auth/facebook/callback";

const facebookJwksClient = jwksClient({
  jwksUri: "https://www.facebook.com/.well-known/oauth/openid/jwks",
  cache: true,
  cacheMaxAge: 86400000,
});

function isLimitedLoginJWT(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const header = JSON.parse(Buffer.from(parts[0], "base64url").toString());
    return header.alg === "RS256" && !!header.kid;
  } catch {
    return false;
  }
}

interface FacebookLimitedLoginClaims {
  sub: string;
  name?: string;
  email?: string;
  picture?: string;
  iss: string;
  aud: string;
  exp: number;
  iat: number;
  nonce?: string;
}

async function verifyLimitedLoginToken(token: string): Promise<FacebookLimitedLoginClaims> {
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      (header, callback) => {
        facebookJwksClient.getSigningKey(header.kid!, (err, key) => {
          if (err) return callback(err);
          callback(null, key!.getPublicKey());
        });
      },
      {
        algorithms: ["RS256"],
        audience: FB_APP_ID,
        issuer: "https://www.facebook.com",
      },
      (err, decoded) => {
        if (err) {
          reject(new Error(`Facebook JWT verification failed: ${err.message}`));
        } else {
          resolve(decoded as FacebookLimitedLoginClaims);
        }
      }
    );
  });
}

/**
 * Exchange short-lived Facebook access token (1 hour) for long-lived token (60 days)
 * @param shortLivedToken - The short-lived access token from Facebook OAuth
 * @returns Long-lived access token (60 days)
 */
async function exchangeForLongLivedToken(shortLivedToken: string): Promise<string> {
  try {
    const response = await axios.get("https://graph.facebook.com/v18.0/oauth/access_token", {
      params: {
        grant_type: "fb_exchange_token",
        client_id: FB_APP_ID,
        client_secret: FB_APP_SECRET,
        fb_exchange_token: shortLivedToken,
      },
    });

    if (response.data.error) {
      throw new Error(`Facebook token exchange error: ${response.data.error.message}`);
    }

    if (!response.data.access_token) {
      throw new Error("No access token returned from Facebook token exchange");
    }

    return response.data.access_token;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      throw new Error(`Failed to exchange Facebook token: ${errorMessage}`);
    }
    throw error;
  }
}

/**
 * Setup Facebook OAuth authentication routes and strategy
 */
export function setupFacebookAuth(app: Express): void {
  if (!FB_APP_ID || !FB_APP_SECRET) {
    return; // Skip Facebook auth when credentials not configured (e.g. local dev)
  }

  // Configure Facebook Passport Strategy
  passport.use(
    new FacebookStrategy(
      {
        clientID: FB_APP_ID,
        clientSecret: FB_APP_SECRET,
        callbackURL: FB_CALLBACK_URL,
        scope: ["public_profile", "email"],
        // IMPORTANT: Only use valid Facebook Graph API profile fields
        profileFields: ["id", "first_name", "last_name", "photos", "email"],
      },
      async (accessToken: string, refreshToken: string, profile: any, done: (error: any, user?: Express.User) => void) => {
        try {
          // CRITICAL: Exchange short-lived token for long-lived token FIRST
          const longLivedToken = await exchangeForLongLivedToken(accessToken);

          // Extract profile information
          const facebookId = profile.id;
          const email = profile.emails?.[0]?.value || null;
          
          // Extract name from profile - Facebook returns first_name and last_name in _json
          const firstName = profile._json?.first_name || profile.name?.givenName || "";
          const lastName = profile._json?.last_name || profile.name?.familyName || "";
          
          // Build display name with proper fallbacks
          let displayName = "";
          if (firstName && lastName) {
            displayName = `${firstName} ${lastName}`.trim();
          } else if (firstName) {
            displayName = firstName.trim();
          } else if (lastName) {
            displayName = lastName.trim();
          } else if (email) {
            displayName = email;
          } else {
            displayName = "مستخدم"; // Default fallback
          }
          
          const photoUrl = profile.photos && profile.photos[0] ? profile.photos[0].value : null;
          
          // Profile extracted successfully

          // Generate a unique user ID (use Facebook ID as base, but ensure uniqueness)
          const userId = `fb_${facebookId}`;

          // Upsert user in database
          const user = await authStorage.upsertFacebookUser({
            id: userId,
            email,
            displayName,
            avatar: photoUrl,
            facebookId,
            facebookLongLivedToken: longLivedToken,
          });

          // Return user object compatible with Express.User
          // Passport will serialize this via passport.serializeUser
          return done(null, user as Express.User);
        } catch (error: any) {
          console.error("[Facebook OAuth] Authentication error:", error?.message);
          // Don't expose sensitive error details
          return done(new Error("Failed to authenticate with Facebook"), undefined);
        }
      }
    )
  );

  // Route: Initiate Facebook OAuth flow
  app.get("/auth/facebook", passport.authenticate("facebook"));

  // Route: Handle Facebook OAuth callback
  app.get(
    "/auth/facebook/callback",
    passport.authenticate("facebook", {
      failureRedirect: "/signin?error=facebook_auth_failed",
      session: true,
    }),
    async (req, res) => {
      try {
        // User is now authenticated and in session
        const user = req.user as User;

        if (!user || !user.id) {
          return res.redirect("/signin?error=authentication_failed");
        }

        // CRITICAL: Set userId in session for compatibility with session-based auth checks
        // This ensures getUserIdFromRequest() finds the user via session.userId
        (req.session as any).userId = user.id;
        
        // Save session explicitly to ensure it persists
        await new Promise<void>((resolve, reject) => {
          req.session.save((err) => {
            if (err) {
              console.error("[Facebook Auth] Session save error:", err);
              reject(err);
            } else {
              resolve();
            }
          });
        });

        // Fetch the full user record from database to check for phone and address
        const fullUser = await authStorage.getUser(user.id);

        if (!fullUser) {
          return res.redirect("/signin?error=user_not_found");
        }

        // Generate an authToken for the frontend (same pattern as regular login)
        // This token is used as a fallback for Safari ITP and PWA where cookies may be blocked
        const authToken = crypto.randomBytes(32).toString("hex");
        const tokenExpiresAt = new Date();
        tokenExpiresAt.setDate(tokenExpiresAt.getDate() + 30); // 30 days
        await authStorage.updateUser(user.id, { 
          authToken,
          tokenExpiresAt 
        } as any);

        // Check if user has phone and address
        const hasPhone = fullUser.phone && fullUser.phone.trim() !== "";
        const hasAddress = fullUser.addressLine1 && fullUser.addressLine1.trim() !== "";

        // Determine redirect URL
        const needsOnboarding = !hasPhone || !hasAddress;
        const redirectUrl = needsOnboarding ? `/onboarding?token=${authToken}` : `/?token=${authToken}`;

        // Check if this is a popup (has opener) - send message to parent window
        // Otherwise do regular redirect for non-popup flows
        const responseHtml = `
          <!DOCTYPE html>
          <html>
            <head><title>تسجيل الدخول...</title></head>
            <body>
              <script>
                const authData = {
                  type: "FACEBOOK_LOGIN_SUCCESS",
                  authToken: "${authToken}",
                  needsOnboarding: ${needsOnboarding},
                  redirectUrl: "${redirectUrl}"
                };
                
                if (window.opener) {
                  // Popup mode - message parent and close
                  window.opener.postMessage(authData, window.location.origin);
                  window.close();
                } else {
                  // Regular redirect mode
                  window.location.href = "${redirectUrl}";
                }
              </script>
              <p style="text-align: center; margin-top: 50px; font-family: sans-serif;">
                جاري تسجيل الدخول...
              </p>
            </body>
          </html>
        `;
        res.send(responseHtml);
      } catch (error) {
        console.error("Error in Facebook callback:", error);
        res.redirect("/signin?error=callback_error");
      }
    }
  );

  /**
   * Route: Handle Facebook Data Deletion Callback
   * Required by Meta Platform Policies when users remove app from Facebook
   * @see https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback
   */
  /**
   * Route: Token-based Facebook Login (for Despia Native Apps)
   * Validates Facebook access token from JS SDK and creates session
   * This endpoint is used for in-app login without browser redirects
   */
  app.post("/api/auth/facebook/token", async (req, res) => {
    try {
      const { accessToken, userID } = req.body;

      if (!accessToken || !userID) {
        return res.status(400).json({ error: "Missing accessToken or userID" });
      }

      let facebookId: string;
      let email: string | null = null;
      let displayName: string = "";
      let profilePhoto: string | null = null;
      let longLivedToken: string | null = null;

      if (isLimitedLoginJWT(accessToken)) {
        const claims = await verifyLimitedLoginToken(accessToken);

        facebookId = claims.sub;

        if (facebookId !== userID) {
          console.error("[Facebook Token Auth] JWT sub mismatch");
          return res.status(401).json({ error: "Token user mismatch" });
        }

        displayName = claims.name || "مستخدم";
        email = claims.email || null;
        profilePhoto = claims.picture || null;
        longLivedToken = null;

      } else {
        const verifyResponse = await axios.get(`https://graph.facebook.com/debug_token`, {
          params: {
            input_token: accessToken,
            access_token: `${FB_APP_ID}|${FB_APP_SECRET}`,
          },
        });

        const tokenData = verifyResponse.data.data;

        if (!tokenData.is_valid || tokenData.user_id !== userID) {
          console.error("[Facebook Token Auth] Invalid token");
          return res.status(401).json({ error: "Invalid Facebook token" });
        }

        if (tokenData.app_id !== FB_APP_ID) {
          console.error("[Facebook Token Auth] Token app_id mismatch");
          return res.status(401).json({ error: "Token not for this app" });
        }

        const profileResponse = await axios.get(`https://graph.facebook.com/v18.0/${userID}`, {
          params: {
            fields: "id,first_name,last_name,email,picture.type(large)",
            access_token: accessToken,
          },
        });

        const profile = profileResponse.data;

        longLivedToken = await exchangeForLongLivedToken(accessToken);
        facebookId = profile.id;
        email = profile.email || null;
        const firstName = profile.first_name || "";
        const lastName = profile.last_name || "";
        displayName = `${firstName} ${lastName}`.trim() || "مستخدم";
        profilePhoto = profile.picture?.data?.url || null;
      }

      const user = await authStorage.upsertFacebookUser({
        id: `fb_${facebookId}`,
        facebookId,
        facebookLongLivedToken: longLivedToken || undefined,
        email,
        displayName,
        avatar: profilePhoto,
      });

      if (!user) {
        return res.status(500).json({ error: "Failed to create or find user" });
      }

      (req.session as any).userId = user.id;
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      const authToken = crypto.randomBytes(32).toString("hex");
      const tokenExpiresAt = new Date();
      tokenExpiresAt.setDate(tokenExpiresAt.getDate() + 30);
      await authStorage.updateUser(user.id, { authToken, tokenExpiresAt } as any);

      const fullUser = await authStorage.getUser(user.id);
      const hasPhone = fullUser?.phone && fullUser.phone.trim() !== "";
      const hasAddress = fullUser?.addressLine1 && fullUser.addressLine1.trim() !== "";
      const needsOnboarding = !hasPhone || !hasAddress;

      return res.json({
        success: true,
        authToken,
        needsOnboarding,
        redirectUrl: needsOnboarding ? "/onboarding" : "/",
        user: {
          id: user.id,
          displayName: user.displayName,
          profilePhoto: (user as any).profilePhoto,
        },
      });
    } catch (error) {
      console.error("[Facebook Token Auth] Authentication error");
      return res.status(500).json({ error: "Authentication failed" });
    }
  });

  app.post("/api/facebook/data-deletion-callback", async (req, res) => {
    try {
      // Meta sends signed_request parameter
      const signedRequest = req.body.signed_request;
      
      if (!signedRequest) {
        console.error("[Facebook Data Deletion] No signed_request in body");
        return res.status(400).json({ error: "Missing signed_request" });
      }

      // Parse signed request (format: signature.payload)
      const [signature, payload] = signedRequest.split(".");
      
      if (!signature || !payload) {
        console.error("[Facebook Data Deletion] Invalid signed_request format");
        return res.status(400).json({ error: "Invalid signed_request format" });
      }

      // Decode payload (base64url encoded JSON)
      const decodedPayload = Buffer.from(payload, "base64").toString("utf-8");
      const data = JSON.parse(decodedPayload);

      // Verify signature using HMAC SHA256
      const expectedSignature = crypto
        .createHmac("sha256", FB_APP_SECRET)
        .update(payload)
        .digest("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");

      if (signature !== expectedSignature) {
        console.error("[Facebook Data Deletion] Invalid signature");
        return res.status(401).json({ error: "Invalid signature" });
      }

      // Extract user_id from decoded data
      const facebookUserId = data.user_id;

      if (!facebookUserId) {
        console.error("[Facebook Data Deletion] Invalid request");
        return res.status(400).json({ error: "Missing user_id" });
      }

      // Find user by Facebook ID
      const userId = `fb_${facebookUserId}`;
      const user = await authStorage.getUser(userId);

      if (!user) {
        // Still return success - user might have already been deleted
        const confirmationCode = crypto.randomBytes(16).toString("hex");
        console.log("[Facebook Data Deletion] Deletion request processed, confirmation code:", confirmationCode);
        return res.json({
          url: `https://ebey3.com/deletion/status?id=${confirmationCode}`,
          confirmation_code: confirmationCode,
        });
      }

      // Generate unique deletion request ID
      const deletionId = crypto.randomBytes(16).toString("hex");
      const confirmationCode = crypto.randomBytes(16).toString("hex");

      // Log deletion request (you may want to store this in a deletion queue table)
      console.log("[Facebook Data Deletion] Deletion ID:", deletionId);
      console.log("[Facebook Data Deletion] Confirmation code:", confirmationCode);

      // TODO: Implement actual deletion logic here
      // Options:
      // 1. Mark user for deletion and process in background job
      // 2. Queue deletion task with 30-day timeline
      // 3. Send email notification to user about deletion
      // 4. Log deletion request in audit table
      
      // For now, mark user as pending deletion (you may need to add a field to users table)
      // await authStorage.updateUser(userId, { 
      //   deletionRequested: true, 
      //   deletionRequestedAt: new Date(),
      //   deletionId: deletionId 
      // } as any);

      // Send email notification to security@ebey3.com
      console.log("[Facebook Data Deletion] TODO: Send notification email to security@ebey3.com");

      // Return confirmation URL and code as required by Meta
      return res.json({
        url: `https://ebey3.com/deletion/status?id=${deletionId}`,
        confirmation_code: confirmationCode,
      });
      
    } catch (error) {
      console.error("[Facebook Data Deletion] Error processing callback");
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  /**
   * Route: Check data deletion status
   * Public endpoint for users to check deletion status using confirmation code
   */
  app.get("/deletion/status", (req, res) => {
    const deletionId = req.query.id;
    
    if (!deletionId) {
      return res.status(400).send("Missing deletion ID");
    }

    // TODO: Query deletion status from database
    // For now, return a simple status page
    return res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Data Deletion Status - Ebey3</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
          h1 { color: #2563eb; }
          .status { background: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <h1>Data Deletion Status</h1>
        <div class="status">
          <p><strong>Deletion ID:</strong> ${deletionId}</p>
          <p><strong>Status:</strong> Processing</p>
          <p>Your data deletion request has been received and is being processed. 
          All personal data will be permanently deleted from our systems within 30 days.</p>
        </div>
        <p>If you have any questions, please contact <a href="mailto:security@ebey3.com">security@ebey3.com</a></p>
      </body>
      </html>
    `);
  });
}
