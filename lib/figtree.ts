// Loads Figtree (the mockup's typeface) and routes every <Text>'s fontWeight to
// the matching static Figtree family — so existing components don't need editing.
// expo-font registers each weight as its own family, so fontWeight alone won't
// pick the right weight on web OR native; this maps weight → family globally.
import { Text as RNText, StyleSheet } from 'react-native';
import {
  useFonts,
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
  Figtree_800ExtraBold,
  Figtree_900Black,
} from '@expo-google-fonts/figtree';

function familyForWeight(w?: string | number): string {
  switch (String(w)) {
    case '500':
      return 'Figtree_500Medium';
    case '600':
      return 'Figtree_600SemiBold';
    case '700':
    case 'bold':
      return 'Figtree_700Bold';
    case '800':
      return 'Figtree_800ExtraBold';
    case '900':
      return 'Figtree_900Black';
    default:
      return 'Figtree_400Regular';
  }
}

let patched = false;
function patchTextFont() {
  if (patched) return;
  const Original = RNText as any;
  const origRender = Original.render;
  if (typeof origRender !== 'function') return;
  Original.render = function patchedRender(props: any, ref: any) {
    const flat = StyleSheet.flatten(props?.style) || {};
    const family = familyForWeight(flat.fontWeight);
    // Inject fontFamily at the props level (before render) so RN's own style
    // pipeline converts the array — cloning the rendered web element breaks.
    const nextProps = { ...props, style: [{ fontFamily: family }, props?.style] };
    return origRender.call(this, nextProps, ref);
  };
  patched = true;
}

patchTextFont();

export function useFigtree(): boolean {
  const [loaded] = useFonts({
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
    Figtree_800ExtraBold,
    Figtree_900Black,
  });
  return loaded;
}
