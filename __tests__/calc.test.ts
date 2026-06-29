import { describe, it, expect } from 'vitest';
import { pctChange, dailyChange, windowChange, confidenceScore, confidenceLevel, portfolioSummary } from '@/lib/pricing/calc';

const hist = (vals: number[]) => vals.map((v, i) => ({ date: `2026-06-${String(i + 1).padStart(2, '0')}`, median: v }));

describe('pctChange', () => {
  it('computes percent', () => expect(pctChange(110, 100)).toBeCloseTo(10));
  it('guards zero/missing', () => { expect(pctChange(110, 0)).toBeNull(); expect(pctChange(110, null)).toBeNull(); });
});
describe('dailyChange', () => {
  it('last vs prev', () => { const r = dailyChange(hist([100, 120])); expect(r.abs).toBe(20); expect(r.pct).toBeCloseTo(20); });
  it('insufficient data', () => expect(dailyChange(hist([100])).pct).toBeNull());
});
describe('windowChange', () => {
  it('7-day window', () => { const r = windowChange(hist([90,91,92,93,94,95,96,100]), 7); expect(r.abs).toBe(10); });
});
describe('confidence', () => {
  it('high when fresh+many+tight+multi', () => {
    const s = confidenceScore({ sourceCount: 12, daysSinceUpdate: 1, rangeRatio: 0.1, multiSource: true });
    expect(s).toBeGreaterThanOrEqual(0.75); expect(confidenceLevel(s)).toBe('high');
  });
  it('unknown when stale+thin', () => {
    const s = confidenceScore({ sourceCount: 0, daysSinceUpdate: 60, rangeRatio: 0.9, multiSource: false });
    expect(confidenceLevel(s)).toBe('unknown');
  });
});
describe('portfolioSummary', () => {
  it('totals + pnl', () => {
    const r = portfolioSummary([{ median: 100, cost: 80 }, { median: 50 }]);
    expect(r.totalValue).toBe(150); expect(r.costBasis).toBe(80); expect(r.unrealizedPnl).toBe(20);
  });
});
