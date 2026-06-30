// JP card search and price lookup for the JP相場 screen.
// All functions fail soft: network errors return [] / null, never throw.

const TCGDEX_BASE = 'https://api.tcgdex.net/v2/ja/cards';
const YUYU_BASE = 'https://catchstack-jp.starving-effort.com/';
const MAX_RESULTS = 30;

export interface JpCard {
  id: string;
  localId: string;
  name: string;
  image: string | null;
}

export interface JpPrice {
  sellJpy: number | null;
  buyJpy: number | null;
  sellUrl: string | null;
  buyUrl: string | null;
  source: string;
}

/** Strip leading zeros from a numeric string, e.g. "076" → "76". */
function stripLeadingZeros(s: string): string {
  return String(parseInt(s, 10));
}

/**
 * Search Japanese Pokémon cards from TCGdex.
 * Returns up to 30 results; returns [] on error or query < 2 chars.
 */
export async function searchJpCards(
  query: string,
  signal?: AbortSignal,
): Promise<JpCard[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  try {
    const url = `${TCGDEX_BASE}?name=${encodeURIComponent(q)}`;
    const res = await fetch(url, { signal });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data
      .slice(0, MAX_RESULTS)
      .map((c: { id?: string; localId?: string; name?: string; image?: string }) => ({
        id: String(c.id ?? ''),
        localId: String(c.localId ?? ''),
        name: String(c.name ?? ''),
        image: c.image ? `${c.image}/high.png` : null,
      }));
  } catch {
    return [];
  }
}

/**
 * Fetch 遊々亭 price data for a given JP card name + localId.
 * Matches by stripping leading zeros from number and localId.
 * Returns null if no match or on any error.
 */
export async function getJpPrice(
  name: string,
  localId: string,
  signal?: AbortSignal,
): Promise<JpPrice | null> {
  try {
    const url = `${YUYU_BASE}?q=${encodeURIComponent(name)}`;
    const res = await fetch(url, { signal });
    if (!res.ok) return null;
    const data = await res.json();
    const cards = data?.cards;
    if (!Array.isArray(cards) || cards.length === 0) return null;

    const targetId = stripLeadingZeros(localId);

    // Find the card whose number's left side (before '/') matches localId
    const match = cards.find((c: { number?: string }) => {
      if (!c.number) return false;
      const left = c.number.split('/')[0];
      return stripLeadingZeros(left) === targetId;
    });

    if (!match) return null;

    return {
      sellJpy: typeof match.sellJpy === 'number' ? match.sellJpy : null,
      buyJpy: typeof match.buyJpy === 'number' ? match.buyJpy : null,
      sellUrl: typeof match.sellUrl === 'string' ? match.sellUrl : null,
      buyUrl: typeof match.buyUrl === 'string' ? match.buyUrl : null,
      source: typeof data.source === 'string' ? data.source : '遊々亭',
    };
  } catch {
    return null;
  }
}
