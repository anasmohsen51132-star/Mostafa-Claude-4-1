import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns';
import { ar } from 'date-fns/locale';

export function formatDate(date: string | Date | null | undefined, pattern = 'dd/MM/yyyy'): string {
  if (!date) return '—';
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(d)) return '—';
    return format(d, pattern, { locale: ar });
  } catch { return '—'; }
}

export function formatDateTime(date: string | Date | null | undefined): string {
  return formatDate(date, 'dd/MM/yyyy - HH:mm');
}

export function formatRelative(date: string | Date | null | undefined): string {
  if (!date) return '—';
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return formatDistanceToNow(d, { addSuffix: true, locale: ar });
  } catch { return '—'; }
}

export function formatCurrency(amount: number | string | null | undefined, currency = 'EGP'): string {
  if (amount === null || amount === undefined) return '—';
  const n = Number(amount);
  if (isNaN(n)) return '—';
  return new Intl.NumberFormat('ar-EG', {
    style: 'currency', currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return '0';
  return new Intl.NumberFormat('ar-EG').format(n);
}

export function formatDuration(seconds: number): string {
  if (!seconds) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} دقيقة`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h} ساعة ${m} دقيقة` : `${h} ساعة`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export const levelLabels: Record<string, string> = {
  BEGINNER: 'مبتدئ', INTERMEDIATE: 'متوسط', ADVANCED: 'متقدم', ALL_LEVELS: 'جميع المستويات',
};

export const roleLabels: Record<string, string> = {
  STUDENT: 'طالب', INSTRUCTOR: 'مدرب', ADMIN: 'مشرف', OWNER: 'مالك',
};

export const paymentProviderLabels: Record<string, string> = {
  FAWRY: 'فوري', VODAFONE_CASH: 'فودافون كاش', STRIPE: 'بطاقة ائتمانية',
  INSTAPAY: 'إنستاباي', COUPON: 'كوبون', ACCESS_CODE: 'كود وصول',
};

export const submissionStatusLabels: Record<string, string> = {
  SUBMITTED: 'مُسلَّم', GRADED: 'مُصحَّح', RETURNED: 'مُعاد', LATE: 'متأخر',
};

export function truncate(str: string, length = 80): string {
  if (!str) return '';
  return str.length <= length ? str : `${str.slice(0, length)}...`;
}

export function phoneDisplay(phone: string): string {
  if (!phone) return '';
  return phone.replace(/(\d{4})(\d{3})(\d{4})/, '$1 $2 $3');
}
