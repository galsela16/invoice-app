import type { Invoice, InvoiceAttachment } from '../types';
import { parseAmount, type AmountResult } from './amountParser';
import { getAmount, setAmount } from './amountCache';

// ── חיבור Gmail (קריאה בלבד) — שיטת הפניה מלאה (redirect) ─────────
// במקום חלון קופץ (שנחסם ע"י COOP בחלק מהדפדפנים), האתר עצמו עובר
// ל-Google, המשתמש מאשר, וחוזר לאתר עם access_token ב-hash של הכתובת.
// שיטה זו חסינה ל-COOP כי אין שני חלונות.

const SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// מה נחשב "חשבונית". אפשר לכוונן בהמשך.
export const INVOICE_QUERY =
  '(חשבונית OR "חשבונית מס" OR קבלה OR invoice OR receipt) after:2024/12/31';

const PAGE_SIZE = 100; // לכל עמוד ב-Gmail
const MAX_TOTAL = 400; // תקרת מיילים כוללת (ניתן להגדיל)
const FETCH_CONCURRENCY = 8; // משיכת פרטי מייל במקביל
const PARSE_CONCURRENCY = 6; // הורדת+פענוח PDF במקביל

const TOKEN_KEY = 'gmail_access_token';
const STATE_KEY = 'gmail_oauth_state';

let accessToken: string | null = sessionStorage.getItem(TOKEN_KEY);

/** האם הוגדר Client ID (משתנה סביבה)? */
export function isConfigured(): boolean {
  return Boolean(CLIENT_ID);
}

/** האם יש כרגע הרשאה פעילה? */
export function isConnected(): boolean {
  return Boolean(accessToken);
}

function redirectUri(): string {
  return window.location.origin;
}

/** מתחיל התחברות: מפנה את הדפדפן למסך ההרשאה של Google. */
export function beginConnect(): void {
  const state = Math.random().toString(36).slice(2);
  sessionStorage.setItem(STATE_KEY, state);
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: redirectUri(),
    response_type: 'token',
    scope: SCOPE,
    include_granted_scopes: 'true',
    state,
    prompt: 'consent',
  });
  window.location.href =
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

function cleanUrl(): void {
  history.replaceState(null, '', window.location.pathname + window.location.search);
}

/**
 * נקרא בטעינת האפליקציה. אם חזרנו מ-Google עם token ב-hash — שומר אותו.
 * מחזיר: 'connected' אם התקבלה הרשאה, 'error' אם הייתה שגיאה, אחרת null.
 */
export function consumeRedirect(): 'connected' | 'error' | null {
  const hash = window.location.hash || '';
  if (hash.includes('error=')) {
    cleanUrl();
    return 'error';
  }
  if (!hash.includes('access_token')) {
    return null;
  }
  const params = new URLSearchParams(hash.slice(1));
  const token = params.get('access_token');
  const returnedState = params.get('state');
  const savedState = sessionStorage.getItem(STATE_KEY);
  cleanUrl();
  if (!token || !returnedState || returnedState !== savedState) {
    return 'error';
  }
  accessToken = token;
  sessionStorage.setItem(TOKEN_KEY, token);
  return 'connected';
}

/** מנתק ומוחק את ההרשאה השמורה. */
export function disconnect(): void {
  const t = accessToken;
  accessToken = null;
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(STATE_KEY);
  if (t) {
    fetch(`https://oauth2.googleapis.com/revoke?token=${t}`, { method: 'POST' }).catch(
      () => {}
    );
  }
}

async function gmailFetch<T>(path: string): Promise<T> {
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (res.status === 401) {
    accessToken = null;
    sessionStorage.removeItem(TOKEN_KEY);
    throw new Error('ההרשאה פגה. התחברו שוב ל-Gmail.');
  }
  if (!res.ok) {
    throw new Error(`שגיאת Gmail (${res.status}).`);
  }
  return res.json() as Promise<T>;
}

interface GmailHeader {
  name: string;
  value: string;
}
interface GmailPart {
  filename?: string;
  mimeType?: string;
  body?: { attachmentId?: string; size?: number; data?: string };
  parts?: GmailPart[];
}
interface GmailMessage {
  id: string;
  snippet?: string;
  payload?: { headers?: GmailHeader[]; parts?: GmailPart[]; filename?: string; mimeType?: string; body?: { attachmentId?: string } };
}

