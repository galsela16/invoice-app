interface Option {
  value: string; // 'all' | "2025" | "2025-07"
  label: string;
}

interface Props {
  title: string;
  options: Option[];
  onPick: (value: string) => void;
  onClose: () => void;
}

// מוֹדַל קטן לבחירת התקופה לייצוא (שנה/חודש או "הכל").
export function ExportDialog({ title, options, onPick, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-xs overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <p className="text-sm font-semibold text-ink">{title}</p>
          <button
            onClick={onClose}
            aria-label="סגירה"
            className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
              <path d="M10 8.586 4.707 3.293 3.293 4.707 8.586 10l-5.293 5.293 1.414 1.414L10 11.414l5.293 5.293 1.414-1.414L11.414 10l5.293-5.293-1.414-1.414L10 8.586z" />
            </svg>
          </button>
        </div>
        <ul className="max-h-72 overflow-auto p-2">
          {options.map((o) => (
            <li key={o.value}>
              <button
                onClick={() => onPick(o.value)}
                className="w-full rounded-lg px-3 py-2.5 text-right text-sm font-medium text-ink transition hover:bg-brand hover:text-white"
              >
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
