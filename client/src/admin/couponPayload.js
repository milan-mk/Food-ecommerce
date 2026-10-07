// Form values <-> coupon API object. The date input gives "YYYY-MM-DD"; a coupon is valid through the END of that day.
export const emptyCoupon = { code: '', description: '', discountType: 'percentage', discountValue: '', minOrder: '', maxDiscount: '', expiresAt: '', usageLimit: '', isActive: true };

export function toCouponFormValues(c) {
  return {
    code: c.code, description: c.description || '', discountType: c.discountType, discountValue: String(c.discountValue),
    minOrder: c.minOrder ? String(c.minOrder) : '', maxDiscount: c.maxDiscount ? String(c.maxDiscount) : '',
    expiresAt: new Date(c.expiresAt).toISOString().slice(0, 10), usageLimit: c.usageLimit ? String(c.usageLimit) : '', isActive: c.isActive,
  };
}

export function toCouponPayload(v) {
  const num = (x) => (String(x).trim() === '' ? undefined : Number(x));
  return {
    code: v.code.trim().toUpperCase(),
    description: v.description.trim() || undefined,
    discountType: v.discountType,
    discountValue: Number(v.discountValue),
    minOrder: num(v.minOrder),
    maxDiscount: v.discountType === 'percentage' ? num(v.maxDiscount) : undefined, // a cap only makes sense for percentages
    expiresAt: new Date(`${v.expiresAt}T23:59:59`).toISOString(),
    usageLimit: num(v.usageLimit),
    isActive: Boolean(v.isActive),
  };
}
