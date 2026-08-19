import { useEffect, useState } from 'react';
import type { Invoice } from '../types';
import { downloadAttachment } from '../lib/gmail';
import { formatCurrency, formatDate } from '../utils/format';

interface Props {
  invoice: Invoice;
  onClose: () => void;
}

// מוֹדַל צף שמציג את הקובץ המצורף הראשון (PDF ב-iframe, תמונה כ-img),
// עם כפתור הורדה. סגירה: כפתור / לחיצה על הרקע / מקש Esc.
export function InvoiceModal({ invoice, onClose }: Props) {
  const attachment = invoice.attachments?.[0];
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // הורדת הקובץ מ-Gmail ובניית blob URL להצגה מקומית
  useEffect(() => {
    if (!attachment) {
      setLoading(false);
      setError('אין קובץ מצורף להצגה.');
      return;
    }
    let objectUrl: string | null = null;
    let alive = true;
    setLoading(true);
    setError(null);
    downloadAttachment(attachment.messageId, attachment.attachmentId)
      .then((bytes) => {
        if (!alive) return;
        // עותק ל-ArrayBuffer מפורש — עוקף חיכוך טיפוסים של Blob עם Uint8Array
        const buf = new ArrayBuffer(bytes.byteLength);
        new Uint8Array(buf).set(bytes);
        const blob = new Blob([buf], {
          type: attachment.mimeType || 'application/octet-stream',
        });
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
        setLoading(false);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err instanceof Error ? err.message : 'שגיאה בטעינת הקובץ.');
        setLoading(false);
      });
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachment]);

  // סגירה ב-Esc
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const isImage =
    (attachment?.mimeType ?? '').startsWith('image/') ||
    /\.(png|jpe?g|webp|gif|heic)$/i.test(attachment?.filename ?? '');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="flex h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* כותרת */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3">
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink">{invoice.vendor}</p>
            <p className="truncate text-xs text-slate-500">
              {formatDate(invoice.issuedAt)} · {formatCurrency(invoice.amount)}
              {attachment ? ` · ${attachment.filename}` : ''}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {url && attachment && (
              <a
                href={url}
                download={attachment.filename}
                className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800"
              >
                הורדה
              </a>
            )}
            <button
              onClick={onClose}
              aria-label="סגירה"
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              סגירה
            </button>
          </div>
        </div>

        {/* גוף — הקובץ */}
        <div className="relative flex-1 bg-slate-50">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-500">
              טוען קובץ…
            </div>
          )}
          {error && !loading && (
            <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-rose-600">
              {error}
            </div>
          )}
          {url && !loading && !error &&
            (isImage ? (
              <div className="flex h-full w-full items-center justify-center overflow-auto p-4">
                <img
                  src={url}
                  alt={attachment?.filename}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            ) : (
              <iframe src={url} title={attachment?.filename} className="h-full w-full" />
            ))}
        </div>
      </div>
    </div>
  );
}
