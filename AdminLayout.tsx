import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  LayoutDashboard, BookOpen, Users, CreditCard, Tag, Key,
  Webhook, BarChart3, Shield, LogOut, Menu, X, BookMarked,
} from 'lucide-react';
import { useAuthStore } from '@/shared/stores/authStore';
import { useLogout } from '@/shared/hooks/useApi';
import { cn } from '@/shared/utils/cn';

const navGroups = [
  {
    label: 'عام',
    items: [
      { to: '/admin',           icon: LayoutDashboard, label: 'لوحة التحكم', end: true },
      { to: '/admin/analytics', icon: BarChart3,        label: 'التحليلات' },
    ],
  },
  {
    label: 'المحتوى',
    items: [
      { to: '/admin/courses',   icon: BookOpen, label: 'الكورسات' },
    ],
  },
  {
    label: 'المستخدمون والمدفوعات',
    items: [
      { to: '/admin/users',        icon: Users,    label: 'المستخدمون' },
      { to: '/admin/payments',     icon: CreditCard, label: 'المدفوعات' },
      { to: '/admin/coupons',      icon: Tag,       label: 'الكوبونات' },
      { to: '/admin/access-codes', icon: Key,       label: 'أكواد الوصول' },
    ],
  },
  {
    label: 'النظام',
    items: [
      { to: '/admin/webhooks', icon: Webhook, label: 'أحداث Webhook' },
      { to: '/admin/audit',    icon: Shield,  label: 'سجلات المراجعة' },
    ],
  },
];

export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuthStore();
  const logout = useLogout();
  const navigate = useNavigate();

  const Sidebar = () => (
    <aside className="flex flex-col h-full bg-academy-dark text-gray-300">
      {/* Logo */}
      <div className="p-5 border-b border-white/10">
        <Link to="/admin" className="flex items-center gap-2 no-underline">
          <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center">
            <BookMarked className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">لوحة الإدارة</p>
            <p className="text-xs text-gray-500">أكاديمية مستر مصطفى</p>
          </div>
        </Link>
      </div>

      {/* User */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-primary font-bold text-sm">{user?.name?.[0]}</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-gray-500 truncate">{user?.role === 'OWNER' ? 'المالك' : 'مشرف'}</p>
          </div>
        </div>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-4">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-3 mb-1">{group.label}</p>
            <div className="space-y-0.5">
              {group.items.map(({ to, icon: Icon, label, end }) => (
                <NavLink key={to} to={to} end={end}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) => cn(
                    'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-white'
                      : 'text-gray-400 hover:bg-white/10 hover:text-white',
                  )}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t border-white/10 space-y-1">
        <Link to="/" className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-gray-400 hover:bg-white/10 hover:text-white transition-colors no-underline">
          <BookOpen className="w-4 h-4" /> عرض الموقع
        </Link>
        <button onClick={() => logout.mutate()}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-red-400 hover:bg-red-900/30 hover:text-red-300 transition-colors">
          <LogOut className="w-4 h-4" /> تسجيل الخروج
        </button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Mobile header */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-academy-dark text-white">
        <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-xl hover:bg-white/10">
          <Menu className="w-5 h-5" />
        </button>
        <span className="font-semibold">لوحة الإدارة</span>
        <div className="w-9" />
      </div>

      <div className="flex">
        {/* Desktop sidebar */}
        <div className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0">
          <Sidebar />
        </div>

        {/* Mobile overlay */}
        {sidebarOpen && (
          <>
            <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
            <div className="fixed inset-y-0 right-0 w-72 z-50 lg:hidden flex flex-col shadow-2xl animate-slide-in-right">
              <div className="flex justify-end p-3 bg-academy-dark">
                <button onClick={() => setSidebarOpen(false)} className="p-2 rounded-xl text-gray-400 hover:bg-white/10">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1">
                <Sidebar />
              </div>
            </div>
          </>
        )}

        {/* Content */}
        <main className="flex-1 lg:mr-64 min-h-screen">
          <div className="p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
