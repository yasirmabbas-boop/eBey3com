# Navigation Patterns — Web to React Native

## Route Mapping

The web app uses Wouter with flat routes. In React Native (Expo Router), these become
file-based routes. Here's the complete mapping:

### Tab Screens (Bottom Navigation)

These live in `mobile/app/(tabs)/` and are the 5 main tabs matching the web's
`mobile-nav-bar.tsx`:

| Web Route | Expo Router File | Tab Icon |
|-----------|-----------------|----------|
| `/` | `(tabs)/index.tsx` | Home |
| `/favorites` | `(tabs)/favorites.tsx` | Heart |
| `/swipe` | `(tabs)/swipe.tsx` | Play |
| `/notifications` | `(tabs)/notifications.tsx` | Bell |
| `/my-account` | `(tabs)/account.tsx` | User |

### Stack Screens (Push on Top of Tabs)

These are screens that push on top of the tab navigator:

| Web Route | Expo Router File | Notes |
|-----------|-----------------|-------|
| `/product/:id` | `product/[id].tsx` | Image gallery, bid flow |
| `/seller/:id` | `seller/[id].tsx` | Seller profile |
| `/search` | `search.tsx` | Meilisearch integration |
| `/cart` | `cart.tsx` | — |
| `/checkout` | `checkout.tsx` | Auth required |
| `/messages` | `messages.tsx` | Real-time WebSocket |
| `/my-purchases` | `my-purchases.tsx` | — |
| `/my-sales` | `my-sales.tsx` | — |
| `/my-bids` | `my-bids.tsx` | — |
| `/my-auctions` | `my-auctions.tsx` | — |
| `/seller-dashboard` | `seller-dashboard.tsx` | Has own sub-nav |
| `/buyer-dashboard` | `buyer-dashboard.tsx` | — |
| `/sell-wizard` | `sell-wizard.tsx` | Multi-step form |
| `/settings` | `settings.tsx` | — |
| `/security-settings` | `security-settings.tsx` | — |

### Auth Screens (Separate Stack)

These should be in a separate navigation group that replaces the main stack when
the user is logged out:

| Web Route | Expo Router File |
|-----------|-----------------|
| `/signin` | `(auth)/signin.tsx` |
| `/register` | `(auth)/register.tsx` |
| `/forgot-password` | `(auth)/forgot-password.tsx` |
| `/onboarding` | `(auth)/onboarding.tsx` |

### Static/Legal Pages

| Web Route | Expo Router File |
|-----------|-----------------|
| `/about` | `about.tsx` |
| `/privacy` | `privacy.tsx` |
| `/terms` | `terms.tsx` |
| `/contact` | `contact.tsx` |

## Tab Navigator Configuration

```tsx
// mobile/app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Home, Heart, Play, Bell, User } from 'lucide-react-native';

export default function TabLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#E53E3E', // ebey3 primary
        headerShown: false,
        tabBarStyle: {
          // Match web's mobile-nav-bar styling
          borderTopWidth: 0,
          elevation: 8,
          shadowOpacity: 0.1,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('home'),
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: t('favorites'),
          tabBarIcon: ({ color, size }) => <Heart color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="swipe"
        options={{
          title: t('browse'),
          tabBarIcon: ({ color, size }) => <Play color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: t('notifications'),
          tabBarIcon: ({ color, size }) => <Bell color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: t('myAccount'),
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
```

## Deep Linking Configuration

Expo Router handles deep linking automatically based on the file structure. Configure
the scheme in `app.json`:

```json
{
  "expo": {
    "scheme": "ebey3",
    "plugins": [
      ["expo-router", {
        "origin": "https://ebey3.com"
      }]
    ]
  }
}
```

This means:
- `ebey3://product/123` → opens `product/[id].tsx` with `id=123`
- `https://ebey3.com/product/123` → same thing (universal links)

### Notification Deep Links

The existing backend sends push notifications with a `deepLink` field. In React Native,
handle these in the root layout:

```tsx
// mobile/app/_layout.tsx
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';

Notifications.addNotificationResponseReceivedListener((response) => {
  const deepLink = response.notification.request.content.data?.deepLink;
  if (deepLink) {
    router.push(deepLink);
  }
});
```

## Back Navigation

React Navigation handles back automatically — no need for the custom `back-button.tsx`
or `window.history.back()` logic from the web app. The hardware back button on Android
works out of the box.

For custom back behavior (e.g., confirming unsaved changes in sell-wizard):

```tsx
import { usePreventRemove } from '@react-navigation/native';

usePreventRemove(hasUnsavedChanges, ({ data }) => {
  Alert.alert(
    t('unsavedChanges'),
    t('unsavedChangesMessage'),
    [
      { text: t('cancel'), style: 'cancel' },
      { text: t('discard'), onPress: () => navigation.dispatch(data.action) },
    ]
  );
});
```

## Seller Sub-Navigation

The seller dashboard has its own bottom nav (Inventory, Activity, Orders, Earnings).
Implement as a nested tab navigator:

```
mobile/app/seller-dashboard/
├── _layout.tsx         # Nested tab navigator
├── inventory.tsx
├── activity.tsx
├── orders.tsx
└── earnings.tsx
```
