import type { MonthlySummary } from '../types';
import { formatCurrency } from '../utils/format';
import { STATUS_LABEL, STATUS_DOT } from '../lib/labels';

interface Props {
  summary: MonthlySummary;
  periodLabel: string; // "יולי 2025" או "כל החודשים"
}

// אלמנט החתימה של המסך: השורה התחתונה של החודש במבט אחד —
// סכום גדול, ומתחתיו פס יחיד שמראה איזה חלק כבר שולם, מה פתוח ומה לבדיקה.
export function SummaryPanel({ summary, periodLabel }: Props) {
  const { total, paid, unpaid, review, count } = summary;
  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);

  const segments = [
    { key: 'paid' as const, value: paid },
    { key: 'unpaid' as const, value: unpaid },
    { key: 'review' as const, value: review },
  ];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">סה״כ {periodLabel}</p>
          <p className="mt-1 font-display text-4xl font-black tracking-tight text-ink nums sm:text-5xl">
            {formatCurrency(total)}
          </p>
        </div>
        <p className="shrink-0 text-sm text-slate-500">
          <span className="nums font-semibold text-slate-700">{count}</span> חשבוניות
        </p>
      </div>

      {/* פס פירוט */}
      <div className="mt-6 flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        {segments.map((s) =>
          s.value > 0 ? (
            <div
              key={s.key}
              className={STATUS_DOT[s.key]}
              style={{ width: `${pct(s.value)}%` }}
              title={`${STATUS_LABEL[s.key]}: ${formatCurrency(s.value)}`}
            />
          ) : null
        )}
      </div>

      {/* מקרא */}
      <dl className="mt-5 grid grid-cols-3 gap-3">
        {segments.map((s) => (
          <div key={s.key} className="flex flex-col gap-1">
            <dt className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <span className={`h-2 w-2 rounded-full ${STATUS_DOT[s.key]}`} />
              {STATUS_LABEL[s.key]}
            </dt>
            <dd className="nums text-lg font-bold text-ink">{formatCurrency(s.value)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
