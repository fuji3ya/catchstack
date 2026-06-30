import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { View } from 'react-native';
import { useFigtree } from '@/lib/figtree';
import { hydrateHoldings } from '@/lib/state/holdingsStore';
import { hydrateAlerts } from '@/lib/state/alertsStore';
import { hydrateSettings } from '@/lib/state/settingsStore';
import { hydrateUserCatalog } from '@/lib/data/userCatalog';
import { useAlertEngine } from '@/lib/state/useAlertEngine';

export default function RootLayout() {
  const fontsLoaded = useFigtree();
  const [storesHydrated, setStoresHydrated] = useState(false);
  // Evaluate alerts against live prices app-wide (records triggers + notifies).
  useAlertEngine();
  useEffect(() => {
    // Block screen render until all three stores have read from AsyncStorage —
    // prevents the flicker / defaults-overwrite race where the UI shows seed
    // values, the user toggles something, then hydrate clobbers it.
    // Surface hydrate failures so we can notice silent storage corruption.
    // Each hydrate already swallows its own error and falls back to seed;
    // this just logs which one failed (and we still render — better to run
    // on defaults than to block the whole app behind broken storage).
    Promise.allSettled([hydrateHoldings(), hydrateAlerts(), hydrateSettings(), hydrateUserCatalog()]).then((results) => {
      results.forEach((r, i) => {
        if (r.status === 'rejected') {
          // eslint-disable-next-line no-console
          console.warn(`[catchstack] hydrate ${['holdings', 'alerts', 'settings', 'userCatalog'][i]} failed:`, r.reason);
        }
      });
      setStoresHydrated(true);
    });
  }, []);
  if (!fontsLoaded || !storesHydrated) {
    return <View style={{ flex: 1, backgroundColor: '#FBFBFA' }} />;
  }
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="holding/[id]" options={{ presentation: 'card' }} />
      <Stack.Screen name="info/[topic]" options={{ presentation: 'card' }} />
      <Stack.Screen name="alerts" options={{ presentation: 'card' }} />
      <Stack.Screen name="insights" options={{ presentation: 'card' }} />
    </Stack>
  );
}
