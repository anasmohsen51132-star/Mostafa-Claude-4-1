import { useState } from 'react';
import { RefreshCw, Eye, Webhook } from 'lucide-react';
import { useWebhookEvents } from '@/shared/hooks/useApi';
import { formatDateTime, paymentProviderLabels } from '@/shared/utils/format';
import { TableSkeleton, EmptyState, Badge } from '@/shared/components/ui/PageLoader';

type WebhookEvent = {
  id: string;
  provider: string;
  eventType: string;
  eventId: string;
  status: string;
  attempts: number;
  error: string | null;
  processedAt: string | null;
  createdAt: string;
  payload: Record<string, unknown>;
};

type StatusVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const STATUS_LABELS: Record<string, { label: string; variant: StatusVariant }> = {
  PROCESSED:  { label: 'معالج',    variant: 'success' },
  PROCESSING: { label: 'جارٍ',     variant: 'info' },
  RECEIVED:   { label: 'مستلم',    variant: 'neutral' },
  FAILED:     { label: 'فاشل',     variant: 'danger' },
  DUPLICATE:  { label: 'مكرر',     variant: 'warning' },
};

export default function AdminWebhooksPage() {
  const [page, setPage] = useState(1);
  const [provider, setProvider] = useState('');
  const [status, setStatus] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<WebhookEvent | null>(null);

  const { data, isLoading, refetch } = useWebhookEvents({
    page,
    limit: 20,
    provider: provider || undefined,
    status: status || undefined,
  });

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">أحداث Webhook</h1>
          <p className="text-gray-500 mt-1">سجل جميع أحداث الدفع الواردة</p>
        </div>
        <button onClick={() => refetch()} className="btn btn-secondary btn-sm">
          <RefreshCw className="w-4 h-4" /> تحديث
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select
          value={provider}
          onChange={e => { setProvider(e.target.value); setPage(1); }}
          className="input w-40 text-sm"
        >
          <option value="">جميع المزودين</option>
          {Object.entries(paymentProviderLabels).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <select
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(1); }}
          className="input w-36 text-sm"
        >
          <option value="">جميع الحالات</option>
          {Object.entries(STATUS_LABELS).map(([v, { label }]) => (
            <option key={v} value={v}>{label}</option>
          ))}
        </select>
      </div>

      {isLoading ? <TableSkeleton rows={10} cols={5} /> : !data?.events?.length ? (
        <EmptyState
          icon={<Webhook className="w-7 h-7 text-gray-400" />}
          title="لا توجد أحداث"
          description="لم تصل أي أحداث webhook بعد"
        />
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>المزود</th>
                <th>نوع الحدث</th>
                <th>الحالة</th>
                <th>المحاولات</th>
                <th>وقت المعالجة</th>
                <th>التاريخ</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.events.map((ev: WebhookEvent) => {
                const statusInfo = STATUS_LABELS[ev.status] ?? { label: ev.status, variant: 'neutral' as StatusVariant };
                return (
                  <tr key={ev.id}>
                    <td>
                      <Badge variant="neutral">{paymentProviderLabels[ev.provider] || ev.provider}</Badge>
                    </td>
                    <td className="font-mono text-xs text-gray-700">{ev.eventType}</td>
                    <td>
                      <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                    </td>
                    <td className="text-sm text-center">
                      <span className={ev.attempts > 1 ? 'text-orange-600 font-semibold' : 'text-gray-600'}>
                        {ev.attempts}
                      </span>
                    </td>
                    <td className="text-sm text-gray-500">
                      {ev.processedAt ? formatDateTime(ev.processedAt) : '—'}
                    </td>
                    <td className="text-sm text-gray-500">{formatDateTime(ev.createdAt)}</td>
                    <td>
                      <button
                        onClick={() => setSelectedEvent(ev)}
                        className="btn btn-ghost btn-icon btn-sm"
                        title="عرض التفاصيل"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
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

      {/* Detail modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">تفاصيل الحدث</h3>
              <button onClick={() => setSelectedEvent(null)} className="btn btn-ghost btn-icon btn-sm">✕</button>
            </div>
            <div className="overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ['المزود', paymentProviderLabels[selectedEvent.provider] || selectedEvent.provider],
                  ['النوع', selectedEvent.eventType],
                  ['المعرف', selectedEvent.eventId],
                  ['الحالة', STATUS_LABELS[selectedEvent.status]?.label || selectedEvent.status],
                  ['المحاولات', String(selectedEvent.attempts)],
                  ['التاريخ', formatDateTime(selectedEvent.createdAt)],
                ].map(([k, v]) => (
                  <div key={k} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-gray-500 text-xs mb-1">{k}</p>
                    <p className="font-medium text-gray-900 text-xs font-mono break-all">{v}</p>
                  </div>
                ))}
              </div>
              {selectedEvent.error && (
                <div className="bg-red-50 rounded-xl p-3">
                  <p className="text-xs font-semibold text-red-700 mb-1">خطأ</p>
                  <p className="text-xs text-red-600 font-mono">{selectedEvent.error}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2">البيانات الخام</p>
                <pre className="bg-gray-900 text-green-400 text-xs p-4 rounded-xl overflow-x-auto max-h-64">
                  {JSON.stringify(selectedEvent.payload, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
