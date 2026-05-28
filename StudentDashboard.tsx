import { Link } from 'react-router-dom';
import { BookOpen, Award, CreditCard, Play, ArrowLeft, TrendingUp } from 'lucide-react';
import { useMe, useMyEnrollments, useMyCertificates, useMyPayments } from '@/shared/hooks/useApi';
import { CourseCard } from '@/features/courses/components/CourseCard';
import { StatCardSkeleton, CardSkeleton, ProgressBar } from '@/shared/components/ui/PageLoader';
import { formatCurrency, formatRelative } from '@/shared/utils/format';

export default function StudentDashboard() {
  const { data: user } = useMe();
  const { data: enrollments, isLoading: enrollLoading } = useMyEnrollments();
  const { data: certs } = useMyCertificates();
  const { data: paymentsData } = useMyPayments({ limit: 3 });

  const activeEnrollments = enrollments?.filter((e: any) => e.status === 'ACTIVE') ?? [];
  const completedEnrollments = enrollments?.filter((e: any) => e.status === 'COMPLETED') ?? [];
  const totalSpent = paymentsData?.items?.reduce((s: number, p: any) => s + Number(p.amount), 0) ?? 0;

  const stats = [
    {
      icon: BookOpen, label: 'كورسات نشطة', value: activeEnrollments.length,
      color: 'bg-blue-50 text-blue-600', link: '/my-courses',
    },
    {
      icon: TrendingUp, label: 'مكتملة', value: completedEnrollments.length,
      color: 'bg-green-50 text-green-600', link: '/my-courses',
    },
    {
      icon: Award, label: 'شهاداتي', value: certs?.length ?? 0,
      color: 'bg-gold-50 text-gold-600', link: '/certificates',
    },
    {
      icon: CreditCard, label: 'إجمالي المدفوع', value: formatCurrency(totalSpent),
      color: 'bg-primary/10 text-primary', link: '/payment-history',
    },
  ];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'صباح الخير' : hour < 18 ? 'مساء الخير' : 'مساء الخير';

  return (
    <div className="space-y-8" dir="rtl">
      {/* Welcome */}
      <div className="bg-gradient-to-l from-primary to-primary-700 rounded-3xl p-6 sm:p-8 text-white">
        <p className="text-primary-100 text-sm mb-1">{greeting} 👋</p>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">{user?.name}</h1>
        <p className="text-primary-100 text-sm">
          {activeEnrollments.length > 0
            ? `لديك ${activeEnrollments.length} كورس جارٍ — استمر في التعلم!`
            : 'لم تبدأ أي كورس بعد — ابدأ الآن!'
          }
        </p>
        {activeEnrollments.length === 0 && (
          <Link to="/courses" className="inline-flex items-center gap-2 mt-4 bg-white text-primary font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-primary-50 transition-colors no-underline">
            تصفح الكورسات <ArrowLeft className="w-4 h-4 rtl-flip" />
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {enrollLoading
          ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          : stats.map(({ icon: Icon, label, value, color, link }) => (
            <Link key={label} to={link} className="stat-card no-underline hover:shadow-md transition-shadow">
              <div className={`stat-icon ${color}`}><Icon className="w-5 h-5" /></div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">{label}</p>
                <p className="text-xl font-bold text-gray-900">{value}</p>
              </div>
            </Link>
          ))
        }
      </div>

      {/* In-progress courses */}
      {activeEnrollments.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">كورساتي الجارية</h2>
            <Link to="/my-courses" className="text-sm text-primary hover:underline">عرض الكل</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {enrollLoading
              ? Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)
              : activeEnrollments.slice(0, 6).map((enrollment: any) => (
                <div key={enrollment.id} className="card-hover overflow-hidden">
                  <div
                    className="h-28 flex items-center justify-center"
                    style={{ background: enrollment.course?.color || '#1A6B47' }}
                  >
                    <span className="text-4xl">{enrollment.course?.icon || '📚'}</span>
                  </div>
                  <div className="p-4 space-y-3">
                    <h3 className="font-semibold text-gray-900 line-clamp-2 text-sm leading-snug">
                      {enrollment.course?.title}
                    </h3>
                    <ProgressBar value={enrollment.progress} showPercent />
                    <Link
                      to={`/courses/${enrollment.course?.slug}`}
                      className="btn btn-primary btn-sm w-full text-center"
                    >
                      <Play className="w-3.5 h-3.5" /> استكمل التعلم
                    </Link>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      )}

      {/* Recent payments */}
      {paymentsData?.items && paymentsData.items.length > 0 && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">آخر المدفوعات</h2>
            <Link to="/payment-history" className="text-sm text-primary hover:underline">عرض الكل</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {paymentsData.items.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-800">{p.description || 'اشتراك كورس'}</p>
                  <p className="text-xs text-gray-400">{formatRelative(p.createdAt)}</p>
                </div>
                <div className="text-left">
                  <p className="font-bold text-gray-900 text-sm">{formatCurrency(p.amount, p.currency)}</p>
                  <span className={`text-xs ${p.status === 'COMPLETED' ? 'text-green-600' : 'text-yellow-600'}`}>
                    {p.status === 'COMPLETED' ? '✓ مكتمل' : '⏳ معلق'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
