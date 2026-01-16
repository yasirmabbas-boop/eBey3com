import { Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import fs from "fs";
import path from "path";

const SOCIAL_CRAWLERS = [
  "facebookexternalhit",
  "Facebot",
  "Twitterbot",
  "WhatsApp",
  "TelegramBot",
  "LinkedInBot",
  "Slackbot",
  "Pinterest",
  "Discordbot",
  "Applebot",
];

function isSocialCrawler(userAgent: string): boolean {
  return SOCIAL_CRAWLERS.some((crawler) =>
    userAgent.toLowerCase().includes(crawler.toLowerCase())
  );
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("ar-IQ").format(price) + " د.ع";
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const PRODUCTION_URL = "https://ebey3.com";
const LOGO_URL = "https://ebey3.com/logo.png";

function getBaseUrl(req: Request): string {
  const host = req.get("host") || "";
  if (host.includes("ebey3.com")) {
    return PRODUCTION_URL;
  }
  return `${req.protocol}://${host}`;
}

export async function socialMetaMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const userAgent = req.headers["user-agent"] || "";

  if (!isSocialCrawler(userAgent)) {
    return next();
  }

  // Handle product pages
  const productMatch = req.path.match(/^\/product\/([^/]+)$/);
  // Handle seller profile pages
  const sellerMatch = req.path.match(/^\/seller\/([^/]+)$/);
  
  if (!productMatch && !sellerMatch) {
    return next();
  }

  try {
    const baseUrl = getBaseUrl(req);
    
    // Handle seller profile
    if (sellerMatch) {
      const sellerId = sellerMatch[1];
      const seller = await storage.getUser(sellerId);
      if (!seller) {
        return next();
      }
      
      const sellerUrl = `${baseUrl}/seller/${seller.id}`;
      const sellerName = escapeHtml(seller.displayName || "بائع");
      const rating = seller.rating || 0;
      const ratingStars = "⭐".repeat(Math.round(rating));
      const description = escapeHtml(
        `${ratingStars} تقييم ${rating.toFixed(1)} | متجر ${sellerName} على E-بيع - منصة المزادات العراقية`
      );
      const imageUrl = seller.avatar || `${baseUrl}/favicon.png`;
      
      const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>متجر ${sellerName} - E-بيع</title>
  
  <!-- Open Graph -->
  <meta property="og:type" content="profile" />
  <meta property="og:title" content="متجر ${sellerName}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="${imageUrl}" />
  <meta property="og:url" content="${sellerUrl}" />
  <meta property="og:site_name" content="E-بيع" />
  <meta property="og:locale" content="ar_IQ" />
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="متجر ${sellerName}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${imageUrl}" />
  
  <meta name="description" content="${description}" />
</head>
<body>
  <script>window.location.href = "${sellerUrl}";</script>
  <noscript>
    <meta http-equiv="refresh" content="0;url=${sellerUrl}" />
  </noscript>
  <p>جاري التحويل إلى صفحة البائع...</p>
</body>
</html>`;

      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.send(html);
    }

    // Handle product page
    const productId = productMatch![1];
    const listing = await storage.getListing(productId);
    if (!listing || !listing.sellerId) {
      return next();
    }

    // Get seller info for better description
    const seller = await storage.getUser(listing.sellerId);
    const sellerName = seller?.displayName || "بائع";

    const productUrl = `${baseUrl}/product/${listing.id}`;
    const images = listing.images || [];
    const imageUrl = images[0] || LOGO_URL;
    const price = formatPrice(listing.currentBid || listing.price);
    const isAuction = listing.saleType === "auction";
    const saleTypeText = isAuction ? "🔨 مزاد" : "💰 شراء الآن";

    const title = escapeHtml(listing.title);
    const description = escapeHtml(
      `${saleTypeText} | ${price} | بائع: ${sellerName} | E-بيع - منصة المزادات العراقية`
    );

    const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} - E-بيع</title>
  
  <!-- Open Graph -->
  <meta property="og:type" content="product" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="${imageUrl}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:url" content="${productUrl}" />
  <meta property="og:site_name" content="E-بيع" />
  <meta property="og:locale" content="ar_IQ" />
  <meta property="product:price:amount" content="${listing.currentBid || listing.price}" />
  <meta property="product:price:currency" content="IQD" />
  ${listing.condition ? `<meta property="product:condition" content="${listing.condition}" />` : ""}
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${imageUrl}" />
  <meta name="twitter:site" content="@replit" />
  
  <!-- Price display for messaging apps -->
  <meta name="description" content="${isAuction ? "🏷️ مزاد" : "💰 سعر ثابت"}: ${price} - ${description}" />
</head>
<body>
  <script>window.location.href = "${productUrl}";</script>
  <noscript>
    <meta http-equiv="refresh" content="0;url=${productUrl}" />
  </noscript>
  <p>جاري التحويل إلى صفحة المنتج...</p>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch (error) {
    console.error("Social meta middleware error:", error);
    next();
  }
}
