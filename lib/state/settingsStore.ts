// Persisted user settings: face-id, pro entitlement, currency, appearance.
// Appearance drives the theme (Pro): System follows the OS, Light/Dark force it.
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AppearanceMode = 'System' | 'Light' | 'Dark';
export interface UserSettings {
  faceId: boolean;
  pro: boolean;            // Pro entitlement (early access: free unlock)
  currency: string;        // ISO 3-letter code (only 'USD' actually formatted today)
  appearance: AppearanceMode;
}

const KEY = 'catchstack.settings.v1';
const DEFAULTS: UserSettings = { faceId: false, pro: false, currency: 'USD', appearance: 'System' };

let settings: UserSettings = { ...DEFAULTS };
let hydrated = false;
const listeners = new Set<() => void>();
function emit() { for (const l of listeners) l(); }
let writeChain: Promise<void> = Promise.resolve();
function persist() {
  const snapshot = JSON.stringify(settings);
  writeChain = writeChain.then(() => AsyncStorage.setItem(KEY, snapshot)).catch(() => {});
}

export async function hydrateSettings() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        settings = {
          faceId: typeof parsed.faceId === 'boolean' ? parsed.faceId : DEFAULTS.faceId,
          pro: typeof parsed.pro === 'boolean' ? parsed.pro : DEFAULTS.pro,
          currency: typeof parsed.currency === 'string' ? parsed.currency : DEFAULTS.currency,
          appearance: (parsed.appearance === 'Light' || parsed.appearance === 'Dark') ? parsed.appearance : 'System',
        };
      }
    }
  } catch {
    // fall back to defaults
  }
  hydrated = true;
  emit();
}

export function getSettings(): UserSettings { return settings; }
export function isSettingsHydrated(): boolean { return hydrated; }
export function subscribeSettings(cb: () => void): () => void {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}
export function updateSettings(patch: Partial<UserSettings>): void {
  // Safe because _layout.tsx awaits hydrateSettings() before rendering any screen.
  settings = { ...settings, ...patch };
  persist();
  emit();
}
