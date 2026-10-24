import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState } from 'react';
import { cartReducer, cartCount, cartSubtotal, limitFor, sanitizeStored } from './cartReducer';

const KEY = 'snackyard-cart-v1';
const COUPON_KEY = 'snackyard-coupon-v1';
const CartContext = createContext(null);

function load() {
  try { return sanitizeStored(JSON.parse(localStorage.getItem(KEY))); } catch { return []; }
}

function loadCoupon() {
  try { return localStorage.getItem(COUPON_KEY) || ''; } catch { return ''; }
}

export function CartProvider({ children }) {
  const [items, dispatch] = useReducer(cartReducer, undefined, load);
  const [couponCode, setCouponCode] = useState(loadCoupon);

  useEffect(() => {
    try { couponCode ? localStorage.setItem(COUPON_KEY, couponCode) : localStorage.removeItem(COUPON_KEY); } catch { /* ignore */ }
  }, [couponCode]);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* storage full or blocked: cart still works for this visit */ }
  }, [items]);

  const add = useCallback((product, quantity = 1) => {
    if (limitFor(product.stock) < 1) return false;
    dispatch({ type: 'add', product, quantity });
    return true;
  }, []);

  const value = useMemo(() => ({
    items, count: cartCount(items), subtotal: cartSubtotal(items), add,
    setQuantity: (id, quantity) => dispatch({ type: 'setQuantity', id, quantity }),
    remove: (id) => dispatch({ type: 'remove', id }),
    clear: () => { dispatch({ type: 'clear' }); setCouponCode(''); },
    couponCode, setCouponCode,
    refresh: (products) => dispatch({ type: 'refresh', products }),
  }), [items, add, couponCode]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
};
