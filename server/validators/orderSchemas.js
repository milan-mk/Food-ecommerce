const { z } = require('zod');
const { OBJECT_ID_RE } = require('../utils/objectId');

const objectId = z.string().regex(OBJECT_ID_RE, 'Invalid product id');

// Only product id + quantity are accepted. Unknown keys (e.g. a tampered "price") are stripped by zod.
const items = z.array(z.object({
  product: objectId,
  quantity: z.coerce.number().int('Quantity must be a whole number').min(1, 'Quantity must be at least 1').max(20, 'Maximum 20 per item'),
})).min(1, 'Your cart is empty').max(30, 'Too many different items');

const couponCode = z.string().trim().toUpperCase().max(30).optional().transform((v) => v || undefined);

const deliveryAddress = z.object({
  fullName: z.string().trim().min(2, 'Full name is required').max(80),
  phone: z.string().trim().regex(/^[0-9+\-\s()]{7,15}$/, 'Invalid phone number'),
  address: z.string().trim().min(5, 'Address is too short').max(200),
  city: z.string().trim().min(2, 'City is required').max(60),
  state: z.string().trim().min(2, 'State is required').max(60),
  postalCode: z.string().trim().regex(/^[A-Za-z0-9\- ]{3,10}$/, 'Invalid postal code'),
});

exports.quote = z.object({ items, couponCode });
exports.createOrder = z.object({ items, couponCode, deliveryAddress });
exports.validateCoupon = z.object({ code: z.string().trim().toUpperCase().min(1, 'Coupon code is required').max(30), items });
exports.myOrdersQuery = z.object({
  status: z.enum(['Pending', 'Confirmed', 'Preparing', 'Out for Delivery', 'Delivered', 'Cancelled']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});
