import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { queryKeys } from '@/shared/lib/queryClient';
import {
  authApi, usersApi, coursesApi, lecturesApi, quizzesApi,
  paymentsApi, couponsApi, notificationsApi, certificatesApi,
  adminApi, homeworkApi,
} from '@/shared/api/endpoints';
import { useAuthStore } from '@/shared/stores/authStore';
import toast from 'react-hot-toast';

// ── Auth hooks ────────────────────────────────────────────────────
export function useMe() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: () => authApi.me().then((r) => r.data.data),
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5,
  });
}

export function useLogin() {
  const { setAuth } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { phone: string; password: string }) =>
      authApi.login(data).then((r) => r.data.data),
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken, data.expiresIn);
      qc.setQueryData(queryKeys.auth.me, data.user);
      toast.success('مرحباً بعودتك! 👋');
    },
  });
}

export function useRegister() {
  const { setAuth } = useAuthStore();
  return useMutation({
    mutationFn: (data: { name: string; phone: string; password: string; email?: string }) =>
      authApi.register(data).then((r) => r.data.data),
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken, data.expiresIn);
      toast.success('تم إنشاء الحساب بنجاح! 🎉');
    },
  });
}

export function useLogout() {
  const { logout } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      logout();
      qc.clear();
      window.location.href = '/auth/login';
    },
  });
}

// ── Course hooks ──────────────────────────────────────────────────
export function useCourses(params?: Record<string, any>) {
  return useQuery({
    queryKey: queryKeys.courses.list(params),
    queryFn: () => coursesApi.list(params).then((r) => r.data.data),
    placeholderData: keepPreviousData,
  });
}

export function useCourse(slug: string) {
  return useQuery({
    queryKey: queryKeys.courses.detail(slug),
    queryFn: () => coursesApi.getBySlug(slug).then((r) => r.data.data),
    enabled: !!slug,
  });
}

export function useCourseById(id: string) {
  return useQuery({
    queryKey: queryKeys.courses.byId(id),
    queryFn: () => coursesApi.getById(id).then((r) => r.data.data),
    enabled: !!id,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.courses.categories,
    queryFn: () => coursesApi.categories().then((r) => r.data.data),
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

export function useMyEnrollments() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: queryKeys.courses.enrollments,
    queryFn: () => coursesApi.myEnrollments().then((r) => r.data.data),
    enabled: isAuthenticated,
  });
}

export function useCourseAccess(courseId: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: queryKeys.courses.access(courseId),
    queryFn: () => coursesApi.checkAccess(courseId).then((r) => r.data.data),
    enabled: isAuthenticated && !!courseId,
  });
}

export function useCreateCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => coursesApi.create(data).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.courses.all });
      toast.success('تم إنشاء الكورس بنجاح');
    },
  });
}

export function useUpdateCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      coursesApi.update(id, data).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.courses.all });
      toast.success('تم تحديث الكورس');
    },
  });
}

export function useUpdateProgress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ courseId, lectureId, watchedSeconds }: { courseId: string; lectureId: string; watchedSeconds: number }) =>
      coursesApi.updateProgress(courseId, { lectureId, watchedSeconds }).then((r) => r.data.data),
    onSuccess: (data) => {
      if (data.isCompleted) {
        qc.invalidateQueries({ queryKey: queryKeys.courses.enrollments });
        qc.invalidateQueries({ queryKey: queryKeys.certificates.my });
      }
    },
  });
}

// ── Lecture hooks ─────────────────────────────────────────────────
export function useCourseLectures(courseId: string) {
  return useQuery({
    queryKey: queryKeys.lectures.byCourse(courseId),
    queryFn: () => lecturesApi.getCourseLectures(courseId).then((r) => r.data.data),
    enabled: !!courseId,
  });
}

export function useCreateLecture() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => lecturesApi.create(data).then((r) => r.data.data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.lectures.byCourse(vars.courseId) });
      toast.success('تم إضافة المحاضرة');
    },
  });
}

export function useUpdateLecture() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      lecturesApi.update(id, data).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.lectures.byCourse('') });
      toast.success('تم تحديث المحاضرة');
    },
  });
}

// ── Quiz hooks ────────────────────────────────────────────────────
export function useQuiz(id: string) {
  return useQuery({
    queryKey: queryKeys.quizzes.detail(id),
    queryFn: () => quizzesApi.get(id).then((r) => r.data.data),
    enabled: !!id,
  });
}

export function useQuizHistory(id: string) {
  return useQuery({
    queryKey: queryKeys.quizzes.history(id),
    queryFn: () => quizzesApi.history(id).then((r) => r.data.data),
    enabled: !!id,
  });
}

export function useStartQuiz() {
  return useMutation({
    mutationFn: ({ id, enrollmentId }: { id: string; enrollmentId?: string }) =>
      quizzesApi.start(id, enrollmentId).then((r) => r.data.data),
  });
}

export function useSubmitQuiz() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ attemptId, answers }: { attemptId: string; answers: any[] }) =>
      quizzesApi.submit(attemptId, answers).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.certificates.my });
    },
  });
}

// ── Payment hooks ─────────────────────────────────────────────────
export function useMyPayments(params?: Record<string, any>) {
  return useQuery({
    queryKey: queryKeys.payments.my(params),
    queryFn: () => paymentsApi.myPayments(params).then((r) => r.data.data),
    placeholderData: keepPreviousData,
  });
}

