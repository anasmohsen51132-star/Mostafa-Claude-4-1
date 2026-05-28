import { Loader2, BookOpen, Search, AlertCircle } from 'lucide-react';
import { ReactNode } from 'react';
import { cn } from '@/shared/utils/cn';

// ── PageLoader ────────────────────────────────────────────────────
export function PageLoader({ message }: { message?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-white">
      <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
      <p className="text-gray-500 text-sm">{message || 'جاري التحميل...'}</p>
    </div>
  );
}

// ── Spinner ───────────────────────────────────────────────────────
export function Spinner({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' };
  return <Loader2 className={cn('animate-spin text-primary', sizes[size], className)} />;
}

// ── Skeleton ──────────────────────────────────────────────────────
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} />;
}

export function CardSkeleton() {
  return (
    <div className="card p-5 space-y-3">
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <div className="flex justify-between">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 p-3 border border-gray-100 rounded-xl">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="card p-6 flex items-center gap-4">
      <Skeleton className="w-12 h-12 rounded-2xl flex-shrink-0" />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-6 w-16" />
      </div>
    </div>
  );
}

// ── EmptyState ────────────────────────────────────────────────────
interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
        {icon ?? <BookOpen className="w-7 h-7 text-gray-400" />}
      </div>
      <h3 className="text-lg font-semibold text-gray-800 mb-2">{title}</h3>
      {description && <p className="text-gray-500 text-sm max-w-sm mb-6">{description}</p>}
      {action}
    </div>
  );
}

export function SearchEmptyState({ query }: { query: string }) {
  return (
    <EmptyState
      icon={<Search className="w-7 h-7 text-gray-400" />}
      title={`لا توجد نتائج لـ "${query}"`}
      description="جرب كلمات بحث مختلفة أو تصفح الفئات"
    />
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mb-4">
        <AlertCircle className="w-7 h-7 text-red-500" />
      </div>
      <h3 className="text-lg font-semibold text-gray-800 mb-2">حدث خطأ</h3>
      <p className="text-gray-500 text-sm mb-6">{message || 'يرجى المحاولة مرة أخرى'}</p>
      {onRetry && <button onClick={onRetry} className="btn-primary btn">إعادة المحاولة</button>}
    </div>
  );
}

// ── Badge ─────────────────────────────────────────────────────────
interface BadgeProps { variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary'; children: ReactNode; className?: string; }
export function Badge({ variant = 'neutral', children, className }: BadgeProps) {
  const variants = {
    success: 'badge-success', warning: 'badge-warning', danger: 'badge-danger',
    info: 'badge-info', neutral: 'badge-neutral', primary: 'badge-primary',
  };
  return <span className={cn(variants[variant], className)}>{children}</span>;
}

// ── Payment status badges ─────────────────────────────────────────
export function PaymentStatusBadge({ status }: { status: string }) {
  const map: Record<string, { variant: any; label: string }> = {
    COMPLETED: { variant: 'success', label: 'مكتمل' },
    PENDING:   { variant: 'warning', label: 'معلق' },
    FAILED:    { variant: 'danger',  label: 'فشل' },
    REFUNDED:  { variant: 'info',    label: 'مسترد' },
    EXPIRED:   { variant: 'neutral', label: 'منتهي' },
    CANCELLED: { variant: 'neutral', label: 'ملغي' },
    PROCESSING:{ variant: 'info',    label: 'قيد المعالجة' },
  };
  const { variant, label } = map[status] ?? { variant: 'neutral', label: status };
  return <Badge variant={variant}>{label}</Badge>;
}

export function CourseStatusBadge({ status }: { status: string }) {
  const map: Record<string, { variant: any; label: string }> = {
    PUBLISHED: { variant: 'success', label: 'منشور' },
    DRAFT:     { variant: 'warning', label: 'مسودة' },
    ARCHIVED:  { variant: 'neutral', label: 'مؤرشف' },
  };
  const { variant, label } = map[status] ?? { variant: 'neutral', label: status };
  return <Badge variant={variant}>{label}</Badge>;
}

// ── Divider ───────────────────────────────────────────────────────
export function Divider({ label }: { label?: string }) {
  if (!label) return <hr className="border-gray-100 my-4" />;
  return (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-gray-200" />
      </div>
      <div className="relative flex justify-center text-sm">
        <span className="bg-white px-3 text-gray-400">{label}</span>
      </div>
    </div>
  );
}

// ── Progress bar ──────────────────────────────────────────────────
export function ProgressBar({ value, max = 100, label, showPercent = true }: {
  value: number; max?: number; label?: string; showPercent?: boolean;
}) {
  const pct = Math.round((Math.min(value, max) / max) * 100);
  return (
    <div className="space-y-1">
      {(label || showPercent) && (
        <div className="flex justify-between text-xs text-gray-600">
          {label && <span>{label}</span>}
          {showPercent && <span>{pct}%</span>}
        </div>
      )}
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden progress-ltr">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── cn utility ────────────────────────────────────────────────────
// Re-export for components that import from here
export { cn } from '@/shared/utils/cn';
