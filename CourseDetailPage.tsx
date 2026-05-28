import { useParams, Link, useNavigate } from 'react-router-dom';
import { Star, Users, Clock, Play, Award, ChevronDown, ChevronUp, Lock, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { useCourse, useCourseAccess } from '@/shared/hooks/useApi';
import { useAuthStore } from '@/shared/stores/authStore';
import { formatCurrency, formatMinutes, formatDuration, levelLabels } from '@/shared/utils/format';
import { Skeleton, CourseStatusBadge } from '@/shared/components/ui/PageLoader';
import { cn } from '@/shared/utils/cn';

export default function CourseDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const { data: course, isLoading } = useCourse(slug!);
  const { data: accessData } = useCourseAccess(course?.id || '');
  const hasAccess = accessData?.hasAccess;

  if (isLoading) {
    return (
      <div className="page-container py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-48 w-full" />
          </div>
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!course) return null;

  const toggleSection = (id: string) =>
    setExpandedSections((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const totalLectures = course.sections?.reduce((s: number, sec: any) => s + sec.lectures.length, 0) ?? 0;
  const freeLectures = course.sections?.reduce(
    (s: number, sec: any) => s + sec.lectures.filter((l: any) => l.isFree).length, 0,
  ) ?? 0;

  return (
    <div className="page-container py-8" dir="rtl">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── Left: Course Info ─────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Breadcrumb */}
          <nav className="text-sm text-gray-500 flex items-center gap-2">
            <Link to="/courses" className="hover:text-primary">الكورسات</Link>
            <span>/</span>
            {course.category && <span>{course.category.nameAr}</span>}
          </nav>

          {/* Title */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              {course.category && (
                <span className="badge badge-primary">{course.category.nameAr}</span>
              )}
              <span className="badge badge-neutral">{levelLabels[course.level]}</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{course.title}</h1>
            <p className="text-gray-600 leading-relaxed">{course.shortDesc || course.description}</p>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            {course.rating > 0 && (
              <span className="flex items-center gap-1.5 text-gold-500 font-medium">
                <Star className="w-4 h-4 fill-current" /> {Number(course.rating).toFixed(1)}
                <span className="text-gray-400">({course.ratingCount})</span>
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-primary" /> {course.totalStudents} طالب
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-primary" /> {formatMinutes(course.duration)}
            </span>
            <span className="flex items-center gap-1.5">
              <Play className="w-4 h-4 text-primary" /> {totalLectures} محاضرة
            </span>
            {course.certificateEnabled && (
              <span className="flex items-center gap-1.5 text-green-600">
                <Award className="w-4 h-4" /> شهادة إتمام
              </span>
            )}
          </div>

          {/* Preview video */}
          {course.previewVideo && (
            <div className="rounded-2xl overflow-hidden bg-black aspect-video">
              <video src={course.previewVideo} controls className="w-full h-full" />
            </div>
          )}

          {/* Description */}
          <div className="card p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-3">عن الكورس</h2>
            <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{course.description}</p>
          </div>

          {/* Curriculum */}
          {course.sections && course.sections.length > 0 && (
            <div className="card overflow-hidden">
              <div className="p-5 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-900">المحتوى التعليمي</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {totalLectures} محاضرة · {freeLectures > 0 && `${freeLectures} مجانية · `}{formatMinutes(course.duration)}
                </p>
              </div>
              <div className="divide-y divide-gray-50">
                {course.sections.map((section: any) => (
                  <div key={section.id}>
                    <button
                      onClick={() => toggleSection(section.id)}
                      className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">{section.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{section.lectures.length} محاضرة</p>
                      </div>
                      {expandedSections.has(section.id)
                        ? <ChevronUp className="w-4 h-4 text-gray-400" />
                        : <ChevronDown className="w-4 h-4 text-gray-400" />
                      }
                    </button>
                    {expandedSections.has(section.id) && (
                      <div className="bg-gray-50/50 divide-y divide-gray-100">
                        {section.lectures.map((lecture: any) => (
                          <div key={lecture.id} className="flex items-center gap-3 px-6 py-3">
                            {lecture.isFree || hasAccess
                              ? <Play className="w-4 h-4 text-primary flex-shrink-0" />
                              : <Lock className="w-4 h-4 text-gray-300 flex-shrink-0" />
                            }
                            <span className={cn('text-sm flex-1 text-right', !lecture.isFree && !hasAccess && 'text-gray-400')}>
                              {lecture.title}
                            </span>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {lecture.isFree && (
                                <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded">مجاني</span>
                              )}
                              {lecture.videoDuration > 0 && (
                                <span className="text-xs text-gray-400">{formatDuration(lecture.videoDuration)}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Right: Sticky Enroll Card ─────────────────────── */}
        <div className="lg:col-span-1">
          <div className="card p-6 lg:sticky lg:top-24 space-y-5">
            {/* Thumbnail */}
            {course.thumbnail ? (
              <img src={course.thumbnail} alt={course.title}
                className="w-full h-44 object-cover rounded-xl" />
            ) : (
              <div className="w-full h-44 rounded-xl flex items-center justify-center"
                style={{ background: course.color || '#1A6B47' }}>
                <span className="text-5xl">{course.icon || '📚'}</span>
              </div>
            )}

            {/* Price */}
            {!hasAccess && (
              <div className="space-y-1">
                {course.isFree ? (
                  <p className="text-2xl font-bold text-green-600">مجاني 🎁</p>
                ) : (
                  <>
                    <p className="text-3xl font-bold text-gray-900">
                      {formatCurrency(course.price, course.currency)}
                    </p>
                    {course.originalPrice && Number(course.originalPrice) > Number(course.price) && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 line-through">{formatCurrency(course.originalPrice, course.currency)}</span>
                        <span className="badge badge-danger">
                          خصم {Math.round((1 - Number(course.price) / Number(course.originalPrice)) * 100)}%
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* CTA */}
            {hasAccess ? (
              <button
                onClick={() => {
                  const firstLecture = course.sections?.[0]?.lectures?.[0];
                  if (firstLecture) navigate(`/learn/${course.slug}/lecture/${firstLecture.id}`);
                }}
                className="btn-primary btn w-full btn-lg"
              >
                <Play className="w-4 h-4" /> استكمل التعلم
              </button>
            ) : isAuthenticated ? (
              <Link to={`/checkout/${course.slug}`} className="btn-primary btn w-full btn-lg text-center">
                {course.isFree ? 'الاشتراك المجاني' : 'اشترك الآن'}
              </Link>
            ) : (
              <Link to="/auth/register" state={{ from: `/courses/${course.slug}` }}
                className="btn-primary btn w-full btn-lg text-center">
                إنشاء حساب للاشتراك
              </Link>
            )}

            {/* Includes */}
            <div className="space-y-2 text-sm text-gray-600">
              {[
                { icon: Play,    label: `${totalLectures} محاضرة` },
                { icon: Clock,   label: formatMinutes(course.duration) },
                ...(course.certificateEnabled ? [{ icon: Award, label: 'شهادة إتمام' }] : []),
                { icon: CheckCircle, label: 'وصول مدى الحياة' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
