import type { Invoice } from '../types';

// ── חיבור Gmail (קריאה בלבד) — שיטת הפניה מלאה (redirect) ─────────
// במקום חלון קופץ (שנחסם ע"י COOP בחלק מהדפדפנים), האתר עצמו עובר
// ל-Google, המשתמש מאשר, וחוזר לאתר עם access_token ב-hash של הכתובת.
// שיטה זו חסינה ל-COOP כי אין שני חלונות.

const SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// מה נחשב "חשבונית". אפשר לכוונן בהמשך.
export const INVOICE_QUERY =
  '(חשבונית OR "חשבונית מס" OR קבלה OR invoice OR receipt) newer_than:6m';

const MAX_RESULTS = 25;

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
interface GmailMessage {
  id: string;
  snippet?: string;
  payload?: { headers?: GmailHeader[] };
}

/** מושך מיילים שנראים כמו חשבוניות וממיר אותם ל"טיוטות" חשבונית. */
export async function fetchInvoiceEmails(): Promise<Invoice[]> {
  const list = await gmailFetch<{ messages?: { id: string }[] }>(
    `messages?q=${encodeURIComponent(INVOICE_QUERY)}&maxResults=${MAX_RESULTS}`
  );
  const ids = (list.messages ?? []).map((m) => m.id);

  const messages = await Promise.all(
    ids.map((id) =>
      gmailFetch<GmailMessage>(
        `messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`
      )
    )
  );

  return messages.map(toInvoice);
}

// ── פענוח גס (יוחלף/ישודרג בצעד ה-PDF/OCR) ─────────────────────
function headerValue(headers: GmailHeader[] | undefined, name: string): string {
  return headers?.find((h) => h.name === name)?.value ?? '';
}

function parseVendor(from: string): string {
  const named = from.match(/^\s*"?([^"<]+?)"?\s*</);
  if (named && named[1].trim()) return named[1].trim();
  const email = from.match(/<([^>]+)>/)?.[1] ?? from;
  return email.split('@')[1]?.split('.')[0] ?? from.trim();
}

function parseAmount(text: string): number {
  const re =
    /(?:₪|ils|nis)\s*([\d,]+(?:\.\d{1,2})?)|([\d,]+(?:\.\d{1,2})?)\s*(?:₪|ils|nis|ש"ח|שקל)/gi;
  let best = 0;
  for (const m of text.matchAll(re)) {
    const raw = (m[1] ?? m[2] ?? '').replace(/,/g, '');
    const val = parseFloat(raw);
    if (!isNaN(val) && val > best) best = val;
  }
  return best;
}

function parseDate(dateHeader: string): string {
  const d = dateHeader ? new Date(dateHeader) : new Date();
  return (isNaN(d.getTime()) ? new Date() : d).toISOString().slice(0, 10);
}

function toInvoice(msg: GmailMessage): Invoice {
  const headers = msg.payload?.headers;
  const from = headerValue(headers, 'From');
  const subject = headerValue(headers, 'Subject');
  const snippet = msg.snippet ?? '';
  return {
    id: `gmail-${msg.id}`,
    vendor: parseVendor(from) || subject || 'ללא שם',
    amount: parseAmount(`${subject} ${snippet}`),
    issuedAt: parseDate(headerValue(headers, 'Date')),
    status: 'review',
    source: 'gmail',
    category: 'מ-Gmail',
    note: subject,
  };
}
