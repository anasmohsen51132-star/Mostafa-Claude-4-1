import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { User, Phone, Mail, Lock, Eye, EyeOff, Save } from 'lucide-react';
import { useMe } from '@/shared/hooks/useApi';
import { usersApi } from '@/shared/api/endpoints';
import { authApi } from '@/shared/api/endpoints';
import { queryClient, queryKeys } from '@/shared/lib/queryClient';
import { useAuthStore } from '@/shared/stores/authStore';
import { getApiErrorMessage } from '@/shared/api/client';
import { Skeleton } from '@/shared/components/ui/PageLoader';
import { cn } from '@/shared/utils/cn';
import toast from 'react-hot-toast';

const profileSchema = z.object({
  name: z.string().min(2, 'الاسم قصير جداً').max(60),
  email: z.string().email('بريد غير صالح').optional().or(z.literal('')),
  bio: z.string().max(300).optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'مطلوب'),
  newPassword: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
  confirmPassword: z.string(),
}).refine(d => d.newPassword === d.confirmPassword, {
  message: 'كلمتا المرور غير متطابقتين', path: ['confirmPassword'],
});

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

export default function ProfilePage() {
  const { data: user, isLoading } = useMe();
  const { setUser } = useAuthStore();
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    values: { name: user?.name ?? '', email: user?.email ?? '', bio: user?.bio ?? '' },
  });

  const passwordForm = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });

  const onSaveProfile = async (data: ProfileForm) => {
    setSavingProfile(true);
    try {
      const res = await usersApi.updateMe(data);
      setUser(res.data.data);
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
      toast.success('تم حفظ التغييرات');
    } catch (err) { toast.error(getApiErrorMessage(err)); }
    finally { setSavingProfile(false); }
  };

  const onSavePassword = async (data: PasswordForm) => {
    setSavingPassword(true);
    try {
      await authApi.changePassword({ currentPassword: data.currentPassword, newPassword: data.newPassword });
      passwordForm.reset();
      toast.success('تم تغيير كلمة المرور');
    } catch (err) { toast.error(getApiErrorMessage(err)); }
    finally { setSavingPassword(false); }
  };

  if (isLoading) return <div className="space-y-4">{[1,2].map(i => <Skeleton key={i} className="h-48 rounded-2xl" />)}</div>;

  return (
    <div className="max-w-2xl space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">الملف الشخصي</h1>
        <p className="text-gray-500 mt-1">إدارة بياناتك الشخصية</p>
      </div>

      {/* Avatar section */}
      <div className="card p-6 flex items-center gap-5">
        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center flex-shrink-0">
          {user?.avatar
            ? <img src={user.avatar} className="w-16 h-16 rounded-2xl object-cover" alt="" />
            : <span className="text-3xl font-bold text-primary">{user?.name?.[0]}</span>
          }
        </div>
        <div>
          <p className="font-bold text-gray-900 text-lg">{user?.name}</p>
          <p className="text-sm text-gray-500 flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5" /> {user?.phone}
          </p>
          {user?.email && (
            <p className="text-sm text-gray-500 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" /> {user.email}
            </p>
          )}
        </div>
      </div>

      {/* Profile form */}
      <div className="card p-6">
        <h2 className="font-bold text-gray-900 mb-5 flex items-center gap-2">
          <User className="w-4 h-4 text-primary" /> البيانات الشخصية
        </h2>
        <form onSubmit={profileForm.handleSubmit(onSaveProfile)} className="space-y-4">
          <div>
            <label className="label">الاسم الكامل</label>
            <input {...profileForm.register('name')} className={cn('input', profileForm.formState.errors.name && 'input-error')} />
            {profileForm.formState.errors.name && <p className="error-msg">{profileForm.formState.errors.name.message}</p>}
          </div>
          <div>
            <label className="label">البريد الإلكتروني <span className="text-gray-400 font-normal">(اختياري)</span></label>
            <input {...profileForm.register('email')} type="email" dir="ltr" className="input text-left" />
          </div>
          <div>
            <label className="label">نبذة شخصية</label>
            <textarea {...profileForm.register('bio')} rows={3} placeholder="اكتب نبذة مختصرة عنك..." className="input resize-none" />
          </div>
          <button type="submit" disabled={savingProfile} className="btn-primary btn">
            <Save className="w-4 h-4" /> {savingProfile ? 'جاري الحفظ...' : 'حفظ التغييرات'}
          </button>
        </form>
      </div>

      {/* Password form */}
      <div className="card p-6">
        <h2 className="font-bold text-gray-900 mb-5 flex items-center gap-2">
          <Lock className="w-4 h-4 text-primary" /> تغيير كلمة المرور
        </h2>
        <form onSubmit={passwordForm.handleSubmit(onSavePassword)} className="space-y-4">
          {(['currentPassword', 'newPassword', 'confirmPassword'] as const).map((field) => (
            <div key={field}>
              <label className="label">
                {field === 'currentPassword' ? 'كلمة المرور الحالية' : field === 'newPassword' ? 'كلمة المرور الجديدة' : 'تأكيد كلمة المرور'}
              </label>
              <div className="relative">
                <input {...passwordForm.register(field)} type={showPass ? 'text' : 'password'}
                  className={cn('input pl-10', passwordForm.formState.errors[field] && 'input-error')} />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {passwordForm.formState.errors[field] && (
                <p className="error-msg">{passwordForm.formState.errors[field]?.message}</p>
              )}
            </div>
          ))}
          <button type="submit" disabled={savingPassword} className="btn-primary btn">
            <Lock className="w-4 h-4" /> {savingPassword ? 'جاري التغيير...' : 'تغيير كلمة المرور'}
          </button>
        </form>
      </div>
    </div>
  );
}
