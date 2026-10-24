const { canTransition, TRANSITIONS } = require('../../utils/orderStatus');
const { fillDays, windowStart } = require('../../utils/stats');
const { isObjectId, escapeRegex } = require('../../utils/objectId');
const { buildFilter, buildSort } = require('../../utils/productQuery');

describe('order status transitions', () => {
  it('allows the normal fulfilment path and cancellation until delivery', () => {
    expect(canTransition('Pending', 'Cancelled')).toBe(true);
    expect(canTransition('Confirmed', 'Preparing')).toBe(true);
    expect(canTransition('Preparing', 'Out for Delivery')).toBe(true);
    expect(canTransition('Out for Delivery', 'Delivered')).toBe(true);
    expect(canTransition('Out for Delivery', 'Cancelled')).toBe(true);
  });
  it('blocks skipping steps, going backwards and unpaid confirmation', () => {
    expect(canTransition('Pending', 'Confirmed')).toBe(false);
    expect(canTransition('Pending', 'Delivered')).toBe(false);
    expect(canTransition('Confirmed', 'Delivered')).toBe(false);
    expect(canTransition('Preparing', 'Confirmed')).toBe(false);
  });
  it('treats Delivered and Cancelled as final', () => {
    for (const from of ['Delivered', 'Cancelled']) for (const to of Object.keys(TRANSITIONS)) expect(canTransition(from, to)).toBe(false);
  });
});

describe('fillDays', () => {
  const end = new Date('2026-10-06T15:30:00Z');
  it('zero-fills gaps, ignores out-of-window rows and rounds revenue', () => {
    const out = fillDays([{ _id: '2026-10-06', revenue: 20.456, orders: 2 }, { _id: '2026-10-04', revenue: 5, orders: 1 }, { _id: '2026-09-01', revenue: 99, orders: 9 }], 5, end);
    expect(out.map((d) => d.date)).toEqual(['2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06']);
    expect(out.map((d) => d.revenue)).toEqual([0, 0, 5, 0, 20.46]);
    expect(out.map((d) => d.orders)).toEqual([0, 0, 1, 0, 2]);
  });
  it('handles month boundaries and computes the window start', () => {
    expect(fillDays([], 3, new Date('2026-03-01T01:00:00Z')).map((d) => d.date)).toEqual(['2026-02-27', '2026-02-28', '2026-03-01']);
    expect(windowStart(5, end).toISOString()).toBe('2026-10-02T00:00:00.000Z');
  });
});

describe('id vs slug detection', () => {
  it('does not mistake a 12-character slug for an ObjectId', () => {
    expect(isObjectId('cheese-pizza')).toBe(false);
    expect(isObjectId('64b7f0f2a1b2c3d4e5f60718')).toBe(true);
  });
  it('escapes regex metacharacters', () => { expect(escapeRegex('a.b(c)')).toBe('a\\.b\\(c\\)'); });
});

describe('product filters', () => {
  it('only shows available products by default; admins can include inactive', () => {
    expect(buildFilter({})).toEqual({ isAvailable: true });
    expect(buildFilter({ includeInactive: true })).toEqual({});
  });
  it('builds search with an escaped regex and category-name matching', () => {
    const f = buildFilter({ q: 'bur.ger', searchCategoryIds: ['c1'] });
    expect(f.$or.length).toBe(3);
    expect(f.$or[0].name.test('Cheese BUR.GER')).toBe(true);
    expect(f.$or[0].name.test('Cheese burxger')).toBe(false); // the dot is literal, not a wildcard
  });
  it('treats 0 as a real price bound', () => { expect(buildFilter({ minPrice: 0 }).price).toEqual({ $gte: 0 }); });
  it('adds a stable tie-breaker to every sort', () => {
    expect(buildSort('price_asc')).toEqual({ price: 1, _id: -1 });
    expect(buildSort('nonsense')).toEqual({ createdAt: -1, _id: -1 });
  });
});
