import type { MonthlySummary } from '../types';
import { formatCurrency } from '../utils/format';

interface Props {
  summary: MonthlySummary;
  periodLabel: string; // "יולי 2025" או "כל החודשים"
}

// השורה התחתונה של התקופה במבט אחד: סה"כ ומספר החשבוניות.
export function SummaryPanel({ summary, periodLabel }: Props) {
  const { total, count } = summary;

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
    </section>
  );
}
