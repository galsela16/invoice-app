import type { InvoiceSource } from '../types';
import { SOURCE_LABEL, SOURCE_STYLE } from '../lib/labels';

export function SourceBadge({ source }: { source: InvoiceSource }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${SOURCE_STYLE[source]}`}
    >
      {SOURCE_LABEL[source]}
    </span>
  );
}
