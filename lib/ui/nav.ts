// Safe "go back" that falls back to a default destination when there is no
// back stack (e.g. the user deep-linked into a detail screen and pressed Back,
// or removed the current holding and we want them on the Collection tab).
// expo-router throws "The action 'GO_BACK' was not handled" otherwise.
import { router, type Href } from 'expo-router';

export function goBack(fallback: Href = '/(tabs)/collection'): void {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
