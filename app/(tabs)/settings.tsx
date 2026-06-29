import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { showInfo } from '@/lib/ui/dialog';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme, useThemedStyles, type Theme } from '@/lib/design/theme';
import { useSettings } from '@/lib/state/useSettings';
import { updateSettings } from '@/lib/state/settingsStore';
import { useDataset } from '@/lib/state/useDataset';
import { exportHoldingsCsv } from '@/lib/export/exportCsv';

const GOLD = '#C8A96A';

function SectionLabel({ children }: { children: string }) {
  const styles = useThemedStyles(makeStyles);
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

function Row({ icon, color, label, pro, right, onPress }: { icon: any; color: string; label: string; pro?: boolean; right: React.ReactNode; onPress?: () => void }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <TouchableOpacity
      style={styles.row}
      activeOpacity={0.7}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={pro ? `${label} (Pro)` : label}
    >
      <View style={[styles.rowIcon, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      {pro ? <Text style={styles.proTag}>Pro</Text> : null}
      <View style={styles.rowRight}>{right}</View>
    </TouchableOpacity>
  );
}

function Chevron() {
  const tokens = useTheme();
  return <Ionicons name="chevron-forward" size={16} color={tokens.color.textTertiary} />;
}
const APPEARANCES: ('System' | 'Light' | 'Dark')[] = ['System', 'Light', 'Dark'];

export default function SettingsScreen() {
  const styles = useThemedStyles(makeStyles);
  const tokens = useTheme();
  const { faceId, pro, currency, appearance } = useSettings();
  const { view } = useDataset();
  const [paywall, setPaywall] = useState(false);
  const [appearancePicker, setAppearancePicker] = useState(false);

  const PRO_FEATURES = ['Dark & light themes', 'CSV collection export', 'Unlimited price alerts', 'Priority price refresh'];

  function unlockPro() {
    updateSettings({ pro: true });
    setPaywall(false);
  }

  async function exportCsv() {
    if (!pro) { setPaywall(true); return; }
    const rows = view?.rows ?? [];
    if (!rows.length) { showInfo('Nothing to export', 'Add a card to your collection first.'); return; }
    try {
      await exportHoldingsCsv(rows);
    } catch {
      showInfo('Export failed', 'Could not export your collection. Please try again.');
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Settings</Text>

        {/* Pro upsell */}
        <LinearGradient colors={['#1E1E21', '#121214', '#0E0E10']} start={{ x: 0.2, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.proCard}>
          <View style={styles.proHeader}>
            <View style={styles.proGem}>
              <Ionicons name="diamond" size={15} color="#5B4420" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.proTitle}>Catchstack Pro</Text>
              <Text style={styles.proSubtitle}>Unlock the full collection experience</Text>
            </View>
          </View>
          <View style={styles.proFeatures}>
            {PRO_FEATURES.map((f) => (
              <View key={f} style={styles.proFeat}>
                <View style={styles.proFeatDot}><Ionicons name="checkmark" size={9} color={GOLD} /></View>
                <Text style={styles.proFeatText}>{f}</Text>
              </View>
            ))}
          </View>
          <View style={styles.proFooter}>
            <View>
              <Text style={styles.proPriceMain}>{pro ? 'Active' : 'Free in early access'}</Text>
              <Text style={styles.proPriceAlt}>{pro ? 'All features unlocked' : 'Subscription planned later'}</Text>
            </View>
            <TouchableOpacity style={styles.proBtn} activeOpacity={0.85} onPress={() => setPaywall(true)}>
              <Text style={styles.proBtnTxt}>{pro ? 'Manage' : 'Unlock'}</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* General */}
        <SectionLabel>General</SectionLabel>
        <View style={styles.listCard}>
          <Row icon="cash-outline" color="#3A7BD5" label="Display Currency" right={<Text style={styles.staticVal}>{currency}</Text>} />
          <View style={styles.sep} />
          <Row icon="notifications-outline" color="#8B5CF6" label="Notifications" right={<Chevron />} onPress={() => router.push('/alerts')} />
          <View style={styles.sep} />
          <Row icon="happy-outline" color={tokens.color.gain} label="Face ID Lock" right={
            <TouchableOpacity activeOpacity={0.8} onPress={() => updateSettings({ faceId: !faceId })} style={[styles.toggle, faceId && styles.toggleOn]}>
              <View style={[styles.knob, faceId && styles.knobOn]} />
            </TouchableOpacity>
          } />
          <View style={styles.sep} />
          <Row icon="contrast-outline" color={tokens.color.textSecondary} label="Appearance" pro={!pro} right={
            <View style={styles.valRow}><Text style={styles.staticVal}>{appearance}</Text><Chevron /></View>
          } onPress={() => { if (pro) setAppearancePicker(true); else setPaywall(true); }} />
        </View>

        {/* Data */}
        <SectionLabel>Data</SectionLabel>
        <View style={styles.listCard}>
          <Row icon="download-outline" color="#0D9488" label="Export collection (CSV)" pro={!pro} right={<Chevron />} onPress={exportCsv} />
        </View>

        {/* About */}
        <SectionLabel>About</SectionLabel>
        <View style={styles.listCard}>
          <Row icon="reader-outline" color="#5E6AD2" label="Terms of Service" right={<Chevron />} onPress={() => router.push({ pathname: '/info/[topic]', params: { topic: 'terms' } })} />
          <View style={styles.sep} />
          <Row icon="shield-checkmark-outline" color="#3A7BD5" label="Privacy Policy" right={<Chevron />} onPress={() => router.push({ pathname: '/info/[topic]', params: { topic: 'privacy' } })} />
          <View style={styles.sep} />
          <Row icon="alert-circle-outline" color="#8B5CF6" label="Disclaimer" right={<Chevron />} onPress={() => router.push({ pathname: '/info/[topic]', params: { topic: 'disclaimer' } })} />
          <View style={styles.sep} />
          <Row icon="server-outline" color="#0D9488" label="About & data sources" right={<Chevron />} onPress={() => router.push({ pathname: '/info/[topic]', params: { topic: 'about' } })} />
          <View style={styles.sep} />
          <Row icon="mail-outline" color={tokens.color.gain} label="Contact Us" right={<Chevron />} onPress={() => router.push({ pathname: '/info/[topic]', params: { topic: 'contact' } })} />
        </View>

        {/* data source note (IP / legal) */}
        <Text style={styles.dataNote}>
          Prices are public UNGRADED reference values (pokemontcg.io / Scryfall / TCGplayer), not an appraisal. Not affiliated with, endorsed by, or sponsored by Nintendo, The Pokémon Company, Wizards of the Coast, PSA, or TCGplayer.
        </Text>
        <Text style={styles.version}>Catchstack 1.0.0</Text>
        <View style={{ height: tokens.space.xl }} />
      </ScrollView>

      {/* Pro entitlement. During early access Pro is free — "Unlock" flips the
          entitlement that actually gates dark mode, CSV export and unlimited
          alerts. Paid subscription (App Store billing) is planned for later. */}
      <Modal visible={paywall} transparent animationType="slide" onRequestClose={() => setPaywall(false)}>
        <TouchableOpacity style={styles.scrim} activeOpacity={1} onPress={() => setPaywall(false)} />
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <View style={styles.sheetHead}>
            <Text style={styles.sheetTitle}>{pro ? 'Catchstack Pro · Active' : 'Catchstack Pro'}</Text>
            <TouchableOpacity onPress={() => setPaywall(false)} style={styles.sheetX} activeOpacity={0.7}>
              <Ionicons name="close" size={18} color={tokens.color.textSecondary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.paywallSub}>{pro ? 'Every Pro feature is unlocked on this device.' : 'Free during early access — unlock every feature now.'}</Text>
          <View style={{ marginTop: 14, gap: 12 }}>
            {PRO_FEATURES.map((f) => (
              <View key={f} style={styles.payFeat}>
                <Ionicons name="checkmark-circle" size={20} color={tokens.color.gain} />
                <Text style={styles.payFeatTxt}>{f}</Text>
              </View>
            ))}
          </View>
          {pro ? (
            <>
              <TouchableOpacity style={[styles.payCta, { backgroundColor: tokens.color.surfaceSunken }]} activeOpacity={0.9} onPress={() => { updateSettings({ pro: false }); setPaywall(false); }}>
                <Text style={[styles.payCtaTxt, { color: tokens.color.textSecondary }]}>Turn off Pro features</Text>
              </TouchableOpacity>
              <Text style={styles.payNote}>A paid subscription (App Store billing) will replace early-access unlock in a later update.</Text>
            </>
          ) : (
            <>
              <TouchableOpacity style={styles.payCta} activeOpacity={0.9} onPress={unlockPro}>
                <Text style={styles.payCtaTxt}>Unlock Pro — free</Text>
              </TouchableOpacity>
              <Text style={styles.payNote}>Free while Catchstack is in early access. A paid subscription is planned for a later update; the free tier stays fully usable.</Text>
            </>
          )}
          <View style={{ height: 16 }} />
        </View>
      </Modal>

      {/* Appearance picker (Pro) */}
      <Modal visible={appearancePicker} transparent animationType="slide" onRequestClose={() => setAppearancePicker(false)}>
        <TouchableOpacity style={styles.scrim} activeOpacity={1} onPress={() => setAppearancePicker(false)} />
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <View style={styles.sheetHead}>
            <Text style={styles.sheetTitle}>Appearance</Text>
            <TouchableOpacity onPress={() => setAppearancePicker(false)} style={styles.sheetX} activeOpacity={0.7}>
              <Ionicons name="close" size={18} color={tokens.color.textSecondary} />
            </TouchableOpacity>
          </View>
          {APPEARANCES.map((opt) => (
            <TouchableOpacity key={opt} style={styles.optRow} activeOpacity={0.7} onPress={() => { updateSettings({ appearance: opt }); setAppearancePicker(false); }}>
              <Text style={styles.optTxt}>{opt}{opt === 'System' ? ' (match device)' : ''}</Text>
              {appearance === opt ? <Ionicons name="checkmark" size={20} color={tokens.color.gain} /> : null}
            </TouchableOpacity>
          ))}
          <View style={{ height: 24 }} />
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const makeStyles = (tokens: Theme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.color.bg },
  scroll: { flex: 1 },
  content: { paddingBottom: 24, maxWidth: 440, width: '100%', alignSelf: 'center', paddingHorizontal: 24 },
  title: { fontSize: 28, fontWeight: '700', letterSpacing: -0.8, color: tokens.color.textPrimary, paddingTop: 8, paddingBottom: 18 },

  proCard: { borderRadius: 22, padding: 18, ...tokens.shadow.card },
  proHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  proGem: {
    width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center',
    backgroundColor: GOLD,
  },
  proTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3, color: '#FFFFFF' },
  proSubtitle: { fontSize: 12.5, color: 'rgba(255,255,255,0.55)', marginTop: 2 },
  proFeatures: { marginTop: 16, gap: 10 },
  proFeat: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  proFeatDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(200,169,106,0.16)', alignItems: 'center', justifyContent: 'center' },
  proFeatText: { fontSize: 13.5, fontWeight: '500', color: 'rgba(255,255,255,0.82)' },
  proFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.1)' },
  proPriceMain: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.2 },
  proPriceAlt: { fontSize: 11.5, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  proBtn: { backgroundColor: GOLD, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12 },
  proBtnTxt: { fontSize: 14, fontWeight: '700', color: '#2A2113', letterSpacing: -0.1 },

  sectionLabel: { fontSize: 13, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase', color: tokens.color.textTertiary, paddingTop: 24, paddingBottom: 10, paddingLeft: 2 },
  listCard: { backgroundColor: tokens.color.surface, borderRadius: 16, overflow: 'hidden', ...tokens.shadow.card },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 13 },
  rowIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { flex: 1, fontSize: 15.5, fontWeight: '500', letterSpacing: -0.2, color: tokens.color.textPrimary },
  proTag: { fontSize: 10, fontWeight: '700', letterSpacing: 0.4, color: tokens.color.goldDeep, textTransform: 'uppercase', backgroundColor: tokens.color.goldSoft, paddingVertical: 2, paddingHorizontal: 6, borderRadius: 5, overflow: 'hidden', marginRight: 6 },
  rowRight: { flexShrink: 0 },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: tokens.color.border, marginLeft: 56 },
  staticVal: { fontSize: 14.5, fontWeight: '500', color: tokens.color.textTertiary },
  valRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  toggle: { width: 44, height: 26, borderRadius: 13, backgroundColor: tokens.color.border, padding: 3, justifyContent: 'center' },
  toggleOn: { backgroundColor: tokens.color.gain },
  knob: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } },
  knobOn: { alignSelf: 'flex-end' },

  dataNote: { fontSize: 11, lineHeight: 17, color: tokens.color.textTertiary, letterSpacing: 0.03, paddingTop: 22, paddingHorizontal: 2 },
  version: { fontSize: 12, color: tokens.color.textTertiary, textAlign: 'center', paddingTop: 20 },

  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  // paddingBottom: 34 reserves space for the iPhone home indicator so the
  // bottom button isn't tappable into the system gesture area.
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '90%', backgroundColor: tokens.color.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 22, paddingTop: 10, paddingBottom: 34 },
  grabber: { width: 38, height: 5, borderRadius: 3, backgroundColor: tokens.color.border, alignSelf: 'center', marginBottom: 10 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 4 },
  sheetTitle: { fontSize: 20, fontWeight: '700', letterSpacing: -0.4, color: tokens.color.textPrimary },
  sheetX: { width: 32, height: 32, borderRadius: 16, backgroundColor: tokens.color.surfaceSunken, alignItems: 'center', justifyContent: 'center' },
  paywallSub: { fontSize: 14, color: tokens.color.textSecondary, marginTop: 4 },
  payFeat: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  payFeatTxt: { fontSize: 15, fontWeight: '500', color: tokens.color.textPrimary },
  payPrice: { marginTop: 20, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: tokens.color.border },
  payPriceMain: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3, color: tokens.color.textPrimary },
  payPriceAlt: { fontSize: 13, color: tokens.color.textTertiary, marginTop: 2 },
  payCta: { marginTop: 16, backgroundColor: GOLD, paddingVertical: 15, borderRadius: 16, alignItems: 'center' },
  payCtaTxt: { fontSize: 15.5, fontWeight: '700', color: '#2A2113' },
  payNote: { fontSize: 11.5, lineHeight: 16, color: tokens.color.textTertiary, textAlign: 'center', marginTop: 8 },
  optRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: tokens.color.border },
  optTxt: { fontSize: 16, fontWeight: '500', color: tokens.color.textPrimary },
});
