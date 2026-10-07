import { useEffect, useRef, useState } from 'react';
import { quote as fetchQuote } from '../services/orderService';
import { toOrderItems } from '../context/cartReducer';

// Asks the SERVER to price the cart (tax, delivery, discount). The browser only displays the answer.
// onBadCoupon(message) is called when the promo code is refused, so the page can clear it and show why.
export function useCartQuote(items, couponCode, { enabled = true, onBadCoupon } = {}) {
  const [state, setState] = useState({ loading: false, data: null, error: null });
  const badCoupon = useRef(onBadCoupon);
  badCoupon.current = onBadCoupon;

  useEffect(() => {
    if (!enabled || !items.length) { setState({ loading: false, data: null, error: null }); return undefined; }
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    const t = setTimeout(async () => {
      try {
        const r = await fetchQuote(toOrderItems(items), couponCode || undefined);
        if (alive) setState({ loading: false, data: r.data, error: null });
      } catch (err) {
        if (!alive) return;
        if ((err.errors || []).some((e) => e.field === 'couponCode') && badCoupon.current) badCoupon.current(err.message);
        else setState({ loading: false, data: null, error: err });
      }
    }, 250);
    return () => { alive = false; clearTimeout(t); };
  }, [items, couponCode, enabled]);

  return state;
}
