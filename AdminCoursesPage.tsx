import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Pencil, BookOpen, Users, Eye } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { coursesApi } from '@/shared/api/endpoints';
import { queryKeys } from '@/shared/lib/queryClient';
import { formatCurrency, formatNumber, levelLabels } from '@/shared/utils/format';
import { CourseStatusBadge, TableSkeleton, EmptyState } from '@/shared/components/ui/PageLoader';
import { CreateCourseModal } from '../components/CreateCourseModal';
import toast from 'react-hot-toast';

export default function AdminCoursesPage() {
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [status, setStatus] = useState('');
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: [...queryKeys.courses.all, { page, status, admin: true }],
    queryFn: () => coursesApi.list({ page, limit: 15, status: status || undefined }).then(r => r.data.data),
  });

  const toggleStatus = useMutation({
    mutationFn: ({ id, newStatus }: { id: string; newStatus: string }) =>
      coursesApi.update(id, { status: newStatus as any }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.courses.all }); toast.success('تم التحديث'); },
  });

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">إدارة الكورسات</h1>
          <p className="text-gray-500 mt-1">{data?.total ?? 0} كورس</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn btn-primary">
          <Plus className="w-4 h-4" /> إضافة كورس
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {['', 'PUBLISHED', 'DRAFT', 'ARCHIVED'].map(s => (
          <button key={s} onClick={() => { setStatus(s); setPage(1); }}
            className={`btn btn-sm ${status === s ? 'btn-primary' : 'btn-secondary'}`}>
            {s === '' ? 'الكل' : s === 'PUBLISHED' ? 'منشور' : s === 'DRAFT' ? 'مسودة' : 'مؤرشف'}
          </button>
        ))}
      </div>

      {isLoading ? <TableSkeleton rows={8} cols={5} /> : !data?.items?.length ? (
        <EmptyState icon={<BookOpen className="w-7 h-7 text-gray-400" />}
          title="لا توجد كورسات" description="ابدأ بإضافة أول كورس"
          action={<button onClick={() => setShowCreate(true)} className="btn-primary btn">إضافة كورس</button>} />
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr><th>الكورس</th><th>الحالة</th><th>الطلاب</th><th>السعر</th><th>المستوى</th><th>إجراءات</th></tr>
            </thead>
            <tbody>
              {data.items.map((c: any) => (
                <tr key={c.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: c.color || '#1A6B47' }}>
                        <span className="text-lg">{c.icon || '📚'}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate max-w-[200px]">{c.title}</p>
                        <p className="text-xs text-gray-400">{c.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td><CourseStatusBadge status={c.status} /></td>
                  <td>
                    <span className="flex items-center gap-1 text-sm"><Users className="w-3.5 h-3.5 text-gray-400" />{formatNumber(c.totalStudents)}</span>
                  </td>
                  <td className="font-semibold">{c.isFree ? 'مجاني' : formatCurrency(c.price, c.currency)}</td>
                  <td><span className="badge badge-neutral text-xs">{levelLabels[c.level]}</span></td>
                  <td>
                    <div className="flex items-center gap-1">
                      <Link to={`/admin/courses/${c.id}/edit`} className="btn btn-ghost btn-icon btn-sm" title="تعديل">
                        <Pencil className="w-4 h-4" />
                      </Link>
                      <Link to={`/admin/courses/${c.id}/lectures`} className="btn btn-ghost btn-icon btn-sm" title="المحاضرات">
                        <BookOpen className="w-4 h-4" />
                      </Link>
                      <Link to={`/courses/${c.slug}`} target="_blank" className="btn btn-ghost btn-icon btn-sm" title="معاينة">
                        <Eye className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => toggleStatus.mutate({ id: c.id, newStatus: c.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED' })}
                        className={`btn btn-sm ${c.status === 'PUBLISHED' ? 'btn-secondary text-orange-600' : 'btn-primary'}`}>
                        {c.status === 'PUBLISHED' ? 'إلغاء النشر' : 'نشر'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div className="flex justify-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn btn-secondary btn-sm disabled:opacity-40">السابق</button>
          <span className="text-sm text-gray-600 px-3 flex items-center">{page} / {data.pages}</span>
          <button disabled={page >= data.pages} onClick={() => setPage(p => p + 1)} className="btn btn-secondary btn-sm disabled:opacity-40">التالي</button>
        </div>
      )}

      {showCreate && <CreateCourseModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
