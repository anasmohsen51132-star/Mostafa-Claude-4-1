import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Phone, Lock } from 'lucide-react';
import { useState } from 'react';
import { useLogin } from '@/shared/hooks/useApi';
import { cn } from '@/shared/utils/cn';

const schema = z.object({
  phone: z.string().regex(/^(01)[0-2,5]{1}[0-9]{8}$/, 'رقم الهاتف غير صحيح'),
  password: z.string().min(6, 'كلمة المرور قصيرة جداً'),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const [showPass, setShowPass] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || '/dashboard';
  const login = useLogin();

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = (data: FormData) => {
    login.mutate(data, {
      onSuccess: (result) => {
        const isAdmin = result.user.role === 'ADMIN' || result.user.role === 'OWNER';
        navigate(isAdmin ? '/admin' : from, { replace: true });
      },
    });
  };

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">مرحباً بعودتك 👋</h1>
        <p className="text-gray-500 text-sm">سجّل دخولك للوصول إلى كورساتك</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {/* Phone */}
        <div>
          <label className="label">رقم الهاتف</label>
          <div className="relative">
            <Phone className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              {...register('phone')}
              type="tel"
              placeholder="01xxxxxxxxx"
              dir="ltr"
              className={cn('input pr-10 text-left placeholder:text-right', errors.phone && 'input-error')}
            />
          </div>
          {errors.phone && <p className="error-msg">{errors.phone.message}</p>}
        </div>

        {/* Password */}
        <div>
          <label className="label">كلمة المرور</label>
          <div className="relative">
            <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              {...register('password')}
              type={showPass ? 'text' : 'password'}
              placeholder="••••••••"
              className={cn('input pr-10 pl-10', errors.password && 'input-error')}
            />
            <button type="button" onClick={() => setShowPass(!showPass)}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && <p className="error-msg">{errors.password.message}</p>}
        </div>

        {/* Global error */}
        {login.error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
            {(login.error as any)?.response?.data?.error?.message || 'بيانات الدخول غير صحيحة'}
          </div>
        )}

        <button
          type="submit"
          disabled={login.isPending}
          className="btn-primary btn w-full btn-lg"
        >
          {login.isPending ? 'جاري الدخول...' : 'تسجيل الدخول'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        ليس لديك حساب؟{' '}
        <Link to="/auth/register" className="text-primary font-semibold hover:underline">
          إنشاء حساب مجاني
        </Link>
      </p>
    </div>
  );
}
