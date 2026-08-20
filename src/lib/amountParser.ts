// פרסר טקסט טהור לחילוץ סכום ומטבע — בלי תלות ב-pdf.js.
// עיקרון: שמרני. לוקח סכום רק כשהוא עוגן למילת-מפתח או יחיד וברור,
// פוסל מספרים שנראים כמזהים או חורגים מסף הגיוני, ולא מנחש בעמימות.

export interface AmountResult {
  amount: number | null;
  currency: string | null;
  confidence: 'high' | 'low' | 'none';
  raw: string;
}

// סף עליון הגיוני לסכום חשבונית (במטבע המקורי). מעליו — כנראה מספר כיסוי/מזהה.
// ניתן לשנות אם באמת יש חשבוניות גדולות מזה.
const MAX_PLAUSIBLE = 1_000_000;

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

// האם v (מהטוקן tok) הוא סכום סביר, ולא מזהה/מספר חשבונית/סכום כיסוי?
function plausible(v: number | null, tok: string): v is number {
  if (v === null || v <= 0 || v > MAX_PLAUSIBLE) return false;
  const digits = tok.replace(/[^\d]/g, '');
  const hasDecimal = /[.,]\d{1,2}$/.test(tok.trim());
  if (!hasDecimal && digits.length >= 7) return false; // נראה כמו מזהה
  return true;
}

function markerToIso(marker: string | undefined): string | null {
  if (!marker) return null;
  const s = marker.replace(/["\u05f4\s]/g, '').toUpperCase();
  if (['₪', 'ILS', 'NIS', 'שח', 'שקל'].includes(s)) return 'ILS';
  if (['€', 'EUR'].includes(s)) return 'EUR';
  if (['$', 'USD'].includes(s)) return 'USD';
  if (['£', 'GBP'].includes(s)) return 'GBP';
  return null;
}

const AMT = String.raw`\d[\d.,\u00a0]*\d|\d`;
const CUR = String.raw`₪|€|\$|£|EUR|ILS|NIS|USD|GBP|ש"?ח|שקל`;

// מילות מפתח ל"סכום כולל / לתשלום" בלבד — עוגן חזק לזיהוי הסכום הנכון.
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
      k + `[^0-9]{0,12}(?:(${CUR})\\s*(${AMT})|(${AMT})\\s*(${CUR}))`,
      'i'
    );
    const m = t.match(re);
    if (m) {
      const tok = m[2] ?? m[3];
      const v = parseMoney(tok);
      if (plausible(v, tok)) return { amount: v, currency: markerToIso(m[1] ?? m[4]), confidence: 'high', raw: m[0] };
    }
  }
  // 2) מילת מפתח + מספר סמוך (בלי מטבע)
  for (const k of KEYWORDS) {
    const re = new RegExp(k + `[^0-9]{0,12}(${AMT})`, 'i');
    const m = t.match(re);
    if (m) {
      const v = parseMoney(m[1]);
      if (plausible(v, m[1])) return { amount: v, currency: null, confidence: 'high', raw: m[0] };
    }
  }
  // 3) בלי מילת מפתח — לוקחים רק אם יש בדיוק סכום *אחד* ברור שצמוד למטבע
  const seen = new Map<number, string | null>();
  for (const m of t.matchAll(new RegExp(`(${CUR})\\s*(${AMT})`, 'gi'))) {
    const v = parseMoney(m[2]);
    if (plausible(v, m[2])) seen.set(v, markerToIso(m[1]));
  }
  for (const m of t.matchAll(new RegExp(`(${AMT})\\s*(${CUR})`, 'gi'))) {
    const v = parseMoney(m[1]);
    if (plausible(v, m[1])) seen.set(v, markerToIso(m[2]));
  }
  if (seen.size === 1) {
    const [v, cur] = [...seen][0];
    return { amount: v, currency: cur, confidence: 'low', raw: 'single currency-adjacent' };
  }
  // אחרת — לא מנחשים. עדיף "לבדיקה" מאשר מספר שגוי.
  return { amount: null, currency: null, confidence: 'none', raw: '' };
}
