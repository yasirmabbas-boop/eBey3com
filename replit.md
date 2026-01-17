# E-بيع (E-Bay Iraq) - Iraqi Auction Marketplace

## Overview

E-بيع is an Arabic-language online auction and marketplace platform designed specifically for the Iraqi market. The platform enables users to buy and sell vintage items, electronics, collectibles, and various goods through both auction-style bidding and fixed-price listings. The application features a modern React frontend with an Express.js backend, PostgreSQL database, and is optimized for right-to-left (RTL) Arabic text display.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **Styling**: Tailwind CSS v4 with shadcn/ui component library
- **UI Components**: Radix UI primitives with custom styling (New York theme)
- **Build Tool**: Vite with custom plugins for Replit integration
- **RTL Support**: Full Arabic language support with RTL layout direction
- **Multilingual**: Arabic and Sorani Kurdish language support with live switching

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ESM modules
- **API Structure**: RESTful endpoints under `/api/*` prefix
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Validation**: Zod with drizzle-zod integration

### Project Structure
```
├── client/           # React frontend application
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Route-based page components
│   │   ├── hooks/        # Custom React hooks
│   │   └── lib/          # Utilities and query client
├── server/           # Express backend
│   ├── index.ts      # Server entry point
│   ├── routes.ts     # API route definitions
│   ├── storage.ts    # Database access layer
│   └── db.ts         # Database connection
├── shared/           # Shared types and schemas
│   └── schema.ts     # Drizzle database schema
└── migrations/       # Database migrations
```

### Database Design
The PostgreSQL database includes tables for:
- **users**: User accounts with verification status, ratings, and authentication
- **listings**: Product listings with auction/fixed-price support
- **bids**: Auction bids tracking
- **watchlist**: User saved items
- **analytics**: Usage tracking
- **messages**: User-to-user communication
- **reviews**: Seller ratings
- **transactions**: Completed purchases
- **categories**: Product categorization

### Key Design Patterns
- **Storage Interface**: Abstract database operations through `IStorage` interface for testability
- **Schema-First**: Drizzle schema serves as single source of truth for types
- **API Validation**: Zod schemas validate all API inputs
- **Component Composition**: shadcn/ui components built on Radix primitives

### Auction Processing System
The platform includes an automated auction processing system (`server/auction-processor.ts`):
- **Background Job**: Runs every 30 seconds to check for ended auctions
- **Grace Period**: 5-second buffer after auction end to handle network latency
- **Winner Detection**: Determines highest bidder and creates pending transaction
- **Notifications**: Sends notifications to winner, seller, and outbid users
- **WebSocket Broadcast**: Real-time UI updates via `auction_end` events
- **No Bids Handling**: Notifies seller if auction ends without bids
- **Error Logging**: Comprehensive logging with timestamps for debugging

### Development vs Production
- Development: Vite dev server with HMR, served through Express middleware
- Production: Static build served from `dist/public`, server bundled with esbuild

### Production Setup
After publishing, the production database is empty. To set up the admin account:

1. Run the seed script in the Shell:
   ```bash
   npx tsx server/seed.ts
   ```

2. This creates the admin account:
   - Username: yabbas25
   - Password: Ss120$JyA
   - Access: /admin dashboard

**Note**: Development and production databases are separate. Data created in development won't appear in production.

### Admin Dashboard
Access the admin panel at `/admin` (admin accounts only):
- **إحصائيات** - Site statistics
- **البلاغات** - Report management
- **المستخدمين** - User management

### Financial System
The platform includes a comprehensive financial system (`server/services/financial-service.ts`):
- **Commission Structure**: 15 free sales per month, then 8% on subsequent sales
- **Hold Period**: 48 hours (2 days) from delivery confirmation before funds are available
- **Wallet Transactions**: Tracks sale earnings, commission fees, shipping deductions
- **Weekly Payouts**: Automated payout summaries for sellers
- **Settlement**: Creates 3 transactions per sale: sale_earning (+), commission_fee (-), shipping_deduction (-)

