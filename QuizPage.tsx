import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { Clock, ChevronRight, ChevronLeft, Send, AlertTriangle } from 'lucide-react';
import { useQuiz, useStartQuiz, useSubmitQuiz, useQuizHistory } from '@/shared/hooks/useApi';
import { Spinner, EmptyState } from '@/shared/components/ui/PageLoader';
import { cn } from '@/shared/utils/cn';
import { formatDuration } from '@/shared/utils/format';
import type { Question, QuizAttempt } from '@/shared/types';

export default function QuizPage() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();

  const { data: quiz, isLoading: quizLoading } = useQuiz(quizId!);
  const { data: history } = useQuizHistory(quizId!);
  const startQuiz = useStartQuiz();
  const submitQuiz = useSubmitQuiz();

  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  // Start timer when attempt begins
  useEffect(() => {
    if (!attempt || !quiz?.timeLimit) return;
    setTimeLeft(quiz.timeLimit * 60);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t === null || t <= 1) {
          clearInterval(timerRef.current);
          handleSubmit(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [attempt?.id]);

  const handleStart = () => {
    startQuiz.mutate({ id: quizId! }, {
      onSuccess: (a) => setAttempt(a),
    });
  };

  const handleSubmit = async (autoSubmit = false) => {
    if (!attempt) return;
    clearInterval(timerRef.current);

    const answerArray = Object.entries(answers).map(([questionId, answer]) => ({ questionId, answer }));

    submitQuiz.mutate(
      { attemptId: attempt.id, answers: answerArray },
      {
        onSuccess: (res) => {
          setResult(res);
          setSubmitted(true);
        },
      },
    );
  };

  if (quizLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (!quiz) return <EmptyState title="الاختبار غير موجود" />;

  const questions: Question[] = quiz.questions ?? [];
  const currentQ = questions[currentIndex];

  // Show result screen
  if (submitted && result) {
    const pct = result.percentage ?? 0;
    return (
      <div className="max-w-lg mx-auto py-10 text-center" dir="rtl">
        <div className={cn('w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl',
          result.passed ? 'bg-green-100' : 'bg-red-100')}>
          {result.passed ? '🎉' : '😔'}
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {result.passed ? 'أحسنت! اجتزت الاختبار' : 'لم تجتز الاختبار'}
        </h1>
        <p className="text-gray-500 mb-6">
          حصلت على {result.score} من {result.maxScore} ({pct}%)
        </p>
        <div className="card p-6 mb-6">
          <div className="w-full bg-gray-100 rounded-full h-4 mb-3 progress-ltr">
            <div className={cn('h-4 rounded-full transition-all', result.passed ? 'bg-green-500' : 'bg-red-500')}
              style={{ width: `${pct}%` }} />
          </div>
          <p className="text-sm text-gray-500">درجة النجاح: {quiz.passingScore}%</p>
        </div>

        {result.answers && (
          <div className="card p-5 text-right space-y-3 mb-6">
            <h3 className="font-bold text-gray-900">مراجعة الإجابات</h3>
            {result.answers.map((a: any, i: number) => (
              <div key={a.questionId} className={cn('p-3 rounded-xl text-sm',
                a.isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200')}>
                <p className="font-medium text-gray-800">{questions[i]?.text}</p>
                <p className="mt-1 text-xs">إجابتك: <span className={a.isCorrect ? 'text-green-700' : 'text-red-700'}>{a.answer || '—'}</span></p>
                {!a.isCorrect && a.correctAnswer && (
                  <p className="text-xs text-green-700 mt-0.5">الإجابة الصحيحة: {a.correctAnswer}</p>
                )}
                {a.explanation && <p className="text-xs text-gray-500 mt-1">{a.explanation}</p>}
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3 justify-center">
          <button onClick={() => navigate(-1)} className="btn btn-secondary">العودة</button>
          {!result.passed && history && history.length < (quiz.maxAttempts ?? 999) && (
            <button onClick={() => { setAttempt(null); setSubmitted(false); setResult(null); setAnswers({}); setCurrentIndex(0); }}
              className="btn btn-primary">إعادة المحاولة</button>
          )}
        </div>
      </div>
    );
  }

  // Show start screen
  if (!attempt) {
    const lastAttempt = history?.[0];
    return (
      <div className="max-w-lg mx-auto py-10" dir="rtl">
        <div className="card p-8 text-center space-y-5">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
            <span className="text-3xl">📝</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{quiz.title}</h1>
          {quiz.description && <p className="text-gray-500">{quiz.description}</p>}

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-gray-500 text-xs mb-1">عدد الأسئلة</p>
              <p className="font-bold text-gray-900">{questions.length}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-gray-500 text-xs mb-1">درجة النجاح</p>
              <p className="font-bold text-gray-900">{quiz.passingScore}%</p>
            </div>
            {quiz.timeLimit && (
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-gray-500 text-xs mb-1">الوقت المحدد</p>
                <p className="font-bold text-gray-900">{quiz.timeLimit} دقيقة</p>
              </div>
            )}
            {quiz.maxAttempts && (
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-gray-500 text-xs mb-1">المحاولات المتبقية</p>
                <p className="font-bold text-gray-900">{quiz.maxAttempts - (history?.length ?? 0)}</p>
              </div>
            )}
          </div>

          {lastAttempt && (
            <div className={cn('p-3 rounded-xl text-sm', lastAttempt.passed ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700')}>
              آخر محاولة: {lastAttempt.passed ? '✓ اجتزت' : '✗ لم تجتز'} — {lastAttempt.score}/{lastAttempt.maxScore}
            </div>
          )}

          <button onClick={handleStart} disabled={startQuiz.isPending} className="btn-primary btn w-full btn-lg">
            {startQuiz.isPending ? 'جاري البدء...' : 'ابدأ الاختبار'}
          </button>
        </div>
      </div>
    );
  }

  // Quiz solving screen
  return (
    <div className="max-w-2xl mx-auto py-8 px-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-bold text-gray-900">{quiz.title}</h1>
        {timeLeft !== null && (
          <div className={cn('flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-bold text-sm',
            timeLeft < 60 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700')}>
            <Clock className="w-4 h-4" />
            {formatDuration(timeLeft)}
          </div>
        )}
      </div>

      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between text-xs text-gray-500 mb-2">
          <span>السؤال {currentIndex + 1} من {questions.length}</span>
          <span>{Object.keys(answers).length} / {questions.length} أجبت</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden progress-ltr">
          <div className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }} />
        </div>
      </div>

      {/* Question */}
      {currentQ && (
        <div className="card p-6 space-y-5">
          {/* Question image */}
          {currentQ.imageUrl && (
            <img src={currentQ.imageUrl} alt={currentQ.imageCaption || ''} className="w-full rounded-xl object-cover max-h-64" />
          )}
          {currentQ.images && currentQ.images.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {currentQ.images.map((img) => (
                <div key={img.id}>
                  <img src={img.url} alt={img.caption || ''} className="w-full rounded-xl object-cover" />
                  {img.caption && <p className="text-xs text-gray-500 text-center mt-1">{img.caption}</p>}
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            <span className="w-7 h-7 bg-primary text-white rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0">
              {currentIndex + 1}
            </span>
            <p className="text-gray-900 font-medium leading-relaxed">{currentQ.text}</p>
          </div>

          {/* MCQ options */}
          {currentQ.type === 'multiple_choice' && currentQ.options && (
            <div className="space-y-2">
              {(currentQ.options as any[]).map((opt) => (
                <button key={opt.id} onClick={() => setAnswers(a => ({ ...a, [currentQ.id]: opt.id }))}
                  className={cn('w-full text-right px-4 py-3 rounded-xl border-2 transition-all text-sm',
                    answers[currentQ.id] === opt.id
                      ? 'border-primary bg-primary/5 text-primary font-semibold'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  )}>
                  <span className="flex items-center gap-3">
                    <span className={cn('w-5 h-5 rounded-full border-2 flex-shrink-0',
                      answers[currentQ.id] === opt.id ? 'border-primary bg-primary' : 'border-gray-300')} />
                    {opt.text}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* True/False */}
          {currentQ.type === 'true_false' && (
            <div className="grid grid-cols-2 gap-3">
              {[{ value: 'true', label: 'صح ✓' }, { value: 'false', label: 'خطأ ✗' }].map((opt) => (
                <button key={opt.value} onClick={() => setAnswers(a => ({ ...a, [currentQ.id]: opt.value }))}
                  className={cn('py-4 rounded-xl border-2 font-bold transition-all',
                    answers[currentQ.id] === opt.value
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  )}>
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {/* Short answer */}
          {currentQ.type === 'short_answer' && (
            <textarea
              value={answers[currentQ.id] || ''}
              onChange={(e) => setAnswers(a => ({ ...a, [currentQ.id]: e.target.value }))}
              rows={3}
              placeholder="اكتب إجابتك هنا..."
              className="input resize-none"
            />
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between mt-5">
        <button disabled={currentIndex === 0} onClick={() => setCurrentIndex(i => i - 1)}
          className="btn btn-secondary disabled:opacity-40">
          <ChevronRight className="w-4 h-4" /> السابق
        </button>

        {currentIndex === questions.length - 1 ? (
          <button
            onClick={() => handleSubmit()}
            disabled={submitQuiz.isPending}
            className="btn btn-primary"
          >
            {submitQuiz.isPending ? <Spinner size="sm" /> : <><Send className="w-4 h-4" /> تسليم الاختبار</>}
          </button>
        ) : (
          <button onClick={() => setCurrentIndex(i => i + 1)} className="btn btn-primary">
            التالي <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Question dots */}
      <div className="flex flex-wrap gap-1.5 justify-center mt-5">
        {questions.map((q, i) => (
          <button key={q.id} onClick={() => setCurrentIndex(i)}
            className={cn('w-8 h-8 rounded-lg text-xs font-medium transition-colors',
              i === currentIndex ? 'bg-primary text-white' :
              answers[q.id] ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
            )}>
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}
