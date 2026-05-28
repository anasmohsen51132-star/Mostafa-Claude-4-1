import { useNavigate } from 'react-router-dom';
export default function QuizResultPage() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4" dir="rtl">
      <p className="text-gray-500">جاري تحميل نتيجة الاختبار...</p>
      <button onClick={() => navigate(-1)} className="btn btn-secondary">العودة</button>
    </div>
  );
}
