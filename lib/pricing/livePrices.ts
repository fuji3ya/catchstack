// Live ungraded reference prices from free public catalogs.
//  - Pokémon: pokemontcg.io  (card id is the pokemontcg.io id, e.g. "swsh7-215")
//  - Magic:   Scryfall       (card uuid is embedded in the bundled image URL)
//
// These are PUBLIC, UNGRADED market figures — exactly what the app presents as
// "reference value" (never an appraisal). They replace the bundled snapshot when
// a live fetch succeeds, and fall back to the bundled price on any failure or
// offline. Results are cached in AsyncStorage for a few hours so the app is fast
// and we stay polite to the upstream APIs.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { SEED_CARDS } from '@/lib/data/seedCards';

const CACHE_KEY = 'catchstack.prices.v1';
const TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

export type PriceMap = Record<string, number>;
interface CacheShape { fetchedAt: number; prices: PriceMap }

const CARD_BY_ID = Object.fromEntries(SEED_CARDS.map((c) => [c.id, c]));

// Scryfall card id is the uuid in the image URL:
//   https://cards.scryfall.io/large/front/2/5/25b0b816-....jpg?...
function scryfallUuid(imageUrl: string): string | null {
  const m = imageUrl.match(/\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\./i);
  return m ? m[1] : null;
}

// ---- cache ---------------------------------------------------------------

export async function loadCachedPrices(): Promise<PriceMap> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const c = JSON.parse(raw) as CacheShape;
    if (!c || typeof c.fetchedAt !== 'number' || !c.prices) return {};
    return c.prices;
  } catch {
    return {};
  }
}

// Returns when the cached price map was last written, or null if absent.
export async function loadCachedFetchedAt(): Promise<number | null> {
  const c = await readCache();
  return c?.fetchedAt ?? null;
}

function isFresh(fetchedAt: number): boolean {
  return Date.now() - fetchedAt < TTL_MS;
}

async function readCache(): Promise<CacheShape | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as CacheShape) : null;
  } catch {
    return null;
  }
}

async function writeCache(prices: PriceMap): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ fetchedAt: Date.now(), prices } satisfies CacheShape));
  } catch {
    /* ignore */
  }
}

// ---- upstream fetchers ---------------------------------------------------

function pickPokemonPrice(card: any): number | null {
  // Prefer TCGplayer market across whatever printing variant exists.
  const tp = card?.tcgplayer?.prices;
  if (tp && typeof tp === 'object') {
    const order = ['holofoil', 'normal', 'reverseHolofoil', '1stEditionHolofoil', '1stEdition', 'unlimitedHolofoil'];
    const variants = [...order.filter((k) => tp[k]), ...Object.keys(tp).filter((k) => !order.includes(k))];
    for (const v of variants) {
      const p = tp[v]?.market ?? tp[v]?.mid ?? tp[v]?.high;
      if (typeof p === 'number' && p > 0) return p;
    }
  }
  // Fallback to Cardmarket (EUR-ish, but treated as a reference figure).
  const cm = card?.cardmarket?.prices;
  const cmp = cm?.averageSellPrice ?? cm?.trendPrice ?? cm?.avg7;
  if (typeof cmp === 'number' && cmp > 0) return cmp;
  return null;
}

async function fetchPokemon(ids: string[]): Promise<PriceMap> {
  if (!ids.length) return {};
  const out: PriceMap = {};
  // pokemontcg.io supports OR queries; chunk to keep URLs sane.
  const chunkSize = 12;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const q = chunk.map((id) => `id:${id}`).join(' OR ');
    const url = `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(q)}&select=id,cardmarket,tcgplayer`;
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) continue;
      const json = await res.json();
      for (const card of json?.data ?? []) {
        const price = pickPokemonPrice(card);
        if (card?.id && price != null) out[card.id] = price;
      }
    } catch {
      /* skip chunk on failure */
    }
  }
  return out;
}

async function fetchScryfall(seedIds: string[]): Promise<PriceMap> {
  if (!seedIds.length) return {};
  // Map seed id -> scryfall uuid and back.
  const uuidToSeed: Record<string, string> = {};
  const identifiers: { id: string }[] = [];
  for (const seedId of seedIds) {
    const card = CARD_BY_ID[seedId];
    const uuid = card?.image ? scryfallUuid(card.image) : null;
    if (uuid) {
      uuidToSeed[uuid] = seedId;
      identifiers.push({ id: uuid });
    }
  }
  if (!identifiers.length) return {};
  const out: PriceMap = {};
  // Scryfall /cards/collection accepts up to 75 identifiers per POST.
  for (let i = 0; i < identifiers.length; i += 75) {
    const batch = identifiers.slice(i, i + 75);
    try {
      const res = await fetch('https://api.scryfall.com/cards/collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ identifiers: batch }),
      });
      if (!res.ok) continue;
      const json = await res.json();
      for (const card of json?.data ?? []) {
        const seedId = uuidToSeed[card?.id];
        const usd = card?.prices?.usd ?? card?.prices?.usd_foil ?? card?.prices?.usd_etched;
        const num = usd != null ? parseFloat(usd) : NaN;
        if (seedId && !isNaN(num) && num > 0) out[seedId] = num;
      }
    } catch {
      /* skip batch on failure */
    }
  }
  return out;
}

// ---- public API ----------------------------------------------------------

// Fetch fresh live prices for the given seed-card ids. Uses cache when fresh.
// Always returns a (possibly partial) map; never throws.
export async function fetchLivePrices(ids: string[]): Promise<PriceMap> {
  const cache = await readCache();
  if (cache && isFresh(cache.fetchedAt) && ids.every((id) => id in cache.prices)) {
    return cache.prices;
  }

  const pokemonIds: string[] = [];
  const mtgIds: string[] = [];
  for (const id of ids) {
    const card = CARD_BY_ID[id];
    if (!card) continue;
    if (card.category === 'MTG') mtgIds.push(id);
    else pokemonIds.push(id);
  }

  const [pkmn, mtg] = await Promise.all([fetchPokemon(pokemonIds), fetchScryfall(mtgIds)]);
  const fresh: PriceMap = { ...(cache?.prices ?? {}), ...pkmn, ...mtg };
  // Only persist if we actually got something new, so a total outage doesn't
  // wipe a previously-good cache.
  if (Object.keys(pkmn).length || Object.keys(mtg).length) {
    await writeCache(fresh);
  }
  return fresh;
}
