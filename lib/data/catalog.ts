// Unified card resolution: user-added cards (from live search) take priority
// over the bundled seed catalog. Call resolveCard(id) anywhere a SeedCard is
// needed — it hides the two-store split from callers.
import { SEED_CARDS } from '@/lib/data/seedCards';
import { getUserCard } from '@/lib/data/userCatalog';

export const SEED_BY_ID: Record<string, (typeof SEED_CARDS)[number]> = Object.fromEntries(
  SEED_CARDS.map((c) => [c.id, c])
);

export function resolveCard(id: string): (typeof SEED_CARDS)[number] | undefined {
  return getUserCard(id) ?? SEED_BY_ID[id];
}
