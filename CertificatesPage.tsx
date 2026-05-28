import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Award, Download, ExternalLink, CheckCircle, XCircle, Bell, Trash2, Check } from 'lucide-react';
import {
  useMyCertificates, useVerifyCertificate,
  useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead,
  useMyPayments,
} from '@/shared/hooks/useApi';
import { EmptyState, Skeleton, PaymentStatusBadge, Badge } from '@/shared/components/ui/PageLoader';
import { formatDate, formatDateTime, formatRelative, formatCurrency, paymentProviderLabels } from '@/shared/utils/format';
import { Spinner } from '@/shared/components/ui/PageLoader';

// ── Certificates Page ─────────────────────────────────────────────
export function CertificatesPage() {
  const { data: certs, isLoading } = useMyCertificates();

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">شهاداتي</h1>
        <p className="text-gray-500 mt-1">شهادات الإتمام الخاصة بك</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2].map(i => <Skeleton key={i} className="h-48 rounded-2xl" />)}
        </div>
      ) : !certs?.length ? (
        <EmptyState
          icon={<Award className="w-7 h-7 text-gray-400" />}
          title="لا توجد شهادات بعد"
          description="أكمل كورساتك للحصول على شهادات الإتمام"
          action={<Link to="/my-courses" className="btn-primary btn">الكورسات الجارية</Link>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {certs.map((cert: any) => (
            <div key={cert.id} className="card overflow-hidden border-2 border-gold/30">
              <div className="bg-gradient-to-l from-primary to-primary-700 p-6 text-white text-center">
                <Award className="w-12 h-12 mx-auto mb-2 text-gold" />
                <p className="text-xs text-primary-100 mb-1">شهادة إتمام</p>
                <h3 className="font-bold text-lg leading-snug">{cert.course?.title}</h3>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">رقم الشهادة</span>
                  <span className="font-mono text-xs font-medium text-gray-700">{cert.certificateNumber}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">تاريخ الإصدار</span>
                  <span className="text-gray-700">{formatDate(cert.issuedAt)}</span>
                </div>
                <div className="flex gap-2 pt-2">
                  {cert.verifyUrl && (
                    <a href={cert.verifyUrl} target="_blank" rel="noopener noreferrer"
                      className="btn btn-outline btn-sm flex-1 text-center">
                      <ExternalLink className="w-3.5 h-3.5" /> تحقق
                    </a>
                  )}
                  {cert.pdfUrl && (
                    <a href={cert.pdfUrl} download className="btn btn-primary btn-sm flex-1 text-center">
                      <Download className="w-3.5 h-3.5" /> تنزيل
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Notifications Page ────────────────────────────────────────────
export function NotificationsPage() {
  const { data, isLoading, refetch } = useNotifications({ limit: 50 });
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  return (
    <div className="space-y-5" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">الإشعارات</h1>
          {unreadCount > 0 && <p className="text-sm text-primary mt-1">{unreadCount} غير مقروء</p>}
        </div>
        {unreadCount > 0 && (
          <button onClick={() => markAll.mutate()} className="btn btn-secondary btn-sm">
            <Check className="w-3.5 h-3.5" /> تعليم الكل مقروء
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : !notifications.length ? (
        <EmptyState
          icon={<Bell className="w-7 h-7 text-gray-400" />}
          title="لا توجد إشعارات"
          description="ستظهر هنا إشعاراتك الجديدة"
        />
      ) : (
        <div className="space-y-2">
          {notifications.map((n: any) => (
            <div key={n.id}
              className={`card p-4 flex items-start gap-4 cursor-pointer transition-colors ${!n.isRead ? 'border-r-4 border-r-primary bg-primary/5' : ''}`}
              onClick={() => !n.isRead && markRead.mutate(n.id)}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${!n.isRead ? 'bg-primary/10' : 'bg-gray-100'}`}>
                <Bell className={`w-5 h-5 ${!n.isRead ? 'text-primary' : 'text-gray-400'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${!n.isRead ? 'text-gray-900' : 'text-gray-600'}`}>{n.title}</p>
                <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
                <p className="text-xs text-gray-400 mt-1">{formatRelative(n.createdAt)}</p>
              </div>
              {!n.isRead && <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-2" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Payment History Page ──────────────────────────────────────────
export function PaymentHistoryPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useMyPayments({ page, limit: 10 });

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">سجل المدفوعات</h1>
        <p className="text-gray-500 mt-1">جميع معاملاتك المالية</p>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 rounded-2xl" />
      ) : !data?.items?.length ? (
        <EmptyState title="لا توجد مدفوعات" description="ستظهر هنا مدفوعاتك بعد الاشتراك في الكورسات" />
      ) : (
        <>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>التفاصيل</th>
                  <th>طريقة الدفع</th>
                  <th>المبلغ</th>
                  <th>الحالة</th>
                  <th>التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((p: any) => (
                  <tr key={p.id}>
                    <td>
                      <p className="font-medium text-gray-800">{p.description || 'اشتراك كورس'}</p>
                      {p.fawryReferenceNumber && (
                        <p className="text-xs text-gray-400 font-mono mt-0.5">رقم فوري: {p.fawryReferenceNumber}</p>
                      )}
                      {p.invoice?.invoiceNumber && (
                        <p className="text-xs text-gray-400 mt-0.5">فاتورة: {p.invoice.invoiceNumber}</p>
                      )}
                    </td>
                    <td>
                      <Badge variant="neutral">{paymentProviderLabels[p.provider] || p.provider}</Badge>
                    </td>
                    <td className="font-bold text-gray-900">{formatCurrency(p.amount, p.currency)}</td>
                    <td><PaymentStatusBadge status={p.status} /></td>
                    <td className="text-gray-500 text-sm">{formatDateTime(p.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.pages > 1 && (
            <div className="flex justify-center gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn btn-secondary btn-sm disabled:opacity-40">السابق</button>
              <span className="text-sm text-gray-600 px-3 flex items-center">{page} / {data.pages}</span>
              <button disabled={page >= data.pages} onClick={() => setPage(p => p + 1)} className="btn btn-secondary btn-sm disabled:opacity-40">التالي</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Verify Certificate Page ───────────────────────────────────────
export function VerifyCertPage() {
  const { number } = useParams<{ number: string }>();
  const { data, isLoading, error } = useVerifyCertificate(number!);

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Spinner size="lg" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir="rtl">
      <div className="card w-full max-w-md p-8 text-center">
        {data?.valid ? (
          <>
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">شهادة صالحة ✅</h1>
            <p className="text-gray-500 mb-6">تم التحقق من صحة هذه الشهادة</p>
            <div className="bg-gray-50 rounded-2xl p-5 space-y-3 text-right">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">الاسم</span>
                <span className="font-semibold text-gray-900">{data.certificate.user?.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">الكورس</span>
                <span className="font-semibold text-gray-900">{data.certificate.course?.title}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">تاريخ الإصدار</span>
                <span className="font-semibold text-gray-900">{formatDate(data.certificate.issuedAt)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">رقم الشهادة</span>
                <span className="font-mono text-xs text-gray-700">{data.certificate.certificateNumber}</span>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-10 h-10 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">شهادة غير صالحة ❌</h1>
            <p className="text-gray-500">لم يتم العثور على هذه الشهادة أو أنها غير صالحة.</p>
          </>
        )}
        <Link to="/" className="btn-primary btn mt-6 w-full">العودة للرئيسية</Link>
      </div>
    </div>
  );
}

// ── Default exports for lazy loading ─────────────────────────────
export default CertificatesPage;
