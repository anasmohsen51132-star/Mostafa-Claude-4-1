// ================================================================
// Shared Frontend Types — mirrors Prisma schema
// ================================================================

export type UserRole = 'STUDENT' | 'INSTRUCTOR' | 'ADMIN' | 'OWNER';
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION' | 'DELETED';
export type CourseStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type CourseLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ALL_LEVELS';
export type EnrollmentStatus = 'ACTIVE' | 'COMPLETED' | 'REFUNDED' | 'EXPIRED';
export type PaymentProvider = 'STRIPE' | 'FAWRY' | 'VODAFONE_CASH' | 'INSTAPAY' | 'COUPON' | 'ACCESS_CODE';
export type PaymentStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'EXPIRED' | 'CANCELLED';
export type CouponType = 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_ACCESS';
export type CertificateStatus = 'PENDING' | 'ISSUED' | 'REVOKED';
export type HomeworkStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED';
export type SubmissionStatus = 'SUBMITTED' | 'GRADED' | 'RETURNED' | 'LATE';

// ── Core entities ─────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  role: UserRole;
  status: UserStatus;
  avatar?: string | null;
  bio?: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  _count?: {
    enrollments?: number;
    certificates?: number;
    payments?: number;
  };
}

export interface Category {
  id: string;
  name: string;
  nameAr: string;
  slug: string;
  icon?: string | null;
  description?: string | null;
  sortOrder: number;
}

export interface Course {
  id: string;
  title: string;
  titleAr?: string | null;
  slug: string;
  description: string;
  shortDesc?: string | null;
  thumbnail?: string | null;
  previewVideo?: string | null;
  price: number;
  originalPrice?: number | null;
  currency: string;
  level: CourseLevel;
  status: CourseStatus;
  language: string;
  duration: number;
  totalLectures: number;
  totalStudents: number;
  rating: number;
  ratingCount: number;
  icon?: string | null;
  color?: string | null;
  isFeatured: boolean;
  isFree: boolean;
  certificateEnabled: boolean;
  passingScore: number;
  category?: Category | null;
  sections?: Section[];
  quizzes?: Quiz[];
  enrollments?: Enrollment[];
  publishedAt?: string | null;
  createdAt: string;
}

export interface Section {
  id: string;
  courseId: string;
  title: string;
  titleAr?: string | null;
  sortOrder: number;
  lectures: Lecture[];
}

export interface Lecture {
  id: string;
  courseId: string;
  sectionId?: string | null;
  title: string;
  description?: string | null;
  videoUrl?: string | null;
  videoDuration: number;
  videoStatus: string;
  isFree: boolean;
  isPublished: boolean;
  sortOrder: number;
  viewCount?: number;
  progress?: Array<{ watchedSeconds: number; isCompleted: boolean }>;
}

export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  status: EnrollmentStatus;
  progress: number;
  completedAt?: string | null;
  expiresAt?: string | null;
  source?: string | null;
  createdAt: string;
  course?: Partial<Course>;
  _count?: { lectureProgress?: number };
}

export interface Payment {
  id: string;
  userId: string;
  courseId?: string | null;
  amount: number;
  currency: string;
  provider: PaymentProvider;
  status: PaymentStatus;
  providerRef?: string | null;
  fawryReferenceNumber?: string | null;
  couponCode?: string | null;
  discountAmount?: number | null;
  description?: string | null;
  errorMessage?: string | null;
  paidAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  user?: Partial<User>;
  invoice?: Invoice | null;
  refunds?: Refund[];
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  amount: number;
  tax: number;
  total: number;
  currency: string;
  pdfUrl?: string | null;
  issuedAt: string;
  paidAt?: string | null;
}

export interface Refund {
  id: string;
  paymentId: string;
  amount: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PROCESSED';
  createdAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  type: CouponType;
  status: 'ACTIVE' | 'EXPIRED' | 'DEPLETED' | 'DISABLED';
  value: number;
  usageLimit?: number | null;
  usageCount: number;
  perUserLimit: number;
  startsAt: string;
  expiresAt?: string | null;
  isGlobal: boolean;
  description?: string | null;
  createdAt: string;
  _count?: { usages?: number };
}

export interface Certificate {
  id: string;
  userId: string;
  courseId: string;
  enrollmentId: string;
  certificateNumber: string;
  status: CertificateStatus;
  pdfUrl?: string | null;
  issuedAt?: string | null;
  verifyUrl?: string | null;
  course?: Partial<Course>;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, any> | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
}

export interface Quiz {
  id: string;
  courseId: string;
  title: string;
  description?: string | null;
  passingScore: number;
  timeLimit?: number | null;
  maxAttempts?: number | null;
  randomizeQuestions: boolean;
  showAnswers: boolean;
  isPublished: boolean;
  questions?: Question[];
}

export interface Question {
  id: string;
  quizId: string;
  text: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer';
  options?: Array<{ id: string; text: string; isCorrect?: boolean }> | null;
  explanation?: string | null;
  points: number;
  sortOrder: number;
  imageUrl?: string | null;
  imageCaption?: string | null;
  images?: QuestionImage[];
}

export interface QuestionImage {
  id: string;
  url: string;
  caption?: string | null;
  sortOrder: number;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  userId: string;
  score: number;
  maxScore: number;
  passed: boolean;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
  startedAt: string;
  completedAt?: string | null;
  timeTaken?: number | null;
}

export interface Homework {
  id: string;
  courseId: string;
  lectureId?: string | null;
  title: string;
  description: string;
  instructions?: string | null;
  dueDate?: string | null;
  maxScore: number;
  status: HomeworkStatus;
  allowLate: boolean;
  imageUrl?: string | null;
  questions?: HomeworkQuestion[];
  createdAt: string;
}

export interface HomeworkQuestion {
  id: string;
  homeworkId: string;
  text: string;
  type: string;
  options?: any;
  explanation?: string | null;
  points: number;
  sortOrder: number;
  imageUrl?: string | null;
  imageCaption?: string | null;
  images?: Array<{ id: string; url: string; caption?: string | null }>;
}

export interface HomeworkSubmission {
  id: string;
  homeworkId: string;
  userId: string;
  status: SubmissionStatus;
  score?: number | null;
  maxScore?: number | null;
  feedback?: string | null;
  isLate: boolean;
  submittedAt: string;
  gradedAt?: string | null;
  answers?: HomeworkAnswer[];
}

export interface HomeworkAnswer {
  id: string;
  questionId: string;
  answer?: string | null;
  isCorrect?: boolean | null;
  points?: number | null;
  feedback?: string | null;
  imageUrls?: string[] | null;
}

// ── UI / form types ───────────────────────────────────────────────

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface SelectOption<T = string> {
  value: T;
  label: string;
  icon?: string;
  disabled?: boolean;
}

export type SortDirection = 'asc' | 'desc';

export interface TableColumn<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
  width?: string;
}
