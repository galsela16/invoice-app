import JSZip from 'jszip';
import type { Invoice } from '../types';
import { downloadAttachment } from './gmail';
import { monthKey, formatDate } from '../utils/format';

// בונה ZIP עם תיקייה לכל חודש, ובכל תיקייה קובצי ה-PDF/תמונות המקוריים.
// שם קובץ: <תאריך>_<ספק>_<שם הקובץ המקורי>.

export interface ExportProgress {
  done: number;
  total: number;
}

function sanitize(name: string): string {
  return name
    .replace(/[\/\\:*?"<>|]/g, '-') // תווים אסורים בשמות קבצים
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

/** מספר הקבצים המצורפים בסך הכל ברשימה. */
export function countAttachments(invoices: Invoice[]): number {
  return invoices.reduce((sum, inv) => sum + (inv.attachments?.length ?? 0), 0);
}

/**
 * מוריד את כל הקבצים המצורפים ובונה ZIP מחולק לפי חודשים.
 * onProgress מדווח על ההתקדמות (כמה קבצים הורדו מתוך הסה"כ).
 */
export async function exportInvoicesZip(
  invoices: Invoice[],
  onProgress?: (p: ExportProgress) => void
): Promise<void> {
  const withFiles = invoices.filter((inv) => (inv.attachments?.length ?? 0) > 0);
  const total = countAttachments(withFiles);
  if (total === 0) {
    throw new Error('אין קבצים מצורפים להורדה בחשבוניות שנמשכו.');
  }

  const zip = new JSZip();
  let done = 0;

  for (const inv of withFiles) {
    const folder = monthKey(inv.issuedAt); // "2025-07"
    const dateLabel = formatDate(inv.issuedAt).replace(/\//g, '-'); // 08-07-2025
    const vendor = sanitize(inv.vendor);

    for (const att of inv.attachments!) {
      // הורדה סדרתית (עדינה מול מגבלת הקצב של Gmail)
      const bytes = await downloadAttachment(att.messageId, att.attachmentId);
      const base = `${dateLabel}_${vendor}_${sanitize(att.filename)}`;
      zip.folder(folder)!.file(base, bytes);
      done += 1;
      onProgress?.({ done, total });
    }
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  triggerDownload(blob, `חשבוניות_${new Date().toISOString().slice(0, 10)}.zip`);
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
