import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity, useWindowDimensions } from 'react-native';
import { showInfo, showConfirm } from '@/lib/ui/dialog';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { goBack } from '@/lib/ui/nav';
import Svg, { Path, Circle, Rect, G } from 'react-native-svg';
import { useTheme, useThemedStyles, type Theme } from '@/lib/design/theme';
import { GradeBadge } from '@/components/GradeBadge';
import { buildCollection, type CollectionCard } from '@/lib/data/collection';
import { addHolding, updateHolding } from '@/lib/state/holdingsStore';
import { useHoldings } from '@/lib/state/useHoldings';
import { catMetaForCategory, gradeNum } from '@/lib/design/cardPresentation';
import { FEATURES } from '@/lib/features';

function MiniSlab({ uri }: { uri: string }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <LinearGradient colors={['#FFFFFF', '#ECECEA']} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.miniSlab}>
      <View style={styles.miniWin}>
        <Image source={{ uri }} style={styles.miniImg} contentFit="cover" contentPosition="top" transition={120} />
      </View>
    </LinearGradient>
  );
}

export default function AddScreen() {
  const styles = useThemedStyles(makeStyles);
  const tokens = useTheme();
  const { width } = useWindowDimensions();
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const holdings = useHoldings();
  const catalog = useMemo(() => buildCollection(), []);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<CollectionCard | null>(null);
  const [price, setPrice] = useState('');
  const [date, setDate] = useState('');
  const [storage, setStorage] = useState('');
  const [notes, setNotes] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  // Reset form whenever the tab/screen comes into focus WITHOUT an edit param.
  // Without this, useState values from the previous visit (selected card,
  // typed price, picked photo) leak into the next "add" session.
  useFocusEffect(
    React.useCallback(() => {
      if (edit) {
        const h = holdings.find((x) => x.id === edit);
        if (!h) return;
        const card = catalog.find((c) => c.id === h.catalogItemId);
        if (card) setSelected({ ...card, grade: h.grade });
        setPrice(h.cost != null ? String(h.cost) : '');
        setDate(h.acquisitionDate ?? '');
        setStorage(h.storage ?? '');
        setNotes(h.notes ?? '');
        setPhotoUri(h.frontImageUrl ?? null);
      } else {
        setSelected(null);
        setQuery('');
        setPrice('');
        setDate('');
        setStorage('');
        setNotes('');
        setPhotoUri(null);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [edit])
  );

  function resetForm() {
    setSelected(null);
    setQuery('');
    setPrice('');
    setDate('');
    setStorage('');
    setNotes('');
    setPhotoUri(null);
  }

  async function takePhoto() {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        showInfo(
          'Photo library access denied',
          'Catchstack needs permission to read photos so you can use your own card images. Enable it in iOS Settings → Catchstack → Photos.'
        );
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
      if (!res.canceled && res.assets?.[0]?.uri) setPhotoUri(res.assets[0].uri);
    } catch (err) {
      showInfo("Couldn't open photo library", 'Please try again, or pick an image later.');
    }
  }

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return catalog
      .filter((c) => c.title.toLowerCase().includes(q) || c.set.toLowerCase().includes(q) || c.cert.includes(q))
      .slice(0, 6);
  }, [catalog, query]);

  function selectCard(c: CollectionCard) {
    setSelected(c);
    setQuery('');
  }

  function addToCollection() {
    if (!selected) return;
    const n = parseFloat(price.replace(/[^0-9.]/g, ''));
    const fields = {
      grade: selected.grade,
      cost: isNaN(n) ? undefined : n,
      acquisitionDate: date.trim() || undefined,
      storage: storage.trim() || undefined,
      notes: notes.trim() || undefined,
      frontImageUrl: photoUri ?? undefined,
    };
    if (edit) {
      // include catalogItemId so changing the card in edit mode actually persists
      updateHolding(edit, { catalogItemId: selected.id, ...fields });
    } else {
      // Prevent duplicate add: be honest with the user about what just happened
      // (silent updates of an existing card felt like a bug in cross-flow audit).
      // RN Web treats `Alert.alert` as a no-op, so fall back to window.confirm
      // there — otherwise the duplicate prompt is invisible and the button
      // silently does nothing.
      const existing = holdings.find((h) => h.catalogItemId === selected.id);
      if (existing) {
        showConfirm(
          'Already in your collection',
          `You already own ${selected.title}. Update its details instead?`,
          {
            confirmLabel: 'Update',
            // Clear selection on cancel so the same prompt can't loop when the
            // user taps the disabled-feeling "Add" button again.
            onCancel: () => setSelected(null),
            onConfirm: () => {
              updateHolding(existing.id, fields);
              resetForm();
              router.push('/collection');
            },
          }
        );
        return;
      }
      addHolding({ catalogItemId: selected.id, ...fields });
    }
    resetForm();
    if (edit) goBack();
    else router.push('/collection');
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.topbar}><Text style={styles.topbarTitle}>{edit ? 'Edit holding' : 'Add a card'}</Text></View>

        <Text style={styles.sectionHead}>Find your card</Text>
        <Text style={styles.sectionSub}>Search the catalog — we'll pull the image and current reference price.</Text>

        <View style={styles.formCard}>
          {/* search */}
          <View style={styles.searchRow}>
            <Svg width={17} height={17} viewBox="0 0 24 24" fill="none"><G stroke="#A1A1A6" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><Circle cx="11" cy="11" r="7" /><Path d="M16.2 16.2L21 21" /></G></Svg>
            <TextInput
              style={styles.searchInput}
              placeholder={FEATURES.SHOW_GRADES ? 'Search by card name or cert…' : 'Search by card name…'}
              placeholderTextColor={tokens.color.textTertiary}
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
          </View>

          {/* empty search hint */}
          {query.trim().length > 0 && results.length === 0 && !selected && (
            <View style={styles.emptySearch}>
              <Text style={styles.emptySearchTxt}>
                No matches in the catalog. Catchstack currently supports Pokemon (pokemontcg.io) and Magic: The Gathering (Scryfall).
              </Text>
            </View>
          )}

          {/* live results */}
          {results.length > 0 && (
            <View style={styles.results}>
              {results.map((c) => {
                const cat = catMetaForCategory(c.category);
                return (
                  <TouchableOpacity key={c.id} style={styles.resultRow} activeOpacity={0.7} onPress={() => selectCard(c)}>
                    <MiniSlab uri={c.imageUrl} />
                    <View style={styles.resultInfo}>
                      <Text style={styles.resultName} numberOfLines={1}>{c.title}</Text>
                      <Text style={styles.resultMeta} numberOfLines={1}>
                        {c.set}
                        {/* Pokemon ids look like `swsh7-215` (last segment = card number);
                            MTG ids look like `mtg-sheoldred` (last segment = name slug, useless). */}
                        {c.id.startsWith('mtg-') ? '' : ` · #${c.id.split('-').pop()}`}
                        {` · ${cat.tag}`}
                      </Text>
                    </View>
                    <Text style={styles.resultVal}>${Math.round(c.marketUsd).toLocaleString('en-US')}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* resolved selection */}
          {selected && (
            <>
            <View style={styles.resolvedRow}>
              <MiniSlab uri={photoUri ?? selected.imageUrl} />
              <View style={styles.resolvedInfo}>
                <Text style={styles.resolvedName} numberOfLines={1}>{selected.title}</Text>
                <Text style={styles.resolvedMeta} numberOfLines={1}>{FEATURES.SHOW_GRADES ? `${selected.set} · ${selected.grade}` : selected.set}</Text>
                <Text style={styles.resolvedNote}>{photoUri ? 'Your photo' : 'Reference image from pokemontcg.io / Scryfall'}</Text>
              </View>
              <View style={styles.resolvedGrade}>
                {FEATURES.SHOW_GRADES ? (
                  <View style={styles.gradeChip}>
                    <GradeBadge grade={selected.grade} size={14} />
                    <Text style={styles.gradeChipTxt}>{selected.grade.startsWith('GEM') ? 'GEM ' + gradeNum(selected.grade) : selected.grade}</Text>
                  </View>
                ) : null}
                <View style={styles.checkIcon}>
                  <Svg width={12} height={12} viewBox="0 0 24 24" fill="none"><Path d="M5 12l5 5L20 7" stroke={tokens.color.gain} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" /></Svg>
                </View>
              </View>
            </View>

            {/* Optional: replace reference image with your own photo */}
            <TouchableOpacity style={styles.replacePhotoBtn} activeOpacity={0.7} onPress={takePhoto} accessibilityRole="button" accessibilityLabel={photoUri ? 'Change your photo' : 'Replace reference image with your own photo'}>
              <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
                <Path d="M4 6h16v12H4z" stroke={tokens.color.textSecondary} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
                <Circle cx="9" cy="11" r="2" stroke={tokens.color.textSecondary} strokeWidth={1.7} />
                <Path d="M4 18l5-5 4 3 4-3 3 2" stroke={tokens.color.textSecondary} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
              <Text style={styles.replacePhotoTxt}>{photoUri ? 'Change your photo' : 'Use your own photo (optional)'}</Text>
              {photoUri ? (
                <TouchableOpacity onPress={(e) => { e.stopPropagation(); setPhotoUri(null); }} hitSlop={8} accessibilityRole="button" accessibilityLabel="Remove your photo">
                  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none"><Path d="M6 6l12 12M18 6L6 18" stroke={tokens.color.textTertiary} strokeWidth={2} strokeLinecap="round" /></Svg>
                </TouchableOpacity>
              ) : null}
            </TouchableOpacity>
            </>
          )}

          {/* optional details */}
          <View style={styles.detailsHead}>
            <Text style={styles.dhLabel}>Optional details</Text>
            <Text style={styles.dhNote}>You can add these anytime</Text>
          </View>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>PURCHASE PRICE</Text>
            <TextInput style={styles.fieldInput} placeholder="$0.00" placeholderTextColor={tokens.color.textTertiary} value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
          </View>
          <View style={styles.splitRow}>
            <View style={styles.fieldHalf}>
              <Text style={styles.fieldLabel}>PURCHASE DATE</Text>
              <TextInput style={styles.fieldInput} placeholder={new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })} placeholderTextColor={tokens.color.textTertiary} value={date} onChangeText={setDate} />
            </View>
            <View style={[styles.fieldHalf, styles.fieldHalfLast]}>
              <Text style={styles.fieldLabel}>STORAGE</Text>
              <TextInput style={styles.fieldInput} placeholder={FEATURES.SHOW_GRADES ? 'e.g. PSA Vault' : 'e.g. Binder · Top loader · Vault'} placeholderTextColor={tokens.color.textTertiary} value={storage} onChangeText={setStorage} />
            </View>
          </View>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>NOTES</Text>
            <TextInput style={[styles.fieldInput, styles.notesInput]} placeholder="Any notes about this card…" placeholderTextColor={tokens.color.textTertiary} value={notes} onChangeText={setNotes} multiline />
          </View>
        </View>

        {/* actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.btn, styles.btnPrimary, !selected && styles.btnDisabled]} activeOpacity={0.9} disabled={!selected} onPress={addToCollection}>
            <Text style={styles.btnPrimaryTxt}>{edit ? 'Save changes' : 'Add to collection'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnGhost} activeOpacity={0.7} onPress={() => goBack()}>
            <Text style={styles.btnGhostTxt}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.laterNote}>Purchase details and notes can be added anytime from the card detail screen.</Text>
        </View>

        <Text style={styles.disclaim}>Not affiliated with Nintendo, The Pokémon Company, Wizards of the Coast, PSA, or TCGplayer.</Text>
        <View style={{ height: tokens.space.xl }} />
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const BR = 'rgba(255,255,255,0.72)';
const makeStyles = (tokens: Theme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.color.bg },
  scroll: { flex: 1 },
  content: { paddingBottom: 24, maxWidth: 440, width: '100%', alignSelf: 'center' },
  topbar: { alignItems: 'center', paddingTop: 6, paddingBottom: 16 },
  topbarTitle: { fontSize: 17, fontWeight: '600', letterSpacing: -0.4, color: tokens.color.textPrimary },

  scanSection: { paddingHorizontal: 24 },
  viewfinder: { height: 220, borderRadius: 22, backgroundColor: '#141416', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', ...tokens.shadow.card },
  bracketTL: { position: 'absolute', top: 24, left: 24, width: 32, height: 32, borderTopWidth: 2.5, borderLeftWidth: 2.5, borderColor: BR, borderTopLeftRadius: 5 },
  bracketTR: { position: 'absolute', top: 24, right: 24, width: 32, height: 32, borderTopWidth: 2.5, borderRightWidth: 2.5, borderColor: BR, borderTopRightRadius: 5 },
  bracketBL: { position: 'absolute', bottom: 24, left: 24, width: 32, height: 32, borderBottomWidth: 2.5, borderLeftWidth: 2.5, borderColor: BR, borderBottomLeftRadius: 5 },
  bracketBR: { position: 'absolute', bottom: 24, right: 24, width: 32, height: 32, borderBottomWidth: 2.5, borderRightWidth: 2.5, borderColor: BR, borderBottomRightRadius: 5 },
  labelZone: { position: 'absolute', bottom: 44, width: '60%', height: 48, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.18)', borderStyle: 'dashed', borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  labelZoneTxt: { fontSize: 9, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)' },
  vfIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.09)', alignItems: 'center', justifyContent: 'center' },
  vfHint: { fontSize: 12.5, fontWeight: '500', letterSpacing: -0.1, color: tokens.color.textSecondary, textAlign: 'center', lineHeight: 18, paddingTop: 10 },
  vfSubHint: { fontSize: 11.5, fontWeight: '500', color: tokens.color.textTertiary, textAlign: 'center', lineHeight: 16, paddingTop: 4 },
  scanBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 18, backgroundColor: tokens.color.accent, paddingVertical: 16, borderRadius: 16 },
  scanBtnTxt: { color: tokens.color.onAccent, fontSize: 16, fontWeight: '600', letterSpacing: -0.2 },
  privacy: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 11 },
  privacyTxt: { fontSize: 11.5, fontWeight: '500', color: tokens.color.textTertiary },

  divider: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 24, paddingTop: 22 },
  hr: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: tokens.color.border },
  or: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', color: tokens.color.textTertiary },

  sectionHead: { paddingHorizontal: 24, paddingTop: 20, fontSize: 13, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', color: tokens.color.textTertiary },
  sectionSub: { paddingHorizontal: 24, paddingTop: 6, paddingBottom: 14, fontSize: 13, lineHeight: 19, color: tokens.color.textSecondary },
  replacePhotoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 14, marginTop: 12, paddingVertical: 11, paddingHorizontal: 14,
    borderRadius: 11, backgroundColor: tokens.color.surfaceSunken,
    borderWidth: StyleSheet.hairlineWidth, borderColor: tokens.color.border,
  },
  replacePhotoTxt: { flex: 1, fontSize: 13.5, fontWeight: '600', color: tokens.color.textSecondary, letterSpacing: -0.1 },
  formCard: { marginHorizontal: 24, marginTop: 10, backgroundColor: tokens.color.surface, borderRadius: 20, overflow: 'hidden', ...tokens.shadow.card },

  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: tokens.color.border },
  searchInput: { flex: 1, fontSize: 15.5, fontWeight: '500', color: tokens.color.textPrimary, letterSpacing: -0.1, paddingVertical: 0 },

  results: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: tokens.color.border },
  emptySearch: { paddingHorizontal: 14, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: tokens.color.border },
  emptySearchTxt: { fontSize: 13, lineHeight: 19, color: tokens.color.textTertiary },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 9 },
  resultInfo: { flex: 1, minWidth: 0 },
  resultName: { fontSize: 15, fontWeight: '600', letterSpacing: -0.3, color: tokens.color.textPrimary },
  resultMeta: { fontSize: 12, color: tokens.color.textTertiary, marginTop: 2 },
  resultVal: { fontSize: 14, fontWeight: '600', color: tokens.color.textSecondary },

  resolvedRow: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(31,138,76,0.14)', backgroundColor: 'rgba(31,138,76,0.04)' },
  resolvedInfo: { flex: 1, minWidth: 0 },
  resolvedName: { fontSize: 15.5, fontWeight: '600', letterSpacing: -0.3, color: tokens.color.textPrimary },
  resolvedMeta: { fontSize: 12.5, color: tokens.color.textSecondary, marginTop: 3 },
  resolvedNote: { fontSize: 10, fontWeight: '500', color: tokens.color.textTertiary, marginTop: 4 },
  resolvedGrade: { alignItems: 'flex-end', gap: 6 },
  gradeChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: tokens.color.goldSoft, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999 },
  gradeChipTxt: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4, color: tokens.color.goldDeep, textTransform: 'uppercase' },
  checkIcon: { width: 22, height: 22, borderRadius: 11, backgroundColor: tokens.color.gainBg, alignItems: 'center', justifyContent: 'center' },

  detailsHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: tokens.color.border },
  dhLabel: { fontSize: 14, fontWeight: '600', letterSpacing: -0.2, color: tokens.color.textSecondary },
  dhNote: { fontSize: 12, fontWeight: '500', color: tokens.color.textTertiary },
  fieldRow: { paddingHorizontal: 16, paddingBottom: 13, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: tokens.color.border },
  fieldLabel: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', color: tokens.color.textTertiary, paddingTop: 13 },
  fieldInput: { fontSize: 15.5, fontWeight: '500', letterSpacing: -0.1, color: tokens.color.textPrimary, paddingTop: 5, paddingBottom: 0 },
  notesInput: { height: 56, textAlignVertical: 'top' },
  splitRow: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: tokens.color.border },
  fieldHalf: { flex: 1, paddingHorizontal: 16, paddingBottom: 13, borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: tokens.color.border },
  fieldHalfLast: { borderRightWidth: 0 },

  actions: { paddingHorizontal: 24, paddingTop: 22 },
  btn: { width: '100%', paddingVertical: 15, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  btnPrimary: { backgroundColor: tokens.color.accent },
  btnDisabled: { opacity: 0.4 },
  btnPrimaryTxt: { color: tokens.color.onAccent, fontSize: 15.5, fontWeight: '600', letterSpacing: -0.2 },
  btnGhost: { width: '100%', paddingVertical: 10, alignItems: 'center', marginTop: 4 },
  btnGhostTxt: { color: tokens.color.textSecondary, fontSize: 14.5, fontWeight: '500' },
  laterNote: { textAlign: 'center', fontSize: 12, color: tokens.color.textTertiary, marginTop: 8, lineHeight: 17 },
  disclaim: { paddingHorizontal: 24, paddingTop: 14, fontSize: 10.5, lineHeight: 16, color: tokens.color.textTertiary, textAlign: 'center' },

  miniSlab: { width: 46, height: 60, borderRadius: 8, padding: 2, shadowColor: '#1C1C1E', shadowOpacity: 0.18, shadowRadius: 4, shadowOffset: { width: 0, height: 1.5 } },
  miniWin: { flex: 1, borderRadius: 6, overflow: 'hidden', backgroundColor: '#EEF2F8' },
  miniImg: { width: '100%', height: '100%' },
});
