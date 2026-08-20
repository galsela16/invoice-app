import type { Invoice, InvoiceSource, MonthlySummary } from '../types';
import { monthKey } from '../utils/format';

// לוגיקה טהורה: סינון וחישוב סיכום. אין כאן React ואין UI —
// קל לבדוק, וקל לעביר בהמשך לשרת אם נרצה.

export interface Filters {
  search: string;
  month: string | 'all'; // "2025-07" או "all"
  source: InvoiceSource | 'all';
}

export const EMPTY_FILTERS: Filters = {
  search: '',
  month: 'all',
  source: 'all',
};

export function filterInvoices(invoices: Invoice[], f: Filters): Invoice[] {
  const q = f.search.trim().toLowerCase();
  return invoices.filter((inv) => {
    if (f.month !== 'all' && monthKey(inv.issuedAt) !== f.month) return false;
    if (f.source !== 'all' && inv.source !== f.source) return false;
    if (q) {
      const haystack = `${inv.vendor} ${inv.category ?? ''} ${inv.note ?? ''}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

export function summarize(invoices: Invoice[]): MonthlySummary {
  let total = 0;
  for (const inv of invoices) total += inv.amount;
  return { total, count: invoices.length };
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
