import { useState } from 'react';
import type { Invoice } from '../types';
import { formatCurrency, formatCurrencyCode, formatDate } from '../utils/format';
import { SourceBadge } from './SourceBadge';
import { InvoiceModal } from './InvoiceModal';

interface Props {
  invoices: Invoice[];
  onHide?: (id: string) => void;
}

export function InvoiceList({ invoices, onHide }: Props) {
  const [open, setOpen] = useState<Invoice | null>(null);
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
        <div className="col-span-1" />
      </div>

      <ul className="divide-y divide-slate-100">
        {invoices.map((inv) => (
          <li
            key={inv.id}
            onClick={inv.attachments?.length ? () => setOpen(inv) : undefined}
            className={`px-5 py-4 transition hover:bg-slate-50/70 sm:grid sm:grid-cols-12 sm:items-center sm:gap-4 ${
              inv.attachments?.length ? 'cursor-pointer' : ''
            }`}
          >
            {/* ספק + קטגוריה */}
            <div className="sm:col-span-5">
              <p className="flex items-center gap-1.5 font-semibold text-ink">
                {inv.vendor}
                {!!inv.attachments?.length && (
                  <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 shrink-0 text-slate-400" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M15.6 4.4a3 3 0 00-4.2 0l-6 6a1.75 1.75 0 102.5 2.5l5-5a.75.75 0 011 1l-5 5a3.25 3.25 0 11-4.6-4.6l6-6a4.5 4.5 0 016.4 6.4l-6.3 6.3a5.75 5.75 0 11-8.1-8.1l5.6-5.6a.75.75 0 011 1L3.3 9.8a4.25 4.25 0 106 6l6.3-6.3a3 3 0 000-4.2z" clipRule="evenodd" />
                  </svg>
                )}
              </p>
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
                {inv.currency && inv.currency !== 'ILS' && inv.originalAmount != null && (
                  <span className="mt-0.5 block text-xs font-normal text-slate-400">
                    {formatCurrencyCode(inv.originalAmount, inv.currency)}
                  </span>
                )}
              </div>
              <div className="sm:col-span-1 sm:flex sm:justify-start">
                {onHide && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onHide(inv.id);
                    }}
                    title="הסתר — לא חשבונית"
                    aria-label="הסתר"
                    className="shrink-0 rounded p-1 text-slate-300 transition hover:bg-rose-50 hover:text-rose-500"
                  >
                    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                      <path d="M10 8.586 4.707 3.293 3.293 4.707 8.586 10l-5.293 5.293 1.414 1.414L10 11.414l5.293 5.293 1.414-1.414L11.414 10l5.293-5.293-1.414-1.414L10 8.586z" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {open && <InvoiceModal invoice={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
