const ORDER = {
  Pending: 'bg-mustard-light text-ink', Confirmed: 'bg-leaf-light text-leaf', Preparing: 'bg-mustard text-ink',
  'Out for Delivery': 'bg-ink text-white', Delivered: 'bg-leaf text-white', Cancelled: 'bg-ketchup-light text-ketchup-dark',
};
const PAYMENT = { pending: 'bg-mustard-light text-ink', paid: 'bg-leaf-light text-leaf', failed: 'bg-ketchup-light text-ketchup-dark', refunded: 'bg-surface text-ink' };
const PAYMENT_LABEL = { pending: 'Awaiting payment', paid: 'Paid', failed: 'Payment failed', refunded: 'Refunded' };

export function OrderStatusBadge({ status }) {
  return <span className={`chip ${ORDER[status] || 'bg-surface'}`}>{status}</span>;
}
export function PaymentBadge({ status }) {
  return <span className={`chip ${PAYMENT[status] || 'bg-surface'}`}>{PAYMENT_LABEL[status] || status}</span>;
}
