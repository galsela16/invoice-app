import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export interface AmountResult {
  amount: number | null;
  confidence: 'high' | 'low' | 'none';
  raw: string; // הטקסט שנתפס, לניפוי באגים
}

/** מחלץ את כל הטקסט מ־PDF שמגיע כ־ArrayBuffer */
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

// מספר בפורמט 1,234.56 / 1234.56 (עשרוני עם נקודה, כמו בישראל)
const NUM = String.raw`([0-9]{1,3}(?:[,\u00a0][0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)`;

// מילות מפתח לפי סדר עדיפות — מהספציפי לכללי
const KEYWORDS = [
  String.raw`סה["\u05f4]?כ\s*לתשלום`,
  String.raw`סך[\s\-]*הכל\s*לתשלום`,
  String.raw`סכום\s*לתשלום`,
  String.raw`total\s*(?:to\s*pay|due|amount)`,
  String.raw`amount\s*due`,
  String.raw`לתשלום`,
  String.raw`סה["\u05f4]?כ\s*כולל\s*מע["\u05f4]?מ`,
  String.raw`סה["\u05f4]?כ`,
  String.raw`total`,
];

const toNumber = (s: string) => parseFloat(s.replace(/[,\u00a0]/g, ''));

export function parseAmount(text: string): AmountResult {
  const t = text.replace(/[\u200e\u200f\u202a-\u202e]/g, '').replace(/\s+/g, ' ');
  for (const k of KEYWORDS) {
    const re = new RegExp(k + String.raw`[^0-9]{0,20}` + NUM, 'i');
    const m = t.match(re);
    if (m) return { amount: toNumber(m[1]), confidence: 'high', raw: m[0] };
  }
  // גיבוי: המספר הגדול ביותר במסמך (בד"כ הסכום הכולל)
  const all = [...t.matchAll(new RegExp(NUM, 'g'))]
    .map((m) => toNumber(m[1]))
    .filter((n) => !isNaN(n) && n > 0);
  if (all.length) return { amount: Math.max(...all), confidence: 'low', raw: '' };
  return { amount: null, confidence: 'none', raw: '' };
}

/** נוחות: בייטים של PDF → סכום */
export async function amountFromPdf(data: ArrayBuffer | Uint8Array): Promise<AmountResult> {
  return parseAmount(await extractPdfText(data));
}
