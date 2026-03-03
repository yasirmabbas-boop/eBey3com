import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { PushNotifications, ActionPerformed } from '@capacitor/push-notifications';
import { isNative } from '@/lib/capacitor';
import { useToast } from '@/hooks/use-toast';

/**
 * Global hook that handles notification tap → deep link navigation.
 * Must be mounted early in App.tsx (before routes) so the listener
 * is registered before any pushNotificationActionPerformed events fire.
 */
export function useNotificationDeeplink() {
  const [, setLocation] = useLocation();
  const listenerRegistered = useRef(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!isNative || listenerRegistered.current) return;
    listenerRegistered.current = true;

    const navigateToUrl = (url: string) => {
      if (!url) return;
      console.log('[DeepLink] Navigating to:', url);

      try {
        // If it's an absolute URL (https://...), use window.location
        if (url.startsWith('http')) {
          window.location.href = url;
          return;
        }

        // Validate the path is a relative URL starting with /
        if (!url.startsWith('/')) {
          console.warn('[DeepLink] Invalid relative URL, prepending /:', url);
          url = '/' + url;
        }

        // Use Wouter for client-side navigation (no full page reload)
        setLocation(url);
      } catch (error) {
        console.error('[DeepLink] Navigation failed:', error);
        toast({
          title: 'Navigation error',
          description: 'Could not open the notification link.',
          variant: 'destructive',
        });
        // Fall back to home
        setLocation('/');
      }
    };

    const handleNotificationTap = (action: ActionPerformed) => {
      console.log('[DeepLink] Notification tapped:', JSON.stringify(action.notification));
      try {
        const url = action.notification.data?.url;
        if (url) {
          navigateToUrl(url);
        }
      } catch (error) {
        console.error('[DeepLink] Error processing notification tap:', error);
      }
    };

    // Register the tap listener
    PushNotifications.addListener('pushNotificationActionPerformed', handleNotificationTap);
    console.log('[DeepLink] Notification tap listener registered');

    // Handle cold start: check if the app was launched by tapping a notification
    PushNotifications.getDeliveredNotifications().then((result) => {
      console.log('[DeepLink] Delivered notifications on launch:', result.notifications.length);
    }).catch(() => {});

    return () => {
      // Don't remove listeners on cleanup — we want them active for the app lifetime
    };
  }, [setLocation, toast]);
}
