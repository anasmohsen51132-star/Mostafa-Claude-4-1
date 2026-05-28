import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { useCreateCourse, useUpdateCourse, useCourseById, useCategories } from '@/shared/hooks/useApi';
import { useParams, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Spinner } from '@/shared/components/ui/PageLoader';
import { cn } from '@/shared/utils/cn';

const courseSchema = z.object({
  title: z.string().min(3, 'العنوان قصير جداً').max(200),
  description: z.string().min(10, 'الوصف قصير جداً'),
  shortDesc: z.string().max(300).optional(),
  price: z.coerce.number().min(0),
  originalPrice: z.coerce.number().min(0).optional(),
  categoryId: z.string().optional(),
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL_LEVELS']).optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  isFree: z.boolean().optional(),
  certificateEnabled: z.boolean().optional(),
  passingScore: z.coerce.number().min(50).max(100).optional(),
});

type CourseForm = z.infer<typeof courseSchema>;

// ── Create Modal ──────────────────────────────────────────────────
interface CreateModalProps { onClose: () => void; }

export function CreateCourseModal({ onClose }: CreateModalProps) {
  const create = useCreateCourse();
  const { data: categories } = useCategories();

  const { register, handleSubmit, formState: { errors } } = useForm<CourseForm>({
    resolver: zodResolver(courseSchema),
    defaultValues: { level: 'ALL_LEVELS', certificateEnabled: true, passingScore: 70 },
  });

  const onSubmit = (data: CourseForm) => {
    create.mutate(data, { onSuccess: () => onClose() });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">إضافة كورس جديد</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <CourseFormFields register={register} errors={errors} categories={categories} />
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">إلغاء</button>
            <button type="submit" disabled={create.isPending} className="btn btn-primary flex-1">
              {create.isPending ? <Spinner size="sm" /> : 'إنشاء الكورس'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Edit Page ─────────────────────────────────────────────────────
export default function AdminCourseEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: course, isLoading } = useCourseById(id!);
  const { data: categories } = useCategories();
  const update = useUpdateCourse();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CourseForm>({
    resolver: zodResolver(courseSchema),
  });

  useEffect(() => {
    if (course) {
      reset({
        title: course.title,
        description: course.description,
        shortDesc: course.shortDesc ?? '',
        price: Number(course.price),
        originalPrice: course.originalPrice ? Number(course.originalPrice) : undefined,
        categoryId: course.category?.id,
        level: course.level,
        icon: course.icon ?? '',
        color: course.color ?? '',
        isFree: course.isFree,
        certificateEnabled: course.certificateEnabled,
        passingScore: course.passingScore,
      });
    }
  }, [course]);

  const onSubmit = (data: CourseForm) => {
    update.mutate({ id: id!, data }, { onSuccess: () => navigate('/admin/courses') });
  };

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div className="max-w-2xl space-y-6" dir="rtl">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/admin/courses')} className="btn btn-ghost btn-sm">← رجوع</button>
        <h1 className="text-2xl font-bold text-gray-900">تعديل الكورس</h1>
      </div>
      <div className="card p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <CourseFormFields register={register} errors={errors} categories={categories} />
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => navigate('/admin/courses')} className="btn btn-secondary flex-1">إلغاء</button>
            <button type="submit" disabled={update.isPending} className="btn btn-primary flex-1">
              {update.isPending ? <Spinner size="sm" /> : 'حفظ التغييرات'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Shared form fields ────────────────────────────────────────────
function CourseFormFields({ register, errors, categories }: { register: any; errors: any; categories: any[] | undefined }) {
  return (
    <>
      <div>
        <label className="label">عنوان الكورس *</label>
        <input {...register('title')} className={cn('input', errors.title && 'input-error')} />
        {errors.title && <p className="error-msg">{errors.title.message}</p>}
      </div>
      <div>
        <label className="label">وصف مختصر</label>
        <input {...register('shortDesc')} className="input" placeholder="وصف يظهر في البطاقة" />
      </div>
      <div>
        <label className="label">الوصف الكامل *</label>
        <textarea {...register('description')} rows={4} className={cn('input resize-none', errors.description && 'input-error')} />
        {errors.description && <p className="error-msg">{errors.description.message}</p>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">السعر (جنيه) *</label>
          <input {...register('price')} type="number" min="0" className="input" />
        </div>
        <div>
          <label className="label">السعر الأصلي (قبل الخصم)</label>
          <input {...register('originalPrice')} type="number" min="0" className="input" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">الفئة</label>
          <select {...register('categoryId')} className="input">
            <option value="">بدون فئة</option>
            {categories?.map((c: any) => <option key={c.id} value={c.id}>{c.nameAr}</option>)}
          </select>
        </div>
        <div>
          <label className="label">المستوى</label>
          <select {...register('level')} className="input">
            {[['ALL_LEVELS','جميع المستويات'],['BEGINNER','مبتدئ'],['INTERMEDIATE','متوسط'],['ADVANCED','متقدم']].map(([v,l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">أيقونة (إيموجي)</label>
          <input {...register('icon')} className="input text-center" placeholder="📚" />
        </div>
        <div>
          <label className="label">لون الخلفية</label>
          <input {...register('color')} type="color" className="input h-[46px] p-1 cursor-pointer" defaultValue="#1A6B47" />
        </div>
      </div>
      <div>
        <label className="label">درجة النجاح في الاختبارات (%)</label>
        <input {...register('passingScore')} type="number" min="50" max="100" className="input w-32" />
      </div>
      <div className="flex gap-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input {...register('isFree')} type="checkbox" className="w-4 h-4 rounded text-primary" />
          <span className="text-sm text-gray-700">كورس مجاني</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input {...register('certificateEnabled')} type="checkbox" className="w-4 h-4 rounded text-primary" />
          <span className="text-sm text-gray-700">شهادة إتمام</span>
        </label>
      </div>
    </>
  );
}
