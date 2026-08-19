import type { InvoiceStatus, InvoiceSource } from '../types';

// תוויות עברית + צבעים לסטטוסים ולמקורות.
// ריכוז במקום אחד כדי שכל הרכיבים ידברו באותה שפה.

export const STATUS_LABEL: Record<InvoiceStatus, string> = {
  paid: 'שולם',
  unpaid: 'לא שולם',
  review: 'לבדיקה',
};

export const STATUS_STYLE: Record<InvoiceStatus, string> = {
  paid: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  unpaid: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  review: 'bg-amber-50 text-amber-700 ring-amber-600/20',
};

// צבע מלא לפסי הפירוט/הנקודות
export const STATUS_DOT: Record<InvoiceStatus, string> = {
  paid: 'bg-emerald-500',
  unpaid: 'bg-rose-500',
  review: 'bg-amber-500',
};

export const SOURCE_LABEL: Record<InvoiceSource, string> = {
  gmail: 'Gmail',
  whatsapp: 'WhatsApp',
  manual: 'העלאה ידנית',
};

export const SOURCE_STYLE: Record<InvoiceSource, string> = {
  gmail: 'bg-red-50 text-red-700 ring-red-600/20',
  whatsapp: 'bg-green-50 text-green-700 ring-green-600/20',
  manual: 'bg-slate-100 text-slate-600 ring-slate-500/20',
};

export const STATUS_ORDER: InvoiceStatus[] = ['paid', 'unpaid', 'review'];
export const SOURCE_ORDER: InvoiceSource[] = ['gmail', 'whatsapp', 'manual'];
