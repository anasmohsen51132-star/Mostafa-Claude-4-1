// AdminCouponsPage
import { useState } from 'react';
import { Plus, Tag, Copy, Trash2 } from 'lucide-react';
import { useAdminCoupons, useCreateCoupon } from '@/shared/hooks/useApi';
import { adminApi } from '@/shared/api/endpoints';
import { queryClient, queryKeys } from '@/shared/lib/queryClient';
import { formatDate, formatCurrency } from '@/shared/utils/format';
import { TableSkeleton, EmptyState, Badge } from '@/shared/components/ui/PageLoader';
import { Spinner } from '@/shared/components/ui/PageLoader';
import toast from 'react-hot-toast';

export function AdminCouponsPage() {
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [form, setForm] = useState({ code: '', type: 'PERCENTAGE', value: '', usageLimit: '', expiresAt: '', description: '' });
  const [bulkForm, setBulkForm] = useState({ count: '10', type: 'PERCENTAGE', value: '', prefix: '', expiresAt: '' });

  const { data, isLoading, refetch } = useAdminCoupons({ page, limit: 15 });
  const createCoupon = useCreateCoupon();

  const handleCreate = () => {
    createCoupon.mutate({
      code: form.code || undefined,
      type: form.type,
      value: Number(form.value),
      usageLimit: form.usageLimit ? Number(form.usageLimit) : undefined,
      expiresAt: form.expiresAt || undefined,
      description: form.description || undefined,
    }, { onSuccess: () => { setShowCreate(false); setForm({ code: '', type: 'PERCENTAGE', value: '', usageLimit: '', expiresAt: '', description: '' }); } });
  };

  const handleBulk = async () => {
    try {
      const res = await adminApi.bulkCoupons({ count: Number(bulkForm.count), type: bulkForm.type, value: Number(bulkForm.value), prefix: bulkForm.prefix || undefined, expiresAt: bulkForm.expiresAt || undefined });
      toast.success(`تم إنشاء ${res.data.data.count} كوبون`);
      setShowBulk(false);
      queryClient.invalidateQueries({ queryKey: ['admin', 'coupons'] });
    } catch { toast.error('فشل إنشاء الكوبونات'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل تريد تعطيل هذا الكوبون؟')) return;
    await adminApi.deleteCoupon(id);
    toast.success('تم التعطيل');
    refetch();
  };

  const copyCode = (code: string) => { navigator.clipboard.writeText(code); toast.success('تم نسخ الكود'); };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">إدارة الكوبونات</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowBulk(true)} className="btn btn-secondary btn-sm">توليد مجمّع</button>
          <button onClick={() => setShowCreate(true)} className="btn btn-primary btn-sm"><Plus className="w-4 h-4" /> كوبون جديد</button>
        </div>
      </div>

      {isLoading ? <TableSkeleton rows={8} cols={5} /> : !data?.coupons?.length ? (
        <EmptyState icon={<Tag className="w-7 h-7 text-gray-400" />} title="لا توجد كوبونات" action={<button onClick={() => setShowCreate(true)} className="btn-primary btn">إضافة كوبون</button>} />
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead><tr><th>الكود</th><th>النوع</th><th>القيمة</th><th>الاستخدام</th><th>الانتهاء</th><th>الحالة</th><th></th></tr></thead>
            <tbody>
              {data.coupons.map((c: any) => (
                <tr key={c.id}>
                  <td><div className="flex items-center gap-2"><span className="font-mono font-bold text-primary">{c.code}</span><button onClick={() => copyCode(c.code)} className="btn btn-ghost btn-icon btn-sm"><Copy className="w-3.5 h-3.5" /></button></div></td>
                  <td><Badge variant="neutral">{c.type === 'PERCENTAGE' ? 'نسبة %' : c.type === 'FIXED_AMOUNT' ? 'مبلغ ثابت' : 'وصول مجاني'}</Badge></td>
                  <td className="font-bold">{c.type === 'PERCENTAGE' ? `${c.value}%` : formatCurrency(c.value)}</td>
                  <td className="text-sm">{c.usageCount} / {c.usageLimit ?? '∞'}</td>
                  <td className="text-sm text-gray-500">{c.expiresAt ? formatDate(c.expiresAt) : '—'}</td>
                  <td><Badge variant={c.status === 'ACTIVE' ? 'success' : 'neutral'}>{c.status === 'ACTIVE' ? 'نشط' : 'معطل'}</Badge></td>
                  <td><button onClick={() => handleDelete(c.id)} className="btn btn-ghost btn-sm text-red-500"><Trash2 className="w-4 h-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-bold text-gray-900">إنشاء كوبون جديد</h3>
            {[
              { label: 'الكود (اختياري - سيُولَّد تلقائياً)', field: 'code', type: 'text', placeholder: 'SAVE25' },
              { label: 'القيمة', field: 'value', type: 'number', placeholder: '25' },
              { label: 'حد الاستخدام (اتركه فارغاً لـ ∞)', field: 'usageLimit', type: 'number', placeholder: '100' },
              { label: 'تاريخ الانتهاء', field: 'expiresAt', type: 'datetime-local', placeholder: '' },
              { label: 'الوصف', field: 'description', type: 'text', placeholder: 'خصم ترحيبي' },
            ].map(f => (
              <div key={f.field}>
                <label className="label">{f.label}</label>
                <input value={(form as any)[f.field]} onChange={e => setForm(p => ({ ...p, [f.field]: e.target.value }))}
                  type={f.type} placeholder={f.placeholder} className="input" />
              </div>
            ))}
            <div>
              <label className="label">النوع</label>
              <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} className="input">
                <option value="PERCENTAGE">نسبة مئوية (%)</option>
                <option value="FIXED_AMOUNT">مبلغ ثابت (جنيه)</option>
                <option value="FREE_ACCESS">وصول مجاني</option>
              </select>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowCreate(false)} className="btn btn-secondary flex-1">إلغاء</button>
              <button onClick={handleCreate} disabled={createCoupon.isPending || !form.value} className="btn btn-primary flex-1">
                {createCoupon.isPending ? <Spinner size="sm" /> : 'إنشاء'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk modal */}
      {showBulk && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-bold text-gray-900">توليد كوبونات مجمّعة</h3>
            <div><label className="label">العدد (أقصاه 1000)</label><input value={bulkForm.count} onChange={e => setBulkForm(p => ({...p, count: e.target.value}))} type="number" min={1} max={1000} className="input" /></div>
            <div><label className="label">البادئة (اختياري)</label><input value={bulkForm.prefix} onChange={e => setBulkForm(p => ({...p, prefix: e.target.value}))} placeholder="MA" className="input" /></div>
            <div><label className="label">القيمة</label><input value={bulkForm.value} onChange={e => setBulkForm(p => ({...p, value: e.target.value}))} type="number" className="input" /></div>
            <div><label className="label">النوع</label>
              <select value={bulkForm.type} onChange={e => setBulkForm(p => ({...p, type: e.target.value}))} className="input">
                <option value="PERCENTAGE">نسبة مئوية</option><option value="FIXED_AMOUNT">مبلغ ثابت</option><option value="FREE_ACCESS">وصول مجاني</option>
              </select>
            </div>
            <div><label className="label">تاريخ الانتهاء</label><input value={bulkForm.expiresAt} onChange={e => setBulkForm(p => ({...p, expiresAt: e.target.value}))} type="datetime-local" className="input" /></div>
            <div className="flex gap-3">
              <button onClick={() => setShowBulk(false)} className="btn btn-secondary flex-1">إلغاء</button>
              <button onClick={handleBulk} disabled={!bulkForm.value} className="btn btn-primary flex-1">توليد</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminCouponsPage;
