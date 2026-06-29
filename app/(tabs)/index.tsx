import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, useWindowDimensions, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { useTheme, useThemedStyles, type Theme } from '@/lib/design/theme';
import { useDataset } from '@/lib/state/useDataset';
import { useSettings } from '@/lib/state/useSettings';
import { PortfolioChart } from '@/components/PortfolioChart';
import { SlabCard } from '@/components/SlabCard';
import { HoldingRow } from '@/components/HoldingRow';
import type { HoldingRow as HoldingRowData } from '@/lib/state/store';

function fmtUSD(n: number, withCents = false): string {
  return '$' + n.toLocaleString('en-US', withCents ? { minimumFractionDigits: 2, maximumFractionDigits: 2 } : { maximumFractionDigits: 0 });
}

function buildTrending(rows: HoldingRowData[]): HoldingRowData[] {
  const sorted = [...rows].sort((a, b) => b.median - a.median);
  const top = sorted.slice(0, 3);
  const seen = new Set(top.map((r) => r.catalogItemId));
  const cats = Array.from(new Set(sorted.map((r) => r.tcg)));
  cats.forEach((c) => {
    const lead = sorted.find((r) => r.tcg === c && !seen.has(r.catalogItemId));
    if (lead) { top.push(lead); seen.add(lead.catalogItemId); }
  });
  for (const r of sorted) {
    if (top.length >= 6) break;
    if (!seen.has(r.catalogItemId)) { top.push(r); seen.add(r.catalogItemId); }
  }
  return top.sort((a, b) => b.median - a.median).slice(0, 6);
}

