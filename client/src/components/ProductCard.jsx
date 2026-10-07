import { Link } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import SafeImage from './SafeImage';
import Rating from './Rating';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { formatPrice } from '../utils/format';

export default function ProductCard({ product }) {
  const { add } = useCart();
  const toast = useToast();
  const soldOut = product.stock < 1;

  const onAdd = () => {
    if (add(product)) toast.success(`Added ${product.name} to your cart`);
    else toast.error(`${product.name} is sold out`);
  };

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-line bg-white transition hover:border-ink">
      <Link to={`/product/${product.slug}`} className="block overflow-hidden bg-surface" tabIndex={-1} aria-hidden="true">
        <SafeImage src={product.image} alt="" width="400" height="300" className="aspect-[4/3] w-full object-cover transition duration-300 group-hover:scale-105" />
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        {product.category && product.category.name && <p className="text-xs font-bold text-muted">{product.category.name}</p>}
        <h3 className="text-lg leading-snug"><Link to={`/product/${product.slug}`} className="hover:underline">{product.name}</Link></h3>
        <Rating value={product.ratingAverage} count={product.ratingCount} />
        <div className="mt-auto flex items-center justify-between gap-3 pt-3">
          <span className="font-display text-xl font-extrabold">{formatPrice(product.price)}</span>
          <button onClick={onAdd} disabled={soldOut} className="btn-primary btn-sm" aria-label={soldOut ? `${product.name} is sold out` : `Add ${product.name} to cart`}>
            {soldOut ? 'Sold out' : <><ShoppingBag size={16} aria-hidden="true" /> Add</>}
          </button>
        </div>
      </div>
    </article>
  );
}
