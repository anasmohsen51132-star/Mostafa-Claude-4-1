import { Outlet, NavLink, Link } from 'react-router-dom';
import { useState } from 'react';
import {
  LayoutDashboard, BookOpen, Award, Bell, CreditCard,
  User, Menu, X, LogOut, BookMarked,
} from 'lucide-react';
import { useAuthStore } from '@/shared/stores/authStore';
import { useLogout, useNotifications } from '@/shared/hooks/useApi';
import { cn } from '@/shared/utils/cn';

const navItems = [
  { to: '/dashboard',        icon: LayoutDashboard, label: 'لوحتي' },
  { to: '/my-courses',       icon: BookOpen,         label: 'كورساتي' },
  { to: '/certificates',     icon: Award,            label: 'شهاداتي' },
  { to: '/payment-history',  icon: CreditCard,       label: 'المدفوعات' },
  { to: '/notifications',    icon: Bell,             label: 'الإشعارات' },
  { to: '/profile',          icon: User,             label: 'الملف الشخصي' },
];

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuthStore();
  const logout = useLogout();
  const { data: notifData } = useNotifications({ limit: 1 });
  const unreadCount = notifData?.unreadCount ?? 0;

  const Sidebar = () => (
    <aside className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-5 border-b border-gray-100">
        <Link to="/" className="flex items-center gap-2 no-underline">
          <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center">
            <BookMarked className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-primary">أكاديمية مستر مصطفى</p>
          </div>
        </Link>
      </div>

      {/* User info */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
            {user?.avatar
              ? <img src={user.avatar} className="w-10 h-10 rounded-xl object-cover" alt="" />
              : <span className="text-primary font-bold text-sm">{user?.name?.[0]}</span>
            }
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">{user?.name}</p>
            <p className="text-xs text-gray-500 truncate">{user?.phone}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === '/dashboard'}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) => cn('nav-item', isActive && 'nav-item-active')}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span>{label}</span>
            {to === '/notifications' && unreadCount > 0 && (
              <span className="mr-auto bg-red-500 text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-gray-100">
        <button
          onClick={() => logout.mutate()}
          className="nav-item w-full text-red-500 hover:bg-red-50 hover:text-red-600"
        >
          <LogOut className="w-4 h-4" />
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Mobile header */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
        <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-xl hover:bg-gray-100">
          <Menu className="w-5 h-5" />
        </button>
        <span className="font-semibold text-primary">أكاديمية مستر مصطفى</span>
        <div className="w-9" />
      </div>

      <div className="flex">
        {/* Desktop sidebar */}
        <div className="hidden lg:flex lg:flex-col lg:w-60 lg:fixed lg:inset-y-0 bg-white border-l border-gray-100 shadow-sm">
          <Sidebar />
        </div>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <>
            <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
            <div className="fixed inset-y-0 right-0 w-72 bg-white z-50 lg:hidden flex flex-col shadow-xl animate-slide-in-right">
              <div className="flex justify-end p-3">
                <button onClick={() => setSidebarOpen(false)} className="p-2 rounded-xl hover:bg-gray-100">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <Sidebar />
              </div>
            </div>
          </>
        )}

        {/* Main content */}
        <main className="flex-1 lg:mr-60 min-h-screen">
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
