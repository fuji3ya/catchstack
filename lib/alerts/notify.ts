// Web / default: no native push. Metro picks notify.native.ts on iOS/Android,
// so expo-notifications is never bundled for web. In-app triggered list still
// updates everywhere; OS notifications are a native-only delivery channel.
export async function ensureNotificationPermission(): Promise<boolean> {
  return false;
}
export async function notifyTriggered(_title: string, _body: string): Promise<void> {
  // no-op on web
}
