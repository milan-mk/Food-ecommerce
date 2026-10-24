import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getUser, updateUser } from '../../services/adminService';
import Spinner from '../../components/Spinner';
import { ErrorState } from '../../components/States';
import { OrderStatusBadge } from '../../components/StatusBadge';
import { formatDate, formatDay, formatPrice, orderNumber } from '../../utils/format';
import { Card, StatCard, TableWrap, Td, Th } from '../ui';
import { ActiveBadge, RoleBadge } from './Users';

export default function AdminUserDetail() {
  const { id } = useParams();
  const { user: me } = useAuth();
  const toast = useToast();
  const result = useFetch((signal) => getUser(id, { signal }), [id]);
  const [busy, setBusy] = useState(false);
  const d = result.data && result.data.data;
  useDocumentTitle(d ? d.user.name : 'User');

  if (result.loading && !d) return <Spinner />;
  if (result.error && !d) return <ErrorState error={result.error} onRetry={result.reload} title="User not found" />;

  const u = d.user;
  const self = me && me._id === u._id;
  const change = async (payload, message, confirmText) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    try { await updateUser(u._id, payload); toast.success(message); result.reload(); } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  };

  return (
    <>
      <Link to="/admin/users" className="inline-flex items-center gap-1 font-bold underline"><ArrowLeft size={16} aria-hidden="true" /> All users</Link>
      <div className="mb-6 mt-3"><h1 className="text-3xl">{u.name}</h1><p className="mt-1 flex flex-wrap items-center gap-2 text-muted">{u.email}<RoleBadge role={u.role} /><ActiveBadge active={u.isActive} /></p></div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Orders" value={d.stats.orders} />
        <StatCard label="Total spent" value={formatPrice(d.stats.totalSpent)} note="Paid orders only" />
        <StatCard label="Member since" value={formatDay(u.createdAt)} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card title="Recent orders">
          {d.recentOrders.length === 0 ? <p className="text-muted">No orders yet.</p> : (
            <TableWrap label="Recent orders">
              <thead><tr><Th>Order</Th><Th>Placed</Th><Th>Total</Th><Th>Status</Th></tr></thead>
              <tbody>{d.recentOrders.map((o) => <tr key={o._id}><Td><Link to={`/admin/orders/${o._id}`} className="font-mono font-bold underline">#{orderNumber(o._id)}</Link></Td><Td className="text-muted">{formatDate(o.createdAt)}</Td><Td>{formatPrice(o.total)}</Td><Td><OrderStatusBadge status={o.status} /></Td></tr>)}</tbody>
            </TableWrap>
          )}
        </Card>

        <Card title="Account">
          {self && <p className="mb-3 rounded-lg bg-surface p-3 text-sm">This is your own account, so its role and status cannot be changed here.</p>}
          <div className="grid gap-3">
            <button disabled={busy || self} onClick={() => change({ isActive: !u.isActive }, u.isActive ? 'Account disabled' : 'Account enabled', u.isActive ? `Disable ${u.name}? They will be signed out immediately.` : null)} className={u.isActive ? 'btn-ghost text-ketchup-dark' : 'btn-primary'}>{u.isActive ? 'Disable account' : 'Enable account'}</button>
            <button disabled={busy || self} onClick={() => change({ role: u.role === 'admin' ? 'customer' : 'admin' }, u.role === 'admin' ? 'Now a customer' : 'Now an admin', u.role === 'admin' ? `Remove admin access from ${u.name}?` : `Give ${u.name} full admin access?`)} className="btn-ghost">{u.role === 'admin' ? 'Make customer' : 'Make admin'}</button>
          </div>
          {u.addresses && u.addresses.length > 0 && <div className="mt-5"><h3 className="text-base">Saved addresses</h3><ul className="mt-2 space-y-2 text-sm text-ink/85">{u.addresses.map((a) => <li key={a._id}><b>{a.label}</b>: {a.address}, {a.city} {a.postalCode}</li>)}</ul></div>}
        </Card>
      </div>
    </>
  );
}
