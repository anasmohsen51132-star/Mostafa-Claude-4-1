import apiClient, { ApiResponse, PaginatedResponse } from './client';
import type {
  User, Course, Enrollment, Payment, Coupon, Notification,
  Certificate, Quiz, QuizAttempt, Homework, HomeworkSubmission,
} from '@/shared/types';

// ── Auth API ──────────────────────────────────────────────────────
export const authApi = {
  register: (data: { name: string; phone: string; password: string; email?: string }) =>
    apiClient.post<ApiResponse<{ user: User; accessToken: string; expiresIn: number }>>('/auth/register', data),

  login: (data: { phone: string; password: string }) =>
    apiClient.post<ApiResponse<{ user: User; accessToken: string; expiresIn: number }>>('/auth/login', data),

  logout: () => apiClient.post<ApiResponse<void>>('/auth/logout'),

  refresh: () => apiClient.post<ApiResponse<{ accessToken: string; expiresIn: number }>>('/auth/refresh'),

  me: () => apiClient.get<ApiResponse<User>>('/auth/me'),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    apiClient.patch<ApiResponse<void>>('/auth/change-password', data),
};

// ── Users API ─────────────────────────────────────────────────────
export const usersApi = {
  me: () => apiClient.get<ApiResponse<User>>('/users/me'),

  myStats: () => apiClient.get<ApiResponse<any>>('/users/me/stats'),

  updateMe: (data: Partial<Pick<User, 'name' | 'email' | 'bio' | 'avatar'>>) =>
    apiClient.patch<ApiResponse<User>>('/users/me', data),

  list: (params: Record<string, any>) =>
    apiClient.get<ApiResponse<PaginatedResponse<User>>>('/users', { params }),

  getById: (id: string) => apiClient.get<ApiResponse<User>>(`/users/${id}`),

  adminUpdate: (id: string, data: Partial<User>) =>
    apiClient.patch<ApiResponse<User>>(`/users/${id}`, data),

  delete: (id: string) => apiClient.delete<ApiResponse<void>>(`/users/${id}`),
};

// ── Courses API ───────────────────────────────────────────────────
export const coursesApi = {
  list: (params?: Record<string, any>) =>
    apiClient.get<ApiResponse<PaginatedResponse<Course>>>('/courses', { params }),

  getBySlug: (slug: string) =>
    apiClient.get<ApiResponse<Course>>(`/courses/slug/${slug}`),

  getById: (id: string) => apiClient.get<ApiResponse<Course>>(`/courses/${id}`),

  create: (data: Partial<Course>) =>
    apiClient.post<ApiResponse<Course>>('/courses', data),

  update: (id: string, data: Partial<Course>) =>
    apiClient.patch<ApiResponse<Course>>(`/courses/${id}`, data),

  delete: (id: string) => apiClient.delete<ApiResponse<void>>(`/courses/${id}`),

  categories: () => apiClient.get<ApiResponse<any[]>>('/courses/categories'),

  myEnrollments: () =>
    apiClient.get<ApiResponse<Enrollment[]>>('/courses/my-enrollments'),

  checkAccess: (courseId: string) =>
    apiClient.get<ApiResponse<{ hasAccess: boolean }>>(`/courses/${courseId}/access`),

  updateProgress: (courseId: string, data: { lectureId: string; watchedSeconds: number }) =>
    apiClient.post<ApiResponse<{ isCompleted: boolean }>>(`/courses/${courseId}/progress`, data),
};

