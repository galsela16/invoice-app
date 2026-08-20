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
