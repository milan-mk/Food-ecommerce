import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useCartQuote } from '../hooks/useCartQuote';
import { addAddress } from '../services/authService';
import { cancelOrder, createOrder, getOrder } from '../services/orderService';
import { toOrderItems } from '../context/cartReducer';
import AddressFields from '../components/AddressFields';
import OrderSummary from '../components/OrderSummary';
import PayPalPayment from '../components/PayPalPayment';
import Spinner from '../components/Spinner';
import { applyServerErrors, flattenAddressErrors } from '../utils/forms';
import { formatPrice, orderNumber } from '../utils/format';

// An order that was created but not yet paid survives a page reload, so a refresh never creates (and reserves stock for) a duplicate.
const PENDING_KEY = 'snackyard-pending-order';
const blank = (user) => ({ fullName: user.name || '', phone: user.phone || '', address: '', city: '', state: '', postalCode: '' });
const fromSaved = (a) => ({ fullName: a.fullName, phone: a.phone, address: a.address, city: a.city, state: a.state, postalCode: a.postalCode });

export default function Checkout() {
  useDocumentTitle('Checkout');
  const { user, replaceUser } = useAuth();
  const { items, couponCode, clear } = useCart();
  const toast = useToast();
  const navigate = useNavigate();

  const saved = user.addresses || [];
  const def = saved.find((a) => a.isDefault) || saved[0];
  const [order, setOrder] = useState(null); // set once the order exists and is waiting for payment
  const [resuming, setResuming] = useState(() => Boolean(sessionStorage.getItem(PENDING_KEY)));
  const [selected, setSelected] = useState(def ? def._id : 'new');
  const [saveIt, setSaveIt] = useState(false);
  const [busyEdit, setBusyEdit] = useState(false);

  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = useForm({ defaultValues: def ? fromSaved(def) : blank(user) });
  const quote = useCartQuote(items, couponCode, { enabled: !order && !resuming });

  // Come back to an unpaid order after a reload / accidental navigation.
  useEffect(() => {
    const id = sessionStorage.getItem(PENDING_KEY);
    if (!id) return undefined;
    let alive = true;
    getOrder(id)
      .then((r) => {
        if (!alive) return;
        const o = r.data;
        if (o.payment.status === 'paid') { sessionStorage.removeItem(PENDING_KEY); clear(); navigate(`/order-success/${o._id}`, { replace: true }); }
        else if (o.status === 'Pending') setOrder(o);
        else sessionStorage.removeItem(PENDING_KEY);
      })
      .catch(() => sessionStorage.removeItem(PENDING_KEY))
      .finally(() => alive && setResuming(false));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pickSaved = (value) => {
    setSelected(value);
    const a = saved.find((x) => x._id === value);
    reset(a ? fromSaved(a) : blank(user));
  };

  const onSubmit = async (values) => {
    try {
      const r = await createOrder({ items: toOrderItems(items), couponCode: couponCode || undefined, deliveryAddress: values });
      sessionStorage.setItem(PENDING_KEY, r.data._id);
      setOrder(r.data);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (saveIt && selected === 'new') { // a failure here (e.g. 5 addresses already) must never block the order
        try { replaceUser((await addAddress(values)).data.user); } catch { /* ignore */ }
      }
    } catch (err) {
      applyServerErrors(flattenAddressErrors(err), setError);
    }
  };

  const onPaid = (paid) => {
    sessionStorage.removeItem(PENDING_KEY);
    clear();
    toast.success('Payment received. Your order is confirmed!');
    navigate(`/order-success/${paid._id}`, { replace: true });
  };

  const editDetails = async () => {
    setBusyEdit(true);
    try {
      await cancelOrder(order._id); // releases the reserved stock and coupon
      sessionStorage.removeItem(PENDING_KEY);
      setOrder(null);
      toast.info('Order cancelled so you can change your details.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyEdit(false);
    }
  };

  if (resuming) return <Spinner label="Checking for an unfinished order..." className="min-h-[50vh]" />;
  if (!order && items.length === 0) return <Navigate to="/cart" replace />;

  // ---------- step 2: pay ----------
  if (order) {
    const a = order.deliveryAddress;
    return (
      <div className="container-page py-8">
        <h1 className="text-4xl sm:text-5xl">Pay for your order</h1>
        <p className="mt-2 text-muted">Order <b className="font-mono text-ink">#{orderNumber(order._id)}</b> is saved. It is confirmed as soon as your PayPal payment goes through.</p>
        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_400px]">
          <div>
            <section className="rounded-xl border-2 border-line p-5">
              <h2 className="text-lg">Delivering to</h2>
              <address className="mt-2 not-italic text-ink/85">{a.fullName}, {a.phone}<br />{a.address}, {a.city}, {a.state} {a.postalCode}</address>
              <button onClick={editDetails} disabled={busyEdit} className="mt-3 font-bold underline">{busyEdit ? 'Cancelling...' : 'Change delivery details'}</button>
            </section>
            <section className="mt-6" aria-labelledby="paywith">
              <h2 id="paywith" className="text-2xl">Pay {formatPrice(order.total, order.currency)} with PayPal</h2>
              <p className="mb-4 mt-1 text-sm text-muted">You can use your PayPal balance, or a card through PayPal. We never see your card details.</p>
              <PayPalPayment order={order} onPaid={onPaid} />
            </section>
          </div>
          <aside className="lg:self-start"><div className="ticket p-6"><h2 className="mb-2 text-2xl">Order summary</h2><OrderSummary order={order} showMeta={false} /></div></aside>
        </div>
      </div>
    );
  }

  // ---------- step 1: delivery details ----------
  const q = quote.data;
  return (
    <div className="container-page py-8">
      <h1 className="text-4xl sm:text-5xl">Checkout</h1>
      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_400px]">
        <form onSubmit={handleSubmit(onSubmit)} noValidate id="checkout-form">
          {errors.root && errors.root.server && (
            <div role="alert" className="mb-6 rounded-lg bg-ketchup-light px-4 py-3 font-medium text-ketchup-dark">
              {errors.root.server.message} <Link to="/cart" className="underline">Back to cart</Link>
            </div>
          )}
          <h2 className="text-2xl">Where should we deliver?</h2>

          {saved.length > 0 && (
            <fieldset className="mt-4 grid gap-2">
              <legend className="sr-only">Saved addresses</legend>
              {saved.map((a) => (
                <label key={a._id} className={`flex min-h-[44px] cursor-pointer items-start gap-3 rounded-lg border-2 p-3 ${selected === a._id ? 'border-ink bg-mustard-light' : 'border-line'}`}>
                  <input type="radio" name="saved" checked={selected === a._id} onChange={() => pickSaved(a._id)} className="mt-1 h-5 w-5 accent-ketchup" />
                  <span><b>{a.label || 'Address'}</b>{a.isDefault && <span className="chip ml-2 bg-leaf-light text-leaf">Default</span>}<br /><span className="text-sm text-ink/80">{a.address}, {a.city} {a.postalCode}</span></span>
                </label>
              ))}
              <label className={`flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg border-2 p-3 ${selected === 'new' ? 'border-ink bg-mustard-light' : 'border-line'}`}>
                <input type="radio" name="saved" checked={selected === 'new'} onChange={() => pickSaved('new')} className="h-5 w-5 accent-ketchup" /> <b>Use a new address</b>
              </label>
            </fieldset>
          )}

          <div className="mt-6"><AddressFields register={register} errors={errors} /></div>

          {selected === 'new' && saved.length < 5 && (
            <label className="mt-4 flex min-h-[44px] cursor-pointer items-center gap-3">
              <input type="checkbox" checked={saveIt} onChange={(e) => setSaveIt(e.target.checked)} className="h-5 w-5 accent-ketchup" /> Save this address for next time
            </label>
          )}
        </form>

        <aside className="lg:self-start">
          <div className="ticket p-6" aria-live="polite">
            <h2 className="text-2xl">Order summary</h2>
            <ul className="mt-3 divide-y divide-line">
              {items.map((i) => <li key={i.id} className="flex justify-between gap-3 py-2"><span>{i.quantity} x {i.name}</span><span className="font-bold">{formatPrice(Math.round(i.price * i.quantity * 100) / 100)}</span></li>)}
            </ul>
            <div className="ticket-divider" aria-hidden="true" />
            {quote.error && <p role="alert" className="rounded-lg bg-ketchup-light px-3 py-2 font-medium text-ketchup-dark">{quote.error.message} <Link to="/cart" className="underline">Review cart</Link></p>}
            {!quote.error && !q && <p className="text-muted" role="status">Calculating your total...</p>}
            {q && (
              <dl className={`space-y-2 ${quote.loading ? 'opacity-60' : ''}`}>
                <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatPrice(q.subtotal)}</dd></div>
                {q.discount > 0 && <div className="flex justify-between font-bold text-leaf"><dt>Discount ({q.couponCode})</dt><dd>-{formatPrice(q.discount)}</dd></div>}
                <div className="flex justify-between"><dt>Tax</dt><dd>{formatPrice(q.tax)}</dd></div>
                <div className="flex justify-between"><dt>Delivery</dt><dd>{q.deliveryFee === 0 ? 'Free' : formatPrice(q.deliveryFee)}</dd></div>
                <div className="flex items-baseline justify-between border-t-2 border-ink pt-3 text-xl font-extrabold"><dt>Total</dt><dd className="font-display text-2xl">{formatPrice(q.total)}</dd></div>
              </dl>
            )}
            <button type="submit" form="checkout-form" disabled={isSubmitting || !q} className="btn-primary mt-6 w-full">{isSubmitting ? 'Saving your order...' : 'Continue to payment'}</button>
            <p className="mt-3 text-center text-sm text-muted">You pay on the next step. Nothing is charged yet.</p>
            <p className="mt-2 text-center text-sm"><Link to="/cart" className="font-bold underline">Edit cart</Link></p>
          </div>
        </aside>
      </div>
    </div>
  );
}
