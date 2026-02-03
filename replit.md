# E-بيع (E-Bay Iraq) - Iraqi Auction Marketplace

## Overview
E-بيع is an Arabic-language online auction and marketplace platform tailored for the Iraqi market, enabling users to buy and sell items through auctions and fixed-price listings. It features a modern React frontend with an Express.js backend and a PostgreSQL database, optimized for right-to-left (RTL) Arabic text and supporting both Arabic and Sorani Kurdish. The platform includes a comprehensive financial system with commission structures, hold periods, and automated payouts, along with a sophisticated logistics and bank clearing system to manage payment permissions and returns. It's designed for deployment as a native iOS/Android app via Despia, leveraging native features like haptic feedback, biometric authentication, and push notifications.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack React Query
- **Styling**: Tailwind CSS v4 with shadcn/ui and Radix UI primitives
- **Internationalization**: Full RTL support, Arabic and Sorani Kurdish multilingual capabilities

### Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ESM modules
- **API Structure**: RESTful endpoints
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Validation**: Zod with drizzle-zod

### Database Design
- PostgreSQL database with tables for users, listings, bids, watchlist, analytics, messages, reviews, transactions, categories, payout permissions, and return requests.

### Key Design Patterns
- **Storage Interface**: Abstracted database operations.
- **Schema-First**: Drizzle schema as the single source of truth.
- **API Validation**: Zod schemas for all API inputs.
- **Component Composition**: shadcn/ui components built on Radix primitives.

### Auction Processing System
An automated system running every 30 seconds to manage auction endings, determine winners, handle no-bid scenarios, send notifications, and provide real-time UI updates via WebSockets.

### Financial System
- **Commission**: 15 free sales, then 8% on subsequent sales.
- **Hold Period**: 48 hours post-delivery confirmation.
- **Wallet Transactions**: Tracks earnings, commissions, shipping.
- **Payouts**: Weekly automated payout summaries.

### Logistics and Bank Clearing System
- **Payout Permission State Machine**: `withheld` → `locked` → `cleared` → `blocked` → `paid` to manage seller payouts based on delivery and return status.
- **Zero-on-Refusal Financial Guard**: No financial impact on seller if a buyer refuses delivery.
- **Logistics API**: Endpoints for delivery status updates, confirmations, refusals, returns, and payout permission management.
- **Cron Jobs**: Hourly processing of grace periods and daily checks for overdue debts.

### CSRF Protection & Secure Requests
- Dual-layer authentication with Bearer Tokens (localStorage) and Session Cookies (PostgreSQL store).
- CSRF tokens required for state-changing requests, with Bearer token requests bypassing CSRF validation.
- `secureRequest` helper for authenticated requests, handling token injection, CSRF tokens, and headers.

### Image Upload System
- Optimized eBay-style pipeline for image uploads.
- **Specifications**: Max 7MB, target 1600x1600px, WebP format.
- **Client-side**: Compression (to 2MB, 1600px max, WebP conversion) before upload.
- **Server-side**: Parallel processing, HEIC to WebP conversion, main image and thumbnail generation, parallel upload to object storage.

### Despia Native App Integration
The platform is built for deployment as a native iOS/Android app via Despia, leveraging native features:
- **Platform Detection**: `isDespia()`, `isIOS()`, `isAndroid()`, `usePlatform()` hook.
- **Native Features**: Haptic feedback, biometric authentication, camera roll access, screenshots, native share, local push notifications, OneSignal integration, screen brightness control, status bar customization, native loading spinner, device info, and settings access.
- **Safe Areas**: CSS classes and variables for native app safe area handling.

## External Dependencies

### Database
- **PostgreSQL**: Primary database.
- **Drizzle ORM**: Type-safe queries and migrations.

### Frontend Libraries
- **@tanstack/react-query**: Server state management.
- **Radix UI**: Accessible component primitives.
- **embla-carousel-react**: Carousels.
- **react-hook-form**: Form management with Zod resolver.
- **date-fns**: Date utilities.

### Backend Libraries
- **express-session**: Session management.
- **connect-pg-simple**: PostgreSQL session store.
- **multer**: File upload handling.

### Build Tools
- **Vite**: Frontend bundling.
- **esbuild**: Server bundling.
- **Tailwind CSS**: Styling.

### Replit-Specific
- **@replit/vite-plugin-runtime-error-modal**: Development error overlay.
- **@replit/vite-plugin-cartographer**: Development tooling.
- **Custom meta-images plugin**: OpenGraph image handling.