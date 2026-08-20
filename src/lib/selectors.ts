import type { Invoice, InvoiceSource, MonthlySummary } from '../types';
import { monthKey } from '../utils/format';

// לוגיקה טהורה: סינון וחישוב סיכום. אין כאן React ואין UI —
// קל לבדוק, וקל לעביר בהמשך לשרת אם נרצה.

export interface Filters {
  search: string;
  year: string | 'all'; // "2025" או "all"
  month: string | 'all'; // "01".."12" או "all"
  source: InvoiceSource | 'all';
}

export const EMPTY_FILTERS: Filters = {
  search: '',
  year: 'all',
  month: 'all',
  source: 'all',
};

export function filterInvoices(invoices: Invoice[], f: Filters): Invoice[] {
  const q = f.search.trim().toLowerCase();
  return invoices.filter((inv) => {
    if (f.year !== 'all' && inv.issuedAt.slice(0, 4) !== f.year) return false;
    if (f.month !== 'all' && inv.issuedAt.slice(5, 7) !== f.month) return false;
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

/** רשימת החודשים הקיימים (מפתחות YYYY-MM), מהחדש לישן — לבורר הייצוא. */
export function availableMonths(invoices: Invoice[]): string[] {
  const set = new Set(invoices.map((i) => monthKey(i.issuedAt)));
  return [...set].sort().reverse();
}

/** רשימת השנים הקיימות בנתונים, מהחדשה לישנה. */
export function availableYears(invoices: Invoice[]): string[] {
  const set = new Set(invoices.map((i) => i.issuedAt.slice(0, 4)));
  return [...set].sort().reverse();
}

/** מיון מהחדש לישן. */
export function sortByDateDesc(invoices: Invoice[]): Invoice[] {
  return [...invoices].sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
}
