import { useSyncExternalStore } from 'react';
import { subscribeSettings, getSettings } from '@/lib/state/settingsStore';

export function useSettings() {
  return useSyncExternalStore(subscribeSettings, getSettings, getSettings);
}
