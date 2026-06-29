import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, TextInput } from 'react-native';
import { showConfirm } from '@/lib/ui/dialog';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { goBack } from '@/lib/ui/nav';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { useTheme, useThemedStyles, type Theme } from '@/lib/design/theme';
import { buildCollection } from '@/lib/data/collection';
import { useAlerts, useTriggeredEvents } from '@/lib/state/useAlerts';
import { addAlert, toggleAlert, removeAlert, type AlertCondType } from '@/lib/state/alertsStore';
import { useSettings } from '@/lib/state/useSettings';

const FREE_ALERT_LIMIT = 10;

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

const CONDITIONS = [
  { t: 'above', label: 'Price above' },
  { t: 'below', label: 'Price below' },
  { t: 'up24', label: 'Up % (24h)' },
  { t: 'up7', label: 'Up % (7d)' },
  { t: 'down7', label: 'Down % (7d)' },
  { t: 'cost', label: '% above your cost' },
  { t: 'high', label: 'Near 90-day high' },
  { t: 'conf', label: 'Confidence drops' },
];
const COND_CONFIG: Record<string, { label: string; pfx: string; sfx: string; val: string; hint: string }> = {
  above: { label: 'Target price', pfx: '$', sfx: '', val: '2,500', hint: "You'll be notified the first time the market value reaches this price." },
  below: { label: 'Target price', pfx: '$', sfx: '', val: '1,800', hint: "You'll be notified the first time the market value falls to this price." },
  up24: { label: 'Percentage gain', pfx: '', sfx: '%', val: '5', hint: 'Notified when the market value rises by this much within 24 hours.' },
  up7: { label: 'Percentage gain', pfx: '', sfx: '%', val: '10', hint: 'Notified when the market value rises by this much over 7 days.' },
  down7: { label: 'Percentage drop', pfx: '', sfx: '%', val: '10', hint: 'Notified when the market value falls by this much over 7 days.' },
  cost: { label: 'Above your cost by', pfx: '', sfx: '%', val: '20', hint: 'Notified when the market value is this far above your acquisition price.' },
  high: { label: 'Within of 90-day high', pfx: '', sfx: '%', val: '3', hint: 'Notified when the market value comes within this margin of its 90-day high.' },
  conf: { label: 'Confidence falls to', pfx: '', sfx: '', val: 'Medium', hint: 'Notified when pricing-data confidence drops below this level.' },
};
const FREQS = [
  { f: 'once', label: 'Once' },
  { f: 'every', label: 'Every time' },
  { f: 'daily', label: 'Max once a day' },
];

function relTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (isNaN(then)) return '';
  const s = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (s < 60) return 'now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return `${Math.floor(d / 7)}w ago`;
}

