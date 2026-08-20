// שמירת מזהי פריטים שהמשתמש הסתיר ("לא חשבונית") — נשמר בין הפעלות.
const KEY = 'dismissedInvoiceIds';

export function loadDismissed(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}

export function saveDismissed(ids: Set<string>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify([...ids]));
  } catch {
    /* ignore */
  }
}

// שמירת ספקים שהוסתרו לגמרי ("הסתר הכל מ-...") — נשמר בין הפעלות.
const VENDOR_KEY = 'dismissedVendorsV1';

export function loadDismissedVendors(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(VENDOR_KEY) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}

export function saveDismissedVendors(vendors: Set<string>): void {
  try {
    localStorage.setItem(VENDOR_KEY, JSON.stringify([...vendors]));
  } catch {
    /* ignore */
  }
}
