import { Link } from 'react-router-dom';
import { Copy } from 'lucide-react';
import { useFetch } from '../hooks/useFetch';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { getActiveCoupons } from '../services/catalogService';
import { useToast } from '../context/ToastContext';
import { useCart } from '../context/CartContext';
import { EmptyState, ErrorState } from '../components/States';
import { describeCoupon, formatDay } from '../utils/format';

export default function Offers() {
  useDocumentTitle('Offers');
  const toast = useToast();
  const { setCouponCode, count } = useCart();
  const result = useFetch((signal) => getActiveCoupons({ signal }), []);
  const offers = result.data ? result.data.data : [];

  const copy = async (code) => {
    try { await navigator.clipboard.writeText(code); toast.success(`Code ${code} copied`); } catch { toast.info(`Your code is ${code}`); }
  };
  const applyCode = (code) => { setCouponCode(code); toast.success(`${code} will be applied in your cart`); };

  return (
    <div className="container-page py-8">
      <h1 className="text-4xl sm:text-5xl">Offers</h1>
      <p className="mt-2 max-w-xl text-muted">Codes that work right now. Enter one in your cart, or tap &ldquo;Use in cart&rdquo; and we will apply it for you.</p>

      <div className="mt-8">
        {result.loading && <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Loading offers">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-52" />)}</div>}
        {result.error && <ErrorState error={result.error} onRetry={result.reload} />}
        {result.data && offers.length === 0 && <EmptyState emoji="🎟️" title="No offers right now" message="Check back soon. New codes appear here the moment they go live." actionLabel="Browse the menu" actionTo="/menu" />}
        <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {offers.map((c) => (
            <li key={c._id} className="ticket flex flex-col p-6">
              <span className="font-mono text-3xl font-bold tracking-wide">{c.code}</span>
              <p className="mt-3 text-lg font-bold">{describeCoupon(c)}</p>
              {c.description && <p className="mt-1 text-ink/80">{c.description}</p>}
              <div className="ticket-divider" aria-hidden="true" />
              <p className="text-sm text-muted">Valid until {formatDay(c.expiresAt)}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={() => copy(c.code)} className="btn-ghost btn-sm"><Copy size={16} aria-hidden="true" /> Copy code</button>
                <Link to={count ? '/cart' : '/menu'} onClick={() => applyCode(c.code)} className="btn-primary btn-sm">{count ? 'Use in cart' : 'Shop and save'}</Link>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
