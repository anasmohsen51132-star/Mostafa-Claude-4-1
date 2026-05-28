import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Trash2, Image, X, Save, Eye } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { quizzesApi, mediaApi } from '@/shared/api/endpoints';
import { queryKeys } from '@/shared/lib/queryClient';
import { Spinner } from '@/shared/components/ui/PageLoader';
import { getApiErrorMessage } from '@/shared/api/client';
import { cn } from '@/shared/utils/cn';
import toast from 'react-hot-toast';

type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer';

interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface QuestionDraft {
  id?: string;
  text: string;
  type: QuestionType;
  options: QuestionOption[];
  correctAnswer: string;
  explanation: string;
  points: number;
  imageUrl: string;
  imageCaption: string;
  images: Array<{ url: string; caption: string }>;
}

const blankQuestion = (): QuestionDraft => ({
  text: '',
  type: 'multiple_choice',
  options: [
    { id: 'a', text: '', isCorrect: true },
    { id: 'b', text: '', isCorrect: false },
    { id: 'c', text: '', isCorrect: false },
    { id: 'd', text: '', isCorrect: false },
  ],
  correctAnswer: '',
  explanation: '',
  points: 1,
  imageUrl: '',
  imageCaption: '',
  images: [],
});

export default function AdminQuizBuilderPage() {
  const { courseId, quizId } = useParams<{ courseId: string; quizId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const isNew = quizId === 'new';

  const { data: quiz, isLoading } = useQuery({
    queryKey: queryKeys.quizzes.detail(quizId!),
    queryFn: () => quizzesApi.get(quizId!).then(r => r.data.data),
    enabled: !isNew,
  });

  const [quizMeta, setQuizMeta] = useState({
    title: quiz?.title ?? '',
    description: quiz?.description ?? '',
    passingScore: quiz?.passingScore ?? 70,
    timeLimit: quiz?.timeLimit ?? '',
    maxAttempts: quiz?.maxAttempts ?? '',
    randomizeQuestions: quiz?.randomizeQuestions ?? false,
    showAnswers: quiz?.showAnswers ?? true,
  });

  const [questions, setQuestions] = useState<QuestionDraft[]>(
    quiz?.questions?.map(q => ({
      ...blankQuestion(),
      ...q,
      options: (q.options as QuestionOption[]) ?? blankQuestion().options,
      imageUrl: q.imageUrl ?? '',
      imageCaption: q.imageCaption ?? '',
      images: q.images ?? [],
    })) ?? [],
  );

  const [saving, setSaving] = useState(false);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingUploadIdx, setPendingUploadIdx] = useState<number | null>(null);

  const addQuestion = () => setQuestions(qs => [...qs, blankQuestion()]);
  const removeQuestion = (i: number) => setQuestions(qs => qs.filter((_, idx) => idx !== i));

  const updateQuestion = (i: number, patch: Partial<QuestionDraft>) =>
    setQuestions(qs => qs.map((q, idx) => idx === i ? { ...q, ...patch } : q));

  const updateOption = (qi: number, oi: number, patch: Partial<QuestionOption>) =>
    setQuestions(qs => qs.map((q, idx) => {
      if (idx !== qi) return q;
      const options = q.options.map((o, oidx) => oidx === oi ? { ...o, ...patch } : o);
      return { ...q, options };
    }));

  const setCorrectOption = (qi: number, optionId: string) =>
    setQuestions(qs => qs.map((q, idx) => {
      if (idx !== qi) return q;
      return { ...q, options: q.options.map(o => ({ ...o, isCorrect: o.id === optionId })) };
    }));

  const handleImageUpload = async (qi: number, file: File) => {
    setUploadingIdx(qi);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', 'quiz-images');
      const res = await mediaApi.upload(fd);
      const url = res.data.data.cdnUrl || res.data.data.url;
      updateQuestion(qi, { imageUrl: url });
      toast.success('تم رفع الصورة');
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setUploadingIdx(null);
    }
  };

  const handleSave = async () => {
    if (!quizMeta.title.trim()) { toast.error('عنوان الاختبار مطلوب'); return; }
    setSaving(true);
    try {
      const payload = {
        courseId,
        title: quizMeta.title,
        description: quizMeta.description || undefined,
        passingScore: Number(quizMeta.passingScore),
        timeLimit: quizMeta.timeLimit ? Number(quizMeta.timeLimit) : undefined,
        maxAttempts: quizMeta.maxAttempts ? Number(quizMeta.maxAttempts) : undefined,
        randomizeQuestions: quizMeta.randomizeQuestions,
        showAnswers: quizMeta.showAnswers,
        questions: questions.map((q, i) => ({
          text: q.text,
          type: q.type,
          options: q.type === 'multiple_choice' ? q.options : undefined,
          correctAnswer: q.type !== 'multiple_choice' ? q.correctAnswer : undefined,
          explanation: q.explanation || undefined,
          points: q.points,
          sortOrder: i,
          imageUrl: q.imageUrl || undefined,
          imageCaption: q.imageCaption || undefined,
        })),
      };

      if (isNew) {
        await quizzesApi.create(payload);
        toast.success('تم إنشاء الاختبار');
      } else {
        await quizzesApi.update(quizId!, payload);
        toast.success('تم حفظ الاختبار');
      }
      qc.invalidateQueries({ queryKey: queryKeys.quizzes.detail(quizId!) });
      navigate(`/admin/courses/${courseId}/edit`);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="btn btn-ghost btn-sm">← رجوع</button>
        <h1 className="text-xl font-bold text-gray-900">{isNew ? 'إنشاء اختبار جديد' : 'تعديل الاختبار'}</h1>
      </div>

      {/* Quiz metadata */}
      <div className="card p-6 space-y-4">
        <h2 className="font-bold text-gray-900">إعدادات الاختبار</h2>
        <div>
          <label className="label">عنوان الاختبار *</label>
          <input value={quizMeta.title} onChange={e => setQuizMeta(p => ({ ...p, title: e.target.value }))}
            className="input" placeholder="مثال: اختبار النحو الأساسي" />
        </div>
        <div>
          <label className="label">الوصف</label>
          <textarea value={quizMeta.description} onChange={e => setQuizMeta(p => ({ ...p, description: e.target.value }))}
            rows={2} className="input resize-none" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <label className="label">درجة النجاح (%)</label>
            <input type="number" min={0} max={100}
              value={quizMeta.passingScore}
              onChange={e => setQuizMeta(p => ({ ...p, passingScore: Number(e.target.value) }))}
              className="input" />
          </div>
          <div>
            <label className="label">الوقت (دقائق)</label>
            <input type="number" min={1}
              value={quizMeta.timeLimit}
              onChange={e => setQuizMeta(p => ({ ...p, timeLimit: e.target.value }))}
              placeholder="بلا حد" className="input" />
          </div>
          <div>
            <label className="label">أقصى محاولات</label>
            <input type="number" min={1}
              value={quizMeta.maxAttempts}
              onChange={e => setQuizMeta(p => ({ ...p, maxAttempts: e.target.value }))}
              placeholder="بلا حد" className="input" />
          </div>
        </div>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={quizMeta.randomizeQuestions}
              onChange={e => setQuizMeta(p => ({ ...p, randomizeQuestions: e.target.checked }))}
              className="w-4 h-4 rounded text-primary" />
            <span className="text-sm text-gray-700">ترتيب عشوائي للأسئلة</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={quizMeta.showAnswers}
              onChange={e => setQuizMeta(p => ({ ...p, showAnswers: e.target.checked }))}
              className="w-4 h-4 rounded text-primary" />
            <span className="text-sm text-gray-700">إظهار الإجابات بعد التسليم</span>
          </label>
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-4">
        {questions.map((q, qi) => (
          <div key={qi} className="card p-5 space-y-4">
            {/* Question header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 bg-primary text-white rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {qi + 1}
                </span>
                <select
                  value={q.type}
                  onChange={e => updateQuestion(qi, { type: e.target.value as QuestionType })}
                  className="input w-44 text-sm py-2"
                >
                  <option value="multiple_choice">اختيار متعدد</option>
                  <option value="true_false">صح / خطأ</option>
                  <option value="short_answer">إجابة قصيرة</option>
                </select>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="flex items-center gap-1">
                  <label className="text-xs text-gray-500">نقاط:</label>
                  <input type="number" min={1} value={q.points}
                    onChange={e => updateQuestion(qi, { points: Number(e.target.value) })}
                    className="input w-16 text-sm py-1.5 text-center" />
                </div>
                <button onClick={() => removeQuestion(qi)} className="btn btn-ghost btn-icon btn-sm text-red-400 hover:text-red-600 hover:bg-red-50">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Question text */}
            <div>
              <label className="label">نص السؤال *</label>
              <textarea value={q.text} onChange={e => updateQuestion(qi, { text: e.target.value })}
                rows={2} className="input resize-none" placeholder="اكتب السؤال هنا..." />
            </div>

            {/* Image section */}
            <div className="space-y-2">
              {q.imageUrl ? (
                <div className="relative inline-block">
                  <img src={q.imageUrl} alt="" className="max-h-40 rounded-xl border border-gray-200 object-cover" />
                  <button onClick={() => updateQuestion(qi, { imageUrl: '', imageCaption: '' })}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-600">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div>
                  <input
                    ref={pendingUploadIdx === qi ? fileInputRef : null}
                    type="file" accept="image/*" className="hidden"
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) handleImageUpload(qi, f);
                      e.target.value = '';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setPendingUploadIdx(qi);
                      // small delay to let ref update
                      setTimeout(() => fileInputRef.current?.click(), 50);
                    }}
                    disabled={uploadingIdx === qi}
                    className="btn btn-secondary btn-sm text-xs"
                  >
                    {uploadingIdx === qi ? <Spinner size="sm" /> : <><Image className="w-3.5 h-3.5" /> إضافة صورة للسؤال</>}
                  </button>
                </div>
              )}
              {q.imageUrl && (
                <input value={q.imageCaption} onChange={e => updateQuestion(qi, { imageCaption: e.target.value })}
                  placeholder="تعليق الصورة (اختياري)" className="input text-sm py-2" />
              )}
            </div>

            {/* MCQ options */}
            {q.type === 'multiple_choice' && (
              <div className="space-y-2">
                <label className="label">الخيارات</label>
                {q.options.map((opt, oi) => (
                  <div key={opt.id} className="flex items-center gap-2">
                    <button
                      onClick={() => setCorrectOption(qi, opt.id)}
                      className={cn('w-5 h-5 rounded-full border-2 flex-shrink-0 transition-colors',
                        opt.isCorrect ? 'border-primary bg-primary' : 'border-gray-300 hover:border-primary/50'
                      )}
                      title="اجعلها الإجابة الصحيحة"
                    />
                    <span className="text-sm text-gray-500 flex-shrink-0 w-4 font-medium">{String.fromCharCode(65 + oi)}.</span>
                    <input value={opt.text}
                      onChange={e => updateOption(qi, oi, { text: e.target.value })}
                      placeholder={`الخيار ${String.fromCharCode(65 + oi)}`}
                      className={cn('input flex-1 text-sm py-2', opt.isCorrect && 'border-primary/40 bg-primary/5')}
                    />
                  </div>
                ))}
                <p className="text-xs text-gray-400">انقر على الدائرة لتحديد الإجابة الصحيحة</p>
              </div>
            )}

            {/* True/False */}
            {q.type === 'true_false' && (
              <div>
                <label className="label">الإجابة الصحيحة</label>
                <div className="flex gap-3">
                  {[{ v: 'true', l: 'صح ✓' }, { v: 'false', l: 'خطأ ✗' }].map(({ v, l }) => (
                    <button key={v} onClick={() => updateQuestion(qi, { correctAnswer: v })}
                      className={cn('flex-1 py-3 rounded-xl border-2 font-bold transition-all',
                        q.correctAnswer === v ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-gray-600'
                      )}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Short answer */}
            {q.type === 'short_answer' && (
              <div>
                <label className="label">الإجابة النموذجية</label>
                <input value={q.correctAnswer} onChange={e => updateQuestion(qi, { correctAnswer: e.target.value })}
                  className="input" placeholder="الإجابة الصحيحة (للمقارنة التلقائية)" />
              </div>
            )}

            {/* Explanation */}
            <div>
              <label className="label">شرح الإجابة (اختياري)</label>
              <textarea value={q.explanation} onChange={e => updateQuestion(qi, { explanation: e.target.value })}
                rows={2} className="input resize-none text-sm" placeholder="يظهر للطالب بعد التسليم..." />
            </div>
          </div>
        ))}

        {/* Add question */}
        <button onClick={addQuestion}
          className="w-full card border-2 border-dashed border-gray-200 p-4 text-gray-500 hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2">
          <Plus className="w-4 h-4" /> إضافة سؤال
        </button>
      </div>

      {/* Save bar */}
      <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4 flex items-center justify-between rounded-2xl shadow-lg">
        <p className="text-sm text-gray-500">{questions.length} سؤال</p>
        <div className="flex gap-3">
          <button onClick={() => navigate(-1)} className="btn btn-secondary">إلغاء</button>
          <button onClick={handleSave} disabled={saving} className="btn btn-primary">
            {saving ? <Spinner size="sm" /> : <><Save className="w-4 h-4" /> حفظ الاختبار</>}
          </button>
        </div>
      </div>
    </div>
  );
}
