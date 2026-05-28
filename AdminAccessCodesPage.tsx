import { useState } from 'react';
import { Key, Plus, Download, Copy } from 'lucide-react';
import { useAdminAccessCodes, useGenerateAccessCodes } from '@/shared/hooks/useApi';
import { formatDate } from '@/shared/utils/format';
import { TableSkeleton, EmptyState, Badge } from '@/shared/components/ui/PageLoader';
import { Spinner } from '@/shared/components/ui/PageLoader';
import { useCategories } from '@/shared/hooks/useApi';
import { useQuery } from '@tanstack/react-query';
import { coursesApi } from '@/shared/api/endpoints';
import { queryKeys } from '@/shared/lib/queryClient';
import toast from 'react-hot-toast';

interface GenerateForm {
  count: number;
  courseId: string;
  usageLimit: number;
  expiresAt: string;
  description: string;
}

export default function AdminAccessCodesPage() {
  const [page, setPage] = useState(1);
  const [showGenerate, setShowGenerate] = useState(false);
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);
  const [form, setForm] = useState<GenerateForm>({
    count: 10, courseId: '', usageLimit: 1, expiresAt: '', description: '',
  });

  const { data, isLoading, refetch } = useAdminAccessCodes({ page, limit: 20 });
  const generateCodes = useGenerateAccessCodes();

  const { data: coursesData } = useQuery({
    queryKey: [...queryKeys.courses.all, { admin: true, limit: 100 }],
    queryFn: () => coursesApi.list({ limit: 100, status: 'PUBLISHED' }).then(r => r.data.data),
  });

  const handleGenerate = () => {
    generateCodes.mutate(
      {
        count: form.count,
        courseId: form.courseId || undefined,
        usageLimit: form.usageLimit,
        expiresAt: form.expiresAt || undefined,
        description: form.description || undefined,
      },
      {
        onSuccess: (data) => {
          setGeneratedCodes(data.codes ?? []);
          setShowGenerate(false);
          toast.success(`تم توليد ${data.count} كود وصول`);
          refetch();
        },
      },
    );
  };

  const copyAllCodes = () => {
    if (!generatedCodes.length) return;
    navigator.clipboard.writeText(generatedCodes.join('\n'));
    toast.success('تم نسخ جميع الأكواد');
  };

  const downloadCodes = () => {
    if (!generatedCodes.length) return;
    const blob = new Blob([generatedCodes.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `access-codes-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">أكواد الوصول</h1>
          <p className="text-gray-500 mt-1">إنشاء وإدارة أكواد الوصول المدفوعة مسبقاً</p>
        </div>
        <button onClick={() => setShowGenerate(true)} className="btn btn-primary">
          <Plus className="w-4 h-4" /> توليد أكواد
        </button>
      </div>

      {/* Generated codes display */}
      {generatedCodes.length > 0 && (
        <div className="card p-5 border-2 border-primary/20 bg-primary/5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-primary">تم توليد {generatedCodes.length} كود</h3>
            <div className="flex gap-2">
              <button onClick={copyAllCodes} className="btn btn-secondary btn-sm">
                <Copy className="w-3.5 h-3.5" /> نسخ الكل
              </button>
              <button onClick={downloadCodes} className="btn btn-primary btn-sm">
                <Download className="w-3.5 h-3.5" /> تنزيل TXT
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-48 overflow-y-auto">
            {generatedCodes.map((code, i) => (
              <div key={i} className="font-mono text-sm bg-white border border-primary/20 rounded-lg px-3 py-2 text-center text-primary font-bold">
                {code}
              </div>
            ))}
          </div>
          <button onClick={() => setGeneratedCodes([])} className="btn btn-ghost btn-sm mt-3 text-gray-500">
            إخفاء
          </button>
        </div>
      )}

      {/* Table */}
      {isLoading ? <TableSkeleton rows={8} cols={5} /> : !data?.codes?.length ? (
        <EmptyState
          icon={<Key className="w-7 h-7 text-gray-400" />}
          title="لا توجد أكواد وصول"
          description="قم بتوليد أكواد وصول لمشاركتها مع الطلاب"
          action={<button onClick={() => setShowGenerate(true)} className="btn-primary btn">توليد أكواد</button>}
        />
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>الكود</th>
                <th>الكورس</th>
                <th>الاستخدام</th>
                <th>الانتهاء</th>
                <th>الحالة</th>
                <th>التفاصيل</th>
              </tr>
            </thead>
            <tbody>
              {data.codes.map((code: {
                id: string;
                code: string;
                courseId: string | null;
                usageCount: number;
                usageLimit: number;
                expiresAt: string | null;
                isActive: boolean;
                description: string | null;
                createdAt: string;
                _count: { redemptions: number };
              }) => (
                <tr key={code.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-primary text-sm">{code.code}</span>
                      <button
                        onClick={() => { navigator.clipboard.writeText(code.code); toast.success('تم النسخ'); }}
                        className="btn btn-ghost btn-icon btn-sm opacity-60 hover:opacity-100"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {code.description && <p className="text-xs text-gray-400 mt-0.5">{code.description}</p>}
                  </td>
                  <td className="text-sm text-gray-600">{code.courseId ? 'مخصص' : 'عام'}</td>
                  <td>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-medium">{code.usageCount}</span>
                      <span className="text-gray-400 text-sm">/ {code.usageLimit}</span>
                    </div>
                  </td>
                  <td className="text-sm text-gray-500">
                    {code.expiresAt ? formatDate(code.expiresAt) : '—'}
                  </td>
                  <td>
                    <Badge variant={code.isActive ? 'success' : 'neutral'}>
                      {code.isActive ? 'نشط' : 'معطل'}
                    </Badge>
                  </td>
                  <td className="text-xs text-gray-400">{formatDate(code.createdAt)}</td>
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

      {/* Generate modal */}
      {showGenerate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-gray-900 text-lg">توليد أكواد وصول</h3>

            <div>
              <label className="label">العدد (أقصاه 500)</label>
              <input
                type="number" min={1} max={500}
                value={form.count}
                onChange={e => setForm(p => ({ ...p, count: Number(e.target.value) }))}
                className="input"
              />
            </div>

            <div>
              <label className="label">الكورس (اتركه فارغاً لكل الكورسات)</label>
              <select
                value={form.courseId}
                onChange={e => setForm(p => ({ ...p, courseId: e.target.value }))}
                className="input"
              >
                <option value="">جميع الكورسات</option>
                {coursesData?.items?.map((c: { id: string; title: string }) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">عدد مرات الاستخدام لكل كود</label>
              <input
                type="number" min={1}
                value={form.usageLimit}
                onChange={e => setForm(p => ({ ...p, usageLimit: Number(e.target.value) }))}
                className="input"
              />
            </div>

            <div>
              <label className="label">تاريخ الانتهاء (اختياري)</label>
              <input
                type="datetime-local"
                value={form.expiresAt}
                onChange={e => setForm(p => ({ ...p, expiresAt: e.target.value }))}
                className="input"
              />
            </div>

            <div>
              <label className="label">ملاحظة (اختياري)</label>
              <input
                type="text" placeholder="مثال: دفعة يناير 2025"
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                className="input"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowGenerate(false)} className="btn btn-secondary flex-1">إلغاء</button>
              <button
                onClick={handleGenerate}
                disabled={generateCodes.isPending || form.count < 1}
                className="btn btn-primary flex-1"
              >
                {generateCodes.isPending ? <Spinner size="sm" /> : `توليد ${form.count} كود`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
