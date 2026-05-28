import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'الاسم قصير جداً').max(100),
    phone: z
      .string()
      .regex(/^(01)[0-2,5]{1}[0-9]{8}$/, 'رقم الهاتف المصري غير صحيح'),
    password: z
      .string()
      .min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل')
      .regex(/[A-Z]/, 'يجب أن تحتوي على حرف كبير')
      .regex(/[0-9]/, 'يجب أن تحتوي على رقم'),
    email: z.string().email().optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    phone: z.string().min(1, 'رقم الهاتف مطلوب'),
    password: z.string().min(1, 'كلمة المرور مطلوبة'),
  }),
});

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1),
    newPassword: z
      .string()
      .min(8)
      .regex(/[A-Z]/)
      .regex(/[0-9]/),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    phone: z.string().regex(/^(01)[0-2,5]{1}[0-9]{8}$/),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1),
    password: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
  }),
});

export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];
