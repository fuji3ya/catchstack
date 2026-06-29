// Feature flags — flip these to bring back grade/slab features when the
// grade-specific pricing problem is solved (PriceCharting commercial license,
// eBay Commercial Use approval, or a comparable source).
//
// Today: grade-specific prices have no usable public API (PSA API doesn't
// exist; eBay needs a commercial license; PriceCharting indie pricing is
// unclear). Showing "PSA 10" badges alongside ungraded reference prices is
// misleading, so we hide grade & slab UI until the data exists.
//
// Code, types, persisted data, and seed grade fields are all KEPT. Flipping
// these flags back to `true` restores the full slab portfolio experience
// with no data migration.

export const FEATURES = {
  /** Show grade badges (PSA 10 / GEM MT 10), CERT numbers, grade filters,
   *  and the grade picker in the Add screen. */
  SHOW_GRADES: false,

  /** Show the physical-slab visual treatment (white framed window + grade
   *  label band). When false, cards render as bare card images. */
  SHOW_SLAB_UI: false,
} as const;
