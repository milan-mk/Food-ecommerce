import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFetch } from '../../hooks/useFetch';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { getStats } from '../../services/adminService';
import { ErrorState } from '../../components/States';
import { OrderStatusBadge } from '../../components/StatusBadge';
import { formatCompactPrice, formatDate, formatPrice, orderNumber } from '../../utils/format';
import BarChart from '../BarChart';
import { Card, PageHeader, Select, StatCard, TableWrap, Td, Th } from '../ui';

const STATUS_COLOR = { Pending: 'bg-mustard', Confirmed: 'bg-leaf', Preparing: 'bg-mustard-dark', 'Out for Delivery': 'bg-ink', Delivered: 'bg-leaf', Cancelled: 'bg-ketchup' };

export default function Dashboard() {
  useDocumentTitle('Dashboard');
  const [days, setDays] = useState(14);
  const stats = useFetch((signal) => getStats(days, { signal }), [days]);
  const d = stats.data && stats.data.data;

  if (stats.error && !d) return <ErrorState error={stats.error} onRetry={stats.reload} title="The dashboard did not load" />;
  if (!d) return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" role="status" aria-label="Loading dashboard">{Array.from({ length: 8 }, (_, i) => <div key={i} className="skeleton h-28" />)}</div>;

  const periodSales = d.salesByDay.reduce((s, x) => s + x.revenue, 0);
  const periodOrders = d.salesByDay.reduce((s, x) => s + x.orders, 0);
  const chart = d.salesByDay.map((x) => ({ label: x.date.slice(5), value: x.revenue, title: `${x.date}: ${formatPrice(x.revenue)} from ${x.orders} ${x.orders === 1 ? 'order' : 'orders'}` }));
  const maxStatus = Math.max(1, ...Object.values(d.statusCounts));

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Sales count paid orders only. Refunded orders are removed from the totals." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total sales" value={formatPrice(d.totals.sales)} note={`${d.totals.paidOrders} paid orders`} />
        <StatCard label="Total orders" value={d.totals.orders} />
        <StatCard label="Customers" value={d.totals.customers} />
        <StatCard label="Products" value={d.totals.products} />
        <StatCard label="Awaiting payment" value={d.pendingOrders} note="Created but not paid" />
        <StatCard label="In progress" value={d.activeOrders} note="Paid, being prepared or delivered" />
        <StatCard label="Delivered" value={d.completedOrders} />
        <div className="rounded-xl border border-line bg-white p-5">
          <p className="text-sm font-bold text-muted">Low stock</p>
          <p className="mt-1 font-display text-3xl font-extrabold">{d.totals.lowStock}</p>
          <p className="mt-1 text-sm"><Link to="/admin/inventory?filter=low" className="font-bold text-ketchup-dark underline">{d.totals.lowStock ? 'Review stock' : 'All stocked up'}</Link> <span className="text-muted">({d.lowStockThreshold} or fewer)</span></p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Card title="Sales" action={<Select id="days" label="Time range" value={days} onChange={(e) => setDays(Number(e.target.value))}><option value={7}>Last 7 days</option><option value={14}>Last 14 days</option><option value={30}>Last 30 days</option></Select>}>
          <p className="mb-2 text-sm text-muted"><b className="text-ink">{formatPrice(periodSales)}</b> from {periodOrders} {periodOrders === 1 ? 'order' : 'orders'} in this period (days shown in UTC)</p>
          <BarChart data={chart} format={formatCompactPrice} ariaLabel={`Daily sales for the last ${days} days`} />
        </Card>

        <Card title="Orders by status">
          <ul className="space-y-3">
            {Object.entries(d.statusCounts).map(([status, n]) => (
              <li key={status}>
                <div className="flex justify-between text-sm"><span className="font-bold">{status}</span><span>{n}</span></div>
                <div className="mt-1 h-2 rounded-full bg-surface" role="presentation"><div className={`h-2 rounded-full ${STATUS_COLOR[status]}`} style={{ width: `${(n / maxStatus) * 100}%` }} /></div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Card title="Recent orders" action={<Link to="/admin/orders" className="text-sm font-bold underline">All orders</Link>}>
          {d.recentOrders.length === 0 ? <p className="text-muted">No orders yet.</p> : (
            <TableWrap label="Recent orders">
              <thead><tr><Th>Order</Th><Th>Customer</Th><Th>Total</Th><Th>Status</Th><Th>Placed</Th></tr></thead>
              <tbody>{d.recentOrders.map((o) => (
                <tr key={o._id}>
                  <Td><Link to={`/admin/orders/${o._id}`} className="font-mono font-bold underline">#{orderNumber(o._id)}</Link></Td>
                  <Td>{o.user ? o.user.name : 'Deleted user'}</Td><Td>{formatPrice(o.total)}</Td><Td><OrderStatusBadge status={o.status} /></Td><Td className="whitespace-nowrap text-muted">{formatDate(o.createdAt)}</Td>
                </tr>))}</tbody>
            </TableWrap>
          )}
        </Card>
        <Card title="Popular dishes">
          {d.popularProducts.length === 0 ? <p className="text-muted">Sales will appear here after the first paid order.</p> : (
            <ol className="space-y-3">{d.popularProducts.map((p, i) => (
              <li key={p._id} className="flex items-center gap-3"><span className="font-display text-2xl font-extrabold text-ketchup" aria-hidden="true">{i + 1}</span><span className="flex-1 font-bold">{p.name}</span><span className="text-sm text-muted">{p.soldCount} sold</span></li>))}</ol>
          )}
        </Card>
      </div>
    </>
  );
}
