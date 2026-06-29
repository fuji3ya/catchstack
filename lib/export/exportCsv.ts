// Real CSV export of the collection (a Pro feature). On web it downloads a
// .csv file; on native it opens the share sheet with the CSV contents.
import { Platform, Share } from 'react-native';
import type { HoldingRow } from '@/lib/state/store';

function esc(v: string | number | undefined | null): string {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function buildHoldingsCsv(rows: HoldingRow[]): string {
  const header = ['Card', 'Set', 'Category', 'Grade', 'Market value (USD)', 'Cost (USD)', 'Unrealized P/L (USD)', 'Acquired', 'Storage'];
  const lines = [header.join(',')];
  for (const r of rows) {
    const pl = r.cost != null ? r.median - r.cost : '';
    lines.push([
      esc(r.title), esc(r.setName), esc(r.tcg === 'mtg' ? 'MTG' : 'Pokemon'),
      esc(r.grade),
      esc(r.median.toFixed(2)), esc(r.cost != null ? r.cost.toFixed(2) : ''),
      esc(pl === '' ? '' : (pl as number).toFixed(2)),
      esc(r.acquisitionDate ?? ''), esc(r.storage ?? ''),
    ].join(','));
  }
  return lines.join('\n');
}

export async function exportHoldingsCsv(rows: HoldingRow[]): Promise<void> {
  const csv = buildHoldingsCsv(rows);
  if (Platform.OS === 'web') {
    // Browser download.
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'catchstack-collection.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } else {
    await Share.share({ message: csv, title: 'Catchstack collection (CSV)' });
  }
}
