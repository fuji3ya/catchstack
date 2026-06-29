import React, { useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Path, Rect, G } from 'react-native-svg';
import { useTheme, useThemedStyles, type Theme } from '@/lib/design/theme';
import { CollectionTile } from '@/components/CollectionTile';
import { buildCollectionFromHoldings, COLLECTION_CATEGORIES, CATEGORY_LABEL } from '@/lib/data/collection';
import { useHoldings } from '@/lib/state/useHoldings';
import { useAlerts } from '@/lib/state/useAlerts';

import { FEATURES } from '@/lib/features';
const GRADE_FILTERS = ['All grades', 'GEM MT 10', 'PSA 10', 'Has alert'] as const;
const BARE_FILTERS = ['All', 'Has alert'] as const;
const ACTIVE_FILTERS: readonly string[] = FEATURES.SHOW_GRADES ? GRADE_FILTERS : BARE_FILTERS;
const SORTS = ['Value', 'Name', 'Movers'] as const;

function fmtUSD(n: number): string {
  return '$' + Math.round(n).toLocaleString('en-US');
}

export default function CollectionScreen() {
  const styles = useThemedStyles(makeStyles);
  const tokens = useTheme();

  const { width } = useWindowDimensions();
  const holdings = useHoldings();
  const alerts = useAlerts();
  const alertCardIds = useMemo(() => new Set(alerts.filter((a) => a.on).map((a) => a.catalogItemId)), [alerts]);
  const all = useMemo(() => buildCollectionFromHoldings(holdings), [holdings]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('All');
  const [grade, setGrade] = useState<string>(ACTIVE_FILTERS[0]);
  const [sortIdx, setSortIdx] = useState(0);
  const sort = SORTS[sortIdx];
  const searchRef = useRef<TextInput>(null);
  const [cols, setCols] = useState(2);

  const rows = useMemo(() => {
    let r = category === 'All' ? all : all.filter((c) => c.category === category);
    const q = search.trim().toLowerCase();
    if (q) r = r.filter((c) => c.title.toLowerCase().includes(q) || c.set.toLowerCase().includes(q) || c.cert.includes(q));
    if (grade === 'GEM MT 10') r = r.filter((c) => c.grade === 'GEM MT 10');
    else if (grade === 'PSA 10') r = r.filter((c) => c.grade === 'PSA 10');
    else if (grade === 'Has alert') r = r.filter((c) => alertCardIds.has(c.id));
    const sorted = [...r];
    if (sort === 'Value') sorted.sort((a, b) => b.marketUsd - a.marketUsd);
    else if (sort === 'Name') sorted.sort((a, b) => a.title.localeCompare(b.title));
    else sorted.sort((a, b) => b.dayPct - a.dayPct);
    return sorted;
  }, [all, category, search, grade, sort]);

  const total = rows.reduce((s, c) => s + c.marketUsd, 0);
  const screenW = Math.min(width, 440);
  const cellW = (screenW - 48 - 14 * (cols - 1)) / cols;
  const catLabel = CATEGORY_LABEL[category] || category;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* top bar */}
        <View style={styles.topbar}>
          <Text style={styles.title}>Collection</Text>
          <View style={styles.acts}>
            <TouchableOpacity style={styles.iconbtn} activeOpacity={0.7} onPress={() => searchRef.current?.focus()} hitSlop={6} accessibilityRole="button" accessibilityLabel="Focus search">
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none"><G stroke={tokens.color.textSecondary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><Circle cx="11" cy="11" r="7" /><Line x1="16.2" y1="16.2" x2="21" y2="21" /></G></Svg>
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconbtn} activeOpacity={0.7} onPress={() => setCols((c) => (c === 2 ? 3 : 2))} hitSlop={6} accessibilityRole="button" accessibilityLabel={`Switch to ${cols === 2 ? 'three' : 'two'} columns`}>
              {cols === 2 ? (
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none"><G stroke={tokens.color.textSecondary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><Rect x="3" y="3" width="5" height="5" rx="1.2" /><Rect x="10" y="3" width="5" height="5" rx="1.2" /><Rect x="17" y="3" width="4" height="5" rx="1.2" /><Rect x="3" y="10" width="5" height="5" rx="1.2" /><Rect x="10" y="10" width="5" height="5" rx="1.2" /><Rect x="17" y="10" width="4" height="5" rx="1.2" /></G></Svg>
              ) : (
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none"><G stroke={tokens.color.textSecondary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><Rect x="4" y="4" width="7" height="7" rx="1.4" /><Rect x="13" y="4" width="7" height="7" rx="1.4" /><Rect x="4" y="13" width="7" height="7" rx="1.4" /><Rect x="13" y="13" width="7" height="7" rx="1.4" /></G></Svg>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* search */}
        <View style={styles.searchWrap}>
          <Svg width={17} height={17} viewBox="0 0 24 24" fill="none"><G stroke="#A1A1A6" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><Circle cx="11" cy="11" r="7" /><Line x1="16.2" y1="16.2" x2="21" y2="21" /></G></Svg>
          <TextInput
            ref={searchRef}
            style={styles.searchInput}
            placeholder={FEATURES.SHOW_GRADES ? 'Search name, set, or cert…' : 'Search name or set…'}
            placeholderTextColor={tokens.color.textTertiary}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>

        {/* category chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow} keyboardShouldPersistTaps="handled">
          {COLLECTION_CATEGORIES.map((c) => {
            const on = c === category;
            return (
              <TouchableOpacity key={c} style={[styles.chip, on && styles.chipOn]} activeOpacity={0.8} onPress={() => setCategory(c)}>
                <Text style={[styles.chipTxt, on && styles.chipTxtOn]}>{CATEGORY_LABEL[c] || c}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* summary */}
        <Text style={styles.summary}>
          <Text style={styles.summaryB}>{rows.length}</Text> cards · <Text style={styles.summaryB}>{fmtUSD(total)}</Text> total value
        </Text>

        {/* grade filter + sort */}
        <View style={styles.filterRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gradeChips} keyboardShouldPersistTaps="handled">
            {ACTIVE_FILTERS.map((g) => {
              const on = g === grade;
              return (
                <TouchableOpacity key={g} style={[styles.chip, on && styles.chipOn]} activeOpacity={0.8} onPress={() => setGrade(g)}>
                  <Text style={[styles.chipTxt, on && styles.chipTxtOn]}>{g}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <TouchableOpacity style={styles.sortBtn} activeOpacity={0.8} onPress={() => setSortIdx((i) => (i + 1) % SORTS.length)}>
            <Text style={styles.sortLbl}>Sort:</Text>
            <Text style={styles.sortVal}>{sort}</Text>
            <Svg width={11} height={11} viewBox="0 0 12 12" fill="none"><Path d="M3 4.5L6 7.5L9 4.5" stroke="#1C1C1E" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" /></Svg>
          </TouchableOpacity>
        </View>

        {/* grid */}
        {rows.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Svg width={26} height={26} viewBox="0 0 24 24" fill="none"><G stroke="#A1A1A6" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><Rect x="4" y="3" width="16" height="18" rx="2.2" /><Line x1="12" y1="9" x2="12" y2="15" /><Line x1="9" y1="12" x2="15" y2="12" /></G></Svg>
            </View>
            <Text style={styles.emptyT}>{search.trim() ? 'No matching cards' : `No ${catLabel} cards yet`}</Text>
            <Text style={styles.emptyS}>{search.trim() ? (FEATURES.SHOW_GRADES ? 'Try a different name, set, or cert number.' : 'Try a different name or set.') : `${catLabel} is supported — add one from the Add tab to start tracking it here.`}</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {rows.map((card) => (
              <View key={card.holdingId ?? card.id} style={{ width: cellW }}>
                <CollectionTile card={card} holdingId={card.holdingId} />
              </View>
            ))}
          </View>
        )}

        {/* disclaimer */}
        <Text style={styles.disclaim}>
          Reference market value · ungraded · TCGplayer via pokemontcg.io / Scryfall.{'\n'}
          Prices are public ungraded reference values — not an appraisal.
        </Text>
        <View style={{ height: tokens.space.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (tokens: Theme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.color.bg },
  scroll: { flex: 1 },
  content: { paddingBottom: 24, maxWidth: 440, width: '100%', alignSelf: 'center' },

  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 6, paddingBottom: 12 },
  title: { fontSize: 22, fontWeight: '700', letterSpacing: -0.6, color: tokens.color.textPrimary },
  acts: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconbtn: { width: 36, height: 36, borderRadius: 11, backgroundColor: tokens.color.surface, borderWidth: 0.5, borderColor: tokens.color.border, alignItems: 'center', justifyContent: 'center' },

  searchWrap: {
    marginHorizontal: 24, flexDirection: 'row', alignItems: 'center', gap: 9,
    backgroundColor: tokens.color.surface, borderWidth: 0.5, borderColor: tokens.color.border, borderRadius: 13, paddingHorizontal: 14, paddingVertical: 4,
  },
  searchInput: { flex: 1, fontSize: 15, color: tokens.color.textPrimary, letterSpacing: -0.2, paddingVertical: 9 },

  catRow: { gap: 8, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 2 },
  chip: { paddingVertical: 7, paddingHorizontal: 13, borderRadius: 999, backgroundColor: tokens.color.surface, borderWidth: 0.5, borderColor: tokens.color.border },
  chipOn: { backgroundColor: tokens.color.accent, borderColor: 'transparent' },
  chipTxt: { fontSize: 13, fontWeight: '600', letterSpacing: -0.1, color: tokens.color.textSecondary },
  chipTxtOn: { color: tokens.color.onAccent },

  summary: { paddingHorizontal: 24, paddingTop: 13, paddingBottom: 2, fontSize: 13, letterSpacing: -0.1, color: tokens.color.textTertiary },
  summaryB: { color: tokens.color.textSecondary, fontWeight: '600' },

  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 12, paddingBottom: 6 },
  gradeChips: { gap: 8, paddingHorizontal: 24, paddingVertical: 2 },
  sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, marginRight: 24, backgroundColor: tokens.color.surface, borderWidth: 0.5, borderColor: tokens.color.border, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 12 },
  sortLbl: { fontSize: 13, color: tokens.color.textTertiary, fontWeight: '500' },
  sortVal: { fontSize: 13, fontWeight: '600', letterSpacing: -0.1, color: tokens.color.textPrimary },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, paddingHorizontal: 24, paddingTop: 14 },

  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 56, paddingHorizontal: 24, gap: 14 },
  emptyIcon: { width: 58, height: 58, borderRadius: 16, backgroundColor: tokens.color.surface, borderWidth: 0.5, borderColor: tokens.color.border, alignItems: 'center', justifyContent: 'center', ...tokens.shadow.card },
  emptyT: { fontSize: 15, fontWeight: '600', letterSpacing: -0.2, color: tokens.color.textPrimary },
  emptyS: { fontSize: 13, color: tokens.color.textTertiary, letterSpacing: -0.1, lineHeight: 20, textAlign: 'center', maxWidth: 240 },

  disclaim: { paddingHorizontal: 24, paddingTop: 22, fontSize: 11, lineHeight: 17, color: tokens.color.textTertiary },
});
