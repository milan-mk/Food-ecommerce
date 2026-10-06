// Usage (server running + database seeded):  node scripts/smoke-slice2.js
// Exercises auth, categories and products against http://localhost:5000
require('../config/env');
const BASE = process.env.API_URL || `http://localhost:${process.env.PORT || 5000}/api`;
const ADMIN = { email: process.env.SEED_ADMIN_EMAIL || 'admin@example.com', password: process.env.SEED_ADMIN_PASSWORD || 'Admin@12345' };

let passed = 0, failed = 0;
const check = (name, ok, extra = '') => { ok ? passed++ : failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  -> ' + extra}`); };

async function call(method, path, { body, cookie } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const set = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json, cookie: set.length ? set[0].split(';')[0] : null };
}

(async () => {
  const email = `smoke${Date.now()}@example.com`;
  const pw = 'Smoke12345';

  let r = await call('GET', '/health');
  check('health endpoint', r.status === 200);

  // ---- auth ----
  r = await call('POST', '/auth/register', { body: { name: 'Smoke Test', email, password: pw } });
  check('register -> 201 + cookie, role customer', r.status === 201 && r.cookie && r.json.data.user.role === 'customer' && !r.json.data.user.password, JSON.stringify(r.json));
  r = await call('POST', '/auth/register', { body: { name: 'Smoke Test', email, password: pw } });
  check('duplicate email -> 409', r.status === 409);
  r = await call('POST', '/auth/register', { body: { name: 'X', email: 'bad', password: 'short' } });
  check('invalid register -> 422 with field errors', r.status === 422 && r.json.errors?.length >= 2);
  r = await call('POST', '/auth/register', { body: { name: 'Hacker', email: `h${Date.now()}@example.com`, password: pw, role: 'admin' } });
  check('cannot self-register as admin', r.status === 201 && r.json.data.user.role === 'customer');
  r = await call('POST', '/auth/login', { body: { email, password: 'WrongPass1' } });
  check('wrong password -> 401', r.status === 401);
  r = await call('POST', '/auth/login', { body: { email, password: pw } });
  const custCookie = r.cookie;
  check('login -> 200 + cookie', r.status === 200 && !!custCookie);
  r = await call('GET', '/auth/me', { cookie: custCookie });
  check('me with cookie -> own email', r.status === 200 && r.json.data.user.email === email);
  r = await call('GET', '/auth/me');
  check('me without cookie -> 401', r.status === 401);

  // ---- categories ----
  r = await call('GET', '/categories');
  check('categories list with productCount', r.status === 200 && r.json.data.length >= 6 && r.json.data[0].productCount !== undefined);
  const burgers = r.json.data.find((c) => c.slug === 'burgers');
  r = await call('GET', '/categories/burgers');
  check('category by slug', r.status === 200 && r.json.data.name === 'Burgers');

  // ---- products: list/search/filter/sort/paginate ----
  r = await call('GET', '/products');
  check('product list + pagination', r.status === 200 && r.json.pagination.total >= 21 && r.json.data.length === 12 && r.json.pagination.pages >= 2);
  r = await call('GET', '/products?page=2&limit=12');
  check('page 2 returns remaining', r.status === 200 && r.json.data.length >= 1);
  r = await call('GET', '/products?q=burger');
  check('search "burger"', r.status === 200 && r.json.data.length >= 4, JSON.stringify(r.json.pagination));
  r = await call('GET', '/products?q=pizza');
  check('search matches category name (pizza)', r.status === 200 && r.json.data.length >= 4);
  r = await call('GET', '/products?category=burgers');
  check('filter by category slug', r.status === 200 && r.json.data.length === 4 && r.json.data.every((p) => p.category.slug === 'burgers'));
  r = await call('GET', `/products?category=${burgers._id}`);
  check('filter by category id', r.status === 200 && r.json.data.length === 4);
  r = await call('GET', '/products?minPrice=5&maxPrice=7');
  check('price range', r.status === 200 && r.json.data.length > 0 && r.json.data.every((p) => p.price >= 5 && p.price <= 7));
  r = await call('GET', '/products?sort=price_asc&limit=50');
  const prices = r.json.data.map((p) => p.price);
  check('sort price_asc', prices.every((v, i) => i === 0 || prices[i - 1] <= v));
  r = await call('GET', '/products?sort=price_desc&limit=50');
  const pd = r.json.data.map((p) => p.price);
  check('sort price_desc', pd.every((v, i) => i === 0 || pd[i - 1] >= v));
  r = await call('GET', '/products?featured=true');
  check('featured filter', r.status === 200 && r.json.data.length > 0 && r.json.data.every((p) => p.featured));
  r = await call('GET', '/products?sort=bogus');
  check('invalid sort -> 422', r.status === 422);
  r = await call('GET', '/products?minPrice=10&maxPrice=5');
  check('minPrice > maxPrice -> 422', r.status === 422);
  r = await call('GET', '/products?category=does-not-exist');
  check('unknown category -> empty list', r.status === 200 && r.json.data.length === 0);

  r = await call('GET', '/products/classic-chicken-burger');
  check('product by slug + related', r.status === 200 && r.json.data.name === 'Classic Chicken Burger' && r.json.related.length > 0);
  const pid = r.json.data._id;
  r = await call('GET', `/products/${pid}`);
  check('product by id', r.status === 200);
  r = await call('GET', '/products/no-such-product');
  check('unknown product -> 404', r.status === 404);

  // ---- authorization ----
  const newProduct = { name: 'Smoke Burger', description: 'A burger created by the smoke test.', price: 4.5, category: burgers._id, stock: 5 };
  r = await call('POST', '/products', { body: newProduct });
  check('create product anonymous -> 401', r.status === 401);
  r = await call('POST', '/products', { body: newProduct, cookie: custCookie });
  check('create product as customer -> 403', r.status === 403);

  // ---- admin CRUD ----
  r = await call('POST', '/auth/login', { body: ADMIN });
  const adminCookie = r.cookie;
  check('admin login', r.status === 200 && r.json.data.user.role === 'admin', JSON.stringify(r.json));
  r = await call('POST', '/products', { body: { ...newProduct, price: -1 }, cookie: adminCookie });
  check('negative price -> 422', r.status === 422);
  r = await call('POST', '/products', { body: { ...newProduct, category: '64b7f0f2a1b2c3d4e5f60718' }, cookie: adminCookie });
  check('nonexistent category -> 422', r.status === 422);
  r = await call('POST', '/products', { body: { ...newProduct, ratingAverage: 5, soldCount: 999 }, cookie: adminCookie });
  const created = r.json.data;
  check('admin create product (ratings not settable)', r.status === 201 && created.slug === 'smoke-burger' && created.ratingAverage === 0 && created.soldCount === 0, JSON.stringify(r.json));
  r = await call('PUT', `/products/${created._id}`, { body: { price: 5.25, isAvailable: false }, cookie: adminCookie });
  check('admin update product', r.status === 200 && r.json.data.price === 5.25);
  r = await call('GET', `/products/${created._id}`);
  check('inactive product hidden from public (404)', r.status === 404);
  r = await call('GET', `/products/${created._id}`, { cookie: adminCookie });
  check('inactive product visible to admin', r.status === 200);
  r = await call('GET', '/products?includeInactive=true&q=smoke', { cookie: adminCookie });
  check('admin list includeInactive', r.status === 200 && r.json.data.length === 1);
  r = await call('GET', '/products?includeInactive=true&q=smoke');
  check('includeInactive ignored for public', r.status === 200 && r.json.data.length === 0);
  r = await call('DELETE', `/categories/${burgers._id}`, { cookie: adminCookie });
  check('delete category in use -> 409', r.status === 409);
  r = await call('DELETE', `/products/${created._id}`, { cookie: adminCookie });
  check('admin delete product', r.status === 200);
  r = await call('GET', `/products/${created._id}`, { cookie: adminCookie });
  check('deleted product -> 404', r.status === 404);

  // ---- category CRUD ----
  r = await call('POST', '/categories', { body: { name: 'Smoke Cat' }, cookie: adminCookie });
  const cat = r.json.data;
  check('admin create category', r.status === 201 && cat.slug === 'smoke-cat');
  r = await call('PUT', `/categories/${cat._id}`, { body: { name: 'Smoke Cat Two' }, cookie: adminCookie });
  check('admin update category (slug regenerates)', r.status === 200 && r.json.data.slug === 'smoke-cat-two');
  r = await call('DELETE', `/categories/${cat._id}`, { cookie: adminCookie });
  check('admin delete empty category', r.status === 200);

  r = await call('POST', '/auth/logout');
  check('logout -> 200', r.status === 200);

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error('Smoke test crashed (is the server running?):', e.message); process.exit(1); });
