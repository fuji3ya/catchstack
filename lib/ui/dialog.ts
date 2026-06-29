// RN's Alert.alert is a no-op on react-native-web (v0.85). These helpers
// dispatch to native Alert on iOS/Android and to window.alert / .confirm
// on web so user prompts are never silently swallowed.
import { Alert, Platform } from 'react-native';

export function showInfo(title: string, message: string): void {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

export function showConfirm(
  title: string,
  message: string,
  options: { confirmLabel?: string; cancelLabel?: string; onConfirm: () => void; onCancel?: () => void }
): void {
  if (Platform.OS === 'web') {
    const ok = typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`);
    if (ok) options.onConfirm();
    else options.onCancel?.();
  } else {
    Alert.alert(title, message, [
      { text: options.cancelLabel ?? 'Cancel', style: 'cancel', onPress: options.onCancel },
      { text: options.confirmLabel ?? 'OK', onPress: options.onConfirm },
    ]);
  }
}
