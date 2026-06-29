import { useSyncExternalStore } from 'react';
import { subscribeHoldings, getHoldings, type UserHolding } from '@/lib/state/holdingsStore';

// Subscribe to the persisted holdings store; re-renders on add/remove/hydrate.
export function useHoldings(): UserHolding[] {
  return useSyncExternalStore(subscribeHoldings, getHoldings, getHoldings);
}
