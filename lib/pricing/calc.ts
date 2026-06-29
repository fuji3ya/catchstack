import type { PricePoint, ConfidenceLevel } from '@/lib/domain/types';

export function pctChange(current: number, previous: number | null | undefined): number | null {
  if (previous == null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}
export function dailyChange(history: PricePoint[]) {
  if (history.length < 2) return { abs: null, pct: null };
  const cur = history[history.length - 1].median;
  const prev = history[history.length - 2].median;
  return { abs: cur - prev, pct: pctChange(cur, prev) };
}
export function windowChange(history: PricePoint[], days: number) {
  if (history.length < days + 1) return { abs: null, pct: null };
  const cur = history[history.length - 1].median;
  const past = history[history.length - 1 - days].median;
  return { abs: cur - past, pct: pctChange(cur, past) };
}
export function confidenceScore(input: { sourceCount: number; daysSinceUpdate: number; rangeRatio: number; multiSource: boolean }): number {
  let s = 0;
  if (input.sourceCount >= 10) s += 0.4; else if (input.sourceCount >= 5) s += 0.25;
  if (input.daysSinceUpdate <= 7) s += 0.3; else if (input.daysSinceUpdate <= 30) s += 0.15;
  if (input.rangeRatio < 0.3) s += 0.2;
  if (input.multiSource) s += 0.1;
  return Math.min(1, s);
}
export function confidenceLevel(score: number): ConfidenceLevel {
  if (score >= 0.75) return 'high';
  if (score >= 0.45) return 'medium';
  if (score >= 0.2) return 'low';
  return 'unknown';
}
export function portfolioSummary(items: { median: number; cost?: number }[]) {
  let totalValue = 0, costBasis = 0, unrealizedPnl = 0;
  for (const it of items) {
    totalValue += it.median;
    if (it.cost != null) {
      costBasis += it.cost;
      unrealizedPnl += it.median - it.cost;
    }
  }
  return { totalValue, costBasis, unrealizedPnl };
}
