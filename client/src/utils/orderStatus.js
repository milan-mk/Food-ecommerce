// Mirrors the server's rules (server/utils/orderStatus.js). The API enforces them; this only decides which buttons to show.
export const TRANSITIONS = {
  Pending: ['Cancelled'],
  Confirmed: ['Preparing', 'Cancelled'],
  Preparing: ['Out for Delivery', 'Cancelled'],
  'Out for Delivery': ['Delivered', 'Cancelled'],
  Delivered: [],
  Cancelled: [],
};

// Moving an order forward needs a verified payment; cancelling is always possible until it is final.
export const nextStatuses = (order) => (TRANSITIONS[order.status] || []).filter((s) => s === 'Cancelled' || order.payment.status === 'paid');

// A customer paid just as the order was cancelled: money is held and needs refunding by hand.
export const needsRefund = (order) => order.status === 'Cancelled' && order.payment.status === 'paid';
