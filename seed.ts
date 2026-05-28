import { PrismaClient, UserRole, CourseStatus, CourseLevel, CouponType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ── Categories ────────────────────────────────────────────────
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { slug: 'arabic-grammar' },
      create: { name: 'Arabic Grammar', nameAr: 'النحو والصرف', slug: 'arabic-grammar', icon: '📖', sortOrder: 1 },
      update: {},
    }),
    prisma.category.upsert({
      where: { slug: 'quran-recitation' },
      create: { name: 'Quran Recitation', nameAr: 'تجويد القرآن', slug: 'quran-recitation', icon: '🕌', sortOrder: 2 },
      update: {},
    }),
    prisma.category.upsert({
      where: { slug: 'arabic-literature' },
      create: { name: 'Arabic Literature', nameAr: 'الأدب العربي', slug: 'arabic-literature', icon: '✍️', sortOrder: 3 },
      update: {},
    }),
    prisma.category.upsert({
      where: { slug: 'arabic-calligraphy' },
      create: { name: 'Calligraphy', nameAr: 'الخط العربي', slug: 'arabic-calligraphy', icon: '🖊️', sortOrder: 4 },
      update: {},
    }),
  ]);

  // ── Owner / Admin user ────────────────────────────────────────
  const ownerPassword = await bcrypt.hash(process.env.ADMIN_SEED_PASSWORD || 'Admin@1234!', 12);
  const owner = await prisma.user.upsert({
    where: { phone: '01000000000' },
    create: {
      name: 'مستر مصطفى',
      phone: '01000000000',
      email: process.env.ADMIN_SEED_EMAIL || 'owner@academy.com',
      passwordHash: ownerPassword,
      role: UserRole.OWNER,
      phoneVerified: true,
      emailVerified: true,
    },
    update: {},
  });

  const adminPassword = await bcrypt.hash('Admin@5678!', 12);
  await prisma.user.upsert({
    where: { phone: '01100000000' },
    create: {
      name: 'أحمد المدير',
      phone: '01100000000',
      email: 'admin@academy.com',
      passwordHash: adminPassword,
      role: UserRole.ADMIN,
      phoneVerified: true,
    },
    update: {},
  });

  // ── Test student ──────────────────────────────────────────────
  const studentPassword = await bcrypt.hash('Student@123!', 12);
  await prisma.user.upsert({
    where: { phone: '01200000000' },
    create: {
      name: 'محمد الطالب',
      phone: '01200000000',
      passwordHash: studentPassword,
      role: UserRole.STUDENT,
    },
    update: {},
  });

  // ── Sample courses ────────────────────────────────────────────
  const course1 = await prisma.course.upsert({
    where: { slug: 'arabic-grammar-basics' },
    create: {
      title: 'أساسيات النحو العربي',
      slug: 'arabic-grammar-basics',
      description: 'كورس شامل لتعلم قواعد النحو العربي من الصفر حتى الاحتراف. مناسب للمبتدئين والمتوسطين.',
      shortDesc: 'تعلم النحو العربي من الصفر',
      price: 299,
      originalPrice: 499,
      currency: 'EGP',
      level: CourseLevel.BEGINNER,
      status: CourseStatus.PUBLISHED,
      icon: '📖',
      color: '#1A6B47',
      isFeatured: true,
      certificateEnabled: true,
      passingScore: 70,
      categoryId: categories[0].id,
      publishedAt: new Date(),
      duration: 480,
      totalLectures: 20,
    },
    update: { status: CourseStatus.PUBLISHED },
  });

  // Sections for course 1
  const section1 = await prisma.section.upsert({
    where: { id: 'section-seed-1' },
    create: {
      id: 'section-seed-1',
      courseId: course1.id,
      title: 'مقدمة في علم النحو',
      sortOrder: 1,
    },
    update: {},
  });

  // Lectures
  await prisma.lecture.createMany({
    skipDuplicates: true,
    data: [
      { courseId: course1.id, sectionId: section1.id, title: 'مقدمة الكورس وأهدافه', sortOrder: 1, isFree: true, isPublished: true, videoDuration: 300 },
      { courseId: course1.id, sectionId: section1.id, title: 'ما هو علم النحو؟', sortOrder: 2, isFree: true, isPublished: true, videoDuration: 600 },
      { courseId: course1.id, sectionId: section1.id, title: 'المعرب والمبني', sortOrder: 3, isFree: false, isPublished: true, videoDuration: 900 },
      { courseId: course1.id, sectionId: section1.id, title: 'علامات الإعراب الأصلية', sortOrder: 4, isFree: false, isPublished: true, videoDuration: 1200 },
    ],
  });

  const course2 = await prisma.course.upsert({
    where: { slug: 'quran-tajweed-advanced' },
    create: {
      title: 'التجويد المتقدم - أحكام النون والميم',
      slug: 'quran-tajweed-advanced',
      description: 'كورس متخصص في أحكام التجويد المتقدمة - النون الساكنة والتنوين والميم الساكنة',
      shortDesc: 'إتقان أحكام التجويد المتقدمة',
      price: 399,
      originalPrice: 599,
      currency: 'EGP',
      level: CourseLevel.INTERMEDIATE,
      status: CourseStatus.PUBLISHED,
      icon: '🕌',
      color: '#C9A84C',
      isFeatured: true,
      certificateEnabled: true,
      categoryId: categories[1].id,
      publishedAt: new Date(),
      duration: 360,
      totalLectures: 15,
    },
    update: { status: CourseStatus.PUBLISHED },
  });

  // ── Sample Quiz ───────────────────────────────────────────────
  const quiz = await prisma.quiz.create({
    data: {
      courseId: course1.id,
      title: 'اختبار أساسيات النحو',
      description: 'اختبر معلوماتك في النحو العربي',
      passingScore: 70,
      timeLimit: 30,
      maxAttempts: 3,
      showAnswers: true,
      isPublished: true,
      questions: {
        create: [
          {
            text: 'ما هو المعرب في اللغة العربية؟',
            type: 'multiple_choice',
            options: [
              { id: 'a', text: 'ما يتغير آخره بتغير العوامل الداخلة عليه', isCorrect: true },
              { id: 'b', text: 'ما لا يتغير آخره', isCorrect: false },
              { id: 'c', text: 'ما يأتي دائماً مرفوعاً', isCorrect: false },
              { id: 'd', text: 'ما يأتي في أول الجملة', isCorrect: false },
            ],
            explanation: 'المعرب هو الاسم الذي يتغير آخره بحسب موقعه من الإعراب',
            points: 1,
            sortOrder: 1,
          },
          {
            text: 'ما هي علامات الرفع الأصلية؟',
            type: 'multiple_choice',
            options: [
              { id: 'a', text: 'الضمة', isCorrect: true },
              { id: 'b', text: 'الفتحة', isCorrect: false },
              { id: 'c', text: 'الكسرة', isCorrect: false },
              { id: 'd', text: 'السكون', isCorrect: false },
            ],
            points: 1,
            sortOrder: 2,
          },
          {
            text: 'الفعل الماضي مبني دائماً',
            type: 'true_false',
            correctAnswer: 'true',
            explanation: 'نعم، الفعل الماضي مبني دائماً على الفتح أو السكون أو الضم',
            points: 1,
            sortOrder: 3,
          },
        ],
      },
    },
  });

  // ── Sample Coupon ─────────────────────────────────────────────
  await prisma.coupon.upsert({
    where: { code: 'WELCOME25' },
    create: {
      code: 'WELCOME25',
      type: CouponType.PERCENTAGE,
      value: 25,
      usageLimit: 100,
      perUserLimit: 1,
      isGlobal: true,
      description: 'خصم 25% لأول طلب',
      createdBy: owner.id,
    },
    update: {},
  });

  await prisma.coupon.upsert({
    where: { code: 'SAVE50' },
    create: {
      code: 'SAVE50',
      type: CouponType.FIXED_AMOUNT,
      value: 50,
      usageLimit: 50,
      isGlobal: true,
      description: 'خصم 50 جنيه',
      createdBy: owner.id,
    },
    update: {},
  });

  // ── Site content ──────────────────────────────────────────────
  await prisma.siteContent.upsert({
    where: { key: 'landing' },
    create: {
      key: 'landing',
      value: {
        heroTitle: 'أكاديمية مستر مصطفى',
        heroSubtitle: 'لتعليم اللغة العربية',
        heroDescription: 'تعلم اللغة العربية بأسلوب عصري ومنهجية علمية متميزة',
        stats: [
          { label: 'طالب نشط', value: '5000+' },
          { label: 'كورس متخصص', value: '50+' },
          { label: 'ساعة تعليمية', value: '1000+' },
          { label: 'شهادة معتمدة', value: '2000+' },
        ],
        features: [
          { icon: '🎓', title: 'محتوى أكاديمي', desc: 'منهج علمي معتمد ومراجعة مستمرة' },
          { icon: '📱', title: 'تعلم في أي مكان', desc: 'متوافق مع جميع الأجهزة' },
          { icon: '🏆', title: 'شهادات معتمدة', desc: 'شهادات رقمية قابلة للتحقق' },
          { icon: '💬', title: 'دعم مستمر', desc: 'تواصل مع المدربين في أي وقت' },
        ],
      },
    },
    update: {},
  });

  console.log('✅ Database seeded successfully');
  console.log(`   Owner: 01000000000 / ${process.env.ADMIN_SEED_PASSWORD || 'Admin@1234!'}`);
  console.log('   Admin: 01100000000 / Admin@5678!');
  console.log('   Student: 01200000000 / Student@123!');
  console.log(`   Courses: ${course1.title}, ${course2.title}`);
  console.log(`   Quiz: ${quiz.title}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
