// המרת מטבע לשקלים לפי שער ECB בתאריך החשבונית.
// מקור: Frankfurter (api.frankfurter.dev) — חינמי, בלי מפתח API, תומך CORS.
// ECB מפרסם בימי עסקים בלבד; לתאריך ללא שער, ה-API מחזיר את השער הקרוב הקודם.

export interface FxResult {
  ils: number; // הסכום בשקלים
  rate: number; // שער ההמרה שבו נעשה שימוש
}

const memCache = new Map<string, number>();

/** ממיר amount במטבע currency לשקלים לפי isoDate (YYYY-MM-DD). ILS/null → ללא המרה. */
export async function convertToIls(
  amount: number,
  currency: string | null,
  isoDate: string
): Promise<FxResult> {
  const cur = (currency ?? 'ILS').toUpperCase();
  if (cur === 'ILS') return { ils: amount, rate: 1 };

  const date = (isoDate || new Date().toISOString()).slice(0, 10);
  const key = `${cur}-${date}`;

  let rate = memCache.get(key);
  if (rate === undefined) {
    const cached = safeSessionGet(`fx_${key}`);
    if (cached !== null) rate = Number(cached);
  }
  if (rate === undefined || isNaN(rate)) {
    const url = `https://api.frankfurter.dev/v1/${date}?base=${encodeURIComponent(cur)}&symbols=ILS`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`שער חליפין לא זמין (${res.status}).`);
    const data = await res.json();
    const r = data?.rates?.ILS;
    if (typeof r !== 'number') throw new Error('שער ILS לא נמצא.');
    rate = r;
    memCache.set(key, rate);
    safeSessionSet(`fx_${key}`, String(rate));
  }
  return { ils: Math.round(amount * rate * 100) / 100, rate };
}

function safeSessionGet(k: string): string | null {
  try {
    return sessionStorage.getItem(k);
  } catch {
    return null;
  }
}
function safeSessionSet(k: string, v: string): void {
  try {
    sessionStorage.setItem(k, v);
  } catch {
    /* ignore */
  }
}