/** מושך מיילים שנראים כמו חשבוניות וממיר אותם ל"טיוטות" חשבונית. */
/** מריץ fn על הפריטים עם הגבלת מקביליות. */
async function mapLimit<T>(items: T[], limit: number, fn: (t: T) => Promise<void>): Promise<void> {
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      await fn(items[idx]);
    }
  });
  await Promise.all(workers);
}

/** מושך את כל מזהי המיילים התואמים, עם עימוד עד תקרה. */
async function listMessageIds(query: string, cap: number): Promise<string[]> {
  const ids: string[] = [];
  let pageToken: string | undefined;
  do {
    const params = new URLSearchParams({ q: query, maxResults: String(PAGE_SIZE) });
    if (pageToken) params.set('pageToken', pageToken);
    const page = await gmailFetch<{ messages?: { id: string }[]; nextPageToken?: string }>(
      `messages?${params.toString()}`
    );
    for (const m of page.messages ?? []) ids.push(m.id);
    pageToken = page.nextPageToken;
  } while (pageToken && ids.length < cap);
  return ids.slice(0, cap);
}

export async function fetchInvoiceEmails(): Promise<Invoice[]> {
  const ids = await listMessageIds(INVOICE_QUERY, MAX_TOTAL);

  const messages: GmailMessage[] = [];
  await mapLimit(ids, FETCH_CONCURRENCY, async (id) => {
    const m = await gmailFetch<GmailMessage>(`messages/${id}?format=full`);
    messages.push(m);
  });

  const invoices = messages.map(toInvoice);
  const texts = new Map(
    messages.map((m) => {
      const h = m.payload?.headers;
      const subject = headerValue(h, 'Subject');
      const body = extractBodyText(m.payload as GmailPart | undefined);
      return [`gmail-${m.id}`, `${subject} ${m.snippet ?? ''} ${body}`];
    })
  );
  await enrichInvoices(invoices, texts);
  // מסננים פריטים שאינם חשבוניות: בלי קובץ מצורף וגם בלי סכום שזוהה
  return invoices.filter(isLikelyInvoice);
}

/** האם הפריט נראה כמו חשבונית אמיתית (יש קובץ מצורף או סכום שזוהה). */
function isLikelyInvoice(inv: Invoice): boolean {
  return (inv.attachments?.length ?? 0) > 0 || inv.amount > 0;
}

/** מחלץ טקסט מגוף המייל (text/plain מועדף, אחרת HTML מנוקה). */
function extractBodyText(part: GmailPart | undefined): string {
  const acc = { plain: '', html: '' };
  collectBody(part, acc);
  const raw = acc.plain.trim() ? acc.plain : stripHtml(acc.html);
  return raw.replace(/\s+/g, ' ').trim();
}
function collectBody(part: GmailPart | undefined, acc: { plain: string; html: string }): void {
  if (!part) return;
  const mime = part.mimeType ?? '';
  const data = part.body?.data;
  if (data && !part.filename) {
    if (mime === 'text/plain') acc.plain += ' ' + decodeB64Url(data);
    else if (mime === 'text/html') acc.html += ' ' + decodeB64Url(data);
  }
  if (part.parts) for (const p of part.parts) collectBody(p, acc);
}
function decodeB64Url(data: string): string {
  try {
    return new TextDecoder('utf-8').decode(base64UrlToBytes(data));
  } catch {
    return '';
  }
}
function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&[a-z]+;/gi, ' ');
}

