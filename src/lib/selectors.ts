import type { Invoice, InvoiceStatus, InvoiceSource, MonthlySummary } from '../types';
import { monthKey } from '../utils/format';

// לוגיקה טהורה: סינון וחישוב סיכום. אין כאן React ואין UI —
// קל לבדוק, וקל לעביר בהמשך לשרת אם נרצה.

export interface Filters {
  search: string;
  month: string | 'all'; // "2025-07" או "all"
  status: InvoiceStatus | 'all';
  source: InvoiceSource | 'all';
}

export const EMPTY_FILTERS: Filters = {
  search: '',
  month: 'all',
  status: 'all',
  source: 'all',
};

export function filterInvoices(invoices: Invoice[], f: Filters): Invoice[] {
  const q = f.search.trim().toLowerCase();
  return invoices.filter((inv) => {
    if (f.month !== 'all' && monthKey(inv.issuedAt) !== f.month) return false;
    if (f.status !== 'all' && inv.status !== f.status) return false;
    if (f.source !== 'all' && inv.source !== f.source) return false;
    if (q) {
      const haystack = `${inv.vendor} ${inv.category ?? ''} ${inv.note ?? ''}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

export function summarize(invoices: Invoice[]): MonthlySummary {
  const summary: MonthlySummary = { total: 0, paid: 0, unpaid: 0, review: 0, count: invoices.length };
  for (const inv of invoices) {
    summary.total += inv.amount;
    summary[inv.status] += inv.amount;
  }
  return summary;
}

/** רשימת החודשים הקיימים בנתונים, מהחדש לישן. */
export function availableMonths(invoices: Invoice[]): string[] {
  const set = new Set(invoices.map((i) => monthKey(i.issuedAt)));
  return [...set].sort().reverse();
}

/** מיון מהחדש לישן. */
export function sortByDateDesc(invoices: Invoice[]): Invoice[] {
  return [...invoices].sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
}
