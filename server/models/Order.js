const mongoose = require('mongoose');

const ORDER_STATUSES = ['Pending', 'Confirmed', 'Preparing', 'Out for Delivery', 'Delivered', 'Cancelled'];
const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded'];

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    // Snapshot fields so history stays correct if the product changes later.
    name: { type: String, required: true },
    image: String,
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: { type: [orderItemSchema], validate: [(v) => v.length > 0, 'Order must have at least one item'] },
    deliveryAddress: {
      fullName: { type: String, required: true, trim: true },
      phone: { type: String, required: true, trim: true },
      address: { type: String, required: true, trim: true },
      city: { type: String, required: true, trim: true },
      state: { type: String, required: true, trim: true },
      postalCode: { type: String, required: true, trim: true },
    },
    subtotal: { type: Number, required: true, min: 0 },
    tax: { type: Number, required: true, min: 0 },
    deliveryFee: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    couponCode: String,
    currency: { type: String, default: 'USD' },
    paymentMethod: { type: String, enum: ['paypal'], default: 'paypal' },
    payment: {
      status: { type: String, enum: PAYMENT_STATUSES, default: 'pending' },
      paypalOrderId: String,
      transactionId: String, // PayPal capture ID
      failureReason: String,
      amount: Number,
      paidAt: Date,
    },
    status: { type: String, enum: ORDER_STATUSES, default: 'Pending' },
  },
  { timestamps: true }
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
// Sparse unique: a PayPal order can only ever be attached to one of our orders (duplicate-capture guard).
orderSchema.index({ 'payment.paypalOrderId': 1 }, { unique: true, sparse: true });

// A PayPal capture can only ever belong to one order.
orderSchema.index({ 'payment.transactionId': 1 }, { unique: true, sparse: true });

orderSchema.statics.ORDER_STATUSES = ORDER_STATUSES;
orderSchema.statics.PAYMENT_STATUSES = PAYMENT_STATUSES;

module.exports = mongoose.model('Order', orderSchema);
