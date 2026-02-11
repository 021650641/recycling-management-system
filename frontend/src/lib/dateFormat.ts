import { format as fnsFormat } from 'date-fns';
import type { DateFormat, TimeFormat } from '@/store/settingsStore';

const DATE_FNS_MAP: Record<DateFormat, string> = {
  'DD/MM/YYYY': 'dd/MM/yyyy',
  'MM/DD/YYYY': 'MM/dd/yyyy',
  'YYYY-MM-DD': 'yyyy-MM-dd',
};

const TIME_FNS_MAP: Record<TimeFormat, string> = {
  '12h': 'h:mm a',
  '24h': 'HH:mm',
};

/** Format a date string (date only, no time) */
export function formatDate(dateStr: string | Date | null | undefined, dateFormat: DateFormat): string {
  if (!dateStr) return '-';
  try {
    const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    if (isNaN(d.getTime())) return '-';
    return fnsFormat(d, DATE_FNS_MAP[dateFormat]);
  } catch {
    return '-';
  }
}

/** Format a date string with time */
export function formatDateTime(dateStr: string | Date | null | undefined, dateFormat: DateFormat, timeFormat: TimeFormat): string {
  if (!dateStr) return '-';
  try {
    const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    if (isNaN(d.getTime())) return '-';
    return `${fnsFormat(d, DATE_FNS_MAP[dateFormat])} ${fnsFormat(d, TIME_FNS_MAP[timeFormat])}`;
  } catch {
    return '-';
  }
}
