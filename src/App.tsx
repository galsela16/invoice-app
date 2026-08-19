import { useEffect, useMemo, useState } from 'react';
import type { Invoice } from './types';
import { invoicesRepo } from './lib/invoicesRepo';
import {
  EMPTY_FILTERS,
  filterInvoices,
  summarize,
  availableMonths,
  sortByDateDesc,
  type Filters as FiltersState,
} from './lib/selectors';
import { monthLabel } from './utils/format';
import { Header } from './components/Header';
import { SummaryPanel } from './components/SummaryPanel';
import { Filters } from './components/Filters';
import { InvoiceList } from './components/InvoiceList';

export default function App() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FiltersState>(EMPTY_FILTERS);

  useEffect(() => {
    let alive = true;
    invoicesRepo.list().then((data) => {
      if (alive) {
        setInvoices(data);
        setLoading(false);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  const months = useMemo(() => availableMonths(invoices), [invoices]);
  const filtered = useMemo(
    () => sortByDateDesc(filterInvoices(invoices, filters)),
    [invoices, filters]
  );
  const summary = useMemo(() => summarize(filtered), [filtered]);

  const periodLabel = filters.month === 'all' ? 'כל החודשים' : monthLabel(filters.month);

  return (
    <div className="min-h-screen bg-surface">
      <Header />

      <main className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:px-6 sm:py-8">
        {loading ? (
          <LoadingState />
        ) : (
          <>
            <SummaryPanel summary={summary} periodLabel={periodLabel} />
            <Filters
              filters={filters}
              months={months}
              onChange={setFilters}
              onReset={() => setFilters(EMPTY_FILTERS)}
            />
            <InvoiceList invoices={filtered} />
          </>
        )}
      </main>

      <footer className="mx-auto max-w-5xl px-4 pb-8 pt-2 text-center text-xs text-slate-400 sm:px-6">
        גרסה ראשונית · נתוני דמה
      </footer>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-5">
      <div className="h-44 animate-pulse rounded-2xl border border-slate-200 bg-white" />
      <div className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white" />
      <div className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-white" />
    </div>
  );
}
