# Reserve Price (Minimum Price) Feature for Auctions

## Overview
The reserve price feature allows sellers to set a minimum price that must be met for an auction to result in a sale. If bidding doesn't reach this threshold, the auction ends without a sale.

## Implementation Details

### Database Changes
- **Migration**: `migrations/0006_add_reserve_price.sql`
- **New Column**: `reserve_price` (integer, nullable) added to `listings` table
- **Schema**: Updated `shared/schema.ts` to include `reservePrice` field

### Backend Changes

#### 1. Routes (`server/routes.ts`)
- **POST /api/listings**: 
  - Accepts `reservePrice` in request body
  - Validates that reserve price >= start price
  - Stores reserve price in database

- **PATCH /api/listings/:id**:
  - Accepts `reservePrice` updates
  - Validates reserve price >= start price
  - Handles null/empty values

#### 2. Auction Processor (`server/auction-processor.ts`)
- **Reserve Price Check**: When an auction ends, checks if highest bid meets reserve price
- **If Reserve Not Met**:
  - Auction ends without sale
  - Listing marked as inactive
  - Seller notified that reserve wasn't met
  - All bidders notified that auction ended without sale
  - No transaction created
- **If Reserve Met** (or no reserve set):
  - Normal auction completion flow
  - Winner gets the item
  - Transaction created

### Frontend Changes

#### 1. Sell Page (`client/src/pages/sell.tsx`)
- **Reserve Price Toggle**: Checkbox to enable reserve price
- **Reserve Price Input**: Number input for entering minimum price
- **Validation**: Ensures reserve price >= start price
- **Edit Mode**: Properly loads existing reserve price when editing
- **Data Submission**: Sends reserve price to backend

#### 2. Sell Wizard (`client/src/pages/sell-wizard.tsx`)
- Already had reserve price field implemented
- Properly sends reserve price data to backend

## User Flow

### For Sellers:
1. When creating an auction, seller can check "Reserve Price" option
2. Enter minimum acceptable price
3. Reserve price must be >= starting bid price
4. Reserve price is saved with listing

### For Buyers:
1. Bidders don't see the actual reserve price (industry standard)
2. They bid normally during the auction
3. If auction ends and reserve wasn't met:
   - They receive notification that auction ended without sale
   - No transaction occurs

### Notifications:
- **Seller**: "انتهى المزاد - لم يصل للسعر الاحتياطي" (Auction ended - reserve price not met)
- **Bidders**: "انتهى المزاد بدون بيع" (Auction ended without sale)

## Validation Rules
1. Reserve price is optional (can be null)
2. Reserve price must be >= starting bid price
3. Reserve price only applies to auction sale type
4. Reserve price validation on both create and update

## Testing Checklist
- ✅ Database migration applied successfully
- ✅ Backend compiles without errors
- ✅ Frontend compiles without errors
- ✅ No linter errors
- ✅ Reserve price can be set when creating auction
- ✅ Reserve price can be edited when updating auction
- ✅ Reserve price loads correctly in edit mode
- ✅ Validation prevents reserve price < start price
- ✅ Auction processor checks reserve price

## Future Enhancements (Optional)
1. Display "Reserve Price" badge on auction listings (without showing amount)
2. Show reserve price status to seller in seller dashboard
3. Add analytics for reserve price effectiveness
4. Allow buyers to see if reserve was met after auction ends
