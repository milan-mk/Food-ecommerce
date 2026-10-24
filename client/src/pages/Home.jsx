import { Link } from 'react-router-dom';
import { ArrowRight, Copy, ShoppingBag } from 'lucide-react';
import { useFetch } from '../hooks/useFetch';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { getActiveCoupons, getCategories, getProducts } from '../services/catalogService';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import ProductCard from '../components/ProductCard';
import SafeImage from '../components/SafeImage';
import { ProductGridSkeleton } from '../components/Skeletons';
import { EmptyState, ErrorState } from '../components/States';
import { CATEGORY_EMOJI, describeCoupon, formatPrice } from '../utils/format';

function HeroTicket({ featured, coupon }) {
  const { add } = useCart();
  const toast = useToast();
  const product = featured.data && featured.data.data[0];

  const onAdd = () => (add(product) ? toast.success(`Added ${product.name} to your cart`) : toast.error(`${product.name} is sold out`));

  return (
    <div className="ticket mx-auto w-full max-w-md rotate-1 p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <span className="chip bg-mustard">Today&apos;s pick</span>
        <span className="text-sm font-bold text-muted">Made to order</span>
      </div>

      {featured.loading && (
        <div className="mt-5 space-y-3" role="status" aria-label="Loading today's pick">
          <div className="skeleton aspect-[16/9]" /><div className="skeleton h-7 w-2/3" /><div className="skeleton h-4 w-full" />
        </div>
      )}
      {featured.error && <div className="mt-5"><ErrorState error={featured.error} onRetry={featured.reload} title="The menu is not available right now" /></div>}
      {product && (
        <>
          <Link to={`/product/${product.slug}`} className="mt-5 block overflow-hidden rounded border-2 border-ink">
            <SafeImage src={product.image} alt={product.name} width="400" height="225" className="aspect-[16/9] w-full object-cover" />
          </Link>
          <h2 className="mt-4 text-3xl leading-tight">{product.name}</h2>
          <p className="mt-1 line-clamp-2 text-ink/80">{product.description}</p>
          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="font-display text-3xl font-extrabold">{formatPrice(product.price)}</span>
            <button onClick={onAdd} disabled={product.stock < 1} className="btn-primary"><ShoppingBag size={18} aria-hidden="true" /> Add to cart</button>
          </div>
        </>
      )}
      {!featured.loading && !featured.error && !product && <p className="mt-5 text-muted">Check the full menu for today&apos;s dishes.</p>}

      {coupon && (
        <>
          <div className="ticket-divider" aria-hidden="true" />
          <p className="text-sm"><b className="rounded bg-surface px-2 py-1 font-mono">{coupon.code}</b> <span className="ml-1">{describeCoupon(coupon)}</span></p>
        </>
      )}
    </div>
  );
}

function CopyCode({ code }) {
  const toast = useToast();
  const copy = async () => {
    try { await navigator.clipboard.writeText(code); toast.success(`Code ${code} copied`); } catch { toast.info(`Your code is ${code}`); }
  };
  return <button onClick={copy} className="btn-ghost btn-sm"><Copy size={16} aria-hidden="true" /> Copy code</button>;
}

const STEPS = [
  ['Choose', 'Add anything from the menu. Prices and stock are checked live.'],
  ['Pay with PayPal', 'Your payment is confirmed on our server before the kitchen starts.'],
  ['Follow your order', 'See it move from confirmed to preparing to out for delivery.'],
];

