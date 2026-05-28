import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Trash2, Image, X, Save } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { homeworkApi, mediaApi } from '@/shared/api/endpoints';
import { Spinner } from '@/shared/components/ui/PageLoader';
import { getApiErrorMessage } from '@/shared/api/client';
import { cn } from '@/shared/utils/cn';
import toast from 'react-hot-toast';

type QuestionType = 'essay' | 'multiple_choice' | 'true_false' | 'short_answer';

interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface QuestionDraft {
  text: string;
  type: QuestionType;
  options: QuestionOption[];
  correctAnswer: string;
  explanation: string;
  points: number;
  imageUrl: string;
  imageCaption: string;
}

const blankQuestion = (): QuestionDraft => ({
  text: '', type: 'essay',
  options: [
    { id: 'a', text: '', isCorrect: true },
    { id: 'b', text: '', isCorrect: false },
    { id: 'c', text: '', isCorrect: false },
  ],
  correctAnswer: '', explanation: '', points: 1, imageUrl: '', imageCaption: '',
});

export default function AdminHomeworkBuilderPage() {
  const { courseId, homeworkId } = useParams<{ courseId: string; homeworkId: string }>();
  const navigate = useNavigate();
  const isNew = homeworkId === 'new';

  const [meta, setMeta] = useState({
    title: '', description: '', instructions: '',
    dueDate: '', maxScore: 100, allowLate: false,
  });
  const [questions, setQuestions] = useState<QuestionDraft[]>([blankQuestion()]);
  const [saving, setSaving] = useState(false);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingUploadIdx, setPendingUploadIdx] = useState<number | null>(null);

  const addQuestion = () => setQuestions(qs => [...qs, blankQuestion()]);
  const removeQuestion = (i: number) => setQuestions(qs => qs.filter((_, idx) => idx !== i));
  const updateQuestion = (i: number, patch: Partial<QuestionDraft>) =>
    setQuestions(qs => qs.map((q, idx) => idx === i ? { ...q, ...patch } : q));

  const handleImageUpload = async (qi: number, file: File) => {
    setUploadingIdx(qi);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', 'homework-images');
      const res = await mediaApi.upload(fd);
      updateQuestion(qi, { imageUrl: res.data.data.cdnUrl || res.data.data.url });
      toast.success('تم رفع الصورة');
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally { setUploadingIdx(null); }
  };

  const handleSave = async () => {
    if (!meta.title.trim()) { toast.error('العنوان مطلوب'); return; }
    if (questions.some(q => !q.text.trim())) { toast.error('يجب ملء نص جميع الأسئلة'); return; }
    setSaving(true);
    try {
      const payload = {
        courseId,
        title: meta.title,
        description: meta.description,
        instructions: meta.instructions || undefined,
        dueDate: meta.dueDate || undefined,
        maxScore: meta.maxScore,
        allowLate: meta.allowLate,
        questions: questions.map((q, i) => ({
          text: q.text,
          type: q.type,
          options: q.type === 'multiple_choice' ? q.options : undefined,
          correctAnswer: q.correctAnswer || undefined,
          explanation: q.explanation || undefined,
          points: q.points,
          sortOrder: i,
          imageUrl: q.imageUrl || undefined,
          imageCaption: q.imageCaption || undefined,
        })),
      };
      await homeworkApi.create(payload);
      toast.success('تم إنشاء الواجب');
      navigate(-1);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6 max-w-3xl" dir="rtl">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="btn btn-ghost btn-sm">← رجوع</button>
        <h1 className="text-xl font-bold text-gray-900">إنشاء واجب جديد</h1>
      </div>

      {/* Metadata */}
      <div className="card p-6 space-y-4">
        <h2 className="font-bold text-gray-900">إعدادات الواجب</h2>
        <div>
          <label className="label">العنوان *</label>
          <input value={meta.title} onChange={e => setMeta(p => ({ ...p, title: e.target.value }))} className="input" />
        </div>
        <div>
          <label className="label">الوصف *</label>
          <textarea value={meta.description} onChange={e => setMeta(p => ({ ...p, description: e.target.value }))}
            rows={2} className="input resize-none" />
        </div>
        <div>
          <label className="label">التعليمات (اختياري)</label>
          <textarea value={meta.instructions} onChange={e => setMeta(p => ({ ...p, instructions: e.target.value }))}
            rows={2} className="input resize-none" placeholder="تعليمات خاصة بالتسليم..." />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">الموعد النهائي</label>
            <input type="datetime-local" value={meta.dueDate} onChange={e => setMeta(p => ({ ...p, dueDate: e.target.value }))} className="input" />
          </div>
          <div>
            <label className="label">الدرجة الكاملة</label>
            <input type="number" min={1} value={meta.maxScore} onChange={e => setMeta(p => ({ ...p, maxScore: Number(e.target.value) }))} className="input" />
          </div>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={meta.allowLate} onChange={e => setMeta(p => ({ ...p, allowLate: e.target.checked }))} className="w-4 h-4 rounded text-primary" />
          <span className="text-sm text-gray-700">قبول التسليم المتأخر</span>
        </label>
      </div>

      {/* Questions */}
      <div className="space-y-4">
        <h2 className="font-bold text-gray-900">الأسئلة ({questions.length})</h2>
        {questions.map((q, qi) => (
          <div key={qi} className="card p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 bg-primary text-white rounded-lg flex items-center justify-center text-sm font-bold">{qi + 1}</span>
                <select value={q.type} onChange={e => updateQuestion(qi, { type: e.target.value as QuestionType })} className="input w-44 text-sm py-2">
                  <option value="essay">مقال</option>
                  <option value="multiple_choice">اختيار متعدد</option>
                  <option value="true_false">صح / خطأ</option>
                  <option value="short_answer">إجابة قصيرة</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500">نقاط:</label>
                <input type="number" min={1} value={q.points} onChange={e => updateQuestion(qi, { points: Number(e.target.value) })} className="input w-16 text-sm py-1.5 text-center" />
                <button onClick={() => removeQuestion(qi)} className="btn btn-ghost btn-icon btn-sm text-red-400 hover:text-red-600 hover:bg-red-50">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div>
              <label className="label">نص السؤال *</label>
              <textarea value={q.text} onChange={e => updateQuestion(qi, { text: e.target.value })} rows={2} className="input resize-none" />
            </div>

            {/* Image upload */}
            <div className="space-y-2">
              {q.imageUrl ? (
                <div className="relative inline-block">
                  <img src={q.imageUrl} alt="" className="max-h-40 rounded-xl border border-gray-200 object-cover" />
                  <button onClick={() => updateQuestion(qi, { imageUrl: '', imageCaption: '' })}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center">
                    <X className="w-3 h-3" />
                  </button>
                  <input value={q.imageCaption} onChange={e => updateQuestion(qi, { imageCaption: e.target.value })} placeholder="تعليق الصورة" className="input text-sm py-2 mt-2" />
                </div>
              ) : (
                <>
                  <input ref={pendingUploadIdx === qi ? fileInputRef : null} type="file" accept="image/*" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(qi, f); e.target.value = ''; }} />
                  <button type="button" onClick={() => { setPendingUploadIdx(qi); setTimeout(() => fileInputRef.current?.click(), 50); }}
                    disabled={uploadingIdx === qi} className="btn btn-secondary btn-sm text-xs">
                    {uploadingIdx === qi ? <Spinner size="sm" /> : <><Image className="w-3.5 h-3.5" /> إضافة صورة</>}
                  </button>
                </>
              )}
            </div>

            {/* MCQ options */}
            {q.type === 'multiple_choice' && (
              <div className="space-y-2">
                <label className="label">الخيارات</label>
                {q.options.map((opt, oi) => (
                  <div key={opt.id} className="flex items-center gap-2">
                    <button onClick={() => updateQuestion(qi, { options: q.options.map(o => ({ ...o, isCorrect: o.id === opt.id })) })}
                      className={cn('w-5 h-5 rounded-full border-2 flex-shrink-0', opt.isCorrect ? 'border-primary bg-primary' : 'border-gray-300')} />
                    <input value={opt.text} onChange={e => updateQuestion(qi, { options: q.options.map(o => o.id === opt.id ? { ...o, text: e.target.value } : o) })}
                      placeholder={`الخيار ${String.fromCharCode(65 + oi)}`}
                      className={cn('input flex-1 text-sm py-2', opt.isCorrect && 'border-primary/40 bg-primary/5')} />
                  </div>
                ))}
              </div>
            )}

            {q.type === 'true_false' && (
              <div className="flex gap-3">
                {[{ v: 'true', l: 'صح ✓' }, { v: 'false', l: 'خطأ ✗' }].map(({ v, l }) => (
                  <button key={v} onClick={() => updateQuestion(qi, { correctAnswer: v })}
                    className={cn('flex-1 py-3 rounded-xl border-2 font-bold transition-all',
                      q.correctAnswer === v ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-gray-600')}>
                    {l}
                  </button>
                ))}
              </div>
            )}

            {(q.type === 'short_answer') && (
              <div>
                <label className="label">الإجابة النموذجية</label>
                <input value={q.correctAnswer} onChange={e => updateQuestion(qi, { correctAnswer: e.target.value })} className="input" />
              </div>
            )}

            <div>
              <label className="label">شرح (اختياري)</label>
              <textarea value={q.explanation} onChange={e => updateQuestion(qi, { explanation: e.target.value })} rows={2} className="input resize-none text-sm" />
            </div>
          </div>
        ))}

        <button onClick={addQuestion} className="w-full card border-2 border-dashed border-gray-200 p-4 text-gray-500 hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2">
          <Plus className="w-4 h-4" /> إضافة سؤال
        </button>
      </div>

      <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4 flex items-center justify-between rounded-2xl shadow-lg">
        <p className="text-sm text-gray-500">{questions.length} سؤال</p>
        <div className="flex gap-3">
          <button onClick={() => navigate(-1)} className="btn btn-secondary">إلغاء</button>
          <button onClick={handleSave} disabled={saving} className="btn btn-primary">
            {saving ? <Spinner size="sm" /> : <><Save className="w-4 h-4" /> حفظ الواجب</>}
          </button>
        </div>
      </div>
    </div>
  );
}
