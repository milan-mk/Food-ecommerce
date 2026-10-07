import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { getMyOrders } from '../services/orderService';
import Pagination from '../components/Pagination';
import { EmptyState, ErrorState } from '../components/States';
import { OrderStatusBadge, PaymentBadge } from '../components/StatusBadge';
import { formatDate, formatPrice, orderNumber } from '../utils/format';

const FILTERS = ['All', 'Pending', 'Confirmed', 'Preparing', 'Out for Delivery', 'Delivered', 'Cancelled'];

export default function Orders() {
  useDocumentTitle('My orders');
  const [status, setStatus] = useState('All');
  const [page, setPage] = useState(1);
  const result = useFetch((signal) => getMyOrders({ page, limit: 8, ...(status !== 'All' ? { status } : {}) }, { signal }), [page, status]);
  const orders = result.data ? result.data.data : [];

  return (
    <div className="container-page py-8">
      <h1 className="text-4xl sm:text-5xl">My orders</h1>
      <div className="-mx-4 mt-6 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0" role="group" aria-label="Filter by status">
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button key={f} onClick={() => { setStatus(f); setPage(1); }} aria-pressed={status === f}
              className={`shrink-0 whitespace-nowrap rounded-full border-2 px-4 py-2 font-bold ${status === f ? 'border-ink bg-ink text-white' : 'border-line hover:border-ink'}`}>{f}</button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        {result.loading && !result.data && <div className="space-y-4" role="status" aria-label="Loading orders">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-28" />)}</div>}
        {result.error && <ErrorState error={result.error} onRetry={result.reload} />}
        {result.data && orders.length === 0 && (
          <EmptyState emoji="🧾" title={status === 'All' ? 'No orders yet' : `No ${status.toLowerCase()} orders`} message={status === 'All' ? 'Your orders will show up here, with live status updates.' : 'Try another filter.'} actionLabel="Browse the menu" actionTo="/menu" />
        )}
        <ul className="space-y-4">
          {orders.map((o) => (
            <li key={o._id}>
              <Link to={`/orders/${o._id}`} className="block rounded-xl border-2 border-line p-5 transition hover:border-ink">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-display text-xl font-extrabold">Order <span className="font-mono">#{orderNumber(o._id)}</span></p>
                  <div className="flex flex-wrap gap-2"><OrderStatusBadge status={o.status} /><PaymentBadge status={o.payment.status} /></div>
                </div>
                <p className="mt-2 text-ink/80">{o.items.map((i) => `${i.quantity} x ${i.name}`).join(', ')}</p>
                <div className="mt-3 flex items-center justify-between text-sm"><time className="text-muted" dateTime={o.createdAt}>{formatDate(o.createdAt)}</time><span className="font-display text-lg font-extrabold">{formatPrice(o.total, o.currency)}</span></div>
              </Link>
            </li>
          ))}
        </ul>
        {result.data && <Pagination page={result.data.pagination.page} pages={result.data.pagination.pages} onChange={setPage} />}
      </div>
    </div>
  );
}
