// Global, persisted store of the user's owned holdings.
// Lightweight external store (useSyncExternalStore) — no extra deps.
// Seeds with the top-8 cards (Portfolio total $18,135.82) on first run,
// then persists every change to AsyncStorage so added cards survive restarts.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SEED_CARDS } from '@/lib/data/seedCards';
import { gradeFor } from '@/lib/design/cardPresentation';

export interface UserHolding {
  id: string;             // unique holding id
  catalogItemId: string;  // links to a catalog card (SEED_CARDS)
  grade: string;
  cost?: number;
  acquisitionDate?: string;
  storage?: string;
  notes?: string;
  frontImageUrl?: string; // user's own slab photo (overrides the catalog image)
  addedAt: string;
}

const KEY = 'catchstack.holdings.v2';

function seedHoldings(): UserHolding[] {
  const top8 = [...SEED_CARDS].sort((a, b) => b.marketUsd - a.marketUsd).slice(0, 8);
  return top8.map((c, idx) => ({
    id: `hold_${c.id}`,
    catalogItemId: c.id,
    grade: gradeFor(c.id),
    cost: Math.round(c.marketUsd * 0.348),
    acquisitionDate: '2024-08-01',
    storage: idx % 3 === 0 ? 'Safe' : 'Binder A',
    addedAt: '2026-06-01',
  }));
}

let holdings: UserHolding[] = seedHoldings();
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}
// Serialize writes so back-to-back add/update/remove can't race each other —
// each call queues behind the previous write so the file system always sees
// the latest snapshot last.
let writeChain: Promise<void> = Promise.resolve();
function persist() {
  const snapshot = JSON.stringify(holdings);
  writeChain = writeChain.then(() => AsyncStorage.setItem(KEY, snapshot)).catch(() => {});
}

export async function hydrateHoldings() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Validate schema before trusting persisted data (else fall back to seed).
      const valid =
        Array.isArray(parsed) &&
        parsed.length > 0 &&
        parsed.every((h) => h && typeof h.id === 'string' && typeof h.catalogItemId === 'string' && typeof h.grade === 'string');
      if (valid) holdings = parsed as UserHolding[];
    }
  } catch {
    // ignore — fall back to seed
  }
  hydrated = true;
  emit();
}

export function getHoldings(): UserHolding[] {
  return holdings;
}
export function isHydrated(): boolean {
  return hydrated;
}
export function subscribeHoldings(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function addHolding(input: {
  catalogItemId: string;
  grade: string;
  cost?: number;
  acquisitionDate?: string;
  storage?: string;
  notes?: string;
  frontImageUrl?: string;
}): void {
  // Collision-safe unique id (time + random). Seed holdings keep their stable
  // `hold_<catalogId>` ids; user-added holdings get a unique suffix so duplicates
  // of the same card never collide.
  const uniq = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
  const id = `hold_${input.catalogItemId}_${uniq}`;
  holdings = [{ ...input, id, addedAt: new Date().toISOString().slice(0, 10) }, ...holdings];
  persist();
  emit();
}

export function updateHolding(id: string, patch: Partial<Omit<UserHolding, 'id' | 'addedAt'>>): void {
  // catalogItemId IS allowed to change so the user can replace the card on an
  // existing holding without losing its history (cost / date / storage / notes).
  holdings = holdings.map((h) => (h.id === id ? { ...h, ...patch } : h));
  persist();
  emit();
}

export function removeHolding(id: string): void {
  holdings = holdings.filter((h) => h.id !== id);
  persist();
  emit();
}