// ── Lectures API ──────────────────────────────────────────────────
export const lecturesApi = {
  getCourseLectures: (courseId: string) =>
    apiClient.get<ApiResponse<any[]>>(`/lectures/course/${courseId}`),

  getLecture: (id: string) => apiClient.get<ApiResponse<any>>(`/lectures/${id}`),

  create: (data: any) => apiClient.post<ApiResponse<any>>('/lectures', data),

  update: (id: string, data: any) => apiClient.patch<ApiResponse<any>>(`/lectures/${id}`, data),

  delete: (id: string) => apiClient.delete<ApiResponse<void>>(`/lectures/${id}`),

  createSection: (data: any) => apiClient.post<ApiResponse<any>>('/lectures/sections', data),

  updateSection: (id: string, data: any) =>
    apiClient.patch<ApiResponse<any>>(`/lectures/sections/${id}`, data),

  deleteSection: (id: string) =>
    apiClient.delete<ApiResponse<void>>(`/lectures/sections/${id}`),

  reorder: (lectures: Array<{ id: string; sortOrder: number }>) =>
    apiClient.post<ApiResponse<void>>('/lectures/reorder', { lectures }),
};

// ── Quizzes API ───────────────────────────────────────────────────
export const quizzesApi = {
  get: (id: string) => apiClient.get<ApiResponse<Quiz>>(`/quizzes/${id}`),

  start: (id: string, enrollmentId?: string) =>
    apiClient.post<ApiResponse<QuizAttempt>>(`/quizzes/${id}/start`, { enrollmentId }),

  submit: (attemptId: string, answers: Array<{ questionId: string; answer: string }>) =>
    apiClient.post<ApiResponse<any>>(`/quizzes/attempts/${attemptId}/submit`, { answers }),

  history: (id: string) => apiClient.get<ApiResponse<QuizAttempt[]>>(`/quizzes/${id}/history`),

  create: (data: any) => apiClient.post<ApiResponse<Quiz>>('/quizzes', data),

  update: (id: string, data: any) => apiClient.patch<ApiResponse<Quiz>>(`/quizzes/${id}`, data),
};

// ── Payments API ──────────────────────────────────────────────────
export const paymentsApi = {
  initiate: (data: {
    courseId: string;
    provider: 'STRIPE' | 'FAWRY' | 'VODAFONE_CASH';
    couponCode?: string;
    accessCode?: string;
  }) => apiClient.post<ApiResponse<any>>('/payments', data),

  get: (id: string) => apiClient.get<ApiResponse<Payment>>(`/payments/${id}`),

  myPayments: (params?: Record<string, any>) =>
    apiClient.get<ApiResponse<PaginatedResponse<Payment>>>('/payments/my', { params }),

  pollFawryStatus: (id: string) =>
    apiClient.get<ApiResponse<{ status: string; enrolled: boolean }>>(`/payments/${id}/fawry-status`),
};

// ── Coupons API ───────────────────────────────────────────────────
export const couponsApi = {
  validate: (data: { code: string; courseId: string; amount: number }) =>
    apiClient.post<ApiResponse<{ couponId: string; discountAmount: number; finalAmount: number }>>('/coupons/validate', data),
};

// ── Access Codes API ──────────────────────────────────────────────
export const accessCodesApi = {
  redeem: (code: string, courseId?: string) =>
    apiClient.post<ApiResponse<{ valid: boolean; courseId: string }>>('/access-codes/redeem', { code, courseId }),
};

// ── Notifications API ─────────────────────────────────────────────
export const notificationsApi = {
  list: (params?: Record<string, any>) =>
    apiClient.get<ApiResponse<{ notifications: Notification[]; total: number; unreadCount: number }>>('/notifications', { params }),

  markRead: (id: string) => apiClient.patch<ApiResponse<void>>(`/notifications/${id}/read`),

  markAllRead: () => apiClient.post<ApiResponse<void>>('/notifications/mark-all-read'),

  delete: (id: string) => apiClient.delete<ApiResponse<void>>(`/notifications/${id}`),
};

// ── Certificates API ──────────────────────────────────────────────
export const certificatesApi = {
  my: () => apiClient.get<ApiResponse<Certificate[]>>('/certificates/my'),

  verify: (number: string) =>
    apiClient.get<ApiResponse<{ valid: boolean; certificate: Certificate }>>(`/certificates/verify/${number}`),

  revoke: (id: string, reason: string) =>
    apiClient.post<ApiResponse<Certificate>>(`/certificates/${id}/revoke`, { reason }),
};

