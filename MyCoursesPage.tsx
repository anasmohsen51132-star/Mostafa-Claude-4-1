import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Play, CheckCircle, BookOpen } from 'lucide-react';
import { useMyEnrollments } from '@/shared/hooks/useApi';
import { ProgressBar, CardSkeleton, EmptyState } from '@/shared/components/ui/PageLoader';
import { cn } from '@/shared/utils/cn';

type Tab = 'all' | 'active' | 'completed';

export default function MyCoursesPage() {
  const [tab, setTab] = useState<Tab>('all');
  const { data: enrollments, isLoading } = useMyEnrollments();

  const filtered = (enrollments ?? []).filter((e: any) => {
    if (tab === 'active') return e.status === 'ACTIVE';
    if (tab === 'completed') return e.status === 'COMPLETED';
    return true;
  });

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">كورساتي</h1>
        <p className="text-gray-500 mt-1">تابع تقدمك في جميع الكورسات المسجلة</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {(['all', 'active', 'completed'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              tab === t ? 'bg-white text-primary shadow-sm' : 'text-gray-600 hover:text-gray-800'
            )}>
            {t === 'all' ? 'الكل' : t === 'active' ? 'جارية' : 'مكتملة'}
            {!isLoading && (
              <span className="mr-1.5 text-xs">
                ({(enrollments ?? []).filter((e: any) =>
                  t === 'all' ? true : t === 'active' ? e.status === 'ACTIVE' : e.status === 'COMPLETED'
                ).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="w-7 h-7 text-gray-400" />}
          title="لا توجد كورسات"
          description={tab === 'all' ? 'لم تسجل في أي كورس بعد' : 'لا توجد كورسات في هذا القسم'}
          action={<Link to="/courses" className="btn-primary btn">تصفح الكورسات</Link>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((enrollment: any) => {
            const course = enrollment.course;
            if (!course) return null;
            const isCompleted = enrollment.status === 'COMPLETED';
            return (
              <div key={enrollment.id} className="card overflow-hidden">
                <div className="h-32 flex items-center justify-center relative"
                  style={{ background: course.color || '#1A6B47' }}>
                  <span className="text-4xl">{course.icon || '📚'}</span>
                  {isCompleted && (
                    <div className="absolute top-3 left-3 bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> مكتمل
                    </div>
                  )}
                </div>
                <div className="p-4 space-y-3">
                  <h3 className="font-semibold text-gray-900 line-clamp-2 leading-snug">{course.title}</h3>
                  <ProgressBar value={enrollment.progress} showPercent />
                  <div className="flex gap-2">
                    <Link to={`/courses/${course.slug}`}
                      className="btn btn-secondary btn-sm flex-1 text-center text-xs">
                      تفاصيل
                    </Link>
                    <Link to={`/learn/${course.slug}/lecture/${course.id}`}
                      className="btn btn-primary btn-sm flex-1 text-center text-xs">
                      <Play className="w-3 h-3" />
                      {isCompleted ? 'مراجعة' : 'استكمال'}
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
