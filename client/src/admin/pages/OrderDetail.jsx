import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useToast } from '../../context/ToastContext';
import { getOrder } from '../../services/orderService';
import { refundOrder, setOrderStatus } from '../../services/adminService';
import OrderSummary from '../../components/OrderSummary';
import StatusTracker from '../../components/StatusTracker';
import Spinner from '../../components/Spinner';
import { ErrorState } from '../../components/States';
import { formatDate, orderNumber } from '../../utils/format';
import { needsRefund, nextStatuses } from '../../utils/orderStatus';
import { Card } from '../ui';

export default function AdminOrderDetail() {
  const { id } = useParams();
  const toast = useToast();
  const result = useFetch((signal) => getOrder(id, { signal }), [id]);
  const order = result.data && result.data.data;
  const [busy, setBusy] = useState(false);
  useDocumentTitle(order ? `Order #${orderNumber(order._id)}` : 'Order');

  if (result.loading && !order) return <Spinner label="Loading order..." />;
  if (result.error && !order) return <ErrorState error={result.error} onRetry={result.reload} title="Order not found" />;

  const act = async (fn, success) => {
    setBusy(true);
    try { await fn(); toast.success(success); result.reload(); } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  };
  const move = (status) => {
    if (status === 'Cancelled') {
      const paid = order.payment.status === 'paid';
      const msg = paid ? `Cancel this order and refund ${order.total} ${order.currency} to the customer through PayPal? This cannot be undone.` : 'Cancel this order? Reserved stock will be released.';
      if (!window.confirm(msg)) return;
      act(() => setOrderStatus(order._id, status), paid ? 'Order cancelled and payment refunded' : 'Order cancelled');
    } else act(() => setOrderStatus(order._id, status), `Order is now "${status}"`);
  };
  const next = nextStatuses(order);
  const forward = next.filter((s) => s !== 'Cancelled');
  const u = order.user;

  return (
    <>
      <Link to="/admin/orders" className="inline-flex items-center gap-1 font-bold underline"><ArrowLeft size={16} aria-hidden="true" /> All orders</Link>
      <div className="mb-6 mt-3 flex flex-wrap items-end justify-between gap-2">
        <h1 className="text-3xl">Order <span className="font-mono">#{orderNumber(order._id)}</span></h1>
        <p className="text-muted">Placed {formatDate(order.createdAt)}</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card title="Progress"><StatusTracker status={order.status} /></Card>
          <Card><OrderSummary order={order} /></Card>
        </div>

        <div className="space-y-6 xl:self-start">
          <Card title="Update order">
            {needsRefund(order) && (
              <div role="alert" className="mb-4 rounded-lg bg-ketchup-light p-3 text-sm font-medium text-ketchup-dark">
                This order was cancelled but the customer's payment is still held. {order.payment.failureReason}
                <button onClick={() => { if (window.confirm('Refund the full payment through PayPal?')) act(() => refundOrder(order._id), 'Payment refunded'); }} disabled={busy} className="btn-dark btn-sm mt-3 w-full">Refund payment</button>
              </div>
            )}
            {next.length === 0 && !needsRefund(order) && <p className="text-muted">This order is {order.status.toLowerCase()}, so there is nothing left to change.</p>}
            {order.status === 'Pending' && order.payment.status !== 'paid' && <p className="mb-3 text-sm text-muted">Waiting for the customer to pay. It can only move forward once PayPal confirms the payment.</p>}
            <div className="grid gap-2">
              {forward.map((s) => <button key={s} onClick={() => move(s)} disabled={busy} className="btn-primary">Mark as {s}</button>)}
              {next.includes('Cancelled') && <button onClick={() => move('Cancelled')} disabled={busy} className="btn-ghost text-ketchup-dark">{order.payment.status === 'paid' ? 'Cancel and refund' : 'Cancel order'}</button>}
            </div>
          </Card>

          <Card title="Customer">
            {u ? (
              <address className="not-italic">
                <Link to={`/admin/users/${u._id}`} className="font-bold underline">{u.name}</Link><br />
                <a href={`mailto:${u.email}`} className="text-ink/80 underline">{u.email}</a>
                {u.phone && <><br /><a href={`tel:${u.phone}`} className="text-ink/80">{u.phone}</a></>}
              </address>
            ) : <p className="text-muted">This account has been deleted.</p>}
          </Card>
          {order.couponCode && <Card title="Coupon"><p className="font-mono font-bold">{order.couponCode}</p></Card>}
        </div>
      </div>
    </>
  );
}
