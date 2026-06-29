import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { useThemedStyles, type Theme } from '@/lib/design/theme';
import { GradeBadge } from '@/components/GradeBadge';
import { catMeta, certFor } from '@/lib/design/cardPresentation';
import { FEATURES } from '@/lib/features';
import type { HoldingRow } from '@/lib/state/store';

function fmtUSD(n: number): string {
  return '$' + Math.round(n).toLocaleString('en-US');
}

// Featured "Trending" card. Renders as a physical slab (white frame + grade
// label band) when FEATURES.SHOW_SLAB_UI is true; otherwise renders a bare
// card image — same data, same nav, no grade/CERT noise.
export function SlabCard({ row }: { row: HoldingRow }) {
  const styles = useThemedStyles(makeStyles);
  const cat = catMeta(row.tcg);
  return (
    <TouchableOpacity
      style={styles.wrap}
      activeOpacity={0.72}
      onPress={() => router.push({ pathname: '/holding/[id]', params: { id: row.holdingId } })}
    >
      {FEATURES.SHOW_SLAB_UI ? (
        <LinearGradient
          colors={['#FFFFFF', '#F6F6F4', '#ECECEA']}
          locations={[0, 0.52, 1]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={styles.slab}
        >
          <View style={styles.catTag}>
            <View style={[styles.cdot, { backgroundColor: cat.dot }]} />
            <Text style={styles.catTagTxt}>{cat.tag}</Text>
          </View>

          {FEATURES.SHOW_GRADES ? (
            <View style={styles.label}>
              <GradeBadge grade={row.grade} size={34} />
              <View style={styles.ltxt}>
                <Text style={styles.gradeName} numberOfLines={1}>{row.grade}</Text>
                <Text style={styles.cardName} numberOfLines={1}>{row.title}</Text>
                <Text style={styles.cert} numberOfLines={1}>CERT {certFor(row.catalogItemId)}</Text>
              </View>
            </View>
          ) : null}

          <View style={styles.window}>
            {row.imageUrl ? (
              <Image
                source={{ uri: row.imageUrl }}
                style={styles.windowImg}
                contentFit="cover"
                contentPosition="top"
                transition={150}
              />
            ) : null}
          </View>
        </LinearGradient>
      ) : (
        <View style={styles.bare}>
          <View style={styles.catTag}>
            <View style={[styles.cdot, { backgroundColor: cat.dot }]} />
            <Text style={styles.catTagTxt}>{cat.tag}</Text>
          </View>
          <View style={styles.bareWindow}>
            {row.imageUrl ? (
              <Image
                source={{ uri: row.imageUrl }}
                style={styles.windowImg}
                contentFit="cover"
                contentPosition="top"
                transition={150}
              />
            ) : null}
          </View>
        </View>
      )}

      <View style={styles.meta}>
        <Text style={styles.ttl} numberOfLines={1}>{row.title}</Text>
        <Text style={styles.sset} numberOfLines={1}>{row.setName}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.val}>{fmtUSD(row.median)}</Text>
          <Text style={styles.tag}>Market</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const makeStyles = (tokens: Theme) => StyleSheet.create({
  wrap: { width: 155 },
  // Bare card variant: just the card image with the floating category tag,
  // no white frame / no grade band.
  bare: { position: 'relative' },
  bareWindow: {
    borderRadius: 12,
    overflow: 'hidden',
    aspectRatio: 3 / 4.05,
    backgroundColor: '#EEF2F8',
    shadowColor: '#1C1C1E',
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  slab: {
    borderRadius: 15,
    padding: 7,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.8)',
    shadowColor: '#1C1C1E',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
  },
  catTag: {
    position: 'absolute',
    top: -4,
    left: -4,
    zIndex: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    paddingLeft: 6,
    paddingRight: 7,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 0.5,
    borderColor: tokens.color.border,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  cdot: { width: 6, height: 6, borderRadius: 3 },
  // catTag + label sit on a forced-light slab surface; their text stays dark
  // regardless of the app theme.
  catTagTxt: { fontSize: 9, fontWeight: '800', letterSpacing: 0.4, color: '#6E6E73', textTransform: 'uppercase' },
  label: {
    backgroundColor: '#FFFFFF',
    borderRadius: 9,
    paddingVertical: 9,
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 1,
    shadowOffset: { width: 0, height: 1 },
  },
  ltxt: { flex: 1, minWidth: 0, gap: 3 },
  gradeName: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4, color: '#6E6E73', textTransform: 'uppercase' },
  cardName: { fontSize: 13, fontWeight: '600', letterSpacing: -0.2, color: '#1C1C1E' },
  cert: { fontSize: 11, fontWeight: '500', letterSpacing: 0.3, color: '#A1A1A6' },
  window: {
    marginTop: 7,
    borderRadius: 9,
    overflow: 'hidden',
    aspectRatio: 3 / 4.05,
    backgroundColor: '#EEF2F8',
  },
  windowImg: { width: '100%', height: '100%' },
  meta: { marginTop: 14, paddingHorizontal: 2 },
  ttl: { fontSize: 15, fontWeight: '600', letterSpacing: -0.3, color: tokens.color.textPrimary },
  sset: { fontSize: 12, color: tokens.color.textTertiary, letterSpacing: -0.1, marginTop: 3 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 9 },
  val: { fontSize: 15, fontWeight: '600', letterSpacing: -0.4, color: tokens.color.textPrimary },
  tag: {
    fontSize: 11, fontWeight: '700', letterSpacing: 0.4, color: tokens.color.goldDeep, textTransform: 'uppercase',
    backgroundColor: tokens.color.goldSoft, paddingVertical: 3, paddingHorizontal: 7, borderRadius: 6, overflow: 'hidden',
  },
});
