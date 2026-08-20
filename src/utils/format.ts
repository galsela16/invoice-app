// עזרי פורמט — מטבע ₪ ותאריך DD/MM/YYYY, בעברית.

const currencyFormatter = new Intl.NumberFormat('he-IL', {
  style: 'currency',
  currency: 'ILS',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** ₪ 12,450 */
export function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount);
}

/** פורמט סכום במטבע לפי קוד ISO: formatCurrencyCode(16, 'EUR') → "€16.00" */
export function formatCurrencyCode(amount: number, code: string): string {
  try {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount} ${code}`;
  }
}

/** 08/07/2025 */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/** מפתח חודש: "2025-07" */
export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

const MONTH_NAMES_HE = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];

/** "07" → "יולי" */
export function monthNameByNum(mm: string): string {
  const idx = Number(mm) - 1;
  return MONTH_NAMES_HE[idx] ?? mm;
}

/** "2025-07" → "יולי 2025" */
export function monthLabel(key: string): string {
  const [year, month] = key.split('-');
  const idx = Number(month) - 1;
  return `${MONTH_NAMES_HE[idx] ?? month} ${year}`;
}
