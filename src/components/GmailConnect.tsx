import { useState } from 'react';
import { ExportDialog } from './ExportDialog';
import { monthLabel } from '../utils/format';
interface Props {
  configured: boolean;
  connected: boolean;
  loading: boolean;
  count: number | null;
  error: string | null;
  attachmentCount: number;
  exporting: boolean;
  exportProgress: { done: number; total: number } | null;
  onConnect: () => void;
  onRefresh: () => void;
  onDisconnect: () => void;
  onExport: (groupBy: 'month' | 'year', period: string) => void;
  onExportExcel: (groupBy: 'month' | 'year', period: string) => void;
  exportYears: string[];
  exportMonths: string[]; // מפתחות YYYY-MM
}

export function GmailConnect({
  configured,
  connected,
  loading,
  count,
  error,
  attachmentCount,
  exporting,
  exportProgress,
  onConnect,
  onRefresh,
  onDisconnect,
  onExport,
  onExportExcel,
  exportYears,
  exportMonths,
}: Props) {
  const [dialog, setDialog] = useState<{
    kind: 'zip' | 'excel';
    groupBy: 'month' | 'year';
  } | null>(null);

  function pick(value: string) {
    if (!dialog) return;
    const { kind, groupBy } = dialog;
    setDialog(null);
    if (kind === 'zip') onExport(groupBy, value);
    else onExportExcel(groupBy, value);
  }

  const dialogOptions =
    dialog?.groupBy === 'year'
      ? [{ value: 'all', label: 'כל השנים' }, ...exportYears.map((y) => ({ value: y, label: y }))]
      : [{ value: 'all', label: 'כל החודשים' }, ...exportMonths.map((m) => ({ value: m, label: monthLabel(m) }))];
  // עדיין לא הוגדר Client ID
  if (!configured) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        כדי למשוך חשבוניות מ-Gmail צריך להגדיר <code className="font-mono">VITE_GOOGLE_CLIENT_ID</code>{' '}
        (בקובץ <code className="font-mono">.env</code> מקומית וב-Vercel). ראו הוראות ההגדרה.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-600">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
              <path d="M4 6.5A2.5 2.5 0 016.5 4h11A2.5 2.5 0 0120 6.5v11a2.5 2.5 0 01-2.5 2.5h-11A2.5 2.5 0 014 17.5v-11zm2.2.3L12 11l5.8-4.2H6.2zm11.3 1.3l-5.1 3.7a1 1 0 01-1.2 0L6.1 8.4v9.1h11.4V8.4z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-ink">חיבור ל-Gmail</p>
            <p className="text-xs text-slate-500">
              {connected
                ? count === null
                  ? 'מחובר'
                  : `נמשכו ${count} חשבוניות · ${attachmentCount} קבצים מצורפים`
                : 'קריאה בלבד — למשיכת חשבוניות מהמייל'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {connected ? (
            <>
              <div className="flex items-center overflow-hidden rounded-lg bg-ink shadow-sm">
                <span className="px-2.5 py-2 text-xs font-medium text-white/70">קבצים (ZIP)</span>
                <button
                  onClick={() => setDialog({ kind: 'zip', groupBy: 'month' })}
                  disabled={exporting || loading || attachmentCount === 0}
                  title={attachmentCount === 0 ? 'אין קבצים מצורפים לייצוא' : 'תיקייה לכל חודש'}
                  className="border-r border-white/15 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
                >
                  {exporting ? 'מייצא…' : 'לפי חודש'}
                </button>
                <button
                  onClick={() => setDialog({ kind: 'zip', groupBy: 'year' })}
                  disabled={exporting || loading || attachmentCount === 0}
                  title={attachmentCount === 0 ? 'אין קבצים מצורפים לייצוא' : 'תיקייה לכל שנה'}
                  className="px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
                >
                  לפי שנה
                </button>
              </div>
              <div className="flex items-center overflow-hidden rounded-lg border border-brand shadow-sm">
                <span className="px-2.5 py-2 text-xs font-medium text-brand">דוח Excel</span>
                <button
                  onClick={() => setDialog({ kind: 'excel', groupBy: 'month' })}
                  disabled={loading}
                  title="דוח אקסל מרוכז לפי חודש"
                  className="border-r border-brand/30 px-3 py-2 text-sm font-semibold text-brand transition hover:bg-teal-50 disabled:opacity-50"
                >
                  לפי חודש
                </button>
                <button
                  onClick={() => setDialog({ kind: 'excel', groupBy: 'year' })}
                  disabled={loading}
                  title="דוח אקסל מרוכז לפי שנה"
                  className="px-3 py-2 text-sm font-semibold text-brand transition hover:bg-teal-50 disabled:opacity-50"
                >
                  לפי שנה
                </button>
              </div>
              <button
                onClick={onRefresh}
                disabled={loading || exporting}
                className="rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 disabled:opacity-60"
              >
                {loading ? 'מרענן…' : 'רענון'}
              </button>
              <button
                onClick={onDisconnect}
                disabled={exporting}
                className="rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
              >
                ניתוק
              </button>
            </>
          ) : (
            <button
              onClick={onConnect}
              disabled={loading}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 disabled:opacity-60"
            >
              {loading ? 'מתחבר…' : 'התחבר ל-Gmail'}
            </button>
          )}
        </div>
      </div>

      {exporting && exportProgress && (
        <div className="mt-3">
          <div className="mb-1 flex justify-between text-xs text-slate-500">
            <span>מוריד קבצים ואורז ZIP…</span>
            <span className="nums">
              {exportProgress.done}/{exportProgress.total}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full bg-brand transition-all"
              style={{
                width: `${exportProgress.total ? (exportProgress.done / exportProgress.total) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      )}

      {error && (
        <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      )}

      {dialog && (
        <ExportDialog
          title={dialog.groupBy === 'year' ? 'ייצוא — בחר שנה' : 'ייצוא — בחר חודש'}
          options={dialogOptions}
          onPick={pick}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}
