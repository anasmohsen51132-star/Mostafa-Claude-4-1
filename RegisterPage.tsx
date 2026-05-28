import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Phone, Lock, User, Mail } from 'lucide-react';
import { useState } from 'react';
import { useRegister } from '@/shared/hooks/useApi';
import { cn } from '@/shared/utils/cn';

const schema = z.object({
  name: z.string().min(2, 'الاسم قصير جداً').max(60),
  phone: z.string().regex(/^(01)[0-2,5]{1}[0-9]{8}$/, 'رقم الهاتف المصري غير صحيح'),
  email: z.string().email('بريد إلكتروني غير صالح').optional().or(z.literal('')),
  password: z.string()
    .min(8, 'يجب أن تكون 8 أحرف على الأقل')
    .regex(/[A-Z]/, 'يجب أن تحتوي على حرف كبير')
    .regex(/[0-9]/, 'يجب أن تحتوي على رقم'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'كلمتا المرور غير متطابقتين',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const [showPass, setShowPass] = useState(false);
  const navigate = useNavigate();
  const register_ = useRegister();

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = ({ confirmPassword: _, ...data }: FormData) => {
    register_.mutate(
      { ...data, email: data.email || undefined },
      { onSuccess: () => navigate('/dashboard', { replace: true }) },
    );
  };

  return (
    <div>
      <div className="text-center mb-7">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">إنشاء حساب جديد</h1>
        <p className="text-gray-500 text-sm">ابدأ رحلتك التعليمية اليوم</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* Name */}
        <div>
          <label className="label">الاسم الكامل</label>
          <div className="relative">
            <User className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input {...register('name')} placeholder="محمد أحمد" className={cn('input pr-10', errors.name && 'input-error')} />
          </div>
          {errors.name && <p className="error-msg">{errors.name.message}</p>}
        </div>

        {/* Phone */}
        <div>
          <label className="label">رقم الهاتف</label>
          <div className="relative">
            <Phone className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input {...register('phone')} type="tel" placeholder="01xxxxxxxxx" dir="ltr"
              className={cn('input pr-10 text-left placeholder:text-right', errors.phone && 'input-error')} />
          </div>
          {errors.phone && <p className="error-msg">{errors.phone.message}</p>}
        </div>

        {/* Email (optional) */}
        <div>
          <label className="label">البريد الإلكتروني <span className="text-gray-400 font-normal">(اختياري)</span></label>
          <div className="relative">
            <Mail className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input {...register('email')} type="email" placeholder="example@email.com" dir="ltr"
              className={cn('input pr-10 text-left placeholder:text-right', errors.email && 'input-error')} />
          </div>
          {errors.email && <p className="error-msg">{errors.email.message}</p>}
        </div>

        {/* Password */}
        <div>
          <label className="label">كلمة المرور</label>
          <div className="relative">
            <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input {...register('password')} type={showPass ? 'text' : 'password'} placeholder="••••••••"
              className={cn('input pr-10 pl-10', errors.password && 'input-error')} />
            <button type="button" onClick={() => setShowPass(!showPass)}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && <p className="error-msg">{errors.password.message}</p>}
          <p className="text-xs text-gray-400 mt-1">8 أحرف على الأقل، حرف كبير ورقم</p>
        </div>

        {/* Confirm password */}
        <div>
          <label className="label">تأكيد كلمة المرور</label>
          <div className="relative">
            <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input {...register('confirmPassword')} type={showPass ? 'text' : 'password'} placeholder="••••••••"
              className={cn('input pr-10', errors.confirmPassword && 'input-error')} />
          </div>
          {errors.confirmPassword && <p className="error-msg">{errors.confirmPassword.message}</p>}
        </div>

        {register_.error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
            {(register_.error as any)?.response?.data?.error?.message || 'حدث خطأ في إنشاء الحساب'}
          </div>
        )}

        <button type="submit" disabled={register_.isPending} className="btn-primary btn w-full btn-lg mt-2">
          {register_.isPending ? 'جاري الإنشاء...' : 'إنشاء الحساب'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-5">
        لديك حساب بالفعل؟{' '}
        <Link to="/auth/login" className="text-primary font-semibold hover:underline">تسجيل الدخول</Link>
      </p>
    </div>
  );
}
