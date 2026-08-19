import type { Invoice } from '../types';
import { MOCK_INVOICES } from './mockInvoices';

// ── שכבת נתונים ────────────────────────────────────────────────
// כל המסך מדבר מול הממשק הזה בלבד — לא מול המקור בפועל.
// היום המימוש מחזיר נתוני דמה. מחר נחליף אותו במימוש Supabase
// (SupabaseInvoicesRepo) בלי לגעת ברכיבי ה-UI.

export interface InvoicesRepo {
  list(): Promise<Invoice[]>;
}

class MockInvoicesRepo implements InvoicesRepo {
  async list(): Promise<Invoice[]> {
    // דמה של קריאת רשת קצרה, כדי שנראה מצב טעינה אמיתי
    await new Promise((r) => setTimeout(r, 250));
    return MOCK_INVOICES;
  }
}

// נקודת ההחלפה היחידה: כשנחבר Supabase נחליף רק את השורה הזו.
export const invoicesRepo: InvoicesRepo = new MockInvoicesRepo();
