---
name: react-native
description: >
  React Native development skill for building native mobile apps, with deep knowledge
  of the ebey3 codebase and its migration from Capacitor to React Native. Use this skill
  whenever the user asks to build React Native screens, components, or features — or when
  migrating existing web/Capacitor code to React Native. Also trigger when the user mentions
  Expo, React Navigation, NativeWind, native mobile UI, app store submission, or mobile
  performance optimization. This skill covers RTL/Arabic/Kurdish mobile layout, monorepo
  setup with a shared backend, and React Native equivalents for web libraries. Even if the
  user just says "build the home screen" or "port the product page" — if the context is
  React Native, use this skill.
---

# React Native Development

You are building a React Native mobile app for ebey3 (اي بيع), an Arabic/Kurdish
e-commerce marketplace. The app is being migrated from a Capacitor-wrapped web app
to a true native React Native app, while the Express backend stays unchanged.

## Why This Matters

The existing ebey3 app is React 18 + Vite wrapped in Capacitor 8, essentially a remote
WebView pointing at `https://ebey3.com`. React Native gives us real native UI components,
better gesture handling, proper offline support, and App Store compliance — while keeping
the same backend API and shared TypeScript types.

## Project Architecture

The React Native app lives in a `mobile/` directory alongside the existing codebase,
sharing types and validators via the `shared/` folder:

```
ebey3/
├── client/          # Existing React web app (Vite + Tailwind)
├── server/          # Express backend (unchanged)
├── shared/          # Drizzle schemas, Zod validators, shared types
│   ├── schema.ts
│   └── models/
├── mobile/          # NEW — React Native (Expo)
│   ├── app/         # Expo Router file-based routing
│   ├── components/  # RN components
│   ├── hooks/       # Shared + RN-specific hooks
│   ├── lib/         # i18n, api, utils
│   ├── assets/      # Fonts, images
│   └── app.json     # Expo config
└── package.json     # Root workspace config (Turborepo)
```

### Monorepo Setup

Use Turborepo with npm workspaces so `shared/` is importable from both `server/` and
`mobile/` without duplication:

```json
// Root package.json
{
  "workspaces": ["client", "server", "shared", "mobile"],
  "devDependencies": {
    "turbo": "^2.0.0"
  }
}
```

The `shared/` package exports Drizzle schemas, Zod validators, and TypeScript types.
The mobile app imports these directly — no copying, no drift.

## Before You Start Any Screen

Before building or porting any screen, always:

1. **Read the existing web implementation** in `client/src/pages/<page>.tsx` to understand
   the data flow, API calls, and business logic
2. **Check the hooks** in `client/src/hooks/` — many contain reusable data-fetching logic
   that ports directly (the `useQuery` / `useMutation` patterns work identically in RN)
3. **Check the shared types** in `shared/schema.ts` — all API response types come from here
4. **Read the API layer** in `client/src/lib/api.ts` — the `authFetch` pattern ports with
   minor changes (replace `localStorage` with `AsyncStorage`)

## Core Technology Choices

### Expo (Managed Workflow)

Use Expo SDK 52+ with the managed workflow. It handles native module linking, OTA updates,
and build tooling. Only eject to bare workflow if you hit a native module Expo doesn't support.

```bash
npx create-expo-app mobile --template expo-template-blank-typescript
```

### Navigation — Expo Router (File-Based)

Use Expo Router (built on React Navigation) for file-based routing. This mirrors the
web's URL-based routing and makes deep linking automatic:

```
mobile/app/
├── (tabs)/           # Bottom tab layout
│   ├── _layout.tsx   # Tab navigator config
│   ├── index.tsx     # Home tab
│   ├── favorites.tsx
│   ├── swipe.tsx
│   ├── notifications.tsx
│   └── account.tsx
├── product/[id].tsx  # Dynamic route
├── seller/[id].tsx
├── search.tsx
├── cart.tsx
├── checkout.tsx
├── messages.tsx
└── _layout.tsx       # Root layout (auth guard, providers)
```

See `references/navigation-patterns.md` for the full route mapping from web to native.

### Styling — NativeWind

NativeWind lets you write Tailwind classes in React Native. Since the web app already uses
Tailwind, this minimizes the mental overhead of porting:

```tsx
import { View, Text } from 'react-native';

export default function ProductCard({ title, price }: Props) {
  return (
    <View className="bg-white rounded-xl p-4 shadow-sm">
      <Text className="text-lg font-bold text-gray-900">{title}</Text>
      <Text className="text-primary-600 text-xl">{price} IQD</Text>
    </View>
  );
}
```

