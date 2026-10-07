import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useFetch } from '../hooks/useFetch';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { getCategories, getProducts } from '../services/catalogService';
import { PAGE_SIZE, SORTS, activeFilterCount, readParams, toApiParams, writeParams } from '../utils/menuParams';
import { CATEGORY_EMOJI, formatPrice } from '../utils/format';
import ProductCard from '../components/ProductCard';
import Pagination from '../components/Pagination';
import { ProductGridSkeleton } from '../components/Skeletons';
import { EmptyState, ErrorState } from '../components/States';

function Chip({ children, onRemove, label }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-mustard-light py-1 pl-3 pr-1 text-sm font-bold">
      {children}
      <button onClick={onRemove} aria-label={`Remove filter: ${label}`} className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-mustard"><X size={14} /></button>
    </span>
  );
}

export default function Menu() {
  useDocumentTitle('Menu');
  const [sp, setSp] = useSearchParams();
  const f = useMemo(() => readParams(sp), [sp]);
  const [showFilters, setShowFilters] = useState(false);
  const [term, setTerm] = useState(f.q);
  const [price, setPrice] = useState({ min: f.minPrice, max: f.maxPrice });
  const [priceError, setPriceError] = useState('');

  const categories = useFetch((signal) => getCategories({ signal }), []);
  const result = useFetch((signal) => getProducts(toApiParams(f), { signal }), [sp.toString()]);

  // Every change resets to page 1; the functional form always starts from the CURRENT url.
  const update = (patch) => setSp((prev) => writeParams({ ...readParams(prev), page: 1, ...patch }));
  const goPage = (page) => { setSp((prev) => writeParams({ ...readParams(prev), page })); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const clearAll = () => { setSp({}); setTerm(''); };

  useEffect(() => { setTerm(f.q); }, [f.q]);
  useEffect(() => { setPrice({ min: f.minPrice, max: f.maxPrice }); }, [f.minPrice, f.maxPrice]);
  useEffect(() => { // debounce typing into the search box
    if (term.trim() === f.q) return undefined;
    const t = setTimeout(() => update({ q: term.trim() }), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term]);

  const applyPrice = (e) => {
    e.preventDefault();
    const min = price.min === '' ? null : Number(price.min);
    const max = price.max === '' ? null : Number(price.max);
    if ((min !== null && (Number.isNaN(min) || min < 0)) || (max !== null && (Number.isNaN(max) || max < 0))) return setPriceError('Prices must be positive numbers.');
    if (min !== null && max !== null && min > max) return setPriceError('The minimum cannot be higher than the maximum.');
    setPriceError('');
    return update({ minPrice: price.min, maxPrice: price.max });
  };

  const products = result.data ? result.data.data : [];
  const pg = result.data ? result.data.pagination : null;
  const count = activeFilterCount(f);
  const categoryName = categories.data && f.category ? (categories.data.data.find((c) => c.slug === f.category) || {}).name || f.category : f.category;
  const pill = (active) => `shrink-0 whitespace-nowrap rounded-full border-2 px-4 py-2 font-bold transition ${active ? 'border-ink bg-ink text-white' : 'border-line hover:border-ink'}`;

  return (
    <div className="container-page py-8">
      <h1 className="text-4xl sm:text-5xl">Menu</h1>

      <div className="-mx-4 mt-6 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0" role="group" aria-label="Categories">
        <div className="flex gap-2">
          <button onClick={() => update({ category: '' })} className={pill(!f.category)} aria-pressed={!f.category}>All</button>
          {categories.data && categories.data.data.map((c) => (
            <button key={c._id} onClick={() => update({ category: c.slug })} className={pill(f.category === c.slug)} aria-pressed={f.category === c.slug}>
              <span aria-hidden="true">{CATEGORY_EMOJI[c.slug] || '🍽️'} </span>{c.name}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-8 lg:flex-row">
        <aside id="filters" className={`${showFilters ? 'block' : 'hidden'} shrink-0 space-y-7 rounded-xl border-2 border-line p-5 lg:block lg:w-64 lg:self-start`} aria-label="Filters">
          <form onSubmit={applyPrice}>
            <h2 className="text-lg">Price</h2>
            <div className="mt-3 flex items-center gap-2">
              <label className="sr-only" htmlFor="minPrice">Minimum price</label>
              <input id="minPrice" inputMode="decimal" placeholder="Min" value={price.min} onChange={(e) => setPrice({ ...price, min: e.target.value })} className="input" />
              <span aria-hidden="true">to</span>
              <label className="sr-only" htmlFor="maxPrice">Maximum price</label>
              <input id="maxPrice" inputMode="decimal" placeholder="Max" value={price.max} onChange={(e) => setPrice({ ...price, max: e.target.value })} className="input" />
            </div>
            {priceError && <p role="alert" className="mt-2 text-sm font-medium text-ketchup-dark">{priceError}</p>}
            <button type="submit" className="btn-ghost btn-sm mt-3 w-full">Apply price</button>
          </form>

          <fieldset>
            <legend className="text-lg font-display font-extrabold">Rating</legend>
            {[['', 'Any rating'], ['4', '4 stars and up'], ['3', '3 stars and up']].map(([v, label]) => (
              <label key={v} className="mt-2 flex min-h-[44px] cursor-pointer items-center gap-3">
                <input type="radio" name="rating" checked={f.rating === v} onChange={() => update({ rating: v })} className="h-5 w-5 accent-ketchup" /> {label}
              </label>
            ))}
          </fieldset>

          <label className="flex min-h-[44px] cursor-pointer items-center gap-3 font-bold">
            <input type="checkbox" checked={f.inStock} onChange={(e) => update({ inStock: e.target.checked })} className="h-5 w-5 accent-ketchup" /> In stock only
          </label>
          {count > 0 && <button onClick={clearAll} className="font-bold text-ketchup-dark underline">Clear all filters</button>}
        </aside>

        <section className="min-w-0 flex-1" aria-live="polite">
          <div className="flex flex-wrap items-center gap-3">
            <form role="search" onSubmit={(e) => { e.preventDefault(); update({ q: term.trim() }); }} className="relative min-w-[220px] flex-1">
              <label htmlFor="menu-search" className="sr-only">Search dishes</label>
              <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
              <input id="menu-search" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search dishes, ingredients, categories" className="input pl-10" />
            </form>
            <button onClick={() => setShowFilters((s) => !s)} className="btn-ghost lg:hidden" aria-expanded={showFilters} aria-controls="filters">
              <SlidersHorizontal size={18} aria-hidden="true" /> Filters{count > 0 ? ` (${count})` : ''}
            </button>
            <div>
              <label htmlFor="sort" className="sr-only">Sort by</label>
              <select id="sort" value={f.sort} onChange={(e) => update({ sort: e.target.value })} className="input pr-8">
                {SORTS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
              </select>
            </div>
          </div>

          {count > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {f.q && <Chip label={`search ${f.q}`} onRemove={() => update({ q: '' })}>&ldquo;{f.q}&rdquo;</Chip>}
              {f.category && <Chip label={categoryName} onRemove={() => update({ category: '' })}>{categoryName}</Chip>}
              {(f.minPrice !== '' || f.maxPrice !== '') && (
                <Chip label="price" onRemove={() => update({ minPrice: '', maxPrice: '' })}>
                  {f.minPrice !== '' && f.maxPrice !== '' ? `${formatPrice(f.minPrice)} to ${formatPrice(f.maxPrice)}` : f.minPrice !== '' ? `From ${formatPrice(f.minPrice)}` : `Up to ${formatPrice(f.maxPrice)}`}
                </Chip>
              )}
              {f.rating && <Chip label="rating" onRemove={() => update({ rating: '' })}>{f.rating}+ stars</Chip>}
              {f.inStock && <Chip label="in stock" onRemove={() => update({ inStock: false })}>In stock</Chip>}
              <button onClick={clearAll} className="px-2 text-sm font-bold text-ketchup-dark underline">Clear all</button>
            </div>
          )}

          <div className="mt-6">
            {result.loading && <ProductGridSkeleton count={6} />}
            {result.error && <ErrorState error={result.error} onRetry={result.reload} title="We could not load the menu" />}
            {result.data && products.length === 0 && (
              <div>
                <EmptyState title="Nothing matches that" message="Try a different word, or loosen the filters." emoji="🔍" />
                {count > 0 && <div className="mt-4 text-center"><button onClick={clearAll} className="btn-dark">Clear all filters</button></div>}
              </div>
            )}
            {result.data && products.length > 0 && (
              <>
                <p className="mb-4 text-sm text-muted">Showing {(pg.page - 1) * PAGE_SIZE + 1} to {(pg.page - 1) * PAGE_SIZE + products.length} of {pg.total} dishes</p>
                <div className="grid grid-cols-1 gap-5 min-[480px]:grid-cols-2 xl:grid-cols-3">
                  {products.map((p) => <ProductCard key={p._id} product={p} />)}
                </div>
                <Pagination page={pg.page} pages={pg.pages} onChange={goPage} />
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
