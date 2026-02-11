import { format as fnsFormat } from 'date-fns';

const DATE_FNS_MAP: Record<string, string> = {
  'DD/MM/YYYY': 'dd/MM/yyyy',
  'MM/DD/YYYY': 'MM/dd/yyyy',
  'YYYY-MM-DD': 'yyyy-MM-dd',
};

const TIME_FNS_MAP: Record<string, string> = {
  '12h': 'h:mm a',
  '24h': 'HH:mm',
};

/** Format a date value (date only) */
export function formatDate(val: any, dateFormat: string = 'DD/MM/YYYY'): string {
  if (!val) return '-';
  try {
    const d = val instanceof Date ? val : new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return fnsFormat(d, DATE_FNS_MAP[dateFormat] || 'dd/MM/yyyy');
  } catch {
    return String(val);
  }
}

/** Format a date value with time */
export function formatDateTime(val: any, dateFormat: string = 'DD/MM/YYYY', timeFormat: string = '24h'): string {
  if (!val) return '-';
  try {
    const d = val instanceof Date ? val : new Date(val);
    if (isNaN(d.getTime())) return String(val);
    const datePart = fnsFormat(d, DATE_FNS_MAP[dateFormat] || 'dd/MM/yyyy');
    const timePart = fnsFormat(d, TIME_FNS_MAP[timeFormat] || 'HH:mm');
    return `${datePart} ${timePart}`;
  } catch {
    return String(val);
  }
}

/** Format date columns in report rows in-place */
export function formatReportDates(
  rows: Record<string, any>[],
  dateColumns: string[],
  dateFormat: string
): void {
  for (const row of rows) {
    for (const col of dateColumns) {
      if (row[col]) {
        row[col] = formatDate(row[col], dateFormat);
      }
    }
  }
}
