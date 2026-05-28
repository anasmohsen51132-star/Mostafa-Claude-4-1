import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useCourses, useCategories } from '@/shared/hooks/useApi';
import { CourseCard } from '../components/CourseCard';
import { CardSkeleton, EmptyState } from '@/shared/components/ui/PageLoader';
import { cn } from '@/shared/utils/cn';

const levels = [
  { value: '', label: 'جميع المستويات' },
  { value: 'BEGINNER', label: 'مبتدئ' },
  { value: 'INTERMEDIATE', label: 'متوسط' },
  { value: 'ADVANCED', label: 'متقدم' },
];

export default function CoursesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [showFilters, setShowFilters] = useState(false);

  const params = {
    page: Number(searchParams.get('page')) || 1,
    categoryId: searchParams.get('categoryId') || undefined,
    level: searchParams.get('level') || undefined,
    search: searchParams.get('q') || undefined,
    limit: 12,
  };

  const { data, isLoading, isFetching } = useCourses(params);
  const { data: categories } = useCategories();

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      const p = new URLSearchParams(searchParams);
      if (search) p.set('q', search); else p.delete('q');
      p.delete('page');
      setSearchParams(p, { replace: true });
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const setFilter = (key: string, value: string) => {
    const p = new URLSearchParams(searchParams);
    if (value) p.set(key, value); else p.delete(key);
    p.delete('page');
    setSearchParams(p, { replace: true });
  };

  const clearFilters = () => {
    setSearch('');
    setSearchParams({});
  };

  const hasFilters = params.categoryId || params.level || params.search;

  return (
    <div className="page-container py-10" dir="rtl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">جميع الكورسات</h1>
        <p className="text-gray-500">اكتشف كورساتنا المتخصصة في اللغة العربية</p>
      </div>

      {/* Search + filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث عن كورس..."
            className="input pr-10"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn('btn btn-secondary gap-2', showFilters && 'bg-primary/10 text-primary border-primary/30')}
        >
          <SlidersHorizontal className="w-4 h-4" /> تصفية
        </button>
        {hasFilters && (
          <button onClick={clearFilters} className="btn btn-ghost text-red-500">
            <X className="w-4 h-4" /> مسح
          </button>
        )}
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="card p-5 mb-6 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Category */}
            <div>
              <label className="label">الفئة</label>
              <select
                value={params.categoryId || ''}
                onChange={(e) => setFilter('categoryId', e.target.value)}
                className="input"
              >
                <option value="">جميع الفئات</option>
                {categories?.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.nameAr}</option>
                ))}
              </select>
            </div>
            {/* Level */}
            <div>
              <label className="label">المستوى</label>
              <select
                value={params.level || ''}
                onChange={(e) => setFilter('level', e.target.value)}
                className="input"
              >
                {levels.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Results count */}
      {data && (
        <p className="text-sm text-gray-500 mb-4">
          {data.total > 0 ? `${data.total} كورس` : 'لا توجد كورسات'}
          {isFetching && !isLoading && ' • جاري التحديث...'}
        </p>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading
          ? Array.from({ length: 9 }).map((_, i) => <CardSkeleton key={i} />)
          : data?.items?.map((course: any) => (
              <CourseCard key={course.id} course={course} />
            ))
        }
      </div>

      {/* Empty */}
      {!isLoading && (!data?.items?.length) && (
        <EmptyState
          title="لا توجد كورسات"
          description={hasFilters ? 'جرب تغيير معايير البحث' : 'سيتم إضافة كورسات قريباً'}
          action={hasFilters ? (
            <button onClick={clearFilters} className="btn-primary btn">مسح الفلاتر</button>
          ) : undefined}
        />
      )}

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-10">
          <button
            disabled={params.page <= 1}
            onClick={() => setFilter('page', String(params.page - 1))}
            className="btn btn-secondary btn-sm disabled:opacity-40"
          >
            السابق
          </button>
          <span className="text-sm text-gray-600 px-4">
            صفحة {params.page} من {data.pages}
          </span>
          <button
            disabled={params.page >= data.pages}
            onClick={() => setFilter('page', String(params.page + 1))}
            className="btn btn-secondary btn-sm disabled:opacity-40"
          >
            التالي
          </button>
        </div>
      )}
    </div>
  );
}
