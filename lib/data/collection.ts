// Browsable collection model — all curated cards (Pokemon + MTG today),
// presented with grade/cert/day-move, for the Collection + Add screens.
import { SEED_CARDS } from '@/lib/data/seedCards';
import type { UserHolding } from '@/lib/state/holdingsStore';
import { cleanName, gradeFor, gradeNum, dayMove, certFor } from '@/lib/design/cardPresentation';
import { resolveCard } from '@/lib/data/catalog';

export interface CollectionCard {
  id: string;
  holdingId?: string;      // present when this card is an owned holding
  category: string;        // 'Pokemon' | 'MTG' | ...
  tcg: string;             // 'pokemon' | 'mtg'
  title: string;
  set: string;
  number?: string;         // card number within its set (for version disambiguation)
  imageUrl: string;
  marketUsd: number;
  grade: string;
  gradeNum: string;
  cert: string;
  dayPct: number;
  alert: boolean;
}

// Categories actually data-backed by the bundled catalog + the live-price
// providers (pokemontcg.io for Pokemon, Scryfall for MTG). Yu-Gi-Oh / One
// Piece / Sports were chip placeholders in the original mockup — they have
// neither bundled data nor a public price source plumbed yet, so showing
// them as "supported" was misleading.
export const COLLECTION_CATEGORIES = ['All', 'Pokemon', 'MTG'] as const;
export type CollectionCategory = (typeof COLLECTION_CATEGORIES)[number];
export const CATEGORY_LABEL: Record<string, string> = { Pokemon: 'Pokémon' };

// A few cards carry a price alert (deterministic) — matches the mockup.
const ALERTS = new Set(['swsh7-215', 'ex8-107', 'sm10-205', 'base6-11', 'mtg-the-one-ring']);

function tcgOf(category: string): string {
  return category === 'MTG' ? 'mtg' : category === 'Pokemon' ? 'pokemon' : category.toLowerCase();
}

// Full browsable catalog (for the Add screen's search).
export function buildCollection(): CollectionCard[] {
  return SEED_CARDS.map((c) => {
    const grade = gradeFor(c.id);
    return {
      id: c.id,
      category: c.category,
      tcg: tcgOf(c.category),
      title: cleanName(c.name),
      set: c.set,
      number: c.number,
      imageUrl: c.image,
      marketUsd: c.marketUsd,
      grade,
      gradeNum: gradeNum(grade),
      cert: certFor(c.id),
      dayPct: dayMove(c.id),
      alert: ALERTS.has(c.id),
    };
  }).sort((a, b) => b.marketUsd - a.marketUsd);
}

// The user's OWNED collection (from the persisted holdings store).
// Uses resolveCard so holdings that reference live-searched cards (not in the
// bundled seed) still render correctly after the userCatalog is hydrated.
export function buildCollectionFromHoldings(userHoldings: UserHolding[]): CollectionCard[] {
  return userHoldings
    .map((h): CollectionCard | null => {
      const c = resolveCard(h.catalogItemId);
      if (!c) return null;
      return {
        id: c.id,
        holdingId: h.id,
        category: c.category,
        tcg: tcgOf(c.category),
        title: cleanName(c.name),
        set: c.set,
        number: c.number,
        imageUrl: h.frontImageUrl ?? c.image,
        marketUsd: c.marketUsd,
        grade: h.grade,
        gradeNum: gradeNum(h.grade),
        cert: certFor(c.id),
        dayPct: dayMove(c.id),
        alert: ALERTS.has(c.id),
      };
    })
    .filter((x): x is CollectionCard => x != null)
    .sort((a, b) => b.marketUsd - a.marketUsd);
}
