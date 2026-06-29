import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTheme, useThemedStyles, type Theme } from '@/lib/design/theme';
import { PriceChart } from '@/components/PriceChart';
import { catMeta } from '@/lib/design/cardPresentation';
import { FEATURES } from '@/lib/features';
import type { HoldingRow as HoldingRowData } from '@/lib/state/store';

interface HoldingRowProps {
  row: HoldingRowData;
  isLast?: boolean;
  listWidth?: number;
}

function formatMoney(val: number): string {
  return '$' + Math.round(val).toLocaleString('en-US');
}

function formatPct(val: number | null): string {
  if (val == null) return '—';
  const sign = val >= 0 ? '+' : '';
  return `${sign}${val.toFixed(2)}%`;
}

const THUMB_W = 46;
const THUMB_H = 60;

// Holdings list row — ported from the mockup's .holding (slab-mini + gold grade
// + category pip + price + day% + sparkline).
// Decorative day-direction sparkline (like the mockup) — but FIXED so the line
// agrees with the sign: gain rises, loss falls. (PriceChart maps higher median
// → higher on screen, so an increasing series rises.)
const SPARK_UP = [3, 4, 6, 5, 8, 7, 10, 12];
const SPARK_DOWN = [...SPARK_UP].reverse();
const SPARK_FLAT = SPARK_UP.map(() => 6);

export function HoldingRow({ row, isLast }: HoldingRowProps) {
  const styles = useThemedStyles(makeStyles);
  const tokens = useTheme();
  const isGain = row.dayChangePct != null && row.dayChangePct >= 0;
  const isFlat = row.dayChangePct == null || row.dayChangePct === 0;
  const pctColor = isFlat ? tokens.color.textTertiary : isGain ? tokens.color.gain : tokens.color.loss;
  const cat = catMeta(row.tcg);
  const sparkSeries = (isFlat ? SPARK_FLAT : isGain ? SPARK_UP : SPARK_DOWN).map((m, i) => ({
    date: String(i),
    median: m,
  }));

  return (
    <View>
      <TouchableOpacity
        style={styles.row}
        activeOpacity={0.72}
        onPress={() => router.push({ pathname: '/holding/[id]', params: { id: row.holdingId } })}
      >
        {/* thumbnail: slab-mini if SHOW_SLAB_UI, else bare card image */}
        {FEATURES.SHOW_SLAB_UI ? (
          <LinearGradient
            colors={['#FFFFFF', '#ECECEA']}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={styles.thumb}
          >
            <View style={styles.miniWin}>
              {row.imageUrl ? (
                <Image source={{ uri: row.imageUrl }} style={styles.miniImg} contentFit="cover" contentPosition="top" transition={150} />
              ) : null}
            </View>
          </LinearGradient>
        ) : (
          <View style={styles.bareThumb}>
            {row.imageUrl ? (
              <Image source={{ uri: row.imageUrl }} style={styles.miniImg} contentFit="cover" contentPosition="top" transition={150} />
            ) : null}
          </View>
        )}

        {/* main info */}
        <View style={styles.main}>
          <View style={styles.gradeRow}>
            {FEATURES.SHOW_GRADES ? (
              <Text style={styles.grade}>{row.grade ? row.grade.toUpperCase() : 'UNGRADED'}</Text>
            ) : null}
            <View style={styles.cat}>
              <View style={[styles.cdot, { backgroundColor: cat.dot }]} />
              <Text style={styles.catTxt}>{cat.tag}</Text>
            </View>
          </View>
          <Text style={styles.name} numberOfLines={1}>{row.title}</Text>
          <Text style={styles.set} numberOfLines={1}>{row.setName}</Text>
        </View>

        {/* price + change + sparkline */}
        <View style={styles.right}>
          <Text style={styles.price}>{formatMoney(row.median)}</Text>
          <Text style={[styles.chg, { color: pctColor }]}>{formatPct(row.dayChangePct)}</Text>
          <View style={styles.spark}>
            <PriceChart history={sparkSeries} width={52} height={18} color={pctColor} />
          </View>
        </View>
      </TouchableOpacity>
      {!isLast && <View style={styles.sep} />}
    </View>
  );
}

const makeStyles = (tokens: Theme) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    minHeight: 76,
  },
  thumb: {
    width: THUMB_W,
    height: THUMB_H,
    borderRadius: 7,
    padding: 2,
    shadowColor: '#1C1C1E',
    shadowOpacity: 0.16,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1.5 },
    elevation: 2,
  },
  miniWin: {
    flex: 1,
    borderRadius: 5,
    overflow: 'hidden',
    backgroundColor: '#EEF2F8',
  },
  bareThumb: {
    width: THUMB_W,
    height: THUMB_H,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#EEF2F8',
    shadowColor: '#1C1C1E',
    shadowOpacity: 0.14,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  miniImg: { width: '100%', height: '100%' },
  main: { flex: 1, minWidth: 0 },
  gradeRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  grade: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4, color: tokens.color.goldDeep, textTransform: 'uppercase' },
  cat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cdot: { width: 5, height: 5, borderRadius: 2.5 },
  catTxt: { fontSize: 10, fontWeight: '800', letterSpacing: 0.4, color: tokens.color.textTertiary, textTransform: 'uppercase' },
  name: { fontSize: 16, fontWeight: '600', letterSpacing: -0.3, color: tokens.color.textPrimary, marginTop: 3 },
  set: { fontSize: 13, color: tokens.color.textTertiary, letterSpacing: -0.1, marginTop: 3 },
  right: { alignItems: 'flex-end', gap: 4 },
  price: { fontSize: 16, fontWeight: '600', letterSpacing: -0.4, color: tokens.color.textPrimary },
  chg: { fontSize: 13, fontWeight: '600' },
  spark: { marginTop: 1 },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: tokens.color.border, marginLeft: 76 },
});
