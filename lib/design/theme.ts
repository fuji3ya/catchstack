// Theme system. Light is the original palette; dark is a warm near-black
// premium palette (not a flat invert). Spacing / radius / type / shadow are
// shared. Dark mode is a Pro feature; free users always get light.
import { useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { tokens as lightTokens } from '@/lib/design/tokens';
import { useSettings } from '@/lib/state/useSettings';

export interface Theme {
  color: {
    bg: string; surface: string; surfaceSunken: string; border: string;
    textPrimary: string; textSecondary: string; textTertiary: string;
    accent: string; onAccent: string; gain: string; loss: string; gainBg: string; lossBg: string;
    gold: string; goldDeep: string; goldSoft: string;
    chartLine: string; chartFillTop: string; chartFillBottom: string;
    confidenceBg: { high: string; medium: string; low: string; unknown: string };
  };
  space: typeof lightTokens.space;
  radius: typeof lightTokens.radius;
  type: typeof lightTokens.type;
  shadow: typeof lightTokens.shadow;
}

export const lightTheme: Theme = lightTokens;

export const darkTheme: Theme = {
  ...lightTokens,
  color: {
    bg: '#0E0E10',          // warm near-black
    surface: '#1A1A1D',
    surfaceSunken: '#141416',
    border: '#2C2C30',      // hairline on dark
    textPrimary: '#F4F4F2',
    textSecondary: '#A6A6AB',
    textTertiary: '#6E6E73',
    accent: '#F4F4F2',
    onAccent: '#0E0E10',    // dark text on the light accent button (dark mode)
    gain: '#34C77B',        // brighter green for dark contrast
    loss: '#FF5247',
    gainBg: 'rgba(52,199,123,0.14)',
    lossBg: 'rgba(255,82,71,0.14)',
    gold: '#CBA86A',
    goldDeep: '#E1C589',
    goldSoft: 'rgba(203,168,106,0.18)',
    chartLine: '#34C77B',
    chartFillTop: 'rgba(52,199,123,0.18)',
    chartFillBottom: 'rgba(52,199,123,0.0)',
    confidenceBg: {
      high: 'rgba(52,199,123,0.14)',
      medium: 'rgba(166,166,171,0.14)',
      low: 'rgba(255,82,71,0.14)',
      unknown: 'rgba(110,110,115,0.16)',
    },
  },
};

export function useTheme(): Theme {
  const scheme = useColorScheme();
  const { appearance, pro } = useSettings();
  // Free tier is light-only; Pro unlocks dark + system.
  if (!pro) return lightTheme;
  if (appearance === 'Dark') return darkTheme;
  if (appearance === 'System') return scheme === 'dark' ? darkTheme : lightTheme;
  return lightTheme;
}

export function useThemedStyles<T>(factory: (t: Theme) => T): T {
  const t = useTheme();
  return useMemo(() => factory(t), [t]);
}
