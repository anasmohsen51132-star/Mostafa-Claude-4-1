import { useState } from 'react';
import { Search, UserCog, ShieldCheck, ShieldX } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/shared/api/endpoints';
import { queryKeys } from '@/shared/lib/queryClient';
import { formatDate, formatRelative, roleLabels, phoneDisplay } from '@/shared/utils/format';
import { TableSkeleton, EmptyState, Badge } from '@/shared/components/ui/PageLoader';
import toast from 'react-hot-toast';

export default function AdminUsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.users.list({ page, search, role, status }),
    queryFn: () => usersApi.list({ page, limit: 20, search: search || undefined, role: role || undefined, status: status || undefined }).then(r => r.data.data),
  });

  const updateUser = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => usersApi.adminUpdate(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.users.all }); toast.success('تم التحديث'); },
    onError: () => toast.error('فشل التحديث'),
  });

  const roleBadge: Record<string, any> = {
    STUDENT: 'neutral', INSTRUCTOR: 'info', ADMIN: 'warning', OWNER: 'danger',
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">إدارة المستخدمين</h1>
        <p className="text-gray-500 mt-1">{data?.total ?? 0} مستخدم مسجل</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="بحث بالاسم أو الهاتف..." className="input pr-10" />
        </div>
        <select value={role} onChange={e => { setRole(e.target.value); setPage(1); }} className="input w-36">
          <option value="">جميع الأدوار</option>
          {Object.entries(roleLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="input w-36">
          <option value="">جميع الحالات</option>
          <option value="ACTIVE">نشط</option>
          <option value="SUSPENDED">موقوف</option>
        </select>
      </div>

      {isLoading ? <TableSkeleton rows={10} cols={5} /> : !data?.items?.length ? (
        <EmptyState title="لا يوجد مستخدمون" description="لا توجد نتائج لهذا البحث" />
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr><th>المستخدم</th><th>رقم الهاتف</th><th>الدور</th><th>الحالة</th><th>آخر دخول</th><th>إجراءات</th></tr>
            </thead>
            <tbody>
              {data.items.map((u: any) => (
                <tr key={u.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                        <span className="text-primary font-bold text-sm">{u.name?.[0]}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{u.name}</p>
                        {u.email && <p className="text-xs text-gray-400">{u.email}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="font-mono text-sm">{phoneDisplay(u.phone)}</td>
                  <td><Badge variant={roleBadge[u.role]}>{roleLabels[u.role]}</Badge></td>
                  <td>
                    <Badge variant={u.status === 'ACTIVE' ? 'success' : 'danger'}>
                      {u.status === 'ACTIVE' ? 'نشط' : 'موقوف'}
                    </Badge>
                  </td>
                  <td className="text-sm text-gray-500">{u.lastLoginAt ? formatRelative(u.lastLoginAt) : '—'}</td>
                  <td>
                    <div className="flex items-center gap-1">
                      {u.status === 'ACTIVE' ? (
                        <button onClick={() => updateUser.mutate({ id: u.id, data: { status: 'SUSPENDED' } })}
                          className="btn btn-ghost btn-sm text-red-500 hover:bg-red-50" title="إيقاف الحساب">
                          <ShieldX className="w-4 h-4" />
                        </button>
                      ) : (
                        <button onClick={() => updateUser.mutate({ id: u.id, data: { status: 'ACTIVE' } })}
                          className="btn btn-ghost btn-sm text-green-600 hover:bg-green-50" title="تفعيل الحساب">
                          <ShieldCheck className="w-4 h-4" />
                        </button>
                      )}
                      {u.role === 'STUDENT' && (
                        <button onClick={() => updateUser.mutate({ id: u.id, data: { role: 'ADMIN' } })}
                          className="btn btn-ghost btn-sm text-yellow-600 hover:bg-yellow-50" title="ترقية لمشرف">
                          <UserCog className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.pages > 1 && (
        <div className="flex justify-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn btn-secondary btn-sm disabled:opacity-40">السابق</button>
          <span className="text-sm text-gray-600 px-3 flex items-center">{page} / {data.pages}</span>
          <button disabled={page >= data.pages} onClick={() => setPage(p => p + 1)} className="btn btn-secondary btn-sm disabled:opacity-40">التالي</button>
        </div>
      )}
    </div>
  );
}
