// Presentation helpers for graded-slab cards — ported from the approved mockup
// (design/portfolio.html) so RN renders identical category tags, grades, certs.

// Single source of truth for category colours / short tags. Both the lowercase
// "tcg" lookup (catMeta) and the human "Category" lookup (catMetaForCategory)
// resolve to the same row — never let them drift.
const CAT_TABLE: Record<string, { tag: string; dot: string }> = {
  pokemon: { tag: 'PKMN', dot: '#E3350D' },
  mtg: { tag: 'MTG', dot: '#C8A96A' },
  yugioh: { tag: 'YGO', dot: '#7A4FB5' },
  onePiece: { tag: 'OP', dot: '#C0392B' },
  sports: { tag: 'SPRT', dot: '#1F6FB2' },
};
const FALLBACK = { tag: 'CARD', dot: '#A1A1A6' };

export function catMeta(tcg?: string): { tag: string; dot: string } {
  return (tcg && CAT_TABLE[tcg]) || FALLBACK;
}

export function gradeNum(grade: string): string {
  const m = grade.match(/([\d.]+)$/);
  return m ? m[1] : '10';
}

export function gradeKind(grade: string): 'Gem' | 'PSA' {
  return grade.toUpperCase().startsWith('GEM') ? 'Gem' : 'PSA';
}

// Deterministic cert number (matches the mockup's certFor).
export function certFor(id: string): string {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return (60000000 + (h % 19000000)).toString();
}

// Strip replacement chars / star glyphs / stray symbols (e.g. δ).
export function cleanName(raw: string): string {
  return String(raw)
    .replace(/�/g, '')
    .replace(/[★☆✰✧]/g, '')
    .replace(/[^\w &.,'\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[\s'.\-]+$/, '')
    .replace(/^[\s'.,\-]+/, '')
    .trim();
}

// Illustrative grade (deterministic by id) — same pool as the mockup.
export function gradeFor(id: string): string {
  let h = 0;
  for (const c of id) h = (h * 37 + c.charCodeAt(0)) >>> 0;
  const pool = ['GEM MT 10', 'GEM MT 10', 'PSA 10', 'GEM MT 10', 'PSA 9.5'];
  return pool[h % pool.length];
}

// Small plausible per-card day move (deterministic by id): ~ -3.2% .. +4.2%.
export function dayMove(id: string): number {
  let h = 0;
  for (const c of id) h = (h * 131 + c.charCodeAt(0)) >>> 0;
  const v = ((h % 740) / 100) - 3.2;
  return Math.round(v * 100) / 100;
}

// Category presentation keyed by the catalog's display category name.
const CATEGORY_TO_TCG: Record<string, string> = {
  Pokemon: 'pokemon',
  MTG: 'mtg',
  'Yu-Gi-Oh': 'yugioh',
  'One Piece': 'onePiece',
  Sports: 'sports',
};
export function catMetaForCategory(category: string): { tag: string; dot: string } {
  return catMeta(CATEGORY_TO_TCG[category]);
}
