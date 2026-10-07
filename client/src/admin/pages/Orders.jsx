import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import { useDebounced } from '../../hooks/useDebounced';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { getAdminOrders } from '../../services/adminService';
import Pagination from '../../components/Pagination';
import { ErrorState } from '../../components/States';
import { OrderStatusBadge, PaymentBadge } from '../../components/StatusBadge';
import { formatDate, formatPrice, orderNumber } from '../../utils/format';
import { PageHeader, Select, TableSkeleton, TableWrap, Td, Th } from '../ui';

const STATUSES = ['Pending', 'Confirmed', 'Preparing', 'Out for Delivery', 'Delivered', 'Cancelled'];

export default function AdminOrders() {
  useDocumentTitle('Orders');
  const [f, setF] = useState({ status: '', paymentStatus: '', q: '', from: '', to: '' });
  const [page, setPage] = useState(1);
  const q = useDebounced(f.q);
  const set = (patch) => { setF((s) => ({ ...s, ...patch })); setPage(1); };
  const params = { page, limit: 12, ...(f.status && { status: f.status }), ...(f.paymentStatus && { paymentStatus: f.paymentStatus }), ...(q.trim() && { q: q.trim() }), ...(f.from && { from: f.from }), ...(f.to && { to: f.to }) };
  const result = useFetch((signal) => getAdminOrders(params, { signal }), [JSON.stringify(params)]);
  const orders = result.data ? result.data.data : [];
  const filtered = Boolean(f.status || f.paymentStatus || f.q || f.from || f.to);

  return (
    <>
      <PageHeader title="Orders" subtitle="Search by order number, customer name, email or phone." />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <label htmlFor="order-q" className="sr-only">Search orders</label>
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input id="order-q" value={f.q} onChange={(e) => set({ q: e.target.value })} placeholder="Order number, name, email, phone" className="input pl-10" />
        </div>
        <Select id="o-status" label="Order status" value={f.status} onChange={(e) => set({ status: e.target.value })}><option value="">All statuses</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}</Select>
        <Select id="o-pay" label="Payment status" value={f.paymentStatus} onChange={(e) => set({ paymentStatus: e.target.value })}>
          <option value="">Any payment</option><option value="paid">Paid</option><option value="pending">Awaiting payment</option><option value="failed">Failed</option><option value="refunded">Refunded</option>
        </Select>
        <div className="flex items-center gap-2"><label htmlFor="o-from" className="text-sm font-bold">From</label><input id="o-from" type="date" value={f.from} max={f.to || undefined} onChange={(e) => set({ from: e.target.value })} className="input w-auto" />
          <label htmlFor="o-to" className="text-sm font-bold">to</label><input id="o-to" type="date" value={f.to} min={f.from || undefined} onChange={(e) => set({ to: e.target.value })} className="input w-auto" /></div>
        {filtered && <button onClick={() => { setF({ status: '', paymentStatus: '', q: '', from: '', to: '' }); setPage(1); }} className="font-bold text-ketchup-dark underline">Clear filters</button>}
      </div>

      {result.loading && !result.data && <TableSkeleton />}
      {result.error && !result.data && <ErrorState error={result.error} onRetry={result.reload} />}
      {result.data && orders.length === 0 && <p className="rounded-xl border-2 border-dashed border-line p-10 text-center text-muted">{filtered ? 'No orders match these filters.' : 'No orders yet.'}</p>}
      {orders.length > 0 && (
        <>
          <TableWrap label="Orders">
            <thead><tr><Th>Order</Th><Th>Customer</Th><Th>Placed</Th><Th>Items</Th><Th>Total</Th><Th>Payment</Th><Th>Status</Th></tr></thead>
            <tbody>{orders.map((o) => (
              <tr key={o._id} className="hover:bg-surface/60">
                <Td><Link to={`/admin/orders/${o._id}`} className="font-mono font-bold underline">#{orderNumber(o._id)}</Link></Td>
                <Td>{o.user ? <><span className="font-bold">{o.user.name}</span><br /><span className="text-muted">{o.user.email}</span></> : <span className="text-muted">Deleted user</span>}</Td>
                <Td className="whitespace-nowrap text-muted">{formatDate(o.createdAt)}</Td>
                <Td>{o.items.reduce((n, i) => n + i.quantity, 0)}</Td>
                <Td className="font-bold">{formatPrice(o.total, o.currency)}</Td>
                <Td><PaymentBadge status={o.payment.status} /></Td>
                <Td><OrderStatusBadge status={o.status} /></Td>
              </tr>))}</tbody>
          </TableWrap>
          <Pagination page={result.data.pagination.page} pages={result.data.pagination.pages} onChange={setPage} />
        </>
      )}
    </>
  );
}
