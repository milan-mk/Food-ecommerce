import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Tag, Trash2, X } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { getProduct } from '../services/catalogService';
import { quote as fetchQuote } from '../services/orderService';
import { toOrderItems } from '../context/cartReducer';
import SafeImage from '../components/SafeImage';
import QuantityStepper from '../components/QuantityStepper';
import { EmptyState } from '../components/States';
import { formatPrice } from '../utils/format';

export default function Cart() {
  useDocumentTitle('Your cart');
  const { items, setQuantity, remove, clear, refresh, couponCode, setCouponCode } = useCart();
  const toast = useToast();
  const [quote, setQuote] = useState({ loading: false, data: null, error: null });
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');

  // 1) On opening the cart, re-read each product so old prices/stock never linger.
  useEffect(() => {
    if (!items.length) return undefined;
    let alive = true;
    (async () => {
      const results = await Promise.allSettled(items.map((i) => getProduct(i.slug)));
      if (!alive) return;
      const products = [];
      let changed = 0;
      results.forEach((r, idx) => {
        const item = items[idx];
        if (r.status === 'fulfilled') {
          const p = r.value.data;
          products.push(p);
          if (p.price !== item.price || p.stock < item.quantity) changed++;
        } else if (r.reason && r.reason.status === 404) {
          changed++; // no longer on the menu
        } else {
          products.push({ _id: item.id, name: item.name, slug: item.slug, price: item.price, image: item.image, stock: item.stock }); // network trouble: keep as is
        }
      });
      refresh(products);
      if (changed) toast.info('Some items were updated to match the latest menu.');
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2) The server prices the cart (tax, delivery, discount). The browser only displays what it returns.
  useEffect(() => {
    if (!items.length) { setQuote({ loading: false, data: null, error: null }); return undefined; }
    let alive = true;
    setQuote((q) => ({ ...q, loading: true, error: null }));
    const t = setTimeout(async () => {
      try {
        const r = await fetchQuote(toOrderItems(items), couponCode || undefined);
        if (alive) setQuote({ loading: false, data: r.data, error: null });
      } catch (err) {
        if (!alive) return;
        if ((err.errors || []).some((e) => e.field === 'couponCode')) { setCouponError(err.message); setCouponCode(''); } // bad code: drop it and re-price
        else setQuote({ loading: false, data: null, error: err });
      }
    }, 250);
    return () => { alive = false; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, couponCode]);

  const applyCoupon = (e) => {
    e.preventDefault();
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setCouponError('');
    setCouponCode(code);
    setCouponInput('');
  };

  if (!items.length) {
    return <div className="container-page py-16"><EmptyState emoji="🛍️" title="Your cart is empty" message="Add a burger, a pizza or something sweet and it will show up here." actionLabel="Browse the menu" actionTo="/menu" /></div>;
  }

  const q = quote.data;
  const row = 'flex items-baseline justify-between gap-4';
  return (
    <div className="container-page py-8">
      <div className="flex items-end justify-between gap-4">
        <h1 className="text-4xl sm:text-5xl">Your cart</h1>
        <button onClick={() => { clear(); toast.info('Your cart was cleared'); }} className="flex items-center gap-1 font-bold text-ketchup-dark underline"><Trash2 size={16} aria-hidden="true" /> Clear cart</button>
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]">
        <ul className="divide-y divide-line border-y border-line">
          {items.map((i) => (
            <li key={i.id} className="flex gap-4 py-5">
              <Link to={`/product/${i.slug}`} className="shrink-0" tabIndex={-1} aria-hidden="true">
                <SafeImage src={i.image} alt="" width="120" height="90" className="h-20 w-24 rounded-lg object-cover sm:h-24 sm:w-32" />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-lg leading-snug"><Link to={`/product/${i.slug}`} className="hover:underline">{i.name}</Link></h2>
                    <p className="text-muted">{formatPrice(i.price)} each</p>
                    {i.stock <= 5 && <p className="text-sm font-bold text-ketchup-dark">Only {i.stock} left</p>}
                  </div>
                  <button onClick={() => remove(i.id)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-surface hover:text-ink" aria-label={`Remove ${i.name} from cart`}><X size={20} /></button>
                </div>
                <div className="mt-auto flex items-center justify-between gap-3">
                  <QuantityStepper value={i.quantity} max={Math.min(20, i.stock)} onChange={(n) => setQuantity(i.id, n)} label={i.name} />
                  <span className="font-display text-xl font-extrabold">{formatPrice(Math.round(i.price * i.quantity * 100) / 100)}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside className="lg:self-start">
          <div className="ticket p-6" aria-live="polite">
            <h2 className="text-2xl">Order summary</h2>

            <form onSubmit={applyCoupon} className="mt-5">
              <label htmlFor="coupon" className="label">Promo code</label>
              {couponCode ? (
                <p className="flex items-center justify-between rounded-lg bg-leaf-light px-3 py-2 font-bold"><span className="flex items-center gap-2"><Tag size={16} aria-hidden="true" /> {couponCode}</span>
                  <button type="button" onClick={() => { setCouponCode(''); setCouponError(''); }} className="text-sm underline">Remove</button></p>
              ) : (
                <div className="flex gap-2">
                  <input id="coupon" value={couponInput} onChange={(e) => setCouponInput(e.target.value)} placeholder="e.g. WELCOME10" className="input uppercase" autoComplete="off" />
                  <button type="submit" className="btn-ghost btn-sm shrink-0">Apply</button>
                </div>
              )}
              {couponError && <p role="alert" className="mt-2 text-sm font-medium text-ketchup-dark">{couponError}</p>}
            </form>

            <div className="ticket-divider" aria-hidden="true" />

            {quote.error && <p role="alert" className="rounded-lg bg-ketchup-light px-3 py-2 font-medium text-ketchup-dark">{quote.error.message}</p>}
            {!quote.error && !q && <p className="text-muted" role="status">Calculating your total...</p>}
            {q && (
              <dl className={`space-y-2 ${quote.loading ? 'opacity-60' : ''}`}>
                <div className={row}><dt>Subtotal</dt><dd>{formatPrice(q.subtotal)}</dd></div>
                {q.discount > 0 && <div className={`${row} font-bold text-leaf`}><dt>Discount ({q.couponCode})</dt><dd>-{formatPrice(q.discount)}</dd></div>}
                <div className={row}><dt>Tax</dt><dd>{formatPrice(q.tax)}</dd></div>
                <div className={row}><dt>Delivery</dt><dd>{q.deliveryFee === 0 ? 'Free' : formatPrice(q.deliveryFee)}</dd></div>
                <div className={`${row} border-t-2 border-ink pt-3 text-xl font-extrabold`}><dt>Total</dt><dd className="font-display text-2xl">{formatPrice(q.total)}</dd></div>
              </dl>
            )}

            {q ? <Link to="/checkout" className="btn-primary mt-6 w-full">Go to checkout</Link> : <button type="button" disabled className="btn-primary mt-6 w-full">Go to checkout</button>}
            <p className="mt-3 text-center text-sm text-muted">Final prices are confirmed by our server at checkout.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
