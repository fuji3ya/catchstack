// Pure alert-condition evaluation. Given an alert + a card's current market
// snapshot (+ optional acquisition cost), decide whether the condition is met
// right now and produce a human-readable detail for the triggered log.
import type { UserAlert } from '@/lib/state/alertsStore';
import type { CardSnapshot } from '@/lib/data/buildRealDataset';

export interface EvalResult { hit: boolean; detail: string }

function num(v: string): number {
  return parseFloat(String(v).replace(/[^0-9.]/g, '')) || 0;
}
function money(n: number): string {
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export function evaluateAlert(alert: UserAlert, snap: CardSnapshot, cost?: number): EvalResult {
  const v = num(alert.value);
  const price = snap.price;
  switch (alert.type) {
    case 'above':
      return { hit: price >= v, detail: `Reached ${money(v)}` };
    case 'below':
      return { hit: price <= v, detail: `Fell to ${money(v)}` };
    case 'up24':
      return { hit: snap.dayPct >= v, detail: `Up ${snap.dayPct.toFixed(1)}% today` };
    case 'up7':
      return { hit: snap.weekPct >= v, detail: `Up ${snap.weekPct.toFixed(1)}% this week` };
    case 'down7':
      return { hit: snap.weekPct <= -v, detail: `Down ${Math.abs(snap.weekPct).toFixed(1)}% this week` };
    case 'cost': {
      if (cost == null || cost <= 0) return { hit: false, detail: '' };
      const pct = ((price - cost) / cost) * 100;
      return { hit: pct >= v, detail: `${pct.toFixed(0)}% above your cost` };
    }
    case 'high': {
      const within = snap.high90 > 0 ? ((snap.high90 - price) / snap.high90) * 100 : 100;
      return { hit: within <= v, detail: `Within ${within.toFixed(1)}% of 90-day high` };
    }
    case 'conf':
      // Full-history cards read as high confidence; this condition needs a
      // data-poor card to ever fire, so it stays inert in the current model.
      return { hit: false, detail: '' };
    default:
      return { hit: false, detail: '' };
  }
}
