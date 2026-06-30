import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Path, Line, Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { useTheme, useThemedStyles, type Theme } from '@/lib/design/theme';
import type { PricePoint } from '@/lib/domain/types';

// Signature portfolio chart — ports design/portfolio.html's chart exactly:
// canned growth SERIES (fractions of the real total), nice axis steps,
// 3 gridlines, y-axis value labels, x-axis date labels, smooth area path.
const RANGES = ['7D', '30D', '90D', 'ALL'] as const;
type Range = (typeof RANGES)[number];

const SERIES: Record<Range, number[]> = {
  '7D': [0.952, 0.958, 0.955, 0.963, 0.969, 0.966, 0.974, 0.978, 0.983, 0.987, 0.993, 1],
  '30D': [0.872, 0.886, 0.901, 0.895, 0.91, 0.926, 0.919, 0.934, 0.948, 0.941, 0.957, 0.969, 0.978, 0.986, 0.993, 1],
  '90D': [0.701, 0.728, 0.756, 0.745, 0.779, 0.808, 0.796, 0.831, 0.852, 0.84, 0.873, 0.899, 0.918, 0.908, 0.939, 0.961, 0.952, 0.974, 0.989, 1],
  ALL: [0.402, 0.431, 0.468, 0.456, 0.503, 0.541, 0.528, 0.578, 0.609, 0.596, 0.648, 0.687, 0.671, 0.722, 0.76, 0.748, 0.799, 0.841, 0.88, 0.918, 0.962, 1],
};
function fmtMD(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}
// X-axis labels anchored to TODAY, four evenly-spaced ticks per range.
function buildXLabels(range: Range): string[] {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const day = 86400000;
  switch (range) {
    case '7D': {
      // -6d, -4d, -2d, today
      return [6, 4, 2, 0].map((n) => fmtMD(new Date(today.getTime() - n * day)));
    }
    case '30D': {
      return [30, 20, 10, 0].map((n) => fmtMD(new Date(today.getTime() - n * day)));
    }
    case '90D': {
      return [90, 60, 30, 0].map((n) => fmtMD(new Date(today.getTime() - n * day)));
    }
    case 'ALL': {
      const y = today.getUTCFullYear();
      return [y - 3, y - 2, y - 1, y].map((v) => String(v));
    }
  }
}
const PERIOD_LABEL: Record<Range, string> = { '7D': 'Past 7 days', '30D': 'Past 30 days', '90D': 'Past 90 days', ALL: 'All time' };
const SEG_LABEL: Record<Range, string> = { '7D': '7D', '30D': '30D', '90D': '90D', ALL: 'All' };

function fmtUSD(n: number): string {
  return '$' + Math.round(n).toLocaleString('en-US');
}
function niceFloor(v: number, s: number) { return Math.floor(v / s) * s; }
function niceCeil(v: number, s: number) { return Math.ceil(v / s) * s; }
function pickStep(range: number) {
  const raw = range / 4.2;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / pow;
  let s: number;
  if (norm < 1.5) s = 1; else if (norm < 3) s = 2; else if (norm < 7) s = 5; else s = 10;
  return s * pow;
}
function buildSmooth(pts: [number, number][]): string {
  if (pts.length < 2) return '';
  const t = 0.4;
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1x = p1[0] + (p2[0] - p0[0]) * t, c1y = p1[1] + (p2[1] - p0[1]) * t;
    const c2x = p2[0] - (p3[0] - p1[0]) * t, c2y = p2[1] - (p3[1] - p1[1]) * t;
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }
  return d;
}

const H = 190;
const PT = 14;
const PB = 14;
const Y_GUTTER = 50;