### Delivery System
Delivery integration with driver cancellation support (`server/services/delivery-service.ts`):
- **Cancellation Reasons**:
  - `no_show` - العميل غير موجود
  - `no_answer` - لا يرد على الهاتف
  - `customer_refused` - العميل رفض الاستلام
  - `customer_return` - العميل طلب الإرجاع
  - `wrong_address` - العنوان خاطئ
  - `inaccessible` - لا يمكن الوصول
  - `damaged_package` - الطرد تالف
- **Webhook Endpoints**:
  - `POST /api/webhooks/delivery` - Status updates from delivery company
  - `POST /api/webhooks/delivery/cancellation` - Driver cancellation events
  - `GET /api/delivery/cancellation-reasons` - Get available cancellation reasons

## External Dependencies

### Database
- **PostgreSQL**: Primary database via `DATABASE_URL` environment variable
- **Drizzle ORM**: Type-safe database queries and migrations

### Frontend Libraries
- **@tanstack/react-query**: Server state management and caching
- **Radix UI**: Accessible component primitives (dialog, dropdown, tabs, etc.)
- **embla-carousel-react**: Touch-friendly carousels
- **react-hook-form**: Form state management with Zod resolver
- **date-fns**: Date formatting utilities

### Backend Libraries
- **express-session**: Session management
- **connect-pg-simple**: PostgreSQL session store
- **multer**: File upload handling (for product images)

### Build Tools
- **Vite**: Frontend bundling with React plugin
- **esbuild**: Server bundling for production
- **Tailwind CSS**: Utility-first styling via @tailwindcss/vite

### Replit-Specific
- **@replit/vite-plugin-runtime-error-modal**: Development error overlay
- **@replit/vite-plugin-cartographer**: Development tooling
- **Custom meta-images plugin**: OpenGraph image handling for deployments

### Despia Native App Integration
The app is built for deployment as a native iOS/Android app via Despia. Key native features implemented:

**Platform Detection** (`client/src/lib/despia.ts`):
- `isDespia()` - Check if running in native app
- `isIOS()` / `isAndroid()` - Platform-specific detection
- `usePlatform()` hook for React components

**Native Features Available**:
- **Haptic Feedback**: `hapticLight()`, `hapticSuccess()`, `hapticError()` - for user interactions
- **Biometric Auth**: `requestBiometricAuth()` - Face ID / Touch ID / Fingerprint
- **Camera Roll**: `saveToPhotos(imageUrl)` - Save images to device
- **Screenshots**: `takeScreenshot()` - Programmatic screenshot
- **Native Share**: `nativeShare({ message, url, title })` - iOS/Android share sheet
- **Local Push**: `scheduleLocalPush(seconds, message, title, url)` - Schedule notifications
- **OneSignal**: `getOneSignalPlayerId()` - Push notification registration
- **Screen Brightness**: `setScreenBrightness('auto' | 'on' | 'off')`
- **Status Bar**: `setStatusBarColor(r, g, b)` - Customize status bar color
- **Spinner**: `showSpinner()` / `hideSpinner()` - Native loading indicator
- **Device Info**: `getDeviceId()`, `getAppVersion()`
- **Settings**: `openAppSettings()` - Open device settings

**Safe Areas** (`client/src/index.css`):
- CSS classes: `.safe-area-top`, `.safe-area-bottom`, `.safe-area-padding`
- CSS variables: `--safe-area-top`, `--safe-area-bottom`, etc.

**Usage Pattern**:
```typescript
import { isDespia, hapticSuccess, saveToPhotos } from '@/lib/despia';
import { usePlatform } from '@/hooks/use-platform';

// In component
const { isNative, platform } = usePlatform();

const handleAction = () => {
  hapticSuccess(); // Triggers haptic on native, no-op on web
  if (isDespia()) {
    saveToPhotos(imageUrl); // Only available in native
  }
};
```