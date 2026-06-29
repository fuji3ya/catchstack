// Evaluates enabled alerts against live prices and records triggers. Mounted
// once (in the root layout) so alerts fire regardless of which screen is open.
import { useEffect, useMemo } from 'react';
import { useAlerts } from '@/lib/state/useAlerts';
import { useHoldings } from '@/lib/state/useHoldings';
import { useLivePrices } from '@/lib/state/useLivePrices';
import { buildCardSnapshot } from '@/lib/data/buildRealDataset';
import { evaluateAlert } from '@/lib/alerts/evaluate';
import { recordTriggered } from '@/lib/state/alertsStore';
import { notifyTriggered } from '@/lib/alerts/notify';
import { SEED_CARDS } from '@/lib/data/seedCards';

const TITLE_BY_ID = Object.fromEntries(SEED_CARDS.map((c) => [c.id, c.name]));

export function useAlertEngine(): void {
  const alerts = useAlerts();
  const holdings = useHoldings();

  // Fetch live prices for every card that has an enabled alert.
  const alertCardIds = useMemo(
    () => alerts.filter((a) => a.on).map((a) => a.catalogItemId),
    [alerts]
  );
  const { prices } = useLivePrices(alertCardIds);

  // Lowest cost per owned card (for the "% above cost" condition).
  const costByCard = useMemo(() => {
    const m: Record<string, number> = {};
    for (const h of holdings) {
      if (h.cost != null && (m[h.catalogItemId] == null || h.cost < m[h.catalogItemId])) {
        m[h.catalogItemId] = h.cost;
      }
    }
    return m;
  }, [holdings]);

  useEffect(() => {
    for (const alert of alerts) {
      if (!alert.on) continue;
      const snap = buildCardSnapshot(alert.catalogItemId, prices);
      if (!snap) continue;
      const { hit, detail } = evaluateAlert(alert, snap, costByCard[alert.catalogItemId]);
      if (!hit) continue;
      const ev = recordTriggered(alert.id, alert.catalogItemId, detail);
      if (ev) {
        const name = TITLE_BY_ID[alert.catalogItemId] ?? 'A card';
        notifyTriggered('Catchstack price alert', `${name} — ${detail}`);
      }
    }
    // Re-evaluate whenever alerts or live prices change.
  }, [alerts, prices, costByCard]);
}
