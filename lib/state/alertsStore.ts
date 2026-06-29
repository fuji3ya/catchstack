// Persisted user alert rules + triggered-event log. Lightweight external store.
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AlertFrequency = 'once' | 'every' | 'daily';
export type AlertCondType = 'above' | 'below' | 'up24' | 'up7' | 'down7' | 'cost' | 'high' | 'conf';

export interface UserAlert {
  id: string;
  catalogItemId: string;     // links to SEED_CARDS
  type: AlertCondType;       // structured condition (evaluated by the engine)
  value: string;             // threshold ("2,500", "10", "Medium")
  cond: string;              // pre-rendered display text (e.g. "Notify when ≥ $2,500")
  frequency: AlertFrequency;
  on: boolean;
  createdAt: string;
  lastTriggeredAt?: string;  // ISO date string of the most recent fire
}

export interface TriggeredEvent {
  id: string;
  alertId: string;
  catalogItemId: string;
  detail: string;            // "Reached $2,500" etc.
  at: string;                // ISO timestamp
}

const KEY = 'catchstack.alerts.v1';
const TRIG_KEY = 'catchstack.triggered.v1';

// Parse a legacy display string into a structured type+value (best effort).
function parseLegacyCond(cond: string): { type: AlertCondType; value: string } {
  const num = (cond.match(/[\d.,]+/)?.[0]) ?? '';
  if (/≥|above|reaches/i.test(cond)) return { type: 'above', value: num };
  if (/≤|below|falls/i.test(cond)) return { type: 'below', value: num };
  if (/up .* 7 day|in 7 days/i.test(cond)) return { type: 'up7', value: num };
  if (/up .*24|24h/i.test(cond)) return { type: 'up24', value: num };
  if (/down/i.test(cond)) return { type: 'down7', value: num };
  if (/cost/i.test(cond)) return { type: 'cost', value: num };
  if (/high/i.test(cond)) return { type: 'high', value: num };
  if (/confidence/i.test(cond)) return { type: 'conf', value: 'Medium' };
  return { type: 'above', value: num };
}

// Seed = the four starter alerts (so the screen never starts empty).
function seed(): UserAlert[] {
  return [
    { id: 'seed_swsh7-215', catalogItemId: 'swsh7-215', type: 'above', value: '2,500', cond: 'Notify when ≥ $2,500', frequency: 'once', on: true, createdAt: '2026-06-01' },
    { id: 'seed_ex13-103', catalogItemId: 'ex13-103', type: 'up7', value: '10', cond: 'Notify when up 10% in 7 days', frequency: 'once', on: true, createdAt: '2026-06-01' },
    { id: 'seed_ecard2-149', catalogItemId: 'ecard2-149', type: 'high', value: '3', cond: 'Notify when within 3% of 90-day high', frequency: 'daily', on: true, createdAt: '2026-06-01' },
    { id: 'seed_gym2-2', catalogItemId: 'gym2-2', type: 'cost', value: '20', cond: 'Notify when 20% above your cost', frequency: 'every', on: false, createdAt: '2026-06-01' },
  ];
}

let alerts: UserAlert[] = seed();
let events: TriggeredEvent[] = [];
let hydrated = false;
const listeners = new Set<() => void>();
function emit() { for (const l of listeners) l(); }

let writeChain: Promise<void> = Promise.resolve();
function persist() {
  const aSnap = JSON.stringify(alerts);
  const eSnap = JSON.stringify(events);
  writeChain = writeChain
    .then(() => AsyncStorage.setItem(KEY, aSnap))
    .then(() => AsyncStorage.setItem(TRIG_KEY, eSnap))
    .catch(() => {});
}

export async function hydrateAlerts() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const valid =
        Array.isArray(parsed) &&
        parsed.every((a) => a && typeof a.id === 'string' && typeof a.catalogItemId === 'string' && typeof a.cond === 'string' && typeof a.on === 'boolean');
      if (valid) {
        alerts = (parsed as UserAlert[]).map((a) => {
          // Backfill structured fields for alerts saved before the engine existed.
          if (a.type && a.value != null) return { ...a, frequency: a.frequency ?? 'once' };
          const { type, value } = parseLegacyCond(a.cond);
          return { ...a, type, value, frequency: a.frequency ?? 'once' };
        });
      }
    }
  } catch {
    // fall back to seed
  }
  try {
    const rawE = await AsyncStorage.getItem(TRIG_KEY);
    if (rawE) {
      const parsed = JSON.parse(rawE);
      if (Array.isArray(parsed)) events = parsed as TriggeredEvent[];
    }
  } catch {
    events = [];
  }
  hydrated = true;
  emit();
}
export function isAlertsHydrated(): boolean { return hydrated; }

export function getAlerts(): UserAlert[] { return alerts; }
export function getTriggeredEvents(): TriggeredEvent[] { return events; }
export function subscribeAlerts(cb: () => void): () => void {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

export function addAlert(input: { catalogItemId: string; type: AlertCondType; value: string; cond: string; frequency: AlertFrequency }): void {
  const uniq = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
  alerts = [{
    id: `alert_${uniq}`, catalogItemId: input.catalogItemId, type: input.type, value: input.value,
    cond: input.cond, frequency: input.frequency, on: true, createdAt: new Date().toISOString().slice(0, 10),
  }, ...alerts];
  persist();
  emit();
}

export function toggleAlert(id: string): void {
  alerts = alerts.map((a) => (a.id === id ? { ...a, on: !a.on } : a));
  persist();
  emit();
}

export function removeAlert(id: string): void {
  alerts = alerts.filter((a) => a.id !== id);
  persist();
  emit();
}

// Record that an alert fired. Stamps the alert's lastTriggeredAt and prepends a
// triggered event. Returns the new event (or null if deduped by frequency).
export function recordTriggered(alertId: string, catalogItemId: string, detail: string): TriggeredEvent | null {
  const alert = alerts.find((a) => a.id === alertId);
  if (!alert) return null;
  const now = new Date();
  const nowIso = now.toISOString();

  // Frequency gating.
  if (alert.frequency === 'once' && alert.lastTriggeredAt) return null;
  if (alert.frequency === 'daily' && alert.lastTriggeredAt) {
    const last = new Date(alert.lastTriggeredAt);
    if (now.getTime() - last.getTime() < 24 * 60 * 60 * 1000) return null;
  }

  const uniq = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
  const ev: TriggeredEvent = { id: `ev_${uniq}`, alertId, catalogItemId, detail, at: nowIso };
  events = [ev, ...events].slice(0, 50);
  alerts = alerts.map((a) => (a.id === alertId ? { ...a, lastTriggeredAt: nowIso } : a));
  persist();
  emit();
  return ev;
}
