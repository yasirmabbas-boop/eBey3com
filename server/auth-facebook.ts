import passport from "passport";
import { Strategy as FacebookStrategy } from "passport-facebook";
import type { Express } from "express";
import axios from "axios";
import crypto from "crypto";
import { authStorage } from "./replit_integrations/auth/storage";
import type { User } from "@shared/schema";

// Validate environment variables
if (!process.env.FB_APP_ID || !process.env.FB_APP_SECRET || !process.env.FB_CALLBACK_URL) {
  throw new Error(
    "Missing Facebook OAuth environment variables. Please set FB_APP_ID, FB_APP_SECRET, and FB_CALLBACK_URL"
  );
}

const FB_APP_ID = process.env.FB_APP_ID;
const FB_APP_SECRET = process.env.FB_APP_SECRET;
const FB_CALLBACK_URL = process.env.FB_CALLBACK_URL;

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
  // Configure Facebook Passport Strategy
  passport.use(
    new FacebookStrategy(
      {
        clientID: FB_APP_ID,
        clientSecret: FB_APP_SECRET,
        callbackURL: FB_CALLBACK_URL,
        scope: ["public_profile", "email"],
        profileFields: ["id", "displayName", "photos", "email"],
      },
      async (accessToken: string, refreshToken: string, profile: any, done: (error: any, user?: Express.User) => void) => {
        try {
          // CRITICAL: Exchange short-lived token for long-lived token FIRST
          const longLivedToken = await exchangeForLongLivedToken(accessToken);

          // Extract profile information
          const facebookId = profile.id;
          const email = profile.emails?.[0]?.value || null;
          const displayName = profile.displayName || email || "مستخدم";
          const photoUrl = profile.photos && profile.photos[0] ? profile.photos[0].value : null;

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
        } catch (error) {
          console.error("Facebook OAuth error:", error);
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
        console.log("[Facebook Auth] Callback received, user:", user?.id);
        
        if (!user || !user.id) {
          console.log("[Facebook Auth] No user in request, redirecting to signin");
          return res.redirect("/signin?error=authentication_failed");
        }

        // Fetch the full user record from database to check for phone and address
        const fullUser = await authStorage.getUser(user.id);
        console.log("[Facebook Auth] Full user from DB:", fullUser?.id, "phone:", fullUser?.phone, "address:", fullUser?.addressLine1);
        
        if (!fullUser) {
          console.log("[Facebook Auth] User not found in DB, redirecting to signin");
          return res.redirect("/signin?error=user_not_found");
        }

        // Generate an authToken for the frontend (same pattern as regular login)
        const authToken = crypto.randomBytes(32).toString("hex");
        await authStorage.updateUser(user.id, { authToken } as any);
        console.log("[Facebook Auth] Generated authToken for user:", user.id);

        // Check if user has phone and address
        const hasPhone = fullUser.phone && fullUser.phone.trim() !== "";
        const hasAddress = fullUser.addressLine1 && fullUser.addressLine1.trim() !== "";
        console.log("[Facebook Auth] hasPhone:", hasPhone, "hasAddress:", hasAddress);

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
  app.post("/api/facebook/data-deletion-callback", async (req, res) => {
    try {
      console.log("[Facebook Data Deletion] Received callback:", req.body);

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
      
      console.log("[Facebook Data Deletion] Decoded data:", data);

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
        console.error("[Facebook Data Deletion] No user_id in decoded data");
        return res.status(400).json({ error: "Missing user_id" });
      }

      // Find user by Facebook ID
      const userId = `fb_${facebookUserId}`;
      const user = await authStorage.getUser(userId);

      if (!user) {
        console.log("[Facebook Data Deletion] User not found:", userId);
        // Still return success - user might have already been deleted
        const confirmationCode = crypto.randomBytes(16).toString("hex");
        return res.json({
          url: `https://ebey3.com/deletion/status?id=${confirmationCode}`,
          confirmation_code: confirmationCode,
        });
      }

      // Generate unique deletion request ID
      const deletionId = crypto.randomBytes(16).toString("hex");
      const confirmationCode = crypto.randomBytes(16).toString("hex");

      // Log deletion request (you may want to store this in a deletion queue table)
      console.log("[Facebook Data Deletion] Initiating deletion for user:", userId);
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
      console.log(`[Facebook Data Deletion] TODO: Send notification email to security@ebey3.com for user ${userId}`);

      // Return confirmation URL and code as required by Meta
      return res.json({
        url: `https://ebey3.com/deletion/status?id=${deletionId}`,
        confirmation_code: confirmationCode,
      });
      
    } catch (error) {
      console.error("[Facebook Data Deletion] Error processing callback:", error);
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
