import { describe, it, expect } from 'vitest';
import { buildPortfolioView } from '@/lib/state/store';
import { buildDatasetFromHoldings } from '@/lib/data/buildRealDataset';
import { getHoldings } from '@/lib/state/holdingsStore';
import { MockPriceProvider } from '@/lib/pricing/provider';

describe('buildPortfolioView', () => {
  it('aggregates totals, rows and movers from the seeded real holdings', async () => {
    const d = buildDatasetFromHoldings(getHoldings());
    const provider = new MockPriceProvider(d.history);
    const catalogById = Object.fromEntries(d.catalog.map(c => [c.id, c]));
    const quotes: Record<string, any> = {};
    for (const c of d.catalog) quotes[c.id] = await provider.getQuote(c.id);
    const view = buildPortfolioView(d.holdings, catalogById, quotes);
    expect(view.rows.length).toBe(8); // seed = top 8 by market value
    expect(view.totalValue).toBeCloseTo(18135.82, 1);
    expect(view.movers.topGainer).toBeDefined();
  });

  it('dayChangePct denominator excludes data-poor rows', () => {
    // Row A: two data points → dayAbs = +10, prev = 100
    const quoteA: import('@/lib/domain/types').PriceQuote = {
      medianPrice: 110,
      lowPrice: null, highPrice: null,
      sourceCount: 5, confidenceScore: 0.8, confidenceLevel: 'high',
      observedAt: '2026-06-28T00:00:00Z', providerName: 'test',
      history: [
        { date: '2026-06-27', median: 100 },
        { date: '2026-06-28', median: 110 },
      ],
    };
    // Row B: single data point → no day change (data-poor)
    const quoteB: import('@/lib/domain/types').PriceQuote = {
      medianPrice: 500,
      lowPrice: null, highPrice: null,
      sourceCount: 1, confidenceScore: 0.1, confidenceLevel: 'unknown',
      observedAt: '2026-06-28T00:00:00Z', providerName: 'test',
      history: [
        { date: '2026-06-28', median: 500 },
      ],
    };

    const catA: import('@/lib/domain/types').CatalogItem = {
      id: 'cat-a', tcg: 'pokemon', language: 'en', title: 'Card A', year: '2024',
      setName: 'Set A', cardNumber: '001', gradingCompany: 'psa', grade: '10',
      canonicalKey: 'cat-a', metadataSource: 'test',
    };
    const catB: import('@/lib/domain/types').CatalogItem = {
      id: 'cat-b', tcg: 'pokemon', language: 'en', title: 'Card B', year: '2024',
      setName: 'Set B', cardNumber: '002', gradingCompany: 'psa', grade: '10',
      canonicalKey: 'cat-b', metadataSource: 'test',
    };

    const holdings: import('@/lib/domain/types').Holding[] = [
      { id: 'h-a', certificationId: 'cert-a', catalogItemId: 'cat-a', createdAt: '2026-06-28T00:00:00Z' },
      { id: 'h-b', certificationId: 'cert-b', catalogItemId: 'cat-b', createdAt: '2026-06-28T00:00:00Z' },
    ];

    const catalogById = { 'cat-a': catA, 'cat-b': catB };
    const quotesByCatalogId = { 'cat-a': quoteA, 'cat-b': quoteB };

    const view = buildPortfolioView(holdings, catalogById, quotesByCatalogId);

    // dayChangeAbs should be +10 (only Row A contributes)
    expect(view.dayChangeAbs).toBeCloseTo(10);
    // dayChangePct = 10 / 100 * 100 = 10, NOT diluted by Row B's 500
    expect(view.dayChangePct).toBeCloseTo(10);
  });
});
