import { Link, useParams } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { useFetch } from '../hooks/useFetch';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { getOrder } from '../services/orderService';
import OrderSummary from '../components/OrderSummary';
import Spinner from '../components/Spinner';
import { ErrorState } from '../components/States';
import { orderNumber } from '../utils/format';

export default function OrderSuccess() {
  const { id } = useParams();
  useDocumentTitle('Order confirmed');
  const result = useFetch((signal) => getOrder(id, { signal }), [id]);
  const order = result.data && result.data.data;

  if (result.loading && !order) return <Spinner label="Loading your order..." className="min-h-[50vh]" />;
  if (result.error) return <div className="container-page py-16"><ErrorState error={result.error} onRetry={result.reload} title="We could not load this order" /></div>;

  const paid = order.payment.status === 'paid';
  return (
    <div className="container-page max-w-3xl py-10">
      <div className="text-center">
        <CheckCircle2 size={56} className={`mx-auto ${paid ? 'text-leaf' : 'text-mustard-dark'}`} aria-hidden="true" />
        <h1 className="mt-3 text-4xl sm:text-5xl">{paid ? 'Thank you! Your order is in.' : 'Your order is saved'}</h1>
        <p className="mt-2 text-lg text-ink/80">
          {paid ? <>The kitchen is on it. Your order number is <b className="font-mono">#{orderNumber(order._id)}</b>.</> : <>Payment has not been completed yet for order <b className="font-mono">#{orderNumber(order._id)}</b>.</>}
        </p>
      </div>
      <div className="ticket mt-8 p-6 sm:p-8"><OrderSummary order={order} /></div>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to={`/orders/${order._id}`} className="btn-primary">{paid ? 'Track this order' : 'Go to order and pay'}</Link>
        <Link to="/menu" className="btn-ghost">Keep browsing</Link>
      </div>
    </div>
  );
}
