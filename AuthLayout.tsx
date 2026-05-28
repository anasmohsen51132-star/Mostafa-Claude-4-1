import { Outlet, Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-gold-50 flex flex-col items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center gap-3 mb-8 no-underline">
          <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-lg">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-primary">أكاديمية مستر مصطفى</p>
            <p className="text-xs text-gold-500 font-medium">لتعليم اللغة العربية</p>
          </div>
        </Link>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
          <Outlet />
        </div>

        <p className="text-center text-sm text-gray-400 mt-6">
          © {new Date().getFullYear()} أكاديمية مستر مصطفى
        </p>
      </div>
    </div>
  );
}
