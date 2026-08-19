import type { Filters as FiltersState } from '../lib/selectors';
import { STATUS_LABEL, SOURCE_LABEL, STATUS_ORDER, SOURCE_ORDER } from '../lib/labels';
import { monthLabel } from '../utils/format';

interface Props {
  filters: FiltersState;
  months: string[];
  onChange: (next: FiltersState) => void;
  onReset: () => void;
}

const selectClass =
  'w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2 pl-8 text-sm font-medium text-ink shadow-sm transition hover:border-slate-300 focus:border-brand';

function Chevron() {
  return (
    <svg
      className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function Filters({ filters, months, onChange, onReset }: Props) {
  const hasActive =
    filters.search !== '' ||
    filters.month !== 'all' ||
    filters.status !== 'all' ||
    filters.source !== 'all';

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      {/* חיפוש */}
      <div className="relative">
        <svg
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.45 4.39l3.08 3.08a1 1 0 01-1.42 1.42l-3.08-3.08A7 7 0 012 9z"
            clipRule="evenodd"
          />
        </svg>
        <input
          type="search"
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          placeholder="חיפוש לפי ספק, קטגוריה או הערה…"
          className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pr-10 pl-3 text-sm text-ink shadow-sm transition placeholder:text-slate-400 hover:border-slate-300 focus:border-brand"
        />
      </div>

      {/* סינונים */}
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="relative">
          <select
            aria-label="סינון לפי חודש"
            value={filters.month}
            onChange={(e) => onChange({ ...filters, month: e.target.value })}
            className={selectClass}
          >
            <option value="all">כל החודשים</option>
            {months.map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)}
              </option>
            ))}
          </select>
          <Chevron />
        </div>

        <div className="relative">
          <select
            aria-label="סינון לפי סטטוס"
            value={filters.status}
            onChange={(e) => onChange({ ...filters, status: e.target.value as FiltersState['status'] })}
            className={selectClass}
          >
            <option value="all">כל הסטטוסים</option>
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          <Chevron />
        </div>

        <div className="relative">
          <select
            aria-label="סינון לפי מקור"
            value={filters.source}
            onChange={(e) => onChange({ ...filters, source: e.target.value as FiltersState['source'] })}
            className={selectClass}
          >
            <option value="all">כל המקורות</option>
            {SOURCE_ORDER.map((s) => (
              <option key={s} value={s}>
                {SOURCE_LABEL[s]}
              </option>
            ))}
          </select>
          <Chevron />
        </div>
      </div>

      {hasActive && (
        <button
          onClick={onReset}
          className="mt-3 text-sm font-medium text-brand transition hover:text-teal-800"
        >
          ניקוי סינון
        </button>
      )}
    </div>
  );
}
