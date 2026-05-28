import { useParams, useNavigate } from 'react-router-dom';
import { useState, useRef } from 'react';
import { Send, Upload, X, Image, AlertCircle } from 'lucide-react';
import { useHomework, useSubmitHomework } from '@/shared/hooks/useApi';
import { homeworkApi } from '@/shared/api/endpoints';
import { Spinner, EmptyState } from '@/shared/components/ui/PageLoader';
import { formatDate } from '@/shared/utils/format';
import { cn } from '@/shared/utils/cn';
import { getApiErrorMessage } from '@/shared/api/client';
import toast from 'react-hot-toast';

export default function HomeworkPage() {
  const { homeworkId } = useParams<{ homeworkId: string }>();
  const navigate = useNavigate();
  const { data: homework, isLoading } = useHomework(homeworkId!);
  const submitHomework = useSubmitHomework();

  const [answers, setAnswers] = useState<Record<string, { text: string; imageUrls: string[] }>>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const setAnswer = (qId: string, text: string) =>
    setAnswers(a => ({ ...a, [qId]: { ...a[qId], text, imageUrls: a[qId]?.imageUrls ?? [] } }));

  const addImage = async (qId: string, file: File) => {
    setUploading(u => ({ ...u, [qId]: true }));
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'homework-answers');
      const res = await homeworkApi.uploadQuestionImage(formData);
      const url = res.data.data.url;
      setAnswers(a => ({
        ...a,
        [qId]: { text: a[qId]?.text ?? '', imageUrls: [...(a[qId]?.imageUrls ?? []), url] },
      }));
    } catch (err) { toast.error(getApiErrorMessage(err)); }
    finally { setUploading(u => ({ ...u, [qId]: false })); }
  };

  const removeImage = (qId: string, url: string) =>
    setAnswers(a => ({
      ...a,
      [qId]: { ...a[qId], imageUrls: a[qId].imageUrls.filter(u => u !== url) },
    }));

  const handleSubmit = () => {
    const answerArray = (homework?.questions ?? []).map((q: any) => ({
      questionId: q.id,
      answer: answers[q.id]?.text || undefined,
      imageUrls: answers[q.id]?.imageUrls ?? [],
    }));
    submitHomework.mutate({ homeworkId: homeworkId!, data: { answers: answerArray } }, {
      onSuccess: () => navigate(-1),
    });
  };

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (!homework) return <EmptyState title="الواجب غير موجود" />;

  const isLate = homework.dueDate && new Date() > new Date(homework.dueDate);
  const isExpired = isLate && !homework.allowLate;

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6" dir="rtl">
      {/* Header */}
      <div className="card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{homework.title}</h1>
            <p className="text-gray-600 text-sm mt-1 leading-relaxed">{homework.description}</p>
          </div>
          <div className="text-left flex-shrink-0">
            <p className="text-xs text-gray-500">الدرجة الكاملة</p>
            <p className="text-2xl font-bold text-primary">{homework.maxScore}</p>
          </div>
        </div>

        {homework.dueDate && (
          <div className={cn('mt-4 flex items-center gap-2 text-sm p-3 rounded-xl',
            isExpired ? 'bg-red-50 text-red-700' : isLate ? 'bg-yellow-50 text-yellow-700' : 'bg-gray-50 text-gray-600')}>
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {isExpired
              ? 'انتهى الموعد ولا يُقبل التسليم المتأخر'
              : `الموعد النهائي: ${formatDate(homework.dueDate, 'dd/MM/yyyy HH:mm')}${isLate ? ' — يُقبل التسليم المتأخر' : ''}`
            }
          </div>
        )}

        {homework.instructions && (
          <div className="mt-4 p-4 bg-primary/5 rounded-xl">
            <p className="text-sm font-medium text-primary mb-1">تعليمات:</p>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{homework.instructions}</p>
          </div>
        )}
      </div>

      {/* Questions */}
      {(homework.questions ?? []).map((q: any, i: number) => (
        <div key={q.id} className="card p-5 space-y-4">
          {/* Question header */}
          <div className="flex gap-3">
            <span className="w-7 h-7 bg-primary text-white rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
              {i + 1}
            </span>
            <div className="flex-1">
              <p className="font-medium text-gray-900 leading-relaxed">{q.text}</p>
              <p className="text-xs text-gray-400 mt-0.5">{q.points} نقطة{q.points !== 1 ? 'ات' : ''}</p>
            </div>
          </div>

          {/* Question image(s) */}
          {q.imageUrl && (
            <img src={q.imageUrl} alt={q.imageCaption || ''} className="w-full rounded-xl object-cover max-h-64" />
          )}
          {q.images?.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {q.images.map((img: any) => (
                <div key={img.id}>
                  <img src={img.url} alt={img.caption || ''} className="w-full rounded-xl object-cover" />
                  {img.caption && <p className="text-xs text-gray-500 text-center mt-1">{img.caption}</p>}
                </div>
              ))}
            </div>
          )}

          {/* MCQ */}
          {q.type === 'multiple_choice' && q.options && (
            <div className="space-y-2">
              {(q.options as any[]).map((opt: any) => (
                <button key={opt.id} onClick={() => setAnswer(q.id, opt.id)}
                  className={cn('w-full text-right px-4 py-3 rounded-xl border-2 text-sm transition-all',
                    answers[q.id]?.text === opt.id
                      ? 'border-primary bg-primary/5 text-primary font-semibold'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700')}>
                  {opt.text}
                </button>
              ))}
            </div>
          )}

          {/* True/False */}
          {q.type === 'true_false' && (
            <div className="grid grid-cols-2 gap-3">
              {[{ v: 'true', l: 'صح ✓' }, { v: 'false', l: 'خطأ ✗' }].map(({ v, l }) => (
                <button key={v} onClick={() => setAnswer(q.id, v)}
                  className={cn('py-3 rounded-xl border-2 font-bold text-sm transition-all',
                    answers[q.id]?.text === v ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 hover:border-gray-300 text-gray-700')}>
                  {l}
                </button>
              ))}
            </div>
          )}

          {/* Essay / Short answer */}
          {(q.type === 'essay' || q.type === 'short_answer') && (
            <textarea
              value={answers[q.id]?.text ?? ''}
              onChange={(e) => setAnswer(q.id, e.target.value)}
              rows={q.type === 'essay' ? 5 : 2}
              placeholder={q.type === 'essay' ? 'اكتب إجابتك التفصيلية هنا...' : 'اكتب إجابتك المختصرة...'}
              className="input resize-none"
            />
          )}

          {/* Image upload for answers */}
          <div className="space-y-2">
            {answers[q.id]?.imageUrls?.map((url, idx) => (
              <div key={idx} className="relative inline-block ml-2">
                <img src={url} className="w-20 h-20 object-cover rounded-xl border border-gray-200" alt="" />
                <button onClick={() => removeImage(q.id, url)}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}

            <div className="flex items-center gap-2">
              <input
                ref={el => { fileInputRefs.current[q.id] = el; }}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) addImage(q.id, f); e.target.value = ''; }}
              />
              <button
                type="button"
                onClick={() => fileInputRefs.current[q.id]?.click()}
                disabled={uploading[q.id]}
                className="btn btn-secondary btn-sm text-xs"
              >
                {uploading[q.id]
                  ? <Spinner size="sm" />
                  : <><Image className="w-3.5 h-3.5" /> إضافة صورة</>
                }
              </button>
              <span className="text-xs text-gray-400">يمكنك إرفاق صور لإجابتك</span>
            </div>
          </div>
        </div>
      ))}

      {/* Submit */}
      {!isExpired && (
        <div className="flex justify-end gap-3">
          <button onClick={() => navigate(-1)} className="btn btn-secondary">إلغاء</button>
          <button onClick={handleSubmit} disabled={submitHomework.isPending} className="btn btn-primary btn-lg">
            {submitHomework.isPending ? <Spinner size="sm" /> : <><Send className="w-4 h-4" /> تسليم الواجب</>}
          </button>
        </div>
      )}
    </div>
  );
}
