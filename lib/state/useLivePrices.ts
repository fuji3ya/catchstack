import { useEffect, useMemo, useState } from 'react';
import { loadCachedPrices, loadCachedFetchedAt, fetchLivePrices, type PriceMap } from '@/lib/pricing/livePrices';

export interface LivePricesResult {
  prices: PriceMap;
  fetchedAt: number | null; // ms epoch when the cache was last written (live data timestamp)
}

// Returns a live ungraded market-price map (cache first, then network) for the
// given catalog ids, plus the timestamp of the most recent successful fetch.
// Shared by the portfolio dataset and the alerts engine so both evaluate
// against the same real prices.
export function useLivePrices(ids: string[]): LivePricesResult {
  const idsKey = useMemo(() => Array.from(new Set(ids)).sort().join(','), [ids]);
  const [state, setState] = useState<LivePricesResult>({ prices: {}, fetchedAt: null });

  useEffect(() => {
    const list = idsKey ? idsKey.split(',') : [];
    if (!list.length) return;
    let cancelled = false;

    const apply = (map: PriceMap, at: number | null) => {
      if (cancelled) return;
      const subset: PriceMap = {};
      for (const id of list) if (id in map) subset[id] = map[id];
      if (Object.keys(subset).length || at != null) {
        setState((prev) => ({
          prices: Object.keys(subset).length ? { ...prev.prices, ...subset } : prev.prices,
          fetchedAt: at ?? prev.fetchedAt,
        }));
      }
    };

    // 1) instant: cached prices + their fetchedAt.
    Promise.all([loadCachedPrices(), loadCachedFetchedAt()]).then(([m, at]) => apply(m, at));
    // 2) background: refresh from the live catalogs. fetchLivePrices() writes
    //    the cache on success — re-read fetchedAt afterwards so the UI clock
    //    advances to "now" when a live refresh lands.
    fetchLivePrices(list).then(async (m) => {
      const at = await loadCachedFetchedAt();
      apply(m, at);
    });

    return () => {
      cancelled = true;
    };
  }, [idsKey]);

  return state;
}
