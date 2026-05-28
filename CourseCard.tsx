import { Link } from 'react-router-dom';
import { Star, Users, Clock, Play, CheckCircle } from 'lucide-react';
import { formatCurrency, formatMinutes, levelLabels } from '@/shared/utils/format';
import { CourseStatusBadge } from '@/shared/components/ui/PageLoader';
import type { Course } from '@/shared/types';

interface Props {
  course: Course & { enrollments?: any[] };
  showStatus?: boolean;
  showProgress?: boolean;
}

export function CourseCard({ course, showStatus = false, showProgress = false }: Props) {
  const enrollment = course.enrollments?.[0];
  const isEnrolled = enrollment?.status === 'ACTIVE' || enrollment?.status === 'COMPLETED';
  const progress = enrollment?.progress ?? 0;

  return (
    <Link
      to={`/courses/${course.slug}`}
      className="card-hover block no-underline group"
    >
      {/* Thumbnail */}
      <div className="relative overflow-hidden rounded-t-2xl">
        {course.thumbnail ? (
          <img
            src={course.thumbnail}
            alt={course.title}
            className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div
            className="w-full h-44 flex items-center justify-center"
            style={{ background: course.color || '#1A6B47' }}
          >
            <span className="text-5xl">{course.icon || '📚'}</span>
          </div>
        )}
        {course.isFeatured && (
          <span className="absolute top-3 right-3 badge badge-warning">مميز ⭐</span>
        )}
        {showStatus && (
          <div className="absolute top-3 left-3"><CourseStatusBadge status={course.status} /></div>
        )}
        {isEnrolled && (
          <div className="absolute top-3 left-3 bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> مسجّل
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {course.category && (
          <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
            {course.category.nameAr}
          </span>
        )}

        <h3 className="font-bold text-gray-900 text-base leading-snug group-hover:text-primary transition-colors line-clamp-2">
          {course.title}
        </h3>

        {/* Meta */}
        <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
          {course.rating > 0 && (
            <span className="flex items-center gap-1 text-gold-500">
              <Star className="w-3.5 h-3.5 fill-current" />
              {Number(course.rating).toFixed(1)}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" /> {course.totalStudents}
          </span>
          {course.duration > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> {formatMinutes(course.duration)}
            </span>
          )}
          <span className="badge badge-neutral text-xs">{levelLabels[course.level]}</span>
        </div>

        {/* Progress bar for enrolled */}
        {showProgress && isEnrolled && (
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>التقدم</span><span>{progress}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden progress-ltr">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {/* Price */}
        <div className="flex items-center justify-between pt-1 border-t border-gray-50">
          {isEnrolled ? (
            <span className="flex items-center gap-1.5 text-green-600 font-semibold text-sm">
              <Play className="w-4 h-4" /> استكمل التعلم
            </span>
          ) : course.isFree ? (
            <span className="text-green-600 font-bold text-sm">مجاني 🎁</span>
          ) : (
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-900">{formatCurrency(course.price, course.currency)}</span>
              {course.originalPrice && Number(course.originalPrice) > Number(course.price) && (
                <span className="text-xs text-gray-400 line-through">{formatCurrency(course.originalPrice, course.currency)}</span>
              )}
            </div>
          )}
          <span className="text-xs text-gray-400">{course.totalLectures} محاضرة</span>
        </div>
      </div>
    </Link>
  );
}