NativeWind supports RTL out of the box via `I18nManager` — no extra config needed for
directional classes like `mr-*` / `ml-*`.

### State Management

- **Server state**: `@tanstack/react-query` — works identically to the web app. Port
  existing query hooks directly.
- **Client state**: `zustand` for global state (auth, cart, language preference). Lightweight
  and works well with React Native.
- **Persistence**: `@react-native-async-storage/async-storage` replaces `localStorage`.
  Use `zustand/middleware` persist adapter for automatic state persistence.

## RTL & Internationalization

This is critical for ebey3 — Arabic and Kurdish are RTL languages, and the app must feel
native in all three languages.

### I18n Setup

Use `react-i18next` with the existing translation dictionary from `client/src/lib/i18n.tsx`.
Extract the translations object and restructure for i18next format:

```tsx
// mobile/lib/i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager } from 'react-native';

// Import translation keys from shared (or duplicate if needed)
import { translations } from './translations';

// Restructure: { key: { ar, ku, en } } → { ar: { key: value }, ku: {}, en: {} }
const resources = buildResources(translations);

i18n.use(initReactI18next).init({
  resources,
  lng: 'ar', // Default language
  fallbackLng: 'ar',
  interpolation: { escapeValue: false },
});

export const setLanguage = async (lang: 'ar' | 'ku' | 'en') => {
  const isRTL = lang === 'ar' || lang === 'ku';
  I18nManager.forceRTL(isRTL);
  await i18n.changeLanguage(lang);
  await AsyncStorage.setItem('language', lang);
  // Note: changing RTL requires an app restart on some platforms
};
```

### RTL Layout Rules

React Native handles RTL better than the web in some ways, but has its own gotchas:

1. **`I18nManager.forceRTL(true)`** — call this on app startup based on saved language.
   It flips the entire layout direction globally. Unlike web CSS `dir`, this is app-wide
   and requires a restart to take effect.

2. **Flexbox is RTL-aware** — `flexDirection: 'row'` automatically reverses in RTL mode.
   Don't manually swap `row` and `row-reverse` based on language.

3. **Margins and paddings** — `marginStart` / `marginEnd` / `paddingStart` / `paddingEnd`
   replace `marginLeft` / `marginRight`. These flip automatically in RTL. NativeWind's
   `ms-*` and `me-*` classes map to these.

4. **Icons that imply direction** — arrows, chevrons, and back buttons need manual flipping.
   Use `I18nManager.isRTL` to conditionally rotate:
   ```tsx
   <ChevronLeft style={{ transform: [{ scaleX: I18nManager.isRTL ? -1 : 1 }] }} />
   ```

5. **Text alignment** — `textAlign: 'left'` does NOT auto-flip. Use `textAlign: 'auto'`
   (or omit it) for body text so it follows the language direction.

6. **Fonts** — Arabic and Kurdish require specific font support. Use Noto Sans Arabic
   (or a similar font that covers both Arabic and Kurdish Sorani script). Load via
   `expo-font`:
   ```tsx
   const [fontsLoaded] = useFonts({
     'NotoSansArabic-Regular': require('../assets/fonts/NotoSansArabic-Regular.ttf'),
     'NotoSansArabic-Bold': require('../assets/fonts/NotoSansArabic-Bold.ttf'),
   });
   ```

7. **Kurdish (Sorani) specifics** — Kurdish uses Arabic script but with additional
   characters (ڕ, ۆ, ێ, etc.). Make sure the chosen font covers the full Kurdish
   character set. Test with actual Kurdish text from the translations, not just Arabic.

## API Layer

The backend doesn't change. Port the `authFetch` function with AsyncStorage:

```tsx
// mobile/lib/api.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'https://ebey3.com/api';

export async function authFetch(path: string, options: RequestInit = {}) {
  const token = await AsyncStorage.getItem('authToken');
  const headers = new Headers(options.headers);

  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(`${API_BASE}${path}`, { ...options, headers });
}
```

All existing `@tanstack/react-query` hooks that call the API can be ported by:
1. Replacing `fetch('/api/...')` with `authFetch('/...')`
2. Keeping the same query keys and cache structure
3. The Zod validators from `shared/` work identically for response validation

## Component Mapping

When porting web components, use these React Native equivalents:

