// פרסר טקסט טהור לחילוץ סכום ומטבע — בלי תלות ב-pdf.js,
// כדי שאפשר להריץ אותו גם על גוף המייל וגם על טקסט PDF.

export interface AmountResult {
  amount: number | null;
  currency: string | null; // ISO של המטבע שזוהה (EUR/USD/ILS...), או null
  confidence: 'high' | 'low' | 'none';
  raw: string;
}

// פענוח מספר לפי פורמט (תומך גם באירופאי: 16,00 / 1.234,56)
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

  for (const k of KEYWORDS) {
    const re = new RegExp(
      k + `[^0-9]{0,15}(?:(${CUR})\\s*(${AMT})|(${AMT})\\s*(${CUR}))`,
      'i'
    );
    const m = t.match(re);
    if (m) {
      const v = parseMoney(m[2] ?? m[3]);
      const cur = markerToIso(m[1] ?? m[4]);
      if (v !== null && v > 0) return { amount: v, currency: cur, confidence: 'high', raw: m[0] };
    }
  }
  for (const k of KEYWORDS) {
    const re = new RegExp(k + `[^0-9]{0,15}(${AMT})`, 'i');
    const m = t.match(re);
    if (m) {
      const v = parseMoney(m[1]);
      if (v !== null && v > 0) return { amount: v, currency: null, confidence: 'high', raw: m[0] };
    }
  }
  const cands: { v: number; cur: string | null }[] = [];
  for (const m of t.matchAll(new RegExp(`(${CUR})\\s*(${AMT})`, 'gi'))) {
    const v = parseMoney(m[2]);
    if (v !== null && v > 0) cands.push({ v, cur: markerToIso(m[1]) });
  }
  for (const m of t.matchAll(new RegExp(`(${AMT})\\s*(${CUR})`, 'gi'))) {
    const v = parseMoney(m[1]);
    if (v !== null && v > 0) cands.push({ v, cur: markerToIso(m[2]) });
  }
  if (cands.length) {
    cands.sort((a, b) => b.v - a.v);
    return { amount: cands[0].v, currency: cands[0].cur, confidence: 'low', raw: 'currency-adjacent' };
  }
  return { amount: null, currency: null, confidence: 'none', raw: '' };
}
