// Live card search — queries pokemontcg.io (Pokémon) and Scryfall (MTG) in
// parallel and maps results to the shared SeedCard shape.
import type { SeedCard } from '@/lib/data/seedCards';

// 8-second hard timeout per provider request.
const FETCH_TIMEOUT_MS = 8000;

// Escape characters that pokemontcg.io's Lucene parser treats as special.
function escapePokemonQuery(q: string): string {
  return q.replace(/["':]/g, '');
}

function firstFinite(...values: (number | undefined | null)[]): number {
  for (const v of values) {
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

// Merge two AbortSignals into one: the merged signal aborts when either fires.
function combineSignals(a: AbortSignal, b: AbortSignal): AbortSignal {
  const ctrl = new AbortController();
  const abort = () => ctrl.abort();
  if (a.aborted || b.aborted) {
    ctrl.abort();
    return ctrl.signal;
  }
  a.addEventListener('abort', abort, { once: true });
  b.addEventListener('abort', abort, { once: true });
  return ctrl.signal;
}

// Fetch JSON with a per-attempt timeout and one retry for transient CDN
// failures. pokemontcg.io sits behind Cloudflare and intermittently 403s
// burst/anonymous requests; a single retry smooths that over. Never throws —
// returns the parsed JSON, or null on give-up (caller maps null -> []).
async function fetchJson(
  url: string,
  headers: Record<string, string>,
  signal: AbortSignal,
): Promise<unknown | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const timeoutCtrl = new AbortController();
    const timer = setTimeout(() => timeoutCtrl.abort(), FETCH_TIMEOUT_MS);
    const combined = combineSignals(signal, timeoutCtrl.signal);
    try {
      const res = await fetch(url, { signal: combined, headers });
      if (res.ok) return await res.json();
      // Retry transient Cloudflare/CDN failures (403/429/5xx) exactly once.
      if (attempt === 0 && (res.status === 403 || res.status === 429 || res.status >= 500)) continue;
      return null;
    } catch {
      // Network blip / abort — retry once unless the caller aborted.
      if (signal.aborted) return null;
      if (attempt === 0) continue;
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}

async function fetchPokemon(query: string, signal: AbortSignal): Promise<SeedCard[]> {
  const escaped = escapePokemonQuery(query);
  const params = new URLSearchParams({
    q: `name:"${escaped}*"`,
    pageSize: '24',
    orderBy: '-set.releaseDate',
    select: 'id,name,set,number,rarity,images,tcgplayer,cardmarket',
  });
  const url = `https://api.pokemontcg.io/v2/cards?${params.toString()}`;

  const json = await fetchJson(url, { 'User-Agent': 'Catchstack/1.0', Accept: 'application/json' }, signal);
  const data = (json as { data?: unknown })?.data;
  if (!Array.isArray(data)) return [];

  return (data as Record<string, unknown>[])
    .map((card): SeedCard | null => {
      const prices = (card.tcgplayer as Record<string, unknown>)?.prices as Record<string, { market?: number }> | undefined;
      const cm = (card.cardmarket as Record<string, unknown>)?.prices as { trendPrice?: number } | undefined;
      const marketUsd = firstFinite(
        prices?.holofoil?.market,
        prices?.reverseHolofoil?.market,
        prices?.normal?.market,
        prices?.['1stEditionHolofoil']?.market,
        cm?.trendPrice,
      );
      const images = card.images as { large?: string; small?: string } | undefined;
      const image = images?.large ?? images?.small ?? '';
      if (!image) return null;
      const set = card.set as { name?: string } | undefined;
      return {
        id: String(card.id ?? ''),
        category: 'Pokemon',
        name: String(card.name ?? ''),
        set: String(set?.name ?? ''),
        number: String(card.number ?? ''),
        rarity: String(card.rarity ?? ''),
        image,
        marketUsd,
      };
    })
    .filter((c): c is SeedCard => c !== null);
}

async function fetchMTG(query: string, signal: AbortSignal): Promise<SeedCard[]> {
  const encoded = encodeURIComponent(query);
  // unique=prints returns every printing of a card = the many "versions".
  const url = `https://api.scryfall.com/cards/search?q=${encoded}&unique=prints&order=released`;

  const json = await fetchJson(url, { 'User-Agent': 'Catchstack/1.0', Accept: 'application/json' }, signal);
  const data = (json as { data?: unknown })?.data;
  if (!Array.isArray(data)) return [];

  return (data as Record<string, unknown>[])
    .map((card): SeedCard | null => {
      const imageUris = card.image_uris as { normal?: string } | undefined;
      const cardFaces = card.card_faces as Array<{ image_uris?: { normal?: string } }> | undefined;
      const image = imageUris?.normal ?? cardFaces?.[0]?.image_uris?.normal ?? '';
      if (!image) return null;
      const prices = card.prices as { usd?: string } | undefined;
      return {
        id: `scry-${String(card.id ?? '')}`,
        category: 'MTG',
        name: String(card.name ?? ''),
        set: String(card.set_name ?? ''),
        number: String(card.collector_number ?? ''),
        rarity: String(card.rarity ?? ''),
        image,
        marketUsd: Number(prices?.usd) || 0,
      };
    })
    .filter((c): c is SeedCard => c !== null);
}

export async function searchCards(query: string, signal?: AbortSignal): Promise<SeedCard[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const callerSignal = signal ?? new AbortController().signal;

  const [pokemonResult, mtgResult] = await Promise.allSettled([
    fetchPokemon(q, callerSignal),
    fetchMTG(q, callerSignal),
  ]);

  const pokemon = pokemonResult.status === 'fulfilled' ? pokemonResult.value : [];
  const mtg = mtgResult.status === 'fulfilled' ? mtgResult.value : [];

  return [...pokemon, ...mtg].slice(0, 24);
}
