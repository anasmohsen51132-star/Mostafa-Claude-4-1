import { useState } from 'react';
import { Shield, Search } from 'lucide-react';
import { useAuditLogs } from '@/shared/hooks/useApi';
import { formatDateTime } from '@/shared/utils/format';
import { TableSkeleton, EmptyState, Badge } from '@/shared/components/ui/PageLoader';

type AuditLog = {
  id: string;
  action: string;
  resource: string;
  resourceId: string | null;
  ipAddress: string | null;
  createdAt: string;
  actor: { id: string; name: string; role: string } | null;
};

type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'neutral';

const ACTION_STYLES: Record<string, { label: string; variant: BadgeVariant }> = {
  CREATE:  { label: 'إنشاء',    variant: 'success' },
  UPDATE:  { label: 'تحديث',    variant: 'info' },
  DELETE:  { label: 'حذف',      variant: 'danger' },
  LOGIN:   { label: 'دخول',     variant: 'neutral' },
  LOGOUT:  { label: 'خروج',     variant: 'neutral' },
  PAYMENT: { label: 'دفع',      variant: 'warning' },
  REFUND:  { label: 'استرداد',  variant: 'warning' },
  ENROLL:  { label: 'تسجيل',    variant: 'success' },
  REVOKE:  { label: 'إلغاء',    variant: 'danger' },
};

const RESOURCE_LABELS: Record<string, string> = {
  User: 'مستخدم', Course: 'كورس', Payment: 'دفع', Enrollment: 'تسجيل',
  Lecture: 'محاضرة', Quiz: 'اختبار', Homework: 'واجب', Certificate: 'شهادة',
  Coupon: 'كوبون', HomeworkSubmission: 'تسليم واجب',
};

export default function AdminAuditPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [resource, setResource] = useState('');

  const { data, isLoading } = useAuditLogs({
    page,
    limit: 30,
    action: action || undefined,
    resource: resource || undefined,
  });

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">سجلات المراجعة</h1>
        <p className="text-gray-500 mt-1">تتبع جميع الإجراءات المنفذة على المنصة</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select
          value={action}
          onChange={e => { setAction(e.target.value); setPage(1); }}
          className="input w-36 text-sm"
        >
          <option value="">جميع الإجراءات</option>
          {Object.entries(ACTION_STYLES).map(([v, { label }]) => (
            <option key={v} value={v}>{label}</option>
          ))}
        </select>
        <select
          value={resource}
          onChange={e => { setResource(e.target.value); setPage(1); }}
          className="input w-36 text-sm"
        >
          <option value="">جميع الموارد</option>
          {Object.entries(RESOURCE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>

      {isLoading ? <TableSkeleton rows={12} cols={5} /> : !data?.logs?.length ? (
        <EmptyState
          icon={<Shield className="w-7 h-7 text-gray-400" />}
          title="لا توجد سجلات"
          description="لا توجد سجلات مراجعة بهذه المعايير"
        />
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>المنفذ</th>
                <th>الإجراء</th>
                <th>المورد</th>
                <th>عنوان IP</th>
                <th>التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {data.logs.map((log: AuditLog) => {
                const actionInfo = ACTION_STYLES[log.action] ?? { label: log.action, variant: 'neutral' as BadgeVariant };
                return (
                  <tr key={log.id}>
                    <td>
                      {log.actor ? (
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{log.actor.name}</p>
                          <p className="text-xs text-gray-400">{log.actor.role}</p>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">نظام</span>
                      )}
                    </td>
                    <td>
                      <Badge variant={actionInfo.variant}>{actionInfo.label}</Badge>
                    </td>
                    <td>
                      <span className="text-sm text-gray-700">
                        {RESOURCE_LABELS[log.resource] || log.resource}
                        {log.resourceId && (
                          <span className="text-xs text-gray-400 font-mono mr-1">
                            #{log.resourceId.slice(0, 8)}
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="font-mono text-xs text-gray-500">{log.ipAddress || '—'}</td>
                    <td className="text-sm text-gray-500 whitespace-nowrap">{formatDateTime(log.createdAt)}</td>
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
    </div>
  );
}
