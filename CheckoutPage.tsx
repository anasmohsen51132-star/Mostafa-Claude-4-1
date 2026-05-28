import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Tag, Key, CreditCard, Smartphone, Banknote, Check, AlertCircle, ArrowLeft } from 'lucide-react';
import { useCourse, useInitiatePayment, useValidateCoupon } from '@/shared/hooks/useApi';
import { accessCodesApi } from '@/shared/api/endpoints';
import { formatCurrency } from '@/shared/utils/format';
import { Skeleton, Spinner } from '@/shared/components/ui/PageLoader';
import { getApiErrorMessage } from '@/shared/api/client';
import { cn } from '@/shared/utils/cn';
import toast from 'react-hot-toast';

type Provider = 'FAWRY' | 'VODAFONE_CASH' | 'STRIPE';

const PROVIDERS = [
  { id: 'FAWRY' as Provider, label: 'فوري', icon: '🏪', desc: 'ادفع نقداً في أقرب فرع فوري' },
  { id: 'VODAFONE_CASH' as Provider, label: 'فودافون كاش', icon: '📱', desc: 'ادفع بمحفظة فودافون كاش' },
  { id: 'STRIPE' as Provider, label: 'بطاقة ائتمانية', icon: '💳', desc: 'Visa / Mastercard' },
];

export default function CheckoutPage() {
  const { courseSlug } = useParams<{ courseSlug: string }>();
  const navigate = useNavigate();
  const { data: course, isLoading } = useCourse(courseSlug!);
  const initPayment = useInitiatePayment();
  const validateCoupon = useValidateCoupon();

  const [provider, setProvider] = useState<Provider>('FAWRY');
  const [couponCode, setCouponCode] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [couponResult, setCouponResult] = useState<{ discountAmount: number; finalAmount: number; couponId: string } | null>(null);
  const [couponError, setCouponError] = useState('');
  const [applyingCode, setApplyingCode] = useState(false);
  const [accessCodeResult, setAccessCodeResult] = useState<any>(null);

  const originalPrice = Number(course?.price ?? 0);
  const finalPrice = couponResult?.finalAmount ?? originalPrice;

  const applyCoupon = async () => {
    if (!couponCode.trim() || !course) return;
    setCouponError('');
    validateCoupon.mutate(
      { code: couponCode.trim(), courseId: course.id, amount: originalPrice },
      {
        onSuccess: (r) => { setCouponResult(r); toast.success('تم تطبيق الكوبون!'); },
        onError: (err) => { setCouponError(getApiErrorMessage(err)); setCouponResult(null); },
      },
    );
  };

  const applyAccessCode = async () => {
    if (!accessCode.trim() || !course) return;
    setApplyingCode(true);
    try {
      const res = await accessCodesApi.redeem(accessCode.trim(), course.id);
      if (res.data.data.valid) {
        setAccessCodeResult(res.data.data);
        toast.success('تم التحقق من الكود! جاري التسجيل...');
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setApplyingCode(false);
    }
  };

  const handlePay = () => {
    if (!course) return;
    initPayment.mutate(
      {
        courseId: course.id,
        provider,
        couponCode: couponResult ? couponCode : undefined,
      },
      {
        onSuccess: (result) => {
          navigate('/payment-result', { state: { result, course, provider } });
        },
      },
    );
  };

  if (isLoading) return <div className="page-container py-10"><Skeleton className="h-96 rounded-2xl" /></div>;
  if (!course) return null;

  return (
    <div className="page-container py-8 max-w-4xl" dir="rtl">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-primary mb-6 transition-colors text-sm">
        <ArrowLeft className="w-4 h-4 rtl-flip" /> العودة
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Left: Payment options */}
        <div className="lg:col-span-3 space-y-6">
          <h1 className="text-2xl font-bold text-gray-900">إتمام عملية الشراء</h1>

          {/* Access code */}
          <div className="card p-5">
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Key className="w-4 h-4 text-primary" /> كود الوصول
            </h2>
            <div className="flex gap-2">
              <input
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                placeholder="XXXX-XXXX-XXXX"
                dir="ltr"
                className="input flex-1 text-left font-mono"
              />
              <button onClick={applyAccessCode} disabled={applyingCode || !accessCode.trim()} className="btn btn-secondary">
                {applyingCode ? <Spinner size="sm" /> : 'تطبيق'}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">لديك كود وصول مجاني؟ أدخله هنا للوصول الفوري</p>
          </div>

          {/* Coupon */}
          <div className="card p-5">
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Tag className="w-4 h-4 text-primary" /> كوبون الخصم
            </h2>
            {couponResult ? (
              <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl p-3">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700">كوبون: {couponCode.toUpperCase()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-green-700">- {formatCurrency(couponResult.discountAmount)}</span>
                  <button onClick={() => { setCouponResult(null); setCouponCode(''); }} className="text-gray-400 hover:text-gray-600">
                    ✕
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="أدخل كود الخصم"
                  className="input flex-1"
                />
                <button onClick={applyCoupon} disabled={validateCoupon.isPending || !couponCode.trim()} className="btn btn-secondary">
                  {validateCoupon.isPending ? <Spinner size="sm" /> : 'تطبيق'}
                </button>
              </div>
            )}
            {couponError && (
              <p className="text-red-500 text-xs mt-2 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {couponError}
              </p>
            )}
          </div>

          {/* Payment method */}
          <div className="card p-5">
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" /> طريقة الدفع
            </h2>
            <div className="space-y-2">
              {PROVIDERS.map((p) => (
                <button key={p.id} onClick={() => setProvider(p.id)}
                  className={cn('w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-right',
                    provider === p.id ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300')}>
                  <span className="text-2xl flex-shrink-0">{p.icon}</span>
                  <div className="flex-1">
                    <p className={cn('font-semibold', provider === p.id ? 'text-primary' : 'text-gray-800')}>{p.label}</p>
                    <p className="text-xs text-gray-500">{p.desc}</p>
                  </div>
                  <div className={cn('w-5 h-5 rounded-full border-2 flex-shrink-0',
                    provider === p.id ? 'border-primary bg-primary' : 'border-gray-300')} />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Order summary */}
        <div className="lg:col-span-2">
          <div className="card p-5 lg:sticky lg:top-24 space-y-4">
            <h2 className="font-bold text-gray-900">ملخص الطلب</h2>

            {/* Course */}
            <div className="flex gap-3 pb-4 border-b border-gray-100">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: course.color || '#1A6B47' }}>
                <span className="text-xl">{course.icon || '📚'}</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 leading-snug">{course.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{course.totalLectures} محاضرة</p>
              </div>
            </div>

            {/* Pricing */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">سعر الكورس</span>
                <span>{formatCurrency(originalPrice, course.currency)}</span>
              </div>
              {couponResult && (
                <div className="flex justify-between text-green-600">
                  <span>خصم الكوبون</span>
                  <span>- {formatCurrency(couponResult.discountAmount, course.currency)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-100">
                <span>الإجمالي</span>
                <span className="text-primary">{formatCurrency(finalPrice, course.currency)}</span>
              </div>
            </div>

            <button
              onClick={handlePay}
              disabled={initPayment.isPending || finalPrice <= 0}
              className="btn-primary btn w-full btn-lg"
            >
              {initPayment.isPending ? <Spinner size="sm" /> : `الدفع الآن — ${formatCurrency(finalPrice, course.currency)}`}
            </button>

            <p className="text-xs text-center text-gray-400">🔒 دفع آمن ومشفر</p>
          </div>
        </div>
      </div>
    </div>
  );
}
