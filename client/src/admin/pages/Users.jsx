import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import { useDebounced } from '../../hooks/useDebounced';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { getUsers } from '../../services/adminService';
import Pagination from '../../components/Pagination';
import { ErrorState } from '../../components/States';
import { formatDay } from '../../utils/format';
import { PageHeader, Select, TableSkeleton, TableWrap, Td, Th } from '../ui';

export const RoleBadge = ({ role }) => <span className={`chip ${role === 'admin' ? 'bg-ink text-white' : 'bg-surface'}`}>{role === 'admin' ? 'Admin' : 'Customer'}</span>;
export const ActiveBadge = ({ active }) => <span className={`chip ${active ? 'bg-leaf-light text-leaf' : 'bg-ketchup-light text-ketchup-dark'}`}>{active ? 'Active' : 'Disabled'}</span>;

export default function AdminUsers() {
  useDocumentTitle('Users');
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [active, setActive] = useState('');
  const [page, setPage] = useState(1);
  const dq = useDebounced(q);
  const result = useFetch((signal) => getUsers({ page, limit: 12, ...(dq.trim() && { q: dq.trim() }), ...(role && { role }), ...(active && { isActive: active }) }, { signal }), [dq, role, active, page]);
  const users = result.data ? result.data.data : [];

  return (
    <>
      <PageHeader title="Users" subtitle="Disabling an account signs that person out immediately." />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <label htmlFor="u-q" className="sr-only">Search users</label>
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input id="u-q" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Name, email or phone" className="input pl-10" />
        </div>
        <Select id="u-role" label="Role" value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}><option value="">All roles</option><option value="customer">Customers</option><option value="admin">Admins</option></Select>
        <Select id="u-active" label="Account status" value={active} onChange={(e) => { setActive(e.target.value); setPage(1); }}><option value="">Any status</option><option value="true">Active</option><option value="false">Disabled</option></Select>
      </div>
      {result.loading && !result.data && <TableSkeleton />}
      {result.error && !result.data && <ErrorState error={result.error} onRetry={result.reload} />}
      {result.data && users.length === 0 && <p className="rounded-xl border-2 border-dashed border-line p-10 text-center text-muted">No users match.</p>}
      {users.length > 0 && (
        <>
          <TableWrap label="Users">
            <thead><tr><Th>Name</Th><Th>Email</Th><Th>Phone</Th><Th>Role</Th><Th>Status</Th><Th>Joined</Th></tr></thead>
            <tbody>{users.map((u) => (
              <tr key={u._id} className="hover:bg-surface/60">
                <Td><Link to={`/admin/users/${u._id}`} className="font-bold underline">{u.name}</Link></Td><Td>{u.email}</Td><Td className="text-muted">{u.phone || '-'}</Td>
                <Td><RoleBadge role={u.role} /></Td><Td><ActiveBadge active={u.isActive} /></Td><Td className="whitespace-nowrap text-muted">{formatDay(u.createdAt)}</Td>
              </tr>))}</tbody>
          </TableWrap>
          <Pagination page={result.data.pagination.page} pages={result.data.pagination.pages} onChange={setPage} />
        </>
      )}
    </>
  );
}
