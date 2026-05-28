import { QueryClient } from '@tanstack/react-query';
import { getApiErrorMessage } from '@/shared/api/client';
import toast from 'react-hot-toast';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,       // 2 minutes
      gcTime: 1000 * 60 * 10,         // 10 minutes
      retry: (failureCount, error: any) => {
        // Don't retry 4xx errors (client errors)
        const status = error?.response?.status;
        if (status >= 400 && status < 500) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
      refetchOnMount: true,
    },
    mutations: {
      onError: (error) => {
        const message = getApiErrorMessage(error);
        toast.error(message);
      },
    },
  },
});

// Query key factory
export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  users: {
    all: ['users'] as const,
    list: (params: any) => ['users', 'list', params] as const,
    detail: (id: string) => ['users', id] as const,
    stats: ['users', 'me', 'stats'] as const,
  },
  courses: {
    all: ['courses'] as const,
    list: (params: any) => ['courses', 'list', params] as const,
    detail: (slug: string) => ['courses', 'slug', slug] as const,
    byId: (id: string) => ['courses', 'id', id] as const,
    categories: ['courses', 'categories'] as const,
    enrollments: ['courses', 'my-enrollments'] as const,
    access: (courseId: string) => ['courses', 'access', courseId] as const,
  },
  lectures: {
    byCourse: (courseId: string) => ['lectures', 'course', courseId] as const,
    detail: (id: string) => ['lectures', id] as const,
  },
  quizzes: {
    detail: (id: string) => ['quizzes', id] as const,
    history: (id: string) => ['quizzes', 'history', id] as const,
  },
  payments: {
    all: ['payments'] as const,
    my: (params: any) => ['payments', 'my', params] as const,
    detail: (id: string) => ['payments', id] as const,
  },
  notifications: {
    all: (params: any) => ['notifications', params] as const,
  },
  certificates: {
    my: ['certificates', 'my'] as const,
    verify: (number: string) => ['certificates', 'verify', number] as const,
  },
  admin: {
    stats: ['admin', 'stats'] as const,
    activity: ['admin', 'activity'] as const,
    revenueChart: (days: number) => ['admin', 'revenue-chart', days] as const,
    payments: (params: any) => ['admin', 'payments', params] as const,
    coupons: (params: any) => ['admin', 'coupons', params] as const,
    accessCodes: (params: any) => ['admin', 'access-codes', params] as const,
    webhooks: (params: any) => ['admin', 'webhooks', params] as const,
    auditLogs: (params: any) => ['admin', 'audit-logs', params] as const,
    analytics: ['admin', 'analytics'] as const,
  },
  homework: {
    byCourse: (courseId: string) => ['homework', 'course', courseId] as const,
    detail: (id: string) => ['homework', id] as const,
    submission: (homeworkId: string) => ['homework', 'submission', homeworkId] as const,
  },
} as const;
