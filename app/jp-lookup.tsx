import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import Svg, { Path } from 'react-native-svg';
import { useTheme, useThemedStyles, type Theme } from '@/lib/design/theme';
import { goBack } from '@/lib/ui/nav';
import { searchJpCards, getJpPrice, type JpCard, type JpPrice } from '@/lib/data/jpPrice';

type PriceState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'loaded'; data: JpPrice }
  | { status: 'none' };

function CardThumbnail({ uri }: { uri: string | null }) {
  const styles = useThemedStyles(makeStyles);
  if (!uri) {
    return <View style={styles.thumbPlaceholder} />;
  }
  return (
    <View style={styles.thumbWrap}>
      <Image source={{ uri }} style={styles.thumbImg} contentFit="cover" contentPosition="top" transition={120} />
    </View>
  );
}

export default function JpLookupScreen() {
  const styles = useThemedStyles(makeStyles);
  const tokens = useTheme();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<JpCard[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<JpCard | null>(null);
  const [priceState, setPriceState] = useState<PriceState>({ status: 'idle' });

  // Debounced search with AbortController — same pattern as add.tsx
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    const ctrl = new AbortController();
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const cards = await searchJpCards(q, ctrl.signal);
        if (cancelled) return;
        setResults(cards);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [query]);

  async function selectCard(card: JpCard) {
    setSelected(card);
    setResults([]);
    setQuery('');
    setPriceState({ status: 'loading' });
    const price = await getJpPrice(card.name, card.localId);
    if (price) {
      setPriceState({ status: 'loaded', data: price });
    } else {
      setPriceState({ status: 'none' });
    }
  }

  function clearSelection() {
    setSelected(null);
    setPriceState({ status: 'idle' });
    setQuery('');
    setResults([]);
  }

  function fmtJpy(val: number | null): string {
    if (val == null) return '—';
    return '¥' + val.toLocaleString('ja-JP');
  }

  const showEmpty = !searching && query.trim().length >= 2 && results.length === 0 && !selected;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* nav bar */}
      <View style={styles.navbar}>
        <TouchableOpacity style={styles.navbtn} onPress={() => goBack()} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="戻る">
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
            <Path d="M15 5l-7 7 7 7" stroke={tokens.color.textPrimary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
        <Text style={styles.navTitle}>JP相場 (β)</Text>
        <View style={styles.navbtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* subtitle */}
        <Text style={styles.subtitle}>日本語でカードを検索 → 遊々亭の販売・買取価格(円)</Text>

        {/* search box */}
        <View style={styles.formCard}>
          <View style={styles.searchRow}>
            <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
              <Path d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" stroke={tokens.color.textTertiary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
            <TextInput
              style={styles.searchInput}
              placeholder="カード名を入力（例：リザードン）"
              placeholderTextColor={tokens.color.textTertiary}
              value={query}
              onChangeText={(t) => { setSelected(null); setPriceState({ status: 'idle' }); setQuery(t); }}
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
          </View>

          {/* searching indicator */}
          {searching && (
            <View style={styles.statusRow}>
              <ActivityIndicator size="small" color={tokens.color.textTertiary} />
              <Text style={styles.statusTxt}>検索中…</Text>
            </View>
          )}

          {/* empty state */}
          {showEmpty && (
            <View style={styles.statusRow}>
              <Text style={styles.statusTxt}>該当なし</Text>
            </View>
          )}

          {/* results list */}
          {results.length > 0 && (
            <View style={styles.results}>
              {results.map((card) => (
                <TouchableOpacity
                  key={card.id}
                  style={styles.resultRow}
                  activeOpacity={0.7}
                  onPress={() => selectCard(card)}
                >
                  <CardThumbnail uri={card.image} />
                  <View style={styles.resultInfo}>
                    <Text style={styles.resultName} numberOfLines={1}>{card.name}</Text>
                    <Text style={styles.resultMeta} numberOfLines={1}>No.{card.localId}</Text>
                  </View>
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                    <Path d="M9 18l6-6-6-6" stroke={tokens.color.textTertiary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* selected card detail panel */}
        {selected && (
          <View style={styles.detailCard}>
            {/* card header */}
            <View style={styles.detailHeader}>
              {selected.image ? (
                <Image source={{ uri: selected.image }} style={styles.detailImg} contentFit="cover" contentPosition="top" transition={150} />
              ) : (
                <View style={[styles.detailImg, styles.detailImgPlaceholder]} />
              )}
              <View style={styles.detailMeta}>
                <Text style={styles.detailName} numberOfLines={2}>{selected.name}</Text>
                <Text style={styles.detailNo}>No.{selected.localId}</Text>
              </View>
              <TouchableOpacity style={styles.clearBtn} onPress={clearSelection} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="選択を解除">
                <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                  <Path d="M6 6l12 12M18 6L6 18" stroke={tokens.color.textTertiary} strokeWidth={2} strokeLinecap="round" />
                </Svg>
              </TouchableOpacity>
            </View>

            {/* price rows */}
            <View style={styles.priceBlock}>
              {priceState.status === 'loading' && (
                <View style={styles.priceLoading}>
                  <ActivityIndicator size="small" color={tokens.color.textTertiary} />
                  <Text style={styles.priceFetchTxt}>価格を取得中…</Text>
                </View>
              )}

              {priceState.status === 'loaded' && (
                <>
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>販売</Text>
                    <Text style={styles.priceValue}>{fmtJpy(priceState.data.sellJpy)}</Text>
                  </View>
                  <View style={styles.priceSep} />
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>買取</Text>
                    <Text style={[styles.priceValue, styles.priceValueBuy]}>{fmtJpy(priceState.data.buyJpy)}</Text>
                  </View>

                  {priceState.data.sellUrl ? (
                    <TouchableOpacity
                      style={styles.linkBtn}
                      activeOpacity={0.85}
                      onPress={() => { if (priceState.status === 'loaded' && priceState.data.sellUrl) Linking.openURL(priceState.data.sellUrl); }}
                      accessibilityRole="link"
                      accessibilityLabel="遊々亭で見る"
                    >
                      <Text style={styles.linkBtnTxt}>遊々亭で見る</Text>
                      <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                        <Path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" stroke={tokens.color.onAccent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                      </Svg>
                    </TouchableOpacity>
                  ) : null}

                  <Text style={styles.priceSource}>出典: {priceState.data.source}</Text>
                </>
              )}

              {priceState.status === 'none' && (
                <Text style={styles.noPrice}>遊々亭で価格が見つかりませんでした</Text>
              )}
            </View>
          </View>
        )}

        {/* disclaimer */}
        <Text style={styles.disclaimer}>
          価格は遊々亭の公開参考価格。販売=店頭価格 / 買取=店頭買取価格。投資助言ではありません。
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

  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 8,
  },
  navbtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  navTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.3,
    color: tokens.color.textPrimary,
  },

  subtitle: {
    paddingHorizontal: 24,
    paddingTop: 6,
    paddingBottom: 14,
    fontSize: 13,
    lineHeight: 19,
    color: tokens.color.textSecondary,
  },

  formCard: {
    marginHorizontal: 24,
    backgroundColor: tokens.color.surface,
    borderRadius: 20,
    overflow: 'hidden',
    ...tokens.shadow.card,
  },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tokens.color.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 15.5,
    fontWeight: '500',
    color: tokens.color.textPrimary,
    letterSpacing: -0.1,
    paddingVertical: 0,
  },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tokens.color.border,
  },
  statusTxt: { fontSize: 13, lineHeight: 19, color: tokens.color.textTertiary },

  results: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: tokens.color.border },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tokens.color.border,
  },
  resultInfo: { flex: 1, minWidth: 0 },
  resultName: { fontSize: 15, fontWeight: '600', letterSpacing: -0.3, color: tokens.color.textPrimary },
  resultMeta: { fontSize: 12, color: tokens.color.textTertiary, marginTop: 2 },

  thumbWrap: {
    width: 44,
    height: 58,
    borderRadius: 7,
    overflow: 'hidden',
    backgroundColor: '#EEF2F8',
  },
  thumbImg: { width: '100%', height: '100%' },
  thumbPlaceholder: {
    width: 44,
    height: 58,
    borderRadius: 7,
    backgroundColor: tokens.color.surfaceSunken,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: tokens.color.border,
  },

  detailCard: {
    marginHorizontal: 24,
    marginTop: 18,
    backgroundColor: tokens.color.surface,
    borderRadius: 20,
    overflow: 'hidden',
    ...tokens.shadow.card,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tokens.color.border,
  },
  detailImg: {
    width: 64,
    height: 86,
    borderRadius: 10,
    backgroundColor: '#EEF2F8',
  },
  detailImgPlaceholder: {
    backgroundColor: tokens.color.surfaceSunken,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: tokens.color.border,
  },
  detailMeta: { flex: 1, minWidth: 0, paddingTop: 2 },
  detailName: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: tokens.color.textPrimary,
    lineHeight: 22,
  },
  detailNo: {
    fontSize: 12.5,
    color: tokens.color.textTertiary,
    marginTop: 5,
    fontWeight: '500',
  },
  clearBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: tokens.color.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },

  priceBlock: { padding: 16 },
  priceLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  priceFetchTxt: { fontSize: 13, color: tokens.color.textTertiary },

  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  priceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: tokens.color.textSecondary,
    letterSpacing: -0.1,
  },
  priceValue: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.8,
    color: tokens.color.textPrimary,
  },
  priceValueBuy: { color: tokens.color.gain },
  priceSep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: tokens.color.border,
    marginVertical: 2,
  },

  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    backgroundColor: tokens.color.accent,
    paddingVertical: 14,
    borderRadius: 14,
  },
  linkBtnTxt: {
    color: tokens.color.onAccent,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },

  priceSource: {
    fontSize: 11,
    color: tokens.color.textTertiary,
    marginTop: 10,
    textAlign: 'center',
  },

  noPrice: {
    fontSize: 13,
    color: tokens.color.textTertiary,
    textAlign: 'center',
    paddingVertical: 12,
  },

  disclaimer: {
    paddingHorizontal: 24,
    paddingTop: 18,
    fontSize: 11,
    lineHeight: 16,
    color: tokens.color.textTertiary,
    textAlign: 'center',
  },
});
