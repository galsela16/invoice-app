// מטמון סכומים שכבר חולצו, לפי מזהה חשבונית — כדי שרענון לא יוריד ויפענח הכול שוב.
export interface CachedAmount {
  amount: number;
  currency?: string;
  originalAmount?: number;
  fxRate?: number;
}

const KEY = 'amountCacheV1';

function loadAll(): Record<string, CachedAmount> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, CachedAmount>;
  } catch {
    return {};
  }
}

const cache: Record<string, CachedAmount> = loadAll();

export function getAmount(id: string): CachedAmount | undefined {
  return cache[id];
}

export function setAmount(id: string, v: CachedAmount): void {
  cache[id] = v;
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* ignore */
  }
}