export function PortfolioChart({ total, width, history }: { total: number; width: number; history?: PricePoint[] }) {
  const styles = useThemedStyles(makeStyles);
  const tokens = useTheme();
  const [range, setRange] = useState<Range>('7D');
  const plotW = Math.max(120, width - Y_GUTTER);

  const model = useMemo(() => {
    const ch = H - PT - PB;
    // Per-card mode (history given): the card's own illustrative price history,
    // sliced by the selected range — so every card draws a DISTINCT line.
    // Portfolio mode (no history): canned growth SERIES scaled by `total`.
    let data: number[];
    let xLabels: string[];
    if (history && history.length >= 2) {
      const want: Record<Range, number> = { '7D': 7, '30D': 30, '90D': 90, ALL: history.length };
      const k = Math.max(2, Math.min(want[range], history.length));
      const win = history.slice(history.length - k);
      data = win.map((p) => p.median);
      xLabels = [0, 1, 2, 3].map((j) => {
        const idx = Math.round((j / 3) * (win.length - 1));
        return fmtMD(new Date(win[idx].date + 'T00:00:00Z'));
      });
    } else {
      data = SERIES[range].map((f) => total * f);
      xLabels = buildXLabels(range);
    }
    const dmin = Math.min(...data), dmax = Math.max(...data);
    const step = pickStep(dmax - dmin || dmax * 0.1);
    const axMin = niceFloor(dmin - (dmax - dmin) * 0.12, step);
    const axMax = niceCeil(dmax + (dmax - dmin) * 0.06, step);
    const axR = axMax - axMin || 1;
    const y = (v: number) => PT + ch - ((v - axMin) / axR) * ch;
    const pts: [number, number][] = data.map((v, i) => [(i / (data.length - 1)) * plotW, y(v)]);
    const line = buildSmooth(pts);
    const lastX = pts[pts.length - 1][0];
    const fill = `${line} L ${lastX} ${H} L 0 ${H} Z`;
    const lp = pts[pts.length - 1];

    const gridVals: number[] = [];
    for (let v = niceCeil(axMin + step * 0.01, step); v < axMax - step * 0.01 && gridVals.length < 3; v += step) {
      if (v > axMin) gridVals.push(v);
    }
    const first = data[0];
    const chgUsd = data[data.length - 1] - first;
    const chgPct = first > 0 ? (chgUsd / first) * 100 : 0;
    return { line, fill, lp, y, gridVals, chgUsd, chgPct, xLabels };
  }, [range, total, plotW, history]);

  const up = model.chgUsd >= 0;
  const lineColor = up ? tokens.color.gain : tokens.color.loss;

  return (
    <View style={styles.card}>
      <View style={styles.context}>
        <Text style={[styles.pcChange, { color: lineColor }]}>
          {(up ? '+' : '-') + fmtUSD(Math.abs(model.chgUsd))} · {(up ? '+' : '') + model.chgPct.toFixed(1)}%
        </Text>
        <Text style={styles.pcPeriod}>{PERIOD_LABEL[range]}</Text>
      </View>

      <View style={styles.seg}>
        {RANGES.map((r) => (
          <TouchableOpacity key={r} style={[styles.segBtn, r === range && styles.segBtnOn]} onPress={() => setRange(r)} activeOpacity={0.8}>
            <Text style={[styles.segTxt, r === range && styles.segTxtOn]}>{SEG_LABEL[r]}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.chartwrap}>
        <View style={{ width: plotW }}>
          <Svg width={plotW} height={H}>
            <Defs>
              {/* react-native-svg ignores the alpha channel in an rgba() stopColor,
                  so the faded area fill rendered as a solid green block. Drive the
                  fade with an explicit numeric stopOpacity on a solid color, and
                  match the line color so the fill tracks gain (green) / loss (red). */}
              <SvgGradient id="pcArea" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={lineColor} stopOpacity={0.18} />
                <Stop offset="1" stopColor={lineColor} stopOpacity={0} />
              </SvgGradient>
            </Defs>
            {model.gridVals.map((v, i) => (
              <Line key={i} x1={0} y1={model.y(v)} x2={plotW} y2={model.y(v)} stroke={tokens.color.border} strokeWidth={1} />
            ))}
            <Path d={model.fill} fill="url(#pcArea)" />
            <Path d={model.line} fill="none" stroke={lineColor} strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" />
            <Circle cx={model.lp[0]} cy={model.lp[1]} r={7} fill={tokens.color.gainBg} />
            <Circle cx={model.lp[0]} cy={model.lp[1]} r={3.6} fill={tokens.color.surface} stroke={lineColor} strokeWidth={2} />
          </Svg>
        </View>
        <View style={[styles.yaxis, { width: Y_GUTTER, height: H }]}>
          {model.gridVals.map((v, i) => (
            <Text key={i} style={[styles.ylab, { top: model.y(v) - 6 }]}>{fmtUSD(v)}</Text>
          ))}
        </View>
      </View>

      <View style={[styles.xaxis, { width: plotW }]}>
        {model.xLabels.map((lab, i, arr) => {
          const leftPct = (i / (arr.length - 1)) * 100;
          const align: 'flex-start' | 'center' | 'flex-end' = i === 0 ? 'flex-start' : i === arr.length - 1 ? 'flex-end' : 'center';
          return (
            <View key={i} style={[styles.xlabWrap, { left: `${leftPct}%` }]}>
              <View style={{ width: 60, alignItems: align, marginLeft: i === 0 ? 0 : -30 }}>
                <Text style={styles.xlab}>{lab}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const makeStyles = (tokens: Theme) => StyleSheet.create({
  card: {
    backgroundColor: tokens.color.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    ...tokens.shadow.card,
  },
  context: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 14 },
  pcChange: { fontSize: 16, fontWeight: '600', letterSpacing: -0.3 },
  pcPeriod: { fontSize: 13, fontWeight: '500', color: tokens.color.textTertiary, letterSpacing: -0.1 },
  seg: { flexDirection: 'row', backgroundColor: tokens.color.surfaceSunken, borderRadius: 10, padding: 3, gap: 2 },
  segBtn: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 8 },
  segBtnOn: {
    backgroundColor: tokens.color.surface,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  segTxt: { fontSize: 13, fontWeight: '600', color: tokens.color.textSecondary, letterSpacing: -0.1 },
  segTxtOn: { color: tokens.color.textPrimary },
  chartwrap: { flexDirection: 'row', marginTop: 16 },
  yaxis: { position: 'relative' },
  ylab: { position: 'absolute', right: 0, fontSize: 11, color: tokens.color.textTertiary, textAlign: 'right' },
  xaxis: { height: 16, marginTop: 9, position: 'relative' },
  xlabWrap: { position: 'absolute', top: 0 },
  xlab: { fontSize: 11, color: tokens.color.textTertiary },
});
