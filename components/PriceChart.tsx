/**
 * PriceChart — signature SVG area chart.
 * Smooth monotone line path + gradient fill + thin baseline + last-point dot.
 * No axes, no gridlines. Editorial/minimal aesthetic.
 */
import React, { useMemo } from 'react';
import Svg, { Path, Defs, LinearGradient, Stop, Circle, Line } from 'react-native-svg';
import { useTheme, useThemedStyles, type Theme } from '@/lib/design/theme';
import type { PricePoint } from '@/lib/domain/types';

interface PriceChartProps {
  history: PricePoint[];
  width: number;
  height: number;
  color?: string;
}

/** Build a smooth cubic bezier path from a series of [x, y] points.
 *  Uses Catmull-Rom → Bezier conversion (tension = 0.4) for a natural curve. */
function buildSmoothPath(pts: [number, number][]): string {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0][0]} ${pts[0][1]}`;

  const tension = 0.4;
  let d = `M ${pts[0][0]} ${pts[0][1]}`;

  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];

    const cp1x = p1[0] + (p2[0] - p0[0]) * tension;
    const cp1y = p1[1] + (p2[1] - p0[1]) * tension;
    const cp2x = p2[0] - (p3[0] - p1[0]) * tension;
    const cp2y = p2[1] - (p3[1] - p1[1]) * tension;

    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }
  return d;
}

const GRAD_ID = 'pcFill';
const DOT_R = 3.5;
const BASELINE_STROKE = 0.75;
const LINE_STROKE = 1.5;
const PAD_TOP = 8;
const PAD_BOTTOM = 4;

// Inline light-theme default so the default param is not module-scope token-dependent.
// In practice the caller supplies `color` from tokens.color.chartLine via useTheme().
const DEFAULT_CHART_LINE = '#1F8A4C';

export function PriceChart({ history, width, height, color = DEFAULT_CHART_LINE }: PriceChartProps) {
  const tokens = useTheme();
  const chart = useMemo(() => {
    if (!history || history.length < 2) return null;

    const values = history.map(p => p.median);
    const minV = Math.min(...values);
    const maxV = Math.max(...values);
    const range = maxV - minV;

    // If all prices are identical, render a flat mid-line
    const effectiveRange = range === 0 ? 1 : range;
    const chartH = height - PAD_TOP - PAD_BOTTOM;

    const pts: [number, number][] = history.map((p, i) => [
      (i / (history.length - 1)) * width,
      PAD_TOP + chartH - ((p.median - minV) / effectiveRange) * chartH,
    ]);

    const linePath = buildSmoothPath(pts);

    // Close path down to baseline to form the fill area
    const lastX = pts[pts.length - 1][0];
    const baselineY = height - PAD_BOTTOM;
    const fillPath = linePath + ` L ${lastX} ${baselineY} L 0 ${baselineY} Z`;

    const lastPt = pts[pts.length - 1];

    return { linePath, fillPath, lastPt, baselineY };
  }, [history, width, height]);

  // Graceful empty state — render nothing
  if (!chart) return null;

  const { linePath, fillPath, lastPt, baselineY } = chart;

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id={GRAD_ID} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={tokens.color.chartFillTop} stopOpacity="1" />
          <Stop offset="1" stopColor={tokens.color.chartFillBottom} stopOpacity="0" />
        </LinearGradient>
      </Defs>

      {/* Soft gradient fill */}
      <Path d={fillPath} fill={`url(#${GRAD_ID})`} />

      {/* Smooth line */}
      <Path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={LINE_STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Thin baseline */}
      <Line
        x1={0}
        y1={baselineY}
        x2={width}
        y2={baselineY}
        stroke={tokens.color.border}
        strokeWidth={BASELINE_STROKE}
      />

      {/* Last-point dot */}
      <Circle
        cx={lastPt[0]}
        cy={lastPt[1]}
        r={DOT_R}
        fill={tokens.color.surface}
        stroke={color}
        strokeWidth={1.5}
      />
    </Svg>
  );
}
