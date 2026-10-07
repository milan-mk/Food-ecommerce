const { z } = require('zod');

const boolStr = z.enum(['true', 'false']).transform((v) => v === 'true');
const page = z.coerce.number().int().min(1).default(1);
const limit = (d = 10) => z.coerce.number().int().min(1).max(100).default(d);
const ORDER_STATUSES = ['Pending', 'Confirmed', 'Preparing', 'Out for Delivery', 'Delivered', 'Cancelled'];

exports.statsQuery = z.object({ days: z.coerce.number().int().min(1).max(90).default(14) });

exports.ordersQuery = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  paymentStatus: z.enum(['pending', 'paid', 'failed', 'refunded']).optional(),
  q: z.string().trim().min(1).max(60).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page, limit: limit(),
});
exports.updateStatus = z.object({ status: z.enum(ORDER_STATUSES) });

exports.usersQuery = z.object({
  q: z.string().trim().min(1).max(60).optional(),
  role: z.enum(['customer', 'admin']).optional(),
  isActive: boolStr.optional(),
  page, limit: limit(),
});
exports.updateUser = z.object({ isActive: z.boolean().optional(), role: z.enum(['customer', 'admin']).optional() })
  .refine((o) => Object.keys(o).length > 0, 'Provide isActive and/or role');

exports.inventoryQuery = z.object({
  q: z.string().trim().min(1).max(60).optional(),
  filter: z.enum(['all', 'low', 'out']).default('all'),
  threshold: z.coerce.number().int().min(1).max(1000).default(10),
  page, limit: limit(20),
});
exports.stockUpdate = z.object({
  set: z.coerce.number().int().min(0).max(100000).optional(),
  adjust: z.coerce.number().int().min(-100000).max(100000).refine((n) => n !== 0, 'Adjustment cannot be zero').optional(),
}).refine((o) => (o.set !== undefined) !== (o.adjust !== undefined), 'Provide exactly one of "set" or "adjust"');

// ---- coupons ----
const code = z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,30}$/, 'Code must be 3-30 letters, numbers, - or _');
const couponBase = z.object({
  code,
  description: z.string().trim().max(200).optional(),
  discountType: z.enum(['percentage', 'fixed']),
  discountValue: z.coerce.number().positive('Discount must be greater than 0').max(100000),
  minOrder: z.coerce.number().min(0).max(100000).optional(),
  maxDiscount: z.coerce.number().positive().max(100000).optional(),
  expiresAt: z.coerce.date(),
  isActive: z.boolean().optional(),
  usageLimit: z.coerce.number().int().min(1).max(1000000).optional(),
});
exports.createCoupon = couponBase.refine((c) => c.expiresAt > new Date(), { message: 'Expiry date must be in the future', path: ['expiresAt'] })
  .refine((c) => c.discountType !== 'percentage' || c.discountValue <= 100, { message: 'Percentage cannot exceed 100', path: ['discountValue'] });
exports.updateCoupon = couponBase.partial().refine((o) => Object.keys(o).length > 0, 'Provide at least one field to update');
