import { useMemo, useState, useEffect } from 'react';
import { buildDatasetFromHoldings } from '@/lib/data/buildRealDataset';
import { useHoldings } from '@/lib/state/useHoldings';
import { useLivePrices } from '@/lib/state/useLivePrices';
import { MockPriceProvider } from '@/lib/pricing/provider';
import { buildPortfolioView, HoldingRow } from '@/lib/state/store';
import type { PriceQuote } from '@/lib/domain/types';

type PortfolioView = ReturnType<typeof buildPortfolioView>;

interface DatasetResult {
  view: PortfolioView | null;
  byHolding: Record<string, HoldingRow>;
  pricesLive: boolean; // true once any live price has been applied
  pricesFetchedAt: number | null; // ms epoch when the live price cache was last written
}

export function useDataset(): DatasetResult {
  const userHoldings = useHoldings();

  // Live ungraded market prices keyed by catalog id (cache first, then network).
  const ownedIds = useMemo(() => userHoldings.map((h) => h.catalogItemId), [userHoldings]);
  const { prices: overrides, fetchedAt: pricesFetchedAt } = useLivePrices(ownedIds);
  const pricesLive = Object.keys(overrides).length > 0;

  const dataset = useMemo(
    () => buildDatasetFromHoldings(userHoldings, overrides),
    [userHoldings, overrides]
  );

  const [result, setResult] = useState<Omit<DatasetResult, 'pricesLive' | 'pricesFetchedAt'>>({ view: null, byHolding: {} });

  useEffect(() => {
    const { catalog, holdings, history } = dataset;

    const catalogById = Object.fromEntries(catalog.map((c) => [c.id, c]));
    const provider = new MockPriceProvider(history);
    const catalogIds = catalog.map((c) => c.id);

    Promise.all(
      catalogIds.map((id) => provider.getQuote(id).then((q) => [id, q] as [string, PriceQuote | null]))
    ).then((entries) => {
      const quotesByCatalogId = Object.fromEntries(entries);
      const view = buildPortfolioView(holdings, catalogById, quotesByCatalogId);

      const byHolding: Record<string, HoldingRow> = {};
      for (const row of view.rows) {
        byHolding[row.holdingId] = row;
      }

      setResult({ view, byHolding });
    });
  }, [dataset]);

  return { ...result, pricesLive, pricesFetchedAt };
}
