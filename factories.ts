import bcrypt from 'bcryptjs';
import { PrismaClient, UserRole, CourseStatus } from '@prisma/client';

const prisma = new PrismaClient();

// ── User Factory ──────────────────────────────────────────────────
export async function createUser(overrides: {
  name?: string;
  phone?: string;
  email?: string;
  password?: string;
  role?: UserRole;
} = {}) {
  const passwordHash = await bcrypt.hash(overrides.password ?? 'Test@1234', 10);
  return prisma.user.create({
    data: {
      name: overrides.name ?? 'Test User',
      phone: overrides.phone ?? `010${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
      email: overrides.email,
      passwordHash,
      role: overrides.role ?? UserRole.STUDENT,
      status: 'ACTIVE',
    },
  });
}

export async function createAdmin(overrides: Parameters<typeof createUser>[0] = {}) {
  return createUser({ ...overrides, role: UserRole.ADMIN });
}

// ── Course Factory ────────────────────────────────────────────────
export async function createCourse(overrides: {
  title?: string;
  price?: number;
  status?: CourseStatus;
  isFree?: boolean;
} = {}) {
  const slug = `test-course-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  return prisma.course.create({
    data: {
      title: overrides.title ?? 'Test Course',
      slug,
      description: 'Test course description for automated testing',
      price: overrides.price ?? 299,
      currency: 'EGP',
      status: overrides.status ?? CourseStatus.PUBLISHED,
      isFree: overrides.isFree ?? false,
      certificateEnabled: true,
      passingScore: 70,
    },
  });
}

// ── Enrollment Factory ────────────────────────────────────────────
export async function createEnrollment(userId: string, courseId: string, paymentId?: string) {
  return prisma.enrollment.upsert({
    where: { userId_courseId: { userId, courseId } },
    create: { userId, courseId, paymentId, status: 'ACTIVE', source: 'test' },
    update: { status: 'ACTIVE' },
  });
}

// ── Payment Factory ───────────────────────────────────────────────
export async function createPayment(userId: string, courseId: string, overrides: {
  status?: string;
  provider?: string;
  amount?: number;
} = {}) {
  return prisma.payment.create({
    data: {
      userId,
      courseId,
      amount: overrides.amount ?? 299,
      currency: 'EGP',
      provider: (overrides.provider ?? 'FAWRY') as any,
      status: (overrides.status ?? 'PENDING') as any,
    },
  });
}

// ── Auth token helper ─────────────────────────────────────────────
import { tokenService } from '@/lib/tokens';

export async function getAuthToken(user: { id: string; role: UserRole; phone: string }) {
  const { accessToken } = await tokenService.issueTokenPair(user.id, user.role, user.phone);
  return accessToken;
}

export { prisma };