export default function AlertsScreen() {
  const styles = useThemedStyles(makeStyles);
  const tokens = useTheme();
  const { card: cardParam } = useLocalSearchParams<{ card?: string }>();
  const catalog = useMemo(() => buildCollection(), []);
  const byId = useMemo(() => Object.fromEntries(catalog.map((c) => [c.id, c])), [catalog]);

  const events = useTriggeredEvents();
  const active = useAlerts();
  const { pro } = useSettings();
  const [sheet, setSheet] = useState(false);
  const [cond, setCond] = useState('above');
  const [freq, setFreq] = useState('once');
  const cfg = COND_CONFIG[cond];
  const [value, setValue] = useState(cfg.val);
  const [pickCardId, setPickCardId] = useState<string>(typeof cardParam === 'string' && byId[cardParam] ? cardParam : 'swsh7-215');
  const [pickerOpen, setPickerOpen] = useState(false);

  // If the user arrived from the detail screen's "Set price alert" button,
  // auto-open the New Alert sheet with that card pre-selected. useFocusEffect
  // (not useEffect) re-fires every time the screen gains focus, so tapping
  // "Set price alert" twice for the same card still opens the sheet the
  // second time — useEffect's `[cardParam]` deps wouldn't see a change.
  useFocusEffect(
    React.useCallback(() => {
      if (typeof cardParam === 'string' && byId[cardParam]) {
        setPickCardId(cardParam);
        setSheet(true);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cardParam])
  );

  function pickCond(t: string) {
    setCond(t);
    setValue(COND_CONFIG[t].val);
  }

  function condText(t: string, v: string): string {
    switch (t) {
      case 'above': return `Notify when ≥ $${v}`;
      case 'below': return `Notify when ≤ $${v}`;
      case 'up24': return `Notify when up ${v}% (24h)`;
      case 'up7': return `Notify when up ${v}% in 7 days`;
      case 'down7': return `Notify when down ${v}% in 7 days`;
      case 'cost': return `Notify when ${v}% above your cost`;
      case 'high': return `Notify when within ${v}% of 90-day high`;
      case 'conf': return `Notify when confidence drops to ${v}`;
      default: return `Notify on change`;
    }
  }

  function saveAlert() {
    const card = byId[pickCardId];
    if (!card) { setSheet(false); return; }
    if (!pro && active.length >= FREE_ALERT_LIMIT) {
      showConfirm(
        'Alert limit reached',
        `The free tier tracks up to ${FREE_ALERT_LIMIT} alerts. Unlock Pro (free in early access) for unlimited alerts.`,
        {
          confirmLabel: 'Unlock Pro',
          cancelLabel: 'Not now',
          onConfirm: () => router.push('/(tabs)/settings'),
        }
      );
      return;
    }
    addAlert({ catalogItemId: card.id, type: cond as AlertCondType, value, cond: condText(cond, value), frequency: freq as 'once' | 'every' | 'daily' });
    setSheet(false);
  }

  const watching = active.filter((a) => a.on).length;
  const pick = byId[pickCardId];
  const latestEvent = events[0] ? { card: byId[events[0].catalogItemId], detail: events[0].detail } : null;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.navbar}>
        <TouchableOpacity style={styles.navbtn} onPress={() => goBack()} activeOpacity={0.7}>
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none"><Path d="M15 5l-7 7 7 7" stroke={tokens.color.textPrimary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></Svg>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Alerts</Text>
        <TouchableOpacity style={styles.navbtn} onPress={() => setSheet(true)} activeOpacity={0.7} hitSlop={6} accessibilityRole="button" accessibilityLabel="Create a new price alert">
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none"><Path d="M12 6v12M6 12h12" stroke={tokens.color.textPrimary} strokeWidth={2} strokeLinecap="round" /></Svg>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.promise}>
          <Text style={styles.eyebrow}>Price watch</Text>
          <Text style={styles.h1}>Never miss a moment.</Text>
          <Text style={styles.promiseP}>Get a factual signal the instant a card hits a level you care about — no checking, no guessing.</Text>
        </View>

        <View style={styles.secRow}>
          <Text style={styles.eyebrow}>Watching</Text>
          <Text style={styles.count}>{watching} active</Text>
        </View>
        <View style={styles.list}>
          {active.map((a, i) => {
            const c = byId[a.catalogItemId];
            if (!c) return null;
            return (
              <View key={a.id} style={[styles.arow, i > 0 && styles.rowSep]}>
                <MiniSlab uri={c.imageUrl} />
                <View style={styles.aMain}>
                  <Text style={styles.aName} numberOfLines={1}>{c.title}</Text>
                  <Text style={styles.aCond} numberOfLines={1}>{a.cond}</Text>
                  {a.on ? <View style={styles.watchChip}><View style={styles.watchDot} /><Text style={styles.watchTxt}>Watching</Text></View> : null}
                </View>
                <TouchableOpacity onPress={() => toggleAlert(a.id)} activeOpacity={0.8} style={[styles.toggle, a.on && styles.toggleOn]}>
                  <View style={[styles.knob, a.on && styles.knobOn]} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => removeAlert(a.id)} activeOpacity={0.7} style={styles.aDelBtn} hitSlop={8}>
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none"><Path d="M6 6l12 12M18 6L6 18" stroke={tokens.color.textTertiary} strokeWidth={2} strokeLinecap="round" /></Svg>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        <View style={styles.secRow}><Text style={styles.eyebrow}>Recently triggered</Text></View>
        <View style={styles.list}>
          {events.length === 0 ? (
            <View style={styles.emptyTrig}>
              <Text style={styles.emptyTrigTxt}>No alerts have triggered yet. When a card you watch hits its level, it shows up here.</Text>
            </View>
          ) : (
            events.slice(0, 6).map((ev, i) => {
              const c = byId[ev.catalogItemId];
              if (!c) return null;
              return (
                <View key={ev.id} style={[styles.arow, i > 0 && styles.rowSep]}>
                  <MiniSlab uri={c.imageUrl} />
                  <View style={styles.aMain}>
                    <Text style={styles.aName} numberOfLines={1}>{c.title}</Text>
                    <Text style={styles.aCond} numberOfLines={1}>{ev.detail}</Text>
                  </View>
                  <Text style={styles.tAgo}>{relTime(ev.at)}</Text>
                </View>
              );
            })
          )}
        </View>

        {/* notification preview */}
        <Text style={[styles.eyebrow, { paddingHorizontal: 24, paddingTop: 26 }]}>How it arrives</Text>
        <View style={styles.bannerPlate}>
          <View style={styles.push}>
            <View style={styles.appIcon}>
              <Svg width={18} height={18} viewBox="0 0 14 14" fill="none"><Path d="M10 3.6C9.3 2.6 8.2 2 7 2 5.3 2 4 3 4 4.5c0 1.3 1 2 2.8 2.5C9.1 7.6 10 8.4 10 9.8 10 11.2 8.6 12 7 12c-1.4 0-2.7-.7-3.3-1.8" stroke="#C8A96A" strokeWidth={1.5} strokeLinecap="round" fill="none" /></Svg>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.pHead}><Text style={styles.pApp}>Catchstack</Text><Text style={styles.pTime}>{latestEvent ? relTime(events[0].at) : 'preview'}</Text></View>
              {latestEvent && latestEvent.card ? (
                <Text style={styles.pBody}><Text style={styles.bold}>{latestEvent.card.title}</Text> — {latestEvent.detail}.</Text>
              ) : (
                <Text style={styles.pBody}>This is how an alert arrives: <Text style={styles.bold}>your card</Text> reached the level you set.</Text>
              )}
            </View>
          </View>
        </View>

        <Text style={styles.disclaim}>Alerts are based on public market data and are not financial advice.</Text>
        <View style={{ height: tokens.space.xl }} />
      </ScrollView>

      {/* New alert bottom sheet */}
      <Modal visible={sheet} transparent animationType="slide" onRequestClose={() => setSheet(false)}>
        <TouchableOpacity style={styles.scrim} activeOpacity={1} onPress={() => setSheet(false)} />
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <View style={styles.sheetHead}>
            <Text style={styles.sheetTitle}>New alert</Text>
            <TouchableOpacity onPress={() => setSheet(false)} style={styles.sheetX} activeOpacity={0.7}>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none"><Path d="M6 6l12 12M18 6L6 18" stroke={tokens.color.textSecondary} strokeWidth={2.1} strokeLinecap="round" /></Svg>
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {pick && (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Card</Text>
                <TouchableOpacity activeOpacity={0.7} style={styles.cardpick} onPress={() => setPickerOpen((v) => !v)}>
                  <MiniSlab uri={pick.imageUrl} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cpName}>{pick.title}</Text>
                    <Text style={styles.cpSet}>{pick.set}</Text>
                  </View>
                  <Text style={styles.cpChange}>{pickerOpen ? 'Close' : 'Change'}</Text>
                </TouchableOpacity>
                {pickerOpen ? (
                  <ScrollView style={styles.cardPickerList} nestedScrollEnabled>
                    {catalog.map((c) => (
                      <TouchableOpacity key={c.id} style={styles.cardPickerRow} activeOpacity={0.7} onPress={() => { setPickCardId(c.id); setPickerOpen(false); }}>
                        <MiniSlab uri={c.imageUrl} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.cpName} numberOfLines={1}>{c.title}</Text>
                          <Text style={styles.cpSet} numberOfLines={1}>{c.set}</Text>
                        </View>
                        {pickCardId === c.id ? <Svg width={18} height={18} viewBox="0 0 24 24" fill="none"><Path d="M5 12l5 5L20 7" stroke={tokens.color.gain} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" /></Svg> : null}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                ) : null}
              </View>
            )}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Notify me when</Text>
              <View style={styles.chipWrap}>
                {CONDITIONS.map((c) => (
                  <TouchableOpacity key={c.t} onPress={() => pickCond(c.t)} activeOpacity={0.8} style={[styles.sheetChip, cond === c.t && styles.sheetChipOn]}>
                    <Text style={[styles.sheetChipTxt, cond === c.t && styles.sheetChipTxtOn]}>{c.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{cfg.label}</Text>
              <View style={styles.valInput}>
                {cfg.pfx ? <Text style={styles.valPfx}>{cfg.pfx}</Text> : null}
                <TextInput style={styles.valField} value={value} onChangeText={setValue} keyboardType="numbers-and-punctuation" />
                {cfg.sfx ? <Text style={styles.valSfx}>{cfg.sfx}</Text> : null}
              </View>
              <Text style={styles.valHint}>{cfg.hint}</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Frequency</Text>
              <View style={styles.chipWrap}>
                {FREQS.map((f) => (
                  <TouchableOpacity key={f.f} onPress={() => setFreq(f.f)} activeOpacity={0.8} style={[styles.sheetChip, freq === f.f && styles.sheetChipOn]}>
                    <Text style={[styles.sheetChipTxt, freq === f.f && styles.sheetChipTxtOn]}>{f.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <TouchableOpacity style={[styles.sbtn, styles.sbtnPrimary]} activeOpacity={0.9} onPress={saveAlert}>
              <Text style={styles.sbtnPrimaryTxt}>Save alert</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sbtnGhost} activeOpacity={0.7} onPress={() => setSheet(false)}>
              <Text style={styles.sbtnGhostTxt}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.sheetNote}>Alerts are based on public market data and are not financial advice.</Text>
            <View style={{ height: 24 }} />
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (tokens: Theme) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.color.bg },
  navbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 8, paddingBottom: 8 },
  navbtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  navTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '600', letterSpacing: -0.3, color: tokens.color.textPrimary },
  content: { paddingBottom: 24, maxWidth: 440, width: '100%', alignSelf: 'center' },

  promise: { paddingHorizontal: 24, paddingTop: 8 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', color: tokens.color.textTertiary },
  h1: { fontSize: 30, fontWeight: '700', letterSpacing: -0.9, color: tokens.color.textPrimary, marginTop: 8 },
  promiseP: { fontSize: 14.5, lineHeight: 22, color: tokens.color.textSecondary, marginTop: 8 },

  secRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 28, paddingBottom: 10 },
  count: { fontSize: 13, fontWeight: '600', color: tokens.color.textSecondary },
  list: { marginHorizontal: 24, backgroundColor: tokens.color.surface, borderRadius: 18, overflow: 'hidden', ...tokens.shadow.card },
  arow: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 14, paddingVertical: 13 },
  rowSep: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: tokens.color.border },
  aMain: { flex: 1, minWidth: 0 },
  aName: { fontSize: 15.5, fontWeight: '600', letterSpacing: -0.3, color: tokens.color.textPrimary },
  aCond: { fontSize: 12.5, color: tokens.color.textSecondary, marginTop: 3 },
  watchChip: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', marginTop: 6, backgroundColor: tokens.color.gainBg, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 999 },
  watchDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: tokens.color.gain },
  watchTxt: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.3, color: tokens.color.gain, textTransform: 'uppercase' },
  tAgo: { fontSize: 12, color: tokens.color.textTertiary, fontWeight: '500' },
  emptyTrig: { paddingHorizontal: 16, paddingVertical: 18 },
  emptyTrigTxt: { fontSize: 13, lineHeight: 19, color: tokens.color.textTertiary },

  bannerPlate: { marginHorizontal: 24, marginTop: 12, backgroundColor: tokens.color.surfaceSunken, borderRadius: 18, padding: 12 },
  push: { flexDirection: 'row', gap: 11, backgroundColor: tokens.color.surface, borderRadius: 14, padding: 12, ...tokens.shadow.card },
  appIcon: { width: 34, height: 34, borderRadius: 8, backgroundColor: '#1C1C1E', alignItems: 'center', justifyContent: 'center' },
  pHead: { flexDirection: 'row', justifyContent: 'space-between' },
  pApp: { fontSize: 12.5, fontWeight: '700', color: tokens.color.textPrimary },
  pTime: { fontSize: 11.5, color: tokens.color.textTertiary },
  pBody: { fontSize: 13.5, color: tokens.color.textSecondary, lineHeight: 19, marginTop: 3 },
  bold: { fontWeight: '700', color: tokens.color.textPrimary },

  disclaim: { paddingHorizontal: 24, paddingTop: 22, fontSize: 11, lineHeight: 16, color: tokens.color.textTertiary },

  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '88%', backgroundColor: tokens.color.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 22, paddingTop: 10, paddingBottom: 34 },
  grabber: { width: 38, height: 5, borderRadius: 3, backgroundColor: tokens.color.border, alignSelf: 'center', marginBottom: 10 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 8 },
  sheetTitle: { fontSize: 20, fontWeight: '700', letterSpacing: -0.4, color: tokens.color.textPrimary },
  sheetX: { width: 32, height: 32, borderRadius: 16, backgroundColor: tokens.color.surfaceSunken, alignItems: 'center', justifyContent: 'center' },
  field: { paddingTop: 16 },
  fieldLabel: { fontSize: 12.5, fontWeight: '700', letterSpacing: 0.3, textTransform: 'uppercase', color: tokens.color.textTertiary, paddingBottom: 9 },
  cardpick: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: tokens.color.surface, borderRadius: 14, padding: 10, ...tokens.shadow.card },
  cpName: { fontSize: 15, fontWeight: '600', color: tokens.color.textPrimary },
  cpSet: { fontSize: 12.5, color: tokens.color.textTertiary, marginTop: 2 },
  cpChange: { fontSize: 13, fontWeight: '600', color: tokens.color.textSecondary },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sheetChip: { paddingVertical: 8, paddingHorizontal: 13, borderRadius: 999, backgroundColor: tokens.color.surface, borderWidth: 0.5, borderColor: tokens.color.border },
  sheetChipOn: { backgroundColor: tokens.color.accent, borderColor: 'transparent' },
  sheetChipTxt: { fontSize: 13, fontWeight: '600', color: tokens.color.textSecondary },
  sheetChipTxtOn: { color: tokens.color.onAccent },
  valInput: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: tokens.color.surface, borderRadius: 13, paddingHorizontal: 14, paddingVertical: 13, borderWidth: 0.5, borderColor: tokens.color.border },
  valPfx: { fontSize: 18, fontWeight: '600', color: tokens.color.textSecondary },
  valField: { flex: 1, fontSize: 18, fontWeight: '600', color: tokens.color.textPrimary, padding: 0 },
  valSfx: { fontSize: 16, fontWeight: '600', color: tokens.color.textSecondary },
  valHint: { fontSize: 12, color: tokens.color.textTertiary, lineHeight: 17, marginTop: 8 },
  sbtn: { marginTop: 20, paddingVertical: 15, borderRadius: 16, alignItems: 'center' },
  sbtnPrimary: { backgroundColor: tokens.color.accent },
  sbtnPrimaryTxt: { color: tokens.color.onAccent, fontSize: 15.5, fontWeight: '600' },
  sbtnGhost: { paddingVertical: 11, alignItems: 'center', marginTop: 4 },
  sbtnGhostTxt: { color: tokens.color.textSecondary, fontSize: 14.5, fontWeight: '500' },
  sheetNote: { fontSize: 11, color: tokens.color.textTertiary, textAlign: 'center', marginTop: 10, lineHeight: 16 },

  aDelBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', marginLeft: 4 },
  cardPickerList: { marginTop: 10, backgroundColor: tokens.color.surface, borderRadius: 12, paddingVertical: 4, maxHeight: 280, ...tokens.shadow.card },
  cardPickerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 8 },
  toggle: { width: 44, height: 26, borderRadius: 13, backgroundColor: tokens.color.border, padding: 3, justifyContent: 'center' },
  toggleOn: { backgroundColor: tokens.color.gain },
  knob: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } },
  knobOn: { alignSelf: 'flex-end' },

  miniSlab: { width: 46, height: 60, borderRadius: 8, padding: 2, shadowColor: '#1C1C1E', shadowOpacity: 0.18, shadowRadius: 4, shadowOffset: { width: 0, height: 1.5 } },
  miniWin: { flex: 1, borderRadius: 6, overflow: 'hidden', backgroundColor: '#EEF2F8' },
  miniImg: { width: '100%', height: '100%' },
});
