// The menu's filters live in the URL (?category=pizza&sort=price_asc&page=2), so pages are shareable and the back button works.
export const PAGE_SIZE = 12;
export const SORTS = [['newest', 'Newest'], ['popular', 'Most popular'], ['rating', 'Top rated'], ['price_asc', 'Price: low to high'], ['price_desc', 'Price: high to low']];
const SORT_KEYS = SORTS.map(([k]) => k);

const num = (v) => { if (v === null || v === undefined || v === '') return ''; const n = Number(v); return Number.isFinite(n) && n >= 0 ? String(n) : ''; };

export function readParams(sp) {
  const page = parseInt(sp.get('page'), 10);
  return {
    q: (sp.get('q') || '').trim().slice(0, 100),
    category: sp.get('category') || '',
    minPrice: num(sp.get('minPrice')),
    maxPrice: num(sp.get('maxPrice')),
    rating: ['3', '4'].includes(sp.get('rating')) ? sp.get('rating') : '',
    inStock: sp.get('inStock') === 'true',
    sort: SORT_KEYS.includes(sp.get('sort')) ? sp.get('sort') : 'newest',
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

// Only non-default values go into the URL, keeping it short.
export function writeParams(f) {
  const out = {};
  if (f.q) out.q = f.q;
  if (f.category) out.category = f.category;
  if (f.minPrice !== '') out.minPrice = f.minPrice;
  if (f.maxPrice !== '') out.maxPrice = f.maxPrice;
  if (f.rating) out.rating = f.rating;
  if (f.inStock) out.inStock = 'true';
  if (f.sort !== 'newest') out.sort = f.sort;
  if (f.page > 1) out.page = String(f.page);
  return out;
}

export function toApiParams(f) {
  const p = { sort: f.sort, page: f.page, limit: PAGE_SIZE };
  if (f.q) p.q = f.q;
  if (f.category) p.category = f.category;
  if (f.minPrice !== '') p.minPrice = Number(f.minPrice);
  if (f.maxPrice !== '') p.maxPrice = Number(f.maxPrice);
  if (f.rating) p.rating = Number(f.rating);
  if (f.inStock) p.inStock = true;
  return p;
}

export const activeFilterCount = (f) => ['q', 'category', 'minPrice', 'maxPrice', 'rating'].filter((k) => f[k] !== '').length + (f.inStock ? 1 : 0);

// Page numbers to show: 1 ... 4 5 6 ... 20 ("..." is represented by null).
export function pageWindow(page, pages) {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const set = new Set([1, 2, pages - 1, pages, page - 1, page, page + 1]);
  const list = [...set].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  return list.flatMap((n, i) => (i > 0 && n - list[i - 1] > 1 ? [null, n] : [n]));
}
