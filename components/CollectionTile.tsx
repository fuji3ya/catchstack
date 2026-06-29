import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTheme, useThemedStyles, type Theme } from '@/lib/design/theme';
import { GradeBadge } from '@/components/GradeBadge';
import { catMetaForCategory } from '@/lib/design/cardPresentation';
import { FEATURES } from '@/lib/features';
import type { CollectionCard } from '@/lib/data/collection';

function fmtUSD(n: number): string {
  return '$' + Math.round(n).toLocaleString('en-US');
}

// 2-column grid slab tile — ported from the mockup's .tile/.slab grid variant.
export function CollectionTile({ card, holdingId }: { card: CollectionCard; holdingId?: string }) {
  const styles = useThemedStyles(makeStyles);
  const tokens = useTheme();
  const cat = catMetaForCategory(card.category);
  const isGain = card.dayPct >= 0;
  return (
    <TouchableOpacity
      style={styles.tile}
      activeOpacity={0.72}
      onPress={() => holdingId && router.push({ pathname: '/holding/[id]', params: { id: holdingId } })}
    >
      {FEATURES.SHOW_SLAB_UI ? (
        <LinearGradient colors={['#FFFFFF', '#F6F6F4', '#ECECEA']} locations={[0, 0.52, 1]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.slab}>
          <View style={styles.catTag}>
            <View style={[styles.cdot, { backgroundColor: cat.dot }]} />
            <Text style={styles.catTagTxt}>{cat.tag}</Text>
          </View>
          {card.alert ? (
            <View style={styles.alertPip}><View style={styles.alertDot} /></View>
          ) : null}

          {FEATURES.SHOW_GRADES ? (
            <View style={styles.label}>
              <GradeBadge grade={card.grade} size={30} />
              <View style={styles.ltxt}>
                <Text style={styles.gradeName} numberOfLines={1}>{card.grade}</Text>
                <Text style={styles.cert} numberOfLines={1}>CERT {card.cert}</Text>
              </View>
            </View>
          ) : null}

          <View style={styles.window}>
            {card.imageUrl ? (
              <Image source={{ uri: card.imageUrl }} style={styles.windowImg} contentFit="cover" contentPosition="top" transition={150} />
            ) : null}
          </View>
        </LinearGradient>
      ) : (
        <View style={styles.bareWrap}>
          <View style={styles.catTag}>
            <View style={[styles.cdot, { backgroundColor: cat.dot }]} />
            <Text style={styles.catTagTxt}>{cat.tag}</Text>
          </View>
          {card.alert ? (
            <View style={styles.alertPip}><View style={styles.alertDot} /></View>
          ) : null}
          <View style={styles.bareWindow}>
            {card.imageUrl ? (
              <Image source={{ uri: card.imageUrl }} style={styles.windowImg} contentFit="cover" contentPosition="top" transition={150} />
            ) : null}
          </View>
        </View>
      )}

      <View style={styles.meta}>
        <Text style={styles.ttl} numberOfLines={1}>{card.title}</Text>
        <Text style={styles.sset} numberOfLines={1}>{card.set}</Text>
        <View style={styles.base}>
          <Text style={styles.val}>{fmtUSD(card.marketUsd)}</Text>
          <Text style={[styles.chg, { color: isGain ? tokens.color.gain : tokens.color.loss }]}>
            {(isGain ? '+' : '') + card.dayPct.toFixed(2)}%
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const makeStyles = (tokens: Theme) => StyleSheet.create({
  tile: { flex: 1 },
  bareWrap: { position: 'relative' },
  bareWindow: {
    borderRadius: 11, overflow: 'hidden', aspectRatio: 3 / 4.05, backgroundColor: '#EEF2F8',
    shadowColor: '#1C1C1E', shadowOpacity: 0.14, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 3,
  },
  slab: {
    borderRadius: 15, padding: 7, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.8)',
    shadowColor: '#1C1C1E', shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 12 }, elevation: 4,
  },
  catTag: {
    position: 'absolute', top: -4, left: -4, zIndex: 5, flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 3, paddingLeft: 6, paddingRight: 7, borderRadius: 999, backgroundColor: '#FFFFFF',
    borderWidth: 0.5, borderColor: tokens.color.border, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, shadowOffset: { width: 0, height: 1 },
  },
  cdot: { width: 6, height: 6, borderRadius: 3 },
  // catTag + label sit on forced-light surfaces; their text stays dark.
  catTagTxt: { fontSize: 9, fontWeight: '800', letterSpacing: 0.4, color: '#6E6E73', textTransform: 'uppercase' },
  alertPip: {
    position: 'absolute', top: -4, right: -4, zIndex: 5, width: 16, height: 16, borderRadius: 8,
    backgroundColor: '#CBA968', borderWidth: 1.5, borderColor: '#fff', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#785A28', shadowOpacity: 0.45, shadowRadius: 3, shadowOffset: { width: 0, height: 1 },
  },
  alertDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#5B4420' },
  label: {
    backgroundColor: '#FFFFFF', borderRadius: 8, paddingVertical: 7, paddingHorizontal: 8,
    flexDirection: 'row', alignItems: 'center', gap: 7,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 1, shadowOffset: { width: 0, height: 1 },
  },
  ltxt: { flex: 1, minWidth: 0, gap: 2 },
  gradeName: { fontSize: 9, fontWeight: '700', letterSpacing: 0.3, color: '#6E6E73', textTransform: 'uppercase' },
  cert: { fontSize: 9, fontWeight: '500', letterSpacing: 0.2, color: '#A1A1A6' },
  window: { marginTop: 6, borderRadius: 8, overflow: 'hidden', aspectRatio: 3 / 4.05, backgroundColor: '#EEF2F8' },
  windowImg: { width: '100%', height: '100%' },
  meta: { marginTop: 13, paddingHorizontal: 1 },
  ttl: { fontSize: 14, fontWeight: '600', letterSpacing: -0.3, color: tokens.color.textPrimary },
  sset: { fontSize: 12, color: tokens.color.textTertiary, letterSpacing: -0.1, marginTop: 3 },
  base: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 6, marginTop: 8 },
  val: { fontSize: 14, fontWeight: '600', letterSpacing: -0.4, color: tokens.color.textPrimary },
  chg: { fontSize: 12, fontWeight: '600' },
});
