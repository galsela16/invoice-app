import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { parseAmount, type AmountResult } from './amountParser';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export { parseAmount };
export type { AmountResult };

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

/** נוחות: בייטים של PDF → תוצאה */
export async function amountFromPdf(data: ArrayBuffer | Uint8Array): Promise<AmountResult> {
  return parseAmount(await extractPdfText(data));
}
