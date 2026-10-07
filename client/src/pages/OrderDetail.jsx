import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useFetch } from '../hooks/useFetch';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useToast } from '../context/ToastContext';
import { cancelOrder, getOrder } from '../services/orderService';
import OrderSummary from '../components/OrderSummary';
import PayPalPayment from '../components/PayPalPayment';
import StatusTracker from '../components/StatusTracker';
import Spinner from '../components/Spinner';
import { ErrorState } from '../components/States';
import { formatDate, orderNumber } from '../utils/format';

const FINAL = ['Delivered', 'Cancelled'];

export default function OrderDetail() {
  const { id } = useParams();
  const toast = useToast();
  const result = useFetch((signal) => getOrder(id, { signal }), [id]);
  const order = result.data && result.data.data;
  const [cancelling, setCancelling] = useState(false);
  useDocumentTitle(order ? `Order #${orderNumber(order._id)}` : 'Order');

  // Active orders refresh themselves, so status changes made by the kitchen show up without reloading.
  useEffect(() => {
    if (!order || FINAL.includes(order.status)) return undefined;
    const t = setInterval(result.reload, 20000);
    return () => clearInterval(t);
  }, [order, result.reload]);

  if (result.loading && !order) return <Spinner label="Loading your order..." className="min-h-[50vh]" />;
  if (result.error && !order) {
    return (
      <div className="container-page py-16">
        {result.error.status === 404
          ? <div className="text-center"><h1 className="text-4xl">We could not find that order</h1><p className="mt-2 text-muted">It may belong to a different account.</p><Link to="/orders" className="btn-primary mt-6">Go to My orders</Link></div>
          : <ErrorState error={result.error} onRetry={result.reload} />}
      </div>
    );
  }

  const unpaid = order.status === 'Pending' && order.payment.status !== 'paid';
  const paidAndActive = order.payment.status === 'paid' && !FINAL.includes(order.status);

  const cancel = async () => {
    if (!window.confirm('Cancel this order? Your reserved items will be released.')) return;
    setCancelling(true);
    try { await cancelOrder(order._id); toast.success('Order cancelled'); result.reload(); } catch (err) { toast.error(err.message); } finally { setCancelling(false); }
  };

  return (
    <div className="container-page max-w-4xl py-8">
      <Link to="/orders" className="inline-flex items-center gap-1 font-bold underline"><ArrowLeft size={16} aria-hidden="true" /> My orders</Link>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-2">
        <h1 className="text-4xl">Order <span className="font-mono">#{orderNumber(order._id)}</span></h1>
        <p className="text-muted">Placed {formatDate(order.createdAt)}</p>
      </div>

      <section className="mt-8 rounded-xl border-2 border-line p-5" aria-label="Order status"><StatusTracker status={order.status} />
        {order.status === 'Pending' && <p className="mt-4 text-center text-ink/80">Waiting for payment. The kitchen starts as soon as it is confirmed.</p>}
        {order.payment.status === 'refunded' && <p className="mt-4 text-center font-bold text-leaf">Your payment was refunded.</p>}
      </section>

      {unpaid && (
        <section className="mt-6 rounded-xl border-2 border-ink bg-mustard-light p-5" aria-labelledby="paynow">
          <h2 id="paynow" className="text-2xl">Finish paying for this order</h2>
          {order.payment.status === 'failed' && <p className="mt-1 font-medium text-ketchup-dark">Your last payment attempt did not go through. You can try again.</p>}
          <div className="mt-4 max-w-md"><PayPalPayment order={order} onPaid={() => { toast.success('Payment received. Your order is confirmed!'); result.reload(); }} /></div>
          <button onClick={cancel} disabled={cancelling} className="mt-4 font-bold text-ketchup-dark underline">{cancelling ? 'Cancelling...' : 'Cancel this order'}</button>
        </section>
      )}
      {paidAndActive && <p className="mt-6 rounded-lg bg-surface px-4 py-3">Need to change or cancel a paid order? <Link to="/contact" className="font-bold underline">Contact us</Link> with order number <b className="font-mono">#{orderNumber(order._id)}</b>.</p>}

      <div className="ticket mt-8 p-6 sm:p-8"><OrderSummary order={order} /></div>
    </div>
  );
}
