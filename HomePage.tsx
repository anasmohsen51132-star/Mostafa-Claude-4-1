import { Link } from 'react-router-dom';
import { ArrowLeft, Star, Users, BookOpen, Award, Play, CheckCircle } from 'lucide-react';
import { useCourses, useCategories } from '@/shared/hooks/useApi';
import { CourseCard } from '@/features/courses/components/CourseCard';
import { CardSkeleton } from '@/shared/components/ui/PageLoader';
import { formatNumber } from '@/shared/utils/format';

export default function HomePage() {
  const { data: coursesData, isLoading } = useCourses({ featured: 'true', limit: 6 });
  const { data: categories } = useCategories();

  const stats = [
    { icon: Users,    value: '5,000+', label: 'طالب نشط' },
    { icon: BookOpen, value: '50+',    label: 'كورس متخصص' },
    { icon: Play,     value: '1,000+', label: 'ساعة تعليمية' },
    { icon: Award,    value: '2,000+', label: 'شهادة مُصدَرة' },
  ];

  const features = [
    { icon: '🎓', title: 'محتوى أكاديمي', desc: 'منهج علمي معتمد بمراجعة مستمرة من أفضل الأساتذة' },
    { icon: '📱', title: 'تعلم في أي مكان', desc: 'متوافق مع جميع الأجهزة — موبايل، تابلت، لاب توب' },
    { icon: '🏆', title: 'شهادات معتمدة', desc: 'شهادات رقمية قابلة للتحقق والمشاركة' },
    { icon: '💬', title: 'دعم مستمر', desc: 'تواصل مع المدربين والمجتمع في أي وقت' },
  ];

  return (
    <div dir="rtl">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gold rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-white rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        </div>
        <div className="relative page-container py-20 sm:py-28">
          <div className="max-w-2xl">
            <span className="inline-block bg-gold/20 text-gold-300 text-sm font-semibold px-4 py-1.5 rounded-full mb-6">
              🌟 منصة تعليم اللغة العربية الأولى
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              أكاديمية{' '}
              <span className="text-gold">مستر مصطفى</span>
            </h1>
            <p className="text-lg sm:text-xl text-primary-100 mb-8 leading-relaxed">
              تعلم اللغة العربية بأسلوب عصري ومنهجية علمية متميزة. من النحو والصرف إلى التجويد والأدب العربي.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/courses" className="btn btn-gold btn-lg">
                استعرض الكورسات <ArrowLeft className="w-4 h-4 rtl-flip" />
              </Link>
              <Link to="/auth/register" className="btn btn-lg border-2 border-white/30 text-white hover:bg-white/10">
                ابدأ مجاناً
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────────────── */}
      <section className="bg-white border-b border-gray-100">
        <div className="page-container py-10">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {stats.map(({ icon: Icon, value, label }) => (
              <div key={label} className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-sm text-gray-500">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Categories ───────────────────────────────────────── */}
      {categories && categories.length > 0 && (
        <section className="section bg-gray-50">
          <div className="page-container">
            <h2 className="text-2xl font-bold text-gray-900 mb-8">تصفح حسب الفئة</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {categories.map((cat: any) => (
                <Link key={cat.id} to={`/courses?categoryId=${cat.id}`}
                  className="card-hover p-5 text-center no-underline group">
                  <span className="text-3xl mb-3 block">{cat.icon || '📚'}</span>
                  <p className="font-semibold text-gray-800 group-hover:text-primary transition-colors">{cat.nameAr}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Featured Courses ─────────────────────────────────── */}
      <section className="section bg-white">
        <div className="page-container">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-gray-900">الكورسات المميزة</h2>
            <Link to="/courses" className="btn btn-outline btn-sm">عرض الكل</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)
              : coursesData?.items?.map((course: any) => (
                  <CourseCard key={course.id} course={course} />
                ))
            }
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────── */}
      <section className="section bg-primary-50">
        <div className="page-container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">لماذا أكاديمية مستر مصطفى؟</h2>
            <p className="text-gray-500 max-w-xl mx-auto">نقدم تجربة تعليمية متكاملة تجمع بين الجودة والراحة والإتقان</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map(({ icon, title, desc }) => (
              <div key={title} className="card p-6 text-center">
                <span className="text-4xl mb-4 block">{icon}</span>
                <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="section bg-primary text-white text-center">
        <div className="page-container max-w-2xl">
          <h2 className="text-3xl font-bold mb-4">ابدأ رحلتك التعليمية اليوم</h2>
          <p className="text-primary-100 mb-8">انضم لأكثر من 5,000 طالب يتعلمون اللغة العربية مع مستر مصطفى</p>
          <Link to="/auth/register" className="btn btn-gold btn-lg inline-flex">
            إنشاء حساب مجاني <ArrowLeft className="w-4 h-4 rtl-flip" />
          </Link>
        </div>
      </section>
    </div>
  );
}