export function useInitiatePayment() {
  return useMutation({
    mutationFn: (data: any) => paymentsApi.initiate(data).then((r) => r.data.data),
  });
}

export function usePollFawryStatus(paymentId: string, enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.payments.detail(paymentId), 'fawry'],
    queryFn: () => paymentsApi.pollFawryStatus(paymentId).then((r) => r.data.data),
    enabled: enabled && !!paymentId,
    refetchInterval: (query) => {
      const data = query.state.data as any;
      if (data?.status === 'PAID' || data?.status === 'COMPLETED') return false;
      return 10_000; // poll every 10s
    },
  });
}

export function useValidateCoupon() {
  return useMutation({
    mutationFn: (data: { code: string; courseId: string; amount: number }) =>
      couponsApi.validate(data).then((r) => r.data.data),
  });
}

// ── Notification hooks ────────────────────────────────────────────
export function useNotifications(params?: Record<string, any>) {
  return useQuery({
    queryKey: queryKeys.notifications.all(params),
    queryFn: () => notificationsApi.list(params).then((r) => r.data.data),
    refetchInterval: 30_000, // poll every 30s
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

// ── Certificate hooks ─────────────────────────────────────────────
export function useMyCertificates() {
  return useQuery({
    queryKey: queryKeys.certificates.my,
    queryFn: () => certificatesApi.my().then((r) => r.data.data),
  });
}

export function useVerifyCertificate(number: string) {
  return useQuery({
    queryKey: queryKeys.certificates.verify(number),
    queryFn: () => certificatesApi.verify(number).then((r) => r.data.data),
    enabled: !!number,
  });
}

// ── Admin hooks ───────────────────────────────────────────────────
export function useAdminStats() {
  return useQuery({
    queryKey: queryKeys.admin.stats,
    queryFn: () => adminApi.stats().then((r) => r.data.data),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useAdminActivity() {
  return useQuery({
    queryKey: queryKeys.admin.activity,
    queryFn: () => adminApi.activity().then((r) => r.data.data),
    staleTime: 30_000,
  });
}

export function useRevenueChart(days = 30) {
  return useQuery({
    queryKey: queryKeys.admin.revenueChart(days),
    queryFn: () => adminApi.revenueChart(days).then((r) => r.data.data),
  });
}

export function useAdminPayments(params?: Record<string, any>) {
  return useQuery({
    queryKey: queryKeys.admin.payments(params),
    queryFn: () => adminApi.payments(params).then((r) => r.data.data),
    placeholderData: keepPreviousData,
  });
}

export function useAdminCoupons(params?: Record<string, any>) {
  return useQuery({
    queryKey: queryKeys.admin.coupons(params),
    queryFn: () => adminApi.coupons(params).then((r) => r.data.data),
    placeholderData: keepPreviousData,
  });
}

export function useCreateCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => adminApi.createCoupon(data).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'coupons'] });
      toast.success('تم إنشاء الكوبون بنجاح');
    },
  });
}

export function useAdminAccessCodes(params?: Record<string, any>) {
  return useQuery({
    queryKey: queryKeys.admin.accessCodes(params),
    queryFn: () => adminApi.accessCodes(params).then((r) => r.data.data),
    placeholderData: keepPreviousData,
  });
}

export function useGenerateAccessCodes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => adminApi.generateAccessCodes(data).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'access-codes'] });
      toast.success('تم توليد أكواد الوصول');
    },
  });
}

export function useWebhookEvents(params?: Record<string, any>) {
  return useQuery({
    queryKey: queryKeys.admin.webhooks(params),
    queryFn: () => adminApi.webhookEvents(params).then((r) => r.data.data),
    placeholderData: keepPreviousData,
  });
}

export function useAuditLogs(params?: Record<string, any>) {
  return useQuery({
    queryKey: queryKeys.admin.auditLogs(params),
    queryFn: () => adminApi.auditLogs(params).then((r) => r.data.data),
    placeholderData: keepPreviousData,
  });
}

// ── Homework hooks ────────────────────────────────────────────────
export function useCourseHomework(courseId: string) {
  return useQuery({
    queryKey: queryKeys.homework.byCourse(courseId),
    queryFn: () => homeworkApi.list(courseId).then((r) => r.data.data),
    enabled: !!courseId,
  });
}

export function useHomework(id: string) {
  return useQuery({
    queryKey: queryKeys.homework.detail(id),
    queryFn: () => homeworkApi.get(id).then((r) => r.data.data),
    enabled: !!id,
  });
}

export function useSubmitHomework() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ homeworkId, data }: { homeworkId: string; data: any }) =>
      homeworkApi.submit(homeworkId, data).then((r) => r.data.data),
    onSuccess: (_, { homeworkId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.homework.submission(homeworkId) });
      toast.success('تم تسليم الواجب بنجاح');
    },
  });
}

export function useGradeSubmission() {
  return useMutation({
    mutationFn: ({ submissionId, data }: { submissionId: string; data: any }) =>
      homeworkApi.grade(submissionId, data).then((r) => r.data.data),
    onSuccess: () => toast.success('تم تصحيح الواجب'),
  });
}
