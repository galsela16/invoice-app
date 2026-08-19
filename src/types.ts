// ── Domain types ──────────────────────────────────────────────
// כאן מוגדר המודל של חשבונית. השכבה הזו יציבה — גם כשנעבור
// ל-Supabase, ל-Gmail API או להעלאת PDF, המבנה הזה יישאר.

export type InvoiceStatus = 'paid' | 'unpaid' | 'review';

export type InvoiceSource = 'gmail' | 'whatsapp' | 'manual';

export interface InvoiceAttachment {
  messageId: string;
  attachmentId: string;
  filename: string;
  mimeType: string;
}

export interface Invoice {
  id: string;
  vendor: string; // שם הספק / העסק
  amount: number; // סכום בשקלים
  issuedAt: string; // תאריך הנפקה בפורמט ISO (YYYY-MM-DD)
  status: InvoiceStatus;
  source: InvoiceSource;
  category?: string; // קטגוריה (רשות)
  note?: string; // הערה חופשית (רשות)
  fileUrl?: string; // קישור לקובץ המקורי — יתמלא בהמשך בהעלאה/OCR
  attachments?: InvoiceAttachment[]; // קבצים מצורפים מ-Gmail (PDF/תמונות)
}

// ── Summary ───────────────────────────────────────────────────
export interface MonthlySummary {
  total: number;
  paid: number;
  unpaid: number;
  review: number;
  count: number;
}
