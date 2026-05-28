import { Link } from 'react-router-dom';
import { Users, BookOpen, CreditCard, TrendingUp, AlertCircle, Webhook, ArrowLeft } from 'lucide-react';
import { useAdminStats, useAdminActivity, useRevenueChart } from '@/shared/hooks/useApi';
import { StatCardSkeleton, Skeleton } from '@/shared/components/ui/PageLoader';
import { formatCurrency, formatNumber, formatRelative, paymentProviderLabels } from '@/shared/utils/format';
import { PaymentStatusBadge } from '@/shared/components/ui/PageLoader';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
} from 'recharts';

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useAdminStats();
  const { data: activity, isLoading: actLoading } = useAdminActivity();
  const { data: chartData } = useRevenueChart(30);

  const statCards = stats ? [
    { icon: Users,      label: 'إجمالي المستخدمين', value: formatNumber(stats.users.total),       sub: `+${stats.users.today} اليوم`,      color: 'bg-blue-50 text-blue-600',   link: '/admin/users' },
    { icon: BookOpen,   label: 'الكورسات المنشورة',   value: stats.courses.published,               sub: `${stats.courses.total} إجمالي`,     color: 'bg-primary/10 text-primary',  link: '/admin/courses' },
    { icon: TrendingUp, label: 'التسجيلات اليوم',     value: formatNumber(stats.enrollments.today), sub: `${formatNumber(stats.enrollments.total)} إجمالي`, color: 'bg-green-50 text-green-600', link: '/admin/payments' },
    { icon: CreditCard, label: 'الإيرادات الشهرية',   value: formatCurrency(stats.revenue.month),  sub: `اليوم: ${formatCurrency(stats.revenue.today)}`, color: 'bg-gold/10 text-gold-600', link: '/admin/payments' },
  ] : [];

  return (
    <div className="space-y-8" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">لوحة التحكم</h1>
          <p className="text-gray-500 mt-1">نظرة عامة على المنصة</p>
        </div>
        <Link to="/admin/analytics" className="btn btn-outline btn-sm">
          <TrendingUp className="w-4 h-4" /> التحليلات التفصيلية
        </Link>
      </div>

      {/* Alert badges */}
      {stats && (stats.payments.failed > 0 || stats.payments.pending > 0) && (
        <div className="flex flex-wrap gap-3">
          {stats.payments.failed > 0 && (
            <Link to="/admin/payments?status=FAILED"
              className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-xl text-sm hover:bg-red-100 transition-colors no-underline">
              <AlertCircle className="w-4 h-4" />
              {stats.payments.failed} دفعة فاشلة
            </Link>
          )}
          {stats.payments.pending > 0 && (
            <Link to="/admin/payments?status=PENDING"
              className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-2 rounded-xl text-sm hover:bg-yellow-100 transition-colors no-underline">
              <AlertCircle className="w-4 h-4" />
              {stats.payments.pending} دفعة معلقة
            </Link>
          )}
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading
          ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          : statCards.map(({ icon: Icon, label, value, sub, color, link }) => (
            <Link key={label} to={link} className="stat-card no-underline hover:shadow-md transition-shadow">
              <div className={`stat-icon ${color}`}><Icon className="w-5 h-5" /></div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">{label}</p>
                <p className="text-xl font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
              </div>
            </Link>
          ))
        }
      </div>

      {/* Revenue chart */}
      {chartData && chartData.length > 0 && (
        <div className="card p-6">
          <h2 className="font-bold text-gray-900 mb-5">الإيرادات — آخر 30 يوم</h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1A6B47" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#1A6B47" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => d.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${v} ج`} />
              <Tooltip formatter={(v: any) => [formatCurrency(v), 'الإيراد']} labelFormatter={l => `تاريخ: ${l}`} />
              <Area type="monotone" dataKey="revenue" stroke="#1A6B47" strokeWidth={2} fill="url(#revenueGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent activity grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent payments */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">آخر المدفوعات</h2>
            <Link to="/admin/payments" className="text-sm text-primary hover:underline">عرض الكل</Link>
          </div>
          {actLoading ? (
            <div className="p-4 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {(activity?.recentPayments ?? []).slice(0, 6).map((p: any) => (
                <div key={p.id} className="flex items-center justify-between px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 truncate">{p.user?.name}</p>
                    <p className="text-xs text-gray-400 flex items-center gap-1.5">
                      {paymentProviderLabels[p.provider] || p.provider} · {formatRelative(p.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 mr-3">
                    <span className="text-sm font-bold text-gray-900">{formatCurrency(p.amount, p.currency)}</span>
                    <PaymentStatusBadge status={p.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent users */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">أحدث المستخدمين</h2>
            <Link to="/admin/users" className="text-sm text-primary hover:underline">عرض الكل</Link>
          </div>
          {actLoading ? (
            <div className="p-4 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {(activity?.recentUsers ?? []).slice(0, 6).map((u: any) => (
                <div key={u.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-primary font-bold text-sm">{u.name?.[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{u.name}</p>
                    <p className="text-xs text-gray-400">{u.phone}</p>
                  </div>
                  <p className="text-xs text-gray-400 flex-shrink-0">{formatRelative(u.createdAt)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
