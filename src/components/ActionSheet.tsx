interface Action {
  label: string;
  onSelect: () => void;
  tone?: 'default' | 'danger';
}

interface Props {
  title: string;
  actions: Action[];
  onClose: () => void;
}

// חלון פעולות קטן לשורה (הסתרה / הסתרת ספק / הורדת ספק).
export function ActionSheet({ title, actions, onClose }: Props) {
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
        <div className="border-b border-slate-200 px-4 py-3">
          <p className="truncate text-sm font-semibold text-ink">{title}</p>
        </div>
        <ul className="p-2">
          {actions.map((a, i) => (
            <li key={i}>
              <button
                onClick={a.onSelect}
                className={`w-full rounded-lg px-3 py-2.5 text-right text-sm font-medium transition ${
                  a.tone === 'danger'
                    ? 'text-rose-600 hover:bg-rose-50'
                    : 'text-ink hover:bg-slate-100'
                }`}
              >
                {a.label}
              </button>
            </li>
          ))}
          <li>
            <button
              onClick={onClose}
              className="w-full rounded-lg px-3 py-2.5 text-right text-sm font-medium text-slate-500 transition hover:bg-slate-100"
            >
              ביטול
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
}
