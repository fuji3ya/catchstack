// Persisted store of cards the user has searched for and added via live search.
// Mirrors holdingsStore.ts structure exactly:
//   module state + listeners Set + writeChain persist + useSyncExternalStore hook.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import type { SeedCard } from '@/lib/data/seedCards';

const KEY = 'catchstack.userCatalog.v1';

// State: id → SeedCard. Seeds empty on first install.
let catalog: Record<string, SeedCard> = {};
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

// Serialize writes so back-to-back upserts can't race each other — each call
// queues behind the previous write so AsyncStorage always sees the latest last.
let writeChain: Promise<void> = Promise.resolve();
function persist() {
  const snapshot = JSON.stringify(catalog);
  writeChain = writeChain.then(() => AsyncStorage.setItem(KEY, snapshot)).catch(() => {});
}

export async function hydrateUserCatalog(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Validate that the stored value is a plain object whose values look like
      // SeedCard records. Fall back to empty on any parse / shape error.
      const valid =
        parsed !== null &&
        typeof parsed === 'object' &&
        !Array.isArray(parsed) &&
        Object.values(parsed).every(
          (v) =>
            v &&
            typeof (v as Record<string, unknown>).id === 'string' &&
            typeof (v as Record<string, unknown>).name === 'string' &&
            typeof (v as Record<string, unknown>).image === 'string'
        );
      if (valid) catalog = parsed as Record<string, SeedCard>;
    }
  } catch {
    // ignore — fall back to empty
  }
  hydrated = true;
  emit();
}

export function getUserCard(id: string): SeedCard | undefined {
  return catalog[id];
}

export function isUserCatalogHydrated(): boolean {
  return hydrated;
}

// Idempotent upsert by id — calling with the same card twice is safe.
export function addUserCard(card: SeedCard): void {
  catalog = { ...catalog, [card.id]: card };
  persist();
  emit();
}

export function subscribeUserCatalog(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getUserCatalogSnapshot(): SeedCard[] {
  return Object.values(catalog);
}

// React hook — re-renders on every addUserCard / hydrateUserCatalog call.
export function useUserCatalog(): SeedCard[] {
  return useSyncExternalStore(subscribeUserCatalog, getUserCatalogSnapshot, getUserCatalogSnapshot);
}
