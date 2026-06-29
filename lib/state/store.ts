import type { Holding, CatalogItem, PriceQuote, ConfidenceLevel, PricePoint } from '@/lib/domain/types';
import { dailyChange, portfolioSummary } from '@/lib/pricing/calc';

export type HoldingRow = {
  holdingId: string; catalogItemId: string; title: string; setName: string; grade: string;
  median: number; dayChangePct: number | null; confidenceLevel: ConfidenceLevel; history: PricePoint[]; cost?: number;
  imageUrl?: string; tcg?: string;
  acquisitionDate?: string; storage?: string; notes?: string; lastUpdated?: string;
};

export function buildPortfolioView(
  holdings: Holding[],
  catalogById: Record<string, CatalogItem>,
  quotesByCatalogId: Record<string, PriceQuote | null>,
) {
  const rows: HoldingRow[] = [];
  for (const h of holdings) {
    const q = quotesByCatalogId[h.catalogItemId]; const cat = catalogById[h.catalogItemId];
    if (!q || !cat) continue;
    rows.push({ holdingId: h.id, catalogItemId: h.catalogItemId, title: cat.title, setName: cat.setName,
      grade: cat.grade ?? '', median: q.medianPrice, dayChangePct: dailyChange(q.history).pct,
      confidenceLevel: q.confidenceLevel, history: q.history, cost: h.acquisitionPrice,
      imageUrl: cat.imageUrl, tcg: cat.tcg,
      acquisitionDate: h.acquisitionDate, storage: h.storageLocation, notes: h.notes,
      lastUpdated: q.history.length ? q.history[q.history.length - 1].date : q.observedAt });
  }
  const summary = portfolioSummary(rows.map(r => ({ median: r.median, cost: r.cost })));
  let dayAbs = 0, prevTotal = 0;
  for (const r of rows) {
    const dc = dailyChange(r.history);
    if (dc.abs != null) { dayAbs += dc.abs; prevTotal += r.median - dc.abs; }
  }
  const dayPct = prevTotal > 0 ? (dayAbs / prevTotal) * 100 : null;
  const withChange = rows.filter(r => r.dayChangePct != null);
  const topGainer = [...withChange].sort((a,b)=>(b.dayChangePct!)-(a.dayChangePct!))[0];
  const topLoser = [...withChange].sort((a,b)=>(a.dayChangePct!)-(b.dayChangePct!))[0];
  const dataPoor = rows.find(r => r.history.length < 10);
  return { ...summary, dayChangeAbs: dayAbs, dayChangePct: dayPct, rows,
    movers: { topGainer, topLoser, dataPoor } };
}
