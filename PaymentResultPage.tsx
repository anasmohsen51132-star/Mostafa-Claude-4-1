import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { CheckCircle, Clock, Copy, RefreshCw } from 'lucide-react';
import { usePollFawryStatus } from '@/shared/hooks/useApi';
import { formatCurrency, formatDate } from '@/shared/utils/format';
import { Spinner } from '@/shared/components/ui/PageLoader';
import toast from 'react-hot-toast';

export default function PaymentResultPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const result = state?.result;
  const course = state?.course;
  const provider = state?.provider;

  const [polling, setPolling] = useState(false);
  const fawryPaymentId = result?.paymentId;

  const { data: fawryStatus, isRefetching } = usePollFawryStatus(
    fawryPaymentId || '',
    provider === 'FAWRY' && !!fawryPaymentId,
  );

  useEffect(() => {
    if (fawryStatus?.status === 'COMPLETED' || fawryStatus?.enrolled) {
      toast.success('تم الدفع والتسجيل بنجاح! 🎉');
      setTimeout(() => navigate('/dashboard'), 3000);
    }
  }, [fawryStatus]);

  useEffect(() => {
    if (!result) navigate('/courses', { replace: true });
  }, []);

  if (!result) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('تم النسخ!');
  };

  // Fawry payment instructions
  if (provider === 'FAWRY' && result.referenceNumber) {
    const enrolled = fawryStatus?.enrolled || fawryStatus?.status === 'COMPLETED';

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir="rtl">
        <div className="card w-full max-w-md p-8 text-center space-y-6">
          {enrolled ? (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">تم الدفع بنجاح! 🎉</h1>
              <p className="text-gray-500">تم تسجيلك في الكورس. جاري التحويل...</p>
              <Link to="/my-courses" className="btn-primary btn w-full">الذهاب لكورساتي</Link>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
                <Clock className="w-8 h-8 text-orange-500" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">في انتظار الدفع</h1>
              <p className="text-gray-600 text-sm leading-relaxed">
                اذهب لأقرب فرع فوري وأعطِ الكاشير رقم المرجع التالي:
              </p>

              {/* Reference number */}
              <div className="bg-gray-50 rounded-2xl p-4 border-2 border-dashed border-primary/30">
                <p className="text-xs text-gray-500 mb-1">رقم المرجع</p>
                <div className="flex items-center justify-center gap-3">
                  <p className="text-3xl font-mono font-bold text-primary tracking-widest">
                    {result.referenceNumber}
                  </p>
                  <button onClick={() => copyToClipboard(result.referenceNumber)}
                    className="p-2 rounded-xl hover:bg-gray-200 transition-colors">
                    <Copy className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
                {result.expiresAt && (
                  <p className="text-xs text-red-500 mt-2">
                    ينتهي: {formatDate(result.expiresAt, 'dd/MM/yyyy HH:mm')}
                  </p>
                )}
              </div>

              {/* Instructions */}
              {result.instructions && (
                <div className="text-right space-y-2">
                  {result.instructions.map((step: string, i: number) => (
                    <p key={i} className="text-sm text-gray-600 flex items-start gap-2">
                      <span className="w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      {step}
                    </p>
                  ))}
                </div>
              )}

              {/* Amount */}
              {course && (
                <div className="bg-primary/5 rounded-xl p-3 flex justify-between text-sm">
                  <span className="text-gray-600">{course.title}</span>
                  <span className="font-bold text-primary">{formatCurrency(course.price, course.currency)}</span>
                </div>
              )}

              {/* Status indicator */}
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                {isRefetching ? (
                  <><Spinner size="sm" /> جاري التحقق من الدفع...</>
                ) : (
                  <><RefreshCw className="w-4 h-4" /> يتم التحقق تلقائياً كل 10 ثوانٍ</>
                )}
              </div>

              <div className="flex gap-2">
                <Link to="/payment-history" className="btn btn-secondary flex-1 text-sm text-center">سجل المدفوعات</Link>
                <Link to="/courses" className="btn btn-outline flex-1 text-sm text-center">تصفح الكورسات</Link>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Generic success / processing
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir="rtl">
      <div className="card w-full max-w-sm p-8 text-center space-y-5">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
          <Clock className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">جاري معالجة طلبك</h1>
        <p className="text-gray-500 text-sm">ستصلك إشعار بعد تأكيد الدفع</p>
        <Link to="/dashboard" className="btn-primary btn w-full">الذهاب للوحتي</Link>
      </div>
    </div>
  );
}
