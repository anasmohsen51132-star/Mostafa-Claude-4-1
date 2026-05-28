import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from '@/shared/components/ui/ErrorBoundary';
import { ProtectedRoute, AdminRoute, GuestRoute } from '@/app/routes/RouteGuards';
import { AuthInitializer } from '@/app/providers/AuthInitializer';
import { PageLoader } from '@/shared/components/ui/PageLoader';

// Layouts (eager - small)
import { RootLayout } from '@/shared/components/layout/RootLayout';
import { DashboardLayout } from '@/shared/components/layout/DashboardLayout';
import { AdminLayout } from '@/shared/components/layout/AdminLayout';
import { AuthLayout } from '@/shared/components/layout/AuthLayout';

// Auth pages (lazy)
const LoginPage      = lazy(() => import('@/features/auth/pages/LoginPage'));
const RegisterPage   = lazy(() => import('@/features/auth/pages/RegisterPage'));

// Public pages (lazy)
const HomePage       = lazy(() => import('@/features/courses/pages/HomePage'));
const CoursesPage    = lazy(() => import('@/features/courses/pages/CoursesPage'));
const CourseDetail   = lazy(() => import('@/features/courses/pages/CourseDetailPage'));
const VerifyCert     = lazy(() => import('@/features/courses/pages/VerifyCertPage'));

// Student pages (lazy)
const StudentDashboard  = lazy(() => import('@/features/dashboard/pages/StudentDashboard'));
const MyCoursesPage     = lazy(() => import('@/features/dashboard/pages/MyCoursesPage'));
const LecturePlayer     = lazy(() => import('@/features/courses/pages/LecturePlayerPage'));
const QuizPage          = lazy(() => import('@/features/quiz/pages/QuizPage'));
const QuizResultPage    = lazy(() => import('@/features/quiz/pages/QuizResultPage'));
const HomeworkPage      = lazy(() => import('@/features/homework/pages/HomeworkPage'));
const CertificatesPage  = lazy(() => import('@/features/dashboard/pages/CertificatesPage'));
const NotificationsPage = lazy(() => import('@/features/dashboard/pages/NotificationsPage'));
const PaymentHistoryPage = lazy(() => import('@/features/payments/pages/PaymentHistoryPage'));
const ProfilePage       = lazy(() => import('@/features/profile/pages/ProfilePage'));
const CheckoutPage      = lazy(() => import('@/features/payments/pages/CheckoutPage'));
const PaymentResultPage = lazy(() => import('@/features/payments/pages/PaymentResultPage'));

// Admin pages (lazy)
const AdminDashboard      = lazy(() => import('@/features/admin/pages/AdminDashboard'));
const AdminCoursesPage    = lazy(() => import('@/features/admin/pages/AdminCoursesPage'));
const AdminCourseEdit     = lazy(() => import('@/features/admin/pages/AdminCourseEditPage'));
const AdminLecturesPage   = lazy(() => import('@/features/admin/pages/AdminLecturesPage'));
const AdminQuizBuilder    = lazy(() => import('@/features/admin/pages/AdminQuizBuilderPage'));
const AdminHomeworkBuilder = lazy(() => import('@/features/admin/pages/AdminHomeworkBuilderPage'));
const AdminUsersPage      = lazy(() => import('@/features/admin/pages/AdminUsersPage'));
const AdminPaymentsPage   = lazy(() => import('@/features/admin/pages/AdminPaymentsPage'));
const AdminCouponsPage    = lazy(() => import('@/features/admin/pages/AdminCouponsPage'));
const AdminAccessCodesPage = lazy(() => import('@/features/admin/pages/AdminAccessCodesPage'));
const AdminWebhooksPage   = lazy(() => import('@/features/admin/pages/AdminWebhooksPage'));
const AdminAnalyticsPage  = lazy(() => import('@/features/admin/pages/AdminAnalyticsPage'));
const AdminAuditPage      = lazy(() => import('@/features/admin/pages/AdminAuditPage'));

export default function App() {
  return (
    <AuthInitializer>
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Routes>

            {/* ── Auth Routes ──────────────────────────────────── */}
            <Route element={<AuthLayout />}>
              <Route element={<GuestRoute />}>
                <Route path="/auth/login"    element={<LoginPage />} />
                <Route path="/auth/register" element={<RegisterPage />} />
              </Route>
            </Route>

            {/* ── Public Routes ────────────────────────────────── */}
            <Route element={<RootLayout />}>
              <Route index element={<HomePage />} />
              <Route path="/courses"         element={<CoursesPage />} />
              <Route path="/courses/:slug"   element={<CourseDetail />} />
              <Route path="/verify/:number"  element={<VerifyCert />} />

              {/* ── Student Routes ──────────────────────────────── */}
              <Route element={<ProtectedRoute />}>
                <Route element={<DashboardLayout />}>
                  <Route path="/dashboard"           element={<StudentDashboard />} />
                  <Route path="/my-courses"          element={<MyCoursesPage />} />
                  <Route path="/certificates"        element={<CertificatesPage />} />
                  <Route path="/notifications"       element={<NotificationsPage />} />
                  <Route path="/payment-history"     element={<PaymentHistoryPage />} />
                  <Route path="/profile"             element={<ProfilePage />} />
                </Route>

                {/* Full-screen (no sidebar) */}
                <Route path="/learn/:courseSlug/lecture/:lectureId" element={<LecturePlayer />} />
                <Route path="/quiz/:quizId"          element={<QuizPage />} />
                <Route path="/quiz/:quizId/result/:attemptId" element={<QuizResultPage />} />
                <Route path="/homework/:homeworkId"  element={<HomeworkPage />} />
                <Route path="/checkout/:courseSlug"  element={<CheckoutPage />} />
                <Route path="/payment-result"        element={<PaymentResultPage />} />
              </Route>
            </Route>

            {/* ── Admin Routes ─────────────────────────────────── */}
            <Route element={<AdminRoute />}>
              <Route element={<AdminLayout />}>
                <Route path="/admin"                           element={<AdminDashboard />} />
                <Route path="/admin/analytics"                 element={<AdminAnalyticsPage />} />
                <Route path="/admin/courses"                   element={<AdminCoursesPage />} />
                <Route path="/admin/courses/:id/edit"          element={<AdminCourseEdit />} />
                <Route path="/admin/courses/:courseId/lectures" element={<AdminLecturesPage />} />
                <Route path="/admin/courses/:courseId/quizzes/:quizId" element={<AdminQuizBuilder />} />
                <Route path="/admin/courses/:courseId/homework/:homeworkId" element={<AdminHomeworkBuilder />} />
                <Route path="/admin/users"                     element={<AdminUsersPage />} />
                <Route path="/admin/payments"                  element={<AdminPaymentsPage />} />
                <Route path="/admin/coupons"                   element={<AdminCouponsPage />} />
                <Route path="/admin/access-codes"              element={<AdminAccessCodesPage />} />
                <Route path="/admin/webhooks"                  element={<AdminWebhooksPage />} />
                <Route path="/admin/audit"                     element={<AdminAuditPage />} />
              </Route>
            </Route>

            {/* ── Catch-all ────────────────────────────────────── */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </AuthInitializer>
  );
}
