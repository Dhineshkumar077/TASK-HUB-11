import { playNotificationSound } from './notificationSound.ts';

export type WebPushStatus = 'granted' | 'denied' | 'default' | 'unsupported';

/**
 * Register Service Worker for Web Push & Out-of-App Device Notifications
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    return registration;
  } catch (err) {
    console.warn('Service worker registration failed:', err);
    return null;
  }
}

/**
 * Returns current browser notification permission state
 */
export function getWebPushPermission(): WebPushStatus {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission as WebPushStatus;
}

/**
 * Prompts user for browser notification permission
 */
export async function requestWebPushPermission(): Promise<WebPushStatus> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }

  try {
    const permission = await Notification.requestPermission();
    await registerServiceWorker();
    return permission as WebPushStatus;
  } catch (err) {
    console.warn('Failed to request notification permission:', err);
    return 'denied';
  }
}

/**
 * Dispatches an out-of-app / cross-device system notification with audio chime
 */
export async function sendCrossDeviceNotification(
  title: string,
  options: {
    body: string;
    icon?: string;
    badge?: string;
    tag?: string;
    link?: string;
    playSound?: boolean;
  }
): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  // Always play custom audio chime alert
  if (options.playSound !== false) {
    playNotificationSound();
  }

  if (!('Notification' in window)) {
    return false;
  }

  if (Notification.permission !== 'granted') {
    return false;
  }

  try {
    // Try service worker showNotification first (supports background/out-of-app)
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && 'showNotification' in reg) {
        await reg.showNotification(title, {
          body: options.body,
          icon: options.icon || '/favicon.ico',
          badge: options.badge || '/favicon.ico',
          tag: options.tag || 'taskhub-alert',
          renotify: true,
          data: { url: options.link || '/' },
        } as any);
        return true;
      }
    }

    // Fallback standard Notification
    const notif = new Notification(title, {
      body: options.body,
      icon: options.icon || '/favicon.ico',
      tag: options.tag || 'taskhub-alert',
      data: { url: options.link || '/' },
    });

    notif.onclick = () => {
      window.focus();
      if (options.link) {
        window.location.href = options.link;
      }
    };

    return true;
  } catch (err) {
    console.warn('System push notification dispatch error:', err);
    return false;
  }
}
