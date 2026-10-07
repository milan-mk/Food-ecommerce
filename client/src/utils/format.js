import { CURRENCY, ASSET_ORIGIN } from '../config';

export const formatPrice = (amount, currency = CURRENCY) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number(amount) || 0);

export const formatDate = (value) =>
  new Date(value).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

// Product images are stored as "/images/..." paths served by the API (or full URLs).
export const imageUrl = (path) => {
  if (!path) return '/placeholder.svg';
  return /^https?:\/\//i.test(path) ? path : `${ASSET_ORIGIN}${path}`;
};

export const CATEGORY_EMOJI = { burgers: '🍔', pizza: '🍕', sides: '🍟', beverages: '🥤', desserts: '🍰', combos: '🍱' };

export const describeCoupon = (c) => {
  const what = c.discountType === 'percentage'
    ? `${c.discountValue}% off${c.maxDiscount ? `, up to ${formatPrice(c.maxDiscount)}` : ''}`
    : `${formatPrice(c.discountValue)} off`;
  return c.minOrder > 0 ? `${what} orders over ${formatPrice(c.minOrder)}` : what;
};

export const formatDay = (value) => new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
