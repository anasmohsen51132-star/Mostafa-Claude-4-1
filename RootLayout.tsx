import { Outlet, Link, NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Menu, X, BookOpen, Bell, User, ChevronDown, LogOut, LayoutDashboard } from 'lucide-react';
import { useAuthStore } from '@/shared/stores/authStore';
import { useLogout, useNotifications } from '@/shared/hooks/useApi';
import { cn } from '@/shared/utils/cn';

export function RootLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAuthenticated, user } = useAuthStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const logout = useLogout();
  const navigate = useNavigate();

  const { data: notifData } = useNotifications({ limit: 1 });
  const unreadCount = notifData?.unreadCount ?? 0;

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'OWNER';

  return (
    <div className="min-h-screen flex flex-col bg-gray-50" dir="rtl">
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
        <div className="page-container">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 no-underline">
              <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-bold text-primary leading-tight">أكاديمية</p>
                <p className="text-xs text-gold-500 font-semibold leading-tight">مستر مصطفى</p>
              </div>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-6">
              <NavLink to="/" end className={({ isActive }) =>
                cn('text-sm font-medium transition-colors', isActive ? 'text-primary' : 'text-gray-600 hover:text-primary')
              }>الرئيسية</NavLink>
              <NavLink to="/courses" className={({ isActive }) =>
                cn('text-sm font-medium transition-colors', isActive ? 'text-primary' : 'text-gray-600 hover:text-primary')
              }>الكورسات</NavLink>
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {isAuthenticated ? (
                <>
                  {/* Notifications */}
                  <button
                    onClick={() => navigate('/notifications')}
                    className="relative p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {/* User dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setDropdownOpen(!dropdownOpen)}
                      className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                      <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center">
                        {user?.avatar
                          ? <img src={user.avatar} className="w-8 h-8 rounded-xl object-cover" alt="" />
                          : <User className="w-4 h-4 text-primary" />
                        }
                      </div>
                      <span className="hidden sm:block text-sm font-medium text-gray-700 max-w-[100px] truncate">{user?.name}</span>
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    </button>

                    {dropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                        <div className="absolute left-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-lg border border-gray-100 z-20 overflow-hidden animate-fade-in">
                          {isAdmin && (
                            <Link to="/admin" className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                              onClick={() => setDropdownOpen(false)}>
                              <LayoutDashboard className="w-4 h-4 text-primary" /> لوحة الإدارة
                            </Link>
                          )}
                          <Link to="/dashboard" className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                            onClick={() => setDropdownOpen(false)}>
                            <LayoutDashboard className="w-4 h-4 text-gray-500" /> لوحتي
                          </Link>
                          <Link to="/profile" className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                            onClick={() => setDropdownOpen(false)}>
                            <User className="w-4 h-4 text-gray-500" /> الملف الشخصي
                          </Link>
                          <hr className="border-gray-100" />
                          <button
                            onClick={() => { setDropdownOpen(false); logout.mutate(); }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                          >
                            <LogOut className="w-4 h-4" /> تسجيل الخروج
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <Link to="/auth/login" className="btn btn-ghost btn-sm">دخول</Link>
                  <Link to="/auth/register" className="btn btn-primary btn-sm">إنشاء حساب</Link>
                </div>
              )}

              {/* Mobile menu toggle */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="md:hidden p-2 rounded-xl text-gray-500 hover:bg-gray-100"
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1">
            <NavLink to="/" end onClick={() => setMobileOpen(false)}
              className="block px-3 py-2 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100">
              الرئيسية
            </NavLink>
            <NavLink to="/courses" onClick={() => setMobileOpen(false)}
              className="block px-3 py-2 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100">
              الكورسات
            </NavLink>
            {isAuthenticated && (
              <NavLink to="/dashboard" onClick={() => setMobileOpen(false)}
                className="block px-3 py-2 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100">
                لوحتي
              </NavLink>
            )}
          </div>
        )}
      </header>

      {/* ── Main ─────────────────────────────────────────────── */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="bg-academy-dark text-gray-400 py-10">
        <div className="page-container">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-white" />
              </div>
              <span className="text-white font-semibold">أكاديمية مستر مصطفى</span>
            </div>
            <p className="text-sm">© {new Date().getFullYear()} جميع الحقوق محفوظة</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
