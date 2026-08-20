import { useEffect, useState } from 'react';
import type { Invoice } from '../types';
import { downloadAttachment, fetchMessageHtml } from '../lib/gmail';
import { formatCurrency, formatCurrencyCode, formatDate } from '../utils/format';

interface Props {
  invoice: Invoice;
  onClose: () => void;
}

// מוֹדַל צף: מציג קובץ מצורף (PDF/תמונה) אם יש; אחרת מציג את תוכן המייל בתוך האפליקציה.
export function InvoiceModal({ invoice, onClose }: Props) {
  const attachment = invoice.attachments?.[0];
  const gmailId = invoice.id.startsWith('gmail-') ? invoice.id.slice(6) : null;
  const gmailUrl = gmailId ? `https://mail.google.com/mail/u/0/#all/${gmailId}` : null;

  const [url, setUrl] = useState<string | null>(null); // blob של קובץ מצורף
  const [bodyHtml, setBodyHtml] = useState<string | null>(null); // תוכן מייל
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    let objectUrl: string | null = null;
    setLoading(true);
    setError(null);
    setUrl(null);
    setBodyHtml(null);

    (async () => {
      try {
        if (attachment) {
          const bytes = await downloadAttachment(attachment.messageId, attachment.attachmentId);
          if (!alive) return;
          const buf = new ArrayBuffer(bytes.byteLength);
          new Uint8Array(buf).set(bytes);
          objectUrl = URL.createObjectURL(
            new Blob([buf], { type: attachment.mimeType || 'application/octet-stream' })
          );
          setUrl(objectUrl);
        } else if (gmailId) {
          const html = await fetchMessageHtml(gmailId);
          if (!alive) return;
          setBodyHtml(html);
        } else {
          setError('אין תוכן להצגה.');
        }
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : 'שגיאה בטעינה.');
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachment, gmailId]);

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
              {invoice.currency && invoice.currency !== 'ILS' && invoice.originalAmount != null
                ? ` (${formatCurrencyCode(invoice.originalAmount, invoice.currency)})`
                : ''}
              {attachment ? ` · ${attachment.filename}` : ' · מתוך גוף המייל'}
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
            {gmailUrl && (
              <a
                href={gmailUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                פתח ב-Gmail
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

        {/* גוף */}
        <div className="relative flex-1 bg-slate-50">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-500">
              טוען…
            </div>
          )}

          {error && !loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center text-sm text-rose-600">
              <span>{error}</span>
              {gmailUrl && (
                <a
                  href={gmailUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg bg-brand px-4 py-2 font-semibold text-white transition hover:bg-teal-800"
                >
                  פתח ב-Gmail
                </a>
              )}
            </div>
          )}

          {/* קובץ מצורף */}
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

          {/* תוכן המייל (כשאין קובץ) — iframe מבודד ובטוח */}
          {bodyHtml && !loading && !error && (
            <iframe
              sandbox=""
              srcDoc={bodyHtml}
              title="תוכן המייל"
              className="h-full w-full bg-white"
            />
          )}
        </div>
      </div>
    </div>
  );
}
