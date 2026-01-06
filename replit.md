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