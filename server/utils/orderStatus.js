// Allowed admin status changes. Moving an order forward requires payment (checked in the service);
// the only thing an unpaid Pending order can do is be cancelled. Delivered and Cancelled are final.
const TRANSITIONS = {
  Pending: ['Cancelled'],
  Confirmed: ['Preparing', 'Cancelled'],
  Preparing: ['Out for Delivery', 'Cancelled'],
  'Out for Delivery': ['Delivered', 'Cancelled'],
  Delivered: [],
  Cancelled: [],
};
const canTransition = (from, to) => (TRANSITIONS[from] || []).includes(to);
module.exports = { TRANSITIONS, canTransition };