// ── Admin API ─────────────────────────────────────────────────────
export const adminApi = {
  stats: () => apiClient.get<ApiResponse<any>>('/admin/stats'),

  activity: () => apiClient.get<ApiResponse<any>>('/admin/activity'),

  revenueChart: (days?: number) =>
    apiClient.get<ApiResponse<any[]>>('/admin/revenue-chart', { params: { days } }),

  payments: (params?: Record<string, any>) =>
    apiClient.get<ApiResponse<PaginatedResponse<Payment>>>('/admin/payments', { params }),

  refund: (paymentId: string, amount: number, reason: string) =>
    apiClient.post<ApiResponse<any>>(`/admin/payments/${paymentId}/refund`, { amount, reason }),

  webhookEvents: (params?: Record<string, any>) =>
    apiClient.get<ApiResponse<PaginatedResponse<any>>>('/admin/webhook-events', { params }),

  coupons: (params?: Record<string, any>) =>
    apiClient.get<ApiResponse<PaginatedResponse<Coupon>>>('/admin/coupons', { params }),

  createCoupon: (data: any) => apiClient.post<ApiResponse<Coupon>>('/admin/coupons', data),

  bulkCoupons: (data: any) => apiClient.post<ApiResponse<any>>('/admin/coupons/bulk', data),

  deleteCoupon: (id: string) => apiClient.delete<ApiResponse<void>>(`/admin/coupons/${id}`),

  accessCodes: (params?: Record<string, any>) =>
    apiClient.get<ApiResponse<PaginatedResponse<any>>>('/admin/access-codes', { params }),

  generateAccessCodes: (data: any) =>
    apiClient.post<ApiResponse<any>>('/admin/access-codes/generate', data),

  auditLogs: (params?: Record<string, any>) =>
    apiClient.get<ApiResponse<PaginatedResponse<any>>>('/admin/audit-logs', { params }),

  analytics: () => apiClient.get<ApiResponse<any>>('/analytics/overview'),
};

// ── Homework API ──────────────────────────────────────────────────
export const homeworkApi = {
  list: (courseId: string) =>
    apiClient.get<ApiResponse<Homework[]>>(`/homework?courseId=${courseId}`),

  get: (id: string) => apiClient.get<ApiResponse<Homework>>(`/homework/${id}`),

  create: (data: any) => apiClient.post<ApiResponse<Homework>>('/homework', data),

  update: (id: string, data: any) => apiClient.patch<ApiResponse<Homework>>(`/homework/${id}`, data),

  submit: (homeworkId: string, data: any) =>
    apiClient.post<ApiResponse<HomeworkSubmission>>(`/homework/${homeworkId}/submit`, data),

  getSubmission: (homeworkId: string) =>
    apiClient.get<ApiResponse<HomeworkSubmission>>(`/homework/${homeworkId}/my-submission`),

  grade: (submissionId: string, data: { score: number; feedback?: string }) =>
    apiClient.post<ApiResponse<HomeworkSubmission>>(`/homework/submissions/${submissionId}/grade`, data),

  uploadQuestionImage: (formData: FormData) =>
    apiClient.post<ApiResponse<{ url: string; key: string }>>('/media/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

// ── Media API ─────────────────────────────────────────────────────
export const mediaApi = {
  uploadThumbnail: (formData: FormData) =>
    apiClient.post<ApiResponse<{ url: string; key: string }>>('/media/thumbnail', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  getPresignedUrl: (data: { filename: string; contentType: string; folder: string }) =>
    apiClient.post<ApiResponse<{ presignedUrl: string; key: string }>>('/media/presigned-url', data),

  upload: (formData: FormData, onProgress?: (pct: number) => void) =>
    apiClient.post<ApiResponse<{ url: string; key: string; cdnUrl?: string }>>('/media/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded * 100) / e.total));
      },
    }),
};
