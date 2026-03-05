import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { I18nManager } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { initI18n, getStoredLanguage } from '../lib/i18n';

// Initialize i18n
initI18n();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
  },
});

export default function RootLayout() {
  useEffect(() => {
    // Set RTL based on stored language preference
    (async () => {
      const lang = await getStoredLanguage();
      const isRTL = lang === 'ar' || lang === 'ku';
      if (I18nManager.isRTL !== isRTL) {
        I18nManager.forceRTL(isRTL);
        // Note: RTL change requires app restart to take effect
      }
    })();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen
          name="product/[id]"
          options={{
            headerShown: false,
            animation: 'slide_from_bottom',
          }}
        />
      </Stack>
    </QueryClientProvider>
  );
}
