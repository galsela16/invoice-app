import type { Invoice } from '../types';

// ── חיבור Gmail (קריאה בלבד) ───────────────────────────────────
// שימוש ב-Google Identity Services בדפדפן: מקבלים access token,
// קוראים ישירות מול Gmail REST API. אין סוד (client secret) בצד לקוח —
// רק ה-Client ID, שאינו סודי.

const SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// מה נחשב "חשבונית". אפשר לכוונן בהמשך — זו נקודת שליטה אחת.
export const INVOICE_QUERY =
  '(חשבונית OR "חשבונית מס" OR קבלה OR invoice OR receipt) newer_than:6m';

const MAX_RESULTS = 25;

let accessToken: string | null = null;
let tokenClient: GoogleTokenClient | null = null;

/** האם הוגדר Client ID (משתנה סביבה)? */
export function isConfigured(): boolean {
  return Boolean(CLIENT_ID);
}

/** האם יש כרגע הרשאה פעילה? */
export function isConnected(): boolean {
  return Boolean(accessToken);
}

let cbOnToken: () => void = () => {};
let cbOnError: (msg: string) => void = () => {};
let cbOnDismiss: () => void = () => {};

function ensureTokenClient(): GoogleTokenClient {
  if (!window.google) {
    throw new Error('ספריית Google עדיין נטענת. נסו שוב בעוד רגע.');
  }
  if (!tokenClient) {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: (resp) => {
        if (resp.error) {
          cbOnError('ההתחברות ל-Gmail נכשלה.');
          return;
        }
        accessToken = resp.access_token;
        cbOnToken();
      },
      // חלק מהדפדפנים חוסמים בדיקת סגירת חלון (COOP) ומדווחים בטעות
      // "popup_closed" גם כשההתחברות הצליחה. מתעלמים מזה — אם באמת
      // התקבלה הרשאה, ה-callback למעלה כבר טיפל בה.
      error_callback: (err: unknown) => {
        const type = (err as { type?: string })?.type;
        if (type === 'popup_failed_to_open') {
          cbOnError('הדפדפן חסם את חלון ההתחברות. אפשרו חלונות קופצים ונסו שוב.');
        } else {
          // popup_closed / unknown — לרוב אזעקת שווא. פשוט מפסיקים טעינה.
          cbOnDismiss();
        }
      },
    });
  }
  return tokenClient;
}

/** פותח את חלון ההרשאה של Google. */
export function connect(
  onToken: () => void,
  onError: (msg: string) => void,
  onDismiss: () => void
): void {
  cbOnToken = onToken;
  cbOnError = onError;
  cbOnDismiss = onDismiss;
  const client = ensureTokenClient();
  client.requestAccessToken({ prompt: accessToken ? '' : 'consent' });
}

/** מנתק ומבטל את ההרשאה. */
export function disconnect(): void {
  if (accessToken && window.google) {
    window.google.accounts.oauth2.revoke(accessToken);
  }
  accessToken = null;
}

async function gmailFetch<T>(path: string): Promise<T> {
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (res.status === 401) {
    accessToken = null;
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
