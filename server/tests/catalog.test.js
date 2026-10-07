const request = require('supertest');
const app = require('../app');
const Product = require('../models/Product');
const Review = require('../models/Review');
const db = require('./helpers/db');
const { makeUser, agentFor, seedCatalog } = require('./helpers/factory');

let c, admin, customer;
beforeAll(() => db.connect('catalog'));
afterAll(() => db.close());
beforeEach(async () => {
  await db.clear();
  c = await seedCatalog();
  admin = await agentFor(await makeUser({ role: 'admin' }));
  customer = await agentFor(await makeUser());
});

const names = (res) => res.body.data.map((p) => p.name);

describe('GET /api/products', () => {
  it('lists only available products, with pagination metadata', async () => {
    const res = await request(app).get('/api/products?limit=3');
    expect(res.status).toBe(200);
    expect(res.body.pagination).toEqual({ page: 1, limit: 3, total: 5, pages: 2 }); // 6 seeded, 1 hidden
    expect(names(res)).not.toContain('Hidden Special');
    const page2 = await request(app).get('/api/products?limit=3&page=2');
    expect(page2.body.data).toHaveLength(2);
  });

  it('searches name, description and category name', async () => {
    expect(names(await request(app).get('/api/products?q=burger'))).toEqual(['Classic Burger']);
    expect(names(await request(app).get('/api/products?q=tasty')).length).toBe(5);       // in every description
    expect(names(await request(app).get('/api/products?q=sides')).sort()).toEqual(['French Fries', 'Onion Rings']); // category name
  });

  it('treats regex characters in the search as plain text', async () => {
    const res = await request(app).get('/api/products?q=' + encodeURIComponent('(.*'));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  it('filters by category slug and by id; unknown category gives an empty list', async () => {
    expect(names(await request(app).get('/api/products?category=pizza')).sort()).toEqual(['Cheese Pizza', 'Party Platter']);
    expect((await request(app).get(`/api/products?category=${c.sides._id}`)).body.data).toHaveLength(2);
    const none = await request(app).get('/api/products?category=nothing-here');
    expect(none.status).toBe(200);
    expect(none.body.data).toEqual([]);
  });

  it('filters by price range, rating, stock and featured', async () => {
    expect(names(await request(app).get('/api/products?minPrice=3&maxPrice=6')).sort()).toEqual(['Classic Burger', 'Onion Rings']);
    expect(names(await request(app).get('/api/products?rating=4'))).toEqual(['Cheese Pizza']);
    expect(names(await request(app).get('/api/products?inStock=true'))).not.toContain('Onion Rings');
    expect(names(await request(app).get('/api/products?featured=true'))).toEqual(['Classic Burger']);
  });

  it('sorts by price, popularity and rating', async () => {
    const asc = (await request(app).get('/api/products?sort=price_asc')).body.data.map((p) => p.price);
    expect(asc).toEqual([...asc].sort((a, b) => a - b));
    const desc = (await request(app).get('/api/products?sort=price_desc')).body.data.map((p) => p.price);
    expect(desc).toEqual([...desc].sort((a, b) => b - a));
    expect(names(await request(app).get('/api/products?sort=popular'))[0]).toBe('French Fries');
    expect(names(await request(app).get('/api/products?sort=rating'))[0]).toBe('Cheese Pizza');
  });

  it.each([['sort=bogus'], ['minPrice=10&maxPrice=5'], ['limit=1000'], ['page=0'], ['inStock=maybe']])('rejects bad query "%s" with 422', async (qs) => {
    expect((await request(app).get(`/api/products?${qs}`)).status).toBe(422);
  });

  it('hides inactive products from the public, shows them to admins only when asked', async () => {
    expect(names(await request(app).get('/api/products?includeInactive=true'))).not.toContain('Hidden Special');
    expect(names(await customer.get('/api/products?includeInactive=true'))).not.toContain('Hidden Special');
    expect(names(await admin.get('/api/products?includeInactive=true'))).toContain('Hidden Special');
  });
});

describe('GET /api/products/:id', () => {
  it('works by slug, including the 12-character slug that looks like an ObjectId', async () => {
    const res = await request(app).get('/api/products/cheese-pizza');
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Cheese Pizza');
  });
  it('works by id and returns related products from the same category (not itself)', async () => {
    const res = await request(app).get(`/api/products/${c.cheesePizza._id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.category.slug).toBe('pizza');
    expect(res.body.related.map((p) => p.name)).toEqual(['Party Platter']);
  });
  it('404 for unknown products and for inactive ones (public), but admins can see inactive', async () => {
    expect((await request(app).get('/api/products/does-not-exist')).status).toBe(404);
    expect((await request(app).get(`/api/products/${c.hidden._id}`)).status).toBe(404);
    expect((await admin.get(`/api/products/${c.hidden._id}`)).status).toBe(200);
  });
});

describe('admin product management', () => {
  const newProduct = () => ({ name: 'Test Wrap', description: 'A wrap made by the test suite.', price: 4.5, category: String(c.burgers._id), stock: 7 });

  it('is forbidden for anonymous users (401) and customers (403)', async () => {
    expect((await request(app).post('/api/products').send(newProduct())).status).toBe(401);
    expect((await customer.post('/api/products').send(newProduct())).status).toBe(403);
    expect((await customer.put(`/api/products/${c.burger._id}`).send({ price: 1 })).status).toBe(403);
    expect((await customer.delete(`/api/products/${c.burger._id}`)).status).toBe(403);
  });

  it('creates a product with a slug, and ignores fields admins should not set', async () => {
    const res = await admin.post('/api/products').send({ ...newProduct(), ratingAverage: 5, soldCount: 999, slug: 'hacked' });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ slug: 'test-wrap', ratingAverage: 0, soldCount: 0 });
  });

  it.each([
    ['negative price', { price: -1 }],
    ['zero price', { price: 0 }],
    ['short description', { description: 'short' }],
    ['malformed category id', { category: 'abc' }],
    ['bad image', { image: 'javascript:alert(1)' }],
    ['negative stock', { stock: -5 }],
  ])('rejects %s with 422', async (_l, patch) => {
    expect((await admin.post('/api/products').send({ ...newProduct(), ...patch })).status).toBe(422);
  });

  it('rejects a category that does not exist', async () => {
    const res = await admin.post('/api/products').send({ ...newProduct(), category: '64b7f0f2a1b2c3d4e5f60718' });
    expect(res.status).toBe(422);
  });

  it('updates a product (price rounded, slug follows the name) and rejects an empty update', async () => {
    const res = await admin.put(`/api/products/${c.burger._id}`).send({ name: 'Mega Burger', price: 6.456 });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ slug: 'mega-burger', price: 6.46 });
    expect((await admin.put(`/api/products/${c.burger._id}`).send({})).status).toBe(422);
  });

  it('deletes a product together with its reviews', async () => {
    const user = await makeUser();
    await Review.create({ user: user._id, product: c.burger._id, rating: 5 });
    expect((await admin.delete(`/api/products/${c.burger._id}`)).status).toBe(200);
    expect(await Product.findById(c.burger._id)).toBeNull();
    expect(await Review.countDocuments({ product: c.burger._id })).toBe(0);
    expect((await admin.delete(`/api/products/${c.burger._id}`)).status).toBe(404);
  });
});

describe('categories', () => {
  it('lists categories with product counts (available products only)', async () => {
    const res = await request(app).get('/api/categories');
    const byName = Object.fromEntries(res.body.data.map((x) => [x.name, x.productCount]));
    expect(byName).toEqual({ Burgers: 1, Pizza: 2, Sides: 2 }); // the hidden burger is not counted
  });
  it('is readable by slug and admin-only for changes', async () => {
    expect((await request(app).get('/api/categories/burgers')).body.data.name).toBe('Burgers');
    expect((await customer.post('/api/categories').send({ name: 'Drinks' })).status).toBe(403);
  });
  it('creates, renames (slug follows) and deletes; refuses to delete a category in use', async () => {
    const created = await admin.post('/api/categories').send({ name: 'Cold Drinks' });
    expect(created.status).toBe(201);
    expect(created.body.data.slug).toBe('cold-drinks');
    const renamed = await admin.put(`/api/categories/${created.body.data._id}`).send({ name: 'Beverages' });
    expect(renamed.body.data.slug).toBe('beverages');
    expect((await admin.post('/api/categories').send({ name: 'Beverages' })).status).toBe(409);
    expect((await admin.delete(`/api/categories/${c.burgers._id}`)).status).toBe(409);
    expect((await admin.delete(`/api/categories/${created.body.data._id}`)).status).toBe(200);
  });
});
