import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export interface AmountResult {
  amount: number | null;
  confidence: 'high' | 'low' | 'none';
  raw: string; // הטקסט שנתפס, לניפוי באגים
}

/** מחלץ את כל הטקסט מ־PDF שמגיע כ־ArrayBuffer/Uint8Array */
export async function extractPdfText(data: ArrayBuffer | Uint8Array): Promise<string> {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
  let full = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    full += content.items.map((it: any) => ('str' in it ? it.str : '')).join(' ') + '\n';
  }
  return full;
}

// ── פענוח מספר לפי פורמט (תומך גם באירופאי: 16,00 / 1.234,56) ──
// הכלל: אם יש גם נקודה וגם פסיק — האחרון מביניהם הוא העשרוני.
// אם יש רק אחד מהם עם 1–2 ספרות אחריו — הוא העשרוני; אחרת מפריד אלפים.
function parseMoney(token: string): number | null {
  const t = token.trim();
  const lc = t.lastIndexOf(',');
  const ld = t.lastIndexOf('.');
  let dec: ',' | '.' | null = null;
  if (lc > -1 && ld > -1) dec = lc > ld ? ',' : '.';
  else if (lc > -1) dec = t.length - lc - 1 <= 2 ? ',' : null;
  else if (ld > -1) dec = t.length - ld - 1 <= 2 ? '.' : null;

  let intPart: string;
  let frac = '';
  if (dec) {
    const i = t.lastIndexOf(dec);
    intPart = t.slice(0, i).replace(/[.,\s\u00a0]/g, '');
    frac = t.slice(i + 1).replace(/[^0-9]/g, '');
  } else {
    intPart = t.replace(/[.,\s\u00a0]/g, '');
  }
  const n = parseFloat(intPart + (frac ? '.' + frac : ''));
  return isNaN(n) ? null : n;
}

const AMT = String.raw`\d[\d.,\u00a0]*\d|\d`; // מספר: ספרות עם מפרידים אפשריים
const CUR = String.raw`₪|€|\$|EUR|ILS|NIS|USD|ש"?ח|שקל`; // סימני מטבע

// מילות מפתח לסכום הכולל, מהחזק לחלש. \b מונע התאמה בתוך מילה (Subtotal).
const KEYWORDS = [
  String.raw`סה["\u05f4]?כ\s*לתשלום`,
  String.raw`סך\s*הכל\s*לתשלום`,
  String.raw`סכום\s*לתשלום`,
  String.raw`לתשלום`,
  String.raw`סה["\u05f4]?כ\s*כולל\s*מע["\u05f4]?מ`,
  String.raw`סה["\u05f4]?כ`,
  String.raw`\bamount\s*due`,
  String.raw`\bbalance\s*due`,
  String.raw`\btotal\s*(?:in\s*\w+\s*)?(?:due|amount|payable)?`,
];

export function parseAmount(text: string): AmountResult {
  const t = text.replace(/[\u200e\u200f\u202a-\u202e]/g, '').replace(/\s+/g, ' ');

  // 1) מילת מפתח + סכום שצמוד למטבע (הכי אמין)
  for (const k of KEYWORDS) {
    const re = new RegExp(
      k + `[^0-9]{0,15}(?:(?:${CUR})\\s*(${AMT})|(${AMT})\\s*(?:${CUR}))`,
      'i'
    );
    const m = t.match(re);
    if (m) {
      const v = parseMoney(m[1] ?? m[2]);
      if (v !== null && v > 0) return { amount: v, confidence: 'high', raw: m[0] };
    }
  }
  // 2) מילת מפתח + מספר סמוך (בלי דרישת מטבע)
  for (const k of KEYWORDS) {
    const re = new RegExp(k + `[^0-9]{0,15}(${AMT})`, 'i');
    const m = t.match(re);
    if (m) {
      const v = parseMoney(m[1]);
      if (v !== null && v > 0) return { amount: v, confidence: 'high', raw: m[0] };
    }
  }
  // 3) כל הסכומים שצמודים למטבע — ניקח את הגדול (בד"כ זה הסה"כ)
  const cands: number[] = [];
  for (const re of [
    new RegExp(`(?:${CUR})\\s*(${AMT})`, 'gi'),
    new RegExp(`(${AMT})\\s*(?:${CUR})`, 'gi'),
  ]) {
    for (const m of t.matchAll(re)) {
      const v = parseMoney(m[1]);
      if (v !== null && v > 0) cands.push(v);
    }
  }
  if (cands.length) {
    return { amount: Math.max(...cands), confidence: 'low', raw: 'currency-adjacent' };
  }
  // 4) אין אות אמין — מחזירים null. עדיף להשאיר "לבדיקה" מאשר לנחש מספר שגוי.
  return { amount: null, confidence: 'none', raw: '' };
}

/** נוחות: בייטים של PDF → סכום */
export async function amountFromPdf(data: ArrayBuffer | Uint8Array): Promise<AmountResult> {
  return parseAmount(await extractPdfText(data));
}
