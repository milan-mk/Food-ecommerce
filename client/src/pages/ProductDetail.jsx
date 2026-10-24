import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronRight, ShoppingBag } from 'lucide-react';
import { useFetch } from '../hooks/useFetch';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { getProduct } from '../services/catalogService';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import SafeImage from '../components/SafeImage';
import Rating from '../components/Rating';
import QuantityStepper from '../components/QuantityStepper';
import ProductCard from '../components/ProductCard';
import Reviews from '../components/Reviews';
import { ErrorState } from '../components/States';
import { formatPrice } from '../utils/format';

function StockBadge({ stock }) {
  if (stock < 1) return <span className="chip bg-ketchup-light text-ketchup-dark">Sold out</span>;
  if (stock <= 5) return <span className="chip bg-mustard-light">Only {stock} left</span>;
  return <span className="chip bg-leaf-light text-leaf">In stock</span>;
}

const NUTRITION = [['calories', 'Calories', 'kcal'], ['protein', 'Protein', 'g'], ['carbs', 'Carbohydrates', 'g'], ['fat', 'Fat', 'g']];

export default function ProductDetail() {
  const { slug } = useParams();
  const { add } = useCart();
  const toast = useToast();
  const [qty, setQty] = useState(1);
  const result = useFetch((signal) => getProduct(slug, { signal }), [slug]);
  const p = result.data && result.data.data;
  useDocumentTitle(p ? p.name : 'Dish');
  useEffect(() => { setQty(1); }, [slug]);

  if (result.loading && !p) {
    return (
      <div className="container-page grid gap-10 py-10 md:grid-cols-2" role="status" aria-label="Loading dish">
        <div className="skeleton aspect-[4/3]" />
        <div className="space-y-4"><div className="skeleton h-10 w-3/4" /><div className="skeleton h-6 w-1/3" /><div className="skeleton h-24 w-full" /><div className="skeleton h-12 w-1/2" /></div>
      </div>
    );
  }
  if (result.error) {
    return (
      <div className="container-page py-16">
        {result.error.status === 404
          ? <div className="text-center"><h1 className="text-4xl">That dish is not on the menu</h1><p className="mt-2 text-muted">It may have been removed or renamed.</p><Link to="/menu" className="btn-primary mt-6">Back to the menu</Link></div>
          : <ErrorState error={result.error} onRetry={result.reload} />}
      </div>
    );
  }

  const soldOut = p.stock < 1;
  const maxQty = Math.min(20, p.stock);
  const nutrition = NUTRITION.filter(([k]) => p.nutrition && p.nutrition[k] !== undefined && p.nutrition[k] !== null);
  const onAdd = () => (add(p, qty) ? toast.success(`Added ${qty} x ${p.name} to your cart`) : toast.error(`${p.name} is sold out`));

  return (
    <div className="container-page py-8">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-muted">
        <Link to="/menu" className="hover:underline">Menu</Link><ChevronRight size={14} aria-hidden="true" />
        {p.category && <><Link to={`/menu?category=${p.category.slug}`} className="hover:underline">{p.category.name}</Link><ChevronRight size={14} aria-hidden="true" /></>}
        <span aria-current="page" className="font-bold text-ink">{p.name}</span>
      </nav>

      <div className="mt-6 grid gap-10 md:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border-2 border-ink bg-surface">
          <SafeImage src={p.image} alt={p.name} width="800" height="600" loading="eager" className="aspect-[4/3] w-full object-cover" />
        </div>

        <div>
          <h1 className="text-4xl sm:text-5xl">{p.name}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-3"><Rating value={p.ratingAverage} count={p.ratingCount} /><StockBadge stock={p.stock} /></div>
          <p className="mt-5 font-display text-4xl font-extrabold">{formatPrice(p.price)}</p>
          <p className="mt-4 text-lg text-ink/85">{p.description}</p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            {!soldOut && <QuantityStepper value={qty} max={maxQty} onChange={setQty} label={p.name} />}
            <button onClick={onAdd} disabled={soldOut} className="btn-primary flex-1 sm:flex-none sm:px-10"><ShoppingBag size={20} aria-hidden="true" /> {soldOut ? 'Sold out' : `Add to cart, ${formatPrice(Math.round(p.price * qty * 100) / 100)}`}</button>
          </div>

          <div className="mt-10 grid gap-8 sm:grid-cols-2">
            {p.ingredients && p.ingredients.length > 0 && (
              <section aria-labelledby="ing"><h2 id="ing" className="text-xl">Ingredients</h2>
                <ul className="mt-3 flex flex-wrap gap-2">{p.ingredients.map((i) => <li key={i} className="chip">{i}</li>)}</ul></section>
            )}
            {nutrition.length > 0 && (
              <section aria-labelledby="nut"><h2 id="nut" className="text-xl">Nutrition</h2>
                <dl className="mt-3 divide-y divide-line border-y border-line">
                  {nutrition.map(([k, label, unit]) => <div key={k} className="flex justify-between py-2"><dt>{label}</dt><dd className="font-bold">{p.nutrition[k]} {unit}</dd></div>)}
                </dl></section>
            )}
          </div>
        </div>
      </div>

      <Reviews product={p} onChanged={result.reload} />

      {result.data.related && result.data.related.length > 0 && (
        <section aria-labelledby="rel" className="mt-16">
          <h2 id="rel" className="text-3xl">You might also like</h2>
          <div className="mt-6 grid grid-cols-1 gap-5 min-[480px]:grid-cols-2 lg:grid-cols-4">
            {result.data.related.map((r) => <ProductCard key={r._id} product={{ ...r, category: p.category }} />)}
          </div>
        </section>
      )}
    </div>
  );
}