/** מחלץ סכום אמיתי מקובץ ה-PDF המצורף (אם יש), ומעדכן את inv.amount. */
async function enrichInvoices(
  invoices: Invoice[],
  texts: Map<string, string>
): Promise<void> {
  await mapLimit(invoices, PARSE_CONCURRENCY, async (inv) => {
    // 0) מטמון — אם כבר חילצנו את החשבונית הזו בעבר, לא מורידים שוב
    const cached = getAmount(inv.id);
    if (cached) {
      inv.amount = cached.amount;
      if (cached.currency) inv.currency = cached.currency;
      if (cached.originalAmount != null) inv.originalAmount = cached.originalAmount;
      if (cached.fxRate != null) inv.fxRate = cached.fxRate;
      return;
    }

    let res: AmountResult | null = null;

    // 1) קודם מנסים מתוך קובץ ה-PDF המצורף (אם יש)
    const pdf = inv.attachments?.find(
      (a) => a.mimeType === 'application/pdf' || /\.pdf$/i.test(a.filename)
    );
    if (pdf) {
      try {
        const { amountFromPdf } = await import('./pdfAmount');
        const bytes = await downloadAttachment(pdf.messageId, pdf.attachmentId);
        res = await amountFromPdf(bytes);
      } catch {
        res = null;
      }
    }

    // 2) נפילה לגוף המייל (נושא + snippet + טקסט הגוף)
    if (!res || res.amount === null || res.amount <= 0) {
      const txt = texts.get(inv.id) ?? '';
      if (txt) res = parseAmount(txt);
    }

    if (!res || res.amount === null || res.amount <= 0) return; // נשאר 0 (לבדיקה)

    // 3) המרה לשקלים אם מטבע זר
    const cur = res.currency ?? 'ILS';
    if (cur === 'ILS') {
      inv.amount = res.amount;
    } else {
      inv.originalAmount = res.amount;
      inv.currency = cur;
      try {
        const { convertToIls } = await import('./fx');
        const { ils, rate } = await convertToIls(res.amount, cur, inv.issuedAt);
        inv.amount = ils;
        inv.fxRate = rate;
      } catch {
        inv.amount = res.amount;
      }
    }

    // 4) שמירה במטמון להרצה הבאה
    setAmount(inv.id, {
      amount: inv.amount,
      currency: inv.currency,
      originalAmount: inv.originalAmount,
      fxRate: inv.fxRate,
    });
  });
}
/** מוריד את התוכן הבינארי של קובץ מצורף מ-Gmail. */
export async function downloadAttachment(
  messageId: string,
  attachmentId: string
): Promise<Uint8Array> {
  const res = await gmailFetch<{ data?: string }>(
    `messages/${messageId}/attachments/${attachmentId}`
  );
  return base64UrlToBytes(res.data ?? '');
}

function base64UrlToBytes(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '==='.slice((b64.length + 3) % 4);
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// ── פענוח גס (יוחלף/ישודרג בצעד ה-PDF/OCR) ─────────────────────
function headerValue(headers: GmailHeader[] | undefined, name: string): string {
  return headers?.find((h) => h.name === name)?.value ?? '';
}

/** אוסף רקורסיבית קבצים מצורפים מסוג PDF/תמונה. */
function collectAttachments(messageId: string, part: GmailPart | undefined, out: InvoiceAttachment[]): void {
  if (!part) return;
  const mime = part.mimeType ?? '';
  const isFile = Boolean(part.filename) && Boolean(part.body?.attachmentId);
  const isPdfOrImage = mime === 'application/pdf' || mime.startsWith('image/') || /\.(pdf|png|jpe?g|webp|gif|heic)$/i.test(part.filename ?? '');
  if (isFile && isPdfOrImage) {
    out.push({
      messageId,
      attachmentId: part.body!.attachmentId!,
      filename: part.filename!,
      mimeType: mime || 'application/octet-stream',
    });
  }
  if (part.parts) for (const p of part.parts) collectAttachments(messageId, p, out);
}

function parseVendor(from: string): string {
  const named = from.match(/^\s*"?([^"<]+?)"?\s*</);
  if (named && named[1].trim()) return named[1].trim();
  const email = from.match(/<([^>]+)>/)?.[1] ?? from;
  return email.split('@')[1]?.split('.')[0] ?? from.trim();
}

function parseDate(dateHeader: string): string {
  const d = dateHeader ? new Date(dateHeader) : new Date();
  return (isNaN(d.getTime()) ? new Date() : d).toISOString().slice(0, 10);
}

function toInvoice(msg: GmailMessage): Invoice {
  const headers = msg.payload?.headers;
  const from = headerValue(headers, 'From');
  const subject = headerValue(headers, 'Subject');

  const attachments: InvoiceAttachment[] = [];
  // payload עצמו יכול להיות קובץ, וגם החלקים הפנימיים
  collectAttachments(msg.id, msg.payload as GmailPart, attachments);

  return {
    id: `gmail-${msg.id}`,
    vendor: parseVendor(from) || subject || 'ללא שם',
    amount: 0, // ימולא ע"י enrichInvoices (מ-PDF או מגוף המייל)
    issuedAt: parseDate(headerValue(headers, 'Date')),
    status: 'review',
    source: 'gmail',
    category: 'מ-Gmail',
    note: subject,
    attachments,
  };
}