export default function Home() {
  useDocumentTitle();
  const featured = useFetch((signal) => getProducts({ featured: true, limit: 8 }, { signal }), []);
  const categories = useFetch((signal) => getCategories({ signal }), []);
  const coupons = useFetch((signal) => getActiveCoupons({ signal }), []);
  const offers = (coupons.data && coupons.data.data) || [];

  return (
    <>
      <section className="border-b border-line bg-mustard-light/60">
        <div className="container-page grid items-center gap-12 py-12 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
          <div>
            <h1 className="text-5xl leading-[1.02] sm:text-6xl lg:text-7xl">Burgers, pizza and sides, made when you order.</h1>
            <p className="mt-5 max-w-lg text-lg text-ink/80">Pick your favourites, pay safely with PayPal and follow your order from the kitchen to your door.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/menu" className="btn-primary">Browse the menu <ArrowRight size={18} aria-hidden="true" /></Link>
              <Link to="/offers" className="btn-ghost">See today&apos;s offers</Link>
            </div>
          </div>
          <HeroTicket featured={featured} coupon={offers[0]} />
        </div>
      </section>

      <section className="container-page mt-16" aria-labelledby="cats">
        <h2 id="cats" className="text-3xl">What are you hungry for?</h2>
        {categories.loading && <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6" role="status" aria-label="Loading categories">{Array.from({ length: 6 }, (_, i) => <div key={i} className="skeleton h-28" />)}</div>}
        {categories.error && <div className="mt-6"><ErrorState error={categories.error} onRetry={categories.reload} /></div>}
        {categories.data && (
          <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {categories.data.data.map((c) => (
              <li key={c._id}>
                <Link to={`/menu?category=${c.slug}`} className="flex h-full flex-col items-center gap-1 rounded-xl border-2 border-line px-3 py-5 text-center transition hover:border-ink hover:bg-mustard-light">
                  <span className="text-4xl" aria-hidden="true">{CATEGORY_EMOJI[c.slug] || '🍽️'}</span>
                  <span className="font-display text-lg font-extrabold">{c.name}</span>
                  <span className="text-sm text-muted">{c.productCount} {c.productCount === 1 ? 'item' : 'items'}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="container-page mt-16" aria-labelledby="fav">
        <div className="flex items-end justify-between gap-4">
          <h2 id="fav" className="text-3xl">Customer favourites</h2>
          <Link to="/menu" className="font-bold underline decoration-ketchup decoration-2 underline-offset-4">View full menu</Link>
        </div>
        <div className="mt-6">
          {featured.loading && <ProductGridSkeleton count={4} />}
          {featured.error && <ErrorState error={featured.error} onRetry={featured.reload} />}
          {featured.data && featured.data.data.length === 0 && <EmptyState title="No favourites yet" message="Our full menu has plenty to choose from." actionLabel="Browse the menu" actionTo="/menu" />}
          {featured.data && featured.data.data.length > 0 && (
            <div className="grid grid-cols-1 gap-5 min-[480px]:grid-cols-2 lg:grid-cols-4">
              {featured.data.data.map((p) => <ProductCard key={p._id} product={p} />)}
            </div>
          )}
        </div>
      </section>

      {offers.length > 0 && (
        <section className="mt-16 bg-mustard" aria-labelledby="offers">
          <div className="container-page py-12">
            <h2 id="offers" className="text-3xl">Codes you can use today</h2>
            <ul className="mt-6 grid gap-4 md:grid-cols-3">
              {offers.slice(0, 3).map((c) => (
                <li key={c._id} className="flex flex-col items-start gap-3 rounded-md border-2 border-dashed border-ink bg-white p-5">
                  <span className="font-mono text-2xl font-bold">{c.code}</span>
                  <p className="flex-1">{c.description || describeCoupon(c)}</p>
                  <p className="text-sm text-muted">{describeCoupon(c)}</p>
                  <CopyCode code={c.code} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className="container-page mt-16" aria-labelledby="how">
        <h2 id="how" className="text-3xl">How ordering works</h2>
        <ol className="mt-8 grid gap-8 md:grid-cols-3">
          {STEPS.map(([title, text], i) => (
            <li key={title} className="flex gap-4">
              <span className="font-display text-6xl font-extrabold leading-none text-ketchup" aria-hidden="true">{i + 1}</span>
              <div><h3 className="text-xl">{title}</h3><p className="mt-1 text-ink/80">{text}</p></div>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
