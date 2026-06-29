import { useSyncExternalStore } from 'react';
import { subscribeAlerts, getAlerts, getTriggeredEvents, type UserAlert, type TriggeredEvent } from '@/lib/state/alertsStore';

export function useAlerts(): UserAlert[] {
  return useSyncExternalStore(subscribeAlerts, getAlerts, getAlerts);
}

export function useTriggeredEvents(): TriggeredEvent[] {
  return useSyncExternalStore(subscribeAlerts, getTriggeredEvents, getTriggeredEvents);
}