| Web (Current) | React Native |
|---------------|-------------|
| `<div>` | `<View>` |
| `<span>`, `<p>`, `<h1>` | `<Text>` (all text must be in `<Text>`) |
| `<img>` | `<Image>` or `expo-image` (preferred, has caching) |
| `<input>` | `<TextInput>` |
| `<button>` | `<Pressable>` or `<TouchableOpacity>` |
| `<a href>` | `<Link>` from expo-router |
| `<ScrollView>` (web) | `<ScrollView>` or `<FlatList>` (for lists) |
| Radix UI Dialog | React Native Modal or `@gorhom/bottom-sheet` |
| Radix UI Select | `@react-native-picker/picker` or custom bottom sheet |
| Radix UI Toast | `react-native-toast-message` or `sonner-native` |
| Radix UI Tabs | `@react-navigation/material-top-tabs` |
| Leaflet Maps | `react-native-maps` |
| Embla Carousel | `react-native-pager-view` or `react-native-reanimated-carousel` |
| Framer Motion | `react-native-reanimated` |
| Lucide React | `lucide-react-native` |

### Important: No HTML in React Native

React Native doesn't render HTML. Every `<div>` becomes `<View>`, every piece of text
must be wrapped in `<Text>`. Forgetting this is the #1 mistake when porting. The compiler
will catch most cases, but nested text without `<Text>` wrappers causes cryptic crashes.

## Image Handling

ebey3 is image-heavy (product listings, galleries). Use `expo-image` instead of the
built-in `<Image>` — it has disk caching, blur hash placeholders, and better memory
management:

```tsx
import { Image } from 'expo-image';

<Image
  source={{ uri: listing.imageUrl }}
  placeholder={listing.blurhash}
  contentFit="cover"
  transition={200}
  style={{ width: '100%', aspectRatio: 1 }}
/>
```

For image upload (sell flow), use `expo-image-picker` for gallery/camera access and
`expo-image-manipulator` for compression before upload.

## Push Notifications

Replace Capacitor's push notification plugin with `expo-notifications`:

```tsx
import * as Notifications from 'expo-notifications';
import { authFetch } from '../lib/api';

export async function registerForPushNotifications() {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;

  const token = (await Notifications.getExpoPushTokenAsync()).data;
  // Send token to backend (same endpoint as Capacitor used)
  await authFetch('/push/register', {
    method: 'POST',
    body: JSON.stringify({ token, platform: 'expo' }),
  });
}
```

The backend already handles FCM tokens — you may need to add Expo push token support
alongside the existing FCM registration.

## WebSocket Integration

The existing WebSocket logic for real-time bids and notifications ports directly.
React Native supports the `WebSocket` API natively:

```tsx
// Same pattern as web, but handle app state changes
import { AppState } from 'react-native';

// Reconnect when app comes back to foreground
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    reconnectWebSocket();
  }
});
```

The key difference from web: mobile apps get backgrounded frequently. Build reconnection
logic that handles the app going to background and coming back. The web version doesn't
need this because the browser tab stays alive.

## Performance Patterns

### Lists

Use `FlashList` (from `@shopify/flash-list`) instead of `FlatList` for long product
lists — it's significantly faster with large datasets:

```tsx
import { FlashList } from '@shopify/flash-list';

<FlashList
  data={listings}
  renderItem={({ item }) => <ProductCard listing={item} />}
  estimatedItemSize={200}
  keyExtractor={(item) => item.id}
/>
```

### Animations

Use `react-native-reanimated` for 60fps animations. This replaces Framer Motion
from the web app. Key difference: animations run on the UI thread, not the JS thread,
so they don't jank during heavy data processing.

### Memory

- Use `expo-image` with caching policies to prevent memory bloat from product images
- Implement list recycling (FlashList handles this automatically)
- Profile with Flipper or Expo DevTools during development

## Testing

- **Unit tests**: Jest + React Native Testing Library (same patterns as web)
- **E2E**: Maestro (simpler than Detox, great for flows like "browse → bid → checkout")
- **RTL testing**: Run the full test suite with `I18nManager.forceRTL(true)` as a
  separate CI job
- **Font rendering**: Manual QA on real devices for Arabic and Kurdish text — emulators
  sometimes render differently

## Reference Files

- `references/navigation-patterns.md` — full route mapping from web to native, deep
  linking config, and tab navigator setup
- `references/component-porting-guide.md` — screen-by-screen porting guide with
  complexity ratings and dependencies
