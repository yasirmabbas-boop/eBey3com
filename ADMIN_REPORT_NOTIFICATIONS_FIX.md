# Admin Report Notifications Fix

## Problem
Admin users were receiving notifications about new reports but clicking on them would show an empty page or the wrong content. This was caused by two issues:

1. **Missing Admin Notifications**: When users submitted reports, no in-app notifications were created for admin users
2. **No Deep Linking Support**: The admin page didn't support URL parameters to automatically switch to the correct tab and highlight specific reports

## Solution Implemented

### 1. Backend Changes

#### `server/storage.ts`
- **Added `getAdminUsers()` method** to the `IStorage` interface and `DatabaseStorage` class
- **Fixed `getReportsPaginatedWithDetails()` return structure** to properly return `{ reports, total }` instead of just the array
- **Added pagination support** with `.limit()` and `.offset()` to the reports query

#### `server/routes/reports.ts`
- **Added admin notification creation** when a new report is submitted
- Notifications are sent to all admin users with:
  - Type: `"admin_new_report"`
  - Title: `"بلاغ جديد"` (New Report)
  - Message: Report type and reason
  - Deep link: `/admin?tab=reports&reportId={reportId}`
- Error handling ensures the report submission doesn't fail if notifications fail

### 2. Frontend Changes

#### `client/src/pages/admin.tsx`
- **Added deep linking support** using `URLSearchParams` to read URL parameters
- **Auto-switches to the correct tab** when `?tab=reports` is present in the URL
- **Highlights the specific report** when `?reportId=XYZ` is present
- **Auto-scrolls to the highlighted report** using `scrollIntoView()` with smooth behavior
- **Visual feedback** with yellow background and pulsing animation for 5 seconds
- **Added imports**: `useRef` from React, and `cn` from utils

## Features

### Deep Linking
Admins can now click on report notifications and be taken directly to:
```
/admin?tab=reports&reportId=abc123
```

This will:
1. Open the admin page
2. Switch to the "Reports" tab
3. Highlight the specific report with a yellow background and pulse animation
4. Scroll the report into view
5. Clear the highlight after 5 seconds

### Visual Highlighting
Reports accessed via notifications are highlighted with:
- Yellow background (`bg-yellow-100`)
- Yellow border (`border-2 border-yellow-400`)
- Pulse animation (`animate-pulse`)
- Auto-scroll to center of viewport

## Testing

To test the implementation:

1. **Create a new report** as a regular user
2. **Log in as an admin** and check notifications
3. **Click the report notification** - should:
   - Navigate to `/admin?tab=reports&reportId={id}`
   - Show the Reports tab
   - Highlight the specific report
   - Scroll to the report

## Files Modified

- `server/storage.ts` - Added `getAdminUsers()`, fixed reports pagination
- `server/routes/reports.ts` - Added admin notifications on report creation
- `client/src/pages/admin.tsx` - Added deep linking and report highlighting

## Notes

- Notification creation is wrapped in try-catch to prevent report submission failures
- URL parameters are validated against allowed tab names
- Highlight automatically clears after 5 seconds for better UX
- Pre-existing TypeScript errors in `storage.ts` (lines 569, 571) are unrelated to these changes
