import type { Invoice } from '../types';
import { formatCurrency, formatDate } from '../utils/format';
import { StatusBadge } from './StatusBadge';
import { SourceBadge } from './SourceBadge';

interface Props {
  invoices: Invoice[];
}

export function InvoiceList({ invoices }: Props) {
  if (invoices.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-16 text-center">
        <p className="text-base font-semibold text-ink">לא נמצאו חשבוניות</p>
        <p className="mt-1 text-sm text-slate-500">
          נסו לשנות את מונחי החיפוש או לנקות את הסינון.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* כותרת עמודות — רק בדסקטופ */}
      <div className="hidden grid-cols-12 gap-4 border-b border-slate-100 bg-slate-50/70 px-5 py-3 text-xs font-semibold text-slate-500 sm:grid">
        <div className="col-span-5">ספק</div>
        <div className="col-span-2">תאריך</div>
        <div className="col-span-2">מקור</div>
        <div className="col-span-2 text-left">סכום</div>
        <div className="col-span-1 text-left">סטטוס</div>
      </div>

      <ul className="divide-y divide-slate-100">
        {invoices.map((inv) => (
          <li
            key={inv.id}
            className="px-5 py-4 transition hover:bg-slate-50/70 sm:grid sm:grid-cols-12 sm:items-center sm:gap-4"
          >
            {/* ספק + קטגוריה */}
            <div className="sm:col-span-5">
              <p className="font-semibold text-ink">{inv.vendor}</p>
              {inv.category && (
                <p className="mt-0.5 text-xs text-slate-500">{inv.category}</p>
              )}
            </div>

            {/* נייד: שורת מטא. דסקטופ: עמודות נפרדות */}
            <div className="mt-3 flex items-center justify-between sm:contents">
              <div className="text-sm text-slate-600 nums sm:col-span-2">
                {formatDate(inv.issuedAt)}
              </div>
              <div className="sm:col-span-2">
                <SourceBadge source={inv.source} />
              </div>
              <div className="nums text-base font-bold text-ink sm:col-span-2 sm:text-left">
                {formatCurrency(inv.amount)}
              </div>
              <div className="sm:col-span-1 sm:text-left">
                <StatusBadge status={inv.status} />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
