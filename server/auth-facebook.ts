import passport from "passport";
import { Strategy as FacebookStrategy } from "passport-facebook";
import type { Express } from "express";
import axios from "axios";
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
        profileFields: ["id", "emails", "name", "displayName", "photos"],
      },
      async (accessToken: string, refreshToken: string, profile: any, done: (error: any, user?: Express.User) => void) => {
        try {
          // CRITICAL: Exchange short-lived token for long-lived token FIRST
          const longLivedToken = await exchangeForLongLivedToken(accessToken);

          // Extract profile information
          const facebookId = profile.id;
          const email = profile.emails?.[0]?.value || null;
          const displayName =
            profile.displayName ||
            (profile.name ? `${profile.name.givenName || ""} ${profile.name.familyName || ""}`.trim() : null) ||
            email ||
            "مستخدم";
          const avatar = profile.photos?.[0]?.value || null;

          // Generate a unique user ID (use Facebook ID as base, but ensure uniqueness)
          const userId = `fb_${facebookId}`;

          // Upsert user in database
          const user = await authStorage.upsertFacebookUser({
            id: userId,
            email,
            displayName,
            avatar,
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
        
        if (!user || !user.id) {
          return res.redirect("/signin?error=authentication_failed");
        }

        // Fetch the full user record from database to check for phone and address
        const fullUser = await authStorage.getUser(user.id);
        
        if (!fullUser) {
          return res.redirect("/signin?error=user_not_found");
        }

        // Check if user has phone and address
        const hasPhone = fullUser.phone && fullUser.phone.trim() !== "" && !fullUser.phone.startsWith("fb_");
        const hasAddress = fullUser.addressLine1 && fullUser.addressLine1.trim() !== "";

        // Redirect to onboarding if data is missing, otherwise to home
        if (!hasPhone || !hasAddress) {
          return res.redirect("/onboarding");
        }

        // User has all required data, redirect to home
        res.redirect("/");
      } catch (error) {
        console.error("Error in Facebook callback:", error);
        res.redirect("/signin?error=callback_error");
      }
    }
  );
}
