// Light, Mac-like premium. No navy, no neon.
export const tokens = {
  color: {
    bg: '#FBFBFA',          // paper white
    surface: '#FFFFFF',
    surfaceSunken: '#F4F4F2',
    border: '#ECECEA',      // hairline
    textPrimary: '#1C1C1E',
    textSecondary: '#6E6E73',
    textTertiary: '#A1A1A6',
    accent: '#1C1C1E',      // restrained near-black accent (Mac-like)
    onAccent: '#FFFFFF',    // text/icon on top of accent-filled buttons
    gain: '#1F8A4C',        // muted green
    loss: '#C0392B',        // muted red
    gainBg: 'rgba(31,138,76,0.08)',
    lossBg: 'rgba(192,57,43,0.08)',
    gold: '#C8A96A',        // the ONE metallic accent, used sparingly
    goldDeep: '#9C7D44',
    goldSoft: 'rgba(200,169,106,0.16)',
    chartLine: '#1F8A4C',
    chartFillTop: 'rgba(31,138,76,0.14)',
    chartFillBottom: 'rgba(31,138,76,0.0)',
    confidenceBg: {
      high: 'rgba(31,138,76,0.08)',
      medium: 'rgba(110,110,115,0.10)',
      low: 'rgba(192,57,43,0.08)',
      unknown: 'rgba(161,161,166,0.10)',
    },
  },
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
  radius: { sm: 8, md: 14, lg: 20, pill: 999 },
  type: {
    hero: { fontSize: 40, fontWeight: '700' as const, letterSpacing: -0.5 },
    title: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.3 },
    headline: { fontSize: 17, fontWeight: '600' as const },
    body: { fontSize: 15, fontWeight: '400' as const },
    caption: { fontSize: 13, fontWeight: '400' as const },
    mono: { fontSize: 15, fontWeight: '600' as const },
  },
  shadow: {
    card: { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  },
} as const;
export type Tokens = typeof tokens;
