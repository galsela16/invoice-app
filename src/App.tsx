import { useEffect, useMemo, useState } from 'react';
import type { Invoice } from './types';
import { invoicesRepo } from './lib/invoicesRepo';
import {
  EMPTY_FILTERS,
  filterInvoices,
  summarize,
  availableMonths,
  availableYears,
  sortByDateDesc,
  type Filters as FiltersState,
} from './lib/selectors';
import { monthNameByNum } from './utils/format';
import * as gmail from './lib/gmail';
import { exportInvoicesZip, exportVendorZip, countAttachments, type ExportProgress, type GroupBy } from './lib/exportZip';
import { loadDismissed, saveDismissed, loadDismissedVendors, saveDismissedVendors } from './lib/dismissed';
import { exportReportXlsx } from './lib/exportReport';
import { Header } from './components/Header';
import { SummaryPanel } from './components/SummaryPanel';
import { Filters } from './components/Filters';
import { InvoiceList } from './components/InvoiceList';
import { GmailConnect } from './components/GmailConnect';

export default function App() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FiltersState>(EMPTY_FILTERS);
  const [dismissed, setDismissed] = useState<Set<string>>(() => loadDismissed());

  const [dismissedVendors, setDismissedVendors] = useState<Set<string>>(() =>
    loadDismissedVendors()
  );

  function hideInvoice(id: string) {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveDismissed(next);
      return next;
    });
  }

  function hideVendor(vendor: string) {
    setDismissedVendors((prev) => {
      const next = new Set(prev);
      next.add(vendor);
      saveDismissedVendors(next);
      return next;
    });
  }

  async function handleDownloadVendor(vendor: string) {
    const list = gmailInvoices.filter((i) => i.vendor === vendor);
    setExporting(true);
    setExportProgress({ done: 0, total: countAttachments(list) });
    setGmailError(null);
    try {
      await exportVendorZip(list, vendor, (p) => setExportProgress(p));
    } catch (err) {
      setGmailError(err instanceof Error ? err.message : 'שגיאה בהורדה.');
    } finally {
      setExporting(false);
      setExportProgress(null);
    }
  }

  const [gmailInvoices, setGmailInvoices] = useState<Invoice[]>([]);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailLoading, setGmailLoading] = useState(false);
  const [gmailError, setGmailError] = useState<string | null>(null);

  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);

  // מסנן את החשבוניות לתקופה שנבחרה: 'all' | שנה "2025" | חודש "2025-07"
  function scopeToPeriod(list: Invoice[], period: string): Invoice[] {
    if (period === 'all') return list;
    if (period.length === 4) return list.filter((i) => i.issuedAt.slice(0, 4) === period);
    return list.filter((i) => i.issuedAt.slice(0, 7) === period);
  }

  async function handleExport(groupBy: GroupBy, period: string) {
    const scoped = scopeToPeriod(exportInvoices, period);
    setExporting(true);
    setExportProgress({ done: 0, total: countAttachments(scoped) });
    setGmailError(null);
    try {
      await exportInvoicesZip(scoped, groupBy, (p) => setExportProgress(p));
    } catch (err) {
      setGmailError(err instanceof Error ? err.message : 'שגיאה בייצוא.');
    } finally {
      setExporting(false);
      setExportProgress(null);
    }
  }

  async function handleExportExcel(groupBy: GroupBy, period: string) {
    setGmailError(null);
    try {
      await exportReportXlsx(scopeToPeriod(exportInvoices, period), groupBy);
    } catch (err) {
      setGmailError(err instanceof Error ? err.message : 'שגיאה בייצוא הדוח.');
    }
  }

  // טעינת מקור הנתונים המקומי (כרגע ריק — בלי דמה)
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

  // בטעינה: אם חזרנו מ-Google עם token — נטען מיילים. אם כבר מחוברים — נטען.
  useEffect(() => {
    const result = gmail.consumeRedirect();
    if (result === 'connected') {
      setGmailConnected(true);
      loadFromGmail();
    } else if (result === 'error') {
      setGmailError('ההתחברות ל-Gmail נכשלה. נסו שוב.');
    } else if (gmail.isConnected()) {
      setGmailConnected(true);
      loadFromGmail();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadFromGmail() {
    setGmailLoading(true);
    setGmailError(null);
    try {
      const emails = await gmail.fetchInvoiceEmails();
      setGmailInvoices(emails);
      setGmailConnected(true);
    } catch (err) {
      setGmailError(err instanceof Error ? err.message : 'שגיאה במשיכת המיילים.');
    } finally {
      setGmailLoading(false);
    }
  }

  function handleConnect() {
    setGmailError(null);
    gmail.beginConnect(); // מפנה את הדפדפן ל-Google
  }

  function handleDisconnect() {
    gmail.disconnect();
    setGmailInvoices([]);
    setGmailConnected(false);
    setGmailError(null);
  }

  const exportInvoices = useMemo(
    () => gmailInvoices.filter((i) => !dismissed.has(i.id) && !dismissedVendors.has(i.vendor)),
    [gmailInvoices, dismissed, dismissedVendors]
  );

  const allInvoices = useMemo(
    () =>
      [...gmailInvoices, ...invoices].filter(
        (i) => !dismissed.has(i.id) && !dismissedVendors.has(i.vendor)
      ),
    [gmailInvoices, invoices, dismissed, dismissedVendors]
  );

  const years = useMemo(() => availableYears(allInvoices), [allInvoices]);
  const exportMonthKeys = useMemo(() => availableMonths(exportInvoices), [exportInvoices]);
  const exportYearList = useMemo(() => availableYears(exportInvoices), [exportInvoices]);
  const filtered = useMemo(
    () => sortByDateDesc(filterInvoices(allInvoices, filters)),
    [allInvoices, filters]
  );
  const summary = useMemo(() => summarize(filtered), [filtered]);

  const periodLabel = (() => {
    const y = filters.year !== 'all' ? filters.year : '';
    const m = filters.month !== 'all' ? monthNameByNum(filters.month) : '';
    if (!y && !m) return 'כל התקופות';
    if (y && m) return `${m} ${y}`;
    if (y) return y;
    return `${m} (כל השנים)`;
  })();

  return (
    <div className="min-h-screen bg-surface">
      <Header />
      <main className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:px-6 sm:py-8">
        {loading ? (
          <LoadingState />
        ) : (
          <>
            <SummaryPanel summary={summary} periodLabel={periodLabel} />
            <GmailConnect
              configured={gmail.isConfigured()}
              connected={gmailConnected}
              loading={gmailLoading}
              count={gmailConnected ? gmailInvoices.length : null}
              error={gmailError}
              attachmentCount={countAttachments(exportInvoices)}
              exporting={exporting}
              exportProgress={exportProgress}
              onConnect={handleConnect}
              onRefresh={loadFromGmail}
              onDisconnect={handleDisconnect}
              onExport={handleExport}
              onExportExcel={handleExportExcel}
              exportYears={exportYearList}
              exportMonths={exportMonthKeys}
            />
            <Filters
              filters={filters}
              years={years}
              onChange={setFilters}
              onReset={() => setFilters(EMPTY_FILTERS)}
            />
            <InvoiceList
              invoices={filtered}
              onHide={hideInvoice}
              onHideVendor={hideVendor}
              onDownloadVendor={handleDownloadVendor}
            />
          </>
        )}
      </main>
      <footer className="mx-auto max-w-5xl px-4 pb-8 pt-2 text-center text-xs text-slate-400 sm:px-6">
        חשבוניות מ-Gmail (טיוטות לבדיקה)
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
