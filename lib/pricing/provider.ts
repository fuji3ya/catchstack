import type { PriceProvider, PriceQuote, PricePoint } from '@/lib/domain/types';
import { confidenceScore, confidenceLevel } from '@/lib/pricing/calc';
export type { PriceProvider } from '@/lib/domain/types';

function quoteFromHistory(history: PricePoint[], providerName: string): PriceQuote {
  const median = history[history.length - 1].median;
  const lows = history.map(h => h.median);
  const low = Math.min(...lows), high = Math.max(...lows);
  const rangeRatio = median > 0 ? (high - low) / median : 1;
  const sourceCount = Math.max(1, Math.round(history.length / 8));
  const score = confidenceScore({ sourceCount, daysSinceUpdate: 1, rangeRatio, multiSource: false });
  return { medianPrice: median, lowPrice: low, highPrice: high, sourceCount,
    confidenceScore: score, confidenceLevel: confidenceLevel(score),
    observedAt: history[history.length - 1].date, providerName, history };
}

export class MockPriceProvider implements PriceProvider {
  name = 'Mock';
  constructor(private history: Record<string, PricePoint[]>) {}
  async getQuote(catalogItemId: string): Promise<PriceQuote | null> {
    const h = this.history[catalogItemId];
    if (!h || h.length === 0) return null;
    return quoteFromHistory(h, this.name);
  }
}
