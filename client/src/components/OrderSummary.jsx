import { OrderStatusBadge, PaymentBadge } from './StatusBadge';
import SafeImage from './SafeImage';
import { formatDate, formatPrice } from '../utils/format';

// The receipt: items, totals, and (optionally) delivery and payment details. All numbers come from the saved order.
export default function OrderSummary({ order, showMeta = true }) {
  const row = 'flex items-baseline justify-between gap-4';
  const a = order.deliveryAddress;
  return (
    <div>
      <ul className="divide-y divide-line">
        {order.items.map((i) => (
          <li key={i.product} className="flex items-center gap-3 py-3">
            <SafeImage src={i.image} alt="" width="64" height="48" className="h-12 w-16 shrink-0 rounded object-cover" />
            <div className="min-w-0 flex-1"><p className="font-bold leading-snug">{i.name}</p><p className="text-sm text-muted">{i.quantity} x {formatPrice(i.price, order.currency)}</p></div>
            <p className="font-bold">{formatPrice(Math.round(i.price * i.quantity * 100) / 100, order.currency)}</p>
          </li>
        ))}
      </ul>

      <dl className="mt-4 space-y-2 border-t-2 border-ink pt-4">
        <div className={row}><dt>Subtotal</dt><dd>{formatPrice(order.subtotal, order.currency)}</dd></div>
        {order.discount > 0 && <div className={`${row} font-bold text-leaf`}><dt>Discount{order.couponCode ? ` (${order.couponCode})` : ''}</dt><dd>-{formatPrice(order.discount, order.currency)}</dd></div>}
        <div className={row}><dt>Tax</dt><dd>{formatPrice(order.tax, order.currency)}</dd></div>
        <div className={row}><dt>Delivery</dt><dd>{order.deliveryFee === 0 ? 'Free' : formatPrice(order.deliveryFee, order.currency)}</dd></div>
        <div className={`${row} pt-2 text-xl font-extrabold`}><dt>Total</dt><dd className="font-display text-2xl">{formatPrice(order.total, order.currency)}</dd></div>
      </dl>

      {showMeta && (
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <section aria-labelledby="addr"><h3 id="addr" className="text-lg">Delivering to</h3>
            <address className="mt-2 not-italic text-ink/85">{a.fullName}<br />{a.address}<br />{a.city}, {a.state} {a.postalCode}<br />{a.phone}</address></section>
          <section aria-labelledby="pay"><h3 id="pay" className="text-lg">Payment</h3>
            <dl className="mt-2 space-y-1 text-ink/85">
              <div className="flex gap-2"><dt>Method:</dt><dd>PayPal</dd></div>
              <div className="flex items-center gap-2"><dt>Status:</dt><dd><PaymentBadge status={order.payment.status} /></dd></div>
              {order.payment.paidAt && <div className="flex gap-2"><dt>Paid:</dt><dd>{formatDate(order.payment.paidAt)}</dd></div>}
              {order.payment.transactionId && <div className="flex flex-wrap gap-2"><dt>Transaction:</dt><dd className="break-all font-mono text-sm">{order.payment.transactionId}</dd></div>}
              <div className="flex items-center gap-2"><dt>Order status:</dt><dd><OrderStatusBadge status={order.status} /></dd></div>
            </dl></section>
        </div>
      )}
    </div>
  );
}
