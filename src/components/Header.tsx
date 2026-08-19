export function Header() {
  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white shadow-sm">
            {/* אייקון קבלה */}
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
              <path
                d="M6 3.5h12a1 1 0 011 1v15.7a.4.4 0 01-.62.33l-2.13-1.42a1 1 0 00-1.1 0l-1.54 1.02a1 1 0 01-1.1 0l-1.54-1.02a1 1 0 00-1.1 0l-1.54 1.02a1 1 0 01-1.1 0L4.62 20.53A.4.4 0 014 20.2V4.5a1 1 0 011-1z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <path d="M8.5 8.5h7M8.5 12h7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold leading-none text-ink">ניהול חשבוניות</h1>
            <p className="mt-1 text-xs text-slate-500">ריכוז החשבוניות שלך במקום אחד</p>
          </div>
        </div>
      </div>
    </header>
  );
}
