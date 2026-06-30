// Builds the app dataset from the real curated showcase cards (seedCards.ts).
// Ports the deterministic logic from design/portfolio.html so the RN app matches
// the approved mockup: holdings = top 8 by market value, illustrative grades,
// per-card day moves, and a synthesized price history that ENDS at the real
// ungraded reference price (no real historical data exists for free — the line
// is a believable visualization anchored to the real current price, never
// presented as real history).

import type { CatalogItem, Holding, PricePoint } from '@/lib/domain/types';
import type { UserHolding } from '@/lib/state/holdingsStore';
import { SEED_CARDS } from '@/lib/data/seedCards';
import { resolveCard } from '@/lib/data/catalog';

// Mulberry32 deterministic PRNG.
function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStr(s: string): number {
  let h = 0;
  for (const c of s) h = (h * 131 + c.charCodeAt(0)) >>> 0;
  return h;
}

// Strip replacement chars / star glyphs / stray symbols (e.g. δ), keep clean text.
function cleanName(raw: string): string {
  return String(raw)
    .replace(/�/g, '')
    .replace(/[★☆✰✧]/g, '') // ★ ☆ ✰ ✧
    .replace(/[^\w &.,'\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[\s'.\-]+$/, '')
    .replace(/^[\s'.,\-]+/, '')
    .trim();
}

// Small plausible per-card day move (deterministic by id): ~ -3.2% .. +4.2%.
function dayMove(id: string): number {
  let h = 0;
  for (const c of id) h = (h * 131 + c.charCodeAt(0)) >>> 0;
  const v = ((h % 740) / 100) - 3.2;
  return Math.round(v * 100) / 100;
}

// History that ENDS at the real reference price, with the last day's change
// equal to `dayPct`. Earlier points are a believable accumulation path (NOT
// real data). `days` short (e.g. 6) makes a card read as data-poor/low-confidence.
function synthHistory(id: string, end: number, dayPct: number, days: number): PricePoint[] {
  const r = rng(hashStr(id) ^ 0x9e3779b9);
  const prev = end / (1 + dayPct / 100);
  const base = end * (0.45 + r() * 0.2);
  const n = Math.max(2, days);
  const vals = new Array<number>(n);
  // Keep full precision on the last two points so the displayed reference price
  // and portfolio total preserve cents (e.g. $18,135.82), matching the mockup.
  vals[n - 1] = end;
  vals[n - 2] = prev;
  for (let i = 0; i < n - 2; i++) {
    const t = n - 2 <= 0 ? 1 : i / (n - 2);
    const trend = base + (prev - base) * t;
    const noise = trend * (r() - 0.5) * 0.05;
    vals[i] = Math.max(1, Math.round(trend + noise));
  }
  // Anchor the synthesized line to TODAY so the x-axis and the "Updated" label
  // both move forward in time. Only the line's shape is synthetic; the end
  // point (vals[n-1]) is the live ungraded reference price (passed in as
  // `end`), so the displayed current price is real.
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const endDate = today.getTime();
  const out: PricePoint[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(endDate - (n - 1 - i) * 86400000);
    out.push({ date: d.toISOString().slice(0, 10), median: vals[i] });
  }
  return out;
}

export interface RealDataset {
  catalog: CatalogItem[];
  holdings: Holding[];
  history: Record<string, PricePoint[]>;
}

// Per-card market snapshot for ANY catalog card (owned or not) — used by the
// alerts engine to evaluate conditions. Price tracks the live override when
// present; history is the same end-anchored synthetic path shown in the UI.
export interface CardSnapshot {
  id: string;
  price: number;
  dayPct: number;
  high90: number;
  weekPct: number;
  history: PricePoint[];
}

export function buildCardSnapshot(cardId: string, priceOverrides: Record<string, number> = {}): CardSnapshot | null {
  const card = resolveCard(cardId);
  if (!card) return null;
  const price = priceOverrides[card.id] ?? card.marketUsd;
  const day = dayMove(card.id);
  const history = synthHistory(card.id, price, day, 90);
  const medians = history.map((p) => p.median);
  const high90 = Math.max(...medians);
  const weekAgo = history.length >= 8 ? history[history.length - 8].median : history[0].median;
  const weekPct = weekAgo > 0 ? ((price - weekAgo) / weekAgo) * 100 : 0;
  return { id: card.id, price, dayPct: day, high90, weekPct, history };
}

// Build the portfolio dataset from the user's OWNED holdings (the store).
// Each holding links to a catalog card; price history is synthesized per card,
// ending at its CURRENT reference price. `priceOverrides` supplies live ungraded
// market prices (from livePrices.ts) keyed by catalog id; when present they
// replace the bundled snapshot so the displayed value tracks the real market.
export function buildDatasetFromHoldings(
  userHoldings: UserHolding[],
  priceOverrides: Record<string, number> = {}
): RealDataset {
  const enriched = userHoldings
    .map((h) => ({ h, card: resolveCard(h.catalogItemId) }))
    .filter((x): x is { h: UserHolding; card: (typeof SEED_CARDS)[number] } => !!x.card);
  // Display order: by market value desc (highest-value slabs lead).
  enriched.sort((a, b) => b.card.marketUsd - a.card.marketUsd);

  const catalog: CatalogItem[] = [];
  const holdings: Holding[] = [];
  const history: Record<string, PricePoint[]> = {};

  enriched.forEach(({ h, card }, idx) => {
    const tcg = card.category === 'MTG' ? 'mtg' : 'pokemon';
    const day = dayMove(card.id);
    // Live market price when available, else the bundled snapshot.
    const refPrice = priceOverrides[card.id] ?? card.marketUsd;

    // History keyed per catalog card (duplicates of the same card share one).
    if (!history[card.id]) {
      // Lowest-value holding gets a short history → reads as data-poor (mover variety).
      const days = enriched.length > 1 && idx === enriched.length - 1 ? 6 : 90;
      history[card.id] = synthHistory(card.id, refPrice, day, days);
    }

    catalog.push({
      id: card.id, tcg, language: 'English', title: cleanName(card.name), year: '',
      setName: card.set, cardNumber: card.number, gradingCompany: 'psa', grade: h.grade,
      canonicalKey: card.id, metadataSource: 'seed', imageUrl: h.frontImageUrl ?? card.image,
    });

    holdings.push({
      id: h.id, certificationId: `cert_${card.id}`, catalogItemId: card.id,
      acquisitionPrice: h.cost, acquisitionCurrency: 'USD', acquisitionDate: h.acquisitionDate,
      storageLocation: h.storage, notes: h.notes, createdAt: h.addedAt,
    });
  });

  return { catalog, holdings, history };
}
