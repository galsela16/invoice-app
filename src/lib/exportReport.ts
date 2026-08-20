import type { Invoice } from '../types';
import { formatDate, monthKey } from '../utils/format';
import { SOURCE_LABEL } from './labels';

export type GroupBy = 'month' | 'year';

const round2 = (n: number) => Math.round(n * 100) / 100;

/** בונה דוח אקסל (סיכום + פירוט) מקובץ, לפי חודש או לפי שנה, ומוריד אותו. */
export async function exportReportXlsx(invoices: Invoice[], groupBy: GroupBy): Promise<void> {
  if (invoices.length === 0) throw new Error('אין חשבוניות לייצוא.');
  const XLSX = await import('xlsx');

  const rows = [...invoices].sort((a, b) => a.issuedAt.localeCompare(b.issuedAt));
  const period = (inv: Invoice) =>
    groupBy === 'year' ? inv.issuedAt.slice(0, 4) : monthKey(inv.issuedAt);

  // גיליון פירוט
  const header = ['תקופה', 'תאריך', 'ספק', 'מקור', 'סכום (₪)', 'מטבע', 'סכום מקורי'];
  const detail = rows.map((inv) => [
    period(inv),
    formatDate(inv.issuedAt),
    inv.vendor,
    SOURCE_LABEL[inv.source] ?? inv.source,
    round2(inv.amount),
    inv.currency && inv.currency !== 'ILS' ? inv.currency : '',
    inv.currency && inv.currency !== 'ILS' && inv.originalAmount != null
      ? round2(inv.originalAmount)
      : '',
  ]);

  // גיליון סיכום לפי תקופה
  const map = new Map<string, { count: number; total: number }>();
  for (const inv of rows) {
    const k = period(inv);
    const g = map.get(k) ?? { count: 0, total: 0 };
    g.count += 1;
    g.total += inv.amount;
    map.set(k, g);
  }
  const summary: (string | number)[][] = [['תקופה', 'מספר חשבוניות', 'סה"כ (₪)']];
  let gc = 0;
  let gt = 0;
  for (const k of [...map.keys()].sort()) {
    const g = map.get(k)!;
    summary.push([k, g.count, round2(g.total)]);
    gc += g.count;
    gt += g.total;
  }
  summary.push(['סה"כ הכל', gc, round2(gt)]);

  const wb = XLSX.utils.book_new();
  const wsS = XLSX.utils.aoa_to_sheet(summary);
  wsS['!cols'] = [{ wch: 12 }, { wch: 16 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsS, 'סיכום');

  const wsD = XLSX.utils.aoa_to_sheet([header, ...detail]);
  wsD['!cols'] = [{ wch: 12 }, { wch: 12 }, { wch: 28 }, { wch: 10 }, { wch: 12 }, { wch: 8 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, wsD, 'פירוט');

  const scope = groupBy === 'year' ? 'לפי-שנה' : 'לפי-חודש';
  XLSX.writeFile(wb, `דוח-חשבוניות_${scope}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
