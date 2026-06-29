// Native (iOS/Android): real local notifications for triggered alerts.
// Fires after permission; safe no-op when denied. Real-time delivery while the
// app is CLOSED would need a price-watch backend — this delivers whenever the
// app evaluates alerts (foreground / open).
import * as Notifications from 'expo-notifications';

let permissionAsked = false;
let permissionGranted = false;

export async function ensureNotificationPermission(): Promise<boolean> {
  if (permissionAsked) return permissionGranted;
  permissionAsked = true;
  try {
    const current = await Notifications.getPermissionsAsync();
    let status = current.status;
    if (status !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    permissionGranted = status === 'granted';
  } catch {
    permissionGranted = false;
  }
  return permissionGranted;
}

export async function notifyTriggered(title: string, body: string): Promise<void> {
  try {
    const ok = await ensureNotificationPermission();
    if (!ok) return;
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: null, // deliver now
    });
  } catch {
    // never let a notification failure break the evaluation loop
  }
}