// Relative-time label for when the live price cache was last written.
// Falls back to the most-recent holdings date if we never reached the network.
function formatUpdated(rows: HoldingRowData[], pricesFetchedAt: number | null): string {
  if (pricesFetchedAt) {
    const s = Math.max(0, Math.floor((Date.now() - pricesFetchedAt) / 1000));
    if (s < 60) return 'Updated just now';
    const m = Math.floor(s / 60);
    if (m < 60) return `Updated ${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `Updated ${h}h ago`;
    const d = Math.floor(h / 24);
    return `Updated ${d}d ago`;
  }
  // Fallback: no live cache yet — surface the bundled-snapshot date.
  let latest: Date | null = null;
  for (const r of rows) {
    const s = r.lastUpdated;
    if (!s) continue;
    const d = new Date(s.length === 10 ? s + 'T00:00:00Z' : s);
    if (isNaN(d.getTime())) continue;
    if (!latest || d > latest) latest = d;
  }
  if (!latest) return 'Reference data';
  return 'Updated ' + latest.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export default function PortfolioScreen() {
  const styles = useThemedStyles(makeStyles);
  const tokens = useTheme();
  const { view, pricesFetchedAt } = useDataset();
  const { currency } = useSettings();
  const { width } = useWindowDimensions();

  const trending = useMemo(() => (view ? buildTrending(view.rows) : []), [view]);
  const updatedLabel = useMemo(() => (view ? formatUpdated(view.rows, pricesFetchedAt) : 'Loading…'), [view, pricesFetchedAt]);

  if (!view) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.loading}><Text style={styles.loadingTxt}>Loading…</Text></View>
      </SafeAreaView>
    );
  }

  const total = view.totalValue;
  const whole = Math.floor(total);
  const cents = Math.round((total - whole) * 100).toString().padStart(2, '0');

  // Day change computed the same way as the mockup (sum of value * dayPct).
  const dayUsd = view.rows.reduce((s, r) => s + (r.dayChangePct != null ? r.median * (r.dayChangePct / 100) : 0), 0);
  const dayPct = total > 0 ? (dayUsd / total) * 100 : 0;
  const dayUp = dayUsd >= 0;
  const dayColor = dayUp ? tokens.color.gain : tokens.color.loss;

  const screenW = Math.min(width, 440);
  const chartW = screenW - tokens.space.xl * 2 - 32; // card horizontal padding (16*2)

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* top bar */}
        <View style={styles.topbar}>
          <View style={styles.brand}>
            <LinearGradient colors={['#2B2B2E', '#161618']} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={styles.mark}>
              <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
                <Path d="M10 3.6C9.3 2.6 8.2 2 7 2 5.3 2 4 3 4 4.5c0 1.3 1 2 2.8 2.5C9.1 7.6 10 8.4 10 9.8 10 11.2 8.6 12 7 12c-1.4 0-2.7-.7-3.3-1.8" stroke="#C8A96A" strokeWidth={1.5} strokeLinecap="round" fill="none" />
              </Svg>
            </LinearGradient>
            <Text style={styles.brandName}>Catchstack</Text>
          </View>
          <View style={styles.updated}>
            <Text style={styles.usd}>{currency}</Text>
            <Text style={styles.ts}>{updatedLabel}</Text>
          </View>
        </View>

        {/* hero */}
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Total Value</Text>
          <View style={styles.total}>
            <Text style={styles.cur}>$</Text>
            <Text style={styles.totalWhole}>{whole.toLocaleString('en-US')}</Text>
            <Text style={styles.dec}>.{cents}</Text>
          </View>

          <View style={[styles.daypill, { backgroundColor: dayUp ? tokens.color.gainBg : tokens.color.lossBg }]}>
            <Text style={[styles.arrow, { color: dayColor }]}>{dayUp ? '▲' : '▼'}</Text>
            <Text style={[styles.daytxt, { color: dayColor }]}>{(dayUp ? '' : '-') + fmtUSD(Math.abs(dayUsd), true)}</Text>
            <View style={[styles.daydot, { backgroundColor: dayColor }]} />
            <Text style={[styles.daytxt, { color: dayColor }]}>{(dayUp ? '+' : '') + dayPct.toFixed(2)}% today</Text>
          </View>

          {/* stats box */}
          <View style={styles.statsShadow}>
            <View style={styles.statsGrid}>
              <View style={styles.stat}>
                <Text style={styles.statK}>Cost Basis</Text>
                <Text style={styles.statV}>{fmtUSD(view.costBasis)}</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statK}>Unrealized P/L</Text>
                <Text style={[styles.statV, { color: view.unrealizedPnl >= 0 ? tokens.color.gain : tokens.color.loss }]}>
                  {(view.unrealizedPnl >= 0 ? '+' : '-') + fmtUSD(Math.abs(view.unrealizedPnl))}
                </Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statK}>Holdings</Text>
                <Text style={styles.statV}>{view.rows.length}</Text>
              </View>
            </View>
          </View>

          {/* portfolio health */}
          <TouchableOpacity style={styles.health} activeOpacity={0.7} onPress={() => router.push('/insights')}>
            <Text style={styles.healthTxt}>Portfolio health</Text>
            <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
              <Path d="M6 4l4 4-4 4" stroke="#A1A1A6" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </TouchableOpacity>
        </View>

        {/* chart */}
        <View style={styles.chartHolder}>
          <PortfolioChart total={total} width={chartW} />
        </View>

        {/* trending */}
        <View style={styles.sec}>
          <Text style={styles.secTitle}>Trending <Text style={styles.secSubtle}>— top market value</Text></Text>
          <TouchableOpacity activeOpacity={0.6} onPress={() => router.push('/collection')}>
            <Text style={styles.secMore}>See all</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
          {trending.map((r) => (
            <SlabCard key={r.holdingId} row={r} />
          ))}
        </ScrollView>

        {/* holdings */}
        <View style={styles.sec}>
          <Text style={styles.secTitle}>Your holdings</Text>
          <Text style={styles.secMore}>Value</Text>
        </View>
        <View style={styles.list}>
          {view.rows.map((row, i) => (
            <HoldingRow key={row.holdingId} row={row} isLast={i === view.rows.length - 1} />
          ))}
        </View>

        {/* disclaimer */}
        <Text style={styles.disclaim}>
          Reference market value · ungraded · TCGplayer via pokemontcg.io / Scryfall.{'\n'}
          Only the current price is live — the chart shape is illustrative.{'\n'}
          Prices are public ungraded reference values — not an appraisal.
        </Text>

        <View style={{ height: tokens.space.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (tokens: Theme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.color.bg },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingTxt: { color: tokens.color.textSecondary, fontSize: 15 },
  scroll: { flex: 1 },
  content: { paddingBottom: 24, maxWidth: 440, width: '100%', alignSelf: 'center' },

  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 6, paddingBottom: 14 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  mark: { width: 26, height: 26, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  brandName: { fontSize: 19, fontWeight: '700', letterSpacing: -0.5, color: tokens.color.textPrimary },
  updated: { alignItems: 'flex-end', gap: 2 },
  usd: {
    fontSize: 11, fontWeight: '700', letterSpacing: 0.6, color: tokens.color.textSecondary,
    backgroundColor: tokens.color.surface, borderWidth: 0.5, borderColor: tokens.color.border, borderRadius: 6,
    paddingVertical: 3, paddingHorizontal: 7, overflow: 'hidden',
  },
  ts: { fontSize: 10.5, color: tokens.color.textTertiary },

  hero: { paddingHorizontal: 24, paddingTop: 8 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, color: tokens.color.textTertiary, textTransform: 'uppercase' },
  total: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 8 },
  cur: { fontSize: 30, fontWeight: '600', color: tokens.color.textSecondary, letterSpacing: -1, marginTop: 5, marginRight: 1 },
  totalWhole: { fontSize: 53, fontWeight: '700', letterSpacing: -1.7, color: tokens.color.textPrimary, lineHeight: 56 },
  dec: { fontSize: 53, fontWeight: '600', letterSpacing: -1.7, color: tokens.color.textTertiary, lineHeight: 56 },

  daypill: { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', marginTop: 14, paddingVertical: 7, paddingLeft: 11, paddingRight: 13, borderRadius: 999 },
  arrow: { fontSize: 10 },
  daytxt: { fontSize: 13.5, fontWeight: '600', letterSpacing: -0.1 },
  daydot: { width: 3, height: 3, borderRadius: 1.5, opacity: 0.5 },

  statsShadow: { marginTop: 20, borderRadius: 16, ...tokens.shadow.card },
  statsGrid: { flexDirection: 'row', gap: 1, backgroundColor: tokens.color.border, borderRadius: 16, overflow: 'hidden' },
  stat: { flex: 1, backgroundColor: tokens.color.surface, paddingVertical: 15, paddingHorizontal: 14 },
  statK: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4, color: tokens.color.textTertiary, textTransform: 'uppercase' },
  statV: { fontSize: 17, fontWeight: '700', letterSpacing: -0.5, color: tokens.color.textPrimary, marginTop: 7 },

  health: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, paddingTop: 12 },
  healthTxt: { fontSize: 13, fontWeight: '600', color: tokens.color.textSecondary, letterSpacing: -0.1 },

  chartHolder: { paddingHorizontal: 24, marginTop: 28 },

  sec: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 30 },
  secTitle: { fontSize: 19, fontWeight: '600', letterSpacing: -0.4, color: tokens.color.textPrimary },
  secSubtle: { fontWeight: '500', color: tokens.color.textTertiary, letterSpacing: -0.2 },
  secMore: { fontSize: 13, fontWeight: '600', color: tokens.color.textSecondary, letterSpacing: -0.1 },

  rail: { gap: 12, paddingHorizontal: 24, paddingTop: 18, paddingBottom: 14 },

  list: { marginHorizontal: 24, marginTop: 16, backgroundColor: tokens.color.surface, borderRadius: 20, overflow: 'hidden', ...tokens.shadow.card },

  disclaim: { paddingHorizontal: 24, paddingTop: 18, fontSize: 11, lineHeight: 17, color: tokens.color.textTertiary },
});
