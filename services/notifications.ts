import { Platform } from 'react-native';
import { Reminder } from '../store/types';
import Constants from 'expo-constants';

// We use lazy loading for expo-notifications to avoid the "remote notifications removed" error
// that crashes Expo Go on Android even when only using local notifications.
let NotificationsModule: any = null;
let notificationHandlerSet = false;

function getNotifications() {
  if (NotificationsModule === null) {
    try {
      // Use require for lazy loading
      const notif = require('expo-notifications');
      
      // In some environments, it might be nested under .default
      NotificationsModule = notif.default || notif;

      if (NotificationsModule && !notificationHandlerSet && typeof NotificationsModule.setNotificationHandler === 'function') {
        NotificationsModule.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        });
        notificationHandlerSet = true;
      }
    } catch (e) {
      console.warn('[Notifications] Failed to load expo-notifications:', e);
      // Fallback to a mock to prevent crashes
      NotificationsModule = {
        _isMock: true,
        requestPermissionsAsync: async () => ({ status: 'denied' }),
        getPermissionsAsync: async () => ({ status: 'denied' }),
        setNotificationChannelAsync: async () => {},
        scheduleNotificationAsync: async () => 'mock-id',
        cancelScheduledNotificationAsync: async () => {},
        cancelAllScheduledNotificationsAsync: async () => {},
        AndroidImportance: { MAX: 4 }
      };
    }
  }
  return NotificationsModule;
}

export async function requestNotificationPermissions() {
  const notif = getNotifications();
  if (notif._isMock) return null;

  try {
    if (Platform.OS === 'android') {
      await notif.setNotificationChannelAsync('default', {
        name: 'default',
        importance: notif.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#7C5CFC',
      });
    }

    const { status: existingStatus } = await notif.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await notif.requestPermissionsAsync();
      finalStatus = status;
    }
    
    return finalStatus === 'granted';
  } catch (e) {
    console.error('[Notifications] Permission error:', e);
    return null;
  }
}

export async function scheduleReminder(reminder: Reminder): Promise<string | undefined> {
  if (!reminder.enabled) return undefined;
  const notif = getNotifications();
  if (notif._isMock) return undefined;

  try {
    const [hour, minute] = reminder.time.split(':').map(Number);

    const id = await notif.scheduleNotificationAsync({
      content: {
        title: reminder.title,
        body: reminder.body,
        sound: true,
      },
      trigger: {
        hour,
        minute,
        repeats: true,
      },
    });

    return id;
  } catch (e) {
    console.error('[Notifications] Schedule error:', e);
    return undefined;
  }
}

export async function cancelReminder(notificationId: string) {
  if (notificationId) {
    const notif = getNotifications();
    if (notif._isMock) return;
    try {
      await notif.cancelScheduledNotificationAsync(notificationId);
    } catch (e) {
      console.error('[Notifications] Cancel error:', e);
    }
  }
}

export async function cancelAllReminders() {
  const notif = getNotifications();
  if (notif._isMock) return;
  try {
    await notif.cancelAllScheduledNotificationsAsync();
  } catch (e) {
    console.error('[Notifications] Cancel all error:', e);
  }
}

export async function sendTestNotification() {
  const notif = getNotifications();
  if (notif._isMock) {
    console.warn('[Notifications] Testing not available in this environment');
    return;
  }
  
  try {
    await notif.scheduleNotificationAsync({
      content: {
        title: "FitGO Test 🔔",
        body: "If you're reading this, notifications are working perfectly!",
        sound: true,
      },
      trigger: null,
    });
  } catch (e) {
    console.error('[Notifications] Test notification error:', e);
  }
}

export async function triggerInstantNotification(title: string, body: string) {
  const notif = getNotifications();
  if (notif._isMock) return;
  try {
    await notif.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
      },
      trigger: null,
    });
  } catch (e) {
    console.error('[Notifications] Instant notification error:', e);
  }
}

