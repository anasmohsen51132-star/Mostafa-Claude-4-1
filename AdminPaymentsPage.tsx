import { useState } from 'react';
import { Search, RefreshCw } from 'lucide-react';
import { useAdminPayments } from '@/shared/hooks/useApi';
import { adminApi } from '@/shared/api/endpoints';
import { formatCurrency, formatDateTime, paymentProviderLabels, phoneDisplay } from '@/shared/utils/format';
import { PaymentStatusBadge, TableSkeleton, EmptyState } from '@/shared/components/ui/PageLoader';
import toast from 'react-hot-toast';

export default function AdminPaymentsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [provider, setProvider] = useState('');
  const [search, setSearch] = useState('');
  const [refundModal, setRefundModal] = useState<{ paymentId: string; amount: number } | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [refunding, setRefunding] = useState(false);

  const { data, isLoading, refetch } = useAdminPayments({ page, status: status || undefined, provider: provider || undefined, search: search || undefined, limit: 20 });

  const handleRefund = async () => {
    if (!refundModal) return;
    setRefunding(true);
    try {
      await adminApi.refund(refundModal.paymentId, Number(refundAmount), refundReason);
      toast.success('تم إنشاء طلب الاسترداد');
      setRefundModal(null);
      refetch();
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message || 'فشل الاسترداد');
    } finally { setRefunding(false); }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">إدارة المدفوعات</h1>
          <p className="text-gray-500 mt-1">{data?.total ?? 0} معاملة</p>
        </div>
        <button onClick={() => refetch()} className="btn btn-secondary btn-sm"><RefreshCw className="w-4 h-4" /> تحديث</button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="رقم مرجع أو اسم المستخدم..." className="input pr-10 text-sm" />
        </div>
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="input w-36 text-sm">
          <option value="">جميع الحالات</option>
          {['PENDING','COMPLETED','FAILED','REFUNDED','EXPIRED'].map(s => (
            <option key={s} value={s}>{s === 'PENDING' ? 'معلق' : s === 'COMPLETED' ? 'مكتمل' : s === 'FAILED' ? 'فاشل' : s === 'REFUNDED' ? 'مسترد' : 'منتهي'}</option>
          ))}
        </select>
        <select value={provider} onChange={e => { setProvider(e.target.value); setPage(1); }} className="input w-40 text-sm">
          <option value="">جميع الوسائل</option>
          {Object.entries(paymentProviderLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {isLoading ? <TableSkeleton rows={10} cols={6} /> : !data?.items?.length ? (
        <EmptyState title="لا توجد مدفوعات" description="لا توجد معاملات بهذه المعايير" />
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr><th>المستخدم</th><th>الكورس</th><th>وسيلة الدفع</th><th>المبلغ</th><th>الحالة</th><th>التاريخ</th><th>إجراءات</th></tr>
            </thead>
            <tbody>
              {data.items.map((p: any) => (
                <tr key={p.id}>
                  <td>
                    <p className="font-medium text-gray-900">{p.user?.name}</p>
                    <p className="text-xs text-gray-400 font-mono">{phoneDisplay(p.user?.phone || '')}</p>
                  </td>
                  <td className="text-sm text-gray-600 max-w-[150px]">
                    <p className="truncate">{p.description || '—'}</p>
                    {p.fawryReferenceNumber && (
                      <p className="text-xs font-mono text-gray-400">فوري: {p.fawryReferenceNumber}</p>
                    )}
                    {p.invoice?.invoiceNumber && (
                      <p className="text-xs text-gray-400">{p.invoice.invoiceNumber}</p>
                    )}
                  </td>
                  <td className="text-sm">{paymentProviderLabels[p.provider] || p.provider}</td>
                  <td className="font-bold text-gray-900">{formatCurrency(p.amount, p.currency)}</td>
                  <td><PaymentStatusBadge status={p.status} /></td>
                  <td className="text-sm text-gray-500 whitespace-nowrap">{formatDateTime(p.createdAt)}</td>
                  <td>
                    {p.status === 'COMPLETED' && (
                      <button onClick={() => setRefundModal({ paymentId: p.id, amount: Number(p.amount) })}
                        className="btn btn-sm text-red-600 border border-red-200 hover:bg-red-50 text-xs px-2 py-1">
                        استرداد
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.pages > 1 && (
        <div className="flex justify-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn btn-secondary btn-sm disabled:opacity-40">السابق</button>
          <span className="text-sm text-gray-600 px-3 flex items-center">{page} / {data.pages}</span>
          <button disabled={page >= data.pages} onClick={() => setPage(p => p + 1)} className="btn btn-secondary btn-sm disabled:opacity-40">التالي</button>
        </div>
      )}

      {/* Refund modal */}
      {refundModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="font-bold text-gray-900">طلب استرداد</h3>
            <div>
              <label className="label">المبلغ (أقصاه {formatCurrency(refundModal.amount)})</label>
              <input value={refundAmount} onChange={e => setRefundAmount(e.target.value)} type="number"
                max={refundModal.amount} min={1} className="input" placeholder={String(refundModal.amount)} />
            </div>
            <div>
              <label className="label">سبب الاسترداد *</label>
              <textarea value={refundReason} onChange={e => setRefundReason(e.target.value)}
                rows={3} className="input resize-none" placeholder="أدخل سبب الاسترداد..." />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setRefundModal(null)} className="btn btn-secondary flex-1">إلغاء</button>
              <button onClick={handleRefund} disabled={refunding || !refundReason.trim() || !refundAmount}
                className="btn btn-danger flex-1">
                {refunding ? 'جاري...' : 'تأكيد الاسترداد'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
