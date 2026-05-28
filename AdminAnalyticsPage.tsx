import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/shared/api/endpoints';
import { queryKeys } from '@/shared/lib/queryClient';
import { useRevenueChart } from '@/shared/hooks/useApi';
import { formatCurrency, formatNumber, paymentProviderLabels } from '@/shared/utils/format';
import { Skeleton } from '@/shared/components/ui/PageLoader';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

const COLORS = ['#1A6B47', '#C9A84C', '#3B82F6', '#8B5CF6', '#EC4899'];

export default function AdminAnalyticsPage() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: queryKeys.admin.analytics,
    queryFn: () => adminApi.analytics().then(r => r.data.data),
  });
  const { data: chartData } = useRevenueChart(30);

  const providerData = (analytics?.byProvider ?? []).map((p: any) => ({
    name: paymentProviderLabels[p.provider] || p.provider,
    revenue: Number(p._sum?.amount ?? 0),
    count: p._count?.id ?? 0,
  }));

  const topCourses = analytics?.topCourses ?? [];

  return (
    <div className="space-y-8" dir="rtl">
      <h1 className="text-2xl font-bold text-gray-900">التحليلات التفصيلية</h1>

      {/* Revenue over time */}
      <div className="card p-6">
        <h2 className="font-bold text-gray-900 mb-5">الإيرادات اليومية — 30 يوم</h2>
        {chartData ? (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => d.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${v}`} />
              <Tooltip formatter={(v: any) => [formatCurrency(v), 'الإيراد']} />
              <Bar dataKey="revenue" fill="#1A6B47" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : <Skeleton className="h-64" />}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by provider */}
        <div className="card p-6">
          <h2 className="font-bold text-gray-900 mb-5">الإيراد حسب وسيلة الدفع</h2>
          {isLoading ? <Skeleton className="h-52" /> : providerData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={providerData} dataKey="revenue" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {providerData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-400 text-center py-10">لا توجد بيانات</p>}
        </div>

        {/* Top courses */}
        <div className="card p-6">
          <h2 className="font-bold text-gray-900 mb-5">أشهر الكورسات</h2>
          {isLoading ? <Skeleton className="h-52" /> : (
            <div className="space-y-3">
              {topCourses.slice(0, 6).map((c: any, i: number) => (
                <div key={c.id} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-400 w-5">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{c.title}</p>
                    <div className="h-1.5 bg-gray-100 rounded-full mt-1 progress-ltr">
                      <div className="h-full bg-primary rounded-full"
                        style={{ width: `${topCourses[0]?.totalStudents ? (c.totalStudents / topCourses[0].totalStudents) * 100 : 0}%` }} />
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 flex-shrink-0">{c.totalStudents} طالب</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Provider table */}
      <div className="card overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">ملخص وسائل الدفع</h2>
        </div>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr><th>وسيلة الدفع</th><th>عدد المعاملات</th><th>إجمالي الإيراد</th></tr>
            </thead>
            <tbody>
              {providerData.map((p: any) => (
                <tr key={p.name}>
                  <td className="font-medium">{p.name}</td>
                  <td>{formatNumber(p.count)}</td>
                  <td className="font-bold text-primary">{formatCurrency(p.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
